import Mock from 'mockjs';
import type { Project, Role, Permission, ActivityItem, Credential, DataDict } from '../types';

const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e', '#10b981'];
const tagPool = ['frontend','backend','mobile','design','infra','data','ai','growth','core','beta'];
const statuses: Project['status'][] = ['active','planning','archived'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random()*arr.length)]; }

export const projects: Project[] = Mock.mock({
  'list|18': [{
    'id|+1': 1000,
    name: '@ctitle(4, 8)',
    nameEn: '@title(2, 4)',
    description: '@cparagraph(1, 2)',
    'progress|10-100': 1,
    'members|3-24': 1,
    owner: '@cname',
    ownerAvatar: '@image("80x80", "#@color", "#fff", "@first")',
    updatedAt: '@datetime("yyyy-MM-dd HH:mm")',
    createdAt: '@date',
  }]
}).list.map((p: any, i: number) => ({
  ...p,
  id: String(p.id),
  status: statuses[i % 3] === 'archived' && i > 12 ? 'archived' : pick(statuses),
  color: colors[i % colors.length],
  tags: Array.from(new Set([pick(tagPool), pick(tagPool), pick(tagPool)])).slice(0,3),
  starred: i < 4,
})) as Project[];

export const permissions: Permission[] = [
  // Project
  { id: 'p1', name: '查看项目', nameEn: 'View Project', category: '项目', categoryEn: 'Project', description: '查看项目基础信息', level: 'read' },
  { id: 'p2', name: '编辑项目', nameEn: 'Edit Project', category: '项目', categoryEn: 'Project', description: '修改项目设置和元信息', level: 'write' },
  { id: 'p3', name: '归档项目', nameEn: 'Archive Project', category: '项目', categoryEn: 'Project', description: '归档或恢复项目', level: 'admin' },
  { id: 'p4', name: '删除项目', nameEn: 'Delete Project', category: '项目', categoryEn: 'Project', description: '永久删除项目', level: 'admin' },
  // Members
  { id: 'p5', name: '查看成员', nameEn: 'View Members', category: '成员', categoryEn: 'Members', description: '查看成员列表', level: 'read' },
  { id: 'p6', name: '邀请成员', nameEn: 'Invite Members', category: '成员', categoryEn: 'Members', description: '邀请新成员加入', level: 'write' },
  { id: 'p7', name: '移除成员', nameEn: 'Remove Members', category: '成员', categoryEn: 'Members', description: '移除现有成员', level: 'admin' },
  // Code
  { id: 'p8', name: '代码仓库', nameEn: 'Repository', category: '代码', categoryEn: 'Code', description: '代码仓库读写', level: 'write' },
  { id: 'p9', name: '代码评审', nameEn: 'Code Review', category: '代码', categoryEn: 'Code', description: '提交与合并评审', level: 'write' },
  { id: 'p10', name: '分支保护', nameEn: 'Branch Protection', category: '代码', categoryEn: 'Code', description: '管理分支保护规则', level: 'admin' },
  // CI/CD
  { id: 'p11', name: '持续集成', nameEn: 'CI', category: '流水线', categoryEn: 'Pipeline', description: '构建与测试流水线', level: 'write' },
  { id: 'p12', name: '持续部署', nameEn: 'CD', category: '流水线', categoryEn: 'Pipeline', description: '部署到生产环境', level: 'admin' },
  { id: 'p13', name: '环境管理', nameEn: 'Env Manage', category: '流水线', categoryEn: 'Pipeline', description: '管理部署环境', level: 'admin' },
  // Test
  { id: 'p14', name: '测试用例', nameEn: 'Test Cases', category: '测试', categoryEn: 'Testing', description: '管理测试用例', level: 'write' },
  { id: 'p15', name: '缺陷管理', nameEn: 'Bug Tracker', category: '测试', categoryEn: 'Testing', description: '管理缺陷记录', level: 'write' },
  // Settings
  { id: 'p16', name: '角色管理', nameEn: 'Role Manage', category: '设置', categoryEn: 'Settings', description: '管理角色与权限', level: 'admin' },
  { id: 'p17', name: '系统配置', nameEn: 'System Config', category: '设置', categoryEn: 'Settings', description: 'YAML 系统配置', level: 'admin' },
  { id: 'p18', name: '审计日志', nameEn: 'Audit Log', category: '设置', categoryEn: 'Settings', description: '查看操作审计日志', level: 'read' },
];

