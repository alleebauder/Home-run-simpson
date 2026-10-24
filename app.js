/* Bauder Home: app.js
   Plain JavaScript, no build step.
   The iPad keeps everything locally: settings, timers and recipes in
   localStorage, photos in IndexedDB. Nothing is sent anywhere except to the
   Home Assistant address, weather service and Bauder HQ feed you configure. */
(() => {
  'use strict';

  // ---------------------------------------------------------------- helpers
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const cap = (s) => { s = String(s ?? '').replace(/_/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const store = {
    get(k, d) { try { const v = localStorage.getItem('bh.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('bh.' + k, JSON.stringify(v)); } catch (e) { /* full or blocked */ } },
    clear() { try { Object.keys(localStorage).filter((k) => k.startsWith('bh.')).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* blocked */ } },
  };

  // ------------------------------------------------------------------ icons
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
    gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/>',
    door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M4 21h16M14 12h.01"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    pot: '<path d="M4 11h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M2 11h20M9 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M10 2h4"/>',
    photo: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
    clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11l2 2 4-4M9 17h6"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 11 3.5 3.5 0 0 0 7 18z"/>',
    partly: '<path d="M8 3v1.5M3.5 8H5M4.8 4.8l1 1M11.2 4.8l-1 1"/><path d="M5.6 10.5A3 3 0 1 1 11 7.5"/><path d="M9 20h8a3.5 3.5 0 0 0 .5-7A5 5 0 0 0 8 13.5 3.3 3.3 0 0 0 9 20z"/>',
    rain: '<path d="M7 15h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 8 3.5 3.5 0 0 0 7 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
    snow: '<path d="M7 15h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 8 3.5 3.5 0 0 0 7 15z"/><path d="M8 19h.01M12 21h.01M16 19h.01M10 21.5h.01M14 18.5h.01"/>',
    fog: '<path d="M4 9h16M3 13h18M5 17h14"/>',
    storm: '<path d="M7 15h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 8 3.5 3.5 0 0 0 7 15z"/><path d="M12 14l-2 4h4l-2 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  };
  const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n] || ICON.gauge}</svg>`;

  // --------------------------------------------------------------- settings
  const DEFAULTS = {
    haUrl: '',
    haToken: '',
    favorites: [],
    calendars: [],
    mainCamera: '',
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
    theme: 'auto',
    profiles: [
      { id: 'p1', name: 'Lee', showPrivate: true },
      { id: 'p2', name: 'Family', showPrivate: true },
      { id: 'guest', name: 'Guest', showPrivate: false, fixed: true },
    ],
    profile: 'p1',
  };
  const S = Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), store.get('settings', {}));
  const saveSettings = () => store.set('settings', S);
  const curProfile = () => S.profiles.find((p) => p.id === S.profile) || S.profiles[0];
  const privateOK = () => !!curProfile().showPrivate;

  function applyTheme() {
    const r = document.documentElement;
    if (S.theme === 'light' || S.theme === 'dark') r.setAttribute('data-theme', S.theme);
    else r.removeAttribute('data-theme');
  }

  // ------------------------------------------------------------ time helpers
  function fmtTime(d) { let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return { hm: `${h}:${pad(d.getMinutes())}`, ap }; }
  const fmtDate = (d) => d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const fmtClock = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  function parseDay(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
  }
  function relDay(d) {
    const diff = Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff > 1 && diff < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  const isoDay = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
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

  let toastT;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // ----------------------------------------------------------- sample data
  // Shown until Home Assistant / the Bauder HQ feed are connected. Every
  // widget showing these carries a "Sample" tag.
  function demoStates() {
    const now = new Date().toISOString();
    const mk = (entity_id, state, attributes) => ({ entity_id, state, attributes, last_changed: now });
    return [
      mk('light.kitchen', 'on', { friendly_name: 'Kitchen', brightness: 204, supported_color_modes: ['brightness'] }),
      mk('light.living_room', 'off', { friendly_name: 'Living Room', supported_color_modes: ['brightness'] }),
      mk('light.porch', 'on', { friendly_name: 'Porch', supported_color_modes: ['onoff'] }),
      mk('switch.coffee_maker', 'off', { friendly_name: 'Coffee Maker' }),
      mk('lock.front_door', 'locked', { friendly_name: 'Front Door' }),
      mk('cover.garage_door', 'closed', { friendly_name: 'Garage Door', device_class: 'garage' }),
      mk('climate.thermostat', 'heat', { friendly_name: 'Thermostat', current_temperature: 68, temperature: 70, min_temp: 50, max_temp: 85, hvac_action: 'heating' }),
      mk('scene.good_night', now, { friendly_name: 'Good Night' }),
      mk('scene.movie_time', now, { friendly_name: 'Movie Time' }),
      mk('media_player.living_room', 'paused', { friendly_name: 'Living Room Speaker', media_title: 'Morning Playlist' }),
      mk('camera.front_porch', 'idle', { friendly_name: 'Front Porch' }),
      mk('camera.driveway', 'idle', { friendly_name: 'Driveway' }),
      mk('binary_sensor.back_door', 'off', { friendly_name: 'Back Door', device_class: 'door' }),
      mk('sensor.garage_temperature', '54', { friendly_name: 'Garage Temperature', unit_of_measurement: '°F', device_class: 'temperature' }),
    ];
  }
  const DEMO_AREAS = { kitchen: 'Kitchen', living: 'Living Room', entry: 'Entry', garage: 'Garage', outside: 'Outside' };
  const DEMO_ENTITY_AREA = {
    'light.kitchen': 'kitchen', 'switch.coffee_maker': 'kitchen',
    'light.living_room': 'living', 'media_player.living_room': 'living', 'climate.thermostat': 'living',
    'lock.front_door': 'entry', 'binary_sensor.back_door': 'entry',
    'cover.garage_door': 'garage', 'sensor.garage_temperature': 'garage',
    'light.porch': 'outside', 'camera.front_porch': 'outside', 'camera.driveway': 'outside',
  };
  const DEMO_FAVS = ['light.kitchen', 'light.living_room', 'lock.front_door', 'climate.thermostat', 'cover.garage_door', 'scene.good_night'];

  function demoEvents() {
    const at = (offset, h, m, durMin) => { const s = new Date(); s.setDate(s.getDate() + offset); s.setHours(h, m, 0, 0); return { start: s, end: new Date(s.getTime() + durMin * 60000) }; };
    return [
      { title: 'Dinner with friends', ...at(0, 18, 30, 120), cal: 'calendar.family', location: '' },
      { title: 'Plan review meeting', ...at(1, 9, 0, 60), cal: 'calendar.work', location: 'Station 1' },
      { title: 'Trash and recycling pickup', ...at(1, 7, 0, 30), cal: 'calendar.family', location: '' },
      { title: 'Small group', ...at(2, 18, 30, 90), cal: 'calendar.family', location: '' },
      { title: 'Site walk', ...at(3, 10, 0, 60), cal: 'calendar.work', location: '' },
    ].sort((a, b) => a.start - b.start);
  }

  function sampleFeed() {
    return {
      airbnb: [
        { listing: 'Wall St', type: 'check-in', date: isoDay(0), time: '4:00 PM' },
        { listing: 'Broadway', type: 'check-out', date: isoDay(1), time: '11:00 AM' },
        { listing: 'Broadway', type: 'check-in', date: isoDay(1), time: '4:00 PM' },
        { listing: 'Wall St', type: 'check-out', date: isoDay(3), time: '11:00 AM' },
      ],
      inspections: {
        completed: 186,
        goal: 300,
        scheduled: [
          { date: isoDay(1), time: '9:30 AM', name: 'Annual inspection' },
          { date: isoDay(2), time: '1:00 PM', name: 'Re-inspection' },
        ],
      },
      ev: [
        { site: 'Site A', status: 'Permit approved' },
        { site: 'Site B', status: 'In plan review' },
        { site: 'Site C', status: 'Utility design' },
      ],
    };
  }

  const SAMPLE_RECIPE = {
    id: 'sample-cornbread',
    title: 'Cast-Iron Skillet Cornbread',
    sample: true,
    ingredients: [
      '1 cup yellow cornmeal',
      '1 cup all-purpose flour',
      '1/4 cup sugar',
      '1 tbsp baking powder',
      '1 tsp salt',
      '1 cup buttermilk',
      '2 large eggs',
      '7 tbsp butter, melted (1 tbsp for the skillet)',
    ],
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

  // ------------------------------------------------------- Home Assistant
  const H = {
    live: false,           // true once real Home Assistant states have loaded
    status: 'sample',      // sample | connecting | connected | retrying | error
    message: '',
    states: {},
    areas: {},
    entityArea: {},
    hidden: new Set(),
    ws: null,
    nextId: 1,
    pending: new Map(),
    retryTimer: null,
    noRetry: false,
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

  function haBase() { return (S.haUrl || '').trim().replace(/\/+$/, ''); }

  function haClose() {
    clearTimeout(H.retryTimer);
    if (H.ws) { const ws = H.ws; H.ws = null; try { ws.close(); } catch (e) { /* already closed */ } }
    H.pending.forEach((p) => p.reject(new Error('closed')));
    H.pending.clear();
  }

  function haConnect() {
    haClose();
    const base = haBase();
    const token = (S.haToken || '').trim();
    if (!base || !token) { useDemo(); setHA('sample'); renderAll(); return; }
    let u;
    try { u = new URL(base); } catch (e) {
      useDemo(); setHA('error', 'That address isn’t a full web address. Start it with http:// or https://.'); renderAll(); return;
    }
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
    } else if (m.type === 'event' && m.event && m.event.event_type === 'state_changed') {
      const d = m.event.data;
      if (d.new_state) H.states[d.entity_id] = d.new_state; else delete H.states[d.entity_id];
      scheduleRender();
    }
  }

  function haSend(msg) {
    return new Promise((resolve, reject) => {
      if (!H.ws || H.ws.readyState !== 1) { reject(new Error('offline')); return; }
      const id = H.nextId++;
      H.pending.set(id, { resolve, reject });
      H.ws.send(JSON.stringify({ id, ...msg }));
      setTimeout(() => { if (H.pending.has(id)) { H.pending.delete(id); reject(new Error('timeout')); } }, 15000);
    });
  }

  async function haReady() {
    try {
      await haSend({ type: 'subscribe_events', event_type: 'state_changed' });
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
    } catch (e) {
      setHA('error', 'Connected, but Home Assistant didn’t send your devices. Try Connect again.');
    }
  }

  async function loadRegistry() {
    // Rooms come from Home Assistant areas. These calls need an admin user's
    // token; without one, devices simply show ungrouped.
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
    const flip = (a, b) => { s.state = s.state === a ? b : a; };
    if (service === 'toggle') { flip('on', 'off'); if (domain === 'light' && s.state === 'on' && !s.attributes.brightness && s.attributes.supported_color_modes?.[0] !== 'onoff') s.attributes.brightness = 255; }
    else if (service === 'turn_on' && domain === 'light') { s.state = 'on'; if (data.brightness_pct) s.attributes.brightness = Math.round(data.brightness_pct * 2.55); }
    else if (domain === 'lock') s.state = service === 'unlock' ? 'unlocked' : 'locked';
    else if (domain === 'cover') s.state = service === 'open_cover' ? 'open' : 'closed';
    else if (domain === 'climate' && service === 'set_temperature') s.attributes.temperature = data.temperature;
    else if (domain === 'media_player') flip('playing', 'paused');
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
  const domainOf = (id) => id.split('.')[0];
  const listable = (id) => SUPPORTED.includes(domainOf(id)) && !H.hidden.has(id);

  function favoriteIds() {
    const chosen = S.favorites.filter((id) => H.states[id]);
    if (chosen.length) return chosen;
    if (!H.live) return DEMO_FAVS.filter((id) => H.states[id]);
    const order = ['light', 'lock', 'climate', 'cover', 'switch', 'scene', 'media_player', 'fan', 'input_boolean'];
    const ids = Object.keys(H.states).filter((id) => order.includes(domainOf(id)) && !H.hidden.has(id));
    ids.sort((a, b) => order.indexOf(domainOf(a)) - order.indexOf(domainOf(b)));
    return ids.slice(0, 6);
  }

  function cameraIds() { return Object.keys(H.states).filter((id) => domainOf(id) === 'camera' && !H.hidden.has(id)); }

  function cameraSrc(id) {
    const pic = H.states[id]?.attributes?.entity_picture;
    if (!H.live || !pic) return '';
    return haBase() + pic + (pic.includes('?') ? '&' : '?') + '_=' + Date.now();
  }

  // ---------------------------------------------------------------- weather
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

  // --------------------------------------------------------------- calendar
  const CAL = { events: [], sample: true, note: '' };

  async function refreshCalendar() {
    if (!H.live) { CAL.events = demoEvents(); CAL.sample = true; CAL.note = ''; scheduleRender(); return; }
    CAL.sample = false;
    const all = Object.keys(H.states).filter((id) => domainOf(id) === 'calendar');
    const cals = S.calendars.length ? S.calendars.filter((id) => all.includes(id)) : all;
    if (!cals.length) { CAL.events = []; CAL.note = 'No calendars in Home Assistant yet. Add Google Calendar or CalDAV there and they appear here.'; scheduleRender(); return; }
    try {
      const r = await haSend({ type: 'call_service', domain: 'calendar', service: 'get_events', target: { entity_id: cals }, service_data: { duration: { days: 14 } }, return_response: true });
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
  const calIndex = (cal) => { const all = Array.from(new Set(CAL.events.map((e) => e.cal))); return all.indexOf(cal) % 2; };
  const upcoming = () => { const now = new Date(); return CAL.events.filter((e) => e.end > now); };

  // ---------------------------------------------------- Bauder HQ data feed
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
      FEED.sample = false;
      FEED.note = '';
      FEED.updated = Date.now();
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

  // ----------------------------------------------------------------- timers
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
  function beep() {
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime;
    [0, 0.22, 0.44].forEach((dt) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.18);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0 + dt); o.stop(t0 + dt + 0.2);
    });
  }

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
    timers.forEach((t) => {
      if (!t.done && now >= t.end) { t.done = true; saveTimers(); startRing(t); }
    });
    $$('[data-left]').forEach((el) => { const t = timers.find((x) => x.id === el.dataset.left); if (t) el.textContent = t.done ? 'Done' : fmtLeft(t.end - now); });
    const pill = $('#timer-pill-text');
    if (pill) { const t = nextTimer(); pill.textContent = t ? fmtLeft(t.end - now) : ''; }
  }
  const nextTimer = () => timers.filter((t) => !t.done).sort((a, b) => a.end - b.end)[0];

  function startRing(t) {
    if (idleOn) exitIdle();
    ringing = { id: t.id, started: Date.now(), iv: setInterval(() => { if (Date.now() - ringing.started > 60000) stopRing(true); else beep(); }, 1200) };
    beep();
    const el = $('#alarm');
    el.innerHTML = `<div class="box" role="alertdialog" aria-labelledby="alarm-t"><div>${icon('timer')}</div><div class="t" id="alarm-t">${esc(t.label)}</div><div>Time’s up.</div><button type="button" data-act="stop-ring">Stop</button></div>`;
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

  // ---------------------------------------------------------------- recipes
  let recipes = store.get('recipes', null) || [SAMPLE_RECIPE];
  const saveRecipes = () => store.set('recipes', recipes);

  function parseRecipe(title, text) {
    let lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
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

  // ----------------------------------------------------------------- photos
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
    toast(`Adding ${list.length} photo${list.length > 1 ? 's' : ''}…`);
    try {
      for (const f of list) await DB.put({ id: uid(), blob: await downscale(f, 2048), added: Date.now() });
      await loadPhotos();
      toast(`Added ${list.length} photo${list.length > 1 ? 's' : ''}`);
    } catch (e) { toast('Couldn’t save photos. The iPad may be low on storage.'); }
    if (APP.name === 'photos') renderApp();
  }

  // ------------------------------------------------------------ home widgets
  const sampleTag = (on) => (on ? '<span class="tag">Sample</span>' : '');

  function wTime() {
    const n = new Date(), t = fmtTime(n), w = WX.now, d0 = WX.daily[0];
    const wx = w
      ? `${icon(w.icon)}<div class="t num">${Math.round(w.temp)}°</div><div class="muted">${esc(w.text)}${d0 ? ` · H ${Math.round(d0.hi)}° L ${Math.round(d0.lo)}°` : ''}</div><div class="faint">${esc(WX.place)}</div>`
      : '<div class="muted">Weather unavailable</div><div class="faint">Check the internet connection</div>';
    return `<button type="button" class="w a-time timew" data-act="idle" aria-label="Show the clock face">
      <div><div class="clock num"><span data-clock="hm">${t.hm}</span><span class="ampm" data-clock="ap">${t.ap}</span></div>
      <div class="date" data-clock="date">${esc(fmtDate(n))}</div></div>
      <div class="wx">${wx}</div></button>`;
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
      case 'lock': {
        ic = s.state === 'locked' ? 'lock' : 'unlock';
        st = s.state === 'unlocked' ? '<span class="warnst">Unlocked</span>' : esc(cap(s.state));
        if (armed && armed.id === id) st = '<span class="warnst">Tap again to ' + (s.state === 'locked' ? 'unlock' : 'lock') + '</span>';
        break;
      }
      case 'cover': {
        on = s.state === 'open' || s.state === 'opening';
        ic = a.device_class === 'garage' ? 'garage' : 'blind';
        st = esc(cap(s.state));
        if (armed && armed.id === id) st = '<span class="warnst">Tap again to ' + (on ? 'close' : 'open') + '</span>';
        break;
      }
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
      case 'media_player': on = s.state === 'playing'; ic = 'play'; st = esc(on ? (a.media_title || 'Playing') : cap(s.state)); break;
      case 'camera': ic = 'camera'; st = 'View'; break;
      case 'binary_sensor': {
        on = s.state === 'on'; clickable = false;
        const dc = a.device_class || '';
        ic = /door|window|garage_door|opening/.test(dc) ? 'door' : 'gauge';
        st = /door|window|garage_door|opening/.test(dc) ? (on ? 'Open' : 'Closed') : dc === 'motion' || dc === 'occupancy' ? (on ? 'Detected' : 'Clear') : (on ? 'On' : 'Off');
        break;
      }
      case 'sensor': clickable = false; ic = a.device_class === 'temperature' ? 'thermo' : 'gauge'; st = esc(`${s.state}${a.unit_of_measurement ? ' ' + a.unit_of_measurement : ''}`); break;
      default: on = s.state === 'on';
    }
    if (unavail) { on = false; st = 'Not responding'; }
    const inner = `<span class="ic">${icon(ic)}</span><span class="n">${name}</span><span class="st">${st}</span>`;
    const main = clickable && !unavail
      ? `<button type="button" class="tile-main" data-act="tile" data-entity="${esc(id)}">${inner}</button>`
      : `<div class="tile-main">${inner}</div>`;
    return `<div class="tile${on ? ' on' : ''}${unavail ? ' unavail' : ''}${armed && armed.id === id ? ' arm' : ''}">${main}${extra}</div>`;
  }

  function wHome() {
    const favs = favoriteIds().slice(0, 6);
    const body = favs.length
      ? `<div class="tiles">${favs.map((id) => tileHTML(id, false)).join('')}</div>`
      : '<div class="empty">No devices yet. Add them in Home Assistant, then pick favorites in Settings.</div>';
    return `<section class="w a-home" aria-label="Home"><div class="w-head">${icon('home')}Home<span class="grow"></span>${sampleTag(!H.live)}<button type="button" class="w-link" data-act="open" data-app="home">All rooms</button></div>${body}</section>`;
  }

  function wNext() {
    const evs = upcoming().slice(0, 4);
    let body = '';
    if (CAL.note) body = `<div class="muted">${esc(CAL.note)}</div>`;
    else if (!evs.length) body = '<div class="muted">Nothing on the calendar for the next two weeks.</div>';
    else {
      let last = '';
      body = evs.map((e) => {
        const day = relDay(e.start);
        const lbl = day !== last ? `<div class="day-label">${esc(day)}</div>` : '';
        last = day;
        const when = e.allDay ? 'All day' : `${fmtClock(e.start)} – ${fmtClock(e.end)}`;
        return `${lbl}<div class="event"><span class="bar${calIndex(e.cal) ? ' alt' : ''}"></span><div><div class="t">${esc(e.title)}</div><div class="s">${esc(when)}${e.location ? ' · ' + esc(e.location) : ''}</div></div></div>`;
      }).join('');
    }
    return `<button type="button" class="w a-next" data-act="open" data-app="cal"><div class="w-head">${icon('cal')}Up Next<span class="grow"></span>${sampleTag(CAL.sample)}</div><div class="w-body">${body}</div></button>`;
  }

  function camHTML(id) {
    const src = cameraSrc(id);
    const img = src ? `<img alt="" src="${esc(src)}" data-cam="${esc(id)}">` : '<div class="ph"></div>';
    return `<div class="cam">${img}<div class="lbl"><span class="live"></span>${esc(entityName(id))}${src ? '' : ' · Sample'}</div></div>`;
  }

  function wCam() {
    const ids = cameraIds();
    const id = ids.includes(S.mainCamera) ? S.mainCamera : ids[0];
    const body = id ? camHTML(id) : '<div class="muted">No cameras in Home Assistant yet.</div>';
    return `<button type="button" class="w a-cam" data-act="open" data-app="cams"><div class="w-head">${icon('camera')}Cameras<span class="grow"></span>${ids.length > 1 ? `<span class="faint">${ids.length}</span>` : ''}</div>${body}</button>`;
  }

  function wBnb() {
    const today = startOfDay(new Date());
    const list = (FEED.data.airbnb || []).map((x) => ({ ...x, d: parseDay(x.date) })).filter((x) => x.d >= today).sort((a, b) => a.d - b.d).slice(0, 3);
    const todayCount = list.filter((x) => +startOfDay(x.d) === +today).length;
    const body = list.length
      ? `<div class="big num">${todayCount}</div><div class="muted">${todayCount === 1 ? 'turnover today' : 'turnovers today'}</div>` +
        list.map((x) => `<div class="li"><span class="k">${esc(+startOfDay(x.d) === +today ? 'Today' : x.d.toLocaleDateString(undefined, { weekday: 'short' }))}</span><span class="v">${x.type === 'check-out' ? 'Out' : 'In'} · ${esc(x.listing || '')}${x.time ? ' · ' + esc(x.time) : ''}</span></div>`).join('')
      : '<div class="muted">No check-ins or check-outs coming up.</div>';
    return `<section class="w a-bnb" aria-label="Airbnb"><div class="w-head">${icon('key')}Airbnb<span class="grow"></span>${sampleTag(FEED.sample)}</div><div class="w-body">${body}</div></section>`;
  }

  function wInsp() {
    const i = FEED.data.inspections || {};
    const done = +i.completed || 0, goal = +i.goal || 0;
    const pct = goal ? clamp(done / goal, 0, 1) : 0;
    const C = 2 * Math.PI * 40;
    const now = new Date();
    const yearEnd = new Date(now.getFullYear(), 11, 31);
    const weeks = Math.max(1, Math.ceil((yearEnd - now) / (7 * 86400000)));
    const left = Math.max(0, goal - done);
    const next = (i.scheduled || []).map((x) => ({ ...x, d: parseDay(x.date) })).filter((x) => x.d >= startOfDay(now)).sort((a, b) => a.d - b.d)[0];
    return `<section class="w a-insp" aria-label="Inspections"><div class="w-head">${icon('clip')}Inspections<span class="grow"></span>${sampleTag(FEED.sample)}</div>
      <div class="ring-wrap"><svg class="ring" viewBox="0 0 100 100" role="img" aria-label="${Math.round(pct * 100)} percent of goal"><circle class="track" cx="50" cy="50" r="40"/><circle class="val" cx="50" cy="50" r="40" stroke-dasharray="${(pct * C).toFixed(1)} ${C.toFixed(1)}"/><text x="50" y="57" text-anchor="middle">${Math.round(pct * 100)}%</text></svg>
      <div><div class="big num">${done}</div><div class="muted">of ${goal} this year</div><div class="faint">${left ? `${Math.ceil(left / weeks)} a week to finish` : 'Goal met'}</div></div></div>
      ${next ? `<div class="li"><span class="k">Next</span><span class="v">${esc(relDay(next.d))}${next.time ? ' ' + esc(next.time) : ''} · ${esc(next.name || 'Inspection')}</span></div>` : ''}</section>`;
  }

  function wEv() {
    const list = (FEED.data.ev || []).slice(0, 4);
    const body = list.length
      ? list.map((x) => `<div class="li" style="justify-content:space-between"><span class="k">${esc(x.site || 'Site')}</span><span class="pill ${evStage(x)}">${esc(x.status || '')}</span></div>`).join('')
      : '<div class="muted">No EV projects in the feed.</div>';
    return `<section class="w a-ev" aria-label="EV charger projects"><div class="w-head">${icon('bolt')}EV Projects<span class="grow"></span>${sampleTag(FEED.sample)}</div><div class="w-body">${body}</div></section>`;
  }

  function wForecast() {
    const rows = WX.daily.slice(0, 5).map((d, i) => `<span class="d">${i === 0 ? 'Today' : esc(d.date.toLocaleDateString(undefined, { weekday: 'short' }))}</span>${icon(d.icon)}<span class="num">${Math.round(d.hi)}° <span class="muted">${Math.round(d.lo)}°</span></span>`).join('');
    return `<section class="w a-fcst" aria-label="Forecast"><div class="w-head">${icon('sun')}Forecast</div>${rows ? `<div class="fc">${rows}</div>` : '<div class="muted">Forecast unavailable.</div>'}</section>`;
  }

  function wChef() {
    const list = recipes.slice(0, 3).map((r) => `<div class="li"><span class="v">${esc(r.title)}</span></div>`).join('');
    return `<button type="button" class="w a-chef" data-act="open" data-app="chef"><div class="w-head">${icon('pot')}Sous Chef</div><div class="w-body"><div class="muted">${recipes.length} recipe${recipes.length === 1 ? '' : 's'} saved</div>${list}</div></button>`;
  }

  function wTimer() {
    const t = nextTimer();
    const now = t ? `<div class="big num" data-left="${t.id}">${fmtLeft(t.end - Date.now())}</div><div class="muted">${esc(t.label)}</div>` : '<div class="muted">Start a timer</div>';
    const q = [5, 10, 15].map((m) => `<button type="button" class="qbtn" data-act="timer" data-sec="${m * 60}">${m} min</button>`).join('');
    return `<section class="w a-tmr" aria-label="Timers"><div class="w-head">${icon('timer')}Timers</div>${now}<div class="quick">${q}</div></section>`;
  }

  function renderHome() {
    const guest = !privateOK();
    const home = $('#home');
    home.classList.toggle('guest', guest);
    const parts = [wTime(), wHome(), wCam()];
    if (guest) parts.push(wForecast(), wChef(), wTimer());
    else parts.push(wNext(), wBnb(), wInsp(), wEv());
    home.innerHTML = parts.join('');
  }

  function haStatusLabel() {
    return { sample: 'Sample data', connecting: 'Connecting…', connected: 'Home Assistant', retrying: 'Reconnecting…', error: 'Fix connection' }[H.status] || 'Home Assistant';
  }
  function haDot() { return { connected: 'good', connecting: 'warn', retrying: 'warn', error: 'crit' }[H.status] || ''; }

  function renderTop() {
    const p = curProfile();
    const named = p.id !== 'guest' && !/^family$/i.test(p.name);
    const t = nextTimer();
    $('#top').innerHTML = `
      <button type="button" class="chip" data-act="profiles" aria-haspopup="true" aria-label="Switch profile, current ${esc(p.name)}"><span class="avatar">${esc((p.name || '?').charAt(0).toUpperCase())}</span><span class="label">${esc(p.name)}</span></button>
      <div class="greeting">${greeting()}${named ? ', ' + esc(p.name) : ''}</div>
      <span class="spacer"></span>
      ${t ? `<button type="button" class="chip plain timer-pill" data-act="open" data-app="timers">${icon('timer')}<span class="num" id="timer-pill-text">${fmtLeft(t.end - Date.now())}</span></button>` : ''}
      <button type="button" class="chip plain" data-act="open" data-app="settings"><span class="dot ${haDot()}"></span><span class="label">${haStatusLabel()}</span></button>
      <button type="button" class="chip icon" data-act="open" data-app="settings" aria-label="Settings">${icon('gear')}</button>`;
  }

  // ------------------------------------------------------------------- apps
  const APP = { name: null, room: 'fav', recipeId: null, step: 0, adding: false, checked: new Set(), confirm: null };
  const APP_TITLES = { home: 'Home', cal: 'Calendar', chef: 'Sous Chef', timers: 'Timers', photos: 'Photos', cams: 'Cameras', settings: 'Settings' };

  function openApp(name) {
    APP.name = name;
    if (name !== 'chef') { APP.recipeId = null; APP.adding = false; }
    APP.confirm = null;
    selectedPhotos.clear();
    $('#sheet').hidden = false;
    renderApp();
    if (name === 'photos') loadPhotos().then(() => { if (APP.name === 'photos') renderApp(); });
    if (name === 'cal' && H.live) refreshCalendar();
  }
  function closeApp() {
    APP.name = null;
    APP.recipeId = null;
    APP.adding = false;
    $('#sheet').hidden = true;
    $('#sheet').innerHTML = '';
    renderHome();
  }

  function renderApp() {
    const el = $('#sheet');
    if (!APP.name) return;
    const scroll = $('.sheet-body', el)?.scrollTop || 0;
    let title = APP_TITLES[APP.name];
    let lead = '';
    if (APP.name === 'chef' && (APP.recipeId || APP.adding)) {
      lead = `<button type="button" class="chip plain" data-act="chef-back">${icon('back')}Recipes</button>`;
      if (APP.recipeId) title = recipes.find((r) => r.id === APP.recipeId)?.title || title;
      if (APP.adding) title = 'Add a recipe';
    }
    const body = { home: appHome, cal: appCal, chef: appChef, timers: appTimers, photos: appPhotos, cams: appCams, settings: appSettings }[APP.name]();
    el.innerHTML = `<div class="sheet-head">${lead}<h1>${esc(title)}</h1><span class="spacer"></span><button type="button" class="done-btn" data-act="close">Done</button></div><div class="sheet-body">${body}</div>`;
    const sb = $('.sheet-body', el);
    if (sb) sb.scrollTop = scroll;
  }

  // Home app
  function appHome() {
    const ids = Object.keys(H.states).filter(listable);
    const areaIds = Array.from(new Set(ids.map((id) => H.entityArea[id]).filter(Boolean)));
    areaIds.sort((a, b) => String(H.areas[a] || a).localeCompare(String(H.areas[b] || b)));
    const tabs = [['fav', 'Favorites'], ...areaIds.map((a) => [a, H.areas[a] || cap(a)]), ['_other', 'Other'], ['_sensors', 'Sensors']];
    let shown;
    if (APP.room === 'fav') shown = favoriteIds();
    else if (APP.room === '_sensors') shown = ids.filter((id) => ['sensor', 'binary_sensor'].includes(domainOf(id)));
    else if (APP.room === '_other') shown = ids.filter((id) => !H.entityArea[id] && !['sensor', 'binary_sensor', 'scene', 'script'].includes(domainOf(id)));
    else shown = ids.filter((id) => H.entityArea[id] === APP.room);
    if (!tabs.some((t) => t[0] === APP.room)) APP.room = 'fav';
    const scenes = ids.filter((id) => ['scene', 'script'].includes(domainOf(id)));
    const cap60 = shown.length > 60;
    shown = shown.slice(0, 60);
    return `
      ${!H.live ? '<p class="help">Showing sample devices. Connect Home Assistant in Settings to control your real ones.</p>' : ''}
      <div class="seg" role="group" aria-label="Rooms">${tabs.map(([k, v]) => `<button type="button" data-act="room" data-room="${esc(k)}" aria-pressed="${APP.room === k}">${esc(v)}</button>`).join('')}</div>
      ${scenes.length && APP.room === 'fav' ? `<div class="section-title">Scenes</div><div class="quick">${scenes.slice(0, 12).map((id) => `<button type="button" class="qbtn" data-act="tile" data-entity="${esc(id)}">${icon('sparkle')} ${esc(entityName(id))}</button>`).join('')}</div><div class="section-title">Devices</div>` : ''}
      ${shown.length ? `<div class="tiles">${shown.map((id) => tileHTML(id, true)).join('')}</div>` : '<div class="empty">Nothing in this room yet.</div>'}
      ${cap60 ? '<p class="help">Showing the first 60. Hide extra entities in Home Assistant to tidy this list.</p>' : ''}`;
  }

  // Calendar app
  function appCal() {
    if (CAL.note) return `<div class="empty">${esc(CAL.note)}</div>`;
    const evs = upcoming();
    if (!evs.length) return '<div class="empty">Nothing on the calendar for the next two weeks.</div>';
    const groups = new Map();
    evs.forEach((e) => { const k = startOfDay(e.start).getTime(); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); });
    return `${CAL.sample ? '<p class="help">Sample events. Connect Home Assistant and its calendars appear here.</p>' : ''}<div class="form">` +
      Array.from(groups.entries()).map(([k, list]) => `<div><div class="section-title">${esc(relDay(new Date(k)))} · ${esc(new Date(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}</div><div class="panel" style="display:grid;gap:12px">` +
        list.map((e) => `<div class="event"><span class="bar${calIndex(e.cal) ? ' alt' : ''}"></span><div><div class="t">${esc(e.title)}</div><div class="s">${e.allDay ? 'All day' : `${esc(fmtClock(e.start))} – ${esc(fmtClock(e.end))}`}${e.location ? ' · ' + esc(e.location) : ''} · ${esc(cap(entityName(e.cal).replace(/^calendar\./, '')))}</div></div></div>`).join('') +
        '</div></div>').join('') + '</div>';
  }

  // Sous Chef app
  function appChef() {
    if (APP.adding) {
      return `<div class="form">
        <label class="field"><span>Recipe name</span><input type="text" id="r-title" placeholder="Leave blank to use the first line"></label>
        <label class="field"><span>Paste the whole recipe</span><textarea id="r-text" placeholder="Ingredients\n1 cup flour\n…\n\nDirections\n1. Preheat the oven to 375°F.\n…"></textarea></label>
        <p class="help">Copy a recipe from any website or note and paste it here. Lines under “Ingredients” become a checklist, and lines under “Directions” become steps. Times like “bake 25 minutes” become one-tap timers.</p>
        <div class="quick"><button type="button" class="qbtn primary" data-act="recipe-save">Save recipe</button><button type="button" class="qbtn" data-act="chef-back">Cancel</button></div></div>`;
    }
    if (APP.recipeId) {
      const r = recipes.find((x) => x.id === APP.recipeId);
      if (!r) { APP.recipeId = null; return appChef(); }
      const n = r.steps.length;
      const i = clamp(APP.step, 0, Math.max(0, n - 1));
      const text = r.steps[i] || 'This recipe has no steps.';
      const tms = stepTimers(text).map((t) => `<button type="button" class="qbtn primary" data-act="timer" data-sec="${t.sec}" data-label="${esc(r.title)} · ${esc(t.label)}">${icon('timer')} Start ${esc(fmtDur(t.sec))}</button>`).join('');
      const confirmDel = APP.confirm === 'del-' + r.id;
      return `<div class="cook">
        <div><div class="section-title">Ingredients</div><div class="ingredients">${r.ingredients.map((x, k) => `<label><input type="checkbox" data-ing="${k}" ${APP.checked.has(k) ? 'checked' : ''}><span>${esc(x)}</span></label>`).join('') || '<p class="help">No ingredients listed.</p>'}</div>
          <div class="quick" style="margin-top:16px"><button type="button" class="qbtn danger" data-act="recipe-del" data-id="${esc(r.id)}">${icon('trash')} ${confirmDel ? 'Tap again to delete' : 'Delete recipe'}</button></div></div>
        <div class="stepcard"><div class="count">Step ${n ? i + 1 : 0} of ${n}</div><div class="text">${esc(text)}</div>
          ${tms ? `<div class="quick">${tms}</div>` : ''}
          <div class="stepnav"><button type="button" class="qbtn" data-act="step" data-dir="-1" ${i === 0 ? 'disabled' : ''}>Back</button><button type="button" class="qbtn primary" data-act="step" data-dir="1" ${i >= n - 1 ? 'disabled' : ''}>Next step</button></div></div>
      </div>`;
    }
    return `<div class="quick" style="margin-bottom:16px"><button type="button" class="qbtn primary" data-act="recipe-add">${icon('plus')} Add a recipe</button></div>
      <div class="recipes">${recipes.map((r) => `<button type="button" class="recipe-card" data-act="recipe-open" data-id="${esc(r.id)}"><span class="t">${esc(r.title)}</span><span class="muted">${r.ingredients.length} ingredients · ${r.steps.length} steps</span>${r.sample ? '<span><span class="tag">Sample</span></span>' : ''}</button>`).join('')}</div>
      <p class="help" style="margin-top:16px">Step mode keeps the screen awake and stays out of the clock face while you cook.</p>`;
  }

  // Timers app
  function appTimers() {
    const now = Date.now();
    const presets = [1, 3, 5, 10, 15, 20, 30, 45, 60].map((m) => `<button type="button" class="qbtn" data-act="timer" data-sec="${m * 60}">${m >= 60 ? m / 60 + ' hr' : m + ' min'}</button>`).join('');
    const cards = timers.slice().sort((a, b) => a.end - b.end).map((t) => `<div class="timer-card${t.done ? ' done' : ''}"><div class="muted">${esc(t.label)}</div><div class="left num" data-left="${t.id}">${t.done ? 'Done' : fmtLeft(t.end - now)}</div>
      <div class="quick">${t.done ? '' : `<button type="button" class="qbtn" data-act="timer-plus" data-id="${t.id}">+1 min</button>`}<button type="button" class="qbtn danger" data-act="timer-cancel" data-id="${t.id}">${t.done ? 'Clear' : 'Cancel'}</button></div></div>`).join('');
    return `<div class="section-title">Quick start</div><div class="quick">${presets}</div>
      <div class="section-title">Custom</div>
      <div class="row2" style="max-width:640px;align-items:end"><label class="field"><span>Minutes</span><input type="number" id="t-min" min="1" max="600" value="12" inputmode="numeric"></label><label class="field"><span>Label</span><input type="text" id="t-label" placeholder="Pasta"></label><button type="button" class="qbtn primary" data-act="timer-custom" style="min-height:44px">Start</button></div>
      <div class="section-title">Running</div>${cards ? `<div class="timers">${cards}</div>` : '<div class="empty">No timers running.</div>'}`;
  }

  // Photos app
  function appPhotos() {
    const del = selectedPhotos.size ? `<button type="button" class="qbtn danger" data-act="photo-del">${icon('trash')} ${APP.confirm === 'photos' ? 'Tap again to delete' : `Delete ${selectedPhotos.size}`}</button>` : '';
    return `<div class="quick" style="margin-bottom:12px"><label class="qbtn primary file-btn">${icon('plus')} Add photos<input type="file" id="photo-input" accept="image/*" multiple></label>${del}</div>
      <p class="help" style="margin-bottom:16px">Photos stay on this iPad and play on the Photos clock face. Tap photos to select them for deleting.</p>
      ${photos.length ? `<div class="photos">${photos.map((p) => `<button type="button" class="photo${selectedPhotos.has(p.id) ? ' sel' : ''}" data-act="photo-sel" data-id="${p.id}" aria-pressed="${selectedPhotos.has(p.id)}"><img alt="" src="${p.url}"></button>`).join('')}</div>` : '<div class="empty">No photos yet.</div>'}`;
  }

  // Cameras app
  function appCams() {
    const ids = cameraIds();
    if (!ids.length) return '<div class="empty">No cameras in Home Assistant yet.</div>';
    return `${!H.live ? '<p class="help">Sample cameras. Connect Home Assistant to see live snapshots, refreshed every 5 seconds.</p>' : ''}<div class="camgrid">${ids.map(camHTML).join('')}</div>`;
  }

  // Settings app
  function haStatusHTML() {
    const txt = { sample: 'Not connected. Showing sample devices.', connecting: 'Connecting…', connected: `Connected. ${Object.keys(H.states).length} entities loaded.`, retrying: 'Reconnecting…', error: 'Not connected.' }[H.status];
    return `<div id="ha-status"><div class="status-line"><span class="dot ${haDot()}"></span>${esc(txt)}</div>${H.message ? `<p class="help">${esc(H.message)}</p>` : ''}</div>`;
  }

  function sel(id, opts, val) {
    return `<select id="${id}" data-set="${id.replace(/^s-/, '')}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  }

  function appSettings() {
    const ids = Object.keys(H.states).filter(listable).filter((id) => !['sensor', 'binary_sensor', 'camera'].includes(domainOf(id)));
    ids.sort((a, b) => entityName(a).localeCompare(entityName(b)));
    const favSet = new Set(favoriteIds());
    const cals = Object.keys(H.states).filter((id) => domainOf(id) === 'calendar');
    const weathers = Object.keys(H.states).filter((id) => domainOf(id) === 'weather');
    const cams = cameraIds();
    const hours = Array.from({ length: 24 }, (_, h) => [h, fmtClock(new Date(2026, 0, 1, h, 0))]);
    const pageHttps = location.protocol === 'https:';
    return `<div class="form">
      <div class="section-title">Home Assistant</div>
      ${haStatusHTML()}
      <label class="field"><span>Home Assistant address</span><input type="url" id="ha-url" value="${esc(S.haUrl)}" placeholder="${pageHttps ? 'https://umbrel.your-tailnet.ts.net:8123' : 'http://umbrel.local:8123'}" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
      <label class="field"><span>Long-lived access token</span><input type="password" id="ha-token" value="${esc(S.haToken)}" placeholder="Paste the token from Home Assistant" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
      <div class="quick"><button type="button" class="qbtn primary" data-act="ha-connect">Connect</button>${S.haUrl || S.haToken ? '<button type="button" class="qbtn" data-act="ha-disconnect">Disconnect</button>' : ''}</div>
      <div class="panel"><p class="help" style="margin-top:0"><strong>Getting a token on Umbrel:</strong> open the Home Assistant app on your Umbrel, tap your name at the bottom left, open the Security tab, and create a long-lived access token. Paste it above. The token stays on this iPad.</p>
      <p class="help" style="margin-bottom:0"><strong>Which address:</strong> ${pageHttps
        ? 'This copy opens over https, so Home Assistant needs an https address too. Either run this app from your Umbrel and use <code>http://umbrel.local:8123</code>, or give Home Assistant an https address with Umbrel’s Tailscale or Cloudflare Tunnel app. The README covers both.'
        : 'This copy opens over http, so <code>http://umbrel.local:8123</code> works while the iPad is on your home Wi-Fi.'}</p></div>

      <div class="section-title">Favorites on the home screen</div>
      <p class="help">Pick up to 6. ${S.favorites.length ? '' : 'None picked yet, so the first lights, locks and climate controls are shown.'}</p>
      <div class="checks">${ids.map((id) => `<label class="check"><input type="checkbox" data-fav="${esc(id)}" ${favSet.has(id) && S.favorites.length ? 'checked' : ''}><span>${esc(entityName(id))} <span class="faint">${esc(domainOf(id))}</span></span></label>`).join('') || '<p class="help">No devices found.</p>'}</div>

      ${cams.length > 1 ? `<label class="field"><span>Camera on the home screen</span>${sel('s-mainCamera', cams.map((c) => [c, entityName(c)]), S.mainCamera || cams[0])}</label>` : ''}
      ${cals.length ? `<div class="section-title">Calendars</div><p class="help">Leave all unchecked to show every calendar.</p><div class="checks">${cals.map((id) => `<label class="check"><input type="checkbox" data-cal="${esc(id)}" ${S.calendars.includes(id) ? 'checked' : ''}><span>${esc(entityName(id))}</span></label>`).join('')}</div>` : ''}

      <div class="section-title">Weather</div>
      ${weathers.length ? `<label class="field"><span>Source</span>${sel('s-weatherEntity', [['', 'Open-Meteo (free, no account)'], ...weathers.map((w) => [w, 'Home Assistant · ' + entityName(w)])], S.weatherEntity)}</label>` : ''}
      <div class="row2"><label class="field"><span>Place name</span><input type="text" data-set="place" value="${esc(S.place)}"></label><label class="field"><span>Latitude</span><input type="number" step="0.0001" data-set="lat" value="${esc(S.lat)}"></label><label class="field"><span>Longitude</span><input type="number" step="0.0001" data-set="lon" value="${esc(S.lon)}"></label></div>

      <div class="section-title">Bauder HQ feed</div>
      <label class="field"><span>Feed address (JSON)</span><input type="url" id="feed-url" value="${esc(S.feedUrl)}" placeholder="http://umbrel.local:8086/bauder-hq.json" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
      <div class="quick"><button type="button" class="qbtn primary" data-act="feed-save">Save and refresh</button></div>
      <p class="help" id="feed-status">${esc(feedStatusText())}</p>
      <p class="help">Drives the Airbnb, Inspections and EV Projects widgets. The README shows the format. Refreshes every 5 minutes.</p>

      <div class="section-title">Clock face</div>
      <div class="row2">
        <label class="field"><span>Show the clock after</span>${sel('s-idleAfter', [[30, '30 seconds'], [60, '1 minute'], [120, '2 minutes'], [300, '5 minutes'], [600, '10 minutes'], [0, 'Never']], S.idleAfter)}</label>
        <label class="field"><span>Face</span>${sel('s-face', [['bold', 'Bold'], ['analog', 'Analog'], ['photos', 'Photos'], ['glance', 'Glance']], S.face)}</label>
      </div>
      <label class="check"><input type="checkbox" data-set="nightMode" ${S.nightMode ? 'checked' : ''}><span>Night mode: dim red clock overnight</span></label>
      <div class="row2"><label class="field"><span>Night starts</span>${sel('s-nightStart', hours, S.nightStart)}</label><label class="field"><span>Night ends</span>${sel('s-nightEnd', hours, S.nightEnd)}</label></div>
      <p class="help">On the clock face, swipe left or right to change faces. Tap to go back to the home screen.</p>

      <div class="section-title">Appearance</div>
      <label class="field"><span>Theme</span>${sel('s-theme', [['auto', 'Match the iPad'], ['light', 'Light'], ['dark', 'Dark']], S.theme)}</label>

      <div class="section-title">Profiles</div>
      <p class="help">Guest hides the calendar and the Airbnb, Inspections and EV widgets.</p>
      ${S.profiles.filter((p) => !p.fixed).map((p) => `<div class="row2" style="align-items:end"><label class="field"><span>Profile name</span><input type="text" data-prof-name="${p.id}" value="${esc(p.name)}"></label><label class="check"><input type="checkbox" data-prof-private="${p.id}" ${p.showPrivate ? 'checked' : ''}><span>Show calendar and work widgets</span></label></div>`).join('')}

      <div class="section-title">Set up the iPad</div>
      <div class="panel"><ol class="steps-list">
        <li>Open this page in Safari, tap Share, then <strong>Add to Home Screen</strong>. Open it from that icon so it runs full screen.</li>
        <li>Keep the screen on: Settings → Display &amp; Brightness → Auto-Lock → Never. Keep the iPad on its charger.</li>
        <li>Lock it to this app: Settings → Accessibility → Guided Access → on. Open Bauder Home and triple-click the top button to start.</li>
        <li>Turn the sound on once by tapping the screen, so timers can ring.</li>
      </ol></div>

      <div class="section-title">Reset</div>
      <div class="quick"><button type="button" class="qbtn danger" data-act="reset">${APP.confirm === 'reset' ? 'Tap again to erase everything' : 'Erase all settings on this iPad'}</button></div>
      <p class="help faint">Bauder Home · settings, recipes and photos are stored only on this device.</p>
    </div>`;
  }

  // -------------------------------------------------------------- idle faces
  const FACES = ['bold', 'analog', 'photos', 'glance'];
  let idleOn = false;
  let lastTouch = Date.now();
  let faceIdx = Math.max(0, FACES.indexOf(S.face));
  let photoIdx = 0, photoTimer = null;

  function isNight() {
    if (!S.nightMode) return false;
    const h = new Date().getHours(), a = +S.nightStart, b = +S.nightEnd;
    return a > b ? h >= a || h < b : h >= a && h < b;
  }
  function blockIdle() {
    return !!ringing || (APP.name === 'chef' && (APP.recipeId || APP.adding)) || APP.name === 'settings' || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
  }

  function enterIdle() {
    if (idleOn) return;
    idleOn = true;
    faceIdx = Math.max(0, FACES.indexOf(S.face));
    $('#pop').hidden = true;
    renderIdle();
    $('#idle').hidden = false;
  }
  let suppressClickUntil = 0;
  function exitIdle() {
    idleOn = false;
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
      <line class="hand" data-hand="h" x1="200" y1="200" x2="200" y2="112" stroke-width="12"/>
      <line class="hand" data-hand="m" x1="200" y1="200" x2="200" y2="58" stroke-width="8"/>
      <line class="sec" data-hand="s" x1="200" y1="226" x2="200" y2="42"/>
      <circle class="hub" cx="200" cy="200" r="8"/></svg>`;
  }

  function glanceRows() {
    const rows = [];
    if (WX.now) rows.push(`<div class="gl">${icon(WX.now.icon)}<span>${Math.round(WX.now.temp)}° ${esc(WX.now.text)}${WX.daily[0] ? ` <span class="muted">H ${Math.round(WX.daily[0].hi)}° L ${Math.round(WX.daily[0].lo)}°</span>` : ''}</span></div>`);
    if (privateOK()) {
      const e = upcoming()[0];
      if (e) rows.push(`<div class="gl">${icon('cal')}<span>${esc(e.title)} <span class="muted">${esc(relDay(e.start))}${e.allDay ? '' : ' ' + esc(fmtClock(e.start))}</span></span></div>`);
      const today = startOfDay(new Date());
      const b = (FEED.data.airbnb || []).map((x) => ({ ...x, d: parseDay(x.date) })).filter((x) => x.d >= today).sort((a, c) => a.d - c.d)[0];
      if (b) rows.push(`<div class="gl">${icon('key')}<span>${esc(b.listing)} ${b.type === 'check-out' ? 'check-out' : 'check-in'} <span class="muted">${esc(relDay(b.d))}${b.time ? ' ' + esc(b.time) : ''}</span></span></div>`);
    }
    const t = nextTimer();
    if (t) rows.push(`<div class="gl">${icon('timer')}<span>${esc(t.label)} <span class="muted num" data-left="${t.id}">${fmtLeft(t.end - Date.now())}</span></span></div>`);
    return rows.join('');
  }

  function renderIdle() {
    const el = $('#idle');
    const night = isNight();
    let face = FACES[faceIdx];
    if (face === 'photos' && (night || !photos.length)) face = photos.length ? 'bold' : face;
    el.classList.toggle('night', night);
    const n = new Date(), t = fmtTime(n);
    const sub = `${esc(fmtDate(n))}${WX.now ? ` · ${Math.round(WX.now.temp)}° ${esc(WX.now.text)}` : ''}`;
    let html = '';
    if (face === 'bold') html = `<div class="face face-bold"><div class="clock num" data-clock="hm">${t.hm}</div><div class="sub" data-clock="sub">${sub}</div></div>`;
    else if (face === 'analog') html = `<div class="face face-analog">${analogSVG()}</div>`;
    else if (face === 'photos') {
      html = photos.length
        ? `<div class="face face-photos"><div class="bg" data-ph="a" style="background-image:url('${photos[photoIdx % photos.length].url}')"></div><div class="bg" data-ph="b" style="opacity:0"></div><div class="shade"></div><div class="over"><div class="clock num" data-clock="hm">${t.hm}</div><div class="sub" data-clock="sub">${sub}</div></div></div>`
        : `<div class="face face-bold"><div class="clock num" data-clock="hm">${t.hm}</div><div class="sub">Add photos in the Photos app to use this face.</div></div>`;
    } else html = `<div class="face face-glance"><div class="clock num" data-clock="hm">${t.hm}</div><div class="rows">${glanceRows()}</div></div>`;
    const tt = nextTimer();
    el.innerHTML = html +
      (tt && face !== 'glance' ? `<div class="idle-timer num">${icon('timer')} <span data-left="${tt.id}">${fmtLeft(tt.end - Date.now())}</span></div>` : '') +
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
        if (!APP.name || APP.name !== 'home') renderHome();
        if (idleOn) { const night = isNight(); if (night !== $('#idle').classList.contains('night') || (n.getHours() === 0 && n.getMinutes() === 0)) renderIdle(); }
      }
    }
  }

  // ------------------------------------------------------------- rendering
  let renderQueued = false;
  let dragging = false;
  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      renderAll();
    });
  }
  function renderAll() {
    renderTop();
    renderHome();
    if (APP.name && ['home', 'cal', 'timers', 'cams'].includes(APP.name) && !dragging) renderApp();
    if (idleOn && FACES[faceIdx] === 'glance') { const r = $('#idle .rows'); if (r) r.innerHTML = glanceRows(); }
  }

  function refreshCameraImages() {
    $$('img[data-cam]').forEach((img) => { const src = cameraSrc(img.dataset.cam); if (src) img.src = src; });
  }

  // ---------------------------------------------------------------- actions
  let armed = null;
  function arm(id) {
    armed = { id, until: Date.now() + 4000 };
    scheduleRender();
    setTimeout(() => { if (armed && armed.id === id && Date.now() >= armed.until) { armed = null; scheduleRender(); } }, 4100);
  }

  async function tapEntity(id) {
    const s = H.states[id];
    if (!s) return;
    const d = domainOf(id);
    const isArmed = armed && armed.id === id && Date.now() < armed.until;
    switch (d) {
      case 'light': case 'switch': case 'fan': case 'input_boolean': await call(d, 'toggle', id); break;
      case 'lock':
        if (s.state === 'locked') { if (isArmed) { armed = null; await call('lock', 'unlock', id); } else arm(id); }
        else { armed = null; await call('lock', 'lock', id); }
        break;
      case 'cover': {
        const open = s.state === 'open' || s.state === 'opening';
        if (isArmed) { armed = null; await call('cover', open ? 'close_cover' : 'open_cover', id); } else arm(id);
        break;
      }
      case 'scene': case 'script': if (await call(d, 'turn_on', id)) toast(`${entityName(id)} is on`); break;
      case 'media_player': await call('media_player', 'media_play_pause', id); break;
      case 'camera': openApp('cams'); break;
      default: break;
    }
    scheduleRender();
  }

  const actions = {
    open: (el) => openApp(el.dataset.app),
    close: () => closeApp(),
    idle: () => enterIdle(),
    tile: (el) => tapEntity(el.dataset.entity),
    temp: (el) => {
      const id = el.dataset.entity, s = H.states[id];
      if (!s) return;
      const cur = s.attributes.temperature ?? 70;
      const v = clamp(Math.round(cur + +el.dataset.step), s.attributes.min_temp ?? 45, s.attributes.max_temp ?? 90);
      call('climate', 'set_temperature', id, { temperature: v });
    },
    room: (el) => { APP.room = el.dataset.room; renderApp(); },
    profiles: () => {
      const pop = $('#pop');
      if (!pop.hidden) { pop.hidden = true; return; }
      pop.innerHTML = S.profiles.map((p) => `<button type="button" data-act="set-profile" data-id="${p.id}" aria-current="${p.id === S.profile}"><span class="avatar">${esc(p.name.charAt(0).toUpperCase())}</span>${esc(p.name)}${p.showPrivate ? '' : '<span class="sub">Hides private widgets</span>'}</button>`).join('');
      pop.hidden = false;
    },
    'set-profile': (el) => { S.profile = el.dataset.id; saveSettings(); $('#pop').hidden = true; renderAll(); },
    timer: (el) => addTimer(+el.dataset.sec, el.dataset.label || ''),
    'timer-custom': () => {
      const m = parseFloat($('#t-min')?.value);
      if (!(m > 0)) { toast('Enter the number of minutes first.'); return; }
      addTimer(Math.round(m * 60), ($('#t-label')?.value || '').trim());
    },
    'timer-plus': (el) => { const t = timers.find((x) => x.id === el.dataset.id); if (t) { t.end += 60000; saveTimers(); renderAll(); } },
    'timer-cancel': (el) => cancelTimer(el.dataset.id),
    'stop-ring': () => stopRing(false),
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
    'recipe-open': (el) => { APP.recipeId = el.dataset.id; APP.step = 0; APP.checked = new Set(); APP.confirm = null; renderApp(); keepAwake(); },
    'recipe-del': (el) => {
      const id = el.dataset.id;
      if (APP.confirm !== 'del-' + id) { APP.confirm = 'del-' + id; renderApp(); return; }
      recipes = recipes.filter((r) => r.id !== id);
      saveRecipes();
      APP.recipeId = null; APP.confirm = null;
      renderApp();
      toast('Recipe deleted');
    },
    'chef-back': () => { APP.adding = false; APP.recipeId = null; APP.confirm = null; renderApp(); },
    step: (el) => { APP.step += +el.dataset.dir; renderApp(); },
    'photo-sel': (el) => { const id = el.dataset.id; if (selectedPhotos.has(id)) selectedPhotos.delete(id); else selectedPhotos.add(id); APP.confirm = null; renderApp(); },
    'photo-del': async () => {
      if (APP.confirm !== 'photos') { APP.confirm = 'photos'; renderApp(); return; }
      const n = selectedPhotos.size;
      try { for (const id of selectedPhotos) await DB.del(id); } catch (e) { toast('Couldn’t delete those photos.'); }
      selectedPhotos.clear(); APP.confirm = null;
      await loadPhotos();
      renderApp();
      toast(`Deleted ${n} photo${n > 1 ? 's' : ''}`);
    },
    'ha-connect': () => {
      S.haUrl = ($('#ha-url')?.value || '').trim();
      S.haToken = ($('#ha-token')?.value || '').trim();
      saveSettings();
      if (!S.haUrl || !S.haToken) { toast('Enter both the address and the token.'); return; }
      haConnect();
    },
    'ha-disconnect': () => { S.haUrl = ''; S.haToken = ''; saveSettings(); haConnect(); renderApp(); refreshCalendar(); toast('Disconnected. Showing sample devices.'); },
    'feed-save': () => { S.feedUrl = ($('#feed-url')?.value || '').trim(); saveSettings(); loadFeed(); toast(S.feedUrl ? 'Refreshing the feed…' : 'Feed removed. Showing sample data.'); },
    reset: () => {
      if (APP.confirm !== 'reset') { APP.confirm = 'reset'; renderApp(); return; }
      store.clear();
      try { indexedDB.deleteDatabase('bauder-home'); } catch (e) { /* ignore */ }
      location.reload();
    },
  };

  // The tap that wakes the clock face must not also press whatever is under it.
  document.addEventListener('click', (e) => {
    if (Date.now() < suppressClickUntil) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  document.addEventListener('click', (e) => {
    ensureAudio();
    if (!e.target.closest('#pop') && !e.target.closest('[data-act="profiles"]')) $('#pop').hidden = true;
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = actions[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-bright]')) { dragging = false; call('light', 'turn_on', t.dataset.bright, { brightness_pct: +t.value }); return; }
    if (t.matches('#photo-input')) { addPhotos(t.files); t.value = ''; return; }
    if (t.matches('[data-ing]')) { const k = +t.dataset.ing; if (t.checked) APP.checked.add(k); else APP.checked.delete(k); return; }
    if (t.matches('[data-fav]')) {
      const base = S.favorites.length ? S.favorites.slice() : [];
      const id = t.dataset.fav;
      let next = t.checked ? Array.from(new Set([...base, id])) : base.filter((x) => x !== id);
      if (next.length > 6) { t.checked = false; toast('Pick up to 6 favorites.'); return; }
      S.favorites = next; saveSettings(); renderHome(); return;
    }
    if (t.matches('[data-cal]')) {
      const id = t.dataset.cal;
      S.calendars = t.checked ? Array.from(new Set([...S.calendars, id])) : S.calendars.filter((x) => x !== id);
      saveSettings(); refreshCalendar(); return;
    }
    if (t.matches('[data-prof-name]')) { const p = S.profiles.find((x) => x.id === t.dataset.profName); if (p) { p.name = t.value.trim() || p.name; saveSettings(); renderTop(); } return; }
    if (t.matches('[data-prof-private]')) { const p = S.profiles.find((x) => x.id === t.dataset.profPrivate); if (p) { p.showPrivate = t.checked; saveSettings(); renderHome(); } return; }
    if (t.matches('[data-set]')) {
      const k = t.dataset.set;
      let v = t.type === 'checkbox' ? t.checked : t.value;
      if (['lat', 'lon', 'idleAfter', 'nightStart', 'nightEnd'].includes(k)) v = parseFloat(v);
      if ((k === 'lat' || k === 'lon') && !Number.isFinite(v)) return;
      S[k] = v;
      saveSettings();
      if (k === 'theme') applyTheme();
      if (['lat', 'lon', 'place', 'weatherEntity'].includes(k)) loadWeather();
      if (k === 'face') faceIdx = Math.max(0, FACES.indexOf(v));
      renderHome();
    }
  });
  document.addEventListener('input', (e) => { if (e.target.matches('[data-bright]')) dragging = true; });

  // Idle overlay: tap to wake, swipe to change faces.
  let swipeX = null;
  const idleEl = () => $('#idle');
  document.addEventListener('pointerdown', (e) => {
    lastTouch = Date.now();
    ensureAudio();
    keepAwake();
    if (idleOn && idleEl().contains(e.target)) swipeX = e.clientX;
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
    if (e.key === 'Escape') { if (!$('#pop').hidden) $('#pop').hidden = true; else if (APP.name) closeApp(); }
  });
  document.addEventListener('scroll', () => { lastTouch = Date.now(); }, true);

  // Keep the screen on where Safari allows it.
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
    if (document.visibilityState === 'visible') {
      keepAwake();
      if (H.status === 'retrying' || H.status === 'error') { if (S.haUrl && S.haToken && !H.noRetry) haConnect(); }
      loadWeather();
      loadFeed();
    }
  });

  // ------------------------------------------------------------------- init
  function init() {
    applyTheme();
    useDemo();
    CAL.events = demoEvents();
    const wc = store.get('wxCache', null);
    if (wc) { WX.now = wc.now; WX.daily = (wc.daily || []).map((d) => ({ ...d, date: new Date(d.date) })); WX.place = wc.place; }
    renderTop();
    renderHome();
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
    setInterval(() => { if (H.live) refreshCalendar(); }, 10 * 60000);
    setInterval(loadFeed, 5 * 60000);

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
    }
  }

  init();
})();
