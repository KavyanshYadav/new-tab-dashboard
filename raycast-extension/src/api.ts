import { getPreferenceValues } from '@raycast/api';
import { Preferences, Shortcut } from './types';

export function getBaseUrl(): string {
  const prefs = getPreferenceValues<Preferences>();
  return (prefs.appUrl || 'https://aufvim.tech').replace(/\/+$/, '');
}

export function getApiKey(): string {
  const prefs = getPreferenceValues<Preferences>();
  return (prefs.apiKey || '').trim();
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('API Key is missing. Please set your API Key in Extension Preferences.');
  }

  const url = `${baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return data as T;
}

export async function fetchShortcuts(pinnedOnly = false): Promise<Shortcut[]> {
  const query = pinnedOnly ? '?pinned=true' : '';
  const data = await request<{ shortcuts?: Shortcut[] }>(`/api/shortcuts${query}`);
  return Array.isArray(data.shortcuts) ? data.shortcuts : [];
}

export async function fetchCategories(): Promise<string[]> {
  const data = await request<{ categories?: string[] }>('/api/categories');
  return Array.isArray(data.categories) ? data.categories : ['Dev', 'AI', 'Social', 'Productivity', 'News'];
}

export async function createShortcut(payload: {
  url: string;
  name?: string;
  category?: string;
  pinned?: boolean;
}): Promise<Shortcut> {
  const data = await request<{ shortcut: Shortcut }>('/api/shortcuts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.shortcut;
}

export async function deleteShortcut(id: string): Promise<boolean> {
  const data = await request<{ success: boolean }>(`/api/shortcuts?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return Boolean(data.success);
}
