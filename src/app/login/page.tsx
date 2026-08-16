'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { TurnstileWidget } from '@/components/TurnstileWidget';

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken('');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (authMode === 'signin') {
      const identifier = emailOrUsername.trim();
      if (!identifier || !password) {
        setStatusMessage({ text: 'Please fill in all fields', isError: true });
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password, turnstileToken }),
        });
        const data = await res.json();
        setIsSubmitting(false);

        if (res.ok && data.user) {
          localStorage.setItem('nt_user_session_v1', JSON.stringify(data.user));
          localStorage.setItem('nt_api_key_v1', data.user.apiKey);
          setStatusMessage({ text: `Signed in as @${data.user.username}! Redirecting...` });
          setTimeout(() => {
            window.location.href = '/';
          }, 800);
        } else {
          setStatusMessage({ text: data.error || 'Authentication failed', isError: true });
        }
      } catch {
        setIsSubmitting(false);
        setStatusMessage({ text: 'Could not connect to authentication server', isError: true });
      }
    } else {
      // signup
      const cleanUsername = username.trim();
      const cleanEmail = email.trim();
      if (!cleanUsername || !cleanEmail || !password) {
        setStatusMessage({ text: 'All fields are required', isError: true });
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUsername, email: cleanEmail, password, turnstileToken }),
        });
        const data = await res.json();
        setIsSubmitting(false);

        if (res.ok && data.user) {
          localStorage.setItem('nt_user_session_v1', JSON.stringify(data.user));
          localStorage.setItem('nt_api_key_v1', data.user.apiKey);
          setStatusMessage({ text: `Account created! User ID: ${data.user.userId}. Redirecting...` });
          setTimeout(() => {
            window.location.href = '/';
          }, 800);
        } else {
          setStatusMessage({ text: data.error || 'Registration failed', isError: true });
        }
      } catch {
        setIsSubmitting(false);
        setStatusMessage({ text: 'Could not connect to authentication server', isError: true });
      }
    }
  };

  return (
    <div className="login-page-shell">
      <div className="login-card">
        <div className="auth-header">
          <div className="auth-brand">
            <span className="auth-brand-icon">✦</span>
            <span className="mono auth-brand-name">New Tab Dashboard</span>
          </div>
          <Link href="/" className="mono back-link">
            &larr; Dashboard
          </Link>
        </div>

        <div className="auth-mode-toggle mono" style={{ marginBottom: '14px' }}>
          <button
            type="button"
            className={`auth-tab-btn ${authMode === 'signin' ? 'active' : ''}`}
            onClick={() => setAuthMode('signin')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${authMode === 'signup' ? 'active' : ''}`}
            onClick={() => setAuthMode('signup')}
          >
            Create Account
          </button>
        </div>

        <div className="auth-titles">
          <h1 className="auth-main-title">
            {authMode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="auth-sub-title">
            {authMode === 'signin'
              ? 'Enter your credentials to sync your bookmarks with your user ID.'
              : 'Sign up to get an isolated User ID, secret API key, and cloud sync.'}
          </p>
        </div>

        {statusMessage && (
          <div
            className={`login-status-banner mono ${
              statusMessage.isError ? 'auth-error-banner' : ''
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Disabled OAuth Providers */}
        <div className="oauth-button-group">
          <button
            type="button"
            className="oauth-btn oauth-btn-disabled"
            disabled
            title="Google OAuth integration is coming soon"
          >
            <svg className="oauth-icon" viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
              />
            </svg>
            <span>Continue with Google <span className="oauth-soon mono">(Coming soon)</span></span>
          </button>

          <button
            type="button"
            className="oauth-btn oauth-btn-disabled"
            disabled
            title="GitHub OAuth integration is coming soon"
          >
            <svg className="oauth-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>Continue with GitHub <span className="oauth-soon mono">(Coming soon)</span></span>
          </button>
        </div>

        {/* Divider */}
        <div className="auth-divider">
          <span className="auth-divider-line"></span>
          <span className="auth-divider-text mono">or with credentials</span>
          <span className="auth-divider-line"></span>
        </div>

        {/* Active Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {authMode === 'signup' && (
            <div className="field">
              <label className="mono" htmlFor="pgUsername">Username</label>
              <input
                type="text"
                id="pgUsername"
                placeholder="e.g. kavyansh"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mono"
                pattern="^[a-zA-Z0-9_]{3,24}$"
                title="3-24 characters, letters, numbers, and underscore only"
                required
              />
            </div>
          )}

          {authMode === 'signup' ? (
            <div className="field">
              <label className="mono" htmlFor="pgEmail">Email Address</label>
              <input
                type="email"
                id="pgEmail"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mono"
                required
              />
            </div>
          ) : (
            <div className="field">
              <label className="mono" htmlFor="pgIdentifier">Email or Username</label>
              <input
                type="text"
                id="pgIdentifier"
                placeholder="you@example.com or username"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className="mono"
                required
              />
            </div>
          )}

          <div className="field">
            <label className="mono" htmlFor="pgPassword">Password</label>
            <input
              type="password"
              id="pgPassword"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mono"
              maxLength={72}
              required
            />
          </div>

          {/* Stable Cloudflare Turnstile Bot Protection Widget */}
          <TurnstileWidget
            key={authMode}
            action={authMode}
            onVerify={handleTurnstileVerify}
            onExpire={handleTurnstileExpire}
          />

          <button
            type="submit"
            className="btn btn-primary mono"
            style={{ height: '42px', marginTop: '6px' }}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Verifying...'
              : authMode === 'signin'
              ? 'Sign In →'
              : 'Create Account →'}
          </button>
        </form>

        <div className="auth-footer mono">
          Protected by Cloudflare Turnstile &bull; Isolated per <code>userId</code>
        </div>
      </div>
    </div>
  );
}
