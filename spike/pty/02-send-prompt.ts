/**
 * spike/pty/02-send-prompt.ts
 *
 * 目的：用 pty 拉起 claude，编程式发送一条 prompt，读到完整回复，干净退出。
 *
 * Done criteria（本周 MVP）：
 *   - 拉起 claude 进入 headless 模式（claude -p）
 *   - 编程式传入一条 prompt
 *   - stdout 能读到模型的回复内容
 *   - 收完回复后进程自然退出（exitCode=0）
 *
 * 跑法：
 *   cd spike/pty && pnpm run 02
 *   cd spike/pty && pnpm run 02 -- "你的 prompt"   # 自定义 prompt
 *
 * 选型：用 `claude -p`（--print headless）而非交互模式。
 *   - 单次问答、自然退出，最容易跑通
 *   - 这也是 Loop Cockpit 未来编排 Agent 的主流姿势（非交互式）
 *   - 交互模式 + [y/N] FSM 留给 Issue #2（下周）
 *
 * ⚠️ 本脚本会向 claude 发送真实 prompt，消耗少量 LLM token。
 */

import * as pty from "node-pty";

const PROMPT = process.argv[2] ?? "Reply with exactly one word: pong";

console.log(`[send-prompt] prompt="${PROMPT}"`);

const proc = pty.spawn("claude", ["-p", PROMPT], {
  name: "xterm-color",
  cols: 120,
  rows: 30,
  cwd: process.env.HOME || process.cwd(),
  env: process.env as Record<string, string>,
});

let chunks = 0;
let totalBytes = 0;
let buf = "";

proc.onData((data) => {
  chunks++;
  totalBytes += data.length;
  buf += data;
  process.stdout.write(data);
});

proc.onExit(({ exitCode, signal }) => {
  console.log(
    `\n[send-prompt] DONE chunks=${chunks} bytes=${totalBytes} exitCode=${exitCode} signal=${signal ?? "none"}`,
  );
  if (exitCode !== 0) {
    console.error(`[send-prompt] FAIL: exitCode=${exitCode}`);
    process.exit(exitCode ?? 1);
  }
  if (totalBytes === 0) {
    console.error("[send-prompt] FAIL: 没有收到任何回复");
    process.exit(1);
  }
  console.log("[send-prompt] OK — claude 回复已收到，进程自然退出");
  process.exit(0);
});

// 60s 兜底（claude -p 一条简单 prompt 通常几秒）
setTimeout(() => {
  console.error("[send-prompt] TIMEOUT 60s, killing...");
  proc.kill();
  process.exit(124);
}, 60_000);
