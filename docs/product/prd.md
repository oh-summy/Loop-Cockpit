# Loop Cockpit PRD

> **版本**：v0.1（草案）
> **日期**：2026-06-24
> **状态**：Iteration 1 · Foundation
> **配套文档**：[白皮书](./whitepaper.md) · [非目标](./non-goals.md) · [术语](./glossary.md) · [路线图](./roadmap.md)

---

## 0. 阅读说明

- 优先级标记：🔴 **P0**（MVP 必须） / 🟡 **P1**（MVP 后） / 🟢 **P2**（生态期）
- 边界检查：每条功能须与 [non-goals.md](./non-goals.md) 对照，**不冲突**才可进入
- 所有术语遵循 [glossary.md](./glossary.md)

---

## 1. 系统总览

```
┌────────────────────────────────────────────────────┐
│  浏览器 SPA（Vite + React + Xterm.js）             │  ← UI 层
├────────────────────────────────────────────────────┤
│  Host（Fastify + Drizzle + node-pty + Agenda）     │  ← 控制层
├────────────────────────────────────────────────────┤
│  Agent 适配层（Claude Code / OpenCode / Kimi / …） │  ← 执行层
├────────────────────────────────────────────────────┤
│  Git Worktree 沙箱 + SQLite + Artifact 文件系统    │  ← 隔离/存储层
└────────────────────────────────────────────────────┘
```

详见 [`docs/architecture/overview.md`](../architecture/overview.md)。

---

## 2. 功能模块清单

### A · Loop Blueprint 系统 🔴

#### A1 Blueprint 数据模型 🔴
- 字段：`id, name, goal, doneCriteria, agent, model, skills[], mcpServers[], retryPolicy, timeout, tokenBudget, triggers[], promptTemplate, projectPath, createdAt, updatedAt, status`
- 校验：goal 非空、doneCriteria 可执行、agent 在已注册适配器列表

#### A2 Blueprint CRUD API 🔴
```
POST   /api/blueprints
GET    /api/blueprints
GET    /api/blueprints/:id
PATCH  /api/blueprints/:id
DELETE /api/blueprints/:id
```

#### A3 Blueprint 校验引擎 🔴
- schema validation（zod）
- cron expression validation
- agent compatibility check（agent 是否支持指定 model）

### B · Loop Runtime 引擎 🔴

#### B1 Run 状态机 🔴
```
idle → initializing → running → evaluating → (success | retrying | failed | stopped)
```

#### B2 Run 生命周期 🔴
1. 创建 Run + 分配 Worktree
2. 加载 Memory（如有）
3. 拼装 system prompt（Goal + Skill + Memory + Trigger context + Artifact from upstream）
4. 启动 Agent（PTY）
5. 流式接收输出 + 自动应答交互
6. Agent 退出后执行 Done Criteria
7. 评估：pass → success；fail → 检查 retry policy → retry 或 failed
8. 写入 Memory（失败原因、成功模式）
9. 触发 Channel 通知

#### B3 执行 API 🔴
```
POST /api/runs              # 手动触发一个 Run
POST /api/runs/:id/stop     # 中止
GET  /api/runs/:id          # 详情
GET  /api/runs/:id/logs     # 日志流（SSE / WebSocket）
GET  /api/runs/:id/stream   # PTY 实时流（WebSocket）
```

### C · Agent 适配层 🔴 (Claude) / 🟡 (Others)

#### C1 统一接口 🔴
```typescript
interface AgentAdapter {
  readonly id: string;
  readonly supportedModels: string[];
  start(ctx: RunContext): Promise<AgentProcess>;
  parseExitCode(output: string): number | null;
  estimateTokens(output: string): number;
}

interface AgentProcess {
  pty: IPty;                       // node-pty handle
  onData(cb: (chunk: string) => void): void;
  onExit(cb: (code: number) => void): void;
  write(input: string): void;
  kill(): Promise<void>;
}
```

