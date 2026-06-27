# 术语表 (Glossary)

> Loop Cockpit 核心术语锁定。文档/代码/UI 文案出现这些词,**必须**与本表一致。
> 修改术语 = 修改产品契约,需走 ADR。

---

## 核心五件套

### Loop
**目标驱动的自治闭环**:在沙箱中,Agent 反复执行→验收→修正,直到达成 Goal 或撞预算上限。
- vs Cron Job:Cron 跑命令,失败即失败;Loop 跑**直到验收通过**(单次 Run 内 retry)
- vs Workflow:Workflow 是 DAG;Loop 是带反馈的环

> **关于 Manual 触发**:Manual 触发的也是 Loop——**循环发生在单次 Run 内部的 retry**(`maxRetries > 0` 时,Agent 失败会被 retryPolicy 反复唤起,直到 Done Criteria 通过或撞预算)。
> 若用户写 `maxRetries=0` + 简单 doneCriteria,行为上退化成定时任务——这是**用户主动选择不利用 Loop 能力**,不是产品边界问题。Loop Cockpit 不限制使用姿势,但它的核心价值在 retry 闭环。

### Blueprint
**Loop 的定义/模板**,静态配置——含 Goal、Done Criteria、Agent、Trigger、Skill、MCP 等。
- 不"运行",只被**实例化**为 Run
- UI 里"创建 Loop" = 创建 Blueprint

### Run
Blueprint 的**一次具体执行**。含 runId、worktree、迭代次数、状态、日志、产物。
- 一个 Blueprint 可有 N 个 Run
- Run 是**审计单元**——日志/token/产物都挂 Run 上

### Task
Run 内 Agent 完成的**最小工作单元**。
- 默认 1 Run = 1 Task
- 复杂 Loop 可拆多 Task(如 "写→审→测"),共享 worktree

### Trigger
Loop 的启动触发条件,多源:Cron / Manual / Webhook / Git event / Email / Message / Goal-based。

---

## 配置类

| 术语 | 定义 |
|---|---|
| **Goal** | 自然语言目标。例:"让测试覆盖率达 85%" |
| **Done Criteria** | 可机器执行的完成判定(exit code 0=完成)。**不接受**主观判断,详见 [non-goals §7](./non-goals.md) |
| **Retry Policy** | `maxRetries` / `timeoutMinutes` / `tokenBudget` / `onFail`(stop/notify/escalate) |
| **Skill** | 预定义可复用规则包,注入 Agent system prompt。Markdown 或 `.rules`,用户/项目/Loop 级 |
| **MCP Server** | Model Context Protocol 服务器,可挂多个供 Agent 调用 |
| **System Prompt Template** | 每 Loop 可定制的提示词模板,支持 `{{goal}}` / `{{worktree}}` / `{{memory}}` 变量 |

---

## 执行类

| 术语 | 定义 |
|---|---|
| **Worktree** | Git worktree 隔离的沙箱。路径 `~/.loop-cockpit/workspaces/<runId>/`,失败时不自动删 |
| **Artifact** | Run 产生的可跨 Loop 流转的产物。`~/.loop-cockpit/artifacts/<runId>/` |
| **Memory** | 跨 Run 持久化的经验(错误模式+修复策略+成功模式)。SQLite FTS5 |
| **Audit Trail** | Run 的全量可审计记录:pino 日志+推理链+token 流水+Done Criteria 评估+worktree diff |

---

## 系统类

| 术语 | 定义 |
|---|---|
| **Host** | Loop Cockpit 本地 Node.js 进程:Fastify API + 调度器 + PTY 桥 + DB |
| **Agent** | 被编排的**外部** Coding Agent(Claude Code、OpenCode、Kimi 等),**不是** Loop Cockpit 自己的 Agent |
| **Agent Adapter** | 适配某 Agent 的代码层,统一接口 `AgentAdapter { start, stream, stop }` |
| **PTY Harness** | node-pty 拉起 Agent,捕获 stdout/stderr/ANSI,FSM 自动应答交互 |
| **Channel** | 外部消息通道(飞书/钉钉/Slack/Discord/Telegram/Email),通知 Run 结果 |

---

## 易混淆对照

| 你可能想说 | 但 Loop Cockpit 里叫 |
|---|---|
| 工作流 / Workflow | **Loop**(闭环,不是 DAG) |
| 任务 / 配置 | **Blueprint**(蓝图) |
| 执行实例 / Execution | **Run** |
| 子任务 / Step | **Task** |
| 定时器 / Cron | **Trigger**(Cron 只是其中一种) |
| 沙箱 / Container | **Worktree**(git 实现,不是容器) |
| 知识库 / RAG | **Memory**(只存经验,不存外部知识) |

---

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-24 | v0.1 | 首版 |
| 2026-06-27 | v0.2 | 砍冗余、去角色类与修订啰嗦段、合表格 |
