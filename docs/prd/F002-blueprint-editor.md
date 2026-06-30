---
id: F002
title: Blueprint 编辑器 + 8 层自治 Loop 配置
status: Draft
priority: P0
iteration: Iter 2(简单模式) / Iter 3-6(专家模式逐层展开)
issue: TBD
owner: "@oh-summy"
updated: 2026-06-28
---

# F002 · Blueprint 编辑器 + 8 层自治 Loop 配置

> 用户在浏览器里**配置 8 层规则**让 AI 在轨道上自治执行任务。本 PRD 是 Loop Cockpit 用户唯一的 Loop 创建路径,所有后续 Run 都基于这里产出的 Blueprint。
>
> **原型**: [prototype/features/blueprint-editor/v7/](../prototype/features/blueprint-editor/v7/index.html)
> **UI Spec**: [design/ui-spec/blueprint-editor.md](../design/ui-spec/blueprint-editor.md)
> **架构 ADR**: [ADR-0010](../architecture/decisions/0010-autonomous-loop-architecture.md)

---

## 1. 一句话

让用户在浏览器 UI 中**按 8 层架构配置一个 Loop**(Goal + Trigger + Worker + Tool Layer + Verification + Memory + Reflection + Human Gate),后端 Fastify + Drizzle 持久化到 SQLite。**简单模式**暴露最关键 4 项,**专家模式**暴露全部 8 层 + 横切。

---

## 2. 目标 (Why)

Loop Cockpit = AI 自治系统的指挥架构平台。用户配的不是"什么时候跑命令",是"AI 在这个 Loop 里能感知什么 / 怎么决策 / 怎么行动 / 怎么验证 / 失败怎么办 / 何时找人"。

---

## 3. 范围

### In Scope (Iter 2 MVP — 简单模式)

| 块 | 内容 |
|---|---|
| 1. 触发与边界 | triggers[] (Manual / Once / Cron) · deadline · agent · model |
| 2. 核心配置 | projectPath · goal.objective · goal.successCondition · goal.constraints |
| 3. 生命周期 | 工具池全局(Skills/Tools/MCP/Subagent) · 系统提示词 · 权限模式 |
| 4. 反馈通知 | notification.on[] · notification.channels[] |
| 5. 失败重试 | retryPolicy · reflectionConfig |
| 6. 禁止边界 | goal.budget · deny(editPaths / deletePaths / bashCommands / gitPush / gitCommit) |

### In Scope (Iter 3-6 — 专家模式逐 Iter 加)

| Iter | 新增 UI |
|---|---|
| 3 | SDAF 4 阶段详情(Sense/Decide/Act/Feedback) · Webhook/Git Trigger · Reflection 升级 |
| 4 | Email / 飞书 / Slack / Discord / File Watch Trigger · CI/CD Trigger |
| 5 | Boot / 上游 Loop Trigger · 通知渠道细分 + 模板自定义 |
| 6 | Channel Hub 完整 + dogfooding(自己跑自己) |

### Out of Scope

- 多 Loop 串联 / Artifact 跨 Loop 数据流 (Iter 7+)
- 流程图视觉编辑器 (Iter 5+ 看反馈)
- Skill / MCP 跨账户分享 (non-goals §3)

---

## 4. 6 块 → 8 层 schema 映射

| 块 | 用户心智 | 对应 8 层 |
|---|---|---|
| 1 触发与边界 | 什么时候启动 · 什么时候结束 · 用哪个 AI | Trigger / Worker(L5) |
| 2 核心配置 | 在哪儿工作 · 要达成什么 · 怎么算成功 | Goal(L1) |
| 3 生命周期 | AI 每轮怎么思考 · 用什么工具 · 怎么验证 | L2 Planner · L3 Context · L6 Tool · L7 Verification |
| 4 反馈通知 | 完成/失败/进度时通知谁 · 通过什么通道 | Notification Channel Hub |
| 5 失败重试 | 失败几次后放弃 · 是否升级 model | Retry + L11 Reflection |
| 6 禁止边界 | 花多少钱停 · 不能动什么 · 不能跑什么 | Goal.budget + deny |

---

## 5. 用户故事

### 简单模式

