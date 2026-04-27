import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import { LayoutDashboard, FolderKanban, SlidersHorizontal, ShieldCheck, Sparkles } from 'lucide-react';

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, key: 'dashboard' as const },
  { id: 'projects', icon: FolderKanban, key: 'projects' as const },
  { id: 'roles', icon: ShieldCheck, key: 'roles' as const },
  { id: 'system', icon: SlidersHorizontal, key: 'systemSettings' as const },
];

export default function Sidebar() {
  const { currentPage, setCurrentPage, language } = useAppStore();
  const t = useT(language);

  const isActive = (id: string) =>
    currentPage === id || (id === 'projects' && currentPage === 'project-detail');

  return (
    <aside className="w-30 shrink-0 h-full p-3">
      <div className="glass-strong rounded-[30px] h-full flex flex-col items-center py-5 px-2">
        <button
          onClick={() => setCurrentPage('dashboard')}
          className="w-14 h-14 rounded-[22px] flex items-center justify-center shadow-lg mb-6"
          style={{ background: 'var(--brand-500)' }}
          title={t('appName')}
        >
          <Sparkles className="w-5 h-5" style={{ color: 'oklch(0.99 0 0)' }} />
        </button>

        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">{language === 'zh' ? '导航' : 'Nav'}</div>

        <nav className="flex-1 flex flex-col gap-3 w-full px-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id as any)}
                title={t(item.key)}
                className={`relative w-full rounded-[22px] flex flex-col items-center justify-center gap-1.5 py-3.5 transition-all duration-300 border ${active ? 'surface-brand' : 'text-foreground/70 border-transparent hover-soft hover:text-foreground'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span style={{ fontSize: '.72rem', fontWeight: active ? 700 : 600, letterSpacing: '.02em' }}>{t(item.key)}</span>
              </button>
            );
          })}
        </nav>

        <button
          onClick={() => setCurrentPage('settings')}
          title={t('settings')}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 border ${currentPage === 'settings' ? 'surface-brand' : 'brand-button'}`}
          style={{
            color: 'oklch(0.99 0 0)',
            fontWeight: 700,
            boxShadow: currentPage === 'settings' ? '0 10px 24px oklch(0.54 0.20 285 / 0.18)' : undefined,
          }}
        >A</button>
      </div>
    </aside>
  );
}
