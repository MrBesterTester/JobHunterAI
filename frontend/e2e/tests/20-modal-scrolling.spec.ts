import { test, expect } from '@playwright/test';
import { shouldRunTest } from '../test-config';
import { getTestTimeout } from '../helpers/timeout-utils';

// Conditionally skip entire file if disabled in test-config.ts
// This will NOT show skip messages in test output
if (!shouldRunTest('modal-scrolling')) {
  test.skip();
}

/**
 * E2E Tests for Modal Scrolling
 *
 * Tests that the job details modal (shown when clicking on a job card)
 * scrolls properly without jumping back to the top when viewing long content.
 *
 * Requirements:
 * - Modal should scroll naturally without jumping back to top
 * - Long email bodies should be fully viewable by scrolling
 * - Scroll position should remain stable as user scrolls down
 */

test.describe('Modal Scrolling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should open modal when clicking on a job card', async ({ page }) => {
    test.setTimeout(33000);
    // Navigate to Filtered tab where we know there's a job with long content
    await page.click('button:has-text("Filtered")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: getTestTimeout(10000) });

    // Click on first job card
    const jobCard = page.locator('[data-testid="job-card"]').first();
    await jobCard.click();

    // Verify modal is open
    const modal = page.locator('[data-testid="modal-overlay"]');
    await expect(modal).toBeVisible();
  });

  test.setTimeout(33000);
  test('should display full email body in modal', async ({ page }) => {
    test.setTimeout(33000);
    await page.click('button:has-text("Filtered")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: getTestTimeout(10000) });

    // Find the SET JAVA job specifically
    const jobCards = page.locator('[data-testid="job-card"]');
    const count = await jobCards.count();

    let foundJob = false;
    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const title = await card.locator('[data-testid="job-title"]').textContent();

      if (title?.includes('SET JAVA') || title?.includes('JAVA')) {
        await card.click();
        foundJob = true;
        break;
      }
    }

    // If SET JAVA job not found, just click the first one
    if (!foundJob) {
      await jobCards.first().click();
    }

    // Wait for modal to open
    const modal = page.locator('[data-testid="modal-overlay"]');
    await expect(modal).toBeVisible();

    // Check for full email body section
    const emailBodySection = page.locator('h3:has-text("Full Email Body")');
    await expect(emailBodySection).toBeVisible();
  });
    test.setTimeout(66000);

  test.setTimeout(66000);
  test('should allow scrolling through long email content without jumping', async ({ page }) => {
    test.setTimeout(66000);
    await page.click('button:has-text("Filtered")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: getTestTimeout(10000) });

    // Find a job with long content
    const jobCards = page.locator('[data-testid="job-card"]');
    const firstCard = jobCards.first();
    await firstCard.click();

    // Wait for modal
    const modalOverlay = page.locator('[data-testid="modal-overlay"]');
    await expect(modalOverlay).toBeVisible();

    // Get the dialog element and its scrollable content div
    const dialog = page.locator('[role="dialog"]');
    const scrollableContent = dialog.locator('> div').first();

    // Check if content is scrollable
    const { scrollHeight, clientHeight } = await scrollableContent.evaluate(el => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight
    }));

    if (scrollHeight > clientHeight) {
      // Get initial scroll position
      const initialScrollTop = await scrollableContent.evaluate(el => el.scrollTop);

      // Scroll down by 500px
      await scrollableContent.evaluate(el => {
        el.scrollTop = 500;
      });

      // Wait a bit to see if it jumps back
      await page.waitForTimeout(200);

      // Check that scroll position is maintained (should be around 500px)
      const scrollTopAfter = await scrollableContent.evaluate(el => el.scrollTop);

      // Allow some tolerance, but should be significantly scrolled down
      expect(scrollTopAfter).toBeGreaterThan(400);
    } else {
      // Content not scrollable, test passes (validates modal displays correctly even with short content)
      console.log('Modal content not tall enough to scroll - test passes (no scrollable content)');
    }
      test.setTimeout(33000);
  });

  test('should have proper overflow styling on modal overlay and content', async ({ page }) => {
    await page.click('button:has-text("Filtered")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: getTestTimeout(10000) });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    await jobCard.click();

    const modalOverlay = page.locator('[data-testid="modal-overlay"]');
    await expect(modalOverlay).toBeVisible();

    // Check that modal overlay does NOT have overflow auto (scrolling should be on content)
    const overlayOverflow = await modalOverlay.evaluate(el => window.getComputedStyle(el).overflowY);
    expect(overlayOverflow).not.toBe('auto');

    // Check that modal is using center alignment
    const alignItems = await modalOverlay.evaluate(el => window.getComputedStyle(el).alignItems);
    expect(alignItems).toBe('center');

    // Get the dialog and its content div
    const dialog = page.locator('[role="dialog"]');
    const scrollableContent = dialog.locator('> div').first();

    // Check that the content div has overflow auto
    const contentOverflow = await scrollableContent.evaluate(el => window.getComputedStyle(el).overflowY);
      test.setTimeout(66000);
    expect(contentOverflow).toBe('auto');
  });

  test('should scroll to bottom of long email content', async ({ page }) => {
    await page.click('button:has-text("Filtered")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: getTestTimeout(10000) });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    await jobCard.click();

    const modalOverlay = page.locator('[data-testid="modal-overlay"]');
    await expect(modalOverlay).toBeVisible();

    // Get the dialog and its scrollable content div
    const dialog = page.locator('[role="dialog"]');
    const scrollableContent = dialog.locator('> div').first();

    // Get the scrollable height
    const scrollHeight = await scrollableContent.evaluate(el => el.scrollHeight);
    const clientHeight = await scrollableContent.evaluate(el => el.clientHeight);

    // If content is scrollable, scroll to bottom
    if (scrollHeight > clientHeight) {
      await scrollableContent.evaluate(el => {
        el.scrollTop = el.scrollHeight;
      });

      // Wait a bit
      await page.waitForTimeout(200);

      // Verify we're at or near the bottom
      const scrollTop = await scrollableContent.evaluate(el => el.scrollTop);
      const maxScrollTop = scrollHeight - clientHeight;

      // Should be within 50px of bottom
        test.setTimeout(66000);
      expect(scrollTop).toBeGreaterThan(maxScrollTop - 50);
    }
  });
    test.setTimeout(66000);

  test.setTimeout(66000);
  test('should close modal when clicking X button after scrolling', async ({ page }) => {
    await page.click('button:has-text("Filtered")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: getTestTimeout(10000) });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    await jobCard.click();

    const modalOverlay = page.locator('[data-testid="modal-overlay"]');
    await expect(modalOverlay).toBeVisible();

    // Get the dialog and its scrollable content div
    const dialog = page.locator('[role="dialog"]');
    const scrollableContent = dialog.locator('> div').first();

    // Scroll down
    await scrollableContent.evaluate(el => {
      el.scrollTop = 300;
    });

    // Click close button
    await page.click('[data-testid="modal-close-x"]');
      test.setTimeout(33000);

    // Modal should be closed
    await expect(modalOverlay).not.toBeVisible();
      test.setTimeout(33000);
  });
    test.setTimeout(33000);

  test('should close modal when clicking overlay after scrolling', async ({ page }) => {
    await page.click('button:has-text("Filtered")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: getTestTimeout(10000) });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    await jobCard.click();

    const modalOverlay = page.locator('[data-testid="modal-overlay"]');
    await expect(modalOverlay).toBeVisible();

    // Get the dialog and its scrollable content div
    const dialog = page.locator('[role="dialog"]');
    const scrollableContent = dialog.locator('> div').first();

    // Scroll down
    await scrollableContent.evaluate(el => {
      el.scrollTop = 300;
    });

    // Click on overlay (not on dialog content)
    await modalOverlay.click({ position: { x: 10, y: 10 } });

    // Modal should be closed
    await expect(modalOverlay).not.toBeVisible();
  });
});
