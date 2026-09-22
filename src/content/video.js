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
      if (cur !== want) result.textContent = want;
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

  // B 站切集/切换清晰度时会调用 video.load()，按规范 load() 会把 playbackRate
  // 重置为 defaultPlaybackRate(通常为 1)，随后触发 ratechange。这是播放器的
  // 程序性重置，并非用户意图，所以在这段时间内要忽略 ratechange，避免把
  // 用户设置的期望倍速清成 1。
  function markSwitching() {
    state.switching = true;
    if (state.switchTimer) clearTimeout(state.switchTimer);
    state.switchTimer = setTimeout(() => {
      state.switchTimer = null;
      state.switching = false;
    }, 3000);
  }

  function clearSwitching() {
    if (state.switchTimer) {
      clearTimeout(state.switchTimer);
      state.switchTimer = null;
    }
    state.switching = false;
  }

  function onRateChange() {
    // 长按加速期间倍速由扩展临时接管，不视为新的期望倍速
    if (state.boosting) return;
    const v = getVideo();
    if (!v) return;
    const r = NS.round2(v.playbackRate);
    if (Math.abs(r - state.desired) > 1e-3) {
      // 切集等程序性重置：保留期望倍速并立即恢复，而不是跟随播放器
      if (state.switching) {
        reapply();
        return;
      }
      state.desired = r;
      NS.syncUI(r);
      setResult(r);
    }
  }

  function watchVideo() {
    const v = getVideo();
    if (!v) return;
    if (v !== state.video) {
      if (state.video) {
        NS.REAPPLY_EVENTS.forEach(ev => state.video.removeEventListener(ev, reapply));
        state.video.removeEventListener('ratechange', onRateChange);
        state.video.removeEventListener('loadstart', markSwitching);
        state.video.removeEventListener('emptied', markSwitching);
        state.video.removeEventListener('canplay', clearSwitching);
        state.video.removeEventListener('playing', clearSwitching);
      }
      state.video = v;
      NS.REAPPLY_EVENTS.forEach(ev => v.addEventListener(ev, reapply));
      v.addEventListener('ratechange', onRateChange);
      v.addEventListener('loadstart', markSwitching);
      v.addEventListener('emptied', markSwitching);
      v.addEventListener('canplay', clearSwitching);
      v.addEventListener('playing', clearSwitching);
    }
    // 兜底：某些切集路径不触发上面的媒体事件，这里通过 currentSrc 变化发现
    // 换源并重新应用期望倍速。
    if (v.currentSrc && v.currentSrc !== state.src) {
      state.src = v.currentSrc;
      markSwitching();
      reapply();
    }
  }
  NS.watchVideo = watchVideo;
})();
