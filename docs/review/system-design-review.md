# Loop Cockpit 系统设计审查清单

> **用途**: 给审查者(同事/团队)的系统设计全景图。覆盖原型、文档、数据库、技术栈、接口、审计追踪。
> **审查者**: 任何人需要理解"Loop Cockpit 是什么 / 怎么造 / 怎么审计"
> **生成日期**: 2026-06-28

---

## 一、审查对象清单

### 原型图

| 编号 | 文件 | 说明 | 状态 |
|---|---|---|---|
| **P1** | [`docs/prototype/features/blueprint-editor/v7/index.html`](../prototype/features/blueprint-editor/v7/index.html) | Blueprint 编辑器 — 6 块 UI，简单/专家模式，17+ 触发器，SDAF 4 阶段，完整交互 | ✅ 最新版 v7 |
| **P2** | [`docs/prototype/features/dashboard/index.html`](../prototype/features/dashboard/index.html) | Dashboard 总览 — 列表 + 统计 | 📝 待完善 |
| **P3** | [`docs/prototype/features/run-detail/index.html`](../prototype/features/run-detail/index.html) | Run 详情页 — Xterm + 状态 + 审计 | 📝 待完善 |

> **删除的旧原型**: `blueprint-editor/v5/`, `blueprint-editor/v6/`, `blueprint-editor/index.html`(根) 已全部清理。

### 文档体系

| 编号 | 文件 | 说明 | 状态 |
|---|---|---|---|
| **D1** | [`docs/architecture/overview.md`](../architecture/overview.md) | 系统分层(4 层) + 核心抽象(AgentAdapter/TriggerSource) + 模块边界 + 三轨持久化 | v1.0 |
| **D2** | [`docs/architecture/product-overview.md`](../architecture/product-overview.md) | 产品定位 + 8 层模块列表(A-O) + 部署形态 + Iter 路线图 | v1.0 |
| **D3** | [`docs/architecture/loop-anatomy.md`](../architecture/loop-anatomy.md) | Loop 完整数据流图解 + 8 个场景示例 + 配置视图 | v1.0 |
| **D4** | [`docs/architecture/triggers.md`](../architecture/triggers.md) | 全部 20+ 触发器枚举 + TriggerEvent payload schema + Trigger Bus 架构图 | v1.0 |
| **D5** | [`docs/architecture/non-goals.md`](../architecture/non-goals.md) | 10 条"绝不做"规则 | v1.0 |
| **D6** | [`docs/architecture/glossary.md`](../architecture/glossary.md) | 术语锁定表 + 混淆矩阵 | v0.4 |

### ADR(架构决策记录)

| 编号 | 文件 | 说明 | 状态 |
|---|---|---|---|
| **A1** | [`docs/architecture/decisions/0001-tech-stack.md`](../architecture/decisions/0001-tech-stack.md) | TS/Node 20/pnpm/Fastify/Drizzle/SQLite/Vite+React/Xterm.js/Pino — **Accepted** | v1.0 |
| **A2** | [`docs/architecture/decisions/0002-node-pty.md`](../architecture/decisions/0002-node-pty.md) | node-pty 选型 + 三坑对策 — **Proposed** | v1.0 |
| **A3** | [`docs/architecture/decisions/0003-sqlite-drizzle.md`](../architecture/decisions/0003-sqlite-drizzle.md) | SQLite + Drizzle + WAL + drizzle-kit — **Accepted** | v1.0 |
| **A9** | [`docs/architecture/decisions/0009-phase-orchestration.md`](../architecture/decisions/0009-phase-orchestration.md) | Phase 有向图编排 + session-id 共享 — **Accepted** | v1.0 |
| **A10** | [`docs/architecture/decisions/0010-autonomous-loop-architecture.md`](../architecture/decisions/0010-autonomous-loop-architecture.md) | 8 层自治架构 + 2 横切层 + Iter 路线图 — **Accepted** | v1.0 |
| **A11** | [`docs/architecture/decisions/0011-document-convergence.md`](../architecture/decisions/0011-document-convergence.md) | 4 处 P0 矛盾收敛 + 12+ 处 P1 修复 + Iter 2 准入锁定 — **Accepted** | v1.0 |

### PRD(产品需求文档)

| 编号 | 文件 | 说明 | 状态 |
|---|---|---|---|
| **F001** | [`docs/prd/F001-pty-runner.md`](../prd/F001-pty-runner.md) | PTY Runner — node-pty 拉起 Claude — **Done**(Iter 1) | v0.1 |
| **F002** | [`docs/prd/F002-blueprint-editor.md`](../prd/F002-blueprint-editor.md) | Blueprint 编辑器 — 6 块 UI + 8 层 schema + 17+ 触发器 + SDAF 4 阶段 | v0.6 |
| **F003** | [`docs/prd/F003-run-state-machine.md`](../prd/F003-run-state-machine.md) | Run 状态机(7 状态) + 生命周期编排 + Round-based 推进 | v0.3 |
| **F004** | [`docs/prd/F004-claude-adapter.md`](../prd/F004-claude-adapter.md) | Claude Code Adapter + PTY Harness + WebSocket 实时流 | v0.3 |
| **F005** | [`docs/prd/F005-audit-trail.md`](../prd/F005-audit-trail.md) | Audit Trail 落盘 — 完整决策路径快照 | v0.2 |
| **F006** | [`docs/prd/F006-planner.md`](../prd/F006-planner.md) | Planner(L2) — 每轮出任务列表 | 骨架 |
| **F007** | [`docs/prd/F007-context-builder.md`](../prd/F007-context-builder.md) | Context Builder(L3) — 按需挑上下文 | 骨架 |
| **F008** | [`docs/prd/F008-verification.md`](../prd/F008-verification.md) | Verification(L7) — 多 evaluator | 骨架 |
| **F009** | [`docs/prd/F009-memory.md`](../prd/F009-memory.md) | Memory(L8) — state.yaml + FTS5 | 骨架 |
| **F010** | [`docs/prd/F010-human-gate.md`](../prd/F010-human-gate.md) | Human Gate — 3 模式 | 骨架 |
| **F011** | [`docs/prd/F011-reflection.md`](../prd/F011-reflection.md) | Reflection — Reflexion 论文 | 骨架 |

