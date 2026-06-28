---
title: i18n 中英双语词典
status: Living document
updated: 2026-06-28
---

# i18n 中英双语词典(3 屏共享)

> 所有 UI 文案的中文/英文 key。原型 HTML 通过 `data-i18n="<key>"` 属性绑定,JS dict 翻译。
> **维护规则**:加新文案先加 key 进本词典,再在 HTML 标 `data-i18n`。

---

## 用法约定

```html
<!-- HTML 标记 -->
<button data-i18n="btn_save">保存</button>
<span data-i18n="nav_dashboard">Dashboard</span>

<!-- 文本中嵌入变量(不进 i18n,保持默认) -->
<span>Round <strong data-no-i18n>3/20</strong></span>
```

```javascript
// JS dict
const I18N = {
  zh: { btn_save: '保存', nav_dashboard: '首页', ... },
  en: { btn_save: 'Save', nav_dashboard: 'Dashboard', ... },
};
function applyLang(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n;
    if (I18N[lang][k]) el.textContent = I18N[lang][k];
  });
}
```

---

## 词典(按分类)

### 通用导航 / 按钮

| key | 中文 | English |
|---|---|---|
| `nav_dashboard` | 首页 | Dashboard |
| `nav_blueprints` | Loop 列表 | Blueprints |
| `nav_runs` | 运行记录 | Runs |
| `btn_cancel` | 取消 | Cancel |
| `btn_save` | 保存 | Save |
| `btn_save_run` | 保存并运行 | Save & Run |
| `btn_run_now` | 立即运行 | Run now |
| `btn_edit` | 编辑 | Edit |
| `btn_delete` | 删除 | Delete |
| `btn_back` | 返回 | Back |
| `btn_close` | 关闭 | Close |
| `btn_add` | 添加 | Add |
| `btn_remove` | 移除 | Remove |
| `btn_browse` | 浏览 | Browse |
| `btn_dry_run` | 试跑 | Dry run |
| `btn_create_blueprint` | 创建 Loop | Create Blueprint |
| `btn_new_blueprint` | 新建 Loop | New Blueprint |
| `btn_stop` | 停止 | Stop |
| `btn_pause` | 暂停 | Pause |
| `btn_logs` | 日志 | Logs |
| `btn_scroll_bottom` | 滚动到底 | Scroll |
| `btn_copy` | 复制 | Copy |
| `btn_approve` | 批准 | Approve |
| `btn_reject` | 拒绝 | Reject |
| `btn_view` | 查看 | View |
| `btn_view_all` | 查看全部 | View all |

### 模式 / 状态

| key | 中文 | English |
|---|---|---|
| `mode_simple` | 简单模式 | Simple |
| `mode_expert` | 专家模式 | Expert |
| `theme_dark` | 暗色 | Dark |
| `theme_light` | 亮色 | Light |
| `state_running` | 运行中 | Running |
| `state_evaluating` | 评估中 | Evaluating |
| `state_success` | 成功 | Success |
| `state_failed` | 失败 | Failed |
| `state_stopped` | 已停止 | Stopped |
| `state_initializing` | 初始化中 | Initializing |
| `state_retrying` | 重试中 | Retrying |
| `state_paused` | 已暂停 | Paused |

### Blueprint 编辑器 — 标题 / 顶部

| key | 中文 | English |
|---|---|---|
| `bp_title_create` | 创建 Loop | Create Blueprint |
| `bp_title_edit` | 编辑 Loop | Edit Blueprint |
| `bp_hint_simple` | 简单模式:触发 + 核心 + 生命周期 + 反馈 + 重试 + 边界 | Simple: Trigger + Core + Lifecycle + Notification + Retry + Deny |
| `bp_hint_expert` | 专家模式:8 层架构 + 完整 Planner / Context Builder / Verification / Memory / Reflection / Human Gate | Expert: 8-layer architecture + full Planner/Context Builder/Verification/Memory/Reflection/Human Gate |
| `bp_type_label` | 类型 | Type |
| `bp_template_label` | 模板 | Template |
| `bp_template_builtin` | 系统内置 | Built-in |
| `bp_template_user` | 我的模板 | My Templates |
| `bp_template_blank` | + 空白 | + Blank |
| `bp_save_as_template` | 另存为我的模板 | Save as my template |
| `bp_shortcut_hint` | S 保存 · Cmd+Enter 保存并运行 | S save · Cmd+Enter save & run |