- 作为独立开发者,我想**在浏览器里点几下就创建一个 Loop**,不学 YAML / Claude Code 命令
- 作为独立开发者,我想从**类型预设模板**(Bug 修复 / 重构 / 测试 / 文档 / 定期检查)出发,自动填好 Goal 草稿和 successCondition
- 作为独立开发者,我想**勾选用户级 + 项目级 skill / MCP / tools / subagent**,只让本 Loop 用这些,**不污染**我的 `~/.claude/`
- 作为独立开发者,我想在保存前**试跑** successCondition,避免命令写错后 AI 跑完才暴露
- 作为独立开发者,我想**改 Goal 然后保存**,UI 提醒会影响后续所有 Run

### 专家模式

- 作为高级用户,我想**为 SDAF 4 阶段各配独立 Skills/提示词/工具**,不按一锅烩
- 作为高级用户,我想**为每个阶段配阶段输出**(上下文摘要 / 任务列表 / 文件改动 / 验证报告),产物存入 state.yaml 供下一阶段消费
- 作为高级用户,我想**细粒度配置通知**(每个 SDAF 阶段完成分别推送,不只是成功/失败)
- 作为高级用户,我想**配多个 evaluator**(shell + llm-judge 组合,both pass 才算 Done)

---

## 6. 数据契约 / 接口

### 6.1 DB Schema (Drizzle / SQLite)

```typescript
export const blueprints = sqliteTable("blueprints", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),

  // ─── Layer 1 · Goal(完整 5 字段) ───────────────────────────
  goal: text("goal", { mode: "json" }).$type<Goal>().notNull(),

  // ─── Worker(Layer 5) ──────────────────────────────────────
  agent: text("agent").notNull().default("claude-code"),  // "claude-code" / "opencode" / "codex"
  model: text("model"),                                   // 默认值 Sonnet 4.6

  // ─── Project / 文件边界(Layer 6 的一部分) ─────────────────
  projectPath: text("project_path").notNull(),

  // ─── Trigger(Layer 0 触发) ────────────────────────────────
  triggers: text("triggers", { mode: "json" })
    .$type<TriggerConfig[]>()
    .notNull()
    .default(sql`'[]'`),

  // ─── Tool Layer(Layer 6) ─────────────────────────────────
  defaultToolLayer: text("default_tool_layer", { mode: "json" })
    .$type<ToolLayerConfig>()
    .notNull(),

  // ─── SDAF 4 阶段详情(专家模式, Iter 3+) ──────────────────
  sdafStages: text("sdaf_stages", { mode: "json" })
    .$type<SDAFStage[]>()
    .notNull()
    .default(sql`'[]'`),

  // ─── Phase 编排(Layer 4 Orchestrator 内部, ADR-0009/0011) ───
  // phases[] 是执行图,sdafStages[] 是默认值。
  // 保存时如果 phases[] 为空,自动从 sdafStages[] 推导线性有向图。
  phases: text("phases", { mode: "json" }).$type<Phase[]>()
    .notNull()
    .default(sql`'[]'`),
  startPhaseId: text("start_phase_id"),

  // ─── Iter 3+ 八层模块配置(JSON, 各层独立 schema) ──────────
  plannerConfig: text("planner_config", { mode: "json" }).$type<PlannerConfig>(),
  contextBuilderConfig: text("context_builder_config", { mode: "json" }).$type<CBConfig>(),
  verificationConfig: text("verification_config", { mode: "json" }).$type<VerifConfig>(),
  memoryConfig: text("memory_config", { mode: "json" }).$type<MemoryConfig>(),
  reflectionConfig: text("reflection_config", { mode: "json" }).$type<ReflectionConfig>(),
  humanGateConfig: text("human_gate_config", { mode: "json" }).$type<HumanGateConfig>(),

  // ─── 通知配置(块 4, Iter 6 完整) ─────────────────────────
  notification: text("notification", { mode: "json" }).$type<NotificationConfig>(),

  // ─── 禁止边界(块 6, Iter 2 起部分实施) ────────────────────
  deny: text("deny", { mode: "json" }).$type<DenyConfig>(),

  // ─── 重试策略(简化版, 与 goal.budget 互补) ────────────────
  retryPolicy: text("retry_policy", { mode: "json" })
    .$type<RetryPolicy>()
    .notNull(),

  // ─── 元数据 ───────────────────────────────────────────────
  type: text("type", { mode: "json" })
    .$type<string[]>()
    .default(sql`'[]'`),  // bug / refactor / test / docs / check / other
  status: text("status").$type<"active" | "disabled">()
    .notNull()
    .default("active"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});
```

