import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Shortcut, UserRecord, PublicUser } from './types';
import { DEFAULT_SHORTCUTS } from './constants';
import { hostname } from './utils';
import { isTursoConfigured, getTursoClient, initTursoSchema } from './turso';

interface Database {
  users: Record<string, UserRecord>; // Keyed by userId
  apiKeyIndex: Record<string, string>; // apiKey -> userId
  emailIndex: Record<string, string>; // email.toLowerCase() -> userId
  usernameIndex: Record<string, string>; // username.toLowerCase() -> userId
}

// In-memory cache for fast access & local fallback
const memoryDb: Database = {
  users: {},
  apiKeyIndex: {},
  emailIndex: {},
  usernameIndex: {},
};

// Database file locations (for local dev & serverless /tmp fallback)
const LOCAL_DATA_DIR = path.join(process.cwd(), '.data');
const LOCAL_DB_FILE = path.join(LOCAL_DATA_DIR, 'db.json');
const TMP_DATA_DIR = path.join('/tmp', '.data');
const TMP_DB_FILE = path.join(TMP_DATA_DIR, 'db.json');

// Quotas and Guardrail Limits
export const MAX_SHORTCUTS_PER_USER = 500;
export const MAX_URL_LENGTH = 2048;
export const MAX_NAME_LENGTH = 100;
export const MAX_CATEGORY_LENGTH = 50;
export const MAX_PASSWORD_LENGTH = 72;

// Cryptographic Password Hashing (PBKDF2-HMAC-SHA256 with 100,000 iterations)
const PBKDF2_ITERATIONS = 100000;
const DUMMY_SALT = '0123456789abcdef0123456789abcdef';
const DUMMY_HASH = crypto.pbkdf2Sync('dummy_password_timing_defense', DUMMY_SALT, PBKDF2_ITERATIONS, 64, 'sha256').toString('hex');
const DUMMY_STORED_HASH = `v2:${PBKDF2_ITERATIONS}:${DUMMY_SALT}:${DUMMY_HASH}`;

