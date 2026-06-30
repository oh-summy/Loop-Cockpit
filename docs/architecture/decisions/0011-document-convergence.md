---
id: 0011
title: 文档收敛 + Iter 2 准入锁定
status: Accepted
date: 2026-06-28
deciders: "@oh-summy"
supersedes: ADR-0009, ADR-0010 (覆盖触发器名/schemaVersion/phases-vs-sdaf/default值)
---

# ADR-0011 · 文档收敛 + Iter 2 准入锁定

> 审查反馈指出 4 处 P0 矛盾 + 大量 P1 缺口。本文档锁定所有决策,消除分叉。
> **编码前必须读完本 ADR,否则不得进入 Iter 2。**

---

## P0-1: Trigger Type 字符串统一

**问题**: triggers.md 用 `email-received` / `lark-message` / `after-loop`;F002 和 v7 原型用 `email` / `lark-msg` / `upstream-loop`。

**决策**: 采用 F002 / v7 原型命名。**triggers.md 视为过时,不再维护独立枚举。**

统一后的 `TriggerConfig` 类型定义锁定在 F002 v0.6 §6.2。所有文档引用 F002 作为唯一 Truth Source:

```typescript
type TriggerConfig =
  | { type: "manual" }
  | { type: "once", at: string }
  | { type: "cron", expression: string, times?: string[] }
  | { type: "webhook", secret?: string }
  | { type: "git-push", repo: string, branch?: string }
  | { type: "git-pr", repo: string, events: string[] }
  | { type: "git-issue", repo: string, labels?: string[], events: string[] }
  | { type: "git-comment", repo: string, mention?: string }
  | { type: "ci-finished", provider: string, events: string[] }
  | { type: "email", filter?: { from?: string; subject?: string }, mode?: 'imap' | 'webhook' }
  | { type: "lark-msg", filter?: { chatId?: string; mention?: string } }
  | { type: "slack-msg", filter?: { channel?: string; mention?: string } }
  | { type: "discord-msg", filter?: { channel?: string } }
  | { type: "file-watch", path: string, events: string[], pattern?: string }
  | { type: "boot", delaySec?: number }
  | { type: "upstream-loop", upstreamLoopId: string, filter: { status: string } };
```

**triggers.md 处理**: 更新为"仅引用 F002 的类型定义,不再独立枚举"。保留 Iter 分配表供参考,但 type 字符串以 F002 为准。

---

## P0-2: Audit Schema Version 统一

**问题**: F005 §6.0 是 schemaVersion 2.0 (rounds 数组,8 层 trace);§6.1 是 schemaVersion 1.0 (retryHistory,扁平结构)。

**决策**: **只保留 schemaVersion 2.0,删掉 §6.1 的 1.0 结构。**

schemaVersion 2.0 是 8 层架构的完整 trace (§6.0),包含:
- `rounds[]` 每轮含 `planner` / `taskExecutions[]` / `memoryDelta` / `reflection` / `humanGate`
- 每个 taskExecution 含 `contextBundle`(L3) / `spawnCommand`(L4) / `toolCalls`(L5) / `verification`(L7)

1.0 的 `retryHistory` 字段被 2.0 的 `rounds[].taskExecutions[].toolCalls` 覆盖,功能冗余。

**F005 处理**: 删掉 §6.1 的 1.0 结构,保留 §6.0 的 2.0 结构为唯一 schema。写入器改用 2.0 结构。

---

## P0-3: phases[] vs sdafStages[] 语义统一

**问题**: ADR-0009 把 Loop 抽象为 Phase 有向图;F002 加固定 4 阶段 SDAF;UI v7 只画了 SDAF,phases 始终空 `[]`。

**决策**: **sdafStages[] 是 phases[] 的特例。Iter 2 默认 sdafStages 有 4 个固定阶段,phases[] 保留作为扩展机制。**

具体规则:
1. **Iter 2 默认**: sdafStages 有 4 个固定阶段 (`sense` / `decide` / `act` / `feedback`),phases[] 初始化为空 `[]`
2. **sdafStages → phases 自动推导**: 保存 Blueprint 时,如果 phases[] 为空,Orchestrator 用 sdafStages 自动生成 phases:
   ```
   sense → decide → act → feedback (线性有向图)
   ```
3. **用户显式配 phases[]**: 覆盖 sdafStages 自动推导,支持自定义有向图(分叉/汇聚)
4. **UI 层面**: v7 原型只展示 sdafStages 4 阶段,phases[] 对普通用户不可见(专家模式,Iter 3+)

