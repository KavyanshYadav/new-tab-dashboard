'use client';

import React, { useState, useRef, useEffect } from 'react';

interface UserAvatarMenuProps {
  apiKey: string;
  onOpenAuth: () => void;
  onOpenApiSettings: () => void;
  onShowToast: (msg: string) => void;
}

export function UserAvatarMenu({
  apiKey,
  onOpenAuth,
  onOpenApiSettings,
  onShowToast,
}: UserAvatarMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCopyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    onShowToast('API Key copied to clipboard');
  };

  const keySnippet = apiKey
    ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`
    : 'Local session';

  return (
    <div className="avatar-wrapper" ref={menuRef}>
      <button
        type="button"
        className="avatar-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User profile and account menu"
        aria-expanded={isOpen}
      >
        <div className="avatar-circle">
          <span className="avatar-initials mono">DEV</span>
          <span className="avatar-status-dot" title="Cloud Sync Active"></span>
        </div>
      </button>

      {isOpen && (
        <div className="avatar-popover" role="menu">
          <div className="avatar-popover-header">
            <div className="avatar-popover-user">
              <div className="avatar-circle-sm mono">DEV</div>
              <div className="avatar-user-info">
                <div className="avatar-user-name">Developer Account</div>
                <div className="avatar-user-status mono">
                  <span className="dot-green">●</span> Synced via API Key
                </div>
              </div>
            </div>
          </div>

          <div className="avatar-popover-section">
            <div className="popover-label mono">Active Key</div>
            <div className="popover-key-row" onClick={handleCopyKey} title="Click to copy API Key">
              <span className="mono popover-key-val">{keySnippet}</span>
              <span className="mono popover-copy-btn">copy</span>
            </div>
          </div>

          <div className="avatar-popover-actions">
            <button
              type="button"
              className="popover-item"
              onClick={() => {
                setIsOpen(false);
                onOpenAuth();
              }}
            >
              <span className="popover-item-icon">🔑</span>
              <span>Sign In / Switch Account</span>
            </button>

            <button
              type="button"
              className="popover-item"
              onClick={() => {
                setIsOpen(false);
                onOpenApiSettings();
              }}
            >
              <span className="popover-item-icon">🔌</span>
              <span>Extension &amp; API Setup</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
