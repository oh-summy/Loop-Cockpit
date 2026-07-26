// apps/host/src/blueprint/routes.ts
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { createBlueprint, getBlueprint, listBlueprints, patchBlueprint, softDeleteBlueprint } from './service';
import { dryRunCriteriaSchema } from './zod';
import { applySecurityHooks } from '../auth/per-route-security';

async function blueprintRoutes(fastify: FastifyInstance) {
  applySecurityHooks(fastify);
  // POST /api/blueprints — create
  fastify.post('/', {
    schema: {
      body: true,
    },
  }, async (request: FastifyRequest<{ Body: unknown }>, reply) => {
    try {
      const blueprint = await createBlueprint(request.body);
      fastify.log.info({ id: blueprint.id }, 'blueprint created');
      return reply.code(201).send(blueprint);
    } catch (err: any) {
      if (err.errors) {
        return reply.code(400).send({ error: 'validation_failed', details: err.errors });
      }
      throw err;
    }
  });

  // GET /api/blueprints — list
  fastify.get('/', async (request: FastifyRequest, reply) => {
    const query = request.query as {
      page?: string; pageSize?: string; status?: string; type?: string; search?: string;
    };
    const result = await listBlueprints({
      page: query.page ? parseInt(query.page, 10) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
      status: query.status,
      type: query.type,
      search: query.search,
    });
    return reply.send({ ...result, page: query.page ?? 1 });
  });

  // GET /api/blueprints/:id — detail
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const bp = await getBlueprint(request.params.id);
    if (!bp) return reply.code(404).send({ error: 'not_found' });
    return bp;
  });

  // PATCH /api/blueprints/:id — partial update
  fastify.patch('/:id', async (request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply) => {
    try {
      const result = await patchBlueprint(request.params.id, request.body);
      fastify.log.info({ id: request.params.id }, 'blueprint updated');
      return result;
    } catch (err: any) {
      if (err.message?.includes('not found')) return reply.code(404).send({ error: 'not_found' });
      if (err.errors) return reply.code(400).send({ error: 'validation_failed', details: err.errors });
      throw err;
    }
  });

  // DELETE /api/blueprints/:id — soft delete
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    try {
      await softDeleteBlueprint(request.params.id);
      fastify.log.info({ id: request.params.id }, 'blueprint soft-deleted');
      return { ok: true };
    } catch (err: any) {
      if (err.message?.includes('not found')) return reply.code(404).send({ error: 'not_found' });
      return reply.code(409).send({ error: 'conflict', message: err.message });
    }
  });

  // POST /api/blueprints/:id/dry-run-criteria — test successCondition
  fastify.post('/:id/dry-run-criteria', async (request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply) => {
    const parsed = dryRunCriteriaSchema.parse(request.body);
    const { evaluateShell } = await import('../verification/shell');
    const r = evaluateShell(parsed.command, parsed.cwd, parsed.timeoutMs);
    return reply.send({
      passed: r.passed,
      exitCode: r.exitCode,
      stdout: r.stdoutTail,
      stderr: r.stderrTail,
      durationMs: r.durationMs,
    });
  });

  // POST /api/blueprints/:id/dry-run-trigger — preview ContextBundle
  fastify.post('/:id/dry-run-trigger', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const bp = await getBlueprint(request.params.id);
    if (!bp) return reply.code(404).send({ error: 'not_found' });
    return {
      contextBundle: {
        skills: bp.defaultToolLayer.skills,
        tools: bp.defaultToolLayer.tools,
        mcpServers: bp.defaultToolLayer.mcpServers,
        subagents: bp.defaultToolLayer.subagents,
        permissionMode: bp.defaultToolLayer.permissionMode,
        allowedDirs: bp.defaultToolLayer.allowedDirs,
      },
      blueprintId: bp.id,
    };
  });
}

export default blueprintRoutes;
