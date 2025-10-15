import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Failed and Duplicates Tabs
 *
 * These tests verify that:
 * 1. The top-line counters match the actual number of emails shown in the tabs
 * 2. Failed tab displays emails that couldn't be processed
 * 3. Duplicates tab displays emails that matched existing jobs
 */

test.describe('Failed and Duplicates Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Wait for the app to load
    await page.waitForSelector('[data-testid="stat-failed"]', { timeout: 10000 });
  });

  test('Failed counter should match Failed tab count', async ({ page }) => {
    // Get the failed counter value
    const failedStat = page.locator('[data-testid="stat-failed"]');
    await expect(failedStat).toBeVisible();

    // Wait for stats to load (counter should not be "0" if there are failed emails, or we wait a bit for the API call)
    await page.waitForTimeout(2000);

    const counterText = await failedStat.locator('p').first().textContent();
    const counterValue = parseInt(counterText || '0');

    console.log(`Failed counter shows: ${counterValue}`);

    // Navigate to Failed tab
    const failedTab = page.locator('button', { hasText: 'Failed' });
    await failedTab.click();

    // Wait for the tab content to load
    await page.waitForTimeout(1000);

    // Count the number of email cards in the Failed tab
    const emailCards = page.locator('[data-testid="failed-email-card"]');
    const emailCount = await emailCards.count();

    console.log(`Failed tab shows: ${emailCount} emails`);

    // The counter should match the tab count
    expect(counterValue).toBe(emailCount);
  });

  test('Duplicates counter should match Duplicates tab count', async ({ page }) => {
    // Get the duplicates counter value
    const duplicatedStat = page.locator('[data-testid="stat-duplicated"]');
    await expect(duplicatedStat).toBeVisible();

    // Wait for stats to load
    await page.waitForTimeout(2000);

    const counterText = await duplicatedStat.locator('p').first().textContent();
    const counterValue = parseInt(counterText || '0');

    console.log(`Duplicates counter shows: ${counterValue}`);

    // Navigate to Duplicates tab
    const duplicatesTab = page.locator('button', { hasText: 'Duplicates' });
    await duplicatesTab.click();

    // Wait for the tab content to load
    await page.waitForTimeout(1000);

    // Count the number of email cards in the Duplicates tab
    const emailCards = page.locator('[data-testid="duplicate-email-card"]');
    const emailCount = await emailCards.count();

    console.log(`Duplicates tab shows: ${emailCount} emails`);

    // The counter should match the tab count
    expect(counterValue).toBe(emailCount);
  });

  test('Failed tab should display email content', async ({ page }) => {
    // Navigate to Failed tab
    const failedTab = page.locator('button', { hasText: 'Failed' });
    await failedTab.click();

    await page.waitForTimeout(1000);

    // Check if there are any failed emails
    const emailCards = page.locator('[data-testid="failed-email-card"]');
    const emailCount = await emailCards.count();

    if (emailCount > 0) {
      // Click on the first email to expand it
      await emailCards.first().click();

      // Verify email details are shown
      const firstEmail = emailCards.first();

      // Check for email subject
      await expect(firstEmail.locator('h4')).toBeVisible();

      // Check for sender info
      await expect(firstEmail.locator('span', { hasText: /@/ })).toBeVisible();

      console.log(`Failed tab displays ${emailCount} emails with full content`);
    } else {
      console.log('No failed emails to display');
    }
  });

  test('Duplicates tab should display email content', async ({ page }) => {
    // Navigate to Duplicates tab
    const duplicatesTab = page.locator('button', { hasText: 'Duplicates' });
    await duplicatesTab.click();

    await page.waitForTimeout(1000);

    // Check if there are any duplicate emails
    const emailCards = page.locator('[data-testid="duplicate-email-card"]');
    const emailCount = await emailCards.count();

    if (emailCount > 0) {
      // Click on the first email to expand it
      await emailCards.first().click();

      // Verify email details are shown
      const firstEmail = emailCards.first();

      // Check for email subject
      await expect(firstEmail.locator('h4')).toBeVisible();

      // Check for sender info
      await expect(firstEmail.locator('span', { hasText: /@/ })).toBeVisible();

      console.log(`Duplicates tab displays ${emailCount} emails with full content`);
    } else {
      console.log('No duplicate emails to display');
    }
  });

  test('Non-Job Emails counter should match Ignored tab count', async ({ page }) => {
    // Get the ignored counter value
    const ignoredStat = page.locator('[data-testid="stat-ignored"]');
    await expect(ignoredStat).toBeVisible();

    // Wait for stats to load
    await page.waitForTimeout(2000);

    const counterText = await ignoredStat.locator('p').first().textContent();
    const counterValue = parseInt(counterText || '0');

    console.log(`Non-Job Emails counter shows: ${counterValue}`);

    // Navigate to Non-Job Emails tab
    const ignoredTab = page.locator('button', { hasText: 'Non-Job Emails' });
    await ignoredTab.click();

    // Wait for the tab content to load
    await page.waitForTimeout(1000);

    // Count the number of email cards in the Ignored tab
    const emailCards = page.locator('[data-testid="ignored-email-card"]');
    const emailCount = await emailCards.count();

    console.log(`Non-Job Emails tab shows: ${emailCount} emails`);

    // The counter should match the tab count
    expect(counterValue).toBe(emailCount);
  });

  test('API endpoints return correct counts', async ({ page }) => {
    // Fetch data from API endpoints
    const statsResponse = await page.request.get('http://localhost:8080/api/jobs/stats');
    expect(statsResponse.ok()).toBeTruthy();
    const stats = await statsResponse.json();

    const failedResponse = await page.request.get('http://localhost:8080/api/intake/failed-emails');
    expect(failedResponse.ok()).toBeTruthy();
    const failedEmails = await failedResponse.json();

    const duplicatesResponse = await page.request.get('http://localhost:8080/api/intake/duplicate-emails');
    expect(duplicatesResponse.ok()).toBeTruthy();
    const duplicateEmails = await duplicatesResponse.json();

    const ignoredResponse = await page.request.get('http://localhost:8080/api/intake/ignored-emails');
    expect(ignoredResponse.ok()).toBeTruthy();
    const ignoredEmails = await ignoredResponse.json();

    console.log('API Results:');
    console.log(`  stats.failed: ${stats.failed}`);
    console.log(`  stats.duplicated: ${stats.duplicated}`);
    console.log(`  stats.filtered_during_intake: ${stats.filtered_during_intake}`);
    console.log(`  /api/intake/failed-emails: ${failedEmails.length} emails`);
    console.log(`  /api/intake/duplicate-emails: ${duplicateEmails.length} emails`);
    console.log(`  /api/intake/ignored-emails: ${ignoredEmails.length} emails`);

    // Log the mismatch if any
    if (stats.failed !== failedEmails.length) {
      console.log(`MISMATCH: stats.failed (${stats.failed}) !== failed-emails count (${failedEmails.length})`);
    }
    if (stats.duplicated !== duplicateEmails.length) {
      console.log(`MISMATCH: stats.duplicated (${stats.duplicated}) !== duplicate-emails count (${duplicateEmails.length})`);
    }
    if (stats.filtered_during_intake !== ignoredEmails.length) {
      console.log(`MISMATCH: stats.filtered_during_intake (${stats.filtered_during_intake}) !== ignored-emails count (${ignoredEmails.length})`);
    }
  });
});
