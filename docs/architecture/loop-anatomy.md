# Loop 完整解剖(Loop Anatomy)

> 一份图文并茂的"Loop Cockpit 里一个 Loop 到底是什么"。
> 完整设计见 [ADR-0010](./decisions/0010-autonomous-loop-architecture.md)。
> 本文是 onboarding 用,读完应能向朋友解释清楚 Loop Cockpit。

---

## 1. 一句话

**Loop = AI 自治执行的目标驱动闭环,Loop Cockpit 给你 8 层配置面板让你精细控制 AI 怎么完成它。**

不是 Cron + Claude Code。
不是单纯阶段编排。
是**用户配规则,AI 自治执行**。

---

## 2. 完整数据流

```
       ┌─────────────────────────────────────────────────────────────┐
       │  ① 触发器(Trigger)                                          │
       │     Manual / Cron / 一次性 / Webhook / Git / Email / 消息 / │
       │     File Watch / Boot / 其他 Loop 完成 / API ...             │
       └─────────────────────────────────────────────┬───────────────┘
                                                     ▼
       ┌─────────────────────────────────────────────────────────────┐
       │  ② Goal · Loop 的"宪法"                                      │
       │     • objective       (修复 Issue #123)                      │
       │     • constraints[]   (不能改 API、不能升 deps)              │
       │     • successCondition(pnpm test && git diff API/ 为空)      │
       │     • deadline?       (今晚 23:00 前)                        │
       │     • budget          (20 轮 / $1 / 10 分钟)                 │
       └─────────────────────────────────────────────┬───────────────┘
                                                     ▼
       ┌─────────────────────────────────────────────────────────────┐
       │  ⓪ 读 Memory(State)                                         │
       │     从上一轮的 state.yaml 恢复任务列表 / 已完成 / 待办        │
       └─────────────────────────────────────────────┬───────────────┘
                                                     ▼
   ┌───┤  开始一轮 Loop                                                 │
   │   ▼
   │   ┌─────────────────────────────────────────────────────────────┐
   │   │  ③ Planner(LLM 思考型)                                      │
   │   │     Input: Goal + State + 上轮结果                            │
   │   │     Output: 本轮任务列表 [P0/P1/P2] + 每个任务的成功标准      │
   │   └─────────────────────────────────────────────┬───────────────┘
   │                                                 ▼
   │                                       挑下一个未完成的 P0 任务
   │                                                 │
   │                                                 ▼
   │   ┌─────────────────────────────────────────────────────────────┐
   │   │  ④ Context Builder ★ 本产品最差异化的层                       │
   │   │     按任务类型 / 优先级 / 关联性挑:                           │
   │   │     - 哪些 Memory 条目                                        │
   │   │     - 哪些 Skill (从用户级/项目级中)                          │
   │   │     - 哪些 MCP 服务                                           │
   │   │     - 哪些 tool 内建工具                                      │
   │   │     - 哪些 Subagent                                           │
   │   │     - 哪些 File / Artifact                                    │
   │   │     不是一股脑塞,是按需注入                                  │
   │   └─────────────────────────────────────────────┬───────────────┘
   │                                                 ▼
   │   ┌─────────────────────────────────────────────────────────────┐
   │   │  ⑤ Orchestrator                                              │
   │   │     根据 ContextBundle:                                       │
   │   │     • 启 Claude Code (--session-id $UUID + --bare)            │
   │   │     • 注入 --plugin-dir / --mcp-config / --agents / --tools  │
   │   │     • 设 --permission-mode (plan/acceptEdits/bypass)         │
   │   │     • 如有 subagent,决定调度顺序                             │
   │   └─────────────────────────────────────────────┬───────────────┘
   │                                                 ▼
   │   ┌─────────────────────────────────────────────────────────────┐
   │   │  ⑥ Worker Agent · Claude Code 实际跑                         │
   │   │     在 worktree 沙箱里:读文件 / 改代码 / 跑命令 / 调 subagent  │
   │   │     流式输出走 stream-json,Loop Cockpit 实时解析             │
   │   └─────────────────────────────────────────────┬───────────────┘
   │                                                 ▼
   │   ┌─────────────────────────────────────────────────────────────┐
   │   │  ⑦ Verification                                              │
   │   │     评估器(可多个组合):                                     │
   │   │     - shell exit (跑 successCondition)                       │
   │   │     - llm-judge (LLM 判)                                     │
   │   │     - regex 匹配输出                                          │
   │   │     - human 必审                                              │
   │   │     输出决策:                                                │
   │   │     ├─ Goal 已达 → __terminal__                              │
   │   │     ├─ 还有任务 → 写 Memory, 下一任务                        │
   │   │     ├─ 失败 + 有预算 → Reflection                             │
   │   │     ├─ 撞预算 → __fail__                                      │
   │   │     └─ 需人审 → Human Gate                                    │
   │   └─────────────────────────────────────────────┬───────────────┘
   │                                                 ▼
   │   ┌─────────────────────────────────────────────────────────────┐
   │   │  ⑧ Write Memory(state.yaml)                                 │
   │   │     完成的任务 / 失败的任务 / 学到的经验 / 当前进度            │
   │   │     ★ 不依赖聊天记录                                          │
   │   └─────────────────────────────────────────────┬───────────────┘
   │                                                 ▼
   │                                            判断是否继续
   │                                            ├─ 是 → 回轮(回 ③)
   │                                            │
   ◄───────────────────────────────────────────┘
       继续下一轮(Round + 1)


   横切层(在任何步骤都可能介入):

   ★ Reflection / Retry
     失败时 LLM 反思: Planner 错? Context 不够? Worker 能力?
     → 改方案 / 升级 model / 重试

   ★ Human Gate
     关键决策需人审。3 模式:
     - interrupt: 立即暂停,等响应
     - default-approve: 通知,Loop 照跑,拒绝才停
     - default-reject: 暂停,timeout 自动拒
```

