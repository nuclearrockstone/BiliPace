/** 播放器面板 UI：注入自定义倍速菜单、预设、同步显示、展开/收起。 */
(() => {
  'use strict';

  const NS = (window.BPRFT = window.BPRFT || {});
  const { CONFIG, state } = NS;

  let closeTimer = null;
  const lastPointer = { x: -1, y: -1 };

  document.addEventListener('mousemove', e => {
    lastPointer.x = e.clientX;
    lastPointer.y = e.clientY;
  }, { passive: true });

  function syncUI(r) {
    const refs = state.refs;
    if (!refs) return;
    refs.value.textContent = NS.fmtFull(r);
    refs.slider.value = r;
    refs.input.value = r;
    const pct = ((r - CONFIG.min) / (CONFIG.max - CONFIG.min)) * 100;
    refs.slider.style.setProperty('--fill', pct + '%');
    refs.presets.forEach(btn => {
      btn.classList.toggle('is-active', Math.abs(+btn.dataset.value - r) < 1e-4);
    });
  }
  NS.syncUI = syncUI;

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
  NS.open = open;

  function close() {
    clearCloseTimer();
    if (state.refs) state.refs.menu.classList.remove('is-open');
  }
  NS.close = close;

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
    const old = NS.q(CONFIG.menuSel, container);
    if (old) old.remove();
    const unlogin = NS.q(CONFIG.unloginSel, container);
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
    label.textContent = NS.t('playbackSpeed');
    display.append(value, label);

    const slider = document.createElement('input');
    slider.className = 'bprft-slider';
    slider.type = 'range';
    slider.min = CONFIG.min;
    slider.max = CONFIG.max;
    slider.step = CONFIG.step;
    slider.setAttribute('aria-label', NS.t('playbackSpeed'));

    const row = document.createElement('div');
    row.className = 'bprft-row';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'bprft-btn';
    minus.textContent = '−';
    minus.setAttribute('aria-label', NS.t('decreaseSpeed'));
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'bprft-input';
    input.min = CONFIG.min;
    input.max = CONFIG.max;
    input.step = CONFIG.step;
    input.setAttribute('aria-label', NS.t('customRate'));
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'bprft-btn';
    plus.textContent = '+';
    plus.setAttribute('aria-label', NS.t('increaseSpeed'));
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
      result: NS.q(CONFIG.resultSel, container)
    };
    NS.guardResult();

    slider.addEventListener('input', () => NS.apply(slider.value));
    input.addEventListener('change', () => NS.apply(input.value));
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      if (!isNaN(v)) value.textContent = NS.fmtFull(NS.clamp(v));
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
    minus.addEventListener('click', () => NS.apply(NS.round2(state.desired - CONFIG.fineStep)));
    plus.addEventListener('click', () => NS.apply(NS.round2(state.desired + CONFIG.fineStep)));

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
  NS.buildMenu = buildMenu;

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
      b.textContent = NS.fmtShort(p);
      b.addEventListener('click', () => NS.apply(p));
      refs.presetsWrap.appendChild(b);
      refs.presets.push(b);
    });
    syncUI(state.desired);
  }
  NS.renderPresets = renderPresets;

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
    const desired = NS.clamp(state.desired);
    if (desired !== state.desired) {
      state.desired = desired;
      const v = NS.getVideo();
      if (v) {
        try { v.playbackRate = desired; } catch (e) {}
      }
    }
    if (refs) renderPresets();
    syncUI(state.desired);
    NS.setResult(state.desired);
  }
  NS.applySettings = applySettings;
})();
