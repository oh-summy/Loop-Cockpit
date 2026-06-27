/**
 * spike/pty/00-hello-spawn.ts
 *
 * 目的：验证 node-pty 在本机能 spawn 任意命令（用 `ls -la`）。
 *
 * Done criteria：
 *   - 进程能起来
 *   - stdout 有内容（至少 1 个 chunk）
 *   - 进程能正常 exit
 *
 * 跑法：
 *   cd spike/pty && pnpm install && pnpm run 00
 *
 * 如果失败，先看 notes.md 的预备清单：node 版本、make/g++、python3 是否齐全。
 */

import * as pty from "node-pty";

// 跨平台兜底：Windows 的话也别在这测试，本周明确推迟
const shell = process.platform === "win32" ? "powershell.exe" : "ls";
const args = process.platform === "win32" ? [] : ["-la"];

console.log(`[hello-spawn] platform=${process.platform} cmd=${shell} ${args.join(" ")}`);

const ptyProcess = pty.spawn(shell, args, {
  name: "xterm-color",
  cols: 120,
  rows: 30,
  cwd: process.env.HOME || process.cwd(),
  env: process.env as Record<string, string>,
});

let chunks = 0;
let totalBytes = 0;

ptyProcess.onData((data) => {
  chunks++;
  totalBytes += data.length;
  // 直接转发到本进程 stdout，方便肉眼观察
  process.stdout.write(data);
});

ptyProcess.onExit(({ exitCode, signal }) => {
  console.log(
    `\n[hello-spawn] DONE chunks=${chunks} bytes=${totalBytes} exitCode=${exitCode} signal=${signal ?? "none"}`,
  );
  // 简易自检
  if (chunks === 0) {
    console.error("[hello-spawn] FAIL: 没有收到任何 stdout chunk");
    process.exit(1);
  }
  if (exitCode !== 0) {
    console.error(`[hello-spawn] FAIL: exitCode=${exitCode}`);
    process.exit(exitCode ?? 1);
  }
  console.log("[hello-spawn] OK");
  process.exit(0);
});

// 兜底超时（10s）
setTimeout(() => {
  console.error("[hello-spawn] TIMEOUT 10s, killing...");
  ptyProcess.kill();
  process.exit(124);
}, 10_000);
