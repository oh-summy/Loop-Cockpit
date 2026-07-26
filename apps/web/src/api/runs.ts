/* apps/web/src/api/runs.ts */
import { getCachedToken } from '../lib/bootstrap-token';

const BASE = '/api';

export type RunStatus = 'idle' | 'initializing' | 'running' | 'evaluating' | 'success' | 'retrying' | 'failed' | 'stopped';

export interface PhaseExecution {
  phaseId: string;
  startedAt: string;
  endedAt?: string;
  status: 'running' | 'evaluating' | 'passed' | 'failed' | 'skipped';
  evaluatorResult?: unknown;
  branchTaken?: string;
  toolCallCount: number;
  tokensIn: number;
  tokensOut: number;
}

export interface Run {
  id: string;
  blueprintId: string;
  status: RunStatus;
  iteration: number;
  startedAt: Date | null;
  endedAt: Date | null;
  exitCode: number | null;
  errorSnippet: string | null;
  currentRound: number;
  goal: any;
  budgetUsage: { tokensUsedUsd: number; roundsUsed: number; wallTimeMs: number };
  phaseHistory: PhaseExecution[];
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

export async function listRuns(page = 1, pageSize = 20): Promise<{ items: Run[]; total: number }> {
  return apiFetch(`${BASE}/runs?page=${page}&pageSize=${pageSize}`);
}

export async function getRun(id: string): Promise<Run> {
  return apiFetch(`${BASE}/runs/${id}`);
}

export async function createRun(blueprintId: string): Promise<Run> {
  return apiFetch(`${BASE}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blueprintId }),
  });
}

export async function stopRun(id: string): Promise<void> {
  await apiFetch(`${BASE}/runs/${id}/stop`, { method: 'POST' });
}

export interface AuditEvent {
  id: string;
  runId: string;
  eventType: string;
  layer: string | null;
  agentName: string;
  statusFrom: string | null;
  statusTo: string | null;
  status: string | null;
  exitCode: number | null;
  occurredAt: string;
}

export async function listAuditEvents(runId: string): Promise<{ items: AuditEvent[]; total: number }> {
  return apiFetch(`${BASE}/audit/events?runId=${runId}&pageSize=200`);
}

export async function getAuditTrail(runId: string): Promise<any> {
  return apiFetch(`${BASE}/audit/trails/${runId}`);
}

export function streamUrl(runId: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/api/runs/${runId}/stream`;
}
