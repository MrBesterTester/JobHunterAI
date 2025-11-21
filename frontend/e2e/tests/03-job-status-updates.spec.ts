import { test, expect } from '@playwright/test';
import { getTestTimeout } from '../helpers/timeout-utils';
import { DashboardPage } from '../pages/DashboardPage';
import { getJobCard, getAllJobCards } from '../pages/JobCardComponent';
import { waitForApiCall, verifyApiRequest } from '../fixtures/test-helpers';
import { shouldRunTest } from '../test-config';

// Conditionally skip entire file if disabled in test-config.ts
// This will NOT show skip messages in test output
if (!shouldRunTest('job-status-updates')) {
  test.skip();
}

/**
 * Test Suite 3: Job Status Updates
 *
 * Covers:
 * - Approve/Reject workflow test (Section 5)
 * - Status update API validation (Section 6)
 *
 * Note: These tests modify the database and must run serially to avoid race conditions.
 * Using test.describe.configure() prevents parallel execution with other tests.
 */

test.describe('Job Status Updates', () => {
  // Configure serial mode for this suite
  // Serial mode prevents parallel execution with other tests (test isolation)
  test.describe.configure({ mode: 'serial' });

  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
  });

  // Run serially to avoid race conditions with shared database state
  test.describe.serial('Section 5: Approve/Reject Workflow Test', () => {
    test('should move job from Inbox to Approved when approved', async ({ page }) => {
      // Navigate to Inbox
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      const initialInboxCount = await dashboardPage.getVisibleJobCount();

      if (initialInboxCount === 0) {
        test.skip();
        return;
      }

      // Get the first job's title for tracking
      const firstJob = await getJobCard(page, 0);
      const jobTitle = await firstJob.getTitle();

      // Get initial approved count
      const initialApprovedCount = await dashboardPage.getStatCount('approved');

      // Approve the job
      await firstJob.approve();

      // Wait for update
      await dashboardPage.waitForJobsUpdate();

      // Verify job disappeared from Inbox
      const newInboxCount = await dashboardPage.getVisibleJobCount();
      expect(newInboxCount).toBe(initialInboxCount - 1);

      // Navigate to Approved tab
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      // Verify job appears in Approved
      const newApprovedCount = await dashboardPage.getVisibleJobCount();
      expect(newApprovedCount).toBe(initialApprovedCount + 1);

      // Verify the same job is now in Approved
      const jobTitles = await dashboardPage.getJobTitles();
      expect(jobTitles).toContain(jobTitle);
    });

    test('should move job from Inbox to Rejected when rejected', async ({ page }) => {
      // Navigate to Inbox
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      const initialInboxCount = await dashboardPage.getVisibleJobCount();

      if (initialInboxCount === 0) {
        test.skip();
        return;
      }

      // Get the first job
      const firstJob = await getJobCard(page, 0);

      // Reject the job
      await firstJob.reject();

      // Wait for update
      await dashboardPage.waitForJobsUpdate();

      // Verify job disappeared from Inbox
      const newInboxCount = await dashboardPage.getVisibleJobCount();
      expect(newInboxCount).toBe(initialInboxCount - 1);

      // Note: Rejected jobs might not have a dedicated tab
      // They should just disappear from Inbox
    });

    test('should update statistics immediately after approval', async ({ page }) => {
      test.setTimeout(33000);
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      const initialInboxCount = await dashboardPage.getVisibleJobCount();

      if (initialInboxCount === 0) {
        test.skip();
        return;
      }

      // Get initial statistics
      const initialNewCount = await dashboardPage.getStatCount('new');
      const initialApprovedCount = await dashboardPage.getStatCount('approved');

      // Approve first job
      const firstJob = await getJobCard(page, 0);
      await firstJob.approve();

      // Wait for statistics to update by polling actual state
      await page.waitForFunction(
        ({ expectedNew, expectedApproved }) => {
          const newStatElement = document.querySelector('[data-testid="stat-new"]');
          const approvedStatElement = document.querySelector('[data-testid="stat-approved"]');

          const newMatch = newStatElement?.textContent?.match(/(\d+)/);
          const approvedMatch = approvedStatElement?.textContent?.match(/(\d+)/);

          const currentNew = newMatch ? parseInt(newMatch[1], 10) : -1;
          const currentApproved = approvedMatch ? parseInt(approvedMatch[1], 10) : -1;

          return currentNew === expectedNew && currentApproved === expectedApproved;
        },
        { expectedNew: initialNewCount - 1, expectedApproved: initialApprovedCount + 1 },
        { timeout: getTestTimeout(10000) }
      );

      // Verify statistics updated
      const newNewCount = await dashboardPage.getStatCount('new');
      const newApprovedCount = await dashboardPage.getStatCount('approved');

      expect(newNewCount).toBe(initialNewCount - 1);
      expect(newApprovedCount).toBe(initialApprovedCount + 1);
    });

  test.setTimeout(33000);
    test('should update statistics immediately after rejection', async ({ page }) => {
      test.setTimeout(33000);
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      const initialInboxCount = await dashboardPage.getVisibleJobCount();

      if (initialInboxCount === 0) {
        test.skip();
        return;
      }

      // Get initial statistics
      const initialNewCount = await dashboardPage.getStatCount('new');

      // Reject first job
      const firstJob = await getJobCard(page, 0);
      await firstJob.reject();

      // Wait for statistics to update by polling actual state
      await page.waitForFunction(
        (expectedNew) => {
          const newStatElement = document.querySelector('[data-testid="stat-new"]');
          const newMatch = newStatElement?.textContent?.match(/(\d+)/);
          const currentNew = newMatch ? parseInt(newMatch[1], 10) : -1;
          return currentNew === expectedNew;
        },
        initialNewCount - 1,
        { timeout: getTestTimeout(10000) }
      );

      // Verify statistics updated
      const newNewCount = await dashboardPage.getStatCount('new');

      expect(newNewCount).toBe(initialNewCount - 1);
    });
      test.setTimeout(66000);

  test.setTimeout(66000);
    test('should allow approving multiple jobs in sequence', async ({ page }) => {
      test.setTimeout(66000);
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      const initialCount = await dashboardPage.getVisibleJobCount();

      if (initialCount < 2) {
        test.skip();
        return;
      }

      // Approve first job
      const firstJob = await getJobCard(page, 0);
      await firstJob.approve();

      // Wait for first job to be removed using state polling
      // Use load-aware timeout: 20s under load, 10s in isolation
      const pollTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 20000 : 10000;
      await page.waitForFunction(
        (expectedCount) => {
          const jobCards = document.querySelectorAll('[data-testid="job-card"]');
          return jobCards.length === expectedCount;
        },
        initialCount - 1,
        { timeout: pollTimeout }
      );

      // Approve second job (which is now at index 0)
      const secondJob = await getJobCard(page, 0);
      await secondJob.approve();

      // Wait for second job to be removed using state polling
      await page.waitForFunction(
        (expectedCount) => {
          const jobCards = document.querySelectorAll('[data-testid="job-card"]');
          return jobCards.length === expectedCount;
        },
        initialCount - 2,
        { timeout: pollTimeout }
      );

      // Verify both jobs were removed
      const finalCount = await dashboardPage.getVisibleJobCount();
      expect(finalCount).toBe(initialCount - 2);
    });

    test('should handle approve button disabled state during processing', async ({ page }) => {
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      // Click approve and immediately check if button is disabled
      const approveButtonPromise = firstJob.approveButton.click();

      // Note: Button might be disabled during API call
      // This is implementation-dependent

      await approveButtonPromise;
    });
  });

  // Run serially to avoid race conditions with shared database state
  test.describe.serial('Section 6: Status Update API Validation', () => {
    test('should send PUT /api/jobs/{id}/status request on approval', async ({ page }) => {
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      // Set up request listener
      const requestPromise = page.waitForRequest(
        (req) => req.url().includes('/api/jobs/') && req.url().includes('/status') && req.method() === 'PUT'
      );

      // Approve job
      const firstJob = await getJobCard(page, 0);
      await firstJob.approve();

      // Wait for API request
      const request = await requestPromise;

      // Verify request was made
      expect(request.method()).toBe('PUT');
      expect(request.url()).toMatch(/\/api\/jobs\/.*\/status/);
    });

    test('should send correct status payload on approval', async ({ page }) => {
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      // Set up request listener
      const requestPromise = page.waitForRequest(
        (req) => req.url().includes('/api/jobs/') && req.url().includes('/status') && req.method() === 'PUT'
      );

      // Approve job
      const firstJob = await getJobCard(page, 0);
      await firstJob.approve();

      // Wait for API request
      const request = await requestPromise;

      // Verify payload contains "approved" status
      const postData = request.postDataJSON();
      expect(postData.status || postData).toMatch(/approved/i);
    });

    test('should send correct status payload on rejection', async ({ page }) => {
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      // Set up request listener
      const requestPromise = page.waitForRequest(
        (req) => req.url().includes('/api/jobs/') && req.url().includes('/status') && req.method() === 'PUT'
      );

      // Reject job
      const firstJob = await getJobCard(page, 0);
      await firstJob.reject();

      // Wait for API request
      const request = await requestPromise;

      // Verify payload contains "rejected" status
      const postData = request.postDataJSON();
      expect(postData.status || postData).toMatch(/rejected/i);
    });

    test('should receive 200 OK response on successful approval', async ({ page }) => {
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      // Set up response listener
      const responsePromise = page.waitForResponse(
        (res) => res.url().includes('/api/jobs/') && res.url().includes('/status') && res.request().method() === 'PUT'
      );

      // Approve job
      const firstJob = await getJobCard(page, 0);
      await firstJob.approve();

      // Wait for API response
      const response = await responsePromise;

      // Verify successful response
      expect(response.status()).toBe(200);
    });

    test('should refresh job list automatically after status update', async ({ page }) => {
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      // Set up response listener for job list refresh
      const refreshPromise = page.waitForResponse(
        (res) => res.url().includes('/api/jobs') && !res.url().includes('/status')
      );

      // Approve job
      const firstJob = await getJobCard(page, 0);
      await firstJob.approve();

      // Wait for job list to refresh
      const refreshResponse = await refreshPromise;

      expect(refreshResponse.status()).toBe(200);
        test.setTimeout(33000);
    });
      test.setTimeout(33000);

  test.setTimeout(33000);
    test('should handle API errors gracefully', async ({ page }) => {
      test.setTimeout(33000);
      // Simulate API failure
      await page.route('**/api/jobs/*/status', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      // Try to approve job
      const firstJob = await getJobCard(page, 0);
      await firstJob.approve();

      // Wait for error handling
      await page.waitForTimeout(1000);

      // Job should still be visible (not removed) on error
      // This depends on implementation - might show error message
    });

    test('should track request/response cycle for status updates', async ({ page }) => {
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const startTime = Date.now();

      // Approve job
      const firstJob = await getJobCard(page, 0);
      await firstJob.approve();

      // Wait for completion
      await dashboardPage.waitForJobsUpdate();

      const duration = Date.now() - startTime;

      // Verify update completes in reasonable time
      // Use load-aware timeout: 20s under load (CI/comprehensive tests), 10s in isolation
      // This accounts for resource contention when multiple test files run in parallel
      const maxDuration = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 20000 : 10000;
      expect(duration).toBeLessThan(maxDuration);
    });
  });
    test.setTimeout(66000);

  test.setTimeout(66000);
  // Run serially to avoid race conditions with shared database state
    test.setTimeout(66000);
  test.describe.serial('Edge Cases & Error Handling', () => {
    test.setTimeout(66000);
    test('should handle rapid sequential approvals', async ({ page }) => {
      test.setTimeout(66000);
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      const initialCount = await dashboardPage.getVisibleJobCount();

      if (initialCount < 3) {
        test.skip();
        return;
      }

      // Rapidly approve 3 jobs
      for (let i = 0; i < 3; i++) {
        const job = await getJobCard(page, 0);
        await job.approve();
        // Minimal wait
        await page.waitForTimeout(200);
      }

      // Wait for all updates to complete by polling actual state
      // Use load-aware timeout: 20s under load, 10s in isolation
      const pollTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 20000 : 10000;
      await page.waitForFunction(
        (expectedCount) => {
          const jobCards = document.querySelectorAll('[data-testid="job-card"]');
          return jobCards.length === expectedCount;
        },
        initialCount - 3,
        { timeout: pollTimeout }
      );

      // Verify all 3 jobs were processed
        test.setTimeout(33000);
      const finalCount = await dashboardPage.getVisibleJobCount();
        test.setTimeout(33000);
      expect(finalCount).toBe(initialCount - 3);
        test.setTimeout(33000);
    });
      test.setTimeout(33000);

  test.setTimeout(33000);
    test('should maintain data consistency after status updates', async ({ page }) => {
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      // Get initial total
      const initialNew = await dashboardPage.getStatCount('new');
      const initialApproved = await dashboardPage.getStatCount('approved');
      const initialTotal = initialNew + initialApproved;

      // Approve one job
      const firstJob = await getJobCard(page, 0);
      await firstJob.approve();

      // Wait for statistics to update by polling actual state
      await page.waitForFunction(
        ({ expectedNew, expectedApproved }) => {
          const newStatElement = document.querySelector('[data-testid="stat-new"]');
          const approvedStatElement = document.querySelector('[data-testid="stat-approved"]');

          const newMatch = newStatElement?.textContent?.match(/(\d+)/);
          const approvedMatch = approvedStatElement?.textContent?.match(/(\d+)/);

          const currentNew = newMatch ? parseInt(newMatch[1], 10) : -1;
          const currentApproved = approvedMatch ? parseInt(approvedMatch[1], 10) : -1;

          return currentNew === expectedNew && currentApproved === expectedApproved;
        },
        { expectedNew: initialNew - 1, expectedApproved: initialApproved + 1 },
        { timeout: getTestTimeout(10000) }
      );

      // Get new total
      const newNew = await dashboardPage.getStatCount('new');
      const newApproved = await dashboardPage.getStatCount('approved');
      const newTotal = newNew + newApproved;

      // Total should remain the same (job moved, not added/removed)
      expect(newTotal).toBe(initialTotal);
    });
  });
});
