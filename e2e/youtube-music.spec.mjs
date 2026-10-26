import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
});

test('YouTube Music panel opens in sample mode, saves playlists, and reopens safely', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  for (let n = 0; n < 2; n++) {
    await page.locator('#dock [data-app="music"] .app-tab-label').click();
    await expect(page.locator('#sheet h1')).toHaveText('Music');
    await expect(page.locator('.ytm-panel')).toBeVisible();
    await expect(page.locator('[data-act="ytm-destination"][data-destination="ipad"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-act="ytm-play"]')).toBeEnabled();
    await expect(page.locator('.ytm-panel')).toContainText('Playback stays on this screen.');
    await expect(page.locator('.ytm-panel a[href*="music.youtube.com"]')).toHaveCount(0);
    await expect(page.locator('.speakers')).toBeVisible();
    if (n === 0) {
      await page.locator('#ytm-label').fill('Evening Worship');
      await page.locator('#ytm-url').fill('https://music.youtube.com/playlist?list=PLMtYkFCCurnwZJ2k7NOz1VCcBN8aGj8U');
      await page.locator('[data-act="ytm-add"]').click();
      await expect(page.locator('.ytm-saved-row')).toHaveCount(1);
    } else {
      await expect(page.locator('.ytm-saved-row')).toHaveCount(1);
      await expect(page.locator('.ytm-saved-label-btn')).toHaveText('Evening Worship');
    }
    await page.locator('#sheet .done-btn').click();
    await expect(page.locator('#sheet')).toBeHidden();
    expect(await page.locator('.app').evaluate(el => el.inert)).toBe(false);
  }
  await page.locator('#dock [data-app="music"]').click();
  await page.locator('[data-act="ytm-remove"]').click();
  await expect(page.locator('.ytm-saved-row')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Music Assistant service calls use selected speaker without direct YouTube credentials', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('bh.settings', JSON.stringify({
      haUrl: 'http://mock-ha.invalid:8123',
      haToken: 'qa-fake-token',
    }));
    window.__haCommands = [];
    const states = [
      {entity_id: 'media_player.ma_living_room', state: 'idle', attributes: {
        friendly_name: 'Music Assistant Living Room', volume_level: 0.4, source_list: ['Music Assistant'],
      }},
      {entity_id: 'media_player.kitchen', state: 'paused', attributes: {
        friendly_name: 'Kitchen Speaker', volume_level: 0.5,
      }},
    ];
    window.WebSocket = class MockHAWebSocket {
      constructor(url) {
        this.readyState = 1;
        window.__wsUrl = url;
        setTimeout(() => this.emit({ type: 'auth_required' }), 0);
      }
      emit(msg) { this.onmessage?.({ data: JSON.stringify(msg) }); }
      send(json) {
        const cmd = JSON.parse(json);
        if (cmd.type === 'auth') { this.emit({ type: 'auth_ok' }); return; }
        window.__haCommands.push(cmd);
        const result = cmd.type === 'get_states' ? states : [];
        queueMicrotask(() => this.emit({ id: cmd.id, type: 'result', success: true, result }));
      }
      close() { this.readyState = 3; }
    };
  });
  await page.goto('/');
  await page.locator('#dock [data-app="music"]').click();
  await page.locator('[data-act="ytm-destination"][data-destination="speakers"]').click();
  await expect(page.locator('#ytm-player option')).toHaveCount(3);
  await page.locator('#ytm-player').selectOption('media_player.ma_living_room');
  await expect(page.locator('[data-act="ytm-play"]')).toBeEnabled();
  await page.locator('#ytm-query').fill('Queen - Bohemian Rhapsody');
  await page.locator('#ytm-type').selectOption('track');
  await page.locator('[data-act="ytm-play"]').click();

  await expect.poll(async () => page.evaluate(() =>
    window.__haCommands.filter(c => c.type === 'call_service' && c.domain === 'music_assistant').length)).toBe(1);

  const playlist = 'https://music.youtube.com/playlist?list=PLMtYkFCCurnwZJ2k7NOz1VCcBN8aGj8U';
  await page.locator('#ytm-label').fill('Family Playlist');
  await page.locator('#ytm-url').fill(playlist);
  await page.locator('[data-act="ytm-add"]').click();
  await page.locator('.ytm-saved-label-btn[data-act="ytm-play-saved"]').click();
  await expect.poll(async () => page.evaluate(() =>
    window.__haCommands.filter(c => c.type === 'call_service' && c.domain === 'music_assistant').length)).toBe(2);

  const requests = await page.evaluate(() => window.__haCommands.filter(c => c.type === 'call_service' && c.domain === 'music_assistant'));
  expect(requests.map(r => ({domain:r.domain,service:r.service,target:r.target,service_data:r.service_data}))).toEqual([
    {domain:'music_assistant', service:'play_media', target:{entity_id:'media_player.ma_living_room'},
      service_data:{media_id:'Queen - Bohemian Rhapsody', media_type:'track', enqueue:'play'}},
    {domain:'music_assistant', service:'play_media', target:{entity_id:'media_player.ma_living_room'},
      service_data:{media_id:playlist, media_type:'playlist', enqueue:'play'}},
  ]);
  await expect(page.locator('.speaker')).toHaveCount(2);
  await page.locator('#sheet .done-btn').click();
  await expect(page.locator('#sheet')).toBeHidden();
  expect(pageErrors).toEqual([]);
});

