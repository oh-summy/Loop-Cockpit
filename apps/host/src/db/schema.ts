// apps/host/src/db/schema.ts
// 7 张表 — Drizzle ORM + better-sqlite3
// ADR-0011: 所有 JSON 字段用 $type<> 强类型

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

import {
  auditId,
  bpId,
  gateId,
  memoryId,
  notificationId,
  runId,
  sessionId,
} from './nanoid';
import type { Blueprint } from './types';

// ─── 1. blueprints ───────────────────────────────────────────
export const blueprints = sqliteTable('blueprints', {
  id: text('id').primaryKey().$defaultFn(() => bpId()),
  goal: text('goal', { mode: 'json' }).$type<Blueprint['goal']>().notNull(),
  agent: text('agent', {
    enum: ['claude-code', 'opencode', 'codex'],
  }).notNull().default('claude-code'),
  model: text('model'),
  projectPath: text('project_path').notNull(),
  triggers: text('triggers', { mode: 'json' }).notNull(),
  defaultToolLayer: text('default_tool_layer', { mode: 'json' }).notNull(),
  sdafStages: text('sdaf_stages', { mode: 'json' }).notNull(),
  phases: text('phases', { mode: 'json' }).notNull(),
  startPhaseId: text('start_phase_id'),
  plannerConfig: text('planner_config', { mode: 'json' }),
  contextBuilderConfig: text('context_builder_config', { mode: 'json' }),
  verificationConfig: text('verification_config', { mode: 'json' }),
  memoryConfig: text('memory_config', { mode: 'json' }),
  reflectionConfig: text('reflection_config', { mode: 'json' }),
  humanGateConfig: text('human_gate_config', { mode: 'json' }),
  notification: text('notification', { mode: 'json' }),
  deny: text('deny', { mode: 'json' }),
  retryPolicy: text('retry_policy', { mode: 'json' }).notNull(),
  type: text('type', { mode: 'json' }).$type<string[]>().notNull().default([] as string[]),
  status: text('status', { enum: ['active', 'disabled'] })
    .notNull()
    .default('active'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => formatDate(new Date())),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => formatDate(new Date())),
});

// ─── 2. runs ─────────────────────────────────────────────────
export const runs = sqliteTable('runs', {
  id: text('id').primaryKey().$defaultFn(() => runId()),
  blueprintId: text('blueprint_id')
    .notNull()
    .references(() => blueprints.id),
  blueprintSnapshot: text('blueprint_snapshot', { mode: 'json' }).notNull(),
  status: text('status', { enum: [
    'idle', 'initializing', 'running', 'evaluating',
    'success', 'retrying', 'failed', 'stopped',
  ]}).notNull().default('idle'),
  iteration: integer('iteration').notNull().default(0),
  parentRunId: text('parent_run_id'),
  startedAt: text('started_at'),
  endedAt: text('ended_at'),
  exitCode: integer('exit_code'),
  errorSnippet: text('error_snippet'),
  rawLogPath: text('raw_log_path'),
  tokenCostUsd: real('token_cost_usd'),
  doneCriteriaResult: text('done_criteria_result', { mode: 'json' }),
  pid: integer('pid'),
  claudeSessionId: text('claude_session_id'),
  currentPhaseId: text('current_phase_id'),
  phaseHistory: text('phase_history', { mode: 'json' }).notNull().default('[]'),
  currentRound: integer('current_round').notNull().default(0),
  goal: text('goal', { mode: 'json' }).notNull(),
  stateYamlPath: text('state_yaml_path'),
  budgetUsage: text('budget_usage', { mode: 'json' }).notNull(),
  plannerHistory: text('planner_history', { mode: 'json' }).notNull().default('[]'),
  verificationHistory: text('verification_history', { mode: 'json' }).notNull().default('[]'),
  reflectionHistory: text('reflection_history', { mode: 'json' }).notNull().default('[]'),
  humanGateHistory: text('human_gate_history', { mode: 'json' }).notNull().default('[]'),
  auditStatus: text('audit_status', {
    enum: ['pending', 'written', 'failed'],
  }).notNull().default('pending'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => formatDate(new Date())),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => formatDate(new Date())),
});

