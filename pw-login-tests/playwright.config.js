import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  reporter: 'html',

  use: {
    headless: false,   // 👀 REQUIRED to see browser
    slowMo: 500,       // 🐢 THIS replaces --slow-mo
  },

  projects: [
    // 🔐 AUTH SETUP (RUNS ONCE)
    {
      name: 'setup',
      testMatch: /auth\.setup\.spec\.js/,
      use: {
        browserName: 'chromium',
      },
    },

    // 🧪 MAIN TESTS (USES SAVED SESSION)
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json',
      },
    },
  ],
});
