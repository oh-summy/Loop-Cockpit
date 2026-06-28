---
title: Blueprint 编辑器 UI Spec
status: Draft
related-prd: F002
related-prototype: prototype/features/blueprint-editor/
updated: 2026-06-28
---

# Blueprint 编辑器 UI Spec

> 每个区域 / 按钮 / 字段的详细语义,三维度说明:
> 1. **干什么** — 在产品中起的作用
> 2. **点击/填写后发生啥** — 客户端立即反应
> 3. **后端如何生效** — API endpoint + PRD 字段 + DB schema

---

## 1. 页面定位

**这屏是 Loop Cockpit 的核心入口**。用户配置 Loop 的 8 层规则,决定 AI 在这个 Loop 里能感知什么 / 怎么决策 / 怎么行动 / 怎么验证 / 失败怎么办 / 何时找人。

路由:`/blueprints/new` (创建) / `/blueprints/:id/edit` (编辑)

模式切换:
- **简单模式** — Iter 2 MVP,暴露 4 层核心(Goal / Trigger / Worker / Tool Layer)+ Retry
- **专家模式** — Iter 3-5 渐进暴露 8 层全部 + 横切

---

## 2. 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│ Navbar (sticky)                                              │
├─────────────────────────────────────────────────────────────┤
│ [Cancel] [Save] [Save & Run]    [简单模式 / 专家模式 ▼]      │ ← top action
├─────────────────────────────────────────────────────────────┤
│ Type [▼]  Template [▼]                                       │ ← 类型 / 模板
├─────────────────────────────────────────────────────────────┤
│ Core(简单模式) — Goal / Trigger / Worker / Tool Layer       │
│                                                              │
│ Expert(专家模式额外) — Planner / Context / Verification /   │
│   Memory / Reflection / Human Gate                           │
├─────────────────────────────────────────────────────────────┤
│ Footer                                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Navbar(沿用所有屏共享)

### Logo `▸ Loop Cockpit`
| 维度 | 内容 |
|---|---|
| 干什么 | 品牌标识,点击回 Dashboard |
| 点击 | navigate `/` |
| 后端 | 无 |

### 中导航 Dashboard / Blueprints / Runs
| 维度 | 内容 |
|---|---|
| 干什么 | 主导航,当前页加 active 样式 |
| 点击 | navigate `/dashboard`/`/blueprints`/`/runs` |
| 后端 | 无 |

### 🌐 中/EN 切换
| 维度 | 内容 |
|---|---|
| 干什么 | 切 UI 语言,刷新后保持 |
| 点击 | 切换 `localStorage.lc-lang`,所有 `data-i18n` 元素重渲染 |
| 后端 | 无(纯前端) |

### 🌙/☀️ 暗/亮主题
| 维度 | 内容 |
|---|---|
| 干什么 | 切 UI 主题,刷新后保持 |
| 点击 | toggle `<html>.dark` class + `localStorage.lc-theme` |
| 后端 | 无 |

---

## 4. Top Action Row

### 模式切换 `[简单模式 / 专家模式 ▼]`
| 维度 | 内容 |
|---|---|
| 干什么 | 切显示密度。简单 = 4 层 + Retry;专家 = 8 层 + 横切 |
| 点击 | `localStorage.lc-blueprint-mode` 切换;隐藏/显示 expert-only 区域 |
| 后端 | 无(纯前端) — 但保存时:简单模式默认所有 expert 字段为合理默认 |

### Cancel
| 维度 | 内容 |
|---|---|
| 干什么 | 放弃当前编辑 |
| 点击 | navigate 回 `/blueprints`;如果有未保存改动,confirm |
| 后端 | 无 |

