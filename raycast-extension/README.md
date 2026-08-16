# ✦ New Tab Dashboard — Raycast Extension

A custom Raycast extension to search, filter, launch, and save bookmarks to your **New Tab Dashboard** directly from your desktop launcher.

---

## ✨ Features

- 🔍 **Search Dashboard Bookmarks (`search-shortcuts`)**:
  - Instant fuzzy search across your bookmarks, categories, and URLs.
  - ⭐ Pinned shortcuts section with yellow star badge.
  - Category dropdown filter.
  - Actions: Open in Browser (<kbd>↵</kbd>), Copy URL (<kbd>⌘C</kbd>), Copy Title, Open Dashboard, and Delete Bookmark.
- 💾 **Save Link to Dashboard (`save-bookmark`)**:
  - Auto-fills URL from your system clipboard.
  - Set custom title, pick or type a category, and toggle Pin to top.
- 🚀 **Open Dashboard (`open-dashboard`)**:
  - 1-click jump directly to your personal dashboard.

---

## 🛠️ How to Load Locally in Raycast

1. **Install Dependencies**:
   ```bash
   cd raycast-extension
   npm install
   ```

2. **Start Local Development Mode**:
   ```bash
   npm run dev
   ```
   *Raycast will automatically detect the extension and install it into your Raycast command launcher.*

3. **Configure Preferences**:
   - In Raycast, search for **"Search Dashboard Bookmarks"** and press <kbd>↵</kbd>.
   - When prompted for Preferences:
     - **Dashboard URL**: `https://aufvim.tech` (or `http://localhost:3001`)
     - **API Key**: Your personal API key (`nt_key_...`) from your Dashboard &rarr; **`extension & api`**.

4. **Permanent Local Build**:
   To keep the extension permanently installed without running the terminal dev server:
   ```bash
   npm run build
   ```

---

## 📜 License
MIT © [Kavyansh Yadav](https://github.com/KavyanshYadav)
