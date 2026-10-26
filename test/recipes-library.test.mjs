import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

function loadLibrary() {
  const sandbox = {};
  new Function('window', 'globalThis', read('recipes-library.js'))(undefined, sandbox);
  return sandbox.BAUDER_RECIPES;
}

function loadMealFns() {
  const src = read('app.js');
  const start = src.indexOf('/* MEAL_FNS */');
  const end = src.indexOf('/* /MEAL_FNS */');
  if (start < 0 || end < 0) throw new Error('Meal planner functions are not in app.js');
  const body = src.slice(start + '/* MEAL_FNS */'.length, end);
  return new Function(`${body}\nreturn { mealWeekDates, mealNodeKey, mealNodesAt, mealPathForId, mealChosenId };`)();
}

const TIMER = /(\d+(?:\.\d+)?)(?:\s*(?:to|-|–|or)\s*(\d+(?:\.\d+)?))?\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/i;

function leaves(nodes, trail = []) {
  const out = [];
  for (const n of nodes || []) {
    if (n.id) out.push({ id: n.id, path: trail });
    else if (n.children) out.push(...leaves(n.children, trail.concat(n.name)));
  }
  return out;
}

test('library has 100 unique recipes, each listed once in the tree', () => {
  const { tree, recipes } = loadLibrary();
  const ids = Object.keys(recipes);
  assert.equal(ids.length, 100);
  assert.equal(new Set(ids).size, 100);
  const titles = ids.map((id) => recipes[id].title);
  assert.equal(new Set(titles).size, 100);
  const found = leaves(tree);
  assert.equal(found.length, 100);
  assert.deepEqual(found.map((l) => l.id).sort(), ids.slice().sort());
  for (const id of ids) {
    const r = recipes[id];
    assert.ok(r.title && r.ingredients.length && r.steps.length, id);
    assert.match(r.steps.join(' '), TIMER, id);
  }
});

test('Mexican chicken tacos and skillet cornbread are in the tree', () => {
  const { tree, recipes } = loadLibrary();
  const found = leaves(tree);
  const tacos = found.filter((l) => l.path.join(' > ') === 'Mexican > Chicken > Tacos').map((l) => l.id);
  assert.ok(tacos.includes('mx-chicken-street-tacos'));
  assert.equal(recipes['mx-chicken-street-tacos'].title, 'Chicken Street Tacos');
  const bread = found.find((l) => l.id === 'sample-cornbread');
  assert.deepEqual(bread.path, ['American Comfort', 'Breads']);
  assert.match(recipes['sample-cornbread'].steps.join(' '), /bake 20 to 25 minutes/);
  assert.deepEqual(tree.map((n) => n.name), [
    'Mexican', 'Italian', 'Asian', 'American Comfort', 'Mediterranean',
    'Breakfast', 'Soups & Stews', 'Salads & Bowls', 'Grill',
  ]);
});

test('week runs Monday through Sunday and a path ends on a recipe', () => {
  const { mealWeekDates, mealPathForId, mealChosenId, mealNodesAt } = loadMealFns();
  const { tree } = loadLibrary();
  const sunday = new Date(2026, 9, 25, 15, 0, 0);
  assert.deepEqual(mealWeekDates(sunday), [
    '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
  ]);
  const monday = new Date(2026, 9, 26, 9, 0, 0);
  assert.equal(mealWeekDates(monday)[0], '2026-10-26');
  assert.equal(mealWeekDates(monday)[6], '2026-11-01');
  const path = mealPathForId(tree, 'mx-chicken-street-tacos');
  assert.deepEqual(path, ['Mexican', 'Chicken', 'Tacos', 'mx-chicken-street-tacos']);
  assert.equal(mealChosenId(tree, path), 'mx-chicken-street-tacos');
  assert.equal(mealChosenId(tree, ['Mexican', 'Chicken']), '');
  assert.equal(mealNodesAt(tree, ['Mexican', 'Chicken']).some((n) => n.name === 'Tacos'), true);
  const mine = tree.concat([{ name: 'My recipes', children: [{ id: 'user-1' }] }]);
  assert.deepEqual(mealPathForId(mine, 'user-1'), ['My recipes', 'user-1']);
  assert.equal(mealChosenId(mine, ['My recipes', 'user-1']), 'user-1');
});

test('the library is loaded and cached with the app shell', () => {
  const html = read('index.html');
  const sw = read('sw.js');
  const docker = read('umbrel/Dockerfile');
  const nginx = read('umbrel/nginx.conf');
  const app = read('app.js');
  assert.match(html, /recipes-library\.js" defer><\/script>\s*<script src="app\.js" defer>/);
  assert.match(sw, /bauder-home-v11/);
  assert.match(sw, /\.\/recipes-library\.js/);
  assert.match(docker, /recipes-library\.js/);
  assert.match(nginx, /location = \/recipes-library\.js/);
  assert.match(app, /BAUDER_RECIPES/);
  assert.match(app, /data-act="meal-save"/);
  assert.match(app, /My recipes/);
  assert.doesNotMatch(app, /data-meal-text/);
});
