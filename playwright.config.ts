import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: 'http://localhost:5501',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Auth setup — runs first, saves storageState for other projects
    { name: 'setup', testMatch: /global-setup\.ts/, teardown: 'teardown' },
    { name: 'teardown', testMatch: /global-teardown\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      command: 'cd server && npm run dev',
      port: 5500,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        NODE_ENV: 'test',
        DATABASE_URL: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || '',
        JWT_SECRET: process.env.JWT_SECRET_TEST || 'test-jwt-secret-minimum16chars',
        SERVER_PORT: '5500',
        CLIENT_URL: 'http://localhost:5501',
      },
    },
    {
      command: 'cd client && npm run dev -- --port 5501',
      port: 5501,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
