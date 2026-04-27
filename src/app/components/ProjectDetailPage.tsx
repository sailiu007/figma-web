import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import { activities } from '../../mock/data';
import TopBar from './TopBar';
import YamlPage from './YamlPage';
import { Users, Calendar, Tag, GitBranch, ListTodo, Workflow, Rocket, Package, FileText, FlaskConical, Activity, TrendingUp } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, BarChart, Bar } from 'recharts';

export default function ProjectDetailPage() {
  const { language, projects, currentProjectId, projectSubPage } = useAppStore();
  const t = useT(language);
  const current = projects.find(p => p.id === currentProjectId) ?? projects[0];
  if (!current) return null;
  const name = language === 'zh' ? current.name : current.nameEn;

  const trend = Array.from({ length: 14 }).map((_, i) => ({ d: `${i + 1}`, v: 20 + Math.round(Math.sin(i / 2) * 15 + i * 3 + Math.random() * 8), b: 10 + Math.round(Math.random() * 20) }));

  const renderSub = () => {
    switch (projectSubPage) {
      case 'overview':
        return <Overview current={current} t={t} trend={trend} language={language} />;
      case 'issues':
        return <SimpleList icon={ListTodo} title={t('issues')} t={t} items={mockIssues} />;
      case 'code':
        return <SimpleList icon={GitBranch} title={t('code_repo')} t={t} items={mockRepos} />;
      case 'ci':
        return <Pipelines icon={Workflow} title={t('ci')} />;
      case 'cd':
        return <Pipelines icon={Rocket} title={t('cd')} />;
      case 'analysis':
        return <Analysis trend={trend} />;
      case 'apps':
        return <SimpleList icon={ListTodo} title={t('apps')} t={t} items={mockApps} />;
      case 'artifacts':
        return <SimpleList icon={Package} title={t('artifacts')} t={t} items={mockArtifacts} />;
      case 'docs':
        return <SimpleList icon={FileText} title={t('docs')} t={t} items={mockDocs} />;
      case 'tests':
        return <SimpleList icon={FlaskConical} title={t('tests')} t={t} items={mockTests} />;
      case 'yaml':
        return <YamlPage embedded />;
      case 'settings':
        return <ProjectSettings current={current} />;
      default: return null;
    }
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <TopBar title={name} subtitle={current.description} breadcrumb={[t('projects'), name, t(`${projectSubPage === 'settings' ? 'projectSettings' : projectSubPage === 'code' ? 'code_repo' : projectSubPage === 'yaml' ? 'projectYaml' : projectSubPage}` as any)]} />
      <div className="fade-enter" key={projectSubPage}>{renderSub()}</div>
    </div>
  );
}

