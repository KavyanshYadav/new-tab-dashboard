// Content script for New Tab Dashboard Extension

(function () {
  let hoverBtn = null;
  let activeLink = null;
  let hideTimeout = null;
  let activeModal = null;
  let activeToast = null;
  let toastTimeout = null;

  // Quick Launcher State
  let currentHotkey = 'u';
  let spotlightOverlay = null;
  let allShortcutsCache = [];
  let selectedIndex = 0;
  let filteredResults = [];

  // Load configured hotkey from storage
  function loadHotkey() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['launcherHotkey'], (data) => {
          if (data && data.launcherHotkey) {
            currentHotkey = String(data.launcherHotkey).toLowerCase().trim() || 'u';
          }
        });

        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'sync' && changes.launcherHotkey) {
            currentHotkey = String(changes.launcherHotkey.newValue || 'u').toLowerCase().trim();
          }
        });
      }
    } catch (e) {
      console.warn('Storage read note:', e);
    }
  }
  loadHotkey();

  function isEditableElement(el) {
    if (!el) return false;
    const tag = (el.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable || el.getAttribute?.('contenteditable') === 'true') return true;
    return false;
  }

  // Global keydown listener with CAPTURE phase so websites cannot swallow the hotkey
  window.addEventListener(
    'keydown',
    (e) => {
      // If modal is open, let modal handle its own Esc/Arrow/Enter
      if (spotlightOverlay) {
        return;
      }

      // Never trigger while typing in inputs, textareas, contenteditable
      if (isEditableElement(e.target) || isEditableElement(document.activeElement)) {
        return;
      }

      // Ignore if standard Ctrl/Alt/Meta system shortcuts are held
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      const pressedKey = (e.key || '').toLowerCase();
      const hotkey = (currentHotkey || 'u').toLowerCase();

      if (pressedKey === hotkey) {
        e.preventDefault();
        e.stopPropagation();
        openSpotlight();
      }
    },
    true // Capture phase!
  );

  // Create or get the singleton hover button
  function getHoverButton() {
    if (!hoverBtn) {
      hoverBtn = document.createElement('div');
      hoverBtn.className = '__nt_hover_btn';
      hoverBtn.innerHTML = '<span class="__nt_icon">+</span> <span>Dashboard</span>';
      hoverBtn.title = 'Add this link to your New Tab Dashboard';

      hoverBtn.addEventListener('mouseenter', () => {
        if (hideTimeout) clearTimeout(hideTimeout);
      });

      hoverBtn.addEventListener('mouseleave', () => {
        hideButtonWithDelay();
      });

      hoverBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (activeLink) {
          openAddModal(activeLink);
        }
        hideButtonImmediately();
      });

      const root = document.body || document.documentElement;
      root.appendChild(hoverBtn);
    }
    return hoverBtn;
  }

  function isValidLink(el) {
    if (!el || el.tagName !== 'A' || !el.href) return false;
    const href = el.href.trim();
    if (!href || href.startsWith('javascript:') || href.startsWith('#') || href.startsWith('mailto:')) {
      return false;
    }
    return true;
  }

  function findAnchor(el) {
    let curr = el;
    while (curr && curr !== document.body && curr !== document.documentElement) {
      if (isValidLink(curr)) return curr;
      curr = curr.parentElement;
    }
    return null;
  }

  function showButtonForLink(link) {
    activeLink = link;
    if (hideTimeout) clearTimeout(hideTimeout);

    const btn = getHoverButton();
    const rect = link.getBoundingClientRect();

    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    const top = Math.max(0, rect.top + scrollY - 22);
    const left = rect.right + scrollX - 20;

    btn.style.top = `${top}px`;
    btn.style.left = `${left}px`;
    btn.classList.add('__nt_visible');
  }

  function hideButtonWithDelay() {
    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      hideButtonImmediately();
    }, 400);
  }

  function hideButtonImmediately() {
    if (hoverBtn) {
      hoverBtn.classList.remove('__nt_visible');
    }
  }

  // Global mouseover listener for links
  document.addEventListener('mouseover', (e) => {
    const link = findAnchor(e.target);
    if (link) {
      showButtonForLink(link);
    }
  }, { passive: true });

  document.addEventListener('mouseout', (e) => {
    const link = findAnchor(e.target);
    if (link && link === activeLink) {
      hideButtonWithDelay();
    }
  }, { passive: true });

  // In-Page Quick Add Modal
  async function openAddModal(link) {
    if (activeModal) activeModal.remove();

    const linkUrl = link.href;
    const linkText = link.innerText.trim() || link.title || link.getAttribute('aria-label') || '';

    let categories = ['Dev', 'AI', 'Social', 'Entertainment', 'Shopping', 'Productivity', 'News'];
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_CATEGORIES' });
      if (resp && resp.success && Array.isArray(resp.categories)) {
        categories = resp.categories;
      }
    } catch {}

    const overlay = document.createElement('div');
    overlay.className = '__nt_modal_overlay';
    overlay.innerHTML = `
      <div class="__nt_modal_box" role="dialog" aria-modal="true">
        <div class="__nt_modal_header">
          <div class="__nt_modal_title">
            <span style="color:#9ece6a;">✦</span> Save to Dashboard
          </div>
          <button type="button" class="__nt_modal_close" aria-label="Close">&times;</button>
        </div>
        <form class="__nt_form">
          <div class="__nt_field">
            <label class="__nt_label">URL</label>
            <input type="text" class="__nt_input __nt_url" value="${escapeHtml(linkUrl)}" required />
          </div>
          <div class="__nt_field">
            <label class="__nt_label">Title / Name</label>
            <input type="text" class="__nt_input __nt_name" value="${escapeHtml(linkText)}" placeholder="Optional (auto-filled)" />
          </div>
          <div class="__nt_field">
            <label class="__nt_label">Category</label>
            <input type="text" class="__nt_input __nt_category" list="__nt_cat_list" placeholder="e.g. Dev, Reading..." />
            <datalist id="__nt_cat_list">
              ${categories.map(c => `<option value="${escapeHtml(c)}">`).join('')}
            </datalist>
          </div>
          <div class="__nt_checkbox_row">
            <input type="checkbox" id="__nt_pin" class="__nt_pinned" />
            <label for="__nt_pin">Pin to top</label>
          </div>
          <div class="__nt_actions">
            <button type="button" class="__nt_btn __nt_cancel">Cancel</button>
            <button type="submit" class="__nt_btn __nt_btn_primary">Save</button>
          </div>
        </form>
      </div>
    `;

    const closeModal = () => {
      overlay.remove();
      activeModal = null;
    };

    overlay.querySelector('.__nt_modal_close').addEventListener('click', closeModal);
    overlay.querySelector('.__nt_cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        window.removeEventListener('keydown', escHandler);
      }
    };
    window.addEventListener('keydown', escHandler);

    const form = overlay.querySelector('.__nt_form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const finalUrl = overlay.querySelector('.__nt_url').value.trim();
      const finalName = overlay.querySelector('.__nt_name').value.trim();
      const finalCat = overlay.querySelector('.__nt_category').value.trim();
      const finalPin = overlay.querySelector('.__nt_pinned').checked;

      const saveBtn = overlay.querySelector('.__nt_btn_primary');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'SAVE_SHORTCUT',
          data: {
            url: finalUrl,
            name: finalName || undefined,
            category: finalCat || undefined,
            pinned: finalPin,
          },
        });

        if (response && response.success) {
          showToast(`Saved to Dashboard ✓`);
          closeModal();
        } else {
          showToast(response?.error || 'Failed to save shortcut', true);
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save';
        }
      } catch (err) {
        showToast(err.message || 'Error connecting to extension', true);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
      }
    });

    const root = document.body || document.documentElement;
    root.appendChild(overlay);
    activeModal = overlay;
    setTimeout(() => {
      const nameInput = overlay.querySelector('.__nt_name');
      if (nameInput) {
        nameInput.focus();
        nameInput.select();
      }
    }, 50);
  }

  // ========================================================
  // Spotlight / Quick Pinned Shortcuts Launcher Feature
  // ========================================================

  function toggleSpotlight() {
    if (spotlightOverlay) {
      closeSpotlight();
    } else {
      openSpotlight();
    }
  }

  function closeSpotlight() {
    if (spotlightOverlay) {
      spotlightOverlay.remove();
      spotlightOverlay = null;
    }
  }

  function faviconUrl(url) {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`;
    } catch {
      return '';
    }
  }

  async function openSpotlight() {
    closeSpotlight();

    const overlay = document.createElement('div');
    overlay.className = '__nt_spotlight_overlay';
    overlay.innerHTML = `
      <div class="__nt_spotlight_box" role="dialog" aria-modal="true">
        <div class="__nt_spotlight_search_wrap">
          <span class="__nt_spotlight_search_icon">🔍</span>
          <input
            type="text"
            class="__nt_spotlight_input"
            placeholder="Search pinned shortcuts... (Press [${currentHotkey.toUpperCase()}] or ESC to close)"
            autocomplete="off"
            spellcheck="false"
          />
          <div class="__nt_spotlight_badge">PINNED</div>
        </div>

        <div class="__nt_spotlight_results" id="__nt_spotlight_list">
          <div class="__nt_spotlight_loading">Loading shortcuts...</div>
        </div>

        <div class="__nt_spotlight_footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> dismiss</span>
        </div>
      </div>
    `;

    const root = document.body || document.documentElement;
    root.appendChild(overlay);
    spotlightOverlay = overlay;

    const input = overlay.querySelector('.__nt_spotlight_input');
    const resultsContainer = overlay.querySelector('#__nt_spotlight_list');

    setTimeout(() => {
      input.focus();
    }, 20);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSpotlight();
    });

    // Fetch shortcuts from background
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_SHORTCUTS' });
      if (resp && resp.success && Array.isArray(resp.shortcuts)) {
        allShortcutsCache = resp.shortcuts;
      } else {
        allShortcutsCache = [];
      }
    } catch (err) {
      console.warn('Could not fetch shortcuts from background:', err);
    }

    renderResults('');

    // Real-time search filter
    input.addEventListener('input', (e) => {
      renderResults(e.target.value);
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || (e.key.toLowerCase() === currentHotkey.toLowerCase() && !input.value)) {
        e.preventDefault();
        e.stopPropagation();
        closeSpotlight();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filteredResults.length > 0) {
          selectedIndex = (selectedIndex + 1) % filteredResults.length;
          updateSelectedHighlight();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filteredResults.length > 0) {
          selectedIndex = (selectedIndex - 1 + filteredResults.length) % filteredResults.length;
          updateSelectedHighlight();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredResults.length > 0 && filteredResults[selectedIndex]) {
          const targetItem = filteredResults[selectedIndex];
          const finalUrl = targetItem.url.startsWith('http') ? targetItem.url : `https://${targetItem.url}`;
          closeSpotlight();
          if (e.ctrlKey || e.metaKey) {
            window.open(finalUrl, '_blank');
          } else {
            window.location.href = finalUrl;
          }
        }
      }
    });

    function renderResults(query) {
      const q = (query || '').toLowerCase().trim();
      selectedIndex = 0;

      let matches = [];
      if (!q) {
        // Prioritize pinned shortcuts, fallback to all
        matches = allShortcutsCache.filter((s) => s.pinned);
        if (matches.length === 0) {
          matches = allShortcutsCache;
        }
      } else {
        matches = allShortcutsCache.filter((s) => {
          return (
            (s.name && s.name.toLowerCase().includes(q)) ||
            (s.url && s.url.toLowerCase().includes(q)) ||
            (s.category && s.category.toLowerCase().includes(q))
          );
        });
      }

      filteredResults = matches;

      if (filteredResults.length === 0) {
        resultsContainer.innerHTML = `
          <div class="__nt_spotlight_empty">
            ${q ? `No shortcuts found matching &ldquo;${escapeHtml(q)}&rdquo;` : 'No shortcuts found. Configure your API key in extension settings.'}
          </div>
        `;
        return;
      }

      resultsContainer.innerHTML = filteredResults
        .map((item, idx) => {
          const fav = faviconUrl(item.url);
          return `
            <div class="__nt_spotlight_item ${idx === 0 ? '__nt_selected' : ''}" data-index="${idx}" data-url="${escapeHtml(item.url)}">
              <div class="__nt_spotlight_item_left">
                <div class="__nt_spotlight_fav">
                  <img src="${fav}" alt="" width="16" height="16" onerror="this.style.display='none'" />
                </div>
                <div class="__nt_spotlight_info">
                  <span class="__nt_spotlight_name">${escapeHtml(item.name || item.url)}</span>
                  <span class="__nt_spotlight_url">${escapeHtml(item.url)}</span>
                </div>
              </div>
              <div class="__nt_spotlight_item_right">
                ${item.category ? `<span class="__nt_spotlight_cat">${escapeHtml(item.category)}</span>` : ''}
                ${item.pinned ? `<span class="__nt_spotlight_star">⭐</span>` : ''}
              </div>
            </div>
          `;
        })
        .join('');

      const items = resultsContainer.querySelectorAll('.__nt_spotlight_item');
      items.forEach((el) => {
        el.addEventListener('click', () => {
          const url = el.getAttribute('data-url');
          if (url) {
            closeSpotlight();
            window.location.href = url.startsWith('http') ? url : `https://${url}`;
          }
        });
        el.addEventListener('mouseenter', () => {
          selectedIndex = parseInt(el.getAttribute('data-index'), 10);
          updateSelectedHighlight();
        });
      });
    }

    function updateSelectedHighlight() {
      const items = resultsContainer.querySelectorAll('.__nt_spotlight_item');
      items.forEach((item, idx) => {
        if (idx === selectedIndex) {
          item.classList.add('__nt_selected');
          item.scrollIntoView({ block: 'nearest' });
        } else {
          item.classList.remove('__nt_selected');
        }
      });
    }
  }

  // In-Page Toast Notification
  function showToast(message, isError = false) {
    if (activeToast) activeToast.remove();
    if (toastTimeout) clearTimeout(toastTimeout);

    const toast = document.createElement('div');
    toast.className = `__nt_toast ${isError ? '__nt_toast_error' : ''}`;
    toast.innerHTML = `<span>${isError ? '✕' : '✓'}</span> <span>${escapeHtml(message)}</span>`;

    const root = document.body || document.documentElement;
    root.appendChild(toast);
    activeToast = toast;

    requestAnimationFrame(() => {
      toast.classList.add('__nt_toast_show');
    });

    toastTimeout = setTimeout(() => {
      toast.classList.remove('__nt_toast_show');
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SHOW_TOAST') {
      showToast(message.message, !!message.error);
    } else if (message.type === 'OPEN_LAUNCHER') {
      openSpotlight();
    }
  });
})();
