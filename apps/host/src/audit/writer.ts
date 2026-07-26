// apps/host/src/audit/writer.ts
/**
 * Audit trail writer — aggregates run data into a JSON file.
 * Atomic writes: tmp + rename + fsync.
 * Fire-and-forget: write failures don't block Run execution.
 */
import fs from 'fs';
import path from 'path';

import { logger } from '../logger';
import { getDataDir } from '../db/connection';
import type { AuditTrail, Blueprint, Run } from '../db/types';
import { redact, truncateBytesUtf8 } from './redact';

const AUDIT_DIR = path.join(getDataDir(), 'audits');

/** Ensure audit directory exists */
function ensureAuditDir() {
  if (!fs.existsSync(AUDIT_DIR)) {
    fs.mkdirSync(AUDIT_DIR, { recursive: true });
  }
}

/** Get the audit trail file path for a run */
export function getAuditTrailPath(runId: string): string {
  return path.join(AUDIT_DIR, `${runId}.json`);
}

/**
 * Write audit trail for a completed run.
 * Aggregates run data, blueprint snapshot, and execution history.
 * Uses atomic write (tmp + rename) to prevent corruption.
 */
export async function writeAuditTrail(
  runId: string,
  blueprintId: string,
  blueprintSnapshot: Blueprint,
  runData: Partial<Run>,
  rounds: any[] = [],
): Promise<void> {
  // Fire-and-forget: catch and log, don't throw
  try {
    ensureAuditDir();

    const trail: AuditTrail = {
      schemaVersion: '2.0',
      runId,
      blueprintId,
      blueprintSnapshot,
      goalSnapshot: runData.goal ?? { objective: '', constraints: [], successCondition: '', budget: { maxRounds: 0, maxTokensUSD: 0, maxWallTimeMs: 0 } },
      execution: {
        startedAt: runData.startedAt?.toISOString() ?? new Date().toISOString(),
        endedAt: runData.endedAt?.toISOString() ?? new Date().toISOString(),
        durationMs: runData.endedAt && runData.startedAt
          ? runData.endedAt.getTime() - runData.startedAt.getTime()
          : 0,
        claudeSessionId: runData.claudeSessionId ?? '',
        totalRounds: rounds.length,
        totalTasks: rounds.reduce((sum: number, r: any) => sum + (r.taskExecutions?.length ?? 0), 0),
        totalToolCalls: rounds.reduce((sum: number, r: any) =>
          sum + (r.taskExecutions?.reduce((s: number, t: any) => s + (t.toolCalls?.length ?? 0), 0) ?? 0), 0),
      },
      rounds,
      finalState: {
        status: runData.status === 'success' ? 'success' : runData.status === 'stopped' ? 'stopped' : 'failed',
        goalAchieved: runData.status === 'success',
        budgetUsage: runData.budgetUsage ?? { tokensUsedUsd: 0, roundsUsed: 0, wallTimeMs: 0 },
        errorSnippet: runData.errorSnippet
          ? truncateBytesUtf8(redact(runData.errorSnippet), 8_192)
          : undefined,
      },
    };

    const filePath = getAuditTrailPath(runId);
    const tmpPath = filePath + '.tmp';

    // Atomic write
    const json = JSON.stringify(trail, null, 2);
    fs.writeFileSync(tmpPath, json, 'utf-8');

    const fd = fs.openSync(tmpPath, 'r');
    fs.fsyncSync(fd);
    fs.closeSync(fd);

    fs.renameSync(tmpPath, filePath);

    logger.info({ runId, filePath }, 'audit_trail_written');
  } catch (err: unknown) {
    // Fire-and-forget: log but don't block.
    logger.error({ runId, err }, 'audit_trail_write_failed');
  }
}
