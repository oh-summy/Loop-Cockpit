// apps/host/src/audit/routes.ts
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fs from 'fs';
import { and, desc, eq, like, sql } from 'drizzle-orm';
import { getDb } from '../db/connection';
import { auditEvents } from '../db/schema';
import type { AuditEventType } from '../db/types';
import { getAuditTrailPath } from './writer';
import { applySecurityHooks } from '../auth/per-route-security';

async function auditRoutes(fastify: FastifyInstance) {
  applySecurityHooks(fastify);
  // GET /api/audit/health — 审计系统健康（审计事件数 + 最近一次运行状态）
  fastify.get('/api/audit/health', async (_request: FastifyRequest, reply) => {
    const db = getDb();
    const totalRow = await db.select({ count: sql<number>`count(*)` }).from(auditEvents);
    const lastRow = await db.select({ lastRecordedAt: auditEvents.recordedAt, lastEventType: auditEvents.eventType })
      .from(auditEvents)
      .orderBy(sql`${auditEvents.recordedAt} DESC`)
      .limit(1);
    return reply.send({
      status: 'ok',
      totalEvents: totalRow[0]?.count ?? 0,
      lastEvent: lastRow[0] ?? null,
    });
  });

  // GET /api/audit/trails/:runId — read or download audit trail
  fastify.get('/api/audit/trails/:runId', async (
    request: FastifyRequest<{ Params: { runId: string }; Querystring: { download?: string } }>,
    reply,
  ) => {
    const filePath = getAuditTrailPath(request.params.runId);
    if (!fs.existsSync(filePath)) {
      return reply.code(404).send({ error: 'audit_trail_not_found' });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);

    if (request.query.download) {
      return reply
        .header('Content-Disposition', `attachment; filename="${request.params.runId}-audit.json"`)
        .header('Content-Type', 'application/json')
        .send(json);
    }
    return reply.send(json);
  });

  // GET /api/audit/events — query audit_events table
  fastify.get('/api/audit/events', async (
    request: FastifyRequest<{ Querystring: { runId?: string; eventType?: string; agent?: string; page?: string; pageSize?: string } }>,
    reply,
  ) => {
    const db = getDb();
    const page = Math.max(1, parseInt(request.query.page ?? '1', 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(request.query.pageSize ?? '50', 10) || 50));
    const offset = (page - 1) * pageSize;

    const conditions = [] as ReturnType<typeof eq>[];
    if (request.query.runId) {
      conditions.push(eq(auditEvents.runId, request.query.runId));
    }
    if (request.query.eventType) {
      conditions.push(eq(auditEvents.eventType, request.query.eventType as AuditEventType));
    }
    if (request.query.agent) {
      conditions.push(like(auditEvents.agentName, `%${request.query.agent}%`));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countRow] = await Promise.all([
      db.select().from(auditEvents)
        .where(whereClause)
        .orderBy(desc(auditEvents.recordedAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(auditEvents).where(whereClause),
    ]);

    return reply.send({ items, total: countRow[0]?.count ?? 0, page, pageSize });
  });

  // GET /api/audit/stats — aggregated counts
  fastify.get('/api/audit/stats', async (_request: FastifyRequest, reply) => {
    const db = getDb();

    const [totalEvents, byType, byAgent] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(auditEvents),
      db.select({ eventType: auditEvents.eventType, count: sql<number>`count(*)` })
        .from(auditEvents)
        .groupBy(auditEvents.eventType),
      db.select({ agent: auditEvents.agentName, count: sql<number>`count(*)` })
        .from(auditEvents)
        .groupBy(auditEvents.agentName),
    ]);

    return reply.send({
      total: totalEvents[0]?.count ?? 0,
      byType,
      byAgent,
    });
  });
}

export default auditRoutes;
