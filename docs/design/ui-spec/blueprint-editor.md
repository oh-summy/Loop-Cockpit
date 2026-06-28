---
title: Blueprint 编辑器 UI Spec v2(6 块重组)
status: Draft
related-prd: F002 v0.5
related-prototype: prototype/features/blueprint-editor/v6/
supersedes: blueprint-editor.md v0.1
updated: 2026-06-28
---

# Blueprint 编辑器 UI Spec v2

> 基于维护者反馈重组:从 "8 层模块化暴露" → **"6 块直觉化分类"**
> 后端仍是 8 层 schema(F002 v0.4 不破坏),前端按用户心智分块。

---

## 1. 6 块设计哲学

用户配 Loop 的真实心智不是"我在配 Layer 2 Planner",而是:

| 块 | 用户问的问题 |
|---|---|
| 1. **触发与边界** | 什么时候启动? 什么时候结束? 用哪个 AI? |
| 2. **核心配置** | 在哪儿工作? 要达成什么? 怎么算成功? |
| 3. **生命周期(感知-决策-行动-反馈)** | AI 每轮怎么思考? 用什么工具? 怎么验证? |
| 4. **反馈通知** | 完成/失败时通知谁? 用什么通道? |
| 5. **失败重试** | 失败几次后放弃? 是否升级 model? |
| 6. **禁止边界** | 花多少钱停? 不能动什么文件? 不能跑什么命令? |

每块对应一个折叠 section,**简单模式** 只显前 4 块,**专家模式** 显全 6 块 + 块内进阶字段。

---

## 2. 6 块 → 8 层 schema 映射

| 块 | 包含字段 | 对应 8 层(F002 schema) |
|---|---|---|
| 1 触发与边界 | triggers[] · deadline · agent · model | Trigger / Worker(L5) |
| 2 核心配置 | projectPath · goal.objective · goal.successCondition · goal.constraints | Goal(L1) · Tool Layer 部分 |
| 3 生命周期 | Planner / Context Builder / Tool Layer(skills/tools/MCP/subagent) / Verification | L2 / L3 / L6 / L7 |
| 4 反馈通知 | notification(★ 新字段) | Channel Hub(Iter 6,新接) |
| 5 失败重试 | retryPolicy · reflectionConfig | retry + L11 Reflection |
| 6 禁止边界 | budget · deny(★ 新字段)· disallowedTools | Goal.budget + Tool Layer 限制 |

详细字段定义见 F002 v0.5 §6.1。

---

## 3. 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│ Navbar (sticky)                                              │
├─────────────────────────────────────────────────────────────┤
│ 标题 [简单/专家] [取消] [保存] [保存并运行]                   │
│ Type [下拉]  Template [下拉]                                 │
├─────────────────────────────────────────────────────────────┤
│ ▾ 1. 触发与边界                                              │
│    Trigger · Deadline · Agent · Model                       │
├─────────────────────────────────────────────────────────────┤
│ ▾ 2. 核心配置                                                │
│    项目路径 · 目标 · 成功标准 · 约束                          │
├─────────────────────────────────────────────────────────────┤
│ ▾ 3. 生命周期(感知-决策-行动-反馈)★ 专家可深度配置         │
│    可用工具池: Skills / MCP / Tools / Subagents              │
│    系统默认提示词                                            │
│    Planner / Context Builder / Verification(展开后)         │
├─────────────────────────────────────────────────────────────┤
│ ▾ 4. 反馈通知 ★ 新字段                                       │
│    通知谁 + 怎么通知 + 通知什么事件                           │
├─────────────────────────────────────────────────────────────┤
│ ▾ 5. 失败重试                                                │
│    Max retries · Timeout · Reflection                       │
├─────────────────────────────────────────────────────────────┤
│ ▾ 6. 禁止边界 ★ 新字段                                        │
│    Token 上限 · 花费上限 · 禁止编辑文件 · 禁止命令            │
├─────────────────────────────────────────────────────────────┤
│ Footer                                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 元素三维度详解(每块每字段)

### 4.1 块 1 · 触发与边界

#### Trigger Mode 选择
| 维度 | 内容 |
|---|---|
| 干什么 | 选启动方式:手动 / 一次性 / 定时 / Webhook |
| 点击 | 切对应配置面板 |
| 后端 | `blueprints.triggers[].type` |

#### Cron 配置器
继承 v5,5 子模式(每天/每周/每月/每 N 天/Cron 表达式)。

#### Deadline(可选)
| 维度 | 内容 |
|---|---|
| 干什么 | **整个 Loop 的截止日期** — 超过这个时间 Loop 自动 disable,不再生效 |
| 点击 | datetime-local 输入 |
| 后端 | `blueprints.goal.deadline` ISO8601 — Run 启动时校验,若过期直接 fail |

#### Agent 选择
| 维度 | 内容 |
|---|---|
| 干什么 | 选用哪个 AI:Claude Code / OpenCode / Codex |
| 点击 | 下拉选择,Iter 2 仅 Claude Code |
| 后端 | `blueprints.agent` |

