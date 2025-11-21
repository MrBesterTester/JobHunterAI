import { test, expect } from '@playwright/test';
import { shouldRunTest } from '../test-config';

// Conditionally skip entire file if disabled in test-config.ts
// This will NOT show skip messages in test output
if (!shouldRunTest('refresh-data-button')) {
  test.skip();
}

/**
 * E2E Tests for Refresh Data Button (BUG-0001 Fix)
 *
 * Tests the global "Refresh Data" button that refreshes all data
 * (jobs, stats, applications) without requiring a page reload.
 *
 * Test coverage:
 * - Button visibility and positioning in header
 * - Correct styling (blue primary color)
 * - Triggers API calls when clicked
 * - Functional across different tabs
 * - Has descriptive tooltip
 * - Works on mobile viewport
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

  test('should trigger API calls when clicked', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("Refresh Data")');
    await expect(refreshButton).toBeVisible();

    // Set up network interception
    let requestCount = 0;
    page.on('request', request => {
      if (request.url().includes('/api/jobs') ||
          request.url().includes('/api/stats') ||
          request.url().includes('/api/applications')) {
        requestCount++;
      }
    });

    // Clear initial calls
    requestCount = 0;

    // Click the button
    await refreshButton.click();

    // Wait for operations to complete
    await page.waitForTimeout(3000);

    // Should have made API calls
    expect(requestCount).toBeGreaterThan(0);
  });

  test('should be clickable and enabled', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("Refresh Data")');
    await expect(refreshButton).toBeVisible();
    await expect(refreshButton).toBeEnabled();

    // Should be able to click it
    await refreshButton.click();

    // Wait for operation to complete
    await page.waitForTimeout(2000);

    // Should still be visible after operation
    await expect(refreshButton).toBeVisible();
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

  test('should work on mobile viewport', async ({ page }) => {
    test.setTimeout(66000);

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

    // Wait for operation
    await page.waitForTimeout(2000);

    // Should still be visible
    await expect(refreshButton).toBeVisible();
  });
});
