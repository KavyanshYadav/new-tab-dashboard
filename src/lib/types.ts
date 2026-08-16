export interface Shortcut {
  id: string;
  url: string;
  name: string;
  category?: string;
  pinned?: boolean;
  clicks: number;
  added: number;
}

export type SortMode = 'recent' | 'most' | 'az';

export interface Preferences {
  engine: number;
  tag: string;
  sort: SortMode;
}

export interface SearchEngine {
  name: string;
  url: string;
  placeholder?: string;
}

export interface PopularSite {
  name: string;
  url: string;
  category: string;
}

export interface PopularGroup {
  group: string;
  items: PopularSite[];
}

export interface ToastState {
  message: string;
  withUndo?: boolean;
  timestamp: number;
}

export interface UserRecord {
  userId: string;
  username: string;
  email: string;
  passwordHash: string;
  apiKey: string;
  shortcuts: Shortcut[];
  createdAt: number;
  updatedAt: number;
}

export interface PublicUser {
  userId: string;
  username: string;
  email: string;
  apiKey: string;
  totalShortcuts?: number;
  createdAt?: number;
}

export interface CommunityLink {
  name: string;
  url: string;
  description?: string;
  category?: string;
  icon?: string;
}

export interface CommunityList {
  id: string;
  title: string;
  description: string;
  category: string;
  badge?: string;
  icon?: string;
  links: CommunityLink[];
}
