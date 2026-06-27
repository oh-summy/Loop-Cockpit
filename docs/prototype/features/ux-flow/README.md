---
id: P000
name: ux-flow
level: feature
status: Decided
related-prd: 多个(F002 Blueprint Editor / F003 Run Detail 待建)
updated: 2026-06-28
---

# Prototype · UX Flow (5 个核心用户流程)

> 这是 **流程级原型框架**——只列流程骨架与关键决策点,**不含原型图**。
> 原型图等周末出第一版 UI 时补到 `prototype/features/<具体功能>/variants/`。
> 来源:PRD §J + roadmap 推断。

---

## Flow 1 · 首次启动 → 创建第一个 Blueprint → 手动运行

**触发**:用户首次启 `loop-cockpit`,浏览器开 localhost。

**关键步骤**:
1. Empty Dashboard,引导"创建你的第一个 Loop"
2. 进 Blueprint 编辑器 → 填 Name / Goal / Done Criteria / Agent / Project path / Retry policy
3. 保存 → "Run now" → 跳到 Run 详情(实时 Xterm 流)
4. Agent 跑完 → 自动评估 Done Criteria
5. 成功 = 绿 banner + token/cost;失败 = 红 banner + "重试 / 进 worktree / 查推理链"

**关键决策点**:
- **D1.1** · 首次启动要不要"Claude Code 路径"向导? → AI 倾向有(允许 skip,用 `which claude` 探测) · ✅ 已定 (2026-06-28)
- **D1.2** · 手动运行要不要弹"危险操作确认"? → AI 倾向不弹(信任用户配的 Done Criteria) · ✅ 已定 (2026-06-28)
- **D1.3** · Done Criteria 编辑器要"试跑"按钮(不启 Agent,只跑 Criteria)? → **AI 强烈建议有**,onboarding 体验关键 · ✅ 已定 (2026-06-28)

**对应模块**:Blueprint CRUD (A) / Run 状态机 (B) / Adapter (C) / PTY (D)

---

## Flow 2 · Cron 触发 → Run 失败 → 查看 Worktree 现场

**触发**:Cron `0 9 * * *` 到点启 Run,Done Criteria 失败。

**关键步骤**:
1. 用户中午回来,Dashboard 看到红徽章 "1 failed run @ 09:00"
2. 进 Run 详情 → Xterm 回放 + 推理链 + Done Criteria 结果
3. "Open worktree in terminal" → 一键启 iTerm 跳过去
4. 用户在 worktree 改 Skill / prompt → 回 UI "Re-run with current changes"

**关键决策点**:
- **D2.1** · Worktree 失败保留多久?满盘怎办? → AI 倾向永久保留 + "Clear successful worktrees" 按钮;Iter 5+ 再做容量告警 · ✅ 已定 (2026-06-28)
- **D2.2** · 失败 Run 自动 retry 还是人工? → AI 倾向按 retryPolicy 自动重试 N 次,UI 标"已自动重试 N 次" · ✅ 已定 (2026-06-28)
- **D2.3** · worktree 默认 `~/.loop-cockpit/workspaces/<runId>/` 还是允许用户自配? → AI 倾向前者 + settings 可覆盖 · ✅ 已定 (2026-06-28)
- **D2.4** · "Re-run with current changes" 是 amend 还是开新 Run? → **AI 强建议开新 Run**(审计性优先),UI 标"延续自 #N" · ✅ 已定 (2026-06-28)

**对应模块**:Run 状态机 (B) / Worktree (E) / Trigger Cron (G)

---

## Flow 3 · Run 成功 → 通知到飞书 → 用户查看审计 Trail

**触发**:Run 成功完成(Iter 6 起含 Channel)。

**关键步骤**:
1. Agent exit + Done Criteria pass
2. 飞书机器人推卡片(Loop 名 / 时长 / token / 跳转链接)
3. 用户点链接 → Run 详情 → 推理链 / token 流水 / worktree diff

**关键决策点**:
- **D3.1** · 通知卡片含哪些字段? → AI 倾向 Loop 名 + 时长 + 迭代次数 + token + 状态 + URL · ✅ 已定 (2026-06-28)
- **D3.2** · 成功通知发不发?(失败必发) → AI 倾向 Blueprint 配置(default off) · ✅ 已定 (2026-06-28)

**对应模块**:Channel Hub (I) / Audit (K)

---

## Flow 4 · 多 Loop 并行 → Dashboard 看实时状态

**触发**:同时有 2+ Run 在跑(Iter 3 起)。

**关键步骤**:
1. Dashboard 显示并行 Run 卡片(状态机当前位置 / 已跑时长 / token / 进度条)
2. 实时刷新(WebSocket)
3. 点任一 → 进 Run 详情

**关键决策点**:
- **D4.1** · 默认并发上限多少? → AI 倾向 2(macOS 单机够用,可在 settings 调) · ✅ 已定 (2026-06-28)
- **D4.2** · 并发触达上限,新 Run 怎办? → AI 倾向 queue + UI 标 "queued, 1 ahead" · ✅ 已定 (2026-06-28)

**对应模块**:Run 状态机 (B) / Dispatcher (G3)

---

## Flow 5 · 修改 Blueprint → 历史 Run 不受影响

**触发**:用户改了 Blueprint(改 Goal / Done Criteria / Retry policy)。

**关键步骤**:
1. 进 Blueprint 编辑器,改字段
2. 保存 → 自动版本化(Iter 5+ 加 version 字段)或直接覆盖(Iter 2-4)
3. 历史 Run 显示"基于版本 N"
4. 新 Run 用新版本

**关键决策点**:
- **D5.1** · Blueprint 改保存 = 自动版本化? → **AI 强建议是**(审计性),Iter 5 起做;Iter 2-4 直接覆盖,UI 警告"将影响后续所有 Run" · ✅ 已定 (2026-06-28)
- **D5.2** · 历史 Run 保存"当时 Blueprint 快照"还是只存 BlueprintId? → AI 倾向快照(audit-trail.json 里),牺牲存储换可审计 · ✅ 已定 (2026-06-28)

**对应模块**:Blueprint (A) / Audit (K)

---

## 横向决策点(影响所有 Flow)

| ID | 决策 | AI 建议 | 你的决定 |
|---|---|---|---|
| **H1** | 暗色/亮色默认? | 暗色(独立开发者偏好,Xterm 暗色更协调) | ✅ 接受 AI 建议 |
| **H2** | 中文 / 英文默认 UI? | 中文(主要用户群)+ 英文切换 | ✅ 接受 AI 建议 |
| **H3** | Onboarding 是否强制走完? | 否,所有提示可 skip | ✅ 接受 AI 建议 |
| **H4** | Empty state 引导卡片样式 | 大插画 + 1 个主 CTA + 1 个次 CTA | ✅ 接受 AI 建议 |
| **H5** | 上 Tailwind 还是手写 CSS? | **Tailwind**(本地工具不需要主题切换 / 多端,Tailwind 开发速度优先) | ✅ 接受 AI 建议 |

---

## 流程之外不做的事(见 [non-goals.md](../../../architecture/non-goals.md))

- ❌ 多用户 / 权限 / 团队空间
- ❌ 云同步 / 远程访问
- ❌ Loop 模板市场

---

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-26 | v0.1 | 首版,5 流程 + 17 决策点 |
| 2026-06-27 | v0.2 | 砍冗余啰嗦段,聚焦决策点;迁到 prototype/features/ux-flow/ |
| 2026-06-28 | v1.0 | **Decided**:全部 13 个 D 决策点 + 5 个 H 横向决策按 AI 建议一次性拍板 |