export function hashPassword(password: string, salt?: string): string {
  const finalSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, finalSalt, PBKDF2_ITERATIONS, 64, 'sha256').toString('hex');
  return `v2:${PBKDF2_ITERATIONS}:${finalSalt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  const parts = storedHash.split(':');

  let iterations = 1000;
  let salt = '';
  let hash = '';

  if (parts.length === 4 && parts[0] === 'v2') {
    iterations = parseInt(parts[1], 10) || PBKDF2_ITERATIONS;
    salt = parts[2];
    hash = parts[3];
  } else if (parts.length === 2) {
    // Legacy v1 format compatibility
    salt = parts[0];
    hash = parts[1];
    iterations = 1000;
  } else {
    return false;
  }

  if (!salt || !hash) return false;
  const verify = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha256').toString('hex');
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

function loadUsersFromFile(filePath: string): Record<string, UserRecord> {
  const users: Record<string, UserRecord> = {};
  try {
    if (typeof fs !== 'undefined' && fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.users === 'object') {
        Object.entries(parsed.users).forEach(([key, val]: [string, any]) => {
          if (val && typeof val === 'object') {
            const uid = val.userId || key;
            users[uid] = {
              userId: uid,
              username: val.username || `user_${uid.slice(4, 10)}`,
              email: val.email || `${uid}@local.dev`,
              passwordHash: val.passwordHash || hashPassword('password123'),
              apiKey: val.apiKey || generateApiKey(),
              shortcuts: Array.isArray(val.shortcuts) ? val.shortcuts.slice(0, MAX_SHORTCUTS_PER_USER) : DEFAULT_SHORTCUTS,
              createdAt: val.createdAt || Date.now(),
              updatedAt: val.updatedAt || Date.now(),
            };
          }
        });
      }
    }
  } catch (err) {
    console.warn(`Could not read database at ${filePath}:`, err);
  }
  return users;
}

function initLocalDb(): Database {
  const bundledUsers = loadUsersFromFile(LOCAL_DB_FILE);
  const tmpUsers = loadUsersFromFile(TMP_DB_FILE);

  memoryDb.users = {
    ...memoryDb.users,
    ...bundledUsers,
    ...tmpUsers,
  };

  rebuildIndexes();
  return memoryDb;
}

function persistLocalDb() {
  const data = JSON.stringify(memoryDb, null, 2);
  try {
    if (typeof fs !== 'undefined') {
      if (!fs.existsSync(LOCAL_DATA_DIR)) {
        fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(LOCAL_DB_FILE, data, 'utf-8');
    }
  } catch {}

  try {
    if (typeof fs !== 'undefined') {
      if (!fs.existsSync(TMP_DATA_DIR)) {
        fs.mkdirSync(TMP_DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(TMP_DB_FILE, data, 'utf-8');
    }
  } catch {}
}

// Initialize local database on boot
initLocalDb();

// Ensure Turso database schema & initial seed if Turso is active
async function ensureTursoReady(): Promise<void> {
  if (isTursoConfigured()) {
    await initTursoSchema(memoryDb.users);
  }
}

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    userId: user.userId,
    username: user.username,
    email: user.email,
    apiKey: user.apiKey,
    totalShortcuts: user.shortcuts ? user.shortcuts.length : 0,
    createdAt: user.createdAt,
  };
}

// ----------------------------------------------------
// User Queries & Authentication (Turso + Local Fallback)
// ----------------------------------------------------

export async function findUser(query: {
  userId?: string | null;
  apiKey?: string | null;
  email?: string | null;
}): Promise<UserRecord | null> {
  await ensureTursoReady();
  const turso = getTursoClient();

  if (turso) {
    try {
      let sql = '';
      let arg = '';

      if (query.userId) {
        sql = 'SELECT * FROM users WHERE user_id = ? LIMIT 1';
        arg = query.userId;
      } else if (query.apiKey) {
        sql = 'SELECT * FROM users WHERE api_key = ? LIMIT 1';
        arg = query.apiKey;
      } else if (query.email) {
        sql = 'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1';
        arg = query.email;
      }

      if (!sql) return null;

      const userRes = await turso.execute({ sql, args: [arg] });
      if (userRes.rows.length === 0) return null;

      const row = userRes.rows[0];
      const userId = String(row.user_id);

      // Fetch shortcuts for this user
      const scRes = await turso.execute({
        sql: 'SELECT * FROM shortcuts WHERE user_id = ? ORDER BY pinned DESC, added DESC',
        args: [userId],
      });

      const shortcuts: Shortcut[] = scRes.rows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        url: String(r.url),
        category: r.category ? String(r.category) : undefined,
        pinned: Boolean(r.pinned),
        clicks: Number(r.clicks || 0),
        added: Number(r.added || Date.now()),
      }));

      return {
        userId,
        username: String(row.username),
        email: String(row.email),
        passwordHash: String(row.password_hash),
        apiKey: String(row.api_key),
        shortcuts,
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
      };
    } catch (err) {
      console.error('Turso findUser error, falling back to local:', err);
    }
  }

  // Local fallback
  initLocalDb();
  if (query.userId && memoryDb.users[query.userId]) {
    return memoryDb.users[query.userId];
  }
  if (query.apiKey) {
    const userId = memoryDb.apiKeyIndex[query.apiKey];
    if (userId && memoryDb.users[userId]) return memoryDb.users[userId];
  }
  if (query.email) {
    const userId = memoryDb.emailIndex[query.email.toLowerCase()];
    if (userId && memoryDb.users[userId]) return memoryDb.users[userId];
  }

  return null;
}

export async function registerUser(data: {
  username: string;
  email: string;
  password: string;
}): Promise<{ success: boolean; user?: PublicUser; error?: string }> {
  await ensureTursoReady();

  const cleanUsername = data.username.trim();
  const cleanEmail = data.email.trim().toLowerCase();
  const password = data.password;

  const usernameRegex = /^[a-zA-Z0-9_]{3,24}$/;
  if (!usernameRegex.test(cleanUsername)) {
    return {
      success: false,
      error: 'Username must be 3-24 characters long and contain only letters, numbers, and underscores',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || cleanEmail.length > 254 || !emailRegex.test(cleanEmail)) {
    return { success: false, error: 'Please provide a valid email address (max 254 characters)' };
  }

  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long' };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { success: false, error: `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters` };
  }

  const newUserId = generateUserId();
  const newApiKey = generateApiKey();
  const pHash = hashPassword(password);
  const now = Date.now();

  const turso = getTursoClient();
  if (turso) {
    try {
      // Check existing email/username
      const existCheck = await turso.execute({
        sql: 'SELECT email, username FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?) LIMIT 1',
        args: [cleanEmail, cleanUsername],
      });

      if (existCheck.rows.length > 0) {
        const found = existCheck.rows[0];
        if (String(found.email).toLowerCase() === cleanEmail) {
          return { success: false, error: 'An account with this email already exists' };
        }
        return { success: false, error: 'This username is already taken' };
      }

      // Insert user
      await turso.execute({
        sql: `INSERT INTO users (user_id, username, email, password_hash, api_key, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [newUserId, cleanUsername, cleanEmail, pHash, newApiKey, now, now],
      });

      // Insert default shortcuts
      for (const [idx, s] of DEFAULT_SHORTCUTS.entries()) {
        await turso.execute({
          sql: `INSERT INTO shortcuts (id, user_id, name, url, category, pinned, clicks, added)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            `init-${now}-${idx}`,
            newUserId,
            s.name,
            s.url,
            s.category || null,
            s.pinned ? 1 : 0,
            s.clicks || 0,
            now - (5000 - idx * 1000),
          ],
        });
      }

      return {
        success: true,
        user: {
          userId: newUserId,
          username: cleanUsername,
          email: cleanEmail,
          apiKey: newApiKey,
          totalShortcuts: DEFAULT_SHORTCUTS.length,
          createdAt: now,
        },
      };
    } catch (err: any) {
      console.error('Turso register error:', err);
      return { success: false, error: err.message || 'Database registration failed' };
    }
  }

  // Local fallback
  initLocalDb();
  if (memoryDb.emailIndex[cleanEmail]) {
    return { success: false, error: 'An account with this email already exists' };
  }
  if (memoryDb.usernameIndex[cleanUsername.toLowerCase()]) {
    return { success: false, error: 'This username is already taken' };
  }

  const newUser: UserRecord = {
    userId: newUserId,
    username: cleanUsername,
    email: cleanEmail,
    passwordHash: pHash,
    apiKey: newApiKey,
    shortcuts: DEFAULT_SHORTCUTS.map((s, idx) => ({
      ...s,
      id: `init-${now}-${idx}`,
      added: now - (5000 - idx * 1000),
    })),
    createdAt: now,
    updatedAt: now,
  };

  memoryDb.users[newUserId] = newUser;
  rebuildIndexes();
  persistLocalDb();

  return { success: true, user: toPublicUser(newUser) };
}

export async function loginUser(data: {
  identifier: string;
  password?: string;
}): Promise<{ success: boolean; user?: PublicUser; error?: string }> {
  await ensureTursoReady();

  const id = data.identifier.trim();
  if (!id) {
    return { success: false, error: 'Please enter your email, username, or API Key' };
  }

  if (data.password && data.password.length > MAX_PASSWORD_LENGTH) {
    return { success: false, error: 'Password exceeds maximum length limit' };
  }

  const turso = getTursoClient();
  if (turso) {
    try {
      let userRes;
      if (id.startsWith('nt_key_')) {
        userRes = await turso.execute({
          sql: 'SELECT * FROM users WHERE api_key = ? LIMIT 1',
          args: [id],
        });
      } else {
        userRes = await turso.execute({
          sql: 'SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?) LIMIT 1',
          args: [id, id],
        });
      }

      if (userRes.rows.length === 0) {
        if (data.password) verifyPassword(data.password, DUMMY_STORED_HASH);
        return { success: false, error: 'Invalid email, username, or password' };
      }

      const row = userRes.rows[0];
      const storedHash = String(row.password_hash);

      if (data.password) {
        const isValid = verifyPassword(data.password, storedHash);
        if (!isValid) {
          return { success: false, error: 'Invalid email, username, or password' };
        }
      }

      const userId = String(row.user_id);
      const scRes = await turso.execute({
        sql: 'SELECT COUNT(*) as count FROM shortcuts WHERE user_id = ?',
        args: [userId],
      });

      return {
        success: true,
        user: {
          userId,
          username: String(row.username),
          email: String(row.email),
          apiKey: String(row.api_key),
          totalShortcuts: Number(scRes.rows[0]?.count || 0),
          createdAt: Number(row.created_at),
        },
      };
    } catch (err) {
      console.error('Turso login error, falling back to local:', err);
    }
  }

  // Local fallback
  initLocalDb();
  let user: UserRecord | undefined;

  if (id.startsWith('nt_key_')) {
    const userId = memoryDb.apiKeyIndex[id];
    if (userId) user = memoryDb.users[userId];
    if (user) return { success: true, user: toPublicUser(user) };
  }

  const userIdByEmail = memoryDb.emailIndex[id.toLowerCase()];
  if (userIdByEmail) {
    user = memoryDb.users[userIdByEmail];
  } else {
    const userIdByUsername = memoryDb.usernameIndex[id.toLowerCase()];
    if (userIdByUsername) user = memoryDb.users[userIdByUsername];
  }

  if (!user) {
    if (data.password) verifyPassword(data.password, DUMMY_STORED_HASH);
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

// ----------------------------------------------------
// Shortcut Operations (Turso + Local Fallback)
// ----------------------------------------------------

export async function getUserShortcuts(userId: string): Promise<Shortcut[]> {
  await ensureTursoReady();
  const turso = getTursoClient();

  if (turso) {
    try {
      const res = await turso.execute({
        sql: 'SELECT * FROM shortcuts WHERE user_id = ? ORDER BY pinned DESC, added DESC',
        args: [userId],
      });

      return res.rows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        url: String(r.url),
        category: r.category ? String(r.category) : undefined,
        pinned: Boolean(r.pinned),
        clicks: Number(r.clicks || 0),
        added: Number(r.added || Date.now()),
      }));
    } catch (err) {
      console.error('Turso getUserShortcuts error, falling back to local:', err);
    }
  }

  // Local fallback
  initLocalDb();
  const user = memoryDb.users[userId];
  return user ? user.shortcuts : [];
}

export async function addUserShortcut(
  userId: string,
  data: { url: string; name?: string; category?: string; pinned?: boolean }
): Promise<{ success: boolean; shortcut?: Shortcut; error?: string }> {
  await ensureTursoReady();

  const cleanUrl = (data.url || '').trim();
  if (!cleanUrl) {
    return { success: false, error: 'URL is required' };
  }

  if (cleanUrl.length > MAX_URL_LENGTH) {
    return { success: false, error: `URL cannot exceed ${MAX_URL_LENGTH} characters` };
  }

  if (!/^https?:\/\//i.test(cleanUrl)) {
    return { success: false, error: 'URL must start with http:// or https://' };
  }

  const cleanName = (data.name || '').trim().slice(0, MAX_NAME_LENGTH) || hostname(cleanUrl);
  const cleanCategory = (data.category || '').trim().slice(0, MAX_CATEGORY_LENGTH) || undefined;
  const newId = crypto.randomUUID();
  const now = Date.now();

  const newShortcut: Shortcut = {
    id: newId,
    url: cleanUrl,
    name: cleanName,
    category: cleanCategory,
    pinned: !!data.pinned,
    clicks: 0,
    added: now,
  };

  const turso = getTursoClient();
  if (turso) {
    try {
      const countRes = await turso.execute({
        sql: 'SELECT COUNT(*) as count FROM shortcuts WHERE user_id = ?',
        args: [userId],
      });
      const count = Number(countRes.rows[0]?.count || 0);

      if (count >= MAX_SHORTCUTS_PER_USER) {
        return {
          success: false,
          error: `Account storage limit reached (Max ${MAX_SHORTCUTS_PER_USER} bookmarks).`,
        };
      }

      await turso.execute({
        sql: `INSERT INTO shortcuts (id, user_id, name, url, category, pinned, clicks, added)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          newId,
          userId,
          cleanName,
          cleanUrl,
          cleanCategory || null,
          data.pinned ? 1 : 0,
          0,
          now,
        ],
      });

      return { success: true, shortcut: newShortcut };
    } catch (err: any) {
      console.error('Turso addUserShortcut error:', err);
      return { success: false, error: err.message || 'Database write failed' };
    }
  }

  // Local fallback
  initLocalDb();
  const user = memoryDb.users[userId];
  if (!user) {
    return { success: false, error: 'User account not found. Please sign in.' };
  }

  if (user.shortcuts.length >= MAX_SHORTCUTS_PER_USER) {
    return {
      success: false,
      error: `Account storage limit reached (Max ${MAX_SHORTCUTS_PER_USER} bookmarks).`,
    };
  }

  user.shortcuts.push(newShortcut);
  user.updatedAt = now;
  persistLocalDb();

  return { success: true, shortcut: newShortcut };
}