### UI Spec

| 编号 | 文件 | 说明 | 状态 |
|---|---|---|---|
| **U1** | [`docs/design/ui-spec/blueprint-editor.md`](../design/ui-spec/blueprint-editor.md) | Blueprint 编辑器 UI Spec v2 — 6 块布局 + 每元素三维度 | v2.0 |
| **U2** | [`docs/design/ui-spec/dashboard.md`](../design/ui-spec/dashboard.md) | Dashboard UI Spec | 📝 待写 |
| **U3** | [`docs/design/ui-spec/run-detail.md`](../design/ui-spec/run-detail.md) | Run Detail UI Spec | 📝 待写 |
| **U4** | [`docs/design/ui-spec/i18n-dict.md`](../design/ui-spec/i18n-dict.md) | i18n 双语词典 | 📝 待写 |

### 其他

| 编号 | 文件 | 说明 |
|---|---|---|
| **R1** | [`docs/roadmap.md`](../roadmap.md) | Iter 1-7+ 时间线 |
| **NG** | [`docs/architecture/non-goals.md`](../architecture/non-goals.md) | 10 条"绝不做" |
| **SP** | [`spike/pty/`](../../spike/pty/) | PTY Spike 代码 + 验证报告 |
| **RE** | [`notes/2026-06-28-loop-engineering-research.md`](../../notes/2026-06-28-loop-engineering-research.md) | Loop Engineering 研究报告(50+ 源对比) |

---

## 二、数据库设计

### 2.1 表清单

| # | 表名 | 说明 | 迭代 |
|---|---|---|---|
| 1 | **blueprints** | Loop 配置(8 层规则) | Iter 2 |
| 2 | **runs** | 一次执行实例 | Iter 2 |
| 3 | **audit_events** | 全量审计事件(每 tool call / 状态变更 / 预算消耗) | Iter 2 |
| 4 | **sessions** | Claude Code session 记录 | Iter 2 |
| 5 | **pending_gates** | Human Gate 等待审批记录 | Iter 5 |
| 6 | **memories** | 跨 Loop 经验(FTS5) | Iter 5 |
| 7 | **notifications** | 通知发送记录 | Iter 6 |

### 2.2 表 1: blueprints

```sql
CREATE TABLE blueprints (
  id TEXT PRIMARY KEY,              -- nanoid, bp_xxx
  -- Layer 1 · Goal
  goal TEXT NOT NULL,               -- JSON: {objective, constraints[], successCondition, deadline?, budget}
  -- Worker (Layer 5)
  agent TEXT NOT NULL DEFAULT 'claude-code',  -- "claude-code" | "opencode" | "codex"
  model TEXT,                       -- "claude-sonnet-4-6" | "claude-opus-4-8" | ...
  -- Project / File Boundary
  project_path TEXT NOT NULL,       -- 绝对路径
  -- Trigger (Layer 0)
  triggers TEXT NOT NULL DEFAULT '[]',  -- JSON: TriggerConfig[]
  -- Tool Layer (Layer 6)
  default_tool_layer TEXT NOT NULL,     -- JSON: {skills[], tools[], mcpServers[], subagents[], permissionMode, allowedDirs[], disallowedTools[]}
  -- SDAF 4 Stages (Expert, Iter 3+)
  sdaf_stages TEXT NOT NULL DEFAULT '[]', -- JSON: [{phase:'sense'|'decide'|'act'|'feedback', prompt, skills[], tools[], permissionMode?, model?, outputEnabled, outputSpec}]
  -- Phase Orchestration (ADR-0009)
  phases TEXT NOT NULL DEFAULT '[]',    -- JSON: Phase[]
  start_phase_id TEXT,
  -- Iter 3+ 八层模块
  planner_config TEXT,                  -- JSON: PlannerConfig (Iter 3)
  context_builder_config TEXT,          -- JSON: CBConfig (Iter 4)
  verification_config TEXT,           -- JSON: VerifConfig (Iter 5)
  memory_config TEXT,                 -- JSON: MemoryConfig (Iter 5)
  reflection_config TEXT,             -- JSON: ReflectionConfig (Iter 3)
  human_gate_config TEXT,             -- JSON: HumanGateConfig (Iter 5)
  -- Notification (Block 4)
  notification TEXT,                  -- JSON: NotificationConfig (Iter 6)
  -- Deny (Block 6)
  deny TEXT,                          -- JSON: DenyConfig
  -- Retry Policy
  retry_policy TEXT NOT NULL,         -- JSON: {maxRetries, timeoutMinutes, onFail}
  -- Metadata
  type TEXT DEFAULT '[]',             -- JSON: string[] (bug/refactor/test/docs/check/other)
  status TEXT NOT NULL DEFAULT 'active', -- "active" | "disabled"
  created_at TIMESTAMP NOT NULL,      -- UTC ISO8601
  updated_at TIMESTAMP NOT NULL       -- UTC ISO8601
);

CREATE INDEX idx_blueprints_status ON blueprints(status);
CREATE INDEX idx_blueprints_type ON blueprints(type);
CREATE INDEX idx_blueprints_created ON blueprints(created_at DESC);
```

