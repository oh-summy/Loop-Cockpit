# Loop Cockpit 产品总览

> **版本**：v0.2 · **更新**：2026-06-27 · **状态**：Iteration 1 · Foundation

本文件是 Loop Cockpit 的**产品定义总览**:为什么做、做什么、不做什么、按什么优先级做。
具体每个功能的需求 → [`prd/`](../prd/);技术决策 → [`decisions/`](./decisions/);时间线 → [`../roadmap.md`](../roadmap.md)。

---

## 1. 一句话

> **Loop Cockpit 是 Loop Engineering 的本地可视化控制驾驶舱。**

你不再手写提示词;你在浏览器里**设计 Loop**——定义目标、定义完成标准、配置 Agent 与触发器,
剩下的让 Agent 在沙箱里自主循环到达成为止。

---

## 2. 为什么是现在

2026 年 6 月,AI 编程范式正在从 **Prompt Engineering** 转向 **Loop Engineering**——
Google 工程主管 Addy Osmani 系统化这一概念,Anthropic Boris Cherny 和 OpenAI Peter Steinberger 都在公开倡导
"别再写提示词,去**设计循环**"。开发者的工作正从「循环内部的操作者」转向「循环之上的设计者」。

**市场空白**:

| 已存在 | 缺什么 |
|---|---|
| OpenHermit | 团队级,要 PostgreSQL+Docker,独立开发者用不起 |
| Loop Engineering Agent (LEA) | 命令行,无可视化、无多 Loop 管理 |
| Binex | DAG 工作流,不是 Loop 设计器 |
| LangChain / LangGraph | SDK 不是产品,要写代码才能用 |

Loop Cockpit 填补「**独立开发者本地可视化设计 Loop**」这块空白。

---

## 3. 产品定位

| 维度 | 选择 |
|---|---|
| 形态 | 本地 Web 应用(`npx loop-cockpit start` 自动开浏览器) |
| 核心动作 | UI 设计 Loop 蓝图,本地 Host 调度执行 |
| 底层 Agent | 可插拔。首发 Claude Code,规划 OpenCode/Kimi/Codex/Trae/Qwen/MiniMax |
| 数据归属 | 100% 本地(`~/.loop-cockpit/`),不上云 |
| 部署 | 裸 Node.js,无 Docker 依赖 |
| 沙箱 | Git Worktree,不是容器 |

**目标用户**:独立开发者 / 小团队技术负责人 / AI 自动化爱好者。
**非目标**:不懂技术的普通人、企业合规场景、多租户 SaaS。详见 [non-goals.md](./non-goals.md)。

---

## 4. 核心场景

| 场景 | Trigger | Goal | Done Criteria |
|---|---|---|---|
| 每日自动化巡检 | Cron `0 9 * * *` | 保持 main 健康 | `pnpm lint && test && build` |
| 测试覆盖率持续提升 | Goal-based | 覆盖率 ≥ 85% | 覆盖率断言命令 |
| PR 自动响应 | GitHub Webhook | 解决合并冲突 | `git merge --no-commit && [ $? -eq 0 ]` |
| 多 Loop 串联 | 9 点 Loop A → 10 点 Loop B 读 Artifact | 周报草稿 | Artifact 文件存在 |

---

## 5. 系统总览

```
┌────────────────────────────────────────────────────┐
│  浏览器 SPA(Vite + React + Xterm.js)              │  UI 层
├────────────────────────────────────────────────────┤
│  Host(Fastify + Drizzle + node-pty + Agenda)      │  控制层
├────────────────────────────────────────────────────┤
│  Agent 适配层(Claude Code / OpenCode / Kimi / …)  │  执行层
├────────────────────────────────────────────────────┤
│  Git Worktree 沙箱 + SQLite + Artifact 文件系统    │  隔离/存储层
└────────────────────────────────────────────────────┘
```

详见 [`overview.md`](./overview.md)。

---

## 6. 功能模块清单(按优先级)

> 优先级:🔴 **P0**(MVP 必须) / 🟡 **P1**(MVP 后) / 🟢 **P2**(生态期)
> 边界检查:每条须与 [`non-goals.md`](./non-goals.md) 对照,**不冲突**才可进入
> 术语遵循 [`glossary.md`](./glossary.md)

### A · Loop Blueprint 系统 🔴
- A1 数据模型:`id, name, goal, doneCriteria, agent, model, skills[], mcpServers[], retryPolicy, timeout, tokenBudget, triggers[], promptTemplate, projectPath, status`
- A2 CRUD API:`POST/GET/PATCH/DELETE /api/blueprints`
- A3 校验引擎:zod schema + cron expression + agent compatibility

### B · Loop Runtime 引擎 🔴
- B1 状态机:`idle → initializing → running → evaluating → (success | retrying | failed | stopped)`
- B2 生命周期:Worktree 分配 → Memory 加载 → system prompt 拼装 → PTY 启动 → 流式接收 → Done Criteria 评估 → retry 或 success → 写 Memory → Channel 通知
- B3 执行 API:`POST /api/runs`, `POST /:id/stop`, `GET /:id`, `GET /:id/logs`(SSE), `GET /:id/stream`(WebSocket)

