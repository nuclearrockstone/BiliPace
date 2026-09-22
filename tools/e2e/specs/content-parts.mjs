/**
 * Content script — multi-part (分P) switching keeps the desired rate.
 *
 * Bilibili calls video.load() when switching parts; per spec that resets
 * playbackRate to defaultPlaybackRate (1) and fires ratechange. The extension
 * must treat that as a programmatic reset (keep + re-apply the desired rate)
 * and not as a new user intent.
 */
import { snap, setDesired } from '../harness.mjs';

async function switchPart(page, idx) {
  const label = await page.evaluate(i => {
    const items = [...document.querySelectorAll('.video-pod__item, .list-box .list-item')];
    const target = items[i];
    if (!target) return null;
    target.scrollIntoView();
    target.click();
    return target.textContent.trim().slice(0, 24);
  }, idx);
  await page.waitForTimeout(6000);
  return label;
}

export default async function run({ page, report }) {
  const { check } = report;

  await setDesired(page, 1.5);
  let s = await snap(page);
  check('baseline set to 1.5 before switching', Math.abs(s.rate - 1.5) < 1e-3, s);

  const to = await switchPart(page, 1);
  console.log(`  switched part 1 -> ${JSON.stringify(to)}`);
  let after = await snap(page);
  check('rate kept after switching part', Math.abs(after.rate - 1.5) < 1e-3, after);
  check('button label kept after switching part', after.result === '1.5x', after);

  const back = await switchPart(page, 0);
  console.log(`  switched part back -> ${JSON.stringify(back)}`);
  after = await snap(page);
  check('rate kept after switching back', Math.abs(after.rate - 1.5) < 1e-3, after);

  // external change outside a switch is still adopted
  await page.evaluate(() => { document.querySelector('video').playbackRate = 1.75; });
  await page.waitForTimeout(1200);
  after = await snap(page);
  check('external rate adopted after switch flow', Math.abs(after.rate - 1.75) < 1e-3, after);
  check('UI label follows external rate', after.result === '1.75x', after);
}
