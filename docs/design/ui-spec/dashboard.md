---
title: Dashboard UI Spec
status: Draft
related-prd: F002 + F003(总览)
related-prototype: prototype/features/dashboard/ (待写)
updated: 2026-06-28
---

# Dashboard UI Spec

> Loop Cockpit 首页 — Loop / Run 总览,实时状态卡片,告警通知。
> 每个区域 / 按钮 / 字段三维度。

---

## 1. 页面定位

打开 Loop Cockpit 看到的第一屏。回答:
- 我有哪些 Loop?
- 现在什么在跑?
- 今天/本周有什么完成了/失败了?
- 有什么 Human Gate 在等我审?

路由:`/` (默认) / `/dashboard`

---

## 2. 整体布局

```
┌────────────────────────────────────────────────────────────┐
│ Navbar (sticky)                                             │
├────────────────────────────────────────────────────────────┤
│ Top Stats(4 卡)                                            │
│  [Loops 活跃: 5] [Run 在跑: 2] [今日成功: 12] [告警: 1]    │
├────────────────────────────────────────────────────────────┤
│ Hero / Empty State                                          │
│  + Create Blueprint  按钮(空态时占主体)                   │
├────────────────────────────────────────────────────────────┤
│ Live Runs(进行中卡片网格)                                  │
│  每卡:Goal 摘要 · Phase 进度条 · 已运行时间 · token cost │
├────────────────────────────────────────────────────────────┤
│ Pending Human Gates(Iter 5)                                │
│  每行:Run · Gate 触发原因 · [批准] [拒绝]                  │
├────────────────────────────────────────────────────────────┤
│ Recent Runs(历史,前 20 条)                                │
│  Table: Run ID · Blueprint · Trigger · Status · Cost · Duration · 时间│
├────────────────────────────────────────────────────────────┤
│ My Blueprints(列表)                                        │
│  每行:objective 摘要 · Type chips · Trigger · 上次 Run    │
│         · 操作(Run now / Edit / Delete)                   │
├────────────────────────────────────────────────────────────┤
│ Footer                                                      │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Navbar
同 Blueprint 编辑器。当前页 active = Dashboard。

---

## 4. Top Stats(4 卡)

### Loops 活跃数
| 维度 | 内容 |
|---|---|
| 干什么 | 显示 status=active 的 Blueprint 数量 |
| 点击 | navigate `/blueprints` 列表 |
| 后端 | `GET /api/blueprints?status=active` 取 count |

### Run 在跑数
| 维度 | 内容 |
|---|---|
| 干什么 | 显示当前 status in ('initializing','running','evaluating','retrying') 的 Run 数 |
| 客户端 | WS 订阅 `state-change` 事件实时更新 |
| 后端 | `GET /api/runs?status=in_progress` |

### 今日成功数
| 维度 | 内容 |
|---|---|
| 干什么 | 显示当日完成且 status=success 的 Run 数 |
| 后端 | `GET /api/runs?status=success&endedAt>=今日0点` |

### 告警数
| 维度 | 内容 |
|---|---|
| 干什么 | 显示 failed + needs-human + budget-warning 的总数 |
| 点击 | 滚到 "Pending Gates" / "Recent Runs" 失败行 |
| 后端 | 多个 endpoint 合并查 |

---

## 5. Hero / Empty State

### 空态(用户从无 Blueprint)
| 元素 | 内容 |
|---|---|
| 大插画 | 简单 SVG / emoji 引导(loop-anatomy.md 8 层图缩略) |
| 标题 | "创建你的第一个 Loop" |
| `+ Create Blueprint` 按钮(主 CTA) | 点击 navigate `/blueprints/new` |
| `📚 看示例 Loops` 链接(次 CTA) | open loop-anatomy.md 内置示例(预设模板) |

### 非空态
4 卡 + 列表正常显示,Hero 区缩成顶部 banner。

---

## 6. Live Runs(进行中卡片)

### 每张 Run 卡
| 元素 | 干什么 | 后端 |
|---|---|---|
| Goal 摘要(objective 截断 60 字) | 显示 Loop 在干啥 | runs.blueprintSnapshot.goal.objective |
| Phase 进度条 | 与 Run 详情屏一致,但缩小 | runs.currentPhaseId + phaseHistory |
| 状态 token (running/evaluating/...) | 状态机当前态,有 pulse | runs.status |
| Elapsed 时间 | 实时已运行时间 | runs.startedAt + setInterval |
| Token cost / budget | 进度条形式显示 | runs.budgetUsage / blueprintSnapshot.goal.budget |
| 操作 | 点卡片 navigate `/runs/:id`;`Stop` 小按钮直接停 | F003 stop API |

### Live 更新
| 维度 | 内容 |
|---|---|
| 客户端 | WS `/api/dashboard/live` 订阅 — 收到事件刷新对应卡 |
| 后端 | 多 Run 状态合并广播 |

---

## 7. Pending Human Gates(Iter 5)

### 每行
| 元素 | 干什么 | 后端 |
|---|---|---|
| Run 链接 | navigate `/runs/:id` | runs.id |
| Gate 触发原因 | "on-failure" / "on-budget-warning" / "custom" | humanGateHistory[].triggeredBy |
| 倒计时(default-reject 模式) | 显示剩余时间,超时按 timeoutAction | F010 |
| `✓ 批准` 按钮 | F010 `POST /api/gates/:id/approve` | - |
| `✗ 拒绝` 按钮 | F010 `POST /api/gates/:id/reject` | - |
| `查看详情` 链接 | navigate `/runs/:id` 看完整上下文 | - |

---

## 8. Recent Runs Table

### 列定义
| 列 | 干什么 | 后端 |
|---|---|---|
| Status icon | 成功 ✓ / 失败 ✗ / stopped ⏹ / 进行中 ●(pulse)| runs.status |
| Run ID | mono 字体 nanoid;点击 navigate `/runs/:id` | runs.id |
| Blueprint | objective 摘要 + Type chip | runs.blueprintSnapshot.goal.objective + .type |
| Trigger | 触发方式 icon + 详情(Manual / Cron expr / Webhook / ...) | runs.triggerContext |
| Cost | $0.XX,撞预算变黄/红 | runs.budgetUsage.tokensUsedUsd |
| Duration | mm:ss 或 hh:mm | endedAt - startedAt |
| 时间 | 相对时间(2 分钟前 / 1 小时前 / 昨天 14:30) | runs.endedAt |
| 行 hover | 显示 quick actions:重跑 / 查看 / 下载 audit | - |

### 排序 / 过滤
- 默认按 endedAt desc
- 顶部过滤栏:`[All] [Success] [Failed] [Stopped]` + Blueprint 下拉 + 时间范围

---

## 9. My Blueprints(列表)

### 每行
| 元素 | 干什么 | 后端 |
|---|---|---|
| objective 摘要 | 显示 + Type chips | blueprints.goal.objective + .type |
| Trigger 显示 | "Cron · 每天 09:00" 或 "Manual" | blueprints.triggers[] |
| 上次 Run | 时间 + 状态 icon(▸ 成功 / ✗ 失败) | latest run for this blueprintId |
| Run now 按钮 | 点击立即触发 Run | `POST /api/runs body={blueprintId}` |
| Edit 链接 | navigate `/blueprints/:id/edit` | - |
| Delete 按钮 | confirm → `DELETE /api/blueprints/:id` | - |

### `+ New Blueprint` 按钮
列表顶部右侧,常驻 CTA → navigate `/blueprints/new`。

---

## 10. 键盘快捷键

| Key | 动作 |
|---|---|
| `N` | 新建 Blueprint(navigate /blueprints/new) |
| `B` | 切到 Blueprints 列表 |
| `R` | 切到 Runs 列表 |
| `/` | 聚焦搜索框 |
| `g d` | 回 Dashboard(vim-style chord) |

---

## 11. 边缘情况

- **空态**:无 Blueprint 时 Hero CTA 占主体,4 卡都显示 0
- **无在跑 Run**:Live Runs 区显示 "暂无进行中 Loop"
- **数据加载**:每区独立 skeleton
- **WS 断连**:Top Stats 显示 "重连中" + 红点

---

## 12. 关联

- PRD: F002 / F003
- ADR: [ADR-0010](../../architecture/decisions/0010-autonomous-loop-architecture.md)
- 原型: 待新建 `docs/prototype/features/dashboard/`

## 13. 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 首版,基于 8 层架构 |
