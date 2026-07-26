// apps/host/src/db/init.ts
// Auto-create tables on first connect. Replaces drizzle-kit migrate for Iter 2.

import { getRawDb } from './connection';

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS blueprints (
  id TEXT PRIMARY KEY,
  goal TEXT NOT NULL,
  agent TEXT NOT NULL DEFAULT 'claude-code',
  model TEXT,
  project_path TEXT NOT NULL,
  triggers TEXT NOT NULL,
  default_tool_layer TEXT NOT NULL,
  sdaf_stages TEXT NOT NULL,
  phases TEXT NOT NULL,
  start_phase_id TEXT,
  planner_config TEXT,
  context_builder_config TEXT,
  verification_config TEXT,
  memory_config TEXT,
  reflection_config TEXT,
  human_gate_config TEXT,
  notification TEXT,
  deny TEXT,
  retry_policy TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blueprints_status ON blueprints(status);
CREATE INDEX IF NOT EXISTS idx_blueprints_updated ON blueprints(updated_at DESC);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  blueprint_id TEXT NOT NULL REFERENCES blueprints(id),
  blueprint_snapshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  iteration INTEGER NOT NULL DEFAULT 0,
  parent_run_id TEXT,
  started_at TEXT,
  ended_at TEXT,
  exit_code INTEGER,
  error_snippet TEXT,
  raw_log_path TEXT,
  token_cost_usd REAL,
  done_criteria_result TEXT,
  pid INTEGER,
  claude_session_id TEXT,
  current_phase_id TEXT,
  phase_history TEXT NOT NULL DEFAULT '[]',
  current_round INTEGER NOT NULL DEFAULT 0,
  goal TEXT NOT NULL,
  state_yaml_path TEXT,
  budget_usage TEXT NOT NULL,
  planner_history TEXT NOT NULL DEFAULT '[]',
  verification_history TEXT NOT NULL DEFAULT '[]',
  reflection_history TEXT NOT NULL DEFAULT '[]',
  human_gate_history TEXT NOT NULL DEFAULT '[]',
  audit_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_runs_blueprint ON runs(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_created ON runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_parent ON runs(parent_run_id);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  blueprint_id TEXT NOT NULL REFERENCES blueprints(id),
  event_type TEXT NOT NULL,
  layer TEXT,
  round INTEGER,
  task_id TEXT,
  phase_id TEXT,
  agent_name TEXT NOT NULL,
  model TEXT,
  claude_session_id TEXT,
  tool_used TEXT,
  skill_used TEXT,
  mcp_server TEXT,
  subagent_used TEXT,
  tool_args TEXT,
  tool_result TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_usd REAL,
  exit_code INTEGER,
  status TEXT,
  status_from TEXT,
  status_to TEXT,
  prompt TEXT,
  response TEXT,
  error TEXT,
  occurred_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  timezone_offset TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_run ON audit_events(run_id);
CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_layer ON audit_events(layer);
CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_events(agent_name);
CREATE INDEX IF NOT EXISTS idx_audit_tool ON audit_events(tool_used);
CREATE INDEX IF NOT EXISTS idx_audit_skill ON audit_events(skill_used);
CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_events(claude_session_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_round ON audit_events(run_id, round);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  blueprint_id TEXT NOT NULL REFERENCES blueprints(id),
  agent_name TEXT NOT NULL,
  model TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  tool_call_count INTEGER NOT NULL DEFAULT 0,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_run ON sessions(run_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

CREATE TABLE IF NOT EXISTS pending_gates (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  blueprint_id TEXT NOT NULL REFERENCES blueprints(id),
  round INTEGER NOT NULL,
  task_id TEXT,
  mode TEXT NOT NULL,
  trigger_condition TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  responded_at TEXT,
  decision TEXT,
  decided_by TEXT,
  timeout_ms INTEGER,
  timeout_action TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pending_gates_run ON pending_gates(run_id);
CREATE INDEX IF NOT EXISTS idx_pending_gates_decision ON pending_gates(decision);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  blueprint_id TEXT REFERENCES blueprints(id),
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  context TEXT,
  created_at TEXT NOT NULL,
  effectiveness REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_memories_blueprint ON memories(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES runs(id),
  blueprint_id TEXT REFERENCES blueprints(id),
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  title TEXT,
  body TEXT,
  payload TEXT,
  sent_at TEXT,
  delivered_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_run ON notifications(run_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel);
`;

/** Initialize all tables. Safe to call multiple times (IF NOT EXISTS). */
export function initDatabase() {
  const db = getRawDb();
  db.exec(CREATE_TABLE_SQL);
}