### Save
| 维度 | 内容 |
|---|---|
| 干什么 | 保存配置,**不立即运行** |
| 点击 | 校验所有字段(zod) → `POST /api/blueprints` (创建)或 `PATCH /api/blueprints/:id` (更新) → navigate 到 Blueprint 详情或列表 |
| 后端 | F002 §6.3 `POST /api/blueprints`,写 DB blueprints 表;生成 `~/.loop-cockpit/loops/<blueprintId>/skills-bundle/` 临时 plugin 目录 |

### Save & Run
| 维度 | 内容 |
|---|---|
| 干什么 | 保存并立即触发一个 Run |
| 点击 | Save → `POST /api/runs body={blueprintId}` → navigate 到 Run 详情屏 |
| 后端 | F003 `POST /api/runs` — Run 状态 idle → initializing,异步推进 |

---

## 5. Type + Template 行

### Type 下拉
| 维度 | 内容 |
|---|---|
| 干什么 | 标记 Loop 类型(Bug 修复 / 重构 / 测试 / 文档 / 定期检查 / 其他)。**多选**(一个 Loop 可同属多个类型) |
| 点击 | 弹下拉,勾选;每勾一个 chip 加在 Type 字段下方 |
| 后端 | DB blueprints.type (string[] JSON);用于:① 列表筛选 ② Memory 模块按类学习(Iter 5)③ 通知卡显示 emoji ④ 模板自动联动 |

### Template 下拉
| 维度 | 内容 |
|---|---|
| 干什么 | 从预设/自定义模板填表(包含 Goal/Done 预填 + 可勾选要点) |
| 点击 | 弹下拉(分组:系统内置 / 我的模板 / + 空白);选定后填 Goal 各字段 |
| 后端 | Iter 2 模板存 `localStorage.lc-templates`;Iter 3+ 进 SQLite templates 表 |

### 💾 另存为模板
| 维度 | 内容 |
|---|---|
| 干什么 | 把当前表单存成可复用模板 |
| 点击 | 弹模态输入模板名 → 写 localStorage(Iter 2) |
| 后端 | Iter 5+ 进 SQLite templates 表 |

---

## 6. Goal 区域(Layer 1,简单模式必显)

### Objective 输入框
| 维度 | 内容 |
|---|---|
| 干什么 | 主目标,**也用作 Blueprint 的显示名**(F002 v0.3 删了独立 name 字段) |
| 填写 | textarea,1 行起步,长则展开 |
| 后端 | DB blueprints.goal.objective;UI 列表显示截断 50 字符;audit-trail.json 完整快照 |

### Constraints 列表
| 维度 | 内容 |
|---|---|
| 干什么 | 硬约束,每个约束 1 条(例:"不能改 API") |
| 点击 + Add | 加新行,每行可删 |
| 后端 | DB blueprints.goal.constraints (string[]);注入到 Worker system prompt |

### Success Condition 输入 + 🧪 Dry run
| 维度 | 内容 |
|---|---|
| 干什么 | 客观可量化的成功标准,必须机器可执行(shell command) |
| 填写 | mono 字体,提示 `$ ` 前缀。语法高亮(Iter 5+) |
| 点击 🧪 Dry run | 调 `POST /api/blueprints/:id/dry-run-criteria` 在 projectPath 跑命令;5s 内返回 exitCode + stdout/stderr 截断 4KB,弹模态显示 |
| 后端 | DB blueprints.goal.successCondition;Run 时 Verification(F008)用 shell evaluator 跑这条命令判 Loop 是否达成 |

### Deadline(可选)
| 维度 | 内容 |
|---|---|
| 干什么 | 截止时间,超过强制 fail |
| 填写 | datetime-local input |
| 后端 | DB blueprints.goal.deadline (ISO8601);F003 Run 启动后 setTimeout 监听 |

### Budget 三字段
| 维度 | 内容 |
|---|---|
| 干什么 | 限制 Loop 资源消耗 — Rounds / Tokens / Wall time |
| 填写 | 三个 stepper(Rounds [- 20 +] / Tokens $[1.00] / Wall time [- 10 +] [min ▼]) |
| 后端 | DB blueprints.goal.budget;F003 Run 每轮检查,撞上限 status=failed (reason: budget-exceeded);Verification 也按 budget 决策 next-action |

