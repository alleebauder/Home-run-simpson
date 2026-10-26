import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function appHarness() {
  // Test the production modal lifecycle, including a broken renderer.
  const src = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const begin = src.indexOf('  async function openApp(name, opts = {}) {');
  const end = src.indexOf('  function renderApp() {', begin);
  assert.ok(begin >= 0 && end > begin);
  const actual = src.slice(begin, end);
  const mocks = `
    const APP = { name:'assist', confirm:null, emEdit:false, recipeId:null };
    const APP_TITLES = { assist:'Assistant', cal:'Calendar' };
    const app = { inert: true };
    const dialog = {
      hidden:false, innerHTML:'Assistant', style:{pointerEvents:''},
      querySelector: () => null,
    };
    const $ = (key) => key === '#sheet' ? dialog : key === '.app' ? app : null;
    const document = { activeElement: null };
    const privateOK = () => true;
    let resetCount = 0, focusCount = 0, redraws = 0;
    const resetAssistant = () => { resetCount++; };
    const focusAfterSheet = () => { focusCount++; };
    const renderAll = () => { redraws++; };
    const renderApp = () => { dialog.innerHTML = APP.name; };
    const renderDock = () => {};
    const renderTop = () => {};
    const renderModes = () => {};
    const renderHome = () => {};
    const selectedPhotos = new Set();
    const H = { live:false };
    const S = { pin:'' };
    const setTimeout = () => {};
    let homeEditMode = false, homeDrag = null, sheetReturnFocus = null;
  `;
  return new Function(`${mocks}\n${actual}\nreturn {
    APP, app, dialog, openApp, closeApp,
    stats: () => ({ resetCount, focusCount, redraws }),
  };`)();
}

test('closing Assistant immediately restores Home and allows opening it again', async () => {
  const h = appHarness();
  h.closeApp();
  assert.equal(h.dialog.hidden, true);
  assert.equal(h.app.inert, false);
  assert.equal(h.dialog.innerHTML, '');
  assert.equal(h.stats().resetCount, 1);
  await h.openApp('assist');
  assert.equal(h.dialog.hidden, false);
  assert.equal(h.app.inert, true);
  assert.equal(h.APP.name, 'assist');
  assert.equal(h.dialog.innerHTML, 'assist');
  h.closeApp();
  assert.equal(h.app.inert, false);
  assert.equal(h.stats().resetCount, 3);
});

test('rapid close/reopen does not depend on an animation or stale pointer style', async () => {
  const h = appHarness();
  for (let i = 0; i < 4; i++) {
    h.closeApp();
    assert.equal(h.dialog.style.pointerEvents, '');
    await h.openApp('assist');
    assert.equal(h.dialog.hidden, false);
  }
  h.closeApp();
  assert.equal(h.app.inert, false);
  assert.equal(h.dialog.hidden, true);
});

test('a Calendar close releases the inert home screen immediately', async () => {
  const h = appHarness();
  h.closeApp();
  await h.openApp('cal');
  assert.equal(h.APP.name, 'cal');
  assert.equal(h.app.inert, true);
  h.closeApp();
  assert.equal(h.app.inert, false);
  assert.equal(h.dialog.hidden, true);
});

test('assistant fresh-conversation behavior remains intact without a modal animation', () => {
  const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  assert.match(js, /if \(closingName === 'assist'\) resetAssistant\(\)/);
  assert.match(js, /conversation\/process', text, language: /);
  assert.doesNotMatch(js, /conversation_id: ASSIST\.cid/);
  assert.doesNotMatch(js, /sheetExitAnimation|dialog\.animate\(/);
  assert.match(css, /\.sheet\s*\{[\s\S]*?animation:\s*none/);
});
