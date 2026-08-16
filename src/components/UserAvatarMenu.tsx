'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PublicUser } from '@/lib/types';

interface UserAvatarMenuProps {
  user: PublicUser | null;
  apiKey: string;
  onOpenAuth: () => void;
  onOpenApiSettings: () => void;
  onLogout: () => void;
  onShowToast: (msg: string) => void;
}

export function UserAvatarMenu({
  user,
  apiKey,
  onOpenAuth,
  onOpenApiSettings,
  onLogout,
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
    const keyToCopy = user?.apiKey || apiKey;
    if (!keyToCopy) return;
    navigator.clipboard.writeText(keyToCopy);
    onShowToast('API Key copied to clipboard');
  };

  const handleCopyUserId = () => {
    if (!user?.userId) return;
    navigator.clipboard.writeText(user.userId);
    onShowToast('User ID copied to clipboard');
  };

  // Initials
  const displayName = user?.username || 'Dev';
  const initials = (displayName.slice(0, 2) || 'DV').toUpperCase();
  const effectiveKey = user?.apiKey || apiKey;
  const keySnippet = effectiveKey
    ? `${effectiveKey.slice(0, 8)}...${effectiveKey.slice(-4)}`
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
          <span className="avatar-initials mono">{initials}</span>
          <span className="avatar-status-dot" title="Cloud Sync Active"></span>
        </div>
      </button>

      {isOpen && (
        <div className="avatar-popover" role="menu">
          <div className="avatar-popover-header">
            <div className="avatar-popover-user">
              <div className="avatar-circle-sm mono">{initials}</div>
              <div className="avatar-user-info">
                <div className="avatar-user-name">
                  {user ? `@${user.username}` : 'Guest Session'}
                </div>
                <div className="avatar-user-status mono">
                  <span className="dot-green">●</span> {user ? 'Authenticated' : 'Local Key Sync'}
                </div>
              </div>
            </div>
          </div>

          {user?.userId && (
            <div className="avatar-popover-section" style={{ marginBottom: '6px' }}>
              <div className="popover-label mono">User ID</div>
              <div className="popover-key-row" onClick={handleCopyUserId} title="Click to copy User ID">
                <span className="mono popover-key-val" style={{ color: '#ececee' }}>
                  {user.userId}
                </span>
                <span className="mono popover-copy-btn">copy</span>
              </div>
            </div>
          )}

          <div className="avatar-popover-section">
            <div className="popover-label mono">API Key</div>
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
              <span>{user ? 'Switch Account' : 'Sign In / Register'}</span>
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

            {user && (
              <button
                type="button"
                className="popover-item"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                style={{ color: '#f5a3a3' }}
              >
                <span className="popover-item-icon">🚪</span>
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
