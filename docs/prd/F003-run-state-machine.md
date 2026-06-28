---
id: F003
title: Run 状态机 + 生命周期
status: Draft
priority: P0
iteration: Iter 2
issue: TBD
owner: "@oh-summy"
updated: 2026-06-28
---

# F003 · Run 状态机 + 生命周期

> 把 Blueprint 转成可执行的 Run,管理整个生命周期(初始化 → Agent 执行 → Done Criteria 评估 → 重试或成功),写持久化状态到 SQLite,落 audit-trail。

---

## 1. 一句话

实现 `idle → initializing → running → evaluating → (success | retrying | failed | stopped)` 状态机,驱动 Run 从被触发到完成/失败的完整生命周期,所有状态变更持久化。

## 2. 目标 (Why)

Loop Engineering 的核心 = **目标驱动的自治闭环**。这个闭环的"骨架"就是状态机:Agent 跑完不等于 Run 完成,Done Criteria 评估通过才算。失败 → 按 Retry Policy 决定重试还是停。所有这一切**必须可审计、可恢复**(Host 重启 Run 状态不丢)。

本 PRD 落地:
- ux-flow Flow 1(成功路径)+ Flow 2(失败 → worktree)
- D2.2 失败 Run 按 retryPolicy 自动重试,UI 标"已自动重试 N 次"
- D2.4 "Re-run with current changes" 开新 Run,UI 标"延续自 #N"
- D5.2 历史 Run 存 Blueprint 快照(audit-trail.json 里)
- 双轨数据(ADR-0003 Q6):runs 表存元数据,raw stdout → 文件

## 3. 范围

### In Scope (Iter 2)
- **Run 数据模型**:`id / blueprintId / blueprintSnapshot / status / startedAt / endedAt / iteration / exitCode / errorSnippet / rawLogPath / parentRunId`
- **状态机**(7 状态):idle → initializing → running → evaluating → success | retrying | failed | stopped
- **生命周期编排器**(`apps/host/src/runner/`):
  1. 创建 Run + 持久化(blueprintSnapshot 写入)
  2. 拼装 system prompt(Iter 2:Goal + 项目路径,Memory/Skill 推后)
  3. 调用 AgentAdapter.start()(F004)
  4. 流式接收 stdout → 同时 (a) WebSocket 推前端 (b) 落 raw.log 文件 (c) 截关键报错入 DB
  5. Agent 退出后跑 Done Criteria(在 projectPath 下 `sh -c`)
  6. 评估:pass → success;fail → 检查 retryPolicy → retrying(回到 step 3,iteration++) 或 failed
  7. 写 audit-trail.json(含 prompt 实际内容 / 评估结果 / token / blueprintSnapshot)
- **Run API**:`POST /api/runs`(手动触发)+ `POST /api/runs/:id/stop` + `GET /api/runs/:id` + `GET /api/runs`(列表)
- **重试逻辑**:retryPolicy.maxRetries 控制次数,每次重试 iteration 字段 +1,共享同一 Run.id
- **超时**:retryPolicy.timeoutMinutes,超时 SIGKILL Agent + 状态置 `failed`
- **Token 预算**:retryPolicy.tokenBudget(USD)— Iter 2 仅计数 + 日志,不强制中断(预算估算依赖 F004 Adapter)
- **崩溃恢复**:Host 启动时扫描 `runs.status IN ('running','evaluating')` 的 Run,标记为 `failed`(reason: "host-restart")。MVP 不做真正恢复,留 Iter 3+

### Out of Scope (推后)
- 真正的崩溃后断点续传(Iter 3+,要求 Agent state 也可恢复)
- 多 Task 拆分(Iter 7+,Iter 2 一律 1 Run = 1 Task)
- Goal-based trigger 检测(Iter 4,需要 Trigger Bus)
- Worktree 隔离(Iter 3,本 PRD 先在 projectPath 直跑)

## 4. 用户故事 / Use Cases

- 作为用户,我点 "Run now" 后,UI 跳到 Run 详情页能看到状态从 initializing → running 实时变化
- 作为用户,Agent 跑完后,我能在同一页看到 Done Criteria 评估结果(pass/fail + stdout 摘要)
- 作为用户,Run 失败但 retryPolicy 还有余额,UI 显示"已自动重试 1/3 次,运行中"而不是直接红色
- 作为用户,我可以中途点 "Stop" 立即中断 Run,Agent 进程被 SIGKILL,状态 stopped
- 作为审计者(未来),audit-trail.json 能完整复现当时的决策路径