#### C2 适配器实现优先级
| 适配器 | 优先级 | Iteration |
|---|---|---|
| Claude Code | 🔴 P0 | 1-2 |
| OpenCode | 🟡 P1 | 3 |
| Kimi Code | 🟡 P1 | 3 |
| Codex | 🟢 P2 | 4+ |
| Trae | 🟢 P2 | 4+ |
| Qwen Code | 🟢 P2 | 4+ |
| MiniMax Code | 🟢 P2 | 4+ |

### D · PTY 执行层 🔴（**最难、最关键**）

#### D1 PTY Runner 🔴
- 基于 `node-pty`，分配虚拟 TTY
- 跨平台（Linux / macOS / Windows）
- 捕获 stdout / stderr / ANSI 控制字符

#### D2 自动应答 FSM 🔴
- 正则匹配交互式确认（`[y/N]`, `Confirm?`, `Continue?`）
- 状态机驱动，支持嵌套确认
- 用户可配置"危险操作"白名单（拒绝自动应答）

#### D3 实时终端流（Xterm.js 桥） 🔴
- WebSocket 推送原始 buffer 到前端
- 前端 Xterm 渲染彩色输出
- 同时落盘到 SQLite（保留最近 N 行用于回放）

### E · Git Worktree 沙箱 🟡（Iteration 3）

#### E1 Worktree 生命周期 🟡
```
create → bind to runId → agent works → success: merge + cleanup / failure: preserve
```

#### E2 路径约定 🟡
- `~/.loop-cockpit/workspaces/<runId>/`
- 失败保留现场，UI 提供"打开 worktree"按钮

#### E3 安全规则 🟡
- 禁止向主 repo 直接写入
- 禁止跨 worktree 引用

### F · Memory 系统 🟢

#### F1 类型 🟢
- 错误模式（pattern → resolution）
- 成功模式（context → strategy）
- 用户偏好（per-blueprint）

#### F2 API 🟢
```
POST /api/memory/:blueprintId
GET  /api/memory/search?q=...
```

#### F3 实现 🟢
- SQLite FTS5
- 写入：每次 Run 结束自动抓取关键报错入库
- 读取：Run 启动时按 Goal 关键词检索 top-K 注入

### G · Scheduler & Trigger 总线 🔴 (设计) / 🟡 (Cron) / 🟢 (其它)

> **关键决策**：从第一天就按**事件总线**设计，避免后期改核心。

#### G1 Trigger Source 接口 🔴 (Iteration 1 设计)
```typescript
interface TriggerSource {
  readonly type: string;
  start(emit: (event: TriggerEvent) => void): Promise<void>;
  stop(): Promise<void>;
}
```

#### G2 内置 Source
| Source | 优先级 | Iteration |
|---|---|---|
| Manual | 🔴 P0 | 2 |
| Cron | 🔴 P0 | 2 |
| Webhook | 🟡 P1 | 3 |
| GitHub PR/Issue | 🟢 P2 | 4 |
| Email | 🟢 P2 | 5 |
| 飞书消息 | 🟢 P2 | 5 |
| Goal-based（达成才停） | 🟢 P2 | 4 |
| Boot（开机启动） | 🟢 P2 | 4 |

#### G3 Dispatcher
- 单一事件队列（SQLite 持久化 via Agenda）
- 防抖、防并发同 Blueprint
- 失败重排

### H · Artifact 系统 🟢

#### H1 数据模型
- 每个 Run 可声明若干输出工件（文件路径 / JSON 字段）
- 存储：`~/.loop-cockpit/artifacts/<runId>/`

#### H2 跨 Loop 传递
- Blueprint 可声明依赖：`dependsOn: [upstreamBlueprintId]`
- 下游 Run 启动时自动注入上游最近一次成功 Run 的 Artifact

### I · Channel Hub 🟡

#### I1 支持渠道
| 渠道 | 优先级 |
|---|---|
| 飞书 | 🟡 P1 |
| 钉钉 | 🟡 P1 |
| Slack | 🟡 P1 |
| Discord | 🟢 P2 |
| Telegram | 🟢 P2 |
| Email | 🟢 P2 |

#### I2 事件类型
- run.success / run.failed / run.retry / run.stuck / run.budget-exceeded

