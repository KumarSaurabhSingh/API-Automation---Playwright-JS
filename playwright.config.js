const { defineConfig } = require('@playwright/test');
const env = require('./src/config/env');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.js/,
  outputDir: 'reports/test-results',

  fullyParallel: true,
  forbidOnly: env.isCI,
  retries: env.isCI ? 1 : 0,
  workers: env.workers,

  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  globalTimeout: 15 * 60 * 1000,

  reporter: [
    ['list'],
    ['./src/reporters/SummaryReporter.js', { outputFile: 'reports/summary.md' }],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
  ],

  use: {
    baseURL: env.baseUrl,
    extraHTTPHeaders: {
      Accept: env.defaults.accept,
      'User-Agent': env.defaults.userAgent,
    },
    ignoreHTTPSErrors: true,
  },

  globalSetup: require.resolve('./src/setup/global-setup.js'),
  globalTeardown: require.resolve('./src/setup/global-teardown.js'),

  metadata: {
    environment: env.name,
    api: env.baseUrl,
    framework: 'playwright-api-automation',
  },

  projects: [
    {
      name: 'api',
      testMatch: /.*\.spec\.js/,
    },
  ],
});
