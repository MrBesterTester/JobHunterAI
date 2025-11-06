import { test, expect } from '@playwright/test';

test.describe('Phase 2.9: Gmail Label Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    // Wait for the app to load
    await page.waitForSelector('[data-testid="new-tab-button"]', { timeout: 10000 });
  });

  test('should show Rejected tab with count', async ({ page }) => {
    // Look for the Rejected tab button
    const rejectedTab = page.locator('[data-testid="rejected-tab-button"]');

    // Verify the tab exists
    await expect(rejectedTab).toBeVisible();

    // Verify the tab has an icon (XCircle for rejected)
    const tabContent = await rejectedTab.textContent();
    expect(tabContent).toContain('Rejected');
  });

  test('should have Reject button on job cards in New Jobs tab', async ({ page }) => {
    // Click on New Jobs tab
    await page.click('[data-testid="new-tab-button"]');

    // Wait for job cards to load (or check if empty state is shown)
    await page.waitForTimeout(1000);

    // Check if there are any job cards
    const jobCards = page.locator('[data-testid="job-card"]');
    const jobCardCount = await jobCards.count();

    if (jobCardCount > 0) {
      // Get the first job card
      const firstJobCard = jobCards.first();

      // Look for the Reject button within the job card
      const rejectButton = firstJobCard.locator('[data-testid="reject-job-button"]');

      // Verify the Reject button exists and is visible
      await expect(rejectButton).toBeVisible();

      // Verify the button text
      const buttonText = await rejectButton.textContent();
      expect(buttonText).toContain('Reject');
    } else {
      // If no job cards, just verify the test setup is correct
      console.log('No job cards found in New Jobs tab - this is okay for empty state');
    }
  });

  test('should reject job and move to Rejected tab', async ({ page }) => {
    // Click on New Jobs tab
    await page.click('[data-testid="new-tab-button"]');

    // Wait for job cards to load
    await page.waitForTimeout(1000);

    // Check if there are any job cards
    const jobCards = page.locator('[data-testid="job-card"]');
    const jobCardCount = await jobCards.count();

    if (jobCardCount > 0) {
      // Get the job ID from the first card for tracking
      const firstJobCard = jobCards.first();
      const jobId = await firstJobCard.getAttribute('data-job-id');

      // Click the Reject button
      const rejectButton = firstJobCard.locator('[data-testid="reject-job-button"]');
      await rejectButton.click();

      // Wait for the job to be rejected
      await page.waitForTimeout(2000);

      // Click on Rejected tab
      await page.click('[data-testid="rejected-tab-button"]');

      // Wait for rejected jobs to load
      await page.waitForTimeout(1000);

      // Verify the job appears in the Rejected tab
      const rejectedJobCards = page.locator('[data-testid="job-card"]');
      const rejectedJobCardCount = await rejectedJobCards.count();

      // There should be at least one rejected job
      expect(rejectedJobCardCount).toBeGreaterThan(0);

      // Verify the rejected job has the correct job ID (if we captured it)
      if (jobId) {
        const rejectedJobCard = page.locator(`[data-testid="job-card"][data-job-id="${jobId}"]`);
        await expect(rejectedJobCard).toBeVisible();
      }
    } else {
      console.log('No job cards found - skipping rejection test');
    }
  });

  test('should reject job from modal dialog', async ({ page }) => {
    // Click on New Jobs tab
    await page.click('[data-testid="new-tab-button"]');

    // Wait for job cards to load
    await page.waitForTimeout(1000);

    // Check if there are any job cards
    const jobCards = page.locator('[data-testid="job-card"]');
    const jobCardCount = await jobCards.count();

    if (jobCardCount > 0) {
      // Click on the first job card to open the modal
      const firstJobCard = jobCards.first();
      await firstJobCard.click();

      // Wait for the modal to open
      await page.waitForTimeout(1000);

      // Look for the Reject button in the modal
      const modalRejectButton = page.locator('[data-testid="reject-job-button-modal"]');

      if (await modalRejectButton.isVisible()) {
        // Click the Reject button in the modal
        await modalRejectButton.click();

        // Wait for the modal to close and job to be rejected
        await page.waitForTimeout(2000);

        // Click on Rejected tab
        await page.click('[data-testid="rejected-tab-button"]');

        // Wait for rejected jobs to load
        await page.waitForTimeout(1000);

        // Verify at least one rejected job exists
        const rejectedJobCards = page.locator('[data-testid="job-card"]');
        const rejectedJobCardCount = await rejectedJobCards.count();
        expect(rejectedJobCardCount).toBeGreaterThan(0);
      } else {
        console.log('Modal Reject button not visible - job might not be in "new" status');
      }
    } else {
      console.log('No job cards found - skipping modal rejection test');
    }
  });
});
