---
id: F002
title: Blueprint CRUD + 编辑器
status: Draft
priority: P0
iteration: Iter 2
issue: TBD
owner: "@oh-summy"
updated: 2026-06-28
---

# F002 · Blueprint CRUD + 编辑器

> Iter 2 的入口功能:让用户在浏览器里**创建/编辑/删除 Loop 蓝图**。这是 Loop Cockpit 用户唯一的"配置 Loop"路径,所有后续 Run 都基于这里产出的 Blueprint。

---

## 1. 一句话

让用户在浏览器 UI 中**可视化创建/编辑 Blueprint**(Goal + Done Criteria + Agent + Trigger + Retry 等),后端 Fastify + Drizzle 持久化到 SQLite。

## 2. 目标 (Why)

非目标 §7 锁定:Done Criteria 必须可机器执行。所以 Loop Cockpit 的"创建 Loop"本质 = 让用户**结构化地写**这些必要字段。UI 编辑器是替代"写 YAML 配置"的核心价值——独立开发者不该被迫学一套配置语法。

本 PRD 落地以下决策:
- ADR-0001 / ADR-0003(技术栈 + Drizzle 已 Accepted)
- ux-flow Flow 1(首启 → 创建 → 手动 Run)
- ux-flow Flow 5(改 Blueprint → 历史 Run 不受影响)
- D1.3 Done Criteria "试跑"按钮
- D5.1 自动版本化(Iter 2-4 先直接覆盖,UI 警告;Iter 5 起加 version 字段)
- H5 Tailwind / H1 暗色 / H2 中文默认

## 3. 范围

### In Scope (Iter 2)
- **Blueprint 数据模型**:`id / name / goal / doneCriteria / agent / model / projectPath / retryPolicy / triggers[] / createdAt / updatedAt / status` 完整 schema
- **CRUD API**:`POST/GET/PATCH/DELETE /api/blueprints` + `GET /api/blueprints/:id`
- **校验引擎**:zod schema + cron expression valid + agent in registered list
- **编辑器 UI**(`/blueprints/new` + `/blueprints/:id/edit`):
  - 必填:Name / Goal(textarea) / Done Criteria(textarea + 试跑按钮) / Agent(下拉,Iter 2 只有 claude-code)
  - 可选:Project path(默认 cwd) / Retry policy(maxRetries=1, timeoutMinutes=10, tokenBudget=$1 默认值) / Trigger(Cron 或 Manual)
- **Done Criteria 试跑按钮**(D1.3):点击后**只跑 Criteria,不启 Agent**,显示 exit code 和 stdout/stderr
- **Blueprint 列表 UI**(`/blueprints`):卡片样式,Name + Goal 摘要 + Trigger 标签 + "Run now" 按钮
- **保存覆盖警告**(D5.1):编辑已有 Blueprint 时,UI 黄色 banner "保存将影响后续所有 Run。如需保留旧版本快照,请删除后重建。"

### Out of Scope (推后)
- Blueprint 自动版本化(D5.1 Iter 5,加 `version` 字段 + 历史快照)
- Skill / MCP 多选(Iter 7+,先用文件配置)
- System Prompt Template 高级折叠(Iter 3+)
- 导出/导入 YAML(post-MVP)
- 模板/复制 Blueprint(MVP 后)

## 4. 用户故事 / Use Cases

- 作为独立开发者,我想**在浏览器里点几下就创建一个 Loop**,而不是写 YAML 或命令行参数
- 作为独立开发者,我想**在保存前先试跑 Done Criteria**,避免写错的命令在 Agent 跑完才暴露
- 作为独立开发者,我想**改一下 Goal 然后保存**,UI 提醒我这会影响后续所有 Run
- 作为独立开发者,我想**看到所有 Blueprint 的列表**,一眼分清哪些是 Cron 哪些是 Manual

## 5. 关联资源

| 类型 | 资源 | 说明 |
|---|---|---|
| 架构 | [overview.md §2.1 / §3](../architecture/overview.md) | Blueprint→Run→Task 抽象 + apps/host/src/blueprint/ 模块 |
| 总 PRD | [product-overview.md §6 A · Loop Blueprint 系统](../architecture/product-overview.md) | 全功能上下文 |
| ADR | [0001](../architecture/decisions/0001-tech-stack.md) | TS / Fastify / Drizzle / Vite + React |
| ADR | [0003](../architecture/decisions/0003-sqlite-drizzle.md) | DB 表 schema + WAL + snake/camel 命名 |
| 原型 | [prototype/features/ux-flow](../prototype/features/ux-flow/) | Flow 1 / Flow 5 |
| 原型 | [prototype/features/blueprint-editor](../prototype/features/blueprint-editor/) | _周末出 UI 变体_ |
| 术语 | [glossary.md](../architecture/glossary.md) | Blueprint / Goal / Done Criteria / Retry Policy |
| Issue | _TBD_(Iter 2 起开)| 实施跟踪 |

