# 非目标（Non-Goals）

> **本文件比 PRD 更重要。**
>
> 独立开发者最大的敌人不是难度，而是 scope creep。这里写下的 10 条，是 Loop Cockpit **绝不做**的事，
> 任何与它们冲突的 PR / Issue / 想法都应被拒绝。
>
> 修改本文件须经维护者 [@oh-summy](https://github.com/oh-summy) 明确同意。

---

## 1. ❌ 不做云端 SaaS

Loop Cockpit **永远本地优先**。
- 数据存在 `~/.loop-cockpit/`，不上云
- 不做账号系统、不做云端同步
- 用户的代码、token、密钥**永远不离开他的机器**

> 例外：将来可能提供"导出蓝图为 YAML 分享"功能，但**用户主动导出**，不是自动同步。

---

## 2. ❌ 不做通用 Agent Framework

Loop Cockpit 不是 LangChain / LangGraph / AutoGen 的替代品。
- 不实现 chain / tool calling / RAG 抽象层
- 不暴露底层 LLM SDK
- **我们只编排"已经存在的、能跑命令行的 Coding Agent"**

---

## 3. ❌ 不做 Prompt Marketplace

Loop Cockpit 不会做"提示词商店""技能包市场"。
- Skill 是用户在本地维护的，不上传
- 不做评分、排行、付费

---

## 4. ❌ 不做多租户 / 企业权限

Loop Cockpit 是**单用户模式**。
- 不做用户表、不做 RBAC、不做组织/团队
- 一台机器一个 Loop Cockpit 实例，归一个人

---

## 5. ❌ 不做 Kubernetes / Docker 强依赖

Loop Cockpit 必须能在裸 Node.js 上跑起来。
- 不强制要求 Docker
- 不依赖 K8s、不依赖 Helm
- 沙箱用 **Git Worktree**，而非容器

> 例外：用户**可以选择**让 Loop 在 Docker 里跑，但**不是默认**也**不是必需**。

---

## 6. ❌ 不做 PostgreSQL / MySQL 强依赖

- 默认 **SQLite**，单文件，零配置
- 不做"必须先装个数据库"的体验

> 例外：将来可选切换到 PostgreSQL，但**SQLite 必须永远是默认**。

---

## 7. ❌ 不做"Agent 自由发挥"模式

Loop Cockpit 要求**每个 Loop 必须有可机器执行的 Done Criteria**。
- 不接受"让 Agent 自己判断做完没"
- 不接受纯主观的"看起来不错"作为完成条件
- Done Criteria = shell 命令的退出码 / 文件断言 / API 响应断言

这是 Loop Engineering 与 Prompt Engineering 的根本分水岭。

---

## 8. ❌ 不做"Loop Engineering 教育/咨询业务"

Loop Cockpit 是工具，不是培训课程。
- 文档教用户**怎么用工具**，不教"什么是 Loop Engineering 思想"
- 不卖课、不接咨询

---

## 9. ❌ 不做"全自动 PR Review / Code Review"产品

Loop Cockpit 是**编排器**，不是 review 工具。
- 用户可以**自己定义**一个 "PR review Loop"，但产品不内置
- 不和 GitHub Copilot / CodeRabbit 等正面竞争

---

## 10. ❌ 不做企业级权限、SSO、审计合规

- 不做 SOC2、不做 ISO27001 适配
- 不做 SAML / OIDC 登录
- 不做企业级日志归档（pino 写本地文件即可）

---

## 怎么用这份文档

- 任何新功能想法，**先来这里查一遍**——撞了就直接 reject
- 想新增一条"不做"——开 PR，**至少 7 天思考期**再合并
- 维护者拒绝某个 Issue 时，**引用本文档的编号**作为依据

---

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-24 | v0.1 | 首版，10 条 |
