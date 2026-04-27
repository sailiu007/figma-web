import { useLocation, useNavigate } from 'react-router';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import { ChevronRight, FolderKanban, LayoutDashboard, Settings2, ShieldCheck, Sparkles, UserCog, Users } from 'lucide-react';

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, key: 'dashboard' as const, path: '/' },
  { id: 'projects', icon: FolderKanban, key: 'projects' as const, path: '/projects' },
  {
    id: 'permissions',
    icon: ShieldCheck,
    key: 'permissionManagement' as const,
    path: '/permissions',
    children: [
      { id: 'permission-users', icon: Users, key: 'userManagement' as const, path: '/permissions?tab=users' },
      { id: 'permission-roles', icon: UserCog, key: 'roleManagement' as const, path: '/permissions?tab=roles' },
    ],
  },
  { id: 'system', icon: Settings2, key: 'systemSettings' as const, path: '/system' },
];

export default function Sidebar() {
  const { language } = useAppStore();
  const t = useT(language);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const isPermissionActive = location.pathname.startsWith('/permissions');
  const activePermissionTab = new URLSearchParams(location.search).get('tab') === 'roles' ? 'roles' : 'users';

  return (
    <aside className="w-30 shrink-0 h-full p-3">
      <div className="glass-strong rounded-[30px] h-full flex flex-col items-center py-5 px-2">
        <button
          onClick={() => navigate('/')}
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
            const active = item.id === 'permissions' ? isPermissionActive : isActive(item.path);
            return (
              <div key={item.id} className="w-full">
                <button
                  onClick={() => navigate(item.path)}
                  title={t(item.key)}
                  className={`relative w-full rounded-[22px] flex flex-col items-center justify-center gap-1.5 py-3.5 transition-all duration-300 border ${active ? 'surface-brand' : 'text-foreground/70 border-transparent hover-soft hover:text-foreground'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span style={{ fontSize: '.72rem', fontWeight: active ? 700 : 600, letterSpacing: '.02em' }}>{t(item.key)}</span>
                  {item.children && (
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${active ? 'rotate-90' : ''}`} />
                  )}
                </button>

                {item.children && active && (
                  <div className="mt-2 space-y-2">
                    {item.children.map(child => {
                      const ChildIcon = child.icon;
                      const childActive =
                        (child.id === 'permission-users' && activePermissionTab === 'users') ||
                        (child.id === 'permission-roles' && activePermissionTab === 'roles');
                      return (
                        <button
                          key={child.id}
                          onClick={() => navigate(child.path)}
                          className={`w-full rounded-[18px] px-2 py-2 flex items-center gap-2.5 text-left border transition-all ${childActive ? 'surface-brand-soft' : 'border-transparent hover-soft text-foreground/70 hover:text-foreground'}`}
                        >
                          <ChildIcon className="w-4 h-4 shrink-0" />
                          <span style={{ fontSize: '.72rem', fontWeight: childActive ? 700 : 600, letterSpacing: '.02em' }}>{t(child.key)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <button
          onClick={() => navigate('/settings')}
          title={t('settings')}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 border ${isActive('/settings') ? 'surface-brand' : 'brand-button'}`}
          style={{
            color: 'oklch(0.99 0 0)',
            fontWeight: 700,
            boxShadow: isActive('/settings') ? '0 10px 24px oklch(0.54 0.20 285 / 0.18)' : undefined,
          }}
        >A</button>
      </div>
    </aside>
  );
}
