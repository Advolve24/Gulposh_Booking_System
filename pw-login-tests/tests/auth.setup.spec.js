const { test, expect } = require('@playwright/test');
require('dotenv').config();

test('Save admin login session', async ({ page }) => {
  test.setTimeout(60000);

  await page.goto('https://gulposhadminsystem.netlify.app/login');

  await page.fill('input[type="email"]', process.env.LOGIN_USERNAME);
  await page.fill('input[type="password"]', process.env.LOGIN_PASSWORD);

  await page.click('button[type="submit"]');

  // SPA-safe wait
  await page.waitForURL(/dashboard|admin|home/i, {
    timeout: 30000,
  });

  await expect(page).toHaveURL(/dashboard|admin|home/i);

  await page.context().storageState({
    path: 'playwright/.auth/admin.json',
  });
});
