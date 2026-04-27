import { create } from 'zustand';
import { projects as mockProjects, roles as mockRoles, permissions as mockPermissions, credentials as mockCreds, dataDictionaries as mockDicts, users as mockUsers } from '../mock/data';
import type { Project, Role, Credential, DataDict, User } from '../types';

type Page = 'dashboard' | 'projects' | 'project-detail' | 'system' | 'roles' | 'settings';
type ProjectSubPage = 'overview' | 'issues' | 'code' | 'ci' | 'cd' | 'analysis' | 'apps' | 'artifacts' | 'docs' | 'tests' | 'yaml' | 'settings';

interface AppState {
  language: 'zh' | 'en';
  setLanguage: (lang: 'zh' | 'en') => void;
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  toggleTheme: () => void;

  currentPage: Page;
  setCurrentPage: (p: Page) => void;

  projectSubPage: ProjectSubPage;
  setProjectSubPage: (p: ProjectSubPage) => void;

  projects: Project[];
  currentProjectId: string | null;
  setCurrentProject: (id: string | null) => void;
  toggleStar: (id: string) => void;

  roles: Role[];
  permissions: typeof mockPermissions;
  updateRolePermissions: (roleId: string, permissionIds: string[]) => void;
  updateRoleDetails: (roleId: string, patch: Partial<Pick<Role, 'name' | 'nameEn' | 'description' | 'descriptionEn'>>) => void;

  users: User[];
  assignUserRoles: (userId: string, roleIds: string[]) => void;
  updateUser: (userId: string, patch: Partial<Pick<User, 'name' | 'nameEn' | 'email' | 'title' | 'titleEn' | 'team' | 'teamEn' | 'status' | 'preferredLanguage'>>) => void;

  credentials: Credential[];
  addCredential: (c: Credential) => void;
  removeCredential: (id: string) => void;

  dataDicts: DataDict[];
  addDictItem: (dictId: string, item: { code: string; label: string; labelEn: string }) => void;
  removeDictItem: (dictId: string, code: string) => void;

  toast: { id: number; msg: string } | null;
  showToast: (msg: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  language: 'zh',
  setLanguage: (language) => set({ language }),
  theme: 'dark',
  setTheme: (theme) => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  currentPage: 'dashboard',
  setCurrentPage: (currentPage) => set({ currentPage }),

  projectSubPage: 'overview',
  setProjectSubPage: (projectSubPage) => set({ projectSubPage }),

  projects: mockProjects,
  currentProjectId: mockProjects[0]?.id ?? null,
  setCurrentProject: (id) => set({ currentProjectId: id }),
  toggleStar: (id) => set((s) => ({
    projects: s.projects.map(p => p.id === id ? { ...p, starred: !p.starred } : p)
  })),

  roles: mockRoles,
  permissions: mockPermissions,
  updateRolePermissions: (roleId, permissionIds) => set((s) => ({
    roles: s.roles.map(r => r.id === roleId ? { ...r, permissionIds } : r)
  })),
  updateRoleDetails: (roleId, patch) => set((s) => ({
    roles: s.roles.map(r => r.id === roleId ? { ...r, ...patch } : r)
  })),

  users: mockUsers,
  assignUserRoles: (userId, roleIds) => set((s) => ({
    users: s.users.map(u => u.id === userId ? { ...u, roleIds } : u)
  })),
  updateUser: (userId, patch) => set((s) => ({
    users: s.users.map(u => u.id === userId ? { ...u, ...patch } : u)
  })),

  credentials: mockCreds,
  addCredential: (c) => set((s) => ({ credentials: [c, ...s.credentials] })),
  removeCredential: (id) => set((s) => ({ credentials: s.credentials.filter(c => c.id !== id) })),

  dataDicts: mockDicts,
  addDictItem: (dictId, item) => set((s) => ({
    dataDicts: s.dataDicts.map(d => d.id === dictId ? { ...d, items: [...d.items, item] } : d)
  })),
  removeDictItem: (dictId, code) => set((s) => ({
    dataDicts: s.dataDicts.map(d => d.id === dictId ? { ...d, items: d.items.filter(i => i.code !== code) } : d)
  })),

  toast: null,
  showToast: (msg) => {
    const id = Date.now();
    set({ toast: { id, msg } });
    setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : {})), 2200);
  },
}));
