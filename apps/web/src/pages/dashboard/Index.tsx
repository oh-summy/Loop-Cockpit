/* apps/web/src/pages/dashboard/Index.tsx */
import { useState, useEffect, useRef } from 'react';
import * as bpApi from '../../api/blueprints';
import * as runApi from '../../api/runs';
import type { Run, RunStatus } from '../../api/runs';
import NavBar, { Tab } from '../../components/NavBar';

const PHASES_PLACEHOLDER: string[] = ['sense', 'decide', 'act', 'feedback'];

function ago(iso?: string | Date | null): string {
  if (!iso) return '';
  const t = typeof iso === 'string' ? new Date(iso) : iso;
  const diff = Date.now() - t.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return '刚刚';
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
  return `${Math.floor(s / 86400)} 天前`;
}
function fmtElapsed(startedAt?: string | Date | null, endedAt?: string | Date | null): string {
  if (!startedAt) return '—';
  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt;
  const end = endedAt ? (typeof endedAt === 'string' ? new Date(endedAt) : endedAt) : new Date();
  const sec = Math.floor((end.getTime() - start.getTime()) / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function statusTok(status: RunStatus): string {
  switch (status) {
    case 'running': return 'tok-running';
    case 'initializing': return 'tok-running';
    case 'evaluating': return 'tok-running';
    case 'success': return 'tok-ok';
    case 'retrying': return 'tok-warn';
    case 'failed': return 'tok-err';
    case 'stopped': return 'tok-muted';
    default: return 'tok-muted';
  }
}
function statusIcon(status: RunStatus): string {
  switch (status) {
    case 'running': case 'initializing': case 'evaluating': return '● ' + status;
    case 'success': return '✓';
    case 'failed': return '✗';
    case 'stopped': return '⏹';
    case 'retrying': return '↻';
    default: return status;
  }
}

interface Props {
  onOpenRun?: (runId: string) => void;
  onNav?: (t: Tab) => void;
}

export default function Dashboard({ onOpenRun, onNav }: Props) {
  const [blueprints, setBlueprints] = useState<bpApi.Blueprint[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Success' | 'Failed' | 'Stopped'>('All');

  const cancelledRef = useRef(false);
  const load = () => Promise.all([
    bpApi.listBlueprints().then((r) => r.items).catch(() => []),
    runApi.listRuns(1, 50).then((r) => r.items).catch(() => []),
  ]).then(([bps, rs]) => {
    if (cancelledRef.current) return;
    setBlueprints(bps);
    setRuns(rs);
    setLoading(false);
  });
  useEffect(() => {
    cancelledRef.current = false;
    load();
    const iv = setInterval(load, 3000);
    return () => { cancelledRef.current = true; clearInterval(iv); };
  }, []);

  const handleStop = async (runId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try { await runApi.stopRun(runId); } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <NavBar tab="dashboard" onTab={(t) => onNav?.(t)} />
        <main className="max-w-[1400px] mx-auto px-6 py-8 text-muted">加载中...</main>
      </div>
    );
  }

  // Stats
  const activeLoops = blueprints.filter((b) => b.status === 'active').length;
  const running = runs.filter((r) => ['running', 'initializing', 'evaluating'].includes(r.status)).length;
  const successToday = runs.filter((r) => r.status === 'success' && (r.endedAt || r.createdAt) && new Date(r.endedAt || r.createdAt || '').toDateString() === new Date().toDateString()).length;
  const failed = runs.filter((r) => r.status === 'failed').length;
  const totalRun = runs.filter((r) => r.status === 'success' || r.status === 'failed').length;
  const successRate = totalRun > 0 ? Math.round(successToday / totalRun * 100) : 0;
  const pendingGates = runs.filter((r) => r.status === 'stopped' && r.errorSnippet?.includes('human_gate')).length;

  // Live runs (active)
  const liveRuns = runs.filter((r) => ['running', 'initializing', 'evaluating'].includes(r.status));

  // Recent runs table (filtered)
  const filtered = filter === 'All' ? runs : runs.filter((r) => {
    const k = filter.toLowerCase();
    return r.status === k;
  }).slice(0, 10);

  // My Loops
  const myLoops = blueprints.slice(0, 5);

  return (
    <div className="min-h-screen">
      <NavBar tab="dashboard" onTab={(t) => onNav?.(t)} />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Title + create */}
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-[20px] font-semibold">首页</h1>
          <button className="btn primary" onClick={() => onNav?.('editor')}>
            <span>+</span> 创建 Loop
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="stat-card">
            <div className="stat-label">Loop 活跃</div>
            <div className="stat-num mt-1" style={{ color: 'var(--accent)' }}>{activeLoops}</div>
            <div className="text-dim text-[11px] mt-1">{activeLoops === 0 ? '还没有活跃 Loop' : `${activeLoops} 个 Loop 在跑`}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Run 在跑</div>
            <div className="stat-num mt-1" style={{ color: 'var(--ok)' }}>{running}</div>
            <div className="text-dim text-[11px] mt-1">实时 · WebSocket</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">今日成功</div>
            <div className="stat-num mt-1">{runs.filter(r => r.status === 'success').length}</div>
            <div className="text-dim text-[11px] mt-1">{totalRun > 0 ? `成功率 ${successRate}%` : '尚无数据'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">告警</div>
            <div className="stat-num mt-1" style={{ color: 'var(--warn)' }}>{pendingGates + failed}</div>
            <div className="text-dim text-[11px] mt-1">{pendingGates > 0 ? `${pendingGates} Human Gate 待审` : '暂无告警'}</div>
          </div>
        </div>

        {/* Live runs */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[14px] font-semibold text-muted uppercase tracking-wider">进行中</h2>
            <a href="#" className="text-[12px] text-muted hover:underline" onClick={(e) => e.preventDefault()}>查看全部 →</a>
          </div>
          {liveRuns.length === 0 ? (
            <div className="surface border-1 rounded-lg p-6 text-center text-dim text-[12px]">
              当前没有正在运行的 Loop — 在「我的 Loop」里点 Run now 启动一个
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {liveRuns.map((run) => (
                <div key={run.id} className="run-card" onClick={() => onOpenRun?.(run.id)}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`tok ${statusTok(run.status)}`}>{statusIcon(run.status)}</span>
                      <span className="mono text-[11px] text-dim">{run.id}</span>
                    </div>
                    <button className="btn ghost xsmall danger" onClick={(e) => handleStop(run.id, e)}>⏹ Stop</button>
                  </div>
                  <div className="font-medium mb-2">{run.goal?.objective || '—'}</div>
                  <div className="flex items-center gap-1 mb-3 flex-wrap">
                    {(run.phaseHistory && run.phaseHistory.length > 0
                      ? run.phaseHistory.map((ph) => ph.phaseId)
                      : PHASES_PLACEHOLDER
                    ).map((p, i) => {
                      const historyStatus = run.phaseHistory?.[i]?.status;
                      const cls = historyStatus === 'passed' ? 'done'
                        : historyStatus === 'running' ? 'active'
                        : historyStatus === 'failed' ? 'failed'
                        : (historyStatus ? 'pending' : (i === 1 ? 'active' : i === 0 ? 'done' : 'pending'));
                      return (
                        <span key={`${run.id}-p${i}`} className="flex items-center gap-1">
                          <span className={`phase-mini ${cls}`}>
                            {i + 1} {historyStatus === 'passed' ? '✓ ' : historyStatus === 'running' ? '● ' : ''}{p}
                          </span>
                          {i < (run.phaseHistory ?? PHASES_PLACEHOLDER).length - 1 && <span className="text-dim">→</span>}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted mono">
                    <span>elapsed <strong style={{ color: 'var(--fg)' }}>{fmtElapsed(run.startedAt)}</strong></span>
                    <span className="text-dim">·</span>
                    <span>cost <strong style={{ color: 'var(--accent)' }}>${(run.budgetUsage?.tokensUsedUsd ?? 0).toFixed(3)}</strong>/${run.goal?.budget?.maxTokensUSD ?? '1.00'}</span>
                    <span className="text-dim">·</span>
                    <span>Round <strong style={{ color: 'var(--fg)' }}>{run.currentRound}/{run.goal?.budget?.maxRounds ?? 20}</strong></span>
                  </div>
                  <div className="mt-2 surface-2 border-1 rounded-full h-1 overflow-hidden">
                    <div
                      style={{
                        width: `${Math.min(100, ((run.currentRound ?? 0) / (run.goal?.budget?.maxRounds ?? 20)) * 100)}%`,
                        height: '100%',
                        background: 'var(--accent)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Human Gates */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[14px] font-semibold uppercase tracking-wider" style={{ color: 'var(--warn)' }}>待审 Human Gates</h2>
            <span className="text-[11px] text-dim">(Iter 5 上线)</span>
          </div>
          <div className="surface border-1 rounded-lg">
            {pendingGates === 0 ? (
              <div className="p-4 text-center text-dim text-[12px]">无待审项</div>
            ) : (
              <div className="bp-row">
                <span className="tok tok-warn">⏸ paused</span>
                <span className="mono text-[12px]">{runs[0]?.id ?? '—'}</span>
                <span className="text-muted text-[12px]">·</span>
                <span className="text-[12px]">{runs[0]?.goal?.objective ?? '—'}</span>
                <span className="ml-auto flex items-center gap-2">
                  <button className="btn xsmall" onClick={() => runs[0] && onOpenRun?.(runs[0].id)}>查看</button>
                  <button className="btn xsmall primary">✓ 批准</button>
                  <button className="btn xsmall danger">✗ 拒绝</button>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Recent runs table */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[14px] font-semibold text-muted uppercase tracking-wider">历史</h2>
            <div className="flex gap-2 text-[11px]">
              {(['All', 'Success', 'Failed', 'Stopped'] as const).map((k) => (
                <button
                  key={k}
                  className={`btn xsmall ${filter === k ? 'primary' : ''}`}
                  onClick={() => setFilter(k)}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <div className="surface border-1 rounded-lg overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-dim text-[12px]">暂无运行记录</div>
            ) : (
              <table className="runs-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Run ID</th>
                    <th>Blueprint</th>
                    <th>Trigger</th>
                    <th>Cost</th>
                    <th>Duration</th>
                    <th>时间</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((run) => (
                    <tr key={run.id} onClick={() => onOpenRun?.(run.id)}>
                      <td><span className={`tok ${statusTok(run.status)}`}>{statusIcon(run.status)}</span></td>
                      <td className="mono text-[12px]">{run.id}</td>
                      <td>{run.goal?.objective ?? '—'}</td>
                      <td><span className="text-[11px] text-muted">📝 Manual</span></td>
                      <td className="mono">${(run.budgetUsage?.tokensUsedUsd ?? 0).toFixed(3)}</td>
                      <td className="mono">{fmtElapsed(run.startedAt, run.endedAt)}</td>
                      <td className="text-dim">{ago(run.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* My Loops */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[14px] font-semibold text-muted uppercase tracking-wider">我的 Loop</h2>
            <button className="btn small primary" onClick={() => onNav?.('editor')}>
              <span>+</span> New Blueprint
            </button>
          </div>
          <div className="surface border-1 rounded-lg overflow-hidden">
            {myLoops.length === 0 ? (
              <div className="p-6 text-center text-dim text-[12px]">
                还没有 Loop — 点击「New Blueprint」创建第一个
              </div>
            ) : (
              myLoops.map((bp) => (
                <div key={bp.id} className="bp-row">
                  <span className="tok tok-accent">🔍 {bp.type?.[0] ?? 'Loop'}</span>
                  <span className="font-medium">{bp.goal?.objective ?? '—'}</span>
                  <span className="text-dim">·</span>
                  <span className="text-[11px] text-muted">{bp.projectPath}</span>
                  <span className="ml-auto flex gap-2">
                    <button className="btn xsmall primary" onClick={async () => {
                      try {
                        const run = await runApi.createRun(bp.id);
                        onOpenRun?.(run.id);
                      } catch { /* ignore */ }
                    }}>▶ Run now</button>
                    <button className="btn xsmall" onClick={() => onNav?.('editor')}>Edit</button>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}