/**
 * Settings popup — load/save/reset, validation, preset & rule editing,
 * priority sorting, panel collapse persistence, auto-add, i18n and assets.
 */
import { resetStorage, getStorage, sleep, DEFAULTS } from '../harness.mjs';

async function reloadPopup(extPage) {
  await extPage.reload({ waitUntil: 'domcontentloaded' });
  await extPage.waitForTimeout(700);
}

const snapPopup = p => p.evaluate(() => ({
  title: document.title,
  min: document.getElementById('min')?.value,
  max: document.getElementById('max')?.value,
  step: document.getElementById('step')?.value,
  fineStep: document.getElementById('fineStep')?.value,
  presetRows: document.querySelectorAll('#presets .preset-row').length,
  presetValues: [...document.querySelectorAll('#presets input')].map(i => +i.value),
  ruleRows: [...document.querySelectorAll('#titleRules .rule-row')].map(r => ({
    kw: r.querySelector('.rule-keyword')?.value,
    rate: +(r.querySelector('.rule-rate')?.value || 0),
  })),
  titleMatch: document.getElementById('titleMatchEnabled')?.checked,
  collapsed: [...document.querySelectorAll('.panel')].map(p => p.classList.contains('collapsed')),
  status: document.getElementById('status')?.textContent,
  statusIsErr: document.getElementById('status')?.className === 'err',
  logoLoaded: (() => {
    const i = document.querySelector('img.logo');
    return i ? i.complete && i.naturalWidth > 0 : false;
  })(),
}));

