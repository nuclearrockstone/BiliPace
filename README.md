# BiliPace-B站倍速管家 (BiliPace)

> 任意调节 Bilibili 播放倍速,支持按关键词为不同视频匹配不同倍速,无缝融入原生倍速面板 / A browser extension for freely adjusting Bilibili playback speed, with keyword-based speed matching and a seamless native menu integration.

<p align="center">
  <b>中文</b> · <a href="#english">English</a>
</p>

BiliPace-B站倍速管家是一个 Chrome / Edge (Manifest V3) 浏览器扩展,可**任意调节** Bilibili 播放倍速(0.1x ~ 4.0x 无极精确调速),支持**按关键词为不同视频自动匹配不同倍速**,并**无缝融入原生倍速面板**——直接用自定义微调面板替换 B 站原倍速菜单。支持**中英双语界面**,自动跟随浏览器语言,默认简体中文。

---

## 目录 / Table of Contents

- [功能特性](#功能特性)
- [安装](#安装)
- [使用说明](#使用说明)
- [标题倍速匹配](#标题倍速匹配)
- [语言设置](#语言设置)
- [文件结构](#文件结构)
- [技术说明](#技术说明)
- [English](#english)

---

## 功能特性

- **无极调速**:滑块可 0.1x ~ 4.0x 连续调节(默认步进 0.01),范围可在设置中自定义
- **精确输入**:直接在数值框中输入任意倍速(如 `1.37x`)
- **步进微调**:`+/−` 按钮按设定步长微调
- **常用预设**:一键切换 0.5 / 0.75 / 1.0 / 1.25 / 1.5 / 2.0 / 3.0 等常用倍速(可在设置中增删)
- **记忆倍速**:页面刷新或重新加载后自动恢复上次设置的播放速度
- **标题倍速匹配**:根据视频标题关键词自动匹配对应倍速(可在设置中手动添加关键词规则,或一键把当前页面的标题+当前倍速存为规则);未命中规则时按记忆倍速处理
- **保持同步**:监听 `ratechange` 等事件,外部改动(B 站快捷键等)与切换分P后自动同步
- **中英双语**:界面支持简体中文 / English 双语,按 Chrome 官方国际化规范自动跟随浏览器语言(默认中文)
- **美观轻量**:小圆角半透明毛玻璃面板,契合 B 站粉色主题;未登录也可正常调速

## 安装

1. 打开 `chrome://extensions`(Edge 为 `edge://extensions`)
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」,选择本项目根目录
4. 打开任意 B 站视频页面,悬停右下角「倍速」按钮即可使用微调面板

## 使用说明

- **悬停倍速按钮**展开微调面板,拖动滑块、输入数值、点击 `+/−` 或预设均可调节
- **菜单消失有 600ms 延迟**,并带指针容差判断,避免鼠标移动到面板途中菜单提前消失
- 点击工具栏扩展图标打开**设置面板**,可配置:

| 设置项 | 说明 | 默认值 |
| --- | --- | --- |
| 最小速度 | 滑块/输入允许的最小倍速 | 0.1 |
| 最大速度 | 滑块/输入允许的最大倍速 | 4.0 |
| 滑块步进 | 滑块拖动的最小变化量 | 0.01 |
| 微调步长 | `+/−` 按钮每次的变化量 | 0.05 |
| 常用倍速 | 面板底部的快捷预设(可增删行) | 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0 |
| 标题匹配开关 | 是否启用标题关键词匹配倍速 | 开 |
| 标题关键词规则 | 「关键词 + 倍速」列表,标题包含关键词时自动套用该倍速(可拖拽左侧把手调整优先级,越靠上优先级越高) | 空 |

### 标题倍速匹配

- 勾选「启用标题匹配」后,播放器会读取页面标题(`.video-info-title h1.video-title`,取 `data-title` 或文本),按关键词做**不区分大小写的包含匹配**;多条规则命中时取**列表中最靠上的一条**(可通过左侧把手拖拽调整优先级,越靠上优先级越高)。
- 在设置面板中可**手动添加**关键词规则:输入关键词(如 `操作系统`)和对应倍速,保存后即可生效。
- 点击「自动添加当前视频」,扩展会向当前标签页发送消息,读取正在播放视频的标题与当前倍速,自动生成一条规则(同名关键词已存在时仅更新倍速)。
- 未命中任何规则的视频沿用现有逻辑(恢复上次记忆的倍速)。标题切换(如分P切换、SPA 跳转)时自动重新匹配。

### 语言设置

扩展遵循 Chrome 官方国际化最佳实践(`_locales` + `chrome.i18n`):

- **默认地区/语言**:简体中文(`default_locale: zh_CN`)
- 扩展自动跟随浏览器界面语言:浏览器为中文时显示中文,为其他语言时显示英文;未匹配的语言回退到 `zh_CN`
- 无需手动配置语言,设置面板与播放器微调面板文案始终一致

设置通过 `chrome.storage.sync` 保存,修改后会在已打开的页面上即时生效。

## 文件结构

```
BiliPlayRateFineTune/
├── manifest.json         # MV3 清单:default_locale、权限、图标、popup、内容脚本声明
├── _locales/
│   ├── zh_CN/messages.json  # 简体中文字典
│   └── en/messages.json     # English dictionary
├── content.js            # 核心逻辑:替换倍速菜单、无极调速、记忆、标题匹配
├── styles.css            # 播放器微调面板样式
├── popup.html            # 设置面板页面(含标题倍速匹配 UI)
├── popup.css             # 设置面板样式
├── popup.js              # 设置读写逻辑、标题规则管理、i18n 应用
└── icon16/32/48/128.png  # 图标 PNG(manifest 使用)
```

## 技术说明

- 原倍速菜单由 B 站前端控制(容器 `.bpx-player-ctrl-playbackrate`,点击 `li[data-value]` 调用内部 `settingStore.setPlaybackRate()`)。本扩展**不依赖** B 站内部 store,而是直接设置 `<video>.playbackRate` 实现无极调速。
- 通过 `MutationObserver` 监听播放器容器,切换分P、页面内跳转后自动重新注入面板。
- 倍速记忆存储在 `chrome.storage.sync` 的 `rate` 字段,与设置键分离,避免 `onChanged` 触发设置刷新造成循环。
- 标题规则存储在 `chrome.storage.sync` 的 `titleRules` / `titleMatchEnabled` 字段;popup 通过 `chrome.tabs.sendMessage` 向内容脚本请求 `GET_VIDEO_INFO` 获取当前标题与倍速。
- 国际化:遵循 Chrome 国际化最佳实践——manifest 使用 `__MSG_*__` 占位符,popup 与 content script 直接调用 `chrome.i18n.getMessage()`;`default_locale: zh_CN` 保证中文为默认回退语言。

---

## English

**BiliPace** is a Chrome / Edge (Manifest V3) browser extension that lets you **freely adjust** Bilibili playback speed (stepless 0.1x–4.0x), **auto-matches different speeds for different videos by keyword**, and **blends seamlessly into the native speed menu**. The UI is fully **bilingual (Simplified Chinese / English)**, following the browser language with Simplified Chinese as the default.

### Features

- **Stepless speed**: continuously adjustable from 0.1x to 4.0x (default step 0.01), range configurable in settings
- **Exact input**: type any speed (e.g. `1.37x`) directly into the number field
- **Fine-tune buttons**: `+/−` adjusts by a configurable step
- **Preset speeds**: one-click 0.5 / 0.75 / 1.0 / 1.25 / 1.5 / 2.0 / 3.0 (editable in settings)
- **Remembers speed**: restores the last speed after refresh or reload
- **Title-based speed matching**: auto-apply a speed when the video title contains a keyword (rules are editable, or add the current video with one click); falls back to the remembered speed when no rule matches
- **Keeps in sync**: listens to `ratechange` and other events, so external changes (e.g. Bilibili hotkeys) and part switches stay in sync
- **Bilingual UI**: Simplified Chinese / English, following Chrome's official i18n best practices; automatically follows the browser language (default Chinese)
- **Lightweight & pretty**: rounded translucent glassmorphism panel that matches Bilibili's pink theme; works even when not logged in

### Install

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** and select this project's root folder
4. Open any Bilibili video page and hover the speed button (bottom-right) to use the panel

### Usage

- Hover the speed button to open the panel; drag the slider, type a value, use `+/−`, or tap a preset
- The menu hides after a **600ms delay** with pointer tolerance, so it won't vanish while you move toward it
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

### Title Speed Matching

- With "Enable Title Matching" checked, the player reads the page title (`.video-info-title h1.video-title`, using `data-title` or text) and performs **case-insensitive substring matching**; when multiple rules match, the **topmost rule in the list wins** (drag the handle to reorder).
- Add rules manually in Settings (e.g. keyword `operating system` with a speed), or click **Auto Add Current Video** to capture the current title + speed as a rule (updates the rate if the keyword already exists).
- Videos with no matching rule use the remembered speed. Matching re-runs automatically on title changes (part switches, SPA navigation).

### Language

Built on Chrome's official i18n best practices (`_locales` + `chrome.i18n`):

- **Default locale: `zh_CN`** (Simplified Chinese)
- The extension automatically follows the browser's UI language: Chinese browsers get Chinese, others get English; unmatched locales fall back to `zh_CN`
- No manual configuration needed — the popup and the in-player panel always stay consistent

All settings are saved via `chrome.storage.sync` and take effect on already-open pages immediately.

### File Structure

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
├── popup.js              # Settings read/write, rule management, i18n application
└── icon16/32/48/128.png  # Icons (used by manifest)
```

### Technical Notes

- The original speed menu is driven by Bilibili's front-end (container `.bpx-player-ctrl-playbackrate`; clicking `li[data-value]` calls the internal `settingStore.setPlaybackRate()`). This extension does **not** depend on Bilibili's internal store; it sets `<video>.playbackRate` directly for stepless control.
- A `MutationObserver` watches the player container and re-injects the panel after part switches or in-page navigation.
- The remembered speed lives in the `rate` key of `chrome.storage.sync`, separate from settings keys to avoid `onChanged` feedback loops.
- Title rules live in `titleRules` / `titleMatchEnabled`; the popup asks the content script for `GET_VIDEO_INFO` via `chrome.tabs.sendMessage`.
- i18n: follows Chrome's internationalization best practices — the manifest uses `__MSG_*__` placeholders, and both the popup and content script call `chrome.i18n.getMessage()` directly; `default_locale: zh_CN` keeps Chinese as the fallback language.
