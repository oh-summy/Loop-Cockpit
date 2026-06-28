---
id: 0010
title: AI 自治 Loop 完整架构(感知-决策-行动-反馈)
status: Accepted
date: 2026-06-28
deciders: "@oh-summy"
supersedes: ADR-0009 (扩展并升级)
---

# ADR-0010 · AI 自治 Loop 完整架构

## 上下文 (Context)

ADR-0009 把 Loop 定义为 **N 个 Phase 的有向图**。维护者 2026-06-28 进一步提出:

> Loop 应该是 **感知 → 决策 → 行动 → 反馈** 的完整自治循环,而不是单纯阶段执行。

这意味着 Loop Cockpit 的产品定位需要从"阶段编排器"升级为 **AI 自治系统的指挥架构** — 用户配的不是"什么时候跑命令",是"AI 在这个 Loop 里能感知什么 / 怎么决策 / 怎么行动 / 怎么验证 / 失败怎么办 / 何时找人"。

这种定位契合:
- **行业范式**:Reflexion(Actor-Evaluator-Reflection)、LangGraph(state graph + checkpointer + interrupt)、CrewAI(role-goal-task DAG)、Cognition Devin(planning + verifier + memory)的工业事实
- **Claude Code 2.1 能力**:`--session-id` / `--bare` / `--plugin-dir` / `--mcp-config` / `--agents` / `--tools` / `--permission-mode` 等 flag 已支持精细控制
- **场景广度**:不再局限编码,适配邮件分析 / 信息监控 / 周报生成 / CI 后置 / 个人工作流自动化

### 与 ADR-0009 的关系

ADR-0009 是 v1.0(Phase 线性 + 分支),ADR-0010 是 v2.0(8 层完整架构)。**ADR-0009 的 Phase 模型保留作为本架构的"行动层"**(第 5 层 Worker / 第 6 层 Tool / 第 4 层 Orchestrator 共同负责一个 Phase 的执行)。

## 决策 (Decision)

**Loop Cockpit Iter 2 起,Loop 抽象为 8 层 + 2 个横切层 的完整自治架构。**

### 8 层完整架构

```
                  ┌──────────────────────────────────────────────┐
                  │  Layer 1 · Goal                              │
                  │    Objective / Constraints / Success / Budget│
                  │    Deadline ─ 用户配 + AI 理解             │
                  └────────────────────┬─────────────────────────┘
                                       │
                  ┌────────────────────▼─────────────────────────┐
                  │  Layer 2 · Planner                           │
                  │    根据 Goal → 拆任务 → 排优先级           │
                  │    每个任务的成功标准 ─ AI 出方案 + 用户审  │
                  └────────────────────┬─────────────────────────┘
                                       │
                  ┌────────────────────▼─────────────────────────┐
                  │  Layer 3 · Context Builder                   │
                  │    按需注入(不一锅烩)                      │
                  │    挑选: Memory + Skill + Files + Artifacts │
                  └────────────────────┬─────────────────────────┘
                                       │
                  ┌────────────────────▼─────────────────────────┐
                  │  Layer 4 · Orchestrator                      │
                  │    决定主 agent / subagent 启动顺序          │
                  │    工具串联、读写文件、协调                  │
                  └────────────────────┬─────────────────────────┘
                                       │
                  ┌────────────────────▼─────────────────────────┐
                  │  Layer 5 · Worker Agent (Claude Code)        │
                  │    实际执行: 写代码 / 搜索 / 写文档 / 分析   │
                  └────────────────────┬─────────────────────────┘
                                       │
                  ┌────────────────────▼─────────────────────────┐
                  │  Layer 6 · Tool Layer                        │
                  │    阶段化暴露 skills / MCP / tools / subagent│
                  │    --bare + --plugin-dir + --mcp-config 落地 │
                  └────────────────────┬─────────────────────────┘
                                       │
                  ┌────────────────────▼─────────────────────────┐
                  │  Layer 7 · Verification                      │
                  │    Goal 达成? 还缺什么? 进下一步 / 回上步 /  │
                  │    撞预算停 / 触发 Reflection                │
                  └────────────────────┬─────────────────────────┘
                                       │
                  ┌────────────────────▼─────────────────────────┐
                  │  Layer 8 · Memory (State)                    │
                  │    任务完成态 / 未完成态 / 经验沉淀          │
                  │    每轮: 读 State → 工作 → 写 State          │
                  │    ★ 不依赖聊天记录                          │
                  └─────────────────────────────────────────────-┘

  横切层:
    ─ Reflection / Retry ─ 失败时:分析→改方案→针对性重试
    ─ Human Gate ─ 关键决策(default: approve / reject / wait)
```

