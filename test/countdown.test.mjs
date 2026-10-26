import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

function loadFns() {
  const src = read('app.js');
  const start = src.indexOf('/* COUNTDOWN_FNS */');
  const end = src.indexOf('/* /COUNTDOWN_FNS */');
  if (start < 0 || end < 0) throw new Error('Countdown functions are not in app.js yet');
  const body = src.slice(start + '/* COUNTDOWN_FNS */'.length, end);
  return new Function(`${body}\nreturn { COUNTDOWN_ZONE, COUNTDOWN_DEFAULT_DATE, COUNTDOWN_DEFAULT_LABEL, COUNTDOWN_LAYOUT_ID, zoneYMD, daysUntilDate, countdownView, normalizeLayoutIds, cleanCountdownSettings };`)();
}

const known = {
  time: { private: false },
  count: { private: false },
  ev: { private: true },
  board: { private: true },
};

test('defaults to June 1, 2027 in America/Los_Angeles', () => {
  const fn = loadFns();
  assert.equal(fn.COUNTDOWN_ZONE, 'America/Los_Angeles');
  assert.equal(fn.COUNTDOWN_DEFAULT_DATE, '2027-06-01');
  assert.equal(fn.COUNTDOWN_DEFAULT_LABEL, 'June 1, 2027');
  assert.equal(fn.COUNTDOWN_LAYOUT_ID, 'count');
});

test('counts calendar days until the target in Pacific time', () => {
  const { daysUntilDate, zoneYMD } = loadFns();
  const zone = 'America/Los_Angeles';
  // 11:00 Pacific on Oct 25, 2026 (PDT, UTC-7).
  const oct = new Date('2026-10-25T18:00:00Z');
  assert.equal(zoneYMD(oct, zone), '2026-10-25');
  assert.equal(daysUntilDate('2027-06-01', oct, zone), 219);
  assert.equal(daysUntilDate('2026-10-26', oct, zone), 1);
  assert.equal(daysUntilDate('2026-10-25', oct, zone), 0);
  assert.equal(daysUntilDate('2026-10-24', oct, zone), -1);
});

test('uses the Pacific calendar date across daylight-saving boundaries', () => {
  const { zoneYMD, daysUntilDate } = loadFns();
  const zone = 'America/Los_Angeles';
  // Spring forward 2026-03-08 02:00 PST. Midnight that morning is 08:00 UTC.
  assert.equal(zoneYMD(new Date('2026-03-08T07:59:00Z'), zone), '2026-03-07');
  assert.equal(zoneYMD(new Date('2026-03-08T08:00:00Z'), zone), '2026-03-08');
  // Fall back 2026-11-01 02:00 PDT. Midnight Nov 1 is still PDT (07:00 UTC).
  assert.equal(zoneYMD(new Date('2026-11-01T06:59:00Z'), zone), '2026-10-31');
  assert.equal(zoneYMD(new Date('2026-11-01T07:00:00Z'), zone), '2026-11-01');
  // The next midnight is PST (08:00 UTC).
  assert.equal(zoneYMD(new Date('2026-11-02T07:59:00Z'), zone), '2026-11-01');
  assert.equal(zoneYMD(new Date('2026-11-02T08:00:00Z'), zone), '2026-11-02');
  // June 1, 2027 is PDT. 06:59 UTC is still May 31.
  assert.equal(daysUntilDate('2027-06-01', new Date('2027-06-01T06:59:00Z'), zone), 1);
  assert.equal(daysUntilDate('2027-06-01', new Date('2027-06-01T07:00:00Z'), zone), 0);
  assert.equal(daysUntilDate('2027-06-01', new Date('2027-06-02T06:59:00Z'), zone), 0);
  assert.equal(daysUntilDate('2027-06-01', new Date('2027-06-02T07:00:00Z'), zone), -1);
});

test('wording for tomorrow, the day itself, and after the date', () => {
  const { countdownView } = loadFns();
  const at = (iso) => countdownView('2027-06-01', 'June 1, 2027', new Date(iso));
  const before = at('2026-10-25T18:00:00Z');
  assert.equal(before.days, 219);
  assert.equal(before.number, '219');
  assert.equal(before.unit, 'days');
  assert.equal(before.word, false);
  assert.equal(before.label, 'June 1, 2027');

  const tomorrow = at('2027-05-31T18:00:00Z');
  assert.equal(tomorrow.days, 1);
  assert.equal(tomorrow.number, '1');
  assert.equal(tomorrow.unit, 'day');

  const today = at('2027-06-01T18:00:00Z');
  assert.equal(today.days, 0);
  assert.equal(today.number, 'Today');
  assert.equal(today.unit, '');
  assert.equal(today.word, true);

  const yesterday = at('2027-06-02T18:00:00Z');
  assert.equal(yesterday.days, -1);
  assert.equal(yesterday.number, '1');
  assert.equal(yesterday.unit, 'day ago');

  const later = at('2027-06-06T18:00:00Z');
  assert.equal(later.days, -5);
  assert.equal(later.number, '5');
  assert.equal(later.unit, 'days ago');
});

test('blank or invalid date and label fall back to the defaults', () => {
  const { countdownView, cleanCountdownSettings } = loadFns();
  const view = countdownView('nope', '   ', new Date('2026-10-25T18:00:00Z'));
  assert.equal(view.date, '2027-06-01');
  assert.equal(view.label, 'June 1, 2027');
  assert.equal(view.days, 219);
  assert.deepEqual(cleanCountdownSettings('2027-02-31', '  Move-in  '), { date: '2027-06-01', label: 'Move-in' });
  assert.equal(cleanCountdownSettings('2028-01-02', 'x'.repeat(80)).label.length, 60);
});

test('saved layouts map insp to count and skip unknown ids', () => {
  const { normalizeLayoutIds } = loadFns();
  assert.deepEqual(normalizeLayoutIds(['time', 'insp', 'nope', 'ev'], known, false), ['time', 'count', 'ev']);
  assert.deepEqual(normalizeLayoutIds(['insp', 'count', 'time'], known, false), ['count', 'time']);
  assert.deepEqual(normalizeLayoutIds(['board', 'insp', 'ghost'], known, true), ['count']);
  assert.deepEqual(normalizeLayoutIds([], known, false), []);
  assert.equal(normalizeLayoutIds(null, known, false), null);
  assert.equal(normalizeLayoutIds('insp', known, false), null);
});

test('inspections are gone from the app and the countdown id is count', () => {
  const app = read('app.js');
  const sw = read('sw.js');
  const readme = read('README.md');
  const script = read('apps-script/BauderHomeFeed.gs');
  const sample = read('umbrel/bauder-hq.sample.json');
  const compose = read('docker-compose.yml');
  const css = read('styles.css');
  for (const [name, text] of [['app.js', app], ['BauderHomeFeed.gs', script], ['bauder-hq.sample.json', sample], ['docker-compose.yml', compose], ['styles.css', css]]) {
    assert.doesNotMatch(text, /inspections/i, name);
  }
  assert.doesNotMatch(readme, /"inspections"/);
  assert.match(readme, /Countdown/);
  assert.match(readme, /June 1, 2027/);
  assert.match(readme, /Pacific time/);
  assert.match(app, /insp:\s*'count'/);
  assert.doesNotMatch(app, /'insp'|wInsp|WIDGET_INFO[\s\S]{0,800}insp:/);
  assert.match(app, /main:\s*\[[^\]]*'\s*count\s*'/);
  assert.match(sw, /bauder-home-v10/);
  assert.match(script, /EV/);
  assert.doesNotMatch(script, /INSPECTIONS/);
});
