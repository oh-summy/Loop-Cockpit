# Prototype 原型库

> 按层级分类。原型代码"答完即删"，这里只留 **问题 + 变体快照 + 决策**。
> 工作流详见 [prototype skill](file://~/.claude/skills/prototype/SKILL.md)。

---

## 层级说明

| 层级 | 颗粒度 | 例子 |
|---|---|---|
| `features/` | 完整功能流程（端到端用户路径） | Blueprint 编辑器创建流程 |
| `components/` | 单个 UI 组件（可复用） | Xterm 终端组件、状态机可视化 |
| `product/` | 产品全貌（整站点导航、视觉风格） | Dashboard 总览、品牌色板 |

## features/

| 原型 | 状态 | 关联 PRD |
|---|---|---|
| [blueprint-editor](features/blueprint-editor/) (v4) | Exploring | F002 |
| [blueprint-editor v5](features/blueprint-editor/v5/) | ★ Exploring | F002 v0.4(8 层) |
| [run-detail](features/run-detail/) (v2) | Exploring | F003 + F004 + F005 |
| [run-detail v3](features/run-detail/v3/) | ★ Exploring | F003 v0.3 + 8 层运行时微缩 |
| [ux-flow](features/ux-flow/) | Decided | 多个 |

## product/

| 原型 | 状态 | 关联 PRD |
|---|---|---|
| [dashboard](features/dashboard/) | ★ Exploring | F002 + F003(总览) |

## components/

| 原型 | 状态 | 关联 PRD |
|---|---|---|
| _(空)_ | - | - |

## product/

| 原型 | 状态 | 关联 PRD |
|---|---|---|
| _(空)_ | - | - |

---

## 状态说明

| 状态 | 含义 |
|---|---|
| **Exploring** | 正在出变体、收集反馈 |
| **Decided** | 已选定变体，决策吸收回 PRD |
| **Archived** | 不再使用，仅供历史参考 |

## 新建原型

1. 调用 `prototype` skill 启动
2. 在 `prototype/<level>/<name>/` 建目录,带 README.md + variants/ + decision.md
3. README.md 写"这次回答什么问题"
4. variants/ 放变体截图或代码
5. 你审批后，写 decision.md，更新关联 PRD 的"关联资源 → 原型"链接

## 原型代码处置

prototype skill 的核心原则:**答完即删**。

- 临时代码放 `spike/prototype-<name>/` 或 `apps/web/prototype/`
- 决策吸收回 PRD 后，删原型代码
- 留下来的只有 `prototype/<level>/<name>/` 里的快照 + decision.md
