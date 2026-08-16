import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Shortcut, UserRecord, PublicUser } from './types';
import { DEFAULT_SHORTCUTS } from './constants';
import { hostname } from './utils';

interface Database {
  users: Record<string, UserRecord>; // Keyed by userId
  apiKeyIndex: Record<string, string>; // apiKey -> userId
  emailIndex: Record<string, string>; // email.toLowerCase() -> userId
  usernameIndex: Record<string, string>; // username.toLowerCase() -> userId
}

// In-memory cache for fast access & serverless environments
const memoryDb: Database = {
  users: {},
  apiKeyIndex: {},
  emailIndex: {},
  usernameIndex: {},
};

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Password hashing
export function hashPassword(password: string, salt?: string): string {
  const finalSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, finalSalt, 1000, 64, 'sha256').toString('hex');
  return `${finalSalt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const verify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'));
}

export function generateUserId(): string {
  return `usr_${crypto.randomBytes(8).toString('hex')}`;
}

export function generateApiKey(): string {
  return `nt_key_${crypto.randomBytes(16).toString('hex')}`;
}

function rebuildIndexes() {
  memoryDb.apiKeyIndex = {};
  memoryDb.emailIndex = {};
  memoryDb.usernameIndex = {};

  Object.values(memoryDb.users).forEach((user) => {
    if (user.apiKey) memoryDb.apiKeyIndex[user.apiKey] = user.userId;
    if (user.email) memoryDb.emailIndex[user.email.toLowerCase()] = user.userId;
    if (user.username) memoryDb.usernameIndex[user.username.toLowerCase()] = user.userId;
  });
}

function initDb(): Database {
  try {
    if (typeof fs !== 'undefined' && fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);

      if (parsed && typeof parsed.users === 'object') {
        const newUsers: Record<string, UserRecord> = {};

        Object.entries(parsed.users).forEach(([key, val]: [string, any]) => {
          if (val.userId && val.username) {
            newUsers[val.userId] = val;
          } else {
            const migratedUserId = val.userId || generateUserId();
            const legacyApiKey = val.apiKey || (key.startsWith('nt_key_') ? key : generateApiKey());
            const legacyUsername = val.username || `user_${migratedUserId.slice(4, 10)}`;
            const legacyEmail = val.email || `${legacyUsername}@local.dev`;

            newUsers[migratedUserId] = {
              userId: migratedUserId,
              username: legacyUsername,
              email: legacyEmail,
              passwordHash: val.passwordHash || hashPassword('password123'),
              apiKey: legacyApiKey,
              shortcuts: Array.isArray(val.shortcuts) ? val.shortcuts : DEFAULT_SHORTCUTS,
              createdAt: val.createdAt || Date.now(),
              updatedAt: Date.now(),
            };
          }
        });

        memoryDb.users = newUsers;
      }
    }
  } catch (err) {
    console.error('Error reading local db file:', err);
  }

  rebuildIndexes();
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

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    userId: user.userId,
    username: user.username,
    email: user.email,
    apiKey: user.apiKey,
    totalShortcuts: user.shortcuts.length,
    createdAt: user.createdAt,
  };
}

// User Registration
export function registerUser(data: {
  username: string;
  email: string;
  password: string;
}): { success: boolean; user?: PublicUser; error?: string } {
  initDb();

  const cleanUsername = data.username.trim();
  const cleanEmail = data.email.trim().toLowerCase();
  const password = data.password;

  if (!cleanUsername || cleanUsername.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters long' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { success: false, error: 'Please provide a valid email address' };
  }

  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long' };
  }

  if (memoryDb.emailIndex[cleanEmail]) {
    return { success: false, error: 'An account with this email already exists' };
  }

  if (memoryDb.usernameIndex[cleanUsername.toLowerCase()]) {
    return { success: false, error: 'This username is already taken' };
  }

  const newUserId = generateUserId();
  const newApiKey = generateApiKey();

  const newUser: UserRecord = {
    userId: newUserId,
    username: cleanUsername,
    email: cleanEmail,
    passwordHash: hashPassword(password),
    apiKey: newApiKey,
    shortcuts: DEFAULT_SHORTCUTS.map((s, idx) => ({
      ...s,
      id: `init-${Date.now()}-${idx}`,
      added: Date.now() - (5000 - idx * 1000),
    })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  memoryDb.users[newUserId] = newUser;
  rebuildIndexes();
  persistDb();

  return { success: true, user: toPublicUser(newUser) };
}

// User Login
export function loginUser(data: {
  identifier: string; // email or username or apiKey
  password?: string;
}): { success: boolean; user?: PublicUser; error?: string } {
  initDb();

  const id = data.identifier.trim();
  if (!id) {
    return { success: false, error: 'Please enter your email, username, or API Key' };
  }

  let user: UserRecord | undefined;

  // Check if identifier is an API key
  if (id.startsWith('nt_key_')) {
    const userId = memoryDb.apiKeyIndex[id];
    if (userId) user = memoryDb.users[userId];
    if (user) return { success: true, user: toPublicUser(user) };
  }

  // Check email
  const userIdByEmail = memoryDb.emailIndex[id.toLowerCase()];
  if (userIdByEmail) {
    user = memoryDb.users[userIdByEmail];
  } else {
    // Check username
    const userIdByUsername = memoryDb.usernameIndex[id.toLowerCase()];
    if (userIdByUsername) {
      user = memoryDb.users[userIdByUsername];
    }
  }

  if (!user) {
    return { success: false, error: 'No account found with this email or username' };
  }

  if (data.password) {
    const isValid = verifyPassword(data.password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }
  }

  return { success: true, user: toPublicUser(user) };
}

// Find existing registered user strictly without auto-creation
export function findUser(query: {
  userId?: string | null;
  apiKey?: string | null;
  email?: string | null;
}): UserRecord | null {
  initDb();

  if (query.userId && memoryDb.users[query.userId]) {
    return memoryDb.users[query.userId];
  }

  if (query.apiKey) {
    const userId = memoryDb.apiKeyIndex[query.apiKey];
    if (userId && memoryDb.users[userId]) {
      return memoryDb.users[userId];
    }
  }

  if (query.email) {
    const userId = memoryDb.emailIndex[query.email.toLowerCase()];
    if (userId && memoryDb.users[userId]) {
      return memoryDb.users[userId];
    }
  }

  return null;
}

// Shortcut operations strictly for registered users
export function getUserShortcuts(userId: string): Shortcut[] {
  initDb();
  const user = memoryDb.users[userId];
  return user ? user.shortcuts : [];
}

export function addUserShortcut(
  userId: string,
  data: { url: string; name?: string; category?: string; pinned?: boolean }
): { success: boolean; shortcut?: Shortcut; error?: string } {
  initDb();
  const user = memoryDb.users[userId];
  if (!user) {
    return { success: false, error: 'User account not found. Please sign in.' };
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

export function deleteUserShortcut(userId: string, shortcutId: string): boolean {
  initDb();
  const user = memoryDb.users[userId];
  if (!user) return false;

  const initialLength = user.shortcuts.length;
  user.shortcuts = user.shortcuts.filter((s) => s.id !== shortcutId);
  if (user.shortcuts.length !== initialLength) {
    user.updatedAt = Date.now();
    persistDb();
    return true;
  }
  return false;
}

export function setAllUserShortcuts(userId: string, shortcuts: Shortcut[]): boolean {
  initDb();
  const user = memoryDb.users[userId];
  if (!user) return false;

  user.shortcuts = shortcuts;
  user.updatedAt = Date.now();
  persistDb();
  return true;
}

export function getUserCategories(userId: string): string[] {
  initDb();
  const user = memoryDb.users[userId];
  if (!user) return ['Dev', 'AI', 'Social', 'Entertainment', 'Shopping', 'Productivity', 'News'];

  const set = new Set<string>();
  user.shortcuts.forEach((s) => {
    if (s.category && s.category.trim()) {
      set.add(s.category.trim());
    }
  });

  ['Dev', 'AI', 'Social', 'Productivity', 'News'].forEach((c) => set.add(c));
  return Array.from(set);
}

export function regenerateUserApiKey(userId: string): string | null {
  initDb();
  const user = memoryDb.users[userId];
  if (!user) return null;

  const newKey = generateApiKey();
  user.apiKey = newKey;
  user.updatedAt = Date.now();
  rebuildIndexes();
  persistDb();
  return newKey;
}