function Overview({ current, t, trend, language }: any) {
  const metrics = [
    { k: 'progress', v: current.progress + '%', icon: TrendingUp, color: '#8b5cf6,#6366f1' },
    { k: 'members', v: current.members, icon: Users, color: '#22d3ee,#0891b2' },
    { k: 'updated', v: current.updatedAt.split(' ')[0], icon: Calendar, color: '#10b981,#059669' },
    { k: 'tags', v: current.tags.length, icon: Tag, color: '#ec4899,#be185d' },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        {metrics.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.k} className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
                  style={{ background: `linear-gradient(135deg,${m.color.split(',')[0]},${m.color.split(',')[1]})` }}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground" style={{ fontWeight: 500 }}>{t(m.k)}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{m.v}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3>{t('keyMetrics')}</h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400" />Commits</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400" />Builds</span>
            </div>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" stroke="rgba(255,255,255,.4)" fontSize={11} />
                <Tooltip contentStyle={{ background: 'rgba(20,20,40,.95)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 12, color: '#fff' }} />
                <Area type="monotone" dataKey="v" stroke="#a78bfa" strokeWidth={2.5} fill="url(#gv)" />
                <Area type="monotone" dataKey="b" stroke="#22d3ee" strokeWidth={2.5} fill="url(#gb)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />{t('recentActivity')}</h3>
          <div className="space-y-3">
            {activities.slice(0, 6).map(a => (
              <div key={a.id} className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs" style={{ background: 'var(--brand-500)', color: 'oklch(0.99 0 0)', fontWeight: 700 }}>
                  {a.user.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <div><span style={{ fontWeight: 600 }}>{a.user}</span> <span className="text-muted-foreground">{language === 'zh' ? a.action : a.actionEn}</span> <span style={{ fontWeight: 500 }}>{a.target}</span></div>
                  <div className="text-muted-foreground/70 mt-0.5">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SimpleList({ icon: Icon, title, t, items }: any) {
  const { theme } = useAppStore();
  const itemBadgeStyle = (accent: string): React.CSSProperties => theme === 'light'
    ? {
      background: `${accent}14`,
      color: accent,
      borderColor: `${accent}33`,
    }
    : {
      color: accent,
      borderColor: `${accent}66`,
    };
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2"><Icon className="w-4 h-4 text-primary" />{title}</h3>
        <button className="gradient-button rounded-full px-4 py-1.5 text-sm">+ {t('create')}</button>
      </div>
      <div className="space-y-2">
        {items.map((it: any, i: number) => (
          <div key={i} className="row-enter glass-soft rounded-xl p-3 flex items-center gap-3 hover-soft transition-all border border-transparent" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: `linear-gradient(135deg,${it.color},${it.color}aa)` }}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{it.title}</div>
              <div className="text-xs text-muted-foreground truncate">{it.meta}</div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs border" style={itemBadgeStyle(it.color)}>{it.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pipelines({ icon: Icon, title }: any) {
  const { theme } = useAppStore();
  const runs = Array.from({ length: 6 }).map((_, i) => ({
    id: i, name: `#${1024 - i}`, branch: ['main', 'dev', 'feature/auth', 'release/1.2'][i % 4],
    status: ['success', 'running', 'success', 'failed', 'success', 'success'][i],
    duration: `${(2 + Math.random() * 5).toFixed(1)}min`, time: `${i + 1}h ago`
  }));
  return (
    <div className="glass-card p-5">
      <h3 className="mb-4 flex items-center gap-2"><Icon className="w-4 h-4 text-primary" />{title}</h3>
      <div className="space-y-2">
        {runs.map((r, i) => {
          const colors: any = { success: '#10b981', running: '#22d3ee', failed: '#ef4444' };
          return (
            <div key={r.id} className="row-enter glass-soft rounded-xl p-3 flex items-center gap-4" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="w-2 h-12 rounded-full" style={{ background: colors[r.status] }} />
              <div className="flex-1 min-w-0">
                <div style={{ fontWeight: 600 }}>{r.name} <span className="text-xs text-muted-foreground ml-2">on {r.branch}</span></div>
                <div className="text-xs text-muted-foreground">{r.duration} · {r.time}</div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs border" style={{ background: theme === 'light' ? colors[r.status] + '14' : colors[r.status] + '25', color: colors[r.status], borderColor: theme === 'light' ? colors[r.status] + '33' : colors[r.status] + '00', fontWeight: 600 }}>{r.status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Analysis({ trend }: any) {
  return (
    <div className="grid grid-cols-2 gap-5">
      {['代码行数', '圈复杂度', '测试覆盖率', '重复率'].map((title, idx) => (
        <div key={idx} className="glass-card p-5">
          <h4 className="mb-3">{title}</h4>
          <div style={{ height: 160 }}>
            <ResponsiveContainer>
              <BarChart data={trend}>
                <Bar dataKey="v" fill={['#a78bfa', '#22d3ee', '#10b981', '#ec4899'][idx]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectSettings({ current }: any) {
  return (
    <div className="grid grid-cols-2 gap-5">
      <div className="glass-card p-5 space-y-3">
        <h3>基础信息</h3>
        <Field label="名称" value={current.name} />
        <Field label="描述" value={current.description} />
        <Field label="负责人" value={current.owner} />
      </div>
      <div className="glass-card p-5">
        <h3 className="mb-3">危险区域</h3>
        <button className="w-full glass-button rounded-xl py-2.5 text-amber-400 border-amber-400/30">归档项目</button>
        <button className="w-full mt-2 rounded-xl py-2.5 bg-rose-500/15 text-rose-400 border border-rose-400/30">删除项目</button>
      </div>
    </div>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input defaultValue={value} className="glass-input w-full rounded-xl px-3 py-2 mt-1 outline-none" />
    </div>
  );
}

const mockIssues = [
  { title: '用户登录后偶发跳转失败', meta: 'P1 · 张三 · 2天前', status: 'open', color: '#f59e0b' },
  { title: '优化首页加载性能', meta: 'P2 · 李四 · 5天前', status: 'in progress', color: '#8b5cf6' },
  { title: '修复数据导出乱码问题', meta: 'P0 · 王五 · 1天前', status: 'urgent', color: '#ef4444' },
  { title: '增加多语言支持', meta: 'P2 · 赵六 · 1周前', status: 'review', color: '#22d3ee' },
  { title: '添加暗黑模式', meta: 'P3 · 孙七 · 2周前', status: 'done', color: '#10b981' },
];
const mockRepos = [
  { title: 'frontend-web', meta: 'main · last commit 2h ago · 1.2k commits', status: 'active', color: '#8b5cf6' },
  { title: 'backend-api', meta: 'main · last commit 5h ago · 894 commits', status: 'active', color: '#22d3ee' },
  { title: 'mobile-app', meta: 'develop · last commit 1d ago · 421 commits', status: 'active', color: '#10b981' },
  { title: 'infra-terraform', meta: 'main · last commit 3d ago · 67 commits', status: 'archived', color: '#94a3b8' },
];
const mockApps = [
  { title: 'Web Portal', meta: 'production · v2.4.1 · 50k DAU', status: 'healthy', color: '#10b981' },
  { title: 'Admin Console', meta: 'production · v1.8.0 · 1.2k DAU', status: 'healthy', color: '#10b981' },
  { title: 'Mobile iOS', meta: 'app store · v3.0.2 · 30k DAU', status: 'review', color: '#f59e0b' },
];
const mockArtifacts = [
  { title: 'app-v2.4.1.tar.gz', meta: 'docker · 156MB · 2h ago', status: 'latest', color: '#8b5cf6' },
  { title: 'app-v2.4.0.tar.gz', meta: 'docker · 154MB · 1d ago', status: 'stable', color: '#22d3ee' },
  { title: 'app-v2.3.5.tar.gz', meta: 'docker · 152MB · 1w ago', status: 'stable', color: '#22d3ee' },
];
const mockDocs = [
  { title: 'API 接口文档', meta: '王五 · 更新于 2天前 · 42页', status: 'published', color: '#22d3ee' },
  { title: '架构设计', meta: '张三 · 更新于 1周前 · 18页', status: 'published', color: '#22d3ee' },
  { title: '部署手册', meta: '赵六 · 更新于 3天前 · 12页', status: 'draft', color: '#f59e0b' },
];
const mockTests = [
  { title: '登录模块回归测试', meta: '120 用例 · 通过率 98%', status: 'passed', color: '#10b981' },
  { title: '支付流程端到端', meta: '45 用例 · 通过率 89%', status: 'partial', color: '#f59e0b' },
  { title: '权限管理用例', meta: '78 用例 · 通过率 100%', status: 'passed', color: '#10b981' },
];