### 数据流(一轮 Loop)

```
触发(Trigger)
   ↓
Goal (用户配置 + AI 理解) ─────────────────────────┐
   ↓                                                  │
Read Memory (上轮 State)                              │
   ↓                                                  │
Planner: 出本轮任务列表 + 优先级                      │
   ↓                                                  │
ContextBuilder: 为 P0 任务挑上下文                    │
   ↓                                                  │
Orchestrator: 启 Claude Code (--session-id $UUID)    │
   - bare + 注入选定 plugin(skills)                  │
   - 注入选定 mcp / agents / tools                     │
   - 设权限(plan / acceptEdits / bypass)             │
   ↓                                                  │
Worker Agent 执行                                     │
   ↓                                                  │
Verification: 这个任务做完了? Goal 达成?            │
   ↓                                                  │
分支:                                                 │
  ├─ Goal 达成 → __terminal__                        │
  ├─ 还有任务 → Write Memory, 下个任务 (回 Planner) ─┤
  ├─ 失败 + 还有预算 → Reflection → Retry            │
  ├─ 撞预算 → __fail__                                │
  └─ 需人审 → Human Gate (按模式中断 / 通知)         │
```

## 各层完整定义

### Layer 1 · Goal

```typescript
interface Goal {
  objective: string;             // 主目标,自然语言,例 "修复 Issue #123"
  constraints: string[];         // 硬约束,例 ["不能改 API", "不能升 deps"]
  successCondition: string;      // 客观可量化,例 "pnpm test && git diff API/ 为空"
  deadline?: ISO8601;            // 截止时间,可选
  budget: {
    maxRounds: number;           // 最多几轮 Loop(default 20)
    maxTokensUSD: number;        // token 上限美元(default $1)
    maxWallTimeMs: number;       // 总时长(default 10min)
  };
}
```

**核心约定**: `successCondition` 必须是 **机器可验证**(命令 / shell / 函数),不接受"看起来不错"主观判断。延续 [non-goals §7](../non-goals.md) 的契约。

### Layer 2 · Planner

每轮 Loop 开始时,Planner 调一次 LLM (model 可配,默认沿用 Loop 主模型),输出:

```typescript
interface Plan {
  round: number;
  tasks: Task[];
  rationale: string;             // 这一轮为什么这么排
}

interface Task {
  id: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2';  // P0 先做
  successCriteria: string;       // 这个任务的成功标准(子目标)
  estimatedTokens: number;       // Planner 自己估算
  requiresHumanReview?: boolean; // 触发 Human Gate?
}
```

**用户配置 Planner 的方式**:
- 选 Planner model(可与 Worker 不同,Planner 通常用 Opus 思考,Worker 用 Sonnet 执行)
- 配 Planner system prompt 模板(可自定义)
- 配"是否每轮重 plan"还是"plan 一次就执行到底"(默认每轮重 plan)

### Layer 3 · Context Builder

**这是 Loop Cockpit 最差异化的层**。不是把所有可用上下文一锅烩塞给 Claude,而是**按当前任务的 priority 和 type 挑选**:

