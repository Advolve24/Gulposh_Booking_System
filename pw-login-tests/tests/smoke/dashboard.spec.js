const { test, expect } = require('@playwright/test');

test('Admin can access dashboard', async ({ page }) => {

  await page.goto('https://gulposhadminsystem.netlify.app/dashboard');

  await expect(page).not.toHaveURL(/login/i);

  await expect(page).toHaveURL(/dashboard/i);

  await expect(
    page.getByText(/block/i)
  ).toBeVisible();

});
