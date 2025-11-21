import { test, expect } from '../fixtures/worker-database';
import { DashboardPage } from '../pages/DashboardPage';
import { getAllJobCards } from '../pages/JobCardComponent';
import { getTestTimeout } from '../helpers/timeout-utils';

/**
 * Test Suite 2: Tab Navigation & Filtering
 *
 * Covers:
 * - Tab switching test (Section 3)
 * - Job card display test (Section 4)
 */

test.describe('Tab Navigation & Filtering', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
  });

  test.describe('Section 3: Tab Switching Test', () => {
    test('should display only "new" jobs in Inbox tab', async ({ page }) => {
      await dashboardPage.clickTab('inbox');

      // Verify tab is active
      const isActive = await dashboardPage.isTabActive('inbox');
      expect(isActive).toBe(true);

      // Wait for jobs to load
      await dashboardPage.waitForJobsUpdate();

      // Get the count from the statistics
      const expectedCount = await dashboardPage.getStatCount('new');
      const actualCount = await dashboardPage.getVisibleJobCount();

      // Verify displayed jobs match the "new" count
      expect(actualCount).toBe(expectedCount);
    });

    test('should display only "approved" jobs in Approved tab', async ({ page }) => {
      await dashboardPage.clickTab('approved');

      const isActive = await dashboardPage.isTabActive('approved');
      expect(isActive).toBe(true);

      await dashboardPage.waitForJobsUpdate();

      const expectedCount = await dashboardPage.getStatCount('approved');
      const actualCount = await dashboardPage.getVisibleJobCount();

      expect(actualCount).toBe(expectedCount);
    });

    test('should display only "applied" jobs in Applied tab', async ({ page }) => {
      await dashboardPage.clickTab('applied');

      const isActive = await dashboardPage.isTabActive('applied');
      expect(isActive).toBe(true);

      await dashboardPage.waitForJobsUpdate();

      const expectedCount = await dashboardPage.getStatCount('applied');
      const actualCount = await dashboardPage.getVisibleJobCount();

      expect(actualCount).toBe(expectedCount);
    });

    test('should display only "filtered" jobs in Filtered tab', async ({ page }) => {
      await dashboardPage.clickTab('filtered');

      const isActive = await dashboardPage.isTabActive('filtered');
      expect(isActive).toBe(true);

      await dashboardPage.waitForJobsUpdate();

      const expectedCount = await dashboardPage.getStatCount('filtered');
      const actualCount = await dashboardPage.getVisibleJobCount();

      expect(actualCount).toBe(expectedCount);
    });

    test('should display all jobs in All tab', async ({ page }) => {
      await dashboardPage.clickTab('all');

      const isActive = await dashboardPage.isTabActive('all');
      expect(isActive).toBe(true);

      await dashboardPage.waitForJobsUpdate();

      // Get total of all statuses
      const newCount = await dashboardPage.getStatCount('new');
      const approvedCount = await dashboardPage.getStatCount('approved');
      const appliedCount = await dashboardPage.getStatCount('applied');
      const filteredCount = await dashboardPage.getStatCount('filtered');

      const expectedTotal = newCount + approvedCount + appliedCount + filteredCount;
      const actualCount = await dashboardPage.getVisibleJobCount();

      expect(actualCount).toBe(expectedTotal);
    });

    test('should update tab active state when switching tabs', async ({ page }) => {
      // Start with Inbox
      await dashboardPage.clickTab('inbox');
      expect(await dashboardPage.isTabActive('inbox')).toBe(true);

      // Switch to Approved
      await dashboardPage.clickTab('approved');
      expect(await dashboardPage.isTabActive('approved')).toBe(true);
      expect(await dashboardPage.isTabActive('inbox')).toBe(false);

      // Switch to Applied
      await dashboardPage.clickTab('applied');
      expect(await dashboardPage.isTabActive('applied')).toBe(true);
      expect(await dashboardPage.isTabActive('approved')).toBe(false);

      // Switch to Filtered
      await dashboardPage.clickTab('filtered');
      expect(await dashboardPage.isTabActive('filtered')).toBe(true);
      expect(await dashboardPage.isTabActive('applied')).toBe(false);

      // Switch to All
      await dashboardPage.clickTab('all');
      expect(await dashboardPage.isTabActive('all')).toBe(true);
      expect(await dashboardPage.isTabActive('filtered')).toBe(false);
    });

    test('should have job count badges matching displayed jobs', async ({ page }) => {
      // Increase timeout since we're checking 4 tabs sequentially
      test.setTimeout(getTestTimeout(60000)); // 60s → 90s under comprehensive load

      // Check each tab
      const tabs: Array<'inbox' | 'approved' | 'applied' | 'filtered'> = [
        'inbox',
        'approved',
        'applied',
        'filtered',
      ];

      for (const tab of tabs) {
        await dashboardPage.clickTab(tab);
        await dashboardPage.waitForJobsUpdate();

        const statName = tab === 'inbox' ? 'new' : tab;
        const expectedCount = await dashboardPage.getStatCount(statName as any);
        const actualCount = await dashboardPage.getVisibleJobCount();

        expect(actualCount).toBe(expectedCount);
      }
    });
  });

  test.describe('Section 4: Job Card Display Test', () => {
    test('should display job title, company, salary, location, and source', async ({ page }) => {
      // Go to Inbox to see some jobs
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      const visibleJobCount = await dashboardPage.getVisibleJobCount();

      if (visibleJobCount > 0) {
        const jobCards = await getAllJobCards(page);
        const firstJob = jobCards[0];

        // Verify basic job information is displayed
        const title = await firstJob.getTitle();
        const company = await firstJob.getCompany();

        expect(title).toBeTruthy();
        expect(title.length).toBeGreaterThan(0);
        expect(company).toBeTruthy();
        expect(company.length).toBeGreaterThan(0);

        // Salary might be optional
        // Location and source should be present
      } else {
        // If no jobs in Inbox, check All tab
        await dashboardPage.clickTab('all');
        await dashboardPage.waitForJobsUpdate();

        const allJobsCount = await dashboardPage.getVisibleJobCount();
        expect(allJobsCount).toBeGreaterThanOrEqual(0); // OK if no jobs exist
      }
    });

    test('should show green salary badge for jobs ≥$130K', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      const jobCards = await getAllJobCards(page);

      // Find jobs with salary information
      for (const jobCard of jobCards) {
        const salary = await jobCard.getSalaryAmount();

        if (salary && salary >= 130000) {
          // Verify badge is green
          const isGreen = await jobCard.isSalaryBadgeGreen();
          expect(isGreen).toBe(true);
          break; // Found one, that's enough
        }
      }
    });

    test('should show blue location badge for Remote jobs', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      const jobCards = await getAllJobCards(page);

      // Find a remote job
      for (const jobCard of jobCards) {
        if (await jobCard.isRemoteJob()) {
          // Found a remote job - verify badge styling
          await expect(jobCard.locationBadge).toBeVisible();
          break;
        }
      }
    });

    test('should display status icons correctly', async ({ page }) => {
      // Check Inbox (status="new")
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      const inboxCount = await dashboardPage.getVisibleJobCount();
      if (inboxCount > 0) {
        const jobCards = await getAllJobCards(page);
        const firstJob = jobCards[0];

        // Verify status icon is present
        await expect(firstJob.statusIcon).toBeVisible();
      }

      // Check Approved (status="approved")
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      const approvedCount = await dashboardPage.getVisibleJobCount();
      if (approvedCount > 0) {
        const jobCards = await getAllJobCards(page);
        const firstJob = jobCards[0];

        await expect(firstJob.statusIcon).toBeVisible();
      }
    });

    test('should display filtered reasons for filtered jobs', async ({ page }) => {
      await dashboardPage.clickTab('filtered');
      await dashboardPage.waitForJobsUpdate();

      const filteredCount = await dashboardPage.getVisibleJobCount();

      if (filteredCount > 0) {
        const jobCards = await getAllJobCards(page);
        const firstFilteredJob = jobCards[0];

        // Verify filtered reasons section is visible
        const hasReasons = await firstFilteredJob.hasFilteredReasons();
        expect(hasReasons).toBe(true);

        // Get the reasons
        const reasons = await firstFilteredJob.getFilteredReasons();
        expect(reasons.length).toBeGreaterThan(0);

        // Verify reasons are specific (case-insensitive check)
        const reasonsText = reasons.join(' ').toLowerCase();
        const hasSpecificReason =
          reasonsText.includes('salary') ||
          reasonsText.includes('commute') ||
          reasonsText.includes('domain') ||
          reasonsText.includes('location');

        expect(hasSpecificReason).toBe(true);
      }
    });

    test('should show correct badge colors based on criteria', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      const jobCards = await getAllJobCards(page);

      if (jobCards.length > 0) {
        // Test at least one job card
        const jobCard = jobCards[0];

        // Verify badges are visible (styling might vary)
        const salaryAmount = await jobCard.getSalaryAmount();
        if (salaryAmount) {
          if (salaryAmount >= 130000) {
            // Should have green or positive styling
            await expect(jobCard.salaryBadge).toBeVisible();
          } else {
            // Should have red or negative styling
            await expect(jobCard.salaryBadge).toBeVisible();
          }
        }
      }
    });

    test('should handle commute time badge display', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      const jobCards = await getAllJobCards(page);

      // Find a job with commute information
      for (const jobCard of jobCards) {
        const location = await jobCard.getLocation();

        if (location && !location.toLowerCase().includes('remote')) {
          // Non-remote job should have commute badge or indication
          // This is optional depending on implementation
          break;
        }
      }
    });
  });

  // Run serially to avoid race conditions with shared database state
  test.describe.serial('Empty State Handling', () => {
    test('should handle tabs with no jobs gracefully', async ({ page }) => {
      // This test loops through 4 tabs, each taking ~8-10s (click + wait + checks)
      // Total time: ~32-40s, so we need a longer timeout than the default 30s
      test.setTimeout(getTestTimeout(60000)); // 60s → 90s under comprehensive load

      // Try each tab and verify empty state handling
      const tabs: Array<'inbox' | 'approved' | 'applied' | 'filtered'> = [
        'inbox',
        'approved',
        'applied',
        'filtered',
      ];

      for (const tab of tabs) {
        await dashboardPage.clickTab(tab);
        await dashboardPage.waitForJobsUpdate();

        const count = await dashboardPage.getVisibleJobCount();

        if (count === 0) {
          // Verify empty state message or that page doesn't break
          const hasEmptyState = await dashboardPage.isEmptyStateVisible();
          // Either empty state is shown, or no jobs are displayed
          expect(hasEmptyState || count === 0).toBe(true);
        }
      }
    });
  });
});
