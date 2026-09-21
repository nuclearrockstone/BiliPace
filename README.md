<p align="center">
  <img src="icon128.png" alt="BiliPace-B站倍速管家 图标" width="110"/>
</p>

<h1 align="center">BiliPace-B站倍速管家</h1>

<p align="center">
  <a href="https://microsoftedge.microsoft.com/addons/detail/bilipace-b%E7%AB%99%E5%80%8D%E9%80%9F%E7%AE%A1%E5%AE%B6/fcdfmgpfnbcbbjpopaggakdlfnkhjpbc"><img alt="Edge 扩展商店 - 一键安装" src="https://img.shields.io/badge/Edge%E6%89%A9%E5%B1%95%E5%95%86%E5%BA%97-%E4%B8%80%E9%94%AE%E5%AE%89%E8%A3%85-0078D7"/></a>
  <a href="https://chromewebstore.google.com/detail/bilipace-b%E7%AB%99%E5%80%8D%E9%80%9F%E7%AE%A1%E5%AE%B6/jladjpcgejlgoifofnonpinadilbdjib"><img alt="Chrome 应用商店 - 一键安装" src="https://img.shields.io/badge/Chrome%E5%BA%94%E7%94%A8%E5%95%86%E5%BA%97-%E4%B8%80%E9%94%AE%E5%AE%89%E8%A3%85-4285F4?logo=googlechrome&logoColor=white"/></a>
</p>

<p align="center"><em>专为 Bilibili 设计的无极调速扩展,让每个视频的播放节奏都尽在掌握。</em></p>

<p align="center">
  <b>简体中文</b> · <a href="./README.en.md">English</a>
</p>

<p align="center">
  <img src="assets/主海报.png" alt="BiliPace-B站倍速管家 主海报" width="100%"/>
</p>

BiliPace-B站倍速管家是一个 Chrome / Edge (Manifest V3) 浏览器扩展,专为 Bilibili 打造:**无极调速**,想多快就多快;**规则匹配**,让每个视频都有自己的速度;**无缝融合**,一样的位置,一样的味道。直接在播放器上完成所有操作,无需跳转、无需来回切换——你的节奏,你来掌握!

---

## 目录

