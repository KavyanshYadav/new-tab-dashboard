# ✦ New Tab Dashboard & Chrome Extension

A minimalist, high-efficiency, developer-first **Browser Start Page & Bookmarks Dashboard** built with **Next.js 16 (App Router + Turbopack + TypeScript + Vanilla CSS)** accompanied by a **Manifest V3 Chrome Extension** for 1-click & hover link saving, **Multi-User Isolation**, **Cloudflare Turnstile Bot Protection**, and **Curated Community Lists**.

---

## 🌟 Overview & Architecture

```
new-tab-dashboard/
├── extension/                     # Manifest V3 Chrome Extension
│   ├── manifest.json              # Extension manifest
│   ├── background.js              # Service worker & context menu handlers
│   ├── content.js                 # Hover "+ Dashboard" link overlay injector
│   ├── popup.html / popup.js      # Extension popup (Save tab, categories, settings)
│   └── styles.css                 # Dark-themed extension UI
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/              # Registration, Login, Session, Turnstile Config
│   │   │   ├── shortcuts/         # Protected CRUD API for bookmarks
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
│       ├── community-lists.ts     # Curated public stacks catalog (AI, Dev, etc.)
│       ├── rate-limiter.ts        # In-memory sliding-window rate limiters & lockout
│       ├── server-storage.ts      # Multi-user data store, password hashing, quotas
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

### 🛡️ Security & Authentication
- 🔐 **Multi-User Isolation**: User accounts structured around unique `userId` (`usr_...`), `@username`, `email`, salted SHA-256 `passwordHash`, and private `apiKey` (`nt_key_...`).
- 🤖 **Cloudflare Turnstile Bot Protection**: Token verification protecting registration and login endpoints against automated bots, credential stuffing, and spam.
- 🚦 **Anti-Sybil & Brute Force Rate Limiting**: Max 5 registrations per IP / 15 min, max 10 login attempts per 5 min, and automatic account lockout after 5 consecutive failed attempts.
- 🛡️ **OWASP Security Headers**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- 👤 **Guest Mode**: Logged-out visitors use local storage with zero network exposure.

### 🔌 Manifest V3 Chrome Extension
- 🖱️ **Link Hover Quick Saver**: Hover over any link on any webpage to reveal a floating `+ Dashboard` button. Clicking opens an in-page modal to customize title, category, and pin status.
- 📌 **Active Tab Saver**: Click the toolbar extension icon to save your current page in 1 click.
- 📋 **Context Menu**: Right-click any link &rarr; *"Save link to New Tab Dashboard"*.
- ⚙️ **Configurable Host & API Key**: Set your Dashboard URL (local or Vercel) and user API Key with real-time connection testing.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.18.0 or higher
- **npm** / **pnpm** / **yarn**

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/KavyanshYadav/new-tab-dashboard.git
cd new-tab-dashboard

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your Cloudflare Turnstile keys (optional for local testing, official testing keys are enabled by default):
```env
TURNSTILE_SITE_KEY=your_cloudflare_site_key
TURNSTILE_SECRET_KEY=your_cloudflare_secret_key
```

### 4. Running the Development Server
```bash
npm run dev -- -p 3001
```
Open **[http://localhost:3001](http://localhost:3001)** in your browser.

---

## 🧩 Installing the Chrome Extension

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** (top-left).
4. Select the `extension/` folder in this repository.
5. In your running Dashboard at [http://localhost:3001](http://localhost:3001), click **`extension & api`** to copy your **API Key**.
6. Open the Chrome Extension popup &rarr; **Settings** tab &rarr; paste your **Dashboard URL** and **API Key** &rarr; click **Test Connection** & **Save Settings**.

---

## 📡 REST API Reference

All protected endpoints require either `x-api-key` or `x-user-id` in the request headers.

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Create account (with Turnstile validation) | Public (Rate limited) |
| `POST` | `/api/auth/login` | Sign in (with Turnstile validation) | Public (Rate limited) |
| `GET` | `/api/auth/me` | Fetch active user session | Yes (`x-api-key` / `x-user-id`) |
| `GET` | `/api/auth/turnstile-config` | Public Turnstile site key endpoint | Public |
| `GET` | `/api/shortcuts` | List user's shortcuts | Yes |
| `POST` | `/api/shortcuts` | Add a new shortcut (from Extension) | Yes |
| `PUT` | `/api/shortcuts` | Sync full shortcut list | Yes |
| `GET` | `/api/categories` | Get user category suggestions | Yes |
| `POST` | `/api/key` | Regenerate API Key | Yes |

---

## 🌐 Deploying to Vercel

```bash
npx vercel
```
Or import this repository directly into [Vercel](https://vercel.com).

### Vercel Environment Variables:
Under **Project Settings &rarr; Environment Variables**, add:
- `TURNSTILE_SITE_KEY`: Your Cloudflare Turnstile public site key.
- `TURNSTILE_SECRET_KEY`: Your Cloudflare Turnstile private secret key.

---

## 📜 License
MIT © [Kavyansh Yadav](https://github.com/KavyanshYadav)
