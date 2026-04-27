import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import TopBar from './TopBar';
import { ArrowLeft, Briefcase, Bug, Check, Code, Crown, Eye, Languages, Mail, PencilLine, Power, Server, ShieldCheck, UserCog, Users } from 'lucide-react';

const iconMap: Record<string, any> = { Crown, Briefcase, Code, Bug, Server, Eye };

type RoleDraft = {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
};

type UserDraft = {
  name: string;
  nameEn: string;
  email: string;
  title: string;
  titleEn: string;
  team: string;
  teamEn: string;
  status: 'active' | 'invited' | 'suspended';
  preferredLanguage: 'zh' | 'en';
};

export default function RolesPage() {
  const { language, theme, roles, permissions, users, updateRolePermissions, updateRoleDetails, assignUserRoles, updateUser, showToast } = useAppStore();
  const t = useT(language);
  const [searchParams] = useSearchParams();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [draftRoleIds, setDraftRoleIds] = useState<string[]>([]);
  const [roleDraft, setRoleDraft] = useState<RoleDraft | null>(null);
  const [userDraft, setUserDraft] = useState<UserDraft | null>(null);
  const mode = searchParams.get('tab') === 'roles' ? 'roles' : 'users';
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
  const selectedUser = users.find(u => u.id === selectedUserId);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof permissions>();
    permissions.forEach(p => {
      const cat = language === 'zh' ? p.category : p.categoryEn;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    });
    return Array.from(map.entries());
  }, [permissions, language]);

  const roleMembers = useMemo(() => {
    const counts = new Map<string, number>();
    roles.forEach(role => counts.set(role.id, 0));
    users.forEach(user => {
      user.roleIds.forEach(roleId => counts.set(roleId, (counts.get(roleId) ?? 0) + 1));
    });
    return counts;
  }, [roles, users]);

  const totalAssignments = useMemo(
    () => users.reduce((sum, user) => sum + user.roleIds.length, 0),
    [users],
  );
  const pageTitle = t('permissionManagement');
  const pageSubtitle = mode === 'users' ? t('userManagementSubtitle') : t('roleManagementSubtitle');

  const enterConfig = (roleId: string) => {
    const r = roles.find(x => x.id === roleId);
    if (!r) return;
    setSelectedRoleId(roleId);
    setSelectedUserId(null);
    setDraft([...r.permissionIds]);
    setRoleDraft({
      name: r.name,
      nameEn: r.nameEn,
      description: r.description,
      descriptionEn: r.descriptionEn,
    });
  };

  const enterUserAccess = (userId: string) => {
    const user = users.find(item => item.id === userId);
    if (!user) return;
    setSelectedUserId(userId);
    setSelectedRoleId(null);
    setDraftRoleIds([...user.roleIds]);
    setUserDraft({
      name: user.name,
      nameEn: user.nameEn,
      email: user.email,
      title: user.title,
      titleEn: user.titleEn,
      team: user.team,
      teamEn: user.teamEn,
      status: user.status,
      preferredLanguage: user.preferredLanguage,
    });
  };

  const togglePerm = (id: string) =>
    setDraft(d => d.includes(id) ? d.filter(x => x !== id) : [...d, id]);

  const toggleCategory = (catPerms: typeof permissions) => {
    const ids = catPerms.map(p => p.id);
    const allSelected = ids.every(id => draft.includes(id));
    setDraft(d => allSelected ? d.filter(x => !ids.includes(x)) : [...new Set([...d, ...ids])]);
  };

  const save = () => {
    if (!selectedRoleId || !roleDraft) return;
    updateRoleDetails(selectedRoleId, roleDraft);
    updateRolePermissions(selectedRoleId, draft);
    showToast(t('saved'));
  };

  const saveUserRoles = () => {
    if (!selectedUserId || !userDraft) return;
    updateUser(selectedUserId, userDraft);
    assignUserRoles(selectedUserId, draftRoleIds);
    showToast(t('saved'));
  };

  const toggleUserStatus = (userId: string, currentStatus: 'active' | 'invited' | 'suspended') => {
    updateUser(userId, {
      status: currentStatus === 'suspended' ? 'active' : 'suspended',
    });
    showToast(t('saved'));
  };

  const userStatusStyle = (status: 'active' | 'invited' | 'suspended'): React.CSSProperties => {
    if (theme === 'light') {
      return ({
        active: { background: 'oklch(0.95 0.03 140)', color: 'oklch(0.46 0.12 145)', borderColor: 'oklch(0.8 0.07 145)' },
        invited: { background: 'oklch(0.96 0.03 80)', color: 'oklch(0.55 0.11 76)', borderColor: 'oklch(0.84 0.07 76)' },
        suspended: { background: 'oklch(0.96 0.03 25)', color: 'oklch(0.58 0.15 24)', borderColor: 'oklch(0.82 0.07 24)' },
      } as const)[status];
    }
    return ({
      active: { background: 'oklch(0.7 0.12 145 / 0.16)', color: 'oklch(0.82 0.09 145)', borderColor: 'oklch(0.74 0.09 145 / 0.28)' },
      invited: { background: 'oklch(0.8 0.12 78 / 0.14)', color: 'oklch(0.84 0.09 78)', borderColor: 'oklch(0.8 0.1 78 / 0.26)' },
      suspended: { background: 'oklch(0.66 0.14 24 / 0.14)', color: 'oklch(0.82 0.1 24)', borderColor: 'oklch(0.72 0.08 24 / 0.24)' },
    } as const)[status];
  };

  const statusLabel = (status: 'active' | 'invited' | 'suspended') => ({
    active: t('activeUser'),
    invited: t('invitedUser'),
    suspended: t('suspendedUser'),
  } as const)[status];

  const effectivePermissions = useMemo(() => {
    if (!selectedUser) return [];
    const permissionIdSet = new Set(
      roles
        .filter(role => draftRoleIds.includes(role.id))
        .flatMap(role => role.permissionIds),
    );
    return permissions.filter(permission => permissionIdSet.has(permission.id));
  }, [draftRoleIds, permissions, roles, selectedUser]);

  const groupedEffectivePermissions = useMemo(() => {
    const map = new Map<string, typeof permissions>();
    effectivePermissions.forEach(permission => {
      const category = language === 'zh' ? permission.category : permission.categoryEn;
      if (!map.has(category)) {
        map.set(category, []);
      }
      map.get(category)!.push(permission);
    });
    return Array.from(map.entries());
  }, [effectivePermissions, language]);

  const toggleRoleAssignment = (roleId: string) => {
    setDraftRoleIds(current => current.includes(roleId) ? current.filter(id => id !== roleId) : [...current, roleId]);
  };

  // Configuration view
  if (selectedRole) {
    const levelLabel = (lvl: string) => ({ read: t('levelRead'), write: t('levelWrite'), admin: t('levelAdmin') } as any)[lvl];
    const Icon = iconMap[selectedRole.icon] || ShieldCheck;
    const memberUsers = users.filter(user => user.roleIds.includes(selectedRole.id));

    return (
      <div className="p-6 h-full overflow-auto fade-enter">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelectedRoleId(null)} className="glass-button rounded-full w-10 h-10 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground" style={{ fontWeight: 500 }}>{t('permissionManagement')} / {t('roleManagement')}</div>
            <h1 className="text-gradient" style={{ fontSize: '1.6rem', fontWeight: 700 }}>{language === 'zh' ? selectedRole.name : selectedRole.nameEn}</h1>
          </div>
          <button
            onClick={() => {
              setDraft([...selectedRole.permissionIds]);
              setRoleDraft({
                name: selectedRole.name,
                nameEn: selectedRole.nameEn,
                description: selectedRole.description,
                descriptionEn: selectedRole.descriptionEn,
              });
            }}
            className="glass-button rounded-full px-4 py-2 text-sm"
          >
            {t('reset')}
          </button>
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
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{roleMembers.get(selectedRole.id) ?? 0}</div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <div className="text-xs text-muted-foreground">{t('permissionCount')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }} className="text-gradient">{draft.length}/{permissions.length}</div>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 mb-5">
          <div className="mb-4">
            <h3>{t('roleBasics')}</h3>
            <div className="text-sm text-muted-foreground">{t('roleBasicsSubtitle')}</div>
            {selectedRole.isSystem && <div className="text-xs text-muted-foreground mt-2">{t('systemRoleLocked')}</div>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('displayNameZh')} value={roleDraft?.name ?? ''} onChange={(value) => setRoleDraft(current => current ? { ...current, name: value } : current)} disabled={selectedRole.isSystem} />
            <Field label={t('displayNameEn')} value={roleDraft?.nameEn ?? ''} onChange={(value) => setRoleDraft(current => current ? { ...current, nameEn: value } : current)} disabled={selectedRole.isSystem} />
            <Field label={t('roleDescriptionZh')} value={roleDraft?.description ?? ''} onChange={(value) => setRoleDraft(current => current ? { ...current, description: value } : current)} disabled={selectedRole.isSystem} multiline />
            <Field label={t('roleDescriptionEn')} value={roleDraft?.descriptionEn ?? ''} onChange={(value) => setRoleDraft(current => current ? { ...current, descriptionEn: value } : current)} disabled={selectedRole.isSystem} multiline />
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

        <div className="glass-card p-5 mt-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3>{t('userDirectory')}</h3>
              <div className="text-sm text-muted-foreground">{t('memberCount')} · {roleMembers.get(selectedRole.id) ?? 0}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {memberUsers.map(user => (
              <div key={user.id} className="glass-soft rounded-2xl p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${user.color}, ${user.color}aa)` }}>
                  {user.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div style={{ fontWeight: 700 }}>{language === 'zh' ? user.name : user.nameEn}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (selectedUser) {
    const resetUserEditor = () => {
      setDraftRoleIds([...selectedUser.roleIds]);
      setUserDraft({
        name: selectedUser.name,
        nameEn: selectedUser.nameEn,
        email: selectedUser.email,
        title: selectedUser.title,
        titleEn: selectedUser.titleEn,
        team: selectedUser.team,
        teamEn: selectedUser.teamEn,
        status: selectedUser.status,
        preferredLanguage: selectedUser.preferredLanguage,
      });
    };

    return (
      <div className="p-6 h-full overflow-auto fade-enter">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelectedUserId(null)} className="glass-button rounded-full w-10 h-10 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground" style={{ fontWeight: 500 }}>{t('permissionManagement')} / {t('userManagement')}</div>
            <h1 className="text-gradient" style={{ fontSize: '1.6rem', fontWeight: 700 }}>{language === 'zh' ? selectedUser.name : selectedUser.nameEn}</h1>
          </div>
          <button onClick={resetUserEditor} className="glass-button rounded-full px-4 py-2 text-sm">{t('reset')}</button>
          <button onClick={saveUserRoles} className="gradient-button rounded-full px-5 py-2 text-sm">{t('save')}</button>
        </div>

        <div className="glass-card p-5 mb-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${selectedUser.color}, ${selectedUser.color}aa)` }}>
            <Users className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3>{language === 'zh' ? selectedUser.name : selectedUser.nameEn}</h3>
              <span className="px-2 py-0.5 rounded-full text-xs border" style={userStatusStyle(selectedUser.status)}>{statusLabel(selectedUser.status)}</span>
            </div>
            <div className="text-sm text-muted-foreground flex flex-wrap gap-3">
              <span>{language === 'zh' ? selectedUser.title : selectedUser.titleEn}</span>
              <span>·</span>
              <span>{language === 'zh' ? selectedUser.team : selectedUser.teamEn}</span>
              <span>·</span>
              <span>{selectedUser.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-6 px-4">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">{t('assignedRoles')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{draftRoleIds.length}</div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <div className="text-xs text-muted-foreground">{t('effectivePermissions')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }} className="text-gradient">{effectivePermissions.length}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-5">
            <div className="mb-4">
              <h3>{t('editUser')}</h3>
              <div className="text-sm text-muted-foreground">{t('userTableHint')}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('displayNameZh')} value={userDraft?.name ?? ''} onChange={(value) => setUserDraft(current => current ? { ...current, name: value } : current)} />
              <Field label={t('displayNameEn')} value={userDraft?.nameEn ?? ''} onChange={(value) => setUserDraft(current => current ? { ...current, nameEn: value } : current)} />
              <Field label={t('email')} value={userDraft?.email ?? ''} onChange={(value) => setUserDraft(current => current ? { ...current, email: value } : current)} />
              <Field label={t('preferredLanguage')} value={userDraft?.preferredLanguage ?? 'zh'} onChange={(value) => setUserDraft(current => current ? { ...current, preferredLanguage: value as 'zh' | 'en' } : current)} as="select" options={[{ label: '中文', value: 'zh' }, { label: 'English', value: 'en' }]} icon={Languages} />
              <Field label={t('titleZh')} value={userDraft?.title ?? ''} onChange={(value) => setUserDraft(current => current ? { ...current, title: value } : current)} />
              <Field label={t('titleEn')} value={userDraft?.titleEn ?? ''} onChange={(value) => setUserDraft(current => current ? { ...current, titleEn: value } : current)} />
              <Field label={t('teamZh')} value={userDraft?.team ?? ''} onChange={(value) => setUserDraft(current => current ? { ...current, team: value } : current)} />
              <Field label={t('teamEn')} value={userDraft?.teamEn ?? ''} onChange={(value) => setUserDraft(current => current ? { ...current, teamEn: value } : current)} />
              <Field label={t('accountStatus')} value={userDraft?.status ?? 'active'} onChange={(value) => setUserDraft(current => current ? { ...current, status: value as 'active' | 'invited' | 'suspended' } : current)} as="select" options={[{ label: t('activeUser'), value: 'active' }, { label: t('invitedUser'), value: 'invited' }, { label: t('suspendedUser'), value: 'suspended' }]} icon={Power} />
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3>{t('roleAssignment')}</h3>
                <div className="text-sm text-muted-foreground">{t('manageUserAccess')}</div>
              </div>
            </div>
            <div className="space-y-3">
              {roles.map(role => {
                const Icon = iconMap[role.icon] || ShieldCheck;
                const checked = draftRoleIds.includes(role.id);
                return (
                  <label key={role.id} className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer border transition-all ${checked ? 'surface-brand-soft' : 'hover-soft border-border/50'}`}>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${checked ? 'border-0' : 'border-2 border-muted-foreground/40'}`} style={checked ? { background: 'var(--brand-500)' } : {}}>
                      {checked && <Check className="w-3.5 h-3.5" style={{ color: 'var(--primary-foreground)' }} strokeWidth={3} />}
                    </div>
                    <input type="checkbox" checked={checked} onChange={() => toggleRoleAssignment(role.id)} className="hidden" />
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${role.color}, ${role.color}aa)` }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <strong>{language === 'zh' ? role.name : role.nameEn}</strong>
                        <span className="px-2 py-0.5 rounded-full text-xs border" style={roleKindBadgeStyle(role.isSystem ? 'system' : 'custom')}>
                          {role.isSystem ? t('systemRole') : t('customRole')}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{language === 'zh' ? role.description : role.descriptionEn}</div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{role.permissionIds.length} {t('permissions')}</div>
                      <div>{roleMembers.get(role.id) ?? 0} {t('memberCount')}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3>{t('effectivePermissions')}</h3>
                <div className="text-sm text-muted-foreground">{t('rolesSubtitle')}</div>
              </div>
            </div>
            <div className="space-y-4">
              {groupedEffectivePermissions.map(([category, perms]) => (
                <div key={category} className="glass-soft rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <strong>{category}</strong>
                    <span className="text-xs text-muted-foreground">{perms.length} {t('permissions')}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {perms.map(permission => (
                      <span key={permission.id} className="px-2.5 py-1 rounded-full text-xs border" style={{ fontWeight: 600, ...levelBadgeStyle(permission.level) }}>
                        {language === 'zh' ? permission.name : permission.nameEn}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {groupedEffectivePermissions.length === 0 && (
                <div className="glass-soft rounded-2xl p-6 text-sm text-muted-foreground text-center">{t('permissions')} 0</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Roles list
  return (
    <div className="p-6 h-full overflow-auto">
      <TopBar title={pageTitle} subtitle={pageSubtitle} />

      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="glass-card p-5">
          <div className="text-xs text-muted-foreground mb-1">{t('roleCatalog')}</div>
          <div className="text-gradient" style={{ fontSize: '1.6rem', fontWeight: 700 }}>{roles.length}</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-muted-foreground mb-1">{t('userCount')}</div>
          <div className="text-gradient" style={{ fontSize: '1.6rem', fontWeight: 700 }}>{users.length}</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-muted-foreground mb-1">{t('permissions')}</div>
          <div className="text-gradient" style={{ fontSize: '1.6rem', fontWeight: 700 }}>{permissions.length}</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-muted-foreground mb-1">{t('roleCoverage')}</div>
          <div className="text-gradient" style={{ fontSize: '1.6rem', fontWeight: 700 }}>{totalAssignments}</div>
        </div>
      </div>

      {mode === 'roles' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3>{t('roleCatalog')}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {roles.map(role => {
              const Icon = iconMap[role.icon] || ShieldCheck;
              return (
                <div key={role.id} className="glass-card p-5 group">
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
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{roleMembers.get(role.id) ?? 0}</div>
                    </div>
                    <div className="glass-soft rounded-xl p-2.5">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5"><ShieldCheck className="w-3 h-3" />{t('permissionCount')}</div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }} className="text-gradient">{role.permissionIds.length}</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="h-1.5 rounded-full bg-border overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(role.permissionIds.length / permissions.length) * 100}%`, background: `linear-gradient(90deg,${role.color},${role.color}99)` }} />
                    </div>
                  </div>

                  <button
                    onClick={() => enterConfig(role.id)}
                    className="w-full gradient-button rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm">
                    <PencilLine className="w-4 h-4" />{t('editRole')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <UserCog className="w-4 h-4 text-primary" />
            <h3>{t('userDirectory')}</h3>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3>{t('userManagement')}</h3>
                <div className="text-sm text-muted-foreground">{t('userTableHint')}</div>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground table-head" style={{ fontSize: '.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                    <th className="py-3 pr-4">{t('name')}</th>
                    <th className="py-3 pr-4">{t('email')}</th>
                    <th className="py-3 pr-4">{t('assignedRoles')}</th>
                    <th className="py-3 pr-4">{t('preferredLanguage')}</th>
                    <th className="py-3 pr-4">{t('accountStatus')}</th>
                    <th className="py-3">{t('adminControls')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => {
                    const assignedRoles = roles.filter(role => user.roleIds.includes(role.id));
                    return (
                      <tr key={user.id} className="table-row align-top">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3 min-w-[240px]">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0" style={{ background: `linear-gradient(135deg, ${user.color}, ${user.color}aa)` }}>
                              {user.name.slice(0, 1)}
                            </div>
                            <div className="min-w-0">
                              <div style={{ fontWeight: 700 }}>{language === 'zh' ? user.name : user.nameEn}</div>
                              <div className="text-xs text-muted-foreground truncate">{language === 'zh' ? user.title : user.titleEn} · {language === 'zh' ? user.team : user.teamEn}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-muted-foreground">{user.email}</td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap gap-2 max-w-[320px]">
                            {assignedRoles.map(role => (
                              <span key={role.id} className="px-2.5 py-1 rounded-full text-xs border" style={roleKindBadgeStyle(role.isSystem ? 'system' : 'custom')}>
                                {language === 'zh' ? role.name : role.nameEn}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <span className="px-2.5 py-1 rounded-full text-xs border glass-soft inline-flex items-center gap-1.5">
                            <Languages className="w-3.5 h-3.5" />
                            {user.preferredLanguage === 'zh' ? '中文' : 'EN'}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <span className="px-2 py-0.5 rounded-full text-xs border" style={userStatusStyle(user.status)}>{statusLabel(user.status)}</span>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => enterUserAccess(user.id)} className="glass-button rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
                              <PencilLine className="w-3.5 h-3.5" />
                              {t('editUser')}
                            </button>
                            <button onClick={() => toggleUserStatus(user.id, user.status)} className="gradient-button rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
                              <Power className="w-3.5 h-3.5" />
                              {user.status === 'suspended' ? t('enableUser') : t('disableUser')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  multiline?: boolean;
  as?: 'input' | 'select';
  options?: Array<{ label: string; value: string }>;
  icon?: React.ComponentType<{ className?: string }>;
};

function Field({ label, value, onChange, disabled, multiline = false, as = 'input', options = [], icon: Icon }: FieldProps) {
  return (
    <label className={`flex flex-col gap-2 ${multiline ? 'col-span-1' : ''}`}>
      <span className="text-xs text-muted-foreground" style={{ fontWeight: 600 }}>{label}</span>
      <div className="relative">
        {Icon && <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
        {as === 'select' ? (
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className={`glass-input w-full rounded-2xl ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 outline-none`}
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : multiline ? (
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            rows={4}
            className="glass-input w-full rounded-2xl px-4 py-3 outline-none resize-none"
          />
        ) : (
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className={`glass-input w-full rounded-2xl ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 outline-none`}
          />
        )}
      </div>
    </label>
  );
}