#### Model 选择
| 维度 | 内容 |
|---|---|
| 干什么 | 选用哪个具体 model(Sonnet 4.6 / Opus 4.8 / Haiku 4.5) |
| 后端 | `blueprints.model` |

### 4.2 块 2 · 核心配置

#### 项目路径
| 维度 | 内容 |
|---|---|
| 干什么 | Loop 工作目录,cwd 锁 + 文件访问边界基线 |
| 点击 📁 浏览 | 弹模态目录选择器 |
| 后端 | `blueprints.projectPath`;zod 校验绝对路径;Worker spawn 时 `cwd` |

#### 目标(Objective)
| 维度 | 内容 |
|---|---|
| 干什么 | 自然语言目标,**也用作 Loop 显示名** |
| 后端 | `blueprints.goal.objective`(text JSON) |

#### 成功标准(Success Condition)
| 维度 | 内容 |
|---|---|
| 干什么 | 客观可量化的成功判定,机器可执行的 shell 命令 |
| 点击 🧪 试跑 | `POST /api/blueprints/:id/dry-run-criteria` 测试 |
| 后端 | `blueprints.goal.successCondition` |

#### 约束(Constraints)
| 维度 | 内容 |
|---|---|
| 干什么 | 硬约束列表(例 "不能改 API") |
| 点击 + 添加 | 加新行 |
| 后端 | `blueprints.goal.constraints` (string[]) — 注入到 Worker system prompt |

### 4.3 块 3 · 生命周期(感知-决策-行动-反馈)

> **简单模式**:只显工具池 + 系统默认提示词。
> **专家模式**:展开 Planner / Context Builder / Verification 完整配置。

#### 工具池(必显)
所有可被 AI 使用的能力,4 子表:

##### Skills(可勾选)
| 维度 | 内容 |
|---|---|
| 干什么 | 从用户级 `~/.claude/skills/` + 项目级 `.claude/skills/` 选 |
| 后端 | `blueprints.defaultToolLayer.skills`;保存时复制到 `~/.loop-cockpit/loops/<id>/skills-bundle/`;Worker spawn `--bare --plugin-dir <bundle>` |

##### Tools(内建,复选框)
Bash / Read / Edit / Write / Glob / Grep / WebFetch / WebSearch。
| 后端 | `blueprints.defaultToolLayer.tools[]`;Worker spawn `--tools "Bash,Read,Edit"` |

##### MCP Servers
| 后端 | `blueprints.defaultToolLayer.mcpServers`;写 `mcp.json`;`--mcp-config foo.json --strict-mcp-config` |

##### Subagents
| 后端 | `blueprints.defaultToolLayer.subagents`;`--agents '{...}'` 内联注入 |

##### Permission Mode(默认值)
plan / acceptEdits / bypassPermissions / interactive。

#### 系统默认提示词
| 维度 | 内容 |
|---|---|
| 干什么 | 整 Loop 的 system prompt 模板,变量 `{{goal.objective}}` 等 |
| 后端 | Worker spawn `--append-system-prompt-file` |

#### 专家展开 · Planner(L2,Iter 3)
- Enable / Model / Replan / Max tasks per round

#### 专家展开 · Context Builder(L3,Iter 4)
- Mode(all / rule-based / llm-select)
- Rules 编辑器

#### 专家展开 · Verification(L7,Iter 5 完整)
- Goal Evaluator(shell / llm-judge / regex / human / compose)
- Task Evaluator(可选)

### 4.4 块 4 · 反馈通知 ★ 新字段

> **设计**:用户希望 Loop 完成 / 失败 / 需人审时收到通知。3 个子配置:

#### 通知触发事件
| 字段 | 干什么 | 后端 |
|---|---|---|
| ☑ Loop 成功 | 完成时通知 | notification.on.success: boolean |
| ☑ Loop 失败 | 失败时通知 | notification.on.failure |
| ☑ Human Gate 触发 | 需人审时通知 | notification.on.humanGate |
| ☑ 撞 budget 警告 | 接近预算时通知 | notification.on.budgetWarning |
| ☑ 每 N 轮 / 每个里程碑 | 进度通知 | notification.on.progress |

#### 通知渠道(可多选)
| 渠道 | 干什么 | 后端 |
|---|---|---|
| 🖥 桌面通知 | 系统通知中心(macOS Notification Center) | notification.channels.desktop: boolean(Iter 6) |
| 🌐 浏览器通知 | Web Notification API | notification.channels.browser: boolean(Iter 6) |
| 📧 邮件 | SMTP | notification.channels.email: { to, smtp } |
| 💬 飞书 | Lark Bot Webhook | notification.channels.lark: { webhookUrl } |
| 💬 Slack | Slack Webhook | notification.channels.slack |
| 💬 Discord | Discord Webhook | notification.channels.discord |
| 💬 Telegram | Telegram Bot | notification.channels.telegram |
| 🔧 自定义 Skill | 用 Skill 发(如 lark-im) | notification.channels.skill |
| 🔧 自定义 CLI | 调用自定义命令 | notification.channels.cli: { command } |

