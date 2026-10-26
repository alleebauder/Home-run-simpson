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
    await page.locator('#dock [data-app="music"]').click();
    await expect(page.locator('#sheet h1')).toHaveText('Music');
    await expect(page.locator('.ytm-panel')).toBeVisible();
    await expect(page.locator('.ytm-panel')).toContainText('Not connected');
    await expect(page.locator('[data-act="ytm-play"]')).toBeDisabled();
    await expect(page.locator('.speakers')).toBeVisible();
    if (n === 0) {
      await page.locator('#ytm-label').fill('Evening Worship');
      await page.locator('#ytm-url').fill('https://music.youtube.com/playlist?list=PLMtYkFCCurnwZJ2k7NOz1VCcBN8aGj8U');
      await page.locator('[data-act="ytm-add"]').click();
      await expect(page.locator('.ytm-saved-row')).toHaveCount(1);
    } else {
      await expect(page.locator('.ytm-saved-row')).toHaveCount(1);
      await expect(page.locator('.ytm-saved-label')).toHaveText('Evening Worship');
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
  await page.locator('[data-act="ytm-play-saved"]').click();
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
