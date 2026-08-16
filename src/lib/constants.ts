import { PopularGroup, SearchEngine, Shortcut } from './types';

export const STORAGE_KEY = 'nt_sites_v1';
export const PREFS_KEY = 'nt_prefs_v1';
export const API_KEY_STORAGE = 'nt_api_key_v1';

export const SEARCH_ENGINES: SearchEngine[] = [
  { name: 'Google', url: 'https://www.google.com/search?q=' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { name: 'Bing', url: 'https://www.bing.com/search?q=' },
  { name: 'Perplexity', url: 'https://www.perplexity.ai/search?q=' },
];

export const POPULAR_SITES: PopularGroup[] = [
  {
    group: 'Search & AI',
    items: [
      { name: 'Google', url: 'google.com', category: 'Search' },
      { name: 'ChatGPT', url: 'chatgpt.com', category: 'AI' },
      { name: 'Claude', url: 'claude.ai', category: 'AI' },
      { name: 'Bing', url: 'bing.com', category: 'Search' },
      { name: 'DuckDuckGo', url: 'duckduckgo.com', category: 'Search' },
      { name: 'Perplexity', url: 'perplexity.ai', category: 'AI' },
    ],
  },
  {
    group: 'Social',
    items: [
      { name: 'X (Twitter)', url: 'x.com', category: 'Social' },
      { name: 'Reddit', url: 'reddit.com', category: 'Social' },
      { name: 'Instagram', url: 'instagram.com', category: 'Social' },
      { name: 'Facebook', url: 'facebook.com', category: 'Social' },
      { name: 'LinkedIn', url: 'linkedin.com', category: 'Social' },
      { name: 'TikTok', url: 'tiktok.com', category: 'Social' },
    ],
  },
  {
    group: 'Dev',
    items: [
      { name: 'GitHub', url: 'github.com', category: 'Dev' },
      { name: 'Stack Overflow', url: 'stackoverflow.com', category: 'Dev' },
      { name: 'MDN Web Docs', url: 'developer.mozilla.org', category: 'Dev' },
      { name: 'npm', url: 'npmjs.com', category: 'Dev' },
      { name: 'Vercel', url: 'vercel.com', category: 'Dev' },
      { name: 'GitLab', url: 'gitlab.com', category: 'Dev' },
    ],
  },
  {
    group: 'Entertainment',
    items: [
      { name: 'YouTube', url: 'youtube.com', category: 'Entertainment' },
      { name: 'Netflix', url: 'netflix.com', category: 'Entertainment' },
      { name: 'Spotify', url: 'open.spotify.com', category: 'Entertainment' },
      { name: 'Twitch', url: 'twitch.tv', category: 'Entertainment' },
      { name: 'Discord', url: 'discord.com', category: 'Entertainment' },
    ],
  },
  {
    group: 'Shopping',
    items: [
      { name: 'Amazon', url: 'amazon.com', category: 'Shopping' },
      { name: 'eBay', url: 'ebay.com', category: 'Shopping' },
    ],
  },
  {
    group: 'Reference & Productivity',
    items: [
      { name: 'Wikipedia', url: 'wikipedia.org', category: 'Reference' },
      { name: 'Gmail', url: 'mail.google.com', category: 'Productivity' },
      { name: 'Google Drive', url: 'drive.google.com', category: 'Productivity' },
      { name: 'Notion', url: 'notion.so', category: 'Productivity' },
    ],
  },
  {
    group: 'News',
    items: [
      { name: 'BBC News', url: 'bbc.com/news', category: 'News' },
      { name: 'Hacker News', url: 'news.ycombinator.com', category: 'News' },
    ],
  },
];

export const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: '1', name: 'GitHub', url: 'github.com', category: 'Dev', pinned: true, clicks: 0, added: Date.now() - 5000 },
  { id: '2', name: 'ChatGPT', url: 'chatgpt.com', category: 'AI', pinned: true, clicks: 0, added: Date.now() - 4000 },
  { id: '3', name: 'YouTube', url: 'youtube.com', category: 'Entertainment', pinned: false, clicks: 0, added: Date.now() - 3000 },
  { id: '4', name: 'Reddit', url: 'reddit.com', category: 'Social', pinned: false, clicks: 0, added: Date.now() - 2000 },
  { id: '5', name: 'Hacker News', url: 'news.ycombinator.com', category: 'News', pinned: false, clicks: 0, added: Date.now() - 1000 },
];
