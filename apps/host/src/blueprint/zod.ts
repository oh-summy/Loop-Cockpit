// apps/host/src/blueprint/zod.ts
import { z } from 'zod';

import path from 'path';
import fs from 'fs';
import { isSafeCommand } from '../util/shell';

// ─── Helpers ─────────────────────────────────────────────────

/** Absolute path: no `..`, no protocol, must start with / or ~, no symlink escape. */
function isValidAbsolutePath(p: string): boolean {
  if (!p || typeof p !== 'string') return false;
  if (p.includes('..')) return false;
  if (!p.startsWith('/') && !p.startsWith('~')) return false;
  // Resolve symlinks and verify the resolved path still starts with the original root
  try {
    const resolved = path.resolve(p.startsWith('~') ? process.env.HOME + p.slice(1) : p);
    if (!fs.existsSync(resolved)) return true; // path doesn't exist yet, accept it
    const real = fs.realpathSync.native(resolved);
    // If resolved path differs from realpath, there's a symlink escape
    if (resolved !== real && !real.startsWith(resolved)) return false;
  } catch {
    return false;
  }
  return true;
}

const pathSchema = z.string().refine(
  (v) => isValidAbsolutePath(v),
  { message: 'Must be an absolute path (starts with / or ~, no ..)' },
);

// ─── TriggerConfig (discriminated union) ─────────────────────
const triggerManual = z.object({ type: z.literal('manual') });
const triggerOnce = z.object({ type: z.literal('once'), at: z.string() });
const triggerCron = z.object({ type: z.literal('cron'), expression: z.string(), times: z.array(z.string()).optional() });
const triggerWebhook = z.object({ type: z.literal('webhook'), secret: z.string().optional() });
const triggerGitPush = z.object({ type: z.literal('git-push'), repo: z.string(), branch: z.string().optional() });
const triggerGitPr = z.object({ type: z.literal('git-pr'), repo: z.string(), events: z.array(z.string()) });
const triggerGitIssue = z.object({ type: z.literal('git-issue'), repo: z.string(), labels: z.array(z.string()).optional(), events: z.array(z.string()) });
const triggerGitComment = z.object({ type: z.literal('git-comment'), repo: z.string(), mention: z.string().optional() });
const triggerCiFinished = z.object({ type: z.literal('ci-finished'), provider: z.string(), events: z.array(z.string()) });
const triggerEmail = z.object({ type: z.literal('email'), filter: z.object({ from: z.string().optional(), subject: z.string().optional() }).optional(), mode: z.enum(['imap', 'webhook']).optional() });
const triggerLarkMsg = z.object({ type: z.literal('lark-msg'), filter: z.object({ chatId: z.string().optional(), mention: z.string().optional() }).optional() });
const triggerSlackMsg = z.object({ type: z.literal('slack-msg'), filter: z.object({ channel: z.string().optional(), mention: z.string().optional() }).optional() });
const triggerDiscordMsg = z.object({ type: z.literal('discord-msg'), filter: z.object({ channel: z.string().optional() }).optional() });
const triggerFileWatch = z.object({ type: z.literal('file-watch'), path: pathSchema, events: z.array(z.string()), pattern: z.string().optional() });
const triggerBoot = z.object({ type: z.literal('boot'), delaySec: z.number().int().positive().optional() });
const triggerUpstreamLoop = z.object({ type: z.literal('upstream-loop'), upstreamLoopId: z.string(), filter: z.object({ status: z.string() }) });

export const triggerSchema = z.discriminatedUnion('type', [
  triggerManual, triggerOnce, triggerCron, triggerWebhook,
  triggerGitPush, triggerGitPr, triggerGitIssue, triggerGitComment,
  triggerCiFinished, triggerEmail, triggerLarkMsg, triggerSlackMsg,
  triggerDiscordMsg, triggerFileWatch, triggerBoot, triggerUpstreamLoop,
]);

// ─── ToolLayerConfig ─────────────────────────────────────────
export const mcpRefSchema = z.object({ name: z.string(), command: z.string() });
export const subagentRefSchema = z.object({ name: z.string(), prompt: z.string(), tools: z.array(z.string()).optional() });

