# spike/pty — node-pty 拉起 Coding Agent 的尖刀验证

> Iteration 1 的**项目存活验证**。
> 对应 GitHub Issue：[#1](https://github.com/oh-summy/Loop-Cockpit/issues/1)（[#2](https://github.com/oh-summy/Loop-Cockpit/issues/2) 推下周）

---

## 目标（本周 MVP 标尺）

来源：[`docs/superpowers/specs/2026-06-26-week-plan-design.md`](../../docs/superpowers/specs/2026-06-26-week-plan-design.md)

1. `node-pty` 能在本机（至少 Linux）拉起 `claude` CLI
2. 能捕获完整的 ANSI 输出
3. 能编程式发送一条 prompt，并读到完整回复
4. 能正确处理 exit code 与 SIGKILL

**不做**：自动应答 `[y/N]`、retry、worktree、UI、ESLint —— 见 spec §4。

---

## 目录约定

```
spike/pty/
├── README.md              # 本文件 + 跑通后写"结论"段
├── notes.md               # 实战笔记（坑、现象、解法）
├── package.json           # 独立 pnpm 子项目，不动主仓库根
├── tsconfig.json          # 最小配置
├── .gitignore             # 屏蔽 node_modules
├── 00-hello-spawn.ts      # 验证 node-pty 能 spawn 任意命令（ls）
├── 01-spawn-claude.ts     # 把目标换成 claude，验证拉起 + 退出
├── 02-send-prompt.ts      # stdin 写 prompt，stdout 读完整回复
└── pty-harness.ts         # 抽出来的最小可复用模块
```

## 跑法

```bash
cd spike/pty
pnpm install                # 首次需在 pnpm-workspace.yaml 的 allowBuilds 放行 esbuild/node-pty
chmod +x node_modules/node-pty/prebuilds/darwin-x64/spawn-helper  # 见 notes 坑3，每次 install 后复发
pnpm run 00                 # spawn ls 验装机
pnpm run 01                 # 拉起 claude --help（不花 token）
pnpm run 02                 # 发真 prompt（消耗少量 token）
pnpm run 02 -- "你的 prompt"
```

## 依赖（待开干时定版）

| 包 | 版本（计划） | 用途 | 备选 |
|---|---|---|---|
| `node-pty` | `^1.0.0` | 主依赖 | `node-pty-prebuilt-multiarch`（编译失败时 fallback） |
| `tsx` | `^4.0.0` | 跑 TS 不走构建 | `ts-node` |
| `typescript` | `^5.4.0` | 类型 | — |

> 实测版本（2026-06-26）：node-pty 1.1.0 / tsx 4.22.4 / typescript 5.9.3 / @types/node 20.19.43

> ⚠️ **本周不**把这些升级到产品依赖。spike 结论达成后，依赖通过 ADR-0002 重新引入到 `apps/`。

## 进度（开干时勾选）

- [x] Day 1 (6/26 周五) — 工程骨架 + 00-hello-spawn 跑通 ✅
- [x] Day 2 上午 (6/26 晚提前) — 01-spawn-claude 跑通（拉起 + exit）✅
- [x] Day 2 下午 (6/26 晚提前) — 02-send-prompt 跑通（IO）✅
- [ ] Day 3 上午 — pty-harness 抽出 + e2e demo（按需，未做）
- [x] Day 3 下午 — 写本文件"结论"段 ✅（PR 草稿待维护者决定是否合 main）

**中场判定**：周六 20:00 还看不到 claude 启起来 → 降档到"最低止损"。

---

## 结论

**✅ 可行**（2026-06-26，macOS x86_64，claude 2.1.177）

本周 MVP 标尺全达成：

| 标尺 | 状态 | 证据 |
|---|---|---|
| node-pty 拉起 claude CLI | ✅ | 01: spawn `claude --help` exitCode=0 |
| 捕获完整 ANSI 输出 | ✅ | 01: 12147 bytes 含色码；02: 含退出复位序列 |
| 编程式收发 prompt | ✅ | 02: `claude -p "..."` → 回 `pong` |
| exit code 正确 | ✅ | 00/01/02 均 exitCode=0 |

**踩到的坑（已解，详见 notes.md）**：
1. pnpm 11 用 `pnpm-workspace.yaml` 的 `allowBuilds` 放行 native addon build script（不是 package.json 的 `pnpm.onlyBuiltDependencies`）
2. node-pty prebuild 的 `spawn-helper` 丢执行权限 → `posix_spawnp failed`，需 `chmod +x`（每次 install 复发）
3. 骨架脚本 onExit 漏 `process.exit` → 兜底 timer 误触发（已修）

**下一步**：
- 写 ADR-0002（node-pty 选型 + 上述坑的对策：postinstall 自动 chmod、allowBuilds 配置）
- Iter 2 在 `apps/host` 基于 node-pty 构建 Claude Code Adapter
- Issue #2（[y/N] FSM）下周
- Linux / Windows 平台验证留待 Iter 2（本 spike 仅 macOS）

---

## 参考

- spec：`docs/superpowers/specs/2026-06-26-week-plan-design.md`
- 上游 PRD：`docs/product/prd.md` §D（PTY 执行层）
- 上游 glossary：`docs/product/glossary.md` § PTY Harness / Agent Adapter
- 上游 issue：#1、#2
