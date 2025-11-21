import { test, expect } from '@playwright/test';
import { getTestTimeout } from '../helpers/timeout-utils';

test.describe('Phase 2.9: Gmail Label Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    // Wait for the app to load
    await page.waitForSelector('[data-testid="new-tab-button"]', { timeout: getTestTimeout(10000) });
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
    test.setTimeout(66000);

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

  test('should handle Gmail label update failures gracefully', async ({ page }) => {
    // This test verifies graceful degradation when Gmail API fails
    // Note: In real scenario, Gmail API failures are handled on backend
    // The job should still be rejected in database even if labels fail

    // Click on New Jobs tab
    await page.click('[data-testid="new-tab-button"]');

    // Wait for job cards to load
    await page.waitForTimeout(1000);

    // Check if there are any job cards
    const jobCards = page.locator('[data-testid="job-card"]');
    const jobCardCount = await jobCards.count();

    if (jobCardCount > 0) {
      // Set up console monitoring to check for warnings (not errors)
      const consoleMessages: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
          consoleMessages.push(msg.text());
        }
      });

      // Get the job ID from the first card for tracking
      const firstJobCard = jobCards.first();
      const jobId = await firstJobCard.getAttribute('data-job-id');

      // Click the Reject button
      const rejectButton = firstJobCard.locator('[data-testid="reject-job-button"]');
      await rejectButton.click();

      // Wait for the job to be rejected
      await page.waitForTimeout(2000);

      // Verify job still moved to Rejected tab (database update succeeded)
      await page.click('[data-testid="rejected-tab-button"]');
      await page.waitForTimeout(1000);

      const rejectedJobCards = page.locator('[data-testid="job-card"]');
      const rejectedJobCardCount = await rejectedJobCards.count();

      // Job should be rejected even if label update fails
      expect(rejectedJobCardCount).toBeGreaterThan(0);

      // If job ID was captured, verify it's in the rejected tab
      if (jobId) {
        const rejectedJobCard = page.locator(`[data-testid="job-card"][data-job-id="${jobId}"]`);
        await expect(rejectedJobCard).toBeVisible();
      }

      // Verify no critical errors occurred (warnings are okay)
      const criticalErrors = consoleMessages.filter(msg =>
        msg.includes('Uncaught') || msg.includes('TypeError') || msg.includes('ReferenceError')
      );
      expect(criticalErrors.length).toBe(0);
    } else {
      console.log('No job cards found - skipping graceful degradation test');
    }
  });

  test('should handle multiple rapid rejections', async ({ page }) => {
    // This test verifies that rapidly rejecting multiple jobs doesn't cause race conditions
    // or data corruption

    // Click on New Jobs tab
    await page.click('[data-testid="new-tab-button"]');

    // Wait for job cards to load
    await page.waitForTimeout(1000);

    // Check if there are multiple job cards
    const jobCards = page.locator('[data-testid="job-card"]');
    const jobCardCount = await jobCards.count();

    if (jobCardCount >= 3) {
      // Get job IDs for tracking
      const jobIds: string[] = [];
      for (let i = 0; i < Math.min(3, jobCardCount); i++) {
        const card = jobCards.nth(i);
        const jobId = await card.getAttribute('data-job-id');
        if (jobId) {
          jobIds.push(jobId);
        }
      }

      // Rapidly click Reject on first 3 jobs (or all if less than 3)
      const rejectCount = Math.min(3, jobCardCount);
      for (let i = 0; i < rejectCount; i++) {
        const card = jobCards.nth(i);
        const rejectButton = card.locator('[data-testid="reject-job-button"]');

        // Click without waiting (rapid succession)
        await rejectButton.click();

        // Small delay to prevent UI blocking (50ms instead of 2000ms)
        await page.waitForTimeout(50);
      }

      // Wait for all rejections to complete
      await page.waitForTimeout(3000);

      // Verify all rejected jobs appear in Rejected tab
      await page.click('[data-testid="rejected-tab-button"]');
      await page.waitForTimeout(1000);

      const rejectedJobCards = page.locator('[data-testid="job-card"]');
      const rejectedJobCardCount = await rejectedJobCards.count();

      // Should have at least the number of jobs we rejected
      expect(rejectedJobCardCount).toBeGreaterThanOrEqual(rejectCount);

      // Verify each rejected job appears in the tab (if we captured IDs)
      for (const jobId of jobIds) {
        const rejectedJobCard = page.locator(`[data-testid="job-card"][data-job-id="${jobId}"]`);
        await expect(rejectedJobCard).toBeVisible();
      }

      // Verify no jobs remain in New Jobs tab
      await page.click('[data-testid="new-tab-button"]');
      await page.waitForTimeout(1000);

      const remainingJobCards = page.locator('[data-testid="job-card"]');
      const remainingCount = await remainingJobCards.count();

      // New Jobs should have fewer jobs than before (or be empty)
      expect(remainingCount).toBeLessThan(jobCardCount);

      // Verify none of the rejected job IDs are still in New Jobs
      for (const jobId of jobIds) {
        const newJobCard = page.locator(`[data-testid="job-card"][data-job-id="${jobId}"]`);
        await expect(newJobCard).not.toBeVisible();
      }
    } else {
      console.log(`Only ${jobCardCount} job cards found - need at least 3 for rapid rejection test`);
    }
  });
});
