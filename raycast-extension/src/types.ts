export interface Preferences {
  appUrl?: string;
  apiKey: string;
}

export interface Shortcut {
  id: string;
  url: string;
  name: string;
  category?: string;
  pinned?: boolean;
  clicks?: number;
  added: number;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  shortcuts?: Shortcut[];
  categories?: string[];
  shortcut?: Shortcut;
  data?: T;
  user?: any;
}