#### goal 字段 JSON 格式:
```json
{
  "objective": "保持 main 分支健康",
  "constraints": ["不能改 API 接口"],
  "successCondition": "pnpm lint && pnpm test && pnpm build",
  "deadline": "2026-07-01T00:00:00.000Z",
  "budget": {
    "maxRounds": 10,
    "maxTokensUSD": 1.0,
    "maxWallTimeMs": 600000,
    "maxTokensNum": null,
    "warnAtPercent": 80
  }
}
```

#### triggers 字段 JSON 格式:
```json
[
  {
    "type": "cron",
    "expression": "0 9 * * *",
    "times": ["09:00", "18:00"]
  }
]
```

#### default_tool_layer 字段 JSON 格式:
```json
{
  "skills": ["brainstorming", "test-driven-development"],
  "tools": ["Bash", "Read", "Edit", "Write", "Glob", "Grep"],
  "mcpServers": [{"name": "github", "command": "npx -y @modelcontextprotocol/server-github"}],
  "subagents": [{"name": "code-reviewer", "prompt": "...", "tools": "Read,Grep,Edit"}],
  "permissionMode": "acceptEdits",
  "allowedDirs": ["/Users/rocky/project/Loop-Cockpit"],
  "disallowedTools": ["Bash(rm:*)"],
  "systemPrompt": "{{goal.objective}} 在 {{projectPath}} 工作。"
}
```

#### sdaf_stages 字段 JSON 格式:
```json
[
  {
    "phase": "sense",
    "prompt": "读取 {{projectPath}} 下文件结构和 README.md",
    "skills": ["code-review", "systematic-debugging"],
    "tools": ["Read", "Glob", "Grep", "Bash"],
    "outputEnabled": true,
    "outputSpec": "上下文摘要: 文件结构 + README + 依赖声明"
  },
  {
    "phase": "decide",
    "prompt": "根据感知结果,出本轮要做的任务,标优先级 P0/P1/P2",
    "skills": ["writing-plans"],
    "tools": ["Read", "Grep"],
    "model": "claude-opus-4-8",
    "outputEnabled": true,
    "outputSpec": "任务列表: [{id, desc, priority, successCriteria}]"
  },
  {
    "phase": "act",
    "prompt": "按决策给的任务,一个一个执行",
    "skills": ["test-driven-development"],
    "tools": ["Bash", "Edit", "Write"],
    "permissionMode": "acceptEdits",
    "outputEnabled": true,
    "outputSpec": "文件改动: [edited, created, deleted] + 关键日志"
  },
  {
    "phase": "feedback",
    "prompt": "",
    "skills": [],
    "tools": [],
    "outputEnabled": true,
    "outputSpec": "验证报告: {taskCompleted, goalAchieved, nextAction, reasoning}"
  }
]
```

#### deny 字段 JSON 格式:
```json
{
  "editPaths": ["package.json", "LICENSE"],
  "deletePaths": ["**/*.test.ts"],
  "strictBoundary": true,
  "bashCommands": ["rm -rf /", "curl * | sh", "sudo *"],
  "customRules": ["Bash(rm:*)", "Write(/etc/*)"],
  "gitPush": true,
  "gitCommit": false
}
```

### 2.3 表 2: runs

```sql
CREATE TABLE runs (
  id TEXT PRIMARY KEY,              -- nanoid, r_xxx
  blueprint_id TEXT NOT NULL REFERENCES blueprints(id),
  blueprint_snapshot TEXT NOT NULL,  -- JSON: 完整 Blueprint 快照(运行时版本)

  -- Status Machine
  status TEXT NOT NULL DEFAULT 'idle',
  -- ENUM: idle | initializing | running | evaluating | success | retrying | failed | stopped
  iteration INTEGER NOT NULL DEFAULT 0,  -- 重试次数(同一 run.id)
  parent_run_id TEXT REFERENCES runs(id),  -- D2.4 "Re-run with current changes"

  -- Timestamps (UTC ISO8601)
  started_at TIMESTAMP,
  ended_at TIMESTAMP,

  -- Result
  exit_code INTEGER,
  error_snippet TEXT,               -- 最后 256 字节 stderr/stdout
  raw_log_path TEXT,                -- ~/.loop-cockpit/runs/<runId>/raw.log
  token_cost_usd REAL,              -- 累计 token 花费(美元)
  done_criteria_result TEXT,        -- JSON: {passed, exitCode, stdoutTail, stderrTail, durationMs}

  -- PTY Process (ADR-0011)
  pid INTEGER,                      -- Claude Code PTY 进程 PID(reaper 用)

  -- Phase Orchestration (ADR-0009)
  claude_session_id TEXT,           -- 同 Run 跨 Phase 共享 UUID
  current_phase_id TEXT,
  phase_history TEXT NOT NULL DEFAULT '[]',  -- JSON: PhaseExecution[]

  -- 8-Layer Round-Based (ADR-0010)
  current_round INTEGER NOT NULL DEFAULT 0,
  goal TEXT NOT NULL,              -- JSON: GoalSnapshot (启动时快照)
  state_yaml_path TEXT,            -- ~/.loop-cockpit/runs/<runId>/state.yaml
  budget_usage TEXT NOT NULL DEFAULT '{}',  -- JSON: {tokensUsedUsd, roundsUsed, wallTimeMs}

  -- Layer History (Iter 3+ 填充)
  planner_history TEXT NOT NULL DEFAULT '[]',   -- JSON: PlannerCall[] (Iter 3)
  verification_history TEXT NOT NULL DEFAULT '[]', -- JSON: VerifResult[] (Iter 2 起)
  reflection_history TEXT NOT NULL DEFAULT '[]',   -- JSON: ReflectionEntry[] (Iter 3)
  human_gate_history TEXT NOT NULL DEFAULT '[]',     -- JSON: HumanGateEntry[] (Iter 5)

  -- Audit
  audit_status TEXT NOT NULL DEFAULT 'pending', -- "pending" | "written" | "failed"
  created_at TIMESTAMP NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TIMESTAMP NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_runs_blueprint ON runs(blueprint_id);
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_runs_created ON runs(created_at DESC);
CREATE INDEX idx_runs_parent ON runs(parent_run_id);
```

