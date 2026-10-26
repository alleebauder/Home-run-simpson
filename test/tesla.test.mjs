import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

function loadFns() {
  const src = read('app.js');
  const start = src.indexOf('/* TESLA_FNS */');
  const end = src.indexOf('/* /TESLA_FNS */');
  if (start < 0 || end < 0) throw new Error('Tesla functions are not in app.js');
  const body = src.slice(start + '/* TESLA_FNS */'.length, end);
  return new Function(`${body}\nreturn { TESLA_LAYOUT_ID, TESLA_DEFAULT_CARS, cleanTeslaCars, withTeslaWidget, teslaCarView, teslaInsideText, teslaBatteryText };`)();
}

const climate = (state, action) => ({ state, attributes: { hvac_action: action || '' } });
const sensor = (state, extra = {}) => ({ state: String(state), attributes: extra });

test('names and entity ids are cleaned and the old default layout gains the widget', () => {
  const { cleanTeslaCars, withTeslaWidget, TESLA_LAYOUT_ID, TESLA_DEFAULT_CARS } = loadFns();
  const cars = cleanTeslaCars([
    { name: '  Model   Y ', climate: 'Climate.My_Car_Climate', inside: 'not an id', battery: 'sensor.my_car_battery_level', defrost: 'switch.my_car_defrost' },
    { name: '', climate: 'climate.other climate' },
  ]);
  assert.equal(cars[0].name, 'Model Y');
  assert.equal(cars[0].climate, 'climate.my_car_climate');
  assert.equal(cars[0].inside, '');
  assert.equal(cars[0].battery, 'sensor.my_car_battery_level');
  assert.equal(cars[0].defrost, 'switch.my_car_defrost');
  assert.equal(cars[1].name, TESLA_DEFAULT_CARS[1].name);
  assert.equal(cars[1].climate, '');
  assert.equal(cleanTeslaCars(null).length, 2);
  const prev = ['time', 'status', 'next', 'home', 'tasks', 'cam', 'kitchen', 'media', 'board', 'energy', 'packages', 'emergency', 'bnb', 'count', 'ev'];
  assert.deepEqual(withTeslaWidget(prev).slice(-1), [TESLA_LAYOUT_ID]);
  assert.deepEqual(withTeslaWidget(['time', 'kitchen']), ['time', 'kitchen']);
  assert.deepEqual(withTeslaWidget(['time', 'tesla']), ['time', 'tesla']);
});

test('cards follow live Home Assistant state and do not invent a connection', () => {
  const { teslaCarView } = loadFns();
  const car = { name: 'Car 1', climate: 'climate.my_car_climate', inside: 'sensor.my_car_inside_temperature', battery: 'sensor.my_car_battery_level', defrost: 'switch.my_car_defrost' };
  const states = {
    'climate.my_car_climate': climate('heat_cool', 'heating'),
    'sensor.my_car_inside_temperature': sensor(71.4, { unit_of_measurement: '°F', device_class: 'temperature' }),
    'sensor.my_car_battery_level': sensor(64, { unit_of_measurement: '%', device_class: 'battery' }),
    'switch.my_car_defrost': sensor('off'),
  };
  assert.equal(teslaCarView(car, false, states).label, 'Not connected');
  assert.equal(teslaCarView({ ...car, climate: '' }, true, states).label, 'Not connected');
  assert.equal(teslaCarView(car, true, { ...states, 'climate.my_car_climate': climate('unavailable') }).label, 'Not connected');
  const warm = teslaCarView(car, true, states);
  assert.equal(warm.label, 'Warming');
  assert.equal(warm.warming, true);
  assert.equal(warm.inside, '71°');
  assert.equal(warm.battery, '64%');
  const off = teslaCarView(car, true, { ...states, 'climate.my_car_climate': climate('off', 'off') });
  assert.equal(off.label, 'Off');
  const defrost = teslaCarView(car, true, { ...states, 'switch.my_car_defrost': { state: 'on', attributes: { friendly_name: 'Defrost' } } });
  assert.equal(defrost.label, 'Defrosting');
  assert.equal(defrost.defrosting, true);
  assert.equal(defrost.warming, false);
  const pre = teslaCarView(
    { ...car, defrost: 'switch.my_car_preconditioning' },
    true,
    { ...states, 'climate.my_car_climate': climate('off'), 'switch.my_car_preconditioning': { state: 'on', attributes: { friendly_name: 'Preconditioning' } } },
  );
  assert.equal(pre.label, 'Warming');
  const action = teslaCarView(car, true, { 'climate.my_car_climate': climate('heat_cool', 'defrosting') });
  assert.equal(action.label, 'Defrosting');
});

test('the widget is private, on the family layout, and documented', () => {
  const app = read('app.js');
  const readme = read('README.md');
  const sw = read('sw.js');
  assert.match(app, /tesla:\s*\['Tesla',\s*'large',\s*true\]/);
  const main = app.match(/main:\s*\[[^\]]+\]/)[0];
  const guest = app.match(/guest:\s*\[[^\]]+\]/)[0];
  assert.match(main, /'tesla'/);
  assert.doesNotMatch(guest, /tesla/);
  assert.match(app, /set_hvac_mode/);
  assert.match(app, /heat_cool/);
  assert.match(app, /Not connected/);
  assert.doesNotMatch(app, /data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/]{80}/);
  assert.match(readme, /Tesla Fleet/);
  assert.match(readme, /Teslemetry/);
  assert.match(readme, /layout id `tesla`/);
  assert.match(readme, /climate\.<car>_climate/);
  assert.match(sw, /bauder-home-v8/);
});
