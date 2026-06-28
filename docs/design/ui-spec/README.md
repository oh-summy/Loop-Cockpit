# UI Spec 索引

> **每个屏一份 UI Spec**,描述每个区域 / 按钮 / 字段的:
> - **干什么(语义)** — 在产品中起什么作用
> - **点击/填写后发生什么(交互)** — 客户端立即行为
> - **后端如何生效(数据)** — 后端处理 + 对应 PRD 字段

---

## 当前 UI Spec

| 屏 | 文档 | 对应 PRD | 对应原型 |
|---|---|---|---|
| Blueprint 编辑器 | [blueprint-editor.md](./blueprint-editor.md) | F002 | [v4 HTML](../../prototype/features/blueprint-editor/) → v5 待写 |
| Run 详情 | [run-detail.md](./run-detail.md) | F003 + F004 + F005 | [P002 v2 HTML](../../prototype/features/run-detail/) → v3 待写 |
| Dashboard | [dashboard.md](./dashboard.md) | F002+F003(总览) | 新建,无原型 |

## 模板

每屏 UI Spec 标准章节:
1. **页面定位** — 这屏在产品中干啥
2. **整体布局** — 区域划分图
3. **顶部 / Header** — 每个元素三维度
4. **主区 / 中间** — 每个元素三维度
5. **底部 / Footer** — 每个元素三维度
6. **模态 / 弹窗** — 每个元素三维度
7. **键盘快捷键** — 全部 hotkey
8. **响应式 / 边缘情况** — 加载态 / 空态 / 错误态
9. **可访问性** — ARIA / 键盘导航
10. **关联** — 链 PRD / 原型 / ADR

## 元素三维度模板

```markdown
### <元素名>

| 维度 | 内容 |
|---|---|
| **干什么** | 这个元素在产品中起的作用,用一句话说清 |
| **点击/填写后发生啥** | 客户端立即反应:UI 状态变化、表单值、动画、navigation |
| **后端如何生效** | API endpoint、对应 PRD 字段、DB schema 字段、文件落盘 |
```

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 首版,建目录 + 索引 + 模板 |
