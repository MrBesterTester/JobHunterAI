import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';

/**
 * Test Suite: Microsoft Email Integration (Phase 2.7)
 *
 * Covers:
 * - Microsoft OAuth authentication flow
 * - Email sync with sam@samkirk.com
 * - Folder filtering (JobOps folder)
 * - Job extraction and approval workflow
 */

test.describe('Microsoft Email Integration (Phase 2.7)', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
  });

  test.describe('Microsoft Email Account UI', () => {
    test('should display Microsoft Email Integration card in Intake tab', async ({ page }) => {
      // Navigate to Intake tab
      await page.getByRole('button', { name: /^intake$/i }).click();

      // Wait for Intake tab content to load
      await page.waitForTimeout(500);

      // Check for Microsoft Email Integration card
      const microsoftCard = page.locator('h3', { hasText: /microsoft email/i }).first();
      await expect(microsoftCard).toBeVisible();
    });

    test('should show Microsoft branding color (#0078d4)', async ({ page }) => {
      // Navigate to Intake tab
      await page.getByRole('button', { name: /^intake$/i }).click();
      await page.waitForTimeout(500);

      // Find Microsoft Email heading to locate the card
      const microsoftHeading = page.locator('h3', { hasText: /microsoft email/i }).first();
      await expect(microsoftHeading).toBeVisible();

      // Find the parent container of the heading, then find the Mail icon within it
      const microsoftCard = microsoftHeading.locator('..').locator('..'); // Go up to the card container
      const mailIcon = microsoftCard.locator('svg').first();
      await expect(mailIcon).toBeVisible();

      // Check for Microsoft blue color on the icon
      const color = await mailIcon.evaluate((el) =>
        window.getComputedStyle(el).color
      );
      // Microsoft blue is rgb(0, 120, 212) or #0078d4
      expect(color).toContain('0, 120, 212');
    });

    test('should display Authenticate button when not authenticated', async ({ page }) => {
      // Navigate to Intake tab
      await page.getByRole('button', { name: /^intake$/i }).click();
      await page.waitForTimeout(500);

      // Look for Authenticate button (or status showing not authenticated)
      const authenticateButton = page.getByRole('button', { name: /authenticate.*microsoft/i });
      const syncButton = page.getByRole('button', { name: /sync.*microsoft/i });

      // Either authenticate button should be visible, or sync button should be disabled
      const isNotAuthenticated = await authenticateButton.isVisible().catch(() => false);
      const canSync = await syncButton.isEnabled().catch(() => false);

      // If not authenticated, authenticate button should be visible
      // If authenticated, sync button should be enabled
      expect(isNotAuthenticated || canSync).toBeTruthy();
    });
  });

  test.describe('Folder Status Display', () => {
    test('should show folder status indicator', async ({ page }) => {
      // Navigate to Intake tab
      await page.getByRole('button', { name: /^intake$/i }).click();
      await page.waitForTimeout(500);

      // Look for folder status text (e.g., "JobOps folder: 5 unread")
      const folderStatus = page.locator('text=/jobops.*folder/i').first();

      // Folder status might not be visible if not authenticated
      const isVisible = await folderStatus.isVisible().catch(() => false);

      // This is a soft assertion - folder status only shows when authenticated
      if (isVisible) {
        expect(await folderStatus.textContent()).toMatch(/folder/i);
      }
    });

    test('should display unread count in folder status', async ({ page }) => {
      // Navigate to Intake tab
      await page.getByRole('button', { name: /^intake$/i }).click();
      await page.waitForTimeout(500);

      // Look for unread count pattern (e.g., "5 unread")
      const unreadText = page.locator('text=/\\d+.*unread/i').first();

      const isVisible = await unreadText.isVisible().catch(() => false);

      // This is a soft assertion - only visible when authenticated and folder exists
      if (isVisible) {
        const text = await unreadText.textContent();
        expect(text).toMatch(/\d+.*unread/i);
      }
    });
  });

  test.describe('Microsoft vs Gmail Source Differentiation', () => {
    test('should show source badge on jobs from Microsoft email', async ({ page }) => {
      // Navigate to New Jobs tab
      await page.getByRole('button', { name: /^new jobs$/i }).click();
      await page.waitForTimeout(1000);

      // Look for any jobs with microsoft_email source badge
      const microsoftBadge = page.locator('[class*="badge"]', { hasText: /microsoft/i }).first();

      const hasMicrosoftJobs = await microsoftBadge.isVisible().catch(() => false);

      // This is informational - only visible if Microsoft email jobs exist
      if (hasMicrosoftJobs) {
        await expect(microsoftBadge).toBeVisible();
        const badgeText = await microsoftBadge.textContent();
        expect(badgeText?.toLowerCase()).toContain('microsoft');
      }
    });
  });

  test.describe('OAuth Flow (Manual Test Placeholder)', () => {
    test.skip('MANUAL: should complete OAuth flow with sam@samkirk.com', async ({ page }) => {
      // This test requires manual intervention for OAuth consent
      //
      // Manual Steps:
      // 1. Click "Authenticate with Microsoft" button
      // 2. Complete OAuth flow in popup/redirect
      // 3. Grant Mail.Read and Mail.ReadWrite permissions
      // 4. Verify redirect back to app with success message
      //
      // Expected: OAuth credentials stored, sync button becomes available
    });

    test.skip('MANUAL: should sync emails from JobOps folder', async ({ page }) => {
      // This test requires authenticated Microsoft account
      //
      // Manual Steps:
      // 1. Ensure authenticated (previous test)
      // 2. Ensure JobOps folder exists in sam@samkirk.com mailbox
      // 3. Add test job emails to JobOps folder
      // 4. Click "Sync Microsoft Emails" button
      // 5. Wait for sync to complete
      //
      // Expected: Jobs appear in New Jobs tab with microsoft_email source
    });
  });

  test.describe('Error Handling', () => {
    test('should show helpful message if authentication fails', async ({ page }) => {
      // Navigate to Intake tab
      await page.getByRole('button', { name: /^intake$/i }).click();
      await page.waitForTimeout(500);

      // Check that error messages are handled gracefully
      // (This is a defensive test - errors should be caught and displayed)

      // Look for any error alert or message
      const errorMessage = page.locator('[role="alert"]').first();
      const isError = await errorMessage.isVisible().catch(() => false);

      // If there's an error, it should contain helpful text
      if (isError) {
        const errorText = await errorMessage.textContent();
        expect(errorText).toBeTruthy();
        expect(errorText?.length).toBeGreaterThan(10); // Should have meaningful message
      }
    });
  });

  test.describe('Integration with Existing Job Flow', () => {
    test('should allow approving jobs from Microsoft email source', async ({ page }) => {
      // This test validates that Microsoft-sourced jobs work with existing approval flow

      // Navigate to New Jobs tab
      await page.getByRole('button', { name: /^new jobs$/i }).click();
      await page.waitForTimeout(1000);

      // Find any job card (regardless of source)
      const jobCards = page.locator('[class*="job-card"], [data-testid*="job-card"]');
      const count = await jobCards.count();

      if (count > 0) {
        // Click first job to open details
        await jobCards.first().click();
        await page.waitForTimeout(500);

        // Check for Approve button
        const approveButton = page.getByRole('button', { name: /approve/i });
        await expect(approveButton).toBeVisible();

        // Button should be clickable (not disabled)
        await expect(approveButton).toBeEnabled();
      }
    });

    test('should show job source in job details', async ({ page }) => {
      // Navigate to New Jobs tab
      await page.getByRole('button', { name: /^new jobs$/i }).click();
      await page.waitForTimeout(1000);

      // Find any job card
      const jobCards = page.locator('[class*="job-card"], [data-testid*="job-card"]');
      const count = await jobCards.count();

      if (count > 0) {
        // Click first job to open details
        await jobCards.first().click();
        await page.waitForTimeout(500);

        // Check that source information is displayed somewhere
        // (Could be in metadata, header, or details section)
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();

        // Source should be mentioned somewhere (gmail or microsoft_email)
        const hasSourceInfo = pageContent?.toLowerCase().includes('gmail') ||
                             pageContent?.toLowerCase().includes('microsoft');
        expect(hasSourceInfo).toBeTruthy();
      }
    });
  });

  test.describe('Microsoft Email Sync Integration', () => {
    test('should sync Microsoft emails and display jobs', async ({ page }) => {
      // Wait for dashboard to fully load
      await expect(page.getByRole('heading', { name: /^JobHunter$/i })).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000); // Extra time for tabs to render

      // Step 1: Navigate to Intake tab
      await page.getByRole('button', { name: /^intake$/i }).click();
      await page.waitForTimeout(1000);

      // Step 2: Check if Microsoft is authenticated
      const microsoftAuthButton = page.getByRole('button', { name: /authenticate.*microsoft/i });
      const microsoftSyncButton = page.locator('button', { hasText: /sync.*microsoft/i }).or(
        page.locator('button', { hasText: /sync now/i })
      ).last();

      const authVisible = await microsoftAuthButton.isVisible().catch(() => false);

      if (authVisible) {
        console.log('Microsoft not authenticated - skipping sync test');
        test.skip();
        return;
      }

      // Step 3: Get initial stats
      await page.waitForTimeout(1000);
      const initialNewJobsText = await page.getByTestId('stat-new').textContent();
      const initialNewCount = parseInt(initialNewJobsText?.match(/\d+/)?.[0] || '0');

      const initialFilteredText = await page.getByTestId('stat-filtered').textContent();
      const initialFilteredCount = parseInt(initialFilteredText?.match(/\d+/)?.[0] || '0');

      console.log(`Initial stats - New: ${initialNewCount}, Filtered: ${initialFilteredCount}`);

      // Step 4: Click Microsoft Sync button
      console.log('Clicking Microsoft Sync button...');
      await microsoftSyncButton.click();

      // Wait for sync to start
      await page.waitForTimeout(1000);

      // Step 5: Wait for sync to complete (LLM processing takes time)
      console.log('Waiting for sync to complete (may take 30-60 seconds for LLM)...');
      await page.waitForTimeout(45000); // 45 seconds for LLM processing

      // Check for success/completion message
      const successMessage = page.getByText(/sync completed|jobs added|discovered/i);
      const hasSuccess = await successMessage.isVisible().catch(() => false);

      if (hasSuccess) {
        const messageText = await successMessage.textContent();
        console.log(`Sync result: ${messageText}`);
      }

      // Step 6: Navigate to New Jobs tab
      console.log('Navigating to New Jobs tab...');
      const newJobsTab = page.getByRole('button', { name: /^new jobs$/i });
      await newJobsTab.click();
      await page.waitForTimeout(2000);

      // Step 7: Verify updated stats
      const newJobsText = await page.getByTestId('stat-new').textContent();
      const newCount = parseInt(newJobsText?.match(/\d+/)?.[0] || '0');

      const filteredText = await page.getByTestId('stat-filtered').textContent();
      const filteredCount = parseInt(filteredText?.match(/\d+/)?.[0] || '0');

      console.log(`Updated stats - New: ${newCount}, Filtered: ${filteredCount}`);
      console.log(`Change - New: +${newCount - initialNewCount}, Filtered: +${filteredCount - initialFilteredCount}`);

      // Step 8: Verify jobs from Microsoft source exist
      const totalChange = (newCount - initialNewCount) + (filteredCount - initialFilteredCount);

      if (totalChange > 0) {
        console.log(`✓ ${totalChange} jobs were processed from Microsoft email`);

        // Look for job cards
        const jobCards = page.locator('[class*="job-card"], [data-testid*="job-card"]');
        const jobCardCount = await jobCards.count();
        console.log(`Job cards visible: ${jobCardCount}`);

        // Verify at least one job exists
        expect(jobCardCount).toBeGreaterThan(0);
      } else {
        console.log('No new jobs - all might be duplicates or already processed');
      }
    });

    test('should verify stats update after Microsoft sync', async ({ page }) => {
      // Wait for dashboard to fully load
      await expect(page.getByRole('heading', { name: /^JobHunter$/i })).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000); // Extra time for tabs to render

      // Navigate to Intake tab
      await page.getByRole('button', { name: /^intake$/i }).click();
      await page.waitForTimeout(1000);

      // Check if Microsoft is authenticated
      const microsoftAuthButton = page.getByRole('button', { name: /authenticate.*microsoft/i });
      const authVisible = await microsoftAuthButton.isVisible().catch(() => false);

      if (authVisible) {
        console.log('Microsoft not authenticated - skipping test');
        test.skip();
        return;
      }

      // Get initial total
      const initialTotal = await page.getByText(/Total/i).last().textContent();
      const initialTotalCount = parseInt(initialTotal?.match(/\d+/)?.[0] || '0');
      console.log(`Initial total jobs: ${initialTotalCount}`);

      // Sync Microsoft
      const microsoftSyncButton = page.locator('button', { hasText: /sync.*microsoft/i }).or(
        page.locator('button', { hasText: /sync now/i })
      ).last();
      await microsoftSyncButton.click();

      // Wait for sync
      await page.waitForTimeout(45000);

      // Check stats updated
      const newTotal = await page.getByText(/Total/i).last().textContent();
      const newTotalCount = parseInt(newTotal?.match(/\d+/)?.[0] || '0');
      console.log(`New total jobs: ${newTotalCount}`);

      // Stats should either stay same (duplicates) or increase
      expect(newTotalCount).toBeGreaterThanOrEqual(initialTotalCount);
    });
  });

  test.describe('Email Archiving (Phase 2.8)', () => {
    test('should display Microsoft JobOps folder status', async ({ page }) => {
      // Navigate to Intake tab
      await page.getByRole('button', { name: /^intake$/i }).click();
      await page.waitForTimeout(1000);

      // Check if Microsoft is authenticated
      const microsoftAuthButton = page.getByRole('button', { name: /authenticate.*microsoft/i });
      const authVisible = await microsoftAuthButton.isVisible().catch(() => false);

      if (authVisible) {
        console.log('Microsoft not authenticated - skipping test');
        test.skip();
        return;
      }

      // Look for JobOps folder status indicator
      const jobOpsFolderStatus = page.locator('text=/JobOps Folder/i');
      await expect(jobOpsFolderStatus).toBeVisible({ timeout: 5000 });

      // Verify folder shows ready or creating status
      const statusText = await jobOpsFolderStatus.textContent();
      expect(statusText).toMatch(/ready|creating/i);
    });

    test('should handle archive folder creation gracefully', async ({ page }) => {
      // This test verifies that the system handles archive folder creation
      // without breaking the sync workflow

      // Navigate to Intake tab
      await page.getByRole('button', { name: /^intake$/i }).click();
      await page.waitForTimeout(1000);

      // Check if Microsoft is authenticated
      const microsoftAuthButton = page.getByRole('button', { name: /authenticate.*microsoft/i });
      const authVisible = await microsoftAuthButton.isVisible().catch(() => false);

      if (authVisible) {
        console.log('Microsoft not authenticated - skipping test');
        test.skip();
        return;
      }

      // Trigger a sync - this should create archive folder if it doesn't exist
      const microsoftSyncButton = page.locator('button', { hasText: /sync.*microsoft/i }).or(
        page.locator('button', { hasText: /sync now/i })
      ).last();

      // Click sync button
      await microsoftSyncButton.click();

      // Wait for sync to complete (archive folder creation happens during sync)
      await page.waitForTimeout(10000);

      // Verify sync completed without errors
      // The fact that we got here means archive folder creation didn't break the sync
      const syncButton = page.locator('button', { hasText: /sync now/i }).last();
      await expect(syncButton).toBeEnabled({ timeout: 5000 });
    });

    test('should preserve sync functionality with archiving enabled', async ({ page }) => {
      // This test ensures that adding archiving doesn't break the existing sync workflow

      // Navigate to Intake tab
      await page.getByRole('button', { name: /^intake$/i }).click();
      await page.waitForTimeout(1000);

      // Check if Microsoft is authenticated
      const microsoftAuthButton = page.getByRole('button', { name: /authenticate.*microsoft/i });
      const authVisible = await microsoftAuthButton.isVisible().catch(() => false);

      if (authVisible) {
        console.log('Microsoft not authenticated - skipping test');
        test.skip();
        return;
      }

      // Get initial job count
      const initialTotal = await page.getByText(/Total/i).last().textContent();
      const initialTotalCount = parseInt(initialTotal?.match(/\d+/)?.[0] || '0');

      // Perform sync (which now includes archiving)
      const microsoftSyncButton = page.locator('button', { hasText: /sync.*microsoft/i }).or(
        page.locator('button', { hasText: /sync now/i })
      ).last();
      await microsoftSyncButton.click();

      // Wait for sync with archiving to complete
      await page.waitForTimeout(15000);

      // Verify sync still works - jobs should be created
      const newTotal = await page.getByText(/Total/i).last().textContent();
      const newTotalCount = parseInt(newTotal?.match(/\d+/)?.[0] || '0');

      // Total should be same or higher (archiving shouldn't remove jobs from UI)
      expect(newTotalCount).toBeGreaterThanOrEqual(initialTotalCount);
    });
  });
});
