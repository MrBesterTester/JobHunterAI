import { test, expect } from '../fixtures/worker-database';
import { getTestTimeout } from '../helpers/timeout-utils';
import { shouldRunTest } from '../test-config';

// Conditionally skip entire file if disabled in test-config.ts
// This will NOT show skip messages in test output
if (!shouldRunTest('job-badge-styling')) {
  test.skip();
}

/**
 * E2E Tests for Job Badge Styling
 *
 * Tests that all badges have correct colors, styling, and visual appearance
 * based on the trade-off preference hierarchy:
 * - 1099/Schedule C: Green (preferred)
 * - Fully Remote: Blue (preferred)
 * - W-2: Yellow/Amber (neutral)
 * - Company Shuttle: Green (positive perk)
 * - Gen AI: Purple/Indigo (neutral-positive)
 * - Testing Focus: Yellow/Amber (neutral)
 *
 * Phase 5.3.4 - Trade-off Based Job Evaluation Display
 */

test.describe('Job Badge Styling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Click on "All" tab to display job cards
    await page.click('button:has-text("All")');
    // Wait for job cards to load
    await page.waitForSelector('[data-testid="job-card"]', { timeout: getTestTimeout(10000) });
  });

  test('tax structure badge - 1099/Schedule C should be green', async ({ page }) => {
    const taxBadges = page.locator('[data-testid="tax-structure-badge"]');
    const count = await taxBadges.count();

    for (let i = 0; i < count; i++) {
      const badge = taxBadges.nth(i);
      const text = await badge.textContent();

      if (text?.includes('1099') || text?.includes('Schedule C')) {
        // Verify green background
        const bgColor = await badge.evaluate(el => window.getComputedStyle(el).backgroundColor);
        expect(bgColor).toBe('rgb(209, 250, 229)'); // #d1fae5

        // Verify dark green text
        const textColor = await badge.evaluate(el => window.getComputedStyle(el).color);
        expect(textColor).toBe('rgb(6, 95, 70)'); // #065f46
      }
    }
  });

  test('tax structure badge - W-2 should be yellow/amber', async ({ page }) => {
    const taxBadges = page.locator('[data-testid="tax-structure-badge"]');
    const count = await taxBadges.count();

    for (let i = 0; i < count; i++) {
      const badge = taxBadges.nth(i);
      const text = await badge.textContent();

      if (text?.includes('W-2')) {
        // Verify yellow/amber background
        const bgColor = await badge.evaluate(el => window.getComputedStyle(el).backgroundColor);
        expect(bgColor).toBe('rgb(254, 243, 199)'); // #fef3c7

        // Verify dark amber text
        const textColor = await badge.evaluate(el => window.getComputedStyle(el).color);
        expect(textColor).toBe('rgb(146, 64, 14)'); // #92400e
      }
    }
  });

  test('fully remote badge should be blue', async ({ page }) => {
    const remoteBadge = page.locator('[data-testid="fully-remote-badge"]').first();

    if (await remoteBadge.isVisible()) {
      // Verify blue background
      const bgColor = await remoteBadge.evaluate(el => window.getComputedStyle(el).backgroundColor);
      expect(bgColor).toBe('rgb(219, 234, 254)'); // #dbeafe

      // Verify dark blue text
      const textColor = await remoteBadge.evaluate(el => window.getComputedStyle(el).color);
      expect(textColor).toBe('rgb(30, 64, 175)'); // #1e40af

      // Verify font styling
      const fontSize = await remoteBadge.evaluate(el => window.getComputedStyle(el).fontSize);
      expect(fontSize).toBe('12px');

      const fontWeight = await remoteBadge.evaluate(el => window.getComputedStyle(el).fontWeight);
      expect(fontWeight).toBe('500');
    }
  });

  test('company shuttle badge should be green', async ({ page }) => {
    const shuttleBadge = page.locator('[data-testid="shuttle-badge"]').first();

    if (await shuttleBadge.isVisible()) {
      // Verify green background (positive perk)
      const bgColor = await shuttleBadge.evaluate(el => window.getComputedStyle(el).backgroundColor);
      expect(bgColor).toBe('rgb(209, 250, 229)'); // #d1fae5

      // Verify dark green text
      const textColor = await shuttleBadge.evaluate(el => window.getComputedStyle(el).color);
      expect(textColor).toBe('rgb(6, 95, 70)'); // #065f46
    }
  });

  test('generative AI badge should be purple/indigo', async ({ page }) => {
    const aiBadge = page.locator('[data-testid="ai-badge"]').first();

    if (await aiBadge.isVisible()) {
      // Verify purple/indigo background
      const bgColor = await aiBadge.evaluate(el => window.getComputedStyle(el).backgroundColor);
      expect(bgColor).toBe('rgb(224, 231, 255)'); // #e0e7ff

      // Verify dark indigo text
      const textColor = await aiBadge.evaluate(el => window.getComputedStyle(el).color);
      expect(textColor).toBe('rgb(55, 48, 163)'); // #3730a3
    }
  });

  test('testing focus badge should be yellow/amber', async ({ page }) => {
    const testingBadge = page.locator('[data-testid="testing-badge"]').first();

    if (await testingBadge.isVisible()) {
      // Verify yellow/amber background
      const bgColor = await testingBadge.evaluate(el => window.getComputedStyle(el).backgroundColor);
      expect(bgColor).toBe('rgb(254, 243, 199)'); // #fef3c7

      // Verify dark amber text
      const textColor = await testingBadge.evaluate(el => window.getComputedStyle(el).color);
      expect(textColor).toBe('rgb(146, 64, 14)'); // #92400e
    }
  });

  test('all badges should have consistent padding', async ({ page }) => {
    const badgeSelectors = [
      '[data-testid="tax-structure-badge"]',
      '[data-testid="fully-remote-badge"]',
      '[data-testid="shuttle-badge"]',
      '[data-testid="ai-badge"]',
      '[data-testid="testing-badge"]'
    ];

    for (const selector of badgeSelectors) {
      const badge = page.locator(selector).first();
      if (await badge.isVisible()) {
        const padding = await badge.evaluate(el => window.getComputedStyle(el).padding);
        // Padding should be 4px 8px
        expect(padding).toBe('4px 8px');
      }
    }
  });

  test('all badges should have consistent border radius', async ({ page }) => {
    const badgeSelectors = [
      '[data-testid="tax-structure-badge"]',
      '[data-testid="fully-remote-badge"]',
      '[data-testid="shuttle-badge"]',
      '[data-testid="ai-badge"]',
      '[data-testid="testing-badge"]'
    ];

    for (const selector of badgeSelectors) {
      const badge = page.locator(selector).first();
      if (await badge.isVisible()) {
        const borderRadius = await badge.evaluate(el => window.getComputedStyle(el).borderRadius);
        expect(borderRadius).toBe('4px');
      }
    }
  });

  test('existing salary badge styling should remain unchanged', async ({ page }) => {
    const salaryBadge = page.locator('[data-testid="salary-badge"]').first();

    if (await salaryBadge.isVisible()) {
      // Verify it still has salary badge classes
      const classList = await salaryBadge.evaluate(el => Array.from(el.classList));
      expect(classList).toContain('salary-badge');

      // Should be either green or red depending on salary threshold
      const bgColor = await salaryBadge.evaluate(el => window.getComputedStyle(el).backgroundColor);
      expect(bgColor).toMatch(/rgb\((209, 250, 229|254, 226, 226)\)/); // green or red
    }
  });

  test('existing location badge styling should remain unchanged', async ({ page }) => {
    const locationBadge = page.locator('[data-testid="location-badge"]').first();

    if (await locationBadge.isVisible()) {
      // Verify it still has location badge classes
      const classList = await locationBadge.evaluate(el => Array.from(el.classList));
      expect(classList).toContain('location-badge');

      // Should be either blue (remote) or gray (onsite)
      const bgColor = await locationBadge.evaluate(el => window.getComputedStyle(el).backgroundColor);
      expect(bgColor).toMatch(/rgb\((219, 234, 254|243, 244, 246)\)/); // blue or gray
    }
  });

  test('badge container should wrap properly', async ({ page }) => {
    const jobCard = page.locator('[data-testid="job-card"]').first();
    const badgeContainer = jobCard.locator('[data-testid="badge-container"]');

    // Verify flex wrap
    const flexWrap = await badgeContainer.evaluate(el => window.getComputedStyle(el).flexWrap);
    expect(flexWrap).toBe('wrap');

    // Verify gap
    const gap = await badgeContainer.evaluate(el => window.getComputedStyle(el).gap);
    expect(gap).toBe('8px');
  });

  test('badges should be properly aligned in rows', async ({ page }) => {
    const jobCard = page.locator('[data-testid="job-card"]').first();
    const badgeContainer = jobCard.locator('[data-testid="badge-container"]');

    // Verify display flex
    const display = await badgeContainer.evaluate(el => window.getComputedStyle(el).display);
    expect(display).toBe('flex');

    // Verify align-items
    const alignItems = await badgeContainer.evaluate(el => window.getComputedStyle(el).alignItems);
    expect(alignItems).toBe('normal'); // or 'flex-start' depending on browser
  });

  test('modal sections should have consistent header styling', async ({ page }) => {
    test.setTimeout(66000);

    await page.locator('[data-testid="job-card"]').first().click();
    await page.waitForSelector('[data-testid="modal-overlay"]');

    const sections = [
      '[data-testid="compensation-section"]',
      '[data-testid="employment-section"]',
      '[data-testid="location-commute-section"]',
      '[data-testid="technical-section"]'
    ];

    for (const selector of sections) {
      const section = page.locator(selector);
      if (await section.isVisible()) {
        const header = section.locator('h3');

        // Verify font weight
        const fontWeight = await header.evaluate(el => window.getComputedStyle(el).fontWeight);
        expect(fontWeight).toBe('600');

        // Verify color
        const color = await header.evaluate(el => window.getComputedStyle(el).color);
        expect(color).toBe('rgb(17, 24, 39)'); // #111827

        // Verify margin bottom
        const marginBottom = await header.evaluate(el => window.getComputedStyle(el).marginBottom);
        expect(marginBottom).toBe('12px');
      }
    }
  });

  test('modal section grids should be consistent', async ({ page }) => {
    await page.locator('[data-testid="job-card"]').first().click();
    await page.waitForSelector('[data-testid="modal-overlay"]');

    const sections = [
      '[data-testid="compensation-section"]',
      '[data-testid="employment-section"]',
      '[data-testid="location-commute-section"]',
      '[data-testid="technical-section"]'
    ];

    for (const selector of sections) {
      const section = page.locator(selector);
      if (await section.isVisible()) {
        const grid = section.locator('div').nth(1); // The grid container

        // Verify grid layout
        const display = await grid.evaluate(el => window.getComputedStyle(el).display);
        expect(display).toBe('grid');

        // Verify grid columns
        const gridTemplateColumns = await grid.evaluate(el => window.getComputedStyle(el).gridTemplateColumns);
        expect(gridTemplateColumns).toContain('1fr'); // Should have repeat(2, 1fr) or similar

        // Verify gap
        const gap = await grid.evaluate(el => window.getComputedStyle(el).gap);
        expect(gap).toBe('12px');

        // Verify font size
        const fontSize = await grid.evaluate(el => window.getComputedStyle(el).fontSize);
        expect(fontSize).toBe('14px');
      }
    }
  });

  test('modal labels should have consistent styling', async ({ page }) => {
    await page.locator('[data-testid="job-card"]').first().click();
    await page.waitForSelector('[data-testid="modal-overlay"]');

    const sections = [
      '[data-testid="compensation-section"]',
      '[data-testid="employment-section"]'
    ];

    for (const selector of sections) {
      const section = page.locator(selector);
      if (await section.isVisible()) {
        const labels = section.locator('p').filter({ hasText: /Type|Range|Tax|Relationship/ });
        const firstLabel = labels.first();

        if (await firstLabel.isVisible()) {
          // Verify label color (should be gray)
          const color = await firstLabel.evaluate(el => window.getComputedStyle(el).color);
          expect(color).toBe('rgb(107, 114, 128)'); // #6b7280

          // Verify margin bottom
          const marginBottom = await firstLabel.evaluate(el => window.getComputedStyle(el).marginBottom);
          expect(marginBottom).toBe('4px');
        }
      }
    }
  });

  test('modal values should have consistent styling', async ({ page }) => {
    await page.locator('[data-testid="job-card"]').first().click();
    await page.waitForSelector('[data-testid="modal-overlay"]');

    const testIds = [
      '[data-testid="comp-type"]',
      '[data-testid="emp-tax"]',
      '[data-testid="remote-policy"]',
      '[data-testid="tech-category"]'
    ];

    for (const testId of testIds) {
      const value = page.locator(testId);
      if (await value.isVisible()) {
        // Verify font weight
        const fontWeight = await value.evaluate(el => window.getComputedStyle(el).fontWeight);
        expect(fontWeight).toBe('500');

        // Verify color
        const color = await value.evaluate(el => window.getComputedStyle(el).color);
        expect(color).toBe('rgb(55, 65, 81)'); // #374151
      }
    }
  });
});