---

## 3. 一个完整 Loop 跑通的 trace 示例

**场景**: Bug 修复 Loop

```yaml
触发: Manual (用户点 "Run now")

Round 1:
  Memory: (空,首次)
  Planner:
    rationale: "先复现,再定位,再改,再测"
    tasks:
      - {id: t1, priority: P0, description: "复现 Issue #123 描述的 bug",
         successCriteria: "看到错误日志包含 'TypeError'"}
      - {id: t2, priority: P1, description: "定位根因文件:line",
         successCriteria: "输出 file:line 形式"}
      - {id: t3, priority: P1, description: "改代码并通过测试",
         successCriteria: "pnpm test && git diff API/ 为空"}
  Pick: t1 (P0)

  ContextBuilder for t1:
    skills: [systematic-debugging]
    tools: [Bash, Read, Glob, Grep]
    permission: plan
    files: [report-issue-123.md]
    memory: []

  Orchestrator:
    claude -p "..." --bare --session-id $UUID --plugin-dir ./skills \
           --tools "Bash,Read,Glob,Grep" --permission-mode plan ...

  Worker:
    Agent 跑 git log, grep, npm test, 看到 TypeError
    输出: "已复现, 错误在 X 调用 Y 时, 因为 Z"

  Verification:
    shell check: 输出包含 "TypeError" → pass
    决策: nextAction='next-task', taskCompleted=true

  Memory write:
    completedTasks: [t1]
    inProgressTask: t2

Round 2:
  (state.yaml 加载)
  Planner: 这一轮不重 plan,继续 t2
  Pick: t2
  ContextBuilder for t2:
    skills: [systematic-debugging]
    tools: [Read, Glob, Grep]  # 还是只读
    files: [src/X.ts, src/Y.ts, src/Z.ts]
  ...
  Verification: pass → next-task t3

Round 3:
  Pick: t3 (改代码 + 跑测试)
  ContextBuilder for t3:
    skills: [test-driven-development]
    tools: [Bash, Edit, Read, Write]
    permission: acceptEdits  # 改代码 OK
    files: [src/Z.ts, src/Z.test.ts]
  Orchestrator: claude --resume $UUID --permission-mode acceptEdits ...
  Worker: 改 src/Z.ts + 加 test
  Verification: shell "pnpm test && git diff API/ 为空" → exit 0 ✓
  决策: goalAchieved=true → __terminal__

Final state:
  status: success
  rounds: 3
  tokens: $0.18
  audit-trail.json: 完整记录三轮决策
```

