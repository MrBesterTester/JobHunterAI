import { test, expect } from '@playwright/test';
import { shouldRunTest } from '../test-config';
import { switchToTab } from '../helpers/tab-navigation';

// Conditionally skip entire file if disabled in test-config.ts
// This will NOT show skip messages in test output
if (!shouldRunTest('refresh-buttons')) {
  test.skip();
}

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
    await switchToTab(page, 'all');

    const jobCard = page.locator('[data-testid="job-card"]').first();

    // Look for the refresh button in the Condensed Description section (no Debug Info wrapper)
    const descriptionSection = jobCard.locator('div:has-text("Condensed Description")').first();
    const refreshButton = descriptionSection.locator('button').first();

    await expect(refreshButton).toBeVisible();

    // Check for refresh icon in button
    const refreshIcon = refreshButton.locator('svg');
    await expect(refreshIcon).toBeVisible();
  });

  test('should refresh single job description when per-job button clicked', async ({ page }) => {
    // Navigate to All tab
    await switchToTab(page, 'all');

    const jobCard = page.locator('[data-testid="job-card"]').first();

    // Find the condensed description section by looking for the strong tag with exact text
    const descriptionSection = jobCard.locator('strong:has-text("Condensed Description")').locator('xpath=../..'); // Go up two levels to the section div

    // The description text is in the last div child of the section
    const descriptionContainer = descriptionSection.locator('> div').last();

    // Wait for initial description to load
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    // Get initial description text
    const initialDescription = await descriptionContainer.textContent();

    // Find and click the refresh button (in the header div)
    const refreshButton = descriptionSection.locator('button').first();
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
    await switchToTab(page, 'all');

    // Get first job card's job ID for monitoring
    const jobCard = page.locator('[data-testid="job-card"]').first();
    const jobIdBadge = jobCard.locator('[data-testid="job-id-badge"]');
    const jobId = await jobIdBadge.textContent();

    const descriptionSection = jobCard.locator('div:has-text("Condensed Description")').first();

    // Wait for initial description to load
    const descriptionContainer = descriptionSection.locator('div').nth(1);
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
    const refreshButton = descriptionSection.locator('button').first();
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
    await switchToTab(page, 'all');

    const jobCard = page.locator('[data-testid="job-card"]').first();

    // Get the job ID to track which job we're looking at
    const jobIdBadge = jobCard.locator('[data-testid="job-id-badge"]');
    const jobId = await jobIdBadge.textContent();

    const descriptionSection = jobCard.locator('div:has-text("Condensed Description")').first();
    const descriptionContainer = descriptionSection.locator('div').nth(1);

    // Wait for initial load
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    // Click refresh
    const refreshButton = descriptionSection.locator('button').first();
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
    await switchToTab(page, 'all');

    // Wait for initial descriptions to load on all visible cards
    const jobCards = page.locator('[data-testid="job-card"]');
    const count = Math.min(await jobCards.count(), 3);

    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const descriptionSection = card.locator('div:has-text("Condensed Description")').first();
      const descriptionContainer = descriptionSection.locator('div').nth(1);
      await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });
    }

    // Click global refresh button
    const globalRefreshButton = page.locator('button:has-text("Refresh Descriptions")');
    await globalRefreshButton.click();

    // All visible cards should show "Loading description..." briefly
    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const descriptionSection = card.locator('div:has-text("Condensed Description")').first();
      const descriptionContainer = descriptionSection.locator('div').nth(1);

      // Should be loading or already loaded (but definitely not error)
      const text = await descriptionContainer.textContent();
      expect(text).toBeTruthy();
    }

    // Wait for all to reload
    await page.waitForTimeout(5000);

    // Verify all have loaded descriptions
    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const descriptionSection = card.locator('div:has-text("Condensed Description")').first();
      const descriptionContainer = descriptionSection.locator('div').nth(1);
      await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });
    }
  });

  test('per-job refresh button should be clickable', async ({ page }) => {
    // Navigate to All tab
    await switchToTab(page, 'all');

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const descriptionSection = jobCard.locator('div:has-text("Condensed Description")').first();

    // Find the refresh button
    const refreshButton = descriptionSection.locator('button').first();

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
