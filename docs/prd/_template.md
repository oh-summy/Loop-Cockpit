---
id: F<NNN>
title: <功能短标题>
status: Draft
priority: P0
iteration: Iter <N>
issue: <github issue url>
owner: "@oh-summy"
updated: YYYY-MM-DD
---

# F<NNN> · <功能标题>

## 1. 一句话

<这个功能让用户能做什么，一行写完>

## 2. 目标 (Why)

<解决什么问题，达到什么效果>

## 3. 范围

### In Scope
- ...

### Out of Scope（本期不做）
- ...

## 4. 用户故事 / Use Cases

- 作为 <角色>，我想 <做什么>，以便 <目的>。
- ...

## 5. 关联资源

| 类型 | 资源 | 说明 |
|---|---|---|
| 架构参考 | [overview.md](../architecture/overview.md) §X | 本功能依赖的架构层 |
| ADR | [decisions/<NNNN>-<slug>](../architecture/decisions/) | 关键技术决策 |
| 原型 | [prototype/<level>/<name>](../prototype/) | UI 视觉决策 |
| 复用模块 | `apps/host/src/<module>/` | 已实现的模块 |
| GitHub Issue | #X, #Y | 实施跟踪 |
| Spike | `spike/<topic>/` | 技术验证(如有) |

## 6. 数据契约 / 接口

<API 路径、数据模型字段、状态机 — 写契约，不是实现>

## 7. 验收标准 (Done Criteria)

- [ ] <可机器验证的条件>
- [ ] <可机器验证的条件>

## 8. 非功能约束

- 性能: ...
- 安全: ...
- 兼容: ...

## 9. 开放问题

- ...

## 10. 变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| YYYY-MM-DD | v0.1 | 首版 |