export const toolLayerSchema = z.object({
  skills: z.array(z.string()),
  tools: z.array(z.string()),
  mcpServers: z.array(mcpRefSchema),
  subagents: z.array(subagentRefSchema),
  permissionMode: z.enum(['plan', 'acceptEdits', 'bypassPermissions', 'interactive']).default('acceptEdits'),
  allowedDirs: z.array(pathSchema),
  disallowedTools: z.array(z.string()).optional(),
  systemPrompt: z.string().optional(),
});

// ─── SDAF Stage ──────────────────────────────────────────────
export const sdafStageSchema = z.object({
  phase: z.enum(['sense', 'decide', 'act', 'feedback']),
  prompt: z.string(),
  skills: z.array(z.string()),
  tools: z.array(z.string()),
  permissionMode: z.enum(['plan', 'acceptEdits', 'bypassPermissions', 'interactive']).optional(),
  model: z.string().optional(),
  outputEnabled: z.boolean(),
  outputSpec: z.string(),
});

// ─── Phase ───────────────────────────────────────────────────
const phaseEvaluatorShell = z.object({ type: z.literal('shell'), command: z.string() });
const phaseEvaluatorLlm = z.object({ type: z.literal('llm-judge'), prompt: z.string() });
const phaseEvaluatorRegex = z.object({ type: z.literal('regex'), pattern: z.string() });
const phaseEvaluatorNone = z.object({ type: z.literal('none') });
export const phaseEvaluatorSchema = z.discriminatedUnion('type', [
  phaseEvaluatorShell, phaseEvaluatorLlm, phaseEvaluatorRegex, phaseEvaluatorNone,
]);

const branchIf = z.object({ kind: z.literal('if'), if: z.string(), nextPhase: z.string() });
const branchDefault = z.object({ kind: z.literal('default'), default: z.string() });
export const branchSchema = z.discriminatedUnion('kind', [branchIf, branchDefault]);

export const phaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number().int(),
  systemPromptTemplate: z.string().optional(),
  appendUserMessage: z.string().optional(),
  agent: z.literal('claude-code').optional(),
  model: z.string().optional(),
  effort: z.enum(['low', 'medium', 'high']).optional(),
  skills: z.array(z.string()),
  tools: z.array(z.string()),
  mcpServers: z.array(mcpRefSchema).optional(),
  subagents: z.array(subagentRefSchema).optional(),
  permissionMode: z.enum(['plan', 'acceptEdits', 'bypassPermissions', 'interactive']).optional(),
  allowedDirs: z.array(pathSchema).optional(),
  disallowedTools: z.array(z.string()).optional(),
  evaluator: phaseEvaluatorSchema,
  branches: z.array(branchSchema),
  maxTurns: z.number().int().positive().optional(),
  maxBudgetUsd: z.number().positive().optional(),
});

// ─── Goal ─────────────────────────────────────────────────────
export const goalBudgetSchema = z.object({
  maxRounds: z.number().int().min(1).max(100),
  maxTokensUSD: z.number().min(0).max(100),
  maxWallTimeMs: z.number().int().min(1000).max(86_400_000),
  maxTokensNum: z.number().int().positive().optional(),
  warnAtPercent: z.number().min(0).max(100).optional(),
});

export const goalSchema = z.object({
  objective: z.string().min(1, 'objective is required'),
  constraints: z.array(z.string()),
  successCondition: z.string().min(1, 'successCondition is required'),
  deadline: z.string().optional(),
  budget: goalBudgetSchema,
});

// ─── RetryPolicy ─────────────────────────────────────────────
export const retryPolicySchema = z.object({
  maxRetries: z.number().int().min(0).max(20),
  timeoutMinutes: z.number().int().min(1).max(120),
  onFail: z.enum(['stop', 'notify', 'escalate']),
});

