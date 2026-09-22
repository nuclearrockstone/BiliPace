/**
 * Content script — multi-level title tag matching across different videos
 * (non-multipart navigation).
 *
 * Reference titles:
 *   - "歌" only      : e.g. "热歌合集丨《若月亮没来》…"
 *   - "周杰伦" only  : e.g. "周杰伦采访时说梦话"
 *   - both           : e.g. "50分钟华语抒情歌单（周杰伦作曲/热歌/听歌）"
 *
 * When several rules match the same title, the topmost rule wins. Switching to
 * a completely different video (a full navigation, not a 分P change) must
 * re-match the title and apply the right rate — including an in-page SPA switch
 * via a recommendation card, where the new rate must differ from the old one.
 *
 * Videos are non-multipart (parts <= 1) and can be overridden with
 * E2E_SONG_VIDEO / E2E_JAY_VIDEO / E2E_BOTH_VIDEO.
 */
import { snap, gotoVideo, videoTitle, partCount, setStorage, resetStorage } from '../harness.mjs';

const SONG = process.env.E2E_SONG_VIDEO || 'https://www.bilibili.com/video/BV1awR2Y8Epe/';
const JAY = process.env.E2E_JAY_VIDEO || 'https://www.bilibili.com/video/BV1QHNb6EE6e/';
const BOTH = process.env.E2E_BOTH_VIDEO || 'https://www.bilibili.com/video/BV1S3hB6MEBU/';

const JAY_FIRST = [
  { id: 'jay', keyword: '周杰伦', rate: 1.25 },
  { id: 'song', keyword: '歌', rate: 2 },
];
const SONG_FIRST = [
  { id: 'song', keyword: '歌', rate: 2 },
  { id: 'jay', keyword: '周杰伦', rate: 1.25 },
];

export default async function run({ page, extPage, report }) {
  const { check } = report;

  await resetStorage(extPage);
  await page.waitForTimeout(200);

  // multi-level rules: 周杰伦 has higher priority than 歌
  await setStorage(extPage, { titleRules: JAY_FIRST, titleMatchEnabled: true });
  await page.waitForTimeout(300);

  // --- video containing only "歌" -----------------------------------------
  await gotoVideo(page, SONG);
  let title = await videoTitle(page);
  let parts = await partCount(page);
  let s = await snap(page);
  check('song video is non-multipart', parts <= 1, { parts });
  check('song video title contains 歌', title.includes('歌'), { title });
  check('song video matches 歌 rule (2x)', Math.abs(s.rate - 2) < 1e-3, { title, rate: s.rate });
  check('song video label is 2.0x', s.result === '2.0x', { result: s.result });

  // --- different video containing only "周杰伦" ---------------------------
  await gotoVideo(page, JAY);
  title = await videoTitle(page);
  parts = await partCount(page);
  s = await snap(page);
  check('jay video is non-multipart', parts <= 1, { parts });
  check('jay video title contains 周杰伦', title.includes('周杰伦'), { title });
  check('jay video matches 周杰伦 rule (1.25x)', Math.abs(s.rate - 1.25) < 1e-3, { title, rate: s.rate });
  check('jay video label is 1.25x', s.result === '1.25x', { result: s.result });

  // --- video containing BOTH keywords -> topmost rule wins ----------------
  await gotoVideo(page, BOTH);
  title = await videoTitle(page);
  parts = await partCount(page);
  s = await snap(page);
  check('both video is non-multipart', parts <= 1, { parts });
  check('both video title has 歌 and 周杰伦', title.includes('歌') && title.includes('周杰伦'), { title });
  check('multi-level: top rule 周杰伦 wins (1.25x)', Math.abs(s.rate - 1.25) < 1e-3, { title, rate: s.rate });

  // --- reorder rules live -> priority flips -------------------------------
  await setStorage(extPage, { titleRules: SONG_FIRST });
  await page.waitForTimeout(900);
  s = await snap(page);
  check('multi-level: reordered top rule 歌 wins (2x)', Math.abs(s.rate - 2) < 1e-3, { rate: s.rate });

  // --- switching videos from the "歌"-only video to "周杰伦"-only video ---
  await gotoVideo(page, SONG);
  s = await snap(page);
  check('song video again applies 2x', Math.abs(s.rate - 2) < 1e-3, { rate: s.rate });
  await gotoVideo(page, JAY);
  s = await snap(page);
  check('switch song -> jay applies 1.25x', Math.abs(s.rate - 1.25) < 1e-3, { rate: s.rate });

  // --- SPA switch via a recommendation card -------------------------------
  // Restore 周杰伦-first so the "both" source is 1.25x; then navigate in-page to
  // a 歌-only recommendation, which must re-match to 2x (proving a real re-match).
  await setStorage(extPage, { titleRules: JAY_FIRST });
  await gotoVideo(page, BOTH);
  const beforeRate = (await snap(page)).rate;
  const before = await page.evaluate(() => location.href);
  const target = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('a[href*="/video/BV"]')]
      .map(a => ({ a, card: a.closest('.card-box') }))
      .filter(x => x.card && /歌/.test(x.card.textContent) && !/周杰伦/.test(x.card.textContent));
    if (!cards.length) return null;
    cards[0].a.setAttribute('data-e2e-target', '1');
    cards[0].a.scrollIntoView({ block: 'center' });
    return cards[0].a.href.split('?')[0];
  });
  if (target) {
    // a trusted click is required for Bilibili's router to render the new video
    await page.click('a[data-e2e-target="1"]');
    await page.waitForTimeout(7000);
    const after = await page.evaluate(() => location.href);
    const newTitle = await videoTitle(page);
    s = await snap(page);
    console.log(`  SPA: ${before} -> ${after}`);
    console.log(`      title=${JSON.stringify(newTitle)} beforeRate=${beforeRate} actual=${s.rate}`);
    check('SPA switch navigated to another video', after.includes(target), { before, after, target });
    check('SPA target title contains 歌 (no 周杰伦)', newTitle.includes('歌') && !newTitle.includes('周杰伦'), { newTitle });
    check('SPA switch re-matches title rule (1.25x -> 2x)',
      Math.abs(beforeRate - 1.25) < 1e-3 && Math.abs(s.rate - 2) < 1e-3, { beforeRate, rate: s.rate });
  } else {
    check('SPA switch: found a 歌-only recommendation card', false, { skipped: true });
  }
}
