import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for JobHunter Frontend Testing
 *
 * Multi-Browser Strategy:
 * - Chromium: Primary target (100% test coverage, every run)
 * - Firefox: CI/CD only (cross-browser validation)
 * - WebKit: CI/CD only (Safari-equivalent testing)
 *
 * Test Suite Timing (based on October 29, 2025 post-RSBuild test run):
 * - E2E Tests: 15.9 minutes reported / 11 min wall clock (529 tests, 4 workers)
 * - Recommended CI/CD Timeout: 20 minutes (with 20.5% buffer)
 * - Global Timeout: 20 minutes (adequate for CI/CD variability)
 */
export default defineConfig({
  // Test directory structure
  testDir: './e2e/tests',

  // Maximum time one test can run
  timeout: 30 * 1000, // 30 seconds per test

  // Global timeout for entire test suite (all tests must complete within this time)
  globalTimeout: 20 * 60 * 1000, // 20 minutes (safety buffer for CI/CD)

  // Test execution settings
  fullyParallel: true,
  workers: process.env.CI ? 4 : 4, // 4 parallel workers
  retries: process.env.CI ? 2 : 1, // Retry flaky tests
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],

  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:3000',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Maximum time for each action (click, fill, etc.)
    actionTimeout: 10 * 1000,

    // Navigation timeout
    navigationTimeout: 30 * 1000,
  },

  // Test projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
      // Only run in CI or when explicitly requested
      testIgnore: process.env.CI ? undefined : /.*/,
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
      // Only run in CI or when explicitly requested
      testIgnore: process.env.CI ? undefined : /.*/,
    },

    // Mobile viewports for responsive testing
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/08-responsive-design.spec.ts', // Only responsive tests
    },

    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      testMatch: '**/08-responsive-design.spec.ts', // Only responsive tests
      testIgnore: process.env.CI ? undefined : /.*/,
    },
  ],

  // Web server configuration - start dev server before tests
  webServer: {
    command: 'NODE_NO_WARNINGS=1 npm start',  // Suppress Node.js deprecation warnings (CRA webpack-dev-server)
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes to start
    stdout: 'ignore',
    stderr: 'pipe',  // Keep stderr for real errors
  },

  // Output folder for test artifacts
  outputDir: 'test-results/',

  // Global setup/teardown
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/global-teardown.ts'),
});
