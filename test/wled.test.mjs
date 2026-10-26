import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

function helpers() {
  const s = read('app.js');
  const start = s.indexOf('/* WLED_FNS */'), end = s.indexOf('/* /WLED_FNS */', start);
  assert.ok(start > 0 && end > start, 'WLED pure helpers must exist');
  return new Function(s.slice(start + '/* WLED_FNS */'.length, end) +
    '\nreturn { WLED_COLORS, wledRGB, wledColorCapable, wledLooksLikeLight, wledPresetMatch };')();
}

test('WLED color conversion requires a six-digit hex code and yields bounded RGB', () => {
  const { wledRGB, WLED_COLORS } = helpers();
  assert.deepEqual(wledRGB('#ff334f'), [255, 51, 79]);
  assert.deepEqual(wledRGB('#000000'), [0, 0, 0]);
  for (const c of ['#fff', 'javascript:alert(1)', '#gg0000', '', null]) assert.equal(wledRGB(c), null);
  for (const [label, hex] of WLED_COLORS) {
    assert.ok(label.length > 0);
    const nums = wledRGB(hex);
    assert.equal(nums.length, 3);
    assert.ok(nums.every(n => Number.isInteger(n) && n >= 0 && n <= 255));
  }
});

test('WLED RGB buttons display only when HA reports a color-capable device', () => {
  const { wledColorCapable } = helpers();
  for (const color of ['hs', 'rgb', 'rgbw', 'rgbww', 'xy']) {
    assert.equal(wledColorCapable({ supported_color_modes: [color] }), true);
  }
  for (const only of [['brightness'], ['color_temp'], ['onoff'], [], null]) {
    assert.equal(wledColorCapable({ supported_color_modes: only }), false);
  }
  assert.equal(wledColorCapable(null), false);
});

test('WLED matching recognizes strips without claiming every household light', () => {
  const { wledLooksLikeLight } = helpers();
  assert.equal(wledLooksLikeLight({ entity_id: 'light.wled_kitchen', attributes: {} }), true);
  assert.equal(wledLooksLikeLight({ entity_id: 'light.kitchen', attributes: { friendly_name: 'LED Strip' } }), true);
  assert.equal(wledLooksLikeLight({ entity_id: 'light.kitchen', attributes: { friendly_name: 'Kitchen Ceiling' } }), false);
  assert.equal(wledLooksLikeLight({ entity_id: 'switch.wled', attributes: {} }), false);
});

test('preset mapping targets only matching select entities unless explicitly chosen', () => {
  const { wledPresetMatch } = helpers();
  const states = {
    'select.wled_bedroom_preset': { attributes: { friendly_name: 'Bedroom Presets', options: ['Night'] } },
    'select.wled_kitchen_preset': { attributes: { friendly_name: 'Kitchen Presets', options: ['Party'] } },
    'select.other_mode': { attributes: { options: ['Open'] } },
  };
  assert.equal(wledPresetMatch('light.wled_bedroom', states, ''), 'select.wled_bedroom_preset');
  assert.equal(wledPresetMatch('light.wled_kitchen_segment_1', states, ''), 'select.wled_kitchen_preset');
  assert.equal(wledPresetMatch('light.unrelated', states, ''), '');
  assert.equal(wledPresetMatch('light.wled_kitchen', states, 'select.wled_bedroom_preset'), 'select.wled_bedroom_preset');
  assert.equal(wledPresetMatch('light.wled_kitchen', states, 'select.nonexistent'), 'select.wled_kitchen_preset');
});

test('WLED uses HA light/select services and cannot silently call a local WLED IP', () => {
  const s = read('app.js');
  assert.match(s, /call\('light', 'turn_on', id, \{ rgb_color: rgb \}\)/);
  assert.match(s, /call\('light', 'turn_on', id, \{ brightness_pct:/);
  assert.match(s, /call\('light', 'turn_on', id, \{ effect \}\)/);
  assert.match(s, /call\('select', 'select_option', preset, \{ option \}\)/);
  assert.match(s, /if \(st\.state !== 'on' && !await call\('light', 'turn_on', id\)\) return/);
  assert.match(s, /s\.wled = \{/);
  assert.doesNotMatch(s, /fetch\(.+\/json\/state/);
  assert.match(read('styles.css'), /\.wled-swatch:focus-visible/);
});
