# spike/pty 实战笔记

> 时间倒序记录。最新在上。每条笔记包含：现象 / 假设 / 验证 / 结论。

---

## 2026-06-26 · 实战跑通（00/01/02 全绿）

### 机器档案

```
OS:                Darwin x86_64 (macOS, Kernel 21.6.0)
Node:              v22.19.0
pnpm:              11.9.0（开干前机器没有，npm i -g pnpm 装的）
claude CLI 路径:   /Users/rocky/.npm-global/bin/claude
claude 版本:       2.1.177 (Claude Code)
build tools:       make / g++ / python3 / Xcode CLT 齐全（本次未用到源码编译，走 prebuild）
```

### 预备清单实测

- [x] `which claude` → `/Users/rocky/.npm-global/bin/claude`
- [x] `node --version` → v22.19.0（≥18 LTS）
- [x] `pnpm --version` → 11.9.0（**开干前缺失**）
- [x] `make` / `g++` → /usr/bin/ 都有
- [x] `python3` → /usr/local/bin/python3

### 坑 1 · pnpm 不在 PATH

- **现象**：机器无 pnpm（AGENTS.md 锁的包管理器）
- **验证**：`npm install -g pnpm` → 11.9.0
- **结论**：解决。Iter 2 环境前置说明里要写「装 pnpm」。

### 坑 2 · pnpm 11 ignored-builds 挡住 install / run

- **现象**：`pnpm install` 报 `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild, node-pty`；`pnpm run 00` 因前置 deps status check 也直接退出 1，根本到不了脚本。
- **验证**：
  1. package.json 加 `pnpm.onlyBuiltDependencies` → ❌ pnpm 11 已不读此字段（WARN）
  2. pnpm-workspace.yaml 加 `onlyBuiltDependencies` → ❌ 仍报 ignored
  3. pnpm 自己往 pnpm-workspace.yaml 写回 `allowBuilds:` 占位 → **这才是 pnpm 11 认的 key**
  4. 填 `allowBuilds: { esbuild: true, node-pty: true }` → install 跑 build scripts，Done
- **结论**：绕过。**pnpm 11 用 `pnpm-workspace.yaml` 的 `allowBuilds`（包名→bool），不是 package.json 的 `pnpm.onlyBuiltDependencies`**。Iter 2 建 apps/host 会同样撞，写进 ADR-0001/0002。

### 坑 3 · spawn-helper 丢执行权限 → posix_spawnp failed

- **现象**：00 跑起来报 `Error: posix_spawnp failed`，01 / `/bin/echo` 同样。
- **验证**：
  - `file prebuilds/darwin-x64/spawn-helper` → Mach-O x86_64，架构对
  - `ls -la` → `-rw-r--r--`，**没有 x 位**
  - node-pty unix fork 要 exec 这个 spawn-helper，无 x 权限 → posix_spawnp 失败
  - pnpm 解压 tarball 没保留可执行位；post-install.js 只清 release + 挪 Windows conpty.dll，没补 spawn-helper 的 x
- **修复**：`chmod +x node_modules/node-pty/prebuilds/darwin-x64/spawn-helper` → 00 立即通
- **结论**：绕过。**每次 `pnpm install` 后此权限复发**，Iter 2 需在 apps/host 的 postinstall 自动 chmod，或换 `node-pty-prebuilt-multiarch`。写进 ADR-0002。

### 跑通记录

| 脚本 | 命令 | 现象 | 结论 |
|---|---|---|---|
| 00-hello-spawn | `pnpm run 00` | spawn `ls -la`，chunks=8 bytes≈6.2KB exitCode=0 | ✅ node-pty 装机可用 |
| 01-spawn-claude | `pnpm run 01` | spawn `claude --help`，chunks=13 bytes=12147 exitCode=0 | ✅ claude 可被 pty 拉起 + 捕获输出 |
| 02-send-prompt | `pnpm run 02` | `claude -p "Reply with exactly one word: pong"` → 回 `pong`，exitCode=0 自然退出 | ✅ 收发 prompt 闭环 |

### 脚本自身的 timer bug（已修）

- **现象**：00/01 原版 onExit 打印 OK 后没 `process.exit`，兜底 setTimeout（00=10s / 01=5s）误触发，最终退出码 124。
- **结论**：已给 00/01 的 onExit 成功分支补 `process.exit(0)`。非 node-pty 问题，骨架脚本遗漏。

### 总结论

✅ **node-pty + claude 在 macOS x86_64 可行**。本周 MVP 标尺（拉起 / 捕获 / 收发 / exit code）全达成。
下一步：ADR-0002 收录决策（含三坑对策），Iter 2 在 apps/host 构建 Claude Code Adapter。

---

## 2026-06-26 · 工程骨架预备

**现象**：未开始。仅准备好目录结构与文件清单。（预备清单已实测见上）

---

## 模板（每条笔记照抄）

```markdown
## YYYY-MM-DD HH:MM · <小标题>

- **现象**：…
- **假设**：…
- **验证**：跑了什么、看到什么
- **结论**：解决 / 绕过 / 留着 / 升级到 README 结论
```