### Type 类型 chip

| key | 中文 | English |
|---|---|---|
| `type_bug` | 🐛 Bug 修复 | 🐛 Bug fix |
| `type_refactor` | 🔧 重构 | 🔧 Refactor |
| `type_test` | 🧪 测试 | 🧪 Test |
| `type_docs` | 📝 文档 | 📝 Docs |
| `type_check` | 🔍 定期检查 | 🔍 Periodic check |
| `type_other` | ⚙️ 其他 | ⚙️ Other |

### 块 1 · 触发与边界

| key | 中文 | English |
|---|---|---|
| `sec_trigger` | 1. 触发与边界 | 1. Trigger & Boundary |
| `sec_trigger_desc` | 什么时候启动 · 什么时候结束 · 用哪个 AI | When to start · When to end · Which AI |
| `trigger_mode` | 触发方式 | Trigger Mode |
| `trigger_manual` | 手动 | Manual |
| `trigger_once` | 一次性 | Once |
| `trigger_schedule` | 定时 | Schedule |
| `trigger_webhook` | Webhook | Webhook |
| `trigger_iter_hint` | (Iter 4 上线) | (Iter 4) |
| `trigger_manual_desc` | 仅在 UI 点击「立即运行」时触发一次 | Only triggered by clicking "Run now" |
| `trigger_loop_hint` | 配合「重试次数 > 0」时仍是 Loop:AI 失败 → 自动 retry → 直到达成 | With "max retries > 0" it's still a Loop: AI fails → auto retry → until success |
| `trigger_once_label` | 触发时刻 | Trigger at |
| `trigger_once_next_hour` | 下一个整点 | Next hour |
| `trigger_once_tomorrow_9` | 明天 09:00 | Tomorrow 09:00 |
| `trigger_once_desc` | 一次性任务:到点运行一次,完成后 Loop 自动归档 | One-shot: runs once at scheduled time, then archives |
| `trigger_freq` | 频率 | Frequency |
| `freq_daily` | 每天 | Daily |
| `freq_weekly` | 每周 | Weekly |
| `freq_monthly` | 每月 | Monthly |
| `freq_interval` | 每 N 天/周 | Every N days/weeks |
| `freq_cron` | Cron 表达式 | Cron |
| `trigger_times` | 触发时间 | Times |
| `trigger_days` | 触发星期 | Days |
| `trigger_add` | 添加 | Add |
| `trigger_shortcuts` | 快捷 | Quick |
| `weekday_workday` | 工作日 | Weekdays |
| `weekday_weekend` | 周末 | Weekends |
| `weekday_all` | 每天 | All days |
| `weekday_mwf` | 一·三·五 | Mon/Wed/Fri |
| `weekday_clear` | 清空 | Clear |
| `combo_weekday_9` | 工作日 9 点 | Weekdays 9am |
| `combo_weekday_12` | 工作日 12 点 | Weekdays 12pm |
| `combo_mon_0` | 周一 0 点 | Mon 0am |
| `combo_weekend_10` | 周末 10 点 | Weekends 10am |
| `combo_mwf_9` | 一·三·五 9 点 | Mon/Wed/Fri 9am |
| `month_first` | 月初 | 1st |
| `month_mid` | 月中 | 15th |
| `month_end` | 月末 | 28th |
| `month_1_15` | 1·15 | 1st & 15th |
| `interval_every` | 每隔 | Every |
| `interval_unit_day` | 天 | day(s) |
| `interval_unit_week` | 周 | week(s) |
| `interval_starting` | 起始时间 | Starting |
| `interval_from_next` | 从下一个匹配时间开始 | From next matching time |
| `interval_or` | 或 | or |
| `preview_label` | 下次触发预览 | Next 3 fires |
| `deadline_label` | Loop 截止 | Deadline |
| `deadline_desc` | 可选。超过这个时间 Loop 自动 disable | Optional. Loop auto-disables after this time |
| `agent_label` | AI 引擎 | Agent |
| `model_label` | 模型 | Model |
| `agent_iter_hint` | (Iter 7+ 扩展) | (Iter 7+) |
| `model_local_default` | (本机默认) | (local default) |
| `model_read_from` | 读取自 ~/.claude/config.json | Read from ~/.claude/config.json |

