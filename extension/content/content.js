// Content script for New Tab Dashboard Extension

(function () {
  let hoverBtn = null;
  let activeLink = null;
  let hideTimeout = null;
  let activeModal = null;
  let activeToast = null;
  let toastTimeout = null;

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

      document.body.appendChild(hoverBtn);
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

    // Position above/beside link with scroll offset
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

    // Fetch user categories from extension background
    let categories = ['Dev', 'AI', 'Social', 'Entertainment', 'Shopping', 'Productivity', 'News'];
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_CATEGORIES' });
      if (resp && resp.success && Array.isArray(resp.categories)) {
        categories = resp.categories;
      }
    } catch {
      // Use defaults
    }

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

    document.body.appendChild(overlay);
    activeModal = overlay;
    setTimeout(() => {
      const nameInput = overlay.querySelector('.__nt_name');
      if (nameInput) {
        nameInput.focus();
        nameInput.select();
      }
    }, 50);
  }

  // In-Page Toast Notification
  function showToast(message, isError = false) {
    if (activeToast) activeToast.remove();
    if (toastTimeout) clearTimeout(toastTimeout);

    const toast = document.createElement('div');
    toast.className = `__nt_toast ${isError ? '__nt_toast_error' : ''}`;
    toast.innerHTML = `<span>${isError ? '✕' : '✓'}</span> <span>${escapeHtml(message)}</span>`;

    document.body.appendChild(toast);
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

  // Listen for messages from background (e.g. from context menu)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SHOW_TOAST') {
      showToast(message.message, !!message.error);
    }
  });
})();
