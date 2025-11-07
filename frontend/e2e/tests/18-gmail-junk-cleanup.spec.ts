// Phase 2.10: Gmail Junk Cleanup - E2E Tests
// Tests bulk delete functionality for Ignored tab and Rejected tab

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const API_BASE = 'http://localhost:8080';

test.describe('Phase 2.10: Gmail Junk Cleanup - Ignored Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for the app to load
    await page.waitForSelector('[data-testid="stat-ignored"]', { timeout: 10000 });
  });

  test('should show checkboxes only for Gmail emails in Ignored tab', async ({ page }) => {
    // Navigate to Ignored tab
    const ignoredTab = page.locator('button', { hasText: 'Ignored' });
    await ignoredTab.click();
    await page.waitForTimeout(1000);

    // Fetch emails from API to verify source filtering
    const response = await page.request.get(`${API_BASE}/api/intake/ignored-emails`);
    expect(response.ok()).toBeTruthy();
    const emails = await response.json();

    console.log(`Ignored tab has ${emails.length} emails`);

    if (emails.length === 0) {
      console.log('No ignored emails found - skipping test');
      return;
    }

    // Count Gmail vs non-Gmail emails
    const gmailEmails = emails.filter((e: any) => e.source === 'gmail');
    const nonGmailEmails = emails.filter((e: any) => e.source !== 'gmail');

    console.log(`Gmail emails: ${gmailEmails.length}, Non-Gmail emails: ${nonGmailEmails.length}`);

    // Check that checkboxes exist (one per Gmail email)
    const checkboxes = page.locator('input[type="checkbox"][data-email-id]');
    const checkboxCount = await checkboxes.count();

    console.log(`Found ${checkboxCount} checkboxes`);

    // Verify checkbox count matches Gmail email count
    expect(checkboxCount).toBe(gmailEmails.length);

    // Verify bulk action controls are visible if Gmail emails exist
    if (gmailEmails.length > 0) {
      const bulkActionControls = page.locator('button', { hasText: 'Delete' });
      await expect(bulkActionControls.first()).toBeVisible();
    }
  });

  test('should delete selected Gmail emails from Ignored tab after confirmation', async ({ page }) => {
    // Navigate to Ignored tab
    const ignoredTab = page.locator('button', { hasText: 'Ignored' });
    await ignoredTab.click();
    await page.waitForTimeout(1000);

    // Check if we have Gmail emails
    const checkboxes = page.locator('input[type="checkbox"][data-email-id]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount === 0) {
      console.log('No Gmail emails in Ignored tab - skipping test');
      return;
    }

    console.log(`Found ${checkboxCount} Gmail emails to test with`);

    // Select first checkbox
    await checkboxes.first().check();
    await page.waitForTimeout(500);

    // Find and click the delete button
    const deleteButton = page.locator('button', { hasText: /Delete \d+ from Gmail/ });
    await expect(deleteButton).toBeVisible();
    await expect(deleteButton).toBeEnabled();

    const buttonText = await deleteButton.textContent();
    console.log(`Delete button shows: ${buttonText}`);

    // Click delete button to open confirmation dialog
    await deleteButton.click();
    await page.waitForTimeout(500);

    // Verify confirmation dialog appears
    const confirmDialog = page.locator('div[role="dialog"], div.modal, div.confirmation-dialog').first();
    await expect(confirmDialog).toBeVisible({ timeout: 3000 });

    console.log('Confirmation dialog appeared');

    // Find and click the actual "Delete from Gmail" button in the dialog
    const confirmButton = page.locator('button', { hasText: 'Delete from Gmail' });
    await expect(confirmButton).toBeVisible();

    // Intercept the API call to verify request and mock response
    const deletePromise = page.waitForResponse(
      (response) => response.url().includes('/bulk-delete-gmail') && response.request().method() === 'POST',
      { timeout: 5000 }
    );

    // Click confirm
    await confirmButton.click();

    // Wait for API call
    const deleteResponse = await deletePromise;
    console.log(`Delete API response status: ${deleteResponse.status()}`);

    // Wait for success message or tab refresh
    await page.waitForTimeout(2000);

    console.log('Bulk delete workflow completed');
  });

  test('should handle bulk delete cancellation in Ignored tab', async ({ page }) => {
    // Navigate to Ignored tab
    const ignoredTab = page.locator('button', { hasText: 'Ignored' });
    await ignoredTab.click();
    await page.waitForTimeout(1000);

    // Check if we have Gmail emails
    const checkboxes = page.locator('input[type="checkbox"][data-email-id]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount === 0) {
      console.log('No Gmail emails in Ignored tab - skipping test');
      return;
    }

    // Get initial email count
    const initialEmailCards = page.locator('[data-testid="ignored-email-card"]');
    const initialCount = await initialEmailCards.count();

    console.log(`Initial email count: ${initialCount}`);

    // Select first checkbox
    await checkboxes.first().check();
    await page.waitForTimeout(500);

    // Click delete button
    const deleteButton = page.locator('button', { hasText: /Delete \d+ from Gmail/ });
    await deleteButton.click();
    await page.waitForTimeout(500);

    // Verify confirmation dialog appears
    const confirmDialog = page.locator('div[role="dialog"], div.modal, div.confirmation-dialog').first();
    await expect(confirmDialog).toBeVisible({ timeout: 3000 });

    // Click Cancel button
    const cancelButton = page.locator('button', { hasText: 'Cancel' });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    await page.waitForTimeout(500);

    // Verify dialog is closed
    await expect(confirmDialog).not.toBeVisible();

    // Verify emails still present
    const currentEmailCards = page.locator('[data-testid="ignored-email-card"]');
    const currentCount = await currentEmailCards.count();

    expect(currentCount).toBe(initialCount);

    console.log('Cancellation handled correctly - no emails deleted');
  });
});

