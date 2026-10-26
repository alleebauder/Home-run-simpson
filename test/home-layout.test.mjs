import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

function getLayoutHelpers() {
  const src = read('app.js');
  const start = src.indexOf('/* HOME_LAYOUT_FNS */');
  const end = src.indexOf('/* /HOME_LAYOUT_FNS */');
  assert.ok(start >= 0 && end > start, 'dashboard layout helpers must exist');
  const body = src.slice(start + '/* HOME_LAYOUT_FNS */'.length, end);
  return new Function(`${body}\nreturn { moveHomeLayoutItem, hideHomeLayoutItem, addHomeLayoutItem };`)();
}

const KNOWN = {
  time: ['Time', 'wide'],
  status: ['House', 'small'],
  tasks: ['Tasks', 'tall', true],
  cam: ['Cameras', 'small'],
};

test('moving widgets preserves every item and never mutates the saved list', () => {
  const { moveHomeLayoutItem } = getLayoutHelpers();
  const original = ['time', 'status', 'tasks', 'cam'];
  assert.deepEqual(moveHomeLayoutItem(original, 'cam', 'status'), ['time', 'cam', 'status', 'tasks']);
  assert.deepEqual(moveHomeLayoutItem(original, 'time', 'cam'), ['status', 'tasks', 'cam', 'time']);
  assert.deepEqual(original, ['time', 'status', 'tasks', 'cam']);
});

test('invalid and no-op drags leave the original layout untouched', () => {
  const { moveHomeLayoutItem } = getLayoutHelpers();
  const original = ['time', 'status', 'tasks'];
  for (const args of [['time', 'time'], ['missing', 'tasks'], ['status', 'unknown']]) {
    assert.equal(moveHomeLayoutItem(original, ...args), original);
  }
  assert.equal(moveHomeLayoutItem(null, 'time', 'status'), null);
});

test('hiding and adding widgets never duplicates or exposes private widgets in guest mode', () => {
  const { hideHomeLayoutItem, addHomeLayoutItem } = getLayoutHelpers();
  const original = ['time', 'status'];
  assert.deepEqual(hideHomeLayoutItem(original, 'time'), ['status']);
  assert.equal(hideHomeLayoutItem(original, 'missing'), original);
  assert.deepEqual(addHomeLayoutItem(original, 'cam', KNOWN, false), ['time', 'status', 'cam']);
  assert.deepEqual(addHomeLayoutItem(original, 'tasks', KNOWN, false), ['time', 'status', 'tasks']);
  assert.equal(addHomeLayoutItem(original, 'tasks', KNOWN, true), original);
  assert.equal(addHomeLayoutItem(original, 'status', KNOWN, false), original);
  assert.equal(addHomeLayoutItem(original, 'unknown', KNOWN, false), original);
});

test('dashboard editor prevents accidental device actions and respects private profiles', () => {
  const app = read('app.js');
  const css = read('styles.css');
  const readme = read('README.md');
  assert.match(app, /homeEditMode && privateOK\(\)/);
  assert.match(app, /if \(!homeEditMode \|\| !privateOK\(\)\) return;/);
  assert.match(app, /class="home-edit-preview" inert/);
  assert.match(app, /data-home-grip/);
  assert.match(app, /data-act="home-hide"/);
  assert.match(app, /data-act="home-add"/);
  assert.match(app, /bindHomeDragging\(\);/);
  assert.match(app, /return homeEditMode \|\| !!ringing/);
  assert.match(css, /\.home-drag-grip[\s\S]*?touch-action: none/);
  assert.match(css, /\.home-edit-action:focus-visible/);
  assert.match(readme, /Tap Customize in the top bar/);
});

test('updated offline cache picks up the new styles and logic', () => {
  const sw = read('sw.js');
  assert.match(sw, /bauder-home-v14/);
  assert.match(sw, /\.\/app\.js/);
  assert.match(sw, /\.\/styles\.css/);
});
