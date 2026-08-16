# New Tab Dashboard & Chrome Extension ✦

A minimalist, high-efficiency, developer-first **Browser Start Page & Bookmarks Dashboard** built with **Next.js 16 (App Router + TypeScript + Vanilla CSS)** accompanied by a **Manifest V3 Chrome Extension** for 1-click & hover link saving.

---

## ✨ Features

### 🖥️ Next.js Web App Dashboard
- ⏱️ **Real-Time Clock & Dynamic Greeting**: Live ticking clock (HH:MM:SS), localized date, and time-of-day greetings ("Good morning", "Still up", etc.).
- 🔍 **Smart Multi-Engine Search Bar**: Switch between Google, DuckDuckGo, Bing, and Perplexity with direct URL / domain detection (e.g. typing `github.com` jumps directly).
- ⭐ **Pinned Section**: Quick-access row for starred/pinned bookmarks with count pill badge.
- 🏷️ **Categorized Shortcuts & Batch Launch**: Filter shortcuts by tag (`Dev`, `AI`, `Social`, `Entertainment`, `News`) with an **"Open all N ↗"** batch tab opener.
- 🎨 **Favicon Fetching**: Google S2 Favicon integration with monogram fallback avatars.
- 🌐 **Curated "Browse Popular" Directory**: 25+ popular services ready to add in 1 click.
- 💾 **Data Portability**: Full JSON export/import and multi-mode sorting (`Recent`, `Most Visited`, `A–Z`).
- 🔄 **Multi-User API Key Backend**: Each user has an isolated API Key for remote synchronization with the Chrome Extension.

### 🔌 Manifest V3 Chrome Extension
- 🖱️ **Link Hover Quick Saver**: Hover over any link on any webpage to reveal a floating `+ Dashboard` button. Clicking opens an in-page modal to customize title, category, and pin status.
- 📌 **Active Tab Saver**: Click the toolbar extension icon to save your current page in 1 click.
- 📋 **Context Menu**: Right-click any link -> *"Save link to New Tab Dashboard"*.
- ⚙️ **Configurable Host & API Key**: Set your Dashboard URL (local or Vercel) and user API Key with real-time connection testing.

---

## 🚀 Quick Start (Web App)

```bash
# Install dependencies
npm install

# Run locally on port 3001
npm run dev -- -p 3001
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## 🧩 Installing the Chrome Extension

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** (top-left).
4. Select the `extension/` folder in this repository.
5. In your running Dashboard at [http://localhost:3001](http://localhost:3001), click **`extension & api`** to copy your **API Key**.
6. Open the Chrome Extension popup -> **Settings** tab -> paste your **Dashboard URL** and **API Key** -> click **Test Connection** & **Save Settings**.

---

## 🌐 Deploy to Vercel

```bash
npx vercel
```
Or import this repository directly into [Vercel](https://vercel.com).
After deploying, update your Chrome Extension's **Dashboard URL** in extension settings to your Vercel deployment URL (e.g. `https://your-dashboard.vercel.app`).

---

## 📜 License

MIT
