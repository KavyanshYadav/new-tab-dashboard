/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Dashboard URL - URL where your dashboard is hosted (e.g. https://aufvim.tech or http://localhost:3001) */
  "appUrl": string,
  /** API Key - Your private user API Key found in your dashboard under 'extension & api' (nt_key_...) */
  "apiKey": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-shortcuts` command */
  export type SearchShortcuts = ExtensionPreferences & {}
  /** Preferences accessible in the `save-bookmark` command */
  export type SaveBookmark = ExtensionPreferences & {}
  /** Preferences accessible in the `open-dashboard` command */
  export type OpenDashboard = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-shortcuts` command */
  export type SearchShortcuts = {}
  /** Arguments passed to the `save-bookmark` command */
  export type SaveBookmark = {}
  /** Arguments passed to the `open-dashboard` command */
  export type OpenDashboard = {}
}

