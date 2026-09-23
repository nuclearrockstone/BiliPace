<p align="center">
  <img src="icons/icon128.png" alt="BiliPace icon" width="110"/>
</p>

<h1 align="center">BiliPace — Bilibili Playback Speed Manager</h1>

<p align="center">
  <a href="https://microsoftedge.microsoft.com/addons/detail/bilipace-b%E7%AB%99%E5%80%8D%E9%80%9F%E7%AE%A1%E5%AE%B6/fcdfmgpfnbcbbjpopaggakdlfnkhjpbc"><img alt="Edge Add-ons - Install" src="https://img.shields.io/badge/Edge%20Add--ons-Install-0078D7"/></a>
  <a href="https://chromewebstore.google.com/detail/bilipace-b%E7%AB%99%E5%80%8D%E9%80%9F%E7%AE%A1%E5%AE%B6/jladjpcgejlgoifofnonpinadilbdjib"><img alt="Chrome Web Store - Install" src="https://img.shields.io/badge/Chrome%20Web%20Store-Install-4285F4?logo=googlechrome&logoColor=white"/></a>
</p>

<p align="center"><em>A playback speed extension designed specifically for Bilibili, giving you precise control over the pace of every video.</em></p>

<p align="center">
  <a href="./README.md">简体中文</a> · <b>English</b>
</p>

<p align="center">
  <img src="assets/主海报.png" alt="BiliPace main poster" width="100%"/>
</p>

BiliPace is a Chrome / Edge (Manifest V3) browser extension built specifically for Bilibili: **fine-grained speed control** sets exactly the pace you want; **rule-based matching** gives every video its own speed; and **seamless integration** keeps everything right where you expect it. Everything happens right inside the player — no switching back and forth. Your pace, your control!

---

## Table of Contents

