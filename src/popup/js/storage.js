/** 读写 chrome.storage：加载设置、校验并保存、恢复默认、展示默认倍速。 */
import { DEFAULTS } from './config.js';
import { $, showStatus } from './dom.js';
import { t } from './i18n.js';
import { sanitizePresets, collectPresets, renderPresetRows } from './presets.js';
import { sanitizeRules, collectRules, renderRuleRows } from './rules.js';

/** 上一次成功保存的数据快照，用于跳过无意义的重复写入。 */
let lastSaved = null;

/** 自动保存的防抖计时器（同一文件内管理，便于 reset 时取消）。 */
let saveTimer = null;

function num(id, def) {
  const v = parseFloat($(id).value);
  return isFinite(v) ? v : def;
}

function collect() {
  return {
    min: num('min', DEFAULTS.min),
    max: num('max', DEFAULTS.max),
    step: num('step', DEFAULTS.step),
    fineStep: num('fineStep', DEFAULTS.fineStep),
    presets: sanitizePresets(collectPresets()),
    titleRules: sanitizeRules(collectRules()),
    titleMatchEnabled: $('titleMatchEnabled').checked
  };
}

function validate(data) {
  if (data.min >= data.max) return 'errMinMax';
  if (data.step <= 0 || data.fineStep <= 0) return 'errStep';
  return null;
}

/** 与播放器提示保持一致：整数显示一位小数，其余保留最多两位。 */
function formatRate(rate) {
  const r = Math.round((+rate || 1) * 100) / 100;
  return (Number.isInteger(r) ? r.toFixed(1) : r) + 'x';
}

export function updateDefaultRate(rate) {
  const el = $('defaultRate');
  if (el) el.textContent = formatRate(rate);
}

/** 展示当前默认倍速，并跟随播放页上的改速实时刷新。 */
export function initDefaultRate() {
  chrome.storage.sync.get({ rate: 1 }, data => updateDefaultRate(data.rate));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.rate) updateDefaultRate(changes.rate.newValue);
  });
}

export function load() {
  chrome.storage.sync.get({
    ...DEFAULTS,
    titleRules: [],
    titleMatchEnabled: true,
    rate: 1
  }, data => {
    $('min').value = data.min;
    $('max').value = data.max;
    $('step').value = data.step;
    $('fineStep').value = data.fineStep;
    renderPresetRows(sanitizePresets(data.presets));
    $('titleMatchEnabled').checked = data.titleMatchEnabled !== false;
    renderRuleRows(sanitizeRules(data.titleRules));
    updateDefaultRate(data.rate);
    lastSaved = JSON.stringify(collect());
  });
}

/**
 * 收集并保存设置。
 *
 * @param {object} [opts]
 * @param {boolean} [opts.rerender=true] 是否按清洗后的数据重排列表。自动保存时
 *   应传 false，避免重排打断用户正在进行的编辑与点击。
 * @param {boolean} [opts.silent=false]   是否隐藏「已保存」提示（校验错误仍会提示）。
 * @param {boolean} [opts.reportUnchanged=false] 无改动时是否也提示「已保存」（手动保存用）。
 * @returns {boolean} 是否写入了新的数据。
 */
export function save(opts = {}) {
  const { rerender = true, silent = false, reportUnchanged = false } = opts;
  const data = collect();
  const err = validate(data);
  if (err) {
    showStatus(t(err), true);
    return false;
  }

  const serialized = JSON.stringify(data);
  if (serialized === lastSaved) {
    if (!silent && reportUnchanged) showStatus(t('statusSaved'));
    return false;
  }

  chrome.storage.sync.set(data, () => {
    lastSaved = serialized;
    if (!silent) showStatus(t('statusSaved'));
  });

  if (rerender) {
    renderPresetRows(data.presets);
    renderRuleRows(data.titleRules);
  }
  return true;
}

/** 防抖自动保存：输入失焦、勾选切换等场景调用。 */
export function saveDebounced(opts = { rerender: false }) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    save(opts);
  }, 150);
}

/** 取消尚未触发的自动保存（例如恢复默认前）。 */
export function cancelPendingSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}

/** 立即执行尚未触发的自动保存（例如关闭弹窗 / 页面隐藏前）。 */
export function flushPendingSave() {
  if (!saveTimer) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  save({ rerender: false });
}

/** 立即保存（例如输入框内按 Enter 确认）。 */
export function saveNow() {
  cancelPendingSave();
  save({ rerender: false });
}

export function reset() {
  cancelPendingSave();
  chrome.storage.sync.set(DEFAULTS, () => {
    load();
    showStatus(t('statusReset'));
  });
}
