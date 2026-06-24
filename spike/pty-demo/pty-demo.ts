/**
 * Loop Cockpit — PTY Spike (v0.1)
 *
 * 目标：验证 node-pty 能稳定拉起 `claude` CLI 并把彩色输出原样打印到本进程终端。
 *
 * 跑法：
 *   cd spike/pty-demo
 *   npm install
 *   npm run demo                 # 跑这条
 *
 * 期望：
 *   - 在你的终端看到 Claude Code 的彩色欢迎语 + 你的 prompt 的回复
 *   - exit code 0
 *   - 程序自然退出（没有 hang）
 */

import * as pty from 'node-pty';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 强制 TTY 模式，让 Claude Code 输出颜色
const env = {
  ...process.env,
  FORCE_COLOR: '1',
  TERM: 'xterm-256color',
};

// cols/rows 给一个保守值，避免不同终端尺寸的差异
const cols = 120;
const rows = 40;

console.log('--- PTY spike starting ---');
console.log('Spawning: claude --print "Say hello and introduce yourself in one sentence."');
console.log();

const start = Date.now();

const proc = pty.spawn(
  'claude',
  ['--print', 'Say hello and introduce yourself in one sentence.'],
  {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: __dirname,
    env,
  }
);

let stdoutBytes = 0;
let stderrBytes = 0;
let allOutput = '';

proc.onData((data: string) => {
  // 原样打印——这正是我们要验证的能力：保留 ANSI 转义序列
  process.stdout.write(data);
  stdoutBytes += data.length;
  allOutput += data;
});

proc.onExit(({ exitCode, signal }) => {
  const elapsed = Date.now() - start;
  console.log();
  console.log('--- PTY spike finished ---');
  console.log(`Exit code: ${exitCode}`);
  console.log(`Signal:    ${signal ?? '(none)'}`);
  console.log(`Elapsed:   ${elapsed} ms`);
  console.log(`Bytes out: ${stdoutBytes} (stderr merged into stdout by PTY)`);
  console.log(`Has ANSI:  ${/\x1b\[/.test(allOutput) ? 'YES ✓' : 'NO ✗'}`);

  // 简单通过标准：exit 0 且输出非空
  const passed = exitCode === 0 && stdoutBytes > 0;
  console.log(`Result:    ${passed ? 'PASS ✓' : 'FAIL ✗'}`);
  process.exit(passed ? 0 : 1);
});

// 兜底：超时 30s 自动 kill
const killer = setTimeout(() => {
  console.error();
  console.error('!! TIMEOUT — killing claude process after 30s');
  proc.kill();
}, 30_000);

// 用户按 Ctrl+C
process.on('SIGINT', () => {
  console.error();
  console.error('!! SIGINT — killing claude process');
  proc.kill();
  clearTimeout(killer);
});