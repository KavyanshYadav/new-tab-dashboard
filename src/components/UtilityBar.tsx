'use client';

import React, { useRef } from 'react';
import { Shortcut, SortMode } from '@/lib/types';

interface UtilityBarProps {
  sortMode: SortMode;
  sites: Shortcut[];
  onCycleSort: () => void;
  onOpenPopular: () => void;
  onOpenApiSettings: () => void;
  onImportSites: (imported: Shortcut[]) => void;
  onClearAll: () => void;
  onShowToast: (msg: string) => void;
}

export function UtilityBar({
  sortMode,
  sites,
  onCycleSort,
  onOpenPopular,
  onOpenApiSettings,
  onImportSites,
  onClearAll,
  onShowToast,
}: UtilityBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortLabels: Record<SortMode, string> = {
    recent: 'sort: recent',
    most: 'sort: most visited',
    az: 'sort: a–z',
  };

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(sites, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'newtab-shortcuts.json';
      a.click();
      URL.revokeObjectURL(url);
      onShowToast('Exported shortcuts');
    } catch {
      onShowToast('Failed to export shortcuts');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (Array.isArray(parsed)) {
          const sanitized: Shortcut[] = parsed.map((item, idx) => ({
            id: item.id || `import-${Date.now()}-${idx}`,
            url: item.url || '',
            name: item.name || item.url || 'Shortcut',
            category: item.category || undefined,
            pinned: !!item.pinned,
            clicks: typeof item.clicks === 'number' ? item.clicks : 0,
            added: typeof item.added === 'number' ? item.added : Date.now(),
          })).filter((item) => !!item.url);

          onImportSites(sanitized);
        } else {
          onShowToast('Invalid shortcuts file format');
        }
      } catch {
        onShowToast('Error reading JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClear = () => {
    if (window.confirm('Remove all saved shortcuts? This cannot be undone.')) {
      onClearAll();
    }
  };

  return (
    <>
      <footer className="util-bar mono" aria-label="Utility Actions">
        <button type="button" id="popularBtn" onClick={onOpenPopular}>
          browse popular
        </button>
        <span className="dot">·</span>
        <button type="button" id="sortBtn" onClick={onCycleSort}>
          {sortLabels[sortMode] || sortLabels.recent}
        </button>
        <span className="dot">·</span>
        <button type="button" id="apiBtn" onClick={onOpenApiSettings} title="Chrome Extension & API Settings">
          extension &amp; api
        </button>
        <span className="dot">·</span>
        <button type="button" id="exportBtn" onClick={handleExport}>
          export
        </button>
        <span className="dot">·</span>
        <button type="button" id="importBtn" onClick={handleImportClick}>
          import
        </button>
        <span className="dot">·</span>
        <button type="button" id="clearBtn" onClick={handleClear}>
          clear all
        </button>
      </footer>

      <input
        ref={fileInputRef}
        type="file"
        id="importFile"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </>
  );
}
