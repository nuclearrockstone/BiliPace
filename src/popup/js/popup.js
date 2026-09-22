/** popup 入口：翻译页面、初始化各组件、绑定操作、载入设置。 */
import { t, translatePage } from './i18n.js';
import { $, showStatus } from './dom.js';
import { addPresetRow } from './presets.js';
import { addEmptyRule, upsertRule } from './rules.js';
import { initSteppers } from './stepper.js';
import { initPanels } from './panels.js';
import { initAutoSave } from './autosave.js';
import { load, save, reset, initDefaultRate } from './storage.js';

function autoAddTitle() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs && tabs[0];
    if (!tab || tab.id == null) {
      showStatus(t('errNoTab'), true);
      return;
    }
    chrome.tabs.sendMessage(tab.id, { type: 'GET_VIDEO_INFO' }, resp => {
      if (chrome.runtime.lastError || !resp || !resp.title) {
        showStatus(t('errNoVideo'), true);
        return;
      }
      const title = String(resp.title).trim();
      const rate = Math.round((+resp.rate || 1) * 100) / 100;
      upsertRule(title, rate);
      // 自动保存，保留「已添加」提示而不是被「已保存」覆盖
      save({ silent: true });
      showStatus(t('addedRule', [title, rate]));
    });
  });
}

function bindActions() {
  $('save').addEventListener('click', () => save({ reportUnchanged: true }));
  $('addPreset').addEventListener('click', addPresetRow);
  $('addTitleRule').addEventListener('click', addEmptyRule);
  $('autoAddTitle').addEventListener('click', autoAddTitle);
  $('reset').addEventListener('click', reset);
}

function boot() {
  translatePage();
  initSteppers();
  initPanels();
  initDefaultRate();
  initAutoSave();
  bindActions();
  load();
}

boot();
