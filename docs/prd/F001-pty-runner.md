---
id: F001
title: PTY Runner — 用 node-pty 拉起 Coding Agent
status: Done
priority: P0
iteration: Iter 1
issue: https://github.com/oh-summy/Loop-Cockpit/issues/1
owner: "@oh-summy"
updated: 2026-06-27
---

# F001 · PTY Runner

> Loop Cockpit 编排 Coding Agent 的**最底层能力**:用 node-pty 在虚拟 TTY 里拉起 `claude` 等 CLI,捕获 ANSI 输出,编程式收发 prompt,处理 exit code。
>
> 本 PRD 反向沉淀自 Iter 1 已完成的 [spike/pty](../../spike/pty/) 工作。

---

## 1. 一句话

让 Loop Cockpit 用 `node-pty` 在虚拟 TTY 中可靠拉起 Coding Agent CLI(首发 `claude`),并完整捕获/控制其 IO。

## 2. 目标 (Why)

Loop Cockpit 的产品形态是"编排外部 Coding Agent"——但这些 Agent 大多以**交互式 TTY 应用**形式存在(`claude`/`opencode`/`codex` 等)。如果用 `child_process.spawn` 拉起,它们会:
- 检测到非 TTY 而禁用色彩、禁用交互模式
- 不响应 `[y/N]` 类提示(我们也无法发送)
- 输出格式与人工运行时不一致,导致 Xterm 渲染异常

**只有用 `node-pty`(分配真实虚拟 TTY)才能让这些 Agent 表现得"像在终端里"**。本功能是 D1 PTY Runner 模块([product-overview §6 D](../architecture/product-overview.md))的基础实现,所有后续 Adapter / Run / Audit 都依赖它。

## 3. 范围

### In Scope (本 Iter)
- node-pty 在本机 macOS 拉起 `claude` 并捕获 ANSI 输出
- 编程式发送 prompt(headless `claude -p` 模式)+ 读取完整回复
- 正确处理 exit code 与 SIGKILL
- 解决 pnpm 11 build script 放行 + spawn-helper 权限两个工程坑

### Out of Scope (推到 Iter 2 / 后续)
- **自动应答 `[y/N]` FSM** → [Issue #2](https://github.com/oh-summy/Loop-Cockpit/issues/2)(F00X PRD,待建)
- Linux / Windows 平台验证(Iter 2)
- 多 Agent 适配(本 Iter 仅 claude)
- Xterm.js 前端流转发(Iter 2,F00X)
- worktree 沙箱集成(Iter 3)

## 4. 用户故事 / Use Cases

- 作为 Loop Cockpit Host,我想拉起一个 claude 子进程,以便在 Run 生命周期内驱动它工作。
- 作为 Host,我想发送一条 prompt 并读取完整回复,以便实现 Done Criteria 评估循环的第一步。
- 作为 Host,我想正确得知子进程退出码,以便决定 Run 状态(success/failed/retry)。
- 作为 维护者,我想本周末看到能拉起 claude 的可执行 demo,以便确认技术方向无误。

## 5. 关联资源

| 类型 | 资源 | 说明 |
|---|---|---|
| 架构参考 | [architecture/overview.md §1 执行层](../architecture/overview.md) | 本功能在 Agent 适配层的最底层 |
| 架构参考 | [product-overview.md §6 D PTY 执行层](../architecture/product-overview.md) | 总 PRD 中的功能描述 |
| ADR | [decisions/0002-node-pty.md](../architecture/decisions/0002-node-pty.md) | 技术选型 + 三坑对策 |
| ADR | [decisions/0001-tech-stack.md](../architecture/decisions/0001-tech-stack.md) | 锁定 node-pty 为 PTY 桥 |
| Spike 代码 | [spike/pty/](../../spike/pty/) | 00/01/02 三脚本 + harness 骨架 |
| Spike 笔记 | [spike/pty/notes.md](../../spike/pty/notes.md) | 跑通现场 + 三坑详细记录 |
| GitHub Issue | [#1](https://github.com/oh-summy/Loop-Cockpit/issues/1) | 实施跟踪 |
| 后续 Issue | [#2](https://github.com/oh-summy/Loop-Cockpit/issues/2) | `[y/N]` FSM(下一 PRD) |

## 6. 数据契约 / 接口

> Iter 2 实施时,在 `apps/host/src/pty/` 实现以下接口。Iter 1 spike 只验证可行性,不固化接口。

```typescript
// spike/pty/pty-harness.ts 的雏形 → Iter 2 apps/host/src/pty/index.ts
interface PtyHarness {
  spawn(command: string, args: string[], opts: PtySpawnOpts): PtyProcess;
}

interface PtyProcess {
  pid: number;
  onData(cb: (chunk: string) => void): void;
  onExit(cb: (result: { exitCode: number; signal?: string }) => void): void;
  write(input: string): void;
  kill(signal?: string): Promise<void>;
  resize(cols: number, rows: number): void;
}

interface PtySpawnOpts {
  cwd: string;
  env: Record<string, string>;
  cols: number;  // default 120
  rows: number;  // default 30
  name?: string; // default "xterm-color"
}
```

## 7. 验收标准 (Done Criteria)

- [x] `pnpm run 00` spawn `ls -la` 成功,exitCode=0,捕获 6KB+ 输出
- [x] `pnpm run 01` 拉起 `claude --help`,exitCode=0,捕获 12KB+ 含 ANSI 色码输出
- [x] `pnpm run 02` 用 `claude -p "..."` 收发 prompt,自然退出 exitCode=0
- [x] 三个工程坑(`allowBuilds` / spawn-helper 权限 / timer 漏 process.exit)全部记录到 [spike/pty/notes.md](../../spike/pty/notes.md)
- [x] 决策入 ADR-0002

## 8. 非功能约束

- **平台**:macOS x86_64 已验证。Linux / Windows 留到 Iter 2(需 ADR-0002 后续修订)。
- **依赖**:node-pty 1.1.0 + tsx 4.x + typescript 5.x。Spike 不污染主产品依赖树,Iter 2 起在 apps/host 重新声明。
- **性能**:spike 阶段不做基准,Iter 2 起测吞吐(预期 100KB/s ANSI 流 → Xterm 无掉帧)。

## 9. 开放问题

无 — 本 Iter MVP 标尺已达成。

后续待解:
- Linux / Windows 平台行为(Iter 2 当个 sub-issue)
- spawn-helper chmod 自动化方式(Iter 2 装到 apps/host postinstall)
- node-pty native binding 在 CI 跑得通(Linux/macOS 双产物)

## 10. 变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-27 | v0.1 | 首版,反向沉淀自 spike/pty 的工作。状态 Done(本 Iter 标尺) |
