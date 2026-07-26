/* apps/web/src/api/blueprints.ts */
import { getCachedToken } from '../lib/bootstrap-token';

const BASE = '/api';

/** 与 host/src/blueprint/zod.ts:NotificationConfig 对齐 */
export interface NotificationOnConfig {
  success?: boolean;
  failure?: boolean;
  humanGate?: boolean;
  budgetWarning?: boolean;
  progress?: boolean;
  progressEveryN?: number;
  senseComplete?: boolean;
  decideComplete?: boolean;
  actComplete?: boolean;
  feedbackComplete?: boolean;
}

export interface NotificationChannelConfig {
  desktop?: boolean;
  browser?: boolean;
  email?: { to: string; smtp: { host: string; port: number; user?: string; pass?: { $secret: string } | string } };
  lark?: { webhookUrl: { $secret: string } | string };
  slack?: { webhookUrl: { $secret: string } | string };
  discord?: { webhookUrl: { $secret: string } | string };
  telegram?: { botToken: { $secret: string } | string; chatId: string };
  skill?: { name: string; prompt: string };
  cli?: { command: string };
}

export interface NotificationConfig {
  on: NotificationOnConfig;
  channels: NotificationChannelConfig;
  template?: { titleTemplate?: string; bodyTemplate?: string; includeAuditLink?: boolean; includeRunLink?: boolean };
}

export interface ToolLayerConfig {
  skills: string[];
  tools: string[];
  mcpServers: Array<{ name: string; command: string }>;
  subagents: Array<{ name: string; prompt: string; tools?: string[] }>;
  permissionMode: 'plan' | 'acceptEdits' | 'bypassPermissions' | 'interactive';
  allowedDirs: string[];
  disallowedTools?: string[];
  systemPrompt?: string;
}

export interface SDAFStage {
  phase: 'sense' | 'decide' | 'act' | 'feedback';
  prompt: string;
  skills: string[];
  tools: string[];
  permissionMode?: 'plan' | 'acceptEdits' | 'bypassPermissions' | 'interactive';
  model?: string;
  outputEnabled: boolean;
  outputSpec: string;
}

export interface BlueprintInput {
  goal: {
    objective: string;
    constraints: string[];
    successCondition: string;
    deadline?: string;
    budget: {
      maxRounds: number;
      maxTokensUSD: number;
      maxWallTimeMs: number;
      maxTokensNum?: number;
      warnAtPercent?: number;
    };
  };
  agent: 'claude-code' | 'opencode' | 'codex';
  model?: string;
  projectPath: string;
  triggers: Array<{ type: string; [k: string]: unknown }>;
  defaultToolLayer: ToolLayerConfig;
  sdafStages: SDAFStage[];
  phases: Array<{ id: string; name: string; order: number; [k: string]: unknown }>;
  startPhaseId?: string;
  plannerConfig?: unknown;
  contextBuilderConfig?: unknown;
  verificationConfig?: unknown;
  memoryConfig?: unknown;
  reflectionConfig?: unknown;
  humanGateConfig?: unknown;
  notification?: NotificationConfig;
  deny?: {
    editPaths?: string[];
    deletePaths?: string[];
    strictBoundary?: boolean;
    bashCommands?: string[];
    customRules?: string[];
    gitPush?: boolean;
    gitCommit?: boolean;
  };
  retryPolicy: { maxRetries: number; timeoutMinutes: number; onFail: 'stop' | 'notify' | 'escalate' };
  type: string[];
  status: 'active' | 'disabled';
}

export interface Blueprint {
  id: string;
  goal: any;
  agent: string;
  model: string | null;
  projectPath: string;
  triggers: any[];
  defaultToolLayer: any;
  sdafStages: any[];
  phases: SDAFStage[];
  startPhaseId: string | null;
  plannerConfig: any;
  contextBuilderConfig: any;
  verificationConfig: any;
  memoryConfig: any;
  reflectionConfig: any;
  humanGateConfig: any;
  notification: NotificationConfig | null;
  deny: any;
  retryPolicy: any;
  type: string[];
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/** Fetch wrapper: 自动带 x-loop-token + credentials，抛错带服务端返回文本 */
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const token = await getCachedToken().catch(() => '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers['x-loop-token'] = token;
  const res = await fetch(url, { ...init, headers, credentials: 'same-origin' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status} ${res.statusText}: ${text.slice(0, 500)}`);
  }
  return res.json() as Promise<T>;
}

export async function listBlueprints(page = 1, pageSize = 20): Promise<{ items: Blueprint[]; total: number }> {
  return apiFetch(`${BASE}/blueprints?page=${page}&pageSize=${pageSize}`);
}

export async function getBlueprint(id: string): Promise<Blueprint> {
  return apiFetch(`${BASE}/blueprints/${id}`);
}

export async function createBlueprint(data: BlueprintInput): Promise<Blueprint> {
  return apiFetch(`${BASE}/blueprints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function patchBlueprint(id: string, data: Partial<BlueprintInput>): Promise<any> {
  return apiFetch(`${BASE}/blueprints/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteBlueprint(id: string): Promise<void> {
  await apiFetch(`${BASE}/blueprints/${id}`, { method: 'DELETE' });
}

export async function dryRunCriteria(id: string, command: string, cwd: string, timeoutMs = 5000): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return apiFetch(`${BASE}/blueprints/${id}/dry-run-criteria`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, cwd, timeoutMs }),
  });
}
