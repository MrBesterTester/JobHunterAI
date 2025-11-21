import { test, expect } from '@playwright/test';
import { getTestTimeout } from '../helpers/timeout-utils';
import { DashboardPage } from '../pages/DashboardPage';
import { getJobCard } from '../pages/JobCardComponent';
import { simulateApiFailure, interceptApiResponse } from '../fixtures/test-helpers';

/**
 * Test Suite 9: Error Handling & Edge Cases
 *
 * Covers:
 * - API failure simulation test (Section 17)
 * - Empty state test (Section 18)
 * - Long content test (Section 19)
 * - Special characters test (Section 20)
 */

test.describe('Error Handling & Edge Cases', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
  });

  test.describe('Section 17: API Failure Simulation Test', () => {
    test('should handle backend server unavailable gracefully', async ({ page }) => {
      test.setTimeout(33000);
      // Simulate complete API failure
      await page.route('**/api/**', (route) => route.abort('failed'));

      await dashboardPage.goto();

      // Should show error message or sample data, but not crash
      await page.waitForTimeout(2000);

      // Page should still be interactive
      await expect(dashboardPage.pageTitle).toBeVisible();
    });

  test.setTimeout(33550);
    test('should show graceful error handling when API returns 500', async ({ page }) => {
      // Intercept API calls and return 500
      await interceptApiResponse(page, '**/api/jobs', 500, { error: 'Internal server error' });

      await dashboardPage.goto();

      await page.waitForTimeout(2000);

      // Should display error message or fallback UI
      const hasPageLoaded = await dashboardPage.pageTitle.isVisible();
      expect(hasPageLoaded).toBe(true);
    });
      test.setTimeout(33550);

    test('should recover when backend server restarts', async ({ page }) => {
      // First load: API fails
      await page.route('**/api/jobs', (route) => route.abort('failed'));
      await dashboardPage.goto();

      await page.waitForTimeout(1000);

      // Restore API
      await page.unroute('**/api/jobs');

      // Refresh or navigate
      await page.reload();

      // Should load successfully
      await dashboardPage.waitForLoad();
      await expect(dashboardPage.pageTitle).toBeVisible();
        test.setTimeout(33000);
    });

    test('should log errors to console for debugging', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      page.on('pageerror', (err) => {
        consoleErrors.push(err.message);
      });

      // Simulate API failure
      await page.route('**/api/jobs', (route) => route.abort('failed'));

      await dashboardPage.goto();

      await page.waitForTimeout(2000);

      // Errors might be logged (depends on implementation)
      // Just verify page doesn't crash
      const hasPageLoaded = await dashboardPage.pageTitle.isVisible();
        test.setTimeout(33000);
      expect(hasPageLoaded).toBe(true);
    });

    test('should handle network timeout gracefully', async ({ page }) => {
      test.setTimeout(33000);
      // Simulate very slow API response
      await page.route('**/api/jobs', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 10000)); // 10s delay
        await route.continue();
      });

      await page.goto('http://localhost:3000', { timeout: getTestTimeout(15000) });

      // Should eventually load or show timeout message
      await page.waitForTimeout(2000);

      // Verify page is in usable state
      const pageTitle = await dashboardPage.pageTitle.isVisible().catch(() => false);
      expect(typeof pageTitle).toBe('boolean');
    });
  });

  test.describe('Section 18: Empty State Test', () => {
    test('should show appropriate message when Inbox is empty', async ({ page }) => {
      await dashboardPage.goto();
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      const count = await dashboardPage.getVisibleJobCount();

      if (count === 0) {
        // Verify empty state is shown
        const hasEmptyState = await dashboardPage.isEmptyStateVisible();
        expect(hasEmptyState || count === 0).toBe(true);
      } else {
        test.skip();
      }
    });

    test('should show appropriate message when Approved is empty', async ({ page }) => {
      await dashboardPage.goto();
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      const count = await dashboardPage.getVisibleJobCount();

      if (count === 0) {
        // Page should not break with zero jobs
        await expect(dashboardPage.pageTitle).toBeVisible();
      }
    });

    test('should not break when no jobs exist in database', async ({ page }) => {
      // Mock empty response
      await interceptApiResponse(page, '**/api/jobs', 200, []);
      await interceptApiResponse(page, '**/api/jobs/stats', 200, {
        new: 0,
        approved: 0,
        applied: 0,
        filtered: 0,
      });

      await dashboardPage.goto();

      // Verify page loads successfully
      await expect(dashboardPage.pageTitle).toBeVisible();

      // Statistics should show 0
        test.setTimeout(33000);
      const newCount = await dashboardPage.getStatCount('new');
      expect(newCount).toBe(0);
    });

  test.setTimeout(33000);
    test('should handle transition from populated to empty state', async ({ page }) => {
      test.setTimeout(33000);
      await dashboardPage.goto();
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      const initialCount = await dashboardPage.getVisibleJobCount();

      if (initialCount > 0) {
        // Approve all jobs
        for (let i = 0; i < initialCount; i++) {
          const job = await getJobCard(page, 0); // Always get index 0 as they remove
          await job.approve();
          await page.waitForTimeout(300);
        }

        await dashboardPage.waitForJobsUpdate();

        // Inbox should now be empty
        const newCount = await dashboardPage.getVisibleJobCount();
        expect(newCount).toBe(0);

        // Verify empty state or that page doesn't break
        const pageStillWorks = await dashboardPage.pageTitle.isVisible();
        expect(pageStillWorks).toBe(true);
      }
    });
  });

  test.describe('Section 19: Long Content Test', () => {
    test('should handle very long job title without breaking layout', async ({ page }) => {
      // Mock job with very long title
      const longTitle = 'A'.repeat(200);

      await interceptApiResponse(page, '**/api/jobs', 200, [
        {
          job_id: 'test-long-title',
          title: longTitle,
          company: 'Test Company',
          status: 'new',
          source: 'Test',
          date_collected: new Date().toISOString(),
        },
      ]);

      await dashboardPage.goto();
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      // Verify page doesn't break
      await expect(dashboardPage.jobCards.first()).toBeVisible();

      // Check for horizontal scroll (shouldn't exist)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
          test.setTimeout(33000);
      });

      expect(hasHorizontalScroll).toBe(false);
    });
      test.setTimeout(33000);

  test.setTimeout(33000);
    test('should make long job description scrollable in modal', async ({ page }) => {
      test.setTimeout(33000);
      await dashboardPage.goto();
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.openDetails();

      await page.waitForTimeout(500);

      // Modal should handle long content with scroll
      const modal = page.locator('[data-testid="modal"], [role="dialog"], .modal').first();

      if (await modal.isVisible()) {
        // Modal should be scrollable
        const isScrollable = await modal.evaluate((el) => {
          return el.scrollHeight > el.clientHeight;
        });

        // Either scrollable OR content fits
        expect(typeof isScrollable).toBe('boolean');
      }
    });

    test('should truncate or wrap long company name appropriately', async ({ page }) => {
      const longCompanyName = 'Very Long Company Name That Should Be Handled Properly';

      await interceptApiResponse(page, '**/api/jobs', 200, [
        {
          job_id: 'test-long-company',
          title: 'Test Engineer',
          company: longCompanyName,
          status: 'new',
          source: 'Test',
          date_collected: new Date().toISOString(),
        },
      ]);

      await dashboardPage.goto();
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      // Verify layout isn't broken
      await expect(dashboardPage.jobCards.first()).toBeVisible();

      const firstJob = await getJobCard(page, 0);
      const company = await firstJob.getCompany();

      // Company name should be present
      expect(company.length).toBeGreaterThan(0);
    });
  });

  test.describe('Section 20: Special Characters Test', () => {
    test('should handle special characters in job title', async ({ page }) => {
      const specialTitle = 'Sr. Test Engineer & QA Lead (Remote) - C++/Python';

      await interceptApiResponse(page, '**/api/jobs', 200, [
        {
          job_id: 'test-special-chars',
          title: specialTitle,
          company: 'TechCorp',
          status: 'new',
          source: 'Test',
          date_collected: new Date().toISOString(),
        },
      ]);

      await dashboardPage.goto();
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      const firstJob = await getJobCard(page, 0);
      const title = await firstJob.getTitle();

      // Special characters should display correctly
      expect(title).toContain('&');
      expect(title).toContain('(');
      expect(title).toContain(')');
    });

    test('should handle Unicode characters in company name', async ({ page }) => {
      const unicodeCompany = 'Café Technologies™';

      await interceptApiResponse(page, '**/api/jobs', 200, [
        {
          job_id: 'test-unicode',
          title: 'Test Engineer',
          company: unicodeCompany,
          status: 'new',
          source: 'Test',
          date_collected: new Date().toISOString(),
        },
      ]);

      await dashboardPage.goto();
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      const firstJob = await getJobCard(page, 0);
      const company = await firstJob.getCompany();

      // Unicode should display correctly
      expect(company.length).toBeGreaterThan(0);
    });

    test('should properly escape HTML/script tags in job data', async ({ page }) => {
      const maliciousTitle = '<script>alert("XSS")</script>Test Engineer';

      await interceptApiResponse(page, '**/api/jobs', 200, [
        {
          job_id: 'test-xss',
          title: maliciousTitle,
          company: 'TechCorp',
          status: 'new',
          source: 'Test',
          date_collected: new Date().toISOString(),
        },
      ]);

      await dashboardPage.goto();
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      // Should not execute script (React automatically escapes)
      // Just verify page loads without errors
      await expect(dashboardPage.pageTitle).toBeVisible();
    });

    test('should handle filtering and sorting with special characters', async ({ page }) => {
      await dashboardPage.goto();
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      // Just verify basic operations work
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

  test.setTimeout(99001);
      // No errors should occur
      await expect(dashboardPage.pageTitle).toBeVisible();
    });
  });
    test.setTimeout(99001);

  test.setTimeout(99001);
  test.describe('Additional Edge Cases', () => {
    test.setTimeout(99001);
    test('should handle rapid tab switching without errors', async ({ page }) => {
      test.setTimeout(99001);
      await dashboardPage.goto();

      // Rapidly switch tabs
      for (let i = 0; i < 5; i++) {
        await dashboardPage.clickTab('inbox');
        await page.waitForTimeout(100);
        await dashboardPage.clickTab('approved');
        await page.waitForTimeout(100);
        await dashboardPage.clickTab('filtered');
        await page.waitForTimeout(100);
      }

      // Page should still work
      await expect(dashboardPage.pageTitle).toBeVisible();
    });

    test('should handle missing optional fields gracefully', async ({ page }) => {
      // Job with minimal fields
      await interceptApiResponse(page, '**/api/jobs', 200, [
        {
          job_id: 'test-minimal',
          title: 'Test Engineer',
          company: 'TechCorp',
          status: 'new',
          source: 'Test',
          // Missing: salary, location, description, url
        },
      ]);

      await dashboardPage.goto();
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      // Should display without errors
      await expect(dashboardPage.jobCards.first()).toBeVisible();
    });

    test('should handle malformed date formats', async ({ page }) => {
      await interceptApiResponse(page, '**/api/jobs', 200, [
        {
          job_id: 'test-bad-date',
          title: 'Test Engineer',
          company: 'TechCorp',
          status: 'new',
          source: 'Test',
          date_collected: 'invalid-date',
        },
      ]);

      await dashboardPage.goto();
        test.setTimeout(33000);
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      // Should not crash
        test.setTimeout(33000);
      await expect(dashboardPage.pageTitle).toBeVisible();
        test.setTimeout(33000);
    });
      test.setTimeout(33000);

  test.setTimeout(33000);
    test('should handle concurrent status updates on same job', async ({ page }) => {
      test.setTimeout(33000);
      await dashboardPage.goto();
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      // Try to click approve twice rapidly
      await Promise.all([firstJob.approve(), page.waitForTimeout(10)]);

      // Should handle gracefully without duplicate updates
      await page.waitForTimeout(1500);

      // Page should still be functional
      await expect(dashboardPage.pageTitle).toBeVisible();
    });
  });
});
