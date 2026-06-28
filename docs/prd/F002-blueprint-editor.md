---
id: F002
title: Blueprint 编辑器 + 8 层配置面板
status: Draft
priority: P0
iteration: Iter 2(简单模式) / Iter 3-5(8 层完整)
issue: TBD
owner: "@oh-summy"
updated: 2026-06-28
---

# F002 · Blueprint 编辑器 + 8 层配置面板

> 用户在浏览器里**配置 8 层规则**让 AI 在轨道上自治执行任务。本 PRD 是 Loop Cockpit 用户唯一的 Loop 创建路径,所有后续 Run 都基于这里产出的 Blueprint。

---

## 1. 一句话

让用户在浏览器 UI 中**按 8 层架构配置一个 Loop**(Goal + Trigger + Worker + Tool Layer + Verification + Memory + Reflection + Human Gate),后端 Fastify + Drizzle 持久化到 SQLite。**简单模式** 暴露最关键 4 项,**专家模式** 暴露全部 8 层 + 横切。

## 2. 目标 (Why)

按 [ADR-0010 v1.0](../architecture/decisions/0010-autonomous-loop-architecture.md):

> Loop Cockpit = AI 自治系统的指挥架构平台。用户配的不是"什么时候跑命令",是"AI 在这个 Loop 里能感知什么 / 怎么决策 / 怎么行动 / 怎么验证 / 失败怎么办 / 何时找人"。

本 PRD 是 8 层架构的**用户配置入口**。简单模式让初学者快速上手;专家模式让深度用户精细调度。两者共享同一 Blueprint schema。

## 3. 范围

### In Scope(Iter 2 MVP — 简单模式)

简单模式 UI 仅暴露:
- **Goal**: objective / constraints / successCondition / budget(deadline 折叠)
- **Trigger**: Manual / Once / Cron 选一个
- **Worker**: Agent + Model 下拉(Iter 2 仅 claude-code)
- **Tool Layer**: 从用户级 + 项目级 skill 列表勾选;MCP/tools/subagent 可选;projectPath 选择器
- **Verification**: shell-only(沿用 doneCriteria),v0.3 等价于 goal.successCondition
- **Memory**: 显示 "state.yaml 自动启用"(只读提示)
- **Retry Policy**: maxRetries / timeout / budget / onFail

### In Scope(Iter 3-5 — 专家模式逐 Iter 加)

| Iter | 新增 UI |
|---|---|
| 2 | 简单模式 + 模板系统(6 类预设) |
| 3 | + Planner 配置(model / 是否每轮 replan / system prompt 模板)+ Reflection 阈值 + Webhook/Git Trigger |
| 4 | + Context Builder 规则编辑器(task.priority → ContextBundle mapping)+ Orchestrator 子 agent 列表 + CI/Email/消息 Trigger |
| 5 | + Verification 多 evaluator + Memory FTS5 跨 Loop 选项 + Human Gate 3 模式 + 通知渠道选择 |

### Out of Scope

- Iter 2 不上 Planner / Context Builder / Orchestrator 复杂调度 / Reflection / Human Gate(都简化默认值或硬编码)
- 多 Loop 串联 / Artifact 跨 Loop 数据流(Iter 7+)
- 流程图视觉编辑器(Iter 5+ 看用户反馈)
- Skill / MCP 跨账户分享(non-goals §3)

## 4. 用户故事

### 简单模式
- 作为独立开发者,我想**在浏览器里点几下就创建一个 Loop**,不学 YAML / Claude Code 命令
- 作为独立开发者,我想从**类型预设模板**(Bug 修复 / 重构 / 测试 / 文档 / 定期检查)出发,自动填好 Goal 草稿和 successCondition 起点
- 作为独立开发者,我想**勾选用户级 + 项目级 skill / MCP / tools / subagent**,只让本 Loop 用这些,**不污染**我的 `~/.claude/`
- 作为独立开发者,我想在保存前**试跑** successCondition(D1.3),避免命令写错后 Agent 跑完才暴露
- 作为独立开发者,我想**改 Goal 然后保存**,UI 提醒会影响后续所有 Run

