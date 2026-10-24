/* Bauder Home: app.js
   A home command center for iPad. Plain JavaScript, no build step.
   The iPad keeps everything locally (localStorage for settings, lists, notes,
   recipes, packages and emergency info; IndexedDB for photos). Nothing leaves
   the iPad except calls to the Home Assistant, weather and feed addresses you
   set. When Home Assistant to-do lists are chosen in Settings, tasks and the
   message board live there instead, so phones with the Home Assistant app
   share them. */
(() => {
  'use strict';

  // ================================================================ helpers
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const cap = (s) => { s = String(s ?? '').replace(/_/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const plural = (n, w, p) => `${n} ${n === 1 ? w : (p || w + 's')}`;

  const store = {
    get(k, d) { try { const v = localStorage.getItem('bh.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('bh.' + k, JSON.stringify(v)); } catch (e) { /* full or blocked */ } },
    clear() { try { Object.keys(localStorage).filter((k) => k.startsWith('bh.')).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* blocked */ } },
  };

  // ================================================================== icons
  const ICON = {
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/>',
    plug: '<path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
    thermo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 10v6"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.6 1.6 1.6.6-1.6.6L19 20.4l-.6-1.6-1.6-.6 1.6-.6z"/>',
    garage: '<path d="M3 21V9l9-6 9 6v12"/><path d="M7 21v-8h10v8M7 16h10"/>',
    blind: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 8h16M4 12h16M4 16h16"/>',
    camera: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
    fan: '<circle cx="12" cy="12" r="1.5"/><path d="M12 10.5C12 6 13 3 15.5 3S19 6 12 10.5zM13.5 12c4.5 0 7.5 1 7.5 3.5S18 19 13.5 12zM12 13.5c0 4.5-1 7.5-3.5 7.5S5 18 12 13.5zM10.5 12C6 12 3 11 3 8.5S6 5 10.5 12z"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    next: '<path d="M6 5l9 7-9 7z"/><path d="M18 5v14"/>',
    prev: '<path d="M18 5l-9 7 9 7z"/><path d="M6 5v14"/>',
    volume: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/>',
    door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M4 21h16M14 12h.01"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    pot: '<path d="M4 11h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M2 11h20M9 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M10 2h4"/>',
    photo: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
    clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11l2 2 4-4M9 17h6"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',
    sunset: '<path d="M3 19h18M6.3 19a5.7 5.7 0 0 1 11.4 0M12 3v7M9 7l3 3 3-3M4.2 11.2l1.6 1.2M19.8 11.2l-1.6 1.2"/>',
    bed: '<path d="M3 18V6M3 13h18v5M21 13v-1a3 3 0 0 0-3-3h-7v4"/><circle cx="7" cy="10" r="1.8"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 11 3.5 3.5 0 0 0 7 18z"/>',
    partly: '<path d="M8 3v1.5M3.5 8H5M4.8 4.8l1 1M11.2 4.8l-1 1"/><path d="M5.6 10.5A3 3 0 1 1 11 7.5"/><path d="M9 20h8a3.5 3.5 0 0 0 .5-7A5 5 0 0 0 8 13.5 3.3 3.3 0 0 0 9 20z"/>',
    rain: '<path d="M7 15h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 8 3.5 3.5 0 0 0 7 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
    snow: '<path d="M7 15h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 8 3.5 3.5 0 0 0 7 15z"/><path d="M8 19h.01M12 21h.01M16 19h.01M10 21.5h.01M14 18.5h.01"/>',
    fog: '<path d="M4 9h16M3 13h18M5 17h14"/>',
    storm: '<path d="M7 15h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 8 3.5 3.5 0 0 0 7 15z"/><path d="M12 14l-2 4h4l-2 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    fwd: '<path d="M9 6l6 6-6 6"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    cart: '<path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    shieldok: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
    box: '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
    msg: '<path d="M4 5h16v11H9l-5 4z"/>',
    phone: '<path d="M5 4h3l2 5-2 1.5a11 11 0 0 0 5.5 5.5L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    sos: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3a6.5 6.5 0 0 1 3.5 5.7"/>',
  };
  const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n] || ICON.gauge}</svg>`;

  // ============================================================== constants
  const PALETTE = [['#f2a541', 'Amber'], ['#32d74b', 'Green'], ['#64b5ff', 'Blue'], ['#ff7eb6', 'Pink'], ['#b48cff', 'Purple'], ['#4fd1c5', 'Teal'], ['#ff6b62', 'Red'], ['#ffd60a', 'Yellow']];

  const MODE_DEFS = [
    { id: 'morning', name: 'Morning', icon: 'sun' },
    { id: 'cooking', name: 'Cooking', icon: 'pot' },
    { id: 'leaving', name: 'Leaving', icon: 'door' },
    { id: 'evening', name: 'Evening', icon: 'sunset' },
    { id: 'bedtime', name: 'Bedtime', icon: 'bed' },
  ];
  // Rules: "match:<words>" finds devices by name, "area:<room>" finds lights
  // in a Home Assistant area, anything else is an exact entity id.
  const DEFAULT_MODES = {
    morning: { scenes: ['match:morning'], on: ['area:kitchen'], off: [], lightsOff: false, lockAll: false, closeGarage: false, temp: 70, after: '' },
    cooking: { scenes: ['match:cook'], on: ['area:kitchen'], off: [], lightsOff: false, lockAll: false, closeGarage: false, temp: '', after: 'kitchen' },
    leaving: { scenes: ['match:leav|away'], on: [], off: [], lightsOff: true, lockAll: true, closeGarage: true, temp: 62, after: '' },
    evening: { scenes: ['match:evening|relax'], on: ['match:porch'], off: [], lightsOff: false, lockAll: false, closeGarage: true, temp: 68, after: '' },
    bedtime: { scenes: ['match:night|bed|sleep'], on: [], off: [], lightsOff: true, lockAll: true, closeGarage: true, temp: 64, after: 'clock' },
  };
  const RULE_LABEL = (r) => r.startsWith('match:') ? `Anything named like “${r.slice(6).split('|').join('” or “')}”` : r.startsWith('area:') ? `Lights in the ${cap(r.slice(5))}` : r;

  // [name, size, private]
  const WIDGET_INFO = {
    time: ['Time & weather', 'wide'],
    status: ['House status', 'small'],
    next: ['Up next (family calendar)', 'tall', true],
    home: ['Home favorites', 'large'],
    tasks: ['Tasks', 'tall', true],
    cam: ['Cameras', 'small'],
    kitchen: ['Kitchen', 'small'],
    media: ['Music', 'small'],
    board: ['Message board', 'small', true],
    energy: ['Energy', 'small'],
    packages: ['Packages', 'small', true],
    emergency: ['Emergency info', 'small'],
    forecast: ['Forecast', 'tall'],
    timer: ['Timers', 'small'],
    bnb: ['Airbnb', 'small', true],
    insp: ['Inspections', 'small', true],
    ev: ['EV projects', 'small', true],
  };
  const SIZE_LABEL = { small: '1×1', wide: '2×1', tall: '1×2', large: '2×2' };
  const DEFAULT_LAYOUT = {
    main: ['time', 'status', 'next', 'home', 'tasks', 'cam', 'kitchen', 'media', 'board', 'energy', 'packages', 'emergency', 'bnb', 'insp', 'ev'],
    guest: ['time', 'status', 'emergency', 'home', 'kitchen', 'media', 'forecast', 'timer'],
  };

  const APP_TITLES = { home: 'Home', cal: 'Calendar', tasks: 'Tasks', kitchen: 'Kitchen', music: 'Music', security: 'Security', board: 'Message Board', packages: 'Packages', energy: 'Energy', photos: 'Photos', emergency: 'Emergency', settings: 'Settings', assist: 'Assistant' };
  const APP_ICONS = { home: 'home', cal: 'cal', tasks: 'check', kitchen: 'pot', music: 'music', security: 'shield', board: 'msg', packages: 'box', energy: 'bolt', photos: 'photo', emergency: 'sos', settings: 'gear', assist: 'sparkle' };
  const DOCK = ['home', 'cal', 'tasks', 'kitchen', 'music', 'security', 'board', 'packages', 'energy', 'photos', 'emergency', 'settings'];
  const PRIVATE_APPS = ['cal', 'tasks', 'board', 'packages'];
  const LIST_KINDS = [{ id: 'groceries', name: 'Groceries', icon: 'cart' }, { id: 'chores', name: 'Chores', icon: 'check' }, { id: 'reminders', name: 'Reminders', icon: 'bell' }];
  const HAZARDS = { smoke: 'Smoke', carbon_monoxide: 'Carbon monoxide', gas: 'Gas', heat: 'Heat', moisture: 'Water leak' };

  // =============================================================== settings
  const DEFAULTS = {
    haUrl: '',
    haToken: '',
    favorites: [],
    calendars: [],
    calendarOwners: {},
    mainCamera: '',
    doorbellEntity: '',
    doorbellCamera: '',
    weatherEntity: '',
    place: 'Spokane Valley',
    lat: 47.6732,
    lon: -117.2394,
    feedUrl: '',
    idleAfter: 120,
    face: 'bold',
    nightMode: true,
    nightStart: 22,
    nightEnd: 6,
    guestOnIdle: false,
    theme: 'auto',
    people: [
      { id: 'p1', name: 'Lee', color: '#f2a541', showPrivate: true },
      { id: 'p2', name: 'Family', color: '#32d74b', showPrivate: true, shared: true },
      { id: 'guest', name: 'Guest', color: '#9aa6a1', showPrivate: false, fixed: true },
    ],
    profile: 'p1',
    pin: '',
    layout: clone(DEFAULT_LAYOUT),
    modes: clone(DEFAULT_MODES),
    lastMode: null,
    todo: { groceries: '', chores: '', reminders: '', board: '' },
    energy: { power: '', energy: '' },
    musicMain: '',
    arrivals: {},
    awayMode: '',
    speak: true,
  };

  function loadSettings() {
    const saved = store.get('settings', {}) || {};
    if (saved.profiles && !saved.people) {
      saved.people = saved.profiles.map((p, i) => ({ id: p.id, name: p.name, showPrivate: !!p.showPrivate, fixed: !!p.fixed, shared: /^family$/i.test(p.name), color: p.fixed ? '#9aa6a1' : PALETTE[i % PALETTE.length][0] }));
      delete saved.profiles;
    }
    const s = clone(DEFAULTS);
    Object.keys(saved).forEach((k) => {
      const dv = DEFAULTS[k], sv = saved[k];
      if (dv && typeof dv === 'object' && !Array.isArray(dv) && sv && typeof sv === 'object' && !Array.isArray(sv)) s[k] = { ...dv, ...sv };
      else s[k] = sv;
    });
    Object.keys(DEFAULT_MODES).forEach((id) => { s.modes[id] = { ...DEFAULT_MODES[id], ...((saved.modes || {})[id] || {}) }; });
    ['main', 'guest'].forEach((k) => { s.layout[k] = Array.isArray(s.layout[k]) ? s.layout[k].filter((w) => WIDGET_INFO[w]) : clone(DEFAULT_LAYOUT[k]); });
    if (!s.people.some((p) => p.fixed)) s.people.push(clone(DEFAULTS.people[2]));
    return s;
  }
  const S = loadSettings();
  const saveSettings = () => store.set('settings', S);

  const personById = (id) => S.people.find((p) => p.id === id);
  const curProfile = () => personById(S.profile) || S.people[0];
  const privateOK = () => !!curProfile().showPrivate;
  const members = () => S.people.filter((p) => !p.fixed);
  const sharedPerson = () => S.people.find((p) => p.shared) || members()[0];
  const pColor = (id) => personById(id)?.color || '#9aa6a1';
  const pName = (id) => personById(id)?.name || '';
  const nameToId = (n) => (S.people.find((p) => p.name.toLowerCase() === String(n || '').trim().toLowerCase()) || {}).id || '';

  function applyTheme() {
    const r = document.documentElement;
    if (S.theme === 'light' || S.theme === 'dark') r.setAttribute('data-theme', S.theme);
    else r.removeAttribute('data-theme');
  }

  // ================================================================== time
  function fmtTime(d) { let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return { hm: `${h}:${pad(d.getMinutes())}`, ap }; }
  const fmtDate = (d) => d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const fmtClock = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const isoDay = (offset) => isoOf(addDays(new Date(), offset));
  function parseDay(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
  }
  function isoLocal(d) {
    const off = -d.getTimezoneOffset(), a = Math.abs(off);
    return `${isoOf(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${off >= 0 ? '+' : '-'}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
  }
  const dayDiff = (d) => Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000);
  function relDay(d) {
    const diff = dayDiff(d);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff > 1 && diff < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
  function fmtLeft(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`;
  }
  function fmtDur(sec) {
    if (sec >= 3600 && sec % 3600 === 0) return `${sec / 3600} hr`;
    if (sec >= 60 && sec % 60 === 0) return `${sec / 60} min`;
    if (sec > 60) return `${Math.floor(sec / 60)} min ${sec % 60} sec`;
    return `${sec} sec`;
  }
  const daysSince = (iso) => (iso ? -dayDiff(parseDay(iso)) : Infinity);

  let toastT;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show'), 3000);
  }

  // =========================================================== sample data
  function demoStates() {
    const now = new Date().toISOString();
    const mk = (entity_id, state, attributes) => ({ entity_id, state, attributes, last_changed: now });
    return [
      mk('light.kitchen', 'on', { friendly_name: 'Kitchen', brightness: 204, supported_color_modes: ['brightness'] }),
      mk('light.living_room', 'off', { friendly_name: 'Living Room', supported_color_modes: ['brightness'] }),
      mk('light.porch', 'on', { friendly_name: 'Porch', supported_color_modes: ['onoff'] }),
      mk('light.hallway', 'off', { friendly_name: 'Hallway', supported_color_modes: ['onoff'] }),
      mk('switch.coffee_maker', 'off', { friendly_name: 'Coffee Maker' }),
      mk('lock.front_door', 'locked', { friendly_name: 'Front Door' }),
      mk('cover.garage_door', 'closed', { friendly_name: 'Garage Door', device_class: 'garage' }),
      mk('climate.thermostat', 'heat', { friendly_name: 'Thermostat', current_temperature: 68, temperature: 70, min_temp: 50, max_temp: 85, hvac_action: 'heating' }),
      mk('scene.good_morning', now, { friendly_name: 'Good Morning' }),
      mk('scene.good_night', now, { friendly_name: 'Good Night' }),
      mk('scene.movie_time', now, { friendly_name: 'Movie Time' }),
      mk('media_player.living_room', 'paused', { friendly_name: 'Living Room Speaker', media_title: 'Saturday Morning Mix', media_artist: 'Family playlist', volume_level: 0.35, source: 'Spotify', source_list: ['Spotify', 'AirPlay', 'Radio'] }),
      mk('media_player.kitchen', 'idle', { friendly_name: 'Kitchen Speaker', volume_level: 0.5 }),
      mk('camera.front_porch', 'idle', { friendly_name: 'Front Porch' }),
      mk('camera.driveway', 'idle', { friendly_name: 'Driveway' }),
      mk('binary_sensor.front_doorbell', 'off', { friendly_name: 'Front Doorbell', device_class: 'occupancy' }),
      mk('binary_sensor.back_door', 'off', { friendly_name: 'Back Door', device_class: 'door' }),
      mk('binary_sensor.hallway_smoke', 'off', { friendly_name: 'Hallway Smoke Alarm', device_class: 'smoke' }),
      mk('binary_sensor.water_heater_leak', 'off', { friendly_name: 'Water Heater Leak', device_class: 'moisture' }),
      mk('sensor.garage_temperature', '54', { friendly_name: 'Garage Temperature', unit_of_measurement: '°F', device_class: 'temperature' }),
      mk('sensor.home_power', '1840', { friendly_name: 'Home Power', unit_of_measurement: 'W', device_class: 'power' }),
      mk('sensor.home_energy_today', '14.2', { friendly_name: 'Home Energy Today', unit_of_measurement: 'kWh', device_class: 'energy' }),
      mk('sensor.fridge_power', '118', { friendly_name: 'Fridge', unit_of_measurement: 'W', device_class: 'power' }),
      mk('sensor.office_power', '86', { friendly_name: 'Office Desk', unit_of_measurement: 'W', device_class: 'power' }),
      mk('sensor.dryer_power', '0', { friendly_name: 'Dryer', unit_of_measurement: 'W', device_class: 'power' }),
      mk('sensor.ev_charger_power', '1150', { friendly_name: 'EV Charger', unit_of_measurement: 'W', device_class: 'power' }),
      mk('person.lee', 'home', { friendly_name: 'Lee' }),
      mk('calendar.lee', 'off', { friendly_name: 'Lee' }),
      mk('calendar.family', 'off', { friendly_name: 'Family' }),
    ];
  }
  const DEMO_AREAS = { kitchen: 'Kitchen', living: 'Living Room', entry: 'Entry', garage: 'Garage', outside: 'Outside', hall: 'Hallway' };
  const DEMO_ENTITY_AREA = {
    'light.kitchen': 'kitchen', 'switch.coffee_maker': 'kitchen', 'media_player.kitchen': 'kitchen',
    'light.living_room': 'living', 'media_player.living_room': 'living', 'climate.thermostat': 'living',
    'lock.front_door': 'entry', 'binary_sensor.back_door': 'entry', 'binary_sensor.front_doorbell': 'entry',
    'cover.garage_door': 'garage', 'sensor.garage_temperature': 'garage', 'binary_sensor.water_heater_leak': 'garage',
    'light.porch': 'outside', 'camera.front_porch': 'outside', 'camera.driveway': 'outside',
    'light.hallway': 'hall', 'binary_sensor.hallway_smoke': 'hall',
  };
  const DEMO_FAVS = ['light.kitchen', 'light.living_room', 'lock.front_door', 'climate.thermostat', 'cover.garage_door', 'scene.good_night'];
  const DEMO_CAL_OWNERS = { 'calendar.lee': 'p1', 'calendar.family': 'p2' };

  function demoEvents() {
    const at = (offset, h, m, durMin) => { const s = addDays(new Date(), offset); s.setHours(h, m, 0, 0); return { start: s, end: new Date(s.getTime() + durMin * 60000), allDay: false }; };
    const allDay = (offset) => { const s = startOfDay(addDays(new Date(), offset)); return { start: s, end: addDays(s, 1), allDay: true }; };
    return [
      { title: 'Lunch with the crew', ...at(0, 12, 0, 60), cal: 'calendar.lee' },
      { title: 'Dinner with friends', ...at(0, 18, 30, 120), cal: 'calendar.family' },
      { title: 'Trash and recycling', ...allDay(1), cal: 'calendar.family' },
      { title: 'Plan review meeting', ...at(1, 9, 0, 60), cal: 'calendar.lee', location: 'Station 1' },
      { title: 'Small group', ...at(2, 18, 30, 90), cal: 'calendar.family' },
      { title: 'Site walk', ...at(3, 10, 0, 60), cal: 'calendar.lee' },
      { title: 'Soccer practice', ...at(4, 16, 30, 90), cal: 'calendar.family', location: 'Park field' },
      { title: 'Oil change', ...at(5, 8, 0, 60), cal: 'calendar.lee' },
      { title: 'Family movie night', ...at(6, 19, 0, 150), cal: 'calendar.family' },
    ].map((e) => ({ location: '', ...e })).sort((a, b) => a.start - b.start);
  }

  function sampleFeed() {
    return {
      airbnb: [
        { listing: 'Wall St', type: 'check-in', date: isoDay(0), time: '4:00 PM' },
        { listing: 'Broadway', type: 'check-out', date: isoDay(1), time: '11:00 AM' },
        { listing: 'Broadway', type: 'check-in', date: isoDay(1), time: '4:00 PM' },
        { listing: 'Wall St', type: 'check-out', date: isoDay(3), time: '11:00 AM' },
      ],
      inspections: { completed: 186, goal: 300, scheduled: [{ date: isoDay(1), time: '9:30 AM', name: 'Annual inspection' }, { date: isoDay(2), time: '1:00 PM', name: 'Re-inspection' }] },
      ev: [{ site: 'Site A', status: 'Permit approved' }, { site: 'Site B', status: 'In plan review' }, { site: 'Site C', status: 'Utility design' }],
    };
  }

  function sampleLists() {
    const it = (text, who = '', due = '') => ({ id: uid(), text, done: false, who, due, at: Date.now() });
    return {
      groceries: [it('Milk'), it('Eggs'), it('Coffee'), it('Honeycrisp apples'), it('Tortillas')],
      chores: [it('Take out trash and recycling', 'p1', isoDay(0)), it('Unload the dishwasher', 'p2', isoDay(0)), it('Water the plants', 'p2', ''), it('Mow the lawn', 'p1', isoDay(2))],
      reminders: [it('Change the furnace filter', 'p1', isoDay(3)), it('Renew vehicle tabs', 'p1', isoDay(9))],
      board: [
        { id: uid(), text: 'Pizza night Friday. Vote for toppings by Thursday!', who: 'p2', at: Date.now() - 3 * 3600000 },
        { id: uid(), text: 'Plumber coming Tuesday 10 to noon.', who: 'p1', at: Date.now() - 26 * 3600000 },
      ],
      _sample: { groceries: true, chores: true, reminders: true, board: true },
    };
  }

  function samplePackages() {
    return [
      { id: uid(), label: 'Furnace filters', number: '1Z999AA10123456784', carrier: 'UPS', expected: isoDay(1), delivered: false, sample: true },
      { id: uid(), label: 'Kids’ shoes', number: 'TBA123456789000', carrier: 'Amazon', expected: isoDay(0), delivered: false, sample: true },
    ];
  }

  function defaultEmergency() {
    return {
      address: '',
      directions: '',
      contacts: [
        { id: 'c1', name: 'Fire, police, medical', phone: '911' },
        { id: 'c2', name: 'Poison Control', phone: '1-800-222-1222' },
      ],
      gas: '', water: '', power: '', extinguishers: '', meeting: '', medical: '', notes: '', smokeTested: '',
    };
  }

  const SAMPLE_RECIPE = {
    id: 'sample-cornbread',
    title: 'Cast-Iron Skillet Cornbread',
    sample: true,
    ingredients: ['1 cup yellow cornmeal', '1 cup all-purpose flour', '1/4 cup sugar', '1 tbsp baking powder', '1 tsp salt', '1 cup buttermilk', '2 large eggs', '7 tbsp butter, melted (1 tbsp for the skillet)'],
    steps: [
      'Put a 10-inch cast-iron skillet in the oven and preheat to 425°F for 15 minutes.',
      'Whisk the cornmeal, flour, sugar, baking powder and salt in a large bowl.',
      'In a second bowl, whisk the buttermilk, eggs and 6 tbsp melted butter.',
      'Pour the wet ingredients into the dry and stir just until combined. A few lumps are fine.',
      'Carefully take out the hot skillet, add 1 tbsp butter and swirl to coat.',
      'Pour in the batter and bake 20 to 25 minutes, until the top is golden and a toothpick comes out clean.',
      'Let it rest 10 minutes before slicing.',
    ],
  };

  // ========================================================= local stores
  let LISTS = store.get('lists', null) || sampleLists();
  if (!LISTS.board) LISTS.board = [];
  if (!LISTS._sample) LISTS._sample = {};
  const saveLists = () => store.set('lists', LISTS);
  let PKGS = store.get('packages', null) || samplePackages();
  const savePkgs = () => store.set('packages', PKGS);
  const EMERG = Object.assign(defaultEmergency(), store.get('emergency', {}));
  const saveEmerg = () => store.set('emergency', EMERG);
  const MEALS = store.get('meals', null) || { [isoDay(0)]: { recipe: 'sample-cornbread', text: 'Chili' }, _sample: true };
  const saveMeals = () => store.set('meals', MEALS);
  let recipes = store.get('recipes', null) || [SAMPLE_RECIPE];
  const saveRecipes = () => store.set('recipes', recipes);
  let RINGS = store.get('rings', []);

  // ========================================================= Home Assistant
  const H = {
    live: false, status: 'sample', message: '',
    states: {}, areas: {}, entityArea: {}, hidden: new Set(),
    ws: null, nextId: 1, pending: new Map(), subs: new Map(), retryTimer: null, noRetry: false,
  };
  const SUPPORTED = ['light', 'switch', 'fan', 'input_boolean', 'lock', 'cover', 'climate', 'scene', 'script', 'media_player', 'camera', 'binary_sensor', 'sensor'];

  function useDemo() {
    H.live = false;
    H.states = {};
    demoStates().forEach((s) => { H.states[s.entity_id] = s; });
    H.areas = { ...DEMO_AREAS };
    H.entityArea = { ...DEMO_ENTITY_AREA };
    H.hidden = new Set();
  }

  function setHA(status, message = '') {
    H.status = status;
    H.message = message;
    renderTop();
    if (APP.name === 'settings') { const el = $('#ha-status'); if (el) el.outerHTML = haStatusHTML(); }
  }
  const haBase = () => (S.haUrl || '').trim().replace(/\/+$/, '');

  function haClose() {
    clearTimeout(H.retryTimer);
    if (H.ws) { const ws = H.ws; H.ws = null; try { ws.close(); } catch (e) { /* closed */ } }
    H.pending.forEach((p) => p.reject(new Error('closed')));
    H.pending.clear();
    H.subs.clear();
  }

  function haConnect() {
    haClose();
    const base = haBase(), token = (S.haToken || '').trim();
    if (!base || !token) { useDemo(); setHA('sample'); refreshCalendar(); renderAll(); return; }
    let u;
    try { u = new URL(base); } catch (e) { useDemo(); setHA('error', 'That address isn’t a full web address. Start it with http:// or https://.'); renderAll(); return; }
    if (location.protocol === 'https:' && u.protocol === 'http:') {
      useDemo();
      setHA('error', 'This page opens over https, so Safari blocks an http Home Assistant address. Use an https address for Home Assistant, or run this app from your Umbrel. Details are below.');
      renderAll();
      return;
    }
    const wsUrl = (u.protocol === 'https:' ? 'wss://' : 'ws://') + u.host + u.pathname.replace(/\/$/, '') + '/api/websocket';
    H.noRetry = false;
    setHA('connecting');
    let ws;
    try { ws = new WebSocket(wsUrl); } catch (e) { setHA('error', 'Couldn’t open a connection to Home Assistant at that address.'); return; }
    H.ws = ws;
    ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } haOnMessage(ws, m, token); };
    ws.onclose = () => {
      if (H.ws !== ws) return;
      H.ws = null;
      H.pending.forEach((p) => p.reject(new Error('closed')));
      H.pending.clear();
      H.subs.clear();
      if (H.noRetry) return;
      setHA(H.live ? 'retrying' : 'error', H.live ? 'Lost the connection. Retrying every 5 seconds.' : 'Couldn’t reach Home Assistant at that address. Check that the Umbrel is on and the address is right.');
      if (!H.live) useDemo();
      H.retryTimer = setTimeout(haConnect, H.live ? 5000 : 15000);
      renderAll();
    };
  }

  function haOnMessage(ws, m, token) {
    if (m.type === 'auth_required') ws.send(JSON.stringify({ type: 'auth', access_token: token }));
    else if (m.type === 'auth_invalid') {
      H.noRetry = true;
      useDemo();
      setHA('error', 'Home Assistant didn’t accept that token. Create a new long-lived access token and paste it again.');
      renderAll();
    } else if (m.type === 'auth_ok') haReady();
    else if (m.type === 'result') {
      const p = H.pending.get(m.id);
      if (p) { H.pending.delete(m.id); if (m.success) p.resolve(m.result); else p.reject(m.error || new Error('failed')); }
    } else if (m.type === 'event') {
      const cb = H.subs.get(m.id);
      if (cb) cb(m.event);
    }
  }

  function haSend(msg) {
    return new Promise((resolve, reject) => {
      if (!H.ws || H.ws.readyState !== 1) { reject(new Error('offline')); return; }
      const id = H.nextId++;
      H.pending.set(id, { resolve, reject });
      H.ws.send(JSON.stringify({ id, ...msg }));
      setTimeout(() => { if (H.pending.has(id)) { H.pending.delete(id); reject(new Error('timeout')); } }, 20000);
    });
  }
  function haSubscribe(msg, cb) {
    return new Promise((resolve, reject) => {
      if (!H.ws || H.ws.readyState !== 1) { reject(new Error('offline')); return; }
      const id = H.nextId++;
      H.subs.set(id, cb);
      H.pending.set(id, { resolve, reject });
      H.ws.send(JSON.stringify({ id, ...msg }));
    });
  }

  async function haReady() {
    try {
      await haSubscribe({ type: 'subscribe_events', event_type: 'state_changed' }, (ev) => {
        const d = ev && ev.data;
        if (!d) return;
        const old = d.old_state || H.states[d.entity_id];
        if (d.new_state) H.states[d.entity_id] = d.new_state; else delete H.states[d.entity_id];
        onStateChanged(d.entity_id, old, d.new_state);
        scheduleRender();
      });
      const list = await haSend({ type: 'get_states' });
      H.states = {};
      list.forEach((s) => { H.states[s.entity_id] = s; });
      H.areas = {}; H.entityArea = {}; H.hidden = new Set();
      H.live = true;
      setHA('connected');
      renderAll();
      loadRegistry();
      refreshCalendar();
      loadWeather();
      loadAllTodo();
      EN.at = {};
      loadPowerHistory(powerEntity());
    } catch (e) {
      setHA('error', 'Connected, but Home Assistant didn’t send your devices. Try Connect again.');
    }
  }

  async function loadRegistry() {
    // Rooms come from Home Assistant areas. These need an admin user's token.
    try {
      const [areas, ents, devs] = await Promise.all([
        haSend({ type: 'config/area_registry/list' }),
        haSend({ type: 'config/entity_registry/list' }),
        haSend({ type: 'config/device_registry/list' }),
      ]);
      H.areas = {};
      areas.forEach((a) => { H.areas[a.area_id] = a.name; });
      const devArea = {};
      devs.forEach((d) => { devArea[d.id] = d.area_id; });
      H.entityArea = {};
      H.hidden = new Set();
      ents.forEach((e) => {
        const a = e.area_id || devArea[e.device_id];
        if (a) H.entityArea[e.entity_id] = a;
        if (e.hidden_by || e.disabled_by || e.entity_category) H.hidden.add(e.entity_id);
      });
      scheduleRender();
    } catch (e) { /* non-admin token: no rooms */ }
  }

  function demoCall(domain, service, id, data) {
    const s = H.states[id];
    if (!s) return;
    const prev = { ...s, attributes: { ...s.attributes } };
    const a = s.attributes;
    if (service === 'toggle') { s.state = s.state === 'on' ? 'off' : 'on'; if (domain === 'light' && s.state === 'on' && !a.brightness && a.supported_color_modes?.[0] !== 'onoff') a.brightness = 255; }
    else if (service === 'turn_on' && ['light', 'switch', 'fan', 'input_boolean'].includes(domain)) { s.state = 'on'; if (data.brightness_pct) a.brightness = Math.round(data.brightness_pct * 2.55); }
    else if (service === 'turn_off') s.state = 'off';
    else if (domain === 'lock') s.state = service === 'unlock' ? 'unlocked' : 'locked';
    else if (domain === 'cover') s.state = service === 'open_cover' ? 'open' : 'closed';
    else if (domain === 'climate' && service === 'set_temperature') a.temperature = data.temperature;
    else if (domain === 'media_player') {
      if (service === 'media_play_pause') { s.state = s.state === 'playing' ? 'paused' : 'playing'; if (!a.media_title) { a.media_title = 'Kitchen Radio'; a.media_artist = 'Local station'; } }
      else if (service === 'media_next_track' || service === 'media_previous_track') { const songs = ['Saturday Morning Mix', 'Front Porch Songs', 'Dinner Jazz', 'Road Trip Classics']; a.media_title = songs[(Math.max(0, songs.indexOf(a.media_title)) + (service === 'media_next_track' ? 1 : 3)) % songs.length]; }
      else if (service === 'volume_set') a.volume_level = data.volume_level;
      else if (service === 'volume_mute') a.is_volume_muted = data.is_volume_muted;
      else if (service === 'select_source') a.source = data.source;
    }
    onStateChanged(id, prev, s);
    scheduleRender();
  }

  async function call(domain, service, id, data = {}) {
    if (!H.live) { demoCall(domain, service, id, data); return true; }
    try {
      await haSend({ type: 'call_service', domain, service, service_data: data, target: { entity_id: id } });
      return true;
    } catch (e) {
      toast(`Couldn’t reach ${entityName(id)}. Check the Home Assistant connection.`);
      return false;
    }
  }

  const entityName = (id) => H.states[id]?.attributes?.friendly_name || id;
  const domainOf = (id) => String(id).split('.')[0];
  const listable = (id) => SUPPORTED.includes(domainOf(id)) && !H.hidden.has(id);
  const idsOf = (...domains) => Object.keys(H.states).filter((id) => domains.includes(domainOf(id)) && !H.hidden.has(id));

  function favoriteIds() {
    const chosen = S.favorites.filter((id) => H.states[id]);
    if (chosen.length) return chosen;
    if (!H.live) return DEMO_FAVS.filter((id) => H.states[id]);
    const order = ['light', 'lock', 'climate', 'cover', 'switch', 'scene', 'media_player', 'fan', 'input_boolean'];
    const ids = idsOf(...order);
    ids.sort((a, b) => order.indexOf(domainOf(a)) - order.indexOf(domainOf(b)));
    return ids.slice(0, 6);
  }

  const cameraIds = () => idsOf('camera');
  function cameraSrc(id) {
    const pic = H.states[id]?.attributes?.entity_picture;
    if (!H.live || !pic) return '';
    return haBase() + pic + (pic.includes('?') ? '&' : '?') + '_=' + Date.now();
  }

  // Things that should happen the moment a device changes.
  function onStateChanged(id, oldS, newS) {
    const d = domainOf(id);
    if (!newS) return;
    if (isDoorbell(id)) {
      if (d === 'binary_sensor' && newS.state === 'on' && oldS && oldS.state !== 'on') ringDoorbell(id);
      if (d === 'event' && oldS && newS.state !== oldS.state && newS.state !== 'unavailable' && newS.state !== 'unknown') ringDoorbell(id);
    }
    const dc = newS.attributes?.device_class;
    if (d === 'binary_sensor' && HAZARDS[dc] && newS.state === 'on' && oldS && oldS.state !== 'on') hazardAlert(id);
    if (d === 'person' && oldS && oldS.state !== newS.state) personChanged(id, oldS.state, newS.state);
    if (d === 'todo' && Object.values(S.todo).includes(id) && (!oldS || oldS.state !== newS.state)) loadTodo(id);
  }

  // =============================================================== weather
  const WX = { now: null, daily: [], place: '', source: '' };
  function wmo(code, day = 1) {
    if (code === 0) return day ? ['sun', 'Clear'] : ['moon', 'Clear'];
    if (code <= 2) return [day ? 'partly' : 'moon', code === 1 ? 'Mostly clear' : 'Partly cloudy'];
    if (code === 3) return ['cloud', 'Cloudy'];
    if (code === 45 || code === 48) return ['fog', 'Fog'];
    if (code >= 51 && code <= 57) return ['rain', 'Drizzle'];
    if (code >= 61 && code <= 67) return ['rain', 'Rain'];
    if (code >= 71 && code <= 77) return ['snow', 'Snow'];
    if (code >= 80 && code <= 82) return ['rain', 'Showers'];
    if (code >= 85 && code <= 86) return ['snow', 'Snow showers'];
    if (code >= 95) return ['storm', 'Thunderstorms'];
    return ['cloud', 'Cloudy'];
  }
  function haCond(c) {
    const map = {
      sunny: ['sun', 'Sunny'], 'clear-night': ['moon', 'Clear'], partlycloudy: ['partly', 'Partly cloudy'], cloudy: ['cloud', 'Cloudy'],
      fog: ['fog', 'Fog'], rainy: ['rain', 'Rain'], pouring: ['rain', 'Heavy rain'], snowy: ['snow', 'Snow'], 'snowy-rainy': ['snow', 'Sleet'],
      hail: ['snow', 'Hail'], lightning: ['storm', 'Lightning'], 'lightning-rainy': ['storm', 'Thunderstorms'], windy: ['cloud', 'Windy'], 'windy-variant': ['cloud', 'Windy'],
    };
    return map[c] || ['cloud', cap(c || 'Unknown')];
  }
  async function loadWeather() {
    try {
      if (H.live && S.weatherEntity && H.states[S.weatherEntity]) {
        const st = H.states[S.weatherEntity];
        const [ic, text] = haCond(st.state);
        WX.now = { temp: st.attributes.temperature, icon: ic, text };
        WX.daily = [];
        try {
          const r = await haSend({ type: 'call_service', domain: 'weather', service: 'get_forecasts', target: { entity_id: S.weatherEntity }, service_data: { type: 'daily' }, return_response: true });
          const fc = r?.response?.[S.weatherEntity]?.forecast || [];
          WX.daily = fc.slice(0, 6).map((f) => { const [fi, ft] = haCond(f.condition); return { date: new Date(f.datetime), hi: f.temperature, lo: f.templow, icon: fi, text: ft, pop: f.precipitation_probability }; });
        } catch (e) { /* forecast optional */ }
        WX.place = st.attributes.friendly_name || S.place;
        WX.source = 'ha';
      } else {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(S.lat)}&longitude=${encodeURIComponent(S.lon)}` +
          '&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
          '&temperature_unit=fahrenheit&timezone=auto&forecast_days=6';
        const r = await fetch(url);
        if (!r.ok) throw new Error('weather ' + r.status);
        const j = await r.json();
        const [ic, text] = wmo(j.current.weather_code, j.current.is_day);
        WX.now = { temp: j.current.temperature_2m, icon: ic, text };
        WX.daily = j.daily.time.map((t, i) => { const [fi, ft] = wmo(j.daily.weather_code[i], 1); return { date: parseDay(t), hi: j.daily.temperature_2m_max[i], lo: j.daily.temperature_2m_min[i], icon: fi, text: ft, pop: j.daily.precipitation_probability_max?.[i] }; });
        WX.place = S.place;
        WX.source = 'open-meteo';
      }
      store.set('wxCache', { now: WX.now, daily: WX.daily, place: WX.place, at: Date.now() });
    } catch (e) {
      const c = store.get('wxCache', null);
      if (c && !WX.now) { WX.now = c.now; WX.daily = (c.daily || []).map((d) => ({ ...d, date: new Date(d.date) })); WX.place = c.place; }
    }
    scheduleRender();
  }

  // ======================================================= family calendar
  const CAL = { events: [], sample: true, note: '' };
  function calOwner(cal) {
    if (S.calendarOwners[cal] && personById(S.calendarOwners[cal])) return S.calendarOwners[cal];
    if (!H.live && DEMO_CAL_OWNERS[cal] && personById(DEMO_CAL_OWNERS[cal])) return DEMO_CAL_OWNERS[cal];
    const nm = (entityName(cal) + ' ' + cal).toLowerCase();
    const m = members().find((p) => nm.includes(p.name.toLowerCase()));
    return (m || sharedPerson() || {}).id || '';
  }
  const evColor = (e) => pColor(calOwner(e.cal));
  const evPerson = (e) => pName(calOwner(e.cal));

  async function refreshCalendar() {
    if (!H.live) { CAL.events = demoEvents(); CAL.sample = true; CAL.note = ''; scheduleRender(); return; }
    CAL.sample = false;
    const all = idsOf('calendar');
    const cals = S.calendars.length ? S.calendars.filter((id) => all.includes(id)) : all;
    if (!cals.length) { CAL.events = []; CAL.note = 'No calendars in Home Assistant yet. Add Google Calendar or CalDAV there and they appear here.'; scheduleRender(); return; }
    const start = addDays(startOfDay(new Date()), -1), end = addDays(start, 30);
    try {
      const r = await haSend({ type: 'call_service', domain: 'calendar', service: 'get_events', target: { entity_id: cals }, service_data: { start_date_time: isoLocal(start), end_date_time: isoLocal(end) }, return_response: true });
      const out = [];
      Object.entries(r?.response || {}).forEach(([cal, v]) => {
        (v.events || []).forEach((e) => {
          const allDay = !String(e.start).includes('T');
          out.push({ cal, title: e.summary || 'Untitled', location: e.location || '', allDay, start: allDay ? parseDay(e.start) : new Date(e.start), end: allDay ? parseDay(e.end) : new Date(e.end) });
        });
      });
      out.sort((a, b) => a.start - b.start);
      CAL.events = out;
      CAL.note = '';
    } catch (e) {
      CAL.note = 'Couldn’t load calendars from Home Assistant. It needs version 2023.12 or newer.';
    }
    scheduleRender();
  }
  const visibleEvents = () => CAL.events.filter((e) => !APP.calHide.has(calOwner(e.cal)));
  const upcoming = () => { const now = new Date(); return CAL.events.filter((e) => e.end > now); };
  const eventsOn = (day, list = CAL.events) => { const a = startOfDay(day), b = addDays(a, 1); return list.filter((e) => e.start < b && e.end > a); };
  const evWhen = (e) => (e.allDay ? 'All day' : `${fmtClock(e.start)} – ${fmtClock(e.end)}`);

  // ============================================================ task lists
  const TODO = { items: {} };
  const haList = (kind) => { const e = S.todo[kind]; return H.live && e && H.states[e] ? e : ''; };
  const items = (kind) => { const e = haList(kind); return e ? TODO.items[e] || [] : LISTS[kind] || []; };
  const listIsSample = (kind) => !haList(kind) && !!LISTS._sample?.[kind];
  const kindName = (k) => (k === 'board' ? 'the message board' : ((LIST_KINDS.find((x) => x.id === k) || {}).name || k).toLowerCase());

  function fromHA(it) {
    let text = it.summary || '', who = '';
    const m = /^\[([^\]]+)\]\s*(.*)$/.exec(text);
    if (m) { who = nameToId(m[1]); text = m[2]; }
    const d = /(?:Assigned to|From):\s*(.+)/i.exec(it.description || '');
    if (d) who = nameToId(d[1]);
    return { id: it.uid, text, done: it.status === 'completed', who, due: it.due || '', at: null };
  }
  async function loadTodo(e) {
    if (!H.live || !e) return;
    try {
      const r = await haSend({ type: 'todo/item/list', entity_id: e });
      TODO.items[e] = (r.items || []).map(fromHA);
    } catch (err) { TODO.items[e] = TODO.items[e] || []; }
    scheduleRender();
  }
  const loadAllTodo = () => new Set(Object.values(S.todo).filter(Boolean)).forEach((e) => { if (H.states[e]) loadTodo(e); });

  async function addTask(kind, text, who, due) {
    text = String(text || '').trim();
    if (!text) return;
    const e = haList(kind);
    if (e) {
      const f = H.states[e].attributes.supported_features || 0;
      const data = { item: text };
      const name = who ? pName(who) : '';
      if (name) { if (f & 64) data.description = (kind === 'board' ? 'From: ' : 'Assigned to: ') + name; else data.item = `[${name}] ${text}`; }
      if (due && (f & 16)) data.due_date = due;
      if (await call('todo', 'add_item', e, data)) loadTodo(e);
    } else {
      (LISTS[kind] = LISTS[kind] || []).push({ id: uid(), text, done: false, who: who || '', due: due || '', at: Date.now() });
      LISTS._sample[kind] = false;
      saveLists();
      scheduleRender();
    }
  }
  async function toggleTask(kind, id) {
    const e = haList(kind);
    const it = items(kind).find((x) => x.id === id);
    if (!it) return;
    it.done = !it.done;
    if (e) { scheduleRender(); if (await call('todo', 'update_item', e, { item: id, status: it.done ? 'completed' : 'needs_action' })) loadTodo(e); }
    else { LISTS._sample[kind] = false; saveLists(); scheduleRender(); }
  }
  async function removeTask(kind, id) {
    const e = haList(kind);
    if (e) { if (await call('todo', 'remove_item', e, { item: id })) loadTodo(e); }
    else { LISTS[kind] = (LISTS[kind] || []).filter((x) => x.id !== id); LISTS._sample[kind] = false; saveLists(); scheduleRender(); }
  }
  async function clearDone(kind) {
    const e = haList(kind);
    if (e) { if (await call('todo', 'remove_completed_items', e)) loadTodo(e); }
    else { LISTS[kind] = (LISTS[kind] || []).filter((x) => !x.done); saveLists(); scheduleRender(); }
  }
  function dueInfo(it) {
    if (!it.due) return null;
    const d = parseDay(String(it.due).slice(0, 10));
    const diff = dayDiff(d);
    const over = !it.done && diff < 0;
    const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : diff < 0 ? `${-diff} days late` : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    return { label, over, diff };
  }

  // ============================================================ Bauder HQ
  const FEED = { data: sampleFeed(), sample: true, note: '', updated: 0 };
  function normalizeFeed(j) {
    return {
      airbnb: Array.isArray(j.airbnb) ? j.airbnb : [],
      inspections: j.inspections && typeof j.inspections === 'object' ? j.inspections : { completed: 0, goal: 0, scheduled: [] },
      ev: Array.isArray(j.ev) ? j.ev : [],
    };
  }
  async function loadFeed() {
    const url = (S.feedUrl || '').trim();
    if (!url) { FEED.data = sampleFeed(); FEED.sample = true; FEED.note = ''; scheduleRender(); return; }
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error('feed ' + r.status);
      FEED.data = normalizeFeed(await r.json());
      FEED.sample = false; FEED.note = ''; FEED.updated = Date.now();
      store.set('feedCache', { data: FEED.data, at: FEED.updated });
    } catch (e) {
      const c = store.get('feedCache', null);
      if (c) { FEED.data = c.data; FEED.sample = false; FEED.updated = c.at; FEED.note = 'Couldn’t reach the feed. Showing the last data received.'; }
      else { FEED.data = sampleFeed(); FEED.sample = true; FEED.note = 'Couldn’t reach the feed at that address. Showing sample data.'; }
    }
    scheduleRender();
    if (APP.name === 'settings') { const el = $('#feed-status'); if (el) el.textContent = feedStatusText(); }
  }
  const feedStatusText = () => FEED.note || (FEED.sample ? 'No feed set. Widgets show sample data.' : `Updated ${fmtClock(new Date(FEED.updated))}.`);
  function evStage(item) {
    if (item.stage) return item.stage;
    const s = String(item.status || '');
    if (/approved|complete|energi[sz]ed|live|commissioned|done/i.test(s)) return 'good';
    if (/denied|rejected|failed|hold|stalled|expired/i.test(s)) return 'crit';
    return 'warn';
  }

  // ================================================================ energy
  const EN = { hist: {}, at: {} };
  function powerEntity() {
    if (S.energy.power && H.states[S.energy.power]) return S.energy.power;
    const c = idsOf('sensor').filter((id) => H.states[id].attributes.device_class === 'power');
    return c.find((id) => /home|house|total|grid|whole|main/i.test(id + ' ' + entityName(id))) || c[0] || '';
  }
  function energyEntity() {
    if (S.energy.energy && H.states[S.energy.energy]) return S.energy.energy;
    const c = idsOf('sensor').filter((id) => H.states[id].attributes.device_class === 'energy');
    return c.find((id) => /today|daily/i.test(id + ' ' + entityName(id))) || c[0] || '';
  }
  function powerW(id) {
    const s = H.states[id];
    if (!s) return null;
    let v = parseFloat(s.state);
    if (!Number.isFinite(v)) return null;
    if (/^kW$/i.test(s.attributes.unit_of_measurement || '')) v *= 1000;
    return v;
  }
  const fmtW = (w) => (w == null ? '—' : w >= 1000 ? `${(w / 1000).toFixed(1)} kW` : `${Math.round(w)} W`);
  function demoCurve() {
    const now = Date.now(), out = [];
    for (let i = 0; i < 48; i++) {
      const h = new Date(now - (47 - i) * 1800000).getHours() + 0.5;
      let v = 520 + 140 * Math.sin(i * 1.7);
      if (h >= 6.5 && h <= 9) v += 1700;
      if (h >= 17 && h <= 21.5) v += 2300 + 400 * Math.sin(i);
      if (h >= 23 || h <= 4) v += 1150;
      out.push(Math.max(180, Math.round(v)));
    }
    out[47] = powerW(powerEntity()) ?? out[47];
    return out;
  }
  async function loadPowerHistory(id) {
    if (!id) return;
    if (!H.live) { EN.hist[id] = demoCurve(); return; }
    if (EN.at[id] && Date.now() - EN.at[id] < 10 * 60000) return;
    EN.at[id] = Date.now();
    try {
      const end = new Date(), start = new Date(end.getTime() - 86400000);
      const r = await haSend({ type: 'history/history_during_period', start_time: start.toISOString(), end_time: end.toISOString(), entity_ids: [id], minimal_response: true, no_attributes: true, significant_changes_only: false });
      const kw = /^kW$/i.test(H.states[id]?.attributes?.unit_of_measurement || '') ? 1000 : 1;
      const pts = (r[id] || []).map((x) => ({ t: x.lu != null ? x.lu * 1000 : x.lc != null ? x.lc * 1000 : Date.parse(x.last_updated || x.last_changed), v: parseFloat(x.s ?? x.state) * kw })).filter((p) => Number.isFinite(p.v) && Number.isFinite(p.t)).sort((a, b) => a.t - b.t);
      const out = [];
      let j = 0, last = pts.length ? pts[0].v : null;
      for (let i = 0; i < 48; i++) {
        const edge = start.getTime() + (i + 1) * 1800000;
        while (j < pts.length && pts[j].t <= edge) { last = pts[j].v; j++; }
        out.push(last);
      }
      EN.hist[id] = out;
      scheduleRender();
    } catch (e) { /* history optional */ }
  }
  function sparkHTML(vals) {
    const v = (vals || []).filter((x) => x != null);
    if (v.length < 2) return '<div class="muted" style="font-size:12.5px">No history yet</div>';
    const max = Math.max(...v) * 1.12 || 1;
    const pts = vals.map((x, i) => [(i / (vals.length - 1)) * 100, x == null ? null : 40 - (x / max) * 40]).filter((p) => p[1] != null);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
    const area = `${line} L100,40 L${pts[0][0].toFixed(2)},40 Z`;
    const endY = (pts[pts.length - 1][1] / 40) * 100;
    return `<svg class="spark" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><line class="grid" x1="0" x2="100" y1="10" y2="10"/><line class="grid" x1="0" x2="100" y1="20" y2="20"/><line class="grid" x1="0" x2="100" y1="30" y2="30"/><path class="area" d="${area}"/><path class="line" d="${line}"/></svg><span class="enddot" style="top:${endY.toFixed(1)}%"></span>`;
  }

  // ================================================================ timers
  let timers = store.get('timers', []);
  const saveTimers = () => store.set('timers', timers);
  let ringing = null;
  let audioCtx = null;
  function ensureAudio() {
    try {
      if (!audioCtx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); }
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { /* no audio */ }
  }
  function tone(freq, start, dur, vol = 0.35, type = 'sine') {
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime + start;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const beep = () => { [0, 0.22, 0.44].forEach((dt) => tone(880, dt, 0.18)); };
  const chime = () => { tone(659.25, 0, 0.9, 0.4); tone(523.25, 0.55, 1.2, 0.4); };
  const siren = () => { tone(960, 0, 0.45, 0.4, 'square'); tone(770, 0.5, 0.45, 0.4, 'square'); };

  function addTimer(sec, label) {
    ensureAudio();
    const t = { id: uid(), label: label || `${fmtDur(sec)} timer`, total: sec, end: Date.now() + sec * 1000, done: false };
    timers.push(t);
    saveTimers();
    toast(`${t.label} started`);
    renderAll();
  }
  function cancelTimer(id) { timers = timers.filter((t) => t.id !== id); saveTimers(); if (ringing && ringing.id === id) stopRing(); renderAll(); }
  function tickTimers() {
    const now = Date.now();
    timers.forEach((t) => { if (!t.done && now >= t.end) { t.done = true; saveTimers(); startRing(t); } });
    $$('[data-left]').forEach((el) => { const t = timers.find((x) => x.id === el.dataset.left); if (t) el.textContent = t.done ? 'Done' : fmtLeft(t.end - now); });
    const pill = $('#timer-pill-text');
    if (pill) { const t = nextTimer(); pill.textContent = t ? fmtLeft(t.end - now) : ''; }
  }
  const nextTimer = () => timers.filter((t) => !t.done).sort((a, b) => a.end - b.end)[0];
  function startRing(t) {
    if (idleOn) exitIdle();
    clearInterval(ringing?.iv);
    ringing = { id: t.id, started: Date.now(), iv: setInterval(() => { if (Date.now() - ringing.started > 60000) stopRing(true); else beep(); }, 1200) };
    beep();
    const el = $('#alarm');
    el.innerHTML = `<div class="box alarm-box" role="alertdialog" aria-labelledby="alarm-t"><div>${icon('timer')}</div><div class="t" id="alarm-t">${esc(t.label)}</div><div>Time’s up.</div><button type="button" data-act="stop-ring">Stop</button></div>`;
    el.hidden = false;
    renderAll();
  }
  function stopRing(keepTimer) {
    if (!ringing) return;
    clearInterval(ringing.iv);
    const id = ringing.id;
    ringing = null;
    $('#alarm').hidden = true;
    if (!keepTimer) timers = timers.filter((t) => t.id !== id);
    saveTimers();
    renderAll();
  }

  // =============================================================== recipes
  function parseRecipe(title, text) {
    const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const headIng = /^(ingredients?|you(’|')ll need|what you(’|')ll need)\s*:?\s*$/i;
    const headSteps = /^(directions|instructions|method|steps|preparation|how to make( it)?)\s*:?\s*$/i;
    const qty = /^(\d|[½⅓⅔¼¾⅛]|one\s|two\s|three\s|a\s|an\s|pinch|dash|handful)/i;
    if (!title && lines.length && lines[0].length < 70 && !qty.test(lines[0]) && !headIng.test(lines[0])) title = lines.shift();
    const ingredients = [], steps = [];
    let mode = null;
    lines.forEach((l) => {
      if (headIng.test(l)) { mode = 'i'; return; }
      if (headSteps.test(l)) { mode = 's'; return; }
      const clean = l.replace(/^([-*•▢□◦·]|\d+[.)]|step\s*\d+\s*[:.)-]?)\s*/i, '').trim();
      if (!clean) return;
      if (mode === 'i') ingredients.push(clean);
      else if (mode === 's') steps.push(clean);
      else if (qty.test(clean) && clean.length < 70 && !/[.!]$/.test(clean)) ingredients.push(clean);
      else steps.push(clean);
    });
    return { id: uid(), title: title || 'Untitled recipe', ingredients, steps };
  }
  function stepTimers(text) {
    const out = [];
    const re = /(\d+(?:\.\d+)?)(?:\s*(?:to|-|–|or)\s*(\d+(?:\.\d+)?))?\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi;
    let m;
    while ((m = re.exec(text))) {
      const unit = m[3].toLowerCase();
      const mult = unit.startsWith('h') ? 3600 : unit.startsWith('m') ? 60 : 1;
      const sec = Math.round(parseFloat(m[1]) * mult);
      if (sec > 0 && !out.some((o) => o.sec === sec)) out.push({ sec, label: m[0] });
    }
    return out;
  }
  function mealFor(iso) {
    const m = MEALS[iso];
    if (!m) return '';
    const r = recipes.find((x) => x.id === m.recipe);
    return [m.text, r ? r.title : ''].filter(Boolean).join(' with ');
  }

  // ================================================================ photos
  const DB = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => {
        const r = indexedDB.open('bauder-home', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' });
        r.onsuccess = () => { this.db = r.result; res(this.db); };
        r.onerror = () => rej(r.error);
      });
    },
    async tx(mode, fn) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const t = db.transaction('photos', mode);
        const req = fn(t.objectStore('photos'));
        t.oncomplete = () => res(req && req.result);
        t.onerror = () => rej(t.error);
      });
    },
    all() { return this.tx('readonly', (s) => s.getAll()); },
    put(rec) { return this.tx('readwrite', (s) => s.put(rec)); },
    del(id) { return this.tx('readwrite', (s) => s.delete(id)); },
  };
  let photos = [];
  const selectedPhotos = new Set();
  async function loadPhotos() {
    try {
      const all = (await DB.all()) || [];
      photos.forEach((p) => URL.revokeObjectURL(p.url));
      photos = all.sort((a, b) => a.added - b.added).map((p) => ({ id: p.id, url: URL.createObjectURL(p.blob) }));
    } catch (e) { photos = []; }
  }
  function downscale(file, max) {
    return new Promise((resolve) => {
      const img = new Image();
      const src = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k);
        c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(src);
        c.toBlob((b) => resolve(b || file), 'image/jpeg', 0.86);
      };
      img.onerror = () => { URL.revokeObjectURL(src); resolve(file); };
      img.src = src;
    });
  }
  async function addPhotos(files) {
    const list = Array.from(files || []).filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    toast(`Adding ${plural(list.length, 'photo')}…`);
    try {
      for (const f of list) await DB.put({ id: uid(), blob: await downscale(f, 2048), added: Date.now() });
      await loadPhotos();
      toast(`Added ${plural(list.length, 'photo')}`);
    } catch (e) { toast('Couldn’t save photos. The iPad may be low on storage.'); }
    if (APP.name === 'photos') renderApp();
  }

  // ======================================================= house security
  function houseStatus() {
    const issues = [];
    Object.entries(H.states).forEach(([id, s]) => {
      if (H.hidden.has(id)) return;
      const d = domainOf(id), a = s.attributes || {}, dc = a.device_class || '', n = a.friendly_name || id;
      if (d === 'binary_sensor' && s.state === 'on') {
        if (HAZARDS[dc]) issues.push({ lvl: 'crit', text: `${HAZARDS[dc]} · ${n}`, id });
        else if (['door', 'window', 'garage_door', 'opening'].includes(dc)) issues.push({ lvl: 'warn', text: `${n} is open`, id });
      }
      if (d === 'lock') {
        if (s.state === 'unlocked') issues.push({ lvl: 'warn', text: `${n} is unlocked`, id, fix: 'lock' });
        else if (s.state === 'jammed') issues.push({ lvl: 'crit', text: `${n} is jammed`, id });
      }
      if (d === 'cover' && a.device_class === 'garage' && (s.state === 'open' || s.state === 'opening')) issues.push({ lvl: 'warn', text: `${n} is open`, id, fix: 'close' });
      if (d === 'alarm_control_panel' && s.state === 'triggered') issues.push({ lvl: 'crit', text: `${n} alarm is going off`, id });
    });
    const since = daysSince(EMERG.smokeTested);
    if (since > 31) issues.push({ lvl: 'info', text: EMERG.smokeTested ? `Smoke alarms due for a test (last ${since} days ago)` : 'Log your monthly smoke alarm test', app: 'emergency' });
    const rank = { crit: 0, warn: 1, info: 2 };
    issues.sort((a, b) => rank[a.lvl] - rank[b.lvl]);
    const alarm = idsOf('alarm_control_panel').map((id) => H.states[id])[0];
    const home = idsOf('person').filter((id) => H.states[id].state === 'home').map(entityName);
    const level = issues.some((i) => i.lvl === 'crit') ? 'crit' : issues.some((i) => i.lvl === 'warn') ? 'warn' : 'good';
    const real = issues.filter((i) => i.lvl !== 'info').length;
    const title = level === 'crit' ? 'Needs attention' : real ? `${plural(real, 'thing')} to check` : 'All secure';
    return { issues, level, alarm, home, title };
  }

  // Doorbell
  function isDoorbell(id) {
    if (S.doorbellEntity) return id === S.doorbellEntity;
    return ['binary_sensor', 'event'].includes(domainOf(id)) && /doorbell/i.test(id + ' ' + entityName(id));
  }
  function doorbellCam() {
    const cams = cameraIds();
    if (S.doorbellCamera && cams.includes(S.doorbellCamera)) return S.doorbellCamera;
    return cams.find((c) => /door|porch|front|bell/i.test(c + ' ' + entityName(c))) || cams[0] || '';
  }
  let bellTimer = null;
  function ringDoorbell(src) {
    RINGS.unshift({ at: Date.now(), src: src || '' });
    RINGS = RINGS.slice(0, 20);
    store.set('rings', RINGS);
    if (idleOn) exitIdle();
    ensureAudio();
    chime();
    const cam = doorbellCam();
    const el = $('#bell');
    el.innerHTML = `<div class="box bell-box" role="alertdialog" aria-labelledby="bell-t"><div class="t" id="bell-t">Someone’s at the door</div>${cam ? camHTML(cam) : ''}<div class="muted">${esc(src ? entityName(src) : 'Doorbell')} · ${esc(fmtClock(new Date()))}</div><button type="button" data-act="bell-close">Dismiss</button></div>`;
    el.hidden = false;
    clearTimeout(bellTimer);
    bellTimer = setTimeout(() => { el.hidden = true; el.innerHTML = ''; }, 90000);
    scheduleRender();
  }

  // Smoke, CO, gas, heat and leak alerts
  let hazard = null;
  function hazardAdvice(dc) {
    if (dc === 'carbon_monoxide') return 'Get everyone into fresh air, then call 911.';
    if (dc === 'gas') return 'Leave the house without switching anything on or off. Call 911 or the gas company from outside.';
    if (dc === 'moisture') return 'Find the leak and shut off the water if needed.';
    return 'If there is fire or smoke, get everyone out and call 911 from outside.';
  }
  function hazardAlert(id) {
    const dc = H.states[id]?.attributes?.device_class || 'smoke';
    const name = entityName(id);
    if (idleOn) exitIdle();
    ensureAudio();
    clearInterval(hazard?.iv);
    const started = Date.now();
    hazard = { id, iv: setInterval(() => { if (Date.now() - started > 180000) stopHazard(); else siren(); }, 1000) };
    siren();
    const el = $('#hazard');
    el.innerHTML = `<div class="box hazard-box" role="alertdialog" aria-labelledby="hz-t"><div>${icon('alert')}</div><div class="t" id="hz-t">${esc(HAZARDS[dc] || 'Alarm')} detected</div><div>${esc(name)}</div><div>${esc(hazardAdvice(dc))}</div><button type="button" data-act="hazard-info">Show emergency info</button><button type="button" class="alt" data-act="hazard-close">Silence</button></div>`;
    el.hidden = false;
    scheduleRender();
  }
  function stopHazard() {
    if (hazard) clearInterval(hazard.iv);
    hazard = null;
    $('#hazard').hidden = true;
    $('#hazard').innerHTML = '';
  }

  // Arrivals
  function personChanged(id, from, to) {
    if (to === 'home' && from !== 'home') {
      const m = S.arrivals[id];
      toast(`Welcome home, ${entityName(id)}`);
      if (m) runMode(m, `${entityName(id)} arrived`);
    }
    if (from === 'home' && to !== 'home' && S.awayMode) {
      const persons = idsOf('person');
      if (persons.length && persons.every((x) => H.states[x].state !== 'home')) runMode(S.awayMode, 'Everyone left');
    }
  }

  // ============================================================ modes
  const ONABLE = ['light', 'switch', 'fan', 'input_boolean'];
  function resolveRules(rules, domains) {
    const out = new Set();
    (rules || []).forEach((r) => {
      if (r.startsWith('match:')) {
        let re; try { re = new RegExp(r.slice(6), 'i'); } catch (e) { return; }
        idsOf(...domains).forEach((id) => { if (re.test(entityName(id)) || re.test(id)) out.add(id); });
      } else if (r.startsWith('area:')) {
        if (!domains.includes('light')) return;
        let re; try { re = new RegExp(r.slice(5), 'i'); } catch (e) { return; }
        idsOf('light').forEach((id) => { const a = H.entityArea[id]; if (a && re.test(H.areas[a] || a)) out.add(id); });
      } else if (H.states[r] && domains.includes(domainOf(r))) out.add(r);
    });
    return Array.from(out);
  }
  function modePlan(id) {
    const m = S.modes[id] || {};
    const st = H.states;
    const scenes = resolveRules(m.scenes, ['scene', 'script']);
    const onSet = new Set(resolveRules(m.on, ONABLE));
    const offSet = new Set(resolveRules(m.off, ONABLE));
    if (m.lightsOff) idsOf('light').forEach((i) => offSet.add(i));
    onSet.forEach((i) => offSet.delete(i));
    const turnOn = Array.from(onSet).filter((i) => st[i].state !== 'on');
    const turnOff = Array.from(offSet).filter((i) => st[i].state === 'on');
    const locks = m.lockAll ? idsOf('lock').filter((i) => st[i].state === 'unlocked') : [];
    const covers = m.closeGarage ? idsOf('cover').filter((i) => st[i].attributes.device_class === 'garage' && ['open', 'opening'].includes(st[i].state)) : [];
    const temp = m.temp === '' || m.temp == null || !Number.isFinite(+m.temp) ? null : +m.temp;
    const climates = temp == null ? [] : idsOf('climate').filter((i) => st[i].attributes.temperature != null && st[i].state !== 'off' && st[i].attributes.temperature !== temp);
    return { scenes, turnOn, turnOff, locks, covers, temp, climates, after: m.after || '' };
  }
  async function runMode(id, why) {
    const def = MODE_DEFS.find((x) => x.id === id);
    if (!def) return;
    const p = modePlan(id);
    const jobs = [];
    p.scenes.forEach((e) => jobs.push(call(domainOf(e), 'turn_on', e)));
    p.turnOn.forEach((e) => jobs.push(call(domainOf(e), 'turn_on', e)));
    p.turnOff.forEach((e) => jobs.push(call(domainOf(e), 'turn_off', e)));
    p.locks.forEach((e) => jobs.push(call('lock', 'lock', e)));
    p.covers.forEach((e) => jobs.push(call('cover', 'close_cover', e)));
    p.climates.forEach((e) => jobs.push(call('climate', 'set_temperature', e, { temperature: p.temp })));
    $$(`.mode[data-mode="${id}"]`).forEach((b) => b.classList.add('busy'));
    await Promise.all(jobs);
    S.lastMode = { id, at: Date.now() };
    saveSettings();
    const parts = [];
    if (p.scenes.length) parts.push(plural(p.scenes.length, 'scene'));
    if (p.turnOn.length) parts.push(`${plural(p.turnOn.length, 'light')} on`);
    if (p.turnOff.length) parts.push(`${plural(p.turnOff.length, 'light')} off`);
    if (p.locks.length) parts.push(`${plural(p.locks.length, 'door')} locked`);
    if (p.covers.length) parts.push('garage closing');
    if (p.climates.length) parts.push(`thermostat ${p.temp}°`);
    toast(`${why ? why + ': ' : ''}${def.name}. ${parts.length ? cap(parts.join(', ')) + '.' : 'Everything was already set.'}`);
    if (p.after === 'kitchen') openApp('kitchen', { ktab: 'plan' });
    else if (p.after === 'clock') { if (APP.name) closeApp(); setTimeout(() => enterIdle(true), 600); }
    renderAll();
  }

  // ============================================================ assistant
  const ASSIST = { log: [], cid: null, listening: false, rec: null };
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, 'forty-five': 45, sixty: 60, ninety: 90, a: 1, an: 1 };
  const numOf = (s) => (Number.isFinite(+s) ? +s : NUMW[String(s).toLowerCase()]);

  function localIntent(q) {
    const t = q.toLowerCase().replace(/[’]/g, "'").replace(/[?.!,]+$/g, '').trim();
    let m;
    m = /(?:set|start)?\s*(?:a|an)?\s*(\d+(?:\.\d+)?|[a-z-]+)\s*(second|sec|minute|min|hour|hr)s?\s*timer(?:\s+for\s+(?:the\s+)?(.+))?/.exec(t) ||
      /timer\s+(?:for\s+)?(\d+(?:\.\d+)?|[a-z-]+)\s*(second|sec|minute|min|hour|hr)s?(?:\s+(?:for|called)\s+(?:the\s+)?(.+))?/.exec(t);
    if (m) {
      const n = numOf(m[1]);
      if (n) {
        const sec = Math.round(n * (/^h/.test(m[2]) ? 3600 : /^m/.test(m[2]) ? 60 : 1));
        const label = m[3] ? cap(m[3]) : '';
        addTimer(sec, label);
        return `Timer set for ${fmtDur(sec)}${label ? ` for ${label}` : ''}.`;
      }
    }
    if ((m = /^(?:please\s+)?(?:add|put)\s+(.+?)\s+(?:to|on)\s+(?:the\s+|my\s+|our\s+)?(grocery|groceries|shopping|chores?|reminders?|to-?do|message board|board)(?:\s+list)?$/.exec(t))) {
      const kind = /groc|shop/.test(m[2]) ? 'groceries' : /chore|to-?do/.test(m[2]) ? 'chores' : /remind/.test(m[2]) ? 'reminders' : 'board';
      if (kind !== 'groceries' && !privateOK()) return 'Lists are hidden in Guest mode.';
      const parts = kind === 'board' ? [m[1]] : m[1].split(/\s*(?:,|\band\b)\s*/).filter(Boolean);
      parts.forEach((p) => addTask(kind, cap(p), kind === 'board' && !curProfile().fixed ? S.profile : '', ''));
      return `Added ${parts.join(', ')} to ${kindName(kind)}.`;
    }
    if ((m = /^remind (?:me|us) to (.+?)(?:\s+(today|tomorrow))?$/.exec(t))) {
      if (!privateOK()) return 'Reminders are hidden in Guest mode.';
      const due = m[2] === 'tomorrow' ? isoDay(1) : m[2] === 'today' ? isoDay(0) : '';
      addTask('reminders', cap(m[1]), curProfile().fixed ? '' : S.profile, due);
      return `Reminder added: ${cap(m[1])}${m[2] ? ' ' + m[2] : ''}.`;
    }
    for (const d of MODE_DEFS) {
      const word = d.id === 'bedtime' ? '(?:bed ?time|good ?night)' : d.id;
      const re = new RegExp(`^(?:(?:run|start|activate|set|turn on|switch to|go to|start the|it's)\\s+)?(?:the\\s+)?${word}(?:\\s+mode)?$`);
      if (re.test(t) || (d.id === 'leaving' && /^(?:we're leaving|we are leaving|i'm leaving|i am leaving|leaving|heading out)$/.test(t))) { runMode(d.id); return `Running ${d.name}.`; }
    }
    if (/what(?:'s| is)? (?:next|on (?:the )?calendar|on today|happening|the plan)|(?:my|our) (?:schedule|day)|what do (?:we|i) have/.test(t)) {
      if (!privateOK()) return 'The calendar is hidden in Guest mode.';
      const ev = upcoming().slice(0, 3);
      return ev.length ? 'Coming up: ' + ev.map((e) => `${e.title}, ${relDay(e.start).toLowerCase()}${e.allDay ? '' : ' at ' + fmtClock(e.start)}`).join('; ') + '.' : 'Nothing on the calendar for the next few weeks.';
    }
    if (/house (?:ok|okay|secure|status)|is (?:everything|the house) (?:ok|okay|locked|secure|alright)|are the doors locked|anything open|is the garage (?:open|closed)/.test(t)) {
      const s = houseStatus();
      const real = s.issues.filter((i) => i.lvl !== 'info');
      return real.length ? `${plural(real.length, 'thing')} to check: ${real.map((i) => i.text).join('; ')}.` : 'All secure. Doors are locked and nothing is open.';
    }
    if (/weather|forecast|\brain\b|\bsnow\b|how (?:hot|cold)|temperature outside/.test(t) && !/thermostat|inside/.test(t)) {
      if (!WX.now) return 'Weather is unavailable right now.';
      const d = WX.daily[0];
      return `It's ${Math.round(WX.now.temp)}° and ${WX.now.text.toLowerCase()} in ${WX.place}.${d ? ` High ${Math.round(d.hi)}°, low ${Math.round(d.lo)}°${d.pop != null ? `, ${Math.round(d.pop)}% chance of rain or snow` : ''}.` : ''}`;
    }
    if (/what(?:'s| is) for dinner|dinner tonight|what are we (?:eating|having)/.test(t)) {
      const md = mealFor(isoDay(0));
      return md ? `Tonight: ${md}.` : 'Nothing planned for dinner tonight yet. Add it in Kitchen.';
    }
    if ((m = /^(?:open|show(?: me)?|go to)\s+(?:the\s+|my\s+)?([a-z ]+?)(?:\s+app)?$/.exec(t))) {
      const map = { kitchen: 'kitchen', recipes: 'kitchen', 'meal plan': 'kitchen', calendar: 'cal', tasks: 'tasks', lists: 'tasks', groceries: 'tasks', 'grocery list': 'tasks', chores: 'tasks', music: 'music', speakers: 'music', cameras: 'security', camera: 'security', security: 'security', photos: 'photos', settings: 'settings', emergency: 'emergency', 'emergency info': 'emergency', packages: 'packages', energy: 'energy', board: 'board', 'message board': 'board', messages: 'board', timers: 'kitchen', home: 'home', devices: 'home' };
      const a = map[m[1]];
      if (a) { setTimeout(() => openApp(a, a === 'kitchen' && /timer/.test(m[1]) ? { ktab: 'timers' } : {}), 500); return `Opening ${APP_TITLES[a]}.`; }
    }
    if (/^(?:emergency|call 911|911|help)$/.test(t)) { setTimeout(() => openApp('emergency'), 400); return 'Opening emergency info. If anyone is in danger, call 911 from a phone.'; }
    return null;
  }

  function demoIntent(q) {
    const t = q.toLowerCase().replace(/[?.!]+$/g, '').trim();
    let m, on = null, target = '';
    if ((m = /^(?:turn|switch)\s+(on|off)\s+(?:the\s+)?(.+)$/.exec(t))) { on = m[1] === 'on'; target = m[2]; }
    else if ((m = /^(?:turn|switch)\s+(?:the\s+)?(.+?)\s+(on|off)$/.exec(t))) { on = m[2] === 'on'; target = m[1]; }
    if (on !== null) {
      target = target.replace(/\s+(lights?|lamps?)$/, '').trim();
      const all = /^(?:all|every|all the)(?:\s|$)/.test(target) || target === 'lights' || target === '';
      const ids = idsOf(...ONABLE).filter((id) => (all ? domainOf(id) === 'light' : entityName(id).toLowerCase().includes(target)));
      if (!ids.length) return `I couldn’t find “${target}”.`;
      ids.forEach((id) => call(domainOf(id), on ? 'turn_on' : 'turn_off', id));
      return `Turned ${on ? 'on' : 'off'} ${ids.map(entityName).join(', ')}.`;
    }
    if (/^lock\b/.test(t)) {
      const ids = idsOf('lock').filter((id) => H.states[id].state !== 'locked');
      ids.forEach((id) => call('lock', 'lock', id));
      return ids.length ? `Locked ${ids.map(entityName).join(', ')}.` : 'Everything is already locked.';
    }
    if ((m = /set (?:the )?(?:thermostat|temperature|heat|heating|air) to (\d+)/.exec(t))) {
      idsOf('climate').forEach((id) => call('climate', 'set_temperature', id, { temperature: +m[1] }));
      return `Thermostat set to ${m[1]}°.`;
    }
    return null;
  }

  async function assist(text) {
    text = String(text || '').trim();
    if (!text) return;
    ASSIST.log.push({ who: 'user', text });
    renderAssistChat();
    let reply = null;
    if (!privateOK() && /\b(unlock|disarm|open (?:the )?garage)\b/i.test(text)) reply = 'Switch to a family profile to do that.';
    if (reply == null) reply = localIntent(text);
    if (reply == null && H.live) {
      try {
        const r = await haSend({ type: 'conversation/process', text, language: (navigator.language || 'en').slice(0, 2), conversation_id: ASSIST.cid || undefined });
        ASSIST.cid = r?.conversation_id || ASSIST.cid;
        reply = r?.response?.speech?.plain?.speech || 'Done.';
      } catch (e) { reply = 'Home Assistant didn’t answer. Check the connection in Settings.'; }
    }
    if (reply == null) reply = demoIntent(text);
    if (reply == null) reply = 'I can set timers, add to lists, run modes, check the house, and tell you what’s next. Connect Home Assistant to control any device by voice.';
    ASSIST.log.push({ who: 'bot', text: reply });
    if (ASSIST.log.length > 40) ASSIST.log.splice(0, ASSIST.log.length - 40);
    renderAssistChat();
    speak(reply);
  }
  function speak(text) {
    if (!S.speak || !('speechSynthesis' in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 1.02; speechSynthesis.speak(u); } catch (e) { /* no speech */ }
  }
  function listen() {
    if (!SR) { toast('Use the microphone key on the keyboard to dictate.'); $('#ask-input')?.focus(); return; }
    if (ASSIST.listening) { try { ASSIST.rec.stop(); } catch (e) { /* stopped */ } return; }
    let rec;
    try { rec = new SR(); } catch (e) { toast('Voice input isn’t available here. Use the keyboard microphone instead.'); return; }
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = true;
    let finalText = '';
    rec.onresult = (e) => {
      let txt = '';
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      const inp = $('#ask-input');
      if (inp) inp.value = txt;
      if (e.results[e.results.length - 1].isFinal) finalText = txt;
    };
    rec.onerror = () => { /* handled in onend */ };
    rec.onend = () => {
      ASSIST.listening = false;
      updateMic();
      const inp = $('#ask-input');
      const txt = (finalText || inp?.value || '').trim();
      if (txt) { if (inp) inp.value = ''; assist(txt); }
    };
    ASSIST.rec = rec;
    ASSIST.listening = true;
    updateMic();
    try { rec.start(); } catch (e) { ASSIST.listening = false; updateMic(); }
  }
  function updateMic() { const b = $('#mic'); if (b) { b.classList.toggle('on', ASSIST.listening); b.setAttribute('aria-pressed', String(ASSIST.listening)); } }

  // ================================================================= PIN
  let pinState = null;
  function askPin(title) {
    if (!S.pin) return Promise.resolve(true);
    return new Promise((resolve) => { pinState = { resolve, entered: '', title }; renderPin(); $('#pin').hidden = false; });
  }
  function renderPin(bad) {
    if (!pinState) return;
    const n = String(S.pin).length;
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => `<button type="button" data-act="pin-key" data-k="${k}">${k}</button>`).join('');
    $('#pin').innerHTML = `<div class="box pin-box" role="dialog" aria-labelledby="pin-t"><div class="t" id="pin-t" style="font-size:20px">${esc(pinState.title)}</div>
      <div class="pin-dots${bad ? ' bad' : ''}">${Array.from({ length: n }, (_, i) => `<i class="${i < pinState.entered.length ? 'on' : ''}"></i>`).join('')}</div>
      <div class="pad">${keys}<button type="button" class="txt" data-act="pin-cancel">Cancel</button><button type="button" data-act="pin-key" data-k="0">0</button><button type="button" class="txt" data-act="pin-back">Delete</button></div></div>`;
  }
  function pinKey(k) {
    if (!pinState) return;
    pinState.entered += k;
    if (pinState.entered.length >= String(S.pin).length) {
      if (pinState.entered === String(S.pin)) { const r = pinState.resolve; pinState = null; $('#pin').hidden = true; r(true); return; }
      pinState.entered = '';
      renderPin(true);
      return;
    }
    renderPin();
  }

  // ================================================================ widgets
  const sampleTag = (on) => (on ? '<span class="tag">Sample</span>' : '');
  const whead = (ic, title, extra = '') => `<div class="w-head">${icon(ic)}${title}<span class="grow"></span>${extra}</div>`;
  const wcls = (id) => `w w-${id} sz-${WIDGET_INFO[id][1]}`;

  function wTime() {
    const n = new Date(), t = fmtTime(n), w = WX.now, d0 = WX.daily[0];
    const wx = w
      ? `${icon(w.icon)}<div class="t num">${Math.round(w.temp)}°</div><div class="muted">${esc(w.text)}${d0 ? ` · H ${Math.round(d0.hi)}° L ${Math.round(d0.lo)}°` : ''}</div><div class="faint">${esc(WX.place)}</div>`
      : '<div class="muted">Weather unavailable</div><div class="faint">Check the internet connection</div>';
    return `<button type="button" class="${wcls('time')} timew" data-act="idle" aria-label="Show the clock face">
      <div><div class="clock num"><span data-clock="hm">${t.hm}</span><span class="ampm" data-clock="ap">${t.ap}</span></div>
      <div class="date">${esc(fmtDate(n))}</div></div><div class="wx">${wx}</div></button>`;
  }

  function wStatus() {
    const st = houseStatus();
    const lines = st.issues.slice(0, 2).map((i) => `<div class="issue"><span class="lv ${i.lvl}"></span><span class="clamp1">${esc(i.text)}</span></div>`).join('');
    const sub = st.alarm ? `Alarm: ${cap(st.alarm.state)}` : privateOK() && st.home.length ? `Home: ${st.home.join(', ')}` : H.live ? 'Locks, doors and alarms' : 'Sample devices';
    return `<button type="button" class="${wcls('status')} lvl-${st.level}" data-act="open" data-app="security">
      <div class="status-head"><span class="shield ${st.level === 'good' ? '' : st.level}">${icon(st.level === 'good' ? 'shieldok' : 'alert')}</span><div style="min-width:0"><div class="status-title">${esc(st.title)}</div><div class="faint clamp1" style="font-size:12.5px">${esc(sub)}</div></div></div>
      <div class="w-body">${lines || '<div class="muted" style="font-size:13.5px">Doors locked, garage closed, no alarms.</div>'}</div></button>`;
  }

  function wNext() {
    const evs = upcoming().slice(0, 5);
    let body;
    if (CAL.note) body = `<div class="muted">${esc(CAL.note)}</div>`;
    else if (!evs.length) body = '<div class="muted">Nothing on the calendar for the next few weeks.</div>';
    else {
      let last = '';
      body = evs.map((e) => {
        const day = relDay(e.start);
        const lbl = day !== last ? `<div class="day-label">${esc(day)}</div>` : '';
        last = day;
        return `${lbl}<div class="event" style="--c:${evColor(e)}"><span class="bar"></span><div style="min-width:0"><div class="t">${esc(e.title)}</div><div class="s">${esc(evWhen(e))} · ${esc(evPerson(e))}</div></div></div>`;
      }).join('');
    }
    return `<button type="button" class="${wcls('next')}" data-act="open" data-app="cal">${whead('cal', 'Up Next', sampleTag(CAL.sample))}<div class="w-body">${body}</div></button>`;
  }

  function camHTML(id) {
    const src = cameraSrc(id);
    const img = src ? `<img alt="" src="${esc(src)}" data-cam="${esc(id)}">` : '<div class="ph"></div>';
    return `<div class="cam">${img}<div class="lbl"><span class="live"></span>${esc(entityName(id))}${src ? '' : ' · Sample'}</div></div>`;
  }

  function tileHTML(id, full) {
    const s = H.states[id];
    if (!s) return '';
    const d = domainOf(id), a = s.attributes || {};
    const name = esc(a.friendly_name || id);
    const unavail = s.state === 'unavailable' || s.state === 'unknown';
    let on = false, st = esc(cap(s.state)), ic = 'gauge', clickable = true, extra = '';
    switch (d) {
      case 'light': {
        on = s.state === 'on'; ic = 'bulb';
        const dim = !(a.supported_color_modes || []).every((m) => m === 'onoff');
        st = on ? (a.brightness ? `${Math.round(a.brightness / 2.55)}%` : 'On') : 'Off';
        if (full && dim) extra = `<input type="range" min="1" max="100" value="${a.brightness ? Math.round(a.brightness / 2.55) : 100}" data-bright="${esc(id)}" aria-label="${name} brightness">`;
        break;
      }
      case 'switch': case 'input_boolean': on = s.state === 'on'; ic = 'plug'; st = on ? 'On' : 'Off'; break;
      case 'fan': on = s.state === 'on'; ic = 'fan'; st = on ? (a.percentage ? `${a.percentage}%` : 'On') : 'Off'; break;
      case 'lock':
        ic = s.state === 'locked' ? 'lock' : 'unlock';
        st = s.state === 'unlocked' ? '<span class="warnst">Unlocked</span>' : esc(cap(s.state));
        if (isArmed(id)) st = `<span class="warnst">Tap again to ${s.state === 'locked' ? 'unlock' : 'lock'}</span>`;
        break;
      case 'cover':
        on = s.state === 'open' || s.state === 'opening';
        ic = a.device_class === 'garage' ? 'garage' : 'blind';
        if (isArmed(id)) st = `<span class="warnst">Tap again to ${on ? 'close' : 'open'}</span>`;
        break;
      case 'climate': {
        on = s.state !== 'off'; ic = 'thermo'; clickable = false;
        const target = a.temperature ?? a.target_temp_high;
        const action = a.hvac_action ? cap(a.hvac_action) : cap(s.state);
        st = esc(`${action}${a.current_temperature != null ? ` · ${Math.round(a.current_temperature)}° now` : ''}`);
        if (target != null) extra = `<div class="row"><button type="button" class="step" data-act="temp" data-entity="${esc(id)}" data-step="-1" aria-label="Lower ${name}">−</button><span class="big num">${Math.round(target)}°</span><button type="button" class="step" data-act="temp" data-entity="${esc(id)}" data-step="1" aria-label="Raise ${name}">+</button></div>`;
        break;
      }
      case 'scene': ic = 'sparkle'; st = 'Scene'; break;
      case 'script': ic = 'sparkle'; st = 'Run'; break;
      case 'media_player': on = s.state === 'playing'; ic = 'music'; st = esc(on ? (a.media_title || 'Playing') : cap(s.state)); break;
      case 'camera': ic = 'camera'; st = 'View'; break;
      case 'binary_sensor': {
        on = s.state === 'on'; clickable = false;
        const dc = a.device_class || '';
        const opening = /door|window|garage_door|opening/.test(dc);
        ic = opening ? 'door' : HAZARDS[dc] ? 'alert' : 'gauge';
        st = opening ? (on ? 'Open' : 'Closed') : HAZARDS[dc] ? (on ? '<span class="warnst">Detected</span>' : 'Clear') : dc === 'motion' || dc === 'occupancy' ? (on ? 'Detected' : 'Clear') : (on ? 'On' : 'Off');
        break;
      }
      case 'sensor': clickable = false; ic = a.device_class === 'temperature' ? 'thermo' : a.device_class === 'power' ? 'bolt' : 'gauge'; st = esc(`${s.state}${a.unit_of_measurement ? ' ' + a.unit_of_measurement : ''}`); break;
      default: on = s.state === 'on';
    }
    if (unavail) { on = false; st = 'Not responding'; }
    const inner = `<span class="ic">${icon(ic)}</span><span class="n">${name}</span><span class="st">${st}</span>`;
    const main = clickable && !unavail ? `<button type="button" class="tile-main" data-act="tile" data-entity="${esc(id)}">${inner}</button>` : `<div class="tile-main">${inner}</div>`;
    return `<div class="tile${on ? ' on' : ''}${unavail ? ' unavail' : ''}${isArmed(id) ? ' arm' : ''}">${main}${extra}</div>`;
  }

  function wHome() {
    const favs = favoriteIds().slice(0, 6);
    const body = favs.length ? `<div class="tiles">${favs.map((id) => tileHTML(id, false)).join('')}</div>` : '<div class="empty">No devices yet. Add them in Home Assistant, then pick favorites in Settings.</div>';
    return `<section class="${wcls('home')}" aria-label="Home">${whead('home', 'Home', `${sampleTag(!H.live)}<button type="button" class="w-link" data-act="open" data-app="home">All rooms</button>`)}${body}</section>`;
  }

  function taskRow(it, kind, compact) {
    const di = dueInfo(it);
    const who = it.who && personById(it.who) ? `<span class="who"><span class="pdot" style="--c:${pColor(it.who)}"></span>${compact ? '' : esc(pName(it.who))}</span>` : '';
    return `<div class="task${it.done ? ' done' : ''}"><button type="button" class="check-btn${it.done ? ' done' : ''}" data-act="task-toggle" data-kind="${kind}" data-id="${esc(it.id)}" aria-label="${it.done ? 'Mark not done' : 'Mark done'}: ${esc(it.text)}">${it.done ? icon('check') : ''}</button>
      <span class="tx">${esc(it.text)}</span>${who}${di ? `<span class="due${di.over ? ' over' : ''}">${esc(di.label)}</span>` : ''}${compact ? '' : `<button type="button" class="del" data-act="task-del" data-kind="${kind}" data-id="${esc(it.id)}" aria-label="Delete ${esc(it.text)}">${icon('x')}</button>`}</div>`;
  }

  function wTasks() {
    const today = isoDay(0);
    const due = ['chores', 'reminders'].flatMap((k) => items(k).filter((i) => !i.done && i.due && String(i.due).slice(0, 10) <= today).map((i) => ({ ...i, kind: k })));
    const open = items('chores').filter((i) => !i.done && !i.due).map((i) => ({ ...i, kind: 'chores' }));
    const top = [...due, ...open].slice(0, 4);
    const groc = items('groceries').filter((i) => !i.done);
    const sample = LIST_KINDS.some((k) => listIsSample(k.id));
    return `<section class="${wcls('tasks')}" aria-label="Tasks">${whead('check', 'Tasks', `${sampleTag(sample)}<button type="button" class="w-link" data-act="open" data-app="tasks">All</button>`)}
      <div class="w-body"><div class="sub-label">Today</div>${top.length ? top.map((i) => taskRow(i, i.kind, true)).join('') : '<div class="muted" style="font-size:13.5px">Nothing due today.</div>'}
      <div class="sub-label" style="margin-top:6px">Groceries · ${groc.length}</div><button type="button" class="muted clamp2" style="text-align:left;font-size:13.5px" data-act="open" data-app="tasks" data-tab="groceries">${esc(groc.map((g) => g.text).join(', ') || 'The list is empty.')}</button></div></section>`;
  }

  function wCam() {
    const ids = cameraIds();
    const id = ids.includes(S.mainCamera) ? S.mainCamera : ids[0];
    return `<button type="button" class="${wcls('cam')}" data-act="open" data-app="security">${whead('camera', 'Cameras', ids.length > 1 ? `<span class="faint">${ids.length}</span>` : '')}${id ? camHTML(id) : '<div class="muted">No cameras in Home Assistant yet.</div>'}</button>`;
  }

  function wKitchen() {
    const meal = mealFor(isoDay(0));
    const rid = MEALS[isoDay(0)]?.recipe;
    const t = nextTimer();
    return `<section class="${wcls('kitchen')}" aria-label="Kitchen">${whead('pot', 'Kitchen', `${sampleTag(!!MEALS._sample)}<button type="button" class="w-link" data-act="open" data-app="kitchen">Open</button>`)}
      <div class="w-body"><div class="faint" style="font-size:12.5px">Tonight</div><div class="meal clamp2">${esc(meal || 'Nothing planned')}</div>
      ${t ? `<div class="li"><span class="v num" data-left="${t.id}">${fmtLeft(t.end - Date.now())}</span><span class="v">${esc(t.label)}</span></div>` : ''}</div>
      <div class="quick">${rid ? `<button type="button" class="qbtn sm primary" data-act="recipe-open" data-id="${esc(rid)}">Start cooking</button>` : `<button type="button" class="qbtn sm" data-act="open" data-app="kitchen" data-ktab="plan">Plan meals</button>`}<button type="button" class="qbtn sm" data-act="open" data-app="kitchen" data-ktab="timers">Timers</button></div></section>`;
  }

  const speakerIds = () => idsOf('media_player');
  function mainSpeaker() {
    const ids = speakerIds();
    if (S.musicMain && ids.includes(S.musicMain)) return S.musicMain;
    return ids.find((id) => H.states[id].state === 'playing') || ids[0] || '';
  }
  function artStyle(a) { const pic = a.entity_picture; return H.live && pic ? ` style="background-image:url('${esc(/^https?:/.test(pic) ? pic : haBase() + pic)}')"` : ''; }

  function wMedia() {
    const id = mainSpeaker();
    if (!id) return `<section class="${wcls('media')}">${whead('music', 'Music')}<div class="muted">No speakers in Home Assistant yet.</div></section>`;
    const s = H.states[id], a = s.attributes, playing = s.state === 'playing';
    return `<section class="${wcls('media')}" aria-label="Music">${whead('music', 'Music', `<button type="button" class="w-link" data-act="open" data-app="music">Speakers</button>`)}
      <div class="np"><div class="art"${artStyle(a)}>${a.entity_picture && H.live ? '' : icon('music')}</div><div style="min-width:0"><div class="t clamp1">${esc(a.media_title || (playing ? 'Playing' : 'Nothing playing'))}</div><div class="s clamp1">${esc(a.media_artist || entityName(id))}</div></div></div>
      <div class="controls"><button type="button" class="rbtn" data-act="media" data-cmd="prev" data-entity="${esc(id)}" aria-label="Previous">${icon('prev')}</button><button type="button" class="rbtn play" data-act="media" data-cmd="play" data-entity="${esc(id)}" aria-label="${playing ? 'Pause' : 'Play'}">${icon(playing ? 'pause' : 'play')}</button><button type="button" class="rbtn" data-act="media" data-cmd="next" data-entity="${esc(id)}" aria-label="Next">${icon('next')}</button></div></section>`;
  }

  function wBoard() {
    const notes = items('board').filter((n) => !n.done).slice().reverse().slice(0, 2);
    const body = notes.length ? notes.map((n) => `<div class="note" style="--c:${pColor(n.who)}"><span class="bar"></span><div style="min-width:0"><div class="t">${esc(n.text)}</div><div class="s">${esc(pName(n.who) || 'Someone')}${n.at ? ' · ' + esc(relDay(new Date(n.at))) : ''}</div></div></div>`).join('') : '<div class="muted" style="font-size:13.5px">No notes yet. Leave one for the family.</div>';
    return `<button type="button" class="${wcls('board')}" data-act="open" data-app="board">${whead('msg', 'Message Board', sampleTag(listIsSample('board')))}<div class="w-body">${body}</div></button>`;
  }

  function wPackages() {
    const active = PKGS.filter((p) => !p.delivered).sort((a, b) => String(a.expected || '9').localeCompare(String(b.expected || '9')));
    const today = active.filter((p) => p.expected === isoDay(0)).length;
    const body = active.length
      ? `<div class="big num">${active.length}</div><div class="muted" style="font-size:13px">${today ? `${today} arriving today` : 'on the way'}</div>` + active.slice(0, 2).map((p) => `<div class="li"><span class="k clamp1">${esc(p.label)}</span><span class="v">${esc(p.expected ? relDay(parseDay(p.expected)) : p.carrier || '')}</span></div>`).join('')
      : '<div class="muted" style="font-size:13.5px">Nothing on the way.</div>';
    return `<button type="button" class="${wcls('packages')}" data-act="open" data-app="packages">${whead('box', 'Packages', sampleTag(PKGS.some((p) => p.sample)))}<div class="w-body">${body}</div></button>`;
  }

  function wEnergy() {
    const pe = powerEntity(), ee = energyEntity();
    if (!pe && !ee) return `<button type="button" class="${wcls('energy')}" data-act="open" data-app="energy">${whead('bolt', 'Energy')}<div class="muted" style="font-size:13.5px">Add a power meter to Home Assistant to see usage here.</div></button>`;
    if (pe && !EN.hist[pe]) loadPowerHistory(pe);
    const today = ee ? H.states[ee] : null;
    return `<button type="button" class="${wcls('energy')}" data-act="open" data-app="energy">${whead('bolt', 'Energy', sampleTag(!H.live))}
      <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="kw num">${fmtW(powerW(pe))}</span><span class="muted" style="font-size:13px">now</span></div>
      ${today ? `<div class="muted" style="font-size:13px">${esc(today.state)} ${esc(today.attributes.unit_of_measurement || 'kWh')} today</div>` : ''}
      <div class="spark-box">${sparkHTML(EN.hist[pe])}</div></button>`;
  }

  function wEmergency() {
    return `<button type="button" class="${wcls('emergency')}" data-act="open" data-app="emergency">${whead('sos', 'Emergency')}<div class="big">911</div>
      <div class="addr clamp2">${EMERG.address ? esc(EMERG.address) : 'Add your address so anyone can read it to 911.'}</div><div class="muted clamp1" style="font-size:12.5px">Shutoffs, contacts and meeting spot</div></button>`;
  }

  function wForecast() {
    const rows = WX.daily.slice(0, 6).map((d, i) => `<span class="d">${i === 0 ? 'Today' : esc(d.date.toLocaleDateString(undefined, { weekday: 'short' }))}</span>${icon(d.icon)}<span class="num">${Math.round(d.hi)}° <span class="muted">${Math.round(d.lo)}°</span></span>`).join('');
    return `<section class="${wcls('forecast')}" aria-label="Forecast">${whead('sun', 'Forecast')}${rows ? `<div class="fc">${rows}</div>` : '<div class="muted">Forecast unavailable.</div>'}</section>`;
  }

  function wTimer() {
    const t = nextTimer();
    const now = t ? `<div class="big num" data-left="${t.id}">${fmtLeft(t.end - Date.now())}</div><div class="muted clamp1">${esc(t.label)}</div>` : '<div class="muted">Start a timer</div>';
    const q = [5, 10, 15].map((m) => `<button type="button" class="qbtn sm" data-act="timer" data-sec="${m * 60}">${m} min</button>`).join('');
    return `<section class="${wcls('timer')}" aria-label="Timers">${whead('timer', 'Timers')}<div class="w-body">${now}</div><div class="quick">${q}</div></section>`;
  }

  function wBnb() {
    const today = startOfDay(new Date());
    const list = (FEED.data.airbnb || []).map((x) => ({ ...x, d: parseDay(x.date) })).filter((x) => x.d >= today).sort((a, b) => a.d - b.d).slice(0, 2);
    const todayCount = (FEED.data.airbnb || []).filter((x) => +startOfDay(parseDay(x.date)) === +today).length;
    const body = list.length
      ? `<div class="big num">${todayCount}</div><div class="muted" style="font-size:13px">${todayCount === 1 ? 'turnover today' : 'turnovers today'}</div>` +
        list.map((x) => `<div class="li"><span class="k">${esc(+startOfDay(x.d) === +today ? 'Today' : x.d.toLocaleDateString(undefined, { weekday: 'short' }))}</span><span class="v">${x.type === 'check-out' ? 'Out' : 'In'} · ${esc(x.listing || '')}${x.time ? ' · ' + esc(x.time) : ''}</span></div>`).join('')
      : '<div class="muted">No check-ins or check-outs coming up.</div>';
    return `<section class="${wcls('bnb')}" aria-label="Airbnb">${whead('key', 'Airbnb', sampleTag(FEED.sample))}<div class="w-body">${body}</div></section>`;
  }

  function wInsp() {
    const i = FEED.data.inspections || {};
    const done = +i.completed || 0, goal = +i.goal || 0;
    const pct = goal ? clamp(done / goal, 0, 1) : 0;
    const C = 2 * Math.PI * 40;
    const now = new Date();
    const weeks = Math.max(1, Math.ceil((new Date(now.getFullYear(), 11, 31) - now) / (7 * 86400000)));
    const left = Math.max(0, goal - done);
    return `<section class="${wcls('insp')}" aria-label="Inspections">${whead('clip', 'Inspections', sampleTag(FEED.sample))}
      <div class="ring-wrap"><svg class="ring" viewBox="0 0 100 100" role="img" aria-label="${Math.round(pct * 100)} percent of goal"><circle class="track" cx="50" cy="50" r="40"/><circle class="val" cx="50" cy="50" r="40" stroke-dasharray="${(pct * C).toFixed(1)} ${C.toFixed(1)}"/><text x="50" y="57" text-anchor="middle">${Math.round(pct * 100)}%</text></svg>
      <div style="min-width:0"><div class="big num">${done}</div><div class="muted" style="font-size:13px">of ${goal} this year</div><div class="faint" style="font-size:12.5px">${left ? `${Math.ceil(left / weeks)} a week to finish` : 'Goal met'}</div></div></div></section>`;
  }

  function wEv() {
    const list = (FEED.data.ev || []).slice(0, 3);
    const body = list.length ? list.map((x) => `<div class="li sb"><span class="k clamp1">${esc(x.site || 'Site')}</span><span class="pill ${evStage(x)}">${esc(x.status || '')}</span></div>`).join('') : '<div class="muted">No EV projects in the feed.</div>';
    return `<section class="${wcls('ev')}" aria-label="EV projects">${whead('bolt', 'EV Projects', sampleTag(FEED.sample))}<div class="w-body">${body}</div></section>`;
  }

  const RENDER = { time: wTime, status: wStatus, next: wNext, home: wHome, tasks: wTasks, cam: wCam, kitchen: wKitchen, media: wMedia, board: wBoard, energy: wEnergy, packages: wPackages, emergency: wEmergency, forecast: wForecast, timer: wTimer, bnb: wBnb, insp: wInsp, ev: wEv };

  function renderHome() {
    const key = privateOK() ? 'main' : 'guest';
    const list = S.layout[key].filter((id) => WIDGET_INFO[id] && (privateOK() || !WIDGET_INFO[id][2]));
    $('#home').innerHTML = list.map((id) => RENDER[id]()).join('') || '<div class="empty">Add widgets in Settings → Home screen.</div>';
  }

  function haStatusLabel() { return { sample: 'Sample data', connecting: 'Connecting…', connected: 'Home Assistant', retrying: 'Reconnecting…', error: 'Fix connection' }[H.status] || 'Home Assistant'; }
  function haDot() { return { connected: 'good', connecting: 'warn', retrying: 'warn', error: 'crit' }[H.status] || ''; }

  function summaryHTML() {
    const st = houseStatus();
    const parts = [`<span><span class="sdot ${st.level === 'good' ? '' : st.level}"></span><b>${esc(st.title)}</b></span>`];
    if (privateOK()) {
      const e = upcoming()[0];
      if (e) parts.push(`<span>Next: <b>${esc(e.title)}</b> ${esc(relDay(e.start) === 'Today' ? (e.allDay ? 'today' : fmtClock(e.start)) : relDay(e.start).toLowerCase())}</span>`);
    }
    const meal = mealFor(isoDay(0));
    if (meal) parts.push(`<span>Dinner: <b>${esc(meal)}</b></span>`);
    return parts.join('');
  }

  function renderTop() {
    const p = curProfile();
    const named = !p.fixed && !p.shared;
    const t = nextTimer();
    $('#top').innerHTML = `
      <button type="button" class="chip" data-act="profiles" aria-haspopup="true" aria-label="Switch profile, current ${esc(p.name)}"><span class="avatar" style="--c:${p.color}">${esc((p.name || '?').charAt(0).toUpperCase())}</span><span class="label">${esc(p.name)}</span></button>
      <div class="greet"><div class="greeting">${greeting()}${named ? ', ' + esc(p.name) : ''}</div><div class="summary">${summaryHTML()}</div></div>
      <span class="spacer"></span>
      ${t ? `<button type="button" class="chip plain timer-pill" data-act="open" data-app="kitchen" data-ktab="timers">${icon('timer')}<span class="num" id="timer-pill-text">${fmtLeft(t.end - Date.now())}</span></button>` : ''}
      <button type="button" class="chip plain" data-act="open" data-app="assist" aria-label="Ask the household assistant">${icon('sparkle')}<span class="label">Ask</span></button>
      <button type="button" class="chip plain" data-act="open" data-app="settings" data-stab="connect"><span class="dot ${haDot()}"></span><span class="label">${haStatusLabel()}</span></button>`;
  }

  function renderModes() {
    const recent = S.lastMode && Date.now() - S.lastMode.at < 6 * 3600000 ? S.lastMode.id : '';
    $('#modes').innerHTML = MODE_DEFS.map((d) => `<button type="button" class="mode" data-act="mode" data-mode="${d.id}" aria-pressed="${recent === d.id}">${icon(d.icon)}${d.name}</button>`).join('');
  }

  const DOCK_LABELS = { board: 'Board' };
  function renderDock() {
    $('#dock').innerHTML = DOCK.filter((a) => privateOK() || !PRIVATE_APPS.includes(a)).map((a) => `<button type="button" class="appbtn" data-act="open" data-app="${a}" aria-label="${esc(APP_TITLES[a])}"><span class="ico ${a}">${icon(APP_ICONS[a])}</span><span>${esc(DOCK_LABELS[a] || APP_TITLES[a])}</span></button>`).join('');
  }

  // Rows are a third of the visible grid in landscape, so the first screen holds 12 squares.
  function sizeGrid() {
    const g = $('#home');
    const gap = parseFloat(getComputedStyle(g).rowGap) || 14;
    const row = Math.max(160, Math.floor((g.clientHeight - 2 * gap) / 3));
    g.style.setProperty('--row', row + 'px');
  }

  // =================================================================== apps
  const APP = {
    name: null, room: 'fav', ttab: 'groceries', ktab: 'plan', recipeId: null, step: 0, adding: false, checked: new Set(), confirm: null,
    calView: 'week', calOffset: 0, calHide: new Set(), stab: 'connect', layoutKey: 'main', modeEdit: 'morning', emEdit: false,
  };

  async function openApp(name, opts = {}) {
    if (!APP_TITLES[name]) return;
    if (!privateOK()) {
      if (PRIVATE_APPS.includes(name)) { toast('That’s hidden in Guest mode. Switch profiles to open it.'); return; }
      if (name === 'settings' && S.pin && !(await askPin('Enter PIN to open Settings'))) return;
    }
    if (name !== APP.name) { APP.confirm = null; selectedPhotos.clear(); APP.emEdit = false; }
    if (name !== 'kitchen') { APP.recipeId = null; APP.adding = false; }
    APP.name = name;
    if (opts.ktab) { APP.ktab = opts.ktab; APP.recipeId = null; APP.adding = false; }
    if (opts.ttab) APP.ttab = opts.ttab;
    if (opts.stab) APP.stab = opts.stab;
    $('#sheet').hidden = false;
    renderApp();
    if (name === 'photos') loadPhotos().then(() => { if (APP.name === 'photos') renderApp(); });
    if (name === 'cal' && H.live) refreshCalendar();
    if (name === 'tasks' || name === 'board') loadAllTodo();
    if (name === 'energy') { EN.at = {}; loadPowerHistory(powerEntity()); }
    if (name === 'assist') setTimeout(() => $('#ask-input')?.focus(), 80);
  }
  function closeApp() {
    APP.name = null;
    APP.recipeId = null;
    APP.adding = false;
    $('#sheet').hidden = true;
    $('#sheet').innerHTML = '';
    renderAll();
  }

  function renderApp() {
    const el = $('#sheet');
    if (!APP.name) return;
    // Keep what someone is typing when the app redraws for a device update.
    const keep = {};
    $$('input[id], textarea[id], select[id]', el).forEach((f) => { if (f.type !== 'file' && f.type !== 'checkbox' && f.type !== 'range' && f.tagName !== 'SELECT') keep[f.id] = f.value; });
    const focusId = document.activeElement && el.contains(document.activeElement) ? document.activeElement.id : '';
    const scroll = $('.sheet-body', el)?.scrollTop || 0;

    let title = APP_TITLES[APP.name];
    let lead = '';
    if (APP.name === 'kitchen' && (APP.recipeId || APP.adding)) {
      lead = `<button type="button" class="chip plain" data-act="chef-back">${icon('back')}Recipes</button>`;
      if (APP.recipeId) title = recipes.find((r) => r.id === APP.recipeId)?.title || title;
      if (APP.adding) title = 'Add a recipe';
    }
    const body = APPS[APP.name]();
    el.innerHTML = `<div class="sheet-head">${lead}<h1>${esc(title)}</h1><span class="spacer"></span><button type="button" class="done-btn" data-act="close">Done</button></div><div class="sheet-body">${body}</div>`;

    Object.entries(keep).forEach(([id, v]) => { const f = document.getElementById(id); if (f && el.contains(f) && f.value !== v && !/^(ha-url|ha-token|feed-url)$/.test(id)) f.value = v; });
    if (focusId) { const f = document.getElementById(focusId); if (f && el.contains(f)) f.focus(); }
    const sb = $('.sheet-body', el);
    if (sb) sb.scrollTop = APP.name === 'assist' ? sb.scrollHeight : scroll;
  }

  // ---- Home
  function appHome() {
    const ids = Object.keys(H.states).filter(listable);
    const areaIds = Array.from(new Set(ids.map((id) => H.entityArea[id]).filter(Boolean)));
    areaIds.sort((a, b) => String(H.areas[a] || a).localeCompare(String(H.areas[b] || b)));
    const tabs = [['fav', 'Favorites'], ...areaIds.map((a) => [a, H.areas[a] || cap(a)]), ['_other', 'Other'], ['_sensors', 'Sensors']];
    if (!tabs.some((t) => t[0] === APP.room)) APP.room = 'fav';
    let shown;
    if (APP.room === 'fav') shown = favoriteIds();
    else if (APP.room === '_sensors') shown = ids.filter((id) => ['sensor', 'binary_sensor'].includes(domainOf(id)));
    else if (APP.room === '_other') shown = ids.filter((id) => !H.entityArea[id] && !['sensor', 'binary_sensor', 'scene', 'script'].includes(domainOf(id)));
    else shown = ids.filter((id) => H.entityArea[id] === APP.room);
    const scenes = ids.filter((id) => ['scene', 'script'].includes(domainOf(id)));
    const capped = shown.length > 60;
    shown = shown.slice(0, 60);
    return `${!H.live ? '<p class="help" style="margin-bottom:14px">Showing sample devices. Connect Home Assistant in Settings to control your real ones.</p>' : ''}
      <div class="seg" role="group" aria-label="Rooms">${tabs.map(([k, v]) => `<button type="button" data-act="room" data-room="${esc(k)}" aria-pressed="${APP.room === k}">${esc(v)}</button>`).join('')}</div>
      ${scenes.length && APP.room === 'fav' ? `<div class="section-title">Scenes</div><div class="quick">${scenes.slice(0, 12).map((id) => `<button type="button" class="qbtn" data-act="tile" data-entity="${esc(id)}">${icon('sparkle')} ${esc(entityName(id))}</button>`).join('')}</div><div class="section-title">Devices</div>` : ''}
      ${shown.length ? `<div class="tiles">${shown.map((id) => tileHTML(id, true)).join('')}</div>` : '<div class="empty">Nothing in this room yet.</div>'}
      ${capped ? '<p class="help" style="margin-top:12px">Showing the first 60. Hide extra entities in Home Assistant to tidy this list.</p>' : ''}`;
  }

  // ---- Calendar
  function personChips() {
    const owners = Array.from(new Set(CAL.events.map((e) => calOwner(e.cal)))).filter(Boolean);
    const list = members().filter((p) => owners.includes(p.id));
    if (list.length < 2) return '';
    return `<div class="pchips" role="group" aria-label="Show people">${list.map((p) => `<button type="button" class="pchip" data-act="cal-person" data-id="${p.id}" aria-pressed="${!APP.calHide.has(p.id)}"><span class="pdot" style="--c:${p.color}"></span>${esc(p.name)}</button>`).join('')}</div>`;
  }
  const evRow = (e) => `<div class="ev" style="--c:${evColor(e)}"><span class="tm">${esc(e.allDay ? 'All day' : fmtClock(e.start))}</span><span class="bar"></span><div style="min-width:0"><div style="font-weight:650">${esc(e.title)}</div><div class="muted" style="font-size:13px">${esc(evPerson(e))}${e.allDay ? '' : ' · until ' + esc(fmtClock(e.end))}${e.location ? ' · ' + esc(e.location) : ''}</div></div></div>`;
  function appCal() {
    const views = [['day', 'Day'], ['week', 'Week'], ['list', 'Next 30 days']];
    const seg = `<div class="seg" role="group" aria-label="View">${views.map(([k, v]) => `<button type="button" data-act="cal-view" data-view="${k}" aria-pressed="${APP.calView === k}">${v}</button>`).join('')}</div>`;
    const head = `${CAL.sample ? '<p class="help" style="margin-bottom:14px">Sample events. Connect Home Assistant and its calendars appear here, colored by person.</p>' : ''}${seg}${personChips()}`;
    if (CAL.note) return `${head}<div class="empty">${esc(CAL.note)}</div>`;
    const evs = visibleEvents();
    const today = startOfDay(new Date());
    if (APP.calView === 'list') {
      const up = evs.filter((e) => e.end > new Date());
      if (!up.length) return `${head}<div class="empty">Nothing on the calendar for the next 30 days.</div>`;
      const groups = new Map();
      up.forEach((e) => { const k = startOfDay(e.start).getTime(); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); });
      return head + '<div class="dayview">' + Array.from(groups.entries()).map(([k, list]) => `<div class="section-title">${esc(relDay(new Date(k)))} · ${esc(new Date(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}</div>` + list.map(evRow).join('')).join('') + '</div>';
    }
    const nav = (label) => `<div class="cal-nav"><button type="button" class="icon-btn" data-act="cal-move" data-dir="-1" aria-label="Previous">${icon('back')}</button><button type="button" class="qbtn sm" data-act="cal-move" data-dir="0">Today</button><button type="button" class="icon-btn" data-act="cal-move" data-dir="1" aria-label="Next">${icon('fwd')}</button><span class="lbl">${esc(label)}</span></div>`;
    if (APP.calView === 'day') {
      const day = addDays(today, APP.calOffset);
      const list = eventsOn(day, evs);
      return `${head}${nav(`${relDay(day)} · ${day.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`)}<div class="dayview">${list.length ? list.map(evRow).join('') : '<div class="empty">Nothing scheduled.</div>'}</div>`;
    }
    const start = addDays(today, APP.calOffset * 7);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const label = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    return `${head}${nav(label)}<div class="week-wrap"><div class="week">${days.map((d) => {
      const list = eventsOn(d, evs);
      return `<div class="wday${+d === +today ? ' today' : ''}"><div class="h">${esc(d.toLocaleDateString(undefined, { weekday: 'short' }))}<span>${d.getDate()}</span></div>${list.map((e) => `<div class="evchip" style="--c:${evColor(e)}"><b>${esc(e.title)}</b>${esc(e.allDay ? 'All day' : fmtClock(e.start))} · ${esc(evPerson(e))}</div>`).join('') || '<div class="faint" style="font-size:12.5px">Free</div>'}</div>`;
    }).join('')}</div></div>`;
  }

  // ---- Tasks
  function peopleOptions(selId, blank = 'Anyone') {
    return `<option value="">${esc(blank)}</option>` + members().map((p) => `<option value="${p.id}" ${p.id === selId ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  }
  function appTasks() {
    const k = APP.ttab;
    const seg = `<div class="seg" role="group" aria-label="Lists">${LIST_KINDS.map((x) => `<button type="button" data-act="task-tab" data-tab="${x.id}" aria-pressed="${k === x.id}">${icon(x.icon)}${x.name} <span class="faint">${items(x.id).filter((i) => !i.done).length}</span></button>`).join('')}</div>`;
    const list = items(k).slice().sort((a, b) => (a.done - b.done) || String(a.due || '9').localeCompare(String(b.due || '9')));
    const src = haList(k) ? `Shared through Home Assistant (${esc(entityName(haList(k)))}).` : listIsSample(k) ? 'Sample items. Your changes are saved on this iPad.' : 'Saved on this iPad. Pick a Home Assistant to-do list in Settings → Family to share it with phones.';
    const add = `<form class="addrow" data-form="task" style="margin-bottom:14px"><input class="inline-input" id="task-text" placeholder="${k === 'groceries' ? 'Add items, like “Bananas, bread”' : k === 'chores' ? 'Add a chore' : 'Add a reminder'}" autocomplete="off">${k === 'groceries' ? '' : `<select class="inline-input" id="task-who" aria-label="Assign to">${peopleOptions(curProfile().fixed ? '' : S.profile)}</select><input class="inline-input" type="date" id="task-due" aria-label="Due date">`}<button type="submit" class="qbtn primary">${icon('plus')}Add</button></form>`;
    const done = list.some((i) => i.done);
    return `${seg}${add}${list.length ? `<div class="list-panel">${list.map((i) => taskRow(i, k, false)).join('')}</div>` : '<div class="empty">Nothing here yet.</div>'}
      ${done ? `<div class="quick" style="margin-top:12px"><button type="button" class="qbtn" data-act="task-clear" data-kind="${k}">Clear completed</button></div>` : ''}<p class="help" style="margin-top:10px">${src}</p>`;
  }

  // ---- Kitchen
  function timerCards() {
    const now = Date.now();
    const cards = timers.slice().sort((a, b) => a.end - b.end).map((t) => `<div class="timer-card${t.done ? ' done' : ''}"><div class="muted">${esc(t.label)}</div><div class="left num" data-left="${t.id}">${t.done ? 'Done' : fmtLeft(t.end - now)}</div>
      <div class="quick">${t.done ? '' : `<button type="button" class="qbtn" data-act="timer-plus" data-id="${t.id}">+1 min</button>`}<button type="button" class="qbtn danger" data-act="timer-cancel" data-id="${t.id}">${t.done ? 'Clear' : 'Cancel'}</button></div></div>`).join('');
    return cards ? `<div class="timers">${cards}</div>` : '<div class="empty">No timers running.</div>';
  }
  function timersHTML() {
    const presets = [1, 3, 5, 10, 15, 20, 30, 45, 60].map((m) => `<button type="button" class="qbtn" data-act="timer" data-sec="${m * 60}">${m >= 60 ? m / 60 + ' hr' : m + ' min'}</button>`).join('');
    return `<div class="section-title">Quick start</div><div class="quick">${presets}</div>
      <div class="section-title">Custom</div>
      <form class="row2" data-form="timer" style="max-width:640px"><label class="field"><span>Minutes</span><input type="number" id="t-min" min="1" max="600" value="12" inputmode="numeric"></label><label class="field"><span>Label</span><input type="text" id="t-label" placeholder="Pasta"></label><button type="submit" class="qbtn primary" style="min-height:44px">Start</button></form>
      <div class="section-title">Running</div>${timerCards()}`;
  }
  function appCook() {
    if (APP.adding) {
      return `<div class="form">
        <label class="field"><span>Recipe name</span><input type="text" id="r-title" placeholder="Leave blank to use the first line"></label>
        <label class="field"><span>Paste the whole recipe</span><textarea class="tall" id="r-text" placeholder="Ingredients&#10;1 cup flour&#10;…&#10;&#10;Directions&#10;1. Preheat the oven to 375°F.&#10;…"></textarea></label>
        <p class="help">Lines under “Ingredients” become a checklist and lines under “Directions” become steps.</p>
        <div class="quick"><button type="button" class="qbtn primary" data-act="recipe-save">Save recipe</button><button type="button" class="qbtn" data-act="chef-back">Cancel</button></div></div>`;
    }
    const r = recipes.find((x) => x.id === APP.recipeId);
    if (!r) { APP.recipeId = null; return appKitchen(); }
    const n = r.steps.length;
    const i = clamp(APP.step, 0, Math.max(0, n - 1));
    const text = r.steps[i] || 'This recipe has no steps.';
    const tms = stepTimers(text).map((t) => `<button type="button" class="qbtn primary" data-act="timer" data-sec="${t.sec}" data-label="${esc(r.title)} · ${esc(t.label)}">${icon('timer')} Start ${esc(fmtDur(t.sec))}</button>`).join('');
    const confirmDel = APP.confirm === 'del-' + r.id;
    return `<div class="cook">
      <div><div class="section-title">Ingredients</div><div class="ingredients">${r.ingredients.map((x, k) => `<label><input type="checkbox" data-ing="${k}" ${APP.checked.has(k) ? 'checked' : ''}><span>${esc(x)}</span></label>`).join('') || '<p class="help">No ingredients listed.</p>'}</div>
        <div class="quick" style="margin-top:16px"><button type="button" class="qbtn" data-act="recipe-groceries" data-id="${esc(r.id)}">${icon('cart')} Add to Groceries</button><button type="button" class="qbtn danger" data-act="recipe-del" data-id="${esc(r.id)}">${icon('trash')} ${confirmDel ? 'Tap again to delete' : 'Delete'}</button></div></div>
      <div class="stepcard"><div class="count">Step ${n ? i + 1 : 0} of ${n}</div><div class="text">${esc(text)}</div>${tms ? `<div class="quick">${tms}</div>` : ''}
        <div class="stepnav"><button type="button" class="qbtn" data-act="step" data-dir="-1" ${i === 0 ? 'disabled' : ''}>Back</button><button type="button" class="qbtn primary" data-act="step" data-dir="1" ${i >= n - 1 ? 'disabled' : ''}>Next step</button></div></div></div>
      ${timers.length ? `<div class="section-title">Timers</div>${timerCards()}` : ''}`;
  }
  function appKitchen() {
    if (APP.recipeId || APP.adding) return appCook();
    const tabs = [['plan', 'Meal plan'], ['recipes', 'Recipes'], ['timers', 'Timers']];
    const seg = `<div class="seg" role="group" aria-label="Kitchen">${tabs.map(([k, v]) => `<button type="button" data-act="k-tab" data-tab="${k}" aria-pressed="${APP.ktab === k}">${v}</button>`).join('')}</div>`;
    if (APP.ktab === 'recipes') {
      return `${seg}<div class="quick" style="margin-bottom:16px"><button type="button" class="qbtn primary" data-act="recipe-add">${icon('plus')} Add a recipe</button></div>
        <div class="recipes">${recipes.map((r) => `<button type="button" class="recipe-card" data-act="recipe-open" data-id="${esc(r.id)}"><span class="t">${esc(r.title)}</span><span class="muted">${r.ingredients.length} ingredients · ${r.steps.length} steps</span>${r.sample ? '<span><span class="tag">Sample</span></span>' : ''}</button>`).join('')}</div>
        <p class="help" style="margin-top:16px">Paste a recipe from any website. Step mode keeps the clock face away while you cook, and times like “bake 25 minutes” become one-tap timers.</p>`;
    }
    if (APP.ktab === 'timers') return seg + timersHTML();
    const rows = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(new Date(), i), iso = isoOf(d), m = MEALS[iso] || {};
      return `<div class="meal-row${i === 0 ? ' today' : ''}"><div class="d">${esc(i === 0 ? 'Tonight' : d.toLocaleDateString(undefined, { weekday: 'long' }))}<span>${esc(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}</span></div>
        <div class="pair"><input id="meal-t-${iso}" data-meal-text="${iso}" value="${esc(m.text || '')}" placeholder="Dinner, like “Tacos”" aria-label="Dinner"><select id="meal-r-${iso}" data-meal-recipe="${iso}" aria-label="Recipe"><option value="">No recipe</option>${recipes.map((r) => `<option value="${esc(r.id)}" ${r.id === m.recipe ? 'selected' : ''}>${esc(r.title)}</option>`).join('')}</select></div></div>`;
    }).join('');
    const rid = MEALS[isoDay(0)]?.recipe;
    return `${seg}${MEALS._sample ? '<p class="help" style="margin-bottom:12px">Sample plan. Change any night to make it yours.</p>' : ''}
      <div class="panel" style="padding-block:6px">${rows}</div>
      <div class="quick" style="margin-top:14px">${rid ? `<button type="button" class="qbtn primary" data-act="recipe-open" data-id="${esc(rid)}">Start cooking tonight’s recipe</button>` : ''}<button type="button" class="qbtn" data-act="meal-groceries">${icon('cart')} Add this week’s ingredients to Groceries</button></div>`;
  }

  // ---- Music
  function appMusic() {
    const ids = speakerIds();
    if (!ids.length) return '<div class="empty">No speakers in Home Assistant yet. Sonos, AirPlay, Google Cast and most smart speakers show up after you add them there.</div>';
    return `${!H.live ? '<p class="help" style="margin-bottom:14px">Sample speakers. Connect Home Assistant to control yours.</p>' : ''}<div class="speakers">${ids.map((id) => {
      const s = H.states[id], a = s.attributes, playing = s.state === 'playing';
      const vol = Math.round((a.volume_level ?? 0) * 100);
      const src = Array.isArray(a.source_list) && a.source_list.length ? `<select data-source="${esc(id)}" aria-label="Source for ${esc(entityName(id))}">${a.source_list.map((x) => `<option ${x === a.source ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>` : '';
      return `<div class="speaker"><div class="np"><div class="art lg"${artStyle(a)}>${a.entity_picture && H.live ? '' : icon('music')}</div><div style="min-width:0"><div class="faint" style="font-size:12.5px">${esc(entityName(id))}</div><div class="t">${esc(a.media_title || (playing ? 'Playing' : cap(s.state)))}</div><div class="s">${esc(a.media_artist || '')}</div></div></div>
        <div class="controls"><button type="button" class="rbtn" data-act="media" data-cmd="prev" data-entity="${esc(id)}" aria-label="Previous">${icon('prev')}</button><button type="button" class="rbtn play" data-act="media" data-cmd="play" data-entity="${esc(id)}" aria-label="${playing ? 'Pause' : 'Play'}">${icon(playing ? 'pause' : 'play')}</button><button type="button" class="rbtn" data-act="media" data-cmd="next" data-entity="${esc(id)}" aria-label="Next">${icon('next')}</button><span style="flex:1"></span>${src}</div>
        <label style="display:flex;align-items:center;gap:10px">${icon('volume')}<input type="range" min="0" max="100" value="${vol}" data-vol="${esc(id)}" aria-label="Volume for ${esc(entityName(id))}"><span class="num muted" style="min-width:36px;text-align:right">${vol}%</span></label></div>`;
    }).join('')}</div>`;
  }

  // ---- Security
  function appSecurity() {
    const st = houseStatus();
    const issues = st.issues.length ? st.issues.map((i) => {
      let fix = '';
      if (i.fix === 'lock') fix = `<button type="button" class="fix" data-act="fix" data-fix="lock" data-entity="${esc(i.id)}">Lock</button>`;
      if (i.fix === 'close') fix = `<button type="button" class="fix" data-act="fix" data-fix="close" data-entity="${esc(i.id)}">${isArmed(i.id) ? 'Tap again' : 'Close'}</button>`;
      if (i.app) fix = `<button type="button" class="fix" data-act="open" data-app="${i.app}">Open</button>`;
      return `<div class="issue"><span class="lv ${i.lvl}"></span><span>${esc(i.text)}</span>${fix}</div>`;
    }).join('') : '<div class="issue"><span class="lv"></span><span>Everything is locked and closed.</span></div>';
    const people = idsOf('person').map((id) => `<span class="pill ${H.states[id].state === 'home' ? 'good' : ''}">${esc(entityName(id))} · ${esc(H.states[id].state === 'home' ? 'Home' : H.states[id].state === 'not_home' ? 'Away' : cap(H.states[id].state))}</span>`).join(' ');
    const cams = cameraIds();
    const rings = RINGS.slice(0, 5).map((r) => `<div class="li"><span class="k">${esc(relDay(new Date(r.at)))}</span><span class="v">${esc(fmtClock(new Date(r.at)))}${r.src ? ' · ' + esc(entityName(r.src)) : ''}</span></div>`).join('');
    return `<div class="two-col"><div><div class="section-title">${esc(st.title)}</div><div class="panel issues-panel">${issues}</div>
      ${people && privateOK() ? `<div class="section-title">Who’s home</div><div class="quick">${people}</div>` : ''}
      ${st.alarm ? `<div class="section-title">Alarm</div><div class="panel">${esc(entityName(st.alarm.entity_id))}: <b>${esc(cap(st.alarm.state))}</b></div>` : ''}
      <div class="section-title">Doorbell</div><div class="panel" style="display:grid;gap:6px">${rings || '<div class="muted">No rings yet.</div>'}</div></div>
      <div><div class="section-title">Cameras</div>${cams.length ? `<div class="camgrid" style="grid-template-columns:1fr">${cams.map(camHTML).join('')}</div>` : '<div class="empty">No cameras in Home Assistant yet.</div>'}
      ${!H.live ? '<p class="help" style="margin-top:12px">Sample cameras. Connect Home Assistant to see live snapshots, refreshed every 5 seconds.</p>' : ''}</div></div>`;
  }

  // ---- Message board
  function appBoard() {
    const notes = items('board').filter((n) => !n.done).slice().reverse();
    const src = haList('board') ? `Shared through Home Assistant (${esc(entityName(haList('board')))}).` : 'Saved on this iPad. Pick a Home Assistant to-do list in Settings → Family to post from phones too.';
    return `<form class="addrow" data-form="note" style="margin-bottom:16px"><input class="inline-input" id="note-text" placeholder="Leave a note for the family" autocomplete="off"><select class="inline-input" id="note-who" aria-label="From">${peopleOptions(curProfile().fixed ? '' : S.profile, 'From…')}</select><button type="submit" class="qbtn primary">${icon('send')}Post</button></form>
      ${notes.length ? `<div class="notes">${notes.map((n) => `<div class="note-card" style="--c:${pColor(n.who)}"><div class="t">${esc(n.text)}</div><div class="s"><span class="pdot" style="--c:${pColor(n.who)}"></span>${esc(pName(n.who) || 'Someone')}${n.at ? ' · ' + esc(relDay(new Date(n.at))) + ' ' + esc(fmtClock(new Date(n.at))) : ''}<span style="flex:1"></span><button type="button" class="icon-btn" data-act="task-del" data-kind="board" data-id="${esc(n.id)}" aria-label="Remove note">${icon('x')}</button></div></div>`).join('')}</div>` : '<div class="empty">No notes yet.</div>'}
      <p class="help" style="margin-top:14px">${src}</p>`;
  }

  // ---- Packages
  function carrierOf(num) {
    const n = String(num || '').replace(/\s+/g, '').toUpperCase();
    if (/^1Z[0-9A-Z]{16}$/.test(n)) return 'UPS';
    if (/^TBA\d{9,}$/.test(n)) return 'Amazon';
    if (/^(9[1-5])\d{18,24}$/.test(n) || /^[A-Z]{2}\d{9}US$/.test(n) || /^\d{20,22}$/.test(n)) return 'USPS';
    if (/^\d{12}$|^\d{15}$/.test(n)) return 'FedEx';
    if (/^\d{10}$/.test(n)) return 'DHL';
    return '';
  }
  function trackUrl(num, carrier) {
    const n = encodeURIComponent(String(num || '').replace(/\s+/g, ''));
    return {
      UPS: `https://www.ups.com/track?tracknum=${n}`,
      USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
      FedEx: `https://www.fedex.com/fedextrack/?trknbr=${n}`,
      Amazon: `https://track.amazon.com/tracking/${n}`,
      DHL: `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${n}`,
    }[carrier] || `https://www.google.com/search?q=${n}`;
  }
  function appPackages() {
    const active = PKGS.filter((p) => !p.delivered).sort((a, b) => String(a.expected || '9').localeCompare(String(b.expected || '9')));
    const delivered = PKGS.filter((p) => p.delivered).slice(-10).reverse();
    const row = (p) => `<div class="pkg"><span style="display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:var(--hair);flex:none">${icon('box')}</span><div class="m"><div class="t">${esc(p.label)}${p.sample ? ' <span class="tag">Sample</span>' : ''}</div><div class="s">${esc(p.carrier || 'Carrier unknown')} · <span class="mono">${esc(p.number)}</span>${p.expected ? ` · expected ${esc(relDay(parseDay(p.expected)).toLowerCase())}` : ''}</div></div>
      <a class="qbtn sm" href="${esc(trackUrl(p.number, p.carrier))}" target="_blank" rel="noopener">${icon('ext')}Track</a><button type="button" class="qbtn sm" data-act="pkg-done" data-id="${p.id}">${p.delivered ? 'Not yet' : 'Delivered'}</button><button type="button" class="icon-btn" data-act="pkg-del" data-id="${p.id}" aria-label="Remove ${esc(p.label)}">${icon('x')}</button></div>`;
    return `<form class="addrow" data-form="pkg" style="margin-bottom:16px"><input class="inline-input" id="pkg-label" placeholder="What is it? Like “Printer ink”" autocomplete="off"><input class="inline-input" id="pkg-number" placeholder="Tracking number" autocomplete="off" autocapitalize="characters" spellcheck="false"><input class="inline-input" type="date" id="pkg-exp" aria-label="Expected date"><button type="submit" class="qbtn primary">${icon('plus')}Add</button></form>
      <p class="help" style="margin-bottom:14px">UPS, USPS, FedEx, DHL and Amazon numbers are recognized automatically. Track opens the carrier’s page.</p>
      <div class="section-title">On the way</div><div class="panel" style="padding-block:4px">${active.length ? active.map(row).join('') : '<div class="empty">Nothing on the way.</div>'}</div>
      ${delivered.length ? `<div class="section-title">Delivered</div><div class="panel" style="padding-block:4px">${delivered.map(row).join('')}</div>` : ''}`;
  }

  // ---- Energy
  function appEnergy() {
    const pe = powerEntity(), ee = energyEntity();
    if (!pe && !ee) return '<div class="empty">No energy sensors yet. Add a whole-home power meter, like an Emporia Vue, Sense or a smart meter integration, to Home Assistant and it shows up here.</div>';
    const hist = EN.hist[pe] || [];
    const vals = hist.filter((v) => v != null);
    const peak = vals.length ? Math.max(...vals) : null;
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    const devices = idsOf('sensor').filter((id) => id !== pe && H.states[id].attributes.device_class === 'power').map((id) => ({ id, w: powerW(id) })).filter((x) => x.w != null).sort((a, b) => b.w - a.w).slice(0, 8);
    const maxW = Math.max(1, ...devices.map((d) => d.w));
    const today = ee ? H.states[ee] : null;
    return `${!H.live ? '<p class="help" style="margin-bottom:14px">Sample numbers. Connect Home Assistant to see your real usage.</p>' : ''}
      <div class="kpis"><div class="kpi"><div class="v num">${fmtW(powerW(pe))}</div><div class="l">Using now</div></div>${today ? `<div class="kpi"><div class="v num">${esc(today.state)} <span style="font-size:18px">${esc(today.attributes.unit_of_measurement || 'kWh')}</span></div><div class="l">Today</div></div>` : ''}${peak != null ? `<div class="kpi"><div class="v num">${fmtW(peak)}</div><div class="l">24-hour peak</div></div><div class="kpi"><div class="v num">${fmtW(avg)}</div><div class="l">24-hour average</div></div>` : ''}</div>
      ${pe ? `<div class="chart-lg"><div class="spark-box" style="height:100%">${sparkHTML(hist)}</div><div class="axis"><span>24 hours ago</span><span>12 hours ago</span><span>Now</span></div></div>` : ''}
      ${devices.length ? `<div class="section-title">Devices using power now</div><div class="panel bars">${devices.map((d) => `<div class="barrow"><span class="clamp1">${esc(entityName(d.id))}</span><span class="track"><span class="fill" style="width:${((d.w / maxW) * 100).toFixed(1)}%;display:block"></span></span><span class="num muted">${fmtW(d.w)}</span></div>`).join('')}</div>` : ''}
      <p class="help" style="margin-top:14px">Main meter: ${esc(pe ? entityName(pe) : 'none')}. Change it in Settings → Devices.</p>`;
  }

  // ---- Photos
  function appPhotos() {
    const del = selectedPhotos.size ? `<button type="button" class="qbtn danger" data-act="photo-del">${icon('trash')} ${APP.confirm === 'photos' ? 'Tap again to delete' : `Delete ${selectedPhotos.size}`}</button>` : '';
    return `<div class="quick" style="margin-bottom:12px"><label class="qbtn primary file-btn">${icon('plus')} Add photos<input type="file" id="photo-input" accept="image/*" multiple></label>${del}</div>
      <p class="help" style="margin-bottom:16px">Photos stay on this iPad and play on the Photo frame clock face. Overnight it switches to a dim red clock. Tap photos to select them for deleting.</p>
      ${photos.length ? `<div class="photos">${photos.map((p) => `<button type="button" class="photo${selectedPhotos.has(p.id) ? ' sel' : ''}" data-act="photo-sel" data-id="${p.id}" aria-pressed="${selectedPhotos.has(p.id)}"><img alt="" src="${p.url}"></button>`).join('')}</div>` : '<div class="empty">No photos yet.</div>'}`;
  }

  // ---- Emergency
  const EM_FIELDS = [['address', 'Home address (read this to 911)'], ['directions', 'Nearest cross street or landmark'], ['gas', 'Gas shutoff'], ['water', 'Water shutoff'], ['power', 'Electrical panel'], ['extinguishers', 'Fire extinguishers'], ['meeting', 'Outside meeting spot'], ['medical', 'Medical notes for responders (allergies, medications)'], ['notes', 'Other notes (vet, sitter instructions)']];
  function appEmergency() {
    const canEdit = privateOK();
    const tested = EMERG.smokeTested ? `${relDay(parseDay(EMERG.smokeTested))} (${daysSince(EMERG.smokeTested)} days ago)` : 'Not logged yet';
    const testCard = `<div class="info-card"><div class="l">Smoke alarm test</div><div class="v">${esc(tested)}</div><p class="help">Press each alarm’s test button once a month. Replace alarms that are 10 years old.</p><div class="quick"><button type="button" class="qbtn sm primary" data-act="smoke-tested">Tested today</button></div></div>`;
    if (APP.emEdit && canEdit) {
      return `<div class="form">${EM_FIELDS.map(([k, l]) => `<label class="field"><span>${esc(l)}</span>${['medical', 'notes'].includes(k) ? `<textarea id="em-${k}" data-em="${k}">${esc(EMERG[k] || '')}</textarea>` : `<input type="text" id="em-${k}" data-em="${k}" value="${esc(EMERG[k] || '')}">`}</label>`).join('')}
        <div class="section-title">Contacts</div>${EMERG.contacts.map((c) => `<div class="row2"><label class="field"><span>Name</span><input type="text" id="emc-n-${c.id}" data-emc="${c.id}" data-f="name" value="${esc(c.name)}"></label><label class="field"><span>Phone</span><input type="tel" id="emc-p-${c.id}" data-emc="${c.id}" data-f="phone" value="${esc(c.phone)}"></label><button type="button" class="qbtn danger" data-act="emc-del" data-id="${c.id}" style="min-height:44px">Remove</button></div>`).join('')}
        <div class="quick"><button type="button" class="qbtn" data-act="emc-add">${icon('plus')} Add contact</button><button type="button" class="qbtn primary" data-act="em-edit">Done editing</button></div></div>`;
    }
    const cards = EM_FIELDS.slice(2).filter(([k]) => EMERG[k]).map(([k, l]) => `<div class="info-card"><div class="l">${esc(l.replace(/ \(.+\)$/, ''))}</div><div class="v">${esc(EMERG[k])}</div></div>`).join('');
    return `<div class="sos"><div style="font-weight:700;letter-spacing:.04em;text-transform:uppercase;font-size:13px">In an emergency call</div><div class="n">911</div><div class="addr">${EMERG.address ? esc(EMERG.address) : 'Address not added yet'}</div>${EMERG.directions ? `<div>${esc(EMERG.directions)}</div>` : ''}</div>
      <div class="section-title">Contacts</div><div class="panel">${EMERG.contacts.map((c) => `<div class="contact"><span>${esc(c.name)}</span><a class="p" href="tel:${esc(String(c.phone).replace(/[^\d+]/g, ''))}">${esc(c.phone)}</a></div>`).join('')}</div>
      <div class="section-title">Around the house</div><div class="info-grid">${cards}${testCard}</div>
      ${!cards ? '<p class="help" style="margin-top:12px">Add shutoff locations, extinguishers and a meeting spot so a sitter or guest can find them fast.</p>' : ''}
      ${canEdit ? `<div class="quick" style="margin-top:16px"><button type="button" class="qbtn" data-act="em-edit">${icon('edit')} Edit emergency info</button></div>` : ''}`;
  }

  // ---- Assistant
  function chatHTML() {
    const examples = ['What’s next today?', 'Is the house okay?', 'Set a timer for 10 minutes', 'Add milk and eggs to groceries', 'Run bedtime', 'What’s for dinner?'];
    if (!ASSIST.log.length) return `<div class="msg bot">Hi. Ask me about the family schedule, the house, timers, lists or modes.${H.live ? ' Anything else goes to Home Assistant Assist.' : ''}</div><div class="quick">${examples.map((e) => `<button type="button" class="qbtn sm" data-act="ask-example" data-q="${esc(e)}">${esc(e)}</button>`).join('')}</div>`;
    return ASSIST.log.map((m) => `<div class="msg ${m.who}">${esc(m.text)}</div>`).join('');
  }
  function appAssist() {
    return `<div class="chat" id="chat">${chatHTML()}</div>
      <form class="ask-row" data-form="ask"><button type="button" class="mic" id="mic" data-act="mic" aria-label="Speak" aria-pressed="false">${icon('mic')}</button><input id="ask-input" placeholder="Type or tap the mic" autocomplete="off" enterkeyhint="send"><button type="submit" class="send" aria-label="Send">${icon('send')}</button></form>
      <p class="help" style="margin-top:12px">${SR ? 'Voice works while this screen is open.' : 'For voice, tap the microphone key on the iPad keyboard.'} ${H.live ? 'Device questions go to Home Assistant Assist.' : 'Connect Home Assistant for full device control by voice.'}</p>`;
  }
  function renderAssistChat() {
    if (APP.name !== 'assist') return;
    const c = $('#chat');
    if (c) c.innerHTML = chatHTML();
    const sb = $('.sheet-body');
    if (sb) sb.scrollTop = sb.scrollHeight;
  }

  // ---- Settings
  function haStatusHTML() {
    const txt = { sample: 'Not connected. Showing sample devices.', connecting: 'Connecting…', connected: `Connected. ${Object.keys(H.states).length} entities loaded.`, retrying: 'Reconnecting…', error: 'Not connected.' }[H.status];
    return `<div id="ha-status"><div class="status-line"><span class="dot ${haDot()}"></span>${esc(txt)}</div>${H.message ? `<p class="help">${esc(H.message)}</p>` : ''}</div>`;
  }
  function sel(key, opts, val, attr = 'data-set') {
    return `<select id="s-${esc(String(key).replace(/\W/g, '-'))}" ${attr}="${esc(key)}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  }
  const entityOpts = (ids, blank) => [['', blank], ...ids.map((id) => [id, entityName(id)])];

  function appSettings() {
    const tabs = [['connect', 'Connections'], ['screen', 'Home screen'], ['modes', 'Modes'], ['family', 'Family'], ['devices', 'Devices'], ['setup', 'iPad setup']];
    const seg = `<div class="seg" role="group" aria-label="Settings sections">${tabs.map(([k, v]) => `<button type="button" data-act="s-tab" data-tab="${k}" aria-pressed="${APP.stab === k}">${v}</button>`).join('')}</div>`;
    const body = { connect: setConnect, screen: setScreen, modes: setModes, family: setFamily, devices: setDevices, setup: setSetup }[APP.stab] || setConnect;
    return `${seg}<div class="form">${body()}</div>`;
  }

  function setConnect() {
    const https = location.protocol === 'https:';
    const weathers = idsOf('weather');
    return `<div class="section-title">Home Assistant</div>${haStatusHTML()}
      <label class="field"><span>Home Assistant address</span><input type="url" id="ha-url" value="${esc(S.haUrl)}" placeholder="${https ? 'https://umbrel.your-tailnet.ts.net:8123' : 'http://umbrel.local:8123'}" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
      <label class="field"><span>Long-lived access token</span><input type="password" id="ha-token" value="${esc(S.haToken)}" placeholder="Paste the token from Home Assistant" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
      <div class="quick"><button type="button" class="qbtn primary" data-act="ha-connect">Connect</button>${S.haUrl || S.haToken ? '<button type="button" class="qbtn" data-act="ha-disconnect">Disconnect</button>' : ''}</div>
      <div class="panel"><p class="help"><strong>Getting a token on Umbrel:</strong> open the Home Assistant app on your Umbrel, tap your name at the bottom left, open the Security tab, and create a long-lived access token. Paste it above. The token stays on this iPad.</p>
      <p class="help" style="margin-top:10px"><strong>Which address:</strong> ${https ? 'This copy opens over https, so Home Assistant needs an https address too. Either run this app from your Umbrel and use <code>http://umbrel.local:8123</code>, or give Home Assistant an https address with Umbrel’s Tailscale or Cloudflare Tunnel app.' : 'This copy opens over http, so <code>http://umbrel.local:8123</code> works while the iPad is on your home Wi-Fi.'}</p></div>
      <div class="section-title">Weather</div>
      ${weathers.length ? `<label class="field"><span>Source</span>${sel('weatherEntity', [['', 'Open-Meteo (free, no account)'], ...weathers.map((w) => [w, 'Home Assistant · ' + entityName(w)])], S.weatherEntity)}</label>` : ''}
      <div class="row2"><label class="field"><span>Place name</span><input type="text" id="s-place" data-set="place" value="${esc(S.place)}"></label><label class="field"><span>Latitude</span><input type="number" id="s-lat" step="0.0001" data-set="lat" value="${esc(S.lat)}"></label><label class="field"><span>Longitude</span><input type="number" id="s-lon" step="0.0001" data-set="lon" value="${esc(S.lon)}"></label></div>
      <div class="section-title">Bauder HQ feed</div>
      <label class="field"><span>Feed address (JSON)</span><input type="url" id="feed-url" value="${esc(S.feedUrl)}" placeholder="http://umbrel.local:8686/data/bauder-hq.json" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
      <div class="quick"><button type="button" class="qbtn primary" data-act="feed-save">Save and refresh</button></div>
      <p class="help" id="feed-status">${esc(feedStatusText())}</p>
      <p class="help">Drives the Airbnb, Inspections and EV Projects widgets. The README shows the format. Refreshes every 5 minutes.</p>`;
  }

  function setScreen() {
    const key = APP.layoutKey;
    const list = S.layout[key];
    const avail = Object.keys(WIDGET_INFO).filter((id) => !list.includes(id) && (key === 'main' || !WIDGET_INFO[id][2]));
    const hours = Array.from({ length: 24 }, (_, h) => [h, fmtClock(new Date(2026, 0, 1, h, 0))]);
    return `<div class="section-title">Widgets</div>
      <div class="seg" role="group" aria-label="Which screen"><button type="button" data-act="layout-key" data-key="main" aria-pressed="${key === 'main'}">Family screen</button><button type="button" data-act="layout-key" data-key="guest" aria-pressed="${key === 'guest'}">Guest screen</button></div>
      <p class="help">The first screen fits 12 squares: 4 across and 3 down. Widgets past that scroll. ${key === 'guest' ? 'Private widgets can’t be added to the Guest screen.' : ''}</p>
      <div class="panel" style="padding-block:4px">${list.map((id, i) => `<div class="ed-row"><span class="nm">${esc(WIDGET_INFO[id][0])}</span><span class="sz">${SIZE_LABEL[WIDGET_INFO[id][1]]}${WIDGET_INFO[id][2] ? ' · private' : ''}</span><button type="button" class="icon-btn" data-act="layout-move" data-i="${i}" data-dir="-1" aria-label="Move ${esc(WIDGET_INFO[id][0])} up" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button><button type="button" class="icon-btn" data-act="layout-move" data-i="${i}" data-dir="1" aria-label="Move ${esc(WIDGET_INFO[id][0])} down" ${i === list.length - 1 ? 'disabled' : ''}>${icon('down')}</button><button type="button" class="icon-btn" data-act="layout-del" data-i="${i}" aria-label="Remove ${esc(WIDGET_INFO[id][0])}">${icon('x')}</button></div>`).join('') || '<div class="empty">No widgets.</div>'}</div>
      <div class="addrow">${avail.length ? `<select class="inline-input" id="layout-add">${avail.map((id) => `<option value="${id}">${esc(WIDGET_INFO[id][0])} (${SIZE_LABEL[WIDGET_INFO[id][1]]})</option>`).join('')}</select><button type="button" class="qbtn primary" data-act="layout-add">${icon('plus')}Add widget</button>` : ''}<button type="button" class="qbtn" data-act="layout-reset">Reset to default</button></div>
      <div class="section-title">Clock face and photo frame</div>
      <div class="row2"><label class="field"><span>Show the clock after</span>${sel('idleAfter', [[30, '30 seconds'], [60, '1 minute'], [120, '2 minutes'], [300, '5 minutes'], [600, '10 minutes'], [0, 'Never']], S.idleAfter)}</label>
        <label class="field"><span>Face</span>${sel('face', [['bold', 'Bold'], ['analog', 'Analog'], ['photos', 'Photo frame'], ['glance', 'Glance']], S.face)}</label></div>
      <label class="check"><input type="checkbox" id="s-nightMode" data-set="nightMode" ${S.nightMode ? 'checked' : ''}><span>Dim to a red clock overnight</span></label>
      <div class="row2"><label class="field"><span>Night starts</span>${sel('nightStart', hours, S.nightStart)}</label><label class="field"><span>Night ends</span>${sel('nightEnd', hours, S.nightEnd)}</label></div>
      <p class="help">On the clock face, swipe left or right to change faces. Tap to go back. Bedtime mode turns the night clock on right away.</p>
      <div class="section-title">Appearance</div>
      <label class="field"><span>Theme</span>${sel('theme', [['auto', 'Match the iPad'], ['light', 'Light'], ['dark', 'Dark']], S.theme)}</label>`;
  }

  function modeSummary(p) {
    const parts = [];
    if (p.scenes.length) parts.push(`run ${p.scenes.map(entityName).join(', ')}`);
    if (p.turnOn.length) parts.push(`turn on ${p.turnOn.map(entityName).join(', ')}`);
    if (p.turnOff.length) parts.push(`turn off ${p.turnOff.map(entityName).join(', ')}`);
    if (p.locks.length) parts.push(`lock ${p.locks.map(entityName).join(', ')}`);
    if (p.covers.length) parts.push(`close ${p.covers.map(entityName).join(', ')}`);
    if (p.climates.length) parts.push(`set the thermostat to ${p.temp}°`);
    if (p.after === 'kitchen') parts.push('open Kitchen');
    if (p.after === 'clock') parts.push('show the night clock');
    return parts.length ? cap(parts.join('; ')) + '.' : 'Nothing, because everything is already set.';
  }
  function setModes() {
    const id = APP.modeEdit;
    const m = S.modes[id];
    const def = MODE_DEFS.find((x) => x.id === id);
    const ruleBoxes = (field, domains) => {
      const isRule = (r) => r.startsWith('match:') || r.startsWith('area:');
      const ruleList = Array.from(new Set([...DEFAULT_MODES[id][field].filter(isRule), ...m[field].filter(isRule)]));
      const rules = ruleList.map((r) => { const n = resolveRules([r], domains).length; return `<label class="check"><input type="checkbox" data-mode-rule="${id}|${field}|${esc(r)}" ${m[field].includes(r) ? 'checked' : ''}><span>${esc(RULE_LABEL(r))} <span class="faint">(${plural(n, 'match', 'matches')})</span></span></label>`; }).join('');
      const ents = idsOf(...domains).map((e) => `<label class="check"><input type="checkbox" data-mode-rule="${id}|${field}|${esc(e)}" ${m[field].includes(e) ? 'checked' : ''}><span>${esc(entityName(e))}</span></label>`).join('');
      return `<div class="checks">${rules}${ents || '<p class="help">None found.</p>'}</div>`;
    };
    return `<div class="seg" role="group" aria-label="Mode">${MODE_DEFS.map((d) => `<button type="button" data-act="mode-edit" data-mode="${d.id}" aria-pressed="${d.id === id}">${icon(d.icon)}${d.name}</button>`).join('')}</div>
      <div class="panel"><p class="help"><strong>${esc(def.name)} right now would:</strong> ${esc(modeSummary(modePlan(id)))}</p></div>
      <div class="section-title">Scenes and scripts to run</div>${ruleBoxes('scenes', ['scene', 'script'])}
      <div class="section-title">Turn on</div>${ruleBoxes('on', ONABLE)}
      <div class="section-title">Turn off</div>${ruleBoxes('off', ONABLE)}
      <div class="section-title">House</div>
      <label class="check"><input type="checkbox" data-mode-flag="${id}|lightsOff" ${m.lightsOff ? 'checked' : ''}><span>Turn off every other light</span></label>
      <label class="check"><input type="checkbox" data-mode-flag="${id}|lockAll" ${m.lockAll ? 'checked' : ''}><span>Lock every door</span></label>
      <label class="check"><input type="checkbox" data-mode-flag="${id}|closeGarage" ${m.closeGarage ? 'checked' : ''}><span>Close garage doors</span></label>
      <div class="row2"><label class="field"><span>Thermostat (°F, blank to leave alone)</span><input type="number" id="mode-temp-${id}" data-mode-temp="${id}" value="${esc(m.temp ?? '')}" min="45" max="90" inputmode="numeric"></label>
        <label class="field"><span>Afterward</span>${sel(id, [['', 'Stay on the home screen'], ['kitchen', 'Open Kitchen'], ['clock', 'Show the night clock']], m.after, 'data-mode-after')}</label></div>
      <p class="help">Modes never unlock doors or open the garage.</p>
      <div class="quick"><button type="button" class="qbtn primary" data-act="mode" data-mode="${id}">Run ${esc(def.name)} now</button><button type="button" class="qbtn" data-act="mode-reset" data-mode="${id}">Reset ${esc(def.name)}</button></div>`;
  }

  function setFamily() {
    const cals = idsOf('calendar');
    const todos = idsOf('todo');
    const todoSel = (k, label) => `<label class="field"><span>${esc(label)}</span>${sel(k, [['', 'On this iPad'], ...todos.map((t) => [t, 'Home Assistant · ' + entityName(t)])], S.todo[k], 'data-todo')}</label>`;
    return `<div class="section-title">People</div>
      <p class="help">Each person gets a color for calendars, chores and notes. Turn off “Private” for anyone who shouldn’t see calendars and work widgets.</p>
      <div class="panel" style="padding-block:4px">${S.people.map((p) => `<div class="person-row"><input class="inline-input" id="pn-${p.id}" data-person-name="${p.id}" value="${esc(p.name)}" aria-label="Name" ${p.fixed ? 'disabled' : ''}><select class="inline-input" id="pc-${p.id}" data-person-color="${p.id}" aria-label="Color" style="border-left:6px solid ${p.color}">${PALETTE.concat(p.fixed ? [['#9aa6a1', 'Gray']] : []).map(([c, n]) => `<option value="${c}" ${c === p.color ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <label class="check"><input type="checkbox" data-person-private="${p.id}" ${p.showPrivate ? 'checked' : ''} ${p.fixed ? 'disabled' : ''}><span>Private</span></label>${p.fixed || members().length < 2 ? '<span></span>' : `<button type="button" class="icon-btn" data-act="person-del" data-id="${p.id}" aria-label="Remove ${esc(p.name)}">${icon('x')}</button>`}</div>`).join('')}</div>
      <div class="quick"><button type="button" class="qbtn" data-act="person-add">${icon('plus')} Add person</button></div>
      <div class="section-title">Guest protection</div>
      <div class="row2"><label class="field"><span>PIN to leave Guest, open Settings or unlock</span><input type="password" id="s-pin" inputmode="numeric" pattern="[0-9]*" maxlength="8" value="" placeholder="${S.pin ? 'PIN is set. Type a new one to change it' : '4 to 8 digits'}" autocomplete="off"></label><div class="quick"><button type="button" class="qbtn primary" data-act="pin-save">Save PIN</button>${S.pin ? '<button type="button" class="qbtn" data-act="pin-clear">Remove PIN</button>' : ''}</div></div>
      <label class="check"><input type="checkbox" id="s-guestOnIdle" data-set="guestOnIdle" ${S.guestOnIdle ? 'checked' : ''}><span>Switch to Guest whenever the clock face appears</span></label>
      <p class="help">The PIN is a household lock to keep guests out of private screens. It isn’t bank-grade security.</p>
      <div class="section-title">Calendars</div>
      ${cals.length ? `<p class="help">Choose whose calendar each one is. Leave all unchecked to show every calendar.</p><div class="panel" style="padding-block:4px">${cals.map((c) => `<div class="ed-row"><label class="check nm"><input type="checkbox" data-cal="${esc(c)}" ${S.calendars.includes(c) ? 'checked' : ''}><span>${esc(entityName(c))}</span></label>${sel('owner-' + c, members().map((p) => [p.id, p.name]), calOwner(c), 'data-cal-owner')}</div>`).join('')}</div>` : '<p class="help">Calendars appear here once Home Assistant has them.</p>'}
      <div class="section-title">Shared lists</div>
      <p class="help">${todos.length ? 'Use Home Assistant to-do lists so everyone’s phone sees the same groceries, chores, reminders and notes.' : 'Home Assistant to-do lists appear here once connected. Until then, lists are saved on this iPad.'}</p>
      ${todos.length ? `<div class="row2">${todoSel('groceries', 'Groceries')}${todoSel('chores', 'Chores')}${todoSel('reminders', 'Reminders')}${todoSel('board', 'Message board')}</div>` : ''}`;
  }

  function setDevices() {
    const ids = Object.keys(H.states).filter(listable).filter((id) => !['sensor', 'binary_sensor', 'camera'].includes(domainOf(id)));
    ids.sort((a, b) => entityName(a).localeCompare(entityName(b)));
    const favSet = new Set(S.favorites);
    const cams = cameraIds();
    const bells = idsOf('binary_sensor', 'event');
    const persons = idsOf('person');
    const powers = idsOf('sensor').filter((id) => H.states[id].attributes.device_class === 'power');
    const energies = idsOf('sensor').filter((id) => H.states[id].attributes.device_class === 'energy');
    const modeOpts = [['', 'Do nothing'], ...MODE_DEFS.map((d) => [d.id, `Run ${d.name}`])];
    return `<div class="section-title">Home favorites</div>
      <p class="help">Pick up to 6 for the Home widget. ${S.favorites.length ? '' : 'None picked yet, so the first lights, locks and thermostats are shown.'}</p>
      <div class="checks">${ids.map((id) => `<label class="check"><input type="checkbox" data-fav="${esc(id)}" ${favSet.has(id) ? 'checked' : ''}><span>${esc(entityName(id))} <span class="faint">${esc(domainOf(id))}</span></span></label>`).join('') || '<p class="help">No devices found.</p>'}</div>
      <div class="section-title">Doorbell and cameras</div>
      <div class="row2"><label class="field"><span>Doorbell</span>${sel('doorbellEntity', entityOpts(bells, 'Find it automatically'), S.doorbellEntity)}</label>
        <label class="field"><span>Doorbell camera</span>${sel('doorbellCamera', entityOpts(cams, 'Find it automatically'), S.doorbellCamera)}</label>
        ${cams.length ? `<label class="field"><span>Camera on the home screen</span>${sel('mainCamera', entityOpts(cams, 'First camera'), S.mainCamera)}</label>` : ''}</div>
      <div class="quick"><button type="button" class="qbtn" data-act="test-bell">${icon('bell')} Test the doorbell alert</button><button type="button" class="qbtn" data-act="test-hazard">${icon('alert')} Test the smoke alert</button></div>
      <p class="help">Smoke, carbon monoxide, gas, heat and leak sensors in Home Assistant sound an alert here and wake the screen.</p>
      <div class="section-title">Music</div>
      <label class="field"><span>Speaker on the home screen</span>${sel('musicMain', entityOpts(speakerIds(), 'Whatever is playing'), S.musicMain)}</label>
      <div class="section-title">Energy</div>
      <div class="row2"><label class="field"><span>Whole-home power (W)</span>${sel('energy.power', entityOpts(powers, 'Find it automatically'), S.energy.power, 'data-energy')}</label><label class="field"><span>Energy today (kWh)</span>${sel('energy.energy', entityOpts(energies, 'Find it automatically'), S.energy.energy, 'data-energy')}</label></div>
      <div class="section-title">Arrivals</div>
      ${persons.length ? `<p class="help">Runs while this app is open on the iPad. For routines that always run, build them as automations in Home Assistant.</p><div class="panel" style="padding-block:4px">${persons.map((p) => `<div class="ed-row"><span class="nm">When ${esc(entityName(p))} gets home</span>${sel('arr-' + p, modeOpts, S.arrivals[p] || '', 'data-arrival')}</div>`).join('')}<div class="ed-row"><span class="nm">When everyone has left</span>${sel('awayMode', modeOpts, S.awayMode)}</div></div>` : '<p class="help">Add people with the Home Assistant phone app so it knows who’s home, then choose what happens when they arrive.</p>'}`;
  }

  function setSetup() {
    return `<div class="section-title">Set up the iPad</div>
      <div class="panel"><ol class="steps-list">
        <li>Open this page in Safari, tap Share, then <strong>Add to Home Screen</strong>. Open it from that icon so it runs full screen.</li>
        <li>Keep the screen on: Settings → Display &amp; Brightness → Auto-Lock → Never. Keep the iPad on its charger.</li>
        <li>Lock it to this app: Settings → Accessibility → Guided Access → on. Open Bauder Home and triple-click the top button to start.</li>
        <li>Tap the screen once after opening it so timers, the doorbell and alarms can play sound.</li>
      </ol></div>
      <div class="section-title">Assistant</div>
      <label class="check"><input type="checkbox" id="s-speak" data-set="speak" ${S.speak ? 'checked' : ''}><span>Speak answers out loud</span></label>
      <p class="help">The assistant handles timers, lists, modes, the calendar and the house here on the iPad. Everything else goes to Home Assistant Assist, which can also use an AI model you set up there.</p>
      <div class="section-title">Reset</div>
      <div class="quick"><button type="button" class="qbtn danger" data-act="reset">${APP.confirm === 'reset' ? 'Tap again to erase everything' : 'Erase all settings on this iPad'}</button></div>
      <p class="help faint">Bauder Home. Settings, lists, recipes, notes and photos are stored only on this device unless you chose Home Assistant lists.</p>`;
  }

  const APPS = { home: appHome, cal: appCal, tasks: appTasks, kitchen: appKitchen, music: appMusic, security: appSecurity, board: appBoard, packages: appPackages, energy: appEnergy, photos: appPhotos, emergency: appEmergency, settings: appSettings, assist: appAssist };

  // ============================================================ idle faces
  const FACES = ['bold', 'analog', 'photos', 'glance'];
  let idleOn = false;
  let lastTouch = Date.now();
  let faceIdx = Math.max(0, FACES.indexOf(S.face));
  let photoIdx = 0, photoTimer = null;
  let forceNight = false;
  let suppressClickUntil = 0;

  function isNight() {
    if (forceNight) return true;
    if (!S.nightMode) return false;
    const h = new Date().getHours(), a = +S.nightStart, b = +S.nightEnd;
    return a > b ? h >= a || h < b : h >= a && h < b;
  }
  function blockIdle() {
    return !!ringing || !!hazard || !$('#bell').hidden || !$('#pin').hidden || (APP.name === 'kitchen' && (APP.recipeId || APP.adding)) || APP.name === 'settings' || APP.name === 'assist' ||
      (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
  }
  function enterIdle(night) {
    if (idleOn) return;
    forceNight = !!night;
    idleOn = true;
    faceIdx = Math.max(0, FACES.indexOf(S.face));
    $('#pop').hidden = true;
    if (S.guestOnIdle && curProfile().showPrivate) {
      const g = S.people.find((p) => p.fixed);
      if (g) { S.profile = g.id; saveSettings(); if (APP.name && PRIVATE_APPS.concat('settings').includes(APP.name)) closeApp(); renderAll(); }
    }
    renderIdle();
    $('#idle').hidden = false;
  }
  function exitIdle() {
    idleOn = false;
    forceNight = false;
    suppressClickUntil = Date.now() + 350;
    clearInterval(photoTimer);
    photoTimer = null;
    $('#idle').hidden = true;
    $('#idle').innerHTML = '';
    lastTouch = Date.now();
  }
  function analogSVG() {
    let ticks = '';
    for (let i = 0; i < 60; i++) {
      const a = (i * 6 * Math.PI) / 180, major = i % 5 === 0;
      const r1 = 188, r2 = major ? 166 : 178;
      ticks += `<line class="tick${major ? ' major' : ''}" x1="${(200 + r1 * Math.sin(a)).toFixed(1)}" y1="${(200 - r1 * Math.cos(a)).toFixed(1)}" x2="${(200 + r2 * Math.sin(a)).toFixed(1)}" y2="${(200 - r2 * Math.cos(a)).toFixed(1)}"/>`;
    }
    const lbl = [[12, 200, 72], [3, 330, 209], [6, 200, 346], [9, 70, 209]].map(([t, x, y]) => `<text class="lbl" x="${x}" y="${y}">${t}</text>`).join('');
    return `<svg viewBox="0 0 400 400" role="img" aria-label="Analog clock">${ticks}${lbl}
      <line class="hand" data-hand="h" x1="200" y1="200" x2="200" y2="112" stroke-width="12"/><line class="hand" data-hand="m" x1="200" y1="200" x2="200" y2="58" stroke-width="8"/>
      <line class="sec" data-hand="s" x1="200" y1="226" x2="200" y2="42"/><circle class="hub" cx="200" cy="200" r="8"/></svg>`;
  }
  function glanceRows() {
    const rows = [];
    if (WX.now) rows.push(`<div class="gl">${icon(WX.now.icon)}<span>${Math.round(WX.now.temp)}° ${esc(WX.now.text)}${WX.daily[0] ? ` <span class="muted">H ${Math.round(WX.daily[0].hi)}° L ${Math.round(WX.daily[0].lo)}°</span>` : ''}</span></div>`);
    const st = houseStatus();
    rows.push(`<div class="gl">${icon(st.level === 'good' ? 'shieldok' : 'alert')}<span>${esc(st.title)}</span></div>`);
    if (privateOK()) {
      const e = upcoming()[0];
      if (e) rows.push(`<div class="gl">${icon('cal')}<span>${esc(e.title)} <span class="muted">${esc(relDay(e.start))}${e.allDay ? '' : ' ' + esc(fmtClock(e.start))}</span></span></div>`);
    }
    const t = nextTimer();
    if (t) rows.push(`<div class="gl">${icon('timer')}<span>${esc(t.label)} <span class="muted num" data-left="${t.id}">${fmtLeft(t.end - Date.now())}</span></span></div>`);
    return rows.join('');
  }
  function renderIdle() {
    const el = $('#idle');
    const night = isNight();
    let face = FACES[faceIdx];
    if (face === 'photos' && night && photos.length) face = 'bold';
    el.classList.toggle('night', night);
    const n = new Date(), t = fmtTime(n);
    const sub = `${esc(fmtDate(n))}${WX.now ? ` · ${Math.round(WX.now.temp)}° ${esc(WX.now.text)}` : ''}`;
    let html;
    if (face === 'bold') html = `<div class="face face-bold"><div class="clock num" data-clock="hm">${t.hm}</div><div class="sub">${sub}</div></div>`;
    else if (face === 'analog') html = `<div class="face face-analog">${analogSVG()}</div>`;
    else if (face === 'photos') {
      html = photos.length
        ? `<div class="face face-photos"><div class="bg" data-ph="a" style="background-image:url('${photos[photoIdx % photos.length].url}')"></div><div class="bg" data-ph="b" style="opacity:0"></div><div class="shade"></div><div class="over"><div class="clock num" data-clock="hm">${t.hm}</div><div class="sub">${sub}</div></div></div>`
        : `<div class="face face-bold"><div class="clock num" data-clock="hm">${t.hm}</div><div class="sub">Add photos in the Photos app to use the photo frame.</div></div>`;
    } else html = `<div class="face face-glance"><div class="clock num" data-clock="hm">${t.hm}</div><div class="rows">${glanceRows()}</div></div>`;
    const tt = nextTimer();
    const st = houseStatus();
    el.innerHTML = html +
      (tt && face !== 'glance' ? `<div class="idle-timer num">${icon('timer')}<span data-left="${tt.id}">${fmtLeft(tt.end - Date.now())}</span></div>` : '') +
      (st.level !== 'good' && face !== 'glance' ? `<div class="idle-alert">${icon('alert')}${esc(st.title)}</div>` : '') +
      `<div class="idle-dots" aria-hidden="true">${FACES.map((f, i) => `<i class="${i === faceIdx ? 'on' : ''}"></i>`).join('')}</div>`;
    updateClocks();
    clearInterval(photoTimer);
    if (face === 'photos' && photos.length > 1) photoTimer = setInterval(nextPhoto, 15000);
  }
  function nextPhoto() {
    const a = $('#idle [data-ph="a"]'), b = $('#idle [data-ph="b"]');
    if (!a || !b || !photos.length) return;
    photoIdx = (photoIdx + 1) % photos.length;
    const showB = a.style.opacity !== '0';
    const incoming = showB ? b : a, outgoing = showB ? a : b;
    incoming.style.backgroundImage = `url('${photos[photoIdx].url}')`;
    incoming.style.opacity = '1';
    outgoing.style.opacity = '0';
  }

  let lastMinute = -1;
  function updateClocks() {
    const n = new Date(), t = fmtTime(n);
    $$('[data-clock="hm"]').forEach((el) => { if (el.textContent !== t.hm) el.textContent = t.hm; });
    $$('[data-clock="ap"]').forEach((el) => { if (el.textContent !== t.ap) el.textContent = t.ap; });
    const h = $('#idle [data-hand="h"]');
    if (h) {
      const s = n.getSeconds(), m = n.getMinutes() + s / 60, hr = (n.getHours() % 12) + m / 60;
      h.setAttribute('transform', `rotate(${hr * 30} 200 200)`);
      $('#idle [data-hand="m"]').setAttribute('transform', `rotate(${m * 6} 200 200)`);
      $('#idle [data-hand="s"]').setAttribute('transform', `rotate(${s * 6} 200 200)`);
    }
    if (n.getMinutes() !== lastMinute) {
      const first = lastMinute === -1;
      lastMinute = n.getMinutes();
      if (!first) {
        renderTop();
        renderHome();
        renderModes();
        if (idleOn) { const night = isNight(); if (night !== $('#idle').classList.contains('night') || (n.getHours() === 0 && n.getMinutes() === 0)) renderIdle(); }
      }
    }
  }

  // ============================================================ rendering
  let renderQueued = false;
  let dragging = false;
  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; renderAll(); });
  }
  const LIVE_APPS = ['home', 'cal', 'tasks', 'music', 'security', 'energy', 'board', 'packages', 'kitchen'];
  function renderAll() {
    renderTop();
    renderModes();
    renderDock();
    renderHome();
    if (APP.name && LIVE_APPS.includes(APP.name) && !dragging) renderApp();
    if (idleOn && FACES[faceIdx] === 'glance') { const r = $('#idle .rows'); if (r) r.innerHTML = glanceRows(); }
  }
  function refreshCameraImages() {
    $$('img[data-cam]').forEach((img) => { const src = cameraSrc(img.dataset.cam); if (src) img.src = src; });
  }

  // ============================================================== actions
  let armed = null;
  const isArmed = (id) => !!(armed && armed.id === id && Date.now() < armed.until);
  function arm(id) {
    armed = { id, until: Date.now() + 4000 };
    scheduleRender();
    setTimeout(() => { if (armed && armed.id === id && Date.now() >= armed.until) { armed = null; scheduleRender(); } }, 4100);
  }

  async function tapEntity(id) {
    const s = H.states[id];
    if (!s) return;
    const d = domainOf(id);
    const wasArmed = isArmed(id);
    switch (d) {
      case 'light': case 'switch': case 'fan': case 'input_boolean': await call(d, 'toggle', id); break;
      case 'lock':
        if (s.state === 'locked') {
          if (!wasArmed) { arm(id); break; }
          armed = null;
          if (!privateOK() && S.pin && !(await askPin('Enter PIN to unlock'))) break;
          await call('lock', 'unlock', id);
        } else { armed = null; await call('lock', 'lock', id); }
        break;
      case 'cover': {
        const open = s.state === 'open' || s.state === 'opening';
        if (!wasArmed) { arm(id); break; }
        armed = null;
        if (!open && !privateOK() && S.pin && !(await askPin('Enter PIN to open'))) break;
        await call('cover', open ? 'close_cover' : 'open_cover', id);
        break;
      }
      case 'scene': case 'script': if (await call(d, 'turn_on', id)) toast(`${entityName(id)} is on`); break;
      case 'media_player': await call('media_player', 'media_play_pause', id); break;
      case 'camera': openApp('security'); break;
      default: break;
    }
    scheduleRender();
  }

  function addIngredients(list) {
    const have = new Set(items('groceries').filter((i) => !i.done).map((i) => i.text.toLowerCase()));
    const fresh = Array.from(new Set(list.map((x) => x.trim()).filter((x) => x && !have.has(x.toLowerCase()))));
    fresh.forEach((x) => addTask('groceries', x, '', ''));
    toast(fresh.length ? `Added ${plural(fresh.length, 'item')} to Groceries` : 'Those are already on the list.');
  }

  function readForm(form) {
    const kind = form.dataset.form;
    if (kind === 'task') {
      const text = $('#task-text').value;
      if (!text.trim()) { toast('Type something to add first.'); return; }
      const parts = APP.ttab === 'groceries' ? text.split(/\s*,\s*/).filter(Boolean).map(cap) : [text];
      parts.forEach((p) => addTask(APP.ttab, p, $('#task-who')?.value || '', $('#task-due')?.value || ''));
      $('#task-text').value = '';
      if ($('#task-due')) $('#task-due').value = '';
      $('#task-text').focus();
    } else if (kind === 'note') {
      const text = $('#note-text').value;
      if (!text.trim()) { toast('Write a note first.'); return; }
      addTask('board', text, $('#note-who').value, '');
      $('#note-text').value = '';
    } else if (kind === 'pkg') {
      const label = $('#pkg-label').value.trim(), number = $('#pkg-number').value.trim();
      if (!number) { toast('Add the tracking number.'); return; }
      const carrier = carrierOf(number);
      PKGS = PKGS.filter((p) => !p.sample);
      PKGS.push({ id: uid(), label: label || 'Package', number, carrier, expected: $('#pkg-exp').value || '', delivered: false });
      savePkgs();
      $('#pkg-label').value = ''; $('#pkg-number').value = ''; $('#pkg-exp').value = '';
      renderAll();
      toast(carrier ? `Added. Looks like ${carrier}.` : 'Added. Carrier not recognized, so Track opens a web search.');
    } else if (kind === 'timer') {
      const m = parseFloat($('#t-min')?.value);
      if (!(m > 0)) { toast('Enter the number of minutes first.'); return; }
      addTimer(Math.round(m * 60), ($('#t-label')?.value || '').trim());
    } else if (kind === 'ask') {
      const inp = $('#ask-input');
      const v = inp.value;
      inp.value = '';
      assist(v);
    }
  }

  const actions = {
    open: (el) => {
      if (!$('#hazard').hidden) stopHazard();
      if (!$('#bell').hidden) $('#bell').hidden = true;
      openApp(el.dataset.app, { ktab: el.dataset.ktab, ttab: el.dataset.tab, stab: el.dataset.stab });
    },
    close: () => closeApp(),
    idle: () => enterIdle(),
    tile: (el) => tapEntity(el.dataset.entity),
    temp: (el) => {
      const id = el.dataset.entity, s = H.states[id];
      if (!s) return;
      const cur = s.attributes.temperature ?? 70;
      call('climate', 'set_temperature', id, { temperature: clamp(Math.round(cur + +el.dataset.step), s.attributes.min_temp ?? 45, s.attributes.max_temp ?? 90) });
    },
    fix: async (el) => {
      const id = el.dataset.entity;
      if (el.dataset.fix === 'lock') { await call('lock', 'lock', id); toast(`Locking ${entityName(id)}`); }
      else if (el.dataset.fix === 'close') { if (!isArmed(id)) { arm(id); return; } armed = null; await call('cover', 'close_cover', id); toast(`Closing ${entityName(id)}`); }
    },
    mode: (el) => runMode(el.dataset.mode),
    room: (el) => { APP.room = el.dataset.room; renderApp(); },
    profiles: () => {
      const pop = $('#pop');
      if (!pop.hidden) { pop.hidden = true; return; }
      pop.innerHTML = S.people.map((p) => `<button type="button" data-act="set-profile" data-id="${p.id}" aria-current="${p.id === S.profile}"><span class="avatar" style="--c:${p.color}">${esc(p.name.charAt(0).toUpperCase())}</span>${esc(p.name)}${p.showPrivate ? (S.pin && !privateOK() ? '<span class="sub">PIN</span>' : '') : '<span class="sub">Hides private info</span>'}</button>`).join('');
      pop.hidden = false;
    },
    'set-profile': async (el) => {
      const p = personById(el.dataset.id);
      $('#pop').hidden = true;
      if (!p || p.id === S.profile) return;
      if (p.showPrivate && !privateOK() && S.pin && !(await askPin(`Enter PIN for ${p.name}`))) return;
      S.profile = p.id;
      saveSettings();
      if (APP.name && !p.showPrivate && PRIVATE_APPS.concat('settings').includes(APP.name)) closeApp();
      renderAll();
      toast(p.showPrivate ? `Hi, ${p.name}` : 'Guest mode. Private information is hidden.');
    },
    'pin-key': (el) => pinKey(el.dataset.k),
    'pin-back': () => { if (pinState) { pinState.entered = pinState.entered.slice(0, -1); renderPin(); } },
    'pin-cancel': () => { if (pinState) { const r = pinState.resolve; pinState = null; $('#pin').hidden = true; r(false); } },
    'pin-save': () => {
      const v = ($('#s-pin')?.value || '').trim();
      if (!/^\d{4,8}$/.test(v)) { toast('Use 4 to 8 digits.'); return; }
      S.pin = v; saveSettings(); renderApp(); toast('PIN saved');
    },
    'pin-clear': () => { S.pin = ''; saveSettings(); renderApp(); toast('PIN removed'); },
    timer: (el) => addTimer(+el.dataset.sec, el.dataset.label || ''),
    'timer-plus': (el) => { const t = timers.find((x) => x.id === el.dataset.id); if (t) { t.end += 60000; saveTimers(); renderAll(); } },
    'timer-cancel': (el) => cancelTimer(el.dataset.id),
    'stop-ring': () => stopRing(false),
    'bell-close': () => { $('#bell').hidden = true; $('#bell').innerHTML = ''; clearTimeout(bellTimer); },
    'hazard-close': () => stopHazard(),
    'hazard-info': () => { stopHazard(); openApp('emergency'); },
    'test-bell': () => ringDoorbell(S.doorbellEntity || idsOf('binary_sensor', 'event').find((id) => /doorbell/i.test(id)) || ''),
    'test-hazard': () => {
      const id = idsOf('binary_sensor').find((x) => H.states[x].attributes.device_class === 'smoke');
      if (id) { hazardAlert(id); return; }
      H.states['binary_sensor._test_smoke'] = { entity_id: 'binary_sensor._test_smoke', state: 'off', attributes: { friendly_name: 'Test alert', device_class: 'smoke' } };
      hazardAlert('binary_sensor._test_smoke');
      delete H.states['binary_sensor._test_smoke'];
    },
    'task-tab': (el) => { APP.ttab = el.dataset.tab; renderApp(); },
    'task-toggle': (el) => toggleTask(el.dataset.kind, el.dataset.id),
    'task-del': (el) => removeTask(el.dataset.kind, el.dataset.id),
    'task-clear': (el) => clearDone(el.dataset.kind),
    'cal-view': (el) => { APP.calView = el.dataset.view; APP.calOffset = 0; renderApp(); },
    'cal-move': (el) => { const d = +el.dataset.dir; APP.calOffset = d === 0 ? 0 : APP.calOffset + d; renderApp(); },
    'cal-person': (el) => { const id = el.dataset.id; if (APP.calHide.has(id)) APP.calHide.delete(id); else APP.calHide.add(id); renderApp(); },
    'k-tab': (el) => { APP.ktab = el.dataset.tab; renderApp(); },
    'recipe-add': () => { APP.adding = true; APP.recipeId = null; renderApp(); setTimeout(() => $('#r-text')?.focus(), 50); },
    'recipe-save': () => {
      const text = $('#r-text')?.value || '';
      if (!text.trim()) { toast('Paste a recipe first.'); return; }
      const r = parseRecipe(($('#r-title')?.value || '').trim(), text);
      recipes.unshift(r);
      saveRecipes();
      APP.adding = false; APP.recipeId = r.id; APP.step = 0; APP.checked = new Set();
      renderApp();
      toast(`Saved ${r.title}`);
    },
    'recipe-open': async (el) => {
      const id = el.dataset.id;
      if (APP.name !== 'kitchen') await openApp('kitchen');
      APP.recipeId = id; APP.adding = false; APP.step = 0; APP.checked = new Set(); APP.confirm = null;
      renderApp();
      keepAwake();
    },
    'recipe-del': (el) => {
      const id = el.dataset.id;
      if (APP.confirm !== 'del-' + id) { APP.confirm = 'del-' + id; renderApp(); return; }
      recipes = recipes.filter((r) => r.id !== id);
      saveRecipes();
      APP.recipeId = null; APP.confirm = null;
      renderApp();
      toast('Recipe deleted');
    },
    'recipe-groceries': (el) => { const r = recipes.find((x) => x.id === el.dataset.id); if (r) addIngredients(r.ingredients); },
    'meal-groceries': () => {
      const all = [];
      for (let i = 0; i < 7; i++) { const m = MEALS[isoDay(i)]; const r = m && recipes.find((x) => x.id === m.recipe); if (r) all.push(...r.ingredients); }
      if (!all.length) { toast('Pick recipes for this week first.'); return; }
      addIngredients(all);
    },
    'chef-back': () => { APP.adding = false; APP.recipeId = null; APP.confirm = null; APP.ktab = 'recipes'; renderApp(); },
    step: (el) => { APP.step += +el.dataset.dir; renderApp(); },
    media: (el) => call('media_player', { play: 'media_play_pause', next: 'media_next_track', prev: 'media_previous_track' }[el.dataset.cmd], el.dataset.entity),
    'photo-sel': (el) => { const id = el.dataset.id; if (selectedPhotos.has(id)) selectedPhotos.delete(id); else selectedPhotos.add(id); APP.confirm = null; renderApp(); },
    'photo-del': async () => {
      if (APP.confirm !== 'photos') { APP.confirm = 'photos'; renderApp(); return; }
      const n = selectedPhotos.size;
      try { for (const id of selectedPhotos) await DB.del(id); } catch (e) { toast('Couldn’t delete those photos.'); }
      selectedPhotos.clear(); APP.confirm = null;
      await loadPhotos();
      renderApp();
      toast(`Deleted ${plural(n, 'photo')}`);
    },
    'pkg-done': (el) => { const p = PKGS.find((x) => x.id === el.dataset.id); if (p) { p.delivered = !p.delivered; savePkgs(); renderAll(); } },
    'pkg-del': (el) => { PKGS = PKGS.filter((x) => x.id !== el.dataset.id); savePkgs(); renderAll(); },
    'em-edit': () => { if (!privateOK()) return; APP.emEdit = !APP.emEdit; renderApp(); },
    'emc-add': () => { EMERG.contacts.push({ id: uid(), name: '', phone: '' }); saveEmerg(); renderApp(); },
    'emc-del': (el) => { EMERG.contacts = EMERG.contacts.filter((c) => c.id !== el.dataset.id); saveEmerg(); renderApp(); },
    'smoke-tested': () => { EMERG.smokeTested = isoDay(0); saveEmerg(); renderAll(); if (APP.name === 'emergency') renderApp(); toast('Smoke alarm test logged. The next one is due in a month.'); },
    'ask-example': (el) => assist(el.dataset.q),
    mic: () => { ensureAudio(); listen(); },
    's-tab': (el) => { APP.stab = el.dataset.tab; APP.confirm = null; renderApp(); },
    'layout-key': (el) => { APP.layoutKey = el.dataset.key; renderApp(); },
    'layout-move': (el) => { const l = S.layout[APP.layoutKey], i = +el.dataset.i, j = i + +el.dataset.dir; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; saveSettings(); renderApp(); renderHome(); },
    'layout-del': (el) => { S.layout[APP.layoutKey].splice(+el.dataset.i, 1); saveSettings(); renderApp(); renderHome(); },
    'layout-add': () => { const v = $('#layout-add')?.value; if (v && WIDGET_INFO[v]) { S.layout[APP.layoutKey].push(v); saveSettings(); renderApp(); renderHome(); toast(`${WIDGET_INFO[v][0]} added`); } },
    'layout-reset': () => { S.layout[APP.layoutKey] = clone(DEFAULT_LAYOUT[APP.layoutKey]); saveSettings(); renderApp(); renderHome(); },
    'mode-edit': (el) => { APP.modeEdit = el.dataset.mode; renderApp(); },
    'mode-reset': (el) => { S.modes[el.dataset.mode] = clone(DEFAULT_MODES[el.dataset.mode]); saveSettings(); renderApp(); },
    'person-add': () => {
      const used = new Set(S.people.map((p) => p.color));
      const color = (PALETTE.find(([c]) => !used.has(c)) || PALETTE[0])[0];
      const guestIdx = S.people.findIndex((p) => p.fixed);
      S.people.splice(guestIdx < 0 ? S.people.length : guestIdx, 0, { id: 'p' + uid(), name: 'New person', color, showPrivate: true });
      saveSettings(); renderAll(); renderApp();
    },
    'person-del': (el) => {
      const id = el.dataset.id;
      S.people = S.people.filter((p) => p.id !== id);
      if (S.profile === id) S.profile = members()[0]?.id || S.people[0].id;
      saveSettings(); renderAll(); renderApp();
    },
    'ha-connect': () => {
      S.haUrl = ($('#ha-url')?.value || '').trim();
      S.haToken = ($('#ha-token')?.value || '').trim();
      saveSettings();
      if (!S.haUrl || !S.haToken) { toast('Enter both the address and the token.'); return; }
      haConnect();
    },
    'ha-disconnect': () => { S.haUrl = ''; S.haToken = ''; saveSettings(); haConnect(); renderApp(); toast('Disconnected. Showing sample devices.'); },
    'feed-save': () => { S.feedUrl = ($('#feed-url')?.value || '').trim(); saveSettings(); loadFeed(); toast(S.feedUrl ? 'Refreshing the feed…' : 'Feed removed. Showing sample data.'); },
    reset: () => {
      if (APP.confirm !== 'reset') { APP.confirm = 'reset'; renderApp(); return; }
      store.clear();
      try { indexedDB.deleteDatabase('bauder-home'); } catch (e) { /* ignore */ }
      location.reload();
    },
  };

  // The tap that wakes the clock face must not also press what's under it.
  document.addEventListener('click', (e) => {
    if (Date.now() < suppressClickUntil) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  document.addEventListener('click', (e) => {
    ensureAudio();
    if (!e.target.closest('#pop') && !e.target.closest('[data-act="profiles"]')) $('#pop').hidden = true;
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });

  document.addEventListener('submit', (e) => {
    const f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    readForm(f);
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    const d = t.dataset;
    if (d.bright) { dragging = false; call('light', 'turn_on', d.bright, { brightness_pct: +t.value }); return; }
    if (d.vol) { dragging = false; call('media_player', 'volume_set', d.vol, { volume_level: +t.value / 100 }); return; }
    if (d.source) { call('media_player', 'select_source', d.source, { source: t.value }); return; }
    if (t.id === 'photo-input') { addPhotos(t.files); t.value = ''; return; }
    if (d.ing != null) { const k = +d.ing; if (t.checked) APP.checked.add(k); else APP.checked.delete(k); return; }
    if (d.fav) {
      const id = d.fav;
      const next = t.checked ? Array.from(new Set([...S.favorites, id])) : S.favorites.filter((x) => x !== id);
      if (next.length > 6) { t.checked = false; toast('Pick up to 6 favorites.'); return; }
      S.favorites = next; saveSettings(); renderHome(); return;
    }
    if (d.cal) { const id = d.cal; S.calendars = t.checked ? Array.from(new Set([...S.calendars, id])) : S.calendars.filter((x) => x !== id); saveSettings(); refreshCalendar(); return; }
    if (d.calOwner) { S.calendarOwners[d.calOwner.replace(/^owner-/, '')] = t.value; saveSettings(); renderAll(); return; }
    if (d.todo) { S.todo[d.todo] = t.value; saveSettings(); if (t.value) loadTodo(t.value); renderAll(); return; }
    if (d.energy) { S.energy[d.energy.split('.')[1]] = t.value; saveSettings(); EN.at = {}; loadPowerHistory(powerEntity()); renderAll(); return; }
    if (d.arrival) { S.arrivals[d.arrival.replace(/^arr-/, '')] = t.value; saveSettings(); return; }
    if (d.personName) { const p = personById(d.personName); if (p) { p.name = t.value.trim() || p.name; saveSettings(); renderAll(); } return; }
    if (d.personColor) { const p = personById(d.personColor); if (p) { p.color = t.value; saveSettings(); renderAll(); renderApp(); } return; }
    if (d.personPrivate) { const p = personById(d.personPrivate); if (p) { p.showPrivate = t.checked; saveSettings(); renderAll(); } return; }
    if (d.modeRule) {
      const [mid, field, ...rest] = d.modeRule.split('|');
      const rule = rest.join('|');
      const arr = S.modes[mid][field];
      S.modes[mid][field] = t.checked ? Array.from(new Set([...arr, rule])) : arr.filter((x) => x !== rule);
      saveSettings(); renderApp(); return;
    }
    if (d.modeFlag) { const [mid, f] = d.modeFlag.split('|'); S.modes[mid][f] = t.checked; saveSettings(); renderApp(); return; }
    if (d.modeTemp) { const v = t.value.trim(); S.modes[d.modeTemp].temp = v === '' ? '' : clamp(+v, 45, 90); saveSettings(); renderApp(); return; }
    if (d.modeAfter) { S.modes[d.modeAfter].after = t.value; saveSettings(); renderApp(); return; }
    if (d.mealText) { MEALS[d.mealText] = { ...(MEALS[d.mealText] || {}), text: t.value.trim() }; MEALS._sample = false; saveMeals(); renderAll(); return; }
    if (d.mealRecipe) { MEALS[d.mealRecipe] = { ...(MEALS[d.mealRecipe] || {}), recipe: t.value }; MEALS._sample = false; saveMeals(); renderAll(); return; }
    if (d.em) { EMERG[d.em] = t.value; saveEmerg(); renderHome(); return; }
    if (d.emc) { const c = EMERG.contacts.find((x) => x.id === d.emc); if (c) { c[d.f] = t.value.trim(); saveEmerg(); } return; }
    if (d.set) {
      const k = d.set;
      let v = t.type === 'checkbox' ? t.checked : t.value;
      if (['lat', 'lon', 'idleAfter', 'nightStart', 'nightEnd'].includes(k)) v = parseFloat(v);
      if ((k === 'lat' || k === 'lon') && !Number.isFinite(v)) return;
      S[k] = v;
      saveSettings();
      if (k === 'theme') applyTheme();
      if (['lat', 'lon', 'place', 'weatherEntity'].includes(k)) loadWeather();
      if (k === 'face') faceIdx = Math.max(0, FACES.indexOf(v));
      renderAll();
    }
  });
  document.addEventListener('input', (e) => { if (e.target.dataset.bright || e.target.dataset.vol) dragging = true; });

  // Idle overlay: tap to wake, swipe to change faces.
  let swipeX = null;
  document.addEventListener('pointerdown', (e) => {
    lastTouch = Date.now();
    ensureAudio();
    keepAwake();
    if (idleOn && $('#idle').contains(e.target)) swipeX = e.clientX;
  }, true);
  document.addEventListener('pointerup', (e) => {
    if (!idleOn || swipeX == null) return;
    const dx = e.clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 60) { faceIdx = (faceIdx + (dx < 0 ? 1 : -1) + FACES.length) % FACES.length; renderIdle(); }
    else exitIdle();
    e.preventDefault();
  }, true);
  document.addEventListener('keydown', (e) => {
    lastTouch = Date.now();
    if (idleOn) { exitIdle(); return; }
    if (e.key === 'Escape') {
      if (!$('#pin').hidden) actions['pin-cancel']();
      else if (!$('#pop').hidden) $('#pop').hidden = true;
      else if (APP.name) closeApp();
    }
  });
  document.addEventListener('scroll', () => { lastTouch = Date.now(); }, true);

  let wakeLock = null;
  async function keepAwake() {
    try {
      if ('wakeLock' in navigator && !wakeLock && document.visibilityState === 'visible') {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } catch (e) { wakeLock = null; }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    keepAwake();
    if ((H.status === 'retrying' || H.status === 'error') && S.haUrl && S.haToken && !H.noRetry) haConnect();
    loadWeather();
    loadFeed();
  });

  // ================================================================== init
  function init() {
    applyTheme();
    useDemo();
    CAL.events = demoEvents();
    const wc = store.get('wxCache', null);
    if (wc) { WX.now = wc.now; WX.daily = (wc.daily || []).map((d) => ({ ...d, date: new Date(d.date) })); WX.place = wc.place; }
    loadPowerHistory(powerEntity());
    renderAll();
    sizeGrid();
    window.addEventListener('resize', sizeGrid);
    window.addEventListener('orientationchange', () => setTimeout(sizeGrid, 300));
    haConnect();
    loadWeather();
    loadFeed();
    loadPhotos();

    setInterval(() => {
      updateClocks();
      tickTimers();
      if (!idleOn && +S.idleAfter > 0 && Date.now() - lastTouch > S.idleAfter * 1000 && !blockIdle()) enterIdle();
    }, 1000);
    setInterval(refreshCameraImages, 5000);
    setInterval(loadWeather, 30 * 60000);
    setInterval(() => { if (H.live) { refreshCalendar(); loadAllTodo(); } }, 10 * 60000);
    setInterval(loadFeed, 5 * 60000);
    setInterval(() => { const pe = powerEntity(); if (pe) loadPowerHistory(pe); }, 10 * 60000);

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
    }
  }

  init();
})();