#### phase_history JSON 格式:
```json
[
  {
    "phaseId": "phase_1",
    "startedAt": "2026-06-28T09:00:00.123Z",
    "endedAt": "2026-06-28T09:01:30.456Z",
    "status": "passed",
    "evaluatorResult": {"exitCode": 0, "passed": true},
    "branchTaken": "__terminal__",
    "toolCallCount": 12,
    "tokensIn": 5000,
    "tokensOut": 3000
  }
]
```

### 2.4 表 3: audit_events (★ 核心审计表)

> **设计原则**: 所有 AI 行为全量记录。每条事件含精确时间戳(UTC ISO8601)、时区偏移、来源。

```sql
CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,              -- nanoid, ae_xxx
  run_id TEXT NOT NULL REFERENCES runs(id),
  blueprint_id TEXT NOT NULL,       -- 冗余,方便单独查询

  -- 事件分类
  event_type TEXT NOT NULL,
  -- ENUM(14+6=20 种,见 ADR-0011):
  --   trigger_fired     — 触发器触发
  --   run_started       — Run 开始
  --   run_status_change — 状态变更
  --   planner_call      — Planner 调用
  --   task_started      — 任务开始
  --   task_completed    — 任务完成
  --   tool_call         — Agent 工具调用
  --   tool_call_result  — 工具调用结果
  --   verification      — Verification 评估
  --   reflection        — Reflection 反思
  --   human_gate        — Human Gate 审批
  --   budget_warning    — 预算警告
  --   notification_sent — 通知发送
  --   run_completed     — Run 完成(终态)
  --   ★ 新增(ADR-0011):
  --   permission_denied — deny 规则命中,tool call 被拒绝
  --   memory_write      — L8 Memory 写入
  --   context_injected  — L3 ContextBuilder 注入
  --   run_stopped       — Run 停止(区分 user/timeout/budget)
  --   agent_spawned     — L4 Orchestrator spawn Claude Code
  --   skill_load_error  — Skill 文件加载失败

  -- 层级溯源
  layer TEXT,                       -- "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7" | "L8" | "cross"
  round INTEGER,                    -- 当前 Round 编号
  task_id TEXT,                     -- 当前 Task ID(如果有)
  phase_id TEXT,                    -- 当前 Phase ID(如果有)

  -- Agent 信息
  agent_name TEXT NOT NULL,         -- "claude-code" | "opencode" | "codex"
  model TEXT,                       -- "claude-sonnet-4-6" | "claude-opus-4-8" | ...
  claude_session_id TEXT,           -- Claude Code --session-id UUID

  -- 工具使用(如果是 tool_call 事件)
  tool_used TEXT,                   -- "Bash" | "Read" | "Edit" | "Write" | "Glob" | "Grep" | "WebFetch" | ...
  skill_used TEXT,                  -- "brainstorming" | "test-driven-development" | ...
  mcp_server TEXT,                  -- "github" | "filesystem" | ...
  subagent_used TEXT,               -- "code-reviewer" | ...
  tool_args TEXT,                   -- JSON: 工具调用参数
  tool_result TEXT,                 -- JSON: 工具调用结果摘要(截断到 32KB,超量溢出到文件 + 字段指针)

  -- 资源消耗
  tokens_in INTEGER,                -- 输入 token 数
  tokens_out INTEGER,               -- 输出 token 数
  cost_usd REAL,                    -- 本次花费(美元)

  -- 结果
  exit_code INTEGER,                -- 工具/任务/Run 的退出码
  status TEXT,                      -- 当前状态值(状态变更事件)
  status_from TEXT,                 -- 变更前状态
  status_to TEXT,                   -- 变更后状态

  -- 内容
  prompt TEXT,                      -- 发送给 Agent 的 prompt(含 system prompt,截断到 64KB)
  response TEXT,                    -- Agent 响应摘要(截断到 8KB)
  error TEXT,                       -- 错误信息(如果有)

  -- 时间
  occurred_at TIMESTAMP NOT NULL,   -- UTC ISO8601, 事件实际发生时间
  recorded_at TIMESTAMP NOT NULL,   -- UTC ISO8601, 写入 DB 时间(用于检测延迟)
  timezone_offset TEXT,             -- "+08:00" 等,记录用户时区

  created_at TIMESTAMP NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_audit_run ON audit_events(run_id);
CREATE INDEX idx_audit_type ON audit_events(event_type);
CREATE INDEX idx_audit_layer ON audit_events(layer);
CREATE INDEX idx_audit_agent ON audit_events(agent_name);
CREATE INDEX idx_audit_tool ON audit_events(tool_used);
CREATE INDEX idx_audit_skill ON audit_events(skill_used);
CREATE INDEX idx_audit_session ON audit_events(claude_session_id);
CREATE INDEX idx_audit_time ON audit_events(occurred_at DESC);
CREATE INDEX idx_audit_round ON audit_events(run_id, round);
```

#### audit_events 字段详解:

