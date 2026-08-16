'use client';

import React, { useState, useEffect } from 'react';
import { PublicUser } from '@/lib/types';

interface ApiSettingsModalProps {
  isOpen: boolean;
  user: PublicUser | null;
  apiKey: string;
  onClose: () => void;
  onOpenAuth: () => void;
  onRegenerateKey: () => Promise<string | undefined>;
  onShowToast: (msg: string) => void;
}

export function ApiSettingsModal({
  isOpen,
  user,
  apiKey,
  onClose,
  onOpenAuth,
  onRegenerateKey,
  onShowToast,
}: ApiSettingsModalProps) {
  const [copied, setCopied] = useState(false);
  const [appUrl, setAppUrl] = useState('http://localhost:3001');
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const effectiveKey = user?.apiKey || apiKey;

  const handleCopyKey = () => {
    if (!effectiveKey) return;
    navigator.clipboard.writeText(effectiveKey);
    setCopied(true);
    onShowToast('API Key copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (window.confirm('Regenerating your API Key will disconnect any extension using your previous key. Continue?')) {
      setIsRegenerating(true);
      await onRegenerateKey();
      setIsRegenerating(false);
    }
  };

  return (
    <div
      className="overlay show"
      id="apiOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="apiModalTitle"
    >
      <div className="modal modal-lg">
        <div className="auth-header">
          <div className="auth-brand">
            <span className="auth-brand-icon">✦</span>
            <span className="mono auth-brand-name">API &amp; Extension Connection</span>
          </div>
          <button
            type="button"
            className="close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        <div className="api-settings-body">
          {!user ? (
            <div className="guest-mode-box">
              <div className="guest-mode-badge mono">🔒 Guest Mode (Local Storage Only)</div>
              <p className="guest-mode-desc">
                You are currently not signed in. All your shortcuts are stored safely in this browser&apos;s local storage.
              </p>
              <p className="guest-mode-desc" style={{ marginTop: '6px' }}>
                To enable cloud synchronization and get a private API Key for the Chrome Extension, please sign in or create an account.
              </p>
              <button
                type="button"
                className="btn btn-primary mono"
                style={{ marginTop: '14px', height: '40px' }}
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
              >
                Sign In / Create Account →
              </button>
            </div>
          ) : (
            <>
              <div className="field">
                <label className="mono">Account User ID</label>
                <input
                  type="text"
                  readOnly
                  value={user.userId}
                  className="mono api-key-input"
                  style={{ color: '#ececee !important' }}
                />
              </div>

              <div className="field" style={{ marginTop: '12px' }}>
                <label className="mono">Your Unique API Key</label>
                <div className="api-key-row">
                  <input
                    type="text"
                    readOnly
                    value={effectiveKey || 'Generating key...'}
                    className="mono api-key-input"
                  />
                  <button
                    type="button"
                    className="btn btn-primary mono"
                    onClick={handleCopyKey}
                    style={{ flex: '0 0 90px' }}
                  >
                    {copied ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
                <p className="field-hint mono">
                  Tied to @{user.username}. Use this key in the Chrome Extension to sync bookmarks directly to your account.
                </p>
              </div>

              <div className="field" style={{ marginTop: '12px' }}>
                <label className="mono">App Endpoint URL</label>
                <input
                  type="text"
                  readOnly
                  value={appUrl}
                  className="mono api-key-input"
                />
                <p className="field-hint mono">
                  Enter this URL into the extension&apos;s &ldquo;Dashboard URL&rdquo; field.
                </p>
              </div>

              <div className="extension-guide-box">
                <div className="guide-title mono">🔌 Quick Chrome Extension Setup</div>
                <ol className="guide-steps mono">
                  <li>Open Chrome &rarr; <code>chrome://extensions</code> &rarr; toggle <b>Developer mode</b>.</li>
                  <li>Click <b>Load unpacked</b> &rarr; select the <code>extension</code> folder.</li>
                  <li>In the extension popup, paste your <b>Dashboard URL</b> and <b>API Key</b> &rarr; click <b>Test Connection</b>!</li>
                </ol>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-danger mono"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? 'Generating...' : 'Regenerate API Key'}
                </button>
                <button
                  type="button"
                  className="btn mono"
                  onClick={onClose}
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
