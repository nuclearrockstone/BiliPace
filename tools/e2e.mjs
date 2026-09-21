/**
 * E2E test for the "hold → to boost 2x" feature.
 *
 * Loads the unpacked extension into Chromium (Playwright) and verifies:
 *   1. long press ArrowRight → rate = desired * 2, native playrate-hint shown
 *   2. the carousel number stays vertically centered with the carousel window
 *   3. releasing restores the original rate and the speed-button label
 *   4. short press still seeks +5s
 *   5. window blur / hidden page cancels the boost
 *
 * Usage: node tools/e2e.mjs
 * Requires: playwright-core + a Chromium build. Adjust EXE if needed.
 */
import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';

const EXE = process.env.CHROMIUM || 'C:/Users/nucle/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = process.argv[2] || 'https://www.bilibili.com/video/BV17x411w7KC';
// run from the extension root
const ext = process.cwd().replace(/\\/g, '/');
const shots = path.join(ext, 'tools', 'shots');
fs.mkdirSync(shots, { recursive: true });

const ctx = await chromium.launchPersistentContext('', {
  headless: false,
  executablePath: EXE,
  args: [
    `--disable-extensions-except=${ext}`,
    `--load-extension=${ext}`,
    '--autoplay-policy=no-user-gesture-required',
    '--disable-blink-features=AutomationControlled',
  ],
  viewport: { width: 1400, height: 900 },
});
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(7000);
await page.evaluate(() => { const v = document.querySelector('video'); if (v) { v.muted = true; v.play().catch(() => {}); } });
await page.waitForTimeout(1500);

const setDesired = async r => {
  await page.evaluate(v => {
    const s = document.querySelector('.bprft-slider');
    s.value = String(v);
    s.dispatchEvent(new Event('input', { bubbles: true }));
  }, r);
  await page.waitForTimeout(400);
};

const snap = () => page.evaluate(() => {
  const v = document.querySelector('video');
  const result = document.querySelector('.bpx-player-ctrl-playbackrate-result');
  const hint = document.querySelector('.bpx-player-three-playrate-hint');
  const sel = document.querySelector('.bpx-player-three-playrate-hint-carousel-item-selected');
  const car = document.querySelector('.bpx-player-three-playrate-hint-carousel');
  const list = document.querySelector('.bpx-player-three-playrate-hint-carousel-list');
  const center = x => x ? Math.round((x.top + x.bottom) / 2) : null;
  return {
    rate: v?.playbackRate,
    result: result?.textContent,
    hintShown: hint ? getComputedStyle(hint).display !== 'none' : false,
    centered: sel && car ? center(sel.getBoundingClientRect()) === center(car.getBoundingClientRect()) : false,
    selText: sel?.textContent,
    animates: hint ? hint.querySelectorAll('svg animate').length : 0,
    chevrons: hint ? [...hint.querySelectorAll('svg > g > g')].map(g => +(+getComputedStyle(g).opacity).toFixed(3)) : [],
    itemCount: hint ? hint.querySelectorAll('.bpx-player-three-playrate-hint-carousel-item').length : 0,
    dataIdx: hint?.getAttribute('data-rate-index'),
    transform: list?.style.transform,
  };
});

let failed = 0;
const check = (name, cond, extra) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + JSON.stringify(extra) : ''}`);
  if (!cond) failed++;
};

for (const base of [1, 1.5, 2, 1.25]) {
  await setDesired(base);
  const expectBoost = Math.round(Math.min(4, base * 2) * 100) / 100;
  const before = await snap();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  const during = await snap();
  await page.screenshot({ path: `${shots}/hold-${base}.png` });
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(1800);
  const after = await snap();

  check(`base ${base}: boost rate = ${expectBoost}`, Math.abs(during.rate - expectBoost) < 1e-3, { rate: during.rate });
  check(`base ${base}: hint shown`, during.hintShown);
  check(`base ${base}: number centered`, during.centered, { sel: during.selText, transform: during.transform });
  check(`base ${base}: hint label = ${expectBoost}X`, during.selText === `${expectBoost}X`.replace('.0X', 'X'), { selText: during.selText });
  check(`base ${base}: no semi-transparent neighbours`, during.itemCount === 1, { itemCount: during.itemCount });
  check(`base ${base}: rate restored`, Math.abs(after.rate - base) < 1e-3, { rate: after.rate });
  check(`base ${base}: button label restored`, after.result === before.result, { before: before.result, after: after.result });
}

// icon animation: 3 chevrons pulsing with a staggered phase
await setDesired(1);
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(500);
const f1 = await snap();
await page.waitForTimeout(260);
const f2 = await snap();
const changed = f1.chevrons.some((v, i) => Math.abs(v - f2.chevrons[i]) > 0.02);
check('icon has 3 animated chevrons', f1.animates === 3, { animates: f1.animates });
check('chevron opacities animate', changed, { f1: f1.chevrons, f2: f2.chevrons });
check('chevron phase is staggered', new Set(f1.chevrons).size >= 2, { chevrons: f1.chevrons });
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(1200);

// short press → seek +5s
await setDesired(1);
const t0 = await page.evaluate(() => document.querySelector('video').currentTime);
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
const t1 = await page.evaluate(() => document.querySelector('video').currentTime);
check('short press seeks +5s', t1 - t0 > 3.5, { delta: +(t1 - t0).toFixed(2) });

// blur cancels boost
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(600);
await page.evaluate(() => window.dispatchEvent(new Event('blur')));
await page.waitForTimeout(200);
const blurred = await snap();
await page.keyboard.up('ArrowRight');
check('blur cancels boost', !blurred.hintShown && Math.abs(blurred.rate - 1) < 1e-3, blurred);

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
await ctx.close();
process.exit(failed ? 1 : 0);
