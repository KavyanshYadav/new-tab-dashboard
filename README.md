# ✦ New Tab Dashboard & Chrome Extension

A minimalist, high-efficiency, developer-first **Browser Start Page & Bookmarks Dashboard** built with **Next.js 16 (App Router + Turbopack + TypeScript + Vanilla CSS)** accompanied by a **Manifest V3 Chrome Extension** for 1-click & hover link saving, **Spotlight Pinned Shortcuts Launcher (`U` / `Alt+U`)**, **Multi-User Isolation**, **Cloudflare Turnstile Bot Protection**, **Turso Cloud Database (libSQL / SQLite)**, and **Curated Community Lists**.

---

## 🌟 Overview & Architecture

```
new-tab-dashboard/
├── extension/                     # Manifest V3 Chrome Extension
│   ├── manifest.json              # Extension manifest & commands API
│   ├── background/
│   │   └── service-worker.js      # Background service worker & context menus
│   ├── content/
│   │   ├── content.js             # Spotlight 'U' launcher & hover button injector
│   │   └── content.css            # Dark glass Command Palette & modal styling
│   ├── popup/
│   │   ├── popup.html             # Extension popup (Save tab, settings, hotkey)
│   │   ├── popup.js               # Popup logic & connection test
│   │   └── popup.css              # Popup styling
│   └── icons/                     # 16px, 48px, 128px extension icons
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/              # Registration, Login, Session, Turnstile Config
│   │   │   ├── shortcuts/         # Protected CRUD API for bookmarks (?pinned=true)
│   │   │   ├── categories/        # Auto-suggested user categories
│   │   │   └── key/               # API Key regeneration endpoint
│   │   ├── login/                 # Standalone login / register page
│   │   ├── layout.tsx             # Root layout with metadata & fonts
│   │   ├── page.tsx               # Main Dashboard page
│   │   └── globals.css            # Dark minimalist design system & tokens
│   ├── components/
│   │   ├── ClockHero.tsx          # Real-time clock, greeting & multi-engine search
│   │   ├── PinnedSection.tsx      # Starred / Pinned quick-access row
│   │   ├── CommunitySection.tsx   # Curated public community topic rows
│   │   ├── CommunityListsModal.tsx# Public groups discovery modal & category filters
│   │   ├── ShortcutsSection.tsx   # Categorized bookmarks grid with "Open All"
│   │   ├── UtilityBar.tsx         # Footer actions (popular, sort, import, export)
│   │   ├── AuthModal.tsx          # Authentication dialog (Sign in & Sign up)
│   │   ├── TurnstileWidget.tsx    # Stable Cloudflare Turnstile verification widget
│   │   ├── UserAvatarMenu.tsx     # Top-right fixed avatar & user menu
│   │   ├── ApiSettingsModal.tsx   # Chrome Extension & API credentials settings
│   │   └── Toast.tsx              # Actionable notifications with Undo buffer
│   ├── hooks/
│   │   └── useDashboard.ts        # Dashboard state, guest storage, & cloud sync
│   └── lib/
│       ├── turso.ts               # Turso (libSQL) cloud client & schema auto-migrator
│       ├── community-lists.ts     # Curated public stacks catalog (AI, Dev, etc.)
│       ├── rate-limiter.ts        # In-memory sliding-window rate limiters & lockout
│       ├── server-storage.ts      # Dual-engine cloud Turso + local fallback store
│       ├── turnstile.ts           # Server-side Cloudflare siteverify validation
│       ├── constants.ts           # Default shortcuts, engines, & storage keys
│       ├── types.ts               # Complete TypeScript interfaces & schemas
│       └── utils.ts               # Favicon helpers, URL parsers, formatters
├── next.config.ts                 # Next.js configuration & OWASP security headers
└── .env.example                   # Environment variable template
```

---

## ✨ Features

### 🖥️ Next.js Web App Dashboard
- ⏱️ **Real-Time Clock & Dynamic Greeting**: Live ticking clock (`HH:MM:SS`), localized date, and time-of-day greetings ("Good morning", "Still up", etc.).
- 🔍 **Smart Multi-Engine Search Bar**: Switch between **Google, DuckDuckGo, Bing, and Perplexity** with direct domain detection (e.g. typing `github.com` jumps directly).
- ⭐ **Pinned Section**: Quick-access row for starred/pinned bookmarks with count pill badge.
- 🌐 **Curated Community Lists**: App-maintained topic stacks (Top AI Tools, Web Dev, Productivity, Tech News, Design Inspiration, DevOps) that can be toggled as dedicated rows without consuming your 500 personal bookmark quota.
- 🏷️ **Categorized Shortcuts & Batch Launch**: Filter shortcuts by tag with an **"Open all N ↗"** batch tab opener.
- 🎨 **Favicon Fetching**: Google S2 Favicon integration with monogram fallback avatars.
- 💾 **Data Portability**: Full JSON export/import and multi-mode sorting (`Recent`, `Most Visited`, `A–Z`).

