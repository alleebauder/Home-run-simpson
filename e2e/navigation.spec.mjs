import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // No real Home Assistant connection or external weather services in QA.
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  await page.goto('/');
  await expect(page.locator('#dock [data-app="cal"]')).toBeVisible();
});

test('Calendar opens, switches all views, navigates dates and closes repeatedly', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.locator('#dock [data-app="cal"]').click();
    await expect(page.locator('#sheet')).toBeVisible();
    await expect(page.locator('#sheet h1')).toHaveText('Calendar');
    await expect(page.locator('#sheet [data-act="cal-view"]')).toHaveCount(3);
    for (const view of ['day', 'week', 'list']) {
      await page.locator('#sheet [data-act="cal-view"][data-view="' + view + '"]').click();
      await expect(page.locator('#sheet [data-view="' + view + '"]')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#sheet')).toBeVisible();
    }
    await page.locator('#sheet [data-view="week"]').click();
    await page.locator('#sheet [data-act="cal-move"][data-dir="1"]').click();
    await page.locator('#sheet [data-act="cal-move"][data-dir="-1"]').click();
    await page.locator('#sheet .done-btn').click();
    await expect(page.locator('#sheet')).toBeHidden();
    await expect(page.locator('#dock')).toBeVisible();
    expect(await page.locator('.app').evaluate((el) => el.inert)).toBe(false);
  }
  expect(errors).toEqual([]);
});

test('every dock application can open and close without trapping the home screen', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const names = await page.locator('#dock button[data-app]').evaluateAll((buttons) =>
    buttons.map((el) => el.dataset.app));
  expect(names).toContain('cal');
  for (const name of names) {
    await page.locator('#dock [data-app="' + name + '"]').click();
    await expect(page.locator('#sheet')).toBeVisible();
    await expect(page.locator('#sheet .done-btn')).toBeVisible();
    await page.locator('#sheet .done-btn').click();
    await expect(page.locator('#sheet')).toBeHidden();
    expect(await page.locator('.app').evaluate((el) => el.inert)).toBe(false);
  }
  expect(errors).toEqual([]);
});

test('a Calendar rendering exception never freezes navigation', async ({ page }) => {
  // Make an otherwise valid Calendar rendering throw synchronously.
  // App must roll back the modal and restore the home dock.
  await page.evaluate(() => {
    window.__originalDateFormat = Date.prototype.toLocaleDateString;
    Date.prototype.toLocaleDateString = function () { throw Error('QA: deliberate calendar render error'); };
  });
  await page.locator('#dock [data-app="cal"]').click();
  await expect(page.locator('#sheet')).toBeHidden();
  expect(await page.locator('.app').evaluate((el) => el.inert)).toBe(false);
  await page.evaluate(() => {
    Date.prototype.toLocaleDateString = window.__originalDateFormat;
  });
  await page.locator('#dock [data-app="home"]').click();
  await expect(page.locator('#sheet h1')).toHaveText('Home');
  await page.locator('#sheet .done-btn').click();
  await expect(page.locator('#sheet')).toBeHidden();
});

test('Assistant and Calendar interoperate across reopen cycles', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (let i = 0; i < 2; i++) {
    await page.locator('#top [data-app="assist"]').click();
    await expect(page.locator('#sheet')).toBeVisible();
    await page.locator('#sheet .done-btn').click();
    await expect(page.locator('#sheet')).toBeHidden();
    await page.locator('#dock [data-app="cal"]').click();
    await expect(page.locator('#sheet h1')).toHaveText('Calendar');
    await page.locator('#sheet .done-btn').click();
    await expect(page.locator('#sheet')).toBeHidden();
  }
  expect(errors).toEqual([]);
});