---

## 4. 8 个简单 Loop 示例(覆盖广)

| 场景 | Goal.objective | Trigger | Planner 出几任务 | 关键 Skill |
|---|---|---|---|---|
| Bug 修复 | "修复 Issue #123" | Manual | 3-5(复现/定位/改/测/PR) | systematic-debugging |
| 邮件分析 | "整理今早邮件,推荐处理优先级" | Cron 9:00 | 2-3(收/分类/总结) | gws-gmail-read |
| 周报 | "生成上周 commit 摘要发飞书" | Cron 周日 18:00 | 3(取 git log / 总结 / 飞书发送) | github-summary, lark-im |
| 测试覆盖 | "把覆盖率从 60% 提到 80%" | Manual | 多轮(找未覆盖 → 加测试 → 跑覆盖) | test-driven-development |
| 文档同步 | "保持 README 与 PRD 一致" | git push | 2(diff PRD / 改 README) | docs-sync |
| CI 失败响应 | "main CI 失败时分析+修+开 PR" | Webhook | 多轮 | systematic-debugging |
| Issue 自动分类 | "GitHub 新 Issue 自动加 label" | GitHub Webhook | 1(LLM 判 label) | github-cli |
| 安全扫描 | "扫描 deps 漏洞" | Cron 周一 6:00 | 3(扫 / 评估 / 通知) | npm-audit, lark-im |

每个都符合 8 层架构,只是各层的复杂度不同。

---

## 5. 不是 Loop 的反例

| 反例 | 为什么不是 Loop |
|---|---|
| Cron `0 9 * * * pnpm test` | 没有 AI、没有迭代、没有 Goal 判定 |
| `git commit && git push` | 没有 Goal 判定 |
| Slack bot 收消息回复 | 没有客观成功标准 |
| 调一次 API 的 webhook | 单次,没迭代 |
| Claude Code 手动跑一次 | 没有"循环"、Goal、Memory 概念 |

**Loop 的定义性特征**:可量化 Goal + AI 自治迭代 + Memory 持续 + 终止条件。

---

## 6. 配置者(用户)的视角

用户在 Loop Cockpit 配置一个 Loop 时,实际配的是这 8 层的"边界与规则":

| 层 | 用户配什么 |
|---|---|
| Goal | objective / constraints / successCondition / deadline / budget |
| Trigger | 何时启动(详见 [triggers.md](./triggers.md)) |
| Planner | 用什么 model 思考、是否每轮 replan、模板 |
| Context Builder | 任务类型 → ContextBundle 的 mapping 规则 |
| Orchestrator | 默认 / subagent 启动策略 |
| Worker | 哪个 Agent(Iter 2 仅 claude-code)、哪个 model |
| Tool Layer | 可用 skills / MCP / tools / subagents 全集(Context Builder 从这里挑) |
| Verification | 哪种 evaluator、阈值 |
| Memory | 跨 Loop 共享哪些经验 |
| Reflection | 失败重试次数、是否 escalate |
| Human Gate | 哪些任务需人审、3 模式选哪个 |

UI 上**简单模式**只暴露最关键的(Goal + Trigger + Tools + budget),**专家模式**暴露全 8 层。

---

## 7. 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v1.0 | 首版,基于 ADR-0010 |
