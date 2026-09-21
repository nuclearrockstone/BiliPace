/** 常用倍速列表：清洗、渲染、收集。 */
import { DEFAULTS } from './config.js';
import { t } from './i18n.js';
import { $ } from './dom.js';

const box = $('presets');

export function sanitizePresets(list) {
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
  del.setAttribute('aria-label', t('delete'));
  del.addEventListener('click', () => row.remove());
  row.append(input, del);
  return row;
}

export function renderPresetRows(list) {
  box.innerHTML = '';
  list.forEach(v => box.appendChild(makeRow(v)));
}

export function collectPresets() {
  const out = [];
  box.querySelectorAll('input').forEach(inp => {
    const n = parseFloat(inp.value);
    if (isFinite(n) && n > 0) out.push(n);
  });
  return out;
}

export function addPresetRow() {
  box.appendChild(makeRow(DEFAULTS.presets[0]));
}