export default async function run({ extPage, page, report }) {
  const { check } = report;

  const errors = [];
  extPage.on('pageerror', e => errors.push(String(e)));
  extPage.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  // clean slate: panels default + storage defaults
  await extPage.evaluate(() => localStorage.clear());
  await resetStorage(extPage);
  await reloadPopup(extPage);

  // --- defaults / i18n / assets -------------------------------------------
  let s = await snapPopup(extPage);
  check('popup localized title', /BiliPace/.test(s.title || ''), { title: s.title });
  check('popup icon asset resolves', s.logoLoaded);
  check('default min loaded', s.min === '0.1', { min: s.min });
  check('default max loaded', s.max === '4', { max: s.max });
  check('default step loaded', s.step === '0.01', { step: s.step });
  check('default fineStep loaded', s.fineStep === '0.05', { fineStep: s.fineStep });
  check('default presets rendered', s.presetRows === 7, { presetRows: s.presetRows });
  check('title matching on by default', s.titleMatch === true);

  // --- panel collapse + localStorage persistence ---------------------------
  check('panels collapsed by default', s.collapsed.every(Boolean), { collapsed: s.collapsed });
  await extPage.click('.panel[data-panel="range"] .panel-head');
  await sleep(150);
  s = await snapPopup(extPage);
  check('clicking header expands panel', s.collapsed[0] === false, { collapsed: s.collapsed });
  await reloadPopup(extPage);
  s = await snapPopup(extPage);
  check('expanded panel state persists', s.collapsed[0] === false, { collapsed: s.collapsed });

  // expand the remaining panels so their controls become actionable
  await extPage.click('.panel[data-panel="presets"] .panel-head');
  await extPage.click('.panel[data-panel="titleMatch"] .panel-head');
  await sleep(150);

  // --- stepper --------------------------------------------------------------
  const beforeStep = await extPage.inputValue('#min');
  await extPage.evaluate(() =>
    document.querySelector('#min').closest('.stepper').querySelector('.inc').click());
  await sleep(120);
  const afterStep = await extPage.inputValue('#min');
  check('stepper increments by step', Math.abs((+afterStep - +beforeStep) - 0.05) < 1e-6, { beforeStep, afterStep });

  // --- preset add / remove --------------------------------------------------
  let rows = (await snapPopup(extPage)).presetRows;
  await extPage.click('#addPreset');
  await sleep(120);
  check('add preset row', (await snapPopup(extPage)).presetRows === rows + 1);
  await extPage.evaluate(() =>
    [...document.querySelectorAll('#presets .preset-row .del')].pop().click());
  await sleep(120);
  check('remove preset row', (await snapPopup(extPage)).presetRows === rows);

  // --- add rule + save persistence ------------------------------------------
  await extPage.click('#addTitleRule');
  await sleep(150);
  await extPage.evaluate(() => {
    const row = document.querySelector('#titleRules .rule-row');
    row.querySelector('.rule-keyword').value = '教程';
    row.querySelector('.rule-rate').value = '2.5';
  });
  await extPage.click('#save');
  await sleep(400);
  let stored = await getStorage(extPage, { titleRules: [], titleMatchEnabled: true });
  check('save persists title rule',
    stored.titleRules.length === 1 && stored.titleRules[0].keyword === '教程' && stored.titleRules[0].rate === 2.5,
    stored.titleRules);
  await reloadPopup(extPage);
  s = await snapPopup(extPage);
  check('saved rule re-rendered after reload',
    s.ruleRows.length === 1 && s.ruleRows[0].kw === '教程', s.ruleRows);

  // --- range settings save --------------------------------------------------
  await extPage.fill('#min', '0.5');
  await extPage.fill('#max', '3');
  await extPage.fill('#step', '0.1');
  await extPage.fill('#fineStep', '0.2');
  await extPage.click('#save');
  await sleep(400);
  stored = await getStorage(extPage, { min: null, max: null, step: null, fineStep: null });
  check('save persists range settings',
    stored.min === 0.5 && stored.max === 3 && stored.step === 0.1 && stored.fineStep === 0.2, stored);

  // --- validation -----------------------------------------------------------
  await extPage.fill('#min', '5');
  await extPage.fill('#max', '1');
  await extPage.click('#save');
  await sleep(200);
  s = await snapPopup(extPage);
  check('min >= max rejected with error', s.statusIsErr && s.status.length > 0, { status: s.status });
  stored = await getStorage(extPage, { min: null, max: null });
  check('invalid min/max not saved', stored.min === 0.5 && stored.max === 3, stored);

  await extPage.fill('#min', '0.5');
  await extPage.fill('#max', '3');
  await extPage.fill('#step', '0');
  await extPage.click('#save');
  await sleep(200);
  s = await snapPopup(extPage);
  check('step <= 0 rejected with error', s.statusIsErr, { status: s.status });

  // --- rule delete ----------------------------------------------------------
  await extPage.fill('#step', '0.1'); // restore a valid step so the next save goes through
  await extPage.evaluate(() => document.querySelector('#titleRules .rule-row .del').click());
  await sleep(120);
  await extPage.click('#save');
  await sleep(400);
  stored = await getStorage(extPage, { titleRules: [] });
  check('deleted rule removed from storage', stored.titleRules.length === 0, stored.titleRules);

  // --- rule keyboard priority ----------------------------------------------
  await extPage.click('#addTitleRule');
  await extPage.click('#addTitleRule');
  await sleep(150);
  await extPage.evaluate(() => {
    const rows = [...document.querySelectorAll('#titleRules .rule-row')];
    rows[0].querySelector('.rule-keyword').value = 'AAA';
    rows[1].querySelector('.rule-keyword').value = 'BBB';
    rows[0].querySelector('.drag-handle')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  });
  await sleep(150);
  s = await snapPopup(extPage);
  check('keyboard ArrowDown moves rule down',
    s.ruleRows[0]?.kw === 'BBB' && s.ruleRows[1]?.kw === 'AAA', s.ruleRows);

  // --- rule drag priority ---------------------------------------------------
  const handles = extPage.locator('#titleRules .rule-row .drag-handle');
  const h0 = await handles.nth(0).boundingBox();
  const h1 = await handles.nth(1).boundingBox();
  if (h0 && h1) {
    await extPage.mouse.move(h0.x + h0.width / 2, h0.y + h0.height / 2);
    await extPage.mouse.down();
    await extPage.mouse.move(h1.x + h1.width / 2, h1.y + h1.height / 2 + 12, { steps: 8 });
    await extPage.mouse.up();
    await sleep(150);
    s = await snapPopup(extPage);
    check('drag handle reorders rules', s.ruleRows[0]?.kw === 'AAA', s.ruleRows);
  } else {
    check('drag handle reorders rules', false, { h0, h1 });
  }

  // --- auto add current video (active tab = player) -------------------------
  await resetStorage(extPage);
  await reloadPopup(extPage);
  await page.bringToFront();
  await extPage.evaluate(() => document.getElementById('autoAddTitle').click());
  await sleep(900);
  s = await snapPopup(extPage);
  check('auto-add created rule from current video',
    s.ruleRows.length >= 1 && s.ruleRows[0].kw.length > 0 && s.ruleRows[0].rate > 0, s.ruleRows);
  await page.bringToFront();

  // --- reset to defaults ----------------------------------------------------
  await extPage.click('#reset');
  await sleep(500);
  stored = await getStorage(extPage, { min: null, max: null, presets: [] });
  check('reset restores default storage',
    stored.min === DEFAULTS.min && stored.max === DEFAULTS.max &&
    JSON.stringify(stored.presets) === JSON.stringify(DEFAULTS.presets), stored);
  await reloadPopup(extPage);
  s = await snapPopup(extPage);
  check('reset restores default UI', s.min === '0.1' && s.presetRows === 7, s);

  check('popup has no console/page errors', errors.length === 0, { errors });
}
