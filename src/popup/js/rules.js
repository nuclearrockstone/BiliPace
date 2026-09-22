/** 标题匹配规则列表：清洗、渲染、收集，以及拖拽/键盘调整优先级。 */
import { t } from './i18n.js';
import { $, uid } from './dom.js';

const box = $('titleRules');

function sanitizeRule(rule, fallbackId) {
  const keyword = String((rule && rule.keyword) || '').trim();
  if (!keyword) return null;
  const rate = Math.round((+rule.rate || 0) * 100) / 100;
  if (!isFinite(rate) || rate <= 0) return null;
  return { id: (rule && rule.id) || fallbackId || uid(), keyword, rate };
}

export function sanitizeRules(list) {
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

/* ===== 规则优先级拖拽 ===== */
let rowDrag = null;

// 顺序变化后通知外部自动保存（通过 DOM 事件解耦，避免与 storage 模块循环依赖）。
function notifyReordered() {
  document.dispatchEvent(new CustomEvent('bprft:rules-reordered'));
}

function endRowDrag() {
  if (!rowDrag) return;
  rowDrag.row.classList.remove('dragging');
  rowDrag = null;
  notifyReordered();
}

// 拖拽期间统一由 document 监听：DOM 重排（insertBefore）会隐式释放元素级指针捕获，
// 若仍依赖 handle 上的 pointerup 收尾，松开时会因事件落在其它元素上而残留拖拽状态。
document.addEventListener('pointermove', e => {
  if (!rowDrag || rowDrag.pointerId !== e.pointerId) return;
  e.preventDefault();
  // 每次移动重新捕获，保证指针移出弹窗时事件流不断
  try { rowDrag.handle.setPointerCapture(e.pointerId); } catch (err) {}
  const y = e.clientY;
  const target = [...box.querySelectorAll('.rule-row')].find(r => {
    const rect = r.getBoundingClientRect();
    return y >= rect.top && y <= rect.bottom;
  });
  if (!target || target === rowDrag.row) return;
  const rect = target.getBoundingClientRect();
  if (y < rect.top + rect.height / 2) {
    if (target.previousElementSibling !== rowDrag.row) box.insertBefore(rowDrag.row, target);
  } else {
    if (target.nextElementSibling !== rowDrag.row) box.insertBefore(rowDrag.row, target.nextElementSibling);
  }
});
document.addEventListener('pointerup', endRowDrag);
document.addEventListener('pointercancel', endRowDrag);
window.addEventListener('blur', endRowDrag);

function attachRowDrag(row) {
  const handle = row.querySelector('.drag-handle');
  if (!handle) return;
  handle.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    rowDrag = { row, handle, pointerId: e.pointerId };
    row.classList.add('dragging');
    try { handle.setPointerCapture(e.pointerId); } catch (err) {}
  });
  handle.addEventListener('pointerup', endRowDrag);
  handle.addEventListener('pointercancel', endRowDrag);
  // 键盘上下键调整优先级
  handle.addEventListener('keydown', e => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const dir = e.key === 'ArrowUp' ? -1 : 1;
    const rows = [...box.querySelectorAll('.rule-row')];
    const i = rows.indexOf(row);
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    if (dir < 0) box.insertBefore(row, rows[j]);
    else box.insertBefore(rows[j], row);
    notifyReordered();
  });
}

function makeRuleRow(rule) {
  const row = document.createElement('div');
  row.className = 'rule-row';
  row.dataset.id = rule.id;
  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.title = t('dragHint');
  handle.setAttribute('role', 'button');
  handle.setAttribute('aria-label', t('dragLabel'));
  handle.tabIndex = 0;
  const kw = document.createElement('input');
  kw.type = 'text';
  kw.className = 'rule-keyword';
  kw.value = rule.keyword;
  kw.placeholder = t('keywordPlaceholder');
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
  del.setAttribute('aria-label', t('delete'));
  del.addEventListener('click', () => row.remove());
  row.append(handle, kw, rate, del);
  attachRowDrag(row);
  return row;
}

export function renderRuleRows(list) {
  box.innerHTML = '';
  list.forEach(r => box.appendChild(makeRuleRow(r)));
}

export function collectRules() {
  const out = [];
  box.querySelectorAll('.rule-row').forEach(row => {
    const s = sanitizeRule({
      id: row.dataset.id,
      keyword: row.querySelector('.rule-keyword').value,
      rate: row.querySelector('.rule-rate').value
    });
    if (s) out.push(s);
  });
  return out;
}

export function upsertRule(keyword, rate) {
  const rows = box.querySelectorAll('.rule-row');
  for (const row of rows) {
    if (row.querySelector('.rule-keyword').value.trim() === keyword) {
      row.querySelector('.rule-rate').value = rate;
      return row;
    }
  }
  const row = makeRuleRow({ id: uid(), keyword, rate });
  box.appendChild(row);
  return row;
}

export function addEmptyRule() {
  const row = makeRuleRow({ id: uid(), keyword: '', rate: 1 });
  box.appendChild(row);
  row.querySelector('.rule-keyword').focus();
  return row;
}
