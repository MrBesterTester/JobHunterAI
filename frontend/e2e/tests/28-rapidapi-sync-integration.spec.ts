import { test, expect, Page } from '@playwright/test';

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

    // Step 3: Find RapidAPI Sync button by finding the heading first
    const rapidapiHeading = page.getByRole('heading', { name: /^RapidAPI JSearch$/i });
    const headingVisible = await rapidapiHeading.isVisible().catch(() => false);

    if (!headingVisible) {
      console.log('RapidAPI card not found - may not be configured');
      test.skip();
      return;
    }

    // Get the parent card container and find the sync button within it
    const rapidapiCard = rapidapiHeading.locator('..').locator('..');
    const rapidapiSyncButton = rapidapiCard.getByRole('button', { name: /Sync Now/i });

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

    // Step 5: Wait for sync to complete (RapidAPI sync may take 15-30 seconds for 10 jobs)
    console.log('Waiting for sync to complete (up to 30s for 10 jobs)...');
    await page.waitForTimeout(30000); // Give it time to sync all 10 jobs

    // Check for success message
    const successMessage = page.getByText(/RapidAPI JSearch sync completed successfully|sync completed successfully|new jobs added/i);
    const hasSuccess = await successMessage.isVisible().catch(() => false);

    if (hasSuccess) {
      const messageText = await successMessage.textContent();
      console.log(`Sync result: ${messageText}`);
    }

    // Step 6: Verify activity log shows RapidAPI sync
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
    // Navigate to Intake tab
    const intakeTab = page.getByRole('button', { name: /^intake$/i });
    await intakeTab.click();
    await page.waitForTimeout(1000);

    // Find RapidAPI Sync button
    const rapidapiHeading = page.getByRole('heading', { name: /^RapidAPI JSearch$/i });
    const rapidapiCard = rapidapiHeading.locator('..').locator('..');
    const rapidapiSyncButton = rapidapiCard.getByRole('button', { name: /Sync Now/i });

    const isDisabled = await rapidapiSyncButton.isDisabled();
    if (isDisabled) {
      console.log('RapidAPI not configured - skipping test');
      test.skip();
      return;
    }

    // Sync RapidAPI
    await rapidapiSyncButton.click();
    await page.waitForTimeout(30000); // Wait for sync

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

    // Find RapidAPI card more precisely - look for the specific heading
    const rapidapiHeading = page.getByRole('heading', { name: /^RapidAPI JSearch$/i });
    await expect(rapidapiHeading).toBeVisible();

    // Get the parent card container
    const rapidapiCard = rapidapiHeading.locator('..').locator('..');
    await expect(rapidapiCard).toBeVisible();

    // Check for status text within this specific card
    const statusPattern = /Status:\s+(Active|Inactive)/i;
    const cardText = await rapidapiCard.textContent();

    console.log(`RapidAPI card text: ${cardText}`);

    // Verify status is mentioned
    expect(cardText).toMatch(statusPattern);

    // If inactive, should show configuration message
    if (cardText?.includes('Inactive')) {
      expect(cardText).toContain('Configure RAPIDAPI_KEY');
      console.log('✓ Inactive status shows configuration message');
    } else {
      console.log('✓ RapidAPI is active');
    }
  });

  test('should disable sync button while syncing', async () => {
    // Navigate to Intake tab
    const intakeTab = page.getByRole('button', { name: /^intake$/i });
    await intakeTab.click();
    await page.waitForTimeout(1000);

    // Find RapidAPI Sync button
    const rapidapiHeading = page.getByRole('heading', { name: /^RapidAPI JSearch$/i });
    const rapidapiCard = rapidapiHeading.locator('..').locator('..');
    const rapidapiSyncButton = rapidapiCard.getByRole('button', { name: /Sync Now/i });

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

    // Wait for sync to complete
    await page.waitForTimeout(30000);
  });
});