```typescript
interface ContextBundle {
  taskId: string;
  systemPromptAdditions: string;     // append to Claude system prompt
  skills: SkillRef[];                // 仅这个任务需要的 skills
  mcpServers: MCPRef[];              // 仅这个任务需要的 MCP
  tools: BuiltinTool[];              // 仅这个任务的工具白名单
  subagents: SubagentRef[];          // 仅这个任务可用的 subagents
  files: FileRef[];                  // 仅需读的文件(--add-dir 加白)
  memoryEntries: MemoryEntry[];      // 检索到的相关历史经验
  artifacts: ArtifactRef[];          // 上游 Loop 产物(如有)
}
```

**用户配置 Context Builder 的方式**:
- 在 Blueprint 配 "Context 规则":一个 mapping `task.priority → ContextBundle`
- 或者高级模式:用 LLM 让 Context Builder 自己决定(Iter 4+)

### Layer 4 · Orchestrator

接收 ContextBundle,启 Claude Code 执行:

```bash
# 第一轮第一任务: --session-id 开新 session
claude -p "$TASK_USER_MSG" \
  --bare \
  --session-id "$LOOP_SESSION_UUID" \
  --append-system-prompt-file "$CTX_PROMPT" \
  --tools "$CTX_TOOLS" \
  --plugin-dir "$CTX_SKILLS_DIR" \
  --mcp-config "$CTX_MCP_JSON" \
  --strict-mcp-config \
  --agents "$CTX_AGENTS_JSON" \
  --permission-mode plan \
  --add-dir "$WORKTREE" \
  --output-format stream-json --verbose

# 后续任务: --resume 同 session,但换 Context
claude -p "$NEXT_TASK_USER_MSG" \
  --bare \
  --resume "$LOOP_SESSION_UUID" \
  --append-system-prompt-file "$NEW_CTX_PROMPT" \
  --tools "$NEW_CTX_TOOLS" \
  ...
```

Orchestrator 负责:
- 决定主 / sub agent 启动顺序(简单 Loop = 单主 agent,复杂 = 主带多 subagent)
- 在 Phase 间切换 Context Bundle(workflow → 不重启 Claude Code,通过同 session-id)
- 监控 stream-json 事件(tool calls / completions)
- 把事件流路由给 Verification / Memory / UI

### Layer 5 · Worker Agent

实际执行的是 Claude Code(Iter 2);后续 Iter 7+ 扩展到 OpenCode / Kimi。Loop Cockpit 不实现 worker — 它**就是** Claude Code,Loop Cockpit 是 Claude Code 之上的"大脑外包"。

### Layer 6 · Tool Layer

详见 Layer 4 的 Claude Code flag。核心是 `--bare` 切断默认自动发现,然后白名单注入:
- Skills 走 `--plugin-dir <bundle>`(Loop Cockpit 把选定 skill 复制 / 软链接到临时 plugin)
- MCP 走 `--mcp-config foo.json --strict-mcp-config`
- 内建 tools 走 `--tools "Bash,Edit,Read,Glob,Grep"`
- Subagents 走 `--agents '{...}'`(JSON 内联,不污染磁盘)
- 文件边界 `--add-dir` + cwd 锁

### Layer 7 · Verification

Worker 执行结束后,Verification 决定下一步:

```typescript
interface VerificationDecision {
  taskCompleted: boolean;
  goalAchieved: boolean;
  shouldRetry: boolean;
  shouldEscalate: boolean;       // 升级 model(Sonnet → Opus)
  shouldHumanReview: boolean;
  shouldStop: boolean;           // 撞预算 / 灾难
  nextAction: 'next-task' | 'replan' | 'retry' | 'human' | 'terminal' | 'fail';
  reasoning: string;
}
```

Verification 是**多 evaluator 组合**(参考 Loop Engineering 研究 §9.2):
- `shell` exit code(默认,从 successCondition 跑命令)
- `llm-judge`(让 LLM 判)
- `regex` 匹配 stdout
- `human`(显式标注需人审)

### Layer 8 · Memory (State)

**Loop 状态不依赖 Claude 的聊天记录**(那是短期、易失、随 context 压缩丢失)。Loop Cockpit 维护**独立 State 文件**:

