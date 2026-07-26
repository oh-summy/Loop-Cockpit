// apps/host/src/logger.ts
// Shared pino logger. Imported by anything that needs structured logs
// outside of a Fastify request context (lifecycle, reaper, audit writer, etc.).
// Inside a request handler, prefer `request.log` so the request-id is attached.
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});
