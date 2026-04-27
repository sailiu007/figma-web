import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import TopBar from './TopBar';
import { Star, Users, Plus, Filter, FolderKanban, Activity, Archive, ChevronRight, ArrowRight } from 'lucide-react';

export default function ProjectsPage() {
  const { language, theme, projects, setCurrentProject, toggleStar, setCurrentPage, setProjectSubPage } = useAppStore();
  const t = useT(language);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'planning' | 'archived'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    projects.filter(p =>
      (statusFilter === 'all' || p.status === statusFilter) &&
      (!search || p.name.includes(search) || p.nameEn.toLowerCase().includes(search.toLowerCase()))
    ), [projects, statusFilter, search]);

  const stats = [
    { key: 'totalProjects', icon: FolderKanban, value: projects.length, color: '#8b5cf6,#6d28d9' },
    { key: 'activeProjects', icon: Activity, value: projects.filter(p => p.status === 'active').length, color: '#6366f1,#4f46e5' },
    { key: 'archivedProjects', icon: Archive, value: projects.filter(p => p.status === 'archived').length, color: '#7c3aed,#5b21b6' },
    { key: 'totalMembers', icon: Users, value: projects.reduce((s, p) => s + p.members, 0), color: '#a855f7,#7e22ce' },
  ] as const;

  const enterProject = (id: string) => {
    setCurrentProject(id);
    setProjectSubPage('overview');
    setCurrentPage('project-detail');
  };

  const statusBadge = (s: string) => {
    const map: Record<string, React.CSSProperties> = theme === 'light'
      ? {
        active: {
          background: 'oklch(0.92 0.05 160)',
          color: 'oklch(0.46 0.14 160)',
          borderColor: 'oklch(0.78 0.08 160)',
        },
        archived: {
          background: 'oklch(0.93 0.01 255)',
          color: 'oklch(0.5 0.03 255)',
          borderColor: 'oklch(0.8 0.02 255)',
        },
        planning: {
          background: 'oklch(0.95 0.05 90)',
          color: 'oklch(0.54 0.12 88)',
          borderColor: 'oklch(0.82 0.08 90)',
        },
      }
      : {
        active: {
          background: 'oklch(0.70 0.15 155 / 0.18)',
          color: 'oklch(0.78 0.13 155)',
          borderColor: 'oklch(0.70 0.15 155 / 0.32)',
        },
        archived: {
          background: 'oklch(0.68 0.02 255 / 0.18)',
          color: 'oklch(0.78 0.02 255)',
          borderColor: 'oklch(0.72 0.02 255 / 0.28)',
        },
        planning: {
          background: 'oklch(0.78 0.14 75 / 0.18)',
          color: 'oklch(0.84 0.13 75)',
          borderColor: 'oklch(0.78 0.14 75 / 0.30)',
        },
      };
    const dotColor: Record<string, string> = theme === 'light'
      ? {
        active: 'oklch(0.56 0.12 160)',
        archived: 'oklch(0.56 0.03 255)',
        planning: 'oklch(0.62 0.11 88)',
      }
      : {
        active: 'oklch(0.78 0.13 155)',
        archived: 'oklch(0.78 0.02 255)',
        planning: 'oklch(0.84 0.13 75)',
      };
    const labels: Record<string, string> = {
      active: t('statusActive'), archived: t('statusArchived'), planning: t('statusPlanning'),
    };
    return (
      <span className="px-2.5 py-1 rounded-full text-xs border inline-flex items-center gap-1.5" style={{ fontWeight: 600, ...map[s] }}>
        <span aria-hidden="true" style={{ color: dotColor[s] }}>●</span>
        {labels[s]}
      </span>
    );
  };

  return (
    <div className="p-5 h-full overflow-auto">
      <TopBar title={t('projectsTitle')} subtitle={t('projectsSubtitle')} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="glass-card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(135deg, ${s.color.split(',')[0]}, ${s.color.split(',')[1]})` }}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-muted-foreground text-xs" style={{ fontWeight: 500 }}>{t(s.key as any)}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.1 }}>{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-card p-5 rounded-[28px]">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {(['all', 'active', 'planning', 'archived'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3.5 py-1.5 rounded-full text-sm transition-all ${statusFilter === s ? 'gradient-button' : 'glass-button'
                  }`}
                style={{ fontWeight: 500 }}
              >
                {s === 'all' ? t('all') : t(`status${s.charAt(0).toUpperCase() + s.slice(1)}` as any)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('search')}
              className="glass-input rounded-full px-4 py-2 text-sm w-44 outline-none"
            />
            <button className="glass-button rounded-full w-10 h-10 flex items-center justify-center"><Filter className="w-4 h-4" /></button>
            <button className="gradient-button rounded-full px-4 py-2 flex items-center gap-1.5 text-sm">
              <Plus className="w-4 h-4" /> {t('create')}
            </button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground table-head" style={{ fontSize: '.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>
              <th className="py-2.5 px-3 w-8"></th>
              <th className="py-2.5 px-3">{t('name')}</th>
              <th className="py-2.5 px-3">{t('status')}</th>
              <th className="py-2.5 px-3">{t('progress')}</th>
              <th className="py-2.5 px-3">{t('members')}</th>
              <th className="py-2.5 px-3">{t('updated')}</th>
              <th className="py-2.5 px-3 w-24">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr
                key={p.id}
                onClick={() => enterProject(p.id)}
                className="row-enter cursor-pointer transition-all duration-300 table-row"
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <td className="py-3 px-3">
                  <button onClick={e => { e.stopPropagation(); toggleStar(p.id); }}>
                    <Star className={`w-4 h-4 transition-all ${p.starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/50 hover:text-amber-400'}`} />
                  </button>
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md" style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}aa)`, fontWeight: 700 }}>
                      {(language === 'zh' ? p.name : p.nameEn).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate" style={{ fontWeight: 600 }}>{language === 'zh' ? p.name : p.nameEn}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[280px]">{p.description}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3">{statusBadge(p.status)}</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-border/80 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: `linear-gradient(90deg, ${p.color}, ${p.color}cc)` }} />
                    </div>
                    <span className="text-xs text-muted-foreground" style={{ fontWeight: 500 }}>{p.progress}%</span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="flex -space-x-2">
                    {Array.from({ length: Math.min(p.members, 4) }).map((_, i) => (
                      <div key={i} className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-white text-xs"
                        style={{ background: avatarColors[i % avatarColors.length], borderColor: 'rgba(20,20,40,.95)', fontWeight: 600 }}>
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                    {p.members > 4 && (
                      <div className="w-7 h-7 rounded-full border-2 glass-soft flex items-center justify-center text-xs" style={{ borderColor: 'rgba(20,20,40,.95)', fontWeight: 600 }}>
                        +{p.members - 4}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 text-muted-foreground text-xs">{p.updatedAt}</td>
                <td className="py-3 px-3">
                  <button onClick={e => { e.stopPropagation(); enterProject(p.id); }} className="gradient-button rounded-lg px-3 py-1 flex items-center gap-1 text-xs">
                    {t('enterProject')}<ArrowRight className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const avatarColors = ['#8b5cf6', '#22d3ee', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
