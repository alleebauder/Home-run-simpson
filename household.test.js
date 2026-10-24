'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { applyHousehold, inspectionModel, DEFAULT_FEED_URL } = require('./household.js');

const GUEST = { id: 'guest', name: 'Guest', color: '#9aa6a1', showPrivate: false, fixed: true };
const CODE_DEFAULTS = {
  haUrl: '',
  haToken: '',
  place: 'Spokane Valley',
  lat: 47.6732,
  lon: -117.2394,
  feedUrl: '',
  people: [
    { id: 'p1', name: 'Lee', color: '#f2a541', showPrivate: true },
    { id: 'p2', name: 'Family', color: '#32d74b', showPrivate: true, shared: true },
    GUEST,
  ],
  profile: 'p1',
  pin: '',
  layout: { main: ['time'], guest: ['time'] },
  modes: { morning: { temp: 70 } },
};
const CODE_EMERGENCY = {
  address: '',
  directions: '',
  contacts: [
    { id: 'c1', name: 'Fire, police, medical', phone: '911' },
    { id: 'c2', name: 'Poison Control', phone: '1-800-222-1222' },
  ],
  gas: '', water: '', power: '', extinguishers: '', meeting: '', medical: '', notes: '', smokeTested: '',
};

function seedFromRepo() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'household.json'), 'utf8'));
}

test('repo household seed fills an empty iPad without secrets', () => {
  const seed = seedFromRepo();
  assert.equal(seed.haUrl, undefined);
  assert.equal(seed.haToken, undefined);
  assert.equal(seed.pin, undefined);
  assert.equal(JSON.stringify(seed).includes('token'), false);

  const { settings, emergency } = applyHousehold({
    defaults: CODE_DEFAULTS,
    defaultEmergency: CODE_EMERGENCY,
    savedSettings: null,
    savedEmergency: null,
    seed,
    mode: 'fill',
  });

  assert.equal(settings.place, 'Spokane Valley');
  assert.ok(settings.lat > 47.6 && settings.lat < 47.8);
  assert.ok(settings.lon < -117.1 && settings.lon > -117.5);
  assert.equal(settings.feedUrl, DEFAULT_FEED_URL);
  assert.equal(settings.haUrl, '');
  assert.equal(settings.haToken, '');
  assert.equal(settings.pin, '');
  assert.deepEqual(settings.people.map((p) => p.name), ['Lee', 'Eleanor', 'Everett', 'Elijha', 'Family', 'Guest']);
  assert.equal(settings.people[0].color, '#f2a541');
  assert.equal(settings.people[0].showPrivate, true);
  assert.equal(settings.people.find((p) => p.name === 'Eleanor').showPrivate, true);
  assert.equal(settings.people.find((p) => p.name === 'Everett').showPrivate, true);
  assert.equal(settings.people.find((p) => p.name === 'Elijha').showPrivate, true);
  assert.equal(new Set(settings.people.map((p) => p.color)).size, settings.people.length);
  const family = settings.people.find((p) => p.name === 'Family');
  assert.equal(family.shared, true);
  assert.equal(family.showPrivate, true);
  const guest = settings.people.find((p) => p.fixed);
  assert.equal(guest.name, 'Guest');
  assert.equal(guest.showPrivate, false);
  assert.equal(settings.people.filter((p) => p.fixed || p.name === 'Guest').length, 1);
  assert.equal(emergency.address, '8918 E Dalton Ave, Spokane, WA 99212');
  assert.equal(emergency.gas, 'Outside');
  assert.equal(emergency.water, 'Behind the dryer, downstairs');
  assert.equal(emergency.power, '');
  assert.equal(emergency.extinguishers, '');
  assert.equal(emergency.meeting, '');
  assert.equal(emergency.medical, '');
  assert.equal(emergency.notes, '');
  assert.equal(emergency.directions, '');
  assert.equal(emergency.contacts[0].phone, '911');
  assert.equal(emergency.contacts[1].phone, '1-800-222-1222');
});