### 6.2 类型定义

```typescript
// ─── Layer 1 · Goal ──────────────────────────────────────────
interface Goal {
  objective: string;                  // 主目标,也用作显示名
  constraints: string[];
  successCondition: string;           // 机器可执行的 shell 命令
  deadline?: string;                  // ISO8601,可选
  budget: {
    maxRounds: number;                // default 10 (ADR-0011 P0-4)
    maxTokensUSD: number;             // default 1.0
    maxWallTimeMs: number;            // default 600000
    maxTokensNum?: number;            // Token 数量上限(可选)
    warnAtPercent?: number;           // default 80
  };
}

// ─── Layer 6 · Tool Layer ───────────────────────────────────
interface ToolLayerConfig {
  skills: string[];                   // skill name (从 ~/.claude/skills/ 和 .claude/skills/ 选)
  tools: string[];                    // ["Bash", "Read", "Edit", "Glob", "Grep", ...]
  mcpServers: MCPRef[];
  subagents: SubagentRef[];
  permissionMode: 'plan' | 'acceptEdits' | 'bypassPermissions' | 'interactive';  // default: "acceptEdits" (ADR-0011 P0-4)
  allowedDirs: string[];              // 默认 [projectPath]
  disallowedTools?: string[];         // ["Bash(rm *)", "mcp__*"]
  systemPrompt?: string;              // 全局默认 system prompt 模板
}

// ─── SDAF 4 阶段(专家模式) ──────────────────────────────────
interface SDAFStage {
  phase: 'sense' | 'decide' | 'act' | 'feedback';
  prompt: string;                     // 增量提示词,叠加全局
  skills: string[];                   // 该阶段暴露的 skills
  tools: string[];                    // 该阶段暴露的工具
  permissionMode?: ToolLayerConfig['permissionMode'];
  model?: string;                     // 该阶段专属 model(决策阶段用 Opus)
  outputEnabled: boolean;             // 是否记录本阶段产物
  outputSpec: string;                 // 预期输出描述
}

// ─── 通知配置 ────────────────────────────────────────────────
interface NotificationConfig {
  on: {
    success: boolean;
    failure: boolean;
    humanGate: boolean;
    budgetWarning: boolean;
    progress: boolean;                // 每 N 轮 / SDAF 阶段完成
    progressEveryN?: number;
    // SDAF 阶段细分(专家)
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

// ─── 禁止边界 ────────────────────────────────────────────────
interface DenyConfig {
  // 文件层
  editPaths?: string[];               // glob, 例 ["package.json", "LICENSE", ".env*"]
  deletePaths?: string[];             // glob, 例 ["**/*.test.ts"]
  strictBoundary?: boolean;           // default true
  // Bash 命令层
  bashCommands?: string[];            // 黑名单, 例 ["rm -rf /", "curl * | sh", "sudo *"]
  customRules?: string[];             // Claude Code permission rule
  // Git 操作
  gitPush?: boolean;                  // default true(禁止)
  gitCommit?: boolean;                // default false(不禁止)
}

// ─── 触发器 ──────────────────────────────────────────────────
type TriggerConfig =
  | { type: "manual" }
  | { type: "once", at: string }
  | { type: "cron", expression: string, times?: string[] }
  | { type: "webhook", secret?: string }
  | { type: "git-push", repo: string, branch?: string }
  | { type: "git-pr", repo: string, events: string[] }
  | { type: "git-issue", repo: string, labels?: string[], events: string[] }
  | { type: "git-comment", repo: string, mention?: string }
  | { type: "ci-finished", provider: string, events: string[] }
  | { type: "email", filter?: { from?: string; subject?: string }, mode?: 'imap' | 'webhook' }
  | { type: "lark-msg", filter?: { chatId?: string; mention?: string } }
  | { type: "slack-msg", filter?: { channel?: string; mention?: string } }
  | { type: "discord-msg", filter?: { channel?: string } }
  | { type: "file-watch", path: string, events: string[], pattern?: string }
  | { type: "boot", delaySec?: number }
  | { type: "upstream-loop", upstreamLoopId: string, filter: { status: string } };

// ─── 重试策略 ────────────────────────────────────────────────
interface RetryPolicy {
  maxRetries: number;
  timeoutMinutes: number;
  onFail: "stop" | "notify" | "escalate";
}

// ─── MCP / Subagent 引用 ─────────────────────────────────────
interface MCPRef { name: string; command: string; }
interface SubagentRef { name: string; prompt: string; tools?: string[]; }
interface Phase { /* ADR-0009 */ }
```

