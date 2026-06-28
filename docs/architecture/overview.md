# 架构总览 (Architecture Overview)

> **工程师视角的"机器怎么造"** — 系统分层、模块边界、持久化、技术栈。
> 产品视角的"Loop 是什么/怎么用" → [`loop-anatomy.md`](./loop-anatomy.md)。
> 详细决策见 [`decisions/`](./decisions/),功能 PRD 见 [`../prd/`](../prd/)。

---

## 1. 系统分层

```
┌──────────────────────────────────────────────────────────┐
│  UI 层 · 浏览器 SPA(可通过 IP+端口访问,但不是 SaaS)    │
│  Vite + React + Xterm.js + Tailwind + WebSocket          │
├──────────────────────────────────────────────────────────┤
│  控制层 · Host (Node.js LTS,本地运行 / 私服)            │
│  Fastify (HTTP/WS API)                                   │
│  Drizzle ORM + better-sqlite3 (持久化)                   │
│  Agenda (调度 / 队列,SQLite driver)                      │
│  ─── Loop 引擎(8 层架构编排器,ADR-0010) ────           │
│  • Goal validator        • Planner runner                │
│  • Context Builder       • Orchestrator                  │
│  • Verification runner   • Memory store                  │
│  • Reflection runner     • Human Gate dispatcher         │
├──────────────────────────────────────────────────────────┤
│  执行层 · Agent 适配                                       │
│  AgentAdapter (统一接口)                                  │
│  PtyHarness (node-pty + 自动应答 FSM)                     │
│  Claude Code 2.1+ / OpenCode / Kimi / Codex (Iter 7+)    │
├──────────────────────────────────────────────────────────┤
│  隔离 / 存储层                                             │
│  Git Worktree (~/.loop-cockpit/workspaces/<runId>)       │
│  SQLite (~/.loop-cockpit/data.db, WAL mode)              │
│  Run 文件 (~/.loop-cockpit/runs/<runId>/) {              │
│    raw.log · state.yaml · audit-trail.json               │
│  }                                                        │
│  临时 Plugin Bundle (~/.loop-cockpit/loops/<id>/skills-bundle/) │
└──────────────────────────────────────────────────────────┘
```

每一层只依赖**下一层**和**横切关注点**(日志/配置/事件总线),禁止跨层穿透。

**8 层架构(ADR-0010)在控制层实现**,通过编排 Claude Code 子进程完成。Loop Cockpit 自己**不实现 LLM 调用**,只编排。

---

## 2. 核心抽象

### 2.1 数据抽象层级

```
Blueprint(静态配置,8 层规则)
    │
    │ Trigger 触发(Manual/Cron/Webhook/...)
    │ 产生 TriggerEvent
    ▼
Run(一次执行实例,绑定 worktree + session-id)
    │ 主键 nanoid (r_xxx)
    │ 多轮自治推进
    ▼
Round(一轮 Loop 推进,可能含多任务)
    │
    ▼
Task(Agent 完成的最小工作单元,Planner 拆分)
    │
    │ 通过 Claude Code session 共享上下文
    ▼
Tool Call(Agent 调一次工具的最小事件)
```

详细字段定义见 [`glossary.md`](./glossary.md);完整 Loop 数据流见 [`loop-anatomy.md`](./loop-anatomy.md)。

### 2.2 AgentAdapter 接口

```typescript
interface AgentAdapter {
  readonly id: string;
  readonly supportedModels: string[];
  start(ctx: RunContext): Promise<AgentProcess>;
  parseExitCode(output: string): number | null;
  estimateTokens(output: string): { input: number; output: number; costUsd: number };
}

interface AgentProcess {
  pid: number;
  onData(cb: (chunk: string) => void): void;
  onExit(cb: (result: { exitCode: number; signal?: string }) => void): void;
  write(input: string): void;
  kill(signal?: 'SIGTERM' | 'SIGKILL'): Promise<void>;
}

interface RunContext {
  runId: string;
  sessionId: string;       // 跨 Loop 共享的 Claude --session-id UUID
  isFirst: boolean;        // true → --session-id, false → --resume
  systemPrompt: string;
  cwd: string;             // = blueprint.projectPath
  toolsAllowed: string[];  // ["Bash", "Read", ...]
  skillsPluginDir: string; // Loop Cockpit 临时生成的 plugin
  mcpConfigPath: string;
  agentsJson?: string;
  permissionMode: 'plan' | 'acceptEdits' | 'bypassPermissions' | 'interactive';
  timeoutMs: number;
  effort?: 'low' | 'medium' | 'high';
  env?: Record<string, string>;
}
```

