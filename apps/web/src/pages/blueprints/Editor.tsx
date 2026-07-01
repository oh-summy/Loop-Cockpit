/* apps/web/src/pages/blueprints/Editor.tsx */
import { useState } from 'react';
import NavBar, { Tab } from '../../components/NavBar';

type TriggerMode = 'manual' | 'once' | 'schedule';
type AgentEngine = 'claude-code' | 'opencode' | 'codex';

interface Props {
  onNav?: (t: Tab) => void;
  onRunCreated?: (runId: string) => void;
}

const SUCCESS_CRITERIA = [
  { key: 'lint', label: 'lint', color: 'tok-ok' },
  { key: 'test', label: 'test', color: 'tok-ok' },
  { key: 'build', label: 'build', color: 'tok-ok' },
  { key: 'typecheck', label: 'typecheck', color: 'tok-ok' },
  { key: 'format', label: 'format', color: 'tok-warn' },
  { key: 'security', label: 'security scan', color: 'tok-warn' },
  { key: 'dep-audit', label: 'dep audit', color: 'tok-warn' },
  { key: 'e2e', label: 'e2e', color: 'tok-accent' },
  { key: 'snapshot', label: 'snapshot', color: 'tok-accent' },
  { key: 'bundle', label: 'bundle size', color: 'tok-accent' },
];

const CMD_FOR_KEY: Record<string, string> = {
  lint: 'pnpm lint',
  test: 'pnpm test',
  build: 'pnpm build',
  typecheck: 'pnpm typecheck',
  format: 'pnpm format',
  security: 'pnpm security:scan',
  'dep-audit': 'pnpm audit',
  e2e: 'pnpm e2e',
  snapshot: 'pnpm test -- -u',
  bundle: 'pnpm size',
};

const TYPES = [
  { key: 'check', icon: '🔍', label: '定期检查' },
  { key: 'bug', icon: '🐛', label: 'Bug 修复' },
  { key: 'refactor', icon: '🔧', label: '重构' },
  { key: 'test', icon: '🧪', label: '测试' },
  { key: 'docs', icon: '📝', label: '文档' },
  { key: 'other', icon: '⚙️', label: '其他' },
];

const SECTIONS = [
  { num: 1, title: '触发与边界', desc: '什么时候启动 · 什么时候结束 · 用哪个 AI', key: 'trigger' },
  { num: 2, title: '核心配置', desc: '在哪工作 · 要达成什么 · 怎么算成功', key: 'core' },
  { num: 3, title: '生命周期（感知-决策-行动-反馈）', desc: 'AI 每轮怎么思考 · 用什么工具 · 怎么验证', key: 'lifecycle' },
  { num: 4, title: '反馈通知', desc: '什么事件发到哪 · 哪些人收到', key: 'notification' },
  { num: 5, title: '失败重试', desc: '失败怎么办 · 最多重试几次 · 多久超时', key: 'retry' },
  { num: 6, title: '禁止边界', desc: 'AI 绝对不能碰什么', key: 'deny' },
];

