// apps/host/src/blueprint/service.ts
import { eq, desc, like, sql, and } from 'drizzle-orm';
import { blueprints, runs } from '../db/schema';
import { getDb } from '../db/connection';
import { blueprintCreateSchema, blueprintPatchSchema } from './zod';
import { generateSkillsBundle } from './skill-loader';
import type { Blueprint } from '../db/types';
import { logger } from '../logger';

type BlueprintRow = typeof blueprints.$inferSelect;

/** Convert DB row (camelCase, Drizzle) → Blueprint (camelCase, Date fields) */
function toBlueprint(row: BlueprintRow): Blueprint {
  return {
    id: row.id,
    goal: row.goal as Blueprint['goal'],
    agent: row.agent,
    model: row.model ?? undefined,
    projectPath: row.projectPath,
    triggers: row.triggers as Blueprint['triggers'],
    defaultToolLayer: row.defaultToolLayer as Blueprint['defaultToolLayer'],
    sdafStages: row.sdafStages as Blueprint['sdafStages'],
    phases: row.phases as Blueprint['phases'],
    startPhaseId: row.startPhaseId ?? undefined,
    plannerConfig: row.plannerConfig,
    contextBuilderConfig: row.contextBuilderConfig,
    verificationConfig: row.verificationConfig,
    memoryConfig: row.memoryConfig,
    reflectionConfig: row.reflectionConfig,
    humanGateConfig: row.humanGateConfig,
    notification: row.notification as Blueprint['notification'],
    deny: row.deny as Blueprint['deny'],
    retryPolicy: row.retryPolicy as Blueprint['retryPolicy'],
    type: Array.isArray(row.type) ? row.type : [],
    status: row.status,
    createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
  };
}

/** Create a blueprint — validates, inserts, generates skills-bundle */
export async function createBlueprint(input: unknown): Promise<Blueprint> {
  const parsed = blueprintCreateSchema.parse(input);

  const db = getDb();
  const now = new Date().toISOString();

  // Insert and let schema $defaultFn(bpId) generate the ID.
  const inserted = await db
    .insert(blueprints)
    .values({
      goal: parsed.goal,
      agent: parsed.agent,
      model: parsed.model ?? null,
      projectPath: parsed.projectPath,
      triggers: parsed.triggers,
      defaultToolLayer: parsed.defaultToolLayer,
      sdafStages: parsed.sdafStages,
      phases: parsed.phases,
      startPhaseId: parsed.startPhaseId ?? null,
      plannerConfig: parsed.plannerConfig ?? null,
      contextBuilderConfig: parsed.contextBuilderConfig ?? null,
      verificationConfig: parsed.verificationConfig ?? null,
      memoryConfig: parsed.memoryConfig ?? null,
      reflectionConfig: parsed.reflectionConfig ?? null,
      humanGateConfig: parsed.humanGateConfig ?? null,
      notification: parsed.notification ?? null,
      deny: parsed.deny ?? null,
      retryPolicy: parsed.retryPolicy,
      type: parsed.type,
      status: parsed.status,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (inserted.length === 0) {
    throw new Error('blueprint_insert_failed');
  }
  const row = inserted[0];

  // Generate skills-bundle (uses the now-known id).
  try {
    generateSkillsBundle(row.id, row.projectPath, row.defaultToolLayer as Blueprint['defaultToolLayer']);
  } catch (err: unknown) {
    logger.warn({ blueprintId: row.id, err }, 'skills_bundle_generation_failed');
  }

  return toBlueprint(row);
}

/** List blueprints with pagination and filters */
export async function listBlueprints(opts?: {
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
  search?: string;
}): Promise<{ items: Blueprint[]; total: number }> {
  const db = getDb();
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions = [] as ReturnType<typeof eq>[];
  if (opts?.status && (opts.status === 'active' || opts.status === 'disabled')) {
    conditions.push(eq(blueprints.status, opts.status));
  }
  if (opts?.search) {
    conditions.push(like(blueprints.projectPath, `%${opts.search}%`));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countRows] = await Promise.all([
    db.select().from(blueprints)
      .where(whereClause)
      .orderBy(desc(blueprints.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(blueprints)
      .where(whereClause),
  ]);

  return { items: rows.map(toBlueprint), total: countRows[0]?.count ?? 0 };
}

/** Get a single blueprint by ID */
export async function getBlueprint(id: string): Promise<Blueprint | null> {
  const db = getDb();
  const result = await db.select().from(blueprints).where(eq(blueprints.id, id)).limit(1);
  return result[0] ? toBlueprint(result[0]) : null;
}

/** Partial update — if active runs exist, returns warning */
export async function patchBlueprint(
  id: string,
  input: unknown,
): Promise<{ blueprint: Blueprint; warnings: string[] }> {
  const db = getDb();

  // Check for active runs
  const activeRuns = await db
    .select({ id: runs.id, status: runs.status })
    .from(runs)
    .where(eq(runs.blueprintId, id));
  const runningRuns = activeRuns.filter((r) =>
    (['running', 'initializing', 'evaluating'] as const).includes(r.status as never),
  );
  const warnings: string[] = [];
  if (runningRuns.length > 0) {
    warnings.push(`Blueprint has ${runningRuns.length} active run(s) — changes may affect in-flight execution`);
  }

  const parsed = blueprintPatchSchema.parse(input);
  const now = new Date().toISOString();

  // Drizzle .set() accepts camelCase keys matching schema prop names directly.
  const updates: Record<string, unknown> = { updatedAt: now };
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) {
      updates[key] = value;
    }
  }

  const result = await db.update(blueprints)
    .set(updates)
    .where(eq(blueprints.id, id))
    .returning();

  if (result.length === 0) {
    throw new Error(`Blueprint ${id} not found`);
  }

  return { blueprint: toBlueprint(result[0]), warnings };
}

/** Soft delete — set status=disabled, refuse if active runs */
export async function softDeleteBlueprint(id: string): Promise<void> {
  const db = getDb();

  const activeRuns = await db
    .select({ count: sql<number>`count(*)` })
    .from(runs)
    .where(and(
      eq(runs.blueprintId, id),
      sql`${runs.status} IN ('running','initializing','evaluating','retrying')`,
    ));
  const count = activeRuns[0]?.count ?? 0;
  if (count > 0) {
    throw new Error(`Cannot delete blueprint ${id}: ${count} active run(s) exist`);
  }

  await db.update(blueprints)
    .set({ status: 'disabled', updatedAt: new Date().toISOString() })
    .where(eq(blueprints.id, id));
}
