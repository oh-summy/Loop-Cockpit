// apps/host/src/memory/state-yaml.ts
/**
 * state.yaml management — atomic read/write for Loop business state.
 * Used by L8 Memory layer to persist per-run state between rounds.
 */
import fs from 'fs';
import path from 'path';
import { getDataDir } from '../db/connection';

const STATE_DIR = path.join(getDataDir(), 'states');

export interface LoopState {
  currentRound: number;
  currentTaskId?: string;
  lastExitCode?: number;
  accumulatedContext?: string;
  memoryRefs?: string[];
  reflectionCount?: number;
  gatePending?: boolean;
  [key: string]: any;
}

/** Get the state.yaml path for a run */
export function getStateYamlPath(runId: string): string {
  return path.join(STATE_DIR, `${runId}.yaml`);
}

/** Read state.yaml — returns empty state if not found */
export function readStateYaml(runId: string): LoopState {
  const filePath = getStateYamlPath(runId);
  if (!fs.existsSync(filePath)) {
    return { currentRound: 0 };
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Simple YAML-like parsing (Iter 5+: use js-yaml library)
    const state = JSON.parse(content) as LoopState;
    return state;
  } catch {
    return { currentRound: 0 };
  }
}

/**
 * Write state.yaml atomically.
 * tmp + fsync + rename pattern to prevent corruption.
 */
export function writeStateYaml(runId: string, state: LoopState): void {
  ensureStateDir();
  const filePath = getStateYamlPath(runId);
  const tmpPath = filePath + '.tmp';

  const json = JSON.stringify(state, null, 2);
  fs.writeFileSync(tmpPath, json, 'utf-8');

  const fd = fs.openSync(tmpPath, 'r');
  fs.fsyncSync(fd);
  fs.closeSync(fd);

  fs.renameSync(tmpPath, filePath);
}

/** Ensure state directory exists */
function ensureStateDir() {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}
