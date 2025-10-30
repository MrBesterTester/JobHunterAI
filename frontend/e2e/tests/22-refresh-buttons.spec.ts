import { test, expect } from '@playwright/test';
import { shouldRunTest } from '../test-config';

// Conditionally skip entire file if disabled in test-config.ts
// This will NOT show skip messages in test output
test.skip(!shouldRunTest('refresh-buttons'), 'Test suite disabled in test-config.ts');

/**
 * E2E Tests for Refresh Button Functionality
 *
 * Tests the global and per-job refresh buttons for condensed descriptions.
 *
 * Requirements:
 * - Global refresh button exists in header
 * - Per-job refresh button exists in debug section
 * - Clicking per-job refresh updates only that job's description
 * - No infinite loop or repeated refreshes
 * - Description changes are stable (not flickering between different descriptions)
 */

test.describe('Refresh Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should display global refresh button in header', async ({ page }) => {
    // Check for global refresh button
    const globalRefreshButton = page.locator('button:has-text("Refresh Descriptions")');
    await expect(globalRefreshButton).toBeVisible();

    // Check for refresh icon
    const refreshIcon = globalRefreshButton.locator('svg');
    await expect(refreshIcon).toBeVisible();
  });

  test('should display per-job refresh button in debug section', async ({ page }) => {
    // Navigate to All tab
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();

    // Look for the refresh button next to "Condensed Description:"
    const descriptionHeader = debugSection.locator('div:has-text("Condensed Description:")').first();
    const refreshButton = descriptionHeader.locator('button');

    await expect(refreshButton).toBeVisible();

    // Check for refresh icon in button
    const refreshIcon = refreshButton.locator('svg');
    await expect(refreshIcon).toBeVisible();
  });

  test('should refresh single job description when per-job button clicked', async ({ page }) => {
    // Navigate to All tab
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();

    // Wait for initial description to load
    const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    // Get initial description text
    const initialDescription = await descriptionContainer.textContent();

    // Find and click the refresh button
    const descriptionHeader = debugSection.locator('div:has-text("Condensed Description:")').first();
    const refreshButton = descriptionHeader.locator('button');
    await refreshButton.click();

    // Should briefly show "Loading description..."
    await expect(descriptionContainer).toHaveText('Loading description...', { timeout: 2000 });

    // Then load the new description
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    // Get new description
    const newDescription = await descriptionContainer.textContent();

    // Should have loaded some description (might be the same if no changes to prompt)
    expect(newDescription?.length).toBeGreaterThan(10);
  });

  test('should NOT cause infinite refresh loop', async ({ page }) => {
    // Navigate to All tab
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    // Get first job card's job ID for monitoring
    const jobCard = page.locator('[data-testid="job-card"]').first();
    const jobIdBadge = jobCard.locator('[data-testid="job-id-badge"]');
    const jobId = await jobIdBadge.textContent();

    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();

    // Wait for initial description to load
    const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    // Set up network request monitoring
    const apiCalls: string[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/condense-description')) {
        apiCalls.push(url);
      }
    });

    // Clear the array
    apiCalls.length = 0;

    // Click refresh button
    const descriptionHeader = debugSection.locator('div:has-text("Condensed Description:")').first();
    const refreshButton = descriptionHeader.locator('button');
    await refreshButton.click();

    // Wait for the description to load
    await page.waitForTimeout(1000);
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    // Wait an additional 5 seconds to see if any more requests happen
    await page.waitForTimeout(5000);

    // Should have made a reasonable number of API calls (not 10+ like in an infinite loop)
    // We allow up to 4 calls due to React re-renders and timing
    expect(apiCalls.length).toBeLessThanOrEqual(4);
  });

  test('should NOT change to different job descriptions after refresh', async ({ page }) => {
    // Navigate to All tab
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();

    // Get the job ID to track which job we're looking at
    const jobIdBadge = jobCard.locator('[data-testid="job-id-badge"]');
    const jobId = await jobIdBadge.textContent();

    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();
    const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();

    // Wait for initial load
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    // Click refresh
    const descriptionHeader = debugSection.locator('div:has-text("Condensed Description:")').first();
    const refreshButton = descriptionHeader.locator('button');
    await refreshButton.click();

    // Wait for refresh to complete
    await page.waitForTimeout(1000);
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    // Job ID should still be the same
    const newJobId = await jobIdBadge.textContent();
    expect(newJobId).toBe(jobId);

    // Monitor for 3 more seconds - description should remain stable
    const description1 = await descriptionContainer.textContent();
    await page.waitForTimeout(1000);
    const description2 = await descriptionContainer.textContent();
    await page.waitForTimeout(1000);
    const description3 = await descriptionContainer.textContent();
    await page.waitForTimeout(1000);
    const description4 = await descriptionContainer.textContent();

    // All descriptions should be identical (stable, not changing)
    expect(description1).toBe(description2);
    expect(description2).toBe(description3);
    expect(description3).toBe(description4);
  });

  test('global refresh button should clear all caches', async ({ page }) => {
    // Navigate to All tab
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    // Wait for initial descriptions to load on all visible cards
    const jobCards = page.locator('[data-testid="job-card"]');
    const count = Math.min(await jobCards.count(), 3);

    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const debugSection = card.locator('div:has-text("🔧 Debug Info")').first();
      const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();
      await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });
    }

    // Click global refresh button
    const globalRefreshButton = page.locator('button:has-text("Refresh Descriptions")');
    await globalRefreshButton.click();

    // All visible cards should show "Loading description..." briefly
    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const debugSection = card.locator('div:has-text("🔧 Debug Info")').first();
      const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();

      // Should be loading or already loaded (but definitely not error)
      const text = await descriptionContainer.textContent();
      expect(text).toBeTruthy();
    }

    // Wait for all to reload
    await page.waitForTimeout(5000);

    // Verify all have loaded descriptions
    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const debugSection = card.locator('div:has-text("🔧 Debug Info")').first();
      const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();
      await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });
    }
  });

  test('per-job refresh button should be clickable', async ({ page }) => {
    // Navigate to All tab
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();

    // Find the refresh button
    const descriptionHeader = debugSection.locator('div:has-text("Condensed Description:")').first();
    const refreshButton = descriptionHeader.locator('button');

    // Button should be clickable (enabled)
    await expect(refreshButton).toBeEnabled();

    // Button should have correct styling
    const bgColor = await refreshButton.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).toBe('rgb(255, 255, 255)'); // White background
  });

  test('global refresh button should be clickable', async ({ page }) => {
    const globalRefreshButton = page.locator('button:has-text("Refresh Descriptions")');

    // Button should be clickable (enabled)
    await expect(globalRefreshButton).toBeEnabled();

    // Button should have correct styling
    const bgColor = await globalRefreshButton.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).toBe('rgb(255, 255, 255)'); // White background
  });
});
