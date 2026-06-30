---
id: F005
title: Audit Trail(全量审计落盘)
status: Draft
priority: P0
iteration: Iter 2
issue: TBD
owner: "@oh-summy"
updated: 2026-06-28
---

# F005 · Audit Trail

> Run 结束(成功/失败/停止)时,把这次执行的**完整决策路径**写到 `audit-trail.json`。这是 Loop Cockpit "可审计性"产品承诺的物理载体。

---

## 1. 一句话

每个 Run 结束时落一份 `~/.loop-cockpit/runs/<runId>/audit-trail.json`,记录从 Blueprint 快照、实际 system prompt、Agent 输出、Done Criteria 评估到 token 消耗的全链路。

## 2. 目标 (Why)

PRD §K(可审计性)是用户**强烈强调**的 MVP 必备能力。理由:
- 凌晨 3 点 Run 失败,睡醒能 5 分钟内还原"为什么失败"
- 改了 Blueprint 之后,历史 Run 仍能复现"当时那次跑的是什么"(D5.2)
- 未来 Memory 模块要从 audit-trail 学习

本 PRD 是 [ADR-0003](../architecture/decisions/0003-sqlite-drizzle.md) Q6 双轨数据策略的"快照面"——DB 是可查询索引,audit-trail.json 是不可变快照档案。

## 3. 范围

### In Scope (Iter 2)
- **audit-trail.json 数据模型**:见 §6.1
- **落盘时机**:Run 进入终态(success/failed/stopped)时同步写入(不等 user 操作)
- **物理位置**:`~/.loop-cockpit/runs/<runId>/audit-trail.json`,与 raw.log 同目录
- **写入器模块**(`apps/host/src/audit/`):
  - 单一 `writeAuditTrail(runId): Promise<void>` 函数
  - 内部聚合数据:run row + blueprint snapshot + raw.log 摘要 + done criteria result + token usage
  - JSON 文件 pretty-print(便于人工读)
- **REST API**:`GET /api/runs/:id/audit-trail` 返回 JSON 文件内容
- **写入失败处理**:audit 写盘失败不影响 Run 终态,但要 pino error 日志 + DB `runs.audit_status='failed'` 标记

### Out of Scope (推后)
- **UI 推理链查看器**(Iter 5,需要可视化 reasoning chain — 当前 Iter 2 只落文件)
- **Run 回放器**(从 raw.log 重新 render Xterm — Iter 5 Memory & Audit 主题)
- **audit-trail 跨 Run 检索**(FTS5,Iter 5 Memory)
- **加密 / 签名**(防篡改,Iter 7+ 公开发布前考虑)
- **diff 可视化**(Worktree 失败时看代码改了什么 — Iter 3 Worktree PRD)

## 4. 用户故事 / Use Cases

- 作为用户(早上 9 点),我看到夜里跑挂的 Run,**点一下能下载 audit-trail.json**,丢给 AI 让它诊断
- 作为用户,改了 Goal 之后想看历史 Run 当时跑的是什么 prompt,**audit-trail 里有 blueprintSnapshot**(D5.2)
- 作为未来的 Memory 模块,我**扫所有 failed Run 的 audit-trail**,提取错误模式

## 5. 关联资源

| 类型 | 资源 | 说明 |
|---|---|---|
| 总 PRD | [product-overview.md §6 K · 可审计性](../architecture/product-overview.md) | 全功能上下文 |
| ADR | [0003 Q6 双轨](../architecture/decisions/0003-sqlite-drizzle.md) | 文件系统 vs DB 分工 |
| 上游 PRD | [F002 Blueprint](./F002-blueprint-editor.md) | 快照来源 |
| 上游 PRD | [F003 Run](./F003-run-state-machine.md) | 触发落盘的状态机终态 |
| 上游 PRD | [F004 Adapter](./F004-claude-adapter.md) | 提供 token usage |
| 术语 | [glossary.md "Audit Trail"](../architecture/glossary.md) | - |

## 6. 数据契约 / 接口

### 6.0 8 层架构 audit 字段(schemaVersion 2.0 — ★ 唯一 schema,ADR-0011)

audit-trail.json 在 Run 终态时一次性写,**完整快照**所有层的决策路径:

