import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import { ChevronDown, Search, ListTodo, GitBranch, Workflow, Rocket, BarChart3, AppWindow, Package, FileText, FlaskConical, FileCode2, Settings as SettingsIcon, Star, Check } from 'lucide-react';

const subNav = [
  { id: 'overview', icon: BarChart3, key: 'overview' as const },
  { id: 'issues', icon: ListTodo, key: 'issues' as const },
  { id: 'code', icon: GitBranch, key: 'code_repo' as const },
  { id: 'ci', icon: Workflow, key: 'ci' as const },
  { id: 'cd', icon: Rocket, key: 'cd' as const },
  { id: 'analysis', icon: BarChart3, key: 'analysis' as const },
  { id: 'apps', icon: AppWindow, key: 'apps' as const },
  { id: 'artifacts', icon: Package, key: 'artifacts' as const },
  { id: 'docs', icon: FileText, key: 'docs' as const },
  { id: 'tests', icon: FlaskConical, key: 'tests' as const },
  { id: 'yaml', icon: FileCode2, key: 'projectYaml' as const },
  { id: 'settings', icon: SettingsIcon, key: 'projectSettings' as const },
];

export default function ProjectSubSidebar() {
  const { language, projects, currentProjectId, setCurrentProject, projectSubPage, setProjectSubPage } = useAppStore();
  const t = useT(language);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropRef = useRef<HTMLDivElement>(null);

  const current = projects.find(p => p.id === currentProjectId) ?? projects[0];
  const filtered = projects.filter(p =>
    !search || p.name.includes(search) || p.nameEn.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <aside className="w-60 shrink-0 h-full pl-0 pr-3 py-3">
      <div className="glass-strong rounded-3xl h-full flex flex-col">
        {/* Project switcher */}
        <div ref={dropRef} className="relative p-3 border-b border-border/70">
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full glass-soft rounded-2xl p-2.5 flex items-center gap-2.5 hover-soft transition-all"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-md"
              style={{ background: `linear-gradient(135deg,${current.color},${current.color}aa)`, fontWeight: 700 }}>
              {(language === 'zh' ? current.name : current.nameEn).slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-xs text-muted-foreground" style={{ fontWeight: 500 }}>{t('currentProject')}</div>
              <div className="truncate" style={{ fontWeight: 600, fontSize: '.9rem' }}>{language === 'zh' ? current.name : current.nameEn}</div>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="pop-enter absolute top-full left-3 right-3 mt-2 glass-strong rounded-2xl p-2 max-h-[60vh] overflow-hidden flex flex-col"
              style={{
                zIndex: 100,
                background: 'var(--popover)',
                border: '1px solid var(--border)',
                boxShadow: '0 24px 60px oklch(0 0 0 / 0.6), 0 0 0 1px oklch(1 0 0 / 0.06) inset',
              }}>
              <div className="glass-soft rounded-xl flex items-center gap-2 px-3 py-2 mb-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  autoFocus
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={t('searchProject')}
                  className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground/60"
                />
              </div>
              <div className="overflow-auto space-y-0.5">
                {filtered.map(p => {
                  const active = p.id === current.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setCurrentProject(p.id); setOpen(false); setSearch(''); }}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-xl transition-all text-left border ${active ? 'surface-brand-soft' : 'border-transparent hover-soft'}`}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs shrink-0"
                        style={{ background: `linear-gradient(135deg,${p.color},${p.color}aa)`, fontWeight: 700 }}>
                        {(language === 'zh' ? p.name : p.nameEn).slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm" style={{ fontWeight: 600 }}>{language === 'zh' ? p.name : p.nameEn}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.tags.map(t => '#' + t).join(' ')}</div>
                      </div>
                      {p.starred && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                      {active && <Check className="w-4 h-4 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sub-nav */}
        <nav className="flex-1 overflow-auto p-2 space-y-0.5">
          {subNav.map(item => {
            const Icon = item.icon;
            const active = projectSubPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setProjectSubPage(item.id as any)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-300 border ${active ? 'surface-brand-soft' : 'text-foreground/70 border-transparent hover-soft hover:text-foreground'
                  }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-sm" style={{ fontWeight: active ? 600 : 500 }}>{t(item.key)}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
