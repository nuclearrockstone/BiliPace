(() => {
  'use strict';

  const DEFAULTS = {
    min: 0.1,
    max: 4,
    step: 0.01,
    fineStep: 0.05,
    presets: [0.5, 0.75, 1, 1.25, 1.5, 2, 3]
  };

  const $ = id => document.getElementById(id);
  const presetsBox = $('presets');

  function sanitizePresets(list) {
    if (!Array.isArray(list)) return [...DEFAULTS.presets];
    const seen = new Set();
    const out = [];
    for (const v of list) {
      const n = Math.round((+v || 0) * 100) / 100;
      if (!isFinite(n) || n <= 0) continue;
      if (seen.has(n)) continue;
      seen.add(n);
      out.push(n);
    }
    out.sort((a, b) => a - b);
    return out.length ? out.slice(0, 12) : [...DEFAULTS.presets];
  }

  function makeRow(v) {
    const row = document.createElement('div');
    row.className = 'preset-row';
    const input = document.createElement('input');
    input.type = 'number';
    input.value = v;
    input.step = 0.01;
    input.min = 0.05;
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.textContent = '✕';
    del.setAttribute('aria-label', '删除');
    del.addEventListener('click', () => row.remove());
    row.append(input, del);
    return row;
  }

  function renderPresetRows(list) {
    presetsBox.innerHTML = '';
    list.forEach(v => presetsBox.appendChild(makeRow(v)));
  }

  function collectPresets() {
    const out = [];
    presetsBox.querySelectorAll('input').forEach(inp => {
      const n = parseFloat(inp.value);
      if (isFinite(n) && n > 0) out.push(n);
    });
    return out;
  }

  function num(id, def) {
    const v = parseFloat($(id).value);
    return isFinite(v) ? v : def;
  }

  let statusTimer = null;
  function showStatus(msg, err) {
    const s = $('status');
    s.textContent = msg;
    s.className = err ? 'err' : 'ok';
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { s.textContent = ''; }, 2000);
  }

  function load() {
    chrome.storage.sync.get(DEFAULTS, data => {
      $('min').value = data.min;
      $('max').value = data.max;
      $('step').value = data.step;
      $('fineStep').value = data.fineStep;
      renderPresetRows(sanitizePresets(data.presets));
    });
  }

  function save() {
    const data = {
      min: num('min', DEFAULTS.min),
      max: num('max', DEFAULTS.max),
      step: num('step', DEFAULTS.step),
      fineStep: num('fineStep', DEFAULTS.fineStep),
      presets: sanitizePresets(collectPresets())
    };
    if (data.min >= data.max) {
      showStatus('最小速度需小于最大速度', true);
      return;
    }
    if (data.step <= 0 || data.fineStep <= 0) {
      showStatus('步长需大于 0', true);
      return;
    }
    chrome.storage.sync.set(data, () => showStatus('已保存'));
    renderPresetRows(data.presets);
  }

  $('save').addEventListener('click', save);
  $('addPreset').addEventListener('click', () => presetsBox.appendChild(makeRow(DEFAULTS.presets[0])));
  $('reset').addEventListener('click', () => {
    chrome.storage.sync.set(DEFAULTS, () => {
      load();
      showStatus('已恢复默认');
    });
  });

  load();
})();