#### I3 卡片模板
- 富文本卡片（飞书 Lark Card / 钉钉 Markdown / Slack Block Kit）
- 包含：Loop 名称、Run 时长、迭代次数、token、状态、跳转链接

### J · Cockpit UI 🔴

#### J1 页面结构 🔴
| 路径 | 名称 | 优先级 |
|---|---|---|
| `/` | Dashboard（总览） | 🔴 |
| `/blueprints` | Blueprint 列表 | 🔴 |
| `/blueprints/new` | Blueprint 编辑器 | 🔴 |
| `/blueprints/:id` | Blueprint 详情 | 🔴 |
| `/runs` | Run 历史 | 🔴 |
| `/runs/:id` | Run 详情（含实时终端） | 🔴 |
| `/memory` | Memory 浏览 | 🟢 |
| `/skills` | Skill 管理 | 🟡 |
| `/mcp` | MCP 管理 | 🟡 |
| `/channels` | Channel 配置 | 🟡 |
| `/settings` | 全局设置 | 🟡 |

#### J2 Blueprint 编辑器关键字段 🔴
- Goal（textarea，自然语言）
- Done Criteria（textarea，shell 命令）
- Agent + Model（下拉）
- Cron / Manual（触发器选择，未来扩展）
- Retry policy（maxRetries / timeout / token budget）
- Skill 选择（多选）
- MCP 选择（多选）
- Project path（绑定本地 git repo）
- System prompt template（高级折叠）

#### J3 Run 详情页关键能力 🔴
- 实时 Xterm 终端
- 状态机可视化（当前在哪一步）
- Token 消耗 / 迭代次数实时更新
- 失败时显示 stderr 高亮 + "进入 worktree" 按钮

### K · 可审计性 🔴（贯穿全模块）

> 用户强调的能力，必须在 MVP 就到位。

#### K1 全量审计单元 🔴
- 每个 Run 必须产出 `audit-trail.json`
- 包含：
  - 完整 system prompt（含变量注入后的实际内容）
  - 每次 Agent 输出（带时间戳）
  - 每次 Done Criteria 评估结果
  - Token 消耗明细
  - Worktree 最终 diff

#### K2 可回放 🟡
- 用户可"重放" Run 的终端输出（不重新执行 Agent）

---

## 3. 非功能性需求

### 3.1 性能
- Host 启动 < 3s
- UI 首屏 < 2s
- Run 启动延迟 < 1s

### 3.2 可靠性
- Host 崩溃后重启，Run 状态可恢复
- SQLite WAL 模式，断电不丢

### 3.3 安全
- 用户 token / 密钥仅存本地 `~/.loop-cockpit/secrets/`，加密
- Done Criteria 执行前显著提示（防 `rm -rf /`）
- Worktree 路径严格隔离，禁止跨界

### 3.4 兼容性
- Node.js LTS（≥ 20）
- 浏览器：最新 Chrome / Edge / Safari / Firefox
- OS：Linux / macOS（P0），Windows（P1）

---

## 4. MVP 范围（Iteration 1-3 总和）

✅ **必做**：
- Blueprint CRUD + Claude Code 适配器
- Cron + Manual 触发
- node-pty + 自动应答 + Xterm
- Run 状态机 + 评估循环
- SQLite 持久化
- 最简陋 UI（Dashboard + Blueprint 编辑器 + Run 详情）
- 审计 trail 落盘

❌ **MVP 不做**：
- 多 Agent 适配（仅 Claude）
- Skill / MCP UI（用文件配置即可）
- Channel Hub（先只 console + 文件）
- Memory（先无）
- 多 Loop 串联 / Artifact
- Sub-agent

---

## 5. 风险与待定

| 风险 | 缓解 |
|---|---|
| **node-pty 跨平台行为不一致** | Iteration 1 spike 必须三平台都跑 |
| **Claude Code CLI 升级破坏接口** | Adapter 层兜底 + 锁定测试版本 |
| **用户写出危险 Done Criteria** | 默认沙箱 + 高危命令显式确认 |
| **独立开发者投入断档** | 每个 Iteration 必交付可演示物 |

---

## 6. 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-24 | v0.1 | 首版，覆盖 A-K 模块 + Trigger 总线设计 |
