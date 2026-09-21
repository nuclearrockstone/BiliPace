/**
 * 长按 → 方向键加速：劫持 B 站原生长按手势，由扩展实现并复用原生提示 UI。
 *
 * B 站的 keydown/keyup 监听在 window 冒泡阶段，这里在 window 捕获阶段抢占，
 * 因此必须在 document_start 就注册（见 main 模块）。
 */
(() => {
  'use strict';

  const NS = (window.BPRFT = window.BPRFT || {});
  const { CONFIG, state } = NS;

  function boostRate() {
    return NS.round2(NS.clamp(state.desired * CONFIG.boostFactor));
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
      if (wrap) return NS.q(CONFIG.videoAreaSel, wrap) || wrap;
    }
    return NS.q(CONFIG.videoAreaSel) || NS.q('.bpx-player-video-wrap');
  }

  function ensureHint() {
    if (state.hintNode && state.hintNode.isConnected) return state.hintNode;
    const area = videoArea();
    if (!area) return null;
    const hint = document.createElement('div');
    hint.className = 'bpx-player-three-playrate-hint bpx-player-three-playrate-hint-loop';
    hint.innerHTML =
      '<span class="bpx-player-three-playrate-hint-icon">' + NS.HINT_ICON + '</span>' +
      '<span class="bpx-player-three-playrate-hint-label">' + NS.t('speedPlaybackActive') + '</span>' +
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
    const label = NS.fmtShort(rate).replace(/\.0(?=x)/, '').toUpperCase();
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
    const v = NS.getVideo();
    if (!v) return;
    state.boosting = true;
    state.boostBase = state.desired;
    const r = boostRate();
    try { v.playbackRate = r; } catch (e) {}
    NS.setResult(r);
    showHint(r);
  }

  function stopBoost() {
    if (!state.boosting) return;
    state.boosting = false;
    const v = NS.getVideo();
    if (v) {
      try { v.playbackRate = state.boostBase; } catch (e) {}
    }
    NS.setResult(state.desired);
    hideHint();
  }

  function seekForward() {
    const v = NS.getVideo();
    if (!v) return;
    const max = isFinite(v.duration) ? v.duration : Infinity;
    try { v.currentTime = Math.min(max, v.currentTime + NS.SEEK_STEP); } catch (e) {}
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
      if (isTypingTarget(e.target) || !NS.getVideo()) return;
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
      }, NS.LONG_PRESS_DELAY);
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
  NS.bindBoostHotkeys = bindBoostHotkeys;
})();