- [Features](#features)
- [Install](#install)
- [Usage](#usage)
- [Title Speed Matching](#title-speed-matching)
- [File Structure](#file-structure)
- [Changelog](#changelog)
- [License](#license)

---

## Features

### ⚡ Fine-Grained Speed Control

1.5× too slow? 2.0× too fast? Set exactly the speed you want! Adjust playback speed effortlessly with a slider, precise numeric input, or increment and decrement buttons.

<p align="center">
  <img src="assets/无极调速.png" alt="Fine-grained speed control" width="80%"/>
</p>

- **Stepless slider**: continuously adjustable with fine granularity (default step 0.01); range configurable in settings
- **Exact input**: type any speed (e.g. `1.37x`) directly into the number field
- **Fine-tune buttons**: `+/−` adjusts by a configurable step

### 🎯 Rule-Based Speed Matching

Want to speed up tutorials but slow down music? Give every video its own speed! Set different playback speeds for videos containing specific keywords — "Tutorial" at 2×, "Music" at 1× — applied automatically based on the content.

<p align="center">
  <img src="assets/规则匹配.png" alt="Rule-based speed matching" width="80%"/>
</p>

- **Title keyword matching**: auto-apply a speed when the video title contains a keyword; add rules manually in settings, or save the current title + speed as a rule with one click
- **Reorderable priority**: when multiple rules match, the topmost rule wins; drag the handle on the left to reorder
- **Smart fallback**: videos with no matching rule use the remembered speed; matching re-runs automatically on title changes (part switches, SPA navigation)

### ✨ Seamless Integration

No need to switch between interfaces. BiliPace blends into Bilibili's native player controls, keeping everything right where you expect it — no new habits required.

<p align="center">
  <img src="assets/无缝融合.png" alt="Seamless integration" width="80%"/>
</p>

- **Replaces the native speed menu**: hover the speed button (bottom-right of the player) to open the fine-tuning panel in the same place
- **Stays in sync**: listens to `ratechange` and other events, so external changes (e.g. Bilibili hotkeys) and part switches stay in sync
- **Remembers speed**: restores the last speed after a refresh or reload
- **Lightweight & pretty**: rounded translucent glassmorphism panel that matches Bilibili's pink theme; works even when not logged in

### 🚀 More Useful Features

- **One-click presets**: 0.5 / 0.75 / 1.0 / 1.25 / 1.5 / 2.0 / 3.0, editable in settings
- **Flexible configuration**: customize the speed range (0.1x–4.0x), slider step and `+/−` fine-tune step; drag to reorder keyword rules

### 🔓 Fully Open Source

The project is completely open source, with transparent code for a trustworthy experience.

---

## Install

### 🛒 Install from the Web Store (Recommended)

BiliPace is now available on the major extension stores — click below to install in one click:

- **[Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/bilipace-b%E7%AB%99%E5%80%8D%E9%80%9F%E7%AE%A1%E5%AE%B6/fcdfmgpfnbcbbjpopaggakdlfnkhjpbc)**: for Microsoft Edge
- **[Chrome Web Store](https://chromewebstore.google.com/detail/bilipace-b%E7%AB%99%E5%80%8D%E9%80%9F%E7%AE%A1%E5%AE%B6/jladjpcgejlgoifofnonpinadilbdjib)**: for Google Chrome / other Chromium-based browsers

### 🧰 Manual Installation (Developer Mode)

To install from source manually, follow these steps:

1. Download or clone this project to your machine
2. Open `chrome://extensions` (or `edge://extensions`)
3. Enable **Developer mode** (top-right)
4. Click **Load unpacked** and select this project's root folder
5. Open any Bilibili video page and hover the speed button (bottom-right) to use the panel

## Usage

- Hover the speed button to open the panel; drag the slider, type a value, use `+/−`, or tap a preset
- Click the toolbar icon to open **Settings**, where you can configure:

| Setting | Description | Default |
| --- | --- | --- |
| Minimum Speed | Lowest allowed speed | 0.1 |
| Maximum Speed | Highest allowed speed | 4.0 |
| Slider Step | Minimum slider increment | 0.01 |
| Fine-tune Step | `+/−` button increment | 0.05 |
| Preset Speeds | Quick presets at the bottom of the panel (add/remove rows) | 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0 |
| Title Matching | Enable keyword-based speed matching | On |
| Keyword Rules | "keyword + speed" list; drag the handle to reorder (higher = higher priority) | empty |

The **Current Default Speed** card at the top shows the speed the extension has remembered (updated automatically when you change speed on a video page).

All settings are saved via `chrome.storage.sync` and take effect on already-open pages immediately. The settings panel **auto-saves**: values are written as soon as an input loses focus, Enter is pressed in an input, a checkbox/delete/stepper control is used, or a title rule is reordered by drag or keyboard, so there is no need to click "Save Settings"; the button remains as a manual fallback.

## Title Speed Matching

- With "Enable Title Matching" checked, the player reads the page title (`.video-info-title h1.video-title`, using `data-title` or text) and performs **case-insensitive substring matching**; when multiple rules match, the **topmost rule in the list wins** (drag the handle to reorder).
- Add rules manually in Settings (e.g. keyword `operating system` with a speed), or click **Auto Add Current Video** to capture the current title + speed as a rule (updates the rate if the keyword already exists).
- Videos with no matching rule use the remembered speed. Matching re-runs automatically on title changes (part switches, SPA navigation).

## File Structure

```
BiliPlayRateFineTune/
├── manifest.json            # MV3 manifest: permissions, icons, popup, content scripts
├── _locales/                # i18n dictionaries (zh_CN / en)
├── icons/                   # Icon PNGs (used by manifest)
├── assets/                  # README artwork and copy
├── src/
│   ├── content/             # Content scripts (injected in order, sharing window.BPRFT)
│   │   ├── config.js        # Constants, CONFIG, shared state
│   │   ├── utils.js         # i18n, number formatting, DOM query
│   │   ├── video.js         # Video element and playback-rate apply/persist
│   │   ├── ui.js            # In-player panel UI
│   │   ├── title.js         # Title keyword matching
│   │   ├── boost.js         # Hold-→ boost + native hint
│   │   ├── main.js          # Entry: init and settings listeners
│   │   └── content.css      # In-player panel styles
│   └── popup/               # Settings page (ES Modules)
│       ├── popup.html
│       ├── popup.css
│       └── js/              # i18n / config / dom / storage / presets / rules / stepper / panels / autosave
└── tools/                   # Playwright end-to-end tests
    ├── e2e.mjs              # runner: launches the extension and runs every spec
    └── e2e/
        ├── harness.mjs      # shared helpers: browser launch, storage, snapshots
        └── specs/           # specs: popup / core / title / boost / parts / cross-video / persistence
```

## Changelog

### v1.4.0 — 2026-09-22

This release centres on **a more stable speed experience** and **a smoother settings panel**: the hold `→` boost was rebuilt to reuse Bilibili's native hint UI, fullscreen button rendering and the speed reset after switching multi-part episodes were fixed, the content scripts and settings panel were fully modularized, the settings panel gained a “Current Default Speed” card and auto-save, and the e2e suite was reorganized into feature-based specs.

#### ✨ Features & highlights

- **Hold `→` to boost**: the extension now takes over the right-arrow long-press gesture in the capture phase, boosting the speed to **2×** the current rate and reusing the player's native hint styles and lottie chevron animation.
- **Default speed at a glance**: a new “Current Default Speed” card at the top of the settings panel tracks the speed remembered in `chrome.storage.sync`.
- **Auto-save**: values are written as soon as an input loses focus, Enter is pressed, a checkbox/delete/stepper control is used, or a title rule is reordered, so there is no need to click “Save Settings” (the button remains as a manual fallback).
- **Stable speed across episodes**: switching multi-part (分P) episodes or video quality no longer lets the programmatic `ratechange` from `video.load()` overwrite the desired rate.
- **Fullscreen button fix**: preset speed buttons now render correctly in fullscreen.
- **Engineering**: content scripts split into 7 modules, settings page moved to ES Modules, and the e2e suite restructured into a single runner plus feature-based specs with **123** assertions.

#### 📝 Commit details

##### `00ff141` — fix(ui): preset speed buttons render correctly in fullscreen

- `.bprft-chip` now uses flex layout with horizontal/vertical centering, fixing the broken preset speed buttons in fullscreen.

##### `95ce11e` — feat: hold-`→` boost taken over by the extension, reusing the native hint UI

- Intercept the `ArrowRight` long-press gesture in the `window` capture phase and boost the speed to **2×** the current rate.
- Build a `.bpx-player-three-playrate-hint-loop` node using the player's own styles; the left icon recreates the original lottie three-chevron animation (opacity 15%↔80%, 1/6 s phase offset).
- Keep only the current speed item, vertically centered, and drop the semi-transparent neighbours.
- A short press still seeks +5 s; losing focus / hiding the page cancels the boost.
- Fix Bilibili rendering the button as “倍速” instead of a number at 1x.
- Remove the result `MutationObserver` that wrote the temporary boost rate into `desired`/`defaultRate`, and stop `reapply` from listening to `ratechange`, so the boost rate is no longer pinned and written back as the default.
- Switch the manifest to `document_start` so listeners register before Bilibili's scripts.

##### `056d808` — refactor: modularize the project and reorganize the directory structure

- **Directories**: icons → `icons/`, content scripts/styles → `src/content/`, settings page → `src/popup/`.
- Content scripts split into 7 modules (config / utils / video / ui / title / boost / main), injected in manifest order and sharing the `window.BPRFT` namespace.
- Settings page switched to ES Modules, split into i18n / dom / config / storage / presets / rules / stepper / panels.
- Updated asset/script paths in `manifest.json`, `popup.html` and the READMEs.
- Added a popup smoke test to e2e (module loading, i18n, presets, icons, no errors); no behaviour changes.

##### `c5fc240` — fix(video): re-apply speed after switching episodes and overhaul the e2e suite

- **Fix**: speed was lost after switching multi-part (分P) episodes / video quality. Bilibili calls `video.load()`, which per spec resets `playbackRate` to `defaultPlaybackRate` (usually 1) and fires `ratechange`; the extension mistook this programmatic reset for a user action and overwrote the desired rate. It now ignores that `ratechange` during a source switch and re-applies the desired rate, with a `currentSrc` fallback; genuine external speed changes (outside a switch) are still adopted, and the button label stays in sync with the desired value.
- **Tests**: `tools/e2e.mjs` is now the single runner, split by feature into `tools/e2e/specs/` (popup / core controls / title matching / long-press boost / part switch / cross-video tag matching / persistence); added multi-level tag matching and cross-video (non-multipart) regression covering titles containing “歌”, “周杰伦”, or both, plus full page navigation and in-page SPA recommendation switches.
- **Docs**: added the changelog and file-structure notes to the READMEs.

##### `523f986` — feat(popup): show default speed and auto-save on blur/Enter/reorder

- New “Current Default Speed” card at the top of the settings panel, reading and live-tracking `rate` in `chrome.storage.sync`.
- New `autosave` module: saves automatically when an input loses focus, Enter is pressed, a checkbox is toggled, or a stepper/delete action is used — no need to click “Save Settings”.
- Title rules auto-save after drag or keyboard reordering (rules notify via a custom event to avoid a circular dependency with storage).
- Save logic gained snapshot de-duplication and debouncing, cancels pending saves before reset, and does not re-render the DOM on auto-save so ongoing edits are not interrupted.
- Kept the manual “Save Settings” button as a fallback and persist immediately after “Auto-add current video”.
- e2e added assertions for the default-speed display and auto-save on blur / Enter / drag / keyboard reorder (35 popup assertions).

## License

This project is released under the [MIT License](LICENSE): you are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software, provided that the above copyright notice and this permission notice are preserved.

**Copyright (c) 2026 nulearrockstone**

See the [LICENSE](LICENSE) file for the full license text.

---

**BiliPace — Your pace, your control!**
