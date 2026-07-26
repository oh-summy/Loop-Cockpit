// apps/host/src/db/types.ts
// 所有 TypeScript 接口 — 与 F002 §6.2 完全对齐 (ADR-0011)

// ─── Layer 1 · Goal ──────────────────────────────────────────
export interface GoalBudget {
  maxRounds: number;
  maxTokensUSD: number;
  maxWallTimeMs: number;
  maxTokensNum?: number;
  warnAtPercent?: number;
}

export interface Goal {
  objective: string;
  constraints: string[];
  successCondition: string;
  deadline?: string;
  budget: GoalBudget;
}

export interface GoalSnapshot {
  objective: string;
  constraints: string[];
  successCondition: string;
  deadline?: string;
  budget: {
    maxRounds: number;
    maxTokensUSD: number;
    maxWallTimeMs: number;
    maxTokensNum?: number;
    warnAtPercent?: number;
  };
}

// ─── Layer 6 · Tool Layer ───────────────────────────────────
export interface MCPRef {
  name: string;
  command: string;
}

export interface SubagentRef {
  name: string;
  prompt: string;
  tools?: string[];
}

export type PermissionMode = 'plan' | 'acceptEdits' | 'bypassPermissions' | 'interactive';

export interface ToolLayerConfig {
  skills: string[];
  tools: string[];
  mcpServers: MCPRef[];
  subagents: SubagentRef[];
  permissionMode: PermissionMode; // default: "acceptEdits"
  allowedDirs: string[];
  disallowedTools?: string[];
  systemPrompt?: string;
}

// ─── SDAF 4 Stages ──────────────────────────────────────────
export interface SDAFStage {
  phase: 'sense' | 'decide' | 'act' | 'feedback';
  prompt: string;
  skills: string[];
  tools: string[];
  permissionMode?: PermissionMode;
  model?: string;
  outputEnabled: boolean;
  outputSpec: string;
}

// ─── Phase (ADR-0009) ───────────────────────────────────────
export type PhaseEvaluator =
  | { type: 'shell'; command: string }
  | { type: 'llm-judge'; prompt: string }
  | { type: 'regex'; pattern: string }
  | { type: 'none' };

export type BranchCondition =
  | { if: string; nextPhase: string }
  | { default: string };

export interface Phase {
  id: string;
  name: string;
  order: number;
  systemPromptTemplate?: string;
  appendUserMessage?: string;
  agent?: 'claude-code';
  model?: string;
  effort?: 'low' | 'medium' | 'high';
  skills: string[];
  tools: string[];
  mcpServers?: MCPRef[];
  subagents?: SubagentRef[];
  permissionMode?: PermissionMode;
  allowedDirs?: string[];
  disallowedTools?: string[];
  evaluator: PhaseEvaluator;
  branches: BranchCondition[];
  maxTurns?: number;
  maxBudgetUsd?: number;
}

// ─── Trigger ─────────────────────────────────────────────────
export type TriggerConfig =
  | { type: 'manual' }
  | { type: 'once'; at: string }
  | { type: 'cron'; expression: string; times?: string[] }
  | { type: 'webhook'; secret?: string }
  | { type: 'git-push'; repo: string; branch?: string }
  | { type: 'git-pr'; repo: string; events: string[] }
  | { type: 'git-issue'; repo: string; labels?: string[]; events: string[] }
  | { type: 'git-comment'; repo: string; mention?: string }
  | { type: 'ci-finished'; provider: string; events: string[] }
  | { type: 'email'; filter?: { from?: string; subject?: string }; mode?: 'imap' | 'webhook' }
  | { type: 'lark-msg'; filter?: { chatId?: string; mention?: string } }
  | { type: 'slack-msg'; filter?: { channel?: string; mention?: string } }
  | { type: 'discord-msg'; filter?: { channel?: string } }
  | { type: 'file-watch'; path: string; events: string[]; pattern?: string }
  | { type: 'boot'; delaySec?: number }
  | { type: 'upstream-loop'; upstreamLoopId: string; filter: { status: string } };

