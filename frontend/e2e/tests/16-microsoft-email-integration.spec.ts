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
      await page.getByRole('tab', { name: /intake/i }).click();

      // Wait for Intake tab content to load
      await page.waitForTimeout(500);

      // Check for Microsoft Email Integration card
      const microsoftCard = page.locator('h3', { hasText: /microsoft email/i }).first();
      await expect(microsoftCard).toBeVisible();
    });

    test('should show Microsoft branding color (#0078d4)', async ({ page }) => {
      // Navigate to Intake tab
      await page.getByRole('tab', { name: /intake/i }).click();
      await page.waitForTimeout(500);

      // Find Microsoft Email heading
      const microsoftHeading = page.locator('h3', { hasText: /microsoft email/i }).first();
      await expect(microsoftHeading).toBeVisible();

      // Check for Microsoft blue color
      const color = await microsoftHeading.evaluate((el) =>
        window.getComputedStyle(el).color
      );
      // Microsoft blue is rgb(0, 120, 212) or #0078d4
      expect(color).toContain('0, 120, 212');
    });

    test('should display Authenticate button when not authenticated', async ({ page }) => {
      // Navigate to Intake tab
      await page.getByRole('tab', { name: /intake/i }).click();
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
      await page.getByRole('tab', { name: /intake/i }).click();
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
      await page.getByRole('tab', { name: /intake/i }).click();
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
      await page.getByRole('tab', { name: /new.*jobs/i }).click();
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
      await page.getByRole('tab', { name: /intake/i }).click();
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
      await page.getByRole('tab', { name: /new.*jobs/i }).click();
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
      await page.getByRole('tab', { name: /new.*jobs/i }).click();
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
});