---

## 7. Trigger 区域(Layer 0)

### Mode 选择(◉ Manual / ◯ Once / ◯ Cron / ◯ Webhook)
| 维度 | 内容 |
|---|---|
| 干什么 | 启动方式。Iter 2 仅 Manual/Once/Cron,Webhook Iter 3+ |
| 点击 | 切换对应配置区显示(下方面板条件渲染) |
| 后端 | DB blueprints.triggers[].type;TriggerSource 按 type 注册(F003);Webhook 注册 POST /triggers/:id endpoint |

### Cron 配置器(每天/每周/每月/每 N 天/自定义)
| 维度 | 内容 |
|---|---|
| 干什么 | 可视化生成 cron 表达式 |
| 点击/填写 | 切子模式,选日期+时间;实时拼成 cron expr 显示在底部预览 |
| 后端 | 后端解析为标准 cron 写入 `triggers[].expression`;Agenda 按 expr 调度 |

### + Add Trigger
| 维度 | 内容 |
|---|---|
| 干什么 | 一个 Loop 可挂多个 Trigger(任一触发即启) |
| 点击 | 加新 Trigger 配置块 |
| 后端 | DB blueprints.triggers (array) |

详见 [triggers.md](../../architecture/triggers.md)

---

## 8. Worker 区域(Layer 5)

### Agent 下拉
| 维度 | 内容 |
|---|---|
| 干什么 | 选用哪个 Coding Agent。Iter 2 仅 Claude Code,Iter 7+ 加 OpenCode/Kimi/Codex |
| 点击 | 显示已支持列表(Iter 2 只一个,其他 disabled+灰) |
| 后端 | DB blueprints.agent (string);F004 Adapter 按 agent 选实现 |

### Model 下拉
| 维度 | 内容 |
|---|---|
| 干什么 | 选 Worker 用的 LLM model。读取本地 claude CLI 配置 |
| 点击 | 显示本地可用模型(Sonnet 4.6 / Opus 4.8 / Haiku 4.5) |
| 后端 | DB blueprints.model;F004 Adapter 通过 claude `--model <name>` 注入 |

### Project Path 路径选择器
| 维度 | 内容 |
|---|---|
| 干什么 | Loop 工作目录,作为 cwd + 文件读写边界 |
| 点击 📁 Browse | 模态目录选择器(Iter 2 列 mock 路径,Iter 3+ Electron/Tauri native dialog) |
| 后端 | DB blueprints.projectPath (string);zod 校验:必须绝对路径,不能含 `..`,警告系统目录(/usr / /etc)|

---

## 9. Tool Layer 区域(Layer 6 默认值)

> **重要**:Iter 2 是"一锅烩"(所有选定 skill/tool 一次塞给 Worker)。Iter 4 起由 Context Builder 按任务挑选。

### Skills 选择器
| 维度 | 内容 |
|---|---|
| 干什么 | 勾选用户级 `~/.claude/skills/` + 项目级 skill;Loop 启动时**只**加载选中的 |
| 点击 + Add skill | 弹模态,显示扫描到的所有 skill 列表 + checkbox |
| 后端 | DB blueprints.defaultToolLayer.skills (string[]);保存时 Loop Cockpit 复制/软链接选中 skill 到 `~/.loop-cockpit/loops/<id>/skills-bundle/`;F004 Adapter spawn 时 `--bare --plugin-dir <bundle>` 注入 |

### Tools 内建工具复选框
| 维度 | 内容 |
|---|---|
| 干什么 | 勾选 Claude Code 内建工具白名单(Bash/Read/Edit/Glob/Grep/WebFetch/...) |
| 点击 | 切换 checkbox |
| 后端 | DB blueprints.defaultToolLayer.tools (string[]);F004 Adapter spawn 时 `--tools "Bash,Read,Edit"` 注入 |

