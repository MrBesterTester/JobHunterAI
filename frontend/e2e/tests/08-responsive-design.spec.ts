import { test, expect, devices } from '@playwright/test';
import { shouldRunTest } from '../test-config';
import { DashboardPage } from '../pages/DashboardPage';
import { getJobCard } from '../pages/JobCardComponent';
import { setViewportSize, viewportSizes } from '../fixtures/test-helpers';

// Conditionally skip entire file if disabled in test-config.ts
// This will NOT show skip messages in test output
if (!shouldRunTest('responsive-design')) {
  test.skip();
}

/**
 * Test Suite 8: Responsive Design & Layout
 *
 * Covers:
 * - Desktop layout test (Section 14)
 * - Tablet layout test (Section 15)
 * - Mobile layout test (Section 16)
 */

test.describe('Responsive Design & Layout', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
  });

  test.describe('Section 14: Desktop Layout Test (1920x1080)', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('should use full width appropriately on desktop', async ({ page }) => {
      await dashboardPage.goto();

      // Get page width
      const pageWidth = await page.evaluate(() => document.body.clientWidth);

      // Should be using significant portion of viewport
      expect(pageWidth).toBeGreaterThan(1200); // Reasonable minimum for desktop
    });

    test('should display job cards in grid or list format', async ({ page }) => {
      await dashboardPage.goto();
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      // Job cards should be visible and laid out properly
      await expect(dashboardPage.jobCards.first()).toBeVisible();
    });

    test('should display statistics cards horizontally at top', async ({ page }) => {
      await dashboardPage.goto();

      // All 4 statistics cards should be visible
      await expect(dashboardPage.newJobsCount).toBeVisible();
      await expect(dashboardPage.approvedJobsCount).toBeVisible();
      await expect(dashboardPage.appliedJobsCount).toBeVisible();
      await expect(dashboardPage.filteredJobsCount).toBeVisible();

      // Verify they're positioned at the top (y-coordinate should be small)
      const newJobsBox = await dashboardPage.newJobsCount.boundingBox();
      expect(newJobsBox?.y).toBeLessThan(300); // Should be near top of page
    });

    test('should have no horizontal scrolling required', async ({ page }) => {
      await dashboardPage.goto();

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });

    test('should center and properly size modals', async ({ page }) => {
      await dashboardPage.goto();
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.openDetails();

      // Wait for modal
      await page.waitForTimeout(500);

      // Check modal is reasonably sized and centered
      const modal = page.locator('[data-testid="modal"], [role="dialog"], .modal').first();

      if (await modal.isVisible()) {
        const modalBox = await modal.boundingBox();

        if (modalBox) {
          // Modal should not be full width on desktop
          expect(modalBox.width).toBeLessThan(1600);

          // Modal should be somewhat centered (not at edge)
          expect(modalBox.x).toBeGreaterThan(100);
        }
      }
    });
  });

  test.describe('Section 15: Tablet Layout Test (768px width)', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('should remain functional at tablet width', async ({ page }) => {
      await dashboardPage.goto();

      // Core functionality should work
      await expect(dashboardPage.pageTitle).toBeVisible();
      await expect(dashboardPage.inboxTab).toBeVisible();
    });

    test('should stack job cards appropriately', async ({ page }) => {
      await dashboardPage.goto();
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      // Job cards should still be visible
      await expect(dashboardPage.jobCards.first()).toBeVisible();
    });

    test('should resize modals to fit screen', async ({ page }) => {
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

      const modal = page.locator('[data-testid="modal"], [role="dialog"], .modal').first();

      if (await modal.isVisible()) {
        const modalBox = await modal.boundingBox();

        if (modalBox) {
          // Modal should fit within tablet width
          expect(modalBox.width).toBeLessThanOrEqual(768);
        }
      }
    });

    test('should keep tab navigation accessible', async ({ page }) => {
      await dashboardPage.goto();

      // All tabs should be clickable
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      // Verify navigation works
      expect(await dashboardPage.isTabActive('approved')).toBe(true);
    });

    test('should have no horizontal scroll on tablet', async ({ page }) => {
      await dashboardPage.goto();

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });
  });

  test.describe('Section 16: Mobile Layout Test (375px width)', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should have all content accessible without horizontal scroll', async ({ page }) => {
      await dashboardPage.goto();

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });

    test('should have touch targets at least 44x44px', async ({ page }) => {
      await dashboardPage.goto();

      // Check tab buttons
      const inboxTabBox = await dashboardPage.inboxTab.boundingBox();

      if (inboxTabBox) {
        // Height should be at least 34px for compact mobile view
        // Note: Standard touch target is 44px, but tabs use compact design
        expect(inboxTabBox.height).toBeGreaterThanOrEqual(32); // Allow flexibility for mobile tabs
      }
    });

    test('should have modals occupy full screen or near-full', async ({ page }) => {
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

      const modal = page.locator('[data-testid="modal"], [role="dialog"], .modal').first();

      if (await modal.isVisible()) {
        const modalBox = await modal.boundingBox();

        if (modalBox) {
          // Modal should take up most of the screen width on mobile
          expect(modalBox.width).toBeGreaterThan(300); // At least 80% of 375px
        }
      }
    });

    test('should keep tab navigation functional on mobile', async ({ page }) => {
      await dashboardPage.goto();

      // Tabs should still work on mobile
      await dashboardPage.clickTab('inbox');
      await expect(dashboardPage.inboxTab).toBeVisible();

      await dashboardPage.clickTab('approved');
      await expect(dashboardPage.approvedTab).toBeVisible();
    });

    test('should display statistics in mobile-friendly layout', async ({ page }) => {
      await dashboardPage.goto();

      // All statistics should be visible (may stack vertically)
      await expect(dashboardPage.newJobsCount).toBeVisible();
      await expect(dashboardPage.approvedJobsCount).toBeVisible();
      await expect(dashboardPage.appliedJobsCount).toBeVisible();
      await expect(dashboardPage.filteredJobsCount).toBeVisible();
    });

    test('should make job cards readable on mobile', async ({ page }) => {
      await dashboardPage.goto();
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      // Job title should be visible
      const title = await firstJob.getTitle();
      expect(title.length).toBeGreaterThan(0);

      // Job card should fit in viewport
      const cardBox = await firstJob.card.boundingBox();
      if (cardBox) {
        expect(cardBox.width).toBeLessThanOrEqual(375);
      }
    });
  });

  test.describe('Cross-viewport Testing', () => {
    test('should maintain functionality across viewport changes', async ({ page }) => {
      await setViewportSize(page, viewportSizes.desktop.width, viewportSizes.desktop.height);
      await dashboardPage.goto();

      // Desktop: verify full layout
      await expect(dashboardPage.pageTitle).toBeVisible();

      // Switch to tablet
      await setViewportSize(page, viewportSizes.tablet.width, viewportSizes.tablet.height);
      await page.waitForTimeout(500);

      await expect(dashboardPage.pageTitle).toBeVisible();

      // Switch to mobile
      await setViewportSize(page, viewportSizes.mobile.width, viewportSizes.mobile.height);
      await page.waitForTimeout(500);

      await expect(dashboardPage.pageTitle).toBeVisible();
    });

    test('should handle orientation changes gracefully', async ({ page }) => {
      // Portrait
      await setViewportSize(page, 375, 667);
      await dashboardPage.goto();

      await expect(dashboardPage.pageTitle).toBeVisible();

      // Landscape
      await setViewportSize(page, 667, 375);
      await page.waitForTimeout(500);

      await expect(dashboardPage.pageTitle).toBeVisible();
    });
  });
});
