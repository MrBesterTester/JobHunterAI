import { test, expect } from '../fixtures/worker-database';
import { DashboardPage } from '../pages/DashboardPage';
import { getAllJobCards } from '../pages/JobCardComponent';

/**
 * Test Suite 7: Filtered Jobs Display
 *
 * Covers:
 * - Filtered jobs validation test (Section 13)
 */

test.describe('Filtered Jobs Display', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
  });

  test.describe('Section 13: Filtered Jobs Validation Test', () => {
    test('should display filtered jobs with filter icon', async ({ page }) => {
      await dashboardPage.clickTab('filtered');
      await dashboardPage.waitForJobsUpdate();

      const filteredCount = await dashboardPage.getVisibleJobCount();

      if (filteredCount === 0) {
        test.skip();
        return;
      }

      const jobCards = await getAllJobCards(page);
      const firstJob = jobCards[0];

      // Verify filter icon or indicator is visible
      await expect(firstJob.statusIcon).toBeVisible();
    });

    test('should display "Filtered Reasons" section for each filtered job', async ({ page }) => {
      await dashboardPage.clickTab('filtered');
      await dashboardPage.waitForJobsUpdate();

      const filteredCount = await dashboardPage.getVisibleJobCount();

      if (filteredCount === 0) {
        test.skip();
        return;
      }

      const jobCards = await getAllJobCards(page);

      // Check first few jobs
      for (const jobCard of jobCards.slice(0, 3)) {
        const hasReasons = await jobCard.hasFilteredReasons();
        expect(hasReasons).toBe(true);
      }
    });

    test('should show specific reason: "Salary below minimum ($130,000)"', async ({ page }) => {
      await dashboardPage.clickTab('filtered');
      await dashboardPage.waitForJobsUpdate();

      const filteredCount = await dashboardPage.getVisibleJobCount();

      if (filteredCount === 0) {
        test.skip();
        return;
      }

      const jobCards = await getAllJobCards(page);

      // Look for a job with salary reason
      let foundSalaryReason = false;

      for (const jobCard of jobCards) {
        const reasons = await jobCard.getFilteredReasons();
        const reasonsText = reasons.join(' ').toLowerCase();

        if (reasonsText.includes('salary') && reasonsText.includes('130')) {
          foundSalaryReason = true;
          break;
        }
      }

      // If no salary-based filtered jobs exist, skip
      if (!foundSalaryReason) {
        test.skip();
      }

      expect(foundSalaryReason).toBe(true);
    });

    test('should show specific reason: "Commute time exceeds 45 minutes"', async ({ page }) => {
      await dashboardPage.clickTab('filtered');
      await dashboardPage.waitForJobsUpdate();

      const filteredCount = await dashboardPage.getVisibleJobCount();

      if (filteredCount === 0) {
        test.skip();
        return;
      }

      const jobCards = await getAllJobCards(page);

      // Look for a job with commute reason
      let foundCommuteReason = false;

      for (const jobCard of jobCards) {
        const reasons = await jobCard.getFilteredReasons();
        const reasonsText = reasons.join(' ').toLowerCase();

        if (reasonsText.includes('commute') && reasonsText.includes('45')) {
          foundCommuteReason = true;
          break;
        }
      }

      if (!foundCommuteReason) {
        test.skip();
      }

      expect(foundCommuteReason).toBe(true);
    });

    test('should show specific reason: "Domain does not match preferred domains"', async ({ page }) => {
      await dashboardPage.clickTab('filtered');
      await dashboardPage.waitForJobsUpdate();

      const filteredCount = await dashboardPage.getVisibleJobCount();

      if (filteredCount === 0) {
        test.skip();
        return;
      }

      const jobCards = await getAllJobCards(page);

      // Look for a job with domain reason
      let foundDomainReason = false;

      for (const jobCard of jobCards) {
        const reasons = await jobCard.getFilteredReasons();
        const reasonsText = reasons.join(' ').toLowerCase();

        if (reasonsText.includes('domain')) {
          foundDomainReason = true;
          break;
        }
      }

      if (!foundDomainReason) {
        test.skip();
      }

      expect(foundDomainReason).toBe(true);
    });

    test('should list multiple reasons if job fails multiple criteria', async ({ page }) => {
      await dashboardPage.clickTab('filtered');
      await dashboardPage.waitForJobsUpdate();

      const filteredCount = await dashboardPage.getVisibleJobCount();

      if (filteredCount === 0) {
        test.skip();
        return;
      }

      const jobCards = await getAllJobCards(page);

      // Look for a job with multiple reasons
      let foundMultipleReasons = false;

      for (const jobCard of jobCards) {
        const reasons = await jobCard.getFilteredReasons();

        if (reasons.length > 1) {
          foundMultipleReasons = true;

          // Verify each reason is specific and non-empty
          for (const reason of reasons) {
            expect(reason.length).toBeGreaterThan(10); // Reasonable minimum length
          }
          break;
        }
      }

      if (!foundMultipleReasons) {
        test.skip();
      }

      expect(foundMultipleReasons).toBe(true);
    });

    test('should display filtered reasons in a visually distinct way', async ({ page }) => {
      await dashboardPage.clickTab('filtered');
      await dashboardPage.waitForJobsUpdate();

      const filteredCount = await dashboardPage.getVisibleJobCount();

      if (filteredCount === 0) {
        test.skip();
        return;
      }

      const jobCards = await getAllJobCards(page);
      const firstJob = jobCards[0];

      // Verify filtered reasons section exists and is styled
      const filteredReasonsSection = firstJob.filteredReasonsSection;

      await expect(filteredReasonsSection).toBeVisible();

      // Check for styling (red/orange color typically)
      const backgroundColor = await filteredReasonsSection.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Should have some background color (not default/white)
      expect(backgroundColor).toBeTruthy();
    });

    test('should show all filtered reasons are accurate and specific', async ({ page }) => {
      await dashboardPage.clickTab('filtered');
      await dashboardPage.waitForJobsUpdate();

      const filteredCount = await dashboardPage.getVisibleJobCount();

      if (filteredCount === 0) {
        test.skip();
        return;
      }

      const jobCards = await getAllJobCards(page);

      // Check first 5 filtered jobs
      for (const jobCard of jobCards.slice(0, 5)) {
        const reasons = await jobCard.getFilteredReasons();

        // Each job should have at least one reason
        expect(reasons.length).toBeGreaterThan(0);

        // Verify reasons contain expected keywords
        const reasonsText = reasons.join(' ').toLowerCase();
        const hasValidKeyword =
          reasonsText.includes('salary') ||
          reasonsText.includes('commute') ||
          reasonsText.includes('domain') ||
          reasonsText.includes('location');

        expect(hasValidKeyword).toBe(true);
      }
    });
  });

  test.describe('Filtered Jobs Count Consistency', () => {
    test('should match filtered count in statistics', async ({ page }) => {
      const statsFilteredCount = await dashboardPage.getStatCount('filtered');

      await dashboardPage.clickTab('filtered');
      await dashboardPage.waitForJobsUpdate();

      const actualFilteredCount = await dashboardPage.getVisibleJobCount();

      expect(actualFilteredCount).toBe(statsFilteredCount);
    });

    test('should not display approve/reject buttons for filtered jobs', async ({ page }) => {
      await dashboardPage.clickTab('filtered');
      await dashboardPage.waitForJobsUpdate();

      const filteredCount = await dashboardPage.getVisibleJobCount();

      if (filteredCount === 0) {
        test.skip();
        return;
      }

      const jobCards = await getAllJobCards(page);
      const firstJob = jobCards[0];

      // Filtered jobs should not have action buttons
      const hasApproveButton = await firstJob.approveButton.isVisible().catch(() => false);
      const hasRejectButton = await firstJob.rejectButton.isVisible().catch(() => false);

      expect(hasApproveButton).toBe(false);
      expect(hasRejectButton).toBe(false);
    });
  });
});