| 字段 | 类型 | 说明 | 示例 |
|---|---|---|---|
| `event_type` | TEXT | 事件分类(见 ENUM) | `"tool_call"` |
| `layer` | TEXT | 8 层架构中的哪一层触发的 | `"L5"` (Worker) |
| `round` | INTEGER | 当前自治轮次 | `3` |
| `task_id` | TEXT | 当前任务 ID | `"t_abc123"` |
| `phase_id` | TEXT | 当前 Phase ID | `"phase_sense"` |
| `agent_name` | TEXT | Agent 名称 | `"claude-code"` |
| `model` | TEXT | 使用的模型 | `"claude-sonnet-4-6"` |
| `claude_session_id` | TEXT | Claude session UUID | `"550e8400-e29b-41d4-a716-446655440000"` |
| `tool_used` | TEXT | 使用的工具 | `"Bash"` |
| `skill_used` | TEXT | 使用的 Skill | `"test-driven-development"` |
| `mcp_server` | TEXT | 使用的 MCP Server | `"github"` |
| `subagent_used` | TEXT | 使用的 Subagent | `"code-reviewer"` |
| `tool_args` | TEXT | 工具参数(JSON) | `{"command": "pnpm test"}` |
| `tool_result` | TEXT | 结果摘要(截断 4KB) | `"PASS  src/foo.test.ts (0.5s)\n..."` |
| `tokens_in` | INTEGER | 输入 token | `5234` |
| `tokens_out` | INTEGER | 输出 token | `1823` |
| `cost_usd` | REAL | 花费(美元) | `0.0234` |
| `exit_code` | INTEGER | 退出码 | `0` |
| `prompt` | TEXT | 完整 prompt(截断 16KB) | `"Fix Issue #123..."` |
| `response` | TEXT | 响应摘要(截断 8KB) | `"Edited src/foo.ts..."` |
| `occurred_at` | TIMESTAMP | 事件实际发生时间 | `"2026-06-28T09:01:23.456Z"` |
| `recorded_at` | TIMESTAMP | 写入 DB 时间 | `"2026-06-28T09:01:23.458Z"` |
| `timezone_offset` | TEXT | 用户时区 | `"+08:00"` |

#### 事件记录时机:

| event_type | 何时记录 | 包含字段 |
|---|---|---|
| `trigger_fired` | 触发器触发时 | trigger type, firedAt, blueprintId |
| `run_started` | Run 进入 initializing | agent, model, projectPath |
| `run_status_change` | 每次状态变更 | statusFrom, statusTo, occurredAt(timezone) |
| `planner_call` | L2 Planner 调用后 | round, tasks[], rationale, tokens, model |
| `task_started` | 每个 Task 开始 | taskId, phaseId, round |
| `task_completed` | 每个 Task 完成 | taskId, exitCode, tokens, costUsd |
| `tool_call` | 每次工具调用 | toolUsed, skillUsed, mcpServer, toolArgs, tokens, costUsd |
| `tool_call_result` | 工具返回结果 | toolResult(exitCode, stdoutTail) |
| `verification` | L7 Verification 评估 | evaluatorType, passed, nextAction |
| `reflection` | L11 Reflection 触发 | failureReason, diagnosis, plannedFix |
| `human_gate` | L10 Human Gate 触发/审批 | mode, decision, decidedBy, respondedAt |
| `budget_warning` | 预算达到阈值 | budgetType, currentPercent, thresholdPercent |
| `notification_sent` | 通知发出 | channel, event, success |
| `run_completed` | Run 进入终态 | finalStatus, totalRounds, totalCostUsd, totalTokens |
| `permission_denied` | deny 规则命中,tool call 被拒绝 | toolUsed, deniedRule, toolArgs |
| `memory_write` | L8 Memory 写入 | memoryId, type, contentHash |
| `context_injected` | L3 ContextBuilder 注入 ContextBundle | skills[], mcpServers[], tools[] |
| `run_stopped` | Run 停止(区分来源) | stopSource: "user" | "timeout" | "budget" |
| `agent_spawned` | L4 Orchestrator spawn Claude Code | spawnCommand, cliArgs, envKeys(不记值), cwd |
| `skill_load_error` | Skill 文件加载失败 | skillName, error |

### 2.5 表 4: sessions

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,              -- UUID, Claude --session-id
  run_id TEXT NOT NULL REFERENCES runs(id),
  blueprint_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,         -- "claude-code"
  model TEXT,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  tool_call_count INTEGER NOT NULL DEFAULT 0,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- "active" | "completed" | "killed"
  created_at TIMESTAMP NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_sessions_run ON sessions(run_id);
CREATE INDEX idx_sessions_status ON sessions(status);
```

### 2.6 表 5: pending_gates

```sql
CREATE TABLE pending_gates (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  blueprint_id TEXT NOT NULL,
  round INTEGER NOT NULL,
  task_id TEXT,
  mode TEXT NOT NULL,               -- "interrupt" | "default-approve" | "default-reject"
  trigger_condition TEXT NOT NULL,  -- 触发原因
  requested_at TIMESTAMP NOT NULL,
  responded_at TIMESTAMP,
  decision TEXT,                    -- "approve" | "reject" | "timeout"
  decided_by TEXT,                  -- 审批人标识
  timeout_ms INTEGER,
  timeout_action TEXT,              -- "approve" | "reject" | "pause"
  created_at TIMESTAMP NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_pending_gates_run ON pending_gates(run_id);
CREATE INDEX idx_pending_gates_status ON pending_gates(decision);
```

### 2.7 表 6: memories (Iter 5+)

```sql
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  blueprint_id TEXT,                -- NULL = 全局经验
  type TEXT NOT NULL,               -- "success_pattern" | "failure_pattern" | "tool_hint" | ...
  content TEXT NOT NULL,            -- 经验内容
  context TEXT,                     -- JSON: 触发上下文
  created_at TIMESTAMP NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  effectiveness REAL DEFAULT 0.0    -- 0-1, 后续反馈更新
);