// ─── Notification ────────────────────────────────────────────
export interface NotificationConfig {
  on: {
    success: boolean;
    failure: boolean;
    humanGate: boolean;
    budgetWarning: boolean;
    progress: boolean;
    progressEveryN?: number;
    senseComplete?: boolean;
    decideComplete?: boolean;
    actComplete?: boolean;
    feedbackComplete?: boolean;
  };
  channels: {
    desktop?: boolean;
    browser?: boolean;
    email?: { to: string; smtp: { host: string; port: number; user: string; pass: string } };
    lark?: { webhookUrl: string };
    slack?: { webhookUrl: string };
    discord?: { webhookUrl: string };
    telegram?: { botToken: string; chatId: string };
    skill?: { name: string; prompt: string };
    cli?: { command: string };
  };
  template?: {
    titleTemplate?: string;
    bodyTemplate?: string;
    includeAuditLink?: boolean;
    includeRunLink?: boolean;
  };
}

// ─── Deny ────────────────────────────────────────────────────
export interface DenyConfig {
  editPaths?: string[];
  deletePaths?: string[];
  strictBoundary?: boolean; // default: true
  bashCommands?: string[];
  customRules?: string[];
  gitPush?: boolean; // default: true (禁止)
  gitCommit?: boolean; // default: false (不禁止)
}

// ─── Retry Policy ────────────────────────────────────────────
export interface RetryPolicy {
  maxRetries: number;
  timeoutMinutes: number;
  onFail: 'stop' | 'notify' | 'escalate';
}

