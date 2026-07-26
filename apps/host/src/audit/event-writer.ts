// apps/host/src/audit/event-writer.ts
/**
 * Fire-and-forget audit event writer — persists to audit_events table.
 * Failures are logged but never throw, so Run execution is never blocked.
 * Per F005: 过程可审计 — every state change and tool call must be traceable.
 */
import { getDb } from '../db/connection';
import { auditEvents } from '../db/schema';
import { logger } from '../logger';
import { redact } from './redact';

type AuditEventType = typeof auditEvents.$inferInsert['eventType'];
type Layer = typeof auditEvents.$inferInsert['layer'];

export interface AuditEventInput {
  runId: string;
  blueprintId: string;
  eventType: AuditEventType;
  layer?: Layer;
  round?: number;
  taskId?: string;
  phaseId?: string;
  agentName: string;
  model?: string;
  claudeSessionId?: string;
  toolUsed?: string;
  skillUsed?: string;
  mcpServer?: string;
  subagentUsed?: string;
  toolArgs?: unknown;
  toolResult?: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  exitCode?: number;
  status?: string;
  statusFrom?: string;
  statusTo?: string;
  prompt?: string;
  response?: string;
  error?: string;
  occurredAt?: string;
}

/** Format current timezone offset as ISO8601 ±HH:MM. */
function tzOffsetIso(): string {
  const m = -new Date().getTimezoneOffset();
  const sign = m >= 0 ? '+' : '-';
  const abs = Math.abs(m);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

/**
 * Persist an audit event. Fire-and-forget — returns a promise that never rejects.
 * Safe to call without await from hot paths.
 */
export function recordAuditEvent(input: AuditEventInput): void {
  const now = new Date().toISOString();
  const row = {
    runId: input.runId,
    blueprintId: input.blueprintId,
    eventType: input.eventType,
    layer: input.layer,
    round: input.round ?? null,
    taskId: input.taskId ?? null,
    phaseId: input.phaseId ?? null,
    agentName: input.agentName,
    model: input.model ?? null,
    claudeSessionId: input.claudeSessionId ?? null,
    toolUsed: input.toolUsed ?? null,
    skillUsed: input.skillUsed ?? null,
    mcpServer: input.mcpServer ?? null,
    subagentUsed: input.subagentUsed ?? null,
    // 所有字符串字段都过 redact；工具参数、prompt、response（可能含 blueprint 注入的 secret）都不能泄漏
    toolArgs: input.toolArgs ? redact(JSON.stringify(input.toolArgs)) : null,
    toolResult: input.toolResult ? redact(input.toolResult) : null,
    tokensIn: input.tokensIn ?? null,
    tokensOut: input.tokensOut ?? null,
    costUsd: input.costUsd ?? null,
    exitCode: input.exitCode ?? null,
    status: input.status ? redact(input.status) : null,
    statusFrom: input.statusFrom ? redact(input.statusFrom) : null,
    statusTo: input.statusTo ? redact(input.statusTo) : null,
    prompt: input.prompt ? redact(input.prompt) : null,
    response: input.response ? redact(input.response) : null,
    error: input.error ? redact(input.error) : null,
    occurredAt: input.occurredAt ?? now,
    recordedAt: now,
    timezoneOffset: tzOffsetIso(),
    createdAt: now,
  };

  try {
    getDb().insert(auditEvents).values(row).run();
  } catch (err: unknown) {
    // Fire-and-forget: never block Run execution.
    logger.warn({ runId: input.runId, eventType: input.eventType, err }, 'audit_event_write_failed');
  }
}
