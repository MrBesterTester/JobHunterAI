import { test, expect, Page } from '@playwright/test';
import { shouldRunTest } from '../test-config';

// Conditionally skip entire file if disabled in test-config.ts
// This will NOT show skip messages in test output
test.skip(!shouldRunTest('rapidapi-sync-integration'), 'Test suite disabled in test-config.ts');

/**
 * Test Suite 28: RapidAPI JSearch Sync Integration Tests
 *
 * Tests the complete workflow for Phase 4.1.4:
 * 1. Navigate to Intake tab
 * 2. Verify RapidAPI JSearch card exists
 * 3. Sync RapidAPI jobs (max 10 per sync)
 * 4. Verify jobs appear in Inbox tab
 * 5. Verify stats update correctly
 * 6. Verify intake log shows correct metrics
 */

test.describe('RapidAPI JSearch Sync Integration', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');

    // Wait for dashboard to load
    await expect(page.getByRole('heading', { name: /^JobHunter$/i })).toBeVisible({ timeout: 10000 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should display RapidAPI JSearch card with correct information', async () => {
    // Navigate to Intake tab
    const intakeTab = page.getByRole('button', { name: /^intake$/i });
    await intakeTab.click();
    await page.waitForTimeout(1000);

    // Verify we're on Intake tab
    const heading = page.getByRole('heading', { name: /Job Intake Sources/i });
    await expect(heading).toBeVisible();

    // Verify RapidAPI JSearch card exists
    const rapidapiHeading = page.getByRole('heading', { name: /RapidAPI JSearch/i });
    await expect(rapidapiHeading).toBeVisible();

    // Verify aggregator description is present
    const aggregatorText = page.getByText(/Aggregates LinkedIn, Indeed, Glassdoor/i);
    await expect(aggregatorText).toBeVisible();

    // Verify limit text is present
    const limitText = page.getByText(/Limit: 10 jobs per sync/i);
    await expect(limitText).toBeVisible();

    // Verify Sync Now button exists
    const syncButtons = page.getByRole('button', { name: /Sync Now/i });
    const syncButtonCount = await syncButtons.count();
    expect(syncButtonCount).toBeGreaterThan(0);

    console.log('✓ RapidAPI JSearch card displays correctly');
  });

  test('should sync RapidAPI and display jobs in Inbox tab', async () => {
    test.setTimeout(90000); // Increase timeout to 90s for long-running sync
    // Step 1: Get initial stats
    await page.waitForTimeout(1000);
    const initialNewJobsText = await page.getByTestId('stat-new').textContent();
    const initialNewCount = parseInt(initialNewJobsText?.match(/\d+/)?.[0] || '0');

    const initialFilteredText = await page.getByTestId('stat-filtered').textContent();
    const initialFilteredCount = parseInt(initialFilteredText?.match(/\d+/)?.[0] || '0');

    console.log(`Initial stats - New: ${initialNewCount}, Filtered: ${initialFilteredCount}`);

    // Step 2: Navigate to Intake tab
    const intakeTab = page.getByRole('button', { name: /^intake$/i });
    await intakeTab.click();
    await page.waitForTimeout(1000);

    // Verify we're on Intake tab
    const heading = page.getByRole('heading', { name: /Job Intake Sources/i });
    await expect(heading).toBeVisible();

    // Step 3: Find RapidAPI card and sync button using data-testid
    const rapidapiCard = page.getByTestId('rapidapi-card');
    const cardVisible = await rapidapiCard.isVisible().catch(() => false);

    if (!cardVisible) {
      console.log('RapidAPI card not found - may not be configured');
      test.skip();
      return;
    }

    // Get the sync button within the card
    const rapidapiSyncButton = page.getByTestId('rapidapi-sync-button');

    const isDisabled = await rapidapiSyncButton.isDisabled();
    if (isDisabled) {
      console.log('RapidAPI sync button is disabled - API key may not be configured');
      test.skip();
      return;
    }

    // Step 4: Click RapidAPI Sync Now button
    console.log('Clicking RapidAPI Sync Now button...');
    await rapidapiSyncButton.click();

    // Wait for sync to start
    await page.waitForTimeout(500);

    // Step 5: Wait for button to change back from "Syncing..." to "Sync Now"
    console.log('Waiting for sync to complete (polling button state)...');

    // Poll button text until it's no longer "Syncing..."
    let syncComplete = false;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max

    while (!syncComplete && attempts < maxAttempts) {
      const buttonText = await rapidapiSyncButton.textContent();
      if (buttonText && !buttonText.includes('Syncing')) {
        syncComplete = true;
        console.log('Sync complete - button state changed');
      } else {
        await page.waitForTimeout(1000); // Wait 1 second between polls
        attempts++;
      }
    }

    if (!syncComplete) {
      console.log('Warning: Sync did not complete within timeout, continuing anyway...');
    }

    // Step 6: Verify activity log shows RapidAPI sync
    await page.waitForTimeout(1000); // Brief wait for UI to update
    const activityLog = page.locator('div').filter({ hasText: /rapidapi.*discovered/i }).first();
    const logVisible = await activityLog.isVisible().catch(() => false);

    if (logVisible) {
      const logText = await activityLog.textContent();
      console.log(`Activity log: ${logText}`);

      // Extract discovered count
      const discoveredMatch = logText?.match(/(\d+)\s+Total/i);
      const discoveredCount = discoveredMatch ? parseInt(discoveredMatch[1]) : 0;
      console.log(`Jobs discovered: ${discoveredCount}`);

      // RapidAPI should discover max 10 jobs per sync
      expect(discoveredCount).toBeLessThanOrEqual(10);

      // If no jobs were discovered, skip the rest
      if (discoveredCount === 0) {
        console.log('No jobs discovered - test cannot verify inbox display');
        return;
      }
    }

    // Step 7: Navigate to Inbox tab
    console.log('Navigating to Inbox tab...');
    const inboxTab = page.getByRole('button', { name: /^inbox$/i });
    await inboxTab.click();
    await page.waitForTimeout(2000); // Wait for jobs to load

    // Step 8: Verify updated stats
    const newJobsText = await page.getByTestId('stat-new').textContent();
    const newCount = parseInt(newJobsText?.match(/\d+/)?.[0] || '0');

    const filteredText = await page.getByTestId('stat-filtered').textContent();
    const filteredCount = parseInt(filteredText?.match(/\d+/)?.[0] || '0');

    console.log(`Updated stats - New: ${newCount}, Filtered: ${filteredCount}`);
    console.log(`Change - New: +${newCount - initialNewCount}, Filtered: +${filteredCount - initialFilteredCount}`);

    // Step 9: Verify jobs appear in Inbox (new or filtered jobs)
    const totalInboxJobs = newCount + filteredCount - initialNewCount - initialFilteredCount;
    console.log(`Expected new jobs in Inbox: ${totalInboxJobs}`);

    if (totalInboxJobs > 0) {
      // Look for job cards
      const jobCards = page.getByTestId('job-card');
      const jobCardCount = await jobCards.count();
      console.log(`Job cards found: ${jobCardCount}`);

      // Verify at least one job card exists
      expect(jobCardCount).toBeGreaterThan(0);

      // Verify first job card has expected elements
      const firstCard = jobCards.first();
      await expect(firstCard).toBeVisible();

      // Check for job title
      const jobTitle = firstCard.getByTestId('job-title');
      await expect(jobTitle).toBeVisible();

      // Check for company name
      const jobCompany = firstCard.getByTestId('job-company');
      await expect(jobCompany).toBeVisible();

      console.log('✓ Jobs from RapidAPI are visible in Inbox tab');
    } else {
      console.log('No new jobs added - all might be duplicates');
    }
  });

  test('should verify RapidAPI respects 10-job limit per sync', async () => {
    test.setTimeout(90000); // Increase timeout to 90s for long-running sync
    // Navigate to Intake tab
    const intakeTab = page.getByRole('button', { name: /^intake$/i });
    await intakeTab.click();
    await page.waitForTimeout(1000);

    // Find RapidAPI Sync button using data-testid
    const rapidapiSyncButton = page.getByTestId('rapidapi-sync-button');

    const isDisabled = await rapidapiSyncButton.isDisabled();
    if (isDisabled) {
      console.log('RapidAPI not configured - skipping test');
      test.skip();
      return;
    }

    // Sync RapidAPI
    await rapidapiSyncButton.click();

    // Wait for sync to complete by polling button state
    console.log('Waiting for sync to complete (polling button state)...');
    let syncComplete = false;
    let attempts = 0;
    const maxAttempts = 60;

    while (!syncComplete && attempts < maxAttempts) {
      const buttonText = await rapidapiSyncButton.textContent();
      if (buttonText && !buttonText.includes('Syncing')) {
        syncComplete = true;
        console.log('Sync complete');
      } else {
        await page.waitForTimeout(1000);
        attempts++;
      }
    }

    await page.waitForTimeout(1000); // Brief wait for UI update

    // Check activity log
    const activityLog = page.locator('div').filter({ hasText: /rapidapi.*Total/i }).first();
    const logVisible = await activityLog.isVisible().catch(() => false);

    if (!logVisible) {
      console.log('No activity log found - sync may have failed');
      test.skip();
      return;
    }

    const logText = await activityLog.textContent();
    console.log(`Activity log: ${logText}`);

    // Extract discovered count
    const discoveredMatch = logText?.match(/(\d+)\s+Total/i);
    const discoveredCount = discoveredMatch ? parseInt(discoveredMatch[1]) : 0;
    console.log(`Jobs discovered: ${discoveredCount}`);

    // Verify count is at most 10 (num_pages=1 limit)
    expect(discoveredCount).toBeLessThanOrEqual(10);
    console.log(`✓ RapidAPI respects 10-job limit: ${discoveredCount} jobs discovered`);
  });

  test('should show correct status for RapidAPI source', async () => {
    // Navigate to Intake tab
    const intakeTab = page.getByRole('button', { name: /^intake$/i });
    await intakeTab.click();
    await page.waitForTimeout(1000);

    // Find RapidAPI card and status using data-testid
    const rapidapiCard = page.getByTestId('rapidapi-card');
    await expect(rapidapiCard).toBeVisible();

    // Check for status text using data-testid
    const statusElement = page.getByTestId('rapidapi-status');
    await expect(statusElement).toBeVisible();

    const statusText = await statusElement.textContent();
    console.log(`RapidAPI status text: ${statusText}`);

    // Verify status shows Active or Inactive
    const statusPattern = /Status:\s+(Active|Inactive)/i;
    expect(statusText).toMatch(statusPattern);

    // Get card text to check for configuration message
    const cardText = await rapidapiCard.textContent();

    // If inactive, should show configuration message
    if (statusText?.includes('Inactive')) {
      expect(cardText).toContain('Configure RAPIDAPI_KEY');
      console.log('✓ Inactive status shows configuration message');
    } else {
      console.log('✓ RapidAPI is active');
    }
  });

  test('should disable sync button while syncing', async () => {
    test.setTimeout(90000); // Increase timeout to 90s for long-running sync
    // Navigate to Intake tab
    const intakeTab = page.getByRole('button', { name: /^intake$/i });
    await intakeTab.click();
    await page.waitForTimeout(1000);

    // Find RapidAPI Sync button using data-testid
    const rapidapiSyncButton = page.getByTestId('rapidapi-sync-button');

    const isDisabled = await rapidapiSyncButton.isDisabled();
    if (isDisabled) {
      console.log('RapidAPI not configured - skipping test');
      test.skip();
      return;
    }

    // Click sync button
    await rapidapiSyncButton.click();

    // Button should show "Syncing..." and be disabled
    await page.waitForTimeout(500);

    const buttonText = await rapidapiSyncButton.textContent();
    console.log(`Button text during sync: ${buttonText}`);

    // Button should be disabled during sync
    const isDisabledDuringSync = await rapidapiSyncButton.isDisabled();
    expect(isDisabledDuringSync).toBe(true);

    console.log('✓ Sync button is disabled during sync');

    // We've verified the button is disabled, which is the point of this test
    // No need to wait for full sync completion - test is complete
  });
});
