"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/search-shortcuts.tsx
var search_shortcuts_exports = {};
__export(search_shortcuts_exports, {
  default: () => SearchShortcuts
});
module.exports = __toCommonJS(search_shortcuts_exports);
var import_api2 = require("@raycast/api");
var import_react = require("react");

// src/api.ts
var import_api = require("@raycast/api");
function getBaseUrl() {
  const prefs = (0, import_api.getPreferenceValues)();
  return (prefs.appUrl || "https://aufvim.tech").replace(/\/+$/, "");
}
function getApiKey() {
  const prefs = (0, import_api.getPreferenceValues)();
  return (prefs.apiKey || "").trim();
}
async function request(endpoint, options = {}) {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key is missing. Please set your API Key in Extension Preferences.");
  }
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    ...options.headers || {}
  };
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return data;
}
async function fetchShortcuts(pinnedOnly = false) {
  const query = pinnedOnly ? "?pinned=true" : "";
  const data = await request(`/api/shortcuts${query}`);
  return Array.isArray(data.shortcuts) ? data.shortcuts : [];
}
async function deleteShortcut(id) {
  const data = await request(`/api/shortcuts?id=${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
  return Boolean(data.success);
}

// src/search-shortcuts.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function SearchShortcuts() {
  const [shortcuts, setShortcuts] = (0, import_react.useState)([]);
  const [isLoading, setIsLoading] = (0, import_react.useState)(true);
  const [selectedCategory, setSelectedCategory] = (0, import_react.useState)("all");
  async function loadData() {
    setIsLoading(true);
    try {
      const items = await fetchShortcuts();
      setShortcuts(items);
    } catch (err) {
      (0, import_api2.showToast)({
        style: import_api2.Toast.Style.Failure,
        title: "Failed to fetch shortcuts",
        message: err.message
      });
    } finally {
      setIsLoading(false);
    }
  }
  (0, import_react.useEffect)(() => {
    loadData();
  }, []);
  const categories = (0, import_react.useMemo)(() => {
    const set = /* @__PURE__ */ new Set();
    shortcuts.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [shortcuts]);
  const filteredShortcuts = (0, import_react.useMemo)(() => {
    if (selectedCategory === "all") return shortcuts;
    if (selectedCategory === "pinned") return shortcuts.filter((s) => s.pinned);
    return shortcuts.filter((s) => s.category === selectedCategory);
  }, [shortcuts, selectedCategory]);
  const pinnedList = (0, import_react.useMemo)(
    () => filteredShortcuts.filter((s) => s.pinned),
    [filteredShortcuts]
  );
  const otherList = (0, import_react.useMemo)(
    () => filteredShortcuts.filter((s) => !s.pinned),
    [filteredShortcuts]
  );
  async function handleDelete(shortcut) {
    if (await (0, import_api2.confirmAlert)({
      title: `Delete "${shortcut.name}"?`,
      message: "This shortcut will be removed from your dashboard.",
      primaryAction: { title: "Delete", style: import_api2.Alert.ActionStyle.Destructive }
    })) {
      try {
        await deleteShortcut(shortcut.id);
        setShortcuts((prev) => prev.filter((s) => s.id !== shortcut.id));
        (0, import_api2.showToast)({ style: import_api2.Toast.Style.Success, title: "Shortcut deleted" });
      } catch (err) {
        (0, import_api2.showToast)({ style: import_api2.Toast.Style.Failure, title: "Failed to delete", message: err.message });
      }
    }
  }
  function formatFavicon(url) {
    try {
      const u = url.startsWith("http") ? url : `https://${url}`;
      const domain = new URL(u).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return import_api2.Icon.Globe;
    }
  }
  function ensureUrl(url) {
    return url.startsWith("http") ? url : `https://${url}`;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    import_api2.List,
    {
      isLoading,
      searchBarPlaceholder: "Search dashboard bookmarks (e.g. GitHub, ChatGPT)...",
      searchBarAccessory: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        import_api2.List.Dropdown,
        {
          tooltip: "Filter by Category",
          value: selectedCategory,
          onChange: setSelectedCategory,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api2.List.Dropdown.Item, { title: "All Categories", value: "all", icon: import_api2.Icon.AppWindowGrid3x3 }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api2.List.Dropdown.Item, { title: "\u2B50 Pinned Only", value: "pinned", icon: import_api2.Icon.Star }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api2.List.Dropdown.Section, { title: "Categories", children: categories.map((cat) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api2.List.Dropdown.Item, { title: cat, value: cat, icon: import_api2.Icon.Tag }, cat)) })
          ]
        }
      ),
      children: [
        pinnedList.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api2.List.Section, { title: "\u2B50 Pinned Shortcuts", subtitle: `${pinnedList.length} pinned`, children: pinnedList.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_api2.List.Item,
          {
            icon: { source: formatFavicon(item.url), fallback: import_api2.Icon.Globe },
            title: item.name,
            subtitle: item.url,
            accessories: [
              ...item.category ? [{ tag: { value: item.category, color: import_api2.Color.Purple } }] : [],
              { icon: { source: import_api2.Icon.Star, tintColor: import_api2.Color.Yellow } }
            ],
            actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_api2.ActionPanel, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api2.Action.OpenInBrowser, { url: ensureUrl(item.url) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api2.Action.CopyToClipboard, { content: ensureUrl(item.url), title: "Copy URL" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api2.Action.CopyToClipboard, { content: item.name, title: "Copy Title" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                import_api2.Action.OpenInBrowser,
                {
                  url: getBaseUrl(),
                  title: "Open Dashboard",
                  icon: import_api2.Icon.Window,
                  shortcut: { modifiers: ["cmd", "shift"], key: "d" }
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                import_api2.Action,
                {
                  title: "Reload Bookmarks",
                  icon: import_api2.Icon.RotateClockwise,
                  onAction: loadData,
                  shortcut: { modifiers: ["cmd"], key: "r" }
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                import_api2.Action,
                {
                  title: "Delete Bookmark",
                  icon: import_api2.Icon.Trash,
                  style: import_api2.Action.Style.Destructive,
                  onAction: () => handleDelete(item),
                  shortcut: { modifiers: ["ctrl"], key: "x" }
                }
              )
            ] })
          },
          item.id
        )) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api2.List.Section, { title: "Bookmarks", subtitle: `${otherList.length} items`, children: otherList.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_api2.List.Item,
          {
            icon: { source: formatFavicon(item.url), fallback: import_api2.Icon.Globe },
            title: item.name,
            subtitle: item.url,
            accessories: [
              ...item.category ? [{ tag: { value: item.category, color: import_api2.Color.Blue } }] : []
            ],
            actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_api2.ActionPanel, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api2.Action.OpenInBrowser, { url: ensureUrl(item.url) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api2.Action.CopyToClipboard, { content: ensureUrl(item.url), title: "Copy URL" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api2.Action.CopyToClipboard, { content: item.name, title: "Copy Title" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                import_api2.Action.OpenInBrowser,
                {
                  url: getBaseUrl(),
                  title: "Open Dashboard",
                  icon: import_api2.Icon.Window,
                  shortcut: { modifiers: ["cmd", "shift"], key: "d" }
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                import_api2.Action,
                {
                  title: "Reload Bookmarks",
                  icon: import_api2.Icon.RotateClockwise,
                  onAction: loadData,
                  shortcut: { modifiers: ["cmd"], key: "r" }
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                import_api2.Action,
                {
                  title: "Delete Bookmark",
                  icon: import_api2.Icon.Trash,
                  style: import_api2.Action.Style.Destructive,
                  onAction: () => handleDelete(item),
                  shortcut: { modifiers: ["ctrl"], key: "x" }
                }
              )
            ] })
          },
          item.id
        )) }),
        !isLoading && shortcuts.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_api2.List.EmptyView,
          {
            icon: import_api2.Icon.Bookmark,
            title: "No Bookmarks Found",
            description: "Check your API Key in Extension Preferences or save your first bookmark!",
            actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api2.ActionPanel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api2.Action.OpenInBrowser, { url: getBaseUrl(), title: "Open Dashboard" }) })
          }
        )
      ]
    }
  );
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL3NlYXJjaC1zaG9ydGN1dHMudHN4IiwgInNyYy9hcGkudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7XG4gIExpc3QsXG4gIEFjdGlvblBhbmVsLFxuICBBY3Rpb24sXG4gIEljb24sXG4gIENvbG9yLFxuICBzaG93VG9hc3QsXG4gIFRvYXN0LFxuICBjb25maXJtQWxlcnQsXG4gIEFsZXJ0LFxufSBmcm9tICdAcmF5Y2FzdC9hcGknO1xuaW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VTdGF0ZSwgdXNlTWVtbyB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IGZldGNoU2hvcnRjdXRzLCBkZWxldGVTaG9ydGN1dCwgZ2V0QmFzZVVybCB9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7IFNob3J0Y3V0IH0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIFNlYXJjaFNob3J0Y3V0cygpIHtcbiAgY29uc3QgW3Nob3J0Y3V0cywgc2V0U2hvcnRjdXRzXSA9IHVzZVN0YXRlPFNob3J0Y3V0W10+KFtdKTtcbiAgY29uc3QgW2lzTG9hZGluZywgc2V0SXNMb2FkaW5nXSA9IHVzZVN0YXRlKHRydWUpO1xuICBjb25zdCBbc2VsZWN0ZWRDYXRlZ29yeSwgc2V0U2VsZWN0ZWRDYXRlZ29yeV0gPSB1c2VTdGF0ZTxzdHJpbmc+KCdhbGwnKTtcblxuICBhc3luYyBmdW5jdGlvbiBsb2FkRGF0YSgpIHtcbiAgICBzZXRJc0xvYWRpbmcodHJ1ZSk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgZmV0Y2hTaG9ydGN1dHMoKTtcbiAgICAgIHNldFNob3J0Y3V0cyhpdGVtcyk7XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgIHNob3dUb2FzdCh7XG4gICAgICAgIHN0eWxlOiBUb2FzdC5TdHlsZS5GYWlsdXJlLFxuICAgICAgICB0aXRsZTogJ0ZhaWxlZCB0byBmZXRjaCBzaG9ydGN1dHMnLFxuICAgICAgICBtZXNzYWdlOiBlcnIubWVzc2FnZSxcbiAgICAgIH0pO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBzZXRJc0xvYWRpbmcoZmFsc2UpO1xuICAgIH1cbiAgfVxuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgbG9hZERhdGEoKTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IGNhdGVnb3JpZXMgPSB1c2VNZW1vKCgpID0+IHtcbiAgICBjb25zdCBzZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBzaG9ydGN1dHMuZm9yRWFjaCgocykgPT4ge1xuICAgICAgaWYgKHMuY2F0ZWdvcnkpIHNldC5hZGQocy5jYXRlZ29yeSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oc2V0KTtcbiAgfSwgW3Nob3J0Y3V0c10pO1xuXG4gIGNvbnN0IGZpbHRlcmVkU2hvcnRjdXRzID0gdXNlTWVtbygoKSA9PiB7XG4gICAgaWYgKHNlbGVjdGVkQ2F0ZWdvcnkgPT09ICdhbGwnKSByZXR1cm4gc2hvcnRjdXRzO1xuICAgIGlmIChzZWxlY3RlZENhdGVnb3J5ID09PSAncGlubmVkJykgcmV0dXJuIHNob3J0Y3V0cy5maWx0ZXIoKHMpID0+IHMucGlubmVkKTtcbiAgICByZXR1cm4gc2hvcnRjdXRzLmZpbHRlcigocykgPT4gcy5jYXRlZ29yeSA9PT0gc2VsZWN0ZWRDYXRlZ29yeSk7XG4gIH0sIFtzaG9ydGN1dHMsIHNlbGVjdGVkQ2F0ZWdvcnldKTtcblxuICBjb25zdCBwaW5uZWRMaXN0ID0gdXNlTWVtbyhcbiAgICAoKSA9PiBmaWx0ZXJlZFNob3J0Y3V0cy5maWx0ZXIoKHMpID0+IHMucGlubmVkKSxcbiAgICBbZmlsdGVyZWRTaG9ydGN1dHNdXG4gICk7XG4gIGNvbnN0IG90aGVyTGlzdCA9IHVzZU1lbW8oXG4gICAgKCkgPT4gZmlsdGVyZWRTaG9ydGN1dHMuZmlsdGVyKChzKSA9PiAhcy5waW5uZWQpLFxuICAgIFtmaWx0ZXJlZFNob3J0Y3V0c11cbiAgKTtcblxuICBhc3luYyBmdW5jdGlvbiBoYW5kbGVEZWxldGUoc2hvcnRjdXQ6IFNob3J0Y3V0KSB7XG4gICAgaWYgKFxuICAgICAgYXdhaXQgY29uZmlybUFsZXJ0KHtcbiAgICAgICAgdGl0bGU6IGBEZWxldGUgXCIke3Nob3J0Y3V0Lm5hbWV9XCI/YCxcbiAgICAgICAgbWVzc2FnZTogJ1RoaXMgc2hvcnRjdXQgd2lsbCBiZSByZW1vdmVkIGZyb20geW91ciBkYXNoYm9hcmQuJyxcbiAgICAgICAgcHJpbWFyeUFjdGlvbjogeyB0aXRsZTogJ0RlbGV0ZScsIHN0eWxlOiBBbGVydC5BY3Rpb25TdHlsZS5EZXN0cnVjdGl2ZSB9LFxuICAgICAgfSlcbiAgICApIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGRlbGV0ZVNob3J0Y3V0KHNob3J0Y3V0LmlkKTtcbiAgICAgICAgc2V0U2hvcnRjdXRzKChwcmV2KSA9PiBwcmV2LmZpbHRlcigocykgPT4gcy5pZCAhPT0gc2hvcnRjdXQuaWQpKTtcbiAgICAgICAgc2hvd1RvYXN0KHsgc3R5bGU6IFRvYXN0LlN0eWxlLlN1Y2Nlc3MsIHRpdGxlOiAnU2hvcnRjdXQgZGVsZXRlZCcgfSk7XG4gICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICBzaG93VG9hc3QoeyBzdHlsZTogVG9hc3QuU3R5bGUuRmFpbHVyZSwgdGl0bGU6ICdGYWlsZWQgdG8gZGVsZXRlJywgbWVzc2FnZTogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0RmF2aWNvbih1cmw6IHN0cmluZykge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB1ID0gdXJsLnN0YXJ0c1dpdGgoJ2h0dHAnKSA/IHVybCA6IGBodHRwczovLyR7dXJsfWA7XG4gICAgICBjb25zdCBkb21haW4gPSBuZXcgVVJMKHUpLmhvc3RuYW1lO1xuICAgICAgcmV0dXJuIGBodHRwczovL3d3dy5nb29nbGUuY29tL3MyL2Zhdmljb25zP2RvbWFpbj0ke2RvbWFpbn0mc3o9NjRgO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIEljb24uR2xvYmU7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZW5zdXJlVXJsKHVybDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHVybC5zdGFydHNXaXRoKCdodHRwJykgPyB1cmwgOiBgaHR0cHM6Ly8ke3VybH1gO1xuICB9XG5cbiAgcmV0dXJuIChcbiAgICA8TGlzdFxuICAgICAgaXNMb2FkaW5nPXtpc0xvYWRpbmd9XG4gICAgICBzZWFyY2hCYXJQbGFjZWhvbGRlcj1cIlNlYXJjaCBkYXNoYm9hcmQgYm9va21hcmtzIChlLmcuIEdpdEh1YiwgQ2hhdEdQVCkuLi5cIlxuICAgICAgc2VhcmNoQmFyQWNjZXNzb3J5PXtcbiAgICAgICAgPExpc3QuRHJvcGRvd25cbiAgICAgICAgICB0b29sdGlwPVwiRmlsdGVyIGJ5IENhdGVnb3J5XCJcbiAgICAgICAgICB2YWx1ZT17c2VsZWN0ZWRDYXRlZ29yeX1cbiAgICAgICAgICBvbkNoYW5nZT17c2V0U2VsZWN0ZWRDYXRlZ29yeX1cbiAgICAgICAgPlxuICAgICAgICAgIDxMaXN0LkRyb3Bkb3duLkl0ZW0gdGl0bGU9XCJBbGwgQ2F0ZWdvcmllc1wiIHZhbHVlPVwiYWxsXCIgaWNvbj17SWNvbi5BcHBXaW5kb3dHcmlkM3gzfSAvPlxuICAgICAgICAgIDxMaXN0LkRyb3Bkb3duLkl0ZW0gdGl0bGU9XCJcdTJCNTAgUGlubmVkIE9ubHlcIiB2YWx1ZT1cInBpbm5lZFwiIGljb249e0ljb24uU3Rhcn0gLz5cbiAgICAgICAgICA8TGlzdC5Ecm9wZG93bi5TZWN0aW9uIHRpdGxlPVwiQ2F0ZWdvcmllc1wiPlxuICAgICAgICAgICAge2NhdGVnb3JpZXMubWFwKChjYXQpID0+IChcbiAgICAgICAgICAgICAgPExpc3QuRHJvcGRvd24uSXRlbSBrZXk9e2NhdH0gdGl0bGU9e2NhdH0gdmFsdWU9e2NhdH0gaWNvbj17SWNvbi5UYWd9IC8+XG4gICAgICAgICAgICApKX1cbiAgICAgICAgICA8L0xpc3QuRHJvcGRvd24uU2VjdGlvbj5cbiAgICAgICAgPC9MaXN0LkRyb3Bkb3duPlxuICAgICAgfVxuICAgID5cbiAgICAgIHtwaW5uZWRMaXN0Lmxlbmd0aCA+IDAgJiYgKFxuICAgICAgICA8TGlzdC5TZWN0aW9uIHRpdGxlPVwiXHUyQjUwIFBpbm5lZCBTaG9ydGN1dHNcIiBzdWJ0aXRsZT17YCR7cGlubmVkTGlzdC5sZW5ndGh9IHBpbm5lZGB9PlxuICAgICAgICAgIHtwaW5uZWRMaXN0Lm1hcCgoaXRlbSkgPT4gKFxuICAgICAgICAgICAgPExpc3QuSXRlbVxuICAgICAgICAgICAgICBrZXk9e2l0ZW0uaWR9XG4gICAgICAgICAgICAgIGljb249e3sgc291cmNlOiBmb3JtYXRGYXZpY29uKGl0ZW0udXJsKSwgZmFsbGJhY2s6IEljb24uR2xvYmUgfX1cbiAgICAgICAgICAgICAgdGl0bGU9e2l0ZW0ubmFtZX1cbiAgICAgICAgICAgICAgc3VidGl0bGU9e2l0ZW0udXJsfVxuICAgICAgICAgICAgICBhY2Nlc3Nvcmllcz17W1xuICAgICAgICAgICAgICAgIC4uLihpdGVtLmNhdGVnb3J5XG4gICAgICAgICAgICAgICAgICA/IFt7IHRhZzogeyB2YWx1ZTogaXRlbS5jYXRlZ29yeSwgY29sb3I6IENvbG9yLlB1cnBsZSB9IH1dXG4gICAgICAgICAgICAgICAgICA6IFtdKSxcbiAgICAgICAgICAgICAgICB7IGljb246IHsgc291cmNlOiBJY29uLlN0YXIsIHRpbnRDb2xvcjogQ29sb3IuWWVsbG93IH0gfSxcbiAgICAgICAgICAgICAgXX1cbiAgICAgICAgICAgICAgYWN0aW9ucz17XG4gICAgICAgICAgICAgICAgPEFjdGlvblBhbmVsPlxuICAgICAgICAgICAgICAgICAgPEFjdGlvbi5PcGVuSW5Ccm93c2VyIHVybD17ZW5zdXJlVXJsKGl0ZW0udXJsKX0gLz5cbiAgICAgICAgICAgICAgICAgIDxBY3Rpb24uQ29weVRvQ2xpcGJvYXJkIGNvbnRlbnQ9e2Vuc3VyZVVybChpdGVtLnVybCl9IHRpdGxlPVwiQ29weSBVUkxcIiAvPlxuICAgICAgICAgICAgICAgICAgPEFjdGlvbi5Db3B5VG9DbGlwYm9hcmQgY29udGVudD17aXRlbS5uYW1lfSB0aXRsZT1cIkNvcHkgVGl0bGVcIiAvPlxuICAgICAgICAgICAgICAgICAgPEFjdGlvbi5PcGVuSW5Ccm93c2VyXG4gICAgICAgICAgICAgICAgICAgIHVybD17Z2V0QmFzZVVybCgpfVxuICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIk9wZW4gRGFzaGJvYXJkXCJcbiAgICAgICAgICAgICAgICAgICAgaWNvbj17SWNvbi5XaW5kb3d9XG4gICAgICAgICAgICAgICAgICAgIHNob3J0Y3V0PXt7IG1vZGlmaWVyczogWydjbWQnLCAnc2hpZnQnXSwga2V5OiAnZCcgfX1cbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICA8QWN0aW9uXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiUmVsb2FkIEJvb2ttYXJrc1wiXG4gICAgICAgICAgICAgICAgICAgIGljb249e0ljb24uUm90YXRlQ2xvY2t3aXNlfVxuICAgICAgICAgICAgICAgICAgICBvbkFjdGlvbj17bG9hZERhdGF9XG4gICAgICAgICAgICAgICAgICAgIHNob3J0Y3V0PXt7IG1vZGlmaWVyczogWydjbWQnXSwga2V5OiAncicgfX1cbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICA8QWN0aW9uXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiRGVsZXRlIEJvb2ttYXJrXCJcbiAgICAgICAgICAgICAgICAgICAgaWNvbj17SWNvbi5UcmFzaH1cbiAgICAgICAgICAgICAgICAgICAgc3R5bGU9e0FjdGlvbi5TdHlsZS5EZXN0cnVjdGl2ZX1cbiAgICAgICAgICAgICAgICAgICAgb25BY3Rpb249eygpID0+IGhhbmRsZURlbGV0ZShpdGVtKX1cbiAgICAgICAgICAgICAgICAgICAgc2hvcnRjdXQ9e3sgbW9kaWZpZXJzOiBbJ2N0cmwnXSwga2V5OiAneCcgfX1cbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgPC9BY3Rpb25QYW5lbD5cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICApKX1cbiAgICAgICAgPC9MaXN0LlNlY3Rpb24+XG4gICAgICApfVxuXG4gICAgICA8TGlzdC5TZWN0aW9uIHRpdGxlPVwiQm9va21hcmtzXCIgc3VidGl0bGU9e2Ake290aGVyTGlzdC5sZW5ndGh9IGl0ZW1zYH0+XG4gICAgICAgIHtvdGhlckxpc3QubWFwKChpdGVtKSA9PiAoXG4gICAgICAgICAgPExpc3QuSXRlbVxuICAgICAgICAgICAga2V5PXtpdGVtLmlkfVxuICAgICAgICAgICAgaWNvbj17eyBzb3VyY2U6IGZvcm1hdEZhdmljb24oaXRlbS51cmwpLCBmYWxsYmFjazogSWNvbi5HbG9iZSB9fVxuICAgICAgICAgICAgdGl0bGU9e2l0ZW0ubmFtZX1cbiAgICAgICAgICAgIHN1YnRpdGxlPXtpdGVtLnVybH1cbiAgICAgICAgICAgIGFjY2Vzc29yaWVzPXtbXG4gICAgICAgICAgICAgIC4uLihpdGVtLmNhdGVnb3J5XG4gICAgICAgICAgICAgICAgPyBbeyB0YWc6IHsgdmFsdWU6IGl0ZW0uY2F0ZWdvcnksIGNvbG9yOiBDb2xvci5CbHVlIH0gfV1cbiAgICAgICAgICAgICAgICA6IFtdKSxcbiAgICAgICAgICAgIF19XG4gICAgICAgICAgICBhY3Rpb25zPXtcbiAgICAgICAgICAgICAgPEFjdGlvblBhbmVsPlxuICAgICAgICAgICAgICAgIDxBY3Rpb24uT3BlbkluQnJvd3NlciB1cmw9e2Vuc3VyZVVybChpdGVtLnVybCl9IC8+XG4gICAgICAgICAgICAgICAgPEFjdGlvbi5Db3B5VG9DbGlwYm9hcmQgY29udGVudD17ZW5zdXJlVXJsKGl0ZW0udXJsKX0gdGl0bGU9XCJDb3B5IFVSTFwiIC8+XG4gICAgICAgICAgICAgICAgPEFjdGlvbi5Db3B5VG9DbGlwYm9hcmQgY29udGVudD17aXRlbS5uYW1lfSB0aXRsZT1cIkNvcHkgVGl0bGVcIiAvPlxuICAgICAgICAgICAgICAgIDxBY3Rpb24uT3BlbkluQnJvd3NlclxuICAgICAgICAgICAgICAgICAgdXJsPXtnZXRCYXNlVXJsKCl9XG4gICAgICAgICAgICAgICAgICB0aXRsZT1cIk9wZW4gRGFzaGJvYXJkXCJcbiAgICAgICAgICAgICAgICAgIGljb249e0ljb24uV2luZG93fVxuICAgICAgICAgICAgICAgICAgc2hvcnRjdXQ9e3sgbW9kaWZpZXJzOiBbJ2NtZCcsICdzaGlmdCddLCBrZXk6ICdkJyB9fVxuICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgPEFjdGlvblxuICAgICAgICAgICAgICAgICAgdGl0bGU9XCJSZWxvYWQgQm9va21hcmtzXCJcbiAgICAgICAgICAgICAgICAgIGljb249e0ljb24uUm90YXRlQ2xvY2t3aXNlfVxuICAgICAgICAgICAgICAgICAgb25BY3Rpb249e2xvYWREYXRhfVxuICAgICAgICAgICAgICAgICAgc2hvcnRjdXQ9e3sgbW9kaWZpZXJzOiBbJ2NtZCddLCBrZXk6ICdyJyB9fVxuICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgPEFjdGlvblxuICAgICAgICAgICAgICAgICAgdGl0bGU9XCJEZWxldGUgQm9va21hcmtcIlxuICAgICAgICAgICAgICAgICAgaWNvbj17SWNvbi5UcmFzaH1cbiAgICAgICAgICAgICAgICAgIHN0eWxlPXtBY3Rpb24uU3R5bGUuRGVzdHJ1Y3RpdmV9XG4gICAgICAgICAgICAgICAgICBvbkFjdGlvbj17KCkgPT4gaGFuZGxlRGVsZXRlKGl0ZW0pfVxuICAgICAgICAgICAgICAgICAgc2hvcnRjdXQ9e3sgbW9kaWZpZXJzOiBbJ2N0cmwnXSwga2V5OiAneCcgfX1cbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICA8L0FjdGlvblBhbmVsPlxuICAgICAgICAgICAgfVxuICAgICAgICAgIC8+XG4gICAgICAgICkpfVxuICAgICAgPC9MaXN0LlNlY3Rpb24+XG5cbiAgICAgIHshaXNMb2FkaW5nICYmIHNob3J0Y3V0cy5sZW5ndGggPT09IDAgJiYgKFxuICAgICAgICA8TGlzdC5FbXB0eVZpZXdcbiAgICAgICAgICBpY29uPXtJY29uLkJvb2ttYXJrfVxuICAgICAgICAgIHRpdGxlPVwiTm8gQm9va21hcmtzIEZvdW5kXCJcbiAgICAgICAgICBkZXNjcmlwdGlvbj1cIkNoZWNrIHlvdXIgQVBJIEtleSBpbiBFeHRlbnNpb24gUHJlZmVyZW5jZXMgb3Igc2F2ZSB5b3VyIGZpcnN0IGJvb2ttYXJrIVwiXG4gICAgICAgICAgYWN0aW9ucz17XG4gICAgICAgICAgICA8QWN0aW9uUGFuZWw+XG4gICAgICAgICAgICAgIDxBY3Rpb24uT3BlbkluQnJvd3NlciB1cmw9e2dldEJhc2VVcmwoKX0gdGl0bGU9XCJPcGVuIERhc2hib2FyZFwiIC8+XG4gICAgICAgICAgICA8L0FjdGlvblBhbmVsPlxuICAgICAgICAgIH1cbiAgICAgICAgLz5cbiAgICAgICl9XG4gICAgPC9MaXN0PlxuICApO1xufVxuIiwgImltcG9ydCB7IGdldFByZWZlcmVuY2VWYWx1ZXMgfSBmcm9tICdAcmF5Y2FzdC9hcGknO1xuaW1wb3J0IHsgUHJlZmVyZW5jZXMsIFNob3J0Y3V0IH0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRCYXNlVXJsKCk6IHN0cmluZyB7XG4gIGNvbnN0IHByZWZzID0gZ2V0UHJlZmVyZW5jZVZhbHVlczxQcmVmZXJlbmNlcz4oKTtcbiAgcmV0dXJuIChwcmVmcy5hcHBVcmwgfHwgJ2h0dHBzOi8vYXVmdmltLnRlY2gnKS5yZXBsYWNlKC9cXC8rJC8sICcnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaUtleSgpOiBzdHJpbmcge1xuICBjb25zdCBwcmVmcyA9IGdldFByZWZlcmVuY2VWYWx1ZXM8UHJlZmVyZW5jZXM+KCk7XG4gIHJldHVybiAocHJlZnMuYXBpS2V5IHx8ICcnKS50cmltKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJlcXVlc3Q8VCA9IGFueT4oZW5kcG9pbnQ6IHN0cmluZywgb3B0aW9uczogUmVxdWVzdEluaXQgPSB7fSk6IFByb21pc2U8VD4ge1xuICBjb25zdCBiYXNlVXJsID0gZ2V0QmFzZVVybCgpO1xuICBjb25zdCBhcGlLZXkgPSBnZXRBcGlLZXkoKTtcblxuICBpZiAoIWFwaUtleSkge1xuICAgIHRocm93IG5ldyBFcnJvcignQVBJIEtleSBpcyBtaXNzaW5nLiBQbGVhc2Ugc2V0IHlvdXIgQVBJIEtleSBpbiBFeHRlbnNpb24gUHJlZmVyZW5jZXMuJyk7XG4gIH1cblxuICBjb25zdCB1cmwgPSBgJHtiYXNlVXJsfSR7ZW5kcG9pbnR9YDtcbiAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICd4LWFwaS1rZXknOiBhcGlLZXksXG4gICAgLi4uKG9wdGlvbnMuaGVhZGVycyBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHx8IHt9KSxcbiAgfTtcblxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwgeyAuLi5vcHRpb25zLCBoZWFkZXJzIH0pO1xuICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpLmNhdGNoKCgpID0+ICh7fSkpO1xuXG4gIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoZGF0YS5lcnJvciB8fCBgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c306ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcbiAgfVxuXG4gIHJldHVybiBkYXRhIGFzIFQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaFNob3J0Y3V0cyhwaW5uZWRPbmx5ID0gZmFsc2UpOiBQcm9taXNlPFNob3J0Y3V0W10+IHtcbiAgY29uc3QgcXVlcnkgPSBwaW5uZWRPbmx5ID8gJz9waW5uZWQ9dHJ1ZScgOiAnJztcbiAgY29uc3QgZGF0YSA9IGF3YWl0IHJlcXVlc3Q8eyBzaG9ydGN1dHM/OiBTaG9ydGN1dFtdIH0+KGAvYXBpL3Nob3J0Y3V0cyR7cXVlcnl9YCk7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGRhdGEuc2hvcnRjdXRzKSA/IGRhdGEuc2hvcnRjdXRzIDogW107XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaENhdGVnb3JpZXMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICBjb25zdCBkYXRhID0gYXdhaXQgcmVxdWVzdDx7IGNhdGVnb3JpZXM/OiBzdHJpbmdbXSB9PignL2FwaS9jYXRlZ29yaWVzJyk7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGRhdGEuY2F0ZWdvcmllcykgPyBkYXRhLmNhdGVnb3JpZXMgOiBbJ0RldicsICdBSScsICdTb2NpYWwnLCAnUHJvZHVjdGl2aXR5JywgJ05ld3MnXTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVNob3J0Y3V0KHBheWxvYWQ6IHtcbiAgdXJsOiBzdHJpbmc7XG4gIG5hbWU/OiBzdHJpbmc7XG4gIGNhdGVnb3J5Pzogc3RyaW5nO1xuICBwaW5uZWQ/OiBib29sZWFuO1xufSk6IFByb21pc2U8U2hvcnRjdXQ+IHtcbiAgY29uc3QgZGF0YSA9IGF3YWl0IHJlcXVlc3Q8eyBzaG9ydGN1dDogU2hvcnRjdXQgfT4oJy9hcGkvc2hvcnRjdXRzJywge1xuICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpLFxuICB9KTtcbiAgcmV0dXJuIGRhdGEuc2hvcnRjdXQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZWxldGVTaG9ydGN1dChpZDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IGRhdGEgPSBhd2FpdCByZXF1ZXN0PHsgc3VjY2VzczogYm9vbGVhbiB9PihgL2FwaS9zaG9ydGN1dHM/aWQ9JHtlbmNvZGVVUklDb21wb25lbnQoaWQpfWAsIHtcbiAgICBtZXRob2Q6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
