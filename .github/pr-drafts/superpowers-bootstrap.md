# PR 草稿：chore(skills): bootstrap Superpowers

> 这是一份**等维护者回来 review 后再发出**的 PR 描述草稿。
> 对应分支：`chore/superpowers-bootstrap`
> 对应 commits：`3729fb8`、（追加的 CHANGELOG/Docs 提交）
>
> 发 PR 命令（确认无误后由维护者跑）：
>
> ```bash
> git push -u origin chore/superpowers-bootstrap
> gh pr create --base main --head chore/superpowers-bootstrap \
>   --title "chore(skills): bootstrap Superpowers — 工程方法论 skill 包" \
>   --body-file .github/pr-drafts/superpowers-bootstrap.md
> ```

## What

为 Loop Cockpit 引入 [obra/superpowers](https://github.com/obra/superpowers) 工程方法论 skill 包，作为**开发期的工具链**（不是产品依赖）。

- **用户级**（`~/.claude/skills/`，不进 git）：12 个跨项目通用 skill
- **项目级**（`.claude/skills/`，进 git）：2 个与 Loop Cockpit 产品形态直接相关的 skill
- **决策与试用计划**：`notes/2026-06-26-superpowers-bootstrap.md`

## Why

1. **磨刀**：在 Iter 1 还没开始写产品代码之前，先把 AI 协作的工作流（brainstorming → write plan → TDD → review）跑顺
2. **侦察友军**：Superpowers 本身就是「用 skill 编排 Agent 工作流」的范例 —— 这正是 Loop Cockpit 自己将要长成的能力，把对应 2 个 skill 放在项目级目录，作为 Iter 3 多 Loop 并行 / Iter 7+ 多 Agent 协同设计的**活体参考样本**
3. **零产品风险**：不引入任何运行时依赖，未来想撤就 `rm -rf .claude/skills/` 即可，仓库不受污染

## How to verify

```bash
# 1. 文件齐全
ls .claude/skills/subagent-driven-development/{SKILL.md,_why-in-project.md}
ls .claude/skills/dispatching-parallel-agents/{SKILL.md,_why-in-project.md}

# 2. 上游 commit 锚定
grep -r "896224c4" .claude/skills/ notes/2026-06-26-superpowers-bootstrap.md

# 3. 笔记可读
head notes/2026-06-26-superpowers-bootstrap.md
```

行为验证（手动）：

- 重启 Claude Code 后输入 `/`，应能看到 `subagent-driven-development`、`dispatching-parallel-agents` 出现在 skill 列表

## Definition of Done

- [ ] 关联了至少 1 个 Issue —— ⚠️ 本 PR **不**关联具体 Issue，因为它是「工具引入」而非「产品交付」。AGENTS.md §8 第 2 条建议事后补 Issue，可在 merge 后补一条「[Meta] 引入 Superpowers 作为开发辅助」追溯
- [x] 代码通过 `pnpm lint` 和 `pnpm test` —— N/A（无代码，仅 skill 配置文件）
- [x] 新增/修改的公共 API 有 JSDoc —— N/A
- [x] 没有遗留 `console.log` / `TODO without context` —— ✅
- [x] 没有引入未在 ADR 记录的新依赖 —— ✅（skill 不是产品依赖；按 `notes/2026-06-26-superpowers-bootstrap.md` 的判断，工具类引入不走 ADR）
- [x] 更新了 CHANGELOG.md —— ✅
- [x] 受影响的文档已同步 —— ✅ `notes/2026-06-26-superpowers-bootstrap.md`
- [x] 我能用一句话向用户解释"这个改动让产品多了什么能力" —— 它**不让产品多任何能力**，它让**开发流程多了一套可触发的方法论 skill**；产品级价值在 Iter 3+ 参照设计时兑现

## 关联

- 无强关联 Issue（理由见 DoD 第 1 条）
- 后续相关：Iter 3 `modules/runner.md`、Iter 4 `modules/scheduler.md` 在动笔前应回看本 PR 引入的 2 个项目级 skill

## 风险与回滚

| 风险 | 影响 | 回滚 |
|---|---|---|
| Superpowers skill 与现有 lark-* / 原生 skill 冲突 | 触发不对的 skill | 删对应目录即可，无副作用 |
| `dispatching-parallel-agents` / `subagent-driven-development` 早期被误触发，烧 token | 单次会话开销 | 试用一周后看 `notes/` 里的 retro，决定是否保留 |
| Superpowers 上游更新破坏当前体验 | 无 —— 我们锁了 commit | 重新拉 + 评估 |

## 试用追踪

`notes/2026-06-26-superpowers-bootstrap.md` 末尾留了 Mini Retro 占位，预计 2026-06-29 补完后再考虑是否保留项目级那 2 个 skill。**如 retro 结论是"不值得保留"，将开一个 revert PR**。
