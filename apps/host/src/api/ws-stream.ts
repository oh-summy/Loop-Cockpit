// apps/host/src/api/ws-stream.ts
/**
 * WebSocket stream — /api/runs/:id/stream
 * Pushes PTY output chunks to subscribed browser clients (Xterm).
 *
 * 安全模型：
 *  - 不在 verifyClient 里鉴权（@fastify/websocket 的 verifyClient 拒绝时会直接往 socket
 *    写 HTTP 响应，与 Fastify 的 reply.hijack 冲突导致 "Reply was already sent"）。
 *  - 改为在 route handler 内握手后校验 Origin + token；不合法则 close(1008) 断开。
 *  - 1008 = Policy Violation，是 WS 标准保留码，适合鉴权失败。
 */
import type { FastifyInstance, FastifyPluginCallback, FastifyRequest } from 'fastify';
import { wsRegistry } from '../pty/ws-registry';
import { isAllowedOrigin } from '../auth/per-route-security';
import { getOrSeedToken, TOKEN_HEADER } from '../auth/token';

/** 从 query 或 header 取出 token */
function extractToken(req: FastifyRequest): string {
  const q = (req.query as { token?: string } | undefined)?.token;
  if (q) return q;
  return (req.headers[TOKEN_HEADER] as string) ?? '';
}

/** Fastify plugin: registers @fastify/websocket + the stream route. */
export const wsStreamPlugin: FastifyPluginCallback = async (fastify: FastifyInstance) => {
  const websocket = (await import('@fastify/websocket')).default;
  await fastify.register(websocket, {
    options: {
      maxPayload: 1_000_000,
    },
  });

  await fastify.register(async (instance: FastifyInstance) => {
    instance.get(
      '/api/runs/:id/stream',
      { websocket: true },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (socket: any, req: FastifyRequest<{ Params: { id: string } }>) => {
        const origin = req.headers.origin as string | undefined;

        // 校验 Origin 白名单
        if (!isAllowedOrigin(origin)) {
          socket.close(1008, 'origin_not_allowed');
          return;
        }

        // 同源放行；跨域必须带合法 token
        const host = req.headers.host;
        const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
        const sameOrigin = host && `${proto}://${host}` === origin;
        if (!sameOrigin) {
          const token = extractToken(req);
          if (!token || token !== getOrSeedToken()) {
            socket.close(1008, 'invalid_token');
            return;
          }
        }

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
