---
id: 0009
title: Loop 阶段编排架构(Phase Orchestration)
status: Accepted
date: 2026-06-28
deciders: "@oh-summy"
---

# ADR-0009 · Loop 阶段编排架构

## 上下文 (Context)

Iter 1 初版 Loop 模型是"目标驱动黑盒":Blueprint = (Goal + Done Criteria + Agent + Retry) → Run 执行 → 评估 → retry/success。

维护者 2026-06-28 提出根本性升级方向:
- Loop 内部应该**分阶段**(如 分析 / 计划 / 开发 / 测试 / 通知)
- 每个阶段应该可**独立配置**(skill / tools / MCP / 文件权限)
- 不同 Loop 应该可**自定义阶段顺序与组合**
- 阶段间应支持**分支条件**("分析结果 ABC 走不同后续")
- 阶段间应**会话连贯**(同一 session 上下文)

2026-06-28 Claude Code 调研结果:**Claude Code 2.1.x 已经完整支持这套需求**(`--session-id`/`--resume`/`--bare`/`--plugin-dir`/`--mcp-config`/`--agents`/`--tools`/`--add-dir`)。技术路径清晰。

加上 Loop Engineering 研究报告([notes/2026-06-28-loop-engineering-research.md](../../../notes/2026-06-28-loop-engineering-research.md))显示:
- **学术共识**(Reflexion / Self-Refine / ReAct 等):Actor → Evaluator → Critic → Memory 是 Loop 标配
- **Osmani 五件套**:Automations / Worktrees / Skills / Plugins / Sub-agents + State
- **GPT Researcher / CrewAI 等**:多阶段 / DAG 编排已是工业事实

不上 Phase = Loop Cockpit 仅是"另一个 Cron + Agent 工具"。

## 决策 (Decision)

**Loop Cockpit Iter 2 起,Loop = Phase 有向图,每个 Phase 独立配置。**

### 1. 核心抽象

```typescript
// Loop 由 N 个 Phase 组成,默认线性,可分支
interface Blueprint {
  // 已有字段:id, name, goal, projectPath, retryPolicy, triggers, type ...

  phases: Phase[];   // ★ 新增
  startPhaseId: string;
}

interface Phase {
  id: string;                        // "phase_analyze" / "phase_dev"
  name: string;                      // "分析阶段"
  order: number;                     // 默认顺序号,1/2/3...

  // 输入配置
  systemPromptTemplate?: string;     // 该阶段独有的 system prompt
  appendUserMessage?: string;        // 可选,在阶段开始时发送给 Claude 的固定 user 消息

  // 能力配置
  agent: 'claude-code';              // Iter 2 仅 claude
  model?: string;                    // 阶段可覆盖,默认沿用 Blueprint.model
  effort?: 'low' | 'medium' | 'high'; // claude --effort
  skills: string[];                  // 该阶段加载的 skill names(从用户级/项目级中选)
  tools: string[];                   // 内建工具白名单
  mcpServers: MCPRef[];              // MCP 服务器
  subagents?: SubagentRef[];         // 该阶段可用的 subagents

  // 权限/边界
  permissionMode: 'bypassPermissions' | 'acceptEdits' | 'plan' | 'interactive';
  allowedDirs: string[];             // 文件读写边界,默认 [projectPath]
  disallowedTools?: string[];        // 黑名单(如 'Bash(rm *)' / 'mcp__*')

  // 评估器
  evaluator: PhaseEvaluator;

  // 分支
  branches: Branch[];                // 评估后下一阶段

  // 兜底
  maxTurns?: number;
  maxBudgetUsd?: number;
}

type PhaseEvaluator =
  | { type: 'shell', command: string }       // exit 0 = pass
  | { type: 'llm-judge', prompt: string }    // 让 LLM 给结果分类
  | { type: 'regex', pattern: string }       // stdout 匹配
  | { type: 'none' };                        // 该阶段直接通过(只跑,不评)

type Branch =
  | { if: string, nextPhase: string }        // 分类结果(LLM judge)/ regex 匹配 / shell 成功(true)
  | { default: string };                     // 否则去这

// 内置终止标识
const TERMINAL = '__terminal__';             // 整个 Loop 结束
const FAIL = '__fail__';                     // 失败终态
const NOTIFY = '__notify__';                 // 通知后结束
```

### 2. 阶段执行模型

**核心:整个 Loop 共享一个 Claude Code session,各阶段独立 spawn 但共享 session-id。**

