import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(dir, name), 'utf8');

function presets() {
  const code = read('app.js');
  const a = code.indexOf('/* ASSIST_PRESET_FNS */');
  const b = code.indexOf('/* /ASSIST_PRESET_FNS */');
  assert.ok(a !== -1 && b > a, 'preset functions exist');
  const pure = code.slice(a + '/* ASSIST_PRESET_FNS */'.length, b);
  return new Function(pure + '\nreturn { ASSIST_PRESETS, assistantPresets, assistantCategories };')();
}

test('the assistant offers multiple categories with preselected prompts', () => {
  const { ASSIST_PRESETS, assistantCategories, assistantPresets } = presets();
  assert.deepEqual(assistantCategories(true), ['Everyday', 'Smart home', 'Family', 'Kitchen', 'Routines', 'Explore']);
  for (const group of assistantCategories(true)) {
    assert.ok(ASSIST_PRESETS[group].length >= 5, group + ' should offer five or more buttons');
    assert.deepEqual(assistantPresets(group, true), ASSIST_PRESETS[group]);
  }
});

test('guest preset buttons never reveal family calendars, lists, bookings, or notes', () => {
  const { assistantPresets, assistantCategories } = presets();
  for (const category of assistantCategories(false)) {
    const questions = assistantPresets(category, false);
    assert.ok(questions.length > 0, category);
    assert.doesNotMatch(questions.join(' '), /calendar|tasks|groceries|airbnb|cleanings|message board/i);
  }
  assert.ok(!assistantCategories(false).includes('Family'));
  assert.ok(assistantPresets('Smart home', false).includes('Is the garage open?'));
  assert.deepEqual(assistantPresets('missing', true), assistantPresets('Everyday', true));
});

test('each AI request starts without the previous Home Assistant conversation ID', () => {
  const code = read('app.js');
  assert.match(code, /Every request is a fresh Home Assistant conversation/);
  assert.match(code, /ASSIST\.cid = null/);
  assert.match(code, /haSend\(\{ type: 'conversation\/process', text, language: \(navigator\.language \|\| 'en'\)\.slice\(0, 2\) \}\)/);
  assert.doesNotMatch(code, /conversation_id: ASSIST\.cid/);
  assert.match(code, /if \(closingName === 'assist'\) resetAssistant\(\)/);
  assert.match(code, /if \(APP\.name === 'assist' && name !== 'assist'\) resetAssistant\(\)/);
  assert.match(code, /ASSIST\.busy = true/);
  assert.match(code, /if \(epoch !== ASSIST\.epoch\) return/);
  assert.match(code, /if \(APP\.name !== 'assist'\) return/);
});

test('preset buttons and a start-fresh control stay available after a response', () => {
  const code = read('app.js');
  const css = read('styles.css');
  assert.match(code, /data-act="ask-category"/);
  assert.match(code, /data-act="ask-example"/);
  assert.match(code, /data-act="ask-reset"/);
  assert.match(code, /ASSIST\.log\.length[\s\S]+\+ chooser/);
  assert.match(css, /\.assist-category\[aria-pressed="true"\]/);
  assert.match(css, /\.assist-presets\s*\{/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('dashboard drag hit-testing handles all slots, not only the first one', () => {
  const src = read('app.js');
  assert.match(src, /const slots = \$\$\('\[data-home-id\]', home\)/);
  assert.match(src, /\$\$\('\[data-home-id\]', home\)\.forEach/);
  assert.match(src, /sheetReturnFocus/);
  assert.match(src, /focusAfterSheet/);
  assert.match(src, /aria-current="page"/);
});