### 🗄️ Turso Serverless Cloud Database (libSQL / SQLite)
- ☁️ **Permanent Cloud Persistence**: Automatically saves users, passwords, API keys, and bookmarks to [Turso](https://turso.tech) edge SQLite database.
- 🔄 **Auto-Schema & Seed Migration**: Tables and indexes are created automatically on first boot, and bundled accounts are auto-migrated with zero manual SQL commands.
- 🛡️ **Graceful Local Fallback**: When Turso environment variables are omitted, the app smoothly falls back to local file/memory storage.

### 🛡️ Security & Authentication
- 🔐 **Multi-User Isolation**: User accounts structured around unique `userId` (`usr_...`), `@username`, `email`, salted SHA-256 `passwordHash`, and private `apiKey` (`nt_key_...`).
- 🤖 **Cloudflare Turnstile Bot Protection**: Token verification protecting registration and login endpoints against automated bots, credential stuffing, and spam.
- 🚦 **Anti-Sybil & Brute Force Rate Limiting**: Max 5 registrations per IP / 15 min, max 10 login attempts per 5 min, and automatic account lockout after 5 consecutive failed attempts.
- 🛡️ **OWASP Security Headers**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- 👤 **Guest Mode**: Logged-out visitors use local browser storage with zero network exposure.

### 🔌 Manifest V3 Chrome Extension
- ⚡ **Spotlight Pinned Shortcuts Launcher**: Press **`U`** (or **`Alt+U`**) on ANY webpage to open a centered Command Palette to search and jump to pinned shortcuts instantly.
- 🖱️ **Link Hover Quick Saver**: Hover over any link on any webpage to reveal a floating `+ Dashboard` button.
- 📌 **Active Tab Saver**: Click the toolbar extension icon to save your current page in 1 click.
- ⚙️ **Configurable Hotkey & API Key**: Customize the launcher hotkey and connect to your deployed domain.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.18.0 or higher
- **npm** / **pnpm** / **yarn**

### 2. Installation
```bash
git clone https://github.com/KavyanshYadav/new-tab-dashboard.git
cd new-tab-dashboard
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your Cloudflare Turnstile & Turso keys:
```env
TURNSTILE_SITE_KEY=your_cloudflare_site_key
TURNSTILE_SECRET_KEY=your_cloudflare_secret_key

# Optional: Turso Cloud Database
TURSO_DATABASE_URL=libsql://your-database-name-your-org.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token
```

### 4. Running the Development Server
```bash
npm run dev -- -p 3001
```
Open **[http://localhost:3001](http://localhost:3001)** in your browser.

---

## 🗄️ Setting Up Free Turso Database for Vercel

1. Create a free account at **[turso.tech](https://turso.tech)** (or install the CLI: `npm install -g @turso/cli`).
2. Create a database:
   ```bash
   turso db create new-tab-db
   ```
3. Get your Database URL:
   ```bash
   turso db show new-tab-db --url
   # Example: libsql://new-tab-db-username.turso.io
   ```
4. Create an Auth Token:
   ```bash
   turso db tokens create new-tab-db
   ```
5. In **Vercel &rarr; Project Settings &rarr; Environment Variables**, add:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
6. Redeploy! Turso will automatically create the tables and persist all user accounts and shortcuts permanently.

---

## 🧩 Installing the Chrome Extension

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `extension/` folder.
4. Open the extension popup &rarr; **Settings** tab &rarr; set Dashboard URL to `https://aufvim.tech` (or `http://localhost:3001`) and enter your **API Key**.
5. Press **`U`** (or **`Alt+U`**) on any webpage to launch your pinned shortcuts!

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Create account (with Turnstile validation) | Public (Rate limited) |
| `POST` | `/api/auth/login` | Sign in (with Turnstile validation) | Public (Rate limited) |
| `GET` | `/api/auth/me` | Fetch active user session | Yes (`x-api-key` / `x-user-id`) |
| `GET` | `/api/auth/turnstile-config` | Public Turnstile site key endpoint | Public |
| `GET` | `/api/shortcuts` | List user's shortcuts (`?pinned=true` supported) | Yes |
| `POST` | `/api/shortcuts` | Add a new shortcut (from Extension) | Yes |
| `PUT` | `/api/shortcuts` | Sync full shortcut list | Yes |
| `GET` | `/api/categories` | Get user category suggestions | Yes |
| `POST` | `/api/key` | Regenerate API Key | Yes |

---

## 📜 License
MIT © [Kavyansh Yadav](https://github.com/KavyanshYadav)
