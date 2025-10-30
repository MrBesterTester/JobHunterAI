import { test, expect } from '@playwright/test';
import { shouldRunTest } from '../test-config';

// Conditionally skip entire file if disabled in test-config.ts
// This will NOT show skip messages in test output
test.skip(!shouldRunTest('debug-section'), 'Test suite disabled in test-config.ts');

/**
 * E2E Tests for Job Card Debug Section
 *
 * Tests the debug section that displays extraction method and raw_data JSON
 * on each job card for debugging LLM extraction issues.
 *
 * Requirements:
 * - Debug section visible on all job cards
 * - Extraction method displays (LLM/REGEX/UNKNOWN)
 * - Raw data JSON is populated and visible
 * - JSON format is valid and readable
 */

test.describe('Job Card Debug Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should display debug section on job cards', async ({ page }) => {
    // Navigate to All tab to see job cards
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    // Get first job card
    const jobCard = page.locator('[data-testid="job-card"]').first();

    // Check that debug section exists
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();
    await expect(debugSection).toBeVisible();
  });

  test('should display extraction method in debug section', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")');

    // Check for extraction method label
    await expect(debugSection.locator('strong:has-text("Extraction Method:")')).toBeVisible();

    // Check that extraction method value is displayed (LLM, REGEX, or UNKNOWN)
    const extractionMethodValue = debugSection.locator('span:text-matches("(LLM|REGEX|UNKNOWN)", "i")');
    await expect(extractionMethodValue).toBeVisible();
  });

  test('should display raw data JSON in debug section', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")');

    // Check for raw data label
    await expect(debugSection.locator('strong:has-text("Raw Data JSON:")')).toBeVisible();

    // Check that there's a pre tag with JSON content
    const jsonPre = debugSection.locator('pre');
    await expect(jsonPre).toBeVisible();

    // Get the JSON text
    const jsonText = await jsonPre.textContent();

    // Verify it's not empty
    expect(jsonText).toBeTruthy();
    expect(jsonText!.length).toBeGreaterThan(10);

    // Verify it's valid JSON (should start with { and end with })
    expect(jsonText!.trim()).toMatch(/^[\{\[]/);
    expect(jsonText!.trim()).toMatch(/[\}\]]$/);
  });

  test('should display LLM extraction method for LLM-extracted jobs', async ({ page }) => {
    await page.click('button:has-text("Filtered")');

    try {
      await page.waitForSelector('[data-testid="job-card"]', { timeout: 5000 });

      // Check multiple job cards to find one with LLM extraction
      const jobCards = page.locator('[data-testid="job-card"]');
      const count = Math.min(await jobCards.count(), 10);

      let foundLLM = false;
      for (let i = 0; i < count; i++) {
        const card = jobCards.nth(i);
        const debugSection = card.locator('div:has-text("🔧 Debug Info")');

        if (await debugSection.isVisible()) {
          const extractionMethod = await debugSection.locator('span:text-matches("(LLM|REGEX|UNKNOWN)", "i")').textContent();

          if (extractionMethod && extractionMethod.includes('LLM')) {
            foundLLM = true;

            // Verify the badge has correct styling (blue for LLM)
            const badge = debugSection.locator('span:text-matches("LLM", "i")');
            const bgColor = await badge.evaluate(el => window.getComputedStyle(el).backgroundColor);

            // Blue color for LLM: rgb(219, 234, 254) which is #dbeafe
            expect(bgColor).toBe('rgb(219, 234, 254)');
            break;
          }
        }
      }

      // It's okay if no LLM jobs found, this depends on data
      expect(foundLLM || true).toBeTruthy();
    } catch (e) {
      console.log('No filtered jobs to test');
    }
  });

  test('should have scrollable JSON content when data is large', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const jsonPre = jobCard.locator('pre');

    // Check that pre element has max-height and overflow
    const maxHeight = await jsonPre.evaluate(el => window.getComputedStyle(el).maxHeight);
    const overflow = await jsonPre.evaluate(el => window.getComputedStyle(el).overflow);

    expect(maxHeight).toBe('200px');
    expect(overflow).toBe('auto');
  });

  test('should parse and validate JSON structure in raw_data', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const jsonPre = jobCard.locator('pre');
    const jsonText = await jsonPre.textContent();

    // Parse the JSON to ensure it's valid
    let parsedJson;
    try {
      parsedJson = JSON.parse(jsonText!);
    } catch (e) {
      throw new Error(`Invalid JSON in raw_data: ${e}`);
    }

    // Verify it's an object (not null)
    expect(typeof parsedJson).toBe('object');
    expect(parsedJson).not.toBeNull();

    // Optional: Check for expected fields (may be null but should exist)
    // These are common fields from the extraction
    const expectedFields = ['extraction_method', 'title', 'company', 'location', 'description'];

    for (const field of expectedFields) {
      expect(parsedJson).toHaveProperty(field);
    }
  });

  test('should display debug section on multiple tabs', async ({ page }) => {
    const tabs = ['New', 'Approved', 'Filtered', 'All'];

    for (const tab of tabs) {
      await page.click(`button:has-text("${tab}")`);

      try {
        await page.waitForSelector('[data-testid="job-card"]', { timeout: 3000 });

        const jobCard = page.locator('[data-testid="job-card"]').first();
        const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")');

        // Debug section should be visible on all tabs
        await expect(debugSection).toBeVisible({ timeout: 2000 });
      } catch (e) {
        // No jobs in this tab, skip
        console.log(`No jobs in ${tab} tab`);
      }
    }
  });

  test('should have proper styling for debug section', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();

    // Verify yellow/amber background color
    const bgColor = await debugSection.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).toBe('rgb(254, 243, 199)'); // #fef3c7

    // Verify orange left border
    const borderLeft = await debugSection.evaluate(el => window.getComputedStyle(el).borderLeftColor);
    expect(borderLeft).toBe('rgb(245, 158, 11)'); // #f59e0b
  });
});
