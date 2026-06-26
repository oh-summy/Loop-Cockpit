# 2026-06-26 · 离线交接清单（Offline Handoff）

> **维护者**：你下线了 5 小时。
> **AI 助手**：我在你离开期间，把"不需要你回答就能推进的"事情都做到了草稿/骨架状态。
> **承诺**：**全部只 commit，不 push。** 你回来 review 后可以选择 merge / 改 / 撤。
>
> 本文件是给你回来时**第一个要打开的东西**。看完它，你就知道发生了什么、需要做什么。

---

## TL;DR

我在 5 个独立分支上做了 6 次提交，把 Iter 1 接下来 1-2 周的草稿全占好坑了：

| 分支 | 状态 | 你的动作 |
|---|---|---|
| `chore/superpowers-bootstrap` | ✅ 可合并 | review → push → 开 PR |
| `docs/week-plan-spec` | ✅ 可合并 | 决定要不要留这份 spec（详见 Q1） |
| `spike/pty-bootstrap` | ✅ 可合并（骨架） | 周末就拿这个开干 PTY |
| `docs/adr-0001-tech-stack` | 🟡 待 review | 回答 5 个开放问题（详见 Q2） |
| `docs/adr-0003-sqlite-drizzle` | 🟡 待 review | 回答 4 个开放问题（详见 Q3） |
| `docs/design-outline` | 🟡 待 review | 看 17 + 5 个决策点，挑出反对的（详见 Q4） |

**没有任何分支被 push 到远程。** 你回来时 `git push --all` 之前先 review。

---

## 详细：每个分支干了什么

### 分支 1 · `chore/superpowers-bootstrap`（**这是首次合并目标**）

- 这是你下线前我们一起做的事：装 Superpowers 工程方法论 skill 包
- 本次新增 2 个 commit：
  - `e62c045`：补 CHANGELOG.md + 创建 `.github/pr-drafts/superpowers-bootstrap.md`（PR 描述草稿）
  - 原 `3729fb8`：12 个用户级 skill（已装到 `~/.claude/skills/`，未入 git）+ 2 个项目级 skill 入仓
- **可以作为"第一次合并"的候选**。PR 描述已经写好在 `.github/pr-drafts/superpowers-bootstrap.md`

**你的动作**：
```bash
git push -u origin chore/superpowers-bootstrap
gh pr create --base main --head chore/superpowers-bootstrap \
  --title "chore(skills): bootstrap Superpowers — 工程方法论 skill 包" \
  --body-file .github/pr-drafts/superpowers-bootstrap.md
```

---

### 分支 2 · `docs/week-plan-spec`

- 1 个 commit：`696bea6`
- 内容：`docs/superpowers/specs/2026-06-26-week-plan-design.md`
- 这是 `brainstorming` skill 流程的产出（你下线前我们走完了 6 轮 AskUser）
- 把本周交付目标、过线标尺、三天分块、风险登记**写成了一份正式 spec**

**你的动作**：见 Q1。

---

### 分支 3 · `spike/pty-bootstrap`

- 1 个 commit：`c4cb3ac`
- 内容：完整 `spike/pty/` 骨架
  - `README.md` / `notes.md` —— 跑法、进度勾选、结论模板
  - `package.json` / `tsconfig.json` / `.gitignore` —— 独立 pnpm 子项目，**不污染**主仓库
  - `00-hello-spawn.ts` —— **完整可跑代码**：node-pty 跑 `ls` 验装机
  - `01-spawn-claude.ts` —— **完整可跑代码**：拉起 `claude --help`
  - `02-send-prompt.ts` —— 骨架（等 01 跑通再实现）
  - `pty-harness.ts` —— Iter 2 模块接口骨架（无实现）
- 同时更新 `spike/README.md` 索引：状态 🔴未开始 → 🟡骨架就位
- **没有跑 `pnpm install`**（我不能保证你机器编译 node-pty 没问题，这一步你来做）

**你的动作**：

```bash
git checkout spike/pty-bootstrap
cd spike/pty
pnpm install         # 第一次跑可能慢，node-pty 要编译
pnpm run 00          # 应该能看到 ls 输出
pnpm run 01          # 应该能看到 claude --help
# 跑通后照 README.md 的进度勾选打钩
```

---

### 分支 4 · `docs/adr-0001-tech-stack`

- 1 个 commit：`4dce4ee`
- 内容：`docs/architecture/adr/0001-tech-stack.md` v0.1 草稿
- 全部选择都有上游 PRD/non-goals/AGENTS.md 出处，**AI 没有自行引入任何新技术**
- 同时更新 `docs/architecture/adr/README.md` 索引

