import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';

/**
 * Load .env.playwright for reliable environment variable propagation to workers
 *
 * ISSUE-056: Playwright workers don't reliably inherit env vars from spawn() on all platforms.
 * The test orchestrator writes .env.playwright before running tests, and we load it here
 * using dotenv (which sets env vars at Node.js level before workers spawn).
 *
 * Using dotenv.config() ensures environment variables are set at a low enough level
 * that Node.js child processes (Playwright workers) inherit them reliably.
 */
const envFile = path.join(__dirname, '.env.playwright');
const result = dotenv.config({ path: envFile, override: true });

if (!result.error && result.parsed) {
  console.log('🎭 Playwright: Loaded .env.playwright for worker process propagation');
  Object.entries(result.parsed).forEach(([key, value]) => {
    console.log(`  ✅ Set ${key}=${value}`);
  });
}


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
  // ISSUE-056: Load-aware timeout - comprehensive tests need longer due to 4 parallel workers
  timeout: process.env.COMPREHENSIVE_TESTS ? 90 * 1000 : 30 * 1000,

  // Global timeout for entire test suite (all tests must complete within this time)
  globalTimeout: 20 * 60 * 1000, // 20 minutes (safety buffer for CI/CD)

  // Test execution settings
  fullyParallel: true,
  workers: 1, // ISSUE-064: Single worker for deterministic execution
  retries: process.env.CI ? 2 : 1, // Retry flaky tests
  reporter: [
    ['html', { open: 'never' }],  // Generate HTML report but don't auto-serve it
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
    // ISSUE-056: Load-aware timeout - comprehensive tests need longer timeouts due to 4 parallel workers
    // ISSUE-063: Increased from 60s to 120s to accommodate Gmail sync operations that take >60s under load
    actionTimeout: process.env.COMPREHENSIVE_TESTS ? 120 * 1000 : 10 * 1000,

    // Navigation timeout
    // ISSUE-056: Load-aware timeout - comprehensive tests need longer timeouts due to 4 parallel workers
    navigationTimeout: process.env.COMPREHENSIVE_TESTS ? 60 * 1000 : 30 * 1000,
  },

  // 4-Project Architecture for Deterministic Test Execution (ISSUE-064 Option 6)
  // Projects run in strict sequence: project-1 → project-2 → project-3 → project-4
  // Tests within each project run serially (fullyParallel: false, workers: 1)
  // Only 1 test runs at any moment across entire suite (true serial execution)
  // This ensures predictable execution order and stable database state
  projects: [
    // ========================================
    // PROJECT 1: READ-ONLY TESTS (26 files)
    // ========================================
    // User Journey: "I open the app, navigate around, explore features, review jobs"
    // Database State: Read-only validation, no modifications
    {
      name: 'project-1-read-only',
      fullyParallel: false,  // Serial execution within project
      workers: 1,  // ISSUE-064: Force single worker for true serial execution (database stability)
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: [
        // 1. INITIAL SETUP: App loads, basic navigation
        '**/01-setup-load.spec.ts',
        '**/02-tab-navigation.spec.ts',

        // 2. JOB DISCOVERY: Dashboard overview
        '**/06-statistics.spec.ts',
        '**/07-dashboard-statistics.spec.ts',

        // 3. JOB FILTERING: Find relevant jobs
        '**/07-filtered-jobs.spec.ts',
        '**/08-failed-duplicates-tabs.spec.ts',
        '**/99b-filtered-tab-test.spec.ts',

        // 4. JOB REVIEW: Individual job details
        '**/05-job-details.spec.ts',
        '**/17-job-card-summary.spec.ts',

        // 5. JOB EVALUATION: Quality assessment
        '**/27-job-scoring-system.spec.ts',
        '**/05-job-tradeoff-display.spec.ts',

        // 6. BADGES & INDICATORS: Visual information
        '**/05b-new-job-badges.spec.ts',
        '**/06-job-badge-styling.spec.ts',
        '**/26-extraction-method-badges.spec.ts',
        '**/99-extraction-method-badge-test.spec.ts',

        // 7. DESCRIPTIONS: Read job descriptions
        '**/19-condensed-description.spec.ts',

        // 8. ACTIVITY TRACKING: Timeline & follow-ups
        '**/14-timeline-view.spec.ts',
        '**/13-follow-ups-management.spec.ts',

        // 9. DEBUG & ERROR HANDLING: App reliability
        '**/18-debug-section.spec.ts',
        '**/09-error-handling.spec.ts',

        // 10. QUALITY CHECKS: Performance & accessibility
        '**/10-performance.spec.ts',
        '**/10-performance-debug.spec.ts',
        '**/11-accessibility.spec.ts',

        // 11. UI POLISH: Scrolling, responsive design
        '**/20-modal-scrolling.spec.ts',
        '**/21-scroll-stability.spec.ts',
        '**/08-responsive-design.spec.ts',
      ],
    },

    // ========================================
    // PROJECT 2: STATE-MODIFYING TESTS (11 files)
    // ========================================
    // User Journey: "I refresh data, approve/reject jobs, schedule interviews, send emails"
    // Database State: Job status changes, application records, calendar events
    {
      name: 'project-2-state-modifying',
      fullyParallel: false,  // Serial execution within project
      workers: 1,  // ISSUE-064: Force single worker for true serial execution (database stability)
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: [
        // 1. DATA REFRESH: Get latest data before taking actions
        '**/22-refresh-buttons.spec.ts',
        '**/24-refresh-data-button.spec.ts',

        // 2. JOB ACTIONS: Core workflow - approve/reject
        '**/03-job-status-updates.spec.ts',
        '**/05-phase-3.1.5-testing-refinement.spec.ts',
        '**/25-refilter-jobs.spec.ts',

        // 3. INTERVIEW SCHEDULING: Next step after approval
        '**/12-calendar-management.spec.ts',

        // 4. EMAIL COMMUNICATION: Reach out to companies
        '**/15-email-composer.spec.ts',
        '**/20-gmail-send-integration.spec.ts',

        // 5. EMAIL MANAGEMENT: Organize inbox
        '**/17-gmail-label-management.spec.ts',
        '**/18-gmail-junk-cleanup.spec.ts',
      ],
      dependencies: ['project-1-read-only'],  // Wait for read-only tests
    },

    // ========================================
    // PROJECT 3: INTEGRATION TESTS (5 files)
    // ========================================
    // User Journey: "I check intake tab, sync Gmail/MS Mail, pull from job boards"
    // Database State: External data ingestion, new job records from APIs
    {
      name: 'project-3-integration',
      fullyParallel: false,  // Serial execution within project
      workers: 1,  // ISSUE-064: Force single worker for true serial execution (database stability)
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: [
        // 1. INTAKE TAB: Where external jobs first appear
        '**/15-intake-tab.spec.ts',

        // 2. EMAIL INTEGRATIONS: Sync from email
        '**/16-gmail-sync-integration.spec.ts',
        '**/16-microsoft-email-integration.spec.ts',

        // 3. JOB BOARD INTEGRATIONS: External APIs
        '**/28-rapidapi-sync-integration.spec.ts',

        // 4. CONTENT INTEGRATION: External content generation
        '**/04-content-generation-integration.spec.ts',
      ],
      dependencies: ['project-2-state-modifying'],
    },

    // ========================================
    // PROJECT 4: LLM & PERFORMANCE TESTS (2 files)
    // ========================================
    // User Journey: "I generate cover letter and resume, ensure quality"
    // Database State: LLM-generated content (cover letters, descriptions)
    {
      name: 'project-4-llm-performance',
      fullyParallel: false,  // Serial execution within project
      workers: 1,  // ISSUE-064: Force single worker for true serial execution (database stability)
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: [
        // 1. CONTENT GENERATION: Create application materials
        '**/04-content-generation.spec.ts',

        // 2. QUALITY VALIDATION: Ensure output quality
        '**/23-description-quality.spec.ts',
      ],
      dependencies: ['project-3-integration'],
    },

    // ========================================
    // CROSS-BROWSER TESTING (CI/CD only)
    // ========================================
    // Firefox and WebKit projects run after all 4 main projects complete
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
      // Only run in CI or when explicitly requested
      testIgnore: process.env.CI ? undefined : /.*/,
      // Wait for all 4 main projects to complete first
      dependencies: ['project-4-llm-performance'],
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
      // Only run in CI or when explicitly requested
      testIgnore: process.env.CI ? undefined : /.*/,
      // Wait for all 4 main projects to complete first
      dependencies: ['project-4-llm-performance'],
    },

    // ========================================
    // MOBILE TESTING (CI/CD only)
    // ========================================
    // Mobile viewports for responsive testing
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/08-responsive-design.spec.ts', // Only responsive tests
      // Wait for all 4 main projects to complete first
      dependencies: ['project-4-llm-performance'],
    },

    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      testMatch: '**/08-responsive-design.spec.ts', // Only responsive tests
      testIgnore: process.env.CI ? undefined : /.*/,
      // Wait for all 4 main projects to complete first
      dependencies: ['project-4-llm-performance'],
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
