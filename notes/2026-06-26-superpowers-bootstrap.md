# 2026-06-26 · 引入 Superpowers 作为开发辅助

> 个人开发日志，**不是**产品契约。本文件位于 `notes/`，VitePress 不渲染，仅供回顾。

## 背景

Iteration 1 Day 3。开始动手写产品代码之前，先把工具链"磨利"。
评估了 [obra/superpowers](https://github.com/obra/superpowers)（MIT，~15 个 skill 的工程方法论插件包），
判断它跟 Loop Cockpit 的契合度足够高，决定**分桶安装**：

- **用户级**（`~/.claude/skills/`）= 跨项目通用的开发辅助
- **项目级**（`.claude/skills/`）= 跟 Loop Cockpit **产品形态**直接相关的参考样本

## 装了什么

### 用户级（12 个，不进 git）

| Skill | 用途 |
|---|---|
| brainstorming | 方案讨论，ADR 选型前的 Socratic dialog |
| writing-plans | 拆任务清单 |
| executing-plans | 按 checkpoint 执行计划 |
| test-driven-development | TDD RED-GREEN-REFACTOR |
| systematic-debugging | 4 阶段根因追踪 |
| verification-before-completion | 收工前先验 |
| using-git-worktrees | worktree 隔离开发 |
| requesting-code-review | 提 review 前的自检 |
| receiving-code-review | 接 review 反馈的处理 |
| finishing-a-development-branch | 分支收尾决策 |
| writing-skills | 写 skill 的方法论 |
| using-superpowers | meta 入口 |

### 项目级（2 个，进 git）

| Skill | 为什么进 repo |
|---|---|
| subagent-driven-development | Loop Cockpit 「Loop 内多 step + 两阶段 review」的产品参考样本 |
| dispatching-parallel-agents | Iter 3 多 Loop 并行 / Iter 4 Trigger Bus 派发的参考样本 |

每个项目级 skill 旁附 `_why-in-project.md` 写明来源 commit、使用边界、不修改原则。

## 上游版本锚定

- 仓库：https://github.com/obra/superpowers
- Commit：`896224c4b1879920ab573417e68fd51d2ccc9072`
- 拉取日期：2026-06-26

## 试用计划

- **本周**（6/26 – 6/28）：在 ADR-0001 / PTY Spike #1 / #2 上至少试用 `brainstorming`、`writing-plans`、`using-git-worktrees` 三个 skill 一遍
- **下周一**（6/29 前后）：写一份 mini retro 追加在本文件末尾，回答：
  1. 哪些 skill 真正在我们工作流里产生了价值？
  2. 哪些 skill 跟 AGENTS.md / 项目原生 skill 打架？
  3. 它的 skill 设计有没有可以"反哺"到 Loop Cockpit 产品的灵感？
  4. 项目级那 2 个要不要继续留在 repo？

## 已知边界 / 注意事项

- Superpowers 把 TDD、worktree 写成 "mandatory"——**Iter 1 我们还没有产品代码**，TDD 不强制；遇到该 skill 强行要求时，明确拒绝即可
- `dispatching-parallel-agents` 和 `subagent-driven-development` 这两个**单人项目早期慎用**，token 开销大；在 Iter 1-2 期间仅作"读"，不作"用"
- 这两个项目级 skill 在用户级也有一份；触发时 Claude Code 行为以哪一份为准取决于加载顺序，目前不深究——本周末试用如发现问题再处理
- **不写 ADR 收录 Superpowers**——它不是产品依赖，是开发工具

## 提交

- 分支：`chore/superpowers-bootstrap`
- 只提交项目级 2 个 skill + 本笔记
- 用户级安装不进 git
- 不开 PR，先本地观察一周

---

## Mini Retro（待补，预计 2026-06-29）

> ⏳

