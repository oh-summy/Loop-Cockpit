// apps/host/src/runner/routes.ts
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '../db/connection';
import { runs } from '../db/schema';
import type { RunStatus } from '../db/types';
import { startRun, stopRun } from './lifecycle';

const VALID_STATUSES: ReadonlySet<RunStatus> = new Set([
  'idle', 'initializing', 'running', 'evaluating',
  'success', 'retrying', 'failed', 'stopped',
]);

async function runnerRoutes(fastify: FastifyInstance) {
  // POST /api/runs — trigger a new run
  fastify.post('/', async (
    request: FastifyRequest<{ Body: { blueprintId: string; parentRunId?: string; reRunOf?: number } }>,
    reply,
  ) => {
    try {
      const { blueprintId, parentRunId, reRunOf } = request.body ?? {} as never;
      if (!blueprintId) {
        return reply.code(400).send({ error: 'missing blueprintId' });
      }
      const run = await startRun(blueprintId, { parentRunId, reRunOf });
      return reply.code(201).send(run);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('not found')) {
        return reply.code(404).send({ error: 'blueprint_not_found' });
      }
      throw err;
    }
  });

  // POST /api/runs/:id/stop — stop a running run
  fastify.post('/:id/stop', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply,
  ) => {
    try {
      // Read pid from DB for fallback kill
      const db = getDb();
      const rows = await db.select().from(runs).where(eq(runs.id, request.params.id)).limit(1);
      const pid = rows[0]?.pid ?? undefined;
      await stopRun(request.params.id, pid);
      return reply.send({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('not found')) {
        return reply.code(404).send({ error: 'run_not_found' });
      }
      if (msg.includes('Cannot transition')) {
        // Already in a terminal state — return current status, 200.
        const db = getDb();
        const rows = await db.select().from(runs).where(eq(runs.id, request.params.id)).limit(1);
        return reply.send({ success: true, status: rows[0]?.status });
      }
      throw err;
    }
  });

  // GET /api/runs/:id — get run detail
  fastify.get('/:id', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply,
  ) => {
    const db = getDb();
    const rows = await db.select().from(runs).where(eq(runs.id, request.params.id)).limit(1);
    if (!rows[0]) return reply.code(404).send({ error: 'not_found' });
    return reply.send(rows[0]);
  });

  // GET /api/runs — list runs
  fastify.get('/', async (
    request: FastifyRequest<{ Querystring: { blueprintId?: string; status?: string; page?: string; pageSize?: string } }>,
    reply,
  ) => {
    const db = getDb();
    const page = Math.max(1, parseInt(request.query.page ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(request.query.pageSize ?? '20', 10) || 20));
    const offset = (page - 1) * pageSize;

    const conditions = [] as ReturnType<typeof eq>[];
    if (request.query.blueprintId) {
      conditions.push(eq(runs.blueprintId, request.query.blueprintId));
    }
    if (request.query.status && VALID_STATUSES.has(request.query.status as RunStatus)) {
      conditions.push(eq(runs.status, request.query.status as RunStatus));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countRow] = await Promise.all([
      db.select().from(runs)
        .where(whereClause)
        .orderBy(desc(runs.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(runs).where(whereClause),
    ]);

    return reply.send({
      items,
      total: countRow[0]?.count ?? 0,
      page,
      pageSize,
    });
  });
}

export default runnerRoutes;