```bash
# Loop Cockpit 启动 Loop 时,生成一个 UUID
LOOP_SESSION=$(uuidgen)

# 阶段 1 (首次,用 --session-id)
claude -p "$PHASE1_USER_MSG" \
  --bare \                                          # 切断默认 skill/MCP 自动发现
  --session-id "$LOOP_SESSION" \
  --append-system-prompt-file "$LOOP_DIR/phase1.md" \
  --tools "Read,Glob,Grep" \                        # 分析阶段:只读
  --plugin-dir "$LOOP_DIR/phase1-skills/" \         # 只加载该阶段勾选的 skills
  --mcp-config "$LOOP_DIR/phase1-mcp.json" \
  --strict-mcp-config \
  --agents "$(cat $LOOP_DIR/phase1-agents.json)" \
  --permission-mode plan \                          # 分析阶段:plan only
  --add-dir "$PROJECT_PATH" \
  --output-format stream-json --verbose

# 阶段 2 (用 --resume,会话续上)
claude -p "$PHASE2_USER_MSG" \
  --bare \
  --resume "$LOOP_SESSION" \
  --append-system-prompt-file "$LOOP_DIR/phase2.md" \
  --tools "Bash,Edit,Read,Write,Glob,Grep" \        # 开发阶段:全开
  --permission-mode acceptEdits \
  --dangerously-skip-permissions \
  ...
```

**关键 flag 速记**(详见 [研究报告 §1.1-1.6](../../../notes/2026-06-28-loop-engineering-research.md)):

| Flag | 作用 |
|---|---|
| `--bare` | 切断默认 skill/MCP/CLAUDE.md/hooks 自动发现 |
| `--session-id <UUID>` | 第一阶段:开新 session |
| `--resume <UUID>` | 后续阶段:恢复同 session,上下文连贯 |
| `--plugin-dir <bundle>` | 注入阶段勾选的 skills(打包成 plugin) |
| `--mcp-config foo.json --strict-mcp-config` | 注入阶段勾选的 MCP |
| `--tools "Bash,Edit"` | 内建工具白名单(MCP 不受影响) |
| `--agents '{...}'` | 注入阶段勾选的 subagents |
| `--add-dir <path>` | 扩展文件可访问目录 |
| `--permission-mode plan/acceptEdits/bypassPermissions` | 权限模式 |
| `--dangerously-skip-permissions` | 无人值守必开,危险阶段关 |
| `--effort low/medium/high` | 思考深度 |
| `--max-turns N --max-budget-usd N` | 兜底 |

### 3. 阶段编排示例

**(A) 简单 Loop:仅分析**
```
phases:
  - id: analyze
    skills: [code-review, brainstorming]
    evaluator: { type: 'none' }
    branches: [{ default: '__terminal__' }]
startPhase: analyze
```

**(B) Bug 修复 Loop**
```
phases:
  - id: analyze
    permissionMode: plan
    tools: [Read, Glob, Grep]
    evaluator: { type: 'llm-judge', prompt: '难度: trivial/moderate/complex' }
    branches:
      - if: 'trivial' → direct-fix
      - if: 'moderate' → plan-then-fix
      - if: 'complex' → '__terminal__'  # 太复杂,通知用户

  - id: direct-fix
    tools: [Bash, Edit, Read, Write]
    permissionMode: acceptEdits
    evaluator: { type: 'shell', command: 'pnpm test' }
    branches:
      - if: 'pass' → test
      - default: '__fail__'

  - id: plan-then-fix
    skills: [writing-plans, executing-plans]
    tools: [Bash, Edit, Read, Write]
    permissionMode: acceptEdits
    evaluator: { type: 'shell', command: 'pnpm test' }
    branches: [{ default: 'test' }]

  - id: test
    tools: [Bash, Read]
    permissionMode: plan
    evaluator: { type: 'shell', command: 'pnpm test && pnpm lint && pnpm build' }
    branches:
      - if: 'pass' → '__terminal__'
      - default: '__fail__'

startPhase: analyze
```

**(C) 仅通知 Loop**(Channel 输出)
```
phases:
  - id: collect
    skills: [github-summary]
    tools: [Read, Bash]
    evaluator: { type: 'none' }
    branches: [{ default: 'notify' }]

  - id: notify
    tools: []  # 只让 agent 输出文本
    skills: [feishu-card-format]
    evaluator: { type: 'none' }
    # 由 Loop Cockpit 抓取 stdout 发飞书,不依赖 agent 自己发
    branches: [{ default: '__terminal__' }]
```

### 4. 持久化

新增 SQLite 表:

```typescript
// phases 字段 = JSON,直接存在 blueprints 表
blueprints {
  ...
  phases: JSON       // Phase[]
  startPhaseId: TEXT
}

// 每个 Run 记录当前阶段进度
runs {
  ...
  current_phase_id: TEXT       // 当前在哪个 Phase
  phase_history: JSON          // PhaseExecution[],记录走过的每个阶段
}

interface PhaseExecution {
  phaseId: string;
  startedAt: timestamp;
  endedAt?: timestamp;
  status: 'running' | 'evaluating' | 'passed' | 'failed' | 'skipped';
  evaluatorResult?: any;       // LLM judge 给的分类 / shell exit code / regex match
  branchTaken?: string;        // 走了哪个分支
  toolCallCount: number;
  tokensIn: number;
  tokensOut: number;
}
```

### 5. 权限模型

文件权限通过多层保护:

1. **cwd 锁定**:Claude Code spawn 时 `cwd = projectPath`
2. **`--add-dir`**:仅 Phase.allowedDirs 显式扩展的目录可访问
3. **`disallowedTools`**:配 `Bash(rm *)` / `Bash(curl *)` 等危险命令规则
4. **OS 层未实现**:Iter 2 不上 Seatbelt/容器,产品标注"软隔离"
5. **dangerously-skip-permissions**:默认开,UI 提供"敏感阶段单独关"开关

