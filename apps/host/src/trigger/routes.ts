// apps/host/src/trigger/routes.ts
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { dispatchTrigger } from './dispatcher';
import { applySecurityHooks } from '../auth/per-route-security';

async function triggerRoutes(fastify: FastifyInstance) {
  applySecurityHooks(fastify);
  // POST /api/triggers/:blueprintId — manual trigger
  fastify.post('/:blueprintId', async (request: FastifyRequest<{ Params: { blueprintId: string } }>, reply) => {
    try {
      const result = await dispatchTrigger({
        blueprintId: request.params.blueprintId,
        source: 'manual',
        firedAt: new Date().toISOString(),
      });
      if (result.alreadyRunning) {
        return reply.code(409).send({ error: 'already_running', blueprintId: request.params.blueprintId });
      }
      return reply.code(201).send({ runId: result.runId });
    } catch (err: any) {
      return reply.code(500).send({ error: 'trigger_failed', message: err.message });
    }
  });

  // POST /api/triggers/webhook — generic webhook endpoint
  fastify.post('/webhook', async (request: FastifyRequest<{ Body: { blueprintId: string; source?: string; payload?: any } }>, reply) => {
    try {
      const { blueprintId, source = 'webhook', payload } = request.body;
      const result = await dispatchTrigger({
        blueprintId,
        source,
        payload,
        firedAt: new Date().toISOString(),
      });
      if (result.alreadyRunning) {
        return reply.code(409).send({ error: 'already_running' });
      }
      return reply.code(201).send({ runId: result.runId });
    } catch (err: any) {
      return reply.code(500).send({ error: 'webhook_failed', message: err.message });
    }
  });
}

export default triggerRoutes;
