---
id: 0002
title: 用 node-pty 而非 child_process(含三个工程坑对策)
status: Proposed
date: 2026-06-27
deciders: "@oh-summy"
---

# ADR-0002 · 用 node-pty 而非 child_process

## 上下文 (Context)

Loop Cockpit 编排外部 Coding Agent(`claude` / `opencode` / `codex` 等),需要:

1. 让 Agent 表现得**像在真终端里**——色彩、TUI、`[y/N]` 提示
2. 编程式**双向 IO**:发送 prompt、读取完整回复、捕获 ANSI 控制字符
3. 正确处理 **exit code** 与 SIGKILL
4. 同时把 raw buffer 转发到 Xterm.js 前端(Iter 2)

Iter 1 的 PTY 尖刀 ([spike/pty/](../../../spike/pty/)) 已在 macOS x86_64 + claude 2.1.177 验证全部跑通。

## 决策 (Decision)

**用 `node-pty` 作为 PTY 桥,不用 `child_process.spawn`**。

具体配置:
- 版本:`node-pty@^1.0.0`(实测 1.1.0)
- 依赖 prebuilt binaries(`prebuilds/<platform>-<arch>/{pty.node,spawn-helper}`),不本地源码编译
- 默认 PTY 配置:`name: 'xterm-color'`, `cols: 120`, `rows: 30`

## 替代方案 (Alternatives)

- **`child_process.spawn`**:拒。Coding Agent 检测到非 TTY 会禁用色彩 + 禁用交互模式,且无法响应/发送 `[y/N]` 类 prompt。Xterm 拿到的不是真实终端流。
- **`node-pty-prebuilt-multiarch`**:候选 fallback。当 node-pty 主仓库 prebuild 失效时切。**作为坑 #2 的退路**。
- **Conpty (Windows native PTY API) 自写绑定**:拒。维护成本极高,node-pty 自身已封装。
- **Docker 隔离 + docker exec -it**:拒。违反 [non-goals §5](../non-goals.md) "不强依赖 Docker"。
- **API 模式(直接调 LLM API,不通过 CLI)**:作为**风险兜底**。当 node-pty 在 Windows 上彻底不通时降级,但会丢失"用 Claude Code 本地工作流(skills/MCP 等)"的全部价值。

## 后果 (Consequences)

### 正面
- claude 在 PTY 内运行**完全等同人工**:色彩、Xterm.js 渲染、`[y/N]` 提示都可见可控
- spike 已验证收发 prompt 闭环(`claude -p` headless 模式),Iter 2 直接进 Adapter 实现
- node-pty 是 2024-2026 Node 生态的事实标准(VS Code / Hyper / Tabby 等均依赖)

### 负面 — 三个已踩的工程坑
**这是本 ADR 的核心价值。spike 不只是验证可行,更是把坑探到位、写出对策**。

**坑 1 · pnpm 11 `ignored-builds` 拒绝跑 native install script**
- 现象:`pnpm install` 报 `ERR_PNPM_IGNORED_BUILDS`,`node-pty` install 脚本不跑 → 二进制找不到
- 已废方案:`package.json` 的 `pnpm.onlyBuiltDependencies` 字段(pnpm 11 已不读)
- 正确解:`pnpm-workspace.yaml` 加 `allowBuilds: { esbuild: true, node-pty: true }`
- **Iter 2 对策**:`apps/host/pnpm-workspace.yaml` 默认包含此配置,文档写进 [F001 PRD](../../prd/F001-pty-runner.md) "环境前置"

**坑 2 · `spawn-helper` 丢失执行权限 → `posix_spawnp failed`**
- 现象:install 后跑 spawn 报 `Error: posix_spawnp failed`
- 原因:`prebuilds/darwin-x64/spawn-helper` 是 Mach-O x86_64 可执行,但 pnpm 解压 tarball 没保留 x 位,node-pty post-install 脚本未补 chmod
- 立即解:`chmod +x node_modules/node-pty/prebuilds/darwin-x64/spawn-helper`
- **每次 `pnpm install` 后复发**,Iter 2 对策选项:
  - (a) `apps/host/package.json` 加 `postinstall` 脚本自动 chmod 所有 prebuild 平台目录
  - (b) 切换到 `node-pty-prebuilt-multiarch`(社区维护,据称权限处理更稳)
  - **推荐 (a)** — 主仓库优先,自动化兜底
- 上游已有 issue 跟踪(node-pty 仓库),长期看应由 node-pty 自身修

**坑 3 · 骨架脚本 onExit 漏 `process.exit` → 兜底 timer 误触发**
- 与 node-pty 无关,是 spike 脚本自身 bug。已修。
- **Iter 2 对策**:`PtyHarness` 实现必须明确"成功路径主动 cleanup",写进单元测试覆盖。

### 中性 / 待观察
- **Linux / Windows 平台**:Iter 2 必须扩验。Linux 多平台共用 unix code path,理论低风险;Windows 走 conpty 不同实现,**主要风险点**。
- **node-pty CI 跑双平台 prebuild**:Iter 2 起 CI(GitHub Actions)跑 macOS + Linux 双 prebuild 产物,验证 install 通。

## 关联 ADR / PRD

- [ADR-0001](./0001-tech-stack.md) §"PTY 桥" — 已锁定 node-pty,本 ADR 落实
- [F001 PRD](../../prd/F001-pty-runner.md) — 本 ADR 的实施依据
- 未来 F00X(待建)— `[y/N]` 自动应答 FSM,依赖本 ADR 的接口

## 引用

- [spike/pty/](../../../spike/pty/) — 完整 spike 代码
- [spike/pty/notes.md](../../../spike/pty/notes.md) — 三坑详细现场记录
- [spike/pty/README.md](../../../spike/pty/README.md) — spike 结论段
- [node-pty 仓库](https://github.com/microsoft/node-pty)
- [microsoft/node-pty#prebuilds 机制](https://github.com/microsoft/node-pty/blob/main/scripts/prebuild.js)
- [pnpm 11 settings - onlyBuiltDependencies](https://pnpm.io/settings#onlybuiltdependencies)

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-27 | v0.1 | 首版,基于 macOS spike 跑通后的真实数据 |
