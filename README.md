<div align="center">

# 🤷 excuse.exe

![HTML](https://img.shields.io/badge/HTML-5-e34f26?style=flat-square&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-3-1572b6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2024-f7df1e?style=flat-square&logo=javascript&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-ready-5a0fc8?style=flat-square&logo=pwa&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![No dependencies](https://img.shields.io/badge/dependencies-none-brightgreen?style=flat-square)

[![Live Demo](https://img.shields.io/badge/🤷_Live_Demo-excuse.exe-c8f135?style=for-the-badge&logoColor=black)](https://pero-grubac.github.io/excuse-generator/)
</div>

---

## 📌 Project Overview

**excuse.exe** is a zero-dependency, offline-capable PWA that generates a random excuse at the press of a button. 1000+ excuses in English, 600+ in Serbian — never repeating until every single one has been used. Dark editorial design, self-hosted fonts, no build step required.

---

## ✨ Features

- 🎲 **1000+ excuses** in English, 600+ in Serbian — exhausts the full list before repeating
- 🌍 **Multi-language** — EN / SR switcher, easily extensible to any language
- 📱 **PWA** — installable on mobile and desktop, works fully offline after first load
- ⭐ **Favorites** — save excuses per language, persisted across sessions in `localStorage`
- 📋 **Copy & Share** — clipboard copy + native share sheet on mobile
- ⌨️ **Keyboard shortcut** — `Space` or `Enter` to generate without touching the mouse
- 🔤 **Self-hosted fonts** — Syne Variable + DM Mono as WOFF2, zero external font requests
- 🔄 **Localhost bypass** — service worker skips caching on `localhost` so dev is always fresh

---

## 🛠️ Tech Stack

| Technology | Usage |
|---|---|
| Vanilla JS (ES2024) | App logic, no framework, no build step |
| CSS Custom Properties | Full design token system |
| Syne Variable | Display / heading font — self-hosted WOFF2 |
| DM Mono | UI / body font — self-hosted WOFF2 |
| Web App Manifest | PWA install support |
| Service Worker | Offline cache-first strategy |
| localStorage | Favorites + language preference persistence |
| GitHub Pages | Hosting |

---

## 📁 Project Structure

```
excuse-generator/
│   index.html            # App shell
│   style.css             # All styles — design token system
│   script.js             # App logic — language, generate, favorites
│   service-worker.js     # PWA offline cache (localhost bypass)
│   manifest.json         # PWA manifest with full icon set
│   excuses.en.json       # English excuses (1000+)
│   excuses.sr.json       # Serbian excuses (600+)
│   README.md
│   .gitignore
│
└───assets/
    ├───fonts/
    │       Syne-Variable.woff2      # Display font
    │       Syne-Variable.ttf
    │       DMMono-Regular.woff2     # Body / mono font
    │       DMMono-Regular.ttf
    │       DMMono-Medium.woff2
    │       DMMono-Medium.ttf
    │
    ├───icons/
    │       icon-16.png … icon-512.png   # Full PWA icon set
    │       icon-*.svg                   # SVG source files
    │       favicon.ico
    │
    └───images/
            (reserved)
```

---

## 🚀 Setup & Run

### Prerequisites

- Any static file server (no Node, no build step required)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/excuse-generator.git
cd excuse-generator
```

### 2. Serve locally

```bash
# Python 3
python3 -m http.server 8080

# Node (npx, no install needed)
npx serve .

# VS Code
# Install "Live Server" → right-click index.html → Open with Live Server
```

Then open [http://localhost:8080](http://localhost:8080).

> **Note:** The service worker skips all caching on `localhost` / `127.0.0.1` — you always get fresh files during development. No need to clear caches or unregister the SW.

---

## ⚙️ How it works

### Excuse pipeline

1. **Load** — On init, `script.js` fetches `excuses.<lang>.json` for the active language
2. **Pick** — A random index is drawn from a `Set` of unused indices; when all are used the set resets
3. **Render** — Emoji + text animate in; the card border accent lights up; stats update
4. **Milestone** — Every 10th excuse triggers a confetti burst

### Language switching

Each language has its own:
- Excuse file (`excuses.xx.json`)
- Full UI string map (button labels, toasts, placeholders)
- Separate favorites key in `localStorage` (`eg_favs_xx`)

Switching language resets the used-index set and loads the new file. The chosen language is persisted as `eg_lang` in `localStorage`.

### PWA offline strategy

```
isLocal (localhost / 127.0.0.1)
  └── install:  skipWaiting only, no cache
  └── activate: clients.claim only
  └── fetch:    pass-through (always network)

production
  └── install:  cache all ASSETS
  └── activate: delete old cache versions
  └── fetch:    cache-first → network fallback → index.html for documents
```

---

## 🌍 Adding a new language

**1.** Create `excuses.xx.json` — a flat JSON array of strings:

```json
["First excuse in your language.", "Second excuse.", "..."]
```

**2.** Add an entry to the `LANGUAGES` object in `script.js`:

```js
xx: {
  label: 'XX',                    // shown in the language switcher
  file: './excuses.xx.json',
  ui: {
    subtitle:        '...',
    btnLabel:        '...',
    copyLabel:       '...',
    shareLabel:      '...',
    favLabel:        '...',
    unfavLabel:      '...',
    favsToggleLabel: '...',
    totalLabel:      '...',
    genLabel:        '...',
    savedLabel:      '...',
    favsTitle:       '...',
    favsClear:       '...',
    favsEmpty:       '...',
    placeholder:     '...',
    cardTag:         '...',
    toastCopied:     '...',
    toastShared:     '...',
    toastFavAdd:     '...',
    toastFavRm:      '...',
    toastCleared:    '...',
    toastNeedGen:    '...',
    excuseWord:      '...',       // e.g. "excuses", "izgovora"
  },
}
```

**3.** Add the new file to `ASSETS` in `service-worker.js`:

```js
'./excuses.xx.json',
```

**4.** Bump `CACHE_NAME` so existing users get the update:

```js
const CACHE_NAME = 'excuse-generator-v2'; // increment on every release
```

---

## 🌐 Deployment

Drop the folder on any static host — no build step, no server required.

| Host | Method |
|---|---|
| **GitHub Pages** | Push → Settings → Pages → Deploy from branch (root) |
| **Netlify** | Drag-and-drop the folder on [netlify.com/drop](https://netlify.com/drop) |
| **Vercel** | `vercel --prod` inside the folder |
| **Cloudflare Pages** | Connect repo or drag-and-drop |

> HTTPS is required for the service worker to register. All the hosts above provide it automatically.

---

## 📋 PWA Cache Versioning

Whenever you change any file listed in `ASSETS`, bump `CACHE_NAME` in `service-worker.js`:

```js
const CACHE_NAME = 'excuse-generator-v2'; // ← increment
```

The activate handler automatically deletes all caches that don't match the current name, so users get the update on next visit without any manual action.

---

## ⚠️ Known Limitations

- Excuse data is bundled as static JSON — adding new excuses requires a new deployment
- The Serbian excuse set (~600) is smaller than the English set (~1000); contributions welcome
- Share via `navigator.share` falls back to clipboard copy on desktop browsers that don't support the Web Share API

---

## 📋 Available Scripts

| Command | Description |
|---|---|
| `python3 -m http.server 8080` | Serve locally with Python |
| `npx serve .` | Serve locally with Node |

No npm, no bundler, no build step — open and go.

---

_excuse.exe — an unofficial tool. All excuses are fictional. Any resemblance to real situations is entirely intentional._
