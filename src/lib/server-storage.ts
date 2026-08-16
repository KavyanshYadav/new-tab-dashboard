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

// Quotas and Guardrail Limits
export const MAX_SHORTCUTS_PER_USER = 500;
export const MAX_URL_LENGTH = 2048;
export const MAX_NAME_LENGTH = 100;
export const MAX_CATEGORY_LENGTH = 50;
export const MAX_PASSWORD_LENGTH = 72; // PBKDF2 compute exhaustion defense

// Pre-computed dummy hash to prevent timing attacks when user does not exist
const DUMMY_SALT = '0123456789abcdef0123456789abcdef';
const DUMMY_HASH = crypto.pbkdf2Sync('dummy_password_timing_defense', DUMMY_SALT, 1000, 64, 'sha256').toString('hex');
const DUMMY_STORED_HASH = `${DUMMY_SALT}:${DUMMY_HASH}`;

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
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'));
  } catch {
    return false;
  }
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
              shortcuts: Array.isArray(val.shortcuts) ? val.shortcuts.slice(0, MAX_SHORTCUTS_PER_USER) : DEFAULT_SHORTCUTS,
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

// User Registration with Anti-Abuse Validation
export function registerUser(data: {
  username: string;
  email: string;
  password: string;
}): { success: boolean; user?: PublicUser; error?: string } {
  initDb();

  const cleanUsername = data.username.trim();
  const cleanEmail = data.email.trim().toLowerCase();
  const password = data.password;

  // Strict Username Validation (3 to 24 chars, alphanumeric + underscore only)
  const usernameRegex = /^[a-zA-Z0-9_]{3,24}$/;
  if (!usernameRegex.test(cleanUsername)) {
    return {
      success: false,
      error: 'Username must be 3-24 characters long and contain only letters, numbers, and underscores',
    };
  }

  // RFC Email Validation (max 254 chars)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || cleanEmail.length > 254 || !emailRegex.test(cleanEmail)) {
    return { success: false, error: 'Please provide a valid email address (max 254 characters)' };
  }

  // Password Bounds (Min 6, Max 72 characters)
  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long' };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { success: false, error: `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters` };
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

// User Login with Timing Attack Defense
export function loginUser(data: {
  identifier: string; // email or username or apiKey
  password?: string;
}): { success: boolean; user?: PublicUser; error?: string } {
  initDb();

  const id = data.identifier.trim();
  if (!id) {
    return { success: false, error: 'Please enter your email, username, or API Key' };
  }

  if (data.password && data.password.length > MAX_PASSWORD_LENGTH) {
    return { success: false, error: 'Password exceeds maximum length limit' };
  }

  let user: UserRecord | undefined;

  // 1. Check API Key
  if (id.startsWith('nt_key_')) {
    const userId = memoryDb.apiKeyIndex[id];
    if (userId) user = memoryDb.users[userId];
    if (user) return { success: true, user: toPublicUser(user) };
  }

  // 2. Check Email
  const userIdByEmail = memoryDb.emailIndex[id.toLowerCase()];
  if (userIdByEmail) {
    user = memoryDb.users[userIdByEmail];
  } else {
    // 3. Check Username
    const userIdByUsername = memoryDb.usernameIndex[id.toLowerCase()];
    if (userIdByUsername) {
      user = memoryDb.users[userIdByUsername];
    }
  }

  // If user not found, perform dummy PBKDF2 hash to eliminate timing differences (prevents user enumeration)
  if (!user) {
    if (data.password) {
      verifyPassword(data.password, DUMMY_STORED_HASH);
    }
    return { success: false, error: 'Invalid email, username, or password' };
  }

  if (data.password) {
    const isValid = verifyPassword(data.password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Invalid email, username, or password' };
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

// Shortcut operations strictly with quotas and bounds checking
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

  // Enforce account storage quota
  if (user.shortcuts.length >= MAX_SHORTCUTS_PER_USER) {
    return {
      success: false,
      error: `Account storage limit reached (Max ${MAX_SHORTCUTS_PER_USER} bookmarks). Please remove some shortcuts first.`,
    };
  }

  const cleanUrl = (data.url || '').trim();
  if (!cleanUrl) {
    return { success: false, error: 'URL is required' };
  }

  if (cleanUrl.length > MAX_URL_LENGTH) {
    return { success: false, error: `URL cannot exceed ${MAX_URL_LENGTH} characters` };
  }

  // Validate protocol
  if (!/^https?:\/\//i.test(cleanUrl)) {
    return { success: false, error: 'URL must start with http:// or https://' };
  }

  const cleanName = (data.name || '').trim().slice(0, MAX_NAME_LENGTH) || hostname(cleanUrl);
  const cleanCategory = (data.category || '').trim().slice(0, MAX_CATEGORY_LENGTH) || undefined;

  const newShortcut: Shortcut = {
    id: crypto.randomUUID(),
    url: cleanUrl,
    name: cleanName,
    category: cleanCategory,
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

  // Bound array length and sanitize items
  user.shortcuts = shortcuts.slice(0, MAX_SHORTCUTS_PER_USER).map((s) => ({
    ...s,
    url: (s.url || '').trim().slice(0, MAX_URL_LENGTH),
    name: (s.name || '').trim().slice(0, MAX_NAME_LENGTH),
    category: s.category ? s.category.trim().slice(0, MAX_CATEGORY_LENGTH) : undefined,
  }));
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
      set.add(s.category.trim().slice(0, MAX_CATEGORY_LENGTH));
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
