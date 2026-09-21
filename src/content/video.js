/** 视频元素管理、倍速应用与持久化。 */
(() => {
  'use strict';

  const NS = (window.BPRFT = window.BPRFT || {});
  const { CONFIG, state } = NS;

  function getVideo() {
    const refs = state.refs;
    if (refs && refs.container) {
      const wrap = refs.container.closest('.bpx-player-video-wrap, .bpx-player-container, #bilibiliPlayer');
      if (wrap) {
        const v = NS.q('video', wrap);
        if (v) return v;
      }
    }
    const player = NS.q('#bilibiliPlayer') || NS.q('.bpx-player-container');
    if (player) {
      const v = NS.q('video', player);
      if (v) return v;
    }
    return NS.q('video');
  }
  NS.getVideo = getVideo;

  function setResult(r) {
    if (state.refs && state.refs.result) state.refs.result.textContent = NS.fmtShort(r);
  }
  NS.setResult = setResult;

  // B 站在倍速为 1 时会把按钮文字渲染成“倍速”而不是数值，
  // 这里在非长按状态下把它纠正回扩展的数值展示（只改文字，不碰任何状态）。
  function guardResult() {
    const result = state.refs && state.refs.result;
    if (!result || result.__bprftGuard) return;
    result.__bprftGuard = true;
    new MutationObserver(() => {
      if (state.boosting) return;
      const want = NS.fmtShort(state.desired);
      const cur = (result.textContent || '').trim();
      if (cur !== want && !/[\d.]/.test(cur)) result.textContent = want;
    }).observe(result, { childList: true, characterData: true, subtree: true });
  }
  NS.guardResult = guardResult;

  function apply(value, opts) {
    const r = NS.round2(NS.clamp(value));
    if (!isFinite(r)) return;
    state.desired = r;
    const v = getVideo();
    if (v) {
      try { v.playbackRate = r; } catch (e) {}
    }
    NS.syncUI(r);
    setResult(r);
    if (!opts || opts.persist !== false) {
      state.defaultRate = r;
      persistRate(r);
    }
  }
  NS.apply = apply;

  let rateSaveTimer = null;
  function persistRate(r) {
    if (rateSaveTimer) clearTimeout(rateSaveTimer);
    rateSaveTimer = setTimeout(() => {
      rateSaveTimer = null;
      try { chrome.storage.sync.set({ rate: r }); } catch (e) {}
    }, 300);
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
    const r = NS.round2(v.playbackRate);
    if (Math.abs(r - state.desired) > 1e-3) {
      state.desired = r;
      NS.syncUI(r);
      setResult(r);
    }
  }

  function watchVideo() {
    const v = getVideo();
    if (!v || v === state.video) return;
    if (state.video) {
      NS.REAPPLY_EVENTS.forEach(ev => state.video.removeEventListener(ev, reapply));
      state.video.removeEventListener('ratechange', onRateChange);
    }
    state.video = v;
    NS.REAPPLY_EVENTS.forEach(ev => v.addEventListener(ev, reapply));
    v.addEventListener('ratechange', onRateChange);
  }
  NS.watchVideo = watchVideo;
})();