// ─── 3. audit_events ─────────────────────────────────────────
export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey().$defaultFn(() => auditId()),
  runId: text('run_id')
    .notNull()
    .references(() => runs.id),
  blueprintId: text('blueprint_id')
    .notNull()
    .references(() => blueprints.id),
  eventType: text('event_type', {
    enum: [
      'trigger_fired', 'run_started', 'run_status_change',
      'planner_call', 'task_started', 'task_completed',
      'tool_call', 'tool_call_result', 'verification',
      'reflection', 'human_gate', 'budget_warning',
      'notification_sent', 'run_completed', 'permission_denied',
      'memory_write', 'context_injected', 'run_stopped',
      'agent_spawned', 'skill_load_error',
    ],
  }).notNull(),
  layer: text('layer', {
    enum: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'cross'],
  }),
  round: integer('round'),
  taskId: text('task_id'),
  phaseId: text('phase_id'),
  agentName: text('agent_name').notNull(),
  model: text('model'),
  claudeSessionId: text('claude_session_id'),
  toolUsed: text('tool_used'),
  skillUsed: text('skill_used'),
  mcpServer: text('mcp_server'),
  subagentUsed: text('subagent_used'),
  toolArgs: text('tool_args', { mode: 'json' }),
  // Truncated on write: tool_result ≤ 32KB, prompt ≤ 64KB
  toolResult: text('tool_result'),
  tokensIn: integer('tokens_in'),
  tokensOut: integer('tokens_out'),
  costUsd: real('cost_usd'),
  exitCode: integer('exit_code'),
  status: text('status'),
  statusFrom: text('status_from'),
  statusTo: text('status_to'),
  prompt: text('prompt'),
  response: text('response'),
  error: text('error'),
  occurredAt: text('occurred_at').notNull(),
  recordedAt: text('recorded_at').notNull(),
  timezoneOffset: text('timezone_offset').notNull(),
  createdAt: text('created_at').notNull(),
});

// ─── 4. sessions ─────────────────────────────────────────────
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => sessionId()),
  runId: text('run_id')
    .notNull()
    .references(() => runs.id),
  blueprintId: text('blueprint_id')
    .notNull()
    .references(() => blueprints.id),
  agentName: text('agent_name').notNull(),
  model: text('model'),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  toolCallCount: integer('tool_call_count').notNull().default(0),
  tokensIn: integer('tokens_in').notNull().default(0),
  tokensOut: integer('tokens_out').notNull().default(0),
  costUsd: real('cost_usd').notNull().default(0),
  status: text('status', {
    enum: ['active', 'completed', 'killed'],
  }).notNull().default('active'),
  createdAt: text('created_at').notNull(),
});

// ─── 5. pending_gates ────────────────────────────────────────
export const pendingGates = sqliteTable('pending_gates', {
  id: text('id').primaryKey().$defaultFn(() => gateId()),
  runId: text('run_id')
    .notNull()
    .references(() => runs.id),
  blueprintId: text('blueprint_id')
    .notNull()
    .references(() => blueprints.id),
  round: integer('round').notNull(),
  taskId: text('task_id'),
  mode: text('mode', {
    enum: ['interrupt', 'default-approve', 'default-reject'],
  }).notNull(),
  triggerCondition: text('trigger_condition').notNull(),
  requestedAt: text('requested_at').notNull(),
  respondedAt: text('responded_at'),
  decision: text('decision', {
    enum: ['approve', 'reject', 'timeout'],
  }),
  decidedBy: text('decided_by'),
  timeoutMs: integer('timeout_ms'),
  timeoutAction: text('timeout_action'),
  createdAt: text('created_at').notNull(),
});

// ─── 6. memories ─────────────────────────────────────────────
export const memories = sqliteTable('memories', {
  id: text('id').primaryKey().$defaultFn(() => memoryId()),
  blueprintId: text('blueprint_id').references(() => blueprints.id),
  type: text('type').notNull(),
  content: text('content').notNull(),
  context: text('context', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  effectiveness: real('effectiveness').notNull().default(0),
});

// ─── 7. notifications ────────────────────────────────────────
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey().$defaultFn(() => notificationId()),
  runId: text('run_id').references(() => runs.id),
  blueprintId: text('blueprint_id').references(() => blueprints.id),
  eventType: text('event_type').notNull(),
  channel: text('channel').notNull(),
  title: text('title'),
  body: text('body'),
  payload: text('payload', { mode: 'json' }),
  sentAt: text('sent_at'),
  deliveredAt: text('delivered_at'),
  status: text('status', {
    enum: ['pending', 'sent', 'delivered', 'failed'],
  }).notNull().default('pending'),
  error: text('error'),
  createdAt: text('created_at').notNull(),
});

// ─── Helpers ─────────────────────────────────────────────────

/** Format Date to ISO8601 string for SQLite TEXT storage */
function formatDate(d: Date): string {
  return d.toISOString();
}