### MCP Servers 列表
| 维度 | 内容 |
|---|---|
| 干什么 | 添加 MCP 服务器配置 |
| 点击 + Add MCP | 弹模态填 name/command/args/env |
| 后端 | DB blueprints.defaultToolLayer.mcpServers (json);保存写 `~/.loop-cockpit/loops/<id>/mcp.json`;F004 Adapter `--mcp-config foo.json --strict-mcp-config` |

### Subagents 列表
| 维度 | 内容 |
|---|---|
| 干什么 | 定义本 Loop 可用的 subagent(name/prompt/tools 三字段) |
| 点击 + Add subagent | 弹模态填字段 |
| 后端 | DB blueprints.defaultToolLayer.subagents (json);F004 Adapter `--agents '{...}'` 内联注入 |

### Permission Mode 下拉
| 维度 | 内容 |
|---|---|
| 干什么 | Claude Code 权限模式 — plan(只读)/ acceptEdits(读写代码)/ bypassPermissions(无人值守)/ interactive |
| 点击 | 切换 |
| 后端 | DB blueprints.defaultToolLayer.permissionMode;F004 Adapter `--permission-mode <mode>` |

---

## 10. Retry Policy 区域(简化版,简单模式必显)

### Max Retries [- N +]
| 维度 | 内容 |
|---|---|
| 干什么 | 失败后最多重试次数;0 = 不重试 |
| 点击 ±/输入 | 整数 stepper |
| 后端 | DB blueprints.retryPolicy.maxRetries;F003 Run 失败时检查 |

### Timeout [- N +] [min/hour ▼]
| 维度 | 内容 |
|---|---|
| 干什么 | 单次 Run 最长时间,撞了 SIGKILL |
| 填写 | 数字 + 单位下拉(分钟整数 / 小时 0.5 步长) |
| 后端 | DB blueprints.retryPolicy.timeoutMinutes;Run 启动 setTimeout 监听 |

### On Fail 下拉
| 维度 | 内容 |
|---|---|
| 干什么 | 彻底失败后动作 — Notify(发通知)/ Stop(静默停) |
| 后端 | DB blueprints.retryPolicy.onFail;F003 final state 后调对应 Channel |

---

## 11. 专家模式独有区域

### Planner Config(Iter 3,L2)
| 字段 | 干什么 | 后端 |
|---|---|---|
| Enabled toggle | 是否启用 Planner | F006 plannerConfig.enabled |
| Model | Planner 用的 LLM(可与 Worker 不同) | plannerConfig.model |
| System prompt template | Planner 的 prompt 模板 | plannerConfig.systemPromptTemplate |
| Replan every round | 每轮重 plan / plan 一次执行到底 | plannerConfig.replanEveryRound |
| Max tasks per round | 每轮最多任务数 | plannerConfig.maxTasksPerRound |

### Context Builder Config(Iter 4,L3)
| 字段 | 干什么 | 后端 |
|---|---|---|
| Mode | all / rule-based / llm-select | F007 cbConfig.mode |
| Rules editor | task.priority/type → ContextBundle 的映射规则编辑器 | cbConfig.rules |
| Selector Model | llm-select 时用哪个 model | cbConfig.selectorModel |

### Verification Config(Iter 5,L7)
| 字段 | 干什么 | 后端 |
|---|---|---|
| Goal evaluator | 整 Loop 级 evaluator 类型 | F008 verifConfig.goalEvaluator |
| Task evaluator | 每任务级 evaluator | verifConfig.taskEvaluator |

