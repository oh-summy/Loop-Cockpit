# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **开发辅助**：从 [obra/superpowers](https://github.com/obra/superpowers) @ `896224c4` 引入工程方法论 skill 包
  - 用户级（不入仓库，仅 `~/.claude/skills/`）：brainstorming / writing-plans / executing-plans / test-driven-development / systematic-debugging / verification-before-completion / using-git-worktrees / requesting-code-review / receiving-code-review / finishing-a-development-branch / writing-skills / using-superpowers — 共 12 个
  - 项目级（入仓库 `.claude/skills/`）：subagent-driven-development、dispatching-parallel-agents — 作为 Loop Cockpit 产品形态（Loop 内多 step + 两阶段 review、多 Loop 并行派发）的活体参考样本，附 `_why-in-project.md` 写明边界与不修改原则
  - 决策与试用计划：`notes/2026-06-26-superpowers-bootstrap.md`
- 项目立项与基础文档骨架
- 中英双语 README
- AGENTS.md（开发期 AI 协作规则总章）+ CLAUDE.md（跳板）
- docs/ 全部正式文档骨架：
  - product/{whitepaper, prd, non-goals, glossary, roadmap}.md（v0.1 草案）
  - design/{ux-flow, ui-spec, assets}.md（占位）
  - architecture/{overview, data-model, modules/, adr/}.md（占位 + 索引）
  - runtime/agent-contract.md（运行时契约草案）
- spike/ 与 notes/ 目录骨架
- .github/ Issue / PR / CI 模板
- .gitignore + .editorconfig

### Notes

- Iteration 1（Foundation）启动
- License: MIT
- 关键技术验证（PTY 尖刀）尚未开始
