# PRD 索引

> 每个功能一份 PRD，单文件，按编号滚动追加。新建用 [`_template.md`](_template.md)。

---

## 当前 PRDs

| ID | 标题 | 层 | 状态 | 优先级 | Iter | Issue |
|---|---|---|---|---|---|---|
| F001 | [PTY Runner](F001-pty-runner.md) | 基础 | Done | P0 | 1 | [#1](https://github.com/oh-summy/Loop-Cockpit/issues/1) ✓ |
| F002 | [Blueprint 编辑器 + 8 层配置](F002-blueprint-editor.md) | UI | Draft v0.4 | P0 | 2 | _TBD_ |
| F003 | [Run 状态机 + Round 推进](F003-run-state-machine.md) | 控制 | Draft v0.3 | P0 | 2 | _TBD_ |
| F004 | [Claude Code Adapter + 编排](F004-claude-adapter.md) | L4+L5+L6 | Draft v0.3 | P0 | 2 | _TBD_ |
| F005 | [Audit Trail(8 层 trace)](F005-audit-trail.md) | 审计 | Draft v0.2 | P0 | 2 | _TBD_ |
| F006 | [Planner(规划器)](F006-planner.md) | L2 | Skeleton | P0 | 3 | - |
| F007 | [Context Builder(差异化★)](F007-context-builder.md) | L3 | Skeleton | P0 | 4 | - |
| F008 | [Verification(验证器)](F008-verification.md) | L7 | Skeleton | P0 | 2+5 | - |
| F009 | [Memory(状态/经验)](F009-memory.md) | L8 | Skeleton | P0 | 2+5 | - |
| F010 | [Human Gate(人在环)](F010-human-gate.md) | 横切 | Skeleton | P1 | 5 | - |
| F011 | [Reflection / Retry](F011-reflection.md) | 横切 | Skeleton | P1 | 3 | - |

8 层架构参考:[ADR-0010](../architecture/decisions/0010-autonomous-loop-architecture.md) + [loop-anatomy.md](../architecture/loop-anatomy.md)

## 状态说明

| 状态 | 含义 |
|---|---|
| **Draft** | 在写，未审批 |
| **Approved** | 已审批，等开工 |
| **In-Progress** | 正在实施 |
| **Done** | 已完成并验证 |
| **Deprecated** | 废弃 |

## 编号约定

- `F<NNN>-<slug>.md`，三位数字 + kebab-case slug
- 编号单调递增，废弃的功能保留编号不重用
- 一份 PRD ≈ 1-2 周工作量，太大拆分，太小合并

## 命名示例

```
F001-pty-runner.md         # 单功能
F002-blueprint-editor.md
F003-run-state-machine.md
```
