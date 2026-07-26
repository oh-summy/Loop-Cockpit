// apps/host/src/runner/lifecycle.ts
import { eq } from 'drizzle-orm';
import fs from 'fs';
import { getDb } from '../db/connection';
import { runs, blueprints } from '../db/schema';
import { logger } from '../logger';
import { recordAuditEvent } from '../audit/event-writer';
import { writeAuditTrail } from '../audit/writer';
import { evaluateShell } from '../verification/shell';
import * as ptyHarness from '../pty/harness';
import { canTransition, isTerminal, IllegalStateError } from './state-machine';
import type {
  Blueprint,
  Run,
  RunStatus,
  PhaseExecution,
  BudgetUsage,
  RetryPolicy,
} from '../db/types';

/** In-memory PTY handles for active (non-terminal) runs. */
const activeHandles = new Map<string, ptyHarness.PtyHandle>();

/** True when claude CLI should be faked (avoids real API spend in dev/CI). */
const MOCK_CLAUDE = process.env.MOCK_CLAUDE === '1';

/**
 * 进程退出策略：先 SIGTERM，等 graceMs 再 SIGKILL。
 * node-pty 的子进程不是 PG leader（posix_spawnp 没有 setsid），
 * 所以不能指望 process.kill(-pid)。
 * 这里的策略：PTY 退出回调里直接 kill(pid)，不再尝试 kill(-pid)。
 */
const SIGKILL_GRACE_MS = Number(process.env.SIGKILL_GRACE_MS ?? '4000');

type BlueprintRow = typeof blueprints.$inferSelect;
type RunRow = typeof runs.$inferSelect;