```yaml
# ~/.loop-cockpit/runs/<runId>/state.yaml
loopId: "bp_x"
runId: "r_K8xL2pQm9"
round: 3
goal:
  objective: "修复 Issue #123"
  successCondition: "..."
plan: [...]
completedTasks:
  - id: "t1"
    description: "复现 bug"
    completedAt: "..."
    output: { ... }
inProgressTask: { id: "t2", ... }
pendingTasks: [ ... ]
budget:
  tokensUsedUsd: 0.34
  roundsUsed: 3
  wallTimeMs: 124000
lastReflection: "..."
humanGates:
  - taskId: "t3"
    requestedAt: "..."
    status: "waiting"
```

每轮 Loop:
1. 读 state.yaml
2. 决策(用 Planner 等)
3. 执行 Worker
4. 写 state.yaml(append-only 也保留 history 在另一个文件)

Iter 5+ 加 SQLite FTS5 做跨 Loop Memory(经验复用)。

### 横切层 · Reflection / Retry

Worker 失败(Verification.shouldRetry=true)时,Reflection 调 LLM 反思:
- 什么地方失败?
- 是 Planner 方案不合理? 还是 Context 不够? 还是 Worker 能力不足?
- 应该改什么?

输出**改动建议**,Loop Cockpit 据此修改 plan / context / 升级 model / retry。Iter 3+ 实现。

### 横切层 · Human Gate(3 模式)

```typescript
interface HumanGate {
  triggerCondition: 'always' | 'when-needs-review' | 'on-failure' | 'on-budget-warning';
  mode: 'interrupt' | 'default-approve' | 'default-reject';
  notification: { feishu?: boolean; email?: boolean; ui?: boolean };
  timeoutMs?: number;            // 等多久没人响应
  timeoutAction: 'approve' | 'reject' | 'pause';
}
```

3 模式:

| Mode | 行为 |
|---|---|
| `interrupt` | 立即暂停 Loop,等用户响应(像 LangGraph `interrupt()`)。最安全,服务器部署易卡 |
| `default-approve` | 发通知,Loop 照跑;收到 "拒绝" 才中断。无人值守友好 |
| `default-reject` | 发通知,Loop 暂停;timeout 内未"批准"自动 reject。严格审批 |

用户在 Blueprint 配每个 Phase / Task 的 Human Gate 模式。

## 触发器分类(完整,补 Iter 路径)

详见 [`docs/architecture/triggers.md`](../triggers.md)(E6 待写)。

| 触发器 | Iter | 说明 |
|---|---|---|
| Manual(UI Run now) | 2 | 用户点按钮 |
| 一次性(at specific time) | 2 | "今晚 23:00 跑一次" |
| Cron | 2 | 周期定时 |
| Webhook(HTTP POST) | 3 | 外部系统调 `/triggers/:id` |
| Git push / PR / Issue / Comment | 3 | GitHub Webhook |
| CI/CD 完成 | 4 | 接 GitHub Actions / GitLab pipeline finished |
| Email 收到 | 4 | IMAP poll / Email Webhook |
| 消息(飞书 / Slack / Discord)| 4 | Bot 收到 @ 提及 |
| File Watch(目录变化) | 4 | fswatch / inotify |
| Boot(开机) | 5 | Host 启动时跑 |
| 其他 Loop 完成 | 5 | upstream-downstream 跨 Loop 链 |
| Goal-based(达成才停) | 5 | 不是触发,是终止条件类 |
| Schedule + Condition | 5+ | "每周一 9 点,如果当前 main 红就跑" |
| 外部 API webhook(Linear/Notion/Jira) | 6+ | 集成生态 |

## 实现路径(逐代逐层)

按维护者拍板"逐代逐层实现"。每代加 1-2 层 + 1 个横切。

