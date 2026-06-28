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
Loop 的启动触发条件,多源:Cron / Manual / 一次性 / Webhook / Git event / Email / Message / Goal-based。

### Phase (阶段) ★ Iter 2 新增
**Loop 内部的一个工作单元**,有独立的:system prompt / 可用 skill / 可用 tools / 可用 MCP / 文件读写权限 / 评估器 / 分支规则。
- 一个 Loop 由 N 个 Phase 组成,默认线性顺序,可加分支
- 阶段间通过同 `--session-id` 共享 Claude 会话上下文
- 例:Bug 修复 Loop = `分析 → (按难度分支) → 修复 → 测试`
- 详见 [ADR-0009](./decisions/0009-phase-orchestration.md)

### Evaluator (评估器) ★ Iter 2 新增
**判断 Phase 是否完成的机制**,4 种内置实现:
- `shell` — 退出码 0 = pass(向后兼容 Done Criteria)
- `llm-judge` — LLM 分类输出,如 "trivial/moderate/complex"
- `regex` — stdout 匹配模式
- `none` — 不评估,直接跳下一阶段
- 旧 "Done Criteria" 字段(Iter 1)等同于 `shell` 类型的 Phase Evaluator

### Branch (分支) ★ Iter 2 新增
**Phase 评估完成后跳转到哪个 Phase 的规则**:
- `if: <evaluator-result>` → 跳到指定 Phase ID
- `default:` → 兜底
- 内置终止符: `__terminal__`(整 Loop 成功)/ `__fail__`(失败)/ `__notify__`(通知后结束)

---

## 8 层架构核心概念(★ Iter 2 - ADR-0010 引入)

### Goal(目标)
**Loop 的"宪法"**,完整字段:
- `objective`(主目标,自然语言)
- `constraints[]`(硬约束,例 "不能改 API")
- `successCondition`(客观可量化,机器可验证)
- `deadline?`(截止时间)
- `budget`(maxRounds + maxTokensUSD + maxWallTimeMs)

详见 [loop-anatomy §6 配置者视角](./loop-anatomy.md)。

### Planner(规划器)
**Layer 2**。每轮 Loop 开始时调一次 LLM,出本轮任务列表 + 优先级 + 每任务成功标准。
- 用户可配 Planner model(通常用 Opus 思考,Worker 用 Sonnet 执行)
- 用户可配是否每轮 replan 还是 plan 一次执行到底

### Context Builder(上下文构建器)★ Loop Cockpit 最差异化
**Layer 3**。**不一锅烩塞给 Agent**,按当前任务的 priority/type 按需挑选:Memory + Skill + MCP + Tools + Subagents + Files + Artifacts。

用户配 "Context 规则":一个 mapping `task.priority → ContextBundle`。

### Orchestrator(编排器)
**Layer 4**。接收 ContextBundle 后,决定主/子 agent 启动顺序、工具串联协议、读写文件,启动 Claude Code(`--session-id`/`--bare`/`--plugin-dir` 等 flag 落地)。

### Worker Agent
**Layer 5**。实际干活的 — Iter 2 = Claude Code,Iter 7+ 扩展到 OpenCode/Kimi/Codex 等。Loop Cockpit 不实现 worker,**它就是** Claude Code。

### Tool Layer(工具层)
**Layer 6**。阶段化暴露给 Agent 的能力集合:skills / MCP / 内建 tools / subagents / 文件读写边界。通过 Claude Code 2.1 的 `--bare + --plugin-dir + --mcp-config + --agents + --tools + --add-dir` 落地。

### Verification(验证)
**Layer 7**。Worker 跑完后判断:
- 任务完成了吗?
- Goal 达成了吗?
- 进下一步 / 回上步 / 撞预算停 / 触发 Reflection / 需人审?

多 evaluator 组合:`shell` + `llm-judge` + `regex` + `human`。

### Memory (State)(状态)
**Layer 8**。**Loop 不依赖聊天记录**,独立落 `~/.loop-cockpit/runs/<runId>/state.yaml`。每轮:读 State → 工作 → 写 State。
Iter 5 加 SQLite FTS5 跨 Loop 经验复用。

### Reflection / Retry(反思 / 重试)
**横切层**。失败时调 LLM 反思:Planner 错? Context 不够? Worker 不够?
输出改动建议:改 plan / 升级 model / 重试 / 升级。Iter 3+ 实现。

### Human Gate(人在环)
**横切层**。关键决策必须人审。3 模式:
- `interrupt`(暂停,等响应,最安全)
- `default-approve`(通知,Loop 照跑,拒绝才停)
- `default-reject`(暂停,timeout 自动拒,最严格)

详见 [ADR-0010 §Human Gate](./decisions/0010-autonomous-loop-architecture.md)。

### TriggerEvent
**Trigger 触发时产生的 payload**,作为 Loop 启动时的输入上下文(`triggerEvent` 变量在 Goal/Planner/Context Builder 的 prompt template 中可访问)。详见 [triggers.md](./triggers.md)。

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
| 2026-06-28 | v0.3 | ★ 加 Phase / Evaluator / Branch 三个新词条(Iter 2 Phase 编排架构) |
| 2026-06-28 | v0.4 | ★★ 加 8 层完整自治架构核心概念(Goal/Planner/Context Builder/Orchestrator/Worker/Tool Layer/Verification/Memory/Reflection/Human Gate/TriggerEvent) - ADR-0010 |
