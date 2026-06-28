---
id: F011
title: Reflection / Retry(反思重试)— 横切层
status: Draft (skeleton)
priority: P1 (Iter 3)
iteration: Iter 3
issue: TBD
owner: "@oh-summy"
updated: 2026-06-28
---

# F011 · Reflection / Retry

> 横切层 of [ADR-0010](../architecture/decisions/0010-autonomous-loop-architecture.md):失败时**LLM 反思** → 改方案 → 针对性重试。**不是简单 retry,是改后 retry**。

---

## 1. 一句话

Worker 失败 / Verification 判 retry 时,调 Reflection LLM 分析失败原因 + 出改动建议,反馈给下一轮 Planner / Context Builder / 升级 model。

## 2. 学术依据

[Reflexion (arXiv 2303.11366)](https://arxiv.org/abs/2303.11366):
- Actor `M_a` 生成 trajectory
- Evaluator `M_e` 给分
- **Self-Reflection `M_sr` 生成言语强化信号**
- 失败 → reflection 写入长期 mem buffer → 下一轮 Actor 看到 reflection 后改策略

Loop Cockpit 落地这个机制:Reflection = `M_sr`。

## 3. 数据契约

### 3.1 ReflectionConfig(Blueprint.reflectionConfig)

```typescript
interface ReflectionConfig {
  enabled: boolean;
  model: string;                       // 通常用与 Planner 同 model
  systemPromptTemplate?: string;
  maxReflectionsPerRound: number;      // default 1
  escalateAfterN: number;              // N 次失败后升级 model,default 2
  escalateModel?: string;              // "claude-opus-4-8"
}
```

### 3.2 ReflectionEntry(audit,runs.reflection_history)

```typescript
interface ReflectionEntry {
  round: number;
  taskId?: string;
  triggeredBy: 'verification-failed' | 'budget-warning' | 'manual';

  failureContext: {
    errorSnippet: string;
    taskAttempted: string;
    toolCallsTrace: ToolCallRef[];
  };

  diagnosis: {
    rootCause: 'plan-wrong' | 'context-insufficient' | 'worker-capability' | 'tool-missing' | 'unknown';
    detail: string;
  };

  proposedFixes: {
    type: 'replan' | 'add-context' | 'escalate-model' | 'retry-as-is' | 'give-up';
    details: any;
  }[];

  selectedFix: string;        // 实际采纳的 fix
  reflectionTokens: number;
  reflectedAt: timestamp;
}
```

## 4. 关联

- 上游:[F008 Verification](./F008-verification.md) 触发 reflection
- 下游:[F006 Planner](./F006-planner.md) 下一轮 plan 时读 lastReflection 作为输入
- audit:存 runs.reflection_history,[F005](./F005-audit-trail.md) §rounds[].reflection

## 5. 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 骨架,Iter 3 实施 |
