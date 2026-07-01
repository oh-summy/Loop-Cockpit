/* apps/web/src/api/blueprints.ts */
const BASE = '/api';

export interface BlueprintInput {
  goal: { objective: string; constraints: string[]; successCondition: string; deadline?: string; budget: { maxRounds: number; maxTokensUSD: number; maxWallTimeMs: number; maxTokensNum?: number; warnAtPercent?: number } };
  agent: 'claude-code' | 'opencode' | 'codex';
  model?: string;
  projectPath: string;
  triggers: any[];
  defaultToolLayer: { skills: string[]; tools: string[]; mcpServers: any[]; subagents: any[]; permissionMode: string; allowedDirs: string[]; disallowedTools?: string[]; systemPrompt?: string };
  sdafStages: any[];
  phases: any[];
  startPhaseId?: string;
  plannerConfig?: any;
  contextBuilderConfig?: any;
  verificationConfig?: any;
  memoryConfig?: any;
  reflectionConfig?: any;
  humanGateConfig?: any;
  notification?: any;
  deny?: any;
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
  phases: any[];
  startPhaseId: string | null;
  plannerConfig: any;
  contextBuilderConfig: any;
  verificationConfig: any;
  memoryConfig: any;
  reflectionConfig: any;
  humanGateConfig: any;
  notification: any;
  deny: any;
  retryPolicy: any;
  type: string[];
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/** Fetch wrapper that throws on non-2xx responses. */
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
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
