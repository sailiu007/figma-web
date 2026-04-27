import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import { activities } from '../../mock/data';
import TopBar from './TopBar';
import { FolderKanban, Users, ShieldCheck, FileCode2, TrendingUp, ArrowRight, Sparkles } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, RadialBarChart, RadialBar } from 'recharts';

export default function DashboardPage() {
  const { language, projects, roles, permissions, setCurrentPage } = useAppStore();
  const t = useT(language);
  const axisStroke = 'var(--muted-foreground)';
  const tooltipStyle = {
    background: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    color: 'var(--foreground)',
  };

  const trend = Array.from({ length: 12 }).map((_, i) => ({
    m: `${i + 1}月`,
    v: 30 + Math.round(Math.sin(i / 2) * 20 + i * 4 + Math.random() * 10),
  }));

  const cards = [
    { key: 'projects', icon: FolderKanban, value: projects.length, color: '#8b5cf6,#6d28d9', page: 'projects' },
    { key: 'totalMembers', icon: Users, value: projects.reduce((s, p) => s + p.members, 0), color: '#7c3aed,#4f46e5', page: 'projects' },
    { key: 'roles', icon: ShieldCheck, value: roles.length, color: '#6366f1,#4f46e5', page: 'roles' },
    { key: 'permissions', icon: FileCode2, value: permissions.length, color: '#a855f7,#7e22ce', page: 'roles' },
  ] as const;

  const radialData = [
    { name: 'Active', value: 80, fill: '#8b5cf6' },
    { name: 'Pipeline', value: 65, fill: '#6366f1' },
    { name: 'Coverage', value: 92, fill: '#a855f7' },
  ];

  return (
    <div className="p-5 h-full overflow-auto">
      <TopBar title={t('dashboard')} subtitle={t('appTagline')} />

      <div className="glass-strong rounded-[30px] p-6 mb-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, oklch(0.61 0.19 282), transparent 70%)' }} />
        <div className="absolute -bottom-8 left-1/3 w-64 h-64 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, oklch(0.74 0.11 244), transparent 72%)' }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'var(--brand-500)', color: 'oklch(0.99 0 0)' }}>
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-2 text-[11px] tracking-[0.18em] uppercase glass-soft">
                <TrendingUp className="w-3.5 h-3.5 text-brand" />
                {language === 'zh' ? '今日概览' : 'Today Overview'}
              </div>
              <h2 className="text-gradient">{language === 'zh' ? '欢迎回来，Alex' : 'Welcome back, Alex'}</h2>
              <p className="text-muted-foreground text-sm mt-1">{language === 'zh' ? '今天有 3 个待办、2 个流水线运行中，整体交付节奏稳定。' : 'You have 3 todos and 2 active pipelines, with delivery health staying stable.'}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 lg:min-w-[420px]">
            {radialData.map(item => (
              <div key={item.name} className="glass-soft rounded-[20px] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">{item.name}</div>
                <div className="text-[1.35rem]" style={{ fontWeight: 700, color: item.fill }}>{item.value}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <button key={c.key} onClick={() => setCurrentPage(c.page as any)} className="glass-card p-5 text-left rounded-[26px]">
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: `linear-gradient(135deg,${c.color.split(',')[0]},${c.color.split(',')[1]})` }}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-muted-foreground text-xs" style={{ fontWeight: 500 }}>{t(c.key as any)}</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 700 }}>{c.value}</div>
              <div className="text-xs text-emerald-400 flex items-center gap-1 mt-1"><TrendingUp className="w-3 h-3" />+12.4%</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 glass-card p-5 rounded-[26px]">
          <h3 className="mb-3">{t('keyMetrics')}</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="gd1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.61 0.19 282)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="oklch(0.61 0.19 282)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="m" stroke={axisStroke} fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="v" stroke="oklch(0.72 0.15 275)" strokeWidth={2.5} fill="url(#gd1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-5 rounded-[26px]">
          <h3 className="mb-3">{t('recentActivity')}</h3>
          <div className="space-y-3 max-h-[260px] overflow-auto">
            {activities.map(a => (
              <div key={a.id} className="flex items-start gap-3 rounded-[18px] px-3 py-2 hover-soft border border-transparent">
                <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm" style={{ background: 'var(--brand-500)', color: 'oklch(0.99 0 0)', fontWeight: 700 }}>
                  {a.user.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    <span style={{ fontWeight: 600 }}>{a.user}</span>{' '}
                    <span className="text-muted-foreground">{language === 'zh' ? a.action : a.actionEn}</span>{' '}
                    <span style={{ fontWeight: 500 }}>{a.target}</span>
                  </div>
                  <div className="text-xs text-muted-foreground/70">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