```json
{
  "schemaVersion": "2.0",
  "runId": "r_K8xL2pQm9",
  "blueprintId": "bp_xxx",
  "blueprintSnapshot": { /* 完整 Blueprint 配置(8 层) */ },

  "goalSnapshot": { /* Goal 5 字段 - L1 */ },

  "execution": {
    "startedAt": "...", "endedAt": "...", "durationMs": ...,
    "claudeSessionId": "uuid",
    "totalRounds": 3,
    "totalTasks": 5,
    "totalToolCalls": 23
  },

  "rounds": [          // ★ 8 层架构核心 - 每轮完整 trace
    {
      "round": 1,
      "startedAt": "...",
      "endedAt": "...",

      // L2 Planner 决策
      "planner": {
        "model": "claude-opus-4-8",
        "rationale": "先复现 bug,再定位,再修",
        "tasks": [ { "id": "t1", "description": "...", "priority": "P0" } ],
        "tokensUsed": 1234
      },

      // L3-L6 每个任务的执行
      "taskExecutions": [
        {
          "taskId": "t1",
          "contextBundle": {     // L3 - 注入了什么
            "skills": [...],
            "tools": [...],
            "memoryEntries": [...]
          },
          "spawnCommand": "...", // L4 + L5
          "toolCalls": [...],    // L5 全部 tool call timeline
          "exitCode": 0,
          "tokensUsed": 5678,

          // L7 Verification
          "verification": {
            "evaluatorType": "shell",
            "passed": true,
            "result": { "exitCode": 0, "stdoutTail": "..." },
            "nextAction": "next-task"
          }
        }
      ],

      // L8 Memory 写入(增量)
      "memoryDelta": {
        "added": [...],
        "updated": [...]
      },

      // 横切 - Reflection(失败时)
      "reflection": {
        "failureReason": "...",
        "diagnosis": "...",
        "plannedFix": "..."
      },

      // 横切 - Human Gate(触发时)
      "humanGate": {
        "mode": "interrupt",
        "requestedAt": "...",
        "decision": "approve",
        "decidedBy": "@oh-summy",
        "respondedAt": "..."
      }
    }
  ],

  "finalState": {
    "status": "success" | "failed" | "stopped",
    "goalAchieved": true,
    "budgetUsage": { "tokensUsedUsd": 0.18, "roundsUsed": 3, "wallTimeMs": ... },
    "errorSnippet": null
  }
}
```

### 6.1 落盘时机

> **注**: 1.0 schema (§6.1 旧版) 已删除。唯一 schema 为 2.0 (§6.0)。(ADR-0011 P0-2)

```json
{
  "schemaVersion": "2.0",
  "runId": "r_K8xL2pQm9",
  "blueprintId": "bp_xxx",
  "blueprintSnapshot": { /* 完整 Blueprint 配置(8 层) */ },
  ...
}
```

### 6.2 写入逻辑(★ v0.3 更新,ADR-0011)

```typescript
// apps/host/src/audit/writer.ts
export async function writeAuditTrail(runId: string): Promise<void> {
  const run = await db.select().from(runs).where(eq(runs.id, runId));
  const bp = run.blueprintSnapshot;  // 已快照,不再 join blueprints

  const auditTrail: AuditTrail = {
    schemaVersion: "2.0",
    runId,
    blueprintId: run.blueprintId,
    blueprintSnapshot: bp,
    ...
  };

  const path = `${HOME}/.loop-cockpit/runs/${runId}/audit-trail.json`;
  await writeFile(path, JSON.stringify(auditTrail, null, 2), "utf8");

  await db.update(runs).set({ auditStatus: "written" }).where(eq(runs.id, runId));
}
```

**写入失败语义(ADR-0011 P1-5)**: fire-and-forget + pino warn。audit_events 写入失败不影响 Run 执行。

### 6.3 REST API

| Method | Path | Response |
|---|---|---|
| `GET` | `/api/runs/:id/audit-trail` | `200 application/json`(原文件内容)/ `404` 如果未写入 |
| `GET` | `/api/runs/:id/audit-trail?download=1` | `Content-Disposition: attachment` |

## 7. 验收标准 (Done Criteria)

- [ ] Run 进 终态(success/failed/stopped)时,1s 内 audit-trail.json 写入磁盘
- [ ] 文件 JSON 合法(可被 `JSON.parse` 解析,vitest 测试覆盖)
- [ ] blueprintSnapshot 字段与 Run 触发时的 Blueprint 一致(即使后续 Blueprint 被改)
- [ ] retryHistory 在 Iter > 0 时填充,iter==0 时空数组
- [ ] 写盘失败不影响 Run.status,但 pino error + `runs.audit_status='failed'` 标记
- [ ] `GET /api/runs/:id/audit-trail` 返回 JSON,带 `?download=1` 触发浏览器下载
- [ ] vitest 集成测试:跑一个完整 Run → 验证 audit-trail 字段完整性

## 8. 非功能约束

- **大小**:单 audit-trail.json 通常 < 50 KB(主要靠 systemPrompt 体积),不含 raw.log 内容
- **同步写入**:Run 终态触发后同步写,失败不重试(简单 over 复杂)
- **不可变**:已写入的 audit-trail.json 不被再覆盖(重试场景在新 iteration 时 retryHistory 累加,但只在最终终态一次写盘)

## 9. 开放问题

- ⚠️ **Q · systemPrompt 包不包含敏感信息?**
  - **包含**,但写入前经过 redact 正则脱敏(ADR-0011 P2-2)。原始版本保留在 raw.log。
  - redact 正则: `api_key` / `bearer` / `password` / `authorization` 四类
- ⚠️ **Q · auditStatus 字段加在 runs 表还是单独表?**
  - 倾向:加在 runs 表(简单),与 [F003 §6.2](./F003-run-state-machine.md) 的 schema 合并

## 10. 变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 首版 Draft |
| 2026-06-28 | v0.2 | ★★ schema 升级到 2.0,加 8 层架构完整 trace 字段:rounds[] 每轮含 planner/taskExecutions/memoryDelta/reflection/humanGate(ADR-0010) |
| 2026-06-28 | **v0.3** | **★ ADR-0011 收敛: 删 1.0 schema(只保留 2.0),fire-and-forget 写入语义,redact 正则脱敏前置到 Iter 2** |
