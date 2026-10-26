import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
});

test('WLED sample controls work in the browser and remain usable after reopening', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  for (let i = 0; i < 2; i++) {
    await page.locator('#dock [data-app="wled"]').click();
    await expect(page.locator('#sheet h1')).toHaveText('LED Strips');
    await expect(page.locator('.wled-note')).toContainText('Sample preview');
    const power = page.locator('.wled-power');
    await expect(power).toHaveAttribute('aria-pressed', 'true');
    await power.click();
    await expect(power).toHaveAttribute('aria-pressed', 'false');
    await power.click();
    await expect(power).toHaveAttribute('aria-pressed', 'true');
    await page.locator('.wled-swatch[data-color="#ff334f"]').click();
    await page.locator('select[data-wled-effect]').selectOption('Rainbow');
    await expect(page.locator('select[data-wled-effect]')).toHaveValue('Rainbow');
    await page.locator('select[data-wled-preset]').selectOption('Sunset');
    await expect(page.locator('select[data-wled-preset]')).toHaveValue('Sunset');
    await page.locator('input[data-wled-bright]').focus();
    await page.keyboard.press('ArrowDown');
    await page.locator('[data-act="wled-setup"]').click();
    await expect(page.locator('.wled-setup')).toBeVisible();
    await page.locator('[data-act="wled-setup"]').click();
    await expect(page.locator('.wled-setup')).toHaveCount(0);
    await page.locator('#sheet .done-btn').click();
    await expect(page.locator('#sheet')).toBeHidden();
    await expect(page.locator('.app')).not.toHaveAttribute('inert', '');
  }
  expect(errors).toEqual([]);
});

test('a Home Assistant WLED entity sends correct light and preset service commands', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('bh.settings', JSON.stringify({
      haUrl: 'http://mock-ha.invalid:8123', haToken: 'qa-fake-token',
    }));
    window.__haCommands = [];
    const states = [
      { entity_id: 'light.wled_test', state: 'on', attributes: {
        friendly_name: 'WLED Kitchen', brightness: 204, rgb_color: [40, 80, 120],
        effect: 'Solid', effect_list: ['Solid', 'Rainbow', 'Chase'],
        supported_color_modes: ['rgb'],
      } },
      { entity_id: 'select.wled_test_preset', state: 'Default', attributes: {
        friendly_name: 'WLED Kitchen Preset', options: ['Default', 'Sunset', 'Party'],
      } },
      { entity_id: 'light.regular', state: 'off', attributes: {
        friendly_name: 'Regular Lamp', supported_color_modes: ['brightness'],
      } },
    ];
    window.WebSocket = class MockHAWebSocket {
      constructor(url) {
        this.readyState = 1;
        window.__socketUrl = url;
        setTimeout(() => this.emit({ type: 'auth_required' }), 0);
      }
      emit(data) {
        if (this.onmessage) this.onmessage({ data: JSON.stringify(data) });
      }
      send(raw) {
        const message = JSON.parse(raw);
        if (message.type === 'auth') {
          this.emit({ type: 'auth_ok' });
          return;
        }
        window.__haCommands.push(message);
        const result = message.type === 'get_states' ? states :
          message.type === 'config/area_registry/list' ||
          message.type === 'config/entity_registry/list' ||
          message.type === 'config/device_registry/list' ? [] : {};
        queueMicrotask(() => this.emit({ id: message.id, type: 'result', success: true, result }));
      }
      close() { this.readyState = 3; }
    };
  });
  await page.goto('/');
  await page.locator('#dock [data-app="wled"]').click();
  await expect(page.locator('.wled-card-name strong')).toHaveText('WLED Kitchen');
  await expect(page.locator('.wled-note')).toHaveCount(0);
  await expect(page.locator('.wled-card')).toHaveCount(1);
  await page.locator('button.wled-swatch[data-color="#ff334f"]').click();
  await page.locator('select[data-wled-effect]').selectOption('Rainbow');
  await page.locator('select[data-wled-preset]').selectOption('Sunset');
  await page.locator('.wled-power').click();
  await expect.poll(async () => page.evaluate(() =>
    window.__haCommands.filter(c => c.type === 'call_service').length)).toBeGreaterThanOrEqual(4);
  const commands = await page.evaluate(() => window.__haCommands.filter(c => c.type === 'call_service'));
  expect(commands).toEqual(expect.arrayContaining([
    expect.objectContaining({
      domain: 'light', service: 'turn_on',
      target: { entity_id: 'light.wled_test' },
      service_data: { rgb_color: [255, 51, 79] },
    }),
    expect.objectContaining({
      domain: 'light', service: 'turn_on',
      target: { entity_id: 'light.wled_test' },
      service_data: { effect: 'Rainbow' },
    }),
    expect.objectContaining({
      domain: 'select', service: 'select_option',
      target: { entity_id: 'select.wled_test_preset' },
      service_data: { option: 'Sunset' },
    }),
    expect.objectContaining({
      domain: 'light', service: 'turn_off', target: { entity_id: 'light.wled_test' },
    }),
  ]));
  await page.locator('[data-act="wled-setup"]').click();
  await expect(page.locator('.wled-choose [data-wled-light]')).toHaveCount(2);
  await page.locator('.wled-choose [data-wled-light="light.regular"]').check();
  await expect(page.locator('.wled-card')).toHaveCount(1);
  await page.locator('.wled-choose [data-wled-light="light.wled_test"]').check();
  await expect(page.locator('.wled-card')).toHaveCount(2);
  await page.locator('#sheet .done-btn').click();
  await expect(page.locator('#sheet')).toBeHidden();
});
