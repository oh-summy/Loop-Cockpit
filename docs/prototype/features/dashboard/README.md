---
id: P003
name: dashboard
level: product
status: Exploring
related-prd: F002 + F003(总览)
related-ui-spec: docs/design/ui-spec/dashboard.md
updated: 2026-06-28
---

# Prototype · Dashboard

> Loop Cockpit 首页,Loop / Run 总览。
> 沿用 v4/v5 Linear+Warp 视觉系统。

---

## 这次原型回答什么问题

新用户登入第一屏看到什么 → 是否能在 5 秒内理解:
1. 我有哪些 Loop?(My Blueprints)
2. 现在什么在跑?(Live Runs 卡片)
3. 历史成功失败?(Recent Runs Table)
4. 有什么要我做的?(Pending Human Gates)
5. 顶部 4 卡数字总览(Loops/Runs/Success/告警)

## 怎么看

```bash
open docs/prototype/features/dashboard/index.html
```

也可从 Blueprint v5 / Run Detail v3 顶部 nav "Dashboard" 进入。

## 关键互动

- 顶部主 CTA `+ Create Blueprint` → 跳 Blueprint v5
- 4 卡 stat 显示 5/2/12/1(Live updates 模拟,实际 WS)
- Live Runs 卡片(2 张):点卡片进 Run 详情;每张含 Phase 进度条 + budget 进度条 + Stop 按钮
- Pending Human Gates 黄色高亮(Iter 5 实施),含倒计时 4:23
- Recent Runs 表格 4 行(成功/失败/成功/停止)+ 顶部 filter (All/Success/Failed/Stopped)
- My Blueprints 列表 5 项,带 Run now / Edit / 类型 chip / 上次状态

## 已落地的 UI Spec

完整每元素三维度详见 [docs/design/ui-spec/dashboard.md](../../../design/ui-spec/dashboard.md)。

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v1 | 首版,基于 dashboard.md UI Spec |
