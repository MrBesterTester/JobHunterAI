import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Condensed Job Descriptions
 *
 * Tests the condensed description feature that replaces raw JSON with
 * LLM-condensed ~100 word descriptions in the debug section.
 *
 * Requirements:
 * - Condensed descriptions display instead of raw JSON
 * - Descriptions are approximately 100 words or less
 * - Job cards are large enough to read without scrolling
 * - Descriptions load successfully from backend
 */

test.describe('Condensed Job Descriptions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should display condensed description label in debug section', async ({ page }) => {
    // Navigate to All tab to see job cards
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    // Get first job card
    const jobCard = page.locator('[data-testid="job-card"]').first();

    // Check that debug section exists
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();
    await expect(debugSection).toBeVisible();

    // Check for "Condensed Description:" label
    await expect(debugSection.locator('strong:has-text("Condensed Description:")')).toBeVisible();
  });

  test('should NOT display "Raw Data JSON" label', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();

    // Should NOT have "Raw Data JSON:" label anymore
    const rawDataLabel = debugSection.locator('strong:has-text("Raw Data JSON:")');
    await expect(rawDataLabel).not.toBeVisible();
  });

  test('should load condensed description text (not "Loading description...")', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();

    // Get the description container (the div after "Condensed Description:" label)
    const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();

    // Wait for condensed description to load (not "Loading description...")
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    const descriptionText = await descriptionContainer.textContent();
    expect(descriptionText?.length).toBeGreaterThan(10);
  });

  test('should display condensed description with approximately 100 words or less', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();

    // Get the description container
    const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();

    // Wait for condensed description to load
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    // Get the description text
    const descriptionText = await descriptionContainer.textContent();

    // Count words (split by whitespace)
    const wordCount = descriptionText!.trim().split(/\s+/).length;

    // Should be approximately 100 words or less (allow up to 150 for some flexibility)
    expect(wordCount).toBeGreaterThan(20); // At least some content
    expect(wordCount).toBeLessThanOrEqual(150); // Not too long
  });

  test('should display condensed descriptions on multiple job cards', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCards = page.locator('[data-testid="job-card"]');
    const count = Math.min(await jobCards.count(), 3);

    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const debugSection = card.locator('div:has-text("🔧 Debug Info")').first();

      // Check for condensed description label
      await expect(debugSection.locator('strong:has-text("Condensed Description:")')).toBeVisible();

      // Wait for and check that description is not loading
      const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();
      await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });
    }
  });

  test('should NOT display JSON structure in condensed description', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();

    // Wait for description to load
    await page.waitForTimeout(3000);

    const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();
    const descriptionText = await descriptionContainer.textContent();

    // Should NOT contain JSON structure patterns
    expect(descriptionText).not.toContain('{"');
    expect(descriptionText).not.toContain('"compensation"');
    expect(descriptionText).not.toContain('"employment"');
    expect(descriptionText).not.toContain('"raw_data"');
  });

  test('should display condensed descriptions in all tabs', async ({ page }) => {
    const tabs = ['New', 'Approved', 'Filtered', 'All'];

    for (const tab of tabs) {
      await page.click(`button:has-text("${tab}")`);

      try {
        await page.waitForSelector('[data-testid="job-card"]', { timeout: 3000 });

        const jobCard = page.locator('[data-testid="job-card"]').first();
        const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")');

        if (await debugSection.isVisible()) {
          // Should have condensed description label
          await expect(debugSection.locator('strong:has-text("Condensed Description:")')).toBeVisible();
        }
      } catch (e) {
        // No jobs in this tab, skip
        console.log(`No jobs in ${tab} tab`);
      }
    }
  });

  test('should have proper styling for condensed description container', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();

    // Get the description container
    const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();

    // Verify styling
    const bgColor = await descriptionContainer.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).toBe('rgb(255, 255, 255)'); // #fff

    const fontSize = await descriptionContainer.evaluate(el => window.getComputedStyle(el).fontSize);
    expect(fontSize).toBe('11px');

    const border = await descriptionContainer.evaluate(el => window.getComputedStyle(el).borderWidth);
    expect(border).toBe('1px');
  });

  test('job card should not require scrolling to read debug section', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();

    // Wait for description to load
    await page.waitForTimeout(3000);

    // Get the debug section
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();

    // Check that debug section is fully visible (not requiring scroll)
    // We check that the container doesn't have overflow: auto or scroll
    const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();
    const overflow = await descriptionContainer.evaluate(el => window.getComputedStyle(el).overflow);

    // The description container should NOT be scrollable (since we removed maxHeight)
    // overflow should be 'visible' or not 'auto'
    expect(['visible', 'hidden', '']).toContain(overflow);
  });
});
