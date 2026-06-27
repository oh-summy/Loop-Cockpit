<div align="center">

# 🚀 Loop Cockpit

**Stop writing prompts. Start designing loops.**

A local-first, solo-developer-friendly Loop Engineering control cockpit.

[English](./README.md) · [简体中文](./README.zh-CN.md) · [Product Overview](./docs/architecture/product-overview.md) · [Roadmap](./docs/roadmap.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Status](https://img.shields.io/badge/Status-Planning-orange.svg)](#status)
[![Stage](https://img.shields.io/badge/Stage-Iteration%201-blue.svg)](./docs/roadmap.md)

</div>

---

## What is it

**Loop Cockpit** is a **local-first**, **solo-developer-friendly** **Loop Engineering control cockpit**.

Launch it on your machine and a browser-based web app opens automatically. Instead of writing prompts, you **design Loops**: define a Goal and a Done Criteria, then let agents iterate autonomously in a sandbox until completion.

## Why

As of June 2026, the industry is shifting from **Prompt Engineering** to **Loop Engineering**. Existing tools are either cloud SaaS, command-line agents, or enterprise ops platforms — **none of them is "a local, visual Loop designer for solo developers"**. Loop Cockpit fills this gap.

## Core capabilities

- 🎯 **Multi-Loop management** — design, schedule, and monitor multiple loops in one cockpit
- 🧰 **Skill / MCP configuration** — visually attach skill packs and MCP servers
- 💬 **Prompt control** — each Loop carries its own system prompt template
- ✅ **Goal management** — Goal + Done Criteria anchor the loop, auto-evaluation built-in
- 📜 **Auditable process & results** — full logs, reasoning trail, token accounting
- 🛡 **Sandboxed execution** — each Loop runs in an isolated Git worktree
- 📦 **Project / task dual axis** — bind a Loop to a Git repo, iterate per task
- ⏰ **Multi-source triggers** — Cron, manual, webhooks, Git PR / Issue events, email, Lark messages…
- 🔌 **Pluggable agents** — Claude Code first; OpenCode / Kimi Code / Codex / Trae / Qwen Code / MiniMax Code planned

## Status

🚧 **Planning · Iteration 1 (Foundation)** — product definition, prototype, and technical spike in progress.
No runnable code yet. Track progress via the [Roadmap](./docs/roadmap.md).

## Quick start (placeholder)

```bash
# Not released yet. A working command will appear here after Iteration 2.
npx loop-cockpit start   # planned
```

## Docs

| Category | Docs |
|---|---|
| Entry | [docs/README.md](./docs/README.md) |
| Architecture | [Product overview](./docs/architecture/product-overview.md) · [System overview](./docs/architecture/overview.md) · [Non-goals](./docs/architecture/non-goals.md) · [Glossary](./docs/architecture/glossary.md) · [ADR](./docs/architecture/decisions/) |
| Feature PRDs | [PRD index](./docs/prd/) · [F001 PTY Runner](./docs/prd/F001-pty-runner.md) |
| Prototype | [Prototype library](./docs/prototype/) |
| Roadmap | [roadmap.md](./docs/roadmap.md) |
| AI collab | [AGENTS.md](./AGENTS.md) |

## Contributing

This is an **indie project** maintained by [@oh-summy](https://github.com/oh-summy).
- 💡 Ideas / feedback: open an issue
- 🐛 Docs typos: send a PR
- 🤝 Want to collaborate: drop a note in Discussions

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE)

---

**中文版本** → [README.zh-CN.md](./README.zh-CN.md)
