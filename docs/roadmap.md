# Loop Cockpit 路线图

> **当前**:🚧 Iteration 1 (Foundation) · **GitHub Project**:[#3](https://github.com/users/oh-summy/projects/3/views/1)

---

## 节奏

- Iteration 长度 2 周,工作日 1-3h + 周末 5-8h,约 **34-58h / Iter**
- 滚动模式:每 Iter 末做 retro,下一 Iter 微调
- 具体任务在 GitHub Issue 跟踪,本文件只列**Iter 主题、关键产出、验收门槛**

---

## 总览

按 ADR-0010 「逐代逐层」实现 8 层自治架构:

| Iter | 主题 | 加的层 | 关键产出 | 时间 |
|---|---|---|---|---|
| 1 | **Foundation** | - | 文档骨架 + PTY 尖刀验证 + 8 层架构 ADR | 2026-06-24 ~ 07-08 |
| 2 | MVP 4 层 | L1 + L5 + L7 + L8 | 单 Loop 跑通,极简 UI | 07-08 ~ 07-22 |
| 3 | +Planner +Reflection | L2 + Reflection | 多任务自治 + 失败反思 | 07-22 ~ 08-12 |
| 4 | +Context +Orchestrator | L3 + L4 | 按需注入 + 多 source Trigger | 08-12 ~ 09-02 |
| 5 | +Memory FTS5 +HumanGate | L8 升级 + Human Gate | 跨 Loop 经验 + 人审 | 09-02 ~ 09-23 |
| 6 | Channels + Dogfood | - | 飞书/Slack + 自己跑自己 | 09-23 ~ 10-14 |
| 7+ | Multi-Agent / 1.0 | - | OpenCode/Kimi 适配 + 公开发布 | 10-14 ~ |

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

## Iter 2 · MVP 4 层

**目标**:跑通最小 8 层架构子集 — `Trigger → Goal → Worker → Verification → Memory`,完整 Loop 闭环。

**关键产出**:
- L1 Goal:5 字段(objective/constraints/successCondition/deadline/budget)
- L5 Worker:Claude Code Adapter,实现 `--bare/--session-id/--plugin-dir/--mcp-config/--agents/--tools` flag 集
- L7 Verification:shell evaluator(单一,Iter 5 加多 evaluator)
- L8 Memory:state.yaml(单 Run)+ SQLite runs/blueprints/phase_history 表
- Trigger:Manual / Once / Cron
- 极简 UI(简单模式):Goal + Trigger + Skills/Tools + Budget
- Skill / MCP / Tools / Subagent 选取(从用户级 ~/.claude/ 读取,生成临时 plugin bundle)
- audit-trail.json 落盘

**验收门槛**:录视频从 UI 建 Loop → 点击运行 → Xterm 看 Claude 跑 → Verification 通过落盘。

> **注**:Iter 2 不上 Planner / Context Builder / Orchestrator 复杂调度。简化为「用户写 Goal → 1 个 Phase → Claude 一锅烩跑」,做出"能跑"的最小闭环。

---

## Iter 3 · +Planner +Reflection +更多 Trigger

**目标**:Loop 自治程度跨越 — Planner 拆任务、Reflection 失败反思,Trigger 接入 GitHub Webhook 联动。

**关键产出**:
- L2 Planner:每轮 Loop 调 LLM 出任务列表 + 优先级
- Reflection 横切:失败时 LLM 反思 → 改方案 / 升级 model / 针对性重试
- Trigger 扩展:Webhook(POST /triggers/:id)/ Git push / PR / Issue / Comment
- Worktree 沙箱(从 Iter 3 原计划保留)
- UI:专家模式开关(暴露 Planner / Reflection 配置)

**验收门槛**:一个 Loop 跑 3+ 轮自治推进,Planner 出新任务,失败时正确反思+重试。

---

## Iter 4 · +Context Builder +Orchestrator +CI/Email Trigger

**目标**:Loop 能力差异化的核心 — 按需注入 Context,主/sub agent 编排,触发面扩到 CI 和邮件。

**关键产出**:
- L3 Context Builder:按任务 priority/type 挑 Memory + Skill + MCP + Tools + Files
- L4 Orchestrator:主 agent + subagent 调度策略
- Trigger 扩展:CI/CD 完成 / Email / 飞书/Slack/Discord 消息 / File Watch
- UI:Context 规则编辑器(mapping `task.priority → ContextBundle`)

**验收门槛**:复杂 Loop(如 Bug 修复)各阶段自动切换 Skill/Tool,UI 显示当前阶段的 Context 内容。

---

## Iter 5 · +Memory FTS5 +Human Gate +多 evaluator

**目标**:跨 Loop 学习 + 人审能力 + 验证更强。

**关键产出**:
- L8 Memory 升级:SQLite FTS5 跨 Loop 经验复用
- Human Gate 3 模式:interrupt / default-approve / default-reject
- Verification 多 evaluator:llm-judge / regex / 组合(AND/OR)
- 完整 audit-trail.json + UI 推理链查看
- Worktree diff 可视化
- Boot Trigger / upstream Loop / 条件 schedule

**验收门槛**:一周内 Memory 复用一次,Human Gate 实测中断和恢复,完整 trace 可在 UI 复盘。

---

## Iter 6 · Channels + Dogfooding

**目标**:Loop Cockpit 自己用起来 — 项目真正的检验时刻。

**关键产出**:Channel Hub(飞书/Slack/Email);自己跑自己的三个 Loops:
- 每晚 23:00 跑 `pnpm lint && test && build`,失败发飞书
- 每天 9 点检查 GitHub Issue,整理摘要发飞书
- 每周日下午生成本周 commit 摘要

**验收门槛**:**真实在自己项目上跑 1 周不出大问题**。

---

## Iter 7+ · 多 Agent + 公开发布

按 ADR-0010 + ADR-0009 完整 8 层都已稳定,可扩 Agent 适配 + 公开发布。

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
| 2026-06-28 | v1.0 | ★ 按 ADR-0010 8 层架构「逐代逐层」重排:Iter 2=4层MVP / Iter 3=+Planner+Reflection / Iter 4=+Context+Orchestrator / Iter 5=+Memory FTS5+Human Gate |
