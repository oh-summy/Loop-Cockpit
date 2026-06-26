# 为什么这个 skill 出现在项目级 `.claude/skills/`？

> 这是一个**产品设计活体参考样本**，不是"项目专属开发工具"。

## 来源

- 上游：[obra/superpowers](https://github.com/obra/superpowers)
- 复制时上游 commit：`896224c4b1879920ab573417e68fd51d2ccc9072`
- 复制日期：2026-06-26

## 为什么进项目级（而非用户级）

Loop Cockpit 在 Iter 3 之后要做：

- **多 Loop 并行执行**（Run 队列 + 并发控制）
- **Iter 4 Trigger Bus** 的多源事件并发派发（防抖、失败重排）

`dispatching-parallel-agents` 描述的就是「如何并行派发若干独立子 Agent / 子任务，并把结果聚合」的工程实践。
把它放在项目级，是为了：

1. 让维护者在设计 Run 调度器、Trigger Dispatcher 时**直接对照参考**
2. 启发 `docs/architecture/modules/scheduler.md` 的写作

## 使用建议

- **可以**：日常并行小任务时正常触发
- **应该**：写 `modules/scheduler.md` / `adr/0005-trigger-bus.md` 之前先回看本 skill 是怎么处理「并发上限 / 失败聚合 / 中途取消」的
- **不要**：把它的具体实现细节当成 Loop Cockpit 必须照搬的方案——只取设计灵感，不抄实现

## 不修改原则

同 `subagent-driven-development/_why-in-project.md` 第 4 节。
