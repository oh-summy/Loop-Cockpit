# Loop Cockpit 路线图

> **当前**:🚧 Iteration 1 (Foundation) · **GitHub Project**:[#3](https://github.com/users/oh-summy/projects/3/views/1)

---

## 节奏

- Iteration 长度 2 周,工作日 1-3h + 周末 5-8h,约 **34-58h / Iter**
- 滚动模式:每 Iter 末做 retro,下一 Iter 微调
- 具体任务在 GitHub Issue 跟踪,本文件只列**Iter 主题、关键产出、验收门槛**

---

## 总览

| Iter | 主题 | 关键产出 | 时间 |
|---|---|---|---|
| 1 | **Foundation** | 文档骨架 + PTY 尖刀验证 | 2026-06-24 ~ 07-08 |
| 2 | MVP Single-Loop | 单 Loop 跑通闭环 + 极简 UI | 07-08 ~ 07-22 |
| 3 | Sandbox & Multi | Worktree + 多 Loop 并行 | 07-22 ~ 08-05 |
| 4 | Trigger Bus | 多源触发器 + Webhook | 08-05 ~ 08-19 |
| 5 | Memory & Audit | FTS5 记忆 + 完整审计 | 08-19 ~ 09-02 |
| 6 | Channels + Dogfood | 飞书/Slack 通知 + 自己跑自己 | 09-02 ~ 09-16 |
| 7+ | Multi-Agent / 1.0 发布 | OpenCode/Kimi 适配 + 公开发布 | 09-16 ~ |

---

## Iter 1 · Foundation

**目标**:方向锁死、文档结构成型、PTY 技术尖刀验证通过。

**关键产出**:
- 仓库基建 + 产品文档 v0.1 草案
- ADR-0001 技术栈 / ADR-0002 node-pty / ADR-0003 SQLite+Drizzle
- 设计:ux-flow / 5 屏原型
- **PTY 尖刀**:`spike/pty-demo.ts` 能拉起 Claude Code、处理 `[y/N]`、Linux/macOS 至少一个平台跑通

**进入 Iter 2 验收门槛**:
1. PTY 尖刀**至少一个平台通过**
2. 所有 P0 文档至少 v0.1 草案
3. 至少一份原型能给朋友讲清楚产品

> 若 Day 10 PTY 仍未通:**重评估技术方向**(API 模式?换 Agent?)。

---

## Iter 2 · MVP Single-Loop

**目标**:一个 Loop 跑通完整闭环——UI 创建 → 手动触发 → Claude Code 执行 → Done Criteria 评估 → 重试或成功 → 落盘审计。

**关键产出**:pnpm workspace + Fastify + Drizzle + node-pty + Claude Code Adapter + Run 状态机 + audit trail;Vite+React UI(Dashboard / Blueprint 编辑器 / Run 详情 Xterm 实时流);CI lint+test。

**验收门槛**:录视频从 UI 建 Blueprint → 点击运行 → Xterm 看 Agent 干活 → 成功落盘。

---

## Iter 3 · Sandbox & Multi-Loop

**目标**:Worktree 沙箱 + 多 Loop 并行。

**关键产出**:Worktree 自动创建/销毁 + 失败保留现场 + UI "进入 worktree" 按钮;Run 队列 + 并发控制;Blueprint 绑定本地 git repo。

**验收门槛**:**同时跑 2 个 Loop 不互相污染**,失败后能进 worktree 调试。

---

## Iter 4 · Trigger Bus

**目标**:Trigger 从 Cron+Manual 升级为真正的多源事件总线。

**关键产出**:`TriggerSource` 接口实现(Manual/Cron/Webhook/Goal-based);Dispatcher 防抖+并发+失败重排;Trigger 配置 UI。**拉伸**:GitHub Webhook(PR/Issue)。

---

## Iter 5 · Memory & Audit

**目标**:Loop "记得住" + 每次 Run 完全可审计。

**关键产出**:SQLite FTS5 Memory + 失败模式自动入库 + 启动时按 Goal 检索注入;完整 `audit-trail.json` + UI 推理链查看 + Token 明细 + Worktree diff 可视化。

---

## Iter 6 · Channels + Dogfooding

**目标**:Loop Cockpit 自己用起来——真正的检验时刻。

**关键产出**:Channel Hub(飞书/Slack/Email);自己跑自己的三个 Loops:
- 每晚 23:00 跑 `pnpm lint && test && build`,失败发飞书
- 每天 9 点检查 GitHub Issue,整理摘要发飞书
- 每周日下午生成本周 commit 摘要

**验收门槛**:**真实在自己项目上跑 1 周不出大问题**。

---

## Iter 7+ · 候选

| 主题 | 简述 |
|---|---|
| Multi-Agent | OpenCode / Kimi Code / Codex / Trae / Qwen / MiniMax 适配 |
| Skill / MCP UI | 可视化挂载技能包与 MCP |
| Sub-agent | 一个 Loop 内多 Agent 协同 |
| Artifact 数据流 | Loop 间自动传递工件 |
| 公开发布 | VitePress 文档站 + GitHub Pages + 社媒预热 |
| 1.0 release | 第一次公开版本 |

---

## 风险登记

| 风险 | 影响 | 缓解 |
|---|---|---|
| PTY 跨平台不通 | Iter 1 | 早验证;最坏退到 API 模式。**Iter 1 macOS 已验证 ✅** |
| Claude Code CLI 升级破坏 | Iter 2-3 | Adapter 锁版本 + 兜底 |
| 独立开发者投入断档 | 全程 | 每 Iter 必交付演示物 |
| Scope creep | 全程 | non-goals.md 严格守门 |

---

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-24 | v0.1 | 首版 |
| 2026-06-27 | v0.2 | 砍每 Iter 细 checkbox(已在 Issue),保留主题/产出/门槛/风险 |