## 6. 数据契约 / 接口

> ⚠️ **2026-06-28 v0.2 重大改动**:Blueprint 加 `phases[]` 字段,Loop 升级为多阶段编排。详见 [ADR-0009](../architecture/decisions/0009-phase-orchestration.md)。

### 6.1 DB Schema(Drizzle / SQLite)

```typescript
// apps/host/src/db/schema/blueprints.ts (Iter 2 实施)
export const blueprints = sqliteTable("blueprints", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),

  // ★ Iter 2 v0.3 重构:删 name,以 goal.objective 当显示名
  goal: text("goal", { mode: "json" }).$type<Goal>().notNull(),

  // ⚠ 保留 doneCriteria 字段作向后兼容(等价于 goal.successCondition),Iter 3 起删
  doneCriteria: text("done_criteria"),

  agent: text("agent").notNull(),
  model: text("model"),
  projectPath: text("project_path").notNull(),
  retryPolicy: text("retry_policy", { mode: "json" }).$type<RetryPolicy>().notNull(),
  triggers: text("triggers", { mode: "json" }).$type<TriggerConfig[]>().notNull().default(sql`'[]'`),

  // ★ ADR-0009 Phase 编排
  phases: text("phases", { mode: "json" }).$type<Phase[]>().notNull().default(sql`'[]'`),
  startPhaseId: text("start_phase_id"),

  type: text("type", { mode: "json" }).$type<string[]>().default(sql`'[]'`),
  status: text("status").$type<"active" | "disabled">().notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

// ★ ADR-0010 Layer 1 · Goal 完整 5 字段
type Goal = {
  objective: string;                  // 主目标(自然语言),例 "修复 Issue #123"。用作 Blueprint 显示名
  constraints: string[];              // 硬约束,例 ["不能改 API", "不能升级 deps"]
  successCondition: string;           // 客观可量化,机器可验证,例 "pnpm test && git diff API/ 为空"
  deadline?: string;                  // ISO8601,可选
  budget: {
    maxRounds: number;                // default 20
    maxTokensUSD: number;              // default 1.0
    maxWallTimeMs: number;             // default 600000 (10min)
  };
};

// 其他类型定义同前(Phase / RetryPolicy / TriggerConfig 等)
```

### 6.1.1 显示名约定(★ v0.3 改动)

不再有独立 `name` 字段。Blueprint 在 UI / 列表 / 日志中显示 = `goal.objective` 的截断:
- 列表显示:`goal.objective` 首 50 字符
- 详情页标题:`goal.objective` 完整
- audit trail / DB 内部仍用 `id`(nanoid)

理由(基于 ADR-0010 + 维护者反馈):
- 用户填一个 Loop 时心智模型是"我要让 AI 干什么",这就是 objective
- 单独的 name 是冗余信息,会让用户填重复内容
- 强制用户先想清楚 objective(产品引导)

// Phase 完整定义见 ADR-0009
type Phase = {
  id: string;
  name: string;
  order: number;
  systemPromptTemplate?: string;
  appendUserMessage?: string;
  agent: 'claude-code';
  model?: string;
  effort?: 'low' | 'medium' | 'high';
  skills: string[];
  tools: string[];
  mcpServers: MCPRef[];
  subagents?: SubagentRef[];
  permissionMode: 'bypassPermissions' | 'acceptEdits' | 'plan' | 'interactive';
  allowedDirs: string[];
  disallowedTools?: string[];
  evaluator: { type: 'shell' | 'llm-judge' | 'regex' | 'none', [k: string]: any };
  branches: Array<{ if?: string; nextPhase?: string; default?: string }>;
  maxTurns?: number;
  maxBudgetUsd?: number;
};

