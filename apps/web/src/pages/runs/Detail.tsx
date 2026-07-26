/* apps/web/src/pages/runs/Detail.tsx */
import { useEffect, useRef, useState } from 'react';
import * as runApi from '../../api/runs';
import XtermViewer from '../../components/XtermViewer';
import type { Run, RunStatus } from '../../api/runs';

/**
 * 显示步骤：对齐 schema 的 8 状态，让 any state 都有对应步骤。
 * 用户在 retrying 时不再看到空白。
 */
const STATES: { key: RunStatus | string; label: string }[] = [
  { key: 'idle', label: 'idle' },
  { key: 'initializing', label: 'initializing' },
  { key: 'running', label: 'running' },
  { key: 'evaluating', label: 'evaluating' },
  { key: 'retrying', label: 'retrying' },
  { key: 'success', label: 'success' },
  { key: 'failed', label: 'failed' },
  { key: 'stopped', label: 'stopped' },
];

// phase 数据来自后端未上线前，保留 UI 文案作为 placeholder；
// 后续一旦 phases 接通后端，只需替换这一行使"阶段进度条"从真实 phaseHistory 驱动。
const PHASES_PLACEHOLDER: string[] = ['(sense)', '(decide)', '(act)', '(feedback)'];

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}
function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}
function fmtElapsed(start: Date | null, end: Date | null): string {
  if (!start) return '—';
  const e = end ?? new Date();
  const sec = Math.floor((e.getTime() - start.getTime()) / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function stateIndex(s: RunStatus): number {
  const i = STATES.findIndex((x) => x.key === s);
  return i < 0 ? -1 : i;
}

/**
 * SDAF 阶段进度条：
 * 优先用 run.phaseHistory（每阶段执行真实状态），否则基于 currentRound + PHASES_PLACEHOLDER。
 */
function SDAFPhases({ run }: { run: Run | null }) {
  type PhaseStatus = 'running' | 'evaluating' | 'passed' | 'failed' | 'skipped';
  const history: Array<{
    phaseId: string;
    status: PhaseStatus;
    startedAt: string;
  }> = (run?.phaseHistory ?? []) as Array<{ phaseId: string; status: PhaseStatus; startedAt: string }>;
  if (history.length > 0) {
    return (
      <div className="flex items-center gap-1 mb-2">
        {history.slice(0, 8).map((p, i) => {
          const cls = p.status === 'passed' ? 'done'
            : p.status === 'running' ? 'active'
            : p.status === 'evaluating' ? 'active'
            : p.status === 'failed' ? 'failed'
            : 'pending';
          return (
            <span key={p.phaseId + '-' + i} className="flex items-center gap-1">
              <span className={`phase-mini ${cls}`}>{i + 1} {p.phaseId}</span>
              {i < history.length - 1 && <span className="text-dim">→</span>}
            </span>
          );
        })}
      </div>
    );
  }

  // fallback placeholder
  const round = run?.currentRound ?? 0;
  return (
    <div className="flex items-center gap-1 mb-2">
      <span className="text-muted text-[12px] mr-2">阶段 {Math.max(1, Math.min(4, round + 1))}/4</span>
      {PHASES_PLACEHOLDER.map((p, i) => {
        const active = i === (round % PHASES_PLACEHOLDER.length);
        return (
          <span key={p} className="flex items-center gap-1">
            <span className={`phase-mini ${active ? 'active' : i < (round % PHASES_PLACEHOLDER.length) ? 'done' : 'pending'}`}>
              {i + 1} {p}{active ? ' · 运行中' : ''}
            </span>
            {i < PHASES_PLACEHOLDER.length - 1 && <span className="text-dim">→</span>}
          </span>
        );
      })}
    </div>
  );
}

interface Props {
  runId: string;
  onBack?: () => void;
}

export default function RunDetail({ runId, onBack }: Props) {
  const [run, setRun] = useState<Run | null>(null);
  const [events, setEvents] = useState<runApi.AuditEvent[]>([]);
  const [wsState, setWsState] = useState<'connecting' | 'open' | 'closed' | 'error'>('connecting');
  const [busy, setBusy] = useState(false);

  // interval 解耦：仅挂载时注册，处理 status 终态自行 clearInterval
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tick = async () => {
    try {
      const [r, e] = await Promise.all([
        runApi.getRun(runId),
        runApi.listAuditEvents(runId).catch(() => ({ items: [], total: 0 })),
      ]);
      setRun(() => {
        // 若已终态 → 解除 interval（interval ref 不看 prev）
        if (['success', 'failed', 'stopped'].includes(r.status)) {
          if (ivRef.current) { clearInterval(ivRef.current); ivRef.current = null; }
        }
        return r;
      });
      setEvents((e.items ?? []) as runApi.AuditEvent[]);
    } catch { /* keep last known */ }
  };
  useEffect(() => {
    tick();
    ivRef.current = setInterval(tick, 2000);
    return () => { if (ivRef.current) clearInterval(ivRef.current); ivRef.current = null; };
  }, [runId]);

  const handleStop = async () => {
    setBusy(true);
    try { await runApi.stopRun(runId); } finally { setBusy(false); }
  };
  const handleDownload = async () => {
    const trail = await runApi.getAuditTrail(runId);
    const blob = new Blob([JSON.stringify(trail, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-trail-${runId}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const isTerminal = run ? ['success', 'failed', 'stopped'].includes(run.status) : false;
  const status = run?.status ?? 'initializing';
  const idx = stateIndex(status);
  const goal = run?.goal;
  const startedAt = toDate(run?.startedAt);
  const endedAt = toDate(run?.endedAt);
  const createdAt = toDate(run?.createdAt);
  const budget = run?.budgetUsage;
  const maxRounds = goal?.budget?.maxRounds ?? 20;
  const maxUsd = goal?.budget?.maxTokensUSD ?? 1.0;
  const currentRound = run?.currentRound ?? 0;

  return (
    <div className="min-h-screen">
      {/* Breadcrumb / top header */}
      <div className="border-b-1 surface">
        <div className="max-w-[1400px] mx-auto px-6 h-12 flex items-center gap-3 text-[12px]">
          <a href="#" className="text-muted hover:underline" onClick={(e) => { e.preventDefault(); onBack?.(); }}>Runs</a>
          <span className="text-dim">/</span>
          <span className="mono">{runId}</span>
          {run && <span className="text-muted">·</span>}
          {run && <span>{goal?.objective ?? '—'}</span>}
          <div className="ml-auto flex items-center gap-3 text-muted mono">
            {createdAt && (<><span>开始 {fmtDate(createdAt)}</span><span className="text-dim">·</span></>)}
            {startedAt && <span>已运行 {fmtElapsed(startedAt, endedAt)}</span>}
            {isTerminal && (
              <>
                <button className="btn small">📋 日志</button>
                <button className="btn small">⏸ 暂停</button>
                <button className="btn small danger" onClick={handleDownload}>🛑 下载</button>
              </>
            )}
            {!isTerminal && (
              <button className="btn small danger" onClick={handleStop} disabled={busy}>⏹ 停止</button>
            )}
          </div>
        </div>
      </div>

      {/* State stepper + token + phases + round */}
      <div className="border-b-1 surface-2">
        <div className="max-w-[1400px] mx-auto px-6 py-3">
          {/* State machine stepper */}
          <div className="flex items-center gap-1 mb-2">
            {STATES.map((s, i) => {
              const done = idx > i;
              const active = idx === i;
              return (
                <span key={s.key} className="flex items-center gap-1">
                  <span className={`state-step ${done ? 'done' : active ? 'active' : ''}`}>
                    {done ? '● ' : active ? '● ' : '○ '}{s.label}
                  </span>
                  {i < STATES.length - 1 && <span className="state-arrow">→</span>}
                </span>
              );
            })}
            <span className="ml-4 mono text-muted text-[12px]">
              · tokens <span style={{ color: 'var(--fg)' }}>0</span> in / <span style={{ color: 'var(--fg)' }}>0</span> out · 花费 <span style={{ color: 'var(--accent)' }}>${(budget?.tokensUsedUsd ?? 0).toFixed(4)}</span> / ${maxUsd.toFixed(2)} · 重试 {run?.iteration ?? 0}/{maxRounds}
            </span>
          </div>

          {/* SDAF phases —— 基于 run.phaseHistory；未接通后端时展示占位 4 格 */}
          <SDAFPhases run={run} />

          {/* Round info row */}
          <div className="flex items-center gap-4 text-[11px] text-muted mono flex-wrap">
            <span>Round <strong style={{ color: 'var(--fg)' }}>{currentRound}/{maxRounds}</strong> (ADR-0010)</span>
            <span className="text-dim">·</span>
            <span>Planner: <strong style={{ color: 'var(--fg)' }}>{events.filter((e) => e.eventType === 'planner_call').length}</strong> tasks</span>
            <span className="text-dim">·</span>
            <span>Verification: <strong style={{ color: 'var(--ok)' }}>{events.filter((e) => e.eventType === 'verification').length}</strong> passed</span>
            <span className="text-dim">·</span>
            <span>Memory: <strong style={{ color: 'var(--fg)' }}>state.yaml (0 KB)</strong></span>
            <span className="text-dim">·</span>
            <span>Reflection: <strong style={{ color: 'var(--fg)' }}>{events.filter((e) => e.eventType === 'reflection').length}</strong></span>
            <span className="text-dim">·</span>
            <span>Human Gate: <strong style={{ color: 'var(--warn)' }}>0</strong> pending</span>
          </div>
        </div>
      </div>

      {/* Goal + Done Criteria */}
      <div className="max-w-[1400px] mx-auto px-6 py-4">
        <div className="surface border-1 rounded-lg p-3 mb-3">
          <div className="flex items-start justify-between mb-2">
            <div className="text-[13px]">
              <span className="text-muted">Goal  </span>
              <span className="font-medium">{goal?.objective ?? '—'}</span>
            </div>
            <span className="tok tok-accent">🐛 Bug 修复</span>
          </div>
          <div>
            <div className="text-dim text-[11px] mb-1">Done Criteria</div>
            <div className="font-mono text-[12px] surface-2 border-1 rounded p-2 mono">
              $ {goal?.successCondition ?? 'echo ok'}
            </div>
          </div>
        </div>

        {/* Terminal with macOS chrome */}
        <div className="terminal-bar">
          <div className="flex gap-1.5">
            <span className="terminal-dot red" />
            <span className="terminal-dot yellow" />
            <span className="terminal-dot green" />
          </div>
          <span className="ml-2 mono text-[11px] text-dim">
            claude · {run && (run as any).pid ? `pid ${(run as any).pid}` : 'pid —'} · 120×30 · {wsState === 'open' ? 'live' : wsState}
          </span>
          <div className="ml-auto flex gap-2 text-[11px] text-muted">
            <span className="tok tok-running">● {wsState}</span>
            <a href="#" className="text-muted hover:underline" onClick={(e) => e.preventDefault()}>↓ Scroll</a>
            <a href="#" className="text-muted hover:underline" onClick={(e) => e.preventDefault()}>⧉ Copy</a>
          </div>
        </div>
        <div className="border-1 border-t-0 rounded-b-lg" style={{ height: '480px' }}>
          <XtermViewer wsUrl={runApi.streamUrl(runId)} onConnectionChange={setWsState} />
        </div>
      </div>
    </div>
  );
}