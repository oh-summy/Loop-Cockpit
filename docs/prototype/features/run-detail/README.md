---
id: P002
name: run-detail
level: feature
status: Exploring
related-prd: F003 + F004 + F005
updated: 2026-06-28
---

# Prototype · Run 详情屏

> Loop Cockpit 的灵魂屏 — 展示 Agent 在 Xterm 里实时干活的现场。
> 沿用 v4 Blueprint 编辑器的 Linear+Warp 视觉系统。

---

## 这次原型回答什么问题

Run 详情屏(F003 + F004 + F005 三 PRD 交汇)的最佳布局:
- 实时 Xterm 流(F004 核心)
- 状态机可视化(F003 核心 7 状态)
- Token / Iteration 实时计数(F003 / F004)
- 失败时的决策面板(进 worktree / 查 diff / 看推理链 / 重跑)
- Audit trail 折叠(F005)

## 布局选择(按 brainstorming 5 决策一次拍板)

| ID | 决策 | 选定 |
|---|---|---|
| D1 | 整体布局 | **B 上下分** — 顶部 sticky 状态 + 中间 Xterm 主区 + 底部决策面板 |
| D2 | Xterm 高度 | **C 自适应** — 60vh + min-height 400px |
| D3 | 状态机表达 | **A 横向 stepper** — initializing → running → evaluating → success/failed |
| D4 | Token/Iter 位置 | **A 顶部 sticky bar** — 与 stepper 同行,全程可见 |
| D5 | 失败操作 | **B 多按钮组** — 重跑/进 worktree/查 diff/推理链/下载/升级 model |

## 怎么看

```bash
open docs/prototype/features/run-detail/index.html
```

**互动**:
- 右上 🌙/☀️ + 中/EN 切换(localStorage 持久化)
- 顶部 Stop 按钮(confirm 后注入"用户停止"日志)
- 右下"🎬 模拟失败"按钮 — 切到失败态,看 stepper 变 failed + 决策面板出现 6 个按钮
- 终端会自动滚动追加 chunk(模拟 PTY 流);"↓ Scroll" 回到底部
- 折叠区"🧠 推理链 / Tool calls" 展开看时间线

## 关键视觉(Linear + Warp 混合)

- **状态 stepper**:Linear 风格,绿/紫/红多色 token,active 状态有 pulse 动画
- **Token 实时跳动**:每 2 秒更新,monospace,绿(in)+ 黄(out)+ 紫(cost)
- **Xterm 真黑底**:#000000 (不沿用主 surface 色),mimic 真终端
- **ANSI 多色**:红/绿/黄/蓝/品红/青/灰/粗体/暗 全部支持
- **光标 ▊ 闪烁**:绿色 1s steps,标识 "live"
- **macOS 三按钮**:终端 header 红黄绿圆点 + claude pid 信息

## 已落地的 ux-flow 决策

| 决策 | 体现 |
|---|---|
| Flow 1 - 成功路径 | 状态 stepper success 末态 |
| Flow 2 - 失败 + worktree | 失败决策面板"📁 进入 worktree"按钮 |
| Flow 2 - Re-run = 新 Run | 失败面板"🔁 重跑 (新 Run)" 标 "新 Run" |
| D2.4 升级 model | 失败面板"⬆️ 升级到 Opus 重跑"(Escalate 决策点) |

## 故意未做的事

- ❌ 真 Xterm.js 集成 — 用 HTML + class 模拟,Iter 2 用真 xterm
- ❌ 真 WebSocket — 用 setInterval 模拟 chunk 推送
- ❌ Pause 按钮无效 — 提示"Iter 3 才支持 LangGraph 风格 checkpoint"
- ❌ 推理链时间戳是静态的
- ❌ 无 keyboard shortcuts 真实绑定(只是 UI hint)

## 决策吸收路径

通过后:
1. F003 PRD §6.3 加 WebSocket 协议 detail(已有)
2. F004 PRD §6.3 加 Xterm.js 集成方案
3. F005 PRD §6.1 audit-trail.json schema 加 toolCalls 时间线
4. 写 `decision.md` 闭环

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v1 | 首版,5 决策一次拍板;沿用 v4 Linear+Warp 视觉 |
