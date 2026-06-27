<div align="center">

# 🚀 Loop Cockpit

**Stop writing prompts. Start designing loops.**

Loop Engineering 的本地可视化控制驾驶舱 · Local visual control cockpit for Loop Engineering

[简体中文](#-简体中文) · [English](#-english) · [产品总览](./docs/architecture/product-overview.md) · [路线图](./docs/roadmap.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Status](https://img.shields.io/badge/Status-Planning-orange.svg)](#当前状态)
[![Stage](https://img.shields.io/badge/Stage-Iteration%201-blue.svg)](./docs/roadmap.md)

</div>

---

## 🇨🇳 简体中文

### 是什么

**Loop Cockpit** 是一个**本地运行**的、**面向独立开发者**的 **Loop Engineering 控制驾驶舱**。

在你启动它的环境里，浏览器自动打开一个 Web 应用——你不再手写提示词，而是**设计 Loop**：
定义目标（Goal）、定义完成标准（Done Criteria），剩下的让 Agent 在沙箱里自主循环到达成为止。

### 为什么需要它

2026 年 6 月，行业范式正在从 **Prompt Engineering** 转向 **Loop Engineering**。
但现有的工具要么是云端 SaaS、要么是命令行 Agent、要么是企业级运维平台——
**缺一个"独立开发者本地可视化设计 Loop"的工具**。Loop Cockpit 来补这个空缺。

### 核心能力

- 🎯 **多 Loop 管理**：一个工作台同时设计、调度、监控多个 Loop
- 🧰 **Skill / MCP 配置**：可视化挂载技能包与 MCP 服务器
- 💬 **提示词控制**：每个 Loop 可定义自己的 system prompt 模板
- ✅ **目标管理**：Goal + Done Criteria 双向锚定，自动验收
- 📜 **过程与结果可审计**：全量日志、推理链、token 流水
- 🛡 **沙箱运行**：每个 Loop 在独立 Git Worktree 中执行，互不污染
- 📦 **项目/任务双维度**：可绑定指定 git 项目，可针对特定任务迭代
- ⏰ **多源触发器**：Cron 定时、手动、Webhook、Git PR、Issue、邮件、飞书消息……
- 🔌 **Agent 可插拔**：MVP 优先 Claude Code，后续支持 OpenCode / Kimi Code / Codex / Trae / Qwen Code / MiniMax Code 等

### 当前状态

🚧 **Planning · Iteration 1 (Foundation)** —— 正在做产品定义、原型、技术尖刀验证。
代码还没开始写，欢迎围观 [路线图](./docs/roadmap.md) 与 [产品总览](./docs/architecture/product-overview.md)。

### 快速开始（占位）

```bash
# 还没发布。等 Iteration 2 完成后会在这里放可运行命令。
npx loop-cockpit start   # 计划中
```

### 文档地图

| 类目 | 文档 |
|---|---|
| 入口 | [docs/README.md](./docs/README.md) |
| 架构 | [产品总览](./docs/architecture/product-overview.md) · [系统总览](./docs/architecture/overview.md) · [非目标](./docs/architecture/non-goals.md) · [术语](./docs/architecture/glossary.md) · [ADR](./docs/architecture/decisions/) |
| 功能 PRD | [PRD 索引](./docs/prd/) · [F001 PTY Runner](./docs/prd/F001-pty-runner.md) |
| 原型 | [Prototype 库](./docs/prototype/) |
| 路线图 | [roadmap.md](./docs/roadmap.md) |
| AI 协作 | [AGENTS.md](./AGENTS.md) |

### 参与

这是一个**独立开发者项目**，目前由 [@oh-summy](https://github.com/oh-summy) 维护。
- 💡 想法和反馈：开 Issue
- 🐛 文档错漏：直接 PR
- 🤝 想协作：欢迎在 Discussions 留言

### License

[MIT](./LICENSE)

---

## 🇬🇧 English

### What is it

**Loop Cockpit** is a **local-first**, **solo-developer-friendly** **Loop Engineering control cockpit**.

It opens a browser-based web app on the machine you launch it from. Instead of writing prompts,
you **design Loops**: define a Goal and Done Criteria, then let agents iterate autonomously in a
sandbox until completion.

### Why

As of June 2026, the industry is shifting from **Prompt Engineering** to **Loop Engineering**.
Existing tools are either cloud SaaS, command-line agents, or enterprise ops platforms —
**none of them is "a local, visual Loop designer for solo developers"**. Loop Cockpit fills this gap.

### Core capabilities

- 🎯 **Multi-Loop management** — design, schedule, and monitor multiple loops in one cockpit
- 🧰 **Skill / MCP configuration** — visually attach skill packs and MCP servers
- 💬 **Prompt control** — each Loop carries its own system prompt template
- ✅ **Goal management** — Goal + Done Criteria anchor the loop, auto-evaluation built-in
- 📜 **Auditable process & results** — full logs, reasoning trail, token accounting
- 🛡 **Sandboxed execution** — each Loop runs in an isolated Git worktree
- 📦 **Project / task dual axis** — bind a Loop to a Git repo, iterate per task
- ⏰ **Multi-source triggers** — Cron, manual, webhooks, Git PR / Issue events, email, Lark messages…
- 🔌 **Pluggable agents** — Claude Code first; OpenCode / Kimi Code / Codex / Trae / Qwen Code / MiniMax Code planned

### Status

🚧 **Planning · Iteration 1 (Foundation)** — product definition, prototype, and technical spike in progress.
No runnable code yet. Track progress via the [Roadmap](./docs/roadmap.md).

### Quick start (placeholder)

```bash
# Not released yet. A working command will appear here after Iteration 2.
npx loop-cockpit start   # planned
```

### Docs

| Category | Docs |
|---|---|
| Entry | [docs/README.md](./docs/README.md) |
| Architecture | [Product overview](./docs/architecture/product-overview.md) · [System overview](./docs/architecture/overview.md) · [Non-goals](./docs/architecture/non-goals.md) · [Glossary](./docs/architecture/glossary.md) · [ADR](./docs/architecture/decisions/) |
| Feature PRDs | [PRD index](./docs/prd/) · [F001 PTY Runner](./docs/prd/F001-pty-runner.md) |
| Prototype | [Prototype library](./docs/prototype/) |
| Roadmap | [roadmap.md](./docs/roadmap.md) |
| AI collab | [AGENTS.md](./AGENTS.md) |

### Contributing

This is an **indie project** maintained by [@oh-summy](https://github.com/oh-summy).
- 💡 Ideas / feedback: open an issue
- 🐛 Docs typos: send a PR
- 🤝 Want to collaborate: drop a note in Discussions

### License

[MIT](./LICENSE)
