# PRD 索引

> 每个功能一份 PRD，单文件，按编号滚动追加。新建用 [`_template.md`](_template.md)。

---

## 当前 PRDs

| ID | 标题 | 状态 | 优先级 | Iter | Issue |
|---|---|---|---|---|---|
| F001 | [PTY Runner](F001-pty-runner.md) | Done | P0 | 1 | [#1](https://github.com/oh-summy/Loop-Cockpit/issues/1) |

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
