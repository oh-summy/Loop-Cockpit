/* apps/web/src/components/NavBar.tsx */
export type Tab = 'dashboard' | 'editor' | 'runs';

interface Props {
  tab: Tab;
  onTab: (t: Tab) => void;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: '首页' },
  { key: 'editor', label: 'Loop 列表' },
  { key: 'runs', label: '运行记录' },
];

export default function NavBar({ tab, onTab }: Props) {
  return (
    <header className="lc-nav">
      <div className="max-w-[1400px] mx-auto px-6 h-12 flex items-center gap-6">
        <span className="font-semibold flex items-center gap-1.5 text-[14px]">
          <span style={{ color: 'var(--accent)' }} className="mono">▸</span>
          Loop Cockpit
        </span>
        <nav className="flex items-center gap-1">
          {TABS.map((t) => (
            <a
              key={t.key}
              href="#"
              className={`lc-nav-link ${tab === t.key ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); onTab(t.key); }}
            >
              {t.label}
            </a>
          ))}
        </nav>
        <span className="ml-auto text-[12px] text-muted mono">MOCK_CLAUDE</span>
      </div>
    </header>
  );
}