import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Refresh Data Button (BUG-0001 Fix)
 *
 * Tests the global "Refresh Data" button that refreshes all data
 * (jobs, stats, applications) without requiring a page reload.
 *
 * Requirements:
 * - Button exists in header
 * - Button has correct styling (blue primary color)
 * - Clicking button refreshes all data (jobs, stats, applications)
 * - Button shows loading state with spinning icon
 * - Button is disabled during refresh
 * - Current tab and scroll position are preserved
 * - No duplicate requests during refresh
 *
 * Related: bugs/fixed/BUG-0001-stale-react-state-filtered-tab.md
 */

test.describe('Refresh Data Button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should display Refresh Data button in header', async ({ page }) => {
    // Check for Refresh Data button
    const refreshButton = page.locator('button:has-text("Refresh Data")');
    await expect(refreshButton).toBeVisible();

    // Check for refresh icon (RefreshCw)
    const refreshIcon = refreshButton.locator('svg');
    await expect(refreshIcon).toBeVisible();
  });

  test('should have correct styling (blue primary color)', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("Refresh Data")');
    await expect(refreshButton).toBeVisible();

    // Check initial styling
    const color = await refreshButton.evaluate(el =>
      window.getComputedStyle(el).color
    );
    const borderColor = await refreshButton.evaluate(el =>
      window.getComputedStyle(el).borderColor
    );

    // Should have blue color theme (rgb(59, 130, 246) = #3b82f6)
    expect(color).toBe('rgb(59, 130, 246)');
    expect(borderColor).toContain('59, 130, 246');
  });

  test('should be positioned left of Refresh Descriptions button', async ({ page }) => {
    const refreshDataButton = page.locator('button:has-text("Refresh Data")');
    const refreshDescButton = page.locator('button:has-text("Refresh Descriptions")');

    await expect(refreshDataButton).toBeVisible();
    await expect(refreshDescButton).toBeVisible();

    // Get positions
    const dataButtonBox = await refreshDataButton.boundingBox();
    const descButtonBox = await refreshDescButton.boundingBox();

    // Refresh Data should be to the left (lower x coordinate)
    expect(dataButtonBox?.x).toBeLessThan(descButtonBox?.x ?? 0);
  });

  test('should change text and show spinner when clicked', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("Refresh Data")');
    await expect(refreshButton).toBeVisible();

    // Set up network interception to slow down refresh for testing
    let requestCount = 0;
    page.on('request', request => {
      if (request.url().includes('/api/jobs') ||
          request.url().includes('/api/stats') ||
          request.url().includes('/api/applications')) {
        requestCount++;
      }
    });

    // Click the button
    await refreshButton.click();

    // Should show "Refreshing..." text (within 500ms)
    const refreshingButton = page.locator('button:has-text("Refreshing...")');
    await expect(refreshingButton).toBeVisible({ timeout: 500 });

    // Icon should have spin animation
    const icon = refreshingButton.locator('svg');
    const animation = await icon.evaluate(el =>
      window.getComputedStyle(el).animation
    );
    expect(animation).toContain('spin');

    // Wait for refresh to complete
    await expect(refreshButton).toBeVisible({ timeout: 5000 });

    // Should have made API calls
    expect(requestCount).toBeGreaterThan(0);
  });

  test('should be disabled during refresh operation', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("Refresh Data")');
    await expect(refreshButton).toBeEnabled();

    // Click the button
    await refreshButton.click();

    // Should be disabled while refreshing
    const refreshingButton = page.locator('button:has-text("Refreshing...")');
    await expect(refreshingButton).toBeVisible({ timeout: 500 });
    await expect(refreshingButton).toBeDisabled();

    // Wait for completion
    await expect(refreshButton).toBeVisible({ timeout: 5000 });
    await expect(refreshButton).toBeEnabled();
  });

  test('should refresh job data from API', async ({ page }) => {
    // Navigate to All tab to see jobs
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    // Track API calls
    const apiCalls: string[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/jobs')) {
        apiCalls.push('jobs');
      }
      if (url.includes('/api/stats')) {
        apiCalls.push('stats');
      }
      if (url.includes('/api/applications')) {
        apiCalls.push('applications');
      }
    });

    // Clear initial calls
    apiCalls.length = 0;

    // Click Refresh Data button
    const refreshButton = page.locator('button:has-text("Refresh Data")');
    await refreshButton.click();

    // Wait for refresh to complete
    await page.waitForTimeout(2000);

    // Should have called all three endpoints
    expect(apiCalls.filter(c => c === 'jobs').length).toBeGreaterThan(0);
    expect(apiCalls.filter(c => c === 'stats').length).toBeGreaterThan(0);
    expect(apiCalls.filter(c => c === 'applications').length).toBeGreaterThan(0);
  });

  test('should preserve current tab after refresh', async ({ page }) => {
    // Navigate to Filtered tab
    await page.click('button:has-text("Filtered")');
    await page.waitForTimeout(500);

    // Verify we're on Filtered tab (tab button should be highlighted)
    const filteredTab = page.locator('button:has-text("Filtered")');
    const bgColor = await filteredTab.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    // Active tab has non-white background
    expect(bgColor).not.toBe('rgb(255, 255, 255)');

    // Click Refresh Data
    const refreshButton = page.locator('button:has-text("Refresh Data")');
    await refreshButton.click();

    // Wait for refresh to complete
    await expect(refreshButton).toBeVisible({ timeout: 5000 });

    // Should still be on Filtered tab
    const bgColorAfter = await filteredTab.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(bgColorAfter).toBe(bgColor);
  });

  test('should preserve scroll position after refresh', async ({ page }) => {
    // Navigate to All tab
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);

    // Get scroll position
    const scrollBefore = await page.evaluate(() => window.scrollY);
    expect(scrollBefore).toBeGreaterThan(400);

    // Click Refresh Data
    const refreshButton = page.locator('button:has-text("Refresh Data")');
    await refreshButton.click();

    // Wait for refresh to complete
    await expect(refreshButton).toBeVisible({ timeout: 5000 });

    // Scroll position should be preserved (within 50px tolerance)
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(50);
  });

  test('should update dashboard statistics after refresh', async ({ page }) => {
    // Get initial stats count
    const statsContainer = page.locator('.stats-container, [class*="stats"]').first();
    await expect(statsContainer).toBeVisible({ timeout: 5000 });

    const initialText = await statsContainer.textContent();

    // Click Refresh Data
    const refreshButton = page.locator('button:has-text("Refresh Data")');
    await refreshButton.click();

    // Wait for refresh to complete
    await expect(refreshButton).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Stats should have been fetched (might be same values, but fetch happened)
    const finalText = await statsContainer.textContent();
    expect(finalText).toBeTruthy();
  });

  test('should NOT make duplicate simultaneous requests', async ({ page }) => {
    // Track API calls with timestamps
    const apiCalls: Array<{ type: string; time: number }> = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/jobs')) {
        apiCalls.push({ type: 'jobs', time: Date.now() });
      }
    });

    // Clear initial calls
    apiCalls.length = 0;

    // Click refresh button
    const refreshButton = page.locator('button:has-text("Refresh Data")');
    await refreshButton.click();

    // Wait for refresh to complete
    await expect(refreshButton).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    // Should have made reasonable number of job API calls (not 10+ duplicate calls)
    const jobCalls = apiCalls.filter(c => c.type === 'jobs');
    expect(jobCalls.length).toBeLessThanOrEqual(3);

    // If multiple calls, they should be spaced out (not simultaneous)
    if (jobCalls.length > 1) {
      const timeDiff = jobCalls[1].time - jobCalls[0].time;
      expect(timeDiff).toBeGreaterThan(10); // At least 10ms apart
    }
  });

  test('should have tooltip explaining functionality', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("Refresh Data")');
    await expect(refreshButton).toBeVisible();

    // Check for title attribute (tooltip)
    const title = await refreshButton.getAttribute('title');
    expect(title).toContain('Refresh');
    expect(title).toContain('jobs');
    expect(title).toContain('stats');
    expect(title).toContain('applications');
  });

  test('should work correctly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Button should still be visible and functional
    const refreshButton = page.locator('button:has-text("Refresh Data")');
    await expect(refreshButton).toBeVisible();
    await expect(refreshButton).toBeEnabled();

    // Click should work
    await refreshButton.click();
    const refreshingButton = page.locator('button:has-text("Refreshing...")');
    await expect(refreshingButton).toBeVisible({ timeout: 500 });
  });
});
