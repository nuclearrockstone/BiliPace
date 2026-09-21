/** 入口：初始化菜单、监听设置变化、引导启动。 */
(() => {
  'use strict';

  const NS = (window.BPRFT = window.BPRFT || {});
  const { CONFIG, state } = NS;

  function init() {
    const container = NS.q(CONFIG.containerSel);
    if (!container) return;
    state.injected = true;
    const v = NS.getVideo();
    const r = v ? NS.round2(v.playbackRate || 1) : 1;
    state.desired = r;
    NS.buildMenu(container);
    NS.renderPresets();
    NS.syncUI(r);
    NS.setResult(r);
    NS.watchVideo();
    chrome.storage.sync.get({ rate: null }, data => {
      if (data.rate != null) {
        state.defaultRate = NS.clamp(data.rate);
        NS.apply(state.defaultRate, { persist: false });
      }
      NS.applyTitleRule(true);
    });
  }

  function start() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
      return;
    }

    chrome.storage.sync.get(NS.DEFAULT_SETTINGS, data => {
      Object.assign(CONFIG, data);
      NS.applySettings();
      if (!state.injected && NS.q(CONFIG.containerSel)) init();
    });
    chrome.storage.sync.get({ titleRules: [], titleMatchEnabled: true }, data => {
      state.titleRules = Array.isArray(data.titleRules) ? data.titleRules : [];
      state.titleMatchEnabled = data.titleMatchEnabled !== false;
      NS.applyTitleRule(true);
    });
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg && msg.type === 'GET_VIDEO_INFO') {
        sendResponse({ title: NS.getVideoTitle(), rate: state.desired });
      }
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      if (changes.titleRules) {
        state.titleRules = Array.isArray(changes.titleRules.newValue) ? changes.titleRules.newValue : [];
        NS.applyTitleRule(true);
      }
      if (changes.titleMatchEnabled) {
        state.titleMatchEnabled = !!changes.titleMatchEnabled.newValue;
        NS.applyTitleRule(true);
      }
      let dirty = false;
      Object.keys(NS.DEFAULT_SETTINGS).forEach(k => {
        if (changes[k]) {
          CONFIG[k] = changes[k].newValue;
          dirty = true;
        }
      });
      if (dirty) NS.applySettings();
    });

    if (NS.q(CONFIG.containerSel)) init();

    new MutationObserver(() => {
      if (!state.refs || !document.contains(state.refs.menu)) {
        state.injected = false;
        if (NS.q(CONFIG.containerSel)) init();
      }
    }).observe(document.body, { childList: true, subtree: true });

    setInterval(() => { NS.watchVideo(); NS.applyTitleRule(); }, 1500);
  }

  // 在 document_start 阶段立即注册长按加速监听，确保早于 B 站脚本，
  // 从而能在捕获阶段抢占原生长按逻辑；其余依赖 DOM 的逻辑由 start() 延迟执行。
  NS.bindBoostHotkeys();
  start();
})();
