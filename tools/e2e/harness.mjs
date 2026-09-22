/**
 * Shared Playwright harness for the BiliPace e2e suite.
 *
 * Loads the unpacked extension into Chromium and provides tiny helpers for
 * assertions, storage access, and snapping the player/DOM state.
 */
import { chromium } from 'playwright-core';

export const EXE = process.env.CHROMIUM ||
  'C:/Users/nucle/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';

/** Same defaults as content/config.js + popup/js/config.js. */
export const DEFAULTS = {
  min: 0.1,
  max: 4,
  step: 0.01,
  fineStep: 0.05,
  presets: [0.5, 0.75, 1, 1.25, 1.5, 2, 3],
  titleRules: [],
  titleMatchEnabled: true,
  rate: null,
};

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export class Report {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    // bind so specs can destructure `const { check } = report`
    this.check = this.check.bind(this);
    this.section = this.section.bind(this);
    this.summary = this.summary.bind(this);
  }
  section(title) {
    console.log(`\n=== ${title} ===`);
  }
  check(name, cond, extra) {
    if (cond) {
      this.passed++;
      console.log(`PASS  ${name}`);
    } else {
      this.failed++;
      console.log(`FAIL  ${name}${extra !== undefined ? '  ' + JSON.stringify(extra) : ''}`);
    }
  }
  summary() {
    console.log(`\n${this.passed} passed, ${this.failed} failed`);
    return this.failed;
  }
}

export async function launch(extRoot) {
  const ext = extRoot.replace(/\\/g, '/');
  return chromium.launchPersistentContext('', {
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
}

/** Resolve the unpacked extension id from chrome://extensions. */
export async function extensionId(ctx) {
  const page = await ctx.newPage();
  await page.goto('chrome://extensions/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const id = await page.evaluate(() => {
    const item = document.querySelector('extensions-manager')?.shadowRoot
      ?.querySelector('extensions-item-list')?.shadowRoot?.querySelector('extensions-item');
    return item ? item.id : null;
  });
  await page.close();
  return id;
}

export async function openPopup(ctx, extId) {
  const page = await ctx.newPage();
  await page.goto(`chrome-extension://${extId}/src/popup/popup.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  return page;
}

export async function gotoVideo(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(7000);
  await page.evaluate(() => {
    const v = document.querySelector('video');
    if (v) { v.muted = true; v.play().catch(() => {}); }
  });
  await page.waitForTimeout(1500);
  // wait for the title element to render (some recommendations are slow)
  const start = Date.now();
  while (Date.now() - start < 10000) {
    if (await videoTitle(page)) break;
    await page.waitForTimeout(500);
  }
}

export const videoTitle = page => page.evaluate(() => {
  const t = document.querySelector('.video-info-title h1.video-title');
  return ((t && (t.getAttribute('data-title') || t.textContent)) || '').trim();
});

export const partCount = page => page.evaluate(() =>
  document.querySelectorAll('.video-pod__item').length);

export async function openVideo(ctx, url) {
  const page = await ctx.newPage();
  await gotoVideo(page, url);
  return page;
}

/* ---- chrome.storage helpers (run from an extension page) ---- */

export const setStorage = (page, obj) =>
  page.evaluate(o => new Promise(res => chrome.storage.sync.set(o, res)), obj);

export const getStorage = (page, keys) =>
  page.evaluate(k => new Promise(res => chrome.storage.sync.get(k, res)), keys);

export const resetStorage = page => setStorage(page, DEFAULTS);

/* ---- player snapshots ---- */

export const snap = page => page.evaluate(() => {
  const v = document.querySelector('video');
  const result = document.querySelector('.bpx-player-ctrl-playbackrate-result');
  const hint = document.querySelector('.bpx-player-three-playrate-hint');
  const sel = document.querySelector('.bpx-player-three-playrate-hint-carousel-item-selected');
  const car = document.querySelector('.bpx-player-three-playrate-hint-carousel');
  const list = document.querySelector('.bpx-player-three-playrate-hint-carousel-list');
  const menu = document.querySelector('.bprft-menu');
  const slider = document.querySelector('.bprft-slider');
  const center = x => (x ? Math.round((x.top + x.bottom) / 2) : null);
  return {
    rate: v?.playbackRate,
    result: result?.textContent,
    hintShown: hint ? getComputedStyle(hint).display !== 'none' : false,
    centered: sel && car ? center(sel.getBoundingClientRect()) === center(car.getBoundingClientRect()) : false,
    selText: sel?.textContent,
    animates: hint ? hint.querySelectorAll('svg animate').length : 0,
    chevrons: hint
      ? [...hint.querySelectorAll('svg > g > g')].map(g => +(+getComputedStyle(g).opacity).toFixed(3))
      : [],
    itemCount: hint ? hint.querySelectorAll('.bpx-player-three-playrate-hint-carousel-item').length : 0,
    transform: list?.style.transform,
    menuExists: !!menu,
    menuOpen: menu ? menu.classList.contains('is-open') : false,
    nativeMenuRemoved: !document.querySelector('.bpx-player-ctrl-playbackrate-menu'),
    value: document.querySelector('.bprft-value')?.textContent,
    inputVal: document.querySelector('.bprft-input')?.value,
    activeChips: [...document.querySelectorAll('.bprft-chip.is-active')].map(c => c.dataset.value),
    chipCount: document.querySelectorAll('.bprft-chip').length,
    sliderMin: slider?.min,
    sliderMax: slider?.max,
    sliderStep: slider?.step,
    fill: slider?.style.getPropertyValue('--fill'),
  };
});

/** Drive the extension slider (works even while the menu is hidden). */
export async function setDesired(page, r) {
  await page.evaluate(v => {
    const s = document.querySelector('.bprft-slider');
    s.value = String(v);
    s.dispatchEvent(new Event('input', { bubbles: true }));
  }, r);
  await page.waitForTimeout(400);
}

/** Click an element via DOM (menu may be visibility:hidden). */
export const domClick = (page, selector) =>
  page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (!el) throw new Error('not found: ' + sel);
    el.click();
  }, selector);