### 专家模式
- 作为高级用户,我想**自定义 Planner 用什么 model**(我让 Opus 思考,Sonnet 执行)
- 作为高级用户,我想**自定义 Context Builder 规则**(P0 任务暴露 Bash+Edit,P1 任务只暴露 Read)
- 作为高级用户,我想**为高风险任务配 Human Gate**(default-reject 模式 + 飞书通知)
- 作为高级用户,我想**配多个 evaluator**(shell + llm-judge 组合,both pass 才算 Done)

## 5. 关联资源

| 类型 | 资源 | 说明 |
|---|---|---|
| 架构 ADR | [ADR-0010](../architecture/decisions/0010-autonomous-loop-architecture.md) | 8 层完整定义 |
| 架构 ADR | [ADR-0009](../architecture/decisions/0009-phase-orchestration.md) | Phase 模型(L4 Orchestrator 内部) |
| 总 PRD | [product-overview §6](../architecture/product-overview.md) | A-O 模块 |
| 系统分层 | [overview.md §1-3](../architecture/overview.md) | apps/host/src/ 目录 |
| 解剖图 | [loop-anatomy.md](../architecture/loop-anatomy.md) | Loop 完整数据流 |
| 触发器 | [triggers.md](../architecture/triggers.md) | 全 Trigger 枚举 |
| UI Spec | [design/ui-spec/blueprint-editor.md](../design/ui-spec/blueprint-editor.md) | 每按钮/字段详细语义(待写) |
| 原型 | [prototype/features/blueprint-editor](../prototype/features/blueprint-editor/) | v4 实现,v5 待重写 |
| 下游 PRD | F006 Planner / F007 Context Builder / F008 Verification / F009 Memory / F010 Human Gate / F011 Reflection | 各层独立 PRD |
| Issue | _TBD_ | 实施跟踪 |

## 6. 数据契约 / 接口

### 6.1 DB Schema (Drizzle / SQLite)

```typescript
export const blueprints = sqliteTable("blueprints", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),

  // ★ Layer 1 · Goal(完整 5 字段)
  goal: text("goal", { mode: "json" }).$type<Goal>().notNull(),

  // Worker(Layer 5)
  agent: text("agent").notNull(),              // "claude-code"
  model: text("model"),                         // 默认值

  // Project / 文件边界(Layer 6 Tool Layer 的一部分)
  projectPath: text("project_path").notNull(),

  // Trigger(Layer 0 触发)
  triggers: text("triggers", { mode: "json" }).$type<TriggerConfig[]>().notNull().default(sql`'[]'`),

  // Tool Layer(Layer 6)默认值 — Iter 2 一锅烩;Iter 4 后由 Context Builder 接管
  defaultToolLayer: text("default_tool_layer", { mode: "json" }).$type<ToolLayerConfig>().notNull(),

  // Phase 编排(Layer 4 Orchestrator 内部,ADR-0009)— Iter 2 默认 1 Phase
  phases: text("phases", { mode: "json" }).$type<Phase[]>().notNull().default(sql`'[]'`),
  startPhaseId: text("start_phase_id"),

  // Iter 3+ 八层模块配置(JSON, 各层独立 schema)
  plannerConfig: text("planner_config", { mode: "json" }).$type<PlannerConfig>(),         // Iter 3
  contextBuilderConfig: text("context_builder_config", { mode: "json" }).$type<CBConfig>(), // Iter 4
  verificationConfig: text("verification_config", { mode: "json" }).$type<VerifConfig>(),   // Iter 5
  memoryConfig: text("memory_config", { mode: "json" }).$type<MemoryConfig>(),              // Iter 5
  reflectionConfig: text("reflection_config", { mode: "json" }).$type<ReflectionConfig>(),  // Iter 3
  humanGateConfig: text("human_gate_config", { mode: "json" }).$type<HumanGateConfig>(),    // Iter 5

  // 重试策略(简化版,与 goal.budget 互补)
  retryPolicy: text("retry_policy", { mode: "json" }).$type<RetryPolicy>().notNull(),

  // 元数据
  type: text("type", { mode: "json" }).$type<string[]>().default(sql`'[]'`),  // bug / refactor / test / docs / check / other
  status: text("status").$type<"active" | "disabled">().notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

// ─── Layer 1 · Goal ─────────────────────────────────────────────
type Goal = {
  objective: string;                  // 主目标,用作显示名
  constraints: string[];
  successCondition: string;
  deadline?: string;                  // ISO8601
  budget: {
    maxRounds: number;                // default 20
    maxTokensUSD: number;             // default 1.0
    maxWallTimeMs: number;            // default 600000
  };
};

// ─── Layer 6 · Tool Layer ──────────────────────────────────────
type ToolLayerConfig = {
  skills: string[];                   // skill name (从 ~/.claude/skills/ 和 .claude/skills/ 选)
  tools: string[];                    // ["Bash", "Read", "Edit", "Glob", "Grep", ...]
  mcpServers: MCPRef[];
  subagents: SubagentRef[];
  permissionMode: 'plan' | 'acceptEdits' | 'bypassPermissions' | 'interactive';
  allowedDirs: string[];              // 默认 [projectPath]
  disallowedTools?: string[];         // ["Bash(rm *)", "mcp__*"]
};

// ─── Iter 3+ 各层 config 类型(详见对应 PRD F006-F011) ──────
type PlannerConfig = { /* F006 */ };
type CBConfig = { /* F007 */ };
type VerifConfig = { /* F008 */ };
type MemoryConfig = { /* F009 */ };
type ReflectionConfig = { /* F011 */ };
type HumanGateConfig = { /* F010 */ };

// ─── 触发器 / 重试 / 其他 ────────────────────────────────────
type TriggerConfig =
  | { type: "manual" }
  | { type: "once", at: string }
  | { type: "cron", expression: string }
  // Iter 3+
  | { type: "webhook", secret?: string }
  | { type: "git", repo: string, events: string[] }
  | { type: "ci-finished", provider: string }
  | { type: "email", filter?: any }
  | { type: "lark" | "slack" | "discord", filter?: any }
  | { type: "file-watch", path: string, events: string[] };

type RetryPolicy = {
  maxRetries: number;
  timeoutMinutes: number;
  tokenBudget: string;
  onFail: "stop" | "notify";
};

type MCPRef = { name: string };
type SubagentRef = { name: string; prompt: string; tools?: string[] };
type Phase = { /* ADR-0009 */ };
```