-- FTS5 全文索引
CREATE VIRTUAL TABLE memories_fts USING fts5(content, context, content_valuelayer=memory);
```

### 2.8 表 7: notifications (Iter 6+)

```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES runs(id),
  blueprint_id TEXT,
  event_type TEXT NOT NULL,         -- "success" | "failure" | "humanGate" | ...
  channel TEXT NOT NULL,            -- "desktop" | "browser" | "email" | "lark" | "slack" | ...
  title TEXT,
  body TEXT,
  payload TEXT,                     -- JSON: 通知内容
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending', -- "pending" | "sent" | "delivered" | "failed"
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_notifications_run ON notifications(run_id);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_status ON notifications(status);
```

### 2.9 枚举值汇总

| 表 | 字段 | 枚举值 |
|---|---|---|
| runs | status | `idle`, `initializing`, `running`, `evaluating`, `success`, `retrying`, `failed`, `stopped` |
| runs | audit_status | `pending`, `written`, `failed` |
| runs | finalStatus | `success`, `failed`, `stopped` (run_completed 事件落点, ADR-0011 P0-3) |
| blueprints | status | `active`, `disabled` |
| blueprints | agent | `claude-code`, `opencode`, `codex` |
| blueprints | permissionMode | `plan`, `acceptEdits`, `bypassPermissions`, `interactive` |
| blueprints | retry onFail | `stop`, `notify`, `escalate` |
| audit_events | event_type | `trigger_fired`, `run_started`, `run_status_change`, `planner_call`, `task_started`, `task_completed`, `tool_call`, `tool_call_result`, `verification`, `reflection`, `human_gate`, `budget_warning`, `notification_sent`, `run_completed`, `permission_denied`, `memory_write`, `context_injected`, `run_stopped`, `agent_spawned`, `skill_load_error` |
| audit_events | layer | `L1`, `L2`, `L3`, `L4`, `L5`, `L6`, `L7`, `L8`, `cross` |
| audit_events | status | (同 runs.status) |
| sessions | status | `active`, `completed`, `killed` |
| pending_gates | mode | `interrupt`, `default-approve`, `default-reject` |
| pending_gates | decision | `approve`, `reject`, `timeout` |
| notifications | status | `pending`, `sent`, `delivered`, `failed` |
| notifications | channel | `desktop`, `browser`, `email`, `lark`, `slack`, `discord`, `telegram`, `skill`, `cli` |

### 2.10 字段格式规范

| 字段类型 | 格式 | 示例 |
|---|---|---|
| ID | nanoid (21 chars) | `r_K8xL2pQm9`, `bp_xxx`, `ae_yyy` |
| Timestamp | ISO 8601 UTC | `2026-06-28T09:00:00.123Z` |
| Timezone offset | ±HH:MM | `+08:00` |
| UUID | standard v4 | `550e8400-e29b-41d4-a716-446655440000` |
| JSON fields | pretty-print in DB (compact for performance) | — |
| Cost | USD, 4 decimal places | `0.0234` |
| Token count | integer | `5234` |

---

## 三、技术栈

| 层级 | 技术 | 版本 | 说明 |
|---|---|---|---|
| **语言** | TypeScript | 5.x | 全栈统一类型 |
| **运行时** | Node.js | 20+ LTS | 服务端 |
| **包管理** | pnpm | 11+ | workspace 模式 |
| **后端框架** | Fastify | 4.x | HTTP + WebSocket + @fastify/websocket |
| **ORM** | Drizzle ORM | 最新 | SQLite 优先 |
| **数据库驱动** | better-sqlite3 | 最新 | 同步 API, WAL mode |
| **迁移工具** | drizzle-kit | 最新 | day 1 生成 migration |
| **PTY** | node-pty | 1.1.0 | 虚拟 TTY, 已验证 |
| **前端框架** | React | 18+ | Vite 构建 |
| **样式** | Tailwind CSS | 3.x | CDN(原型) → 本地(正式) |
| **终端** | Xterm.js | 5.x | ANSI 渲染 + WebSocket 流 |
| **日志** | Pino | 8.x | 结构化日志 |
| **调度** | Agenda | 4.x | SQLite driver, Cron/Once/Webhook |
| **校验** | Zod | 3.x | API 请求校验 |
| **测试** | Vitest | 1.x | 单元测试 + E2E |
| **Git Hook** | Husky | 9.x | pre-commit (Iter 2) |

### 部署形态

| 形态 | 说明 |
|---|---|
| 本地 | `npx loop-cockpit start` → localhost |
| 私服 | 自己服务器部署,IP+port 访问 |
| 多机 | 多设备 IP 访问,token 归 Host 机器 |

---

## 四、API 设计

### 4.1 Blueprint CRUD

| Method | Path | Auth | 说明 |
|---|---|---|---|
| `POST` | `/api/blueprints` | — | 创建 Blueprint, zod 校验, 生成 skills-bundle |
| `GET` | `/api/blueprints` | — | 列表, 支持 `?status=active&type=bug&page=1&pageSize=20` |
| `GET` | `/api/blueprints/:id` | — | 详情(含 JSON 字段解析) |
| `PATCH` | `/api/blueprints/:id` | — | 更新, 若已有 Run 则返回 `warning: affects future runs` |
| `DELETE` | `/api/blueprints/:id` | — | 软删除(status→disabled), 有活跃 Run 时拒绝 |
| `POST` | `/api/blueprints/:id/dry-run-criteria` | — | 试跑 successCondition, 5s 内返回 `{exitCode, stdout, stderr, durationMs}` |
| `POST` | `/api/blueprints/:id/dry-run-trigger` | — | 模拟触发, 返回 ContextBundle 预览 |

### 4.2 Run 管理

| Method | Path | Auth | 说明 |
|---|---|---|---|
| `POST` | `/api/runs` | — | 触发 Run, body: `{blueprintId, reRunOf?: string}` |
| `POST` | `/api/runs/:id/stop` | — | SIGKILL Agent, status→stopped |
| `GET` | `/api/runs/:id` | — | Run 详情(含 phaseHistory/verificationHistory 等) |
| `GET` | `/api/runs` | — | 列表, `?blueprintId=&status=&page=1` |
| `GET` | `/api/runs/:id/logs` | — | SSE 流, 增量推送 raw.log 新内容 |

### 4.3 WebSocket

| Path | 方向 | 消息类型 | 说明 |
|---|---|---|---|
| `/api/runs/:id/stream` | S→C | `{type: "data", chunk: "..."}` | PTY raw ANSI 流 |
| `/api/runs/:id/stream` | S→C | `{type: "exit", exitCode: 0}` | Agent 退出 |
| `/api/runs/:id/stream` | S→C | `{type: "status", status: "running"}` | 状态变更推送 |
| `/api/runs/:id/stream` | S→C | `{type: "budget", current: 0.5, limit: 1.0}` | 预算警告 |
| `/api/runs/:id/stream` | C→S | `{type: "subscribe", runId: "..."}` | 客户端订阅 |
| `/api/runs/:id/stream` | C→S | `{type: "input", text: "..."}` | 发送 prompt(Iter 3+ [y/N]) |

### 4.4 Audit

| Method | Path | 说明 |
|---|---|---|
| `GET` | `/api/runs/:id/audit-trail` | 返回 audit-trail.json 内容 |
| `GET` | `/api/runs/:id/audit-trail?download=1` | 触发浏览器下载 |
| `GET` | `/api/audit/events` | 查询 audit_events 表, `?runId=&eventType=&agent=&tool=&from=&to=` |
| `GET` | `/api/audit/stats` | 统计: `?runId=&groupBy=day|week|month` → {totalRuns, successRate, avgCost, avgRounds, toolUsage[], agentUsage[], modelUsage[]} |

### 4.5 Human Gate

| Method | Path | 说明 |
|---|---|---|
| `GET` | `/api/runs/:id/pending-gates` | 查询待审批 |
| `POST` | `/api/gates/:gateId/approve` | 审批通过 |
| `POST` | `/api/gates/:gateId/reject` | 审批拒绝 |

### 4.6 Trigger

| Method | Path | 说明 |
|---|---|---|
| `POST` | `/triggers/:blueprintId` | Webhook 触发入口 |
| `POST` | `/triggers/github` | GitHub Webhook 接收 |
| `POST` | `/triggers/ci/:blueprintId` | CI 回调 |
| `POST` | `/triggers/lark/events` | 飞书事件订阅 |
| `POST` | `/triggers/email` | Email Webhook 接收 |

---

## 五、审计追踪完整流程

### 5.1 从 Trigger 到 Run 完成的审计链路

```
Trigger Fired (audit_events.event_type = "trigger_fired")
  ↓
