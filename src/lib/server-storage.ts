import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Shortcut } from './types';
import { DEFAULT_SHORTCUTS } from './constants';
import { hostname } from './utils';

interface UserData {
  apiKey: string;
  createdAt: number;
  updatedAt: number;
  shortcuts: Shortcut[];
}

interface Database {
  users: Record<string, UserData>;
}

// In-memory cache for fast access & serverless environments
const memoryDb: Database = {
  users: {},
};

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function initDb(): Database {
  try {
    if (typeof fs !== 'undefined' && fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.users === 'object') {
        memoryDb.users = parsed.users;
      }
    }
  } catch (err) {
    console.error('Error reading local db file:', err);
  }
  return memoryDb;
}

function persistDb() {
  try {
    if (typeof fs !== 'undefined') {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Error persisting db file (non-critical in serverless):', err);
  }
}

// Initialize on load
initDb();

export function generateApiKey(): string {
  const random = crypto.randomBytes(16).toString('hex');
  return `nt_key_${random}`;
}

export function getOrCreateUser(apiKey?: string | null): UserData {
  initDb();

  if (apiKey && memoryDb.users[apiKey]) {
    return memoryDb.users[apiKey];
  }

  const newKey = apiKey && apiKey.startsWith('nt_key_') ? apiKey : generateApiKey();
  const initialUser: UserData = {
    apiKey: newKey,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    shortcuts: DEFAULT_SHORTCUTS.map((s, idx) => ({
      ...s,
      id: `init-${Date.now()}-${idx}`,
      added: Date.now() - (5000 - idx * 1000),
    })),
  };

  memoryDb.users[newKey] = initialUser;
  persistDb();
  return initialUser;
}

export function getUserShortcuts(apiKey: string): Shortcut[] | null {
  initDb();
  const user = memoryDb.users[apiKey];
  if (!user) return null;
  return user.shortcuts;
}

export function addUserShortcut(
  apiKey: string,
  data: { url: string; name?: string; category?: string; pinned?: boolean }
): { success: boolean; shortcut?: Shortcut; error?: string } {
  initDb();
  let user = memoryDb.users[apiKey];
  if (!user) {
    user = getOrCreateUser(apiKey);
  }

  const cleanUrl = data.url.trim();
  if (!cleanUrl) {
    return { success: false, error: 'URL is required' };
  }

  const newShortcut: Shortcut = {
    id: crypto.randomUUID(),
    url: cleanUrl,
    name: data.name?.trim() || hostname(cleanUrl),
    category: data.category?.trim() || undefined,
    pinned: !!data.pinned,
    clicks: 0,
    added: Date.now(),
  };

  user.shortcuts.push(newShortcut);
  user.updatedAt = Date.now();
  persistDb();

  return { success: true, shortcut: newShortcut };
}

export function deleteUserShortcut(apiKey: string, id: string): boolean {
  initDb();
  const user = memoryDb.users[apiKey];
  if (!user) return false;

  const initialLength = user.shortcuts.length;
  user.shortcuts = user.shortcuts.filter((s) => s.id !== id);
  if (user.shortcuts.length !== initialLength) {
    user.updatedAt = Date.now();
    persistDb();
    return true;
  }
  return false;
}

export function getUserCategories(apiKey: string): string[] {
  initDb();
  const user = memoryDb.users[apiKey];
  if (!user) return ['Dev', 'AI', 'Social', 'Entertainment', 'Shopping', 'Productivity', 'News'];

  const set = new Set<string>();
  user.shortcuts.forEach((s) => {
    if (s.category && s.category.trim()) {
      set.add(s.category.trim());
    }
  });

  // Default suggested categories if user has few
  ['Dev', 'AI', 'Social', 'Productivity', 'News'].forEach((c) => set.add(c));
  return Array.from(set);
}

export function setAllUserShortcuts(apiKey: string, shortcuts: Shortcut[]): boolean {
  initDb();
  let user = memoryDb.users[apiKey];
  if (!user) {
    user = getOrCreateUser(apiKey);
  }
  user.shortcuts = shortcuts;
  user.updatedAt = Date.now();
  persistDb();
  return true;
}