**结论**: phases[] 是"执行图",sdafStages[] 是"执行图的默认值"。Orchestrator 永远读 phases[],不读 sdafStages[]。

**ADR-0009 处理**: 更新为"phases[] 是执行图,sdafStages[] 是默认值。Iter 2 默认线性 4 阶段。"

**F002 处理**: 更新 schema 注释,明确 phases[] = 空时自动从 sdafStages[] 推导。

---

## P0-4: 默认值统一

**问题**: permissionMode 默认值三处冲突(F002 无 default / UI 表格 acceptEdits / ADR-0010 bypassPermissions);maxRounds 注释 default 20 但 UI 表格写 10。

**决策**: 锁定以下默认值,所有文档对齐:

| 字段 | 默认值 | 来源 |
|---|---|---|
| `permissionMode` | `"acceptEdits"` | F002 原型 UI |
| `goal.budget.maxRounds` | `10` | F002 UI 表格 |
| `goal.budget.maxTokensUSD` | `1.0` | F002 原型 UI |
| `goal.budget.maxWallTimeMs` | `600000` (10 min) | F002 原型 UI |
| `goal.budget.warnAtPercent` | `80` | F002 原型 UI |
| `retryPolicy.maxRetries` | `3` | F002 原型 UI |
| `retryPolicy.timeoutMinutes` | `10` | F002 原型 UI |
| `retryPolicy.onFail` | `"stop"` | F002 原型 UI |
| `deny.strictBoundary` | `true` | F002 原型 UI |
| `deny.gitPush` | `true` (禁止) | F002 原型 UI |
| `deny.gitCommit` | `false` (不禁止) | F002 原型 UI |

**注意**: ADR-0010 §Goal 中 `maxRounds: number; // 最多几轮 Loop(default 20)` 更新为 `default 10`。

---

## P1-1: WS 协议补 seq + 8 层进度事件类型 + 背压

**决策**: WebSocket 协议更新如下:

```typescript
// 客户端 → 服务端
interface ClientMsg {
  type: "subscribe" | "input" | "ack";
  runId?: string;
  text?: string;
  lastSeq?: number;  // 重连 ACK
}

// 服务端 → 客户端
interface ServerMsg {
  seq: number;       // ★ 单调递增,客户端用于 ACK
  type: "data" | "exit" | "status" | "budget" |
        "phase_change" | "verification_result" |
        "reflection_triggered" | "gate_requested";
  chunk?: string;    // type=data 时
  exitCode?: number;
  status?: RunStatus;
  current?: number;
  limit?: number;
  // 新事件类型字段:
  phaseId?: string;          // phase_change
  verificationResult?: any;  // verification_result
  reflection?: any;          // reflection_triggered
  gate?: any;                // gate_requested
}
```

**背压策略**: `ws.bufferedAmount > 128KB` 时暂停推送,等 `bufferedAmount < 64KB` 恢复。用 `ws.on('drain', ...)` 监听。

**重连恢复**: 客户端刷新后发送 `{type: "ack", lastSeq: N}`,服务端从 seq=N+1 继续推送。

**F004 处理**: 更新 §6.3 WebSocket 协议,加入 seq + 4 种新事件类型 + 背压策略。

---

## P1-2: Run 状态机 — 子状态图 + Round × Phase × status 关系

**决策**:

### 状态机完整迁移图

```
                    ┌──────────┐
                    │  idle    │  ← 初始状态
                    └────┬─────┘
                         │ POST /api/runs
                    ┌────▼─────┐
                    │initializ-│  ← reaper 复检窗口(Host 启动时)
                    │  ing     │
                    └────┬─────┘
                         │ system prompt 拼装完成
                    ┌────▼─────┐
                    │ running  │  ← 外层:Round 循环
                    │          │     内层:Phase 推进
                    └────┬─────┘
                         │ Agent 退出
                    ┌────▼─────┐
                    │evaluating│  ← Done Criteria 评估
                    └────┬─────┘
                         │ passed
                    ┌────▼─────┐
                    │ success  │  ← 终态
                    └──────────┘
                         │ failed + retries left
                    ┌────▼─────┐
                    │retrying  │  ← iteration++, 回 running
                    └────┬─────┘
                         │ retries exhausted
                    ┌────▼─────┐
                    │  failed  │  ← 终态
                    └──────────┘
                         │ 用户 Stop(任意状态)
                    ┌────▼─────┐
                    │ stopped  │  ← 终态
                    └──────────┘
```

### Round × Phase × status 关系

