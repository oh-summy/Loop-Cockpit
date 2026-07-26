// apps/host/src/runner/reaper.ts
/**
 * Boot reaper: on server start, check all runs that are in a running state.
 * If the associated process is dead, mark as failed (reason: host-restart).
 * If the process is alive, leave it alone (Iter 3+ will attempt resume).
 *
 * 防御 PID reuse：
 *  - 用 /proc/<pid>/stat (Linux) 或 sysctl (macOS) 获取进程启动时间戳
 *  - 对比当前 boot id（/proc/stat btime，或 sysctl kern.boottime）
 *  - 两者一致才认为是"当前 boot 内启动的活着进程"
 *  - 如果无法获取 boot 时间，退化为 kill(pid, 0)（rare）
 */
import { inArray } from 'drizzle-orm';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import { getDb } from '../db/connection';
import { runs } from '../db/schema';
import { logger } from '../logger';
import { updateRunStatus } from './lifecycle';
import type { RunStatus } from '../db/types';

const RUNNING_STATUSES: RunStatus[] = ['running', 'initializing', 'evaluating', 'retrying'];

/** 当前 OS boot 的 Unix 秒时间戳（heuristically, 可缓存） */
let _bootTimeSec: number | null = null;

function readLinuxBootTimeSec(): number | null {
  try {
    const stat = fs.readFileSync('/proc/stat', 'utf-8');
    const m = stat.match(/^btime (\d+)/m);
    if (m) return parseInt(m[1], 10);
  } catch {
    // ignore - 可能在 macOS 等没 /proc 的环境
  }
  return null;
}

function readLinuxPidStartTimeSec(pid: number): number | null {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf-8');
    // 进程名可能包含空格和括号：用最后一个 ')' 之后的部分解析
    const trailing = stat.slice(stat.lastIndexOf(')') + 2).split(/\s+/);
    // man 5 proc: field 22 (index 19 from field 1 of the trailing split) is starttime (in jiffies since boot)
    const jiffiesStr = trailing[19];
    if (!jiffiesStr) return null;
    const jiffies = BigInt(jiffiesStr);
    // os 模块没有标准 clocks_per_sec，退化为 Linux 常见的 100Hz
    const clkTck = BigInt(100);
    return Number(jiffies / clkTck);
  } catch {
    return null;
  }
}

/** macOS：通过 sysctl kern.boottime 获取（返回一个 struct timeval，需要解析） */
function readMacosBootTimeSec(): number | null {
  try {
    const out = execSync('sysctl -n kern.boottime').toString();
    // out 形如 "{ sec = 1700000000, usec = 0 }"
    const m = out.match(/sec\s*=\s*(\d+)/);
    if (m) return parseInt(m[1], 10);
  } catch {
    // ignore
  }
  return null;
}

function getBootTimeSec(): number | null {
  if (_bootTimeSec !== null) return _bootTimeSec;
  _bootTimeSec = readLinuxBootTimeSec() ?? readMacosBootTimeSec();
  return _bootTimeSec;
}

/** 通过 /proc/<pid>/starttime vs /proc/stat btime 验证"pid 确实在当前 boot 内启动" */
function isPidInCurrentBoot(pid: number): boolean {
  const boot = getBootTimeSec();
  if (boot === null) return true; // 无法判断 → 退化为 kill 0
  const startTime = readLinuxPidStartTimeSec(pid);
  if (startTime === null) return true; // 无法判断 → 退化为 kill 0
  // 启 动秒 = boot + start_time（如果跟 boot 差距 > 5s 就说明不是本 boot 进程）
  // 但更稳的是：对比 pid starttime 加 boottime 跟当前时间。
  const uptimeHz = Math.floor(os.uptime());
  const approxStart = boot + startTime;
  const now = Math.floor(Date.now() / 1000);
  // 跟 now - uptime 对比：应该 > (now - uptime - tolerance)
  return approxStart >= (now - uptimeHz - 10) && approxStart <= now;
}

/** Check if a PID is alive (signal 0 = test only). */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Scan for orphaned/stale runs and clean them up.
 * Should be called once at server boot, after initDatabase().
 */
export async function bootReaper(): Promise<{ alive: number; reaped: number; unsure: number }> {
  const db = getDb();

  const rows = await db
    .select()
    .from(runs)
    .where(inArray(runs.status, RUNNING_STATUSES));

  let alive = 0;
  let reaped = 0;
  let unsure = 0;

  for (const run of rows) {
    if (!run.pid) {
      await safeMarkFailed(run.id);
      reaped++;
      continue;
    }

    if (!isProcessAlive(run.pid)) {
      await safeMarkFailed(run.id);
      reaped++;
      continue;
    }

    // 进程活着，但 PID 可能是 reuse 的：对比 boot id
    if (run.pid && !isPidInCurrentBoot(run.pid)) {
      // PID reuse 或者跨 boot 误识别 → 保守标 reaped
      logger.warn({ runId: run.id, pid: run.pid }, 'reaper_pid_not_in_current_boot');
      await safeMarkFailed(run.id);
      reaped++;
      continue;
    }

    // 可能是合法的 live 进程
    alive++;
  }

  if (rows.length > 0) {
    logger.info({ alive, reaped, unsure, total: rows.length }, 'boot_reaper_done');
  }

  return { alive, reaped, unsure };
}

async function safeMarkFailed(runId: string): Promise<void> {
  try {
    await updateRunStatus(runId, 'failed');
  } catch (err: unknown) {
    logger.warn({ runId, err }, 'reaper_mark_failed_failed');
  }
}
