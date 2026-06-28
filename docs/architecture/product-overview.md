# Loop Cockpit 产品总览

> **版本**:v1.0 · **更新**:2026-06-28 · **状态**:Iteration 1 · Foundation

本文件是 Loop Cockpit 的**产品定义总览**:为什么做、做什么、不做什么、按什么优先级做。
具体每个功能的需求 → [`prd/`](../prd/);技术决策 → [`decisions/`](./decisions/);时间线 → [`../roadmap.md`](../roadmap.md);Loop 完整解剖 → [`loop-anatomy.md`](./loop-anatomy.md);所有触发器 → [`triggers.md`](./triggers.md)。

---

## 1. 一句话

> **Loop Cockpit 是 AI 自治系统的指挥架构平台。**
> 不是另一个 Cron + Agent 调度器。
> 是让用户配规则、AI 在轨道里自治执行任务的本地 Web 应用。

---

## 2. 为什么是现在

2026 年 6 月,行业范式从 **Prompt Engineering** 转向 **Loop Engineering** —— 详见 [Loop Engineering 研究](../../notes/2026-06-28-loop-engineering-research.md):

- **Boris Cherny**(Anthropic Claude Code 负责人):"我不再 prompt Claude,我写 Loop。"
- **Peter Steinberger**:"你不该再 prompt agent,你该**设计 prompt agent 的 Loop**。"
- **Addy Osmani**:"Loop Engineering = 把那个 prompt 的人替换掉,设计系统去做。"

但行业空白:

| 已存在 | 缺什么 |
|---|---|
| OpenHermit | 团队级,要 PostgreSQL+Docker,独立开发者用不起 |
| LangGraph / LangChain | SDK 不是产品,要写代码才能用 |
| Cron + Shell + Claude Code | 没 AI 自治、没 Memory、没 Verification、没 Human Gate |
| AutoGen / CrewAI | Python framework,无可视化、不本地 |

Loop Cockpit 填补「**独立开发者本地可视化 AI 自治 Loop 控制台**」这块空白。

---

## 3. 产品定位

| 维度 | 选择 |
|---|---|
| 形态 | 本地 Web 应用 — `npx loop-cockpit start` 起 Node Host + 浏览器开 localhost。**可放服务器**,通过 IP+端口访问(自己 host,不是 SaaS) |
| 核心动作 | 用户在 UI 配置 Loop 的 8 层规则,Loop Cockpit 让 AI 在规则约束下自治执行 |
| 底层 Agent | Claude Code 2.1+ 优先(深度集成 `--session-id`/`--bare`/`--plugin-dir` 等官方能力);Iter 7+ 扩 OpenCode/Kimi/Codex |
| 数据归属 | 100% 本地(`~/.loop-cockpit/`),不上云 |
| 部署 | 裸 Node.js,无 Docker 依赖。Worktree 沙箱 |

**目标用户**:
- 独立开发者(写代码 + Bug 修复 + 测试覆盖等)
- 个人工作流自动化(邮件分析 / 周报 / 通知)
- 小团队技术负责人
- AI 自动化爱好者

**目标场景**(不局限编码):

| 场景类型 | 例子 |
|---|---|
| 软件开发 | Bug 修复 / 重构 / 测试 / docs |
| 信息处理 | 收邮件 → 分类 → 推送处理建议 |
| 监控 | GitHub Issue / RSS / CI 失败响应 |
| 周期任务 | 每周 commit 摘要 → 飞书 / 周报 |
| 集成 | CI/CD 后置 smoke test / 部署后通知 |

**非目标**:不懂技术的普通人、企业合规场景、多租户 SaaS。详见 [non-goals.md](./non-goals.md)。

---

## 4. 核心抽象:Loop = AI 自治指挥架构(8 层)

```
                  ┌─────────────────────────────┐
                  │  1. Goal (目标 + 预算)      │  ← 用户配
                  ├─────────────────────────────┤
                  │  2. Planner (规划器)        │  ← AI + 用户审
                  ├─────────────────────────────┤
                  │  3. Context Builder ★差异化 │  ← 系统编排
                  ├─────────────────────────────┤
                  │  4. Orchestrator (编排器)   │  ← 系统调度
                  ├─────────────────────────────┤
                  │  5. Worker Agent            │  ← Claude Code
                  ├─────────────────────────────┤
                  │  6. Tool Layer              │  ← 系统注入
                  ├─────────────────────────────┤
                  │  7. Verification (验证)     │  ← AI + 规则
                  ├─────────────────────────────┤
                  │  8. Memory (State)          │  ← 系统持久化
                  └─────────────────────────────┘
   横切: Reflection/Retry · Human Gate · Audit Trail
```

