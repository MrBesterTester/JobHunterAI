import { Page, expect, APIRequestContext } from '@playwright/test';
import { Job } from './test-data';

/**
 * Test Helper Utilities for JobHunter E2E Tests
 *
 * Provides utility functions for common test operations
 */

/**
 * Setup: Clear all jobs and insert test data
 */
export async function seedTestData(request: APIRequestContext, jobs: Job[]) {
  // Note: This assumes the backend has test endpoints for seeding data
  // If not, we'll need to use the regular API endpoints
  for (const job of jobs) {
    await request.post('http://localhost:8080/api/jobs', {
      data: job,
    });
  }
}

/**
 * Cleanup: Remove all test jobs
 */
export async function cleanupTestData(request: APIRequestContext) {
  // Delete all jobs (if test endpoint exists)
  // await request.delete('http://localhost:8080/api/test/jobs');
}

/**
 * Wait for API request to complete
 */
export async function waitForApiCall(page: Page, urlPattern: string | RegExp, method: string = 'GET') {
  return await page.waitForResponse(
    (response) => {
      const url = response.url();
      const matchesUrl = typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url);
      return matchesUrl && response.request().method() === method;
    },
    { timeout: 5000 }
  );
}

/**
 * Wait for multiple API calls to complete
 */
export async function waitForMultipleApiCalls(page: Page, patterns: Array<{ url: string | RegExp; method?: string }>) {
  const promises = patterns.map((pattern) =>
    waitForApiCall(page, pattern.url, pattern.method || 'GET')
  );
  await Promise.all(promises);
}

/**
 * Intercept API responses for testing error handling
 */
export async function interceptApiResponse(page: Page, urlPattern: string, statusCode: number, body?: any) {
  await page.route(urlPattern, async (route) => {
    await route.fulfill({
      status: statusCode,
      body: body ? JSON.stringify(body) : undefined,
    });
  });
}

/**
 * Simulate API failure
 */
export async function simulateApiFailure(page: Page, urlPattern: string) {
  await page.route(urlPattern, async (route) => {
    await route.abort('failed');
  });
}

/**
 * Simulate slow API response
 */
export async function simulateSlowApiResponse(page: Page, urlPattern: string, delayMs: number) {
  await page.route(urlPattern, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.continue();
  });
}

/**
 * Check for console errors
 */
export async function checkConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    errors.push(err.message);
  });

  return errors;
}

/**
 * Take screenshot with custom name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Wait for element to be stable (no animations)
 */
export async function waitForStable(page: Page, selector: string) {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  // Wait for animations to complete
  await page.waitForTimeout(300);
}

/**
 * Verify API request was made with correct payload
 */
export async function verifyApiRequest(
  page: Page,
  urlPattern: string | RegExp,
  method: string,
  expectedPayload?: any
) {
  const request = await page.waitForRequest(
    (req) => {
      const url = req.url();
      const matchesUrl = typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url);
      return matchesUrl && req.method() === method;
    },
    { timeout: 5000 }
  );

  if (expectedPayload) {
    const postData = request.postDataJSON();
    expect(postData).toMatchObject(expectedPayload);
  }

  return request;
}

/**
 * Get all network requests made during a callback
 */
export async function captureRequests(page: Page, callback: () => Promise<void>): Promise<string[]> {
  const requests: string[] = [];

  const handler = (req: any) => {
    requests.push(`${req.method()} ${req.url()}`);
  };

  page.on('request', handler);

  await callback();

  page.off('request', handler);

  return requests;
}

/**
 * Verify page performance metrics
 */
export async function measurePageLoad(page: Page): Promise<{
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
}> {
  const performanceTiming = JSON.parse(
    await page.evaluate(() => JSON.stringify(window.performance.timing))
  );

  return {
    loadTime: performanceTiming.loadEventEnd - performanceTiming.navigationStart,
    domContentLoaded: performanceTiming.domContentLoadedEventEnd - performanceTiming.navigationStart,
    firstContentfulPaint: performanceTiming.responseStart - performanceTiming.navigationStart,
  };
}

/**
 * Wait for React to finish rendering
 */
export async function waitForReact(page: Page) {
  // Wait for React's hydration to complete
  await page.waitForFunction(() => {
    return (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ !== undefined;
  }, { timeout: 5000 }).catch(() => {
    // React DevTools hook might not be available, just continue
  });

  // Additional wait for any pending state updates
  await page.waitForTimeout(500);
}

/**
 * Verify accessibility: Check for ARIA labels
 */
export async function verifyAccessibility(page: Page, selector: string) {
  const element = page.locator(selector);
  await expect(element).toBeVisible();

  // Check for accessible name (aria-label, aria-labelledby, or text content)
  const ariaLabel = await element.getAttribute('aria-label');
  const ariaLabelledBy = await element.getAttribute('aria-labelledby');
  const textContent = await element.textContent();

  expect(ariaLabel || ariaLabelledBy || textContent).toBeTruthy();
}

/**
 * Simulate keyboard navigation
 */
export async function navigateByKeyboard(page: Page, keys: string[]) {
  for (const key of keys) {
    await page.keyboard.press(key);
    await page.waitForTimeout(100); // Brief pause between keys
  }
}

/**
 * Check if element has focus
 */
export async function isFocused(page: Page, selector: string): Promise<boolean> {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    return document.activeElement === element;
  }, selector);
}

/**
 * Get computed style of element
 */
