(() => {
  'use strict';

  const t = (k, subs) => chrome.i18n.getMessage(k, subs) || k;

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
    titleSel: '.video-info-title h1.video-title',
    videoAreaSel: '.bpx-player-video-area',
    boostFactor: 2
  };

  const LONG_PRESS_DELAY = 300; // 与 B 站原生一致的长按阈值(ms)
  const SEEK_STEP = 5;          // 短按 → 快进 5 秒，保留原生行为

  // 与 B 站 lottie 动画一致的三段箭头：每段 opacity 在 15%~80% 间脉动、
  // 依次相差 1/6 秒，形成从左向右“滚动”的动态效果
  const HINT_CHEVRON = 'M6.138 3.546C6.468 4.106 6.278 4.826 5.718 5.156C5.538 5.266 5.338 5.326 5.118 5.326L-5.122 5.326C-5.772 5.326-6.302 4.796-6.302 4.146C-6.302 3.936-6.242 3.726-6.142 3.546L-1.352-4.554C-0.912-5.294 0.048-5.544 0.798-5.104C1.028-4.974 1.218-4.784 1.348-4.554Z';
  const chevronGroup = (x, delay) =>
    '<g transform="matrix(0,3,-3,0,' + x + ',32.5)" opacity="0.15">' +
    '<animate attributeName="opacity" values="0.15;0.8;0.15" keyTimes="0;0.5;1"' +
    ' dur="1s" begin="' + delay + 's" repeatCount="indefinite" calcMode="spline"' +
    ' keySplines="0.167 0.167 0.833 0.833;0.167 0.167 0.833 0.833"/>' +
    '<path d="' + HINT_CHEVRON + '"/></g>';
  const HINT_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 111 66" width="111" height="66"' +
    ' preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%"><g fill="#fff">' +
    chevronGroup(16.5, 0) + chevronGroup(55.5, 0.167) + chevronGroup(94.5, 0.333) +
    '</g></svg>';

  // 注意：不能把 'ratechange' 放进 reapply 事件，否则会和 B 站原生的
  // 长按倍速互相覆盖（详见 hijack 逻辑）。
  const REAPPLY_EVENTS = ['loadedmetadata', 'loadeddata', 'canplay', 'play', 'seeked', 'durationchange'];

  const state = {
    injected: false,
    video: null,
    desired: 1,
    defaultRate: 1,
    refs: null,
    title: '',
    titleRules: [],
    titleMatchEnabled: true,
    boosting: false,
    boostBase: 1,
    pressing: false,
    longPress: false,
    pressTimer: null,
    hintNode: null
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

  // B 站在倍速为 1 时会把按钮文字渲染成“倍速”而不是数值，
  // 这里在非长按状态下把它纠正回扩展的数值展示（只改文字，不碰任何状态）。
  function guardResult() {
    const result = state.refs && state.refs.result;
    if (!result || result.__bprftGuard) return;
    result.__bprftGuard = true;
    new MutationObserver(() => {
      if (state.boosting) return;
      const want = fmtShort(state.desired);
      const cur = (result.textContent || '').trim();
      if (cur !== want && !/[\d.]/.test(cur)) result.textContent = want;
    }).observe(result, { childList: true, characterData: true, subtree: true });
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
    if (state.boosting) return;
    const v = getVideo();
    if (v && Math.abs(v.playbackRate - state.desired) > 1e-3) {
      try { v.playbackRate = state.desired; } catch (e) {}
    }
  }

  function onRateChange() {
    // 长按加速期间倍速由扩展临时接管，不视为新的期望倍速
    if (state.boosting) return;
    const v = getVideo();
    if (!v) return;
    const r = round2(v.playbackRate);
    if (Math.abs(r - state.desired) > 1e-3) {
      state.desired = r;
      syncUI(r);
      setResult(r);
    }
  }

  // ---- 长按右方向键加速：劫持 B 站原生长按手势，由扩展实现并复用原生提示 UI ----
  function boostRate() {
    return round2(clamp(state.desired * CONFIG.boostFactor));
  }

  function isTypingTarget(el) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  function videoArea() {
    const refs = state.refs;
    if (refs && refs.container) {
      const wrap = refs.container.closest('.bpx-player-video-wrap, .bpx-player-container, #bilibiliPlayer');
      if (wrap) return q(CONFIG.videoAreaSel, wrap) || wrap;
    }
    return q(CONFIG.videoAreaSel) || q('.bpx-player-video-wrap');
  }

  function ensureHint() {
    if (state.hintNode && state.hintNode.isConnected) return state.hintNode;
    const area = videoArea();
    if (!area) return null;
    const hint = document.createElement('div');
    hint.className = 'bpx-player-three-playrate-hint bpx-player-three-playrate-hint-loop';
    hint.innerHTML =
      '<span class="bpx-player-three-playrate-hint-icon">' + HINT_ICON + '</span>' +
      '<span class="bpx-player-three-playrate-hint-label">' + t('speedPlaybackActive') + '</span>' +
      '<span class="bpx-player-three-playrate-hint-carousel" aria-hidden="true">' +
      '<span class="bpx-player-three-playrate-hint-carousel-list"></span>' +
      '</span>';
    area.appendChild(hint);
    state.hintNode = hint;
    return hint;
  }

  function showHint(rate) {
    const hint = ensureHint();
    if (!hint) return;
    const label = fmtShort(rate).replace(/\.0(?=x)/, '').toUpperCase();
    const carousel = hint.querySelector('.bpx-player-three-playrate-hint-carousel');
    const list = hint.querySelector('.bpx-player-three-playrate-hint-carousel-list');
    // 只保留当前倍速一项，去掉原轮播里上下相邻的半透明预设
    list.innerHTML =
      '<span class="bpx-player-three-playrate-hint-carousel-item bpx-player-three-playrate-hint-carousel-item-selected">' +
      label + '</span>';
    hint.style.display = '';
    // 每次显示时重置动画时间线，像原生 lottie 一样从头播放
    const svg = hint.querySelector('svg');
    if (svg && svg.setCurrentTime) {
      try { svg.setCurrentTime(0); svg.unpauseAnimations(); } catch (e) {}
    }
    // 把唯一一项垂直居中到 40px 高的轮播窗口（原生公式在多项时是 12-16*pos）
    const itemH = list.firstElementChild.getBoundingClientRect().height || 16;
    const winH = carousel.getBoundingClientRect().height || 40;
    list.style.transition = 'none';
    list.style.transform = 'translateY(' + (winH - itemH) / 2 + 'px)';
  }

  function hideHint() {
    if (state.hintNode) state.hintNode.style.display = 'none';
  }

  function startBoost() {
    if (state.boosting) return;
    const v = getVideo();
    if (!v) return;
    state.boosting = true;
    state.boostBase = state.desired;
    const r = boostRate();
    try { v.playbackRate = r; } catch (e) {}
    setResult(r);
    showHint(r);
  }

  function stopBoost() {
    if (!state.boosting) return;
    state.boosting = false;
    const v = getVideo();
    if (v) {
      try { v.playbackRate = state.boostBase; } catch (e) {}
    }
    setResult(state.desired);
    hideHint();
  }

  function seekForward() {
    const v = getVideo();
    if (!v) return;
    const max = isFinite(v.duration) ? v.duration : Infinity;
    try { v.currentTime = Math.min(max, v.currentTime + SEEK_STEP); } catch (e) {}
  }

  function cancelPress() {
    if (state.pressTimer) {
      clearTimeout(state.pressTimer);
      state.pressTimer = null;
    }
    state.pressing = false;
    state.longPress = false;
  }

  function bindBoostHotkeys() {
    // 在 window 捕获阶段抢占，完全接管 → 手势（B 站的 keydown 监听在 window 冒泡阶段）
    window.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight') return;
      if (isTypingTarget(e.target) || !getVideo()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat || state.pressing) return;
      state.pressing = true;
      state.longPress = false;
      state.pressTimer = setTimeout(() => {
        state.pressTimer = null;
        if (!state.pressing) return;
        state.longPress = true;
        startBoost();
      }, LONG_PRESS_DELAY);
    }, true);

    window.addEventListener('keyup', e => {
      if (e.key !== 'ArrowRight') return;
      if (isTypingTarget(e.target)) return;
      e.stopImmediatePropagation();
      const longPress = state.longPress;
      const pressing = state.pressing;
      cancelPress();
      if (longPress) stopBoost();
      else if (pressing) seekForward();
    }, true);

    window.addEventListener('blur', () => { cancelPress(); stopBoost(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelPress(); stopBoost(); }
    });
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
    label.textContent = t('playbackSpeed');
    display.append(value, label);

    const slider = document.createElement('input');
    slider.className = 'bprft-slider';
    slider.type = 'range';
    slider.min = CONFIG.min;
    slider.max = CONFIG.max;
    slider.step = CONFIG.step;
    slider.setAttribute('aria-label', t('playbackSpeed'));

    const row = document.createElement('div');
    row.className = 'bprft-row';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'bprft-btn';
    minus.textContent = '−';
    minus.setAttribute('aria-label', t('decreaseSpeed'));
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'bprft-input';
    input.min = CONFIG.min;
    input.max = CONFIG.max;
    input.step = CONFIG.step;
    input.setAttribute('aria-label', t('customRate'));
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'bprft-btn';
    plus.textContent = '+';
    plus.setAttribute('aria-label', t('increaseSpeed'));
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
    guardResult();

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

  // 在 document_start 阶段立即注册长按加速监听，确保早于 B 站脚本，
  // 从而能在捕获阶段抢占原生长按逻辑；其余依赖 DOM 的逻辑仍由 start() 延迟执行。
  bindBoostHotkeys();
  start();
})();
