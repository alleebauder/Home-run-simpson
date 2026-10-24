/* Bauder Home household seed.
   Pure merge helpers shared by the iPad app and household.test.js.
   No network and no DOM. household.json is fetched by app.js. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.BauderHousehold = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_FEED_URL = 'feed/bauder-hq.json';
  const EM_KEYS = ['address', 'directions', 'gas', 'water', 'power', 'extinguishers', 'meeting', 'medical', 'notes', 'contacts'];

  function clone(v) {
    if (v == null || typeof v !== 'object') return v;
    return JSON.parse(JSON.stringify(v));
  }

  function isBlank(v) {
    if (v == null) return true;
    if (typeof v === 'string') return v.trim() === '';
    if (typeof v === 'number') return !Number.isFinite(v);
    if (typeof v === 'boolean') return false;
    if (Array.isArray(v)) return v.length === 0;
    return typeof v === 'object' ? Object.keys(v).length === 0 : false;
  }

  function isGuest(p) {
    return !!p && (p.fixed === true || /^guest$/i.test(String(p.name || '').trim()));
  }

  function guestPerson(prev) {
    return {
      id: (prev && prev.id) || 'guest',
      name: 'Guest',
      color: (prev && prev.color) || '#9aa6a1',
      showPrivate: false,
      fixed: true,
    };
  }

  function slugId(name, used) {
    const base = 'p-' + String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let id = base && base !== 'p-' ? base : 'p-person';
    let n = 2;
    while (used.has(id)) id = (base || 'p-person') + '-' + (n++);
    used.add(id);
    return id;
  }

  function normalizePeople(list) {
    const used = new Set();
    const members = [];
    (Array.isArray(list) ? list : []).forEach((raw) => {
      if (!raw || isBlank(raw.name) || isGuest(raw)) return;
      const name = String(raw.name).trim();
      const id = raw.id && !used.has(String(raw.id)) ? String(raw.id) : slugId(name, used);
      used.add(id);
      const person = { id, name, color: raw.color || '#64b5ff', showPrivate: raw.showPrivate !== false };
      if (raw.shared === true || /^family$/i.test(name)) person.shared = true;
      members.push(person);
    });
    members.push(guestPerson());
    return members;
  }

  function ensureGuest(list) {
    const members = [];
    let guest = null;
    (Array.isArray(list) ? list : []).forEach((p) => {
      if (!p) return;
      if (isGuest(p)) { if (!guest) guest = p; return; }
      members.push({ ...p });
    });
    members.push(guestPerson(guest));
    return members;
  }

  // Seed order, ids kept when the name already exists, device-only people kept, one Guest at the end.
  function mergePeople(current, seedList) {
    const seeded = normalizePeople(seedList).filter((p) => !p.fixed);
    const byName = new Map();
    (current || []).forEach((p) => {
      if (!p || isGuest(p) || isBlank(p.name)) return;
      byName.set(String(p.name).trim().toLowerCase(), p);
    });
    const merged = seeded.map((sp) => {
      const prev = byName.get(sp.name.toLowerCase());
      return prev ? { ...sp, id: prev.id } : sp;
    });
    const names = new Set(merged.map((p) => p.name.toLowerCase()));
    (current || []).forEach((p) => {
      if (!p || isGuest(p) || isBlank(p.name)) return;
      if (names.has(String(p.name).trim().toLowerCase())) return;
      merged.push({ ...p });
    });
    const prevGuest = (current || []).find((p) => p && isGuest(p));
    merged.push(guestPerson(prevGuest));
    return merged;
  }

  function overlaySavedSettings(settings, defaults, saved) {
    if (!saved || typeof saved !== 'object') return;
    Object.keys(saved).forEach((k) => {
      if (k === 'profiles') return;
      if (k === 'feedUrl') {
        if (!isBlank(saved.feedUrl)) settings.feedUrl = saved.feedUrl;
        return;
      }
      if (k === 'people') {
        if (Array.isArray(saved.people) && saved.people.length) settings.people = clone(saved.people);
        return;
      }
      const dv = defaults[k];
      const sv = saved[k];
      if (dv && typeof dv === 'object' && !Array.isArray(dv) && sv && typeof sv === 'object' && !Array.isArray(sv)) settings[k] = { ...clone(dv), ...clone(sv) };
      else settings[k] = clone(sv);
    });
  }

  function overlaySeedSettings(settings, seed, { replacePeople }) {
    if (!seed || typeof seed !== 'object') return;
    ['place', 'lat', 'lon', 'feedUrl'].forEach((k) => {
      if (!isBlank(seed[k])) settings[k] = seed[k];
    });
    if (Array.isArray(seed.people) && seed.people.length) {
      settings.people = replacePeople ? mergePeople(settings.people, seed.people) : normalizePeople(seed.people);
    }
  }

  function overlayEmergency(emergency, source, { onlyNonBlank }) {
    if (!source || typeof source !== 'object') return;
    const keys = onlyNonBlank ? EM_KEYS.filter((k) => !isBlank(source[k])) : Object.keys(source);
    keys.forEach((k) => { emergency[k] = clone(source[k]); });
  }

  function finish(settings) {
    if (isBlank(settings.feedUrl)) settings.feedUrl = DEFAULT_FEED_URL;
    settings.people = ensureGuest(settings.people);
    return settings;
  }

  // mode "fill": saved values win, including blanks the owner cleared.
  // A blank feed address counts as unset and falls back to the repo feed.
  // mode "reapply": non-blank seed fields replace what's on the device.
  // Blank seed fields never erase a value. haUrl, haToken and pin are never read from the seed.
  function applyHousehold({ defaults, defaultEmergency, savedSettings, savedEmergency, seed, mode }) {
    const settings = clone(defaults || {});
    const emergency = clone(defaultEmergency || {});
    const reapply = mode === 'reapply';
    const src = seed && typeof seed === 'object' ? seed : null;

    if (!reapply) overlaySeedSettings(settings, src, { replacePeople: false });
    overlaySavedSettings(settings, defaults || {}, savedSettings);
    overlayEmergency(emergency, src && src.emergency, { onlyNonBlank: true });
    if (savedEmergency && typeof savedEmergency === 'object') overlayEmergency(emergency, savedEmergency, { onlyNonBlank: false });

    if (reapply && src) {
      overlaySeedSettings(settings, src, { replacePeople: true });
      overlayEmergency(emergency, src.emergency, { onlyNonBlank: true });
    }

    return { settings: finish(settings), emergency, applied: !!src };
  }

  function inspectionModel(inspections) {
    const emptyModel = { empty: true, done: 0, goal: 0, pct: 0, scheduled: [] };
    if (!inspections || typeof inspections !== 'object') return emptyModel;
    const scheduled = Array.isArray(inspections.scheduled) ? inspections.scheduled.filter((x) => x && (x.date || x.name || x.time)) : [];
    const doneNum = Number(inspections.completed);
    const goalNum = Number(inspections.goal);
    const hasGoal = Number.isFinite(goalNum) && goalNum > 0;
    if (!hasGoal && scheduled.length === 0) return emptyModel;
    const done = Number.isFinite(doneNum) ? doneNum : 0;
    const goal = hasGoal ? goalNum : 0;
    return { empty: false, done, goal, pct: goal ? Math.min(1, Math.max(0, done / goal)) : 0, scheduled };
  }

  return { DEFAULT_FEED_URL, EM_KEYS, isBlank, applyHousehold, inspectionModel, normalizePeople };
});
