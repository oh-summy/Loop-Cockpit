---
id: F008
title: Verification(验证器)— Layer 7
status: Draft (skeleton)
priority: P0 (Iter 2 shell-only / Iter 5 多 evaluator)
iteration: Iter 2 + Iter 5
issue: TBD
owner: "@oh-summy"
updated: 2026-06-28
---

# F008 · Verification

> Layer 7 of [ADR-0010](../architecture/decisions/0010-autonomous-loop-architecture.md):Worker 执行后判断"任务完成了吗 / Goal 达成了吗 / 下一步去哪"。

---

## 1. 一句话

多 evaluator 组合判定 Loop 推进策略,输出 6 种 nextAction 之一。

## 2. 范围

### Iter 2 - 简化版
- 仅 shell evaluator(沿用 doneCriteria 概念)
- 仅 Goal.successCondition 判 Loop 整体是否达成
- nextAction: 仅 next-task / terminal / fail / retry

### Iter 5 - 完整版
- 4 种 evaluator + AND/OR 组合
- 6 种 nextAction 全开
- Goal 级 + Task 级 + Phase 级 三级评估

## 3. 数据契约

### 3.1 VerifConfig(Blueprint.verificationConfig)

```typescript
interface VerifConfig {
  goalEvaluator: Evaluator;       // Iter 2: shell;Iter 5: 任一
  taskEvaluator?: Evaluator;      // Iter 5
  phaseEvaluator?: Evaluator;     // Iter 5
}

type Evaluator =
  | { type: 'shell', command: string }
  | { type: 'llm-judge', prompt: string, model?: string }
  | { type: 'regex', pattern: string, against: 'stdout' | 'stderr' | 'state' }
  | { type: 'human', timeoutMs?: number }
  | { type: 'compose', op: 'AND' | 'OR', children: Evaluator[] };  // Iter 5
```

### 3.2 VerifResult(audit 记录,存在 runs.verification_history)

```typescript
interface VerifResult {
  round: number;
  taskId?: string;
  evaluatorType: string;
  passed: boolean;
  result: any;                    // shell.exitCode / llm.classification / regex.match
  reasoning?: string;
  nextAction: 'next-task' | 'replan' | 'retry' | 'human' | 'terminal' | 'fail' | 'escalate';
  evaluatedAt: timestamp;
  tokensUsed?: number;            // llm-judge 时
}
```

## 4. 关联

- 上游:[F005 Worker](#) (Worker 执行结果)
- 下游:决定回到 [F006 Planner](./F006-planner.md) / [F011 Reflection](./F011-reflection.md) / 终止

## 5. 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 骨架,Iter 2 实施 shell-only,Iter 5 完整 |
