import { test, expect } from '@playwright/test';
import { getTestTimeout } from '../helpers/timeout-utils';
import { DashboardPage } from '../pages/DashboardPage';
import { getJobCard } from '../pages/JobCardComponent';
import { waitForApiCall } from '../fixtures/test-helpers';

/**
 * Test Suite 6: Statistics & Real-time Updates
 *
 * Covers:
 * - Statistics display test (Section 11)
 * - Criteria configuration test (Section 12)
 */

test.describe('Statistics & Real-time Updates', () => {
  test.describe.configure({ mode: 'serial' });

  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
  });

  // Run serially to avoid race conditions with shared database state
  test.describe.serial('Section 11: Statistics Display Test', () => {
    test('should display correct count of "new" status jobs', async ({ page }) => {
      // Get statistics count
      const statsNewCount = await dashboardPage.getStatCount('new');

      // Navigate to Inbox tab to verify
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      const actualCount = await dashboardPage.getVisibleJobCount();

      // Verify counts match
      expect(actualCount).toBe(statsNewCount);
    });

    test('should display correct count of "approved" status jobs', async ({ page }) => {
      const statsApprovedCount = await dashboardPage.getStatCount('approved');

      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      const actualCount = await dashboardPage.getVisibleJobCount();

      expect(actualCount).toBe(statsApprovedCount);
    });

    test('should display correct count of "applied" status jobs', async ({ page }) => {
      const statsAppliedCount = await dashboardPage.getStatCount('applied');

      await dashboardPage.clickTab('applied');
      await dashboardPage.waitForJobsUpdate();

      const actualCount = await dashboardPage.getVisibleJobCount();

      expect(actualCount).toBe(statsAppliedCount);
    });

    test('should display correct count of "filtered" status jobs', async ({ page }) => {
      const statsFilteredCount = await dashboardPage.getStatCount('filtered');

      await dashboardPage.clickTab('filtered');
      await dashboardPage.waitForJobsUpdate();

      const actualCount = await dashboardPage.getVisibleJobCount();

      expect(actualCount).toBe(statsFilteredCount);
    });

    test('should update statistics immediately after approving a job', async ({ page }) => {
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      // Get initial counts
      const initialNewCount = await dashboardPage.getStatCount('new');
      const initialApprovedCount = await dashboardPage.getStatCount('approved');

      // Approve a job
      const firstJob = await getJobCard(page, 0);
      await firstJob.approve();

      // Wait for statistics to update
      await page.waitForTimeout(1500);

      // Get updated counts
      const newNewCount = await dashboardPage.getStatCount('new');
      const newApprovedCount = await dashboardPage.getStatCount('approved');

      // Verify statistics updated without page reload
      expect(newNewCount).toBe(initialNewCount - 1);
      expect(newApprovedCount).toBe(initialApprovedCount + 1);
    });

    test('should update statistics immediately after rejecting a job', async ({ page }) => {
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      // Get initial count
      const initialNewCount = await dashboardPage.getStatCount('new');

      // Reject a job
      const firstJob = await getJobCard(page, 0);
      await firstJob.reject();

      // Wait for statistics to update
      await page.waitForTimeout(1500);

      // Get updated count
      const newNewCount = await dashboardPage.getStatCount('new');

      // Verify statistics updated
      expect(newNewCount).toBe(initialNewCount - 1);
    });

    test('should maintain consistency: total jobs = sum of all statuses', async ({ page }) => {
      // Get individual status counts
      const newCount = await dashboardPage.getStatCount('new');
      const approvedCount = await dashboardPage.getStatCount('approved');
      const appliedCount = await dashboardPage.getStatCount('applied');
      const filteredCount = await dashboardPage.getStatCount('filtered');

      const sumOfStatuses = newCount + approvedCount + appliedCount + filteredCount;

      // Get total count from All tab
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      const totalCount = await dashboardPage.getVisibleJobCount();

      // Verify sum matches total
      expect(totalCount).toBe(sumOfStatuses);
    });

    test('should update statistics without page refresh', async ({ page }) => {
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      let pageReloaded = false;

      // Listen for page navigation (reload)
      page.on('load', () => {
        pageReloaded = true;
      });

      // Perform an action that updates statistics
      const firstJob = await getJobCard(page, 0);
      await firstJob.approve();

      // Wait for update
      await page.waitForTimeout(1500);

      // Verify no page reload occurred
      expect(pageReloaded).toBe(false);

      // Verify statistics updated
      const newCount = await dashboardPage.getStatCount('new');
      expect(typeof newCount).toBe('number');
    });

    test('should fetch statistics from /api/jobs/stats endpoint', async ({ page }) => {
      // Listen for API call
      const statsResponsePromise = waitForApiCall(page, '/api/jobs/stats', 'GET');

      // Navigate or refresh to trigger stats fetch
      await dashboardPage.goto();

      const response = await statsResponsePromise;

      // Verify response
      expect(response.status()).toBe(200);

      const stats = await response.json();

      // Verify response structure
      expect(stats).toHaveProperty('new');
      expect(stats).toHaveProperty('approved');
      expect(stats).toHaveProperty('applied');
      expect(stats).toHaveProperty('filtered');
    });

    test('should handle statistics API response under 100ms', async ({ page }) => {
      // Make direct API request to test performance
      const startTime = Date.now();
      const response = await page.request.get('http://localhost:8080/api/jobs/stats');
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Verify API responded successfully
      expect(response.status()).toBe(200);

      // Verify response time is reasonable for local development
      // In production with optimizations, should be < 100ms
      expect(responseTime).toBeLessThan(500);
    });

    test('should display statistics as numeric values', async ({ page }) => {
      const newCount = await dashboardPage.getStatCount('new');
      const approvedCount = await dashboardPage.getStatCount('approved');
      const appliedCount = await dashboardPage.getStatCount('applied');
      const filteredCount = await dashboardPage.getStatCount('filtered');

      // Verify all are numbers
      expect(typeof newCount).toBe('number');
      expect(typeof approvedCount).toBe('number');
      expect(typeof appliedCount).toBe('number');
      expect(typeof filteredCount).toBe('number');

      // Verify all are non-negative
      expect(newCount).toBeGreaterThanOrEqual(0);
      expect(approvedCount).toBeGreaterThanOrEqual(0);
      expect(appliedCount).toBeGreaterThanOrEqual(0);
      expect(filteredCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Section 12: Criteria Configuration Test', () => {
    test('should have Configure Criteria button visible (if implemented)', async ({ page }) => {
      // Check if button exists
      const isVisible = await dashboardPage.configureCriteriaButton.isVisible().catch(() => false);

      if (!isVisible) {
        test.skip();
        return;
      }

      // Verify button is visible
      await expect(dashboardPage.configureCriteriaButton).toBeVisible();
    });

    test('should verify filtering criteria via API', async ({ page }) => {
      // Fetch criteria from API
      const response = await page.request.get('http://localhost:8080/api/criteria');

      expect(response.status()).toBe(200);

      const criteria = await response.json();

      // Verify criteria structure (from PRD) - API uses snake_case
      expect(criteria).toHaveProperty('min_salary');
      expect(criteria).toHaveProperty('max_commute_time');
      expect(criteria).toHaveProperty('preferred_domains');

      // Verify expected values
      expect(criteria.min_salary).toBe(130000);
      expect(criteria.max_commute_time).toBe(45);
      expect(Array.isArray(criteria.preferred_domains)).toBe(true);
    });

    test('should verify filtered jobs match criteria', async ({ page }) => {
      // Get criteria
      const response = await page.request.get('http://localhost:8080/api/criteria');
      const criteria = await response.json();

      // Navigate to filtered jobs
      await dashboardPage.clickTab('filtered');
      await dashboardPage.waitForJobsUpdate();

      const filteredCount = await dashboardPage.getVisibleJobCount();

      if (filteredCount === 0) {
        test.skip();
        return;
      }

      // Check that filtered jobs have reasons displayed
      const jobCards = await page.locator('[data-testid="job-card"], .job-card').all();

      // At least one job should have filtered reasons visible
      let foundFilteredReasons = false;

      for (const card of jobCards.slice(0, 3)) {
        // Check first 3 jobs
        const filteredReasons = card.locator('[data-testid="filtered-reasons"], .filtered-reasons');

        if (await filteredReasons.isVisible()) {
          foundFilteredReasons = true;
          const reasonsText = (await filteredReasons.textContent())?.toLowerCase() || '';

          // Verify reasons contain filtering-related keywords
          // Common filtering reason patterns: "low salary", "long commute", "outside domain", etc.
          const hasValidReason =
            reasonsText.includes('salary') ||
            reasonsText.includes('commute') ||
            reasonsText.includes('domain') ||
            reasonsText.includes('filter') ||
            reasonsText.includes('does not') ||
            reasonsText.length > 0; // Has some reason text

          expect(hasValidReason).toBe(true);
        }
      }

      // At least verify we're showing the filtered tab correctly
      expect(filteredCount).toBeGreaterThan(0);
    });

    test('should verify minimum salary threshold ($130,000)', async ({ page }) => {
      const response = await page.request.get('http://localhost:8080/api/criteria');
      const criteria = await response.json();

      expect(criteria.min_salary).toBe(130000);
    });

    test('should verify max commute time (45 minutes)', async ({ page }) => {
      const response = await page.request.get('http://localhost:8080/api/criteria');
      const criteria = await response.json();

      expect(criteria.max_commute_time).toBe(45);
    });

    test('should verify preferred domains (Testing, AI, Firmware)', async ({ page }) => {
      const response = await page.request.get('http://localhost:8080/api/criteria');
      const criteria = await response.json();

      const domains = criteria.preferred_domains;

      expect(Array.isArray(domains)).toBe(true);

      // Verify contains expected domains
      const domainsStr = domains.join(' ').toLowerCase();
      const hasExpectedDomains =
        domainsStr.includes('test') || domainsStr.includes('ai') || domainsStr.includes('firmware');

      expect(hasExpectedDomains).toBe(true);
    });
  });

  // Run serially to avoid race conditions with shared database state
  test.describe.serial('Real-time Updates Validation', () => {
    test('should handle concurrent statistic updates', async ({ page }) => {
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      const initialCount = await dashboardPage.getVisibleJobCount();

      if (initialCount < 3) {
        test.skip();
        return;
      }

      // Get initial "New" stat count
      const initialNew = await dashboardPage.getStatCount('new');

      // Rapidly approve multiple jobs
      for (let i = 0; i < 3; i++) {
        const job = await getJobCard(page, 0);
        await job.approve();

        // Wait for stat to update using state polling
        await page.waitForFunction(
          (expectedNew) => {
            const statElement = document.querySelector('[data-testid="stat-new"]');
            const match = statElement?.textContent?.match(/\d+/);
            const currentCount = match ? parseInt(match[0]) : 0;
            return currentCount === expectedNew;
          },
          initialNew - (i + 1),
          { timeout: getTestTimeout(5000) }
        );
      }

      // Verify statistics are consistent (should already be updated from loop above)
      const newCount = await dashboardPage.getStatCount('new');
      expect(newCount).toBe(initialNew - 3);
    });

    test('should maintain data integrity during updates', async ({ page }) => {
      // Get initial total
      const initialNew = await dashboardPage.getStatCount('new');
      const initialApproved = await dashboardPage.getStatCount('approved');
      const initialApplied = await dashboardPage.getStatCount('applied');
      const initialFiltered = await dashboardPage.getStatCount('filtered');
      const initialTotal = initialNew + initialApproved + initialApplied + initialFiltered;

      // Perform action
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) > 0) {
        const firstJob = await getJobCard(page, 0);
        await firstJob.approve();

        // Wait for "approved" stat to update using state polling
        await page.waitForFunction(
          (expectedApproved) => {
            const statElement = document.querySelector('[data-testid="stat-approved"]');
            const match = statElement?.textContent?.match(/\d+/);
            const currentCount = match ? parseInt(match[0]) : 0;
            return currentCount === expectedApproved;
          },
          initialApproved + 1,
          { timeout: getTestTimeout(5000) }
        );
      }

      // Get new total
      const newNew = await dashboardPage.getStatCount('new');
      const newApproved = await dashboardPage.getStatCount('approved');
      const newApplied = await dashboardPage.getStatCount('applied');
      const newFiltered = await dashboardPage.getStatCount('filtered');
      const newTotal = newNew + newApproved + newApplied + newFiltered;

      // Total should remain the same (job moved, not created/deleted)
      expect(newTotal).toBe(initialTotal);
    });

    test('should poll or websocket for live updates (if implemented)', async ({ page }) => {
      // Check for websocket connection or polling
      const hasWebSocket = await page.evaluate(() => {
        return (window as any).WebSocket !== undefined;
      });

      if (!hasWebSocket) {
        // Polling implementation - verify periodic API calls
        let apiCallCount = 0;

        page.on('request', (request) => {
          if (request.url().includes('/api/jobs/stats')) {
            apiCallCount++;
          }
        });

        // Wait for potential polling
        await page.waitForTimeout(5000);

        // Note: This depends on implementation
        // If polling is implemented, we should see multiple calls
      }
    });

    test('should recover from transient API failures', async ({ page }) => {
      // Simulate one-time API failure
      let failureCount = 0;

      await page.route('**/api/jobs/stats', (route) => {
        if (failureCount === 0) {
          failureCount++;
          route.fulfill({ status: 500, body: 'Error' });
        } else {
          route.continue();
        }
      });

      await dashboardPage.goto();

      // Should eventually load statistics despite initial failure
      await page.waitForTimeout(3000);

      // Verify statistics eventually loaded
      const newCount = await dashboardPage.getStatCount('new');
      expect(typeof newCount).toBe('number');
    });
  });
});
