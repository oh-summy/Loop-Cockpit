---
title: Run 详情屏 UI Spec
status: Draft
related-prd: F003 + F004 + F005
related-prototype: prototype/features/run-detail/
updated: 2026-06-28
---

# Run 详情屏 UI Spec

> Loop Cockpit 的灵魂屏 — 实时展示 8 层架构在跑什么。
> 每个区域 / 按钮 / 字段三维度。

---

## 1. 页面定位

实时展示一个 Run 的:
- 8 层架构当前进度(Goal / Planner / Context / Worker / Verification / Memory / ...)
- Claude Code 实时输出(Xterm)
- 决策面板(失败 / 人审 / 成功)
- 历史 trace(Round / Task / Tool call)

路由:`/runs/:runId`

---

## 2. 整体布局

```
┌────────────────────────────────────────────────────────────┐
│ Navbar (sticky top:0)                                       │
├────────────────────────────────────────────────────────────┤
│ Sticky bar (top:48px)                                       │
│  Row 1: Breadcrumb · Run ID · Blueprint link · 元信息       │
│  Row 2: 生命周期 stepper · token live · cost · 操作按钮     │
│  Row 3: Phase 进度条 · session UUID                        │
│  Row 4(Iter 3+): Round 计数 + Planner/Verification 微缩  │
├────────────────────────────────────────────────────────────┤
│ Goal callout (collapsible) — 显示 5 字段 + Done Criteria   │
├────────────────────────────────────────────────────────────┤
│ Terminal (60vh, Xterm)                                      │
│  + Live token / pid / dim header / cursor blink            │
├────────────────────────────────────────────────────────────┤
│ Decision Panel (条件渲染)                                   │
│   running 时:简单状态条 + 模拟失败按钮(demo)              │
│   failed 时:6 决策按钮(重跑/进 worktree/查 diff/...)     │
│   needs-human 时:Human Gate 请求 + 批准/拒绝/留 reason     │
├────────────────────────────────────────────────────────────┤
│ Audit Trail (collapsible) — Round 时间线 + Tool calls       │
├────────────────────────────────────────────────────────────┤
│ Footer                                                      │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Navbar
同 Blueprint 编辑器 UI Spec §3。

---

## 4. Sticky Bar

### Row 1 · 元信息行

#### Breadcrumb `Runs / r_K8xL2pQm9`
| 维度 | 内容 |
|---|---|
| 干什么 | 导航 + Run 唯一标识(nanoid 风格) |
| 点击 Runs | navigate `/runs` 列表 |
| 后端 | `GET /api/runs/:id` 拉 Run 详情 |

#### `📋 daily-lint` 链接
| 维度 | 内容 |
|---|---|
| 干什么 | 关联的 Blueprint,从这个 Blueprint 触发的 Run |
| 点击 | navigate `/blueprints/:blueprintId` |
| 后端 | DB runs.blueprintId 关联;Blueprint 改名后这里跟显示名走(runs.blueprintSnapshot 是历史快照) |

#### `📁 ~/project/Loop-Cockpit` 路径显示
| 维度 | 内容 |
|---|---|
| 干什么 | Run 工作目录(从 Blueprint.projectPath 复制) |
| 点击 | 复制到剪贴板 + toast |
| 后端 | DB runs.blueprintSnapshot.projectPath(快照) |

#### `Started 14:23:08 · Elapsed 02:14`
| 维度 | 内容 |
|---|---|
| 干什么 | 实时显示已运行时间 |
| 客户端 | `setInterval(1s)` 计算 elapsed |
| 后端 | DB runs.startedAt;终态后停止刷新 |

### Row 2 · 生命周期状态机 + 实时指标

#### 状态 Stepper(initializing → running → evaluating → success/failed)
| 维度 | 内容 |
|---|---|
| 干什么 | 显示 Run 系统层状态机(F003 §6.1) |
| 客户端 | 通过 WebSocket `/api/runs/:id/state` 订阅状态变化,active 状态有 pulse 动画 |
| 后端 | F003 状态机推 WS event `{ type: 'state-change', status: 'running' }` |

#### Token 实时计数 `12,345 in / 6,789 out`
| 维度 | 内容 |
|---|---|
| 干什么 | 实时累计 token 消耗 |
| 客户端 | WS 事件 `{ type: 'token-update', input, output }` 来时更新 |
| 后端 | F004 Adapter 解析 claude usage block 后推 WS;落 DB runs.tokenCostUsd |

#### Cost 显示 `$0.0234 / $1.00`
| 维度 | 内容 |
|---|---|
| 干什么 | 实时美元成本 / budget 上限 |
| 客户端 | 撞预算 80% 黄色,100% 红色 |
| 后端 | DB runs.budget_usage.tokensUsedUsd / blueprintSnapshot.goal.budget.maxTokensUSD |

#### Retry 计数 `0/3`
| 维度 | 内容 |
|---|---|
| 干什么 | 当前已重试次数 / max retries |
| 后端 | DB runs.iteration / blueprintSnapshot.retryPolicy.maxRetries |

#### `[L] Logs` 按钮
| 维度 | 内容 |
|---|---|
| 干什么 | 切到 raw.log 完整查看(独立路由 / 模态) |
| 点击 | open `/runs/:id/logs` 或弹模态显示 raw.log 内容 |
| 后端 | `GET /api/runs/:id/raw-log` 返回 ~/.loop-cockpit/runs/<id>/raw.log 文件 |

#### `⏸ Pause` 按钮
| 维度 | 内容 |
|---|---|
| 干什么 | 暂停 Loop(Iter 3+ 支持)。Iter 2 显示提示 "Iter 3 才支持" |
| 点击 | Iter 3+ `POST /api/runs/:id/pause`,LangGraph 风格 checkpoint |
| 后端 | Iter 3+ 实现;Iter 2 alert |

#### `⏹ Stop` 按钮
| 维度 | 内容 |
|---|---|
| 干什么 | 强制停止 Run。confirm 后 SIGKILL Agent 进程 |
| 点击 | confirm → `POST /api/runs/:id/stop` → 注入红色"用户停止"日志 → status=stopped |
| 后端 | F003 Run 状态机 stopped;F004 Adapter `proc.kill('SIGKILL')` |

### Row 3 · Phase 进度条(ADR-0009 业务层)

#### Phase Stepper
| 维度 | 内容 |
|---|---|
| 干什么 | 显示 8 层架构 Iter 4+ 的 Phase 编排进度。每个 Phase 显示 num + name + result token |
| 客户端 | WS 事件 `{ type: 'phase-change', phaseId, status }` 来时更新 |
| 后端 | DB runs.currentPhaseId / runs.phaseHistory;F003 §6.1.* Phase 子状态 |

#### Phase Token(如 `✓ moderate`)
| 维度 | 内容 |
|---|---|
| 干什么 | 显示该 Phase Evaluator 的结果 token(LLM judge 给的分类) |
| 后端 | DB runs.phaseHistory[].evaluatorResult |

#### session UUID `5e8a-c127`
| 维度 | 内容 |
|---|---|
| 干什么 | 显示 Claude Code session-id 短形式(8 char)— 体现跨阶段连贯 |
| 后端 | DB runs.claudeSessionId |

### Row 4(Iter 3+)· Round + 8 层微缩

#### Round 计数 `Round 3/20`
| 维度 | 内容 |
|---|---|
| 干什么 | ADR-0010 自治推进的轮数,/ budget.maxRounds |
| 后端 | DB runs.currentRound |

#### Planner 微缩状态 `🧠 5 tasks · P0:1 P1:3 P2:1`
| 维度 | 内容 |
|---|---|
| 干什么 | 当前轮 Planner 出的任务统计 |
| 点击 | 展开 Plan 详情(modal) |
| 后端 | DB runs.plannerHistory 最后一项 |

#### Verification 微缩 `✓ 3/5 tasks passed`
| 维度 | 内容 |
|---|---|
| 干什么 | 任务通过统计 |
| 后端 | DB runs.verificationHistory.filter(v => v.passed).length |

---

## 5. Goal Callout(可折叠,默认展开)

### Goal Header(点击折叠)
| 维度 | 内容 |
|---|---|
| 干什么 | 显示 Goal.objective 摘要 + 类型 chip |
| 点击 | toggle 展开/折叠 |

### Done Criteria 显示
| 维度 | 内容 |
|---|---|
| 干什么 | 显示 successCondition(mono 字体)+ `$ ` 前缀 |
| 客户端 | 只读显示,不可编辑(编辑要回 Blueprint Editor) |
| 后端 | DB runs.blueprintSnapshot.goal.successCondition |

### Constraints 列表
| 维度 | 内容 |
|---|---|
| 干什么 | 显示 Goal.constraints |
| 后端 | DB runs.blueprintSnapshot.goal.constraints |

---

## 6. Terminal(Xterm)区域

### Terminal Header(macOS 三圆点风)
| 维度 | 内容 |
|---|---|
| 干什么 | 视觉装饰 + 显示 `claude · pid 28341 · 120×30 · live` |
| 后端 | pid 来自 F004 AgentProcess.pid;`live` token 是 WS 在线状态 |

### Terminal Body
| 维度 | 内容 |
|---|---|
| 干什么 | 实时显示 Claude Code stream-json 解析后的输出。ANSI 多色 + 光标闪烁 |
| 客户端 | WebSocket `/api/runs/:id/stream` 收 chunk → `term.write(chunk)`(Iter 2 真用 xterm.js;原型用 HTML class 模拟) |
| 后端 | F004 PtyHarness fan-out:`proc.onData → WS clients` |

### `↓ Scroll` 按钮
| 维度 | 内容 |
|---|---|
| 干什么 | 滚动到最新输出 |
| 点击 | `term.scrollTop = term.scrollHeight` |

### `📋 Copy` 按钮
| 维度 | 内容 |
|---|---|
| 干什么 | 复制终端全部内容到剪贴板 |
| 点击 | `navigator.clipboard.writeText(term.innerText)` |

---

## 7. Decision Panel

### Running 状态 — 简单状态条
| 维度 | 内容 |
|---|---|
| 干什么 | 显示 "Agent 工作中 · 已运行 N 分 N 秒 · 待 evaluating 阶段" |
| 后端 | 实时从 WS 拉 status / elapsed |

#### `🎬 模拟失败` 按钮(原型 demo)
| 维度 | 内容 |
|---|---|
| 干什么 | 仅原型:切到 failed 状态展示决策面板。生产代码删 |
| 后端 | 无 |

### Failed 状态 — 6 决策按钮

#### `🔁 重跑(新 Run)`
| 维度 | 内容 |
|---|---|
| 干什么 | 用同一 Blueprint 重启新 Run(D2.4 决策:新 Run 而非 amend) |
| 点击 | `POST /api/runs body={blueprintId, parentRunId: <当前runId>}` → navigate 到新 Run |
| 后端 | F003 新 Run,blueprintSnapshot 取最新 Blueprint;runs.parentRunId 关联 |

#### `📁 进入 worktree`
| 维度 | 内容 |
|---|---|
| 干什么 | 在 OS 文件管理器打开 worktree 目录 |
| 点击 | `POST /api/runs/:id/open-worktree` → 后端调 `open` / `explorer`(Iter 3+) |
| 后端 | DB runs.worktreePath;Iter 3 Worktree PRD 实现 |

#### `📊 查看 diff`
| 维度 | 内容 |
|---|---|
| 干什么 | 显示 worktree 的 git diff |
| 点击 | open `/runs/:id/diff` 路由(Iter 3+) |
| 后端 | `GET /api/runs/:id/diff` 跑 `git diff` 返回内容 |

#### `🧠 查看推理链`
| 维度 | 内容 |
|---|---|
| 干什么 | 完整 reasoning trail + Tool call timeline + Round breakdown |
| 点击 | 滚到下方 Audit Trail 区域;或 open `/runs/:id/audit` 详情页 |
| 后端 | `GET /api/runs/:id/audit-trail` 返回 audit-trail.json |

#### `📥 下载 audit-trail.json`
| 维度 | 内容 |
|---|---|
| 干什么 | 下载完整审计文件 |
| 点击 | `GET /api/runs/:id/audit-trail?download=1`,触发浏览器下载 |
| 后端 | F005 §6.3 API,Content-Disposition: attachment |

#### `⬆️ 升级到 Opus 重跑`
| 维度 | 内容 |
|---|---|
| 干什么 | Escalate 决策点(F011 Reflection 触发) — 升级 model 后重跑 |
| 点击 | `POST /api/runs body={blueprintId, parentRunId, modelOverride: 'claude-opus-4-8'}` → 新 Run |
| 后端 | 同上,但 Run 用 Opus 跑;audit 记录 escalation |

### Needs-Human 状态 — Human Gate 模态(Iter 5)

#### 触发原因显示
| 维度 | 内容 |
|---|---|
| 干什么 | "Gate 触发原因: on-failure / on-budget-warning / custom"(F010) |
| 后端 | DB runs.humanGateHistory 最新待审项 |

#### `✓ 批准` 按钮
| 维度 | 内容 |
|---|---|
| 干什么 | 通过 Gate,Loop 继续 |
| 点击 | `POST /api/gates/:gateEntryId/approve` |
| 后端 | F010 humanGateHistory 更新 decision=approve;Loop 恢复 |

#### `✗ 拒绝` 按钮(可带 reason)
| 维度 | 内容 |
|---|---|
| 干什么 | 拒绝 Gate,Loop 按拒绝策略走 |
| 点击 | 弹 reason input → `POST /api/gates/:gateEntryId/reject body={reason}` |
| 后端 | F010 humanGateHistory.decision=reject |

#### 倒计时显示(default-reject 模式)
| 维度 | 内容 |
|---|---|
| 干什么 | 显示 timeoutMs 倒计时,超时按 timeoutAction 自动决策 |
| 客户端 | `setInterval` 倒计时 |

---

## 8. Audit Trail 折叠区

### 折叠头
| 维度 | 内容 |
|---|---|
| 干什么 | 显示 "🧠 推理链 (5 步) · Tool calls (8 次) · Audit trail" |
| 点击 | toggle 展开 |

### Round 时间线
| 维度 | 内容 |
|---|---|
| 干什么 | 每轮一行,显示 Planner 决策 + 任务执行 + Verification 决策 |
| 客户端 | 从 audit-trail.json 解析 rounds[] |
| 后端 | F005 v0.2 schema |

### Tool Call timeline
| 维度 | 内容 |
|---|---|
| 干什么 | 时间戳 + tool name + 简要参数 + 结果 token |
| 后端 | F005 audit-trail rounds[].taskExecutions[].toolCalls |

### 下载 raw.log 链接
| 维度 | 内容 |
|---|---|
| 干什么 | 下载完整原始 ANSI 流 |
| 点击 | `GET /api/runs/:id/raw-log?download=1` |
| 后端 | 直接 stream 文件 `~/.loop-cockpit/runs/<id>/raw.log` |

---

## 9. 键盘快捷键

| Key | 动作 |
|---|---|
| `L` | 切到 Logs |
| `D` | 切到 Decision Panel |
| `A` | 展开/折叠 Audit Trail |
| `Space` | Pause/Resume(Iter 3+) |
| `S` | Stop(confirm) |

---

## 10. 边缘情况

- **加载态**:WS 未连接时显示 connecting...
- **WS 断连**:自动重连 + UI 显示 "重连中"
- **Run 不存在**:404 页面
- **Run 已终态**:替换实时 WS 为静态显示 + 提示"此 Run 已结束"
- **多设备同看**:多个浏览器同时打开同一 Run,各自 WS 独立(广播)

---

## 11. 关联

- PRD: [F003 Run 状态机](../../prd/F003-run-state-machine.md) v0.3 / [F004 Adapter](../../prd/F004-claude-adapter.md) v0.3 / [F005 Audit](../../prd/F005-audit-trail.md) v0.2
- ADR: [ADR-0009 Phase](../../architecture/decisions/0009-phase-orchestration.md) / [ADR-0010 8 层架构](../../architecture/decisions/0010-autonomous-loop-architecture.md)
- 原型: [P002 v2](../../prototype/features/run-detail/) → v3 待加 Planner/Reflection/Human Gate

## 12. 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 首版,基于 F003/F004/F005 v0.2-0.3 + ADR-0010 |