### 6.2 显示名约定

不再有独立 `name` 字段。Blueprint 在 UI / 列表 / 日志中显示 = `goal.objective`(详见 F002 v0.3 修订记录)。

### 6.3 REST API (Fastify)

| Method | Path | Body / Query | Response |
|---|---|---|---|
| `POST` | `/api/blueprints` | `BlueprintInput` (zod) | `{ blueprint: Blueprint }` |
| `GET` | `/api/blueprints` | `?status=active&type=bug` | `{ blueprints: Blueprint[] }` |
| `GET` | `/api/blueprints/:id` | - | `{ blueprint: Blueprint }` |
| `PATCH` | `/api/blueprints/:id` | `Partial<BlueprintInput>` | `{ blueprint: Blueprint }` |
| `DELETE` | `/api/blueprints/:id` | - | 204 |
| `POST` | `/api/blueprints/:id/dry-run-criteria` | - | `{ exitCode, stdout, stderr, durationMs }` |
| `POST` | `/api/blueprints/:id/dry-run-trigger` | - | 模拟触发,显示 ContextBundle / 不实际跑 Worker |

### 6.4 UI 区域(简单模式 - Iter 2)

```
┌─────────────────────────────────────────────────────────────┐
│  Type [▼ Bug 修复]        Template [▼ 基础版]    [💾 另存为]│
├─────────────────────────────────────────────────────────────┤
│  ─ Goal ──────────────────────────────────────────────────  │
│  Objective:      [_________________________________]        │
│  Constraints:    [+ Add]                                    │
│                  • [_____________________________]  [×]      │
│  Success:        [$ pnpm test && pnpm lint        ] [🧪 Dry]│
│  Deadline:       [datetime-local] (可选)                    │
│  Budget:         Rounds [─ 20 +]  Tokens $[1.00]            │
│                  Wall time [─ 10 +] [min ▼]                 │
│  ─ Trigger ───────────────────────────────────────────────  │
│  ◉ Manual   ◯ Once   ◯ Cron   [◯ Webhook] (Iter 3)         │
│  [启动方式具体配置(沿用 v4 cron 配置器)]                   │
│  ─ Worker ────────────────────────────────────────────────  │
│  Agent: [▼ Claude Code]    Model: [▼ Sonnet 4.6]            │
│  Path:  [~/project/Loop-Cockpit         ] [📁 Browse]      │
│  ─ Tool Layer ────────────────────────────────────────────  │
│  Skills:         [+ Add skill]                              │
│                  ☑ brainstorming   [ⓘ from ~/.claude/]      │
│                  ☑ test-driven-development                  │
│                  ☐ writing-plans                            │
│  Tools (内建):    ☑ Bash  ☑ Read  ☑ Edit  ☐ WebFetch       │
│  MCP:            [+ Add MCP]   (空)                         │
│  Subagent:       [+ Add subagent]   (空)                    │
│  Permission:     [▼ plan]                                   │
│  ─ Retry Policy ──────────────────────────────────────────  │
│  Max retries: [─ 3 +]   Timeout: [─ 10 +] [min ▼]          │
│  On fail:     [▼ Notify]                                    │
│  ─ Advanced ──────────────────────────────────────────────  │
│  ▸ System Prompt Template                                   │
│  ▸ Phases (ADR-0009 编排,Iter 4 起完整)                    │
│  ▸ Expert Mode → Planner / Context Builder / ... 配置       │
└─────────────────────────────────────────────────────────────┘
                    [Cancel]  [Save]  [Save & Run]
```

