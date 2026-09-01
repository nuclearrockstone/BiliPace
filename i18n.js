/**
 * BiliPace-B站倍速管家 - 中英双语国际化核心
 *
 * - 默认语言/地区:zh_CN(与 manifest 的 default_locale 一致)
 * - 语言解析优先级:用户手动选择(uiLanguage) > 浏览器界面语言 > 默认中文
 * - 在 popup 中调用 applyToPage() 将 data-i18n 等属性翻译为对应语言
 * - 在 content script 中仅调用 init()(不触碰页面 DOM),通过 t() 获取文案
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'uiLanguage'; // 'auto' | 'zh' | 'en'

  const state = {
    lang: 'auto',
    dict: null,
    ready: false
  };

  async function loadDict(lang) {
    try {
      const resp = await fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`));
      if (!resp.ok) return null;
      return await resp.json();
    } catch (e) {
      return null;
    }
  }

  /** 解析当前实际语言:'zh' | 'en'(跟随浏览器时回退中文) */
  function currentLang() {
    if (state.lang === 'zh' || state.lang === 'en') return state.lang;
    try {
      const ui = (chrome.i18n.getUILanguage() || 'zh-CN').toLowerCase();
      return ui.indexOf('zh') === 0 ? 'zh' : 'en';
    } catch (e) {
      return 'zh';
    }
  }

  /** 取翻译文案;subs 为 $1/$2 位置参数数组 */
  function t(key, subs) {
    let msg = null;
    if (state.dict && state.dict[key] && state.dict[key].message) {
      msg = state.dict[key].message;
    } else {
      try {
        msg = chrome.i18n.getMessage(key);
      } catch (e) {
        msg = null;
      }
      if (!msg) msg = (state.dict && state.dict[key] && state.dict[key].message) || key;
    }
    if (subs && subs.length) {
      msg = String(msg).replace(/\$(\d+)/g, (m, i) => (subs[+i - 1] != null ? subs[+i - 1] : m));
    }
    return String(msg);
  }

  /** 初始化:读取语言偏好并(如非 auto)加载对应字典 */
  async function init() {
    try {
      const data = await new Promise(resolve => {
        chrome.storage.sync.get({ [STORAGE_KEY]: 'auto' }, resolve);
      });
      state.lang = data[STORAGE_KEY] === 'zh' || data[STORAGE_KEY] === 'en' ? data[STORAGE_KEY] : 'auto';
      if (state.lang !== 'auto') {
        state.dict = await loadDict(state.lang);
        if (!state.dict) state.lang = 'auto';
      }
    } catch (e) {
      state.lang = 'auto';
    }
    state.ready = true;
    return state.lang;
  }

  /** 将语言偏好写入存储并刷新当前页面(popup 语言切换) */
  async function setLang(lang) {
    lang = lang === 'zh' || lang === 'en' ? lang : 'auto';
    try {
      await new Promise(resolve => chrome.storage.sync.set({ [STORAGE_KEY]: lang }, resolve));
    } catch (e) {}
    if (typeof location !== 'undefined') location.reload();
  }

  /** popup 专用:将 data-i18n 属性翻译后写入 DOM */
  function applyToPage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });
    const title = t('appTitle');
    if (title) document.title = title;

    // 语言选择器
    const sel = document.getElementById('langSelect');
    if (sel) {
      sel.value = state.lang;
      sel.addEventListener('change', () => setLang(sel.value));
    }
  }

  window.BPRFT_I18N = { STORAGE_KEY, t, init, setLang, applyToPage, currentLang };
})();
