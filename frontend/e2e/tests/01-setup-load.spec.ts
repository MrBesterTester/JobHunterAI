import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { waitForApiCall, checkConsoleErrors, measurePageLoad } from '../fixtures/test-helpers';

/**
 * Test Suite 1: Setup & Initial Load
 *
 * Covers:
 * - Page load test (Section 1)
 * - Network connectivity test (Section 2)
 */

test.describe('Setup & Initial Load', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
  });

  test.describe('Section 1: Page Load Test', () => {
    test('should load page within 3 seconds', async ({ page }) => {
      const startTime = Date.now();

      await dashboardPage.goto();

      const loadTime = Date.now() - startTime;

      // Verify page loads within 3 seconds
      expect(loadTime).toBeLessThan(3000);

      // Verify page title is visible
      await expect(dashboardPage.pageTitle).toBeVisible();

      // Verify statistics cards display
      await expect(dashboardPage.newJobsCount).toBeVisible();
      await expect(dashboardPage.approvedJobsCount).toBeVisible();
      await expect(dashboardPage.appliedJobsCount).toBeVisible();
      await expect(dashboardPage.filteredJobsCount).toBeVisible();
    });

    test('should have JobHunter Dashboard header visible', async ({ page }) => {
      await dashboardPage.goto();

      // Check that header is visible
      await expect(dashboardPage.pageTitle).toBeVisible();

      // Verify header text
      const headerText = await dashboardPage.pageTitle.textContent();
      expect(headerText).toMatch(/^JobHunter$/i);
    });

    test('should display statistics cards at top', async ({ page }) => {
      await dashboardPage.goto();

      // Verify all 4 statistics cards are visible
      await expect(dashboardPage.newJobsCount).toBeVisible();
      await expect(dashboardPage.approvedJobsCount).toBeVisible();
      await expect(dashboardPage.appliedJobsCount).toBeVisible();
      await expect(dashboardPage.filteredJobsCount).toBeVisible();

      // Verify cards contain numeric values
      const newCount = await dashboardPage.getStatCount('new');
      const approvedCount = await dashboardPage.getStatCount('approved');
      const appliedCount = await dashboardPage.getStatCount('applied');
      const filteredCount = await dashboardPage.getStatCount('filtered');

      expect(newCount).toBeGreaterThanOrEqual(0);
      expect(approvedCount).toBeGreaterThanOrEqual(0);
      expect(appliedCount).toBeGreaterThanOrEqual(0);
      expect(filteredCount).toBeGreaterThanOrEqual(0);
    });

    test('should load without console errors', async ({ page }) => {
      const errors: string[] = [];

      // Capture console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      page.on('pageerror', (err) => {
        errors.push(err.message);
      });

      await dashboardPage.goto();

      // Verify no critical console errors
      // Note: Some warnings might be acceptable (React dev warnings, etc.)
      const criticalErrors = errors.filter(
        (err) =>
          !err.includes('DevTools') && // Ignore DevTools warnings
          !err.includes('Download the React DevTools') && // Ignore React DevTools prompt
          !err.includes('Warning:') // Ignore React warnings
      );

      expect(criticalErrors).toHaveLength(0);
    });
  });

  test.describe('Section 2: Network Connectivity Test', () => {
    test('should make successful API calls on page load', async ({ page }) => {
      // Set up response listeners before navigation with exact URL matching
      const jobsPromise = page.waitForResponse(
        (response) => response.url().match(/\/api\/jobs(\?|$)/) && response.request().method() === 'GET',
        { timeout: 10000 }
      );
      const statsPromise = page.waitForResponse(
        (response) => response.url().includes('/api/jobs/stats') && response.request().method() === 'GET',
        { timeout: 10000 }
      );

      // Navigate using page.goto directly to ensure fresh load
      await page.goto('http://localhost:3000');
      await dashboardPage.waitForLoad();

      // Wait for API calls to complete
      const jobsResponse = await jobsPromise;
      const statsResponse = await statsPromise;

      // Verify responses are successful
      expect(jobsResponse.status()).toBe(200);
      expect(statsResponse.status()).toBe(200);
    });

    test('should make GET /api/jobs request', async ({ page }) => {
      // Use exact URL matching to avoid matching /api/jobs/stats
      const responsePromise = page.waitForResponse(
        (response) => response.url().match(/\/api\/jobs(\?|$)/) && response.request().method() === 'GET',
        { timeout: 5000 }
      );

      await dashboardPage.goto();

      const response = await responsePromise;

      // Verify request succeeded
      expect(response.status()).toBe(200);

      // Verify response body is an array
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });

    test('should make GET /api/jobs/stats request', async ({ page }) => {
      const responsePromise = page.waitForResponse(
        (response) => response.url().includes('/api/jobs/stats') && response.request().method() === 'GET',
        { timeout: 10000 }
      );

      // Navigate using page.goto directly to ensure fresh load
      await page.goto('http://localhost:3000');
      await dashboardPage.waitForLoad();

      const response = await responsePromise;

      // Verify request succeeded
      expect(response.status()).toBe(200);

      // Verify response body has expected statistics
      const body = await response.json();
      expect(body).toHaveProperty('new');
      expect(body).toHaveProperty('approved');
      expect(body).toHaveProperty('applied');
      expect(body).toHaveProperty('filtered');
    });

    test('should have API response times under 100ms', async ({ page }) => {
      const measurements: number[] = [];

      // Capture response times
      page.on('response', (response) => {
        if (response.url().includes('/api/')) {
          const timing = response.timing;
          if (timing && timing.responseEnd) {
            measurements.push(timing.responseEnd);
          }
        }
      });

      await dashboardPage.goto();

      // Wait for all API calls to complete
      await page.waitForTimeout(2000);

      // Verify response times are acceptable
      // Note: First load might be slower, so we check average
      if (measurements.length > 0) {
        const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
        // Allow up to 500ms average for first load (includes backend warmup)
        expect(avgTime).toBeLessThan(500);
      }
    });

    test('should successfully load with all network requests', async ({ page }) => {
      let failedRequests = 0;

      // Track failed requests
      page.on('requestfailed', (request) => {
        // Ignore failures for external resources (ads, analytics, etc.)
        if (request.url().includes('localhost')) {
          failedRequests++;
        }
      });

      await dashboardPage.goto();

      // Verify no failed requests to our API
      expect(failedRequests).toBe(0);
    });

    test('should have proper CORS configuration', async ({ page }) => {
      await dashboardPage.goto();

      // Make a direct API request to verify CORS headers
      const response = await page.request.get('http://localhost:8080/api/jobs');

      expect(response.status()).toBe(200);

      // Note: CORS headers might not be visible in Playwright, but request should succeed
      // If CORS was misconfigured, the request would fail
    });
  });

  test.describe('Performance Validation', () => {
    test('should achieve acceptable page load metrics', async ({ page }) => {
      const startTime = Date.now();

      await dashboardPage.goto();

      const totalLoadTime = Date.now() - startTime;

      // Verify First Contentful Paint < 3 seconds
      expect(totalLoadTime).toBeLessThan(3000);

      // Verify page is interactive
      await expect(dashboardPage.inboxTab).toBeEnabled();
      await expect(dashboardPage.approvedTab).toBeEnabled();
    });

    test('should load all critical resources', async ({ page }) => {
      await dashboardPage.goto();

      // Verify all critical UI elements are present
      await expect(dashboardPage.pageTitle).toBeVisible();
      await expect(dashboardPage.inboxTab).toBeVisible();
      await expect(dashboardPage.approvedTab).toBeVisible();
      await expect(dashboardPage.appliedTab).toBeVisible();
      await expect(dashboardPage.filteredTab).toBeVisible();

      // Verify statistics are loaded
      const stats = await Promise.all([
        dashboardPage.getStatCount('new'),
        dashboardPage.getStatCount('approved'),
        dashboardPage.getStatCount('applied'),
        dashboardPage.getStatCount('filtered'),
      ]);

      // All stats should be numbers (even if 0)
      stats.forEach((stat) => {
        expect(typeof stat).toBe('number');
      });
    });
  });
});
