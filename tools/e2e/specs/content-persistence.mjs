/**
 * Content script — rate is persisted to chrome.storage and restored on reload.
 */
import { snap, setDesired, getStorage, resetStorage } from '../harness.mjs';

export default async function run({ page, extPage, report }) {
  const { check } = report;

  await resetStorage(extPage);
  await page.waitForTimeout(200);
  await setDesired(page, 1.75);
  await page.waitForTimeout(700); // persist debounce (300ms)

  const stored = await getStorage(extPage, { rate: null });
  check('rate persisted to chrome.storage', Math.abs(stored.rate - 1.75) < 1e-3, stored);

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(8000);
  await page.evaluate(() => {
    const v = document.querySelector('video');
    if (v) { v.muted = true; v.play().catch(() => {}); }
  });
  await page.waitForTimeout(1500);

  const s = await snap(page);
  check('rate restored after page reload', Math.abs(s.rate - 1.75) < 1e-3, s);
  check('label restored after page reload', s.result === '1.75x', { result: s.result });
}
