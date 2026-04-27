import { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import TopBar from './TopBar';
import type { YamlNode, YamlNodeType } from '../../types';
import { Plus, Trash2, ChevronRight, ChevronDown, Download, Copy, FileCode2, Wand2, Braces, List as ListIcon, Type, Hash, ToggleLeft, MessageSquare } from 'lucide-react';

const uid = () => Math.random().toString(36).slice(2, 10);

const initialTree: YamlNode[] = [
  {
    id: uid(), key: 'application', type: 'object', description: '应用基础信息', children: [
      { id: uid(), key: 'name', type: 'string', value: 'my-app', description: '应用名称' },
      { id: uid(), key: 'version', type: 'string', value: '1.0.0', description: '语义化版本号' },
      { id: uid(), key: 'port', type: 'number', value: 8080, description: '监听端口' },
      { id: uid(), key: 'debug', type: 'boolean', value: false },
    ]
  },
  {
    id: uid(), key: 'database', type: 'object', description: '数据库连接配置', children: [
      { id: uid(), key: 'host', type: 'string', value: 'localhost' },
      { id: uid(), key: 'port', type: 'number', value: 5432 },
    ]
  },
];

const typeOptions: { type: YamlNodeType; icon: any; key: any; color: string }[] = [
  { type: 'object', icon: Braces, key: 'typeObject', color: 'oklch(0.61 0.19 282)' },
  { type: 'list', icon: ListIcon, key: 'typeList', color: 'oklch(0.74 0.11 244)' },
  { type: 'string', icon: Type, key: 'typeString', color: 'oklch(0.70 0.15 155)' },
  { type: 'number', icon: Hash, key: 'typeNumber', color: 'oklch(0.78 0.14 75)' },
  { type: 'boolean', icon: ToggleLeft, key: 'typeBoolean', color: 'oklch(0.50 0.20 296)' },
];

function indent(n: number) { return ' '.repeat(n); }

function formatScalar(node: YamlNode): string {
  if (node.type === 'number') {
    const n = Number(node.value);
    return Number.isFinite(n) ? String(n) : '0';
  }
  if (node.type === 'boolean') return String(node.value === true || node.value === 'true');
  const s = node.value == null ? '' : String(node.value);
  if (s === '' || /[:#&*!|>'"%@`,\[\]{}\n]/.test(s) || /^\s|\s$/.test(s)) return JSON.stringify(s);
  return s;
}

function emitNodes(nodes: YamlNode[], depth: number, asListItems = false): string[] {
  const out: string[] = [];
  for (const n of nodes) {
    if (!asListItems && !n.key) continue;
    const pad = indent(depth * 2);
    if (n.description) out.push(`${pad}# ${n.description.replace(/\n/g, ' ')}`);

    const keyPart = asListItems ? '-' : `${n.key}:`;
    if (n.type === 'object') {
      const children = n.children || [];
      if (children.length === 0) {
        out.push(`${pad}${keyPart} {}`);
      } else if (asListItems) {
        const inner = emitNodes(children, depth + 1);
        if (inner.length) {
          const first = inner[0].replace(indent((depth + 1) * 2), `${pad}- `);
          out.push(first);
          for (let i = 1; i < inner.length; i++) out.push(inner[i]);
        }
      } else {
        out.push(`${pad}${keyPart}`);
        out.push(...emitNodes(children, depth + 1));
      }
    } else if (n.type === 'list') {
      const children = n.children || [];
      if (children.length === 0) out.push(`${pad}${keyPart} []`);
      else {
        if (!asListItems) out.push(`${pad}${keyPart}`);
        out.push(...emitNodes(children, depth, true));
      }
    } else {
      const v = formatScalar(n);
      if (asListItems) out.push(`${pad}- ${v}`);
      else out.push(`${pad}${keyPart} ${v}`);
    }
  }
  return out;
}

function highlightYaml(src: string): string {
  return src
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^(\s*)(#.*)$/gm, '$1<span class="ytok-comment">$2</span>')
    .replace(/^(\s*)([\w-]+)(:)/gm, '$1<span class="ytok-key">$2</span><span class="ytok-punct">$3</span>')
    .replace(/:\s*('.*?'|".*?")/g, ': <span class="ytok-str">$1</span>')
    .replace(/:\s*(true|false|null)\b/g, ': <span class="ytok-bool">$1</span>')
    .replace(/:\s*(-?\d+\.?\d*)\b/g, ': <span class="ytok-num">$1</span>')
    .replace(/^(\s*-)\s/gm, '<span class="ytok-list">$1</span> ');
}

export default function YamlPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { language, showToast, theme } = useAppStore();
  const t = useT(language);
  const [tree, setTree] = useState<YamlNode[]>(initialTree);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(initialTree.map(n => n.id)));

  const yamlOutput = useMemo(() => {
    try { return emitNodes(tree, 0).join('\n') + (tree.length ? '\n' : ''); }
    catch (e: any) { return `# Error: ${e.message}`; }
  }, [tree]);

  const updateNode = (id: string, patch: Partial<YamlNode>) => {
    const walk = (nodes: YamlNode[]): YamlNode[] => nodes.map(n => {
      if (n.id === id) {
        const next = { ...n, ...patch };
        if (patch.type && patch.type !== n.type) {
          if (patch.type === 'object' || patch.type === 'list') { next.children = next.children || []; next.value = undefined; }
          else { next.children = undefined; next.value = next.value ?? (patch.type === 'boolean' ? false : patch.type === 'number' ? 0 : ''); }
        }
        return next;
      }
      if (n.children) return { ...n, children: walk(n.children) };
      return n;
    });
    setTree(walk(tree));
  };

  const addChild = (parentId: string | null, type: YamlNodeType = 'string') => {
    const newNode: YamlNode = { id: uid(), key: 'newKey', type, value: type === 'boolean' ? false : type === 'number' ? 0 : '' };
    if (type === 'object' || type === 'list') { newNode.children = []; delete newNode.value; }
    if (parentId === null) { setTree([...tree, newNode]); setExpanded(s => new Set([...s, newNode.id])); return; }
    const walk = (nodes: YamlNode[]): YamlNode[] => nodes.map(n => {
      if (n.id === parentId) return { ...n, children: [...(n.children || []), newNode] };
      if (n.children) return { ...n, children: walk(n.children) };
      return n;
    });
    setTree(walk(tree));
    setExpanded(s => new Set([...s, parentId, newNode.id]));
  };

  const deleteNode = (id: string) => {
    const walk = (nodes: YamlNode[]): YamlNode[] => nodes.filter(n => n.id !== id).map(n => n.children ? { ...n, children: walk(n.children) } : n);
    setTree(walk(tree));
  };

  const toggleExpand = (id: string) => setExpanded(s => {
    const next = new Set(s); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const exportYaml = () => {
    const blob = new Blob([yamlOutput], { type: 'text/yaml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'config.yaml'; a.click();
    URL.revokeObjectURL(a.href); showToast(t('exported'));
  };
  const copyYaml = async () => { await navigator.clipboard.writeText(yamlOutput); showToast(t('copied')); };

  const loadTemplate = () => {
    setTree([
      {
        id: uid(), key: 'pipeline', type: 'object', description: '流水线定义', children: [
          { id: uid(), key: 'name', type: 'string', value: 'build-deploy' },
          { id: uid(), key: 'trigger', type: 'string', value: 'push', description: '触发事件' },
          {
            id: uid(), key: 'stages', type: 'list', description: '阶段顺序', children: [
              { id: uid(), key: '0', type: 'string', value: 'build' },
              { id: uid(), key: '1', type: 'string', value: 'test' },
              { id: uid(), key: '2', type: 'string', value: 'deploy' },
            ]
          },
        ]
      },
    ]);
    showToast(t('importTpl'));
  };

  const previewBg = theme === 'light' ? 'oklch(0.99 0.008 286)' : 'oklch(0.16 0.03 240)';
  const previewBorder = theme === 'light' ? '1px solid oklch(0.44 0.05 278 / 0.14)' : '1px solid oklch(1 0 0 / 0.06)';
  const previewColor = theme === 'light' ? 'oklch(0.28 0.05 284)' : 'oklch(0.95 0.02 230)';

  return (
    <div className={`${embedded ? '' : 'p-6 h-full overflow-hidden'} flex flex-col min-h-0`}>
      {!embedded && <TopBar title={t('yamlTitle')} subtitle={t('yamlSubtitle')} />}

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={() => addChild(null, 'object')} className="brand-button rounded-full px-4 py-2 flex items-center gap-1.5 text-sm">
          <Plus className="w-4 h-4" />{t('addRoot')}
        </button>
        <button onClick={loadTemplate} className="glass-button rounded-full px-4 py-2 flex items-center gap-1.5 text-sm">
          <Wand2 className="w-4 h-4" />{t('importTpl')}
        </button>
        <button onClick={() => { setTree([]); showToast(t('deleted')); }} className="glass-button rounded-full px-4 py-2 flex items-center gap-1.5 text-sm" style={{ color: 'oklch(0.7 0.2 25)' }}>
          <Trash2 className="w-4 h-4" />{t('clearAll')}
        </button>
        <div className="ml-auto flex gap-2">
          <button onClick={copyYaml} className="glass-button rounded-full px-4 py-2 flex items-center gap-1.5 text-sm"><Copy className="w-4 h-4" />{t('copyYaml')}</button>
          <button onClick={exportYaml} className="brand-button rounded-full px-4 py-2 flex items-center gap-1.5 text-sm"><Download className="w-4 h-4" />{t('exportYaml')}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 flex-1 min-h-0" style={embedded ? { minHeight: '520px' } : {}}>
        <div className="glass-card p-5 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3">
            <Braces className="w-4 h-4 text-brand" />
            <h3>{t('yamlTree')}</h3>
            <span className="ml-auto text-xs text-muted-foreground">{tree.length} {t('typeObject')}</span>
          </div>
          <div className="flex-1 overflow-auto pr-1 space-y-1.5">
            {tree.length === 0 && (
              <div className="glass-soft rounded-xl p-8 text-center text-muted-foreground text-sm">
                {t('addRoot')} →
              </div>
            )}
            {tree.map(node => (
              <NodeRow key={node.id} node={node} depth={0} expanded={expanded}
                onToggle={toggleExpand} onUpdate={updateNode} onAdd={addChild} onDelete={deleteNode} t={t} />
            ))}
          </div>
        </div>

        <div className="glass-card p-5 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3">
            <FileCode2 className="w-4 h-4 text-brand" />
            <h3>{t('yamlPreview')}</h3>
            <span className="ml-auto text-xs text-muted-foreground">{yamlOutput.split('\n').length} lines</span>
          </div>
          <div className="flex-1 rounded-xl overflow-auto p-4 min-h-0" style={{ background: previewBg, border: previewBorder }}>
            <pre className="text-sm mono" style={{ lineHeight: 1.7, color: previewColor, margin: 0 }}>
              <code dangerouslySetInnerHTML={{ __html: highlightYaml(yamlOutput) }} />
            </pre>
          </div>
          <style>{`
            .ytok-comment { color: ${theme === 'light' ? 'oklch(0.5 0.04 276)' : 'oklch(0.65 0.03 240)'}; font-style: italic; }
            .ytok-key     { color: ${theme === 'light' ? 'oklch(0.54 0.20 285)' : 'oklch(0.78 0.14 225)'}; font-weight: 600; }
            .ytok-punct   { color: ${theme === 'light' ? 'oklch(0.5 0.04 276)' : 'oklch(0.72 0.02 230)'}; }
            .ytok-str     { color: ${theme === 'light' ? 'oklch(0.50 0.15 155)' : 'oklch(0.78 0.13 155)'}; }
            .ytok-bool    { color: ${theme === 'light' ? 'oklch(0.50 0.20 296)' : 'oklch(0.78 0.13 248)'}; font-weight: 600; }
            .ytok-num     { color: ${theme === 'light' ? 'oklch(0.55 0.16 75)' : 'oklch(0.82 0.13 75)'}; }
            .ytok-list    { color: ${theme === 'light' ? 'oklch(0.74 0.11 244)' : 'oklch(0.78 0.12 205)'}; }
          `}</style>
        </div>
      </div>
    </div>
  );
}

function NodeRow({ node, depth, expanded, onToggle, onUpdate, onAdd, onDelete, t }: any) {
  const isContainer = node.type === 'object' || node.type === 'list';
  const isOpen = expanded.has(node.id);
  const typeOpt = typeOptions.find(o => o.type === node.type)!;
  const TypeIcon = typeOpt.icon;
  const [editDesc, setEditDesc] = useState(false);

  return (
    <div className="row-enter" style={{ paddingLeft: depth * 18 }}>
      <div className="glass-soft rounded-xl p-2 flex items-center gap-2 group hover-soft transition-all border border-transparent">
        <button onClick={() => isContainer && onToggle(node.id)} className="w-5 h-5 flex items-center justify-center shrink-0">
          {isContainer ? (isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />) : <span className="w-1.5 h-1.5 rounded-full" style={{ background: typeOpt.color }} />}
        </button>

        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: typeOpt.color.replace(')', ' / 0.18)'), color: typeOpt.color }}>
          <TypeIcon className="w-3.5 h-3.5" />
        </div>

        <input
          value={node.key}
          onChange={e => onUpdate(node.id, { key: e.target.value })}
          className="glass-input rounded-md px-2 py-1 text-sm outline-none w-32 shrink-0 mono"
          style={{ fontWeight: 600 }}
        />

        <select
          value={node.type}
          onChange={e => onUpdate(node.id, { type: e.target.value as YamlNodeType })}
          className="glass-input rounded-md px-2 py-1 text-xs outline-none shrink-0"
        >
          {typeOptions.map(o => <option key={o.type} value={o.type} style={{ background: 'oklch(0.20 0.04 245)' }}>{t(o.key)}</option>)}
        </select>

        {!isContainer && (
          node.type === 'boolean'
            ? <select value={String(node.value)} onChange={e => onUpdate(node.id, { value: e.target.value === 'true' })} className="glass-input rounded-md px-2 py-1 text-sm outline-none flex-1">
              <option value="true" style={{ background: 'oklch(0.20 0.04 245)' }}>true</option>
              <option value="false" style={{ background: 'oklch(0.20 0.04 245)' }}>false</option>
            </select>
            : <input
              type={node.type === 'number' ? 'number' : 'text'}
              value={String(node.value ?? '')}
              onChange={e => onUpdate(node.id, { value: e.target.value })}
              className="glass-input rounded-md px-2 py-1 text-sm outline-none flex-1 min-w-0 mono"
            />
        )}
        {isContainer && <span className="flex-1 text-xs text-muted-foreground italic">{(node.children || []).length} {t('typeObject').toLowerCase()}</span>}

        <button
          onClick={() => setEditDesc(s => !s)}
          title={t('description')}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
          style={node.description ? { background: 'oklch(0.61 0.19 282 / 0.14)', color: 'var(--brand-400)', border: '1px solid oklch(0.61 0.19 282 / 0.18)' } : { color: 'var(--muted-foreground)' }}
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isContainer && (
            <button onClick={() => onAdd(node.id, 'string')} title={t('addChild')} className="w-7 h-7 rounded-md hover-soft flex items-center justify-center border border-transparent">
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => onDelete(node.id)} className="w-7 h-7 rounded-md flex items-center justify-center" style={{ color: 'oklch(0.7 0.2 25)' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {editDesc && (
        <div className="mt-1 ml-9 mr-2">
          <input
            autoFocus
            value={node.description || ''}
            onChange={e => onUpdate(node.id, { description: e.target.value })}
            placeholder={t('description') + ' → # comment'}
            className="glass-input rounded-md px-2 py-1 text-xs outline-none w-full"
          />
        </div>
      )}

      {isContainer && isOpen && node.children && (
        <div className="mt-1.5 space-y-1.5">
          {node.children.map((c: YamlNode) => (
            <NodeRow key={c.id} node={c} depth={depth + 1} expanded={expanded}
              onToggle={onToggle} onUpdate={onUpdate} onAdd={onAdd} onDelete={onDelete} t={t} />
          ))}
          <button onClick={() => onAdd(node.id, 'string')} className="ml-9 text-xs flex items-center gap-1 py-1" style={{ color: 'var(--brand-400)' }}>
            <Plus className="w-3 h-3" />{t('addChild')}
          </button>
        </div>
      )}
    </div>
  );
}
