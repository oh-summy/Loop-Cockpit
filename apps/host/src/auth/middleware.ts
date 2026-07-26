// apps/host/src/auth/middleware.ts
// CORS 白名单 + 本地 token 校验。
//
// 导出两个独立功能：
//  - registerTokenRoute: 给前端 UI 暴露 token 的同源接口（app.ts 调用）
//  - verifyWsConnection: WS 握手鉴权（ws-stream.ts 调用）
//
// HTTP 路由的 onRequest 安全拦截统一走 per-route-security.ts::applySecurityHooks
// （每个 router 文件自包含调用），本文件不再重复实现。

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getOrSeedToken, TOKEN_HEADER } from './token';

const LOCAL_TOKEN_HEADER = TOKEN_HEADER;

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

const envOrigins = (process.env.LOOP_CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const ALLOWED_ORIGINS = new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]);

function isSameOrigin(req: FastifyRequest): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers.host;
  if (host) {
    const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
    const self = `${proto}://${host}`;
    return self === origin;
  }
  return false;
}

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin);
}

/** WS 鉴权：握手时校验 Origin + token（query 或 header） */
export function verifyWsConnection(info: { origin: string; req: any; secure: boolean }): boolean {
  if (!isAllowedOrigin(info.origin)) return false;
  if (info.origin) {
    const host = info.req.headers?.host;
    const proto = info.req.headers?.['x-forwarded-proto'] || 'http';
    if (host && `${proto}://${host}` === info.origin) return true;
  }
  const url = new URL(info.req.url ?? '', 'http://localhost');
  const qToken = url.searchParams.get('token');
  if (qToken && qToken === getOrSeedToken()) return true;
  const hToken = info.req.headers?.[LOCAL_TOKEN_HEADER];
  if (hToken && hToken === getOrSeedToken()) return true;
  return false;
}

/** 暴露给前端 UI 取 token 的接口（仅同源可访问）。 */
export async function registerTokenRoute(app: FastifyInstance): Promise<void> {
  app.get('/api/auth/token', async (req: FastifyRequest, reply: FastifyReply) => {
    // 仅同源可取（跨域需带 token 循环校验无意义）
    if (!isSameOrigin(req) && isAllowedOrigin(req.headers.origin as string | undefined)) {
      // 同源放行；跨域允许的逻辑已在使用 token 校验的外层处理
      // 此路由本身暴露 token，跨域不能允许
    }
    if (!isSameOrigin(req)) {
      return reply.code(403).send({ error: 'forbidden' });
    }
    return { token: getOrSeedToken() };
  });
}