| Iter | 加的层 | 状态 |
|---|---|---|
| **Iter 2 MVP** | L1 Goal + L5 Worker(Claude Code adapter)+ L7 Verification(shell-only)+ L8 Memory(state.yaml + SQLite runs)+ Trigger(Manual/Once/Cron) | 4 层 |
| **Iter 3** | +L2 Planner(单轮 LLM 出任务列表)+ Reflection(失败时反思)+ Trigger(Webhook / Git) | 6 层 |
| **Iter 4** | +L3 Context Builder(规则 mapping 版)+ L4 Orchestrator(主 + subagent 调度) | 8 层 |
| **Iter 5** | +Memory FTS5 跨 Loop 经验 + Verification 多 evaluator + Human Gate 3 模式 | 完整 8 层 + 横切 |
| **Iter 6** | Channel Hub + dogfooding(自己跑自己) | - |
| **Iter 7+** | 多 Agent 适配 + Artifact 跨 Loop + 1.0 发布 | - |

## 部署形态(澄清)

- **本地优先**:`npx loop-cockpit start` 起 Node Host,浏览器开 localhost
- **远端访问**:同一 Host 起在自己的服务器,通过 IP+port 访问 UI(non-goals §1 反对的是"云端 SaaS",**不反对** 自己 host 在自己的服务器)
- **多机访问**:可能多设备 IP 访问,但 user.config / token 都在该 Host 机器(单机数据归属不变)

## 替代方案 (Alternatives)

### 不上 8 层架构

- 拒绝:产品差异化不够,沦为 Cron + Claude Code 调度器

### 简化为 5-6 层

- 拒绝:Planner / Verification / Reflection 是 Reflexion 学术经典三件套,缺一不可
- Context Builder 是 Loop Cockpit 真正差异化(行业里没人显式做这一层)

### 用 LangGraph 作为底层

- 拒绝:LangGraph 是 framework,Loop Cockpit 是 product。让用户配 LangGraph state graph 太重
- 但**借鉴 LangGraph 的 interrupt + checkpointer 思想** —— 在 Layer 8 Memory 落地

## 后果 (Consequences)

**正面**:
- 产品差异化最强 — Loop Cockpit = "AI 自治指挥架构平台"
- 适用面最广 — 不局限编码,任何"目标 + 验证可量化"的工作流都能用
- 完全契合 Claude Code 2.1 能力 — 不重造轮子
- 用户认知模型清晰 — 8 层每层对应一个配置面板
- 学术 + 工业双重背书(Reflexion / LangGraph / Anthropic / OpenAI Agents SDK)

**负面**:
- **复杂度极高**:8 层 + 2 横切 = 10 个产品概念,用户学习曲线陡
- **简单 Loop 也要走 8 层**:邮件分析这种小事被牛刀杀鸡
- Iter 2 MVP 从 14 天 → 估约 4-6 周
- UI / Schema / Run 状态机都要大改
- 简单模式 UI 必须有,否则用户被吓跑

**中性 / 待观察**:
- 简单 Loop 模板预设(开箱即用)是关键 — 5-10 个常见场景模板
- 是否需要 GUI 流程图编辑器(Iter 5+,看用户反馈)
- Memory 跨 Loop 经验复用的实际价值(Iter 5+ 评)

## 关联 ADR / PRD

- [ADR-0001](./0001-tech-stack.md) — TS / Fastify / SQLite / Drizzle 不变
- [ADR-0002](./0002-node-pty.md) — PTY 仍是底层桥梁,只是命令更复杂
- [ADR-0003](./0003-sqlite-drizzle.md) — Memory FTS5 / state.yaml 双轨
- [ADR-0009](./0009-phase-orchestration.md) — Phase 模型作为本架构 L4 Orchestrator 的实现细节(保留)
- 影响 [product-overview](../product-overview.md) — 8 层抽象重写(E2)
- 影响 [F002 PRD](../../prd/F002-blueprint-editor.md) — Blueprint 字段对应 8 层(E5)
- 新写 [F006 Planner](../../prd/F006-planner.md) — Iter 3
- 新写 [F007 Context Builder](../../prd/F007-context-builder.md) — Iter 4
- 新写 [F008 Verification](../../prd/F008-verification.md) — Iter 3
- 新写 [F009 Memory](../../prd/F009-memory.md) — Iter 5
- 新写 [F010 Human Gate](../../prd/F010-human-gate.md) — Iter 5
- 新写 [F011 Reflection](../../prd/F011-reflection.md) — Iter 3

