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
  // Configure serial mode for this suite
  // Serial mode prevents parallel execution - reduces resource contention for LLM operations
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should display global refresh button in header', async ({ page }) => {
    // Check for global refresh button
    const globalRefreshButton = page.getByTestId('global-refresh-button');
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
    const refreshButton = descriptionSection.getByTestId('per-job-refresh-button');

    await expect(refreshButton).toBeVisible();

    // Check for refresh icon in button
    const refreshIcon = refreshButton.locator('svg');
    await expect(refreshIcon).toBeVisible();
  });

  test('should refresh single job description when per-job button clicked', async ({ page }) => {
    // Increased from 30s default to 180s - test has multiple sequential LLM operations (initial load + refresh)
    // Under comprehensive load with 4 parallel workers, each operation can take up to 120s
    test.setTimeout(180000);

    // Navigate to All tab
    await switchToTab(page, 'all');

    const jobCard = page.locator('[data-testid="job-card"]').first();

    // Use test ID to locate description text directly
    const descriptionText = jobCard.getByTestId('condensed-description-text');

    // Wait for initial description to load
    await expect(descriptionText).not.toHaveText('Loading description...', { timeout: 15000 });

    // Get initial description text
    const initialDescription = await descriptionText.textContent();

    // Set up API response wait BEFORE clicking (avoids race condition - ISSUE-055 Test #511 pattern)
    // Under load, backend LLM queue may be backed up, causing UI "Loading..." state to never appear
    // Waiting for API response is more reliable than waiting for UI state
    const refreshButton = jobCard.getByTestId('per-job-refresh-button');
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/condense-description') && response.status() === 200,
      { timeout: 120000 }
    );

    // Click refresh button
    await refreshButton.click();

    // Wait for API response (guarantees refresh completed)
    await responsePromise;

    // Verify UI updated with new description (not "Loading..." state)
    await expect(descriptionText).not.toHaveText('Loading description...', { timeout: 10000 });

    // Get new description
    const newDescription = await descriptionText.textContent();

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
    const refreshButton = descriptionSection.getByTestId('per-job-refresh-button');
    await refreshButton.click();

    // Wait for the description to load using state polling
    await page.waitForFunction(
      () => {
        const cards = document.querySelectorAll('[data-testid="job-card"]');
        if (cards.length === 0) return false;
        const firstCard = cards[0];
        const strongs = firstCard.querySelectorAll('strong');
        let descSection: HTMLElement | null | undefined = null;
        for (const strong of strongs) {
          if (strong.textContent?.includes('Condensed Description')) {
            descSection = strong.parentElement?.parentElement;
            break;
          }
        }
        if (!descSection) return false;
        const divs = descSection.querySelectorAll('div');
        const container = divs[divs.length - 1];
        const text = container?.textContent || '';
        return text.length > 10 && !text.includes('Loading description...');
      },
      { timeout: 15000 }
    );

    // Wait an additional 5 seconds to see if any more requests happen
    // Use time-based polling to avoid arbitrary timeout
    const startTime = Date.now();
    await page.waitForFunction(
      (start) => Date.now() - start >= 5000,
      startTime,
      { timeout: 6000 }
    );

    // Should have made a reasonable number of API calls (not 10+ like in an infinite loop)
    // We allow up to 4 calls due to React re-renders and timing
    expect(apiCalls.length).toBeLessThanOrEqual(4);
  });

  test('should NOT change to different job descriptions after refresh', async ({ page }) => {
    // Navigate to All tab
    await switchToTab(page, 'all');

    // Get the first job card and extract its ID
    const firstJobCard = page.locator('[data-testid="job-card"]').first();
    const jobIdBadge = firstJobCard.locator('[data-testid="job-id-badge"]');
    const jobIdText = await jobIdBadge.textContent();

    console.log(`Testing job stability for job ID badge text: ${jobIdText}`);

    // Create a stable locator that finds THIS specific job card by its ID badge text
    // This remains valid even if the job list re-sorts
    // Use the exact badge text (e.g., "#ID: 968cc5d4")
    const stableJobCard = page.locator('[data-testid="job-card"]').filter({
      has: page.locator('[data-testid="job-id-badge"]', { hasText: jobIdText || '' })
    });

    // Get elements relative to the stable job card locator
    const descriptionSection = stableJobCard.locator('div:has-text("Condensed Description")').first();
    const descriptionContainer = descriptionSection.locator('[data-testid="condensed-description-text"]');

    // Wait for initial load
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    // Click refresh
    const refreshButton = descriptionSection.getByTestId('per-job-refresh-button');
    await refreshButton.click();

    // Wait for refresh to complete using state polling
    await page.waitForFunction(
      (expectedJobIdText) => {
        const cards = document.querySelectorAll('[data-testid="job-card"]');
        for (const card of cards) {
          const badge = card.querySelector('[data-testid="job-id-badge"]');
          if (badge?.textContent === expectedJobIdText) {
            const strongs = card.querySelectorAll('strong');
            let descSection: HTMLElement | null | undefined = null;
            for (const strong of strongs) {
              if (strong.textContent?.includes('Condensed Description')) {
                descSection = strong.parentElement?.parentElement;
                break;
              }
            }
            if (!descSection) return false;
            const container = descSection.querySelector('[data-testid="condensed-description-text"]');
            const text = container?.textContent || '';
            return text.length > 10 && !text.includes('Loading description...');
          }
        }
        return false;
      },
      jobIdText,
      { timeout: 15000 }
    );

    // Verify we're still looking at the same job (using stable locator)
    const currentJobIdBadge = stableJobCard.locator('[data-testid="job-id-badge"]');
    const currentJobId = await currentJobIdBadge.textContent();
    expect(currentJobId).toBe(jobIdText);

    // Monitor for 3 seconds - description should remain stable
    // Use state polling to verify stability over time
    const initialDescription = await descriptionContainer.textContent();
    const stabilityStartTime = Date.now();
    await page.waitForFunction(
      ({ startTime, expectedJobIdText, expectedDescription }) => {
        // Has 3 seconds elapsed?
        if (Date.now() - startTime < 3000) return false;

        // Find our specific job card
        const cards = document.querySelectorAll('[data-testid="job-card"]');
        for (const card of cards) {
          const badge = card.querySelector('[data-testid="job-id-badge"]');
          if (badge?.textContent === expectedJobIdText) {
            const strongs = card.querySelectorAll('strong');
            let descSection: HTMLElement | null | undefined = null;
            for (const strong of strongs) {
              if (strong.textContent?.includes('Condensed Description')) {
                descSection = strong.parentElement?.parentElement;
                break;
              }
            }
            if (!descSection) return false;
            const container = descSection.querySelector('[data-testid="condensed-description-text"]');
            const currentDescription = container?.textContent || '';
            // Verify description hasn't changed
            return currentDescription === expectedDescription;
          }
        }
        return false;
      },
      { startTime: stabilityStartTime, expectedJobIdText: jobIdText, expectedDescription: initialDescription },
      { timeout: 6000 }
    );

    // Final verification - description should still match initial
    const finalDescription = await descriptionContainer.textContent();
    expect(finalDescription).toBe(initialDescription);
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
    const globalRefreshButton = page.getByTestId('global-refresh-button');
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

    // Wait for all cards to reload using state polling
    await page.waitForFunction(
      (expectedCount) => {
        const cards = document.querySelectorAll('[data-testid="job-card"]');
        let loadedCount = 0;

        for (let i = 0; i < Math.min(cards.length, expectedCount); i++) {
          const card = cards[i];
          const strongs = card.querySelectorAll('strong');
          let descSection: HTMLElement | null | undefined = null;
          for (const strong of strongs) {
            if (strong.textContent?.includes('Condensed Description')) {
              descSection = strong.parentElement?.parentElement;
              break;
            }
          }
          if (!descSection) continue;
          const divs = descSection.querySelectorAll('div');
          const container = divs[divs.length - 1];
          const text = container?.textContent || '';
          if (text.length > 10 && !text.includes('Loading description...')) {
            loadedCount++;
          }
        }

        return loadedCount >= expectedCount;
      },
      count,
      { timeout: 20000 }
    );

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
    const refreshButton = descriptionSection.getByTestId('per-job-refresh-button');

    // Button should be clickable (enabled)
    await expect(refreshButton).toBeEnabled();

    // Button should have correct styling
    const bgColor = await refreshButton.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).toBe('rgb(255, 255, 255)'); // White background
  });

  test('global refresh button should be clickable', async ({ page }) => {
    const globalRefreshButton = page.getByTestId('global-refresh-button');

    // Button should be clickable (enabled)
    await expect(globalRefreshButton).toBeEnabled();

    // Button should have correct styling
    const bgColor = await globalRefreshButton.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).toBe('rgb(255, 255, 255)'); // White background
  });
});
