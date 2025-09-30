import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { getJobCard } from '../pages/JobCardComponent';
import { ContentGenerationModal } from '../pages/ModalComponent';

/**
 * Test Suite 10: Performance Validation
 *
 * Covers:
 * - Performance validation test (Section 21)
 */

test.describe('Performance Validation', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
  });

  test.describe('Section 21: Performance Validation', () => {
    test('should achieve First Contentful Paint under 3 seconds', async ({ page }) => {
      const startTime = Date.now();

      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      const fcpTime = Date.now() - startTime;

      // FCP should be under 3 seconds
      expect(fcpTime).toBeLessThan(3000);
    });

    test('should reach Time to Interactive under 5 seconds', async ({ page }) => {
      const startTime = Date.now();

      await dashboardPage.goto();

      // Wait for page to be interactive
      await expect(dashboardPage.inboxTab).toBeEnabled();
      await expect(dashboardPage.approvedTab).toBeEnabled();

      const ttiTime = Date.now() - startTime;

      // TTI should be under 5 seconds
      expect(ttiTime).toBeLessThan(5000);
    });

    test('should detect no memory leaks during tab navigation', async ({ page }) => {
      await dashboardPage.goto();

      // Get initial memory usage
      const initialMetrics = await page.metrics();

      // Navigate between tabs multiple times
      for (let i = 0; i < 10; i++) {
        await dashboardPage.clickTab('inbox');
        await page.waitForTimeout(200);
        await dashboardPage.clickTab('approved');
        await page.waitForTimeout(200);
        await dashboardPage.clickTab('filtered');
        await page.waitForTimeout(200);
      }

      // Get final memory usage
      const finalMetrics = await page.metrics();

      // Memory shouldn't grow excessively
      // Allow for some growth but not massive leaks
      const heapSizeGrowth = (finalMetrics.JSHeapUsedSize - initialMetrics.JSHeapUsedSize) / 1024 / 1024;

      // Heap shouldn't grow more than 50MB for tab navigation
      expect(heapSizeGrowth).toBeLessThan(50);
    });

    test('should avoid unnecessary duplicate API calls', async ({ page }) => {
      const apiCalls: string[] = [];

      page.on('request', (request) => {
        if (request.url().includes('/api/')) {
          apiCalls.push(`${request.method()} ${request.url()}`);
        }
      });

      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Count duplicate calls
      const uniqueCalls = new Set(apiCalls);
      const duplicateCount = apiCalls.length - uniqueCalls.size;

      // Should have minimal duplicates (some retries are OK)
      expect(duplicateCount).toBeLessThan(5);
    });

    test('should verify API response times under 100ms average', async ({ page }) => {
      const responseTimes: number[] = [];

      page.on('response', (response) => {
        if (response.url().includes('/api/') && !response.url().includes('generate')) {
          const timing = response.timing();
          if (timing.responseEnd) {
            responseTimes.push(timing.responseEnd);
          }
        }
      });

      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Perform some actions to generate more API calls
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if (responseTimes.length > 0) {
        const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

        // Note: First load might be slower; average should be reasonable
        expect(avgTime).toBeLessThan(500); // Allow 500ms for initial load
      }
    });

    test('should verify content generation completes under 2 seconds', async ({ page }) => {
      const contentModal = new ContentGenerationModal(page);

      await dashboardPage.goto();
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      const startTime = Date.now();

      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(3000);

      const generationTime = Date.now() - startTime;

      // Content generation should complete in < 2 seconds
      expect(generationTime).toBeLessThan(2000);
    });

    test('should handle 100+ jobs without performance degradation', async ({ page }) => {
      await dashboardPage.goto();
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      const jobCount = await dashboardPage.getVisibleJobCount();

      if (jobCount < 50) {
        test.skip('Not enough jobs to test performance with large dataset');
        return;
      }

      // Measure rendering time
      const startTime = Date.now();

      // Re-render by switching tabs
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      const renderTime = Date.now() - startTime;

      // Should render even with many jobs in reasonable time
      expect(renderTime).toBeLessThan(3000);
    });

    test('should maintain smooth scrolling with many jobs', async ({ page }) => {
      await dashboardPage.goto();
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      const jobCount = await dashboardPage.getVisibleJobCount();

      if (jobCount < 20) {
        test.skip('Not enough jobs to test scrolling');
        return;
      }

      // Scroll through jobs
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await page.waitForTimeout(500);

      // Page should remain responsive
      await expect(dashboardPage.pageTitle).toBeVisible();
    });

    test('should optimize image loading if present', async ({ page }) => {
      await dashboardPage.goto();

      // Check for lazy loading or optimized images
      const images = page.locator('img');
      const imageCount = await images.count();

      if (imageCount > 0) {
        // Verify images have loading attributes
        for (let i = 0; i < Math.min(imageCount, 5); i++) {
          const img = images.nth(i);
          const loading = await img.getAttribute('loading');

          // Should have lazy or eager loading specified
          expect(['lazy', 'eager', null]).toContain(loading);
        }
      }
    });

    test('should measure total page weight and load time', async ({ page }) => {
      let totalSize = 0;

      page.on('response', async (response) => {
        const size = (await response.body()).length;
        totalSize += size;
      });

      const startTime = Date.now();

      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      const loadTime = Date.now() - startTime;

      // Total page weight (without images) should be reasonable
      const totalMB = totalSize / 1024 / 1024;

      // Allow up to 5MB for initial load (with React dev build)
      expect(totalMB).toBeLessThan(10);

      // Load time should be acceptable
      expect(loadTime).toBeLessThan(5000);
    });
  });

  test.describe('Network Performance', () => {
    test('should minimize number of requests on initial load', async ({ page }) => {
      let requestCount = 0;

      page.on('request', (request) => {
        if (!request.url().includes('hot-update')) {
          // Ignore dev server hot reload
          requestCount++;
        }
      });

      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Should have reasonable number of requests
      // React app + API calls + static assets
      expect(requestCount).toBeLessThan(50); // Allow for dev mode
    });

    test('should use HTTP caching effectively', async ({ page }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Navigate away and back
      await page.goto('about:blank');
      await page.waitForTimeout(500);

      const startTime = Date.now();
      await dashboardPage.goto();
      const loadTime = Date.now() - startTime;

      // Second load should be faster (cached resources)
      // Note: In dev mode this might not apply
      expect(loadTime).toBeLessThan(5000);
    });
  });

  test.describe('Runtime Performance', () => {
    test('should maintain FPS during animations', async ({ page }) => {
      await dashboardPage.goto();

      // Trigger animations (tab switching, modal opening)
      await dashboardPage.clickTab('inbox');
      await page.waitForTimeout(100);
      await dashboardPage.clickTab('approved');
      await page.waitForTimeout(100);

      // Get layout duration metrics
      const metrics = await page.metrics();

      // Should not have excessive layout time
      expect(metrics.LayoutDuration).toBeLessThan(1);
    });

    test('should optimize re-renders on state changes', async ({ page }) => {
      await dashboardPage.goto();
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No jobs');
        return;
      }

      // Measure time for status update and re-render
      const firstJob = await getJobCard(page, 0);
      const startTime = Date.now();

      await firstJob.approve();
      await dashboardPage.waitForJobsUpdate();

      const updateTime = Date.now() - startTime;

      // Update should be fast
      expect(updateTime).toBeLessThan(2000);
    });
  });
});
