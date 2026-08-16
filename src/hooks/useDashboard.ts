'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Preferences, Shortcut, SortMode, ToastState, PublicUser } from '@/lib/types';
import { DEFAULT_SHORTCUTS, PREFS_KEY, STORAGE_KEY, API_KEY_STORAGE } from '@/lib/constants';
import { hostname } from '@/lib/utils';

const USER_SESSION_STORAGE = 'nt_user_session_v1';
const COMMUNITY_LISTS_STORAGE = 'nt_community_lists_v1';
const DEFAULT_COMMUNITY_LISTS = ['ai-tools', 'web-dev'];

export function useDashboard() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [sites, setSites] = useState<Shortcut[]>([]);
  const [enabledCommunityLists, setEnabledCommunityLists] = useState<string[]>(DEFAULT_COMMUNITY_LISTS);
  const [prefs, setPrefs] = useState<Preferences>({
    engine: 0,
    tag: 'All',
    sort: 'recent',
  });
  const [lastDeleted, setLastDeleted] = useState<{ site: Shortcut; index: number } | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);


  const userRef = useRef<PublicUser | null>(null);
  const apiKeyRef = useRef<string>('');
  userRef.current = user;
  apiKeyRef.current = apiKey;

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

  // Sync with API in background without causing state loops
  const syncToCloud = useCallback((currentSites: Shortcut[], keyToUse?: string, userIdToUse?: string) => {
    const key = keyToUse || apiKeyRef.current;
    const uid = userIdToUse || userRef.current?.userId;
    if (!key && !uid) return;

    fetch('/api/shortcuts', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { 'x-api-key': key } : {}),
        ...(uid ? { 'x-user-id': uid } : {}),
      },
      body: JSON.stringify({ shortcuts: currentSites }),
    }).catch((err) => {
      console.warn('Cloud sync note:', err);
    });
  }, []);

  // Persist sites locally and to cloud
  const saveSites = useCallback((updated: Shortcut[], shouldSyncCloud = true) => {
    setSites(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save shortcuts to localStorage', e);
    }
    if (shouldSyncCloud && (apiKeyRef.current || userRef.current?.userId)) {
      syncToCloud(updated);
    }
  }, [syncToCloud]);

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

  // One-time initial mount effect (empty dependency array)
  useEffect(() => {
    let localUser: PublicUser | null = null;
    try {
      const rawUser = localStorage.getItem(USER_SESSION_STORAGE);
      if (rawUser) localUser = JSON.parse(rawUser);
    } catch {}

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

    try {
      const storedLists = localStorage.getItem(COMMUNITY_LISTS_STORAGE);
      if (storedLists) {
        const parsedLists = JSON.parse(storedLists);
        if (Array.isArray(parsedLists)) {
          setEnabledCommunityLists(parsedLists);
        }
      }
    } catch {}

    setSites(initialLocalSites);


    // Check if URL has ?key=
    let urlKey = '';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      urlKey = params.get('key') || '';
    }

    if (localUser) {
      setUser(localUser);
      setApiKey(localUser.apiKey);
    } else if (localKey || urlKey) {
      setApiKey(urlKey || localKey);
    }

    // Verify session once with backend
    const checkSession = async () => {
      const activeKey = urlKey || localUser?.apiKey || localKey;
      const activeUid = localUser?.userId;

      if (activeUid || activeKey) {
        try {
          const headers: Record<string, string> = {};
          if (activeUid) headers['x-user-id'] = activeUid;
          if (activeKey) headers['x-api-key'] = activeKey;

          const res = await fetch('/api/auth/me', { headers });
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setUser(data.user);
              setApiKey(data.user.apiKey);
              try {
                localStorage.setItem(USER_SESSION_STORAGE, JSON.stringify(data.user));
                localStorage.setItem(API_KEY_STORAGE, data.user.apiKey);
              } catch {}

              // Fetch user shortcuts
              const scRes = await fetch('/api/shortcuts', {
                headers: { 'x-user-id': data.user.userId, 'x-api-key': data.user.apiKey },
              });
              if (scRes.ok) {
                const scData = await scRes.json();
                if (Array.isArray(scData.shortcuts) && scData.shortcuts.length > 0) {
                  setSites(scData.shortcuts);
                  try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(scData.shortcuts));
                  } catch {}
                }
              }
            }
          }
        } catch (err) {
          console.warn('Session verification note:', err);
        }
      }
      setIsLoaded(true);
    };

    checkSession();
  }, []); // Runs strictly ONCE on mount!

  const login = useCallback(async (identifier: string, password?: string, turnstileToken?: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, turnstileToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Authentication failed' };
      }

      if (data.user) {
        setUser(data.user);
        setApiKey(data.user.apiKey);
        try {
          localStorage.setItem(USER_SESSION_STORAGE, JSON.stringify(data.user));
          localStorage.setItem(API_KEY_STORAGE, data.user.apiKey);
        } catch {}

        // Fetch user's shortcuts
        const scRes = await fetch('/api/shortcuts', {
          headers: { 'x-user-id': data.user.userId, 'x-api-key': data.user.apiKey },
        });
        if (scRes.ok) {
          const scData = await scRes.json();
          if (Array.isArray(scData.shortcuts)) {
            setSites(scData.shortcuts);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(scData.shortcuts));
            } catch {}
          }
        }

        showToast(`Welcome back, @${data.user.username}!`);
        return { success: true, user: data.user };
      }

      return { success: false, error: 'User data missing' };
    } catch {
      return { success: false, error: 'Could not connect to auth server' };
    }
  }, [showToast]);

  const register = useCallback(async (username: string, email: string, password: string, turnstileToken?: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, turnstileToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      if (data.user) {
        setUser(data.user);
        setApiKey(data.user.apiKey);
        try {
          localStorage.setItem(USER_SESSION_STORAGE, JSON.stringify(data.user));
          localStorage.setItem(API_KEY_STORAGE, data.user.apiKey);
        } catch {}

        // Push initial bookmarks for this new user
        syncToCloud(sites, data.user.apiKey, data.user.userId);
        showToast(`Account created! Welcome, @${data.user.username}`);
        return { success: true, user: data.user };
      }

      return { success: false, error: 'User data missing' };
    } catch {
      return { success: false, error: 'Could not connect to auth server' };
    }
  }, [sites, syncToCloud, showToast]);


  const logout = useCallback(() => {
    setUser(null);
    setApiKey('');
    try {
      localStorage.removeItem(USER_SESSION_STORAGE);
      localStorage.removeItem(API_KEY_STORAGE);
    } catch {}
    showToast('Signed out successfully');
  }, [showToast]);

  const regenerateApiKey = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (user?.userId) headers['x-user-id'] = user.userId;
      if (apiKey) headers['x-api-key'] = apiKey;

      const res = await fetch('/api/key', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: user?.userId, apiKey }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.apiKey) {
          setApiKey(data.apiKey);
          if (user) {
            const updatedUser = { ...user, apiKey: data.apiKey };
            setUser(updatedUser);
            try {
              localStorage.setItem(USER_SESSION_STORAGE, JSON.stringify(updatedUser));
            } catch {}
          }
          try {
            localStorage.setItem(API_KEY_STORAGE, data.apiKey);
          } catch {}
          syncToCloud(sites, data.apiKey, user?.userId);
          showToast('Generated new API Key');
          return data.apiKey;
        }
      }
    } catch {
      showToast('Failed to regenerate key');
    }
  }, [user, apiKey, sites, syncToCloud, showToast]);

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

  const toggleCommunityList = useCallback((listId: string) => {
    setEnabledCommunityLists((prev) => {
      let next: string[];
      if (prev.includes(listId)) {
        next = prev.filter((id) => id !== listId);
        showToast('Removed community list from dashboard');
      } else {
        next = [...prev, listId];
        showToast('Added community list to dashboard');
      }
      try {
        localStorage.setItem(COMMUNITY_LISTS_STORAGE, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save community lists to localStorage', e);
      }
      return next;
    });
  }, [showToast]);

  const removeCommunityList = useCallback((listId: string) => {
    setEnabledCommunityLists((prev) => {
      const next = prev.filter((id) => id !== listId);
      try {
        localStorage.setItem(COMMUNITY_LISTS_STORAGE, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save community lists to localStorage', e);
      }
      return next;
    });
    showToast('Community list removed');
  }, [showToast]);


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
    user,
    apiKey,
    sites,
    enabledCommunityLists,
    prefs,
    pinnedSites,
    filteredSites,
    categories,
    toast,
    login,
    register,
    logout,
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
    toggleCommunityList,
    removeCommunityList,
    regenerateApiKey,
    showToast,
    dismissToast,
  };
}

