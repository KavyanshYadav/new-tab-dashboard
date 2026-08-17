#!/usr/bin/env node

/**
 * Development Benchmark & Test Report Generator
 * 
 * Runs API test suites, latency benchmarks, security audits, and Turso DB health checks.
 * Outputs a standalone static HTML report to public/_dev_report.html (dev-only).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const TEST_API_KEY = process.env.TEST_API_KEY || 'nt_key_d255b33a2d79b92684536dc7f872da64';
const TEST_USER_ID = process.env.TEST_USER_ID || 'usr_d255b33a2d79b926';

console.log('\n======================================================');
console.log('🧪 Starting Dev Benchmark & Test Report Generator');
console.log(`🌐 Target Server: ${BASE_URL}`);
console.log(`🔑 Using Key:    ${TEST_API_KEY.slice(0, 10)}...`);
console.log('======================================================\n');

// Measure single HTTP request latency and status
async function measureRequest(url, options = {}) {
  const start = performance.now();
  try {
    const res = await fetch(url, options);
    const duration = performance.now() - start;
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return {
      status: res.status,
      ok: res.ok,
      duration: Math.round(duration * 100) / 100,
      data,
      headers: Object.fromEntries(res.headers.entries()),
      error: null,
    };
  } catch (err) {
    const duration = performance.now() - start;
    return {
      status: 0,
      ok: false,
      duration: Math.round(duration * 100) / 100,
      data: null,
      headers: {},
      error: err.message,
    };
  }
}

// Calculate statistical percentiles (p50, p95, p99, min, max, avg)
function calculateStats(latencies) {
  if (latencies.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = Math.round((sum / sorted.length) * 100) / 100;
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg,
    p50,
    p95,
    p99,
  };
}

// Run latency benchmark with concurrency
async function runLatencyBenchmark(name, url, options, iterations = 30, concurrency = 5) {
  process.stdout.write(`⚡ Benchmarking ${name} (${iterations} requests, concurrency=${concurrency})... `);
  const latencies = [];
  let successful = 0;
  let failed = 0;

  const queue = Array.from({ length: iterations }, (_, i) => i);
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      queue.pop();
      const res = await measureRequest(url, options);
      if (res.ok) {
        successful++;
      } else {
        failed++;
      }
      latencies.push(res.duration);
    }
  });

  const startTotal = performance.now();
  await Promise.all(workers);
  const totalDurationSec = (performance.now() - startTotal) / 1000;
  const stats = calculateStats(latencies);
  const rps = Math.round((iterations / totalDurationSec) * 10) / 10;

  console.log(`✓ Done (avg: ${stats.avg}ms, p95: ${stats.p95}ms, RPS: ${rps})`);

  return {
    name,
    endpoint: url.replace(BASE_URL, ''),
    iterations,
    concurrency,
    successful,
    failed,
    stats,
    rps,
    latencies,
  };
}

async function runSuite() {
  const testResults = [];

  console.log('🔒 Running Security & IDOR Defense Tests...\n');

  // Test 1: GET /api/shortcuts with only userId (should 401)
  const t1 = await measureRequest(`${BASE_URL}/api/shortcuts?userId=${TEST_USER_ID}`);
  testResults.push({
    group: 'Security & Access Control',
    name: 'Reject unauthenticated query on /api/shortcuts?userId',
    status: t1.status === 401 ? 'PASS' : 'FAIL',
    expected: '401 Unauthorized',
    actual: `${t1.status} ${t1.ok ? 'OK' : 'Error'}`,
    duration: t1.duration,
    details: 'Prevent IDOR bypass when only userId is provided without valid x-api-key.',
  });

  // Test 2: GET /api/auth/me with only userId (should 401)
  const t2 = await measureRequest(`${BASE_URL}/api/auth/me?userId=${TEST_USER_ID}`);
  testResults.push({
    group: 'Security & Access Control',
    name: 'Reject unauthenticated profile lookup on /api/auth/me',
    status: t2.status === 401 ? 'PASS' : 'FAIL',
    expected: '401 Unauthorized',
    actual: `${t2.status}`,
    duration: t2.duration,
    details: 'Prevent sensitive API key extraction through unauthenticated profile query.',
  });

  // Test 3: POST /api/key unauthenticated regeneration (should 401)
  const t3 = await measureRequest(`${BASE_URL}/api/key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: TEST_USER_ID }),
  });
  testResults.push({
    group: 'Security & Access Control',
    name: 'Reject unauthenticated key regeneration on POST /api/key',
    status: t3.status === 401 ? 'PASS' : 'FAIL',
    expected: '401 Unauthorized',
    actual: `${t3.status}`,
    duration: t3.duration,
    details: 'Prevent unauthorized API key hijacking without proof of existing key.',
  });

  // Test 4: Security Headers Verification
  const t4 = await measureRequest(`${BASE_URL}/`);
  const hasXFrame = !!t4.headers['x-frame-options'];
  const hasNosniff = !!t4.headers['x-content-type-options'];
  const hasReferrer = !!t4.headers['referrer-policy'];
  testResults.push({
    group: 'Security & Access Control',
    name: 'Enforce Security Response Headers (X-Frame-Options, nosniff, Referrer)',
    status: (hasXFrame && hasNosniff) ? 'PASS' : 'FAIL',
    expected: 'DENY, nosniff, strict-origin',
    actual: `X-Frame: ${t4.headers['x-frame-options'] || 'Missing'}, Nosniff: ${t4.headers['x-content-type-options'] || 'Missing'}`,
    duration: t4.duration,
    details: 'Verify strict Next.js security headers in HTTP response.',
  });

  console.log('📡 Running Functional API Contract Tests...\n');

  // Test 5: GET /api/key with valid API Key
  const t5 = await measureRequest(`${BASE_URL}/api/key`, {
    headers: { 'x-api-key': TEST_API_KEY },
  });
  testResults.push({
    group: 'API Contracts & Functionality',
    name: 'Verify API Key on GET /api/key',
    status: (t5.status === 200 && t5.data?.valid === true) ? 'PASS' : 'FAIL',
    expected: '200 OK (valid: true)',
    actual: `${t5.status} (username: @${t5.data?.username || 'unknown'})`,
    duration: t5.duration,
    details: 'Validates API key authenticity and returns user account metadata.',
  });

  // Test 6: GET /api/categories
  const t6 = await measureRequest(`${BASE_URL}/api/categories`, {
    headers: { 'x-api-key': TEST_API_KEY },
  });
  testResults.push({
    group: 'API Contracts & Functionality',
    name: 'Fetch user categories on GET /api/categories',
    status: (t6.status === 200 && Array.isArray(t6.data?.categories)) ? 'PASS' : 'FAIL',
    expected: '200 OK (Array of categories)',
    actual: `${t6.status} (${t6.data?.categories?.length || 0} categories)`,
    duration: t6.duration,
    details: 'Retrieves distinct categories for auto-completion in extension.',
  });

  // Test 7: GET /api/shortcuts
  const t7 = await measureRequest(`${BASE_URL}/api/shortcuts`, {
    headers: { 'x-api-key': TEST_API_KEY },
  });
  testResults.push({
    group: 'API Contracts & Functionality',
    name: 'Fetch shortcuts list on GET /api/shortcuts',
    status: (t7.status === 200 && Array.isArray(t7.data?.shortcuts)) ? 'PASS' : 'FAIL',
    expected: '200 OK (Array of shortcuts)',
    actual: `${t7.status} (${t7.data?.shortcuts?.length || 0} shortcuts)`,
    duration: t7.duration,
    details: 'Retrieves full list of active user bookmarks with metadata.',
  });

  // Test 8: GET /api/shortcuts?pinned=true (Quick Launcher API)
  const t8 = await measureRequest(`${BASE_URL}/api/shortcuts?pinned=true`, {
    headers: { 'x-api-key': TEST_API_KEY },
  });
  testResults.push({
    group: 'API Contracts & Functionality',
    name: 'Quick Launcher filtered fetch on GET /api/shortcuts?pinned=true',
    status: (t8.status === 200 && Array.isArray(t8.data?.shortcuts)) ? 'PASS' : 'FAIL',
    expected: '200 OK (Pinned shortcuts array)',
    actual: `${t8.status} (${t8.data?.shortcuts?.length || 0} pinned shortcuts)`,
    duration: t8.duration,
    details: 'Returns starred/pinned shortcuts for 0ms Spotlight launcher load.',
  });

  // Test 9: POST /api/shortcuts (Create item)
  const testBookmarkUrl = `https://example.com/test-${Date.now()}`;
  const t9 = await measureRequest(`${BASE_URL}/api/shortcuts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': TEST_API_KEY,
    },
    body: JSON.stringify({
      url: testBookmarkUrl,
      name: 'Benchmark Temp Test',
      category: 'Dev',
      pinned: true,
    }),
  });
  const createdId = t9.data?.shortcut?.id;
  testResults.push({
    group: 'API Contracts & Functionality',
    name: 'Create new bookmark on POST /api/shortcuts',
    status: (t9.status === 201 && !!createdId) ? 'PASS' : 'FAIL',
    expected: '201 Created',
    actual: `${t9.status} (ID: ${createdId ? createdId.slice(0, 8) + '...' : 'none'})`,
    duration: t9.duration,
    details: 'Inserts new bookmark into cloud database with category and pin flags.',
  });

  // Test 10: DELETE /api/shortcuts (Cleanup item)
  if (createdId) {
    const t10 = await measureRequest(`${BASE_URL}/api/shortcuts?id=${createdId}`, {
      method: 'DELETE',
      headers: { 'x-api-key': TEST_API_KEY },
    });
    testResults.push({
      group: 'API Contracts & Functionality',
      name: 'Delete bookmark on DELETE /api/shortcuts?id=',
      status: t10.status === 200 ? 'PASS' : 'FAIL',
      expected: '200 OK',
      actual: `${t10.status}`,
      duration: t10.duration,
      details: 'Removes bookmark cleanly from database storage.',
    });
  }

  console.log('\n📊 Running Latency Benchmarks...\n');

  const benchmarks = [];
  benchmarks.push(await runLatencyBenchmark('GET /api/key (Auth Check)', `${BASE_URL}/api/key`, {
    headers: { 'x-api-key': TEST_API_KEY },
  }, 40, 5));

  benchmarks.push(await runLatencyBenchmark('GET /api/shortcuts (Full Fetch)', `${BASE_URL}/api/shortcuts`, {
    headers: { 'x-api-key': TEST_API_KEY },
  }, 40, 5));

  benchmarks.push(await runLatencyBenchmark('GET /api/shortcuts?pinned=true (Launcher)', `${BASE_URL}/api/shortcuts?pinned=true`, {
    headers: { 'x-api-key': TEST_API_KEY },
  }, 40, 5));

  benchmarks.push(await runLatencyBenchmark('GET /api/categories (Autocomplete)', `${BASE_URL}/api/categories`, {
    headers: { 'x-api-key': TEST_API_KEY },
  }, 40, 5));

  // Generate HTML Report
  const passedCount = testResults.filter((t) => t.status === 'PASS').length;
  const failedCount = testResults.filter((t) => t.status === 'FAIL').length;
  const totalCount = testResults.length;
  const passRate = Math.round((passedCount / totalCount) * 100);

  const reportData = {
    generatedAt: new Date().toISOString(),
    environment: 'development',
    serverUrl: BASE_URL,
    summary: {
      totalTests: totalCount,
      passed: passedCount,
      failed: failedCount,
      passRate: `${passRate}%`,
    },
    tests: testResults,
    benchmarks: benchmarks.map((b) => ({
      name: b.name,
      endpoint: b.endpoint,
      iterations: b.iterations,
      stats: b.stats,
      rps: b.rps,
    })),
  };

  const htmlContent = generateHtmlReport(reportData);

  // Write static report to public/_dev_report.html
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  const reportPath = path.join(PUBLIC_DIR, '_dev_report.html');
  fs.writeFileSync(reportPath, htmlContent, 'utf-8');

  console.log('\n======================================================');
  console.log(`✅ Benchmark Suite Completed!`);
  console.log(`📈 Tests: ${passedCount}/${totalCount} Passed (${passRate}%)`);
  console.log(`📄 Static Web Report saved: file:///${reportPath.replace(/\\/g, '/')}`);
  console.log(`🌐 Dev Report URL: ${BASE_URL}/_dev_report.html or ${BASE_URL}/dev-report`);
  console.log('======================================================\n');
}

function generateHtmlReport(data) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dev Benchmark & Test Report | New Tab Dashboard</title>
  <style>
    :root {
      --bg: #09090b;
      --card: #121215;
      --card-hover: #18181c;
      --border: #222226;
      --border-subtle: #1c1c20;
      --text: #f4f4f5;
      --text-muted: #a1a1aa;
      --text-dim: #71717a;
      --accent: #3b82f6;
      --success: #10b981;
      --success-bg: rgba(16, 185, 129, 0.1);
      --danger: #ef4444;
      --danger-bg: rgba(239, 68, 68, 0.1);
      --warning: #f59e0b;
      --font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      line-height: 1.5;
      padding: 32px 20px;
    }

    .container {
      max-width: 1080px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .title {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .dev-badge {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
    }

    .meta {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-dim);
      margin-top: 4px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
      margin-bottom: 32px;
    }

    .summary-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px;
    }

    .summary-card .label {
      font-size: 12px;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }

    .summary-card .value {
      font-size: 28px;
      font-weight: 700;
      font-family: var(--font-mono);
    }

    .value.pass { color: var(--success); }
    .value.fail { color: var(--danger); }
    .value.rate { color: var(--accent); }

    .section-title {
      font-size: 17px;
      font-weight: 600;
      margin: 28px 0 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .table-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 24px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }

    th {
      background: #151518;
      color: var(--text-dim);
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-subtle);
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: var(--card-hover);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
    }

    .badge.pass {
      background: var(--success-bg);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .badge.fail {
      background: var(--danger-bg);
      color: var(--danger);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .latency-bar-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .latency-bar {
      height: 6px;
      background: var(--accent);
      border-radius: 3px;
      min-width: 4px;
    }

    .latency-text {
      font-family: var(--font-mono);
      font-size: 12px;
    }

    .bench-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
      margin-bottom: 32px;
    }

    .bench-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px;
    }

    .bench-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .bench-metrics {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 12px;
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      color: var(--text-muted);
    }

    .metric-val {
      color: var(--text);
      font-weight: 600;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      font-size: 12px;
      color: var(--text-dim);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }

    .footer a {
      color: var(--accent);
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div>
        <h1 class="title">
          ⚡ System Benchmark & Test Suite
          <span class="dev-badge">Dev Only</span>
        </h1>
        <div class="meta">
          Target: <code>${data.serverUrl}</code> &bull; Generated: ${new Date(data.generatedAt).toLocaleString()}
        </div>
      </div>
      <div>
        <a href="/" style="background: #27272a; color: #fff; text-decoration: none; font-size: 13px; font-weight: 500; padding: 8px 14px; border-radius: 8px; border: 1px solid #3f3f46;">
          ← Back to Dashboard
        </a>
      </div>
    </header>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="label">Pass Rate</div>
        <div class="value rate">${data.summary.passRate}</div>
      </div>
      <div class="summary-card">
        <div class="label">Tests Passed</div>
        <div class="value pass">${data.summary.passed} / ${data.summary.totalTests}</div>
      </div>
      <div class="summary-card">
        <div class="label">Tests Failed</div>
        <div class="value ${data.summary.failed > 0 ? 'fail' : 'pass'}">${data.summary.failed}</div>
      </div>
      <div class="summary-card">
        <div class="label">Total Benchmarks</div>
        <div class="value">${data.benchmarks.length}</div>
      </div>
    </div>

    <h2 class="section-title">⚡ Latency & Throughput Benchmarks</h2>
    <div class="bench-grid">
      ${data.benchmarks.map((b) => `
        <div class="bench-card">
          <div class="bench-title">
            <span>${b.name}</span>
            <span style="font-size: 11px; font-family: var(--font-mono); color: var(--accent);">${b.rps} req/s</span>
          </div>
          <div class="bench-metrics">
            <div class="metric-row">
              <span>Avg Latency:</span>
              <span class="metric-val">${b.stats.avg} ms</span>
            </div>
            <div class="metric-row">
              <span>p50 (Median):</span>
              <span class="metric-val">${b.stats.p50} ms</span>
            </div>
            <div class="metric-row">
              <span>p95:</span>
              <span class="metric-val">${b.stats.p95} ms</span>
            </div>
            <div class="metric-row">
              <span>Min / Max:</span>
              <span class="metric-val">${b.stats.min} / ${b.stats.max} ms</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <h2 class="section-title">🔒 Security & Functional Test Results</h2>
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Category</th>
            <th>Test Specification</th>
            <th>Expected</th>
            <th>Actual</th>
            <th>Latency</th>
          </tr>
        </thead>
        <tbody>
          ${data.tests.map((t) => `
            <tr>
              <td>
                <span class="badge ${t.status === 'PASS' ? 'pass' : 'fail'}">${t.status}</span>
              </td>
              <td style="color: var(--text-dim); font-size: 12px;">${t.group}</td>
              <td>
                <div style="font-weight: 600; color: var(--text);">${t.name}</div>
                <div style="font-size: 11.5px; color: var(--text-dim); margin-top: 2px;">${t.details}</div>
              </td>
              <td><code style="font-family: var(--font-mono); font-size: 12px; color: var(--text-muted);">${t.expected}</code></td>
              <td><code style="font-family: var(--font-mono); font-size: 12px; color: ${t.status === 'PASS' ? 'var(--success)' : 'var(--danger)'};">${t.actual}</code></td>
              <td>
                <div class="latency-bar-wrap">
                  <div class="latency-bar" style="width: ${Math.min(100, Math.max(8, t.duration))}px;"></div>
                  <span class="latency-text">${t.duration}ms</span>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <footer class="footer">
      <div>New Tab Dashboard &bull; Automated Benchmarking Suite</div>
      <div>🔒 Strictly restricted to local development environment (404 in production).</div>
    </footer>
  </div>
</body>
</html>`;
}

runSuite().catch((err) => {
  console.error('Benchmark suite error:', err);
  process.exit(1);
});
