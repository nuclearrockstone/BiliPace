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
  const rulesBox = $('titleRules');

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

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

  function sanitizeRule(rule, fallbackId) {
    const keyword = String((rule && rule.keyword) || '').trim();
    if (!keyword) return null;
    const rate = Math.round((+rule.rate || 0) * 100) / 100;
    if (!isFinite(rate) || rate <= 0) return null;
    return { id: (rule && rule.id) || fallbackId || uid(), keyword, rate };
  }

  function sanitizeRules(list) {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    const out = [];
    for (const r of list) {
      const s = sanitizeRule(r);
      if (!s || seen.has(s.keyword)) continue;
      seen.add(s.keyword);
      out.push(s);
    }
    return out;
  }

  function makeRuleRow(rule) {
    const row = document.createElement('div');
    row.className = 'rule-row';
    row.dataset.id = rule.id;
    const kw = document.createElement('input');
    kw.type = 'text';
    kw.className = 'rule-keyword';
    kw.value = rule.keyword;
    kw.placeholder = '标题关键词';
    const rate = document.createElement('input');
    rate.type = 'number';
    rate.className = 'rule-rate';
    rate.value = rule.rate;
    rate.step = 0.01;
    rate.min = 0.05;
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.textContent = '✕';
    del.setAttribute('aria-label', '删除');
    del.addEventListener('click', () => row.remove());
    row.append(kw, rate, del);
    return row;
  }

  function renderRuleRows(list) {
    rulesBox.innerHTML = '';
    list.forEach(r => rulesBox.appendChild(makeRuleRow(r)));
  }

  function collectRules() {
    const out = [];
    rulesBox.querySelectorAll('.rule-row').forEach(row => {
      const s = sanitizeRule({
        id: row.dataset.id,
        keyword: row.querySelector('.rule-keyword').value,
        rate: row.querySelector('.rule-rate').value
      });
      if (s) out.push(s);
    });
    return out;
  }

  function upsertRule(keyword, rate) {
    const rows = rulesBox.querySelectorAll('.rule-row');
    for (const row of rows) {
      if (row.querySelector('.rule-keyword').value.trim() === keyword) {
        row.querySelector('.rule-rate').value = rate;
        return row;
      }
    }
    const row = makeRuleRow({ id: uid(), keyword, rate });
    rulesBox.appendChild(row);
    return row;
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
    chrome.storage.sync.get({ titleRules: [], titleMatchEnabled: true }, data => {
      $('titleMatchEnabled').checked = data.titleMatchEnabled !== false;
      renderRuleRows(sanitizeRules(data.titleRules));
    });
  }

  function save() {
    const data = {
      min: num('min', DEFAULTS.min),
      max: num('max', DEFAULTS.max),
      step: num('step', DEFAULTS.step),
      fineStep: num('fineStep', DEFAULTS.fineStep),
      presets: sanitizePresets(collectPresets()),
      titleRules: sanitizeRules(collectRules()),
      titleMatchEnabled: $('titleMatchEnabled').checked
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
    renderRuleRows(data.titleRules);
  }

  function autoAddTitle() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs && tabs[0];
      if (!tab || tab.id == null) {
        showStatus('未找到当前标签页', true);
        return;
      }
      chrome.tabs.sendMessage(tab.id, { type: 'GET_VIDEO_INFO' }, resp => {
        if (chrome.runtime.lastError || !resp || !resp.title) {
          showStatus('当前页面不是 B 站视频页,或请先刷新页面', true);
          return;
        }
        const title = String(resp.title).trim();
        const rate = Math.round((+resp.rate || 1) * 100) / 100;
        upsertRule(title, rate);
        showStatus('已添加:' + title + ' @ ' + rate + 'x');
      });
    });
  }

  /* ===== 加减步进器（调节范围） ===== */
  function attachStepper(input) {
    const wrap = input.closest('.stepper');
    if (!wrap) return;
    const dec = wrap.querySelector('.stepper-btn.dec');
    const inc = wrap.querySelector('.stepper-btn.inc');
    const stepOf = () => {
      const s = parseFloat(input.step);
      return isFinite(s) && s > 0 ? s : 1;
    };
    // 根据 step 的小数位数确定保留精度，避免浮点误差
    const decimals = () => {
      const s = String(input.step);
      const i = s.indexOf('.');
      return i === -1 ? 0 : s.length - i - 1;
    };
    const apply = dir => {
      const cur = parseFloat(input.value);
      let v = (isFinite(cur) ? cur : 0) + dir * stepOf();
      const min = parseFloat(input.min);
      if (isFinite(min)) v = Math.max(min, v);
      input.value = v.toFixed(decimals());
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    dec.addEventListener('click', () => apply(-1));
    inc.addEventListener('click', () => apply(1));
  }

  document.querySelectorAll('.stepper input[type="number"]').forEach(attachStepper);

  /* ===== 面板折叠 ===== */
  const COLLAPSE_KEY = 'panelCollapsed';
  let collapsedMap = {};
  try {
    collapsedMap = JSON.parse(localStorage.getItem(COLLAPSE_KEY)) || {};
  } catch (e) {
    collapsedMap = {};
  }

  function setCollapsed(panel, collapsed) {
    panel.classList.toggle('collapsed', collapsed);
    panel.querySelector('.panel-head').setAttribute('aria-expanded', String(!collapsed));
    collapsedMap[panel.dataset.panel] = collapsed;
    try {
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsedMap));
    } catch (e) { /* ignore */ }
  }

  document.querySelectorAll('.panel').forEach(panel => {
    const head = panel.querySelector('.panel-head');
    if (!head) return;
    // 默认折叠，仅当用户显式展开过才保持展开
    if (collapsedMap[panel.dataset.panel] !== false) {
      panel.classList.add('collapsed');
      head.setAttribute('aria-expanded', 'false');
    }
    head.addEventListener('click', e => {
      // 点击开关等交互控件时不触发折叠
      if (e.target.closest('.switch')) return;
      setCollapsed(panel, !panel.classList.contains('collapsed'));
    });
    head.addEventListener('keydown', e => {
      if (e.target.closest('.switch')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setCollapsed(panel, !panel.classList.contains('collapsed'));
      }
    });
  });

  $('save').addEventListener('click', save);
  $('addPreset').addEventListener('click', () => presetsBox.appendChild(makeRow(DEFAULTS.presets[0])));
  $('addTitleRule').addEventListener('click', () => {
    const row = makeRuleRow({ id: uid(), keyword: '', rate: 1 });
    rulesBox.appendChild(row);
    row.querySelector('.rule-keyword').focus();
  });
  $('autoAddTitle').addEventListener('click', autoAddTitle);
  $('reset').addEventListener('click', () => {
    chrome.storage.sync.set(DEFAULTS, () => {
      load();
      showStatus('已恢复默认');
    });
  });

  load();
})();
