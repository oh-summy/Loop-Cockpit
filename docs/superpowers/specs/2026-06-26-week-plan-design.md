# 2026-06-26 · 本周交付计划（Spec）

> 这份 spec 由 `brainstorming` skill 流程产出，记录 2026-06-26 周五维护者下线前确定的**本周交付目标**。
>
> 文件位置遵循 Superpowers 默认：`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`。
>
> ⚠️ 本文档**不是产品契约**，是开发期周计划的快照。完整产品定义仍以 `docs/product/prd.md` 为准。

---

## 1. 背景

| 项 | 值 |
|---|---|
| 日期 | 2026-06-26（周五），Iteration 1 Day 3 / 14 |
| Iter 1 截止 | 2026-07-08（共 14 天，剩 12 天） |
| 本周窗口 | 6/26 周五剩余 + 6/27-28 周末 |
| **本周预算** | **~7–10h**（用户答："半块周末"） |
| 远程 open Issues | 9 个（8 个 Iter 1 + 1 个 P1 拉伸） |
| 已有本地分支 | `chore/superpowers-bootstrap`（已 commit 未推送） |

## 2. 抉择记录

| 抉择 | 候选 | 选择 | 理由 |
|---|---|---|---|
| 讨论切入点 | 本周交付 / Iter 1 走法 / 架构 / 项目方向 | **本周交付** | 时间紧、其它 3 项背景已对齐 |
| 本周预算 | 13–18h / 7–10h / ≤6h / 双方案 | **7–10h** | 用户实际答复 |
| 本周送一件事过线 | PTY 尖刀 / ADR-0001 / 混合 | **PTY 尖刀** | Iter 1 唯一能让方向"死"的不确定性 |
| 过线标尺 | MVP / MVP+FSM / 最低止损 | **MVP**：能跳起来 + 能讲话 | 7–10h 内可达，[y/N] 推下周 |

---

## 3. 单一目标

> **跑出能讲话的 PTY demo**：`spike/pty-demo.ts` 用 node-pty 拉起 `claude` CLI，捕获完整 ANSI 输出，能编程式发送一条 prompt 并拿到完整回复，进程生命周期可控。

对应 GitHub Issue：**#1**（部分覆盖 #2 的前置）。

## 4. 范围

### ✅ 本周做

- 进程拉起：`node-pty.spawn('claude', [...])` 在 Linux 上能起来
- I/O：stdout 读、stdin 写
- ANSI 完整捕获（保留还是 strip 此次任选其一打通即可）
- 退出控制：能读到 exit code，能 SIGKILL
- 至少 Linux 跑通
- 记录第一手现象到 `spike/pty/notes.md`

### ❌ 本周不做

| 项目 | 推迟到 |
|---|---|
| [y/N] FSM 自动应答 | Iter 1 Day 8-10 |
| Retry 逻辑 | Iter 2 |
| Worktree 集成 | Iter 3 |
| UI / WebSocket | Iter 2 |
| 持久化 / 数据库 | Iter 2 |
| Adapter 抽象层 | Iter 2 |
| ESLint / Prettier / Vitest | Iter 2 |
| 主仓库根 `package.json` 改动 | Iter 2 |

### 🟡 看时间做

- macOS 跑通（如果手边有 mac）
- Windows 明确推迟

## 5. 三天分块（实际：周五剩余 + 周末两天）

| 时间 | 时长 | 任务 | 产出 |
|---|---|---|---|
| 周五 6/26 剩余 | 1–2h | spike 工程骨架；`pnpm init`；装 node-pty + tsx；写 hello-world `spawn('ls')` | spike/pty/ 工程能跑 |
| 周六 6/27 上午 | 3h | 把目标换 `claude`；拉起；ANSI；exit/kill | `spike/pty/01-spawn-claude.ts` |
| 周六 6/27 下午 | 2–3h | stdin 写 prompt；读完整 stdout 到 claude 自然结束 | `spike/pty/02-send-prompt.ts` |
| 周日 6/28 上午 | 2–3h | 抽 `spike/pty/pty-harness.ts`，end-to-end demo | 可复用 harness + demo |
| 周日 6/28 下午 | 1–2h | `spike/README.md` 总结：是否继续走 node-pty 路线 | 结论 + PR 草稿 |
| **缓冲** | 1h | 周日下午兜底 | — |

**中场判定**：周六 8 PM 还没看到 claude 在 pty 里启起来，**立即降级**到"最低止损"档（只要 spawn 成功就算赢），并把降档记录到 `spike/pty/notes.md`。

## 6. 工程约定（本周临时版）

- spike 代码全部放 `spike/pty/`，**不进** `apps/`
- spike 自带独立 `package.json`，**不动**主仓库根
- 暂不上 ESLint / Vitest / Husky / TypeScript strict —— 这是 spike 不是 MVP
- 每完成一个时间块至少 1 个 commit
- 分支：`spike/pty-bootstrap`
- 依赖锁定（建议但不强求）：node-pty 1.0.x，tsx 4.x

## 7. 风险与对策

| 风险 | 概率 | 对策 |
|---|---|---|
| node-pty 编译失败（Linux 缺 make/g++） | 中 | 周五就先 `pnpm i node-pty` 摸底；如失败 fallback `node-pty-prebuilt-multiarch` |
| claude 在 pty 里行为跟交互终端不一致（颜色、prompt） | 中高 | 周六上午验证；差别大就老实记录，不急调通 |
| 周末事多，没出活 | 中 | 周六 8 PM 中场判定 → 降档 |
| AI 助手顺手装一堆依赖把 ADR 流程绕过 | 低中 | 任何新依赖**只在** `spike/pty/package.json`，主仓库不动 |
| `claude` 二进制不在 PATH | 低 | spike 入口先 `which claude` 检查 + 友好报错 |

## 8. 跟其他 Issue 的关系

| Issue | 本周 |
|---|---|
| #1 PTY spike: 拉起 claude | ✅ 部分（done criteria 见 §3） |
| #2 PTY spike: [y/N] FSM | ❌ 推下周 |
| #5 ADR-0001 技术栈 | ❌ 本周不做 |
| #6 ADR-0002 node-pty 选型 | ❌ 必须等 spike 第一手结论 |
| #7 ADR-0003 SQLite + Drizzle | ❌ 本周不做（独立可做，但本周聚焦） |
| #3/#4 设计层 | ❌ 本周不做 |
| #9 VitePress P1 | ❌ 本周不做 |
| #10 Retro | ❌ Day 14 才做 |

## 9. 验收

**本周交付 = 以下全部为真：**

1. `spike/pty/pty-harness.ts` 存在且能在 Linux 跑
2. 能拉起 `claude`、发送一条 prompt、收到完整回复、正常退出
3. `spike/README.md` 有结论段落（继续走 node-pty / 调整方案 / 暂时无定论）
4. `spike/pty-bootstrap` 分支至少 3 个 commit，每个 commit 信息清晰

不强求：跨平台、自动应答、性能数据。

---

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-26 | v0.1 | 首版（由 brainstorming skill 流程产出，用户离线前确认结构） |
