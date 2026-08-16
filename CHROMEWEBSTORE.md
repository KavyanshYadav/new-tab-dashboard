# Chrome Web Store Listing: New Tab Dashboard - Link Saver

**Last Updated:** August 17, 2026  
**Extension Version:** 1.0.0  
**Manifest Version:** 3  

---

## 1. Store Listing Metadata

- **Name:** New Tab Dashboard - Link Saver
- **Short Description:** Hover any link on any webpage or click the toolbar button to instantly save shortcuts to your New Tab Dashboard.
- **Detailed Description:**
  Transform the way you collect and organize your web discoveries. With the New Tab Dashboard Link Saver, you can save any link you see on the web with a single click without opening new tabs or interrupting your workflow.

  Features:
  - ✦ **Hover-to-Save Badge**: Hover over any link on any webpage to reveal a subtle "+ Dashboard" button.
  - ✦ **In-Page Quick Dialog**: Edit the title, assign categories (Dev, AI, Social, Reading, etc.), and pin directly to your top shortcuts.
  - ✦ **1-Click Active Tab Saver**: Click the toolbar extension icon to save your current page instantly.
  - ✦ **Context Menu Integration**: Right-click any link or page to send it to your dashboard.
  - ✦ **Multi-User Cloud Sync**: Connects securely to your self-hosted or Vercel-hosted Next.js New Tab Dashboard via a private user API Key.

- **Category:** Productivity / Developer Tools
- **Language:** English

---

## 2. Permissions Justification

| Permission | Justification |
|---|---|
| `storage` | Required to store the user's Dashboard API Endpoint URL and private API Key locally in Chrome synced storage. |
| `activeTab` | Required to access the URL and Title of the currently open tab when the user clicks the extension popup action to save the active page. |
| `tabs` | Required to read the URL and Title of the tab when triggered via context menus and to deliver in-page toast feedback messages. |
| `contextMenus` | Required to add the "Save link to New Tab Dashboard" option to Chrome's right-click context menu. |
| `<all_urls>` (host_permissions) | Required to display the floating "+ Dashboard" quick-save badge over hovered links across any webpage the user browses, and to communicate with the user's custom Next.js dashboard backend. |

---

## 3. Privacy & Data Use Disclosure

- **Data Collected:** User-configured Dashboard URL, API Key, and the URLs/titles of bookmarks explicitly saved by the user.
- **Data Transmission:** Data is transmitted solely to the user's configured Dashboard API URL (`http://localhost:3001` or personal Vercel deployment). No analytics or third-party trackers are used.
- **Single Purpose:** The extension solely exists to save bookmarks and shortcuts to the user's personalized New Tab dashboard.

---

## 4. Version History

- **v1.0.0** (2026-08-17): Initial release featuring hover link detection, in-page quick-save modal, toolbar popup with active tab saving, context menu integration, and multi-user API key syncing with Next.js dashboard.