// ─── Deny ────────────────────────────────────────────────────
export const denySchema = z.object({
  editPaths: z.array(z.string()).optional(),
  deletePaths: z.array(z.string()).optional(),
  strictBoundary: z.boolean().default(true),
  bashCommands: z.array(z.string()).optional(),
  customRules: z.array(z.string()).optional(),
  gitPush: z.boolean().default(true),
  gitCommit: z.boolean().default(false),
});

// ─── Notification ────────────────────────────────────────────
/**
 * Secret reference — 所有敏感字段统一走 "env:变量名" 引用。
 * 例：{ "$secret": "env:SMTP_PASS" } 表示运行时从 process.env.SMTP_PASS 读。
 * 禁止直接平铺 password / token / webhookUrl 明文进 DB。
 */
export const secretRefSchema = z.object({
  $secret: z.string().min(1),
});

export const notificationChannelsSchema = z.object({
  desktop: z.boolean().optional(),
  browser: z.boolean().optional(),
  // email: pass 不再入 DB，运行时由 SMTP_PASS 环境变量读入
  email: z.object({
    to: z.string(),
    smtp: z.object({
      host: z.string(),
      port: z.number(),
      user: z.string().optional(),
      // 禁止明文 pass；改为 secretRef 或留空
      pass: secretRefSchema.optional(),
    }),
  }).optional(),
  lark: z.object({ webhookUrl: secretRefSchema }).optional(),
  slack: z.object({ webhookUrl: secretRefSchema }).optional(),
  discord: z.object({ webhookUrl: secretRefSchema }).optional(),
  telegram: z.object({ botToken: secretRefSchema, chatId: z.string() }).optional(),
  skill: z.object({ name: z.string(), prompt: z.string() }).optional(),
  cli: z.object({ command: z.string() }).optional(),
});

export const notificationOnSchema = z.object({
  success: z.boolean(),
  failure: z.boolean(),
  humanGate: z.boolean(),
  budgetWarning: z.boolean(),
  progress: z.boolean(),
  progressEveryN: z.number().int().positive().optional(),
  senseComplete: z.boolean().optional(),
  decideComplete: z.boolean().optional(),
  actComplete: z.boolean().optional(),
  feedbackComplete: z.boolean().optional(),
});

export const notificationTemplateSchema = z.object({
  titleTemplate: z.string().optional(),
  bodyTemplate: z.string().optional(),
  includeAuditLink: z.boolean().optional(),
  includeRunLink: z.boolean().optional(),
});

export const notificationSchema = z.object({
  on: notificationOnSchema,
  channels: notificationChannelsSchema,
  template: notificationTemplateSchema.optional(),
});

// ─── Blueprint Create/Update ─────────────────────────────────
export const blueprintCreateSchema = z.object({
  goal: goalSchema,
  agent: z.enum(['claude-code', 'opencode', 'codex']).default('claude-code'),
  model: z.string().optional(),
  projectPath: pathSchema,
  triggers: z.array(triggerSchema).min(1),
  defaultToolLayer: toolLayerSchema,
  sdafStages: z.array(sdafStageSchema),
  phases: z.array(phaseSchema),
  startPhaseId: z.string().optional(),
  plannerConfig: z.any().optional(),
  contextBuilderConfig: z.any().optional(),
  verificationConfig: z.any().optional(),
  memoryConfig: z.any().optional(),
  reflectionConfig: z.any().optional(),
  humanGateConfig: z.any().optional(),
  notification: notificationSchema.optional(),
  deny: denySchema.optional(),
  retryPolicy: retryPolicySchema,
  type: z.array(z.string()).default([]),
  status: z.enum(['active', 'disabled']).default('active'),
});

export const blueprintPatchSchema = blueprintCreateSchema.partial();

// ─── Dry-run criteria ────────────────────────────────────────
export const dryRunCriteriaSchema = z.object({
  command: z.string().min(1).refine(
    (v) => isSafeCommand(v),
    { message: 'Command must use a safe builtin (sh/bash/python/node/pnpm/npm etc), no shell operators, and sh only accepts -s' },
  ),
  cwd: pathSchema,
  timeoutMs: z.number().int().min(1000).max(300_000).default(5000),
});
