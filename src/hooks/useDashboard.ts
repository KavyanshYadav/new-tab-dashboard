'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Preferences, Shortcut, SortMode, ToastState } from '@/lib/types';
import { DEFAULT_SHORTCUTS, PREFS_KEY, STORAGE_KEY, API_KEY_STORAGE } from '@/lib/constants';
import { hostname } from '@/lib/utils';

export function useDashboard() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [sites, setSites] = useState<Shortcut[]>([]);
  const [prefs, setPrefs] = useState<Preferences>({
    engine: 0,
    tag: 'All',
    sort: 'recent',
  });
  const [lastDeleted, setLastDeleted] = useState<{ site: Shortcut; index: number } | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const isInitialSyncDone = useRef(false);

  const showToast = useCallback((message: string, withUndo = false) => {
    setToast({
      message,
      withUndo,
      timestamp: Date.now(),
    });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  // Sync with API in background
  const syncToCloud = useCallback((currentSites: Shortcut[], keyToUse?: string) => {
    const key = keyToUse || apiKey;
    if (!key) return;

    fetch('/api/shortcuts', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
      },
      body: JSON.stringify({ shortcuts: currentSites }),
    }).catch((err) => {
      console.warn('Cloud sync background update failed (offline or serverless):', err);
    });
  }, [apiKey]);

  // Persist sites locally and to cloud
  const saveSites = useCallback((updated: Shortcut[], shouldSyncCloud = true) => {
    setSites(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save shortcuts to localStorage', e);
    }
    if (shouldSyncCloud && apiKey) {
      syncToCloud(updated);
    }
  }, [apiKey, syncToCloud]);

  // Persist preferences
  const savePrefs = useCallback((updated: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save preferences to localStorage', e);
      }
      return next;
    });
  }, []);

  // Initial Load from localStorage and backend
  useEffect(() => {
    let localKey = '';
    try {
      localKey = localStorage.getItem(API_KEY_STORAGE) || '';
    } catch {}

    let initialLocalSites: Shortcut[] = DEFAULT_SHORTCUTS;
    try {
      const storedSites = localStorage.getItem(STORAGE_KEY);
      if (storedSites) {
        const parsed = JSON.parse(storedSites);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialLocalSites = parsed;
        }
      }
    } catch {}

    try {
      const storedPrefs = localStorage.getItem(PREFS_KEY);
      if (storedPrefs) {
        const parsedPrefs = JSON.parse(storedPrefs);
        setPrefs((prev) => ({ ...prev, ...parsedPrefs }));
      }
    } catch {}

    setSites(initialLocalSites);

    // Ensure API Key exists
    const initializeApiKeyAndSync = async () => {
      let activeKey = localKey;
      if (!activeKey) {
        try {
          const res = await fetch('/api/key', { method: 'POST' });
          if (res.ok) {
            const data = await res.json();
            if (data.apiKey) {
              activeKey = data.apiKey;
              try {
                localStorage.setItem(API_KEY_STORAGE, activeKey);
              } catch {}
            }
          }
        } catch {
          // Fallback client-generated key
          activeKey = `nt_key_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
          try {
            localStorage.setItem(API_KEY_STORAGE, activeKey);
          } catch {}
        }
      }

      setApiKey(activeKey);

      // Fetch cloud shortcuts if any added via extension
      if (activeKey && !isInitialSyncDone.current) {
        isInitialSyncDone.current = true;
        try {
          const res = await fetch('/api/shortcuts', {
            headers: { 'x-api-key': activeKey },
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.shortcuts) && data.shortcuts.length > 0) {
              // Merge remote shortcuts with local (avoid duplicates by URL)
              const existingUrls = new Set(initialLocalSites.map((s) => s.url.toLowerCase()));
              const newFromCloud = data.shortcuts.filter(
                (s: Shortcut) => !existingUrls.has(s.url.toLowerCase())
              );
              if (newFromCloud.length > 0) {
                const merged = [...initialLocalSites, ...newFromCloud];
                setSites(merged);
                try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                } catch {}
              }
            } else {
              // Push local shortcuts to remote server
              syncToCloud(initialLocalSites, activeKey);
            }
          }
        } catch (err) {
          console.warn('Initial cloud sync attempt error:', err);
        }
      }

      setIsLoaded(true);
    };

    initializeApiKeyAndSync();
  }, [syncToCloud]);

  const regenerateApiKey = useCallback(async () => {
    try {
      const res = await fetch('/api/key', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.apiKey) {
          setApiKey(data.apiKey);
          try {
            localStorage.setItem(API_KEY_STORAGE, data.apiKey);
          } catch {}
          syncToCloud(sites, data.apiKey);
          showToast('Generated new API Key');
          return data.apiKey;
        }
      }
    } catch {
      showToast('Failed to regenerate key');
    }
  }, [sites, syncToCloud, showToast]);

  const addShortcut = useCallback((siteData: { url: string; name?: string; category?: string; pinned?: boolean }) => {
    const cleanUrl = siteData.url.trim();
    if (!cleanUrl) return;

    const finalName = siteData.name?.trim() || hostname(cleanUrl);
    const newSite: Shortcut = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      url: cleanUrl,
      name: finalName,
      category: siteData.category?.trim() || undefined,
      pinned: !!siteData.pinned,
      clicks: 0,
      added: Date.now(),
    };

    const updated = [...sites, newSite];
    saveSites(updated);
    showToast(`Added ${finalName}`);
  }, [sites, saveSites, showToast]);

  const updateShortcut = useCallback((id: string, updates: Partial<Shortcut>) => {
    const updated = sites.map((s) => {
      if (s.id === id) {
        const cleanUrl = updates.url ? updates.url.trim() : s.url;
        const name = updates.name?.trim() ? updates.name.trim() : hostname(cleanUrl);
        return {
          ...s,
          ...updates,
          url: cleanUrl,
          name,
          category: updates.category?.trim() || undefined,
        };
      }
      return s;
    });
    saveSites(updated);
    showToast('Saved');
  }, [sites, saveSites, showToast]);

  const deleteShortcut = useCallback((id: string) => {
    const idx = sites.findIndex((s) => s.id === id);
    if (idx === -1) return;

    const removed = sites[idx];
    setLastDeleted({ site: removed, index: idx });
    const remaining = sites.filter((s) => s.id !== id);
    saveSites(remaining);
    showToast('Shortcut removed', true);
  }, [sites, saveSites, showToast]);

  const undoDelete = useCallback(() => {
    if (!lastDeleted) return;
    const restored = [...sites];
    restored.splice(lastDeleted.index, 0, lastDeleted.site);
    saveSites(restored);
    setLastDeleted(null);
    dismissToast();
  }, [lastDeleted, sites, saveSites, dismissToast]);

  const togglePin = useCallback((id: string) => {
    const updated = sites.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s));
    saveSites(updated);
  }, [sites, saveSites]);

  const recordClick = useCallback((id: string) => {
    const updated = sites.map((s) => (s.id === id ? { ...s, clicks: (s.clicks || 0) + 1 } : s));
    saveSites(updated, false);
  }, [sites, saveSites]);

  const setEngine = useCallback((index: number) => {
    savePrefs({ engine: index });
  }, [savePrefs]);

  const setTag = useCallback((tag: string) => {
    savePrefs({ tag });
  }, [savePrefs]);

  const cycleSort = useCallback(() => {
    const modes: SortMode[] = ['recent', 'most', 'az'];
    const currentIdx = modes.indexOf(prefs.sort);
    const nextSort = modes[(currentIdx + 1) % modes.length];
    savePrefs({ sort: nextSort });
  }, [prefs.sort, savePrefs]);

  const importShortcuts = useCallback((importedSites: Shortcut[]) => {
    if (Array.isArray(importedSites)) {
      saveSites(importedSites);
      showToast('Imported shortcuts successfully');
    } else {
      showToast('Invalid backup file');
    }
  }, [saveSites, showToast]);

  const clearAllShortcuts = useCallback(() => {
    saveSites([]);
    showToast('Cleared all shortcuts');
  }, [saveSites, showToast]);

  // Derived state
  const pinnedSites = useMemo(() => sites.filter((s) => s.pinned), [sites]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    sites.forEach((s) => {
      if (s.category && s.category.trim()) {
        set.add(s.category.trim());
      }
    });
    return ['All', ...Array.from(set)];
  }, [sites]);

  const filteredSites = useMemo(() => {
    let list = sites.filter((s) => !s.pinned);

    if (prefs.tag && prefs.tag !== 'All') {
      list = list.filter((s) => s.category === prefs.tag);
    }

    const sorted = [...list];
    if (prefs.sort === 'most') {
      sorted.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
    } else if (prefs.sort === 'az') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => (b.added || 0) - (a.added || 0));
    }
    return sorted;
  }, [sites, prefs.tag, prefs.sort]);

  return {
    isLoaded,
    apiKey,
    sites,
    prefs,
    pinnedSites,
    filteredSites,
    categories,
    toast,
    addShortcut,
    updateShortcut,
    deleteShortcut,
    undoDelete,
    togglePin,
    recordClick,
    setEngine,
    setTag,
    cycleSort,
    importShortcuts,
    clearAllShortcuts,
    regenerateApiKey,
    showToast,
    dismissToast,
  };
}
