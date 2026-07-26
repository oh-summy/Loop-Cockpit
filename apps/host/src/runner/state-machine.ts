// apps/host/src/runner/state-machine.ts
import type { RunStatus } from '../db/types';

/** Valid status transitions — ADR-0010 §3.2 */
const VALID_TRANSITIONS: Record<RunStatus, RunStatus[]> = {
  idle:             ['initializing'],
  initializing:     ['running', 'failed', 'stopped'],
  running:          ['evaluating', 'stopped', 'failed'],  // failed: 进程异常死亡/host 崩溃
  evaluating:       ['success', 'retrying', 'failed', 'stopped'],
  success:          [],            // terminal
  retrying:         ['running', 'failed', 'stopped'],
  failed:           [],            // terminal
  stopped:          [],            // terminal
};

/** Check if a transition is valid */
export function canTransition(from: RunStatus, to: RunStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Get all valid next states from a given status */
export function getNextStates(status: RunStatus): RunStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

/** Assert that a transition is valid, throw if not */
export function assertValidTransition(from: RunStatus, to: RunStatus): void {
  if (!canTransition(from, to)) {
    const valid = getNextStates(from);
    throw new IllegalStateError(
      `Cannot transition from "${from}" to "${to}". Valid next states: [${valid.join(', ')}]`,
    );
  }
}

export class IllegalStateError extends Error {
  override name = 'IllegalStateError';
}

/** Terminal states */
export const TERMINAL_STATES: Set<RunStatus> = new Set(['success', 'failed', 'stopped']);

/** Is the run in a terminal state? */
export function isTerminal(status: RunStatus): boolean {
  return TERMINAL_STATES.has(status);
}
