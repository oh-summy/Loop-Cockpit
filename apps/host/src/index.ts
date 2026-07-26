import { buildApp, bootstrap, logger } from './app';
import { closeDb } from './db/connection';
import { wsRegistry } from './pty/ws-registry';

const PORT = parseInt(process.env.HOST_PORT || '3000', 10);
const HOST = process.env.HOST_BIND || '127.0.0.1';

async function main() {
  await bootstrap();

  const app = buildApp();

  // 优雅关闭：收尾顺序——停止 ws 心跳、关闭运行中 PTY、关闭 DB
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutdown_signal_received');
    try {
      wsRegistry.stop();
      app.close();
      closeDb();
      logger.info('shutdown_complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'shutdown_failed');
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await app.listen({ port: PORT, host: HOST });
    logger.info({ port: PORT, host: HOST }, 'host_listening');
  } catch (err) {
    logger.error({ err }, 'host_listen_failed');
    process.exit(1);
  }
}

void main();
