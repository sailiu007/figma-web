import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import TopBar from './TopBar';
import YamlPage from './YamlPage';
import type { Credential } from '../../types';
import { FileCode2, BookOpen, Clock, Plus, Trash2, ChevronDown, ChevronRight, Play, Pause, Key, Eye, EyeOff, Copy, Search, ChevronLeft } from 'lucide-react';

type Tab = 'templates' | 'dict' | 'credentials' | 'scheduled';

export default function SystemSettingsPage() {
  const { language } = useAppStore();
  const t = useT(language);
  const [tab, setTab] = useState<Tab>('templates');

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'templates', label: t('templateConfig'), icon: FileCode2 },
    { id: 'dict', label: t('dataDictionary'), icon: BookOpen },
    { id: 'credentials', label: t('credentials'), icon: Key },
    { id: 'scheduled', label: t('scheduledTasks'), icon: Clock },
  ];

  return (
    <div className="p-6 h-full overflow-hidden flex flex-col">
      <TopBar title={t('systemSettings')} />
      <div className="grid grid-cols-[240px_1fr] gap-5 flex-1 min-h-0">
        <div className="glass-card p-3 self-start rounded-[26px]">
          {tabs.map(tb => {
            const Icon = tb.icon;
            const active = tab === tb.id;
            return (
              <button key={tb.id} onClick={() => setTab(tb.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-left transition-all border ${active ? 'surface-brand-soft' : 'text-muted-foreground border-transparent hover-soft'}`}>
                <Icon className="w-4 h-4" />
                <span className="text-sm" style={{ fontWeight: active ? 700 : 500 }}>{tb.label}</span>
              </button>
            );
          })}
        </div>

        <div className="overflow-auto pr-1 fade-enter min-h-0" key={tab}>
          {tab === 'templates' && <YamlPage embedded />}
          {tab === 'dict' && <DataDictPanel />}
          {tab === 'credentials' && <CredentialsPanel />}
          {tab === 'scheduled' && <ScheduledTasksPanel />}
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 pt-3">
      <span className="text-xs text-muted-foreground">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total}</span>
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="glass-button rounded-lg w-8 h-8 flex items-center justify-center disabled:opacity-40"><ChevronLeft className="w-3.5 h-3.5" /></button>
      <span className="text-xs" style={{ fontWeight: 600 }}>{page} / {pages}</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="glass-button rounded-lg w-8 h-8 flex items-center justify-center disabled:opacity-40"><ChevronRight className="w-3.5 h-3.5" /></button>
    </div>
  );
}

function CredentialsPanel() {
  const { language, theme, credentials, addCredential, removeCredential, showToast } = useAppStore();
  const t = useT(language);
  const [showAdd, setShowAdd] = useState(false);
  const [reveal, setReveal] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<Partial<Credential>>({ type: 'api_key', scope: '全局' });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(() =>
    credentials.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.scope.includes(q)),
    [credentials, q]);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const submit = () => {
    if (!form.name || !form.secret) return;
    addCredential({
      id: String(Date.now()),
      name: form.name,
      type: form.type as any,
      username: form.username,
      secret: form.secret,
      scope: form.scope || '全局',
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setShowAdd(false); setForm({ type: 'api_key', scope: '全局' }); showToast(t('added'));
  };

  const typeAccent: Record<string, string> = {
    api_key: 'oklch(0.61 0.19 282)',
    oauth: 'oklch(0.74 0.11 244)',
    ssh: 'oklch(0.70 0.15 155)',
    password: 'oklch(0.78 0.14 75)',
    token: 'oklch(0.50 0.18 248)',
  };
  const typeBadgeStyle = (accent: string): React.CSSProperties => theme === 'light'
    ? {
      background: accent.replace(')', ' / 0.10)'),
      color: accent.replace(/oklch\(([^ ]+) ([^ ]+) ([^)]+)\)/, 'oklch(0.52 $2 $3)'),
      borderColor: accent.replace(')', ' / 0.20)'),
    }
    : {
      background: accent.replace(')', ' / 0.18)'),
      color: accent,
      borderColor: accent.replace(')', ' / 0.40)'),
    };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="flex items-center gap-2"><Key className="w-4 h-4 text-brand" />{t('credentials')}</h3>
          <p className="text-xs text-muted-foreground mt-1">{filtered.length} {t('credentials')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-soft rounded-full px-3 py-1.5 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder={t('search')} className="bg-transparent outline-none text-sm w-40" />
          </div>
          <button onClick={() => setShowAdd(s => !s)} className="brand-button rounded-full px-4 py-2 flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" />{t('addCredential')}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="pop-enter glass-soft rounded-2xl p-4 mb-4 grid grid-cols-2 gap-3">
          <input placeholder={t('name')} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="glass-input rounded-lg px-3 py-2 outline-none" />
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })} className="glass-input rounded-lg px-3 py-2 outline-none">
            {['api_key', 'oauth', 'ssh', 'password', 'token'].map(x => <option key={x} value={x} style={{ background: 'oklch(0.20 0.04 245)' }}>{x}</option>)}
          </select>
          <input placeholder={t('credentialScope')} value={form.scope || ''} onChange={e => setForm({ ...form, scope: e.target.value })} className="glass-input rounded-lg px-3 py-2 outline-none" />
          <input placeholder="username (optional)" value={form.username || ''} onChange={e => setForm({ ...form, username: e.target.value })} className="glass-input rounded-lg px-3 py-2 outline-none" />
          <input placeholder={t('secretValue')} value={form.secret || ''} onChange={e => setForm({ ...form, secret: e.target.value })} className="glass-input rounded-lg px-3 py-2 outline-none col-span-2 mono" />
          <div className="col-span-2 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="glass-button rounded-full px-4 py-1.5 text-sm">{t('cancel')}</button>
            <button onClick={submit} className="brand-button rounded-full px-4 py-1.5 text-sm">{t('save')}</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {paged.map((c, i) => {
          const open = reveal.has(c.id);
          const accent = typeAccent[c.type];
          return (
            <div key={c.id} className="row-enter glass-soft rounded-xl p-3 flex items-center gap-3" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: accent.replace(')', ' / 0.18)'), color: accent }}>
                <Key className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs border" style={typeBadgeStyle(accent)}>{c.type}</span>
                  <span className="text-xs text-muted-foreground">· {c.scope}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate mono">
                  {open ? c.secret : '••••••••' + c.secret.slice(-4)}
                </div>
              </div>
              <button onClick={() => setReveal(s => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })} className="glass-button rounded-lg w-8 h-8 flex items-center justify-center">
                {open ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(c.secret); showToast(t('copied')); }} className="glass-button rounded-lg w-8 h-8 flex items-center justify-center">
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { removeCredential(c.id); showToast(t('deleted')); }} className="rounded-lg w-8 h-8 flex items-center justify-center" style={{ background: 'oklch(0.62 0.22 25 / 0.15)', color: 'oklch(0.7 0.2 25)' }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
        {paged.length === 0 && <div className="glass-soft rounded-xl p-8 text-center text-sm text-muted-foreground">No credentials</div>}
      </div>

      <Pagination page={page} total={filtered.length} pageSize={pageSize} onPage={setPage} />
    </div>
  );
}

function DataDictPanel() {
  const { language, dataDicts, addDictItem, removeDictItem, showToast } = useAppStore();
  const t = useT(language);
  const [openId, setOpenId] = useState<string | null>(dataDicts[0]?.id ?? null);
  const [draft, setDraft] = useState<{ code: string; label: string; labelEn: string }>({ code: '', label: '', labelEn: '' });
  const [pageMap, setPageMap] = useState<Record<string, number>>({});
  const [searchMap, setSearchMap] = useState<Record<string, string>>({});
  const pageSize = 10;

  const submit = (dictId: string) => {
    if (!draft.code || !draft.label) return;
    addDictItem(dictId, draft);
    setDraft({ code: '', label: '', labelEn: '' }); showToast(t('added'));
  };

  return (
    <div className="space-y-3">
      {dataDicts.map(d => {
        const open = openId === d.id;
        const q = searchMap[d.id] || '';
        const filtered = d.items.filter(it => !q || it.code.includes(q) || it.label.includes(q) || it.labelEn.toLowerCase().includes(q.toLowerCase()));
        const page = pageMap[d.id] || 1;
        const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
        return (
          <div key={d.id} className="glass-card p-5">
            <button onClick={() => setOpenId(open ? null : d.id)} className="w-full flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 surface-brand-soft">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span style={{ fontWeight: 600 }}>{language === 'zh' ? d.name : d.nameEn}</span>
                  <span className="text-xs text-muted-foreground mono">{d.code}</span>
                </div>
                <div className="text-xs text-muted-foreground">{d.description} · {d.items.length} {t('dictCount')}</div>
              </div>
              {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {open && (
              <div className="pop-enter mt-4 space-y-2">
                <div className="glass-soft rounded-full px-3 py-1.5 flex items-center gap-2 mb-2">
                  <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  <input value={q} onChange={e => { setSearchMap({ ...searchMap, [d.id]: e.target.value }); setPageMap({ ...pageMap, [d.id]: 1 }); }} placeholder={t('search')} className="bg-transparent outline-none text-sm flex-1" />
                </div>
                {paged.map((it, i) => (
                  <div key={it.code} className="glass-soft rounded-lg px-3 py-2 flex items-center gap-3 row-enter" style={{ animationDelay: `${i * 15}ms` }}>
                    <span className="px-2 py-0.5 rounded-md text-xs mono surface-brand-soft">{it.code}</span>
                    <span className="flex-1 text-sm">{language === 'zh' ? it.label : it.labelEn}</span>
                    <span className="text-xs text-muted-foreground">{language === 'zh' ? it.labelEn : it.label}</span>
                    <button onClick={() => { removeDictItem(d.id, it.code); showToast(t('deleted')); }} className="rounded-md w-7 h-7 flex items-center justify-center" style={{ background: 'oklch(0.62 0.22 25 / 0.15)', color: 'oklch(0.7 0.2 25)' }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <Pagination page={page} total={filtered.length} pageSize={pageSize} onPage={(p) => setPageMap({ ...pageMap, [d.id]: p })} />
                <div className="grid grid-cols-[120px_1fr_1fr_auto] gap-2 mt-3">
                  <input placeholder={t('code')} value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value })} className="glass-input rounded-lg px-3 py-1.5 text-sm outline-none mono" />
                  <input placeholder="中文" value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} className="glass-input rounded-lg px-3 py-1.5 text-sm outline-none" />
                  <input placeholder="English" value={draft.labelEn} onChange={e => setDraft({ ...draft, labelEn: e.target.value })} className="glass-input rounded-lg px-3 py-1.5 text-sm outline-none" />
                  <button onClick={() => submit(d.id)} className="brand-button rounded-lg px-4 text-sm flex items-center gap-1"><Plus className="w-3.5 h-3.5" />{t('add')}</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface SchedTask {
  id: string;
  name: string;
  cron: string;
  target: string;
  enabled: boolean;
  lastRun: string;
  status: 'success' | 'failed' | 'idle';
}

const initialTasks: SchedTask[] = [
  { id: 't1', name: '每日数据备份', cron: '0 2 * * *', target: 'backup-service', enabled: true, lastRun: '2026-04-27 02:00', status: 'success' },
  { id: 't2', name: '清理临时文件', cron: '0 */6 * * *', target: 'cleanup-job', enabled: true, lastRun: '2026-04-27 06:00', status: 'success' },
  { id: 't3', name: '周报生成', cron: '0 9 * * 1', target: 'report-generator', enabled: false, lastRun: '2026-04-21 09:00', status: 'idle' },
  { id: 't4', name: '同步用户中心', cron: '*/15 * * * *', target: 'user-sync', enabled: true, lastRun: '2026-04-27 14:45', status: 'failed' },
];

function ScheduledTasksPanel() {
  const { theme, showToast } = useAppStore();
  const [tasks, setTasks] = useState<SchedTask[]>(initialTasks);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Partial<SchedTask>>({ enabled: true, status: 'idle' });

  const toggle = (id: string) => setTasks(ts => ts.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  const remove = (id: string) => { setTasks(ts => ts.filter(t => t.id !== id)); showToast('已删除'); };
  const add = () => {
    if (!form.name || !form.cron) return;
    setTasks(ts => [...ts, { id: String(Date.now()), name: form.name!, cron: form.cron!, target: form.target || '-', enabled: true, lastRun: '-', status: 'idle' }]);
    setShowAdd(false); setForm({ enabled: true, status: 'idle' }); showToast('已添加');
  };

  const statusColor: Record<string, string> = {
    success: 'oklch(0.70 0.15 155)',
    failed: 'oklch(0.62 0.22 25)',
    idle: 'oklch(0.65 0.02 240)',
  };
  const statusBadgeStyle = (accent: string): React.CSSProperties => theme === 'light'
    ? {
      background: accent.replace(')', ' / 0.10)'),
      color: accent.replace(/oklch\(([^ ]+) ([^ ]+) ([^)]+)\)/, 'oklch(0.52 $2 $3)'),
      borderColor: accent.replace(')', ' / 0.20)'),
    }
    : {
      background: accent.replace(')', ' / 0.18)'),
      color: accent,
      borderColor: accent.replace(')', ' / 0.40)'),
    };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="flex items-center gap-2"><Clock className="w-4 h-4 text-brand" />定时任务</h3>
          <p className="text-xs text-muted-foreground mt-1">{tasks.length} 个任务 · {tasks.filter(t => t.enabled).length} 已启用</p>
        </div>
        <button onClick={() => setShowAdd(s => !s)} className="brand-button rounded-full px-4 py-2 flex items-center gap-1.5 text-sm">
          <Plus className="w-4 h-4" />新建任务
        </button>
      </div>

      {showAdd && (
        <div className="pop-enter glass-soft rounded-2xl p-4 mb-4 grid grid-cols-2 gap-3">
          <input placeholder="任务名称" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="glass-input rounded-lg px-3 py-2 outline-none" />
          <input placeholder="目标服务" value={form.target || ''} onChange={e => setForm({ ...form, target: e.target.value })} className="glass-input rounded-lg px-3 py-2 outline-none" />
          <input placeholder="Cron 表达式 (例: 0 2 * * *)" value={form.cron || ''} onChange={e => setForm({ ...form, cron: e.target.value })} className="glass-input rounded-lg px-3 py-2 outline-none col-span-2 mono" />
          <div className="col-span-2 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="glass-button rounded-full px-4 py-1.5 text-sm">取消</button>
            <button onClick={add} className="brand-button rounded-full px-4 py-1.5 text-sm">保存</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {tasks.map((task, i) => (
          <div key={task.id} className="row-enter glass-soft rounded-xl p-3 flex items-center gap-3" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: statusColor[task.status].replace(')', ' / 0.2)'), color: statusColor[task.status] }}>
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span style={{ fontWeight: 600 }}>{task.name}</span>
                <span className="px-2 py-0.5 rounded-full text-xs border" style={statusBadgeStyle(statusColor[task.status])}>{task.status}</span>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                <span className="mono">{task.cron}</span> · {task.target} · 上次执行: {task.lastRun}
              </div>
            </div>
            <button onClick={() => toggle(task.id)} title={task.enabled ? '暂停' : '启用'} className="rounded-lg w-8 h-8 flex items-center justify-center" style={task.enabled ? { background: 'oklch(0.70 0.15 155 / 0.18)', color: 'oklch(0.75 0.15 155)' } : {}}>
              {task.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => remove(task.id)} className="rounded-lg w-8 h-8 flex items-center justify-center" style={{ background: 'oklch(0.62 0.22 25 / 0.15)', color: 'oklch(0.7 0.2 25)' }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
