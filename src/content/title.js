/** 标题关键词匹配：根据视频标题自动套用规则倍速。 */
(() => {
  'use strict';

  const NS = (window.BPRFT = window.BPRFT || {});
  const { CONFIG, state } = NS;

  function getVideoTitle() {
    const el = NS.q(CONFIG.titleSel);
    if (el) {
      const t = (el.getAttribute('data-title') || el.textContent || '').trim();
      if (t) return t;
    }
    const fallback = (document.title || '')
      .replace(/_+哔哩哔哩_+bilibili.*$/i, '')
      .trim();
    return fallback || '';
  }
  NS.getVideoTitle = getVideoTitle;

  function matchRule(title) {
    if (!state.titleMatchEnabled || !title) return null;
    const t = title.toLowerCase();
    // 按列表顺序匹配：越靠前的规则优先级越高，命中即返回
    for (const rule of state.titleRules) {
      const kw = String(rule.keyword || '').trim().toLowerCase();
      if (!kw || !t.includes(kw)) continue;
      return rule;
    }
    return null;
  }

  function applyTitleRule(force) {
    const title = getVideoTitle();
    if (!title) return;
    if (!force && title === state.title) return;
    const titleChanged = title !== state.title;
    state.title = title;
    const rule = matchRule(title);
    if (rule) {
      NS.apply(rule.rate, { persist: false });
    } else if (titleChanged || force) {
      NS.apply(state.defaultRate, { persist: false });
    }
  }
  NS.applyTitleRule = applyTitleRule;
})();
