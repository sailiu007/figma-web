export interface Project {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  status: 'active' | 'archived' | 'planning';
  owner: string;
  ownerAvatar: string;
  updatedAt: string;
  createdAt: string;
  members: number;
  progress: number;
  tags: string[];
  color: string;
  starred: boolean;
}

export interface Role {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  permissionIds: string[];
  memberCount: number;
  color: string;
  icon: string;
  isSystem: boolean;
}

export interface User {
  id: string;
  name: string;
  nameEn: string;
  email: string;
  title: string;
  titleEn: string;
  team: string;
  teamEn: string;
  status: 'active' | 'invited' | 'suspended';
  preferredLanguage: 'zh' | 'en';
  roleIds: string[];
  color: string;
}

export interface Permission {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  categoryEn: string;
  description: string;
  level: 'read' | 'write' | 'admin';
}

export interface ActivityItem {
  id: string;
  user: string;
  avatar: string;
  action: string;
  actionEn: string;
  target: string;
  time: string;
}

/* YAML node tree builder */
export type YamlNodeType = 'object' | 'list' | 'string' | 'number' | 'boolean';
export interface YamlNode {
  id: string;
  key: string;
  type: YamlNodeType;
  value?: string | number | boolean;
  children?: YamlNode[];
  description?: string;
}

export interface Credential {
  id: string;
  name: string;
  type: 'api_key' | 'oauth' | 'ssh' | 'password' | 'token';
  username?: string;
  secret: string;
  scope: string;
  createdAt: string;
  expiresAt?: string;
}

export interface DataDict {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  description: string;
  items: { code: string; label: string; labelEn: string }[];
}