## 替代方案 (Alternatives)

### 不引入 Phase

- **方案 A · 维持目标驱动黑盒** — 简单但 Loop Cockpit 无差异化,变成"Cron + Claude Code 调度器"
  - 拒绝原因:维护者明确要差异化,且 Loop Engineering 研究 8 个缺口指向"阶段编排"

### 不同的 Phase 编排范式

- **方案 B · DAG 编排(CrewAI 风)** — 用 `task.context` 表达依赖,Phase 可并行
  - 拒绝原因:对独立开发者用户过于复杂;Iter 2 先线性 + 分支,Iter 3+ 再考虑并行
- **方案 C · LangGraph StateGraph + Interrupt** — 节点级中断与 resume
  - 拒绝原因:Claude Code 已有 `--session-id` + `--resume`,不重复造轮子。LangGraph 是抽象层,Loop Cockpit 是产品层,不要把 LangGraph 暴露给用户
- **方案 D · 隐式(让 agent 在 system prompt 里读 phases 描述)** — 不显式编排,只在 prompt 里说"按这几步走"
  - 拒绝原因:Iter 1 已有教训(目标驱动黑盒),agent 自由发挥不可控、不可审计

### 阶段间 session 模型

- **方案 E · 每阶段独立 session(无连贯)** — 每个 Phase 全新 `claude -p`,通过 Artifact / Memory 间接传上下文
  - 拒绝原因:违反"Loop 是闭环"语义;每阶段重新读 CLAUDE.md/context 浪费 token
- **方案 F · 单进程 stream-json 双工** — 同一 `claude` 进程连续喂多轮
  - 拒绝原因:进程崩溃全丢;阶段间换 system prompt/tools 不灵活
- **方案 G · 同 session-id 多 spawn(选定)** — 每阶段独立进程 + 共享 session
  - 选定原因:Claude Code 官方支持;阶段间可换 system prompt/tools/effort;崩溃可恢复

## 后果 (Consequences)

**正面**:
- 产品差异化最强 — Loop Cockpit = "可视化阶段编排"
- 阶段独立配置 = 安全(分析阶段只读)+ 经济(简单阶段用 haiku)
- 阶段可审计 — 每阶段记录 evaluator 结果 / 走了哪个分支
- 阶段可复用 — 用户保存"Bug 修复 5 阶段模板"
- 完整契合 Claude Code 2.1 能力,不 hack

**负面**:
- **复杂度大幅增加**:UI / Schema / Run 状态机 / Audit 都要改
- Iter 2 工作量从 14 天 → 估约 4-6 周(原 MVP 没有 Phase)
- 用户学习曲线变陡(从填表 → 编排有向图)
- Iter 2 起的 Blueprint 编辑器必须有"简单模式"(只一个阶段)兜底
- 分支条件评估的 LLM-judge 引入额外 token 消耗(每阶段评估都要花一次)

**中性 / 待观察**:
- 是否需要 GUI 流程图编辑器(像 n8n / Zapier 那种)— Iter 2 用列表 + 拖拽,Iter 3+ 看用户反馈
- 阶段并行(reads-only multi-subagent)留 Iter 3+
- Cognition 警告:writes 单线程(默认)

## 关联 ADR / PRD

- [ADR-0001](./0001-tech-stack.md) — TS / Fastify / SQLite / Drizzle 不变
- [ADR-0002](./0002-node-pty.md) — PTY 仍是 spawn claude 的桥梁,只是命令更复杂
- [ADR-0003](./0003-sqlite-drizzle.md) Q6 双轨数据 — phases JSON 落 DB,raw stdout 落文件不变
- 影响 [F002](../../prd/F002-blueprint-editor.md) 全部重写 §6 数据契约 + UI
- 影响 [F003](../../prd/F003-run-state-machine.md) 加阶段子状态机
- 影响 [F004](../../prd/F004-claude-adapter.md) 加 `--session-id`/`--resume`/`--bare` 等 flag 实现
- 影响 [F005](../../prd/F005-audit-trail.md) audit-trail.json 加 phase_history

## 引用

- [Loop Engineering 研究报告](../../../notes/2026-06-28-loop-engineering-research.md)
- [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference) — `--session-id` / `--resume` / `--bare` / `--plugin-dir` / `--mcp-config` / `--agents` / `--tools` / `--add-dir` / `--permission-mode` 等
- [Claude Code Headless mode](https://code.claude.com/docs/en/headless)
- [Claude Code Skills docs](https://code.claude.com/docs/en/skills)
- LangGraph conditional edges / CrewAI task.context / GPT Researcher 7-agent pipeline 作为参考,但 Loop Cockpit 不直接借鉴它们的 API,而是用 Claude Code 官方 flag 落地

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v1.0 | **Accepted** · 首版,基于 Claude Code 2.1 能力调研 + Loop Engineering 研究 |
