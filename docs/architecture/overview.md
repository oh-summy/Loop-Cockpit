# 架构总览（Overview）

> ⚠️ 占位文件。
> 本文件**必须等 PTY 尖刀验证（Iter 1）通过后**才能写实——
> 在此之前，所有架构图都是空想。

## 当前已知（不变项）

- 本地单机部署
- Web UI + Node.js Host 双进程
- SQLite + Drizzle ORM
- 可插拔 Agent 适配层
- Git Worktree 沙箱（Iter 3+）

## 待 spike 决定的（可能改）

- node-pty 是否能稳定跨平台？
- ANSI 流转发到 Xterm 是否需要 buffer 中转层？
- Claude Code 的 `--non-interactive` 是否足以避免大部分交互式确认？

详见 [`spike/`](../../spike/) 和 [PRD](../product/prd.md)。
