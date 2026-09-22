/**
 * Content script — core playback-rate controls, panel UI and live settings.
 * Runs on a live Bilibili video page.
 */
import { snap, setDesired, domClick, setStorage, sleep } from '../harness.mjs';

export default async function run({ page, extPage, report }) {
  const { check } = report;

  // --- panel injection -----------------------------------------------------
  let s = await snap(page);
  check('custom rate panel injected', s.menuExists);
  check('native rate menu replaced', s.nativeMenuRemoved);

  // --- slider --------------------------------------------------------------
  await setDesired(page, 1.5);
  s = await snap(page);
  check('slider applies rate', Math.abs(s.rate - 1.5) < 1e-3, s);
  check('display shows 1.50x', s.value === '1.50x', { value: s.value });
  check('number input synced', String(s.inputVal) === '1.5', { inputVal: s.inputVal });
  check('button label synced', s.result === '1.5x', { result: s.result });
  check('active preset highlighted', s.activeChips.includes('1.5'), { activeChips: s.activeChips });
  check('slider fill updated', s.fill && s.fill !== '0%', { fill: s.fill });

  // --- presets -------------------------------------------------------------
  await domClick(page, '.bprft-chip[data-value="2"]');
  await page.waitForTimeout(300);
  s = await snap(page);
  check('preset chip applies rate', Math.abs(s.rate - 2) < 1e-3, s);
  check('preset chip active state', s.activeChips.length === 1 && s.activeChips[0] === '2', s);

  // --- +/- fine step -------------------------------------------------------
  await setDesired(page, 1.5);
  await domClick(page, '.bprft-btn:nth-of-type(2)'); // '+' inside .bprft-row
  await page.waitForTimeout(250);
  s = await snap(page);
  check('+ button applies fineStep', Math.abs(s.rate - 1.55) < 1e-3, s);
  await domClick(page, '.bprft-btn:nth-of-type(1)'); // '−'
  await page.waitForTimeout(250);
  s = await snap(page);
  check('− button applies fineStep', Math.abs(s.rate - 1.5) < 1e-3, s);

  // --- exact number input --------------------------------------------------
  await page.evaluate(() => {
    const i = document.querySelector('.bprft-input');
    i.value = '1.37';
    i.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  s = await snap(page);
  check('number input applies exact rate', Math.abs(s.rate - 1.37) < 1e-3, s);

  // --- clamping to configured min/max -------------------------------------
  await setDesired(page, 9);
  s = await snap(page);
  check('rate clamped to max', Math.abs(s.rate - 4) < 1e-3, s);
  await setDesired(page, 0);
  s = await snap(page);
  check('rate clamped to min', Math.abs(s.rate - 0.1) < 1e-3, s);

  // --- menu open / close ---------------------------------------------------
  await page.evaluate(() =>
    document.querySelector('.bpx-player-ctrl-playbackrate').dispatchEvent(new MouseEvent('mouseenter')));
  await page.waitForTimeout(150);
  s = await snap(page);
  check('menu opens on hover', s.menuOpen);
  await page.evaluate(() =>
    document.querySelector('.bpx-player-ctrl-playbackrate').dispatchEvent(new MouseEvent('mouseleave')));
  await sleep(950); // hideDelay 600ms
  s = await snap(page);
  check('menu closes after hideDelay', !s.menuOpen);

  // --- 1x label guard (Bilibili renders "倍速" instead of "1.0x") ----------
  await setDesired(page, 1);
  await page.evaluate(() => {
    const r = document.querySelector('.bpx-player-ctrl-playbackrate-result');
    if (r) r.textContent = '倍速';
  });
  await page.waitForTimeout(200);
  s = await snap(page);
  check('1x label corrected to 1.0x', s.result === '1.0x', { result: s.result });

  // --- live settings update (range + presets) ------------------------------
  await setStorage(extPage, { min: 0.5, max: 3, step: 0.1, fineStep: 0.1, presets: [0.5, 1, 2, 3] });
  await page.waitForTimeout(400);
  s = await snap(page);
  check('slider min updated live', String(s.sliderMin) === '0.5', { min: s.sliderMin });
  check('slider max updated live', String(s.sliderMax) === '3', { max: s.sliderMax });
  check('slider step updated live', String(s.sliderStep) === '0.1', { step: s.sliderStep });
  check('presets re-rendered live', s.chipCount === 4, { chipCount: s.chipCount });

  // --- external ratechange adoption ---------------------------------------
  await setDesired(page, 1.5);
  await page.evaluate(() => { document.querySelector('video').playbackRate = 1.75; });
  await page.waitForTimeout(1000);
  s = await snap(page);
  check('external ratechange adopted', Math.abs(s.rate - 1.75) < 1e-3, s);
  check('UI follows external ratechange', s.result === '1.75x', { result: s.result });
}
