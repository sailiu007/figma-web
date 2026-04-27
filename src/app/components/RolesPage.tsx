import { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import TopBar from './TopBar';
import { Crown, Briefcase, Code, Bug, Server, Eye, Plus, ShieldCheck, ArrowLeft, Check, Users } from 'lucide-react';

const iconMap: Record<string, any> = { Crown, Briefcase, Code, Bug, Server, Eye };

export default function RolesPage() {
  const { language, theme, roles, permissions, updateRolePermissions, showToast } = useAppStore();
  const t = useT(language);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const levelBadgeStyle = (lvl: string): React.CSSProperties => {
    if (theme === 'light') {
      return ({
        read: {
          background: 'oklch(0.93 0.04 240)',
          color: 'oklch(0.48 0.11 245)',
          borderColor: 'oklch(0.78 0.07 240)',
        },
        write: {
          background: 'oklch(0.93 0.05 300)',
          color: 'oklch(0.50 0.15 300)',
          borderColor: 'oklch(0.79 0.08 298)',
        },
        admin: {
          background: 'oklch(0.94 0.04 20)',
          color: 'oklch(0.55 0.16 20)',
          borderColor: 'oklch(0.80 0.08 20)',
        },
      } as any)[lvl];
    }
    return ({
      read: {
        background: 'oklch(0.68 0.10 240 / 0.18)',
        color: 'oklch(0.80 0.10 240)',
        borderColor: 'oklch(0.74 0.08 240 / 0.30)',
      },
      write: {
        background: 'oklch(0.62 0.16 300 / 0.18)',
        color: 'oklch(0.80 0.11 300)',
        borderColor: 'oklch(0.70 0.10 300 / 0.32)',
      },
      admin: {
        background: 'oklch(0.62 0.20 20 / 0.16)',
        color: 'oklch(0.80 0.12 20)',
        borderColor: 'oklch(0.72 0.10 20 / 0.28)',
      },
    } as any)[lvl];
  };
  const roleKindBadgeStyle = (kind: 'system' | 'custom'): React.CSSProperties => {
    if (theme === 'light') {
      return kind === 'system'
        ? {
          background: 'oklch(0.95 0.05 90)',
          color: 'oklch(0.54 0.12 88)',
          borderColor: 'oklch(0.82 0.08 90)',
        }
        : {
          background: 'oklch(0.92 0.05 160)',
          color: 'oklch(0.46 0.14 160)',
          borderColor: 'oklch(0.78 0.08 160)',
        };
    }
    return kind === 'system'
      ? {
        background: 'oklch(0.78 0.14 75 / 0.18)',
        color: 'oklch(0.84 0.13 75)',
        borderColor: 'oklch(0.78 0.14 75 / 0.32)',
      }
      : {
        background: 'oklch(0.70 0.15 155 / 0.18)',
        color: 'oklch(0.78 0.13 155)',
        borderColor: 'oklch(0.70 0.15 155 / 0.32)',
      };
  };

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof permissions>();
    permissions.forEach(p => {
      const cat = language === 'zh' ? p.category : p.categoryEn;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    });
    return Array.from(map.entries());
  }, [permissions, language]);

  const enterConfig = (roleId: string) => {
    const r = roles.find(x => x.id === roleId);
    if (!r) return;
    setSelectedRoleId(roleId);
    setDraft([...r.permissionIds]);
  };

  const togglePerm = (id: string) =>
    setDraft(d => d.includes(id) ? d.filter(x => x !== id) : [...d, id]);

  const toggleCategory = (catPerms: typeof permissions) => {
    const ids = catPerms.map(p => p.id);
    const allSelected = ids.every(id => draft.includes(id));
    setDraft(d => allSelected ? d.filter(x => !ids.includes(x)) : [...new Set([...d, ...ids])]);
  };

  const save = () => {
    if (!selectedRoleId) return;
    updateRolePermissions(selectedRoleId, draft);
    showToast(t('saved'));
  };

  // Configuration view
  if (selectedRole) {
    const levelLabel = (lvl: string) => ({ read: t('levelRead'), write: t('levelWrite'), admin: t('levelAdmin') } as any)[lvl];
    const Icon = iconMap[selectedRole.icon] || ShieldCheck;

    return (
      <div className="p-6 h-full overflow-auto fade-enter">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelectedRoleId(null)} className="glass-button rounded-full w-10 h-10 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground" style={{ fontWeight: 500 }}>{t('rolesTitle')} / {t('configurePermissions')}</div>
            <h1 className="text-gradient" style={{ fontSize: '1.6rem', fontWeight: 700 }}>{language === 'zh' ? selectedRole.name : selectedRole.nameEn}</h1>
          </div>
          <button onClick={() => setDraft([...selectedRole.permissionIds])} className="glass-button rounded-full px-4 py-2 text-sm">{t('reset')}</button>
          <button onClick={save} className="gradient-button rounded-full px-5 py-2 text-sm">{t('save')}</button>
        </div>

        {/* Role banner */}
        <div className="glass-card p-5 mb-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${selectedRole.color}, ${selectedRole.color}aa)` }}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3>{language === 'zh' ? selectedRole.name : selectedRole.nameEn}</h3>
              {selectedRole.isSystem && <span className="px-2 py-0.5 rounded-full text-xs border" style={roleKindBadgeStyle('system')}>{t('systemRole')}</span>}
            </div>
            <div className="text-sm text-muted-foreground">{language === 'zh' ? selectedRole.description : selectedRole.descriptionEn}</div>
          </div>
          <div className="flex items-center gap-6 px-4">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">{t('memberCount')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{selectedRole.memberCount}</div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <div className="text-xs text-muted-foreground">{t('permissionCount')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }} className="text-gradient">{draft.length}/{permissions.length}</div>
            </div>
          </div>
        </div>

        {/* Permissions by category */}
        <div className="grid grid-cols-2 gap-4">
          {grouped.map(([cat, perms]) => {
            const ids = perms.map(p => p.id);
            const selectedCount = ids.filter(id => draft.includes(id)).length;
            const allSelected = selectedCount === ids.length;
            return (
              <div key={cat} className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4>{cat}</h4>
                    <div className="text-xs text-muted-foreground">{selectedCount}/{ids.length} {t('permissions')}</div>
                  </div>
                  <button
                    onClick={() => toggleCategory(perms)}
                    className={`px-3 py-1 rounded-full text-xs ${allSelected ? 'gradient-button' : 'glass-button'}`}
                    style={{ fontWeight: 500 }}
                  >
                    {allSelected ? t('invertSelection') : t('selectAll')}
                  </button>
                </div>
                <div className="space-y-2">
                  {perms.map(p => {
                    const checked = draft.includes(p.id);
                    return (
                      <label key={p.id}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${checked ? 'surface-brand-soft' : 'hover-soft border-border/50'}`}
                        style={{ backdropFilter: 'blur(16px) saturate(160%)' }}>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${checked ? 'border-0' : 'border-2 border-muted-foreground/40'}`}
                          style={checked ? { background: 'var(--brand-500)' } : {}}>
                          {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        </div>
                        <input type="checkbox" checked={checked} onChange={() => togglePerm(p.id)} className="hidden" />
                        <div className="flex-1 min-w-0">
                          <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{language === 'zh' ? p.name : p.nameEn}</div>
                          <div className="text-xs text-muted-foreground truncate">{p.description}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs border" style={{ fontWeight: 600, ...levelBadgeStyle(p.level) }}>{levelLabel(p.level)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Roles list
  return (
    <div className="p-6 h-full overflow-auto">
      <TopBar title={t('rolesTitle')} subtitle={t('rolesSubtitle')} />

      <div className="flex justify-end mb-5">
        <button className="gradient-button rounded-full px-5 py-2 flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />{t('createRole')}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {roles.map(role => {
          const Icon = iconMap[role.icon] || ShieldCheck;
          return (
            <div key={role.id} className="glass-card p-5 group">
              {/* Top accent bar */}
              <div className="h-1.5 rounded-full mb-4" style={{ background: `linear-gradient(90deg, ${role.color}, ${role.color}66)` }} />

              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${role.color}, ${role.color}aa)` }}>
                  <Icon className="w-5 h-5" />
                </div>
                {role.isSystem
                  ? <span className="px-2 py-0.5 rounded-full text-xs border" style={roleKindBadgeStyle('system')}>{t('systemRole')}</span>
                  : <span className="px-2 py-0.5 rounded-full text-xs border" style={roleKindBadgeStyle('custom')}>{t('customRole')}</span>}
              </div>

              <h3 className="mb-1">{language === 'zh' ? role.name : role.nameEn}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{language === 'zh' ? role.description : role.descriptionEn}</p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="glass-soft rounded-xl p-2.5">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5"><Users className="w-3 h-3" />{t('memberCount')}</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{role.memberCount}</div>
                </div>
                <div className="glass-soft rounded-xl p-2.5">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5"><ShieldCheck className="w-3 h-3" />{t('permissionCount')}</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }} className="text-gradient">{role.permissionIds.length}</div>
                </div>
              </div>

              {/* Coverage bar */}
              <div className="mb-4">
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(role.permissionIds.length / permissions.length) * 100}%`, background: `linear-gradient(90deg,${role.color},${role.color}99)` }} />
                </div>
              </div>

              <button
                onClick={() => enterConfig(role.id)}
                className="w-full gradient-button rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4" />{t('configurePermissions')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
