# ADR-0001：技术栈选择

- **状态**：Proposed
- **日期**：2026-06-26
- **决策者**：@oh-summy
- **草稿作者**：AI 协作（待 @oh-summy 确认）

> ⚠️ **本文档目前是草稿（v0.1）**。维护者下线期间由 AI 助手依据已确定的项目方向、PRD、roadmap、non-goals 整合而成。
> 所有"决策"段落均**严格遵循上游已存在的文档**——AI 没有自行引入任何新选择。
> 待维护者 review 后改为 Accepted。

---

## 背景（Context）

Iteration 1 启动时，Loop Cockpit 需要锁定一套**未来 3+ 个月不轻易动摇**的核心技术栈。
这套栈必须满足以下硬约束（来自现有文档）：

| 约束 | 出处 |
|---|---|
| 本地优先，不上云 | `non-goals.md` §1 |
| 单用户模式 | `non-goals.md` §4 |
| 不强依赖 Docker / K8s | `non-goals.md` §5 |
| 数据库默认 SQLite，零配置 | `non-goals.md` §6 |
| 沙箱用 Git Worktree 而非容器 | `non-goals.md` §5 |
| 必须能编排"会跑命令行的"外部 Coding Agent | `non-goals.md` §2，`prd.md` §1 |
| 可机器执行的 Done Criteria | `non-goals.md` §7 |
| 浏览器 SPA + Node.js Host 双进程 | `prd.md` §1 |
| 浏览器侧需实时显示彩色终端流 | `prd.md` §D3 |
| 调度器 = 事件总线（不是固定 Cron） | `prd.md` §G |

此外，维护者是**独立开发者 + AI 协作**，技术栈必须：

- **熟悉曲线低** —— 不要纯学习新语言
- **生态稳定** —— 不押注 alpha 阶段的库
- **AI 友好** —— 主流 LLM 训练数据里覆盖度高
- **可逆性高** —— 早期决策错了能局部替换

## 决策（Decision）

Loop Cockpit Iteration 1-6 使用以下技术栈：

### 核心运行时

| 项 | 选型 | 出处 |
|---|---|---|
| 主语言 | **TypeScript**（strict mode） | `AGENTS.md` §5.1 |
| Node 运行时 | **Node.js LTS** | `AGENTS.md` §5.1 |
| 包管理 | **pnpm**（workspace） | `AGENTS.md` §5.1 + `roadmap.md` Iter 2 |
| Lint / 格式 | **ESLint + Prettier** | `AGENTS.md` §5.1 |
| 单元测试 | **Vitest** | `AGENTS.md` §5.1 |
| 端到端测试 | **Playwright**（Iter 5+） | `AGENTS.md` §5.1 |
| 日志 | **pino**（禁 console.log） | `AGENTS.md` §5.1 |
| Git 钩子 | **Husky** | `roadmap.md` Iter 2 |

### Host 后端

| 项 | 选型 | 出处 |
|---|---|---|
| HTTP 框架 | **Fastify** | `prd.md` §1 |
| ORM | **Drizzle** | `prd.md` §1 / `overview.md` |
| 数据库 | **SQLite**（默认，单文件） | `non-goals.md` §6 |
| PTY 桥 | **node-pty** | `prd.md` §D1 |
| 调度 / 队列 | **Agenda** | `prd.md` §1 + `prd.md` §G3 |
| Schema 校验 | **Zod** | `prd.md` §A3 |
| 全文检索（Iter 5） | **SQLite FTS5** | `prd.md` §F3 / `roadmap.md` Iter 5 |

### Web UI

| 项 | 选型 | 出处 |
|---|---|---|
| 构建 | **Vite** | `prd.md` §1 |
| 框架 | **React** | `prd.md` §1 / `roadmap.md` Iter 2 |
| 终端渲染 | **Xterm.js** | `prd.md` §1 / §D3 |
| 实时通信 | **WebSocket** + **SSE** 备选 | `prd.md` §B3 |

### 文档与协作

| 项 | 选型 | 出处 |
|---|---|---|
| 文档站 | **VitePress** | `AGENTS.md` §4 + Issue #9 |
| 仓库托管 | **GitHub** | 现状 |
| Issue / Project | **GitHub Issues + Projects** | `AGENTS.md` §2 |
| AI 协作规则 | **AGENTS.md** + `CLAUDE.md` 跳板 | `AGENTS.md` 全文 |

### 沙箱

| 项 | 选型 | 出处 |
|---|---|---|
| 隔离机制 | **Git Worktree**（Iter 3+） | `non-goals.md` §5 |
| 路径约定 | `~/.loop-cockpit/workspaces/<runId>/` | `prd.md` §E2 |

## 备选方案（Alternatives Considered）

### 主语言：JavaScript vs TypeScript vs Go vs Rust

- **JS**：拒。AGENTS.md §5.1 已锁 TS strict。理由：类型系统在跨模块协作时收益巨大。
- **Go**：拒。生态没有 node-pty 等价物 + 前端胶水成本高 + AI 训练数据相对少。
- **Rust**：拒。学习曲线 + 节奏不匹配独立开发者的工作日 1-3h 预算。

### HTTP 框架：Fastify vs Express vs Hono vs Koa

