/**
 * 自动保存：用户完成输入、对应控件失焦后即写入设置，无需点击「保存设置」。
 *
 * 采用事件委托，动态增删的预设 / 规则行也能自动生效。
 */
import { saveDebounced, flushPendingSave, saveNow } from './storage.js';

function isField(el) {
  return el instanceof HTMLInputElement && el.type !== 'checkbox';
}

export function initAutoSave() {
  // 文本 / 数字输入框：失焦即保存
  document.addEventListener('focusout', e => {
    if (isField(e.target) && e.target.closest('main')) saveDebounced();
  });

  // 输入框内按 Enter：视为完成输入，立即保存
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if (!isField(e.target) || !e.target.closest('main')) return;
    e.preventDefault();
    saveNow();
  });

  // 勾选框：状态变化即保存
  document.addEventListener('change', e => {
    const el = e.target;
    if (el instanceof HTMLInputElement && el.type === 'checkbox') saveDebounced();
  });

  // 步进按钮 / 删除按钮：点击即保存（输入框未必获得过焦点）
  document.addEventListener('click', e => {
    if (e.target.closest('.stepper-btn') || e.target.closest('.del')) saveDebounced();
  });

  // 标题规则拖拽 / 键盘调整优先级后保存
  document.addEventListener('bprft:rules-reordered', () => saveDebounced());

  // 弹窗关闭 / 页面隐藏前，把尚未触发的保存立即落盘
  window.addEventListener('pagehide', flushPendingSave);
  window.addEventListener('blur', flushPendingSave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingSave();
  });
}
