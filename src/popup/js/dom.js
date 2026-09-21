/** DOM 小工具：元素查询、唯一 id、状态提示。 */
export const $ = id => document.getElementById(id);

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

let statusTimer = null;
export function showStatus(msg, err) {
  const s = $('status');
  s.textContent = msg;
  s.className = err ? 'err' : 'ok';
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { s.textContent = ''; }, 2000);
}
