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

## 跑法（开干时填）

```bash
cd spike/pty
pnpm install
pnpm exec tsx 00-hello-spawn.ts
pnpm exec tsx 01-spawn-claude.ts
pnpm exec tsx 02-send-prompt.ts
```

## 依赖（待开干时定版）

| 包 | 版本（计划） | 用途 | 备选 |
|---|---|---|---|
| `node-pty` | `^1.0.0` | 主依赖 | `node-pty-prebuilt-multiarch`（编译失败时 fallback） |
| `tsx` | `^4.0.0` | 跑 TS 不走构建 | `ts-node` |
| `typescript` | `^5.4.0` | 类型 | — |

> ⚠️ **本周不**把这些升级到产品依赖。spike 结论达成后，依赖通过 ADR-0002 重新引入到 `apps/`。

## 进度（开干时勾选）

- [ ] Day 1 (6/26 周五剩余 1–2h) — 工程骨架 + 00-hello-spawn 跑通
- [ ] Day 2 上午 (6/27 周六 3h) — 01-spawn-claude 跑通（拉起 + exit）
- [ ] Day 2 下午 (6/27 周六 2–3h) — 02-send-prompt 跑通（IO）
- [ ] Day 3 上午 (6/28 周日 2–3h) — pty-harness 抽出 + e2e demo
- [ ] Day 3 下午 (6/28 周日 1–2h) — 写本文件"结论"段 + PR 草稿

**中场判定**：周六 20:00 还看不到 claude 启起来 → 降档到"最低止损"。

---

## 结论（本周末跑完写在这里）

> ⏳ 待填。模板：
>
> - **结论**：✅ 可行 / ⚠️ 局部可行 / ❌ 不通
> - **下一步**：
>   - 若 ✅：继续 Iter 2 用 node-pty 构建 Adapter；写 ADR-0002 收录决策
>   - 若 ⚠️：列出局部问题，评估 Iter 2 风险；可能需要 fallback 到 API 模式
>   - 若 ❌：触发 spec §7 风险登记的「PTY 跨平台不通」对策，重评技术方向

---

## 参考

- spec：`docs/superpowers/specs/2026-06-26-week-plan-design.md`
- 上游 PRD：`docs/product/prd.md` §D（PTY 执行层）
- 上游 glossary：`docs/product/glossary.md` § PTY Harness / Agent Adapter
- 上游 issue：#1、#2
