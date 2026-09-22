/**
 * Content script — long-press ArrowRight boost (×2), native hint UI,
 * short-press seek, and blur/visibility cancellation.
 */
import { snap, setDesired } from '../harness.mjs';

export default async function run({ page, report }) {
  const { check } = report;

  for (const base of [1, 1.5, 2, 1.25]) {
    await setDesired(page, base);
    const expectBoost = Math.round(Math.min(4, base * 2) * 100) / 100;
    const before = await snap(page);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(700);
    const during = await snap(page);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(1800);
    const after = await snap(page);

    check(`base ${base}: boost rate = ${expectBoost}`, Math.abs(during.rate - expectBoost) < 1e-3, { rate: during.rate });
    check(`base ${base}: hint shown`, during.hintShown);
    check(`base ${base}: number centered`, during.centered, { sel: during.selText, transform: during.transform });
    check(`base ${base}: hint label = ${expectBoost}X`, during.selText === `${expectBoost}X`.replace('.0X', 'X'), { selText: during.selText });
    check(`base ${base}: no semi-transparent neighbours`, during.itemCount === 1, { itemCount: during.itemCount });
    check(`base ${base}: rate restored`, Math.abs(after.rate - base) < 1e-3, { rate: after.rate });
    check(`base ${base}: button label restored`, after.result === before.result, { before: before.result, after: after.result });
  }

  // icon animation: 3 chevrons pulsing with a staggered phase
  await setDesired(page, 1);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(400);
  const frames = [];
  for (let i = 0; i < 3; i++) {
    frames.push(await snap(page));
    await page.waitForTimeout(300);
  }
  const f1 = frames[0];
  const changed = frames.slice(1).some(f =>
    f.chevrons.some((v, i) => Math.abs(v - f1.chevrons[i]) > 0.02));
  check('icon has 3 animated chevrons', f1.animates === 3, { animates: f1.animates });
  check('chevron opacities animate', changed, { frames: frames.map(f => f.chevrons) });
  check('chevron phase is staggered', new Set(f1.chevrons).size >= 2, { chevrons: f1.chevrons });
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(1200);

  // short press → seek +5s
  await setDesired(page, 1);
  const t0 = await page.evaluate(() => document.querySelector('video').currentTime);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  const t1 = await page.evaluate(() => document.querySelector('video').currentTime);
  check('short press seeks +5s', t1 - t0 > 3.5, { delta: +(t1 - t0).toFixed(2) });

  // blur cancels boost
  await setDesired(page, 1);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(600);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(200);
  const blurred = await snap(page);
  await page.keyboard.up('ArrowRight');
  check('blur cancels boost', !blurred.hintShown && Math.abs(blurred.rate - 1) < 1e-3, blurred);
}
