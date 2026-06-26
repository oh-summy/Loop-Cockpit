# UX Flow（交互流程）

> **版本**：v0.1（大纲）
> **日期**：2026-06-26
> **状态**：⚠️ 草稿 —— 这一版只列流程**框架**与决策点，**不含原型图**。
> 原型图等维护者本周末 PTY spike 之后、下周开干设计 issue 时补。
>
> 配套 Issue：[#3 画核心 5 屏原型图](https://github.com/oh-summy/Loop-Cockpit/issues/3) · [#4 写实 ux-flow.md 与 ui-spec.md](https://github.com/oh-summy/Loop-Cockpit/issues/4)

---

## 五个核心用户流程

按 PRD §J 与 roadmap 推断而来。每条流程列：**触发**、**关键步骤**、**关键决策点**、**对应模块**。

---

### Flow 1 · 首次启动 → 创建第一个 Blueprint → 手动运行

**触发**：用户首次 `pnpm dev`（或将来 `loop-cockpit start`），浏览器打开 localhost。

**步骤**：

1. 看到 Empty Dashboard，引导卡片"创建你的第一个 Loop"
2. 点击进入 Blueprint 编辑器（`/blueprints/new`）
3. 填字段：
   - **Name**（必填）
   - **Goal**（自然语言，必填）
   - **Done Criteria**（shell 命令，必填）—— 表单旁配 1 行帮助"必须有可机器执行的退出码判定"
   - **Agent**（下拉，默认 `claude-code`，本 Iter 只有一个）
   - **Project path**（绝对路径，默认 = 当前 cwd）
   - **Retry policy**（默认 `maxRetries=1, timeoutMinutes=10, tokenBudget=$1`）
4. 保存 → 跳转到 Blueprint 详情 / 列表
5. 点击 "Run now" → 跳转到 Run 详情页（实时 Xterm 流）
6. Agent 在 worktree 跑（Iter 2：先在 project path 直跑；Iter 3 起 worktree 隔离）
7. 退出后自动评估 Done Criteria
8. 成功 → 绿色 banner + token/cost summary；失败 → 红色 banner + "重试 / 进入 worktree / 查看推理链" 三按钮

**关键决策点**：

- **D1.1**：首次启动是否需要"配置 Claude Code 路径"向导？ → AI 倾向有，但允许 skip（用 `which claude` 探测）
- **D1.2**：手动运行时要不要弹"危险操作确认"？ → 本 Iter 不弹（默认信任用户配的 Done Criteria）
- **D1.3**：Done Criteria 编辑器要不要做"试跑"按钮？（不真启 Agent，仅执行 Criteria 一次） → 强烈建议有，对 onboarding 体验影响巨大

**对应模块**：Blueprint CRUD (A)、Run 状态机 (B)、Adapter (C)、PTY (D)

---

### Flow 2 · Cron 触发 → Run 失败 → 查看 Worktree 现场

**触发**：Blueprint 配了 `0 9 * * *`，到点自动启 Run；Agent 跑完 Done Criteria 失败。

**步骤**：

1. 用户中午回到电脑，看 Dashboard
2. 看到红色徽章 "1 failed run @ 09:00"
3. 点击进入 Run 详情
4. 看到 Xterm 回放（最后 N 行）+ 推理链时间线 + Done Criteria 评估结果
5. 点击 "Open worktree in terminal" → 后端返回路径 / 一键启 iTerm/Terminal 跳过去
6. 用户在 worktree 里查问题、改 Skill、改 prompt 模板
7. 回到 UI 点 "Re-run with current changes" → 用同一 worktree 再跑

**关键决策点**：

- **D2.1**：Worktree 失败保留多久？满硬盘怎么办？ → 默认永久保留 + 提供 "Clear successful worktrees" 按钮；满盘前端不主动告警（Iter 5+ 再做）
- **D2.2**：失败的 Run 是否进入 retry policy？还是只人工触发重跑？ → Iter 2：按 retryPolicy 自动重试 N 次，失败后才停；UI 显示"已自动重试 N 次"
- **D2.3**：worktree 在 `~/.loop-cockpit/workspaces/<runId>/` 还是允许用户自配？ → 默认前者；用户可在 settings 覆盖
- **D2.4**："Re-run with current changes" 是 amend 当前 Run 还是开新 Run？ → 强建议开新 Run（审计性优先）；UI 上标注"延续自 #N"

**对应模块**：Run 状态机 (B)、Worktree (E)、Trigger Cron (G)

---

### Flow 3 · Run 成功 → 通知到飞书 → 用户查看审计 Trail

**触发**：Run 成功完成。

**步骤**：

1. Agent exit + Done Criteria pass
2. Run 状态机进入 `success`
3. Channel Hub 派发：Run 配置了 lark 卡片渠道
4. 飞书机器人推送卡片：Goal、耗时、token、worktree diff 链接、详情 URL（localhost）
5. 用户点链接 → 浏览器打开 Run 详情
6. 切到 "Audit" tab：
   - 完整 pino JSON 日志
   - Agent 推理链（如果 Agent 暴露）
   - token 消耗明细
   - Done Criteria 评估命令 + 退出码
   - Worktree diff（对比 base）

**关键决策点**：

- **D3.1**：飞书卡片要不要内嵌 worktree diff 摘要？ → 首版只放链接，避免卡片过大 + 内容泄漏
- **D3.2**：UI 端 localhost 链接给"非本机查看"用户怎么处理？ → 显示"链接只在你的本机有效，请远程时用 ssh tunnel"
- **D3.3**：审计 trail 是否对 token 消耗按 step 拆？ → Iter 5 才做；本 Iter 只显示 run 级总数

**对应模块**：Channel Hub (Iter 6)、Audit (Iter 5)、Run (B)

---

### Flow 4 · 多 Loop 并行：A 跑测试 / B 跑 lint

**触发**：同一时刻两个 Blueprint 都被 trigger（手动或 cron）。

**步骤**：

1. Dispatcher 接收两个事件
2. 并发控制：检查全局并发上限（默认 2）
3. 各自分配独立 worktree
4. UI Dashboard 顶部展示"2 active runs" 实时计数
5. 列表里两条 Run 同时绿色心跳
6. 点任一进入详情，Xterm 流互不干扰

**关键决策点**：

- **D4.1**：默认并发上限多少？ → AI 建议 2。机器跑不动时用户可调。
- **D4.2**：超过上限的 Run 是 queue 还是 reject？ → queue（持久化在 SQLite，崩了也不丢）
- **D4.3**：同一 Blueprint 是否允许并发？ → 默认禁止（防自己改自己 worktree）；可配置
- **D4.4**：UI 上"2 active runs" 的视觉层级 —— banner 还是 sidebar？ → 等画 Dashboard 时定

**对应模块**：Dispatcher (G)、Worktree (E)、Run 队列 (B)

---

### Flow 5 · 修改已有 Blueprint → 历史 Run 不受影响

**触发**：用户在 Blueprint 编辑器改 Goal / Done Criteria / Skill。

**步骤**：

1. 改完保存
2. 系统**复制**当前 Blueprint 为新版本（version + 1），旧版本归档不删
3. 已存在的 Run 永远绑定它创建时的 Blueprint 版本（不变）
4. UI 上 Blueprint 详情显示 "v3（当前）、v2 (deprecated)、v1 (deprecated)"
5. Run 详情里展示"基于 Blueprint v2"
6. 用户可点版本回滚

**关键决策点**：

- **D5.1**：是真版本化（每次保存都新版本）还是改前对话框确认？ → AI 建议真版本化（审计性）+ "草稿"模式（保存但不发布）二选一
- **D5.2**：Blueprint 删除是软删还是硬删？ → 软删（有 Run 绑着不能硬删）
- **D5.3**：归档版本的 Skill / MCP 引用对应文件被改了怎么办？ → Skill/MCP 在 v1 引用时按"路径 + 当时 hash"快照；本 Iter 不实现，先标 TODO

**对应模块**：Blueprint 数据模型 (A)、Versioning（新，需 ADR）

---

## 横向决策点（跨流程）

| ID | 问题 | AI 建议 | 决策时机 |
|---|---|---|---|
| **H1** | 暗色 / 亮色主题默认 | 暗色（独立开发者夜间偏好） | 下周设计 Iter |
| **H2** | 中英文双语 UI 还是单语？ | 单语 zh-CN（单用户 + 独立开发者，简化 i18n 成本） | ui-spec.md |
| **H3** | 实时反馈用 WebSocket 还是 SSE？ | WebSocket（双向、Xterm 输入需要） | ADR-0001 已倾向 WS |
| **H4** | 错误提示 modal 还是 inline？ | inline 优先；危险操作才 modal | ui-spec.md |
| **H5** | 是否上 Tailwind？ | 单人项目 + 高信息密度 UI，建议是 | 等设计 issue |

## 不在本流程内的边界（YAGNI 提醒）

参考 `non-goals.md`：

- ❌ 没有"账号 / 登录 / 个人资料"流程
- ❌ 没有"分享 Blueprint 到社区"流程
- ❌ 没有"AI 自己判断完成"流程（违反 §7）
- ❌ 没有"邀请协作者"流程（违反 §4 单用户）

---

## 下一步

- [ ] Iter 1 Day 6-7：维护者按本大纲补"原型图"（Issue #3）
- [ ] Iter 1 Day 8-9：把 5 个流程的 wireframe 截图放 `docs/design/assets/`
- [ ] Iter 1 Day 10+：根据 wireframe 写实 `ui-spec.md` 字段表

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-26 | v0.1 | 大纲版（AI 协作，维护者下线期间产出；只列流程框架与决策点，无图） |