| 概念 | 说明 |
|---|---|
| `runs.status` | 宏观状态: `running` 时内部在 Round × Phase 循环 |
| `runs.current_round` | 当前 Round 编号(0-based) |
| `runs.current_phase_id` | 当前 Phase ID(如果 phases[] 非空) |
| `phase_history[]` | 已完成的 Phase 执行记录 |
| `verification.nextAction` | 决定下一跳: |
| | - `next-task` → 同一 Round 下一个 Task |
| | - `replan` → Round++, 回到 Planner |
| | - `retry` → 同一 Task 重试(Reflection 介入) |
| | - `human` → Human Gate 触发,暂停 |
| | - `terminal` → status → success |
| | - `fail` → status → failed |

### Timeout 双路径

| 超时类型 | 字段 | 说明 |
|---|---|---|
| Agent 超时 | `retryPolicy.timeoutMinutes` | Agent 运行超时,SIGKILL → failed |
| Done Criteria 超时 | `goal.budget.maxWallTimeMs` | 整个 Run 总时长超时 → failed |

**schema 处理**: 不改字段,但在 F003 §6.2 注释中明确两个 timeout 的区别。

### idle 入口文档化

**决策**: `idle` 不是悬挂状态。`POST /api/runs` 创建 Run 时直接写 `status: "initializing"`,不经过 idle。idle 仅出现在 Run 被删除或从未被触发的空记录中。**reaper 复检窗口**: Host 启动时扫描 `status IN ('initializing', 'running', 'evaluating')` 的 Run,标记为 `failed(reason: "host-restart")`。

**F003 处理**: 更新 §6.1 状态机图,明确 idle → initializing 路径,文档化 reaper 复检窗口。

---

## P1-3: PTY/Adapter 隐患修复

### WS 背压

**决策**: 如 P1-1 所述,`bufferedAmount > 128KB` 暂停推送。

### raw.log fsync vs WS 时序

**决策**: **先写文件 + fsync 完成,再推 WS。** 保证 raw.log 不会比 WS 多。

```typescript
proc.onData((chunk) => {
  rawLog.write(chunk);                          // 异步写入
  ringBuffer.push(chunk);
  // 不立即推 WS — 等 fsync 完成后推送
  rawLog.once('flush', () => {
    wsClients?.forEach(ws => {
      if (ws.bufferedAmount < 128 * 1024) ws.send(chunk);
    });
  });
});
```

### stream-json 用法修正

**决策**: `--output-format stream-json` 模式下,token usage 是结构化事件(`stream-json` 中的 `usage` 事件),不是正则 grep。`estimateTokens()` 从 stream-json 的 `usage` 事件累积,不再用正则估。

**F004 处理**: 更新 §6.4,从正则 grep 改为解析 stream-json 的 usage 事件。

### Orchestrator 拦截中间层

**决策**: 在 F004 中新增 `OrchestratorMiddleware` 模块,拦截 stream-json 的 tool_call 事件,匹配 deny 规则后拒绝执行。

```typescript
// apps/host/src/orchestrator/middleware.ts
class OrchestratorMiddleware {
  onToolCall(event: ToolCallEvent): boolean {
    if (this.denyRules.match(event)) {
      this.logPermissionDenied(event);
      return false;  // 拒绝
    }
    return true;  // 放行
  }
}
```

---

## P1-4: 存活性 — state.yaml 原子写入 + PID 表 + reaper

**决策**:

### state.yaml 原子写入

```typescript
async function writeStateYaml(runId: string, state: string): Promise<void> {
  const tmpPath = `${stateDir}/${runId}.tmp.yaml`;
  const finalPath = `${stateDir}/${runId}.yaml`;
  await fs.writeFile(tmpPath, state, 'utf8');
  await fs.fsyncSync(fs.openSync(tmpPath, 'w'));  // 同步 fsync
  await fs.renameSync(tmpPath, finalPath);          // atomic rename
}
```

### PID 表 + reaper

**runs 表新增 `pid` 字段**:

```typescript
pid: integer("pid"),  // Claude Code PTY 进程的 PID
```

**Boot reaper**: Host 启动时扫描 `runs.status IN ('running','initializing','evaluating')`,检查 `pid` 是否存在:
- 存在但进程已死 → 标 `failed(reason: "host-restart")`
- 存在且进程活着 → 检查 `cwd` 是否还在 worktree 内,是则跳过(可能是正常长运行),否则 SIGKILL + 标 failed

### audit-trail.json 不可变

**决策**: 终态写一次后,永不覆盖。重试场景追加到 `rounds[]` 数组,不改旧轮次。

