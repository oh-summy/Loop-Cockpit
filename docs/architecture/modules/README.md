# 架构模块文档

按 PRD 中的模块拆分，每个 P0/P1 模块一份。

| 文件 | 模块 | 优先级 | 状态 |
|---|---|---|---|
| `pty.md` | PTY Harness | 🔴 P0 | 占位 |
| `adapter.md` | Agent 适配层 | 🔴 P0 | 占位 |
| `runner.md` | Run 状态机 | 🔴 P0 | 占位 |
| `worktree.md` | Git Worktree 沙箱 | 🟡 P1 | 占位 |
| `scheduler.md` | Scheduler & Trigger 总线 | 🔴 P0（设计） | 占位 |
| `memory.md` | Memory 系统 | 🟢 P2 | 占位 |
| `audit.md` | 可审计性 | 🔴 P0 | 占位 |
| `channels.md` | Channel Hub | 🟡 P1 | 占位 |
| `skill-mcp.md` | Skill / MCP 配置 | 🟡 P1 | 占位 |

> 占位文件将按 Iteration 顺序逐一写实。改架构必须先 ADR。
