/** 读写 chrome.storage：加载设置、校验并保存、恢复默认。 */
import { DEFAULTS } from './config.js';
import { $, showStatus } from './dom.js';
import { t } from './i18n.js';
import { sanitizePresets, collectPresets, renderPresetRows } from './presets.js';
import { sanitizeRules, collectRules, renderRuleRows } from './rules.js';

function num(id, def) {
  const v = parseFloat($(id).value);
  return isFinite(v) ? v : def;
}

export function load() {
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

export function save() {
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
    showStatus(t('errMinMax'), true);
    return;
  }
  if (data.step <= 0 || data.fineStep <= 0) {
    showStatus(t('errStep'), true);
    return;
  }
  chrome.storage.sync.set(data, () => showStatus(t('statusSaved')));
  renderPresetRows(data.presets);
  renderRuleRows(data.titleRules);
}

export function reset() {
  chrome.storage.sync.set(DEFAULTS, () => {
    load();
    showStatus(t('statusReset'));
  });
}