### 6.3 显示名约定

Blueprint 在 UI / 列表 / 日志中显示 = `goal.objective` 的前 10 个字符 + "…"(超长时)。不再使用独立 `name` 字段。

### 6.4 REST API (Fastify)

| Method | Path | Body / Query | Response |
|---|---|---|---|
| `POST` | `/api/blueprints` | `BlueprintInput` (zod) | `{ blueprint: Blueprint }` |
| `GET` | `/api/blueprints` | `?status=active&type=bug` | `{ blueprints: Blueprint[] }` |
| `GET` | `/api/blueprints/:id` | - | `{ blueprint: Blueprint }` |
| `PATCH` | `/api/blueprints/:id` | `Partial<BlueprintInput>` | `{ blueprint: Blueprint }` |
| `DELETE` | `/api/blueprints/:id` | - | 204 |
| `POST` | `/api/blueprints/:id/dry-run-criteria` | - | `{ exitCode, stdout, stderr, durationMs }` |
| `POST` | `/api/blueprints/:id/dry-run-trigger` | - | 模拟触发,显示 ContextBundle / 不实际跑 Worker |

### 6.5 TriggerEvent payload schema

每次触发都生成一份 `TriggerEvent`,作为 Loop 启动时的输入上下文:

```typescript
interface TriggerEvent {
  triggerId: string;
  triggerType: string;
  firedAt: ISO8601;
  source: 'manual' | 'cron' | 'webhook' | 'git' | 'email' | ...;
  payload: ManualPayload | CronPayload | GitPayload | EmailPayload | ...;
}
```

Loop 内部可访问 `triggerEvent` 变量(在 Goal / Planner / Context Builder 的 prompt template 中)。

---

## 7. 完整交互规格(按 6 块)

### 块 1 · 触发与边界

#### 1.1 Trigger Mode 选择

| 维度 | 内容 |
|---|---|
| 干什么 | 选启动方式:手动 / 一次性 / 定时 / Webhook / Git / Email / 消息 / File Watch / Boot / 上游 Loop |
| 交互 | Segmented control 选 Tab,下方显示对应配置面板 |
| 后端 | `blueprints.triggers[].type` |

**简单模式**: 3 个 Tab — 手动 / 一次性 / 定时
**专家模式**: + 14 个额外 Tab (Iter 3-6 标注)

| Trigger | 配置字段 | 迭代 |
|---|---|---|
| Manual | 无 | Iter 2 |
| Once | datetime-local + 快捷按钮(下一个整点 / 明天 09:00) | Iter 2 |
| Schedule | 5 子模式(每天/每周/每月/每 N 天/Cron 表达式) + 时间选择器 + 时间列表 | Iter 2 |
| Webhook | secret 字段 | Iter 3 |
| Git Push | repo URL + branch 过滤 | Iter 3 |
| Git PR | repo URL + events(opened/synchronize/closed) | Iter 3 |
| Git Issue | repo URL + label 过滤 + events | Iter 3 |
| Git Comment | repo URL + @mention 关键词 | Iter 3 |
| CI/CD | provider(GitHub Actions/GitLab/Jenkins) + branch + 触发条件(成功/失败) | Iter 4 |
| Email | 方式(IMAP/Webhook) + IMAP 配置(Server/账号/密码) + 发件人/主题过滤 | Iter 4 |
| 飞书消息 | 方式(Webhook/Bot) + 配置 + @mention + 群过滤 | Iter 4 |
| Slack 消息 | Bot Token + channel + @mention | Iter 4 |
| Discord 消息 | Bot Token + channel | Iter 4 |
| File Watch | 路径 + 事件(create/modify/delete) + glob 匹配 | Iter 4 |
| Boot | 延迟秒数 + 说明 | Iter 5 |
| 上游 Loop | 上游 Blueprint 选择 + 条件(成功/失败/任意) | Iter 5 |

#### 1.2 Deadline

| 维度 | 内容 |
|---|---|
| 干什么 | 整个 Loop 的截止日期 — 超过自动 disable |
| 交互 | datetime-local 输入 |
| 规则 | **Manual 触发模式下隐藏此字段** |
| 后端 | `blueprints.goal.deadline` ISO8601 — Run 启动时校验,若过期直接 fail |