完整解剖图 + trace 示例 → [`loop-anatomy.md`](./loop-anatomy.md)
完整架构决策 → [ADR-0010](./decisions/0010-autonomous-loop-architecture.md)

**核心循环**:
```
Trigger → Goal → 读 Memory → Planner → Context Builder
       → Orchestrator → Worker → Verification → 写 Memory
       → (达成 → 终止 / 未达成 → 下轮 / 失败 → Reflection)
```

---

## 5. 核心场景示例

### 5.1 Bug 修复(开发场景)
- Goal: `objective="修复 Issue #123" / constraint="不改 API" / success="pnpm test pass"`
- Trigger: Manual
- Planner: 拆 复现 → 定位 → 改代码 → 跑测试 4 任务
- Verification: shell exit + LLM judge

### 5.2 邮件分析(个人工作流)
- Goal: `objective="整理今早邮件,推荐处理优先级"`
- Trigger: Cron 09:00
- Planner: 拆 收件 → 分类 → 总结 3 任务
- Tool Layer: gws-gmail-read skill
- Notify: 飞书发分类结果

### 5.3 信息监控(GitHub Issue)
- Trigger: GitHub Webhook(Issue created)
- Goal: `objective="自动给新 Issue 加 label" / success="label 数量 >= 1"`
- Worker: claude + github-cli skill
- Human Gate: 标签变更需人审(default-reject 模式)

### 5.4 持续质量(CI 后置)
- Trigger: ci-finished (GitHub Actions)
- Goal: `objective="CI 失败时分析原因,出修复 PR" / budget=$1, 30min`
- Loop 持续到通过或撞预算

---

## 6. 功能模块清单(按 8 层组织)

> 优先级:🔴 **P0**(MVP 必须) / 🟡 **P1**(MVP 后) / 🟢 **P2**(生态期)
> 各层详见 [`ADR-0010`](./decisions/0010-autonomous-loop-architecture.md) 和 [`loop-anatomy.md`](./loop-anatomy.md)。

### A · Goal 系统 🔴
- 5 字段(objective / constraints / successCondition / deadline / budget)
- successCondition 必须机器可验证(非主观)— 沿用 [non-goals §7](./non-goals.md)

### B · Trigger 总线 🔴(设计)/ 分代实现
- Iter 2: Manual / Once / Cron
- Iter 3+: Webhook / Git / CI/CD / Email / 消息 / File Watch / ...
- 详见 [`triggers.md`](./triggers.md)

### C · Planner 🟡(Iter 3)
- 每轮 Loop 调一次 LLM 出任务列表 + 优先级
- 用户可配 model / 是否每轮 replan / 模板

### D · Context Builder 🟡(Iter 4)★ Loop Cockpit 最差异化
- 按任务 priority/type 挑 Memory + Skill + MCP + Tool + File
- 不一锅烩

### E · Orchestrator 🔴
- 启 Claude Code 子进程(同 `--session-id` 跨任务)
- 落地 `--bare + --plugin-dir + --mcp-config + --agents` flag 集
- 详见 [`F004 Claude Adapter PRD`](../prd/F004-claude-adapter.md)

### F · Worker Agent 🔴 (Claude) / 🟡 (其他)
- Iter 2: Claude Code 2.1+
- Iter 7+: OpenCode / Kimi / Codex 等

### G · Tool Layer 🔴
- Skills 走 `--plugin-dir <bundle>`(Loop Cockpit 复制选定 skill 到临时 plugin)
- MCP 走 `--mcp-config foo.json --strict-mcp-config`
- 内建 tools 走 `--tools "Bash,Edit,Read"`
- Subagents 走 `--agents '{...}'`
- 文件边界 `--add-dir` + cwd 锁

### H · Verification 🔴(shell only, Iter 2)/ 🟡(多 evaluator, Iter 5)
- 4 种 evaluator:shell / llm-judge / regex / none
- Iter 2 仅 shell;Iter 5 加 llm-judge + 组合
- 决策输出: next-task / replan / retry / human / terminal / fail

### I · Memory (State) 🔴(state.yaml, Iter 2)/ 🟡(FTS5 跨 Loop, Iter 5)
- Iter 2: 单 Run 的 `~/.loop-cockpit/runs/<runId>/state.yaml`
- Iter 5: SQLite FTS5 跨 Loop 经验复用

### J · Reflection / Retry 🟡(Iter 3)
- 失败时 LLM 反思 → 改方案 / 升级 model / 重试
- 不只重试,**针对性修改后重试**

