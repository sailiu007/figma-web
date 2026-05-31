import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import TopBar from './TopBar';
import { Activity, Archive, ArrowRight, FolderKanban, Star, Users } from 'lucide-react';
import {
  DataGrid,
  GridProgressCell,
  GridStatusCell,
  useDataGridState,
  type DataGridColumn,
  type DataGridFieldSchema,
} from './data-grid';
import { Button } from './ui/button';
import type { Project } from '../../types';

export default function ProjectsPage() {
  const { language, theme, projects, setCurrentProject, toggleStar, setProjectSubPage, addProject, updateProject, showToast } = useAppStore();
  const t = useT(language);
  const navigate = useNavigate();
  const grid = useDataGridState({
    filters: {},
    pageSize: 8,
    visibleColumnKeys: ['star', 'name', 'status', 'progress', 'members', 'updatedAt', 'actions'],
  });

  const stats = [
    { key: 'totalProjects', icon: FolderKanban, value: projects.length, color: '#8b5cf6,#6d28d9' },
    { key: 'activeProjects', icon: Activity, value: projects.filter(p => p.status === 'active').length, color: '#6366f1,#4f46e5' },
    { key: 'archivedProjects', icon: Archive, value: projects.filter(p => p.status === 'archived').length, color: '#7c3aed,#5b21b6' },
    { key: 'totalMembers', icon: Users, value: projects.reduce((s, p) => s + p.members, 0), color: '#a855f7,#7e22ce' },
  ] as const;

  const enterProject = (id: string) => {
    setCurrentProject(id);
    setProjectSubPage('overview');
    navigate(`/projects/${id}`);
  };

  const statusTone: Record<string, 'success' | 'warning' | 'neutral'> = {
    active: 'success',
    planning: 'warning',
    archived: 'neutral',
  };

  const statusOptions = useMemo(() => [
    { label: t('statusActive' as any), value: 'active' },
    { label: t('statusPlanning' as any), value: 'planning' },
    { label: t('statusArchived' as any), value: 'archived' },
  ], [t]);

  const editableProjectFieldKeys = useMemo(() => ['name', 'nameEn', 'description', 'status', 'progress', 'members'], []);

  const projectFields = useMemo<Array<DataGridFieldSchema>>(() => [
    {
      key: 'name',
      label: t('name'),
      kind: 'text',
      required: true,
      placeholder: '输入项目名称',
      createable: true,
    },
    {
      key: 'nameEn',
      label: language === 'zh' ? '英文名称' : 'English name',
      kind: 'text',
      required: true,
      placeholder: language === 'zh' ? '输入英文名称' : 'Enter English name',
      createable: true,
    },
    {
      key: 'description',
      label: language === 'zh' ? '项目描述' : 'Description',
      kind: 'text',
      required: true,
      placeholder: language === 'zh' ? '输入项目描述' : 'Enter project description',
      multiline: true,
      rows: 5,
      createable: true,
    },
    {
      key: 'status',
      label: t('status'),
      kind: 'single-select',
      options: statusOptions,
      required: true,
      defaultValue: 'planning',
      createable: true,
    },
    {
      key: 'progress',
      label: t('progress'),
      kind: 'number',
      required: true,
      defaultValue: 0,
      placeholder: '0 - 100',
      createable: true,
      validate: (value) => {
        const numeric = Number(value);
        if (Number.isNaN(numeric) || numeric < 0 || numeric > 100) {
          return '进度需在 0 到 100 之间';
        }
      },
    },
    {
      key: 'members',
      label: t('members'),
      kind: 'number',
      required: true,
      defaultValue: 1,
      placeholder: '输入成员数',
      createable: true,
      validate: (value) => {
        const numeric = Number(value);
        if (!Number.isInteger(numeric) || numeric <= 0) {
          return '成员数需为大于 0 的整数';
        }
      },
    },
  ], [language, statusOptions, t]);

  const columns = useMemo<Array<DataGridColumn<(typeof projects)[number]>>>(() => [
    {
      key: 'star',
      title: '',
      width: 52,
      filterable: false,
      render: (project) => (
        <button
          onClick={(event) => {
            event.stopPropagation();
            toggleStar(project.id);
          }}
          className="rounded-full p-1 transition-colors hover:bg-background/50"
          aria-label={project.starred ? 'Unstar project' : 'Star project'}
        >
          <Star className={`size-4 transition-all ${project.starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/50 hover:text-amber-400'}`} />
        </button>
      ),
    },
    {
      key: 'name',
      fieldKey: 'name',
      title: t('name'),
      type: 'entity',
      sortable: true,
      groupable: true,
      width: '32%',
      meta: {
        isPrimary: true,
        titleField: language === 'zh' ? 'name' : 'nameEn',
        descriptionField: 'description',
        accentField: 'color',
      },
      sortValue: (project) => language === 'zh' ? project.name : project.nameEn,
      groupValue: (project) => {
        const value = language === 'zh' ? project.name : project.nameEn;
        return value.slice(0, 1).toUpperCase();
      },
    },
    {
      key: 'status',
      fieldKey: 'status',
      title: t('status'),
      type: 'status',
      sortable: true,
      groupable: true,
      sortValue: (project) => project.status,
      groupValue: (project) => project.status,
      meta: { statusToneByValue: statusTone },
    },
    {
      key: 'progress',
      fieldKey: 'progress',
      title: t('progress'),
      type: 'progress',
      sortable: true,
      align: 'left',
      sortValue: (project) => project.progress,
      meta: theme === 'light' ? { accentField: 'color' } : undefined,
    },
    {
      key: 'members',
      fieldKey: 'members',
      title: t('members'),
      type: 'avatar-list',
      sortable: true,
      sortValue: (project) => project.members,
      meta: { avatarColors },
    },
    {
      key: 'updatedAt',
      fieldKey: 'updatedAt',
      title: t('updated'),
      type: 'date',
      sortable: true,
      sortValue: (project) => project.updatedAt,
    },
    {
      key: 'actions',
      title: t('actions'),
      width: 144,
      align: 'right',
      filterable: false,
      render: (project) => (
        <Button
          onClick={(event) => {
            event.stopPropagation();
            enterProject(project.id);
          }}
          className="gradient-button h-8 rounded-lg px-3 text-xs"
        >
          {t('enterProject')}
          <ArrowRight className="size-3" />
        </Button>
      ),
    },
  ], [enterProject, language, t, theme, toggleStar]);

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

      <div className="glass-card rounded-[28px] p-5">
        <DataGrid
          data={projects}
          columns={columns}
          fields={projectFields}
          rowKey={(project) => project.id}
          grid={grid}
          addRecordLabel="添加记录"
          createRecord={{
            title: language === 'zh' ? '新增项目' : 'New project',
            description: language === 'zh' ? '基于字段规则创建项目。' : 'Create a project from the field schema.',
            submitLabel: language === 'zh' ? '创建项目' : 'Create project',
            fields: editableProjectFieldKeys,
            onSubmit: (values) => {
              const color = projectColors[projects.length % projectColors.length];
              const now = new Date();
              const project: Project = {
                id: crypto.randomUUID(),
                name: String(values.name ?? ''),
                nameEn: String(values.nameEn ?? ''),
                description: String(values.description ?? ''),
                status: (values.status as Project['status']) ?? 'planning',
                owner: language === 'zh' ? '系统' : 'System',
                ownerAvatar: '',
                updatedAt: formatDateTime(now),
                createdAt: formatDate(now),
                members: Number(values.members ?? 1),
                progress: Number(values.progress ?? 0),
                tags: [],
                color,
                starred: false,
              };

              addProject(project);
              showToast(language === 'zh' ? '项目已创建' : 'Project created');
            },
          }}
          editRecord={{
            title: language === 'zh' ? '编辑项目' : 'Edit project',
            description: (project) => language === 'zh' ? `更新 ${project.name} 的字段信息。` : `Update fields for ${project.nameEn}.`,
            submitLabel: language === 'zh' ? '保存修改' : 'Save changes',
            fields: editableProjectFieldKeys,
            onSubmit: (project, values) => {
              updateProject(project.id, {
                name: String(values.name ?? project.name),
                nameEn: String(values.nameEn ?? project.nameEn),
                description: String(values.description ?? project.description),
                status: (values.status as Project['status']) ?? project.status,
                progress: Number(values.progress ?? project.progress),
                members: Number(values.members ?? project.members),
                updatedAt: formatDateTime(new Date()),
              });

              showToast(language === 'zh' ? '项目已更新' : 'Project updated');
            },
          }}
          searchPlaceholder={t('search')}
          searchPredicate={(project, search) => {
            const lowered = search.toLowerCase();
            return (
              project.name.toLowerCase().includes(lowered) ||
              project.nameEn.toLowerCase().includes(lowered) ||
              project.description.toLowerCase().includes(lowered)
            );
          }}
          detailDrawer={{
            title: (project) => language === 'zh' ? project.name : project.nameEn,
            description: (project) => project.description,
            renderContent: (project) => (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard label={t('status')} value={<GridStatusCell label={t(`status${project.status.charAt(0).toUpperCase() + project.status.slice(1)}` as any)} tone={statusTone[project.status]} />} />
                  <InfoCard label={t('progress')} value={<GridProgressCell value={project.progress} accent={theme === 'light' ? project.color : undefined} />} />
                  <InfoCard label={t('members')} value={<span className="font-semibold">{project.members}</span>} />
                  <InfoCard label={t('updated')} value={<span className="font-semibold">{project.updatedAt}</span>} />
                </div>
                <div className="glass-soft rounded-3xl border border-border/60 p-4">
                  <div className="mb-2 text-sm font-semibold">Overview</div>
                  <p className="text-muted-foreground text-sm leading-6">{project.description}</p>
                </div>
                <div className="glass-soft rounded-3xl border border-border/60 p-4">
                  <div className="mb-3 text-sm font-semibold">Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button className="gradient-button rounded-full px-4" onClick={() => enterProject(project.id)}>
                    {t('enterProject')}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            ),
          }}
          renderBulkActions={(selectedProjects) => (
            <span className="text-muted-foreground text-xs">{selectedProjects.length} projects ready</span>
          )}
          getRowClassName={() => 'row-enter transition-all duration-300'}
        />
      </div>
    </div>
  );
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${formatDate(date)} ${hours}:${minutes}`;
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="glass-soft rounded-3xl border border-border/60 p-4">
      <div className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-[0.08em]">{label}</div>
      <div>{value}</div>
    </div>
  );
}

const avatarColors = ['#8b5cf6', '#22d3ee', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
const projectColors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4'];
