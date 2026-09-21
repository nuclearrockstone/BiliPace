/** 面板折叠状态（记忆在 localStorage）。 */
const COLLAPSE_KEY = 'panelCollapsed';

export function initPanels() {
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
}
