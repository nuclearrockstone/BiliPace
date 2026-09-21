/** 通用工具：i18n 文案、数值格式化、DOM 查询。 */
(() => {
  'use strict';

  const NS = (window.BPRFT = window.BPRFT || {});

  NS.t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;

  NS.clamp = v => Math.min(NS.CONFIG.max, Math.max(NS.CONFIG.min, v));
  NS.round2 = v => Math.round((+v || 0) * 100) / 100;
  NS.fmtFull = v => NS.round2(v).toFixed(2) + 'x';
  NS.fmtShort = v => {
    const r = NS.round2(v);
    return Number.isInteger(r) ? r.toFixed(1) + 'x' : r + 'x';
  };

  NS.q = (sel, root) => (root || document).querySelector(sel);
})();