## 5. 关联资源

| 类型 | 资源 | 说明 |
|---|---|---|
| 架构 | [overview.md §2.1 / §3](../architecture/overview.md) | Run 抽象 + apps/host/src/runner/ 模块 |
| 架构 | [overview.md §5 数据双轨](../architecture/overview.md) | raw.log + DB 字段分工 |
| 总 PRD | [product-overview.md §6 B / §6 K](../architecture/product-overview.md) | Runtime 引擎 + 可审计性 |
| ADR | [0001](../architecture/decisions/0001-tech-stack.md) | Fastify / WebSocket / Vitest |
| ADR | [0003](../architecture/decisions/0003-sqlite-drizzle.md) Q6 / Q8 | raw.log 双轨 + WAL |
| 上游 PRD | [F002 Blueprint](./F002-blueprint-editor.md) | 输入来源 |
| 下游 PRD | [F004 Adapter](./F004-claude-adapter.md) | 提供 AgentProcess |
| 下游 PRD | [F005 Audit](./F005-audit-trail.md) | 落 audit-trail.json |
| 原型 | [prototype/features/run-detail](../prototype/features/run-detail/) | _周末出 UI 变体_ |
| Issue | _TBD_ | 实施跟踪 |

## 6. 数据契约 / 接口

> ⚠️ **2026-06-28 v0.2 重大改动**:Run 加阶段进度子状态,逐 Phase 推进。详见 [ADR-0009](../architecture/decisions/0009-phase-orchestration.md)。

### 6.1 状态机(主)

```
                ┌─────────────────────────────────┐
                ▼                                 │
  idle ─→ initializing ─→ running ─→ evaluating ─┴─→ retrying (回到 running)
                                          │
                                          ├─→ success ─────────┐
                                          └─→ failed           │
                                                                │
                              stopped(用户主动 Stop,任意状态可触发)─┘
```

非法迁移直接抛 `IllegalStateError`,不静默吞。

### 6.1.* Phase 子状态(★ v0.2 新增)

```
running 状态内部 = 逐 Phase 推进:
  phase[0] spawn → claude --session-id $UUID
       → 阶段执行(running) → evaluator(evaluating) → branches → phase[1]
  phase[1] spawn → claude --resume $UUID
       → ...
  最后 phase → branches: __terminal__ 或 __fail__
```

每个 Phase 内部三态:`running → evaluating → (passed | failed | skipped)`。

### 6.2 DB Schema

```typescript
export const runs = sqliteTable("runs", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  blueprintId: text("blueprint_id").notNull().references(() => blueprints.id),
  blueprintSnapshot: text("blueprint_snapshot", { mode: "json" }).$type<Blueprint>().notNull(),
  status: text("status").$type<RunStatus>().notNull().default("idle"),
  iteration: integer("iteration").notNull().default(0),
  parentRunId: text("parent_run_id").references(() => runs.id),
  startedAt: integer("started_at", { mode: "timestamp" }),
  endedAt: integer("ended_at", { mode: "timestamp" }),
  exitCode: integer("exit_code"),
  errorSnippet: text("error_snippet"),
  rawLogPath: text("raw_log_path"),
  tokenCostUsd: real("token_cost_usd"),
  doneCriteriaResult: text("done_criteria_result", { mode: "json" }).$type<DoneResult>(),

  // ★ v0.2 新增 — Phase 编排
  claudeSessionId: text("claude_session_id"),            // 同一 Run 内跨 Phase 共享的 UUID
  currentPhaseId: text("current_phase_id"),              // 当前在哪个 Phase
  phaseHistory: text("phase_history", { mode: "json" }).$type<PhaseExecution[]>().default(sql`'[]'`),
});

interface PhaseExecution {
  phaseId: string;
  startedAt: timestamp;
  endedAt?: timestamp;
  status: 'running' | 'evaluating' | 'passed' | 'failed' | 'skipped';
  evaluatorResult?: any;       // LLM judge 给的分类 / shell exit code / regex match
  branchTaken?: string;        // 走了哪个分支
  toolCallCount: number;
  tokensIn: number;
  tokensOut: number;
}

type RunStatus = "idle" | "initializing" | "running" | "evaluating" | "success" | "retrying" | "failed" | "stopped";
type DoneResult = { passed: boolean; exitCode: number; stdoutTail: string; stderrTail: string; durationMs: number };
```

### 6.3 REST + WebSocket API

