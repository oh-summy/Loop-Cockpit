# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Iteration 2 MVP — 4 层自治闭环（2026-07-26）**：完成 Loop Cockpit 最小可用产品
  - **Host（Fastify + Drizzle + SQLite + node-pty）**：Blueprint CRUD、Run 生命周期（`initializing→running→evaluating→success/failed/retrying/stopped`）、PTY harness 三向扇出（WS + raw.log + ring buffer）、shell evaluator 验证、audit trail JSON 落盘、token 鉴权 + CORS 白名单、Cron/Manual/Once trigger、boot reaper
  - **Web（React + Vite + Xterm.js）**：Dashboard（实时 Run 卡片 + 统计 + 历史表格）、Blueprint 编辑器（简单/专家模式、6 -section 表单、`&&` 链成功标准生成）、Run 详情（状态 stepper + SDAF 阶段 + 实时 PTY 推流 + audit trail 下载）
  - **DB（7 张表）**：blueprints / runs / audit_events / sessions / pending_gates / memories / notifications — 启动自动建表（`initDatabase`，`CREATE TABLE IF NOT EXISTS`）
  - **MOCK_CLAUDE 模式**：不花钱跑通完整 `建 Loop → 运行 → 验证 → 落盘` 路径，便于演示和 CI
  - 一键启停：`start.sh [--mock]` / `stop.sh`；`postinstall.sh` 兜底 node-pty native binding 编译
- **文档结构重构 v1.0**（2026-06-27）：docs/ 改为 `architecture/` + `prd/` + `prototype/` 三层结构,带模板与索引
  - 删 7 个占位 README + 占位文件(原 docs/ 18 文件 2054 行 → 16 文件 ~1500 行)
  - 合并 whitepaper(214 行) → 进 `architecture/product-overview.md`
  - 新增 `docs/README.md` 文档地图 + 生命周期流程
  - 新增 `prd/_template.md`(单功能 PRD 模板) + `prd/F001-pty-runner.md`(本周完成的 PTY 功能)
  - 新增 `architecture/decisions/0002-node-pty.md`(PTY 选型 + 三坑对策)
  - ADR-0001 / 0003 砍掉"开放问题"段(违反 ADR 不可变原则) → 转存 [`notes/2026-06-27-pending-decisions.md`](notes/2026-06-27-pending-decisions.md)
  - 同步更新 AGENTS.md §4 / CONTRIBUTING.md / README.md / .github/ISSUE_TEMPLATE/feature.md 中所有 docs 路径引用
- **PTY 尖刀跑通**（2026-06-26）：spike/pty 00/01/02 全绿,验证 node-pty + claude 在 macOS x86_64 可行(拉起/捕获/收发 prompt/exit code),三个工程坑已记录(pnpm `allowBuilds` / spawn-helper 权限 / timer)
- **开发辅助**：从 [obra/superpowers](https://github.com/obra/superpowers) @ `896224c4` 引入工程方法论 skill 包
  - 用户级（不入仓库，仅 `~/.claude/skills/`）：brainstorming / writing-plans / executing-plans / test-driven-development / systematic-debugging / verification-before-completion / using-git-worktrees / requesting-code-review / receiving-code-review / finishing-a-development-branch / writing-skills / using-superpowers — 共 12 个
  - 项目级（入仓库 `.claude/skills/`）：subagent-driven-development、dispatching-parallel-agents — 作为 Loop Cockpit 产品形态（Loop 内多 step + 两阶段 review、多 Loop 并行派发）的活体参考样本，附 `_why-in-project.md` 写明边界与不修改原则
  - 决策与试用计划：`notes/2026-06-26-superpowers-bootstrap.md`
- 项目立项与基础文档骨架
- 中英双语 README
- AGENTS.md（开发期 AI 协作规则总章）+ CLAUDE.md（跳板）
- spike/ 与 notes/ 目录骨架
- .github/ Issue / PR / CI 模板
- .gitignore + .editorconfig
- spike/pty PTY 尖刀跑通:00/01/02 全绿,验证 node-pty + claude 在 macOS x86_64 可行(拉起/捕获/收发 prompt/exit code)

### Notes

- Iteration 1（Foundation）启动
- License: MIT
- 关键技术验证（PTY 尖刀）已完成:node-pty + claude 在 macOS x86_64 跑通(2026-06-26),详见 [`docs/prd/F001-pty-runner.md`](docs/prd/F001-pty-runner.md);Linux/Windows 留待 Iter 2
