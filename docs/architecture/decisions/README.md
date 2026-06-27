# 架构决策记录 (ADR)

> 每一个**会影响未来 3 个月以上**的技术决定,必须写一份 ADR。
> 已 Accepted 的 ADR **不再修改**,要改决策就新建 ADR 标 `Superseded by ADR-<新编号>`。

新建用 [`template.md`](./template.md)。

---

## 索引

| # | 标题 | 状态 | 日期 |
|---|---|---|---|
| [0001](./0001-tech-stack.md) | 技术栈选型 | ✅ Accepted | 2026-06-28 |
| [0002](./0002-node-pty.md) | node-pty(PTY 选型 + 三坑对策) | Proposed | 2026-06-27 |
| [0003](./0003-sqlite-drizzle.md) | SQLite + Drizzle | ✅ Accepted | 2026-06-28 |
| 0004 | Worktree 隔离 | _计划 Iter 3_ | - |
| 0005 | Trigger 事件总线 | _计划 Iter 4_ | - |
| 0006 | _保留:Agenda 降级时使用_ | - | - |

---

## 状态约定

| 状态 | 含义 |
|---|---|
| **Proposed** | 草稿,讨论中 |
| **Accepted** | 已采纳并执行 |
| **Superseded by ADR-<N>** | 被新 ADR 取代,本文件不再生效但保留作历史 |
| **Deprecated** | 决策本身废弃,但未由新 ADR 取代 |

## 文件名规范

`NNNN-kebab-case-topic.md`,如 `0002-node-pty.md`。
编号单调递增,作废的 ADR 不重用编号。

## 待答开放问题

ADR-0001 / 0003 的"开放问题"已转存到 [notes/2026-06-27-pending-decisions.md](../../../notes/2026-06-27-pending-decisions.md),答完后会回填到对应 ADR。
