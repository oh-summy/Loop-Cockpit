---
id: 0001
title: 技术栈选型
status: Accepted
date: 2026-06-26
accepted: 2026-06-28
deciders: "@oh-summy"
---

# ADR-0001 · 技术栈选型

## 上下文 (Context)

Iter 1 启动时,Loop Cockpit 需锁一套**未来 3+ 个月不轻易动摇**的核心技术栈,满足:

| 约束 | 出处 |
|---|---|
| 本地优先,不上云;单用户;不依赖 Docker/K8s | non-goals §1/4/5 |
| 默认 SQLite,零配置;Git Worktree 沙箱 | non-goals §5/6 |
| 编排外部 CLI Coding Agent;可机器执行 Done Criteria | non-goals §2/7, product-overview §6 |
| 浏览器 SPA + Node.js Host;实时彩色终端流;事件总线调度 | product-overview §5/6 |

独立开发者 + AI 协作约束:学习曲线低 / 生态稳定 / AI 训练覆盖度高 / 可逆性高。

## 决策 (Decision)

### 核心运行时
| 项 | 选型 |
|---|---|
| 主语言 | **TypeScript** strict |
| Runtime | **Node.js LTS** ≥ 20 |
| 包管理 | **pnpm** workspace |
| Lint/格式 | **ESLint + Prettier** |
| 单测 | **Vitest** |
| E2E(Iter 5+) | **Playwright** |
| 日志 | **pino**(禁 `console.log`) |
| Git 钩子 | **Husky**(Iter 2 起) |

### Host 后端
| 项 | 选型 |
|---|---|
| HTTP 框架 | **Fastify** |
| ORM | **Drizzle** |
| 数据库 | **SQLite** (单文件) |
| PTY 桥 | **node-pty** |
| 调度/队列 | **Agenda** (SQLite driver) |
| Schema 校验 | **Zod** |
| 全文检索(Iter 5) | **SQLite FTS5** |

### Web UI
| 项 | 选型 |
|---|---|
| 构建 | **Vite** |
| 框架 | **React** |
| 终端渲染 | **Xterm.js** |
| 实时通信 | **WebSocket** (+ SSE 备选) |

### 文档与协作
| 项 | 选型 |
|---|---|
| 文档站 | **VitePress** |
| 仓库托管 | **GitHub** + Issues + Projects |
| AI 协作规则 | **AGENTS.md** (CLAUDE.md 跳板) |

### 沙箱(Iter 3+)
- 隔离:**Git Worktree**
- 路径:`~/.loop-cockpit/workspaces/<runId>/`

## 替代方案 (Alternatives)

- **主语言 JS / Go / Rust**:JS 无类型;Go 缺 node-pty 等价物 + 前端胶水成本;Rust 学习曲线 + 不匹配 1-3h/日预算
- **HTTP 框架 Express / Hono / Koa**:Express 性能与类型推导落后;Hono 边缘部署优势但本地单机用不上;Koa 生态萎缩
- **调度 node-cron / BullMQ / Bree**:node-cron 无持久化无队列;BullMQ 强依赖 Redis(违反 non-goals §5);Bree 缺持久化需自叠层
- **前端 Vue / Svelte / Solid**:Xterm.js + React 生态集成最成熟,单人项目少踩坑优先
- **包管理 npm / yarn / bun**:npm workspace 体验落后;yarn berry 过度;bun 与 node-pty native binding 兼容性仍在收敛

PTY/ORM 细节展开见 [ADR-0002](./0002-node-pty.md) / [ADR-0003](./0003-sqlite-drizzle.md)。

## 后果 (Consequences)

**正面**
- 2024-2026 TS+Node 主流组合,AI 训练覆盖友好
- 单机零外部依赖(SQLite + 文件系统),符合 non-goals 全部约束
- 任何模块可独立替换(Fastify → Hono、Drizzle → Kysely、Agenda → 自写)

**负面**
- node-pty 在 Windows 上可靠性 = 项目最大单点风险 → ADR-0002 + spike 实测应对
- Agenda + SQLite driver 需自写或押注社区维护,**若 spike 期适配代价过高可降级为 node-cron + 自写持久化队列**(届时开 ADR-0006)
- React 在轻量本地工具场景偏重,但替换成本随时间增加

**中性 / 待观察**
- Vitest vs Jest:**已选 Vitest**(Q3,2026-06-28)。如遇老库 mock 行为不一致再评估
- Fastify v5 LTS 周期是否覆盖到 1.0 发布
- Tailwind CSS:**横向决策 H5 已选 Tailwind**,但本 ADR 暂不锁定,等 Iter 2 apps/web 建立时单独开 ADR(Q1,2026-06-28)

## 已拍板的 5 个开放问题(2026-06-28)

| Q | 决策 |
|---|---|
| Q1 Tailwind 锁定时机 | 本 ADR 不锁,留待 apps/web 单独 ADR(H5 已选 Tailwind) |
| Q2 Husky 时机 | Iter 2 上(配合 apps/host 建立) |
| Q3 测试框架 | Vitest |
| Q4 monorepo? | 先单包 apps/host;apps/web Iter 2 后期或 3 拆出 |
| Q5 Node 版本 | 20 LTS(`engines.node >= 20`) |

详细背景见 [notes/2026-06-27-pending-decisions.md](../../../notes/2026-06-27-pending-decisions.md)。

## 关联 ADR

- ADR-0002 — node-pty 选型细节,依赖 spike 结论
- ADR-0003 — SQLite + Drizzle 细节
- ADR-0004 (Iter 3) — Worktree 隔离细节
- ADR-0005 (Iter 4) — Trigger Bus 设计
- ADR-0006 (如需) — 调度器从 Agenda 降级时

## 引用

- [product-overview.md](../product-overview.md) §5, §6
- [non-goals.md](../non-goals.md)
- AGENTS.md §5.1
- GitHub Issue [#5](https://github.com/oh-summy/Loop-Cockpit/issues/5)

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-26 | v0.1 | 首版草稿 |
| 2026-06-27 | v0.2 | 砍开放问题段(转 [notes/2026-06-27-pending-decisions.md](../../../notes/2026-06-27-pending-decisions.md));重组按新 ADR 模板 |
| 2026-06-28 | v1.0 | **Accepted**:全部 5 个开放问题(Q1-Q5)按 AI 建议拍板 |