实现优先级:Claude Code 2.1+ (P0/Iter 2) → OpenCode/Kimi (P1/Iter 7+) → Codex/其他 (P2)。

### 2.3 TriggerSource 接口

```typescript
interface TriggerSource {
  readonly type: string;
  start(emit: (event: TriggerEvent) => void): Promise<void>;
  stop(): Promise<void>;
}
```

**事件总线设计**:从第一天就按事件总线,避免后期改核心。Iter 2 = Manual / Once / Cron,Iter 3+ 按 [`triggers.md`](./triggers.md) 扩展。

---

## 3. 模块边界

> Iter 2 开始建 `apps/host/`,模块说明 README 与代码同居,不进 docs。
> docs/ 只描述**模块边界与契约**,不写实施细节。

```
apps/host/src/
├── pty/              ← PtyHarness (node-pty + 自动应答 FSM)
├── adapter/          ← AgentAdapter 接口 + Claude Code 实现
├── blueprint/        ← Blueprint CRUD + zod 校验 + Goal 解析
├── runner/           ← Run 状态机 + 生命周期编排
├── trigger/          ← TriggerSource + Dispatcher
├── db/               ← Drizzle schema + migration
├── audit/            ← audit-trail.json 落盘
├── api/              ← Fastify 路由 + WebSocket
│
│   ─── ADR-0010 八层架构模块(逐 Iter 加) ───
│
├── goal/             ← Iter 2: Goal validator + successCondition runner
├── planner/          ← Iter 3: Planner runner (LLM 出任务列表)
├── reflection/       ← Iter 3: 失败反思 + 改方案
├── context-builder/  ← Iter 4: 按需挑 Memory/Skill/Tool 注入
├── orchestrator/     ← Iter 4: 主/sub agent 调度
├── verification/     ← Iter 2 (shell only) / Iter 5 (多 evaluator)
├── memory/           ← Iter 2 (state.yaml) / Iter 5 (FTS5 跨 Loop)
├── human-gate/       ← Iter 5: 3 模式 + 通知集成
└── channel/          ← Iter 6: 飞书/Slack/Email 通知

apps/web/src/         ← Vite + React + Tailwind (Iter 2 起)
├── pages/blueprints/ ← Blueprint 编辑器 (8 层 UI)
├── pages/runs/       ← Run 详情屏(Xterm + 8 层进度)
├── pages/dashboard/  ← Dashboard 总览
└── components/       ← 共享 UI 组件
```

跨模块通信优先**事件总线 / 函数式接口**,避免循环依赖。

---

## 4. 持久化策略

### 4.1 三轨数据(ADR-0003 Q6 + ADR-0010 Memory)

```
                ┌─── 元数据 + 关键报错片段 + 文件指针 ──→ SQLite (data.db, WAL)
PTY raw buffer  │                                         ↑ 索引/查询/Memory FTS5
   + Loop state ┼─── 完整原始 ANSI 流 ──────────────────→ runs/<runId>/raw.log
                │                                         ↑ Run 详情页回放
                │
                ├─── Loop 业务 State ─────────────────────→ runs/<runId>/state.yaml
                │   (任务列表/已完成/待办/round/budget)    ↑ AI 自治每轮读写
                │
                └─── 完整审计快照 ───────────────────────→ runs/<runId>/audit-trail.json
                    (Run 终态时一次性写)                   ↑ 离线分析、可重放
```

- **DB**(SQLite WAL):唯一可查询真相(runs.id / status / token_cost / ...)
- **state.yaml**:Loop 自治每轮读写,**不依赖聊天记录**
- **raw.log**:Xterm 回放
- **audit-trail.json**:终态快照,完整决策路径

### 4.2 Worktree 沙箱(Iter 3)

- 路径:`~/.loop-cockpit/workspaces/<runId>/` 与 raw.log 同侧
- 每 Run 独占 worktree,失败时保留现场
- 文件读写边界 = worktree + `--add-dir` 加白

### 4.3 临时 Plugin Bundle(Iter 2 起)

