// Background Service Worker for New Tab Dashboard Extension

const DEFAULT_APP_URL = 'http://localhost:3001';
const DEFAULT_HOTKEY = 'u';

// Setup Context Menus on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-link-to-dashboard',
    title: 'Save link to New Tab Dashboard',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'save-page-to-dashboard',
    title: 'Save this page to New Tab Dashboard',
    contexts: ['page'],
  });
});

// Helper to get configuration
async function getConfig() {
  const data = await chrome.storage.sync.get(['appUrl', 'apiKey', 'launcherHotkey']);
  return {
    appUrl: (data.appUrl || DEFAULT_APP_URL).replace(/\/+$/, ''),
    apiKey: data.apiKey || '',
    launcherHotkey: data.launcherHotkey || DEFAULT_HOTKEY,
  };
}

// Flash badge on action icon
async function flashBadge(text = '✓', color = '#9ece6a') {
  try {
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });
    setTimeout(async () => {
      await chrome.action.setBadgeText({ text: '' });
    }, 2500);
  } catch (err) {
    console.warn('Could not update badge:', err);
  }
}

// API client function
async function apiCall(endpoint, method = 'GET', body = null) {
  const { appUrl, apiKey } = await getConfig();

  if (!apiKey) {
    throw new Error('API Key not configured. Please open extension popup settings to enter your key.');
  }

  const url = `${appUrl}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

// Context Menu Click Handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    const targetUrl = info.linkUrl || info.pageUrl || tab?.url;
    const targetName = info.selectionText || tab?.title || targetUrl;

    if (!targetUrl) return;

    await apiCall('/api/shortcuts', 'POST', {
      url: targetUrl,
      name: targetName,
      pinned: false,
    });

    await flashBadge('✓', '#9ece6a');

    // Notify active tab if possible
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_TOAST',
        message: `Saved "${targetName}" to Dashboard!`,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Context menu save failed:', err);
    await flashBadge('✕', '#f5a3a3');
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_TOAST',
        message: `Failed: ${err.message}`,
        error: true,
      }).catch(() => {});
    }
  }
});

// Chrome Commands Handler (Native Browser Shortcut e.g. Alt+U)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-launcher') {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && !tab.url?.startsWith('chrome://') && !tab.url?.startsWith('edge://')) {
        chrome.tabs.sendMessage(tab.id, { type: 'OPEN_LAUNCHER' }).catch(() => {});
      }
    } catch (e) {
      console.warn('Command trigger note:', e);
    }
  }
});

// Runtime Message Passing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'GET_CONFIG') {
        const config = await getConfig();
        sendResponse({ success: true, ...config });
      } else if (message.type === 'SAVE_CONFIG') {
        await chrome.storage.sync.set({
          appUrl: message.appUrl?.trim() || DEFAULT_APP_URL,
          apiKey: message.apiKey?.trim() || '',
          launcherHotkey: message.launcherHotkey?.trim().toLowerCase() || DEFAULT_HOTKEY,
        });
        sendResponse({ success: true });
      } else if (message.type === 'SAVE_SHORTCUT') {
        const result = await apiCall('/api/shortcuts', 'POST', message.data);
        await flashBadge('✓', '#9ece6a');
        sendResponse({ success: true, result });
      } else if (message.type === 'GET_SHORTCUTS') {
        const query = message.pinnedOnly ? '?pinned=true' : '';
        const result = await apiCall(`/api/shortcuts${query}`, 'GET');
        sendResponse({ success: true, ...result });
      } else if (message.type === 'GET_CATEGORIES') {
        const result = await apiCall('/api/categories', 'GET');
        sendResponse({ success: true, ...result });
      } else if (message.type === 'VERIFY_KEY') {
        const result = await apiCall('/api/key', 'GET');
        sendResponse({ success: true, ...result });
      } else {
        sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message || 'Operation failed' });
    }
  })();

  return true; // Keep channel open for async response
});