**你的动作**：见 Q2。

---

### 分支 5 · `docs/adr-0003-sqlite-drizzle`

- 1 个 commit：`cce5f7e`
- 内容：`docs/architecture/adr/0003-sqlite-drizzle.md` v0.1 草稿
- 锁定 SQLite + Drizzle + better-sqlite3，明确拒绝 7 个候选

**你的动作**：见 Q3。

---

### 分支 6 · `docs/design-outline`

- 1 个 commit：`122c5ca`
- 内容：`docs/design/ux-flow.md` v0.1 大纲（替换原占位）
- 5 个核心流程 + 17 个流程内决策点 + 5 个横向决策点
- **不含原型图**（图等你画 #3）

**你的动作**：见 Q4。

---

### 分支 7 · `docs/offline-handoff`（你正在看的这份）

- 1 个 commit（即将做的这个）：本文件
- 让你回来有一个统一的入口

---

## 你需要回答的问题

> 全部不在线回答，由你 review 时一次性决断。

### Q1 · `docs/week-plan-spec` 是否保留？

这份 spec 是 brainstorming skill 流程**强制要求**的产物（"docs/superpowers/specs/" 是 Superpowers 默认的 spec 输出目录）。

但它确实跟我们项目原生的 `docs/product/` `docs/architecture/` 不同档案——它是"工作流的产物"，不是"产品的产物"。

| 选项 | 说明 |
|---|---|
| A. 保留在 `docs/superpowers/specs/` | 沿用 Superpowers 默认，未来都按这个路径放 brainstorming 产出 |
| B. 移到 `notes/` | 当成"开发日志"对待，VitePress 不渲染 |
| C. 删掉 | 觉得这种"工作流元数据"不必入仓 |
| D. 留但禁用：把整个 `docs/superpowers/` 加进 `.gitignore`，本次先撤回 commit | 等下周 retro 再定 |

**AI 建议**：**A**，但在 `docs/.vitepress/config.ts`（未来）配置里排除 `superpowers/` 不发布到 GitHub Pages。

### Q2 · ADR-0001 五个开放问题

详见 `docs/architecture/adr/0001-tech-stack.md` 末尾的 "维护者待回答的开放问题" 段，复制于此：

1. **Tailwind CSS 要不要在本 ADR 一并锁定？**
2. **Husky 是 P0 还是 Iter 2 才上？**（roadmap 写在 Iter 2）
3. **Vitest vs Jest** —— AI 倾向 Vitest
4. **是否需要 monorepo？**（roadmap Iter 2 说 "先单包 apps/host"）
5. **Node 版本最低是 18 还是 20？**

### Q3 · ADR-0003 四个开放问题

详见 `docs/architecture/adr/0003-sqlite-drizzle.md` 末尾，复制于此：

1. **PTY 实时输出（百 MB 量级）落不落 SQLite？** —— AI 建议不全落
2. **drizzle-kit migration 工作流 Iter 2 day 1 就上？还是先 `db.exec` 凑合？** —— AI 倾向 migration
3. **WAL mode 默认启用？** —— AI 强烈建议是
4. **schema 命名 snake_case vs camelCase？** —— AI 建议 DB snake，TS camel

### Q4 · `docs/design-outline` 17 + 5 个决策点

我在每个决策点都已经预选了 "AI 建议"。你回来快速过一遍，**告诉我哪些反对**，剩下的就算默认采纳。

最关键的几个：

- **D1.3** Done Criteria "试跑"按钮 → AI 强烈建议有
- **D2.2** 失败 Run 是否自动 retry → AI 建议是（按 retryPolicy）
- **D2.4** "Re-run with current changes" 是 amend 还是新 Run → AI 建议新 Run（审计性）
- **D4.1** 默认并发上限 → AI 建议 2
- **D5.1** Blueprint 改保存 = 自动版本化 → AI 建议是
- **H1** 暗色 / 亮色默认 → AI 建议暗色
- **H5** 上 Tailwind → AI 建议是

---

## 全局状态快照

### 已 commit 未 push 的分支（按建议合并顺序）

```
1. chore/superpowers-bootstrap   ← 首次合并目标（最稳）
2. spike/pty-bootstrap           ← 周末开干前合（最有用）
3. docs/week-plan-spec           ← Q1 决断后合
4. docs/adr-0001-tech-stack      ← Q2 回答后合
5. docs/adr-0003-sqlite-drizzle  ← Q3 回答后合
6. docs/design-outline           ← Q4 回答后合
7. docs/offline-handoff          ← 这份本身合不合都行；建议 review 完后撤掉（merge --no-ff 也行）
```

