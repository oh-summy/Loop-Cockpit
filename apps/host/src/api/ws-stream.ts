// apps/host/src/api/ws-stream.ts
/**
 * WebSocket stream — /api/runs/:id/stream
 * Pushes PTY output chunks to subscribed browser clients (Xterm).
 * Client may send {type:'ack', lastSeq} for replay (Iter 3+); Iter 2 just streams live.
 */
import type { FastifyInstance, FastifyPluginCallback, FastifyRequest } from 'fastify';
import { wsRegistry } from '../pty/ws-registry';

/** Fastify plugin: registers @fastify/websocket + the stream route. */
export const wsStreamPlugin: FastifyPluginCallback = async (fastify: FastifyInstance) => {
  const websocket = (await import('@fastify/websocket')).default;
  await fastify.register(websocket);

  await fastify.register(async (instance: FastifyInstance) => {
    instance.get(
      '/api/runs/:id/stream',
      { websocket: true },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (socket: any, req: FastifyRequest<{ Params: { id: string } }>) => {
        const runId = req.params.id;
        // socket.raw or socket is the underlying ws.WebSocket depending on version.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ws: any = socket.raw ?? socket;

        wsRegistry.subscribe(runId, ws);

        // Iter 2: ignore inbound messages. Iter 3+ handles {type:'input'} and {type:'ack'}.
        ws.on('message', () => {
          /* reserved for interactive input + replay */
        });
      },
    );
  });
};
