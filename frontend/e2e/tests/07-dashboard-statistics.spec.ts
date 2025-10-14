import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Dashboard Statistics
 *
 * Tests that the top-line dashboard statistics counters display correct values
 * from the backend /api/jobs/stats endpoint, especially the MECE counters
 * from job_intake_logs.
 *
 * Phase 5.3.4 - Trade-off Based Job Evaluation Display
 */

test.describe('Dashboard Statistics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Wait for the app to load
    await page.waitForSelector('[data-testid="stat-filtered"]', { timeout: 10000 });
  });

  test('should display filtered counter from intake logs', async ({ page }) => {
    const filteredStat = page.locator('[data-testid="stat-filtered"]');
    await expect(filteredStat).toBeVisible();

    const count = await filteredStat.locator('p').first().textContent();
    expect(count).toMatch(/^\d+$/); // Should be a number
  });

  test('should display ignored counter from intake logs', async ({ page }) => {
    const ignoredStat = page.locator('[data-testid="stat-ignored"]');
    await expect(ignoredStat).toBeVisible();

    const count = await ignoredStat.locator('p').first().textContent();
    expect(count).toMatch(/^\d+$/);
  });

  test('should display failed counter from intake logs', async ({ page }) => {
    const failedStat = page.locator('[data-testid="stat-failed"]');
    await expect(failedStat).toBeVisible();

    const count = await failedStat.locator('p').first().textContent();
    expect(count).toMatch(/^\d+$/);
  });

  test('should display duplicates counter from intake logs', async ({ page }) => {
    const duplicatedStat = page.locator('[data-testid="stat-duplicated"]');
    await expect(duplicatedStat).toBeVisible();

    const count = await duplicatedStat.locator('p').first().textContent();
    expect(count).toMatch(/^\d+$/);
  });

  test('should display new counter from jobs table', async ({ page }) => {
    const newStat = page.locator('[data-testid="stat-new"]');
    await expect(newStat).toBeVisible();

    const count = await newStat.locator('p').first().textContent();
    expect(count).toMatch(/^\d+$/);
  });

  test('should display approved counter from jobs table', async ({ page }) => {
    const approvedStat = page.locator('[data-testid="stat-approved"]');
    await expect(approvedStat).toBeVisible();

    const count = await approvedStat.locator('p').first().textContent();
    expect(count).toMatch(/^\d+$/);
  });

  test('should display applied counter from jobs table', async ({ page }) => {
    const appliedStat = page.locator('[data-testid="stat-applied"]');
    await expect(appliedStat).toBeVisible();

    const count = await appliedStat.locator('p').first().textContent();
    expect(count).toMatch(/^\d+$/);
  });

  test('should display total counter from intake logs discovered count', async ({ page }) => {
    const totalStat = page.locator('[data-testid="stat-total"]');
    await expect(totalStat).toBeVisible();

    const count = await totalStat.locator('p').first().textContent();
    expect(count).toMatch(/^\d+$/);
  });

  test('Total should equal discovered job opportunities from intake', async ({ page }) => {
    // Fetch stats from API
    const response = await page.request.get('http://localhost:8080/api/jobs/stats');
    expect(response.ok()).toBeTruthy();

    const stats = await response.json();

    // Get Total from UI
    const totalStat = page.locator('[data-testid="stat-total"]');
    const totalText = await totalStat.locator('p').first().textContent();
    const totalUI = parseInt(totalText || '0');

    // Total should equal discovered count from backend
    expect(totalUI).toBe(stats.discovered || 0);
  });

  test('should display processed counter from intake logs', async ({ page }) => {
    const processedStat = page.locator('[data-testid="stat-created"]');
    await expect(processedStat).toBeVisible();

    const count = await processedStat.locator('p').first().textContent();
    expect(count).toMatch(/^\d+$/);

    // Check label says "Processed"
    const label = await processedStat.locator('p').nth(1).textContent();
    expect(label).toBe('Processed');
  });

  test('MECE validation: discovered = failed + filtered + duplicated + processed', async ({ page }) => {
    // Fetch stats from API
    const response = await page.request.get('http://localhost:8080/api/jobs/stats');
    expect(response.ok()).toBeTruthy();

    const stats = await response.json();

    // MECE equation: discovered = failed + filtered + duplicated + created (processed)
    const discovered = stats.discovered || 0;
    const failed = stats.failed || 0;
    const filtered = stats.filtered || 0;
    const duplicated = stats.duplicated || 0;
    const processed = stats.created || 0;

    // Validate MECE: the sum should equal discovered
    const sum = failed + filtered + duplicated + processed;
    expect(sum).toBe(discovered);

    // Also validate backend returned mece_valid=1
    expect(stats.mece_valid).toBe(1);
  });

  test('all stat counters should be non-negative', async ({ page }) => {
    const statSelectors = [
      '[data-testid="stat-filtered"]',
      '[data-testid="stat-ignored"]',
      '[data-testid="stat-failed"]',
      '[data-testid="stat-duplicated"]',
      '[data-testid="stat-created"]',
      '[data-testid="stat-new"]',
      '[data-testid="stat-approved"]',
      '[data-testid="stat-applied"]',
      '[data-testid="stat-total"]'
    ];

    for (const selector of statSelectors) {
      const stat = page.locator(selector);
      const countText = await stat.locator('p').first().textContent();
      const count = parseInt(countText || '0');

      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('stat labels should be correctly named', async ({ page }) => {
    const expectations = [
      { testId: 'stat-filtered', label: 'Filtered' },
      { testId: 'stat-ignored', label: 'Non-Job Emails' },
      { testId: 'stat-failed', label: 'Failed' },
      { testId: 'stat-duplicated', label: 'Duplicates' },
      { testId: 'stat-created', label: 'Processed' },
      { testId: 'stat-new', label: 'New' },
      { testId: 'stat-approved', label: 'Approved' },
      { testId: 'stat-applied', label: 'Applied' },
      { testId: 'stat-total', label: 'Total' }
    ];

    for (const { testId, label } of expectations) {
      const stat = page.locator(`[data-testid="${testId}"]`);
      const labelElement = stat.locator('p').nth(1);
      await expect(labelElement).toHaveText(label);
    }
  });

  test('stat counters should have consistent styling', async ({ page }) => {
    const statSelectors = [
      '[data-testid="stat-filtered"]',
      '[data-testid="stat-ignored"]',
      '[data-testid="stat-failed"]',
      '[data-testid="stat-duplicated"]'
    ];

    for (const selector of statSelectors) {
      const stat = page.locator(selector);
      const numberElement = stat.locator('p').first();

      // Check font size
      const fontSize = await numberElement.evaluate(el => window.getComputedStyle(el).fontSize);
      expect(fontSize).toBe('24px');

      // Check font weight
      const fontWeight = await numberElement.evaluate(el => window.getComputedStyle(el).fontWeight);
      expect(fontWeight).toBe('700'); // bold
    }
  });

  test('filtered stat should have orange color', async ({ page }) => {
    const filteredStat = page.locator('[data-testid="stat-filtered"]');
    const numberElement = filteredStat.locator('p').first();

    const color = await numberElement.evaluate(el => window.getComputedStyle(el).color);
    expect(color).toBe('rgb(249, 115, 22)'); // #f97316 (orange)
  });

  test('ignored stat should have red color', async ({ page }) => {
    const ignoredStat = page.locator('[data-testid="stat-ignored"]');
    const numberElement = ignoredStat.locator('p').first();

    const color = await numberElement.evaluate(el => window.getComputedStyle(el).color);
    expect(color).toBe('rgb(220, 38, 38)'); // #dc2626 (red)
  });

  test('failed stat should have red color', async ({ page }) => {
    const failedStat = page.locator('[data-testid="stat-failed"]');
    const numberElement = failedStat.locator('p').first();

    const color = await numberElement.evaluate(el => window.getComputedStyle(el).color);
    expect(color).toBe('rgb(239, 68, 68)'); // #ef4444 (red)
  });

  test('total stat should have gray color', async ({ page }) => {
    const totalStat = page.locator('[data-testid="stat-total"]');
    const numberElement = totalStat.locator('p').first();

    const color = await numberElement.evaluate(el => window.getComputedStyle(el).color);
    expect(color).toBe('rgb(107, 114, 128)'); // #6b7280 (gray)
  });
});
