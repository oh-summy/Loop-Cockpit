# spike/

技术尖刀验证目录。

**规则**：

- 这里的代码**不进** `apps/`，永远是探索性的
- 每个 spike 一个子目录或单文件，配 `README.md` 记录**结论**（通了 / 没通 / 改方案）
- spike 通过后，对应模块的正式文档写实在 `docs/architecture/modules/`

## 当前 spikes

| # | 路径 | 名称 | 状态 | 负责 |
|---|---|---|---|---|
| 01 | [`pty/`](./pty/) | node-pty 拉起 Claude Code（+ I/O） | 🟡 骨架就位，未跑通 | @oh-summy |

## 计划

- spike-01 PTY 尖刀（Iter 1）：**项目存活验证**，最优先
- spike-02 Drizzle schema 试水（Iter 2 前）
- spike-03 Xterm 流转发延迟测试（Iter 2 前）