test('blank seed strings do not overwrite defaults or saved values', () => {
  const seed = {
    place: '',
    lat: '',
    lon: '   ',
    feedUrl: '',
    people: [],
    emergency: { address: '', gas: '', water: '   ', power: '', contacts: [] },
  };
  const savedSettings = {
    place: 'Cabin',
    lat: 48.1,
    lon: -117.9,
    feedUrl: 'http://umbrel.local:8686/data/bauder-hq.json',
    people: [
      { id: 'p1', name: 'Lee', color: '#f2a541', showPrivate: true },
      { id: 'custom', name: 'Neighbor', color: '#ffd60a', showPrivate: true },
      GUEST,
    ],
    haToken: 'secret-token',
    pin: '1234',
  };
  const savedEmergency = { address: '1 Saved St', gas: 'By the meter', power: 'Garage panel', contacts: CODE_EMERGENCY.contacts };

  const filled = applyHousehold({
    defaults: CODE_DEFAULTS,
    defaultEmergency: CODE_EMERGENCY,
    savedSettings,
    savedEmergency,
    seed,
    mode: 'fill',
  });
  assert.equal(filled.settings.place, 'Cabin');
  assert.equal(filled.settings.lat, 48.1);
  assert.equal(filled.settings.feedUrl, 'http://umbrel.local:8686/data/bauder-hq.json');
  assert.deepEqual(filled.settings.people.map((p) => p.name), ['Lee', 'Neighbor', 'Guest']);
  assert.equal(filled.settings.haToken, 'secret-token');
  assert.equal(filled.settings.pin, '1234');
  assert.equal(filled.emergency.address, '1 Saved St');
  assert.equal(filled.emergency.gas, 'By the meter');
  assert.equal(filled.emergency.power, 'Garage panel');
  assert.equal(filled.emergency.contacts[0].phone, '911');

  const reapplied = applyHousehold({
    defaults: CODE_DEFAULTS,
    defaultEmergency: CODE_EMERGENCY,
    savedSettings,
    savedEmergency,
    seed,
    mode: 'reapply',
  });
  assert.equal(reapplied.settings.place, 'Cabin');
  assert.equal(reapplied.settings.feedUrl, 'http://umbrel.local:8686/data/bauder-hq.json');
  assert.equal(reapplied.emergency.power, 'Garage panel');
  assert.equal(reapplied.emergency.gas, 'By the meter');
  assert.equal(reapplied.settings.haToken, 'secret-token');
  assert.equal(reapplied.settings.pin, '1234');
});

test('saved household values win on fill, and reapply pulls non-blank seed fields', () => {
  const seed = seedFromRepo();
  const savedSettings = {
    place: 'Elsewhere',
    lat: 40,
    lon: -120,
    feedUrl: 'http://umbrel.local:8686/data/bauder-hq.json',
    people: [
      { id: 'p1', name: 'Lee', color: '#ffd60a', showPrivate: true },
      { id: 'p2', name: 'Family', color: '#32d74b', showPrivate: true, shared: true },
      GUEST,
    ],
    haUrl: 'http://umbrel.local:8123',
    haToken: 'keep-me',
    pin: '9999',
    profile: 'p1',
  };
  const savedEmergency = {
    address: 'Old address',
    gas: 'Inside',
    water: '',
    power: 'Hall closet',
    contacts: [{ id: 'c9', name: 'Mom', phone: '509-555-0100' }],
  };

  const filled = applyHousehold({
    defaults: CODE_DEFAULTS,
    defaultEmergency: CODE_EMERGENCY,
    savedSettings,
    savedEmergency,
    seed,
    mode: 'fill',
  });
  assert.equal(filled.settings.place, 'Elsewhere');
  assert.equal(filled.settings.lat, 40);
  assert.equal(filled.settings.feedUrl, 'http://umbrel.local:8686/data/bauder-hq.json');
  assert.deepEqual(filled.settings.people.map((p) => p.name), ['Lee', 'Family', 'Guest']);
  assert.equal(filled.settings.people[0].color, '#ffd60a');
  assert.equal(filled.settings.haToken, 'keep-me');
  assert.equal(filled.settings.pin, '9999');
  assert.equal(filled.settings.haUrl, 'http://umbrel.local:8123');
  assert.equal(filled.emergency.address, 'Old address');
  assert.equal(filled.emergency.gas, 'Inside');
  assert.equal(filled.emergency.water, '');
  assert.equal(filled.emergency.power, 'Hall closet');
  assert.equal(filled.emergency.contacts[0].name, 'Mom');

  const again = applyHousehold({
    defaults: CODE_DEFAULTS,
    defaultEmergency: CODE_EMERGENCY,
    savedSettings,
    savedEmergency,
    seed,
    mode: 'reapply',
  });
  assert.equal(again.settings.place, 'Spokane Valley');
  assert.equal(again.settings.feedUrl, DEFAULT_FEED_URL);
  assert.equal(again.settings.haToken, 'keep-me');
  assert.equal(again.settings.pin, '9999');
  assert.equal(again.settings.haUrl, 'http://umbrel.local:8123');
  assert.deepEqual(again.settings.people.map((p) => p.name), ['Lee', 'Eleanor', 'Everett', 'Elijha', 'Family', 'Guest']);
  assert.equal(again.settings.people.find((p) => p.name === 'Lee').id, 'p1');
  assert.equal(again.settings.people.find((p) => p.name === 'Lee').color, '#f2a541');
  assert.equal(again.emergency.address, '8918 E Dalton Ave, Spokane, WA 99212');
  assert.equal(again.emergency.gas, 'Outside');
  assert.equal(again.emergency.water, 'Behind the dryer, downstairs');
  assert.equal(again.emergency.power, 'Hall closet');
  assert.equal(again.emergency.contacts[0].name, 'Mom');
});