详细每按钮 / 字段语义见 [design/ui-spec/blueprint-editor.md](../design/ui-spec/blueprint-editor.md)(本 PRD 同步落地)。

## 7. 验收标准 (Done Criteria)

- [ ] DB schema 通过 `drizzle-kit generate` 生成 migration,apply 成功
- [ ] 7 个 REST endpoint 全实现,zod 校验生效
- [ ] `POST /api/blueprints/:id/dry-run-criteria` 5s 内返回
- [ ] 简单模式 UI 能创建一个 Loop 并立即在列表看到
- [ ] Goal.successCondition 试跑按钮点击后显示 exit code + stdout/stderr 截断(每段 < 4 KB)
- [ ] 编辑已有 Blueprint 显示黄色 banner "保存将影响后续所有 Run"
- [ ] Skill 选择器从 `~/.claude/skills/` 和 `<projectPath>/.claude/skills/` 扫描列出
- [ ] 保存后生成 `~/.loop-cockpit/loops/<id>/skills-bundle/` 临时 plugin 目录
- [ ] zod 拒绝无效 successCondition(空 / 非可执行)+ 无效 cron expr + 无效 projectPath(非绝对路径)
- [ ] 模板系统 6 类预设 + "另存为我的模板" 正常

## 8. 非功能约束

- **性能**:列表页加载 < 500ms(<= 100 Blueprints);保存 < 200ms;skill 扫描 < 1s
- **可靠性**:DB 写入用事务,失败不留半截 Blueprint;skills-bundle 生成失败不影响 Blueprint 保存(降级警告)
- **安全**:projectPath 严格校验绝对路径 + 不允许 `..`;系统目录(/usr / /System / /etc)显示警告
- **兼容**:Chrome / Edge / Safari / Firefox 最新两版

## 9. 开放问题

- ⚠️ **Q · 简单模式 vs 专家模式 切换时如何保留数据?**
  - 倾向:专家模式所有配置 JSON 字段保留,简单模式只读到默认字段;切换不丢数据
- ⚠️ **Q · skills-bundle 重新生成时机?**
  - 倾向:Blueprint 保存时同步生成;skill 文件本身变化时 Loop Cockpit 不主动监听(下次 Run 时拉取最新)

## 10. 变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 首版 Draft,基于 Iter 2 主线 |
| 2026-06-28 | v0.2 | ★ 加 phases[] / startPhaseId / type[] 字段(ADR-0009) |
| 2026-06-28 | v0.3 | ★★ Goal 5 字段重构,删 name 字段(ADR-0010 Layer 1) |
| 2026-06-28 | **v0.4** | ★★★ **全面对齐 ADR-0010 8 层架构**:加 defaultToolLayer / plannerConfig / contextBuilderConfig / verificationConfig / memoryConfig / reflectionConfig / humanGateConfig 字段。UI 区域改为简单/专家双模式。dry-run-trigger API 加 |
