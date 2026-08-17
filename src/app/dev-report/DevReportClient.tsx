'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface BenchmarkResult {
  success: boolean;
  environment: string;
  target: string;
  executedAt: string;
  executionDurationMs: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: string;
  };
  system: {
    nodeVersion: string;
    platform: string;
    databaseType: string;
    memory: {
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
    };
  };
  tests: Array<{
    group: string;
    name: string;
    status: 'PASS' | 'FAIL';
    expected: string;
    actual: string;
    duration: number;
    details: string;
  }>;
  apiDirectory: Array<{
    method: string;
    path: string;
    desc: string;
  }>;
}

export default function DevReportClient() {
  const [data, setData] = useState<BenchmarkResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tests' | 'api' | 'system'>('tests');

  const runBenchmark = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dev-benchmark');
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch benchmark`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error running benchmark');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runBenchmark();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#f4f4f5', fontFamily: 'var(--font-sans)', padding: '36px 20px' }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #222226', paddingBottom: '20px', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.02em' }}>
                ⚡ System Benchmark & Dev Report
              </h1>
              <span style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', fontFamily: 'monospace', fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                Dev Only
              </span>
            </div>
            <p style={{ color: '#71717a', fontSize: '13px', fontFamily: 'monospace', marginTop: '6px' }}>
              Automated testing, security verification, and performance telemetry
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={runBenchmark}
              disabled={loading}
              style={{
                background: loading ? '#3f3f46' : '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.15s ease',
              }}
            >
              {loading ? 'Running Suite...' : '↻ Re-run Suite'}
            </button>
            <Link
              href="/"
              style={{
                background: '#18181b',
                color: '#a1a1aa',
                border: '1px solid #27272a',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                textDecoration: 'none',
                fontWeight: '500',
              }}
            >
              ← Back to Dashboard
            </Link>
          </div>
        </header>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '14px 18px', borderRadius: '10px', marginBottom: '24px', fontSize: '13px' }}>
            ✕ Error: {error}
          </div>
        )}

        {/* Metric Cards */}
        {data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '28px' }}>
              <div style={{ background: '#121215', border: '1px solid #222226', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Pass Rate</div>
                <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'monospace', color: '#3b82f6' }}>{data.summary.passRate}</div>
              </div>
              <div style={{ background: '#121215', border: '1px solid #222226', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Tests Passed</div>
                <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'monospace', color: '#10b981' }}>{data.summary.passed} / {data.summary.total}</div>
              </div>
              <div style={{ background: '#121215', border: '1px solid #222226', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Execution Time</div>
                <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'monospace', color: '#f4f4f5' }}>{data.executionDurationMs} ms</div>
              </div>
              <div style={{ background: '#121215', border: '1px solid #222226', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Heap Memory</div>
                <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'monospace', color: '#a1a1aa' }}>{data.system.memory.heapUsedMb} MB</div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #222226', paddingBottom: '12px', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('tests')}
                style={{
                  background: activeTab === 'tests' ? '#27272a' : 'transparent',
                  color: activeTab === 'tests' ? '#fff' : '#71717a',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                🧪 Tests & Security Matrix
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('api')}
                style={{
                  background: activeTab === 'api' ? '#27272a' : 'transparent',
                  color: activeTab === 'api' ? '#fff' : '#71717a',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                📡 API Directory & Routes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('system')}
                style={{
                  background: activeTab === 'system' ? '#27272a' : 'transparent',
                  color: activeTab === 'system' ? '#fff' : '#71717a',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                ⚙️ System Telemetry
              </button>
            </div>

            {/* Tab 1: Tests */}
            {activeTab === 'tests' && (
              <div style={{ background: '#121215', border: '1px solid #222226', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#151518', borderBottom: '1px solid #222226' }}>
                      <th style={{ padding: '12px 16px', color: '#71717a', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                      <th style={{ padding: '12px 16px', color: '#71717a', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Group</th>
                      <th style={{ padding: '12px 16px', color: '#71717a', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Test Name</th>
                      <th style={{ padding: '12px 16px', color: '#71717a', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actual Result</th>
                      <th style={{ padding: '12px 16px', color: '#71717a', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tests.map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #1c1c20' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            background: t.status === 'PASS' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: t.status === 'PASS' ? '#10b981' : '#ef4444',
                            border: `1px solid ${t.status === 'PASS' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            fontWeight: '600',
                          }}>
                            {t.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#71717a', fontSize: '12px' }}>{t.group}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: '600', color: '#f4f4f5' }}>{t.name}</div>
                          <div style={{ fontSize: '11.5px', color: '#71717a', marginTop: '2px' }}>{t.details}</div>
                        </td>
                        <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#a1a1aa' }}>
                          {t.actual}
                        </td>
                        <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#a1a1aa' }}>
                          {t.duration} ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 2: API Directory */}
            {activeTab === 'api' && (
              <div style={{ background: '#121215', border: '1px solid #222226', borderRadius: '12px', padding: '18px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Registered Backend API Routes</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {data.apiDirectory.map((api, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#18181c', border: '1px solid #222226', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          background: api.method === 'GET' ? '#1e3a8a' : (api.method === 'POST' ? '#14532d' : (api.method === 'DELETE' ? '#7f1d1d' : '#831843')),
                          color: '#fff',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '4px',
                        }}>
                          {api.method}
                        </span>
                        <code style={{ fontFamily: 'monospace', fontSize: '13px', color: '#f4f4f5' }}>{api.path}</code>
                      </div>
                      <span style={{ fontSize: '12.5px', color: '#71717a' }}>{api.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: System */}
            {activeTab === 'system' && (
              <div style={{ background: '#121215', border: '1px solid #222226', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Runtime Environment Telemetry</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontFamily: 'monospace', fontSize: '13px' }}>
                  <div style={{ background: '#18181c', padding: '14px', borderRadius: '8px', border: '1px solid #222226' }}>
                    <div style={{ color: '#71717a', fontSize: '11px', marginBottom: '4px' }}>NODE VERSION</div>
                    <div style={{ color: '#f4f4f5', fontWeight: '600' }}>{data.system.nodeVersion}</div>
                  </div>
                  <div style={{ background: '#18181c', padding: '14px', borderRadius: '8px', border: '1px solid #222226' }}>
                    <div style={{ color: '#71717a', fontSize: '11px', marginBottom: '4px' }}>PLATFORM</div>
                    <div style={{ color: '#f4f4f5', fontWeight: '600' }}>{data.system.platform}</div>
                  </div>
                  <div style={{ background: '#18181c', padding: '14px', borderRadius: '8px', border: '1px solid #222226' }}>
                    <div style={{ color: '#71717a', fontSize: '11px', marginBottom: '4px' }}>DATABASE STATUS</div>
                    <div style={{ color: '#10b981', fontWeight: '600' }}>{data.system.databaseType}</div>
                  </div>
                  <div style={{ background: '#18181c', padding: '14px', borderRadius: '8px', border: '1px solid #222226' }}>
                    <div style={{ color: '#71717a', fontSize: '11px', marginBottom: '4px' }}>MEMORY RSS</div>
                    <div style={{ color: '#f4f4f5', fontWeight: '600' }}>{data.system.memory.rssMb} MB</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <footer style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #222226', fontSize: '12px', color: '#71717a', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>New Tab Dashboard &bull; Development Benchmarking Suite</div>
          <div>🔒 Automatically blocked with 404 in production builds.</div>
        </footer>
      </div>
    </div>
  );
}