### 块 2 · 核心配置

| key | 中文 | English |
|---|---|---|
| `sec_core` | 2. 核心配置 | 2. Core |
| `sec_core_desc` | 在哪儿工作 · 要达成什么 · 怎么算成功 | Where · What · How to verify |
| `core_path` | 项目路径 | Project Path |
| `core_path_desc` | Loop 工作目录,作为 cwd + 文件读写边界基线 | Working directory · cwd + file boundary base |
| `core_objective` | 目标 | Objective |
| `core_objective_placeholder` | 例:修复 Issue #123 / 让 main 分支保持健康 / 整理今早邮件 | e.g. Fix Issue #123 / Keep main green / Triage morning email |
| `core_objective_desc` | 主目标,自然语言。也用作 Loop 显示名 | Primary objective in natural language. Also used as Loop display name |
| `core_success` | 成功标准 | Success Condition |
| `core_success_desc` | 客观可量化的判定 — 必须机器可执行(shell 命令)| Objective measurable check — must be machine-executable shell command |
| `core_success_hint` | 试跑不启 AI,只验证命令 | Dry run does NOT call AI — just runs the command |
| `core_constraints` | 约束 | Constraints |
| `core_constraints_desc` | 硬约束,每条 1 行(例:不能改 API) | Hard constraints, one per line (e.g. "Cannot modify API") |
| `add_point` | 加入要点 | Add points |
| `add_check` | 加入校验 | Add checks |

### 块 3 · 生命周期

| key | 中文 | English |
|---|---|---|
| `sec_lifecycle` | 3. 生命周期(感知-决策-行动-反馈) | 3. Lifecycle (Sense-Decide-Act-Feedback) |
| `sec_lifecycle_desc` | AI 每轮怎么思考 · 用什么工具 · 怎么验证 | How AI thinks each round · which tools · how to verify |
| `tool_pool` | 可用工具池 | Tool Pool |
| `tool_pool_hint` | 简单模式:一锅烩注入;专家模式:Context Builder 按需挑 | Simple mode: all injected; Expert: Context Builder picks per task |
| `tool_skills` | Skills(技能包) | Skills |
| `tool_skills_desc` | 从用户级 ~/.claude/skills/ 和项目级 .claude/skills/ 选 | From ~/.claude/skills/ and project's .claude/skills/ |
| `tool_skills_scanned` | 已扫描 12 个用户级 + 2 个项目级 skill | Scanned 12 user-level + 2 project-level skills |
| `tool_add_skill` | 添加 skill | Add skill |
| `tool_tools` | 内建工具 | Built-in Tools |
| `tool_mcp` | MCP 服务器 | MCP Servers |
| `tool_add_mcp` | 添加 MCP | Add MCP |
| `tool_subagent` | Subagent 子代理 | Subagents |
| `tool_add_subagent` | 添加 Subagent | Add Subagent |
| `tool_permission` | 权限模式 | Permission Mode |
| `perm_plan` | plan(只读分析) | plan (read-only) |
| `perm_accept_edits` | acceptEdits(允许改文件) | acceptEdits (file edits) |
| `perm_bypass` | bypassPermissions(无人值守) | bypassPermissions (unattended) |
| `perm_interactive` | interactive(每次确认) | interactive (confirm each) |
| `sys_prompt` | 系统提示词模板 | System Prompt Template |
| `sys_prompt_placeholder` | 留空使用默认模板 | Leave blank to use default |
| `none` | 暂无 | None |

### Planner / Context Builder / Verification(专家)

