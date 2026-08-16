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