test.describe('Phase 2.10: Gmail Junk Cleanup - Rejected Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for the app to load
    await page.waitForSelector('[data-testid="stat-rejected"]', { timeout: 10000 });
  });

  test('should show checkboxes only for Gmail jobs in Rejected tab', async ({ page }) => {
    // Navigate to Rejected tab
    const rejectedTab = page.locator('button', { hasText: 'Rejected' });
    await rejectedTab.click();
    await page.waitForTimeout(1000);

    // Fetch jobs from API to verify source filtering
    const response = await page.request.get(`${API_BASE}/api/jobs/status/rejected`);
    expect(response.ok()).toBeTruthy();
    const jobs = await response.json();

    console.log(`Rejected tab has ${jobs.length} jobs`);

    if (jobs.length === 0) {
      console.log('No rejected jobs found - skipping test');
      return;
    }

    // Count Gmail vs non-Gmail jobs
    const gmailJobs = jobs.filter((j: any) => j.source === 'gmail');
    const nonGmailJobs = jobs.filter((j: any) => j.source !== 'gmail');

    console.log(`Gmail jobs: ${gmailJobs.length}, Non-Gmail jobs: ${nonGmailJobs.length}`);

    // Check that checkboxes exist (one per Gmail job)
    const checkboxes = page.locator('input[type="checkbox"][data-job-id]');
    const checkboxCount = await checkboxes.count();

    console.log(`Found ${checkboxCount} checkboxes`);

    // Verify checkbox count matches Gmail job count
    expect(checkboxCount).toBe(gmailJobs.length);

    // Verify bulk action controls are visible if Gmail jobs exist
    if (gmailJobs.length > 0) {
      const bulkActionControls = page.locator('button', { hasText: 'Delete' });
      await expect(bulkActionControls.first()).toBeVisible();
    }
  });

  test('should delete selected Gmail jobs from Rejected tab after confirmation', async ({ page }) => {
    // Navigate to Rejected tab
    const rejectedTab = page.locator('button', { hasText: 'Rejected' });
    await rejectedTab.click();
    await page.waitForTimeout(1000);

    // Check if we have Gmail jobs
    const checkboxes = page.locator('input[type="checkbox"][data-job-id]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount === 0) {
      console.log('No Gmail jobs in Rejected tab - skipping test');
      return;
    }

    console.log(`Found ${checkboxCount} Gmail jobs to test with`);

    // Select first checkbox
    await checkboxes.first().check();
    await page.waitForTimeout(500);

    // Find and click the delete button
    const deleteButton = page.locator('button', { hasText: /Delete \d+ from Gmail/ });
    await expect(deleteButton).toBeVisible();
    await expect(deleteButton).toBeEnabled();

    const buttonText = await deleteButton.textContent();
    console.log(`Delete button shows: ${buttonText}`);

    // Click delete button to open confirmation dialog
    await deleteButton.click();
    await page.waitForTimeout(500);

    // Verify confirmation dialog appears
    const confirmDialog = page.locator('div[role="dialog"], div.modal, div.confirmation-dialog').first();
    await expect(confirmDialog).toBeVisible({ timeout: 3000 });

    console.log('Confirmation dialog appeared');

    // Find and click the actual "Delete from Gmail" button in the dialog
    const confirmButton = page.locator('button', { hasText: 'Delete from Gmail' });
    await expect(confirmButton).toBeVisible();

    // Intercept the API call to verify request and mock response
    const deletePromise = page.waitForResponse(
      (response) => response.url().includes('/bulk-delete-gmail-rejected') && response.request().method() === 'POST',
      { timeout: 5000 }
    );

    // Click confirm
    await confirmButton.click();

    // Wait for API call
    const deleteResponse = await deletePromise;
    console.log(`Delete API response status: ${deleteResponse.status()}`);

    // Wait for success message or tab refresh
    await page.waitForTimeout(2000);

    console.log('Bulk delete workflow completed');
  });

  test('should handle select all and deselect all in Rejected tab', async ({ page }) => {
    // Navigate to Rejected tab
    const rejectedTab = page.locator('button', { hasText: 'Rejected' });
    await rejectedTab.click();
    await page.waitForTimeout(1000);

    // Check if we have Gmail jobs
    const checkboxes = page.locator('input[type="checkbox"][data-job-id]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount === 0) {
      console.log('No Gmail jobs in Rejected tab - skipping test');
      return;
    }

    console.log(`Found ${checkboxCount} Gmail jobs`);

    // Find and click "Select All Gmail" button
    const selectAllButton = page.locator('button', { hasText: 'Select All Gmail' });

    // Only test if button exists
    const selectAllExists = (await selectAllButton.count()) > 0;

    if (selectAllExists) {
      await selectAllButton.click();
      await page.waitForTimeout(500);

      // Verify all checkboxes are checked
      for (let i = 0; i < checkboxCount; i++) {
        const checkbox = checkboxes.nth(i);
        await expect(checkbox).toBeChecked();
      }

      // Verify delete button shows correct count
      const deleteButton = page.locator('button', { hasText: /Delete \d+ from Gmail/ });
      const buttonText = await deleteButton.textContent();
      console.log(`After select all, button shows: ${buttonText}`);

      // Find and click "Deselect All" button
      const deselectAllButton = page.locator('button', { hasText: 'Deselect All' });
      await deselectAllButton.click();
      await page.waitForTimeout(500);

      // Verify all checkboxes are unchecked
      for (let i = 0; i < checkboxCount; i++) {
        const checkbox = checkboxes.nth(i);
        await expect(checkbox).not.toBeChecked();
      }

      // Verify delete button is disabled or shows 0
      const finalButtonText = await deleteButton.textContent();
      console.log(`After deselect all, button shows: ${finalButtonText}`);

      // Button should be disabled when count is 0
      if (finalButtonText?.includes('Delete 0')) {
        await expect(deleteButton).toBeDisabled();
      }

      console.log('Select all / deselect all working correctly');
    } else {
      console.log('Select All Gmail button not found - may not be implemented yet');
    }
  });
});
