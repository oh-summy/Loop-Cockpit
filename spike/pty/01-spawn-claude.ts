/**
 * spike/pty/01-spawn-claude.ts
 *
 * 目的：把 spawn 目标换成 `claude` CLI，验证 Coding Agent 能在 pty 里起来。
 *
 * Done criteria：
 *   - claude CLI 能被 spawn 起来（不报 ENOENT）
 *   - stdout 至少看到 1 个 chunk（无论是 banner 还是 prompt）
 *   - 能干净 SIGKILL（exit code 不挂 999）
 *
 * 跑法：
 *   cd spike/pty && pnpm run 01
 *
 * 注意：
 *   - 本脚本不会向 claude 发送任何 prompt（那是 02-send-prompt 的事）
 *   - 5 秒后主动 kill；目标只是看「能否启起来」
 *   - 若 claude 不在 PATH，会在尝试 spawn 前就报错，记到 notes.md
 */

import * as pty from "node-pty";
import { execSync } from "node:child_process";

// 预检：claude 是否在 PATH
let claudePath: string;
try {
  claudePath = execSync("which claude", { encoding: "utf8" }).trim();
  if (!claudePath) throw new Error("empty which output");
} catch {
  console.error("[spawn-claude] FAIL: `which claude` 没找到 claude CLI");
  console.error("  请确认你装了 claude code 并加进 PATH，然后再跑本脚本");
  process.exit(127);
}

console.log(`[spawn-claude] claude path: ${claudePath}`);

const ptyProcess = pty.spawn("claude", ["--help"], {
  name: "xterm-color",
  cols: 120,
  rows: 30,
  cwd: process.env.HOME || process.cwd(),
  env: process.env as Record<string, string>,
});

let chunks = 0;
let totalBytes = 0;
let sawAnything = false;

ptyProcess.onData((data) => {
  chunks++;
  totalBytes += data.length;
  if (!sawAnything) {
    sawAnything = true;
    console.log(`[spawn-claude] first chunk received (${data.length} bytes)`);
  }
  process.stdout.write(data);
});

ptyProcess.onExit(({ exitCode, signal }) => {
  console.log(
    `\n[spawn-claude] DONE chunks=${chunks} bytes=${totalBytes} exitCode=${exitCode} signal=${signal ?? "none"}`,
  );
  if (!sawAnything) {
    console.error("[spawn-claude] FAIL: 启起来但没有任何输出");
    process.exit(1);
  }
  console.log("[spawn-claude] OK");
});

// 5s 后兜底 kill（--help 应该会自然退，但 claude 行为未知）
setTimeout(() => {
  if (!ptyProcess.pid) return;
  console.log("[spawn-claude] 5s timeout, sending kill...");
  ptyProcess.kill();
}, 5_000);