Run Created (runs.status = "idle")
  ↓
Run Initializing (audit_events.event_type = "run_status_change", statusFrom="idle", statusTo="initializing")
  ↓
Agent Spawned (sessions 表插入, audit_events.event_type = "run_started", agent_name="claude-code", model="claude-sonnet-4-6", claude_session_id=<UUID>)
  ↓
── Round 1 ──
  ↓
Planner Called (audit_events.event_type = "planner_call", layer="L2", model="claude-opus-4-8", tokens_in=1234, tokens_out=567)
  ↓
Task t1 Started (audit_events.event_type = "task_started", layer="L5", task_id="t1", phase_id="phase_sense")
  ↓
Tool: Read (audit_events.event_type = "tool_call", layer="L5", tool_used="Read", skill_used="code-review", tool_args={"file":"src/main.ts"})
  ↓
Tool: Read Result (audit_events.event_type = "tool_call_result", tool_result="...")
  ↓
Tool: Bash (audit_events.event_type = "tool_call", tool_used="Bash", tool_args={"command":"pnpm test"})
  ↓
Tool: Bash Result (audit_events.event_type = "tool_call_result", exit_code=0, tool_result="PASS 42 tests")
  ↓
Task t1 Completed (audit_events.event_type = "task_completed", exit_code=0, tokens_in=3000, tokens_out=1500, cost_usd=0.015)
  ↓
Task t2 Started → Tool Calls → Task t2 Completed (同上)
  ↓
Verification Run (audit_events.event_type = "verification", layer="L7", evaluatorType="shell", passed=true, nextAction="terminal")
  ↓
── Round 2 (如果有多轮) ──
  ↓
Run Completed (audit_events.event_type = "run_completed", finalStatus="success", totalRounds=2, totalCostUsd=0.05)
  ↓
Audit Trail Written (runs.audit_status = "written")
```

### 5.2 每条 tool_call 审计事件包含:

```json
{
  "id": "ae_xxx",
  "run_id": "r_yyy",
  "blueprint_id": "bp_zzz",
  "event_type": "tool_call",
  "layer": "L5",
  "round": 1,
  "task_id": "t_abc",
  "phase_id": "phase_act",
  "agent_name": "claude-code",
  "model": "claude-sonnet-4-6",
  "claude_session_id": "550e8400-e29b-41d4-a716-446655440000",
  "tool_used": "Bash",
  "skill_used": "test-driven-development",
  "mcp_server": null,
  "subagent_used": null,
  "tool_args": {"command": "pnpm test"},
  "tokens_in": 2500,
  "tokens_out": 800,
  "cost_usd": 0.008,
  "occurred_at": "2026-06-28T09:01:23.456Z",
  "recorded_at": "2026-06-28T09:01:23.458Z",
  "timezone_offset": "+08:00"
}
```

### 5.3 状态变更审计:

```json
{
  "event_type": "run_status_change",
  "layer": "cross",
  "status_from": "running",
  "status_to": "evaluating",
  "occurred_at": "2026-06-28T09:02:00.000Z",
  "timezone_offset": "+08:00"
}
```

### 5.4 预算警告审计:

```json
{
  "event_type": "budget_warning",
  "layer": "L1",
  "budget_type": "tokens_usd",
  "current_percent": 80,
  "threshold_percent": 80,
  "current_value": 0.8,
  "limit_value": 1.0,
  "occurred_at": "2026-06-28T09:03:00.000Z"
}
```

### 5.5 通知发送审计:

```json
{
  "event_type": "notification_sent",
  "layer": "cross",
  "channel": "lark",
  "event": "success",
  "success": true,
  "occurred_at": "2026-06-28T09:03:30.000Z"
}
```

---

## 六、文件存储结构

```
~/.loop-cockpit/
├── data.db                      # SQLite, WAL mode, 所有表
├── loops/
│   └── <blueprintId>/
│       └── skills-bundle/       # 临时 plugin, Blueprint 保存时生成
│           ├── plugin.json
│           └── skills/
├── runs/
│   └── <runId>/
│       ├── raw.log              # 完整 ANSI 流
│       ├── state.yaml           # Loop 业务 State
│       ├── audit-trail.json     # 终态完整快照
│       └── prompts/             # 每次 spawn 的 system prompt
│           ├── round1.md
│           ├── round2.md
│           └── ...
└── workspaces/                  # Iter 3+ Worktree 沙箱
    └── <runId>/
