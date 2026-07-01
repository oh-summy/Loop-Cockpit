// apps/host/src/trigger/dispatcher.ts
/**
 * Trigger dispatcher — manages trigger lifecycle.
 * Supports Manual, Once (one-time), Cron triggers.
 */
import cron from 'node-cron';
import { startRun } from '../runner/lifecycle';

export interface TriggerEvent {
  blueprintId: string;
  source: string;    // 'manual' | 'once' | 'cron' | 'webhook' | 'git-push' | ...
  payload?: any;
  firedAt: string;
}

/** Per-blueprint Promise chain: serializes concurrent triggers for the same blueprint. */
const runChains = new Map<string, Promise<{ runId: string; alreadyRunning: boolean }>>();

export async function dispatchTrigger(event: TriggerEvent): Promise<{ runId: string; alreadyRunning: boolean }> {
  const { blueprintId } = event;

  // Chain against previous run for this blueprint
  const prevChain = runChains.get(blueprintId) ?? Promise.resolve({ runId: '', alreadyRunning: false });
  const chain = prevChain.then(async () => {
    // Check if a run is currently active (could happen if prev chain finished but run is still going)
    const run = await startRun(blueprintId);
    return { runId: run.id, alreadyRunning: false };
  });
  runChains.set(blueprintId, chain.catch(() => ({ runId: '', alreadyRunning: false })));

  return chain;
}

/** Clear the run chain for a blueprint (e.g., on blueprint delete). */
export function clearRunChain(blueprintId: string): void {
  runChains.delete(blueprintId);
}

/**
 * Schedule a one-time trigger (once.at)
 */
export function scheduleOnceTrigger(at: string, blueprintId: string): void {
  const fireAt = new Date(at).getTime();
  const now = Date.now();
  const delay = fireAt - now;

  if (delay <= 0) {
    // Already past — fire now
    void dispatchTrigger({ blueprintId, source: 'once', firedAt: new Date().toISOString() });
    return;
  }

  setTimeout(() => {
    void dispatchTrigger({ blueprintId, source: 'once', firedAt: new Date().toISOString() });
  }, delay);
}

/**
 * Schedule a cron trigger using node-cron.
 * `times[]` 字段保留作 Iter 3+ 多时间窗口扩展;当前实现仅使用 expression。
 */
export function scheduleCronTrigger(expression: string, blueprintId: string, _times?: string[]): ReturnType<typeof cron.schedule> {
  return cron.schedule(expression, () => {
    void dispatchTrigger({ blueprintId, source: 'cron', firedAt: new Date().toISOString() });
  });
}
