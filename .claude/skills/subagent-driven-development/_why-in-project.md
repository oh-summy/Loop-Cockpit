# 为什么这个 skill 出现在项目级 `.claude/skills/`？

> 这是一个**产品设计活体参考样本**，不是"项目专属开发工具"。

## 来源

- 上游：[obra/superpowers](https://github.com/obra/superpowers)
- 复制时上游 commit：`896224c4b1879920ab573417e68fd51d2ccc9072`
- 复制日期：2026-06-26

## 为什么进项目级（而非用户级）

Loop Cockpit 的产品形态是「**Loop = 一个 Blueprint + 多个 Step + 一个评估器**」。
`subagent-driven-development` 描述的正是这种「分发子任务 → 第一阶段 spec-compliance review → 第二阶段 code-quality review」的工作流，是 Loop Cockpit **产品自身将要实现的能力**的现成范例。

放在项目级而不是用户级，是为了：

1. 与本项目代码同 repo，方便维护者随时参照 → 启发 `docs/architecture/modules/runner.md`、`docs/architecture/modules/adapter.md` 的设计
2. 给后续 Iteration 留下设计 RFC 的"非正式素材"：
   - **Iter 3**（Sandbox & Multi-Loop）：多 Loop 并行的子任务隔离
   - **Iter 7+**（多 Agent 适配 / Sub-agent）：一个 Loop 内多 Agent 协同 + 两阶段 review

## 使用建议

- **可以**：日常开发中如果合用，正常触发即可（与用户级 skill 行为相同）
- **应该**：在设计 Loop 内多 step 编排、retry 策略、done criteria 评估器时，**先翻这份 skill 找思路**
- **不要**：把它当成"必须严格遵循的产品契约"——它是参考样本，不是规范

## 不修改原则

为了保持"上游参照样本"的价值，**除非有明确产品决策**（写进 ADR），不要直接修改本目录下从上游复制来的文件。如果要做项目本地化，新增 `_local-*.md` 之类的同级文件覆盖说明。
