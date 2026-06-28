---
id: F010
title: Human Gate(人在环)— 横切层
status: Draft (skeleton)
priority: P1 (Iter 5)
iteration: Iter 5
issue: TBD
owner: "@oh-summy"
updated: 2026-06-28
---

# F010 · Human Gate

> 横切层 of [ADR-0010](../architecture/decisions/0010-autonomous-loop-architecture.md):关键决策必须人审。3 模式让用户在"安全性"和"无人值守"之间选。

---

## 1. 一句话

可配置的人审检查点,3 模式 + 通知集成 + 超时策略。

## 2. 3 种模式

| Mode | 行为 | 适用 |
|---|---|---|
| `interrupt` | 立即暂停 Loop,等用户响应(像 LangGraph `interrupt()`) | 高风险任务,user 在线 |
| `default-approve` | 发通知,Loop 照跑;收"拒绝"才中断 | 无人值守 + 信任 AI |
| `default-reject` | 暂停 Loop,timeout 内未"批准"自动 reject | 严格审批流 |

## 3. 数据契约

### 3.1 HumanGateConfig(Blueprint.humanGateConfig)

```typescript
interface HumanGateConfig {
  enabled: boolean;
  gates: HumanGate[];
}

interface HumanGate {
  id: string;
  triggerCondition: 'always' | 'when-needs-review' | 'on-failure' | 'on-budget-warning' | 'custom';
  customRegex?: string;            // triggerCondition='custom' 时
  mode: 'interrupt' | 'default-approve' | 'default-reject';
  notification: { ui: boolean; email?: boolean; lark?: boolean; slack?: boolean };
  timeoutMs?: number;
  timeoutAction: 'approve' | 'reject' | 'pause';
}
```

### 3.2 HumanGateEntry(audit,runs.human_gate_history)

```typescript
interface HumanGateEntry {
  gateId: string;
  round: number;
  taskId?: string;
  mode: 'interrupt' | 'default-approve' | 'default-reject';
  triggeredBy: string;             // "failure" / "budget" / "custom-match"
  requestedAt: timestamp;
  respondedAt?: timestamp;
  decision: 'approve' | 'reject' | 'timeout';
  decidedBy?: string;
  notificationsSent: string[];     // ["ui", "email"]
}
```

### 3.3 API

| Method | Path | 说明 |
|---|---|---|
| `GET` | `/api/runs/:id/pending-gates` | 查待审项 |
| `POST` | `/api/gates/:gateEntryId/approve` | 批准 |
| `POST` | `/api/gates/:gateEntryId/reject` | 拒绝(可带 reason) |

## 4. 关联

- 上游:[F008 Verification](./F008-verification.md) 决定触发 Gate
- 通知:[Channel Hub](#) (Iter 6) 发飞书/Slack
- LangGraph 学术先例:`interrupt() + Command(resume=value)` 模式

## 5. 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 骨架,Iter 5 实施 |