#### 1.3 Agent + Model

| 维度 | 内容 |
|---|---|
| Agent | 下拉: Claude Code(默认) / OpenCode(Iter 7+) / Codex(Iter 7+) |
| Model | 下拉: Sonnet 4.6(本机默认) / Opus 4.8 / Haiku 4.5 |
| 后端 | `blueprints.agent` / `blueprints.model` |

### 块 2 · 核心配置

#### 2.1 项目路径

| 维度 | 内容 |
|---|---|
| 干什么 | Loop 工作目录,cwd 锁 + 文件访问边界基线 |
| 交互 | 文本输入 + 📁 浏览按钮(弹出 mock 目录选择器) |
| 后端 | `blueprints.projectPath`; zod 校验绝对路径 |
| 安全 | 不允许 `..`; 系统目录(/usr / /System / /etc)显示警告 |

#### 2.2 目标 (Objective)

| 维度 | 内容 |
|---|---|
| 交互 | 5 行 textarea,实时截断显示名(前 10 字符 + "…") |
| 模板 | 下拉加载预存模板 + 💾 保存为模板 + 清空按钮 |
| 后端 | `blueprints.goal.objective` |

#### 2.3 成功标准 (Success Condition)

| 维度 | 内容 |
|---|---|
| 预制校验芯片 | 10 个可勾选 chip: lint / test / build / typecheck / format / security scan / dep audit / e2e / snapshot / bundle size |
| 自动生成 | 勾选后自动拼接 `pnpm lint && pnpm test && pnpm build` 到 textarea |
| 手动编辑 | textarea 可直接编辑,chip 同步回显 |
| 试跑 | 🧪 按钮 → `POST /api/blueprints/:id/dry-run-criteria` |
| 后端 | `blueprints.goal.successCondition` |

#### 2.4 约束 (Constraints)

| 维度 | 内容 |
|---|---|
| 交互 | 动态列表,+ 添加 / × 移除 |
| 模板 | 下拉加载预存模板 + 💾 保存为模板 |
| 后端 | `blueprints.goal.constraints` (string[]) |

### 块 3 · 生命周期(感知-决策-行动-反馈)

#### 3.1 简单模式: 全局工具池

| 字段 | 交互 | 后端 |
|---|---|---|
| Skills | chip 列表(预填充 brainstorming / TDD / systematic-debugging),可 × 移除,+ Add 弹已扫描列表 | `defaultToolLayer.skills` |
| 内建工具 | 复选框: Bash / Read / Edit / Write / Glob / Grep / WebFetch / WebSearch | `defaultToolLayer.tools[]` |
| MCP | chip 列表(预填 github / filesystem),+ Add 弹 prompt 填 name + command | `defaultToolLayer.mcpServers` |
| Subagent | chip 列表(预填 code-reviewer),+ Add 弹 prompt 填 name + prompt + tools | `defaultToolLayer.subagents` |
| 权限模式 | 下拉: plan / acceptEdits(默认) / bypassPermissions / interactive | `defaultToolLayer.permissionMode` |
| 系统提示词 | 3 行 textarea,标记"(全局默认)",变量 `{{goal.objective}}` 等 | `defaultToolLayer.systemPrompt` |

#### 3.2 专家模式: SDAF 4 阶段

每个阶段是可折叠 block(`<details>`),内含:

| 阶段 | 提示词 | Skills | Tools | Model | 权限模式 | 阶段输出 |
|---|---|---|---|---|---|---|
| **S 感知** | 增量叠加全局 | 只暴露读型 skills | Read / Glob / Grep / Bash | 继承全局 | 继承全局 | 上下文摘要 |
| **D 决策** | 增量叠加全局 | 规划类 skills | Read / Grep | Opus(推荐) | 继承全局 | 任务列表 + 优先级 |
| **A 行动** | 增量叠加全局 | 代码生成/测试类 skills | Bash / Edit / Write(默认全开) | 继承全局 | plan / acceptEdits / bypass | 文件改动 + 日志 |
| **F 反馈** | — | — | — | — | — | 验证报告 |

每阶段独有字段:

| 字段 | 交互 | 后端 |
|---|---|---|
| 提示词(增量,叠加全局) | 3 行 textarea | `sdafStages[].prompt` |
| Skills | chip 列表 + Add | `sdafStages[].skills` |
| 内建工具 | 复选框 | `sdafStages[].tools` |
| Model | 下拉(仅决策阶段明显) | `sdafStages[].model` |
| 权限模式 | 下拉(仅行动阶段明显) | `sdafStages[].permissionMode` |
| 阶段输出 | checkbox(启用) + textarea(预期输出描述) | `sdafStages[].outputEnabled` / `outputSpec` |

**关键架构**:
- 简单模式: 顶层工具池全局生效,通过 `--bare --plugin-dir <bundle> --tools ...` 一次性注入
- 专家模式: 顶层工具池隐藏,每阶段独立配置,Orchestrator 在 Phase 间切换 Context Bundle(同 session-id,换 Context)
- 系统提示词: 全局默认 + 各阶段增量叠加(`--append-system-prompt-file`)

### 块 4 · 反馈通知

#### 4.1 通知事件

| 事件 | 简单 | 专家 | 后端字段 |
|---|---|---|---|
| Loop 成功 | ☑ | ☑ | `notification.on.success` |
| Loop 失败 | ☑ | ☑ | `notification.on.failure` |
| 需人审 | ☑ | ☑ | `notification.on.humanGate` |
| 撞预算警告 | ☑ | ☑ | `notification.on.budgetWarning` |
| 感知完成 | — | ☐ | `notification.on.senseComplete` |
| 决策完成 | — | ☐ | `notification.on.decideComplete` |
| 行动完成(每任务) | — | ☑ | `notification.on.actComplete` |
| 反馈完成 | — | ☑ | `notification.on.feedbackComplete` |

#### 4.2 通知渠道(可展开面板,勾选后显示配置)

| 渠道 | 展开配置 | 后端 |
|---|---|---|
| 🖥 桌面通知 | 无需配置 | `channels.desktop: true` |
| 🌐 浏览器通知 | 首次需授权 | `channels.browser: true` |
| 📧 邮件 | SMTP host/port + 账号/密码 + 收件人 | `channels.email` |
| 💬 飞书 | Webhook URL | `channels.lark` |
| 💬 Slack | Webhook URL | `channels.slack` |
| 💬 Discord | Webhook URL | `channels.discord` |
| 💬 Telegram | Bot Token + Chat ID | `channels.telegram` |
| 🔧 自定义 Skill | Skill 名 + prompt | `channels.skill` |
| 🔧 自定义 CLI | shell 命令 | `channels.cli` |

#### 4.3 通知模板(专家)

| 字段 | 示例 |
|---|---|
| 标题模板 | `"Loop {{loop.objective}} {{event.type}}"` |
| 正文模板 | `📋 Loop {{loop.objective}} {{event.type}}\nRound: {{run.round}} · Cost: ${{run.cost}}\n{{event.message}}` |

### 块 5 · 失败重试

| 字段 | 交互 | 默认 | 后端 |
|---|---|---|---|
| 最多重试次数 | stepper(步进 1) | 3 | `retryPolicy.maxRetries` |
| 单次超时 | stepper(步进 5) + 单位(min/hour) | 10 min | `retryPolicy.timeoutMinutes` |
| 彻底失败时 | 下拉: 通知 / 停止(默认) / 升级 model | 停止 | `retryPolicy.onFail` |
| Reflection(专家) | checkbox 启用 + N 次失败后升级 stepper + 升级 model | 启用,2 次→Opus | `reflectionConfig` |

### 块 6 · 禁止边界

#### 6.1 预算上限

| 字段 | 交互 | 默认 | 后端 |
|---|---|---|---|
| 总 Round 上限 | stepper(步进 1) | 10 | `goal.budget.maxRounds` |
| Token 数量上限 | stepper(步进 1000) + 单位(K/M) + 警告阈值% | 不限制 | `goal.budget.maxTokensNum` |
| 花费上限($) | stepper(步进 0.5) + 警告阈值% | 不限制 | `goal.budget.maxTokensUSD` |
| Wall time 上限 | stepper(步进 5) + 单位(min/hour) + 警告阈值% | 10 min | `goal.budget.maxWallTimeMs` |

#### 6.2 文件保护