#### 通知内容模板
| 字段 | 干什么 |
|---|---|
| 标题模板 | "Loop {{loop.objective}} {{event.type}}" |
| 正文模板 | 含 token / cost / duration / 关键报错 |
| 通知附件 | audit-trail.json 链接 / Run 详情页链接 |

### 4.5 块 5 · 失败重试

#### Max Retries
继承 v5,数字 stepper。

#### Timeout(单次 Run 超时)
继承 v5,数字 + 单位切换。

#### Reflection(专家,Iter 3)
- Enable / Model / Max reflections per round / Escalate after N / Escalate Model

#### On Fail(最终失败动作)
| 字段 | 选项 |
|---|---|
| onFail | Notify / Stop / Escalate |

### 4.6 块 6 · 禁止边界 ★ 新字段

> 用户问"AI 能花多少钱?能动什么文件?不能跑什么?" — 在这一块统一配。

#### Token / 花费上限
| 字段 | 干什么 | 后端 |
|---|---|---|
| Token 上限 | 撞了停 | goal.budget.maxTokensUSD |
| Token 警告阈值 | 80% 时发通知 | budget.warnAtPercent: default 80 |
| 总 Round 上限 | 轮数封顶 | goal.budget.maxRounds |
| Wall time 上限 | 时间封顶 | goal.budget.maxWallTimeMs |

#### 禁止编辑/删除文件(glob 列表)
| 字段 | 干什么 | 后端 |
|---|---|---|
| 禁止编辑(glob) | 路径模式,例 `package.json` / `LICENSE` / `.env*` | deny.editPaths: string[] |
| 禁止删除(glob) | 路径模式,例 `**/*.test.ts` | deny.deletePaths: string[] |
| 严格禁止访问目录(超出 projectPath) | 默认不允许越界 | deny.strictBoundary: true(default) |

后端如何生效:Worker spawn `--disallowedTools "Edit(<glob>)" "Write(<glob>)"`,Bash 命令通过权限模式 + Hooks 拦截。

#### 禁止 Bash 命令
| 字段 | 干什么 | 后端 |
|---|---|---|
| 危险命令黑名单(可勾选预设 + 自定义) | rm -rf / curl | sh / sudo / dd / chmod 777 / 等 | deny.bashCommands: string[] |
| 自定义 deny rules | 完整 Claude Code permission rule | deny.customRules |

预设勾选项(默认全开):
- ☑ `rm -rf /` 类
- ☑ `curl <url> | sh` 远程执行
- ☑ `sudo` 提权
- ☑ `git push --force` 强推
- ☑ `npm publish` 发包
- ☐ `git commit`(用户可放开)

#### 禁止推送 / 提交
| 字段 | 干什么 | 后端 |
|---|---|---|
| 禁止 git push | 默认 on(防误推) | deny.gitPush: true |
| 禁止 git commit | 默认 off | deny.gitCommit: false |

---

## 5. 简单 vs 专家 暴露差异

| 块 | 简单模式显示 | 专家模式额外 |
|---|---|---|
| 1 触发与边界 | Trigger + Deadline + Agent + Model | _无_ |
| 2 核心配置 | 全部 | _无_ |
| 3 生命周期 | 工具池 + 系统默认提示词 | Planner / Context Builder / Verification 完整 |
| 4 反馈通知 | 渠道选择(简单 ☑) + 内容默认模板 | 触发事件细分 + 通知内容自定义模板 |
| 5 失败重试 | Max Retries + Timeout + On Fail | Reflection / Escalate |
| 6 禁止边界 | Token/花费/Round 上限 + 危险命令黑名单(预设) | 完整 glob + 自定义 deny rule |

---

## 6. 模态弹窗

继承 v5(Dry Run / Browse / Save Template),新增:

### 通知渠道配置模态
- 选定飞书 → 弹模态填 webhookUrl + 测试发送按钮
- 选定邮件 → 弹模态填 SMTP 配置

### Deny rule 测试模态
- 输入一条 Bash 命令 → 显示是否会被拦截 + 哪条 rule 命中

---

## 7. 键盘快捷键

详见 [blueprint-editor.md v1 §14](./blueprint-editor.md)。

---

## 8. 边缘情况

继承 v5。新增:
- 通知渠道未配 webhook 但勾选了:保存时 warn
- Deny rules 配错(无效 glob):in-line 错误

---

## 9. 关联

- 上一版:[blueprint-editor.md v1](./blueprint-editor.md)
- PRD: F002 v0.5(同步加 notification + deny 字段)
- ADR: [ADR-0010](../../architecture/decisions/0010-autonomous-loop-architecture.md)
- 原型: v6 待重写

## 10. 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v2.0 | ★ 6 块重组(触发与边界 / 核心配置 / 生命周期 / 反馈通知 / 失败重试 / 禁止边界)。新字段 notification + deny。后端 8 层 schema 不破坏 |
