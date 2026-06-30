# Trigger 触发器总览

> 一个 Loop 的"什么时候启动"清单。完整设计见 [ADR-0010 §触发器分类](./decisions/0010-autonomous-loop-architecture.md)。
> **Trigger type 字符串以 [F002 §6.2 TriggerConfig](../prd/F002-blueprint-editor.md) 为唯一 Truth Source。**

---

## 1. 全部触发器(按 Iter)

> ⚠️ 以下 type 值仅供参考,实施时以 F002 的 `TriggerConfig` TypeScript 类型为唯一来源。

### Iter 2 (MVP)

### Iter 2 (MVP)

| Trigger | 配置 | 含义 |
|---|---|---|
| **Manual** | `{ type: 'manual' }` | 用户在 UI 点 "Run now" 触发一次 |
| **一次性 Once** | `{ type: 'once', at: ISO8601 }` | 到指定时间运行一次,完成后 Blueprint 归档 |
| **Cron** | `{ type: 'cron', expression: '0 9 * * *' }` | 按 cron 周期触发(支持每天/每周/每月/每 N 天/自定义) |

### Iter 3

| Trigger | 配置 | 含义 |
|---|---|---|
| **Webhook** | `{ type: 'webhook', secret?: '...' }` | 暴露 `POST /triggers/:id`,外部系统调用触发,payload 进 TriggerContext |
| **Git Push** | `{ type: 'git-push', repo: '...', branch: 'main' }` | GitHub Webhook(install GitHub App 或 webhook URL)收到 push 时 |
| **Git PR** | `{ type: 'git-pr', repo, events: ['opened', 'sync', 'closed'] }` | PR 生命周期事件 |
| **Git Issue** | `{ type: 'git-issue', repo, labels?: [...] }` | Issue 创建 / labeled / closed |
| **Git Comment** | `{ type: 'git-comment', repo, mention?: '@loop' }` | PR/Issue 评论(可过滤 @ 提及) |

### Iter 4

| Trigger | 配置 | 含义 |
|---|---|---|
| **CI/CD 完成** | `{ type: 'ci-finished', provider: 'github-actions' \| 'gitlab' }` | CI 跑完后触发(success / failure 可分别配置) |
| **Email 收到** | `{ type: 'email-received', filter?: { from, subject, label } }` | IMAP poll 或 Email Webhook(Resend / SendGrid 入站) |
| **飞书消息** | `{ type: 'lark-message', filter?: { chatId, mention } }` | Lark Bot 收到消息(可过滤群、@ 提及) |
| **Slack 消息** | `{ type: 'slack-message', filter?: { channel, mention } }` | Slack Bot 同理 |
| **Discord 消息** | `{ type: 'discord-message', filter?: { channel, mention } }` | Discord Bot |
| **File Watch** | `{ type: 'file-watch', path: '...', events: ['create', 'modify'] }` | inotify / fswatch 监听文件变化 |

### Iter 5

| Trigger | 配置 | 含义 |
|---|---|---|
| **Boot** | `{ type: 'boot' }` | Host 启动时跑一次(适合 health check Loop) |
| **Upstream Loop** | `{ type: 'after-loop', upstreamLoopId: '...', filter: { status } }` | 上游 Loop 完成时触发(Artifact 链) |
| **Schedule + Condition** | `{ type: 'conditional-schedule', cron: '0 9 * * 1-5', condition: 'main 红时才跑' }` | Cron + 条件判断 |

### Iter 6+ (生态)

| Trigger | 配置 | 含义 |
|---|---|---|
| **Linear / Notion / Jira Webhook** | `{ type: 'external', provider: '...' }` | 第三方工具事件 |
| **Goal-based 持续监控** | `{ type: 'goal-monitor', checkEvery: '5m', stopWhen: '...' }` | 不是触发,是"持续跑直到 Goal 达成" |
| **MCP Event** | `{ type: 'mcp-event', server: '...', topic: '...' }` | MCP 服务器主动推送事件 |

---

## 2. TriggerEvent payload schema

每次触发都生成一份 `TriggerEvent`,作为 Loop 启动时的输入上下文:

```typescript
interface TriggerEvent {
  triggerId: string;            // 该 Trigger 实例的 ID
  triggerType: string;          // 上面表里的 type 值
  firedAt: ISO8601;
  source: 'manual' | 'cron' | 'webhook' | 'git' | 'email' | ...;

  // 类型特定 payload(discriminated union)
  payload: ManualPayload | CronPayload | GitPayload | EmailPayload | ...;
}

// 例 Git Push
interface GitPushPayload {
  repo: string;
  branch: string;
  commits: { sha: string, message: string, author: string }[];
  pusher: string;
}

// 例 Email
interface EmailReceivedPayload {
  messageId: string;
  from: string;
  to: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachments: { name, mime, size }[];
}
```

**Loop 内部可访问 `triggerEvent` 变量**(在 Goal / Planner / Context Builder 的 prompt template 中),用于把触发上下文带进 AI 推理。

---

## 3. Loop Cockpit 内部架构(Trigger Bus)

```
┌────────────┐  ┌────────────┐  ┌────────────┐
│ Manual UI  │  │ Cron Timer │  │ Webhook Srv│ ...
└──────┬─────┘  └──────┬─────┘  └──────┬─────┘
       │               │               │
       ▼               ▼               ▼
       ┌──────────────────────────────┐
       │  TriggerSource interface     │
       │  start(emit) / stop()        │
       └─────────────┬────────────────┘
                     ▼
       ┌──────────────────────────────┐
       │  Dispatcher                  │
       │  - 持久化队列(Agenda+SQLite)│
       │  - 防抖、防并发同 Blueprint  │
       │  - 失败重排                  │
       └─────────────┬────────────────┘
                     ▼
              Loop Runner
              (启 Run)
```

Iter 2 实现 Manual / Once / Cron 三个 source。
Iter 3+ 按表新增 source(都实现同一 interface)。

---

## 4. 用户配置 UI(预览)

Blueprint 编辑器 Trigger 区域:

```
[+ Add Trigger]   ← 一个 Blueprint 可挂多个 Trigger(任意一个触发即启)

已配置:
┌──────────────────────────────────────────┐
│ ⏰ Cron · 每天 09:00                       │
│ payload: { firedAt }                       │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ 🔗 Webhook · POST /triggers/abc123         │
│ secret: ******                             │
│ payload: { headers, body }                 │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ 📧 Email · from:*@github.com               │
│ payload: { from, subject, bodyText, ... }  │
└──────────────────────────────────────────┘
```

简单模式:只暴露 Manual + Once + Cron(Iter 2 范围)
专家模式:全部 Iter 3+ Trigger 全开

---

## 5. 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v1.0 | 首版,基于 ADR-0010 全 Trigger 枚举 + Iter 分配 |
| 2026-06-28 | **v1.1** | **★ ADR-0011: Trigger type 字符串以 F002 为唯一 Truth Source,不再独立枚举** |