```

---

## 七、审查检查清单

### 7.1 过程可审计

- [ ] 每个 Run 的每次 tool call 是否都写入 audit_events?
- [ ] 是否记录了 claude_session_id?
- [ ] 是否记录了 agent_name (claude-code/opencode/codex)?
- [ ] 是否记录了使用的 skill?
- [ ] 是否记录了使用的 MCP server?
- [ ] 是否记录了使用的 subagent?
- [ ] 是否记录了 tool_args 和 tool_result?
- [ ] 是否记录了每步的 tokens_in/out 和 cost_usd?
- [ ] 是否记录了每个状态的变更(从→到+时间)?
- [ ] 是否记录了 Round/Task/Phase 的层次关系?

### 7.2 结果可统计

- [ ] 能否按 agent_name 统计 Run 数量和成功率?
- [ ] 能否按 model 统计花费?
- [ ] 能否按 tool_used 统计使用频率?
- [ ] 能否按 skill_used 统计使用频率?
- [ ] 能否按 blueprint_id 统计历史 Run?
- [ ] 能否按 occurred_at 时间段统计?
- [ ] 能否计算平均成本/平均轮数/平均耗时?
- [ ] 能否追踪单个 Run 的完整决策链?

### 7.3 时间可追溯

- [ ] 所有时间戳是否为 UTC ISO8601?
- [ ] 是否记录了用户时区偏移(timezone_offset)?
- [ ] occurred_at 和 recorded_at 是否都有(检测延迟)?
- [ ] 状态变更是否记录了 from→to?
- [ ] Run 的 started_at 和 ended_at 是否精确到毫秒?

### 7.4 数据完整性

- [ ] Blueprint 修改后,历史 Run 是否仍能看到当时的配置(blueprint_snapshot)?
- [ ] Run 失败时,raw.log 是否完整保留?
- [ ] audit-trail.json 是否不可变(已写入不被覆盖)?
- [ ] DB 写入失败是否影响 Run 执行?(不应影响)
- [ ] Host 崩溃后,running 状态的 Run 是否能被 reaper 回收?

---

## 八、文档索引

| 类别 | 文件 | 审查重点 |
|---|---|---|
| **原型** | [v7/index.html](../prototype/features/blueprint-editor/v7/index.html) | 6 块 UI 交互是否完整 |
| **UI Spec** | [blueprint-editor.md](../design/ui-spec/blueprint-editor.md) | 每元素三维度是否齐 |
| **产品总览** | [product-overview.md](../architecture/product-overview.md) | 8 层模块定义 |
| **Loop 解剖** | [loop-anatomy.md](../architecture/loop-anatomy.md) | 数据流 + 8 场景 |
| **架构总览** | [overview.md](../architecture/overview.md) | 分层 + 模块边界 + 三轨持久化 |
| **触发器** | [triggers.md](../architecture/triggers.md) | 20+ 触发器枚举 |
| **ADR-0001** | [0001-tech-stack.md](../architecture/decisions/0001-tech-stack.md) | 技术栈锁定 |
| **ADR-0003** | [0003-sqlite-drizzle.md](../architecture/decisions/0003-sqlite-drizzle.md) | SQLite + WAL |
| **ADR-0009** | [0009-phase-orchestration.md](../architecture/decisions/0009-phase-orchestration.md) | Phase 编排 |
| **ADR-0010** | [0010-autonomous-loop-architecture.md](../architecture/decisions/0010-autonomous-loop-architecture.md) | 8 层架构 |
| **ADR-0011** | [0011-document-convergence.md](../architecture/decisions/0011-document-convergence.md) | ★ 4 处 P0 矛盾收敛 + 12+ 处 P1 修复 |
| **F001** | [F001-pty-runner.md](../prd/F001-pty-runner.md) | PTY 能力验证 |
| **F002** | [F002-blueprint-editor.md](../prd/F002-blueprint-editor.md) | Blueprint 配置 (v0.6, 已对齐 ADR-0011) |
| **F003** | [F003-run-state-machine.md](../prd/F003-run-state-machine.md) | 状态机 + 生命周期 (v0.4, 已对齐 ADR-0011) |
| **F004** | [F004-claude-adapter.md](../prd/F004-claude-adapter.md) | Agent Adapter + WS 流 (v0.4, 已对齐 ADR-0011) |
| **F005** | [F005-audit-trail.md](../prd/F005-audit-trail.md) | Audit Trail 落盘 (v0.3, 已对齐 ADR-0011) |
| **Roadmap** | [roadmap.md](../roadmap.md) | Iter 时间线 |