```
~/.loop-cockpit/loops/<blueprintId>/
├── skills-bundle/        ← 复制选定 skills,Claude Code 通过 --plugin-dir 加载
│   ├── plugin.json
│   └── skills/
│       ├── selected-skill-1/SKILL.md
│       └── selected-skill-2/SKILL.md
├── mcp.json              ← --mcp-config 注入
├── agents.json           ← --agents 注入(subagent 定义)
└── settings.json         ← --settings 注入(skillOverrides 等)
```

> **关键**:用户选定的 skill 不污染 `~/.claude/skills/`。Loop Cockpit 通过 `--bare + --plugin-dir <bundle>` 让 Claude Code **只看到选定的 skill**。

---

## 5. 关键已验证项

| 项 | 状态 | 证据 |
|---|---|---|
| node-pty 在 macOS x86_64 拉起 claude + 收发 prompt | ✅ Iter 1 验证 | [F001 PRD](../prd/F001-pty-runner.md) / spike/pty/ |
| pnpm 11 build script 放行机制 | ✅ 已解 | `pnpm-workspace.yaml` `allowBuilds` |
| node-pty spawn-helper 权限问题 | ✅ 已解(对策已记录) | [ADR-0002](./decisions/0002-node-pty.md) |
| 技术栈选型(TS / Node 20 / pnpm / Fastify / Drizzle / Vite + React) | ✅ Accepted | [ADR-0001](./decisions/0001-tech-stack.md) |
| 数据层(SQLite + Drizzle + WAL + drizzle-kit migration) | ✅ Accepted | [ADR-0003](./decisions/0003-sqlite-drizzle.md) |
| 数据双轨/三轨(DB / state.yaml / raw.log) | ✅ Accepted | ADR-0003 Q6 + ADR-0010 §Memory |
| **Loop 阶段编排架构** | ✅ Accepted | [ADR-0009](./decisions/0009-phase-orchestration.md) |
| **★ AI 自治 8 层架构** | ✅ Accepted | [ADR-0010](./decisions/0010-autonomous-loop-architecture.md) |
| Claude Code 2.1+ 官方 flag 控制能力(--bare / --session-id / --resume / --plugin-dir / --mcp-config / --agents / --tools / --add-dir / --permission-mode) | ✅ 调研确认 | claude-code-guide skill 调研结果 |

---

## 6. 待验证项(随 Iter 推进)

- node-pty 在 Linux / Windows 的稳定性(Iter 2)
- ANSI 流转发到 Xterm 是否需 buffer 中转层(Iter 2)
- Claude Code 的 `--non-interactive` 是否覆盖大部分 `[y/N]` 场景(Iter 2)
- Agenda + SQLite 适配在多 Run 并行下的吞吐(Iter 3)
- SQLite WAL 单写多读在 10 Run/s 量级是否成瓶颈(Iter 3+)
- **8 层架构的 Planner / Verification / Reflection 各自的 token 开销实测**(Iter 3+)
- **Context Builder 按需注入对 Worker 准确率的实际影响**(Iter 4)
- Cognition 警告的"writes 单线程"在 Loop Cockpit 实践中是否成立(Iter 7+)

---

## 7. 引用

- [product-overview.md](./product-overview.md) — 产品定位 + 全功能总览
- [loop-anatomy.md](./loop-anatomy.md) — Loop 完整解剖(8 层数据流)
- [decisions/](./decisions/) — 所有 ADR
- [triggers.md](./triggers.md) — 全部触发器规划
- [non-goals.md](./non-goals.md) — 绝不做的事
- [glossary.md](./glossary.md) — 术语
- [../roadmap.md](../roadmap.md) — Iter 时间线

---

## 8. 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-24 | v0.0 | 占位 |
| 2026-06-27 | v0.1 | 写实:分层图、核心抽象、模块边界、已验证/待验证项 |
| 2026-06-28 | v0.2 | 加入数据双轨策略(ADR-0003 Q6);ADR-0001/0003 Accepted |
| 2026-06-28 | **v1.0** | ★ 系统分层图加 8 层架构(Goal/Planner/.../Memory)模块;模块边界 src/ 加 8 个新目录;持久化升级为三轨(DB + state.yaml + raw.log + audit-trail);加临时 Plugin Bundle 章节;关键已验证项加 ADR-0009/0010 + Claude Code 2.1 调研 |
