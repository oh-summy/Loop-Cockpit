// apps/host/src/app.ts
import Fastify from 'fastify';
import blueprintRoutes from './blueprint/routes';
import runnerRoutes from './runner/routes';
import auditRoutes from './audit/routes';
import triggerRoutes from './trigger/routes';
import { wsStreamPlugin } from './api/ws-stream';
import { initDatabase } from './db/init';
import { bootReaper } from './runner/reaper';
import { logger } from './logger';
import { registerTokenRoute } from './auth/middleware';
import { getOrSeedToken } from './auth/token';

export interface BuildAppOptions {
  skipBoot?: boolean;
}

/**
 * Build the Fastify app instance.
 *
 * Security 架构说明：
 * - Fastify 5 对 encapsulated 插件的 addHook 不向下传播至 register 的子路由，
 *   所以我们把 security check 放在每个 router 文件里（applySecurityHooks）。
 * - 这样每个 Fastify encapsulated context 的子路由 onRequest 都被 security hook 拦截。
 */
export function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
    bodyLimit: 10_000_000,
  });

  // Health check (unauthenticated, cross-origin)
  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }));

  // Expose token for UI (same-origin only)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerTokenRoute(app as any);

  // Business routes — each router file includes its own applySecurityHooks() call
  app.register(blueprintRoutes, { prefix: '/api/blueprints' } as any);
  app.register(runnerRoutes, { prefix: '/api/runs' } as any);
  app.register(auditRoutes, {} as any);
  app.register(triggerRoutes, { prefix: '/api/triggers' } as any);
  app.register(wsStreamPlugin);

  return app;
}

/**
 * Initialise DB + reaper + ws-registry heartbeat. Must be awaited once at process start before
 * accepting HTTP traffic. Idempotent.
 */
export async function bootstrap(): Promise<void> {
  initDatabase();
  try {
    await bootReaper();
  } catch (err) {
    logger.error({ err }, 'boot_reaper_crashed');
  }
  const { wsRegistry } = await import('./pty/ws-registry');
  wsRegistry.start();
  logger.info({ wsTokenGenerated: !!getOrSeedToken() }, 'ws_registry_heartbeat_started');
}

export { logger };
