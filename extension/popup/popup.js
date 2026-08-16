// Popup logic for New Tab Dashboard Extension

document.addEventListener('DOMContentLoaded', async () => {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const tabUrlInput = document.getElementById('tabUrl');
  const tabTitleInput = document.getElementById('tabTitle');
  const tabCategoryInput = document.getElementById('tabCategory');
  const tabPinnedInput = document.getElementById('tabPinned');
  const saveForm = document.getElementById('saveForm');
  const saveTabBtn = document.getElementById('saveTabBtn');
  const appUrlInput = document.getElementById('appUrl');
  const apiKeyInput = document.getElementById('apiKey');
  const launcherHotkeyInput = document.getElementById('launcherHotkey');
  const toggleKeyBtn = document.getElementById('toggleKey');
  const testBtn = document.getElementById('testBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const statusBox = document.getElementById('statusBox');
  const openDashboardLink = document.getElementById('openDashboardLink');
  const catList = document.getElementById('catList');
  const recentSection = document.getElementById('recentSection');
  const recentList = document.getElementById('recentList');
  const toast = document.getElementById('popupToast');

  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // Tab switching
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));

      btn.classList.add('active');
      const targetId = `tab-${btn.dataset.tab}`;
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');
    });
  });

  // Load existing config
  try {
    const config = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
    if (config && config.success) {
      appUrlInput.value = config.appUrl || 'http://localhost:3001';
      apiKeyInput.value = config.apiKey || '';
      launcherHotkeyInput.value = (config.launcherHotkey || 'u').toUpperCase();
      openDashboardLink.href = config.appUrl || 'http://localhost:3001';

      if (!config.apiKey) {
        showStatus('⚠️ Please enter your API Key in Settings to connect.', 'error');
      }
    }
  } catch (err) {
    console.error('Error fetching config:', err);
  }

  // Load Active Tab Info
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
      tabUrlInput.value = tab.url;
      tabTitleInput.value = tab.title || '';
    }
  } catch (err) {
    console.error('Error querying active tab:', err);
  }

  // Load Categories for autocompletion
  try {
    const catResp = await chrome.runtime.sendMessage({ type: 'GET_CATEGORIES' });
    if (catResp && catResp.success && Array.isArray(catResp.categories)) {
      catList.innerHTML = catResp.categories.map((c) => `<option value="${c}">`).join('');
    }
  } catch {}

  // Load Recent Shortcuts
  async function loadRecentShortcuts() {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_SHORTCUTS' });
      if (resp && resp.success && Array.isArray(resp.shortcuts) && resp.shortcuts.length > 0) {
        recentList.innerHTML = '';
        const recentItems = [...resp.shortcuts].slice(-4).reverse();
        recentItems.forEach((site) => {
          const a = document.createElement('a');
          a.className = 'recent-item';
          a.href = site.url.startsWith('http') ? site.url : `https://${site.url}`;
          a.target = '_blank';
          a.innerHTML = `
            <span class="recent-name">${escapeHtml(site.name)}</span>
            <span class="recent-cat mono">${escapeHtml(site.category || 'General')}</span>
          `;
          recentList.appendChild(a);
        });
        recentSection.style.display = 'block';
      }
    } catch {}
  }
  loadRecentShortcuts();

  // Save Tab Form Handler
  saveForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = tabUrlInput.value.trim();
    const name = tabTitleInput.value.trim();
    const category = tabCategoryInput.value.trim();
    const pinned = tabPinnedInput.checked;

    if (!url) return;

    saveTabBtn.disabled = true;
    saveTabBtn.textContent = 'Saving...';

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_SHORTCUT',
        data: { url, name, category: category || undefined, pinned },
      });

      if (response && response.success) {
        showToast('Saved to Dashboard ✓');
        saveTabBtn.textContent = 'Saved ✓';
        loadRecentShortcuts();
        setTimeout(() => {
          window.close();
        }, 1200);
      } else {
        showToast(response?.error || 'Failed to save');
        saveTabBtn.disabled = false;
        saveTabBtn.textContent = 'Save Tab to Dashboard';
      }
    } catch (err) {
      showToast(err.message || 'Error saving shortcut');
      saveTabBtn.disabled = false;
      saveTabBtn.textContent = 'Save Tab to Dashboard';
    }
  });

  // Settings: Toggle Password Visibility
  toggleKeyBtn.addEventListener('click', () => {
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
  });

  function showStatus(msg, type = 'success') {
    statusBox.textContent = msg;
    statusBox.className = `status-box mono ${type}`;
    statusBox.style.display = 'block';
  }

  // Settings: Test Connection
  testBtn.addEventListener('click', async () => {
    const appUrl = appUrlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    const launcherHotkey = (launcherHotkeyInput.value.trim() || 'u').toLowerCase();

    if (!apiKey) {
      showStatus('Please enter an API Key first', 'error');
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';

    try {
      await chrome.runtime.sendMessage({
        type: 'SAVE_CONFIG',
        appUrl,
        apiKey,
        launcherHotkey,
      });

      const response = await chrome.runtime.sendMessage({ type: 'VERIFY_KEY' });
      if (response && response.success && response.valid) {
        showStatus(`✓ Connected! Total shortcuts: ${response.totalShortcuts}`, 'success');
        openDashboardLink.href = appUrl;
      } else {
        showStatus(`✕ Error: ${response?.error || 'Invalid API Key'}`, 'error');
      }
    } catch (err) {
      showStatus(`✕ Connection failed: ${err.message}`, 'error');
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = 'Test Connection';
    }
  });

  // Settings: Save Settings
  saveSettingsBtn.addEventListener('click', async () => {
    const appUrl = appUrlInput.value.trim() || 'http://localhost:3001';
    const apiKey = apiKeyInput.value.trim();
    const launcherHotkey = (launcherHotkeyInput.value.trim() || 'u').toLowerCase();

    await chrome.runtime.sendMessage({
      type: 'SAVE_CONFIG',
      appUrl,
      apiKey,
      launcherHotkey,
    });

    openDashboardLink.href = appUrl;
    showToast('Settings saved ✓');
    showStatus(`Settings updated! Hotkey: [${launcherHotkey.toUpperCase()}]`, 'success');
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