test('a blank saved feed address falls back to the repo feed', () => {
  const { settings } = applyHousehold({
    defaults: CODE_DEFAULTS,
    defaultEmergency: CODE_EMERGENCY,
    savedSettings: { place: 'Spokane Valley', feedUrl: '', people: CODE_DEFAULTS.people, haToken: '' },
    savedEmergency: { address: '8918 E Dalton Ave, Spokane, WA 99212' },
    seed: { feedUrl: '' },
    mode: 'fill',
  });
  assert.equal(settings.feedUrl, 'feed/bauder-hq.json');
  assert.equal(settings.haToken, '');
  assert.equal(DEFAULT_FEED_URL, 'feed/bauder-hq.json');
});

test('reapply keeps people who exist only on the iPad and a single Guest', () => {
  const seed = seedFromRepo();
  const savedSettings = {
    people: [
      { id: 'p1', name: 'Lee', color: '#f2a541', showPrivate: true },
      { id: 'sitter', name: 'Sitter', color: '#ff6b62', showPrivate: false },
      { id: 'guest', name: 'Guest', color: '#9aa6a1', showPrivate: false, fixed: true },
    ],
  };
  const { settings } = applyHousehold({
    defaults: CODE_DEFAULTS,
    defaultEmergency: CODE_EMERGENCY,
    savedSettings,
    savedEmergency: null,
    seed,
    mode: 'reapply',
  });
  assert.deepEqual(settings.people.map((p) => p.name), ['Lee', 'Eleanor', 'Everett', 'Elijha', 'Family', 'Sitter', 'Guest']);
  assert.equal(settings.people.filter((p) => p.fixed).length, 1);
  assert.equal(settings.people.at(-1).name, 'Guest');
  assert.equal(settings.people.find((p) => p.name === 'Sitter').id, 'sitter');
});

test('inspections model is a clean empty state without a goal', () => {
  for (const value of [undefined, null, {}, { completed: 0, goal: 0, scheduled: [] }, { completed: '', goal: '' }]) {
    const model = inspectionModel(value);
    assert.equal(model.empty, true);
    assert.equal(Number.isFinite(model.pct), true);
    assert.equal(model.done, 0);
    assert.equal(model.goal, 0);
  }
  const sample = inspectionModel({ completed: 186, goal: 300, scheduled: [{ date: '2026-10-26', name: 'Annual' }] });
  assert.equal(sample.empty, false);
  assert.equal(sample.done, 186);
  assert.equal(sample.goal, 300);
  assert.ok(Math.abs(sample.pct - 186 / 300) < 0.0001);
});

test('the image serves the seed and feed outside the data volume', () => {
  const nginx = fs.readFileSync(path.join(__dirname, 'umbrel', 'nginx.conf'), 'utf8');
  const docker = fs.readFileSync(path.join(__dirname, 'umbrel', 'Dockerfile'), 'utf8');
  const compose = fs.readFileSync(path.join(__dirname, 'docker-compose.yml'), 'utf8');
  const sw = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  const readme = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8');
  assert.match(nginx, /household\.json/);
  assert.match(nginx, /location \/feed\//);
  assert.match(docker, /household\.json/);
  assert.match(docker, /household\.js/);
  assert.match(docker, /\/usr\/share\/nginx\/html\/feed/);
  assert.doesNotMatch(docker, /html\/data\/bauder-hq\.json/);
  assert.match(compose, /bauder-home-data:\/usr\/share\/nginx\/html\/data/);
  assert.match(sw, /bauder-home-v3/);
  assert.match(sw, /household\.js/);
  assert.match(html, /household\.js/);
  assert.match(app, /seed-reapply/);
  assert.match(app, /No inspections in the feed yet/);
  assert.match(readme, /household\.json/);
  assert.match(readme, /Re-apply household info/);
  assert.match(readme, /feed\/bauder-hq\.json/);
  assert.match(readme, /Pull and redeploy/);
});

test('Bauder HQ feed lists Wall St stays and EV sites without inspection sample data', () => {
  const feed = JSON.parse(fs.readFileSync(path.join(__dirname, 'feed', 'bauder-hq.json'), 'utf8'));
  assert.deepEqual(feed.airbnb, [
    { listing: 'Wall St', type: 'check-in', date: '2026-10-24' },
    { listing: 'Wall St', type: 'check-in', date: '2026-10-25' },
    { listing: 'Wall St', type: 'check-out', date: '2026-11-01' },
  ]);
  feed.airbnb.forEach((row) => assert.equal(row.time, undefined));
  assert.deepEqual(feed.ev, [
    { site: 'Benton City', status: 'Lease draft pending from counsel', stage: 'warn' },
    { site: 'Connell', status: 'Replacement site in WSDOT review', stage: 'warn' },
  ]);
  assert.equal(feed.inspections, undefined);
  assert.equal(inspectionModel(feed.inspections).empty, true);
  assert.equal(feed.haToken, undefined);
});