type RetryPolicy = { maxRetries: number; timeoutMinutes: number; tokenBudget: string; onFail: "stop" | "notify" };
type TriggerConfig = { type: "manual" } | { type: "once", at: string } | { type: "cron"; expression: string };
type MCPRef = { name: string };
type SubagentRef = { name: string; prompt: string; tools?: string[] };
```

### 6.2 REST API(Fastify)

| Method | Path | Body / Query | Response |
|---|---|---|---|
| `POST` | `/api/blueprints` | `BlueprintInput`(zod 校验) | `{ blueprint: Blueprint }` |
| `GET` | `/api/blueprints` | `?status=active` 可选 | `{ blueprints: Blueprint[] }` |
| `GET` | `/api/blueprints/:id` | - | `{ blueprint: Blueprint }` |
| `PATCH` | `/api/blueprints/:id` | `Partial<BlueprintInput>` | `{ blueprint: Blueprint }` |
| `DELETE` | `/api/blueprints/:id` | - | `204 No Content` |
| `POST` | `/api/blueprints/:id/dry-run-criteria` | - | `{ exitCode: number; stdout: string; stderr: string; durationMs: number }` |

最后一行是 D1.3 "试跑"按钮的后端,只执行 Done Criteria,不启 Agent。

### 6.3 zod 校验

```typescript
const BlueprintInputSchema = z.object({
  name: z.string().min(1).max(100),
  goal: z.string().min(10).max(2000),
  doneCriteria: z.string().min(1).max(2000),
  agent: z.enum(["claude-code"]),  // Iter 2 仅一个,后续扩
  model: z.string().optional(),
  projectPath: z.string().refine(p => path.isAbsolute(p), "必须是绝对路径"),
  retryPolicy: z.object({
    maxRetries: z.number().int().min(0).max(10).default(1),
    timeoutMinutes: z.number().int().min(1).max(120).default(10),
    tokenBudget: z.string().regex(/^\$\d+(\.\d{1,2})?$/).default("$1"),
    onFail: z.enum(["stop", "notify"]).default("stop"),
  }),
  triggers: z.array(z.discriminatedUnion("type", [
    z.object({ type: z.literal("manual") }),
    z.object({ type: z.literal("cron"), expression: cronExpressionSchema }),
  ])).default([{ type: "manual" }]),
});
```

### 6.4 UI 字段映射(`/blueprints/new`)

```
┌── Name [必填] ────────────────────────────────────────┐
│ daily-lint                                            │
└────────────────────────────────────────────────────────┘
┌── Goal [必填,自然语言] ───────────────────────────────┐
│ 让 main 分支保持 lint + test + build 全绿            │
│                                                       │
└────────────────────────────────────────────────────────┘
┌── Done Criteria [必填,shell 命令] ────────────────────┐
│ pnpm lint && pnpm test && pnpm build                  │
└────────────────────────────────────────────────────────┘
                                                [ 🧪 试跑 ]  ← D1.3

┌── Agent ──────────────┐  ┌── Model (可选) ──────────────┐
│ claude-code      ▼   │  │ claude-sonnet-4-6        ▼  │
└──────────────────────┘  └──────────────────────────────┘

┌── Project path ───────────────────────────────────────┐
│ /Users/rocky/project/Loop-Cockpit              [📁]  │
└────────────────────────────────────────────────────────┘

┌── Trigger ────────────────────────────────────────────┐
│ ○ Manual    ● Cron: [ 0 9 * * * ]   📅 每日 9:00     │
└────────────────────────────────────────────────────────┘

┌── Retry policy ───────────────────────────────────────┐
│ Max retries: 1    Timeout: 10 min    Budget: $1      │
│ On fail: ○ Stop  ● Notify                            │
└────────────────────────────────────────────────────────┘

                          [ 取消 ]  [ 保存 ]
```

(具体 Tailwind 视觉变体在 [prototype/features/blueprint-editor/](../prototype/features/blueprint-editor/),周末出)

## 7. 验收标准 (Done Criteria)

- [ ] DB schema 通过 `drizzle-kit generate` 生成 migration,在新 db.db 上 apply 成功
- [ ] 6 个 REST endpoint 全部实现,zod 校验生效(用 vitest + supertest 测)
- [ ] `POST /api/blueprints/:id/dry-run-criteria` 能在 5s 内返回(超时显式 timeout)
- [ ] UI 能创建一个 Blueprint 并立即在列表看到
- [ ] 编辑已有 Blueprint,黄色 banner 显示
- [ ] Done Criteria 试跑按钮点了后,UI 显示 exit code + 截断的 stdout/stderr(每段 < 4 KB)
- [ ] 改 retry policy / cron 表达式无效时,UI 立即红字提示(zod error 友好渲染)

## 8. 非功能约束

- **性能**:列表页加载 < 500ms(<= 100 Blueprints 量级);保存 < 200ms
- **可靠性**:DB 写入用事务,失败不留半截 Blueprint
- **安全**:projectPath 严格校验绝对路径,UI 不允许 `..` 跨界
- **兼容**:Chrome / Edge / Safari / Firefox 最新两版

## 9. 开放问题

无(都已通过 ADR / ux-flow 拍板)。Iter 2 实施时如发现新问题,开 GitHub Issue 跟踪。

## 10. 变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 首版 Draft,基于 Iter 2 主线 + 全部已 Accepted 决策 |
| 2026-06-28 | v0.2 | ★ **重大改动**:加 `phases[]` / `startPhaseId` / `type[]` 字段;Blueprint 编辑器需重设计加 Phase 编辑区。详见 [ADR-0009](../architecture/decisions/0009-phase-orchestration.md) |
| 2026-06-28 | v0.3 | ★★ **Goal 重构**:`name` 字段删除,`goal: string` → `goal: { objective, constraints[], successCondition, deadline?, budget }`。`doneCriteria` 字段保留作向后兼容(等价于 goal.successCondition)。详见 [ADR-0010 Layer 1](../architecture/decisions/0010-autonomous-loop-architecture.md) |