// ─── Blueprint ───────────────────────────────────────────────
export interface Blueprint {
  id: string;
  goal: Goal;
  agent: 'claude-code' | 'opencode' | 'codex';
  model?: string;
  projectPath: string;
  triggers: TriggerConfig[];
  defaultToolLayer: ToolLayerConfig;
  sdafStages: SDAFStage[];
  phases: Phase[];
  startPhaseId?: string;
  plannerConfig?: any;
  contextBuilderConfig?: any;
  verificationConfig?: any;
  memoryConfig?: any;
  reflectionConfig?: any;
  humanGateConfig?: any;
  notification?: NotificationConfig;
  deny?: DenyConfig;
  retryPolicy: RetryPolicy;
  type: string[];
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

// ─── Run ─────────────────────────────────────────────────────
export type RunStatus =
  | 'idle'
  | 'initializing'
  | 'running'
  | 'evaluating'
  | 'success'
  | 'retrying'
  | 'failed'
  | 'stopped';

export interface PhaseExecution {
  phaseId: string;
  startedAt: string;
  endedAt?: string;
  status: 'running' | 'evaluating' | 'passed' | 'failed' | 'skipped';
  evaluatorResult?: any;
  branchTaken?: string;
  toolCallCount: number;
  tokensIn: number;
  tokensOut: number;
}

export interface BudgetUsage {
  tokensUsedUsd: number;
  roundsUsed: number;
  wallTimeMs: number;
}

export interface DoneResult {
  passed: boolean;
  exitCode: number;
  stdoutTail: string;
  stderrTail: string;
  durationMs: number;
}

export interface Run {
  id: string;
  blueprintId: string;
  blueprintSnapshot: Blueprint;
  status: RunStatus;
  iteration: number;
  parentRunId?: string;
  startedAt?: Date;
  endedAt?: Date;
  exitCode?: number;
  errorSnippet?: string;
  rawLogPath?: string;
  tokenCostUsd?: number;
  doneCriteriaResult?: DoneResult;
  pid?: number;
  claudeSessionId?: string;
  currentPhaseId?: string;
  phaseHistory: PhaseExecution[];
  currentRound: number;
  goal: GoalSnapshot;
  stateYamlPath?: string;
  budgetUsage: BudgetUsage;
  plannerHistory: any[];
  verificationHistory: any[];
  reflectionHistory: any[];
  humanGateHistory: any[];
  auditStatus: 'pending' | 'written' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

// ─── Audit Event ─────────────────────────────────────────────
export type AuditEventType =
  | 'trigger_fired'
  | 'run_started'
  | 'run_status_change'
  | 'planner_call'
  | 'task_started'
  | 'task_completed'
  | 'tool_call'
  | 'tool_call_result'
  | 'verification'
  | 'reflection'
  | 'human_gate'
  | 'budget_warning'
  | 'notification_sent'
  | 'run_completed'
  | 'permission_denied'
  | 'memory_write'
  | 'context_injected'
  | 'run_stopped'
  | 'agent_spawned'
  | 'skill_load_error';

export type AuditLayer = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8' | 'cross';

export interface AuditEvent {
  id: string;
  runId: string;
  blueprintId: string;
  eventType: AuditEventType;
  layer?: AuditLayer;
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
  toolArgs?: any;
  toolResult?: string; // truncated to 32KB
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  exitCode?: number;
  status?: string;
  statusFrom?: string;
  statusTo?: string;
  prompt?: string; // truncated to 64KB
  response?: string; // truncated to 8KB
  error?: string;
  occurredAt: string;
  recordedAt: string;
  timezoneOffset: string;
  createdAt: string;
}

// ─── Session ─────────────────────────────────────────────────
export interface Session {
  id: string;
  runId: string;
  blueprintId: string;
  agentName: string;
  model?: string;
  startedAt: string;
  endedAt?: string;
  toolCallCount: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  status: 'active' | 'completed' | 'killed';
  createdAt: string;
}

// ─── Pending Gate ────────────────────────────────────────────
export interface PendingGate {
  id: string;
  runId: string;
  blueprintId: string;
  round: number;
  taskId?: string;
  mode: 'interrupt' | 'default-approve' | 'default-reject';
  triggerCondition: string;
  requestedAt: string;
  respondedAt?: string;
  decision?: 'approve' | 'reject' | 'timeout';
  decidedBy?: string;
  timeoutMs?: number;
  timeoutAction?: string;
  createdAt: string;
}

// ─── Memory ──────────────────────────────────────────────────
export interface MemoryEntry {
  id: string;
  blueprintId?: string;
  type: string;
  content: string;
  context?: any;
  createdAt: string;
  effectiveness: number;
}

// ─── Notification ────────────────────────────────────────────
export interface NotificationRecord {
  id: string;
  runId?: string;
  blueprintId?: string;
  eventType: string;
  channel: string;
  title?: string;
  body?: string;
  payload?: any;
  sentAt?: string;
  deliveredAt?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  error?: string;
  createdAt: string;
}

// ─── Audit Trail (file) ──────────────────────────────────────
export interface AuditTrail {
  schemaVersion: '2.0';
  runId: string;
  blueprintId: string;
  blueprintSnapshot: Blueprint;
  goalSnapshot: GoalSnapshot;
  execution: {
    startedAt: string;
    endedAt: string;
    durationMs: number;
    claudeSessionId: string;
    totalRounds: number;
    totalTasks: number;
    totalToolCalls: number;
  };
  rounds: Array<{
    round: number;
    startedAt: string;
    endedAt: string;
    planner?: {
      model: string;
      rationale: string;
      tasks: Array<{ id: string; description: string; priority: string }>;
      tokensUsed: number;
    };
    taskExecutions: Array<{
      taskId: string;
      contextBundle?: { skills: string[]; tools: string[]; memoryEntries: any[] };
      spawnCommand?: string;
      toolCalls: any[];
      exitCode?: number;
      tokensUsed: number;
      verification?: {
        evaluatorType: string;
        passed: boolean;
        result: any;
        nextAction: string;
      };
    }>;
    memoryDelta?: { added: any[]; updated: any[] };
    reflection?: { failureReason: string; diagnosis: string; plannedFix: string };
    humanGate?: {
      mode: string;
      requestedAt: string;
      decision?: string;
      decidedBy?: string;
      respondedAt?: string;
    };
  }>;
  finalState: {
    status: 'success' | 'failed' | 'stopped';
    goalAchieved: boolean;
    budgetUsage: BudgetUsage;
    errorSnippet?: string;
  };
}
