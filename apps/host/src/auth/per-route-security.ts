// apps/host/src/auth/per-route-security.ts
// Fastify 5 的设计：app 级 addHook('onRequest') 无法拦截 encapsulated 的 register 插件请求。
// 绕过该限制的唯一稳定方案：在每个 router 文件注册 hook。
// 此工具提供 decorate 和 hook，让每个 router 在路线注册时拦截。

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getOrSeedToken, TOKEN_HEADER } from './token';

const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  ...(process.env.LOOP_CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
]);

function isSameOrigin(req: FastifyRequest): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers.host;
  if (host) {
    const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
    return `${proto}://${host}` === origin;
  }
  return false;
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin);
}

/**
 * 在 router 封装中注册 security hook。
 * 每个 router 文件调用此函数即可保证该文件下所有路由的 onRequest 安全拦截。
 *
 * 重要：必须确保 wrapper 时在 register 内 addHook——这会覆盖这个 router 封装下的所有路由
 */
export function applySecurityHooks(app: FastifyInstance): void {
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    const origin = req.headers.origin as string | undefined;
    const allowed = isAllowedOrigin(origin);

    if (allowed && origin) {
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, ' + TOKEN_HEADER);
      reply.header('Vary', 'Origin');
    }

    if (req.method === 'OPTIONS') {
      return reply.code(204).send();
    }

    if (!allowed) {
      return reply.code(403).send({ error: 'origin_not_allowed' });
    }

    if (isSameOrigin(req)) return;

    const token = (req.headers[TOKEN_HEADER] as string) ?? '';
    if (!token || token !== getOrSeedToken()) {
      return reply.code(401).send({ error: 'invalid_token' });
    }
  });
}