export const roles: Role[] = [
  { id: 'r1', name: '超级管理员', nameEn: 'Super Admin', description: '拥有平台全部权限', descriptionEn: 'Full platform access',
    permissionIds: permissions.map(p => p.id), memberCount: 2, color: '#ef4444', icon: 'Crown', isSystem: true },
  { id: 'r2', name: '项目经理', nameEn: 'Project Manager', description: '管理项目与成员', descriptionEn: 'Manages projects & members',
    permissionIds: ['p1','p2','p3','p5','p6','p7','p11','p14','p15','p18'], memberCount: 8, color: '#6366f1', icon: 'Briefcase', isSystem: true },
  { id: 'r3', name: '研发工程师', nameEn: 'Developer', description: '负责代码与流水线', descriptionEn: 'Owns code & pipelines',
    permissionIds: ['p1','p5','p8','p9','p11','p14','p15'], memberCount: 24, color: '#14b8a6', icon: 'Code', isSystem: true },
  { id: 'r4', name: '测试工程师', nameEn: 'QA Engineer', description: '测试与质量保障', descriptionEn: 'Testing and QA',
    permissionIds: ['p1','p5','p9','p14','p15'], memberCount: 12, color: '#f59e0b', icon: 'Bug', isSystem: false },
  { id: 'r5', name: '运维工程师', nameEn: 'DevOps', description: '部署与环境管理', descriptionEn: 'Deployment & env',
    permissionIds: ['p1','p5','p11','p12','p13','p18'], memberCount: 5, color: '#8b5cf6', icon: 'Server', isSystem: false },
  { id: 'r6', name: '访客', nameEn: 'Guest', description: '只读权限', descriptionEn: 'Read only',
    permissionIds: ['p1','p5'], memberCount: 18, color: '#94a3b8', icon: 'Eye', isSystem: true },
];


export const activities: ActivityItem[] = Mock.mock({
  'list|8': [{
    'id|+1': 1,
    user: '@cname',
    avatar: '@image("60x60", "#@color", "#fff", "U")',
    action: '@pick(["更新了","创建了","归档了","评审了","部署了"])',
    actionEn: '@pick(["updated","created","archived","reviewed","deployed"])',
    target: '@ctitle(3,6)',
    time: '@datetime("MM-dd HH:mm")',
  }]
}).list.map((a: any) => ({ ...a, id: String(a.id) })) as ActivityItem[];

export const credentials: Credential[] = Mock.mock({
  'list|6': [{
    'id|+1': 100,
    name: '@pick(["GitHub Token","DockerHub","AWS Access","K8s Cluster","DB Production","Slack Webhook"])',
    'type|1': ['api_key','oauth','ssh','password','token'],
    username: '@email',
    secret: '@guid',
    'scope|1': ['全局','项目级','环境级','组织级'],
    createdAt: '@date',
    expiresAt: '@date',
  }]
}).list.map((c: any) => ({ ...c, id: String(c.id) })) as Credential[];

export const dataDictionaries: DataDict[] = [
  {
    id: 'd1', code: 'PROJECT_STATUS', name: '项目状态', nameEn: 'Project Status',
    description: '项目所处的生命周期阶段',
    items: [
      { code: 'planning', label: '规划中', labelEn: 'Planning' },
      { code: 'active', label: '进行中', labelEn: 'Active' },
      { code: 'paused', label: '已暂停', labelEn: 'Paused' },
      { code: 'archived', label: '已归档', labelEn: 'Archived' },
    ]
  },
  {
    id: 'd2', code: 'TASK_PRIORITY', name: '任务优先级', nameEn: 'Task Priority',
    description: '任务的紧急程度',
    items: [
      { code: 'p0', label: '紧急', labelEn: 'Urgent' },
      { code: 'p1', label: '高', labelEn: 'High' },
      { code: 'p2', label: '中', labelEn: 'Medium' },
      { code: 'p3', label: '低', labelEn: 'Low' },
    ]
  },
  {
    id: 'd3', code: 'ENV_TYPE', name: '环境类型', nameEn: 'Environment',
    description: '部署环境分类',
    items: [
      { code: 'dev', label: '开发', labelEn: 'Development' },
      { code: 'test', label: '测试', labelEn: 'Testing' },
      { code: 'staging', label: '预发', labelEn: 'Staging' },
      { code: 'prod', label: '生产', labelEn: 'Production' },
    ]
  },
  {
    id: 'd4', code: 'BUG_SEVERITY', name: '缺陷严重度', nameEn: 'Bug Severity',
    description: '缺陷影响范围',
    items: [
      { code: 'blocker', label: '阻塞', labelEn: 'Blocker' },
      { code: 'critical', label: '严重', labelEn: 'Critical' },
      { code: 'major', label: '主要', labelEn: 'Major' },
      { code: 'minor', label: '次要', labelEn: 'Minor' },
      { code: 'trivial', label: '轻微', labelEn: 'Trivial' },
    ]
  },
];