| 字段 | 交互 | 后端 |
|---|---|---|
| 禁止编辑(glob) | 动态列表 + 📁 浏览 | `deny.editPaths` |
| 禁止删除(glob) | 动态列表 + 📁 浏览 | `deny.deletePaths` |
| 严格边界 | checkbox + tooltip(三重约束说明) | `deny.strictBoundary: true` |

**三重约束**: `--add-dir <projectPath>` + `cwd` 锁 + Claude Code permission rule。Agent 的 Edit/Write/Delete 均被限制在此目录下,Read 仍允许。

#### 6.3 Bash 命令限制

| 字段 | 交互 | 预设 | 后端 |
|---|---|---|---|
| 危险命令预设 | 复选框 | rm -rf / / curl \| sh / sudo / git push --force / npm publish | `deny.bashCommands` |
| 自定义规则(专家) | textarea | — | `deny.customRules` |
| Git | 复选框 | 禁 git commit(默认关) / 禁 git push(默认关) | `deny.gitPush` / `deny.gitCommit` |

---

## 8. 简单 vs 专家 暴露差异

| 块 | 简单模式显示 | 专家模式额外 |
|---|---|---|
| 1 触发与边界 | Manual / Once / Cron + Deadline + Agent + Model | + 14 种外部触发器 |
| 2 核心配置 | 全部 | _无_ |
| 3 生命周期 | 工具池全局 + 系统提示词 | SDAF 4 阶段各配 Skills/Tools/提示词/输出 |
| 4 反馈通知 | 4 个基本事件 + 渠道 | SDAF 阶段细分通知 + 模板自定义 |
| 5 失败重试 | Max Retries + Timeout + On Fail | Reflection 升级 |
| 6 禁止边界 | 预算 4 项 + 危险命令预设(glob) | 自定义 deny rule |

---

## 9. 验收标准 (Done Criteria)

### 9.1 后端

- [ ] DB schema 通过 `drizzle-kit generate` 生成 migration,apply 成功
- [ ] 7 个 REST endpoint 全实现,zod 校验生效
- [ ] `POST /api/blueprints/:id/dry-run-criteria` 5s 内返回
- [ ] `POST /api/blueprints/:id/dry-run-trigger` 返回模拟 ContextBundle
- [ ] Skill 扫描从 `~/.claude/skills/` 和 `<projectPath>/.claude/skills/` 读取
- [ ] 保存后生成 `~/.loop-cockpit/loops/<id>/skills-bundle/` 临时 plugin 目录
- [ ] zod 拒绝无效 successCondition(空 / 非可执行) + 无效 cron expr + 无效 projectPath(非绝对路径)

### 9.2 前端(原型 → 正式实现)

- [ ] 6 块均可折叠/展开
- [ ] 简单/专家模式切换不丢数据
- [ ] 所有 stepper +/- 正常工作
- [ ] Trigger 切换显示对应配置面板,Manual 隐藏 Deadline
- [ ] 成功标准 chip 勾选/取消自动更新 textarea
- [ ] 目标输入实时截断显示名
- [ ] 模板保存/加载正常
- [ ] Skills/MCP/Subagent 增删正常
- [ ] 禁止文件/文件夹动态行增删正常
- [ ] 通知渠道可展开/收起,配置字段可见
- [ ] i18n ZH/EN 切换正常
- [ ] 主题切换(暗色默认)正常
- [ ] localStorage 持久化正常

### 9.3 安全

- [ ] projectPath 严格校验绝对路径 + 不允许 `..`
- [ ] 系统目录(/usr / /System / /etc)显示警告
- [ ] 危险命令三层防护(permission rule + orchestrator 中间层 + shell wrapper)

---

## 10. 非功能约束

- **性能**: 列表页加载 < 500ms(<= 100 Blueprints);保存 < 200ms;skill 扫描 < 1s
- **可靠性**: DB 写入用事务,失败不留半截 Blueprint;skills-bundle 生成失败不影响 Blueprint 保存(降级警告)
- **兼容**: Chrome / Edge / Safari / Firefox 最新两版
- **默认主题**: 始终暗色,用户可切换到亮色并持久化到 localStorage

---

## 11. 开放问题

- ⚠️ **Q · 简单模式 vs 专家模式 切换时如何保留数据?**
  - 倾向:专家模式所有配置 JSON 字段保留,简单模式只读到默认字段;切换不丢数据
- ⚠️ **Q · skills-bundle 重新生成时机?**
  - 倾向:Blueprint 保存时同步生成;skill 文件本身变化时 Loop Cockpit 不主动监听(下次 Run 时拉取最新)