export async function deleteUserShortcut(userId: string, shortcutId: string): Promise<boolean> {
  await ensureTursoReady();
  const turso = getTursoClient();

  if (turso) {
    try {
      const res = await turso.execute({
        sql: 'DELETE FROM shortcuts WHERE id = ? AND user_id = ?',
        args: [shortcutId, userId],
      });
      return res.rowsAffected > 0;
    } catch (err) {
      console.error('Turso deleteUserShortcut error:', err);
      return false;
    }
  }

  // Local fallback
  initLocalDb();
  const user = memoryDb.users[userId];
  if (!user) return false;

  const initialLength = user.shortcuts.length;
  user.shortcuts = user.shortcuts.filter((s) => s.id !== shortcutId);
  if (user.shortcuts.length !== initialLength) {
    user.updatedAt = Date.now();
    persistLocalDb();
    return true;
  }
  return false;
}

export async function setAllUserShortcuts(userId: string, shortcuts: Shortcut[]): Promise<boolean> {
  await ensureTursoReady();
  const bounded = shortcuts.slice(0, MAX_SHORTCUTS_PER_USER);
  const turso = getTursoClient();

  if (turso) {
    try {
      // Transactional replace
      await turso.execute({
        sql: 'DELETE FROM shortcuts WHERE user_id = ?',
        args: [userId],
      });

      for (const s of bounded) {
        await turso.execute({
          sql: `INSERT INTO shortcuts (id, user_id, name, url, category, pinned, clicks, added)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            s.id || crypto.randomUUID(),
            userId,
            (s.name || '').trim().slice(0, MAX_NAME_LENGTH),
            (s.url || '').trim().slice(0, MAX_URL_LENGTH),
            s.category ? s.category.trim().slice(0, MAX_CATEGORY_LENGTH) : null,
            s.pinned ? 1 : 0,
            s.clicks || 0,
            s.added || Date.now(),
          ],
        });
      }
      return true;
    } catch (err) {
      console.error('Turso setAllUserShortcuts error:', err);
      return false;
    }
  }

  // Local fallback
  initLocalDb();
  const user = memoryDb.users[userId];
  if (!user) return false;

  user.shortcuts = bounded.map((s) => ({
    ...s,
    url: (s.url || '').trim().slice(0, MAX_URL_LENGTH),
    name: (s.name || '').trim().slice(0, MAX_NAME_LENGTH),
    category: s.category ? s.category.trim().slice(0, MAX_CATEGORY_LENGTH) : undefined,
  }));
  user.updatedAt = Date.now();
  persistLocalDb();
  return true;
}

export async function getUserCategories(userId: string): Promise<string[]> {
  await ensureTursoReady();
  const turso = getTursoClient();

  if (turso) {
    try {
      const res = await turso.execute({
        sql: 'SELECT DISTINCT category FROM shortcuts WHERE user_id = ? AND category IS NOT NULL AND category != ""',
        args: [userId],
      });

      const set = new Set<string>();
      res.rows.forEach((r) => {
        if (r.category) set.add(String(r.category));
      });

      ['Dev', 'AI', 'Social', 'Productivity', 'News'].forEach((c) => set.add(c));
      return Array.from(set);
    } catch (err) {
      console.error('Turso getUserCategories error, falling back to local:', err);
    }
  }

  // Local fallback
  initLocalDb();
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

export async function regenerateUserApiKey(userId: string): Promise<string | null> {
  await ensureTursoReady();
  const newKey = generateApiKey();
  const now = Date.now();
  const turso = getTursoClient();

  if (turso) {
    try {
      await turso.execute({
        sql: 'UPDATE users SET api_key = ?, updated_at = ? WHERE user_id = ?',
        args: [newKey, now, userId],
      });
      return newKey;
    } catch (err) {
      console.error('Turso regenerateUserApiKey error:', err);
      return null;
    }
  }

  // Local fallback
  initLocalDb();
  const user = memoryDb.users[userId];
  if (!user) return null;

  user.apiKey = newKey;
  user.updatedAt = now;
  rebuildIndexes();
  persistLocalDb();
  return newKey;
}