- **Express**：拒。性能与类型推导落后，社区已转向 Fastify/Hono。
- **Hono**：候选。边缘部署友好，但与 Node 原生生态（尤其 node-pty）的集成不如 Fastify 平滑；且 Loop Cockpit 是单机本地应用，不需要边缘。
- **Koa**：拒。生态萎缩。

### ORM：Drizzle vs Prisma vs Kysely vs 裸 SQL

详见 **ADR-0003**（SQLite + Drizzle 而非 PostgreSQL）。本文不重复展开。

### PTY：node-pty vs child_process vs PTY-via-Docker

详见 **ADR-0002**（用 node-pty 而非 child_process）。本文不重复展开；ADR-0002 必须等 `spike/pty/` 跑出第一手结论后才写实。

### 调度：Agenda vs BullMQ vs Bree vs node-cron

- **node-cron**：拒。只是 cron 表达式解析，不持久化、无队列、无失败重排。
- **BullMQ**：拒。强依赖 Redis，与 non-goals §5/§6 不强依赖额外服务的原则冲突。
- **Bree**：候选但拒。轻量但缺少持久化队列，需要自己再叠一层。
- **Agenda**：选。基于 SQLite/MongoDB 可选，单文件可跑，符合本地优先。

> ⚠️ Agenda 主要文档仍假设 MongoDB；切到 SQLite 需要额外适配层。
> **如 spike 期发现适配代价过高，可降级为 "node-cron + 自写持久化队列"，需开 ADR-0006**。

### 前端框架：React vs Vue vs Svelte vs Solid

- **Vue / Svelte / Solid**：拒。Xterm.js 与 React 的生态集成最成熟（多个现成 wrapper），单人项目里少踩坑优先。
- **React**：选。即便不爱新 server-components，做本地单机 SPA 完全够用。

### 包管理：pnpm vs npm vs yarn vs bun

- **npm**：拒。workspace 体验落后。
- **yarn**：拒。yarn berry 复杂度高，对单人项目过度。
- **bun**：候选但拒。Runtime 兼容性仍在收敛（尤其 node-pty native binding），不押注。
- **pnpm**：选。AGENTS.md §5.1 已定。

## 影响（Consequences）

### 正面

- 整套栈是 2024-2026 的 TS+Node 主流组合，AI 协作友好（训练数据覆盖）
- 单机零外部依赖（SQLite + 文件系统）符合 non-goals 全部约束
- 任何模块可独立替换（Fastify → Hono、Drizzle → Kysely、Agenda → 自写）
- 90% 的"问题"在 stackoverflow 已有答案

### 负面

- node-pty 在 Windows 上的可靠性是项目最大单点风险 → 需要 ADR-0002 + spike 实测
- Agenda + SQLite 的适配层需要自写或押注社区维护良好的 driver
- React 在做"本地工具"这种轻量场景下偏重，但替换成本随时间增加

### 中性 / 待观察

- Vitest vs Jest：Vitest 更现代，但部分老库的 mock 行为不一致；遇到时再切
- Fastify v5 LTS 周期是否覆盖到 Loop Cockpit 1.0 发布
- 是否需要 Tailwind CSS（UI 设计阶段再定，本 ADR 不锁定）

## 跟其他 ADR 的关系

- **ADR-0002**（待写）：node-pty 选型细节，依赖本 spike 结论
- **ADR-0003**（待写）：SQLite + Drizzle 细节
- **ADR-0004**（Iter 3）：Worktree 隔离细节
- **ADR-0005**（Iter 4）：Trigger Bus 设计
- **ADR-0006**（如需）：调度器从 Agenda 降级到自写时

## 备注

- 相关 Issue：[#5](https://github.com/oh-summy/Loop-Cockpit/issues/5)
- 相关代码：暂无（Iter 2 起 `apps/host/`）
- 相关上游文档：
  - `docs/product/prd.md` §1, §A-G
  - `docs/product/non-goals.md` §1, §4, §5, §6, §7
  - `AGENTS.md` §5.1
  - `docs/architecture/overview.md`

## 维护者待回答的开放问题

> 这些问题 AI 草稿无法替你回答，列在这里等回来 review 时决断。

1. **Tailwind CSS 要不要在本 ADR 一并锁定？** —— 我倾向不锁，等到 ux-flow.md / ui-spec.md 写实后单独开 ADR；如你已有偏好可直接补。
2. **Husky 是 P0 还是 Iter 2 才上？** —— roadmap 写在 Iter 2，本 ADR 未推翻；若你想 Iter 1 末就开 pre-commit hook，请明示。
3. **Vitest vs Jest** —— 已倾向 Vitest（速度 + ESM 友好），但你若有 Jest 习惯包袱，可推翻。
4. **是否需要 monorepo？** —— roadmap Iter 2 说 "先单包 apps/host"。本 ADR 沿用。是否要把 apps/web / packages/shared 拆出来在 Iter 2 一次到位？AI 不替你决定。
5. **Node 版本最低是 18 还是 20？** —— 默认 LTS=20.x。若你机器/CI 还在 18，记得明确。

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-26 | v0.1 | 首版草稿（AI 协作，维护者下线期间产出，待 review） |