---

## 12. Skills/MCP/Subagent 加载机制

### 怎么加载给 Agent?

**不是让 Agent 去读用户目录,而是 Loop Cockpit 在保存 Blueprint 时预加载到隔离环境:**

| 资源 | 加载方式 | 是否受 projectPath 限制 |
|---|---|---|
| **Skills** | 保存时复制/软链接到 `~/.loop-cockpit/loops/<id>/skills-bundle/`,通过 `--plugin-dir` 注入 | 不受限(Skill 文件独立于项目) |
| **MCP** | 生成 `mcp.json` 配置文件,通过 `--mcp-config --strict-mcp-config` 注入 | **不受限**(MCP server 是独立进程,有自己的文件系统权限) |
| **Subagents** | 通过 `--agents '{...}'` 内联 JSON 注入,不碰文件系统 | N/A |
| **Tools** | 通过 `--tools` 白名单控制(Bash/Read/Edit/Write 等) | 编辑/删除受限,读取允许 |

### 读取可以吗?只是不能编辑?

**是的。** Read tool + Bash 读文件是允许的。但 Edit/Write/Delete 操作受三重约束:
1. `--add-dir <projectPath>` — Claude Code 原生文件边界
2. `cwd` 锁 — Worker spawn 时固定工作目录
3. Claude Code permission rule — 如 `Write(!package.json)` 精确控制

### Token 会不会太多?

Skills 文件本身很小(通常 < 1KB),MCP server 的 schema 也是 JSON 描述(< 5KB)。Loop Cockpit 只在 Blueprint 保存时做一次复制/生成,不实时读取。Agent 看到的是一份精简的 context bundle,不是整个文件系统。

---

## 13. 危险命令三层防护

| 层 | 机制 | 说明 |
|---|---|---|
| 1 | Claude Code permission rule | `customRules` 字段,如 `Bash(rm:*)`, `Write(/etc/*)` — Claude Code 原生拦截 |
| 2 | Orchestrator 中间层 | 解析 `stream-json` 输出,检测 tool call 匹配 deny 规则时直接拒绝 |
| 3 | Shell wrapper | spawn 时注入 alias,如 `alias rm='echo DENIED'` 作为二次兜底 |

---

## 14. 系统提示词层级

```
┌─────────────────────────────────────────┐
│ 全局系统提示词 (defaultToolLayer.systemPrompt)  │
│ 变量: {{goal.objective}} {{projectPath}} {{successCondition}} │
└────────────────┬────────────────────────┘
                 │ 叠加
┌────────────────▼────────────────────────┐
│ SDAF 阶段 1 增量提示词 (sdafStages[0].prompt)  │
├─────────────────────────────────────────┤
│ SDAF 阶段 2 增量提示词 (sdafStages[1].prompt)  │
├─────────────────────────────────────────┤
│ SDAF 阶段 3 增量提示词 (sdafStages[2].prompt)  │
├─────────────────────────────────────────┤
│ SDAF 阶段 4 增量提示词 (sdafStages[3].prompt)  │
└─────────────────────────────────────────┘
```

Orchestrator 在每阶段执行前,通过 `--append-system-prompt-file` 追加该阶段增量提示词到全局之上。

---

## 15. 变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 首版 Draft,基于 Iter 2 主线 |
| 2026-06-28 | v0.2 | 加 phases[] / startPhaseId / type[] 字段(ADR-0009) |
| 2026-06-28 | v0.3 | Goal 5 字段重构,删 name 字段(ADR-0010 Layer 1) |
| 2026-06-28 | v0.4 | 全面对齐 ADR-0010 8 层架构 |
| 2026-06-28 | v0.5 | UI 重组为 6 块,新增 notification + deny 字段 |
| 2026-06-28 | **v0.6** | **★ 基于 v7 原型全面重写:SDAF 4 阶段独立配置 + 阶段输出 + 17+ 触发器 + 成功标准预制 chip + 模板系统 + 显示名截断 + 简单/专家工具池分离 + 通知渠道细分 + 三重约束说明** |
| 2026-06-28 | **v0.7** | **★ ADR-0011 收敛: permissionMode default="acceptEdits" + maxRounds default=10 + phases[] vs sdafStages[] 语义锁定 + Trigger 类型以 F002 为 Truth Source** |