| key | 中文 | English |
|---|---|---|
| `sec_planner` | Planner · 规划器 (Layer 2) | Planner (Layer 2) |
| `sec_planner_desc` | 每轮 Loop 调一次 LLM 出任务列表 + 优先级 | LLM proposes task list & priorities per round |
| `planner_enable` | 启用 Planner | Enable Planner |
| `planner_model` | 思考型 Model | Thinking Model |
| `planner_replan` | 每轮重新规划 | Replan each round |
| `planner_max_tasks` | 每轮最多任务数 | Max tasks/round |
| `sec_context` | Context Builder · 上下文构建器 (Layer 3) ★ 最差异化 | Context Builder (Layer 3) ★ Key differentiator |
| `sec_context_desc` | 按任务 priority/type 挑 Memory + Skill + Tool + MCP 子集。不一锅烩 | Per-task selection of Memory + Skills + Tools + MCP. No one-size-fits-all |
| `context_mode` | 模式 | Mode |
| `context_mode_all` | all - 全部一次给(默认) | all - inject all (default) |
| `context_mode_rule` | rule-based - 规则映射 | rule-based |
| `context_mode_llm` | llm-select - LLM 智能选 | llm-select |
| `context_rules` | 规则 | Rules |
| `sec_verification` | Verification · 验证器 (Layer 7) | Verification (Layer 7) |
| `sec_verification_desc` | 多 evaluator 组合判定。Iter 2 仅 shell-only | Multi-evaluator. Iter 2 shell-only |
| `verif_goal_evaluator` | Goal Evaluator | Goal Evaluator |
| `verif_task_evaluator` | Task Evaluator | Task Evaluator |

### 块 4 · 反馈通知

| key | 中文 | English |
|---|---|---|
| `sec_notification` | 4. 反馈通知 | 4. Notification |
| `sec_notification_desc` | 通知谁 · 通过什么渠道 · 通知什么事件 | Who · Via what · What events |
| `notify_on` | 通知触发事件 | Notify on |
| `notify_on_success` | Loop 成功 | Loop success |
| `notify_on_failure` | Loop 失败 | Loop failure |
| `notify_on_human` | 需人审 | Needs human review |
| `notify_on_budget` | 撞预算警告 | Budget warning |
| `notify_on_progress` | 进度通知 | Progress |
| `notify_channels` | 通知渠道 | Channels |
| `ch_desktop` | 桌面通知 | Desktop |
| `ch_browser` | 浏览器通知 | Browser |
| `ch_email` | 邮件 | Email |
| `ch_lark` | 飞书 | Lark |
| `ch_slack` | Slack | Slack |
| `ch_discord` | Discord | Discord |
| `ch_telegram` | Telegram | Telegram |
| `ch_skill` | 自定义 Skill | Custom Skill |
| `ch_cli` | 自定义 CLI | Custom CLI |
| `notify_template` | 通知模板 | Template |

### 块 5 · 失败重试

| key | 中文 | English |
|---|---|---|
| `sec_retry` | 5. 失败重试 | 5. Retry & Recovery |
| `sec_retry_desc` | 失败几次后放弃 · 是否升级 model · 超时 | How many retries · Escalate model · Timeout |
| `retry_max` | 最多重试次数 | Max retries |
| `retry_max_desc` | AI 跑挂或验证不过时,自动再试几次。0 = 不重试 | When AI fails or verification fails, retry N times. 0 = no retry |
| `retry_timeout` | 单次最长时间 | Timeout |
| `retry_timeout_desc` | 单次 Run 超时被强杀,防止 AI 卡死 | Single Run timeout — SIGKILL to prevent stuck |
| `retry_on_fail` | 彻底失败时 | On fail |
| `retry_on_notify` | 通知 | Notify |
| `retry_on_stop` | 停止 | Stop |
| `retry_on_escalate` | 升级 model 重试 | Escalate model |
| `sec_reflection` | Reflection · 反思(横切层) | Reflection (cross-cutting) |
| `sec_reflection_desc` | 基于 Reflexion 论文。失败时 LLM 反思 → 改方案 → 针对性重试 | Reflexion paper-based. LLM reflects on failure → adjusts plan → targeted retry |
| `reflection_enable` | 启用反思 | Enable Reflection |
| `reflection_model` | 反思 Model | Reflection Model |
| `reflection_max` | 每轮最多反思次数 | Max reflections per round |
| `reflection_escalate` | N 次失败后升级 model | Escalate after N failures |
| `reflection_escalate_model` | 升级 Model | Escalate Model |

### 块 6 · 禁止边界

