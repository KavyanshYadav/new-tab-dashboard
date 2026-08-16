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

// src/save-bookmark.tsx
var save_bookmark_exports = {};
__export(save_bookmark_exports, {
  default: () => SaveBookmark
});
module.exports = __toCommonJS(save_bookmark_exports);
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
async function fetchCategories() {
  const data = await request("/api/categories");
  return Array.isArray(data.categories) ? data.categories : ["Dev", "AI", "Social", "Productivity", "News"];
}
async function createShortcut(payload) {
  const data = await request("/api/shortcuts", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return data.shortcut;
}

// src/save-bookmark.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function SaveBookmark() {
  const { pop } = (0, import_api2.useNavigation)();
  const [url, setUrl] = (0, import_react.useState)("");
  const [name, setName] = (0, import_react.useState)("");
  const [category, setCategory] = (0, import_react.useState)("");
  const [pinned, setPinned] = (0, import_react.useState)(false);
  const [categories, setCategories] = (0, import_react.useState)(["Dev", "AI", "Social", "Productivity", "News"]);
  const [isLoading, setIsLoading] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    (async () => {
      try {
        const text = await import_api2.Clipboard.readText();
        if (text && /^https?:\/\//i.test(text.trim())) {
          const cleanUrl = text.trim();
          setUrl(cleanUrl);
          try {
            const parsed = new URL(cleanUrl);
            setName(parsed.hostname.replace(/^www\./, ""));
          } catch {
          }
        }
      } catch {
      }
      try {
        const cats = await fetchCategories();
        if (cats && cats.length > 0) {
          setCategories(cats);
        }
      } catch {
      }
    })();
  }, []);
  async function handleSubmit() {
    if (!url.trim()) {
      (0, import_api2.showToast)({ style: import_api2.Toast.Style.Failure, title: "URL is required" });
      return;
    }
    setIsLoading(true);
    try {
      await createShortcut({
        url: url.trim(),
        name: name.trim() || void 0,
        category: category.trim() || void 0,
        pinned
      });
      (0, import_api2.showToast)({
        style: import_api2.Toast.Style.Success,
        title: "Saved to Dashboard \u2713",
        message: name || url
      });
      pop();
    } catch (err) {
      (0, import_api2.showToast)({
        style: import_api2.Toast.Style.Failure,
        title: "Failed to save shortcut",
        message: err.message
      });
    } finally {
      setIsLoading(false);
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    import_api2.Form,
    {
      isLoading,
      actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api2.ActionPanel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api2.Action.SubmitForm, { title: "Save Bookmark", icon: import_api2.Icon.Check, onSubmit: handleSubmit }) }),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_api2.Form.TextField,
          {
            id: "url",
            title: "URL",
            placeholder: "https://github.com",
            value: url,
            onChange: (val) => {
              setUrl(val);
              if (!name) {
                try {
                  const u = val.startsWith("http") ? val : `https://${val}`;
                  setName(new URL(u).hostname.replace(/^www\./, ""));
                } catch {
                }
              }
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_api2.Form.TextField,
          {
            id: "name",
            title: "Title / Name",
            placeholder: "e.g. GitHub",
            value: name,
            onChange: setName
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_api2.Form.Dropdown, { id: "category", title: "Category", value: category, onChange: setCategory, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api2.Form.Dropdown.Item, { value: "", title: "None (General)" }),
          categories.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api2.Form.Dropdown.Item, { value: c, title: c }, c))
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_api2.Form.Checkbox,
          {
            id: "pinned",
            label: "Pin to top (\u2B50 Pinned section)",
            value: pinned,
            onChange: setPinned
          }
        )
      ]
    }
  );
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL3NhdmUtYm9va21hcmsudHN4IiwgInNyYy9hcGkudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7XG4gIEZvcm0sXG4gIEFjdGlvblBhbmVsLFxuICBBY3Rpb24sXG4gIHNob3dUb2FzdCxcbiAgVG9hc3QsXG4gIHVzZU5hdmlnYXRpb24sXG4gIENsaXBib2FyZCxcbiAgSWNvbixcbn0gZnJvbSAnQHJheWNhc3QvYXBpJztcbmltcG9ydCB7IHVzZUVmZmVjdCwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBjcmVhdGVTaG9ydGN1dCwgZmV0Y2hDYXRlZ29yaWVzIH0gZnJvbSAnLi9hcGknO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBTYXZlQm9va21hcmsoKSB7XG4gIGNvbnN0IHsgcG9wIH0gPSB1c2VOYXZpZ2F0aW9uKCk7XG4gIGNvbnN0IFt1cmwsIHNldFVybF0gPSB1c2VTdGF0ZSgnJyk7XG4gIGNvbnN0IFtuYW1lLCBzZXROYW1lXSA9IHVzZVN0YXRlKCcnKTtcbiAgY29uc3QgW2NhdGVnb3J5LCBzZXRDYXRlZ29yeV0gPSB1c2VTdGF0ZSgnJyk7XG4gIGNvbnN0IFtwaW5uZWQsIHNldFBpbm5lZF0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFtjYXRlZ29yaWVzLCBzZXRDYXRlZ29yaWVzXSA9IHVzZVN0YXRlPHN0cmluZ1tdPihbJ0RldicsICdBSScsICdTb2NpYWwnLCAnUHJvZHVjdGl2aXR5JywgJ05ld3MnXSk7XG4gIGNvbnN0IFtpc0xvYWRpbmcsIHNldElzTG9hZGluZ10gPSB1c2VTdGF0ZShmYWxzZSk7XG5cbiAgLy8gQXV0by1kZXRlY3QgVVJMIGZyb20gY2xpcGJvYXJkIG9uIG9wZW5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgdGV4dCA9IGF3YWl0IENsaXBib2FyZC5yZWFkVGV4dCgpO1xuICAgICAgICBpZiAodGV4dCAmJiAvXmh0dHBzPzpcXC9cXC8vaS50ZXN0KHRleHQudHJpbSgpKSkge1xuICAgICAgICAgIGNvbnN0IGNsZWFuVXJsID0gdGV4dC50cmltKCk7XG4gICAgICAgICAgc2V0VXJsKGNsZWFuVXJsKTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcGFyc2VkID0gbmV3IFVSTChjbGVhblVybCk7XG4gICAgICAgICAgICBzZXROYW1lKHBhcnNlZC5ob3N0bmFtZS5yZXBsYWNlKC9ed3d3XFwuLywgJycpKTtcbiAgICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2gge31cblxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgY2F0cyA9IGF3YWl0IGZldGNoQ2F0ZWdvcmllcygpO1xuICAgICAgICBpZiAoY2F0cyAmJiBjYXRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBzZXRDYXRlZ29yaWVzKGNhdHMpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIHt9XG4gICAgfSkoKTtcbiAgfSwgW10pO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIGhhbmRsZVN1Ym1pdCgpIHtcbiAgICBpZiAoIXVybC50cmltKCkpIHtcbiAgICAgIHNob3dUb2FzdCh7IHN0eWxlOiBUb2FzdC5TdHlsZS5GYWlsdXJlLCB0aXRsZTogJ1VSTCBpcyByZXF1aXJlZCcgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2V0SXNMb2FkaW5nKHRydWUpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBjcmVhdGVTaG9ydGN1dCh7XG4gICAgICAgIHVybDogdXJsLnRyaW0oKSxcbiAgICAgICAgbmFtZTogbmFtZS50cmltKCkgfHwgdW5kZWZpbmVkLFxuICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnkudHJpbSgpIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgcGlubmVkLFxuICAgICAgfSk7XG5cbiAgICAgIHNob3dUb2FzdCh7XG4gICAgICAgIHN0eWxlOiBUb2FzdC5TdHlsZS5TdWNjZXNzLFxuICAgICAgICB0aXRsZTogJ1NhdmVkIHRvIERhc2hib2FyZCBcdTI3MTMnLFxuICAgICAgICBtZXNzYWdlOiBuYW1lIHx8IHVybCxcbiAgICAgIH0pO1xuICAgICAgcG9wKCk7XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgIHNob3dUb2FzdCh7XG4gICAgICAgIHN0eWxlOiBUb2FzdC5TdHlsZS5GYWlsdXJlLFxuICAgICAgICB0aXRsZTogJ0ZhaWxlZCB0byBzYXZlIHNob3J0Y3V0JyxcbiAgICAgICAgbWVzc2FnZTogZXJyLm1lc3NhZ2UsXG4gICAgICB9KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgc2V0SXNMb2FkaW5nKGZhbHNlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gKFxuICAgIDxGb3JtXG4gICAgICBpc0xvYWRpbmc9e2lzTG9hZGluZ31cbiAgICAgIGFjdGlvbnM9e1xuICAgICAgICA8QWN0aW9uUGFuZWw+XG4gICAgICAgICAgPEFjdGlvbi5TdWJtaXRGb3JtIHRpdGxlPVwiU2F2ZSBCb29rbWFya1wiIGljb249e0ljb24uQ2hlY2t9IG9uU3VibWl0PXtoYW5kbGVTdWJtaXR9IC8+XG4gICAgICAgIDwvQWN0aW9uUGFuZWw+XG4gICAgICB9XG4gICAgPlxuICAgICAgPEZvcm0uVGV4dEZpZWxkXG4gICAgICAgIGlkPVwidXJsXCJcbiAgICAgICAgdGl0bGU9XCJVUkxcIlxuICAgICAgICBwbGFjZWhvbGRlcj1cImh0dHBzOi8vZ2l0aHViLmNvbVwiXG4gICAgICAgIHZhbHVlPXt1cmx9XG4gICAgICAgIG9uQ2hhbmdlPXsodmFsKSA9PiB7XG4gICAgICAgICAgc2V0VXJsKHZhbCk7XG4gICAgICAgICAgaWYgKCFuYW1lKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBjb25zdCB1ID0gdmFsLnN0YXJ0c1dpdGgoJ2h0dHAnKSA/IHZhbCA6IGBodHRwczovLyR7dmFsfWA7XG4gICAgICAgICAgICAgIHNldE5hbWUobmV3IFVSTCh1KS5ob3N0bmFtZS5yZXBsYWNlKC9ed3d3XFwuLywgJycpKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge31cbiAgICAgICAgICB9XG4gICAgICAgIH19XG4gICAgICAvPlxuXG4gICAgICA8Rm9ybS5UZXh0RmllbGRcbiAgICAgICAgaWQ9XCJuYW1lXCJcbiAgICAgICAgdGl0bGU9XCJUaXRsZSAvIE5hbWVcIlxuICAgICAgICBwbGFjZWhvbGRlcj1cImUuZy4gR2l0SHViXCJcbiAgICAgICAgdmFsdWU9e25hbWV9XG4gICAgICAgIG9uQ2hhbmdlPXtzZXROYW1lfVxuICAgICAgLz5cblxuICAgICAgPEZvcm0uRHJvcGRvd24gaWQ9XCJjYXRlZ29yeVwiIHRpdGxlPVwiQ2F0ZWdvcnlcIiB2YWx1ZT17Y2F0ZWdvcnl9IG9uQ2hhbmdlPXtzZXRDYXRlZ29yeX0+XG4gICAgICAgIDxGb3JtLkRyb3Bkb3duLkl0ZW0gdmFsdWU9XCJcIiB0aXRsZT1cIk5vbmUgKEdlbmVyYWwpXCIgLz5cbiAgICAgICAge2NhdGVnb3JpZXMubWFwKChjKSA9PiAoXG4gICAgICAgICAgPEZvcm0uRHJvcGRvd24uSXRlbSBrZXk9e2N9IHZhbHVlPXtjfSB0aXRsZT17Y30gLz5cbiAgICAgICAgKSl9XG4gICAgICA8L0Zvcm0uRHJvcGRvd24+XG5cbiAgICAgIDxGb3JtLkNoZWNrYm94XG4gICAgICAgIGlkPVwicGlubmVkXCJcbiAgICAgICAgbGFiZWw9XCJQaW4gdG8gdG9wIChcdTJCNTAgUGlubmVkIHNlY3Rpb24pXCJcbiAgICAgICAgdmFsdWU9e3Bpbm5lZH1cbiAgICAgICAgb25DaGFuZ2U9e3NldFBpbm5lZH1cbiAgICAgIC8+XG4gICAgPC9Gb3JtPlxuICApO1xufVxuIiwgImltcG9ydCB7IGdldFByZWZlcmVuY2VWYWx1ZXMgfSBmcm9tICdAcmF5Y2FzdC9hcGknO1xuaW1wb3J0IHsgUHJlZmVyZW5jZXMsIFNob3J0Y3V0IH0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRCYXNlVXJsKCk6IHN0cmluZyB7XG4gIGNvbnN0IHByZWZzID0gZ2V0UHJlZmVyZW5jZVZhbHVlczxQcmVmZXJlbmNlcz4oKTtcbiAgcmV0dXJuIChwcmVmcy5hcHBVcmwgfHwgJ2h0dHBzOi8vYXVmdmltLnRlY2gnKS5yZXBsYWNlKC9cXC8rJC8sICcnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaUtleSgpOiBzdHJpbmcge1xuICBjb25zdCBwcmVmcyA9IGdldFByZWZlcmVuY2VWYWx1ZXM8UHJlZmVyZW5jZXM+KCk7XG4gIHJldHVybiAocHJlZnMuYXBpS2V5IHx8ICcnKS50cmltKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJlcXVlc3Q8VCA9IGFueT4oZW5kcG9pbnQ6IHN0cmluZywgb3B0aW9uczogUmVxdWVzdEluaXQgPSB7fSk6IFByb21pc2U8VD4ge1xuICBjb25zdCBiYXNlVXJsID0gZ2V0QmFzZVVybCgpO1xuICBjb25zdCBhcGlLZXkgPSBnZXRBcGlLZXkoKTtcblxuICBpZiAoIWFwaUtleSkge1xuICAgIHRocm93IG5ldyBFcnJvcignQVBJIEtleSBpcyBtaXNzaW5nLiBQbGVhc2Ugc2V0IHlvdXIgQVBJIEtleSBpbiBFeHRlbnNpb24gUHJlZmVyZW5jZXMuJyk7XG4gIH1cblxuICBjb25zdCB1cmwgPSBgJHtiYXNlVXJsfSR7ZW5kcG9pbnR9YDtcbiAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICd4LWFwaS1rZXknOiBhcGlLZXksXG4gICAgLi4uKG9wdGlvbnMuaGVhZGVycyBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHx8IHt9KSxcbiAgfTtcblxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwgeyAuLi5vcHRpb25zLCBoZWFkZXJzIH0pO1xuICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpLmNhdGNoKCgpID0+ICh7fSkpO1xuXG4gIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoZGF0YS5lcnJvciB8fCBgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c306ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcbiAgfVxuXG4gIHJldHVybiBkYXRhIGFzIFQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaFNob3J0Y3V0cyhwaW5uZWRPbmx5ID0gZmFsc2UpOiBQcm9taXNlPFNob3J0Y3V0W10+IHtcbiAgY29uc3QgcXVlcnkgPSBwaW5uZWRPbmx5ID8gJz9waW5uZWQ9dHJ1ZScgOiAnJztcbiAgY29uc3QgZGF0YSA9IGF3YWl0IHJlcXVlc3Q8eyBzaG9ydGN1dHM/OiBTaG9ydGN1dFtdIH0+KGAvYXBpL3Nob3J0Y3V0cyR7cXVlcnl9YCk7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGRhdGEuc2hvcnRjdXRzKSA/IGRhdGEuc2hvcnRjdXRzIDogW107XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaENhdGVnb3JpZXMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICBjb25zdCBkYXRhID0gYXdhaXQgcmVxdWVzdDx7IGNhdGVnb3JpZXM/OiBzdHJpbmdbXSB9PignL2FwaS9jYXRlZ29yaWVzJyk7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGRhdGEuY2F0ZWdvcmllcykgPyBkYXRhLmNhdGVnb3JpZXMgOiBbJ0RldicsICdBSScsICdTb2NpYWwnLCAnUHJvZHVjdGl2aXR5JywgJ05ld3MnXTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVNob3J0Y3V0KHBheWxvYWQ6IHtcbiAgdXJsOiBzdHJpbmc7XG4gIG5hbWU/OiBzdHJpbmc7XG4gIGNhdGVnb3J5Pzogc3RyaW5nO1xuICBwaW5uZWQ/OiBib29sZWFuO1xufSk6IFByb21pc2U8U2hvcnRjdXQ+IHtcbiAgY29uc3QgZGF0YSA9IGF3YWl0IHJlcXVlc3Q8eyBzaG9ydGN1dDogU2hvcnRjdXQgfT4oJy9hcGkvc2hvcnRjdXRzJywge1xuICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpLFxuICB9KTtcbiAgcmV0dXJuIGRhdGEuc2hvcnRjdXQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZWxldGVTaG9ydGN1dChpZDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IGRhdGEgPSBhd2FpdCByZXF1ZXN0PHsgc3VjY2VzczogYm9vbGVhbiB9PihgL2FwaS9zaG9ydGN1dHM/aWQ9JHtlbmNvZGVVUklDb21wb25lbnQoaWQpfWAsIHtcbiAgICBtZXRob2Q6ICdERUxFVEUnLFxuICB9KTtcbiAgcmV0dXJuIEJvb2xlYW4oZGF0YS5zdWNjZXNzKTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBQUFBLGNBU087QUFDUCxtQkFBb0M7OztBQ1ZwQyxpQkFBb0M7QUFHN0IsU0FBUyxhQUFxQjtBQUNuQyxRQUFNLFlBQVEsZ0NBQWlDO0FBQy9DLFVBQVEsTUFBTSxVQUFVLHVCQUF1QixRQUFRLFFBQVEsRUFBRTtBQUNuRTtBQUVPLFNBQVMsWUFBb0I7QUFDbEMsUUFBTSxZQUFRLGdDQUFpQztBQUMvQyxVQUFRLE1BQU0sVUFBVSxJQUFJLEtBQUs7QUFDbkM7QUFFQSxlQUFlLFFBQWlCLFVBQWtCLFVBQXVCLENBQUMsR0FBZTtBQUN2RixRQUFNLFVBQVUsV0FBVztBQUMzQixRQUFNLFNBQVMsVUFBVTtBQUV6QixNQUFJLENBQUMsUUFBUTtBQUNYLFVBQU0sSUFBSSxNQUFNLHVFQUF1RTtBQUFBLEVBQ3pGO0FBRUEsUUFBTSxNQUFNLEdBQUcsT0FBTyxHQUFHLFFBQVE7QUFDakMsUUFBTSxVQUFrQztBQUFBLElBQ3RDLGdCQUFnQjtBQUFBLElBQ2hCLGFBQWE7QUFBQSxJQUNiLEdBQUksUUFBUSxXQUFxQyxDQUFDO0FBQUEsRUFDcEQ7QUFFQSxRQUFNLFdBQVcs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
