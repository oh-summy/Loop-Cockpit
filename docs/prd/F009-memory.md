---
id: F009
title: Memory(状态/经验)— Layer 8
status: Draft (skeleton)
priority: P0 (Iter 2 state.yaml / Iter 5 FTS5 跨 Loop)
iteration: Iter 2 + Iter 5
issue: TBD
owner: "@oh-summy"
updated: 2026-06-28
---

# F009 · Memory

> Layer 8 of [ADR-0010](../architecture/decisions/0010-autonomous-loop-architecture.md):Loop **不依赖聊天记录**,独立 State 文件 + 跨 Loop 经验复用。

---

## 1. 一句话

每轮 Loop 读写 state.yaml 持续推进;Iter 5 起加 SQLite FTS5 跨 Loop 经验库。

## 2. 范围

### Iter 2 - 单 Run state
- `~/.loop-cockpit/runs/<runId>/state.yaml` 每轮读写
- 字段:round / goal / plan / completedTasks / pendingTasks / budget / lastReflection / humanGates

### Iter 5 - 跨 Loop 经验
- SQLite FTS5 全文检索表 `memories`
- 类型:错误模式 / 成功模式 / 用户偏好
- 写入时机:Run 结束自动抓取关键报错入库
- 读取时机:[F007 Context Builder](./F007-context-builder.md) 按 task 描述检索 top-K

## 3. 数据契约

### 3.1 State 文件(state.yaml,Iter 2)

```yaml
schemaVersion: "1.0"
loopId: "bp_x"
runId: "r_K8xL2pQm9"
round: 3
goal:
  objective: "..."
  successCondition: "..."
plan: [...]
completedTasks:
  - { id, description, completedAt, output, evaluator }
inProgressTask: { id, description, startedAt }
pendingTasks: [...]
budget:
  tokensUsedUsd: 0.34
  roundsUsed: 3
  wallTimeMs: 124000
lastReflection: "..."
humanGates:
  - { taskId, requestedAt, status }
```

### 3.2 跨 Loop Memory(SQLite FTS5,Iter 5)

```typescript
// DB 表
memories {
  id: text primary key
  blueprintId: text (可空 = 跨 Blueprint 共享)
  type: 'error' | 'success' | 'preference'
  content: text                  // FTS5 索引
  context: text (json)           // 触发场景
  createdAt: timestamp
  effectiveness: integer         // 用户反馈打分 0-5
}

// MemoryConfig(Blueprint.memoryConfig)
interface MemoryConfig {
  enableCrossBlueprint: boolean;
  retentionDays: number;
  autoCapture: { errors: boolean; successes: boolean; preferences: boolean };
  injectionTopK: number;         // 启动时检索几条注入
}
```

## 4. 关联

- 上游:Verification 写入失败模式
- 下游:[F007 Context Builder](./F007-context-builder.md) 检索注入
- 持久化层见 [overview.md §4](../architecture/overview.md)

## 5. 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 骨架 |
