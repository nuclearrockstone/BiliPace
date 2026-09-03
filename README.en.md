# BiliPace — Bilibili Playback Speed Manager

> A playback speed extension designed specifically for Bilibili, giving you precise control over the pace of every video.

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
- [Technical Notes](#technical-notes)

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

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** and select this project's root folder
4. Open any Bilibili video page and hover the speed button (bottom-right) to use the panel

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

All settings are saved via `chrome.storage.sync` and take effect on already-open pages immediately.

## Title Speed Matching

- With "Enable Title Matching" checked, the player reads the page title (`.video-info-title h1.video-title`, using `data-title` or text) and performs **case-insensitive substring matching**; when multiple rules match, the **topmost rule in the list wins** (drag the handle to reorder).
- Add rules manually in Settings (e.g. keyword `operating system` with a speed), or click **Auto Add Current Video** to capture the current title + speed as a rule (updates the rate if the keyword already exists).
- Videos with no matching rule use the remembered speed. Matching re-runs automatically on title changes (part switches, SPA navigation).

## File Structure

```
BiliPlayRateFineTune/
├── manifest.json         # MV3 manifest: default_locale, permissions, icons, popup, content scripts
├── _locales/
│   ├── zh_CN/messages.json  # Simplified Chinese dictionary
│   └── en/messages.json     # English dictionary
├── content.js            # Core logic: replace speed menu, stepless control, memory, title matching
├── styles.css            # In-player panel styles
├── popup.html            # Settings page (title matching UI)
├── popup.css             # Settings page styles
├── popup.js              # Settings read/write, rule management
├── icon16/32/48/128.png  # Icons (used by manifest)
└── assets/               # README artwork (main poster, speed control, rule matching, seamless integration)
```

## Technical Notes

- The original speed menu is driven by Bilibili's front-end (container `.bpx-player-ctrl-playbackrate`; clicking `li[data-value]` calls the internal `settingStore.setPlaybackRate()`). This extension does **not** depend on Bilibili's internal store; it sets `<video>.playbackRate` directly for stepless control.
- A `MutationObserver` watches the player container and re-injects the panel after part switches or in-page navigation.
- The remembered speed lives in the `rate` key of `chrome.storage.sync`, separate from settings keys to avoid `onChanged` feedback loops.
- Title rules live in `titleRules` / `titleMatchEnabled`; the popup asks the content script for `GET_VIDEO_INFO` via `chrome.tabs.sendMessage`.
- i18n follows Chrome's internationalization best practices: the manifest uses `__MSG_*__` placeholders, and both the popup and content script call `chrome.i18n.getMessage()` directly; message dictionaries live in `_locales/` (`default_locale: zh_CN`).

---

**BiliPace — Your pace, your control!**
