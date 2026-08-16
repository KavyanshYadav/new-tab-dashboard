'use client';

import React, { useEffect } from 'react';
import { ToastState } from '@/lib/types';

interface ToastProps {
  toast: ToastState | null;
  onUndo?: () => void;
  onDismiss: () => void;
}

export function Toast({ toast, onUndo, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;

    const duration = toast.withUndo ? 4500 : 2000;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      className={`toast mono show ${toast.withUndo ? 'actionable' : ''}`}
      id="toast"
      role="status"
      aria-live="polite"
    >
      <span>{toast.message}</span>
      {toast.withUndo && onUndo && (
        <button
          type="button"
          className="undo-btn mono"
          id="undoBtn"
          onClick={onUndo}
        >
          Undo
        </button>
      )}
    </div>
  );
}