| key | 中文 | English |
|---|---|---|
| `sec_deny` | 6. 禁止边界 | 6. Deny & Boundary |
| `sec_deny_desc` | Token / 花费上限 · 禁止编辑哪些文件 · 禁止命令 | Token/cost limits · File restrictions · Dangerous commands |
| `deny_budget` | 预算上限 | Budget Limits |
| `deny_budget_rounds` | 总 Round 上限 | Max Rounds |
| `deny_budget_tokens` | Token 上限(美元) | Max Tokens ($) |
| `deny_budget_time` | Wall time 上限 | Max Wall Time |
| `deny_budget_warn` | 警告阈值 % | Warn at % |
| `deny_files` | 文件保护 | File Protection |
| `deny_edit_paths` | 禁止编辑 (glob) | Disallow Edit (glob) |
| `deny_edit_placeholder` | 例:package.json / LICENSE / .env* | e.g. package.json / LICENSE / .env* |
| `deny_delete_paths` | 禁止删除 (glob) | Disallow Delete (glob) |
| `deny_strict_boundary` | 严格禁止超出 projectPath | Strict boundary (no escape from projectPath) |
| `deny_bash` | Bash 命令限制 | Bash Restrictions |
| `deny_bash_presets` | 危险命令预设(全选推荐) | Dangerous command presets (recommend all) |
| `deny_rm_rf` | 防 rm -rf 类 | Prevent rm -rf |
| `deny_curl_sh` | 防 curl \| sh 远程执行 | Prevent curl \| sh |
| `deny_sudo` | 防 sudo 提权 | Prevent sudo |
| `deny_git_push_force` | 防 git push --force | Prevent git push --force |
| `deny_npm_publish` | 防 npm publish 发包 | Prevent npm publish |
| `deny_git_commit` | 禁止 git commit | Prevent git commit |
| `deny_custom_rules` | 自定义 deny rules | Custom deny rules |
| `deny_git` | Git 操作 | Git Operations |
| `deny_git_push` | 禁止 git push (默认 on) | Prevent git push (default on) |

### Run 详情屏

| key | 中文 | English |
|---|---|---|
| `run_started` | 开始 | Started |
| `run_elapsed` | 已运行 | Elapsed |
| `run_tokens` | tokens | tokens |
| `run_cost` | 花费 | cost |
| `run_retry` | 重试 | retry |
| `run_phase` | 阶段 | Phase |
| `run_session` | session | session |
| `run_round` | Round | Round |
| `run_planner` | Planner | Planner |
| `run_verification` | Verification | Verification |
| `run_memory` | Memory | Memory |
| `run_reflection` | Reflection | Reflection |
| `run_human_gate` | Human Gate | Human Gate |
| `run_pending` | 待审 | pending |
| `run_passed` | 通过 | passed |
| `run_tasks` | tasks | tasks |
| `goal_label` | 目标 | Goal |
| `done_criteria` | 成功标准 | Done Criteria |
| `terminal_live` | live | live |
| `failure_title` | Loop 失败 · 重试次数用完 | Loop failed · Retries exhausted |
| `decision_rerun` | 🔁 重跑(新 Run) | 🔁 Re-run (new) |
| `decision_worktree` | 📁 进入 worktree | 📁 Open worktree |
| `decision_diff` | 📊 查看 diff | 📊 View diff |
| `decision_reasoning` | 🧠 查看推理链 | 🧠 Reasoning trail |
| `decision_download` | 📥 下载 audit-trail.json | 📥 Download audit |
| `decision_escalate` | ⬆️ 升级到 Opus 重跑 | ⬆️ Escalate to Opus |
| `running_status` | AI 工作中 | AI working |
| `simulate_fail` | 🎬 模拟失败(Demo) | 🎬 Simulate failure |

### Dashboard

| key | 中文 | English |
|---|---|---|
| `dash_title` | 首页 | Dashboard |
| `stat_active_loops` | Loop 活跃 | Active Loops |
| `stat_running` | Run 在跑 | Running |
| `stat_success_today` | 今日成功 | Success today |
| `stat_alerts` | 告警 | Alerts |
| `dash_live_runs` | 进行中 | Live Runs |
| `dash_pending_gates` | 待审 Human Gates | Pending Gates |
| `dash_recent_runs` | 历史 | Recent Runs |
| `dash_my_loops` | 我的 Loop | My Blueprints |
| `time_relative_just` | 刚刚 | just now |
| `time_relative_min` | {n} 分钟前 | {n} min ago |
| `time_relative_hr` | {n} 小时前 | {n}h ago |
| `time_relative_yesterday` | 昨天 | yesterday |
| `time_relative_days` | {n} 天前 | {n}d ago |

### 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 首版,~200 key,覆盖 3 屏 |
