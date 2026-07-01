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

export interface SpawnOptions {
  runId: string;
  cwd: string;
  command?: string;
  args?: string[];
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  term?: string;
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
  const { runId, cwd, command = 'claude', args = [], env, timeoutMs, term = 'xterm-color', onExit } = options;

  const rawLogPath = ensureLogDir(runId);
  const rawLogFd = fs.openSync(rawLogPath, 'a');
  const ringBuffer = new RingBuffer(8192);

  const proc = pty.spawn(command, args, {
    cwd,
    name: term,
    cols: 80,
    rows: 24,
    env: { ...process.env, ...env },
    useConpty: false,
  });

  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const doKill = () => {
    if (closed) return;
    closed = true;
    timer?.refresh();
    try { proc.kill('SIGTERM'); } catch { /* already dead */ }
    // Close fd immediately (don't wait for SIGKILL timeout)
    try { fs.closeSync(rawLogFd); } catch {}
    // SIGKILL after delay in case SIGTERM didn't work
    setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch {}
    }, 500);
  };

  timer = timeoutMs ? setTimeout(doKill, timeoutMs) : undefined;

  // Fan-out stdout
  proc.onData((chunk: string | Uint8Array) => {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

    // 1. Ring buffer
    ringBuffer.push(buf);

    // 2. Raw log
    fs.writeSync(rawLogFd, buf);

    // 3. WebSocket clients
    const clients = wsRegistry.get(runId);
    for (const ws of clients) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((ws as any).readyState === 1) { // WebSocket.OPEN = 1
        try { ws.send(buf.toString('utf-8')); } catch { /* skip dead WS */ }
      }
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
