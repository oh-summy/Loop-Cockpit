# 架构总览 (Architecture Overview)

> 系统分层、核心抽象、模块边界。详细决策见 [`decisions/`](./decisions/),功能 PRD 见 [`../prd/`](../prd/)。

---

## 1. 系统分层

```
┌────────────────────────────────────────────────────┐
│  UI 层 · 浏览器 SPA                                  │
│  Vite + React + Xterm.js + WebSocket               │
├────────────────────────────────────────────────────┤
│  控制层 · Host (Node.js LTS)                        │
│  Fastify (HTTP)                                    │
│  Agenda (调度/队列, SQLite driver)                   │
│  Drizzle ORM + better-sqlite3 (持久化)              │
├────────────────────────────────────────────────────┤
│  执行层 · Agent 适配                                  │
│  AgentAdapter (统一接口)                            │
│  PtyHarness (node-pty + 自动应答 FSM)               │
│  Claude Code / OpenCode / Kimi / Codex / Trae      │
├────────────────────────────────────────────────────┤
│  隔离/存储层                                          │
│  Git Worktree (~/.loop-cockpit/workspaces/<runId>) │
│  SQLite (~/.loop-cockpit/data.db, WAL mode)        │
│  Artifact FS (~/.loop-cockpit/artifacts/<runId>)   │
└────────────────────────────────────────────────────┘
```

每一层只依赖**下一层**和**横切关注点**(日志/配置/事件总线),禁止跨层穿透。

## 2. 核心抽象 (Iter 1-2 范围)

### 2.1 Blueprint → Run → Task

```
Blueprint (静态配置)
    │
    │ Trigger 触发(Cron/Manual/Webhook/...)
    ▼
Run (一次执行实例,绑定 worktree,产出 audit-trail)
    │
    │ 包含 1 至 N 个
    ▼
Task (Agent 完成的最小工作单元)
```

详细字段定义见 [glossary.md](./glossary.md),CRUD/API 契约见 [product-overview.md §6 A/B/C](./product-overview.md)。

### 2.2 AgentAdapter 接口

```typescript
interface AgentAdapter {
  readonly id: string;
  readonly supportedModels: string[];
  start(ctx: RunContext): Promise<AgentProcess>;
  parseExitCode(output: string): number | null;
  estimateTokens(output: string): number;
}

interface AgentProcess {
  pty: IPty;                       // node-pty handle
  onData(cb: (chunk: string) => void): void;
  onExit(cb: (code: number) => void): void;
  write(input: string): void;
  kill(): Promise<void>;
}
```

具体实现优先级:Claude Code (P0/Iter 1-2) → OpenCode/Kimi (P1/Iter 3) → Codex/其他 (P2/Iter 4+)。

### 2.3 Trigger Source 接口(Iter 1 设计,Iter 4 完善)

```typescript
interface TriggerSource {
  readonly type: string;
  start(emit: (event: TriggerEvent) => void): Promise<void>;
  stop(): Promise<void>;
}
```

**关键决策**:从第一天就按事件总线设计,避免后期改核心。Iter 2 只实现 Cron + Manual,Iter 4 接入 Webhook / Goal-based / GitHub。

## 3. 模块边界(Iter 2 起的代码组织)

> Iter 2 开始建 `apps/host/`,模块说明 README 与代码同居,不进 docs。
> docs/ 只描述**模块边界与契约**,不写实施细节。

```
apps/host/src/
├── pty/        ← PtyHarness (node-pty + 自动应答 FSM)
├── adapter/    ← AgentAdapter 接口 + Claude Code 实现
├── runner/     ← Run 状态机 + 生命周期编排
├── blueprint/  ← Blueprint CRUD + zod 校验
├── trigger/    ← TriggerSource 接口 + Cron/Manual + Dispatcher
├── db/         ← Drizzle schema + migration
├── audit/      ← audit-trail.json 落盘
└── api/        ← Fastify 路由 + WebSocket

apps/web/src/   ← Vite + React, Iter 2 起
```

跨模块通信优先**事件总线 / 函数式接口**,避免循环依赖。

## 4. 关键已验证项

| 项 | 状态 | 证据 |
|---|---|---|
| node-pty 在 macOS x86_64 拉起 claude + 收发 prompt | ✅ Iter 1 验证 | [F001 PRD](../prd/F001-pty-runner.md) / spike/pty/ |
| pnpm 11 build script 放行机制 | ✅ 已解 | `pnpm-workspace.yaml` `allowBuilds` |
| node-pty spawn-helper 权限问题 | ⚠️ 已知坑 + 对策 | ADR-0002(待写) |

## 5. 待验证项(随 Iter 推进)

- node-pty 在 Linux / Windows 的稳定性(Iter 2)
- ANSI 流转发到 Xterm 是否需 buffer 中转层(Iter 2)
- Claude Code 的 `--non-interactive` 是否覆盖大部分 `[y/N]` 场景(Iter 2,影响 Issue #2)
- Agenda + SQLite 适配在多 Run 并行下的吞吐(Iter 3)
- SQLite WAL 单写多读在 10 Run/s 量级是否成瓶颈(Iter 3+)

---

## 引用

- [product-overview.md](./product-overview.md) — 全功能总览
- [decisions/](./decisions/) — 所有 ADR
- [non-goals.md](./non-goals.md) — 绝不做的事
- [glossary.md](./glossary.md) — 术语
- [../roadmap.md](../roadmap.md) — Iter 时间线

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-24 | v0.0 | 占位 |
| 2026-06-27 | v0.1 | 写实:分层图、核心抽象、模块边界、已验证/待验证项 |
