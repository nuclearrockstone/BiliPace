/**
 * BiliPace end-to-end test suite.
 *
 * Loads the unpacked extension into Chromium (Playwright) and runs every spec
 * under tools/e2e/specs/, covering:
 *   - popup: settings load/save/reset, validation, presets, rules, panels, i18n
 *   - content core: slider / input / +/- / presets / clamping / menu / label sync
 *   - content title: keyword matching, priority, toggle, fallback
 *   - content boost: long-press ArrowRight ×2, native hint, short-press seek
 *   - content parts: multi-part (分P) switch keeps the desired rate
 *   - content switch: multi-level title tag matching across different videos
 *   - content persistence: rate restored after page reload
 *
 * Usage: node tools/e2e.mjs [videoUrl]
 * Requires: playwright-core + a Chromium build (override with CHROMIUM).
 */
import { Report, launch, extensionId, openPopup, openVideo, resetStorage } from './e2e/harness.mjs';
import popup from './e2e/specs/popup.mjs';
import contentCore from './e2e/specs/content-core.mjs';
import contentTitle from './e2e/specs/content-title.mjs';
import contentBoost from './e2e/specs/content-boost.mjs';
import contentParts from './e2e/specs/content-parts.mjs';
import contentSwitch from './e2e/specs/content-switch.mjs';
import contentPersistence from './e2e/specs/content-persistence.mjs';

const URL = process.argv[2] || 'https://www.bilibili.com/video/BV1XZ4y1t7Eh/';
const ext = process.cwd();

const report = new Report();
const ctx = await launch(ext);
const extId = await extensionId(ctx);
if (!extId) {
  console.error('could not resolve extension id');
  await ctx.close();
  process.exit(1);
}

const page = await openVideo(ctx, URL);
const extPage = await openPopup(ctx, extId);
const env = { ctx, page, extPage, report, URL };

const specs = [
  ['popup: settings', popup],
  ['content: core controls', contentCore],
  ['content: title matching', contentTitle],
  ['content: long-press boost', contentBoost],
  ['content: multi-part switch', contentParts],
  ['content: cross-video tag matching', contentSwitch],
  ['content: persistence', contentPersistence],
];

// optional filter, e.g. E2E_ONLY=boost,popup node tools/e2e.mjs
const only = process.env.E2E_ONLY;
const selected = only
  ? specs.filter(([name]) => only.split(',').some(o => name.includes(o.trim())))
  : specs;

for (const [name, spec] of selected) {
  report.section(name);
  await resetStorage(extPage);
  // keep the page under test focused (SVG/visibility behaviour depends on it)
  if (name.startsWith('content')) await page.bringToFront();
  else await extPage.bringToFront();
  await page.waitForTimeout(300);
  try {
    await spec(env);
  } catch (e) {
    report.check(`${name} threw`, false, { error: String((e && e.stack) || e) });
  }
}

const failed = report.summary();
await ctx.close();
process.exit(failed ? 1 : 0);