**F003 处理**: 更新 schema 加 `pid` 字段。更新 state.yaml 写入策略为 tmp+rename。

---

## P1-5: audit_events 写失败语义

**决策**: **fire-and-forget + pino warn。** audit_events 写入失败不影响 Run 执行。

```typescript
async function writeAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await db.insert(auditEvents).values(event);
  } catch (err) {
    logger.warn({ err, runId: event.runId }, "audit_event write failed, continuing");
    // 不抛错,不重试,Run 继续执行
  }
}
```

**F005 处理**: 更新 §2.2 写入逻辑,明确 fire-and-forget 语义。

---

## P1-6: 审计盲区 — 新增 event_type

**决策**: 新增以下 4 种 event_type:

| event_type | 何时记录 | 关键字段 |
|---|---|---|
| `permission_denied` | deny 规则命中,tool call 被拒绝 | toolUsed, deniedRule, toolArgs |
| `memory_write` | L8 Memory 写入 | memoryId, type, contentHash |
| `context_injected` | L3 ContextBuilder 注入 ContextBundle | skills[], mcpServers[], tools[] |
| `run_stopped` | Run 停止(区分用户 stop vs 超时 stop) | stopSource: "user" \| "timeout" \| "budget" |

另外新增 2 种:
| `agent_spawned` | L4 Orchestrator spawn Claude Code | spawnCommand, cliArgs, envKeys(不记值), cwd |
| `skill_load_error` | Skill 文件加载失败 | skillName, error |

**system-design-review.md 处理**: 更新 audit_events 表 schema,新增 6 种 event_type 到 ENUM。

---

## P2-1: 截断阈值提升

**决策**:
| 字段 | 旧值 | 新值 |
|---|---|---|
| `tool_result` | 4KB | **32KB** |
| `prompt` | 16KB | **64KB** |
| 超限处理 | 截断 | 溢出到文件 + 字段存路径指针 |

**system-design-review.md 处理**: 更新 audit_events 表 schema 注释。

---

## P2-2: Redact 前置到 Iter 2

**决策**: 正则脱敏,在写入 audit_events 之前执行:

```typescript
const REDACT_PATTERNS = [
  { name: 'api_key', regex: /(?i)(api[_-]?key|apikey)\s*[:=]\s*["']?[\w-]+["']?/ },
  { name: 'bearer', regex: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/ },
  { name: 'password', regex: /(?i)(password|passwd|pwd)\s*[:=]\s*["']?[^\s,"']+["']?/ },
  { name: 'authorization', regex: /Authorization:\s*Bearer\s+[A-Za-z0-9\-._~+/=]*/ },
];
```

脱敏后的版本写入 DB,原始版本保留在 raw.log(可解密查看)。

**F005 处理**: 更新 §9 开放问题,redact 从 Iter 7 前置到 Iter 2。

---

## P2-3: blueprint_snapshot 增强

**决策**: `runs.blueprint_snapshot` 增加:
- `skillsBundleHash`: skills-bundle 的 SHA-256(验证技能包一致性)
- `gitHead`: `projectPath` 下的 `git rev-parse HEAD`(验证代码版本)

这样 Re-run 时能精确复现"当时那次跑的是什么"。

---

## 文档更新清单

| 文档 | 更新内容 |
|---|---|
| **F002 v0.6** | 默认值对齐(P0-4); phases[] 注释(P0-3); Trigger 类型锁定(P0-1) |
| **F003 v0.4** | 状态机完整迁移图(P1-2); idle 入口文档化(P1-2); pid 字段(P1-4); timeout 双路径(P1-2); Round × Phase × status 关系(P1-2) |
| **F004 v0.4** | WS 协议 seq + 4 种新事件(P1-1); 背压策略(P1-1); stream-json usage 解析(P1-3); OrchestratorMiddleware(P1-3) |
| **F005 v0.3** | 删 1.0 schema,只保留 2.0(P0-2); fire-and-forget 语义(P1-5); redact 前置(P2-2) |
| **triggers.md** | 触发器 type 字符串以 F002 为准(P0-1) |
| **ADR-0009** | phases[] 是执行图,sdafStages[] 是默认值(P0-3) |
| **ADR-0010** | maxRounds default 改 10(P0-4); trigger type 以 F002 为准(P0-1) |
| **system-design-review.md** | audit_events ENUM 加 6 种新事件(P1-6); tool_result/prompt 截断提升(P2-1); runs.pid 字段(P1-4) |

---

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v1.0 | ★ **Accepted** · 首版,收敛 4 处 P0 矛盾 + 12+ 处 P1 缺口 + 多项 P2 改进 |