export default function Editor({ onNav, onRunCreated }: Props) {
  const [mode, setMode] = useState<'simple' | 'expert'>('simple');
  const [typeKey, setTypeKey] = useState('check');
  const [template, setTemplate] = useState('builtin');
  const [trigger, setTrigger] = useState<TriggerMode>('manual');
  const [agent, setAgent] = useState<AgentEngine>('claude-code');
  const [model, setModel] = useState('Sonnet 4.6（本机默认）');
  const [path, setPath] = useState('/Users/rocky/project/Loop-Cockpit');
  const [objective, setObjective] = useState('保持 main 分支健康');
  const [criteria, setCriteria] = useState<Record<string, boolean>>(
    { lint: true, test: true, build: true },
  );
  const [successCmd, setSuccessCmd] = useState('pnpm lint && pnpm test && pnpm build');
  const [constraints, setConstraints] = useState<string[]>(['不能改 API 接口']);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ trigger: true, core: true });

  const [maxRounds, setMaxRounds] = useState(20);
  const [maxUsd, setMaxUsd] = useState(1.0);
  const [timeoutMin, setTimeoutMin] = useState(30);

  const [maxRetries, setMaxRetries] = useState(3);
  const [onFail, setOnFail] = useState<'stop' | 'notify' | 'escalate'>('stop');

  const [strictBoundary, setStrictBoundary] = useState(true);
  const [gitPushAllowed, setGitPushAllowed] = useState(false);

  const [sdafStages, setSdafStages] = useState({ sense: true, decide: true, act: true, feedback: true });

  const toggleSection = (key: string) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  const toggleCriteria = (key: string) => {
    const next = { ...criteria, [key]: !criteria[key] };
    setCriteria(next);
    const parts = Object.entries(next).filter(([_, v]) => v).map(([k]) => CMD_FOR_KEY[k]).filter(Boolean);
    setSuccessCmd(parts.join(' && '));
  };

  const displayName = objective.length > 10 ? objective.slice(0, 10) + '…' : objective;

  const handleSave = async (runAfter: boolean) => {
    // Validate required fields
    if (!objective.trim()) {
      alert('请输入目标 (Objective)');
      return;
    }
    if (!path.trim()) {
      alert('请输入项目路径');
      return;
    }
    // Filter out empty constraints
    const trimmedConstraints = constraints.filter((c) => c.trim());

    const payload = {
      projectPath: path,
      agent,
      goal: {
        objective: objective.trim(),
        successCondition: successCmd,
        constraints: trimmedConstraints,
        budget: { maxRounds, maxTokensUSD: maxUsd, maxWallTimeMs: timeoutMin * 60 * 1000 },
      },
      triggers: trigger === 'manual'
        ? [{ type: 'manual' as const }]
        : trigger === 'once'
          ? [{ type: 'once' as const, at: '' }]
          : [{ type: 'cron' as const, expression: '0 9 * * *' }],
      defaultToolLayer: {
        permissionMode: 'plan' as const,
        skills: [], tools: [], mcpServers: [], subagents: [],
        allowedDirs: [path],
      },
      sdafStages: [
        { phase: 'sense' as const, prompt: '', skills: [], tools: [], outputEnabled: true, outputSpec: 'text' },
        { phase: 'decide' as const, prompt: '', skills: [], tools: [], outputEnabled: true, outputSpec: 'text' },
        { phase: 'act' as const, prompt: '', skills: [], tools: [], outputEnabled: true, outputSpec: 'text' },
        { phase: 'feedback' as const, prompt: '', skills: [], tools: [], outputEnabled: true, outputSpec: 'text' },
      ],
      phases: [],
      retryPolicy: { maxRetries, timeoutMinutes: timeoutMin, onFail },
      deny: { strictBoundary, gitPush: gitPushAllowed, gitCommit: false },
      type: [typeKey],
      status: 'active' as const,
    };
    try {
      const { createBlueprint } = await import('../../api/blueprints');
      const bp = await createBlueprint(payload);
      if (runAfter) {
        const { createRun } = await import('../../api/runs');
        const run = await createRun(bp.id);
        onRunCreated?.(run.id);
        return;
      }
      onNav?.('dashboard');
    } catch (e) {
      alert('保存失败：' + (e as Error).message);
    }
  };

  return (
    <div className="min-h-screen">
      <NavBar tab="editor" onTab={(t) => onNav?.(t)} />

      <main className="max-w-[1100px] mx-auto px-6 py-6">
        <div className="flex items-baseline justify-between mb-3">
          <h1 className="text-[20px] font-semibold">创建 Loop</h1>
          <div className="flex items-center gap-2">
            <div className="flex border-1 rounded-md overflow-hidden mr-2">
              <button className={`px-3 py-1 text-[12px] ${mode === 'simple' ? 'surface-2' : ''}`} onClick={() => setMode('simple')}>简单模式</button>
              <button className={`px-3 py-1 text-[12px] ${mode === 'expert' ? 'surface-2' : ''}`} onClick={() => setMode('expert')}>专家模式</button>
            </div>
            <button className="btn" onClick={() => onNav?.('dashboard')}>取消</button>
            <button className="btn" onClick={() => handleSave(false)}>保存</button>
            <button className="btn primary" onClick={() => handleSave(true)}>保存并运行</button>
          </div>
        </div>
        <p className="text-dim text-[11px] mb-3">简单模式:触发 + 核心 + 生命周期 + 反馈 + 重试 + 边界</p>

        <div className="flex items-center gap-3 pb-3 border-b-1">
          <span className="text-muted text-[12px]">类型</span>
          <select className="px-3 py-1.5 rounded text-[12px] surface-2 border-1" value={typeKey} onChange={(e) => setTypeKey(e.target.value)}>
            {TYPES.map((t) => (
              <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
            ))}
          </select>
          <span className="text-dim">·</span>
          <span className="text-muted text-[12px]">模板</span>
          <select className="px-3 py-1.5 rounded text-[12px] surface-2 border-1" value={template} onChange={(e) => setTemplate(e.target.value)}>
            <option value="builtin">系统内置（基础版）</option>
            <option value="blank">+ 空白</option>
          </select>
          <button className="btn small ml-auto">💾 另存为我的模板</button>
        </div>

        <div className="mt-4 space-y-3">
          {SECTIONS.map((sec) => (
            <div key={sec.key} className="surface border-1 rounded-lg overflow-hidden">
              <div className="section-head" onClick={() => toggleSection(sec.key)}>
                <span className="num">{sec.num}</span>
                <span className="font-semibold text-[14px]">{sec.title}</span>
                <span className="desc">{sec.desc}</span>
                <span className="ml-auto text-muted">{openSections[sec.key] ? '▾' : '▸'}</span>
              </div>
              {openSections[sec.key] && (
                <div className="p-4">
                  {sec.key === 'trigger' && (
                    <>
                      <div className="mb-4">
                        <label className="label">触发方式</label>
                        <div className="flex border-1 rounded-md overflow-hidden">
                          {(['manual', 'once', 'schedule'] as TriggerMode[]).map((t) => (
                            <button key={t} className={`flex-1 py-1.5 text-[12px] ${trigger === t ? 'surface-2' : ''}`} onClick={() => setTrigger(t)}>
                              {t === 'manual' ? '手动' : t === 'once' ? '一次性' : '定时'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">AI 引擎</label>
                          <select className="select" value={agent} onChange={(e) => setAgent(e.target.value as AgentEngine)}>
                            <option value="claude-code">Claude Code</option>
                            <option value="opencode">OpenCode</option>
                            <option value="codex">Codex</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">Model</label>
                          <select className="select" value={model} onChange={(e) => setModel(e.target.value)}>
                            <option>Sonnet 4.6（本机默认）</option>
                            <option>Opus 4.8</option>
                            <option>Haiku 4.5</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {sec.key === 'core' && (
                    <>
                      <div className="mb-4">
                        <label className="label">项目路径 <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <div className="relative">
                          <input className="input mono" value={path} onChange={(e) => setPath(e.target.value)} />
                          <button className="btn xsmall absolute right-1.5 top-1/2 -translate-y-1/2">📁 浏览</button>
                        </div>
                        <p className="text-dim text-[11px] mt-1">Loop 工作目录，cwd + 文件读写边界基线</p>
                      </div>
                      <div className="mb-4">
                        <label className="label">目标 <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <textarea className="textarea" rows={5} value={objective} onChange={(e) => setObjective(e.target.value)} />
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-dim text-[11px]">显示名:</span>
                          <span className="text-dim text-[11px] mono">{displayName}</span>
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="label">成功标准 <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {SUCCESS_CRITERIA.map((c) => (
                            <button
                              key={c.key}
                              onClick={() => toggleCriteria(c.key)}
                              className={`tok ${criteria[c.key] ? c.color : 'tok-muted'}`}
                              style={{ border: criteria[c.key] ? '' : '1px solid var(--border)', cursor: 'pointer' }}
                            >
                              {criteria[c.key] ? '✓ ' : '○ '}{c.label}
                            </button>
                          ))}
                        </div>
                        <textarea className="textarea mono text-[12px]" rows={2} value={successCmd} onChange={(e) => setSuccessCmd(e.target.value)} />
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-dim text-[11px]">勾选预制项自动生成命令，也可手动编辑</p>
                          <button className="btn ghost xsmall">🧪 试跑</button>
                        </div>
                      </div>
                      <div>
                        <label className="label">约束</label>
                        <div className="space-y-1.5 mb-2">
                          {constraints.map((c, i) => (
                            <div key={i} className="flex gap-2">
                              <input className="input flex-1" value={c} onChange={(e) => setConstraints((arr) => arr.map((x, j) => j === i ? e.target.value : x))} />
                              <button className="btn xsmall danger" onClick={() => setConstraints((arr) => arr.filter((_, j) => j !== i))}>移除</button>
                            </div>
                          ))}
                        </div>
                        <button className="btn small" onClick={() => setConstraints((arr) => [...arr.filter((c) => c.trim()), ''])}>+ 添加</button>
                      </div>
                    </>
                  )}

                  {sec.key === 'lifecycle' && (
                    <>
                      <p className="text-dim text-[11px] mb-3 surface-2 border-1 rounded p-2">
                        简单模式：一锅烩注入；专家模式：各阶段独立配置，顶层工具池不生效
                      </p>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {(['sense', 'decide', 'act', 'feedback'] as const).map((s) => (
                          <label key={s} className="flex items-center gap-2 text-[12px] cursor-pointer">
                            <input type="checkbox" checked={sdafStages[s]} onChange={() => setSdafStages((p) => ({ ...p, [s]: !p[s] }))} />
                            <span className="mono">{s}</span>
                          </label>
                        ))}
                      </div>
                      <div className="mb-4">
                        <label className="label">Skills</label>
                        <input className="input" placeholder="例：code-review, github-pr" />
                      </div>
                      <div className="mb-4">
                        <label className="label">Tools</label>
                        <input className="input" placeholder="例：Bash, Read, Edit" />
                      </div>
                      <div className="mb-4">
                        <label className="label">MCP Servers</label>
                        <input className="input" placeholder="例：github, lark" />
                      </div>
                      <div>
                        <label className="label">Subagents</label>
                        <input className="input" placeholder="例：code-reviewer, test-writer" />
                      </div>
                    </>
                  )}

                  {sec.key === 'notification' && (
                    <>
                      <div className="mb-4">
                        <label className="label">通知渠道</label>
                        <div className="flex flex-wrap gap-2">
                          {['桌面', '浏览器', 'Email', '飞书', 'Slack', 'CLI', 'Telegram', 'Discord'].map((c) => (
                            <label key={c} className="flex items-center gap-1 text-[12px]">
                              <input type="checkbox" /> {c}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="label">触发事件</label>
                        <div className="flex flex-wrap gap-2">
                          {['成功', '失败', 'Human Gate', '预算警告', '进度', 'SDAF 阶段完成'].map((e) => (
                            <label key={e} className="flex items-center gap-1 text-[12px]">
                              <input type="checkbox" defaultChecked /> {e}
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {sec.key === 'retry' && (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="label">最大重试</label>
                          <div className="stepper">
                            <button onClick={() => setMaxRetries(Math.max(0, maxRetries - 1))}>−</button>
                            <input value={maxRetries} onChange={(e) => setMaxRetries(parseInt(e.target.value) || 0)} />
                            <button onClick={() => setMaxRetries(maxRetries + 1)}>+</button>
                          </div>
                        </div>
                        <div>
                          <label className="label">超时（分钟）</label>
                          <div className="stepper">
                            <button onClick={() => setTimeoutMin(Math.max(1, timeoutMin - 1))}>−</button>
                            <input value={timeoutMin} onChange={(e) => setTimeoutMin(parseInt(e.target.value) || 1)} />
                            <button onClick={() => setTimeoutMin(timeoutMin + 1)}>+</button>
                          </div>
                        </div>
                        <div>
                          <label className="label">失败后</label>
                          <select className="select" value={onFail} onChange={(e) => setOnFail(e.target.value as 'stop' | 'notify' | 'escalate')}>
                            <option value="stop">停止</option>
                            <option value="notify">通知</option>
                            <option value="escalate">上报</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="label">最大轮数</label>
                          <div className="stepper">
                            <button onClick={() => setMaxRounds(Math.max(1, maxRounds - 1))}>−</button>
                            <input value={maxRounds} onChange={(e) => setMaxRounds(parseInt(e.target.value) || 1)} />
                            <button onClick={() => setMaxRounds(maxRounds + 1)}>+</button>
                          </div>
                        </div>
                        <div>
                          <label className="label">预算 USD</label>
                          <div className="stepper">
                            <button onClick={() => setMaxUsd(Math.max(0, +(maxUsd - 0.1).toFixed(2)))}>−</button>
                            <input value={maxUsd} onChange={(e) => setMaxUsd(parseFloat(e.target.value) || 0)} />
                            <button onClick={() => setMaxUsd(+(maxUsd + 0.1).toFixed(2))}>+</button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {sec.key === 'deny' && (
                    <>
                      <div className="mb-4">
                        <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                          <input type="checkbox" checked={strictBoundary} onChange={() => setStrictBoundary(!strictBoundary)} />
                          严格边界（不允许跨项目路径写）
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="label">禁止编辑路径</label>
                          <input className="input mono" placeholder="*.lock, package-lock.json" />
                        </div>
                        <div>
                          <label className="label">禁止删除路径</label>
                          <input className="input mono" placeholder=".git/**" />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="label">禁止 Bash 命令</label>
                        <input className="input mono" placeholder="rm -rf, sudo, curl | bash" />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                          <input type="checkbox" checked={gitPushAllowed} onChange={() => setGitPushAllowed(!gitPushAllowed)} />
                          允许 git push
                        </label>
                        <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                          <input type="checkbox" /> 允许 git commit
                        </label>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}