/** 「调节范围」数字步进器。 */
export function attachStepper(input) {
  const wrap = input.closest('.stepper');
  if (!wrap) return;
  const dec = wrap.querySelector('.stepper-btn.dec');
  const inc = wrap.querySelector('.stepper-btn.inc');
  const stepOf = () => {
    const s = parseFloat(input.step);
    return isFinite(s) && s > 0 ? s : 1;
  };
  // 根据 step 的小数位数确定保留精度，避免浮点误差
  const decimals = () => {
    const s = String(input.step);
    const i = s.indexOf('.');
    return i === -1 ? 0 : s.length - i - 1;
  };
  const apply = dir => {
    const cur = parseFloat(input.value);
    let v = (isFinite(cur) ? cur : 0) + dir * stepOf();
    const min = parseFloat(input.min);
    if (isFinite(min)) v = Math.max(min, v);
    input.value = v.toFixed(decimals());
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  dec.addEventListener('click', () => apply(-1));
  inc.addEventListener('click', () => apply(1));
}

export function initSteppers() {
  document.querySelectorAll('.stepper input[type="number"]').forEach(attachStepper);
}