export async function getComputedStyle(page: Page, selector: string, property: string): Promise<string> {
  return await page.evaluate(
    ({ sel, prop }) => {
      const element = document.querySelector(sel);
      if (!element) return '';
      return window.getComputedStyle(element).getPropertyValue(prop);
    },
    { sel: selector, prop: property }
  );
}

/**
 * Verify responsive breakpoint
 */
export async function setViewportSize(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  // Wait for responsive changes to take effect
  await page.waitForTimeout(300);
}

/**
 * Common viewport sizes
 */
export const viewportSizes = {
  mobile: { width: 375, height: 667 }, // iPhone SE
  tablet: { width: 768, height: 1024 }, // iPad
  desktop: { width: 1920, height: 1080 }, // Full HD
  wide: { width: 2560, height: 1440 }, // 2K
};

/**
 * Wait for page to be fully loaded (no network activity)
 */
export async function waitForPageIdle(page: Page) {
  await page.waitForLoadState('networkidle');
}

/**
 * Retry an action until it succeeds or timeout
 */
export async function retryAction<T>(
  action: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Action failed after retries');
}

/**
 * Generate unique test ID
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// Score Testing Helpers
// =============================================================================

/**
 * Score range configuration
 * Maps test job IDs to expected score ranges (±5 points tolerance)
 */
export const expectedScoreRanges: Record<string, { min: number; max: number; expected: number }> = {
  'test-job-1': { min: 78.95, max: 88.95, expected: 83.95 },  // highSalaryRemoteJob
  'test-job-2': { min: 43.70, max: 53.70, expected: 48.70 },  // lowSalaryJob (filtered)
  'test-job-3': { min: 69.80, max: 79.80, expected: 74.80 },  // testingJob
  'test-job-4': { min: 78.50, max: 88.50, expected: 83.50 },  // firmwareJob
  'test-job-5': { min: 83.60, max: 93.60, expected: 88.60 },  // approvedJob
  'test-job-6': { min: 87.05, max: 97.05, expected: 92.05 },  // appliedJob
  'test-job-7': { min: 54.70, max: 64.70, expected: 59.70 },  // longCommuteJob (filtered)
  'test-job-8': { min: 52.80, max: 62.80, expected: 57.80 },  // nonMatchingDomainJob (filtered)
  'test-job-9': { min: 31.75, max: 41.75, expected: 36.75 },  // multipleFilterReasonsJob (filtered)
  'test-job-10': { min: 85.00, max: 95.00, expected: 90.00 }, // aiJob
};

/**
 * Assert that a score falls within the expected range
 *
 * Usage:
 *   const score = await getJobScore(page, 'test-job-1');
 *   assertScoreInRange(score, 'test-job-1');
 *
 * @param actualScore - The score to check
 * @param jobId - The test job ID
 * @throws Error if score is outside expected range
 */
export function assertScoreInRange(actualScore: number, jobId: string): void {
  const range = expectedScoreRanges[jobId];
  if (!range) {
    throw new Error(`No score range defined for job ID: ${jobId}`);
  }

  if (actualScore < range.min || actualScore > range.max) {
    throw new Error(
      `Score ${actualScore} for ${jobId} is outside expected range [${range.min}, ${range.max}] (expected: ${range.expected})`
    );
  }
}

/**
 * Get the expected score range for a test job
 *
 * Usage:
 *   const range = getScoreRange('test-job-1');
 *   expect(actualScore).toBeGreaterThanOrEqual(range.min);
 *   expect(actualScore).toBeLessThanOrEqual(range.max);
 *
 * @param jobId - The test job ID
 * @returns Score range object with min, max, and expected values
 */
export function getScoreRange(jobId: string): { min: number; max: number; expected: number } {
  const range = expectedScoreRanges[jobId];
  if (!range) {
    throw new Error(`No score range defined for job ID: ${jobId}`);
  }
  return range;
}

/**
 * Seed test scores into database
 * Call this during test setup to prevent 404 errors from score API
 *
 * Usage:
 *   test.beforeAll(async ({ request }) => {
 *     await seedTestScores(request);
 *   });
 *
 * @param request - Playwright API request context
 */
export async function seedTestScores(request: APIRequestContext): Promise<void> {
  // Execute SQL seed script via backend
  // Note: This assumes the backend has a test endpoint for executing SQL
  // If not available, we'll need to use psql directly or create the endpoint

  try {
    // Option 1: Try backend test endpoint (if exists)
    const response = await request.post('http://localhost:8080/api/test/seed-scores', {
      timeout: 10000,
    });

    if (response.ok()) {
      console.log('✅ Test scores seeded via backend endpoint');
      return;
    }
  } catch (error) {
    // Backend endpoint doesn't exist, fall back to psql
  }

  // Option 2: Execute SQL directly via psql
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  const path = require('path');

  try {
    const sqlFile = path.join(__dirname, 'seed-test-scores.sql');
    const dbName = process.env.DATABASE_NAME || 'jobhunter_personal';
    const dbUser = process.env.DATABASE_USER || 'jobhunter_user';

    await execAsync(`psql -U ${dbUser} -d ${dbName} -f ${sqlFile}`, {
      env: { ...process.env, PGPASSWORD: process.env.DATABASE_PASSWORD || 'jobhunter_dev_password' },
    });

    console.log('✅ Test scores seeded via psql');
  } catch (error) {
    console.error('❌ Failed to seed test scores:', error);
    throw new Error(`Failed to seed test scores: ${error}`);
  }
}
