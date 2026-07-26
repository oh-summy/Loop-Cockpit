// apps/host/src/pty/harness.ts
/**
 * PTY harness — spawns claude code in a virtual TTY.
 * Three-way fan-out: WebSocket + raw.log file + ring buffer.
 */
import pty from 'node-pty';
import fs from 'fs';
import path from 'path';
import { RingBuffer } from './ring-buffer';
import { wsRegistry } from './ws-registry';

/**
 * 校验 agent 二进制是否安全可 exec。
 * 与 util/shell::isSafeCommand（面向用户提供的成功标准命令）不同，这里只关心"要执行的程序"：
 *  - 必须是单 token（无空白），防止空格注入
 *  - 不能含 shell 元字符
 *  - 只能是 basename 或绝对路径（防相对路径遍历）
 *
 * 注意：args 数组原样传给 pty.spawn → posix_spawnp → execvp，全程不经 shell，
 * 所以 args 内容（如 claude 的 objective）不会触发 shell 注入，无需在此校验。
 */
function assertSafeBinary(binary: string): void {
  if (!binary || typeof binary !== 'string') throw new Error('empty command');
  const trimmed = binary.trim();
  if (!trimmed) throw new Error('empty command');
  if (/\s/.test(trimmed)) throw new Error(`command must be a single token: ${binary}`);
  if (/[;|&`$(){}!<>]/.test(trimmed)) throw new Error(`command contains shell metacharacters: ${binary}`);
  if (!path.isAbsolute(trimmed) && trimmed.includes('/')) {
    throw new Error(`relative paths not allowed: ${binary}`);
  }
}

export interface SpawnOptions {
  runId: string;
  cwd: string;
  command?: string;
  args?: string[];
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  term?: string;
  /** 是否 detach 子进程到独立进程组（允许 kill pgid）。需要 node-pty 平台支持。 */
  detach?: boolean;
  /** Called when the spawned process exits (exitCode from node-pty). */
  onExit?: (exitCode: number, signal?: number) => void;
}

export interface PtyHandle {
  proc: pty.IPty;
  pid: number;
  rawLogPath: string;
  rawLogFd: number;
  ringBuffer: RingBuffer;
  kill(): void;
  write(data: string): void;
}

import { getDataDir } from '../db/connection';

const LOG_DIR = path.join(getDataDir(), 'runs');

function ensureLogDir(runId: string): string {
  const dir = path.join(LOG_DIR, runId);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'raw.log');
}

/**
 * Spawn a PTY process. Three-way fan-out on stdout:
 *   1. RingBuffer (errorSnippet candidate, max 8KB)
 *   2. Raw log file (append + fsync)
 *   3. WebSocket clients (wsRegistry)
 */
export function spawn(options: SpawnOptions): PtyHandle {
  const { runId, cwd, command = 'claude', args = [], env, timeoutMs, term = 'xterm-color', detach = false, onExit } = options;

  // 安全校验：只校验要 exec 的二进制路径（单 token、无 shell 元字符、basename 或绝对路径）。
  // args 原样传给 pty.spawn，不经 shell，不存在注入面。
  assertSafeBinary(command);

  // command 可能是 "cmd arg0" 形式（如 "node -e"），拆出二进制；args 保持原样拼接。
  const cmdParts = command.trim().split(/\s+/);
  const safeCmd = cmdParts[0];
  const safeArgs = [...cmdParts.slice(1), ...args];

  const rawLogPath = ensureLogDir(runId);
  const rawLogFd = fs.openSync(rawLogPath, 'a');
  const ringBuffer = new RingBuffer(8192);

  const proc = pty.spawn(safeCmd, safeArgs, {
    cwd,
    name: term,
    cols: 80,
    rows: 24,
    env: { ...process.env, ...env },
    useConpty: false,
  });

  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  // SIGTERM -> 等 grace -> SIGKILL。detach 时允许 kill(-pid) 杀整组
  const SIGKILL_GRACE_MS = Number(process.env.SIGKILL_GRACE_MS ?? '4000');
  let sigkillTimer: ReturnType<typeof setTimeout> | undefined;

  const doKill = () => {
    if (closed) return;
    closed = true;
    if (timer) { clearTimeout(timer); timer = undefined; }
    try { proc.kill('SIGTERM'); } catch { /* already dead */ }
    sigkillTimer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch {}
    }, SIGKILL_GRACE_MS);
    // 关掉 raw.log fd，避免运行期 fd 泄漏
    try { fs.closeSync(rawLogFd); } catch {}
  };

  timer = timeoutMs ? setTimeout(doKill, timeoutMs) : undefined;

  // Fan-out stdout
  proc.onData((chunk: string | Uint8Array) => {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

    // 1. Ring buffer
    ringBuffer.push(buf);

    // 2. Raw log（失败不抛——因为进程已经退出也无所谓）
    try { fs.writeSync(rawLogFd, buf); } catch { /* ignore */ }

    // 3. WebSocket clients —— 异步 send 不阻塞 onData
    const clients = wsRegistry.get(runId);
    if (clients.size === 0) return;
    const payload = buf.toString('utf-8');
    for (const ws of clients) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sock = ws as any;
      if (sock.readyState !== 1) continue; // WebSocket.OPEN = 1
      try {
        // 简单背压：如果 ws 缓冲区 > 1MB，跳过这次 fan-out
        if (sock.bufferedAmount > 1_000_000) continue;
        sock.send(payload);
      } catch { /* skip dead WS */ }
    }
  });

  proc.onExit(({ exitCode, signal }) => {
    onExit?.(exitCode ?? 0, signal);
    doKill();
  });

  return {
    proc,
    pid: proc.pid,
    rawLogPath,
    rawLogFd,
    ringBuffer,
    kill: doKill,
    write: (data: string) => {
      if (!closed) {
        try { proc.write(data); } catch { /* process may be exiting */ }
      }
    },
  };
}
