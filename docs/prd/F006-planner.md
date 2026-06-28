---
id: F006
title: Planner(规划器)— Layer 2
status: Draft (skeleton)
priority: P0 (Iter 3)
iteration: Iter 3
issue: TBD
owner: "@oh-summy"
updated: 2026-06-28
---

# F006 · Planner

> Layer 2 of [ADR-0010](../architecture/decisions/0010-autonomous-loop-architecture.md):每轮 Loop 开始时调一次 LLM,出本轮任务列表 + 优先级 + 每任务成功标准。

---

## 1. 一句话

把用户的 Goal 拆成可执行任务序列,由专门 LLM 实例完成(可与 Worker 不同 model)。

## 2. 范围(Iter 3)

- 每轮 Loop 开头调用 Planner LLM
- 输入:Goal + Memory(已完成/待办)+ 上轮失败反思
- 输出:Plan(tasks[] + rationale + 预算估算)
- 用户可配:Planner model / system prompt 模板 / 是否每轮 replan

## 3. 数据契约

### 3.1 PlannerConfig(存在 Blueprint.plannerConfig 字段)

```typescript
interface PlannerConfig {
  enabled: boolean;                       // Iter 2 默认 false,Iter 3 起 true
  model: string;                          // "claude-opus-4-8"(思考型)
  systemPromptTemplate?: string;          // 默认模板内置
  replanEveryRound: boolean;              // true=每轮 replan,false=plan 一次执行到底
  maxTasksPerRound: number;               // default 5
  tokensBudgetPerCall: number;            // default 2000
}
```

### 3.2 Plan(每轮 Planner 输出)

```typescript
interface Plan {
  round: number;
  rationale: string;
  tasks: Task[];
}

interface Task {
  id: string;                     // nanoid
  description: string;
  priority: 'P0' | 'P1' | 'P2';
  successCriteria: string;        // 这个任务的成功标准
  estimatedTokens: number;
  requiresHumanReview?: boolean;
  hints?: string[];               // 给 Worker 的提示
}
```

### 3.3 PlannerCall(audit 记录,存在 runs.planner_history)

```typescript
interface PlannerCall {
  round: number;
  calledAt: timestamp;
  model: string;
  inputs: { goal, memory, lastReflection };
  output: Plan;
  tokensUsed: number;
  durationMs: number;
}
```

## 4. 关联

- 上游 PRD:[F002](./F002-blueprint-editor.md) Blueprint 加 plannerConfig 字段
- 下游:[F007 Context Builder](./F007-context-builder.md) 消费 Plan.tasks 挑 Context
- 横切:[F011 Reflection](./F011-reflection.md) 失败时把分析喂回下一轮 Planner

## 5. 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 骨架,Iter 3 实施 |
