# Loop Engineering 研究报告:Loop 到底是什么?

> **日期**: 2026-06-28
> **触发**: 维护者问 "Loop 到底是啥,可以设计什么"
> **方法**: 2 轮 deep-research(共 50+ 来源,主要博客 + 仓库 + 论文 + 闭源 blog)
> **结论用途**: 修订 product-overview.md / F002 PRD / 决定 Iter 2 之后的产品方向

---

## 1. 行业共识:Loop Engineering 的正式定义

### 1.1 三句标杆话

**Boris Cherny**(Anthropic, Claude Code 负责人,2026-06 Acquired podcast):
> "我不再给 Claude 写提示词了。我有一堆 Loop 在跑,Loop 来 prompt Claude、来决定做什么。我的工作就是写 Loop。"

**Peter Steinberger**(2026-06-07 推文):
> "你不该再 prompt coding agent 了。你应该**设计 prompt 它们的 Loop**。"

**Addy Osmani**(2026-06-07 博客 [loop-engineering](https://addyosmani.com/blog/loop-engineering)):
> "Loop Engineering 就是把'那个 prompt agent 的人'替换掉——你转去设计**做这件事的系统**。"

### 1.2 Loop 的标准定义(Simon Willison,2025-09-18,已成事实标准)

> **An LLM agent runs tools in a loop to achieve a goal.**

来自 Anthropic 工程师 Hannah Moran 在 2025-05 开发者大会发言,Willison 在 [agents](https://simonwillison.net/2025/Sep/18/agents) 收录为正典。

**最小拆解**:
- LLM
- system prompt
- tools(可调用的函数集合)
- harness(while-loop:解析 tool call → 执行 → 把结果塞回 messages → 再发给 LLM)
- stopping goal(LLM 输出"完成"信号 或 外部判定通过)

任何 agent 框架剥到底都是这个结构。

### 1.3 Loop 的"五件套 + 一个记忆"(Osmani,2026-06)

Osmani 在 loop-engineering 博客明确列出 Loop 的解剖学:

| 件套 | 说明 |
|---|---|
| **Automations** | 触发器(Cron / Webhook / 事件) |
| **Worktrees** | 隔离的执行沙箱 |
| **Skills** | 注入到 prompt 的可复用规则包 |
| **Plugins / Connectors** | 让 agent 能调外部服务 |
| **Sub-agents** | 把任务拆给隔离 context 的子 agent 完成 |
| **State 文件(记忆)** | "agent 会忘,repo 不会忘"——把状态写在文件而不是对话里 |

这就是 Loop 的**官方推荐配置维度**。

---

## 2. Loop Cockpit 现有定义 vs 行业共识

| 件套 | Loop Cockpit 现状 | 差距 |
|---|---|---|
| Automations(Trigger) | ✅ Manual/Cron/Webhook(规划) | OK |
| Worktree | ✅ Iter 3 计划 | OK |
| Skill | 🟡 PRD §A 提到,Iter 7+ UI | 需要在 Blueprint 提前留字段 |
| Plugin / MCP | 🟡 PRD §A 提到,Iter 7+ UI | 同上 |
| **Sub-agent** | ❌ **PRD 未提**,仅 product-overview §H Artifact 间接相关 | **明显缺口** |
| **State 文件 / Memory** | 🟢 Iter 5 计划(FTS5) | OK,但需理解"agent 会忘"的核心 — Memory 不只是 retrieval,是 Loop 的"长期记忆"边界 |
| **Evaluator(评估器)** | 🟡 仅 Done Criteria (shell exit code) | **明显缺口**——下文详述 |

---

## 3. 11 个真实项目的 Loop 抽象对照

(基于第二轮搜索的实际文档抓取,完整 JSON 见 [appendix](#appendix))

### 3.1 State 抽象有两派

**显式 schema 派**:
- **LangGraph**:`StateGraph` + `TypedDict` + `reducer`,每个 superstep 持久化 checkpoint,用 `thread_id` 寻址。`interrupt()` 在节点内挂起,`Command(resume=...)` 恢复。
- **OpenHermit**(47 stars, TS, 最接近 Loop Cockpit 定位):12 张 PG 表:agents / sessions / session_events / memories / instructions / users / sandboxes / skills / mcp_servers / channels / secrets / **schedules**。明确分内/外 state — internal 在共享 PG,external 在 per-agent docker/e2b/daytona sandbox。
- **CrewAI**:`Task` dataclass + `Crew(agents, tasks, process)`,`task.context` 显式 DAG 依赖。

**隐式 message-list 派**:
- **OpenAI Swarm**:无状态,每次调用传完整 messages + context_variables
- **OpenAI Agents SDK**(Swarm 的生产化版):`RunState.to_state()` 整 run 序列化用于断点续跑
- **AutoGen**:`chat_messages: Dict[Agent, List]` pub-sub 模型
- **Claude Code**:text-based system prompt + tool log,subagent 用 markdown frontmatter 定义

### 3.2 Resume / 断点续传机制

三种:
1. **LangGraph 节点级 interrupt**:节点内部挂起,可任意次 resume
2. **OpenAI Agents SDK RunState 序列化**:整 run 可存可读回
3. **stateless**:Swarm / LangChain AgentExecutor — 不保存,调用方传完整 history

Loop Cockpit 选哪个?**RunState 序列化**最匹配 — 单用户本地、SQLite 持久化、不需要节点级中断。

### 3.3 多 agent 编排模式

| 模式 | 代表 |
|---|---|
| pub-sub | AutoGen GroupChat |
| 显式 DAG | CrewAI `task.context` |
| handoff by function return | Swarm / OpenAI Agents SDK |
| state graph | LangGraph |
| 父-子隔离 context | Claude Code subagent |

### 3.4 Cognition 的反共识

Cognition (Devin 制造商) **明确反对** parallel subagent:
- 2024 [Don't Build Multi-Agents](https://cognition.com/blog/dont-build-multi-agents):"writes 不能多线程,subagent 并行容易在冲突假设下产出脆弱结果"
- 2025-10 改口:writes 仍单线程,reads 可并行

对 Loop Cockpit 的启示:**Iter 7+ 做 sub-agent 时要谨慎,默认 single-threaded linear,需要并行时只让"读"并行**。

### 3.5 Aider 的独特设计:edit format 是一等公民

Aider 把"修改代码"的 protocol 抽象成 6 种 edit format(whole / diff / diff-fenced / udiff / editor-diff / editor-whole),**不同模型搭不同格式**。Architect 模式更进一步:reasoning model(o1-preview)+ editing model(DeepSeek)解耦,SOTA 85% 来自这种组合。

**对 Loop Cockpit 启示**:`AgentAdapter` 接口可能要预留 "edit format" 概念,而不是把"Agent 输出格式"硬绑死。

### 3.6 Geoffrey Huntley 的 "Ralph Loop"(最朴素的 Loop)

[ghuntley.com/ralph](https://ghuntley.com/ralph)(2025-07-14):
```bash
while :; do cat PROMPT.md | claude-code ; done
```

最朴素的 Loop = bash while-loop + fixed prompt + plan file。Huntley 强调:
> **"代码生成现在很容易。难的是确保 Ralph 生成的是对的东西。"**

这正是 Loop Cockpit 的 **Done Criteria** 要解决的 — 但他用的是"back pressure"框架(任何能拒绝无效代码的东西都可以接入)。Done Criteria 只是 back pressure 的一种实现,更通用是 "Evaluator"。

---

## 4. Loop 完整输入维度(对照现有 Blueprint schema)

### 4.1 已有(F002 v4 草案)

| 字段 | 类型 |
|---|---|
| name | string |
| goal | text |
| doneCriteria | text |
| agent | string("claude-code") |
| model | string |
| projectPath | string |
| retryPolicy | { maxRetries, timeout, budget, onFail } |
| triggers | discriminated union |
| type | enum(bug/refactor/test/docs/check/other) |

### 4.2 行业共识缺的字段

参考 OpenHermit / Osmani / Claude Code,**Loop Cockpit 应该补**:

| 字段 | 来源 | 必要性 |
|---|---|---|
| **systemPrompt** | Osmani / Claude Code | 🟡 P1 — Iter 2 已规划,Blueprint 编辑器加"高级:System prompt template"折叠区 |
| **skills**: SkillRef[] | Osmani | 🟢 P2 — Iter 7+ |
| **mcpServers**: MCPRef[] | Anthropic 标准 | 🟢 P2 — Iter 7+ |
| **subagents**: SubagentRef[] | Claude Code / Anthropic | 🟢 P2 — Iter 7+,需要先做 Memory |
| **memory.injectionMode** | OpenHermit / Osmani | 🟢 P2 — Iter 5 Memory 模块 |
| **memory.retentionDays** | OpenHermit schedules | 🟢 P2 — Iter 5 |
| **artifacts.consumes**: ArtifactRef[] | product-overview §H | 🟢 P2 — Iter 4+ |
| **artifacts.produces**: ArtifactSchema[] | product-overview §H | 🟢 P2 — Iter 4+ |
| **secrets**: SecretRef[] | OpenHermit | 🟡 P1 — Iter 2 之后凭据管理 |
| **environment.envVars** | OpenHermit | 🟡 P1 — Iter 2 加 |
| **environment.cwd** | (= projectPath, 已有) | OK |
| **edit format**(代码 agent 专用) | Aider | 🟢 P2 — 多 agent 适配时考虑 |
| **stoppingGoal**(LLM 自我判定停止) | Willison | 🟡 P1 — Done Criteria 之外的"软停止" |

### 4.3 触发上下文(Trigger payload)

现状:Trigger 只传 "我被触发了" 信号。**缺**:
- Webhook payload(GitHub PR diff、Issue body、飞书消息内容)
- 触发时刻、触发源元数据(谁 / 什么时间 / 从哪)
- 上下游 Run 链(parentRunId 已有,但 triggerContext 缺)

Iter 4 Trigger Bus PRD 应该明确 **TriggerEvent payload schema**。

---

## 5. Loop 完整输出维度

### 5.1 已有

- 代码 diff(隐式,通过 Worktree)
- raw stdout(`raw.log` 文件)
- audit-trail.json
- exit code / Done Criteria result
- token 消耗

### 5.2 行业共识缺的输出

| 输出 | 来源 | 必要性 |
|---|---|---|
| **Artifact(给下游 Loop)** | product-overview §H 已有,需 PRD 化 | 🟡 P1 — Iter 4 |
| **Memory write(经验沉淀)** | Osmani / Reflexion 论文 | 🟡 P1 — Iter 5 |
| **Reasoning trail** | Anthropic interleaved thinking | 🟢 P2 — Iter 5 audit 强化 |
| **Tool call timeline** | Claude Code, Aider | 🟡 P1 — Iter 2 audit-trail.json 应该结构化记录每次 tool call |
| **Signal events(供 Channel 推送)** | OpenHermit channels | 🟡 P1 — Iter 6 Channel Hub |
| **Metrics(运行时指标)** | 缺 | 🟢 P2 — Iter 5 |

---

## 6. Loop 完整配置/能力维度

### 6.1 Evaluator(评估器) - 最大缺口

现状:Done Criteria 是单一 shell command。

**行业实际**:
| 评估方式 | 适用场景 |
|---|---|
| **Shell exit code** ✅ 已有 | lint/test/build 等机器可验证 |
| **Unit test** | 类似但更结构化 |
| **LLM-as-judge** | Goal 是"代码可读"等主观目标 |
| **Benchmark / Score** | Goal 是"覆盖率 ≥ 85%" 这类阈值 |
| **Multi-evaluator vote** | 高风险任务要多个 evaluator 都通过 |
| **Human review** | 关键改动 需人工 review |

**建议**:Iter 3+ 把 Done Criteria 抽象成 Evaluator,允许多个 evaluator 组合。当前 shell exit code 是默认实现。

### 6.2 决策点(分支策略)

Loop 失败时不只 "retry / stop":
- **Retry**:再试一次,可能加 hint(`maxRetries`)
- **Escalate**:升级 model(Sonnet → Opus)再试
- **Replan**:让 agent 重新拆分任务
- **Subagent fallback**:换 subagent 试
- **Human**:卡 human review
- **Give up**:彻底放弃,写错误日志

现状 retryPolicy.onFail 只有 `notify / stop` 二选一。**Iter 3+ 应该扩展成多分支决策。**

### 6.3 并行 vs 串行

- Iter 2 默认 1 Run = 1 Task,串行
- Iter 7+ 做 sub-agent 时,记得 Cognition 警告 — writes 单线程,reads 可并行
- 工具调用本身可并行(Anthropic 鼓励 parallel tool use)

---

## 7. 针对独立开发者场景的 yes / no 清单

| 维度 | 独立开发者要不要 |
|---|---|
| Worktree 沙箱 | ✅ 必要(防止 Agent 弄坏主 repo) |
| Memory(经验) | ✅ 必要(同样的错误别犯第二次) |
| Skill | 🟡 想要(用一两个简单的) |
| MCP | 🟢 长期要,Iter 2 不急 |
| Sub-agent | 🟢 长期想要,Iter 7+ |
| Channel(飞书/Slack) | ✅ 必要 (Iter 6 dogfooding) |
| Artifact 跨 Loop | 🟡 想要(每周 commit 摘要 → 周报) |
| Webhook 触发 | ✅ 必要(GitHub PR / Issue 联动) |
| Token 预算 | ✅ 必要 |
| 一次性任务 | ✅ 必要(已 v4 加) |
| 多 evaluator | 🟢 想要 Iter 3+ |
| Escalate to Opus | 🟢 想要 Iter 3+ |
| Human-in-loop review | 🟢 想要 Iter 3+ |
| Multi-tenant 权限 | ❌ non-goals §4 已锁不做 |
| 跨机同步 | ❌ non-goals §1 |
| Multi-thread parallel subagent | 🟠 Cognition 警告,默认不做 |

---

## 8. 对 Loop Cockpit 产品的具体改动建议

### 8.1 product-overview.md 需要加的内容

1. **明确"五件套"映射**:Loop = Trigger + Worktree + Skill + MCP/Plugin + Sub-agent + Memory
2. **Evaluator 概念引入** §B Runtime 引擎部分,目前 Done Criteria 只是 Evaluator 的一种
3. **TriggerEvent payload** 明确,Iter 4 Trigger Bus PRD

### 8.2 F002 Blueprint PRD 应该加的字段

| 字段 | 状态 |
|---|---|
| systemPromptTemplate | v4 原型已有"高级"折叠 |
| envVars: Record<string,string> | **缺,加** |
| stoppingGoal: text(LLM 自我判定停止) | **缺,加(Iter 2)** |
| skills: SkillRef[] | placeholder,Iter 7+ |
| mcpServers: MCPRef[] | placeholder,Iter 7+ |

### 8.3 F003 Run PRD 应该加的字段

| 字段 | 状态 |
|---|---|
| triggerContext: json(payload 等) | **缺,加** |
| toolCalls: ToolCallTrace[](结构化) | **缺,加** |
| memoryReads / memoryWrites | Iter 5 加 |
| artifactsConsumed / artifactsProduced | Iter 4 加 |

### 8.4 应该开的新 ADR

- **ADR-0004 Worktree 隔离**(Iter 3)— 已规划
- **ADR-0005 Trigger Bus + TriggerEvent payload schema**(Iter 4)
- **ADR-0006 Evaluator 抽象**(Iter 3+)— 新增
- **ADR-0007 Sub-agent 设计 - 默认 single-threaded**(Iter 7+)— 引用 Cognition 立场
- **ADR-0008 Memory 系统设计**(Iter 5)— internal vs external state(OpenHermit 思路)

### 8.5 是否模仿 OpenHermit 的"内外 state 分离"?

**强烈建议是**。OpenHermit 的核心设计:
- Internal state(memories/sessions/skills)进共享 PG by agent_id
- External state(workspace files)进 per-agent sandbox

Loop Cockpit 对应:
- Internal state(Blueprint/Run/Memory/Skill)进 SQLite(单文件 keyed by blueprintId/runId)
- External state(代码改动 / artifacts)进 Worktree + Artifact FS

这其实**已经是当前架构**(ADR-0003 双轨数据),但 **OpenHermit 的明确化值得在 overview.md 引用**。

---

## 9. 主要来源

- **Loop Engineering**:[Addy Osmani 博客](https://addyosmani.com/blog/loop-engineering),[Peter Steinberger 推文](https://twitter.com/steipete),[Boris Cherny @ Acquired](https://www.productmarketfit.tech/p/stop-prompting-ai-and-start-building)(二手)
- **Agent 标准定义**:[Simon Willison "tools in a loop"](https://simonwillison.net/2025/Sep/18/agents)
- **最朴素 Loop**:[Geoffrey Huntley Ralph](https://ghuntley.com/ralph)
- **Harness 框架**:[Osmani agent-harness-engineering](https://addyosmani.com/blog/agent-harness-engineering)
- **LangGraph**:[官方 docs](https://docs.langchain.com/oss/python/langgraph/interrupts)
- **OpenAI Agents SDK**:[runner ref](https://openai.github.io/openai-agents-python/ref/run)
- **CrewAI**:[docs](https://docs.crewai.com/v1.14.7/en/concepts/tasks)
- **AutoGen / AG2**:[GroupChat API](https://docs.ag2.ai/latest/docs/api-reference/autogen/GroupChat)
- **OpenAI Swarm**:[GitHub](https://github.com/openai/swarm)
- **Claude Code subagent**:[Anthropic docs](https://docs.anthropic.com/en/docs/claude-code/sub-agents)
- **OpenHermit**:[GitHub](https://github.com/HCF-STUDIOS/openhermit)
- **GPT Researcher**:[docs](https://docs.gptr.dev/docs/gpt-researcher/multi_agents/langgraph)
- **Aider**:[edit-formats](https://aider.chat/docs/more/edit-formats.html)
- **Cognition Don't Build Multi-Agents**:[blog](https://cognition.com/blog/dont-build-multi-agents) + [反转](https://cognition.ai/blog/multi-agents-working)

---

## 10. 行动项

要拍板的事(待维护者批准):

| 项 | 影响 |
|---|---|
| (a) 更新 product-overview.md 加 Loop 五件套映射、Evaluator 概念 | 改文档 |
| (b) 更新 F002 Blueprint PRD 加 envVars / stoppingGoal 字段 | 改文档 + UI 加字段 |
| (c) 更新 F003 Run PRD 加 triggerContext / toolCalls 结构化记录 | 改文档 |
| (d) 计划 ADR-0006 Evaluator 抽象、ADR-0007 Sub-agent、ADR-0008 Memory(都是 Iter 3-7 之间) | 路线图层 |
| (e) 在 v4 原型加 envVars 编辑器(高级区) | 改原型 |
| (f) 把"loop 真正是什么"补一段到 docs/architecture/glossary.md Loop 词条 | 改文档 |

---

## Appendix · 第二轮搜索 JSON 原始数据

完整 JSON 见会话历史的 task-notification(`afc63952d5e2d7bd9`)。
关键摘录:11 个项目的 Loop 抽象字段对照表,包含 LangGraph / LangChain AgentExecutor / AutoGen / CrewAI / Swarm / OpenAI Agents SDK / GPT Researcher / Aider / Claude Code / Cognition / OpenHermit。

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 首版,基于两轮 deep-research |