### Memory Config(Iter 5,L8)
| 字段 | 干什么 | 后端 |
|---|---|---|
| Enable cross-blueprint | 跨 Blueprint 共享 Memory | F009 memoryConfig.enableCrossBlueprint |
| Retention days | 经验保留天数 | memoryConfig.retentionDays |
| Auto capture | errors/successes/preferences 自动入库 | memoryConfig.autoCapture |
| Injection top-K | 启动时检索几条注入 | memoryConfig.injectionTopK |

### Reflection Config(Iter 3,横切)
| 字段 | 干什么 | 后端 |
|---|---|---|
| Enabled toggle | 是否启用 Reflection | F011 reflectionConfig.enabled |
| Model | Reflection 用的 LLM | reflectionConfig.model |
| Max reflections per round | 每轮最多反思次数 | reflectionConfig.maxReflectionsPerRound |
| Escalate after N | N 次失败后升级 model | reflectionConfig.escalateAfterN |
| Escalate model | 升级到哪个 model | reflectionConfig.escalateModel |

### Human Gate Config(Iter 5,横切)
| 字段 | 干什么 | 后端 |
|---|---|---|
| Enabled toggle | 是否启用 Human Gate | F010 humanGateConfig.enabled |
| Gates 列表 | 多个 Gate,每个独立配置 | humanGateConfig.gates |
| Gate.triggerCondition | always / when-needs-review / on-failure / on-budget-warning | gate.triggerCondition |
| Gate.mode | interrupt / default-approve / default-reject | gate.mode |
| Gate.notification | UI/Email/Lark/Slack 通知渠道 | gate.notification |
| Gate.timeout | 等多久,超时 action | gate.timeoutMs + gate.timeoutAction |

---

## 12. 高级折叠区

### System Prompt Template(可选)
| 维度 | 内容 |
|---|---|
| 干什么 | 整 Loop 的 system prompt 模板,可用变量 `{{goal.objective}}` / `{{projectPath}}` 等 |
| 后端 | 注入到 Worker spawn 时的 `--append-system-prompt-file` |

### Phases 编辑器(ADR-0009,Iter 4)
| 维度 | 内容 |
|---|---|
| 干什么 | 编辑阶段编排有向图。Iter 2 默认 1 Phase 隐藏,Iter 4 起暴露 |
| 后端 | DB blueprints.phases (json);F003 Run 按 Phase 顺序推进 |

---

## 13. 模态弹窗

### 🧪 Dry Run 结果模态
显示:exitCode / stdout 截断 / stderr 截断 / durationMs。
- 后端:`POST /api/blueprints/:id/dry-run-criteria` 同步返回

### 📁 Browse 路径选择模态
列出 mock 项目路径 + 手动输入。
- Iter 2:UI 模拟。Iter 3+ Electron/Tauri 走 native dialog API。

### 💾 Save Template 模态
输入模板名 → `localStorage.lc-templates` push。

---

## 14. 键盘快捷键

| Key | 动作 |
|---|---|
| `S` | Save(不冲突 textarea) |
| `Cmd/Ctrl + Enter` | Save & Run |
| `Esc` | 关闭弹窗 / Cancel |
| `?` | 显示快捷键帮助 |

---

## 15. 边缘情况

- **加载态**:编辑模式 GET 期间显示 skeleton
- **空态**:创建模式所有字段空(或预设模板填充)
- **错误态**:字段校验失败红字 in-line,后端保存失败 toast
- **编辑冲突**:有 Run 在跑同 Blueprint,显示警告

---

## 16. 关联

- PRD: [F002 Blueprint 编辑器](../../prd/F002-blueprint-editor.md) v0.4
- ADR: [ADR-0010 8 层架构](../../architecture/decisions/0010-autonomous-loop-architecture.md) / [ADR-0009 Phase 编排](../../architecture/decisions/0009-phase-orchestration.md)
- 原型: [v4 HTML](../../prototype/features/blueprint-editor/) → v5 待重写(基于本 Spec)
- 8 层 PRD: F006-F011

## 17. 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 首版,基于 F002 v0.4 + ADR-0010 8 层架构 |
