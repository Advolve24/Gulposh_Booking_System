const { test, expect } = require('@playwright/test');

test('Login with username & password', async ({ page }) => {
  await page.goto('https://gulposhadminsystem.netlify.app/dashboard');

  await expect(page).toHaveURL(/dashboard/i);
});