### C · Agent 适配层 🔴(Claude) / 🟡(其他)
- C1 统一接口:`AgentAdapter { start, parseExitCode, estimateTokens }` + `AgentProcess { pty, onData, onExit, write, kill }`
- C2 适配优先级:Claude Code(P0/Iter 1-2)、OpenCode/Kimi(P1/Iter 3)、Codex/Trae/Qwen/MiniMax(P2/Iter 4+)

### D · PTY 执行层 🔴(**最关键**)
- D1 PTY Runner:基于 `node-pty`,跨平台,捕获 ANSI
- D2 自动应答 FSM:正则匹配 `[y/N]`/`Confirm?`,危险操作白名单
- D3 实时终端流:WebSocket → Xterm.js + 同步落 SQLite
- 关键决策见 [ADR-0002](./decisions/0002-node-pty.md);Iter 1 已验证 → [F001 PRD](../prd/F001-pty-runner.md)

### E · Git Worktree 沙箱 🟡(Iter 3)
- 生命周期:`create → bind to runId → success: merge+cleanup / failure: preserve`
- 路径:`~/.loop-cockpit/workspaces/<runId>/`
- 失败保留现场,UI 提供"打开 worktree"按钮

### F · Memory 系统 🟢(Iter 5)
- 类型:错误模式 / 成功模式 / 用户偏好
- 实现:SQLite FTS5,每次 Run 结束自动抓关键错误入库,启动时按 Goal 检索 top-K 注入

### G · Scheduler & Trigger 总线 🔴(设计,Iter 1) / 🟡(Cron,Iter 2)
- **关键决策**:从第一天就按事件总线设计,避免后期改核心
- G1 接口:`TriggerSource { type, start(emit), stop }`
- G2 内置:Manual/Cron(P0)、Webhook(P1)、GitHub/Email/飞书/Goal-based/Boot(P2)
- G3 Dispatcher:SQLite 持久化队列(Agenda),防抖、防并发同 Blueprint、失败重排

### H · Artifact 系统 🟢(Iter 4)
- 每个 Run 可声明输出工件(文件 / JSON 字段),存 `~/.loop-cockpit/artifacts/<runId>/`
- 跨 Loop:Blueprint `dependsOn: [upstreamId]`,自动注入上游最近成功 Run 的 Artifact

### I · Channel Hub 🟡(Iter 6)
- 渠道:飞书/钉钉/Slack(P1)、Discord/Telegram/Email(P2)
- 事件:`run.success/failed/retry/stuck/budget-exceeded`
- 卡片:Lark Card / 钉钉 Markdown / Slack Block Kit

### J · Cockpit UI 🔴
- 页面:`/`(Dashboard) `/blueprints[/new|/:id]` `/runs[/:id]` 🔴;`/memory` 🟢;`/skills` `/mcp` `/channels` `/settings` 🟡
- Blueprint 编辑器字段:Goal / Done Criteria / Agent+Model / Trigger / Retry / Skill / MCP / Project path / Prompt template
- Run 详情:实时 Xterm + 状态机可视化 + Token 实时计数 + "进入 worktree" 按钮

### K · 可审计性 🔴(贯穿全模块)
- K1 每个 Run 产出 `audit-trail.json`:完整 system prompt、Agent 输出+时间戳、Done Criteria 结果、Token 明细、Worktree diff
- K2 可回放:UI 重放 Run 的终端输出(不重执 Agent)🟡

---

## 7. 非功能需求

- **性能**:Host 启动 < 3s,UI 首屏 < 2s,Run 启动 < 1s
- **可靠性**:Host 崩溃可恢复 Run 状态,SQLite WAL 模式
- **安全**:Token 仅本地 `~/.loop-cockpit/secrets/` 加密;Done Criteria 执行前显著提示
- **兼容**:Node.js ≥ 20 LTS;Chrome/Edge/Safari/Firefox 最新版;Linux/macOS(P0),Windows(P1)

---

## 8. MVP 范围(Iter 1-3 总和)

✅ **必做**:Blueprint CRUD + Claude Code 适配器 + Cron/Manual + PTY+自动应答+Xterm + Run 状态机+评估循环 + SQLite + 极简 UI + audit-trail 落盘

❌ **MVP 不做**:多 Agent 适配 / Skill 与 MCP UI / Channel Hub / Memory / 多 Loop 串联 / Sub-agent

详见 [`../roadmap.md`](../roadmap.md)。

---

## 9. 关键风险

| 风险 | 缓解 |
|---|---|
| node-pty 跨平台不通 | Iter 1 spike 已验证 macOS(Linux/Windows 待 Iter 2),最坏退到 API 模式 |
| Claude Code CLI 升级破坏接口 | Adapter 层兜底 + 锁版本 |
| 用户写出危险 Done Criteria | 默认沙箱 + 高危命令显式确认 |
| 独立开发者投入断档 | 每个 Iter 必交付演示物 |
| Scope creep | non-goals.md 严格守门 |

---

## 10. 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-24 | v0.1 | 首版(原 prd.md),覆盖 A-K 模块 + Trigger 总线设计 |
| 2026-06-27 | v0.2 | 合并 whitepaper(why/场景/定位),迁到 architecture/,与新文档结构对齐 |
