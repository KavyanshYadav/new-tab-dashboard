import { createClient, Client } from '@libsql/client';
import { UserRecord, Shortcut } from './types';
import { DEFAULT_SHORTCUTS } from './constants';

let tursoClient: Client | null = null;
let schemaInitialized = false;

export function isTursoConfigured(): boolean {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  return Boolean(url && url.trim().length > 0 && token && token.trim().length > 0);
}

export function getTursoClient(): Client | null {
  if (!isTursoConfigured()) {
    return null;
  }

  if (!tursoClient) {
    tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL!.trim(),
      authToken: process.env.TURSO_AUTH_TOKEN!.trim(),
    });
  }

  return tursoClient;
}

export async function initTursoSchema(bundledSeedUsers?: Record<string, UserRecord>): Promise<void> {
  const client = getTursoClient();
  if (!client || schemaInitialized) return;

  try {
    // 1. Create Users Table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        api_key TEXT UNIQUE NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // 2. Create Shortcuts Table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS shortcuts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        category TEXT,
        pinned INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        added INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
    `);

    // 3. Create Performance Indexes
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_shortcuts_user ON shortcuts(user_id);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);

    // 4. Auto-Seed Initial Accounts if Turso is empty
    if (bundledSeedUsers && Object.keys(bundledSeedUsers).length > 0) {
      const countRes = await client.execute('SELECT COUNT(*) as count FROM users');
      const count = Number(countRes.rows[0]?.count || 0);

      if (count === 0) {
        console.log('⚡ Turso Database is empty. Seeding initial accounts...');
        for (const user of Object.values(bundledSeedUsers)) {
          await client.execute({
            sql: `INSERT OR IGNORE INTO users (user_id, username, email, password_hash, api_key, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [
              user.userId,
              user.username,
              user.email,
              user.passwordHash,
              user.apiKey,
              user.createdAt,
              user.updatedAt,
            ],
          });

          const shortcutsToSeed = Array.isArray(user.shortcuts) ? user.shortcuts : DEFAULT_SHORTCUTS;
          for (const s of shortcutsToSeed) {
            await client.execute({
              sql: `INSERT OR IGNORE INTO shortcuts (id, user_id, name, url, category, pinned, clicks, added)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                s.id,
                user.userId,
                s.name,
                s.url,
                s.category || null,
                s.pinned ? 1 : 0,
                s.clicks || 0,
                s.added || Date.now(),
              ],
            });
          }
        }
        console.log('✅ Turso Database successfully seeded with initial accounts!');
      }
    }

    schemaInitialized = true;
  } catch (err) {
    console.error('Error initializing Turso schema:', err);
  }
}
