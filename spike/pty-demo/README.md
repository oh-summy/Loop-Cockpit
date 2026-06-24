# PTY Spike — Iteration 1 Issue #1

> **状态**：🟡 待本地验证（服务器环境缺 C 工具链，无法编译 node-pty）
> **关联**：[Issue #1](https://github.com/oh-summy/Loop-Cockpit/issues/1)
> **结论位**：跑通后填写下面"结论"小节

---

## 这是什么

Loop Cockpit 整个产品的咽喉——验证 node-pty 能稳定拉起 Claude Code CLI
并把彩色输出原样转发。这是 Loop Cockpit 一切"实时看 Agent 干活"能力的底座。

## 文件清单

| 文件 | 用途 |
|---|---|
| `package.json` | npm 工程，依赖 node-pty + tsx + typescript |
| `tsconfig.json` | TypeScript strict 模式 |
| `pty-demo.ts` | 主程序：用 node-pty 拉起 `claude --print`，原样打印输出 |
| `auto-respond.ts` | （Issue #2）简单 FSM 应对 `[y/N]` |

---

## 🏠 本地执行步骤（家里电脑或能装编译工具的环境）

### 前置要求

```bash
# Debian/Ubuntu
sudo apt-get install -y build-essential python3

# macOS（装 Xcode Command Line Tools）
xcode-select --install
```

### 跑 spike

```bash
cd ~/projects/Loop-Cockpit
git checkout main
git pull
git checkout -b spike/pty-demo
cd spike/pty-demo
npm install
npm run demo
```

### 期望看到的

```
--- PTY spike starting ---
Spawning: claude --print "Say hello and introduce yourself in one sentence."

╭──────────────────────────────────────────────╮
│ ✻ Welcome to Claude Code...                  │
│ ...                                          │
╰──────────────────────────────────────────────╯
Hi! I'm Claude, an AI assistant made by Anthropic...

--- PTY spike finished ---
Exit code: 0
Signal:    (none)
Elapsed:   XXXX ms
Bytes out: XXXX
Has ANSI:  YES ✓
Result:    PASS ✓
```

---

## 📝 结论（跑完后填写）

<!--
- 通过 / 失败
- Linux / macOS / Windows
- node-pty 版本
- node 版本
- claude 版本
- 踩到的坑（装 prebuild / make / 颜色问题等）
- 自动应答 FSM 验证情况
-->

_TBD_

---

## 备选方案（如果 PTY 路径走不通）

详见对话历史，按推荐度排：

1. **spawn + `--print`**：0 依赖，单向流，最稳
2. **Anthropic SDK + 自建 tool loop**：纯 API，不依赖 CLI
3. **WebSocket + Anthropic API**：完全云端化

如果 PTY 在本机都跑不通，立刻切备选 1，在 `spike/cli-print-demo/` 建第二个 spike。