test('rejects an off-domain YouTube playlist and preserves the app', async ({ page }) => {
  await page.goto('/');
  await page.locator('#dock [data-app="music"]').click();
  await page.locator('#ytm-label').fill('Bad');
  await page.locator('#ytm-url').fill('https://evil.example.com/playlist?list=PLMtYkFCCurnwZJ2k7NOz1VCcBN8aGj8U');
  await page.locator('[data-act="ytm-add"]').click();
  await expect(page.locator('.ytm-saved-row')).toHaveCount(0);
  await expect(page.locator('#sheet')).toBeVisible();
  await page.locator('#sheet .done-btn').click();
  await expect(page.locator('#sheet')).toBeHidden();
});

test('Music playlists play in an inline iPad frame and never open an external tab', async ({ page }) => {
  const popups = [];
  const errors = [];
  page.on('popup', popup => popups.push(popup.url()));
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('/');
  await page.locator('#dock [data-app="music"] .app-tab-label').click();
  await page.locator('#ytm-query').fill('https://music.youtube.com/watch?v=abcdefghijk');
  await page.locator('[data-act="ytm-play"]').click();
  await expect(page.locator('#ytm-video')).toHaveAttribute('src',
    'https://www.youtube.com/embed/abcdefghijk?playsinline=1&controls=1');
  await expect(page.locator('.ytm-inline-player')).toBeVisible();
  await page.evaluate(() => { window.__playingFrame = document.querySelector('#ytm-video'); });
  // Adding a playlist must not replace the active iframe or stop the music.
  await page.locator('#ytm-label').fill('Family listening');
  await page.locator('#ytm-url').fill('https://music.youtube.com/playlist?list=PLMtYkFCCurnwZJ2k7NOz1VCcBN8aGj8U');
  await page.locator('[data-act="ytm-add"]').click();
  expect(await page.evaluate(() => document.querySelector('#ytm-video') === window.__playingFrame)).toBe(true);
  await page.locator('.ytm-saved-label-btn').click();
  await expect(page.locator('#ytm-video')).toHaveAttribute('src',
    'https://www.youtube.com/embed?listType=playlist&list=PLMtYkFCCurnwZJ2k7NOz1VCcBN8aGj8U&playsinline=1&controls=1');
  expect(popups).toEqual([]);
  expect(errors).toEqual([]);
});

test('clicking dock tab names opens their corresponding views', async ({ page }) => {
  await page.goto('/');
  for (const [name,title] of [['home','Home'], ['music','Music'], ['cal','Calendar'], ['wled','LED Strips'], ['settings','Settings']]) {
    const label = page.locator('#dock [data-app="' + name + '"] .app-tab-label');
    await expect(label).toBeVisible();
    await label.click();
    await expect(page.locator('#sheet h1')).toHaveText(title);
    await page.locator('#sheet .done-btn').click();
    await expect(page.locator('#sheet')).toBeHidden();
  }
});
