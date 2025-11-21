import { test, expect, Page } from '@playwright/test';
import { getTestTimeout } from '../helpers/timeout-utils';
import { switchToTab } from '../helpers/tab-navigation';

/**
 * Test Suite 16: Gmail Sync Integration Tests
 *
 * Tests the complete workflow:
 * 1. Sync Gmail jobs in Intake tab
 * 2. Verify jobs appear in New Jobs tab
 * 3. Verify stats update correctly
 * 4. Verify jobs can be approved/rejected
 *
 * Note: These tests modify the database and must run serially to avoid race conditions.
 * Using test.describe.serial() prevents parallel execution with other tests.
 */

test.describe('Gmail Sync Integration', () => {
  // Configure serial mode for this suite
  // Serial mode prevents parallel execution with other tests (test isolation)
  test.describe.configure({ mode: 'serial' });

  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    await page.goto('/');

    // Wait for dashboard to load
    await expect(page.getByRole('heading', { name: /^JobHunter$/i })).toBeVisible({ timeout: getTestTimeout(10000) });

    // Force fresh stats fetch by clicking Refresh Data button
    // This ensures we get latest data from database after test seeding
    const refreshStatsPromise = page.waitForResponse(response =>
      response.url().includes('/api/jobs/stats') && response.status() === 200
    );

    const refreshButton = page.getByRole('button', { name: /Refresh Data/i });
    await refreshButton.click();
    await refreshStatsPromise;
    await page.waitForTimeout(500); // Give React time to update state
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should sync Gmail and display jobs in New Jobs tab', async () => {
    // Step 1: Get initial stats
    await page.waitForTimeout(1000);
    const initialNewJobsText = await page.getByTestId('stat-new').textContent();
    const initialNewCount = parseInt(initialNewJobsText?.match(/\d+/)?.[0] || '0');

    const initialFilteredText = await page.getByTestId('stat-filtered').textContent();
    const initialFilteredCount = parseInt(initialFilteredText?.match(/\d+/)?.[0] || '0');

    console.log(`Initial stats - New: ${initialNewCount}, Filtered: ${initialFilteredCount}`);

    // Step 2: Navigate to Intake tab
    const intakeTab = page.getByRole('button', { name: /^intake$/i });
    await intakeTab.click();
    await page.waitForTimeout(1000);

    // Verify we're on Intake tab
    const heading = page.getByRole('heading', { name: /Job Intake Sources/i });
    await expect(heading).toBeVisible();

    // Step 3: Check if Gmail is connected
    const gmailAuthButton = page.getByRole('button', { name: /Authenticate with Gmail/i });
    const gmailSyncButton = page.getByRole('button', { name: /Sync Now/i }).first();

    const authVisible = await gmailAuthButton.isVisible().catch(() => false);

    if (authVisible) {
      console.log('Gmail not connected - skipping sync test');
      test.skip();
      return;
    }

    // Step 4: Click Gmail Sync Now button
    console.log('Clicking Gmail Sync Now button...');
    await gmailSyncButton.click();

    // Wait for sync to start
    await page.waitForTimeout(500);

    // Step 5: Wait for sync to complete (look for success message or syncing state to end)
    console.log('Waiting for sync to complete...');
    await page.waitForTimeout(5000); // Give it time to sync

    // Check for success message
    const successMessage = page.getByText(/sync completed successfully|new jobs added/i);
    const hasSuccess = await successMessage.isVisible().catch(() => false);

    if (hasSuccess) {
      const messageText = await successMessage.textContent();
      console.log(`Sync result: ${messageText}`);
    }

    // Step 6: Get the activity log to see how many jobs were discovered
    const activityLog = page.locator('div').filter({ hasText: /discovered.*approved/i }).first();
    const logVisible = await activityLog.isVisible().catch(() => false);

    if (logVisible) {
      const logText = await activityLog.textContent();
      console.log(`Activity log: ${logText}`);

      // Extract discovered count
      const discoveredMatch = logText?.match(/(\d+)\s+discovered/i);
      const discoveredCount = discoveredMatch ? parseInt(discoveredMatch[1]) : 0;
      console.log(`Jobs discovered: ${discoveredCount}`);

      // If no jobs were discovered, skip the rest
      if (discoveredCount === 0) {
        console.log('No jobs discovered - test cannot verify New Jobs tab display');
        return;
      }
    }

    // Step 7: Navigate to New Jobs tab (was called "Inbox" in earlier versions)
    console.log('Navigating to New Jobs tab...');
    const newJobsTab = page.getByTestId('new-tab-button');
    await newJobsTab.click();
    await page.waitForTimeout(2000); // Wait for jobs to load

    // Step 8: Verify updated stats
    const newJobsText = await page.getByTestId('stat-new').textContent();
    const newCount = parseInt(newJobsText?.match(/\d+/)?.[0] || '0');

    const filteredText = await page.getByTestId('stat-filtered').textContent();
    const filteredCount = parseInt(filteredText?.match(/\d+/)?.[0] || '0');

    console.log(`Updated stats - New: ${newCount}, Filtered: ${filteredCount}`);
    console.log(`Change - New: +${newCount - initialNewCount}, Filtered: +${filteredCount - initialFilteredCount}`);

    // Step 9: Verify jobs appear in New Jobs tab (new or filtered jobs)
    const totalNewJobs = newCount + filteredCount - initialNewCount - initialFilteredCount;
    console.log(`Expected jobs in New Jobs tab: ${totalNewJobs}`);

    if (totalNewJobs > 0) {
      // Look for job cards
      const jobCards = page.getByTestId('job-card');
      const jobCardCount = await jobCards.count();
      console.log(`Job cards found: ${jobCardCount}`);

      // Verify at least one job card exists
      expect(jobCardCount).toBeGreaterThan(0);

      // Verify first job card has expected elements
      const firstCard = jobCards.first();
      await expect(firstCard).toBeVisible();

      // Check for job title
      const jobTitle = firstCard.getByTestId('job-title');
      await expect(jobTitle).toBeVisible();

      // Check for company name
      const jobCompany = firstCard.getByTestId('job-company');
      await expect(jobCompany).toBeVisible();

      console.log('✓ Jobs are visible in New Jobs tab');
    } else {
      console.log('No new jobs added - all might be duplicates');
    }

    // Step 10: Verify job details
    if (totalNewJobs > 0) {
      // Click on first job to see details
      const firstCard = page.getByTestId('job-card').first();
      await firstCard.click();

      // Wait for modal
      await page.waitForTimeout(500);

      // Verify modal is open
      const modal = page.getByTestId('modal-overlay');
      await expect(modal).toBeVisible();

      // Verify modal has job details
      const modalTitle = page.getByTestId('modal-job-title');
      await expect(modalTitle).toBeVisible();

      console.log('✓ Job detail modal works correctly');

      // Close modal
      const closeButton = page.getByTestId('modal-close-x');
      await closeButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should verify stats update after Gmail sync', async () => {
    // Navigate to Intake tab
    const intakeTab = page.getByRole('button', { name: /^intake$/i });
    await intakeTab.click();
    await page.waitForTimeout(1000);

    // Check if Gmail is connected
    const gmailAuthButton = page.getByRole('button', { name: /Authenticate with Gmail/i });
    const authVisible = await gmailAuthButton.isVisible().catch(() => false);

    if (authVisible) {
      console.log('Gmail not connected - skipping test');
      test.skip();
      return;
    }

    // Get initial total
    const initialTotal = await page.getByText(/Total/i).last().textContent();
    const initialTotalCount = parseInt(initialTotal?.match(/\d+/)?.[0] || '0');
    console.log(`Initial total jobs: ${initialTotalCount}`);

    // Sync Gmail
    const gmailSyncButton = page.getByRole('button', { name: /Sync Now/i }).first();
    await gmailSyncButton.click();

    // Wait for sync button to re-enable (indicates sync complete)
    await expect(gmailSyncButton).toBeEnabled({ timeout: getTestTimeout(30000) });

    // Check stats updated
    const newTotal = await page.getByText(/Total/i).last().textContent();
    const newTotalCount = parseInt(newTotal?.match(/\d+/)?.[0] || '0');
    console.log(`New total jobs: ${newTotalCount}`);

    // Stats should either stay same (duplicates) or increase
    expect(newTotalCount).toBeGreaterThanOrEqual(initialTotalCount);
  });

  test('should allow approving jobs synced from Gmail', async () => {
    // Navigate to New Jobs tab (jobs awaiting approval)
    await switchToTab(page, 'new');

    // Check if there are any jobs
    const jobCards = page.getByTestId('job-card');
    const jobCount = await jobCards.count();

    if (jobCount === 0) {
      console.log('No jobs in New Jobs tab - skipping approval test');
      test.skip();
      return;
    }

    // Get initial approved count
    const initialApprovedText = await page.getByTestId('stat-approved').textContent();
    const initialApprovedCount = parseInt(initialApprovedText?.match(/\d+/)?.[0] || '0');
    console.log(`Initial approved count: ${initialApprovedCount}, expecting: ${initialApprovedCount + 1} after approval`);

    // Find first job with Approve button
    const firstCard = jobCards.first();
    const approveButton = firstCard.getByRole('button', { name: /^Approve$/i });
    const hasApproveButton = await approveButton.isVisible().catch(() => false);

    if (!hasApproveButton) {
      console.log('No jobs with Approve button - all might already be approved');
      test.skip();
      return;
    }

    // Click approve and wait for API calls to complete
    const statusUpdatePromise = page.waitForResponse(response =>
      response.url().includes('/jobs/') && response.url().includes('/status') && response.status() === 200
    );
    const statsRefreshPromise = page.waitForResponse(response =>
      response.url().includes('/api/jobs/stats') && response.status() === 200
    );

    await approveButton.click();

    // Wait for status update and stats refresh to complete
    await statusUpdatePromise;
    await statsRefreshPromise;

    // Wait for approved count to increase (with load-aware timeout)
    // Use longer timeout during comprehensive tests or CI to handle system load
    // Increased from 20s to 45s to align with switchToTab helper timeout (ISSUE-057)
    // Increased from 45s to 90s based on ISSUE-063 - database + stats operations take ~61s under comprehensive load (4 workers)
    const pollTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 90000 : 10000;
    await page.waitForFunction(
      (expectedCount) => {
        const statElement = document.querySelector('[data-testid="stat-approved"]');
        if (!statElement) return false;
        const match = statElement.textContent?.match(/\d+/);
        const currentCount = match ? parseInt(match[0]) : 0;
        return currentCount >= expectedCount;
      },
      initialApprovedCount + 1,
      { timeout: pollTimeout }
    );

    // Verify approved count increased
    const newApprovedText = await page.getByTestId('stat-approved').textContent();
    const newApprovedCount = parseInt(newApprovedText?.match(/\d+/)?.[0] || '0');

    expect(newApprovedCount).toBe(initialApprovedCount + 1);
    console.log(`✓ Job approved successfully - count: ${initialApprovedCount} → ${newApprovedCount}`);
  });
});