- [功能特性](#功能特性)
- [安装](#安装)
- [使用说明](#使用说明)
- [标题倍速匹配](#标题倍速匹配)
- [文件结构](#文件结构)
- [许可证](#许可证)

---

## 功能特性

### ⚡ 无极调速

1.5 倍嫌慢?2.0 倍太快?无极调速,想多快就多快!支持拖动滑块、输入精确数值或点击加减按钮等多种方式灵活调整倍速,随心所欲,自在掌控。

<p align="center">
  <img src="assets/无极调速.png" alt="无极调速" width="80%"/>
</p>

- **滑块连续调节**:无极精确调速(默认步进 0.01),倍速范围可在设置中自定义
- **精确输入**:直接在数值框中输入任意倍速(如 `1.37x`)
- **步进微调**:`+/−` 按钮按设定步长微调

### 🎯 规则匹配

学习想快?听歌要慢?规则匹配,让每个视频都有自己的速度!为包含不同关键词的视频设置不同倍速,例如「教程」2 倍速、「歌曲」1 倍速,根据内容自动匹配,无缝切换。

<p align="center">
  <img src="assets/规则匹配.png" alt="规则匹配" width="80%"/>
</p>

- **标题关键词匹配**:视频标题包含关键词时自动套用对应倍速;可在设置中手动添加规则,或一键把当前页面的标题 + 当前倍速存为规则
- **优先级可控**:多条规则命中时取列表中最靠上的一条,拖拽左侧把手即可调整优先级
- **智能回退**:未命中任何规则的视频沿用上次记忆的倍速;标题切换(分P、页面跳转)时自动重新匹配

### ✨ 无缝融合

不想来回切换?无缝融合,一样的位置,一样的味道。扩展无缝融入 Bilibili 播放器原有控制面板,操作习惯无需改变,丝滑一体,浑然天成。

<p align="center">
  <img src="assets/无缝融合.png" alt="无缝融合" width="80%"/>
</p>

- **替换原生倍速菜单**:悬停播放器右下角「倍速」按钮即可使用自定义微调面板,入口位置与操作习惯保持不变
- **保持同步**:监听 `ratechange` 等事件,外部改动(B 站快捷键等)与切换分P后自动同步
- **记忆倍速**:页面刷新或重新加载后自动恢复上次设置的播放速度
- **美观轻量**:小圆角半透明毛玻璃面板,契合 B 站粉色主题;未登录也可正常调速

### 🚀 更多实用功能

- **常用倍速一键切换**:0.5 / 0.75 / 1.0 / 1.25 / 1.5 / 2.0 / 3.0,可在设置中增删
- **灵活配置**:自定义倍速范围(0.1x ~ 4.0x)、滑块步进与 `+/−` 微调步长,拖拽调整关键词优先级

### 🔓 完全开源

项目完全开源,代码透明,放心使用。

---

## 安装

### 🛒 应用商店安装(推荐)

BiliPace 现已上架主流浏览器扩展商店,点击下方链接即可一键安装:

- **[Edge 扩展商店](https://microsoftedge.microsoft.com/addons/detail/bilipace-b%E7%AB%99%E5%80%8D%E9%80%9F%E7%AE%A1%E5%AE%B6/fcdfmgpfnbcbbjpopaggakdlfnkhjpbc)**:适用于 Microsoft Edge
- **[Chrome 应用商店](https://chromewebstore.google.com/detail/bilipace-b%E7%AB%99%E5%80%8D%E9%80%9F%E7%AE%A1%E5%AE%B6/jladjpcgejlgoifofnonpinadilbdjib)**:适用于 Google Chrome / 其他 Chromium 系浏览器

### 🧰 手动安装(开发者模式)

如需从源码手动安装,请按以下步骤操作:

1. 下载或克隆本项目到本地
2. 打开 `chrome://extensions`(Edge 为 `edge://extensions`)
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」,选择本项目根目录
5. 打开任意 B 站视频页面,悬停右下角「倍速」按钮即可使用微调面板

## 使用说明

- **悬停倍速按钮**展开微调面板,拖动滑块、输入数值、点击 `+/−` 或预设均可调节
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

所有设置通过 `chrome.storage.sync` 保存,修改后会在已打开的页面上即时生效。

## 标题倍速匹配

- 勾选「启用标题匹配」后,播放器会读取页面标题(`.video-info-title h1.video-title`,取 `data-title` 或文本),按关键词做**不区分大小写的包含匹配**;多条规则命中时取**列表中最靠上的一条**(可通过左侧把手拖拽调整优先级,越靠上优先级越高)。
- 在设置面板中可**手动添加**关键词规则:输入关键词(如「操作系统」)和对应倍速,保存后即可生效。
- 点击「自动添加当前视频」,扩展会向当前标签页发送消息,读取正在播放视频的标题与当前倍速,自动生成一条规则(同名关键词已存在时仅更新倍速)。
- 未命中任何规则的视频沿用现有逻辑(恢复上次记忆的倍速)。标题切换(如分P切换、SPA 跳转)时自动重新匹配。

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
├── popup.js              # 设置读写逻辑、标题规则管理
├── icon16/32/48/128.png  # 图标 PNG(manifest 使用)
└── assets/               # README 宣传图(主海报、无极调速、规则匹配、无缝融合)
```

## 许可证

本项目基于 [MIT License](LICENSE) 开源发布:你可以自由地使用、复制、修改、合并、发布、分发、再许可及/或销售本软件的副本,唯一的条件是必须保留上述版权声明与本许可声明。

**Copyright (c) 2026 nulearrockstone**

完整许可条款见 [LICENSE](LICENSE) 文件。

---

**BiliPace,你的节奏,你来掌握!**
