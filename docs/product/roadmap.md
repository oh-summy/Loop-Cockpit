# Loop Cockpit 路线图

> **版本**：v0.1
> **更新日期**：2026-06-24
> **当前位置**：🚧 Iteration 1 进行中

---

## 节奏说明

- **Iteration 长度**：2 周
- **投入预算**：工作日 1-3h，周末 5-8h，约 **34-58 小时 / Iteration**
- **滚动模式**：每个 Iteration 末做 retro，下一个 Iteration 目标可微调
- **GitHub Project**：[#3](https://github.com/users/oh-summy/projects/3/views/1)

---

## 总览图

| Iter | 主题 | 关键产出 | 时间 |
|---|---|---|---|
| 1 | Foundation | 文档 + 原型 + PTY 尖刀 | 2026-06-24 ~ 07-08 |
| 2 | MVP Single-Loop | 单 Loop 跑通闭环 + 极简 UI | 07-08 ~ 07-22 |
| 3 | Sandbox & Multi | Worktree + 多 Loop 并行 | 07-22 ~ 08-05 |
| 4 | Trigger Bus | 多源触发器 + Webhook | 08-05 ~ 08-19 |
| 5 | Memory & Audit | FTS5 记忆 + 完整审计 | 08-19 ~ 09-02 |
| 6 | Channels + Dogfood | 飞书/Slack 通知 + 自己跑自己 | 09-02 ~ 09-16 |
| 7+ | 多 Agent 适配 / 公开发布 | OpenCode/Kimi/... + 1.0 release | 09-16 ~ |

---

## Iteration 1 · Foundation（2026-06-24 ~ 07-08）

### 🎯 目标

让项目"立项"全面完成：方向锁死、文档骨架成型、原型可点击、技术尖刀验证通过。

### ✅ 必交付（T0）

- [ ] 仓库基础设施
  - [x] LICENSE (MIT)
  - [x] README 中英双语
  - [x] AGENTS.md + CLAUDE.md（跳板）
  - [x] docs/ 目录骨架
  - [ ] `.github/` Issue / PR / Workflow 模板
  - [ ] `.editorconfig` + `.gitignore`
- [ ] 产品层文档（v0.1 草案）
  - [x] non-goals.md
  - [x] glossary.md
  - [x] whitepaper.md
  - [x] prd.md
  - [x] roadmap.md（本文件）
- [ ] 设计层文档
  - [ ] ux-flow.md（5 个核心用户流程）
  - [ ] ui-spec.md（Dashboard + Blueprint 编辑器）
  - [ ] assets/ 原型截图
- [ ] 架构层骨架
  - [ ] adr/0001-tech-stack.md
  - [ ] adr/0002-node-pty.md
  - [ ] adr/0003-sqlite-drizzle.md
- [ ] **🔪 PTY 尖刀验证（最关键）**
  - [ ] `spike/pty-demo.ts` 能拉起 Claude Code 并捕获彩色输出
  - [ ] 处理 `[y/N]` 交互式确认
  - [ ] 在 Linux / macOS 至少一个平台跑通（Windows 可推迟）
  - [ ] `spike/README.md` 记录结论

### 🚀 拉伸（T1，时间够则做）

- [ ] Iteration 2 的 Issue 全部预先创建好
- [ ] VitePress 部署一个空壳 GitHub Pages
- [ ] 录一段 30 秒的"项目预告 GIF"

### 🛑 验收门槛

进入 Iteration 2 的硬条件：
1. PTY 尖刀**至少一个平台通过**
2. 所有 P0 文档至少有 v0.1 草案
3. 至少一份原型图能给朋友讲清楚产品

如果 Day 10 PTY 仍未通：**重新评估技术方向**（API 模式？换 Agent？）。

---

## Iteration 2 · MVP Single-Loop（07-08 ~ 07-22）

### 🎯 目标

**一个 Loop 跑通完整闭环**：UI 创建 → 手动触发 → Claude Code 执行 → Done Criteria 评估 → 重试或成功 → 落盘审计。

### ✅ 必交付

- [ ] 工程骨架
  - [ ] pnpm workspace（先单包 `apps/host`）
  - [ ] TypeScript + ESLint + Prettier + Husky
  - [ ] Vitest 单测框架
  - [ ] CI 跑 lint + test
- [ ] Host 后端
  - [ ] Fastify 基础路由
  - [ ] Drizzle + SQLite schema（Blueprint / Run / Log）
  - [ ] Blueprint CRUD API
  - [ ] Run 状态机
  - [ ] node-pty + Claude Code Adapter
  - [ ] Done Criteria 评估器
  - [ ] 基本 retry policy
  - [ ] Audit trail 落盘
- [ ] Web UI
  - [ ] Vite + React 骨架
  - [ ] Dashboard（Run 列表）
  - [ ] Blueprint 编辑器（最小字段）
  - [ ] Run 详情页（Xterm 实时流）
  - [ ] WebSocket 连接
- [ ] 文档
  - [ ] architecture/overview.md 写实（基于 spike 结论）
  - [ ] data-model.md 完成
  - [ ] modules/pty.md
  - [ ] modules/adapter.md
  - [ ] modules/runner.md

### 🚀 拉伸

- [ ] 手动触发 + Cron 都可用
- [ ] CHANGELOG 写到 v0.1.0

### 🛑 验收门槛

**演示标准**：录制一段视频，从 UI 创建一个 Blueprint，点击运行，看 Agent 在 Xterm 里干活，看到成功并落盘。

---

## Iteration 3 · Sandbox & Multi-Loop（07-22 ~ 08-05）

### 🎯 目标

把"沙箱"和"多 Loop 并行"做出来——为后续所有自动化能力打基础。

### ✅ 必交付

- [ ] Git Worktree 模块
  - [ ] 自动创建 / 销毁
  - [ ] 失败保留现场
  - [ ] UI "进入 worktree" 按钮
- [ ] 多 Loop 并行
  - [ ] Run 队列 + 并发控制
  - [ ] Dashboard 显示并行 Run
- [ ] 项目绑定
  - [ ] Blueprint 可绑定本地 git repo 路径
- [ ] 文档
  - [ ] modules/worktree.md
  - [ ] adr/0004-worktree-isolation.md

### 🛑 验收门槛

**同时跑 2 个 Loop 不互相污染**，且失败后能进入 worktree 调试。

---

## Iteration 4 · Trigger Bus（08-05 ~ 08-19）

### 🎯 目标

把 Trigger 系统从"Cron + Manual"升级为**真正的多源事件总线**。

### ✅ 必交付

- [ ] Trigger Source 接口实现
  - [ ] Manual（已有）
  - [ ] Cron（已有，重构进总线）
  - [ ] Webhook 端点 `/triggers/:id`
  - [ ] Goal-based（达成才停）
- [ ] Dispatcher
  - [ ] 防抖、并发控制
  - [ ] 失败重排
- [ ] UI
  - [ ] Trigger 配置 UI（多 Trigger 可挂同一 Blueprint）
- [ ] 文档
  - [ ] modules/scheduler.md（完整 Trigger 总线设计）
  - [ ] adr/0005-trigger-bus.md

### 🚀 拉伸

- [ ] GitHub Webhook 集成（PR/Issue）

---

## Iteration 5 · Memory & Audit（08-19 ~ 09-02）

### 🎯 目标

让 Loop "**记得住**"——犯过的错下次不再犯；让每一次 Run 完全可审计。

### ✅ 必交付

- [ ] Memory 系统
  - [ ] SQLite FTS5
  - [ ] 失败模式自动入库
  - [ ] Run 启动时按 Goal 检索注入
  - [ ] UI 浏览 Memory
- [ ] 审计强化
  - [ ] 完整 audit-trail.json 落盘
  - [ ] UI 可查看推理链
  - [ ] Token 消耗明细
  - [ ] Worktree diff 可视化
- [ ] 文档
  - [ ] modules/memory.md
  - [ ] modules/audit.md

---

## Iteration 6 · Channels + Dogfooding（09-02 ~ 09-16）

### 🎯 目标

把 Loop Cockpit 自己**用起来**——这是项目真正的检验时刻。

### ✅ 必交付

- [ ] Channel Hub
  - [ ] 飞书机器人卡片
  - [ ] Slack Webhook
  - [ ] Email（SMTP）
- [ ] Dogfooding Loops（自己跑自己）
  - [ ] **Loop 0**：每晚 23:00 自动 `pnpm lint && pnpm test && pnpm build`，失败发飞书
  - [ ] **Loop 1**：每天 9 点检查 GitHub Issue，整理摘要发飞书
  - [ ] **Loop 2**：每周日下午自动生成本周 commit 摘要
- [ ] 文档
  - [ ] modules/channels.md
  - [ ] guides/your-first-loop.md（公开教程）

### 🛑 验收门槛

**真实在自己的项目上跑 1 周不出大问题。**

---

## Iteration 7+ · 多 Agent 适配 / 1.0 发布

### 候选主题（按需排）

| 主题 | 简述 |
|---|---|
| Multi-agent | OpenCode / Kimi Code / Codex 适配 |
| Skill / MCP UI | 可视化挂载技能包与 MCP |
| Sub-agent | 一个 Loop 内多 Agent 协同 |
| Artifact 数据流 | Loop 间自动传递工件 |
| 公开发布 | VitePress 文档站 + GitHub Pages + 社媒预热 |
| 性能优化 | 启动速度、内存占用 |
| 1.0 release | 第一次公开版本 |

---

## 风险登记

| 风险 | 影响 Iteration | 缓解 |
|---|---|---|
| PTY 跨平台不通 | Iter 1 | 早验证；最坏退到 API 模式 |
| Claude Code CLI 升级破坏 | Iter 2-3 | Adapter 锁版本 + 兜底 |
| 独立开发者投入断档 | 全程 | 每 Iteration 必交付演示物 |
| Scope creep | 全程 | non-goals.md 严格守门 |

---

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-24 | v0.1 | 首版，Iter 1-6 详规划 + 7+ 候选 |
