# 术语表（Glossary）

> 本文件锁死 Loop Cockpit 全部核心术语的定义。任何文档、代码、UI 文案出现这些词，
> **必须**和这里保持一致。修改本文件等同于修改产品契约，需走 ADR 流程。

---

## 核心五件套

### Loop

> 一个**目标驱动的自治闭环**：在沙箱中，由一个或多个 Agent 反复执行→验收→修正，直到达成 Goal 或撞到预算上限。

- 与 **Cron Job** 的区别：Cron 跑命令；Loop 跑直到验收通过。
- 与 **Workflow** 的区别：Workflow 是 DAG；Loop 是带反馈的环。

### Blueprint

> 一个 **Loop 的定义/模板**。它是**静态配置**，包含 Goal、Done Criteria、Agent、Trigger、Skill、MCP 等。

- Blueprint 不会"运行"，只会被**实例化**为 Run。
- 用户在 UI 里"创建 Loop"，本质是**创建 Blueprint**。

### Run

> 一个 Blueprint 的**一次具体执行**。包含 runId、worktree、当前迭代次数、状态、日志、产物。

- 一个 Blueprint 可以有 N 个 Run。
- Run 是**审计单元**——所有日志、token 流水、产物都挂在 Run 上。

### Task

> 在一个 Run 内，Agent 完成的**最小工作单元**。

- 默认情况下 1 Run = 1 Task（最简单 Loop）。
- 复杂 Loop 可拆为多个 Task（如 "写代码 → 审查 → 测试"）。
- Task 之间通过 Run 共享 worktree。

### Trigger

> Loop 被启动的**触发条件**。Loop Cockpit 支持多源触发器：

| 类型 | 例子 |
|---|---|
| Cron | `0 9 * * *`（每天 9 点） |
| Manual | UI 点击 "Run now" |
| Webhook | 外部系统 POST 到 `http://localhost:PORT/triggers/<id>` |
| Git event | PR 创建、Issue 评论、push |
| Email | 收到匹配规则的邮件 |
| Message | 飞书/钉钉/Slack 消息 |
| Goal-based | 不按时间，"直到目标达成才停" |

详见 [`docs/architecture/modules/scheduler.md`](../architecture/modules/scheduler.md)。

---

## 配置类

### Goal

> 用**自然语言**描述这个 Loop 要达成什么。
> 例："让项目测试覆盖率达到 85%"

### Done Criteria

> **可机器执行**的完成判定。
> 例：`npm test && [ "$(jest --coverage --json | jq .total.lines.pct)" -ge 85 ]`

- 必须返回 exit code（0 = 完成）
- **不接受**纯主观判断（参见 [non-goals.md](./non-goals.md) §7）

### Retry Policy

> Loop 失败后的策略。包含：
- `maxRetries`：最大重试次数
- `timeoutMinutes`：单次 Run 超时
- `tokenBudget`：token 消耗上限
- `onFail`：失败后动作（`stop` / `notify` / `escalate`）

### Skill

> 用户预定义的**可复用规则包**，会注入到 Agent 的 system prompt。
> 例："代码必须遵循 Airbnb 风格""禁止使用 any 类型"

- 文件格式：Markdown 或 `.rules`
- 作用范围：用户级（全局） / 项目级 / Loop 级

### MCP Server

> Model Context Protocol 服务器。Loop Cockpit 可挂载多个 MCP，提供给 Agent 调用。

### System Prompt Template

> 每个 Loop 可自定义的提示词模板，支持变量注入（`{{goal}}`, `{{worktree}}`, `{{memory}}`）。

---

## 执行类

### Worktree

> Git worktree 隔离的沙箱目录。
- 路径：`~/.loop-cockpit/workspaces/<runId>/`
- 一个 Run 独占一个 Worktree。
- **Run 失败时不自动删除**——保留现场供调试。

### Artifact

> 一个 Run 产生的**可流转到下一个 Loop** 的产物（文件 / 文本 / 结构化数据）。
- 存储路径：`~/.loop-cockpit/artifacts/<runId>/`
- 跨 Loop 数据流的载体。

### Memory

> 跨 Run 持久化的**经验**。基于 SQLite FTS5。
- 类型：错误模式 + 修复策略、成功模式
- 作用：让同类错误下次秒解，避免反复踩坑。

### Audit Trail

> 一个 Run 的全量可审计记录。
- 包含：执行日志（pino 结构化）、Agent 推理链、token 流水、Done Criteria 评估结果、Worktree diff

---

## 系统类

### Host

> Loop Cockpit 的本地 Node.js 进程，承载 Fastify API + 调度器 + PTY 桥 + 数据库。

### Agent

> 被 Loop Cockpit 编排的**外部 Coding Agent**（Claude Code、OpenCode、Kimi Code 等）。
> **不是** Loop Cockpit 自己的 Agent。

### Agent Adapter

> 适配某个具体 Agent 的代码层，实现统一接口 `AgentAdapter { start, stream, stop }`。

### PTY Harness

> 用 node-pty 拉起 Agent 进程，捕获 stdout/stderr/ANSI，并通过 FSM 自动应答交互式确认。

### Channel

> 外部消息通道（飞书、钉钉、Slack、Discord、Telegram、邮件等），用于通知 Run 结果。

---

## 角色类

### 维护者 (Maintainer)

[@oh-summy](https://github.com/oh-summy)，对所有 Non-Goals 和 ADR 有最终决定权。

### 用户 (User)

Loop Cockpit 的最终使用者——独立开发者或小团队。

### 协作者 (Contributor)

通过 PR 贡献代码/文档的人。

### AI 助手 (AI Assistant)

被维护者召唤进来协助开发的 AI 工具（Claude Code、Codex、Cursor 等）。规则见 [`AGENTS.md`](../../AGENTS.md)。

---

## 易混淆点对照表

| 你可能想说 | 但 Loop Cockpit 里这么叫 |
|---|---|
| 工作流 / Workflow | **Loop**（强调闭环，不是 DAG） |
| 任务 / 配置 | **Blueprint**（蓝图） |
| 执行实例 / Execution | **Run** |
| 子任务 / Step | **Task** |
| 定时器 / Cron | **Trigger**（Cron 只是其中一种） |
| 沙箱 / Container | **Worktree**（用 git 实现，不是容器） |
| 知识库 / RAG | **Memory**（只存经验，不存外部知识） |

---

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-24 | v0.1 | 首版 |
