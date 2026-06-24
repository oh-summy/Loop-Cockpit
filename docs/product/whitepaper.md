# Loop Cockpit 产品白皮书

> **版本**：v0.1（草案）
> **日期**：2026-06-24
> **状态**：Iteration 1 · Foundation
> **作者**：[@oh-summy](https://github.com/oh-summy)

---

## 一句话定位

> **Loop Cockpit 是 Loop Engineering 的本地可视化控制驾驶舱。**

你不再手写提示词；你在浏览器里**设计 Loop**——定义目标、定义完成标准、配置 Agent 与触发器，
剩下的让 Agent 在沙箱里自主循环到达成为止。

---

## 一、为什么是现在

### 1.1 行业拐点

2026 年 6 月，AI 编程的范式正在发生根本性转移：

- **Google** 工程主管 Addy Osmani 正式命名并系统化阐述 "Loop Engineering"。
- **Anthropic** 的 Boris Cherny："我不再给 Claude 写提示词了，我的工作就是写循环。"
- **OpenAI** 的 Peter Steinberger："别再给编程 Agent 写提示词了——去**设计循环**。"

开发者的工作正在从「**循环内部的操作者**」转变为「**循环之上的设计者**」。

### 1.2 现有工具的空白

| 已存在 | 它们做什么 | 缺什么 |
|---|---|---|
| OpenHermit | 团队级 Agent 运维平台 | 太重，需要 PostgreSQL + Docker，独立开发者用不起来 |
| Loop Engineering Agent (LEA) | 命令行 Loop Agent | 没有可视化、没有多 Loop 管理 |
| Binex | 本地 AI 工作流运行时 | 偏 DAG 工作流，不是 Loop 设计器 |
| LangChain / LangGraph | Agent 编程框架 | 是 SDK 不是产品，要写代码才能用 |

**空白**：缺一个「**独立开发者本地可视化设计 Loop**」的工具。Loop Cockpit 来补这个空缺。

---

## 二、产品定位

### 2.1 一句话工程定义

> A **local-first AI Loop orchestration system** that manages agent-driven loops, runs them in
> **isolated Git worktrees**, with **multi-source triggers**, **persistent memory**, and **evaluation-based retry loops**.

### 2.2 产品三角

| 维度 | 描述 |
|---|---|
| **形态** | 本地 Web 应用（启动后自动打开浏览器） |
| **核心动作** | 用 UI **设计 Loop 蓝图**，由本地 Host 调度执行 |
| **底层 Agent** | 可插拔，首发 Claude Code，规划支持 OpenCode / Kimi Code / Codex / Trae / Qwen Code / MiniMax Code |
| **数据归属** | 100% 本地（`~/.loop-cockpit/`），不上云 |
| **部署** | `npx loop-cockpit start`，无 Docker 依赖 |

### 2.3 与现有产品的差异化

| 维度 | OpenHermit | LangChain | Cron + Shell | **Loop Cockpit** |
|---|---|---|---|---|
| 用户视角 | 团队管理 | 写代码搭 Agent | 写脚本 | **可视化设计 Loop** |
| 部署复杂度 | 高（DB+Docker） | N/A | 低 | **极低（npm 一键）** |
| 多 Agent 引擎 | 部分支持 | N/A | N/A | **可插拔 8+ 引擎** |
| 沙箱隔离 | Docker | 无 | 无 | **Git Worktree** |
| 触发器多样性 | 中 | N/A | 仅 Cron | **多源事件总线** |
| 可审计性 | 中 | 弱 | 弱 | **全量审计（推理链+token 流水）** |

---

## 三、目标用户

### 3.1 主要用户

- **独立开发者**：日常使用 Claude Code / Codex / 其它 CLI Agent，想让 Agent 帮自己"自动做事"
- **小团队技术负责人**：想为团队标准化 Agent 工作流，但拒绝企业级运维平台的复杂度
- **AI 自动化爱好者**：把"让 AI 帮我每天自动做 X"当作生活方式的极客

### 3.2 非目标用户

- ❌ 不懂技术、只想"对话 AI"的普通人
- ❌ 需要企业级权限、合规、审计的大公司
- ❌ 需要多租户、SaaS 模式的厂商

---

## 四、核心场景

### 4.1 场景一：每日自动化巡检

> 「每天早上 9 点，让 Claude Code 自动跑全项目 lint+test+构建，失败时发飞书给我。」

- Trigger：Cron `0 9 * * *`
- Goal：保持 main 分支健康
- Done Criteria：`pnpm lint && pnpm test && pnpm build`
- 失败动作：飞书通知 + 保留 Worktree 现场

### 4.2 场景二：测试覆盖率持续提升

> 「持续运行，直到项目测试覆盖率达到 85%。每次 Loop 写一批新测试，跑通后提交。」

- Trigger：Goal-based（达成才停）
- Goal：覆盖率 ≥ 85%
- Done Criteria：覆盖率断言命令
- Memory：记住已尝试的测试策略，避免重复

### 4.3 场景三：PR 自动响应

> 「收到 GitHub PR 评论 `@loop fix conflicts` 时，自动拉一个 Loop 解决冲突并 push。」

- Trigger：Webhook（GitHub PR comment）
- Goal：解决合并冲突
- Done Criteria：`git merge --no-commit && [ $? -eq 0 ]`
- Skill：项目级冲突解决规则

### 4.4 场景四：多 Loop 串联

> 「9 点 Loop A 生成『昨日代码变更摘要』；10 点 Loop B 读取摘要并写周报草稿到飞书。」

- 通过 **Artifact 系统**自动传递数据
- 上游 Artifact 自动注入下游 system prompt

---

## 五、核心能力（按优先级）

### P0（MVP 必备）

| 能力 | 说明 |
|---|---|
| **Loop 蓝图设计器** | UI 配置 Goal、Done Criteria、Agent、Cron、Retry |
| **单 Agent 适配（Claude Code）** | node-pty 拉起 + 自动应答 + 实时终端流 |
| **Run 生命周期管理** | INIT → AGENT → EVAL → RETRY/SUCCESS 状态机 |
| **Cron + Manual 触发** | 最小可用触发器（事件总线设计） |
| **SQLite 持久化** | Blueprint / Run / Logs |
| **实时终端 UI** | Xterm.js 看 Agent 输出 |

### P1（MVP 之后）

| 能力 | 说明 |
|---|---|
| **多 Agent 适配** | OpenCode / Kimi Code 等 |
| **Git Worktree 隔离** | 多 Loop 并行不冲突 |
| **Channel Hub** | 飞书 / 钉钉 / Slack / Discord 通知 |
| **Skill / MCP 配置** | 可视化挂载 |
| **可审计性强化** | 完整推理链、token 流水、diff 可视化 |

### P2（生态期）

| 能力 | 说明 |
|---|---|
| **多源 Trigger** | Webhook / Git event / Email / 消息 |
| **Artifact 跨 Loop 数据流** | 上下游自动传递 |
| **FTS5 Memory** | 跨 Run 经验复用 |
| **Sub-agent / 多 Task** | 一个 Loop 内多个 Agent 协同 |
| **dogfooding** | Loop Cockpit 自己跑自己 |

详细 PRD → [`prd.md`](./prd.md)
完整路线图 → [`roadmap.md`](./roadmap.md)
非目标 → [`non-goals.md`](./non-goals.md)

---

## 六、产品价值主张

### 给独立开发者

> 「让你睡觉时，Agent 也在帮你干活。**而且第二天起床，你能清楚知道它干了什么、为什么这么干、出了什么错。**」

### 给小团队

> 「不用 Docker 不用云，10 分钟搭一套**团队 Agent 自动化工作台**。」

### 给行业

> 「**Loop Engineering 的第一个独立开发者向工具**——把 Boris Cherny 和 Peter Steinberger 嘴里那个'设计循环'的工作流，做成产品。」

---

## 七、名字的由来

**Loop Cockpit** = **Loop**（循环）+ **Cockpit**（驾驶舱）。

用户像飞行员一样，坐在驾驶舱里**配置仪表、设定航线**，然后让飞机自动驾驶到目的地——
出了状况，仪表盘第一时间告警，飞行员随时可以接管。

> 早期备选名：Loop Forge、Loop Studio、Loop Hub、Loop Console。
> 最终选 **Cockpit**，因为它**强调"控制感"而非"创作感"**——Loop Cockpit 是给**已经知道自己想要什么**的开发者用的。

---

## 八、未来一年的样子

- **3 个月内**：MVP 跑通，Claude Code + Cron + Manual + 一页 Dashboard，第一个 dogfooding Loop 上线
- **6 个月内**：8 个 Agent 引擎全部适配，多源 Trigger 全部上线，Skill / MCP / Memory 完整
- **9 个月内**：第一个真实用户社区（Discord / 飞书群），开始接收外部 PR
- **12 个月内**：发布 1.0，配套 GitHub Pages 文档站 + 视频教程 + 案例库

---

## 九、本文档的状态

这是 **v0.1 草案**，会随着每个 Iteration 的进展演进：

| 版本 | 触发条件 |
|---|---|
| v0.1 | Iteration 1 起草（当前） |
| v0.5 | MVP 跑通后修订 |
| v1.0 | 第一次公开发布前定稿 |

修订请走 PR，重大改动须更新 [non-goals.md](./non-goals.md)。
