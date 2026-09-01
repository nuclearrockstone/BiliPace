(() => {
  'use strict';

  const DEFAULT_SETTINGS = {
    min: 0.1,
    max: 4,
    step: 0.01,
    fineStep: 0.05,
    presets: [0.5, 0.75, 1, 1.25, 1.5, 2, 3]
  };

  const CONFIG = {
    ...DEFAULT_SETTINGS,
    hideDelay: 600,
    containerSel: '.bpx-player-ctrl-playbackrate',
    menuSel: '.bpx-player-ctrl-playbackrate-menu',
    resultSel: '.bpx-player-ctrl-playbackrate-result',
    unloginSel: '.bpx-player-ctrl-playbackrate-unlogin',
    unloginStateCls: 'bpx-player-ctrl-playbackrate-unlogin-state',
    titleSel: '.video-info-title h1.video-title'
  };

  const REAPPLY_EVENTS = ['loadedmetadata', 'loadeddata', 'canplay', 'play', 'seeked', 'durationchange', 'ratechange'];

  const state = {
    injected: false,
    video: null,
    desired: 1,
    defaultRate: 1,
    refs: null,
    title: '',
    titleRules: [],
    titleMatchEnabled: true
  };

  let closeTimer = null;
  let lastPointer = { x: -1, y: -1 };

  const clamp = v => Math.min(CONFIG.max, Math.max(CONFIG.min, v));
  const round2 = v => Math.round((+v || 0) * 100) / 100;
  const fmtFull = v => round2(v).toFixed(2) + 'x';
  const fmtShort = v => {
    const r = round2(v);
    return Number.isInteger(r) ? r.toFixed(1) + 'x' : r + 'x';
  };

  function q(sel, root) {
    return (root || document).querySelector(sel);
  }

  function getVideo() {
    const refs = state.refs;
    if (refs && refs.container) {
      const wrap = refs.container.closest('.bpx-player-video-wrap, .bpx-player-container, #bilibiliPlayer');
      if (wrap) {
        const v = q('video', wrap);
        if (v) return v;
      }
    }
    const player = q('#bilibiliPlayer') || q('.bpx-player-container');
    if (player) {
      const v = q('video', player);
      if (v) return v;
    }
    return q('video');
  }

  function setResult(r) {
    if (state.refs && state.refs.result) state.refs.result.textContent = fmtShort(r);
  }

  function apply(value, opts) {
    const r = round2(clamp(value));
    if (!isFinite(r)) return;
    state.desired = r;
    const v = getVideo();
    if (v) {
      try { v.playbackRate = r; } catch (e) {}
    }
    syncUI(r);
    setResult(r);
    if (!opts || opts.persist !== false) {
      state.defaultRate = r;
      persistRate(r);
    }
  }

  function getVideoTitle() {
    const el = q(CONFIG.titleSel);
    if (el) {
      const t = (el.getAttribute('data-title') || el.textContent || '').trim();
      if (t) return t;
    }
    const fallback = (document.title || '')
      .replace(/_+哔哩哔哩_+bilibili.*$/i, '')
      .trim();
    return fallback || '';
  }

  function matchRule(title) {
    if (!state.titleMatchEnabled || !title) return null;
    const t = title.toLowerCase();
    // 按列表顺序匹配：越靠前的规则优先级越高，命中即返回
    for (const rule of state.titleRules) {
      const kw = String(rule.keyword || '').trim().toLowerCase();
      if (!kw || !t.includes(kw)) continue;
      return rule;
    }
    return null;
  }

  function applyTitleRule(force) {
    const title = getVideoTitle();
    if (!title) return;
    if (!force && title === state.title) return;
    const titleChanged = title !== state.title;
    state.title = title;
    const rule = matchRule(title);
    if (rule) {
      apply(rule.rate, { persist: false });
    } else if (titleChanged || force) {
      apply(state.defaultRate, { persist: false });
    }
  }

  let rateSaveTimer = null;
  function persistRate(r) {
    if (rateSaveTimer) clearTimeout(rateSaveTimer);
    rateSaveTimer = setTimeout(() => {
      rateSaveTimer = null;
      try { chrome.storage.sync.set({ rate: r }); } catch (e) {}
    }, 300);
  }

  function syncUI(r) {
    const refs = state.refs;
    if (!refs) return;
    refs.value.textContent = fmtFull(r);
    refs.slider.value = r;
    refs.input.value = r;
    const pct = ((r - CONFIG.min) / (CONFIG.max - CONFIG.min)) * 100;
    refs.slider.style.setProperty('--fill', pct + '%');
    refs.presets.forEach(btn => {
      btn.classList.toggle('is-active', Math.abs(+btn.dataset.value - r) < 1e-4);
    });
  }

  function reapply() {
    const v = getVideo();
    if (v && Math.abs(v.playbackRate - state.desired) > 1e-3) {
      try { v.playbackRate = state.desired; } catch (e) {}
    }
  }

  function onRateChange() {
    const v = getVideo();
    if (!v) return;
    const r = round2(v.playbackRate);
    if (Math.abs(r - state.desired) > 1e-3) {
      state.desired = r;
      syncUI(r);
      setResult(r);
    }
  }

  function watchVideo() {
    const v = getVideo();
    if (!v || v === state.video) return;
    if (state.video) {
      REAPPLY_EVENTS.forEach(ev => state.video.removeEventListener(ev, reapply));
      state.video.removeEventListener('ratechange', onRateChange);
    }
    state.video = v;
    REAPPLY_EVENTS.forEach(ev => v.addEventListener(ev, reapply));
    v.addEventListener('ratechange', onRateChange);
  }

  function clearCloseTimer() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  }

  function open() {
    clearCloseTimer();
    if (state.refs) state.refs.menu.classList.add('is-open');
  }

  function close() {
    clearCloseTimer();
    if (state.refs) state.refs.menu.classList.remove('is-open');
  }

  function requestClose() {
    clearCloseTimer();
    closeTimer = setTimeout(() => {
      closeTimer = null;
      if (pointerInsideMenu()) return;
      close();
    }, CONFIG.hideDelay);
  }

  function pointerInsideMenu() {
    const refs = state.refs;
    if (!refs) return false;
    const pad = 16;
    for (const el of [refs.container, refs.menu]) {
      if (!el || !el.isConnected) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (lastPointer.x >= r.left - pad && lastPointer.x <= r.right + pad &&
          lastPointer.y >= r.top - pad && lastPointer.y <= r.bottom + pad) return true;
    }
    return false;
  }

  function buildMenu(container) {
    const old = q(CONFIG.menuSel, container);
    if (old) old.remove();
    const unlogin = q(CONFIG.unloginSel, container);
    if (unlogin) unlogin.remove();
    container.classList.remove(CONFIG.unloginStateCls);

    const menu = document.createElement('div');
    menu.className = 'bprft-menu';

    const display = document.createElement('div');
    display.className = 'bprft-display';
    const value = document.createElement('div');
    value.className = 'bprft-value';
    const label = document.createElement('div');
    label.className = 'bprft-label';
    label.textContent = '播放速度';
    display.append(value, label);

    const slider = document.createElement('input');
    slider.className = 'bprft-slider';
    slider.type = 'range';
    slider.min = CONFIG.min;
    slider.max = CONFIG.max;
    slider.step = CONFIG.step;
    slider.setAttribute('aria-label', '播放速度');

    const row = document.createElement('div');
    row.className = 'bprft-row';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'bprft-btn';
    minus.textContent = '−';
    minus.setAttribute('aria-label', '降低速度');
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'bprft-input';
    input.min = CONFIG.min;
    input.max = CONFIG.max;
    input.step = CONFIG.step;
    input.setAttribute('aria-label', '自定义倍速');
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'bprft-btn';
    plus.textContent = '+';
    plus.setAttribute('aria-label', '提高速度');
    row.append(minus, input, plus);

    const presetsWrap = document.createElement('div');
    presetsWrap.className = 'bprft-presets';

    menu.append(display, slider, row, presetsWrap);
    container.appendChild(menu);
    container.style.position = container.style.position || 'relative';

    state.refs = {
      container,
      menu,
      value,
      slider,
      input,
      minus,
      plus,
      presetsWrap,
      presets: [],
      result: q(CONFIG.resultSel, container)
    };

    slider.addEventListener('input', () => apply(slider.value));
    input.addEventListener('change', () => apply(input.value));
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      if (!isNaN(v)) value.textContent = fmtFull(clamp(v));
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
    minus.addEventListener('click', () => apply(round2(state.desired - CONFIG.fineStep)));
    plus.addEventListener('click', () => apply(round2(state.desired + CONFIG.fineStep)));

    if (!container.__bprftBound) {
      container.__bprftBound = true;
      container.addEventListener('mouseenter', open);
      container.addEventListener('mouseleave', requestClose);
      menu.addEventListener('mouseenter', open);
      menu.addEventListener('mouseleave', requestClose);
      container.addEventListener('focusin', open);
      container.addEventListener('focusout', requestClose);
    }

    if (state.refs.result) {
      new MutationObserver(() => {
        const refs = state.refs;
        if (!refs) return;
        const m = refs.result.textContent.match(/(\d+(?:\.\d+)?)\s*x?/i);
        if (!m) return;
        const r = round2(parseFloat(m[1]));
        if (Math.abs(r - state.desired) > 1e-3) {
          state.desired = r;
          state.defaultRate = r;
          syncUI(r);
        }
      }).observe(state.refs.result, { childList: true, characterData: true, subtree: true });
    }
  }

  function renderPresets() {
    const refs = state.refs;
    if (!refs) return;
    refs.presetsWrap.innerHTML = '';
    refs.presets = [];
    CONFIG.presets.forEach(p => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bprft-chip';
      b.dataset.value = p;
      b.textContent = fmtShort(p);
      b.addEventListener('click', () => apply(p));
      refs.presetsWrap.appendChild(b);
      refs.presets.push(b);
    });
    syncUI(state.desired);
  }

  function applySettings() {
    const refs = state.refs;
    if (refs) {
      refs.slider.min = CONFIG.min;
      refs.slider.max = CONFIG.max;
      refs.slider.step = CONFIG.step;
      refs.input.min = CONFIG.min;
      refs.input.max = CONFIG.max;
      refs.input.step = CONFIG.step;
    }
    const desired = clamp(state.desired);
    if (desired !== state.desired) {
      state.desired = desired;
      const v = getVideo();
      if (v) {
        try { v.playbackRate = desired; } catch (e) {}
      }
    }
    if (refs) renderPresets();
    syncUI(state.desired);
    setResult(state.desired);
  }

  function init() {
    const container = q(CONFIG.containerSel);
    if (!container) return;
    state.injected = true;
    const v = getVideo();
    const r = v ? round2(v.playbackRate || 1) : 1;
    state.desired = r;
    buildMenu(container);
    renderPresets();
    syncUI(r);
    setResult(r);
    watchVideo();
    chrome.storage.sync.get({ rate: null }, data => {
      if (data.rate != null) {
        state.defaultRate = clamp(data.rate);
        apply(state.defaultRate, { persist: false });
      }
      applyTitleRule(true);
    });
  }

  function start() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
      return;
    }
    document.addEventListener('mousemove', e => {
      lastPointer.x = e.clientX;
      lastPointer.y = e.clientY;
    }, { passive: true });
    chrome.storage.sync.get(DEFAULT_SETTINGS, data => {
      Object.assign(CONFIG, data);
      applySettings();
      if (!state.injected && q(CONFIG.containerSel)) init();
    });
    chrome.storage.sync.get({ titleRules: [], titleMatchEnabled: true }, data => {
      state.titleRules = Array.isArray(data.titleRules) ? data.titleRules : [];
      state.titleMatchEnabled = data.titleMatchEnabled !== false;
      applyTitleRule(true);
    });
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg && msg.type === 'GET_VIDEO_INFO') {
        sendResponse({ title: getVideoTitle(), rate: state.desired });
      }
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      if (changes.titleRules) {
        state.titleRules = Array.isArray(changes.titleRules.newValue) ? changes.titleRules.newValue : [];
        applyTitleRule(true);
      }
      if (changes.titleMatchEnabled) {
        state.titleMatchEnabled = !!changes.titleMatchEnabled.newValue;
        applyTitleRule(true);
      }
      let dirty = false;
      Object.keys(DEFAULT_SETTINGS).forEach(k => {
        if (changes[k]) {
          CONFIG[k] = changes[k].newValue;
          dirty = true;
        }
      });
      if (dirty) applySettings();
    });
    if (q(CONFIG.containerSel)) init();
    new MutationObserver(() => {
      if (!state.refs || !document.contains(state.refs.menu)) {
        state.injected = false;
        if (q(CONFIG.containerSel)) init();
      }
    }).observe(document.body, { childList: true, subtree: true });
    setInterval(() => { watchVideo(); applyTitleRule(); }, 1500);
  }

  start();
})();
