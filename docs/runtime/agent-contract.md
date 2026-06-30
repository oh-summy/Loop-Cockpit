---
title: Agent Runtime Contract
status: Placeholder
date: 2026-07-01
---

# Agent Runtime Contract

> **状态**: 占位文档。原 `docs/runtime/agent-contract.md` 已删除，但"运行时契约"
> 是重要的架构概念。本文档记录何时需要、需要什么。

## 什么是 Agent Runtime Contract

当 Loop Cockpit 的产品代码开始实现时，Host 需要将一套**运行时契约**注入到
被管理的 Agent（Claude Code / OpenCode / Codex 等）环境中。这包括：

- **System Prompt 模板**：Agent 启动时看到的完整 system prompt
- **Skill 列表**：Agent 可用的 skill 集合及其加载方式
- **MCP Server 配置**：Agent 连接的 MCP Server 列表和认证方式
- **权限约束**：Agent 允许/禁止的操作边界（deny rules）
- **审计钩子**：Agent 行为如何被记录到 audit_events 表
- **WebSocket 流**：Agent 输出如何实时推送到前端

## 何时需要

| 阶段 | 说明 |
|---|---|
| **编码前** | 设计阶段确定契约格式和字段 |
| **Iter 2 启动** | 实现 Agent Adapter 时需要注入契约 |
| **多 Agent 支持** | 每种 Agent 类型需要适配不同的契约格式 |

## 需要包含的内容

1. **System Prompt 结构**
   - Goal / Objective
   - Constraints (successCondition, deny rules)
   - Available tools / skills
   - Budget limits
   - Output format expectations

2. **Skill Bundle 格式**
   - 技能包的目录结构
   - `plugin.json` 元数据
   - Skill 之间的依赖关系

3. **MCP Server 注册**
   - 如何发现可用 MCP Server
   - 认证方式（API key / OAuth / 本地文件）
   - 超时和重试策略

4. **审计集成**
   - Agent 输出如何被捕获和解析
   - 审计事件的结构和写入时机

## 相关文档

- [ADR-0010](../architecture/decisions/0010-autonomous-loop-architecture.md) — 8 层架构中的 L4 Orchestrator
- [F004](../prd/F004-claude-adapter.md) — Claude Code Adapter
- [F002](../prd/F002-blueprint-editor.md) — Blueprint 配置中的 deny rules