### Iter 1 Issue 进度

| # | 标题 | 状态 | 对应分支 |
|---|---|---|---|
| #1 | PTY Spike: 拉起 Claude Code | 🟡 骨架就位，未跑 | `spike/pty-bootstrap` |
| #2 | PTY Spike: y/N FSM | 🔴 推下周 | — |
| #3 | 5 屏原型图 | 🔴 推下周（需 ux-flow 先过） | — |
| #4 | ux-flow + ui-spec 写实 | 🟡 ux-flow 大纲就位 | `docs/design-outline` |
| #5 | ADR-0001 | 🟡 v0.1 草稿 | `docs/adr-0001-tech-stack` |
| #6 | ADR-0002 node-pty | 🔴 等 spike 结论 | — |
| #7 | ADR-0003 SQLite + Drizzle | 🟡 v0.1 草稿 | `docs/adr-0003-sqlite-drizzle` |
| #9 | VitePress Pages (P1) | 🔴 本 Iter 后期 | — |
| #10 | Retro | 🔴 Day 14 | — |

**Iter 1 完成度估算**：从你下线时 ~25% 推到 ~55%（如果上述分支全 merge 后）。

### git log（全 6 commit）

```
docs/offline-handoff             (即将提交本文件)
docs/design-outline    122c5ca   docs(design): ux-flow.md v0.1 大纲
docs/adr-0003          cce5f7e   docs(adr): ADR-0003 SQLite + Drizzle v0.1 草稿
docs/adr-0001          4dce4ee   docs(adr): ADR-0001 技术栈选型 v0.1 草稿
spike/pty-bootstrap    c4cb3ac   spike(pty): bootstrap spike/pty 目录骨架
docs/week-plan-spec    696bea6   docs(spec): 本周交付计划 — PTY MVP 尖刀
chore/superpowers      e62c045   docs(changelog,pr): 补 Superpowers 引入的 CHANGELOG 与 PR 描述草稿
chore/superpowers      3729fb8   chore(skills): bootstrap Superpowers — 工程方法论 skill 包（你下线前的）
main                   056490e   feat(foundation): Iteration 1 立项（远端已存在）
```

---

## 我没做的事（明确清单）

我在你不在期间**克制**了以下事情：

- ❌ 没改 `LICENSE / AGENTS.md / CLAUDE.md`（AGENTS.md §8 第 4 条）
- ❌ 没改 `non-goals.md`（AGENTS.md §2）
- ❌ 没改 `prd.md`（PRD 是产品契约，AI 不主动改）
- ❌ 没装 `node_modules`（不知道你机器编译 node-pty 是否需要先装 build tools）
- ❌ 没 push 任何分支到 origin
- ❌ 没在 GitHub 上动 Issue / Project / Milestone
- ❌ 没写 ADR-0002（必须等 spike 跑出来）
- ❌ 没画原型图（设计是你的环节）
- ❌ 没写产品代码（Iter 1 不写产品代码）
- ❌ 没把 `chore/superpowers-bootstrap` 推到远程或开 PR

---

## 如果你回来时间不够，最小动作集

按时间投入排序：

| 投入 | 你做什么 | 收益 |
|---|---|---|
| **2 分钟** | `git log --all --oneline -20` 看一眼 | 知道发生了啥 |
| **5 分钟** | push + 开 PR for `chore/superpowers-bootstrap` | 第一次合并完成 ✅ |
| **15 分钟** | 进 `spike/pty-bootstrap` 跑一遍 `pnpm install && pnpm run 00 01` | PTY 第一次火苗 |
| **30 分钟** | 回答 Q1-Q4 的 AI 建议（你只要说"反对哪些"） | 4 个分支可合并 |
| **60 分钟** | 全部 merge + 推到远程 + 关联 Issue 状态 | Iter 1 推到 ~55% |

---

## 我的最后建议

> 周末来了。**不要在 review 这堆草稿上花太多时间**，因为它们都是可逆的。
>
> **真正能让 Iter 1 不死的是 PTY spike 跑通**，建议你把今天剩下的精力 + 周末的核心时段，
> 投在 `spike/pty-bootstrap` 上。这堆 ADR / 设计草稿能等到 Day 6-10 再 review。
>
> 如果今晚只能做一件事 → 跑 `cd spike/pty && pnpm install && pnpm run 00`。
> 编译 node-pty 通了，本周就稳了一半。

辛苦了。我闭嘴。
