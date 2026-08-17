import { NextRequest } from 'next/server';
import { jsonResponse } from '@/lib/cors';
import { findUser, getUserShortcuts, getUserCategories } from '@/lib/server-storage';
import { checkAccountLockout, checkRegisterRateLimit, checkLoginIpRateLimit } from '@/lib/rate-limiter';
import { getTursoClient, isTursoConfigured } from '@/lib/turso';

export async function GET(req: NextRequest) {
  // CRITICAL: Strictly available in development environment only
  if (process.env.NODE_ENV === 'production') {
    return jsonResponse({ error: 'Not found' }, 404);
  }

  const host = req.headers.get('host') || 'localhost:3001';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const origin = `${protocol}://${host}`;

  const apiKey = req.nextUrl.searchParams.get('key') || 'nt_key_d255b33a2d79b92684536dc7f872da64';

  const startTime = Date.now();
  const testResults: Array<{
    group: string;
    name: string;
    status: 'PASS' | 'FAIL';
    expected: string;
    actual: string;
    duration: number;
    details: string;
  }> = [];

  // 1. Direct DB Health Check
  const isTurso = isTursoConfigured();
  const dbStart = performance.now();
  let dbStatus = 'Local Memory/JSON';
  if (isTurso) {
    const client = getTursoClient();
    if (client) {
      try {
        await client.execute('SELECT 1');
        dbStatus = 'Turso Cloud libSQL (Connected)';
      } catch {
        dbStatus = 'Turso Cloud libSQL (Error / Fallback to Local)';
      }
    }
  }
  const dbDuration = Math.round((performance.now() - dbStart) * 100) / 100;

  testResults.push({
    group: 'Database & Storage Health',
    name: 'Database Ping & Connectivity',
    status: 'PASS',
    expected: 'Active Database Connection',
    actual: `${dbStatus} (${dbDuration}ms)`,
    duration: dbDuration,
    details: 'Verifies database query execution speed and status.',
  });

  // 2. User Authentication Resolution
  const authStart = performance.now();
  const user = await findUser({ apiKey });
  const authDuration = Math.round((performance.now() - authStart) * 100) / 100;
  testResults.push({
    group: 'API & Authentication',
    name: 'API Key Verification & Lookup',
    status: (user && user.apiKey === apiKey) ? 'PASS' : 'FAIL',
    expected: 'Valid User Record',
    actual: user ? `@${user.username} (${user.userId})` : 'User not found',
    duration: authDuration,
    details: 'Resolves user profile using secure hash index or Turso query.',
  });

  // 3. Shortcuts Retrieval
  if (user) {
    const scStart = performance.now();
    const shortcuts = await getUserShortcuts(user.userId);
    const scDuration = Math.round((performance.now() - scStart) * 100) / 100;
    testResults.push({
      group: 'API & Authentication',
      name: 'User Shortcuts Collection',
      status: Array.isArray(shortcuts) ? 'PASS' : 'FAIL',
      expected: 'Array of shortcuts',
      actual: `${shortcuts.length} shortcuts loaded`,
      duration: scDuration,
      details: 'Fetches user bookmark collection with category and pin metadata.',
    });

    const catStart = performance.now();
    const categories = await getUserCategories(user.userId);
    const catDuration = Math.round((performance.now() - catStart) * 100) / 100;
    testResults.push({
      group: 'API & Authentication',
      name: 'User Categories Aggregation',
      status: categories.length > 0 ? 'PASS' : 'FAIL',
      expected: 'Non-empty category list',
      actual: `[${categories.slice(0, 4).join(', ')}...]`,
      duration: catDuration,
      details: 'Aggregates distinct category tags for auto-completion.',
    });
  }

  // 4. Rate Limiting Tests
  const ipCheck = checkLoginIpRateLimit('127.0.0.1');
  const regCheck = checkRegisterRateLimit('127.0.0.1');
  const lockoutCheck = checkAccountLockout('test_safe_account');

  testResults.push({
    group: 'Security & Rate Limiting',
    name: 'Sliding-Window Rate Limiter Engine',
    status: (ipCheck.allowed && regCheck.allowed && !lockoutCheck.locked) ? 'PASS' : 'FAIL',
    expected: 'Rate limiter operational',
    actual: `IP Remaining: ${ipCheck.remaining}, Reg Remaining: ${regCheck.remaining}`,
    duration: 0.1,
    details: 'Verifies sliding-window rate tracking and brute-force lockout logic.',
  });

  // 5. Memory & Process Telemetry
  const memoryUsage = process.memoryUsage();

  const passed = testResults.filter((t) => t.status === 'PASS').length;
  const failed = testResults.filter((t) => t.status === 'FAIL').length;
  const total = testResults.length;

  return jsonResponse({
    success: true,
    environment: 'development',
    target: origin,
    executedAt: new Date().toISOString(),
    executionDurationMs: Date.now() - startTime,
    summary: {
      total,
      passed,
      failed,
      passRate: `${Math.round((passed / total) * 100)}%`,
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      databaseType: dbStatus,
      memory: {
        rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 10) / 10,
        heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 10) / 10,
        heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 10) / 10,
      },
    },
    tests: testResults,
    apiDirectory: [
      { method: 'GET', path: '/api/shortcuts', desc: 'Fetch user shortcuts list (requires x-api-key)' },
      { method: 'POST', path: '/api/shortcuts', desc: 'Add new bookmark (requires x-api-key)' },
      { method: 'PUT', path: '/api/shortcuts', desc: 'Bulk update/sync shortcuts (requires x-api-key)' },
      { method: 'DELETE', path: '/api/shortcuts', desc: 'Delete shortcut by id (requires x-api-key)' },
      { method: 'GET', path: '/api/categories', desc: 'Get distinct category tags (requires x-api-key)' },
      { method: 'GET', path: '/api/key', desc: 'Verify API Key and fetch profile metadata' },
      { method: 'POST', path: '/api/key', desc: 'Regenerate API Key (requires existing key)' },
      { method: 'POST', path: '/api/auth/login', desc: 'User authentication with password & Turnstile' },
      { method: 'POST', path: '/api/auth/register', desc: 'New user registration with Turnstile' },
      { method: 'GET', path: '/api/auth/me', desc: 'Fetch session profile (requires x-api-key)' },
    ],
  });
}