### K · Human Gate 🟡(Iter 5)
- 3 模式:interrupt / default-approve / default-reject
- 通知渠道:UI / 邮件 / 飞书 / Slack
- 用户在 Blueprint 配每个任务的 gate 模式 + timeout

### L · Cockpit UI 🔴
- 简单模式 vs 专家模式 双视图
- 简单模式:Goal + Trigger + Skills/Tools + Budget
- 专家模式:8 层全暴露 + Phase 编辑器(ADR-0009) + 流程图视图(Iter 5+)

### M · Audit Trail 🔴
- 每轮决策 / 评估 / 状态变更 / token 消耗 全量记录
- audit-trail.json 落盘
- 详见 [`F005 PRD`](../prd/F005-audit-trail.md)

### N · Worktree 沙箱 🟡(Iter 3)
- Git worktree 隔离,每 Run 一个
- 文件读写边界结合 `--add-dir`

### O · Channel Hub 🟡(Iter 6)
- 飞书 / Slack / Discord / Email / Telegram
- Loop 结果 + Human Gate 通知

---

## 7. 部署形态

| 形态 | 说明 |
|---|---|
| **本地** | `npx loop-cockpit start` → Node Host 起 localhost,浏览器自动开 |
| **私服** | 同一 Host 起在自己的服务器,IP+端口访问 UI(non-goals §1 反对 SaaS,**不反对**自己 host) |
| **多设备共享** | 同一台 Host 机器服务多设备 IP 访问;数据归属仍单机 |

**禁止**:
- 云端 SaaS(non-goals §1)
- 多租户 / 团队权限(non-goals §4)
- 跨机自动同步(non-goals §1)

---

## 8. 非功能需求

- **性能**:Host 启动 < 3s,UI 首屏 < 2s,Run 启动 < 1s
- **可靠性**:Host 崩溃可恢复 Run 状态(Memory state.yaml + WAL)
- **安全**:Token 仅本地 `~/.loop-cockpit/secrets/` 加密;Done Criteria 执行前显著提示
- **兼容**:Node.js ≥ 20 LTS;Chrome/Edge/Safari/Firefox 最新版;macOS / Linux(P0),Windows(P1)
- **可审计**:每轮 Loop 完整 trace 可回放(Iter 5+)

---

## 9. MVP 范围(Iter 2)

✅ **必做**(8 层 MVP 子集):
- Goal(完整 5 字段)
- Trigger(Manual / Once / Cron)
- Worker(Claude Code Adapter,`--session-id` + `--bare` + `--plugin-dir` + `--mcp-config` + `--agents` + `--tools`)
- Tool Layer(用户选 Skills/MCP/Tools/Subagents)
- Verification(shell only)
- Memory(state.yaml + SQLite runs)
- 极简 UI(简单模式)
- audit-trail 落盘

❌ **MVP 不做**(留后续 Iter):
- Planner(Iter 3)— Iter 2 简化为"用户写 Goal,Worker 直接执行,不拆任务"
- Context Builder(Iter 4)— Iter 2 简化为"所有 Skill/Tool 一次塞,无 mapping"
- Orchestrator 复杂调度(Iter 4)— Iter 2 仅主 agent
- Reflection / Human Gate(Iter 3+/Iter 5)
- 多 Loop 串联 / Artifact / Memory FTS5 / 多 Agent 适配 / Channel Hub

---

## 10. 关键风险

| 风险 | 缓解 |
|---|---|
| 8 层架构复杂度吓跑用户 | 简单模式优先 + 5-10 个预设 Loop 模板 |
| Claude Code 2.1 升级破坏 flag | Adapter 层兜底 + 锁版本 + ADR-0002/0010 |
| node-pty 跨平台不通 | macOS 已验证;Linux/Windows Iter 2 扩验 |
| Planner / Verification 的 token 开销 | budget 强制 + 用户可选 cheaper model 跑这两层 |
| 用户写出危险 successCondition | 沙箱 + 高危命令显式确认 + Worktree 隔离 |
| 独立开发者投入断档 | 每 Iter 必交付演示物 |
| Scope creep | non-goals.md 严格守门 |

---

## 11. 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-24 | v0.1 | 首版(原 prd.md),覆盖 A-K 模块 + Trigger 总线设计 |
| 2026-06-27 | v0.2 | 合并 whitepaper(why/场景/定位),迁到 architecture/,与新文档结构对齐 |
| 2026-06-28 | v0.3 | ADR-0009 Phase 编排架构加入 |
| 2026-06-28 | **v1.0** | ★★ **产品重定位**:Loop Cockpit = AI 自治指挥架构平台(8 层架构,ADR-0010)。场景扩到非编码。MVP 子集明确 |
