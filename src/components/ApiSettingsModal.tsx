'use client';

import React, { useState, useEffect } from 'react';

interface ApiSettingsModalProps {
  isOpen: boolean;
  apiKey: string;
  onClose: () => void;
  onRegenerateKey: () => Promise<string | undefined>;
  onShowToast: (msg: string) => void;
}

export function ApiSettingsModal({
  isOpen,
  apiKey,
  onClose,
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

  const handleCopyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
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
        <h3>
          <span id="apiModalTitle">API &amp; Chrome Extension Sync</span>
          <button
            type="button"
            className="close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </h3>

        <div className="api-settings-body">
          <div className="field">
            <label className="mono">Your Unique API Key</label>
            <div className="api-key-row">
              <input
                type="text"
                readOnly
                value={apiKey || 'Generating key...'}
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
              This secret key connects your Chrome Extension directly to this dashboard.
            </p>
          </div>

          <div className="field" style={{ marginTop: '16px' }}>
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
              <li>Open Chrome and navigate to <code>chrome://extensions</code></li>
              <li>Toggle <b>Developer mode</b> (top-right corner).</li>
              <li>Click <b>Load unpacked</b> and select the <code>extension</code> folder inside this project.</li>
              <li>Click the extension icon in Chrome toolbar, paste your <b>Dashboard URL</b> and <b>API Key</b>, and click <b>Test Connection</b>!</li>
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
        </div>
      </div>
    </div>
  );
}