/** Format current timezone offset as ISO8601 ±HH:MM (e.g. +08:00). */
function getTimezoneOffsetIso(): string {
  const offsetMinutes = -new Date().getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

/** Build the blueprint snapshot stored on a run row. */
function buildBlueprintSnapshot(bp: BlueprintRow): Blueprint {
  return {
    id: bp.id,
    goal: bp.goal as Blueprint['goal'],
    agent: bp.agent,
    model: bp.model ?? undefined,
    projectPath: bp.projectPath,
    triggers: bp.triggers as Blueprint['triggers'],
    defaultToolLayer: bp.defaultToolLayer as Blueprint['defaultToolLayer'],
    sdafStages: bp.sdafStages as Blueprint['sdafStages'],
    phases: bp.phases as Blueprint['phases'],
    startPhaseId: bp.startPhaseId ?? undefined,
    plannerConfig: bp.plannerConfig,
    contextBuilderConfig: bp.contextBuilderConfig,
    verificationConfig: bp.verificationConfig,
    memoryConfig: bp.memoryConfig,
    reflectionConfig: bp.reflectionConfig,
    humanGateConfig: bp.humanGateConfig,
    notification: bp.notification as Blueprint['notification'],
    deny: bp.deny as Blueprint['deny'],
    retryPolicy: bp.retryPolicy as Blueprint['retryPolicy'],
    type: Array.isArray(bp.type) ? bp.type : [],
    status: bp.status,
    createdAt: bp.createdAt ? new Date(bp.createdAt) : new Date(),
    updatedAt: bp.updatedAt ? new Date(bp.updatedAt) : new Date(),
  };
}

/**
 * Start a new run from a blueprint.
 * Creates the run record (status: initializing) and returns it.
 */
export async function startRun(
  blueprintId: string,
  opts?: { parentRunId?: string; reRunOf?: number },
): Promise<Run> {
  const db = getDb();

  const bpRows = await db
    .select()
    .from(blueprints)
    .where(eq(blueprints.id, blueprintId))
    .limit(1);
  const bp = bpRows[0];
  if (!bp) throw new Error(`Blueprint ${blueprintId} not found`);

  const blueprintSnapshot = buildBlueprintSnapshot(bp);

  const iteration = opts?.reRunOf ?? 0;
  const now = new Date().toISOString();

  const budgetUsage: BudgetUsage = {
    tokensUsedUsd: 0,
    roundsUsed: 0,
    wallTimeMs: 0,
  };

  // Insert and let schema $defaultFn(runId) generate the ID.
  const inserted = await db
    .insert(runs)
    .values({
      blueprintId,
      blueprintSnapshot,
      status: 'initializing',
      iteration,
      parentRunId: opts?.parentRunId ?? null,
      startedAt: now,
      phaseHistory: [] as PhaseExecution[],
      currentRound: 0,
      goal: blueprintSnapshot.goal,
      budgetUsage,
      plannerHistory: [],
      verificationHistory: [],
      reflectionHistory: [],
      humanGateHistory: [],
      auditStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (inserted.length === 0) throw new Error('run_insert_failed');
  const row = inserted[0];

  logger.info({ runId: row.id, blueprintId, occurredAt: now, timezoneOffset: getTimezoneOffsetIso() }, 'run_started');

  recordAuditEvent({
    runId: row.id,
    blueprintId,
    eventType: 'run_started',
    layer: 'cross',
    agentName: blueprintSnapshot.agent,
    occurredAt: now,
  });

  // Advance to running synchronously (non-blocking via immediate).
  setImmediate(() => {
    advanceToRunning(row.id).catch((err: unknown) => {
      logger.warn({ runId: row.id, err }, 'advance_to_running_failed');
      updateRunStatus(row.id, 'failed').catch((e: unknown) => {
        logger.error({ runId: row.id, err: e }, 'updateRunStatus_failed');
      });
    });
  });

  return toRun(row);
}

/** Internal: transition initializing → running, then spawn the agent PTY. */
async function advanceToRunning(id: string): Promise<void> {
  const db = getDb();
  const rows = await db.select().from(runs).where(eq(runs.id, id)).limit(1);
  const run = rows[0];
  if (!run) return;

  if (!canTransition(run.status, 'running')) {
    logger.warn({ runId: id, currentStatus: run.status }, 'cannot_advance_to_running');
    return;
  }
  await updateRunStatus(id, 'running');

  // Spawn the agent (claude CLI, or a mock when MOCK_CLAUDE=1).
  const snapshot = run.blueprintSnapshot as Blueprint | null;
  const cwd = snapshot?.projectPath ?? process.cwd();
  const successCondition = snapshot?.goal?.successCondition ?? 'true';

  let command: string;
  let args: string[];
  if (MOCK_CLAUDE) {
    // Fake agent: stream a few lines over ~2s so WS clients can attach and
    // actually see output. Verifies the full fan-out chain without spending
    // real claude API budget.
    // node -e '...' 比 bash -c 安全得多（shell:false 下没有 shell 介入）。
    // 比基于 stdin 的 sh -s 更可控——避免 cross-shell 兼容问题。
    // Mock agent：用 node 跑一段 async 脚本，模拟 claude 在 PTY 里流式输出。
    // 注意：脚本通过 stdin 传给 node -e（见下方 spawn 调用），不走 shell 分词。
    command = 'node';
    const mockScript = `
      for (let i = 1; i <= 10; i++) {
        console.log('[mock-claude] step ' + i + '/10');
        await new Promise(r => setTimeout(r, 800));
      }
    `;
    args = ['-e', mockScript];
  } else {
    command = 'claude';
    args = ['-p', snapshot?.goal?.objective ?? '', '--bare', '--output-format', 'stream-json', '--verbose'];
  }

  // Guard: projectPath must exist before spawning (node-pty's posix_spawnp
  // crashes hard on a missing cwd, which would leave the run stuck).
  if (!fs.existsSync(cwd)) {
    logger.warn({ runId: id, cwd }, 'project_path_not_found');
    await db.update(runs)
      .set({ errorSnippet: `project path not found: ${cwd}` })
      .where(eq(runs.id, id));
    await updateRunStatus(id, 'failed');
    return;
  }

  const timeoutMs = (snapshot?.retryPolicy?.timeoutMinutes ?? 30) * 60 * 1000;

  const handle = ptyHarness.spawn({
    runId: id,
    cwd,
    command,
    args,
    timeoutMs,
    onExit: async (exitCode) => {
      activeHandles.delete(id);
      try {
        const result = evaluateShell(successCondition, cwd, 30_000);
        await evaluateRun(id, { ...result, stdoutTail: result.stdoutTail, stderrTail: result.stderrTail });
      } catch (err: unknown) {
        logger.warn({ runId: id, exitCode, err }, 'evaluate_run_failed');
        updateRunStatus(id, 'failed').catch(() => {});
      }
    },
  });

  activeHandles.set(id, handle);

  // Persist pid + rawLogPath so reaper/stop can act on the real process.
  await db.update(runs)
    .set({ pid: handle.pid, rawLogPath: handle.rawLogPath })
    .where(eq(runs.id, id));

  recordAuditEvent({
    runId: id,
    blueprintId: run.blueprintId,
    eventType: 'agent_spawned',
    layer: 'L5',
    agentName: snapshot?.agent ?? 'claude-code',
    claudeSessionId: run.claudeSessionId ?? undefined,
  });
}

/**
 * Update run status with validation.
 * Called by lifecycle, reaper, stop handler.
 */
export async function updateRunStatus(
  id: string,
  newStatus: RunStatus,
): Promise<Run> {
  const db = getDb();

  const rows = await db.select().from(runs).where(eq(runs.id, id)).limit(1);
  const run = rows[0];
  if (!run) throw new Error(`Run ${id} not found`);

  if (!canTransition(run.status, newStatus)) {
    throw new IllegalStateError(
      `Cannot transition ${run.status} → ${newStatus} for run ${id}`,
    );
  }

  const now = new Date().toISOString();
  const updates: Partial<RunRow> = {
    status: newStatus,
    updatedAt: now,
  };

  if (newStatus === 'running' && !run.startedAt) {
    updates.startedAt = now;
  }
  if (isTerminal(newStatus)) {
    updates.endedAt = now;
  }

  await db.update(runs).set(updates).where(eq(runs.id, id));

  recordAuditEvent({
    runId: id,
    blueprintId: run.blueprintId,
    eventType: 'run_status_change',
    layer: 'cross',
    agentName: (run.blueprintSnapshot as Blueprint | null)?.agent ?? 'unknown',
    statusFrom: run.status,
    statusTo: newStatus,
  });

  const updatedRows = await db.select().from(runs).where(eq(runs.id, id)).limit(1);
  const updated = toRun(updatedRows[0]);

  // 终态落 audit-trail.json（fire-and-forget，失败不阻塞）
  if (isTerminal(newStatus)) {
    writeAuditTrail(
      id,
      run.blueprintId,
      updated.blueprintSnapshot,
      updated,
      (updated.phaseHistory as unknown[]) ?? [],
    ).catch((err: unknown) => {
      logger.warn({ runId: id, err }, 'audit_trail_write_failed');
    });
  }

  return updated;
}

/**
 * Evaluate a run: check done criteria → success | retrying | failed
 */
export async function evaluateRun(
  id: string,
  doneResult: { passed: boolean; exitCode: number; stdoutTail: string; stderrTail: string; durationMs: number },
): Promise<Run> {
  const db = getDb();
  const rows = await db.select().from(runs).where(eq(runs.id, id)).limit(1);
  const run = rows[0];
  if (!run) throw new Error(`Run ${id} not found`);

  // Transition to evaluating
  await updateRunStatus(id, 'evaluating');

  const snapshot = run.blueprintSnapshot as Blueprint | null;
  const agentName = snapshot?.agent ?? 'unknown';

  recordAuditEvent({
    runId: id,
    blueprintId: run.blueprintId,
    eventType: 'verification',
    layer: 'L7',
    agentName,
    status: doneResult.passed ? 'passed' : 'failed',
    exitCode: doneResult.exitCode,
    toolResult: doneResult.stdoutTail.slice(0, 32 * 1024),
  });

  let newStatus: RunStatus;
  if (doneResult.passed) {
    newStatus = 'success';
  } else {
    const retryPolicy: RetryPolicy = snapshot?.retryPolicy ?? { maxRetries: 0, timeoutMinutes: 0, onFail: 'stop' };
    if (retryPolicy.maxRetries > 0 && run.iteration < retryPolicy.maxRetries) {
      newStatus = 'retrying';
    } else {
      newStatus = 'failed';
    }
  }

  const updated = await updateRunStatus(id, newStatus);

  recordAuditEvent({
    runId: id,
    blueprintId: run.blueprintId,
    eventType: 'run_completed',
    layer: 'cross',
    agentName,
    status: newStatus,
    exitCode: doneResult.exitCode,
  });

  // Persist the done criteria result alongside the new status.
  await db.update(runs)
    .set({ doneCriteriaResult: doneResult })
    .where(eq(runs.id, id));

  return updated;
}

/**
 * Stop a running run: kill PTY handle (or fallback kill by pid), transition to stopped.
 *
 * node-pty 子进程通常不是 PG leader，禁掉 kill(-pid)——否则可能杀到同 pgid 的无关进程。
 * 策略：	handle 托管优先；否则发 SIGTERM，grace 后再补 SIGKILL。
 */
export async function stopRun(id: string, pid?: number): Promise<void> {
  const db = getDb();

  // Prefer the in-memory handle (clean SIGTERM→SIGKILL + raw.log close).
  const handle = activeHandles.get(id);
  if (handle) {
    handle.kill();
    activeHandles.delete(id);
    pid = undefined; // 已托管，不要再 kill pid
  }

  if (pid && Number.isInteger(pid) && pid > 0) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // already gone
    }
    // grace 后再 SIGKILL
    const grace = SIGKILL_GRACE_MS;
    setTimeout(() => {
      try { process.kill(pid!, 'SIGKILL'); } catch { /* already gone */ }
    }, grace);
  }

  const updated = await updateRunStatus(id, 'stopped');

  recordAuditEvent({
    runId: id,
    blueprintId: updated.blueprintId,
    eventType: 'run_stopped',
    layer: 'cross',
    agentName: updated.blueprintSnapshot?.agent ?? 'unknown',
    exitCode: updated.exitCode,
  });

  await db.update(runs).set({ pid: null }).where(eq(runs.id, id));
}

/** Convert RunRow → Run (typed). Drizzle returns JSON columns already parsed. */
function toRun(row: RunRow): Run {
  return {
    id: row.id,
    blueprintId: row.blueprintId,
    blueprintSnapshot: row.blueprintSnapshot as Blueprint,
    status: row.status,
    iteration: row.iteration,
    parentRunId: row.parentRunId ?? undefined,
    startedAt: row.startedAt ? new Date(row.startedAt) : undefined,
    endedAt: row.endedAt ? new Date(row.endedAt) : undefined,
    exitCode: row.exitCode ?? undefined,
    errorSnippet: row.errorSnippet ?? undefined,
    rawLogPath: row.rawLogPath ?? undefined,
    tokenCostUsd: row.tokenCostUsd ?? undefined,
    doneCriteriaResult: (row.doneCriteriaResult as Run['doneCriteriaResult']) ?? undefined,
    pid: row.pid ?? undefined,
    claudeSessionId: row.claudeSessionId ?? undefined,
    currentPhaseId: row.currentPhaseId ?? undefined,
    phaseHistory: (row.phaseHistory as PhaseExecution[]) ?? [],
    currentRound: row.currentRound,
    goal: row.goal as Run['goal'],
    stateYamlPath: row.stateYamlPath ?? undefined,
    budgetUsage: row.budgetUsage as BudgetUsage,
    plannerHistory: (row.plannerHistory as unknown[]) ?? [],
    verificationHistory: (row.verificationHistory as unknown[]) ?? [],
    reflectionHistory: (row.reflectionHistory as unknown[]) ?? [],
    humanGateHistory: (row.humanGateHistory as unknown[]) ?? [],
    auditStatus: row.auditStatus,
    createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
  };
}
