/**
 * Content script — title keyword matching (rules, priority, toggle, fallback).
 */
import { snap, setDesired, setStorage, resetStorage } from '../harness.mjs';

export default async function run({ page, extPage, report }) {
  const { check } = report;

  // baseline: remember 1.25x as the fallback rate
  await resetStorage(extPage);
  await page.waitForTimeout(200);
  await setDesired(page, 1.25);
  await page.waitForTimeout(500); // persist debounce

  // --- keyword rule applies -------------------------------------------------
  await setStorage(extPage, {
    titleRules: [{ id: 'r1', keyword: '量子', rate: 2 }],
    titleMatchEnabled: true,
  });
  await page.waitForTimeout(600);
  let s = await snap(page);
  check('matching keyword applies rule rate', Math.abs(s.rate - 2) < 1e-3, s);
  check('label shows rule rate', s.result === '2.0x', { result: s.result });

  // --- top-most matching rule wins -----------------------------------------
  await setStorage(extPage, {
    titleRules: [
      { id: 'r1', keyword: '量子', rate: 1.75 },
      { id: 'r2', keyword: '力学', rate: 2.5 },
    ],
  });
  await page.waitForTimeout(600);
  s = await snap(page);
  check('first matching rule has priority', Math.abs(s.rate - 1.75) < 1e-3, s);

  // --- disabling matching falls back to remembered rate --------------------
  await setStorage(extPage, { titleMatchEnabled: false });
  await page.waitForTimeout(600);
  s = await snap(page);
  check('disabled matching falls back to remembered rate', Math.abs(s.rate - 1.25) < 1e-3, s);

  // --- non-matching rule leaves fallback in place --------------------------
  await setStorage(extPage, {
    titleRules: [{ id: 'r3', keyword: '不存在的关键词XYZ', rate: 3 }],
    titleMatchEnabled: true,
  });
  await page.waitForTimeout(600);
  s = await snap(page);
  check('non-matching rule keeps fallback rate', Math.abs(s.rate - 1.25) < 1e-3, s);
}
