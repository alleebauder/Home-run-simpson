import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function appHarness() {
  // Exercise the real application's openApp/closeApp implementation instead
  // of testing a copied version. A minimal WAAPI double models the retained
  // opacity produced by an animation with fill:'forwards'.
  const src = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const start = src.indexOf('  async function openApp(name, opts = {}) {');
  const end = src.indexOf('  function renderApp() {', start);
  assert.ok(start > 0 && end > start, 'find the actual app dialog lifecycle');
  const lifecycle = src.slice(start, end);
  const mocks = `
    const APP = {name: 'assist', confirm: null, emEdit: false, recipeId: null};
    const APP_TITLES = {assist: 'Assistant'};
    const app = {inert: true};
    const animations = [];
    const dialog = {
      hidden: false, innerHTML: 'Assistant', visualOpacity: 1,
      style: {pointerEvents: ''}, failAnimation: false,
      animate(keyframes, settings) {
        if (this.failAnimation) throw new Error('Animation unavailable');
        let resolveFinished, rejectFinished;
        const animation = {
          finished: new Promise((resolve, reject) => {
            resolveFinished = resolve;
            rejectFinished = reject;
          }),
          cancelled: false,
          cancel() {
            this.cancelled = true;
            dialog.visualOpacity = 1;
            rejectFinished(new Error('cancelled'));
          },
          complete() { dialog.visualOpacity = 0; resolveFinished(); },
        };
        animations.push(animation);
        return animation;
      },
    };
    const document = {activeElement: null};
    const window = {matchMedia: () => ({matches: false})};
    const $ = (selector) => selector === '#sheet' ? dialog :
      selector === '.app' ? app : null;
    const privateOK = () => true;
    const renderAll = () => {};
    const renderApp = () => { dialog.innerHTML = 'Assistant'; };
    const renderDock = () => {};
    const renderTop = () => {};
    const renderHome = () => {};
    const renderModes = () => {};
    const resetAssistant = () => {};
    const focusAfterSheet = () => {};
    const selectedPhotos = new Set();
    const H = {live: false};
    const S = {pin: ''};
    const setTimeout = () => {};
    let homeEditMode = false, homeDrag = null;
    let sheetReturnFocus = null, sheetExitAnimation = null;
  `;
  return new Function(`${mocks}\n${lifecycle}\nreturn {
    APP, app, dialog, animations, openApp, closeApp,
    state: () => ({sheetExitAnimation})
  };`)();
}

test('opening Assistant after a completed close restores visibility and access', async () => {
  const h = appHarness();
  h.closeApp();
  assert.equal(h.app.inert, true, 'wait for closing animation before restoring home');
  assert.equal(h.animations.length, 1);
  h.animations[0].complete();
  await Promise.resolve();
  assert.equal(h.dialog.hidden, true);
  assert.equal(h.app.inert, false, 'the home screen becomes interactive');
  assert.equal(h.animations[0].cancelled, true, 'remove the forwards-filled opacity');
  assert.equal(h.dialog.visualOpacity, 1);
  assert.equal(h.state().sheetExitAnimation, null);

  await h.openApp('assist');
  assert.equal(h.dialog.hidden, false);
  assert.equal(h.dialog.visualOpacity, 1, 'the reopened assistant is visible');
  assert.equal(h.APP.name, 'assist');
  assert.equal(h.app.inert, true, 'only the visible assistant is interactive');
});

test('quick reopen during close cancels exit without hiding the new assistant', async () => {
  const h = appHarness();
  h.closeApp();
  const closing = h.animations[0];
  await h.openApp('assist');
  await Promise.resolve();
  assert.equal(closing.cancelled, true);
  assert.equal(h.dialog.hidden, false);
  assert.equal(h.dialog.style.pointerEvents, '');
  assert.equal(h.dialog.visualOpacity, 1);
  assert.equal(h.APP.name, 'assist');
  assert.equal(h.app.inert, true);
});

test('animation failure restores home interaction instead of trapping an overlay', () => {
  const h = appHarness();
  h.dialog.failAnimation = true;
  h.closeApp();
  assert.equal(h.dialog.hidden, true);
  assert.equal(h.app.inert, false);
  assert.equal(h.dialog.style.pointerEvents, '');
});

test('assistant fresh-conversation behavior remains intact', () => {
  const src = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(src, /if \(closingName === 'assist'\) resetAssistant\(\)/);
  assert.match(src, /conversation\/process', text, language: /);
  assert.doesNotMatch(src, /conversation_id: ASSIST\.cid/);
  assert.match(src, /animation\.cancel\(\);\s*finish\(\);/);
});
