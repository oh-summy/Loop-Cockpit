# AGENTS.md

> 本文件是 **Loop Cockpit 仓库内所有 AI 编程助手**（Claude Code、Codex、Cursor、Aider、Continue、Cline 等）的总规则。
> 任何 AI 在本仓库工作前，**必须先读这一份**；其它入口文件（如 `CLAUDE.md`）都只是跳板。
>
> ⚠️ 本文件描述的是「**开发 Loop Cockpit 本身**」的规则。
> 当 Loop Cockpit 作为产品**运行起来**、去管理别人的项目时，运行时的契约在
> [`docs/runtime/agent-contract.md`](./docs/runtime/agent-contract.md)，不要混淆。

---

## 1. 项目背景（30 秒读完）

- **名称**：Loop Cockpit（Loop Engineering 控制驾驶舱）
- **形态**：本地 Web 应用（Node.js Host + 浏览器 SPA），单机部署，SQLite 持久化
- **使命**：让独立开发者**可视化设计、调度、监控**自己的 AI Agent 闭环工作流
- **当前阶段**：Iteration 1 — Foundation。**还没有产品代码**，正在做文档/原型/技术尖刀。
- **维护者**：[@oh-summy](https://github.com/oh-summy)（一个人 + AI 协作开发）

更多上下文 → [`README.md`](./README.md) · [`docs/product/prd.md`](./docs/product/prd.md) · [`docs/product/roadmap.md`](./docs/product/roadmap.md)

---

## 2. 你是谁，你要做什么

你是被 [@oh-summy](https://github.com/oh-summy) 召唤进来协助开发 Loop Cockpit 的 AI 编程助手。

**你的工作主线**：

1. 当前 Iteration 的目标在 [`docs/product/roadmap.md`](./docs/product/roadmap.md)
2. 当前 Iteration 的 Issue 在 [GitHub Project #3](https://github.com/users/oh-summy/projects/3/views/1)
3. 任何代码/文档的改动必须能映射到一个 Issue（哪怕事后补也行）

**你的边界**：

- ❌ 不要自作主张引入新依赖、新技术栈、新架构
- ❌ 不要写 Issue 范围之外的代码（discovery 性质的探索除外，且必须放在 `spike/`）
- ❌ 不要修改 [`docs/product/non-goals.md`](./docs/product/non-goals.md) 中已明确"不做"的事
- ✅ 有疑问、有不确定，**先问，再写**

---

## 3. 必读文档清单（按重要性）

| 优先级 | 文档 | 你必须知道什么 |
|---|---|---|
| 🔴 | [`docs/product/non-goals.md`](./docs/product/non-goals.md) | **绝对不做的事**——任何冲突这里的方案都要被拒绝 |
| 🔴 | [`docs/product/glossary.md`](./docs/product/glossary.md) | Loop / Blueprint / Run / Task / Trigger 的精确定义 |
| 🔴 | [`docs/product/prd.md`](./docs/product/prd.md) | 当前 PRD（功能边界） |
| 🟡 | [`docs/product/roadmap.md`](./docs/product/roadmap.md) | 现在在哪个 Iteration |
| 🟡 | [`docs/architecture/overview.md`](./docs/architecture/overview.md) | 系统分层（PTY 尖刀通过后才完善） |
| 🟡 | [`docs/architecture/adr/`](./docs/architecture/adr/) | 历史技术决策——**改动前先看有没有相关 ADR** |

---

## 4. 仓库目录约定

```
Loop-Cockpit/
├── README.md
├── AGENTS.md              # 你正在读的这份
├── CLAUDE.md              # 跳板，指向本文件
├── LICENSE                # MIT
├── CHANGELOG.md           # 每个 PR 必须更新
├── CONTRIBUTING.md
│
├── docs/                  # 所有正式文档（VitePress 源）
│   ├── product/           # 白皮书 / PRD / 非目标 / 术语 / 路线图
│   ├── design/            # 原型 / UX 流 / UI 规格
│   ├── architecture/      # 总览 / 数据模型 / 模块 / ADR
│   └── runtime/           # 运行时契约（产品对外的）
│
├── .github/
│   ├── ISSUE_TEMPLATE/    # atomic-task / bug / spike
│   └── workflows/         # CI + Pages 部署
│
├── spike/                 # 技术尖刀验证（非产品代码）
├── notes/                 # 开发日志（进仓库公开）
└── apps/                  # 产品代码（暂未建）
```

**严格约定**：

- **技术探索代码** → `spike/`，永远不进 `apps/`
- **个人开发日志** → `notes/`，VitePress **不**渲染
- **正式文档** → `docs/`，VitePress 渲染到 GitHub Pages
- **AI 临时草稿** → 不要保留，提交前清理

---

## 5. 代码规范

> Iteration 1 暂未写代码，但规则提前定好。

### 5.1 语言与工具

| 项 | 选型 |
|---|---|
| 主语言 | TypeScript（strict mode 必开） |
| Runtime | Node.js（LTS） |
| 包管理 | pnpm |
| Lint | ESLint + Prettier |
| 测试 | Vitest（单元）+ Playwright（E2E，未来） |
| 日志 | pino（**禁用 console.log**） |

### 5.2 文件命名

| 类型 | 风格 | 例子 |
|---|---|---|
| 源文件 | `kebab-case.ts` | `pty-harness.ts` |
| 类型/接口文件 | `kebab-case.ts` 内部用 PascalCase | `AgentAdapter` |
| 测试文件 | `*.test.ts` 同级 | `pty-harness.test.ts` |
| 文档 | `kebab-case.md` | `data-model.md` |

### 5.3 模块约定

- 一个 P0 模块 = 一份 `docs/architecture/modules/<name>.md` + 一个目录 `apps/host/src/<name>/`
- 模块内部对外暴露 `index.ts`；外部只从 `index.ts` 引用
- 跨模块通信优先**事件总线 / 函数式接口**，避免循环依赖

---

## 6. Git 与提交规范

### 6.1 分支

| 类型 | 命名 |
|---|---|
| 功能 | `feat/<scope>-<short-desc>` |
| 修复 | `fix/<scope>-<short-desc>` |
| 文档 | `docs/<scope>` |
| 技术尖刀 | `spike/<topic>` |
| 重构 | `refactor/<scope>` |

主分支：`main`。**禁止直推 main**，必须通过 PR。

### 6.2 提交信息（Conventional Commits）

```
<type>(<scope>): <subject>

<body>

<footer: 关联 issue>
```

`type` ∈ `feat | fix | docs | refactor | spike | test | chore | ci`

**例**：

```
feat(pty): add auto-response FSM for [y/N] prompts

实现了基于正则匹配的自动应答状态机，匹配到 [y/N] 时自动写入 y\n。
覆盖 claude-code 与 opencode 两个引擎的常见交互式确认场景。

Closes #12
```

### 6.3 PR

- **每个 PR 必须**：关联至少一个 Issue、更新 CHANGELOG、通过 CI
- **PR 大小**：尽量 < 400 行变更；超过要在描述里解释为什么不能拆
- **PR 描述**：用模板，包含 "What / Why / How to verify"

---

## 7. Definition of Done（PR 合并前自检）

提交 PR 前，AI 必须在 PR 描述里**逐条勾选**：

```markdown
- [ ] 关联了至少 1 个 Issue
- [ ] 代码通过 `pnpm lint` 和 `pnpm test`
- [ ] 新增/修改的公共 API 有 JSDoc
- [ ] 没有遗留 `console.log` / `TODO without context` / 注释掉的代码块
- [ ] 没有引入未在 ADR 记录的新依赖
- [ ] 更新了 CHANGELOG.md
- [ ] 受影响的文档已同步（PRD / 架构 / runtime contract）
- [ ] 我能用一句话向用户解释"这个改动让产品多了什么能力"
```

最后一条是**意图检查**，不能省。

---

## 8. 与人类协作的硬规则

1. **不要让 PR review 变成猜谜**——commit message 和 PR 描述写清楚 What / Why
2. **不要静默修复"顺手发现的问题"**——开一个新 Issue，让维护者决定优先级
3. **遇到不确定**——优先级排序：
   1. 看 ADR / 看本文档 / 看 PRD
   2. 在 PR 中明确提问 + 提供 2-3 个选项及推荐
   3. **不要默默选一个跑下去**
4. **不要修改 LICENSE、AGENTS.md、CLAUDE.md** 这三份文件，除非用户明确要求
5. **不要把 `notes/` 当作正式文档参考**——那里只是日志，不是契约

---

## 9. 当前 Iteration 状态指针

> 这一节由维护者随 Iteration 滚动更新。

- **当前 Iteration**：1 (Foundation)
- **目标**：完成产品定义文档、原型、PTY 技术尖刀验证、工程骨架
- **不做**：写产品代码（除 spike）、UI 美化、第二个 Agent 适配
- **PTY Spike 状态**：未开始 → 进行中 → 完成 → 通过/失败（**最关键的存活验证**）

---

## 10. 速查清单

| 你想做什么 | 先看哪 |
|---|---|
| 新增功能 | PRD + 非目标 + ADR |
| 改架构 | 写一份 ADR 草案，PR 单独提 |
| 加依赖 | ADR 解释为什么，并对比至少 1 个替代品 |
| 写文档 | docs/ 的对应子目录 |
| 做技术探索 | `spike/<topic>/`，不进主代码 |
| 日常笔记 | `notes/YYYY-MM-DD-<topic>.md` |
| 改提示词模板 | 找到对应 Loop 模块，**不**改根目录 prompt |

---

**最后一句话**：

> 你不是来"写代码"的，你是来**实现一个能让人安心睡觉的 Loop Engineering 系统**的。
> 写完每一段代码，问自己：「如果它在凌晨 3 点炸了，我能否在 1 分钟内知道炸在哪？」