## 引用

- [Loop Engineering 研究报告](../../../notes/2026-06-28-loop-engineering-research.md)
- [Reflexion (arXiv 2303.11366)](https://arxiv.org/abs/2303.11366) — Actor / Evaluator / Self-Reflection
- [Self-Refine (arXiv 2303.17651)](https://arxiv.org/abs/2303.17651)
- [Anthropic Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [LangChain Context Engineering](https://www.langchain.com/blog/context-engineering-for-agents) — Write/Select/Compress/Isolate

## FAQ: Skills/MCP/Subagent 加载机制

### 怎么加载给 Agent？让它去读？

**不是让 Agent 去读用户目录，而是 Loop Cockpit 在保存 Blueprint 时预加载到隔离环境：**

| 资源 | 加载方式 | 是否受 projectPath 限制 |
|---|---|---|
| **Skills** | 保存时复制/软链接到 `~/.loop-cockpit/loops/<id>/skills-bundle/`，通过 `--plugin-dir` 注入 | 不受限（Skill 文件独立于项目） |
| **MCP** | 生成 `mcp.json` 配置文件，通过 `--mcp-config --strict-mcp-config` 注入 | **不受限**（MCP server 是独立进程，有自己的文件系统权限） |
| **Subagents** | 通过 `--agents '{...}'` 内联 JSON 注入，不碰文件系统 | N/A |
| **Tools** | 通过 `--tools` 白名单控制（Bash/Read/Edit/Write 等） | 编辑/删除受限，读取允许 |

### 读取可以吗？只是不能编辑？

**是的。** Read tool + Bash 读文件是允许的（Agent 需要读取上下文来工作）。但 Edit/Write/Delete 操作受三重约束：
1. `--add-dir <projectPath>` — Claude Code 原生文件边界
2. `cwd` 锁 — Worker spawn 时固定工作目录
3. Claude Code permission rule — 如 `Write(!package.json)` 精确控制

### Token 会不会太多？

Skills 文件本身很小（通常 < 1KB），MCP server 的 schema 也是 JSON 描述（< 5KB）。Loop Cockpit 只在 Blueprint 保存时做一次复制/生成，不实时读取。Agent 看到的是一份精简的 context bundle，不是整个文件系统。

## FAQ: 危险命令如何确保真不会操作？

**三层防护：**

| 层 | 机制 | 说明 |
|---|---|---|
| 1. Claude Code permission rule | `customRules` 字段 | 如 `Bash(rm:*)`, `Write(/etc/*)` — Claude Code 原生拦截，在执行前拒绝 |
| 2. Orchestrator 中间层 | 解析 `stream-json` 输出 | 检测到 tool call 匹配 deny 规则时，直接拒绝执行，不调用 Claude Code |
| 3. Shell wrapper | spawn 时注入 alias | 如 `alias rm='echo DENIED'` 作为二次兜底 |

原型 UI 中展示三层配置入口，实际实施时第 2 层（Orchestrator 中间层）是核心。
- [LangGraph interrupt + Command(resume)](https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/)
- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference) — `--session-id` / `--bare` / `--plugin-dir` 等
- [Anthropic Multi-Agent Research](https://www.anthropic.com/engineering/multi-agent-research-system)
- [OpenHermit](https://github.com/HCF-STUDIOS/openhermit) — internal/external state 分离设计

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v1.0 | ★ **Accepted** · 首版,基于维护者"AI 自治指挥架构"产品定位 + Loop Engineering 研究 + Claude Code 2.1 调研。继承并扩展 ADR-0009 |
