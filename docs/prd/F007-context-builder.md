---
id: F007
title: Context Builder(上下文构建器)— Layer 3
status: Draft (skeleton)
priority: P0 (Iter 4)★ Loop Cockpit 最差异化
iteration: Iter 4
issue: TBD
owner: "@oh-summy"
updated: 2026-06-28
---

# F007 · Context Builder

> Layer 3 of [ADR-0010](../architecture/decisions/0010-autonomous-loop-architecture.md):**按任务类型/优先级/关联性按需挑选**注入给 Worker 的 ContextBundle。不一锅烩。
> ★ Loop Cockpit 最差异化的层 — 行业里 LangChain "Context Engineering" Write/Select/Compress/Isolate 四动作中的 Select。

---

## 1. 一句话

为当前任务挑选合适的 Memory + Skill + MCP + Tool + File + Subagent + Artifact 子集,组装成 ContextBundle,传给 Orchestrator。

## 2. 范围(Iter 4)

- 规则引擎模式(Iter 4):mapping `task.priority|type → ContextBundle`
- LLM 智能模式(Iter 5+):用户允许 LLM 自己挑(Context Selector LLM)
- 默认策略:简单加载所有用户配的 skill / tool(等价于 Iter 2-3 一锅烩行为)

## 3. 数据契约

### 3.1 CBConfig(Blueprint.contextBuilderConfig)

```typescript
interface CBConfig {
  mode: 'all' | 'rule-based' | 'llm-select';
  rules?: ContextRule[];          // mode=rule-based 时
  selectorModel?: string;         // mode=llm-select 时
}

interface ContextRule {
  match: {
    priorityIn?: ('P0' | 'P1' | 'P2')[];
    typeIn?: string[];             // task.type 关键词匹配
    descriptionRegex?: string;
  };
  bundle: Partial<ContextBundle>;
}
```

### 3.2 ContextBundle(Builder 输出)

```typescript
interface ContextBundle {
  taskId: string;
  systemPromptAdditions: string;  // append to Claude system prompt
  skills: SkillRef[];
  mcpServers: MCPRef[];
  tools: BuiltinTool[];
  subagents: SubagentRef[];
  files: FileRef[];               // --add-dir 加白
  memoryEntries: MemoryEntry[];   // 检索到的相关历史经验
  artifacts: ArtifactRef[];       // 上游 Loop 产物
  envVars?: Record<string, string>;
  permissionMode: 'plan' | 'acceptEdits' | 'bypassPermissions' | 'interactive';
  timeoutMs: number;
  effort?: 'low' | 'medium' | 'high';
}
```

## 4. 关联

- 上游:[F006 Planner](./F006-planner.md) 提供 Plan.tasks
- 下游:[F004 Adapter](./F004-claude-adapter.md) §6.0.* spawn 流程消费 ContextBundle
- 数据源:Tool Layer(Blueprint.defaultToolLayer)、[F009 Memory](./F009-memory.md)

## 5. 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 骨架,Iter 4 实施 |