| Method | Path | 说明 |
|---|---|---|
| `POST` | `/api/runs` | body: `{ blueprintId, reRunOf?: string }`。`reRunOf` 触发 D2.4 新 Run 延续 |
| `POST` | `/api/runs/:id/stop` | 立即 SIGKILL,状态 → stopped |
| `GET` | `/api/runs/:id` | Run 详情 |
| `GET` | `/api/runs?blueprintId=&status=` | 列表(分页 / 过滤) |
| `GET` | `/api/runs/:id/logs` | SSE 流(增量),用于轻量日志面板 |
| `WS` | `/api/runs/:id/stream` | WebSocket,推送 PTY raw buffer(给 Xterm 用,F004 实现) |

### 6.4 触发流程

```typescript
// apps/host/src/runner/lifecycle.ts (Iter 2 实施)
async function startRun(blueprintId: string, reRunOf?: string) {
  const bp = await db.select().from(blueprints).where(eq(blueprints.id, blueprintId));
  if (!bp) throw new NotFoundError();

  const run = await db.insert(runs).values({
    blueprintId,
    blueprintSnapshot: bp,            // D5.2 快照
    parentRunId: reRunOf,             // D2.4
    status: "initializing",
  }).returning();

  // (异步推进,不阻塞 HTTP 响应)
  process.nextTick(() => advanceRun(run.id));
  return run;
}

async function advanceRun(runId: string) {
  // step 1: initializing → 拼 system prompt + 创建 raw.log 文件
  // step 2: running → 调 AgentAdapter.start()  (F004)
  // step 3: agent exit → evaluating → 跑 Done Criteria
  // step 4: pass → success | fail → 检查 retryPolicy:
  //         - 还有重试余额 → status: retrying,iteration++,回 step 2(同一 Run.id)
  //         - 用完 → failed
  // step 5: 写 audit-trail.json (F005)
}
```

## 7. 验收标准 (Done Criteria)

- [ ] 状态机所有合法迁移有单测覆盖(vitest);非法迁移抛错
- [ ] `POST /api/runs` 立即返回 `{ run: { id, status: "initializing" } }`,后台异步推进
- [ ] WebSocket `/api/runs/:id/stream` 在 Agent 运行期间持续推送 raw chunk(F004 联调)
- [ ] Run 失败但 retryPolicy.maxRetries > 0 时,状态进 `retrying` 后再到 `running`(同一 run.id, iteration+1)
- [ ] `POST /api/runs/:id/stop` 200ms 内让 Agent 进程消失(`kill -9`)
- [ ] Host 重启后,扫描 `running/evaluating` Run 并标 `failed`(reason="host-restart")
- [ ] raw stdout 写到 `~/.loop-cockpit/runs/<runId>/raw.log`,DB `runs.raw_log_path` 指向
- [ ] errorSnippet 字段在 failed 时填充(最后 256 字节 stderr 或 doneCriteria stderr)
- [ ] E2E:从 F002 创建 Blueprint → 这里触发 Run → success 落地 → 录视频(Iter 2 验收门槛)

## 8. 非功能约束

- **状态变更原子性**:每次 `update runs set status=...` 用 Drizzle 事务,失败回滚
- **崩溃语义**:Host kill -9 自己不丢已经写入 DB 的状态(WAL 保障)。in-flight 状态在重启时被 reaper 标 failed
- **WebSocket 压力**:单连接持续推 100KB/s ANSI 流不掉帧(Iter 2 验测)
- **Done Criteria 超时**:独立 timeoutMinutes 限制,超时 SIGTERM 后 SIGKILL

## 9. 开放问题

- ⚠️ **Q · raw.log rotation 策略**:单 Run 文件无限增长是否有上限?
  - 备选 1:不限,靠 retention 任务清(Iter 5+)
  - 备选 2:超过 100 MB 时 rotate 成 `raw.log.1` 等
  - **倾向备选 1**,简单。如果 Iter 2 实测发现单 Run 100MB+ 常见再回头加 rotation
- ⚠️ **Q · errorSnippet 截取窗口**:从 stdout/stderr 哪里截?
  - 倾向:最后 256 字节 stderr;若 stderr 空则最后 256 字节 stdout
  - 留实施时定

## 10. 变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 首版 Draft |
| 2026-06-28 | v0.2 | ★ 加 Phase 子状态机 + claudeSessionId / currentPhaseId / phaseHistory 字段。详见 [ADR-0009](../architecture/decisions/0009-phase-orchestration.md) |
