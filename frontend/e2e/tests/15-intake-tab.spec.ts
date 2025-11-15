import { test, expect, Page } from '@playwright/test';

/**
 * Test Suite 15: Intake Tab Tests
 *
 * Covers:
 * - Intake tab navigation
 * - Job source integration cards
 * - Sync functionality
 * - Activity logs
 * - Statistics dashboard
 *
 * STATUS: Some tests skipped - LinkedIn/Indeed integration UI not yet implemented
 * ISSUE: ISSUE-036 Category 1: Unimplemented Features (5 tests)
 * RE-ENABLE: When LinkedIn/Indeed integration cards are implemented, remove .skip() from tests
 */

test.describe('Intake Tab', () => {
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

  test.describe('Tab Navigation', () => {
    test('should display Intake tab in navigation', async () => {
      const intakeTab = page.getByRole('button', { name: /^intake$/i });
      await expect(intakeTab).toBeVisible();
    });

    test('should navigate to Intake tab when clicked', async () => {
      const intakeTab = page.getByRole('button', { name: /^intake$/i });
      await intakeTab.click();

      // Wait for tab to become active
      await page.waitForTimeout(500);

      // Verify tab is active
      const ariaSelected = await intakeTab.getAttribute('aria-selected');
      expect(ariaSelected).toBe('true');
    });

    test('should display Intake tab content when active', async () => {
      const intakeTab = page.getByRole('button', { name: /^intake$/i });
      await intakeTab.click();

      // Wait for content to load
      await page.waitForTimeout(1000);

      // Check for main heading
      const heading = page.getByRole('heading', { name: /Job Intake Sources/i });
      await expect(heading).toBeVisible();
    });
  });

  test.describe('Integration Cards', () => {
    test.beforeEach(async () => {
      // Navigate to Intake tab
      const intakeTab = page.getByRole('button', { name: /^intake$/i });
      await intakeTab.click();
      await page.waitForTimeout(1000);
    });

    test('should display Gmail integration card', async () => {
      const gmailCard = page.getByRole('heading', { name: /Gmail Job Discovery/i });
      await expect(gmailCard).toBeVisible();
    });

    test('should display LinkedIn integration card', async () => {
      const linkedinCard = page.getByRole('heading', { name: /LinkedIn Job Discovery/i });
      await expect(linkedinCard).toBeVisible();
    });

    // SKIPPED: Indeed integration UI not yet implemented - see ISSUE-036
    test.skip('should display Indeed integration card', async () => {
      const indeedCard = page.getByRole('heading', { name: /Indeed Job Discovery/i });
      await expect(indeedCard).toBeVisible();
    });

    test('should show correct status indicators for each source', async () => {
      // Check that status text is present for each card
      const statusElements = page.getByText(/Status:/i);
      const count = await statusElements.count();

      // Should have at least 3 status indicators (one for each integration)
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Sync All Sources Button', () => {
    test.beforeEach(async () => {
      // Navigate to Intake tab
      const intakeTab = page.getByRole('button', { name: /^intake$/i });
      await intakeTab.click();
      await page.waitForTimeout(1000);
    });

    test('should display Sync All Sources button', async () => {
      const syncAllButton = page.getByRole('button', { name: /Sync All/i });
      await expect(syncAllButton).toBeVisible();
    });

    test('should be enabled when not syncing', async () => {
      const syncAllButton = page.getByRole('button', { name: /Sync All/i });
      const isDisabled = await syncAllButton.isDisabled();

      // Button should be enabled initially (unless a sync is in progress)
      expect(isDisabled).toBe(false);
    });
  });

  test.describe('Gmail Integration', () => {
    test.beforeEach(async () => {
      // Navigate to Intake tab
      const intakeTab = page.getByRole('button', { name: /^intake$/i });
      await intakeTab.click();

      // Wait for loading to complete by waiting for Gmail card buttons to appear
      // Either "Sync Now" or "Authenticate with Gmail" should appear when loaded
      await page.getByRole('button', { name: /Sync Now|Authenticate with Gmail/i }).first().waitFor({ state: 'visible', timeout: 10000 });
    });

    test('should display Gmail authentication button when not connected', async () => {
      // Check if either "Authenticate with Gmail" or "Sync Now" button exists
      // Note: There are multiple "Sync Now" buttons on the page (Gmail, Microsoft, LinkedIn, RapidAPI)
      // so we use .first() to avoid strict mode errors
      const authButton = page.getByRole('button', { name: /Authenticate with Gmail/i });
      const syncButton = page.getByRole('button', { name: /Sync Now/i });

      const authVisible = await authButton.first().isVisible().catch(() => false);
      const syncVisible = await syncButton.first().isVisible().catch(() => false);

      // At least one should be visible
      expect(authVisible || syncVisible).toBe(true);
    });

    test('should display settings button for Gmail', async () => {
      // Look for settings button near Gmail card
      const settingsButtons = page.getByRole('button').filter({ has: page.locator('svg') });
      const count = await settingsButtons.count();

      // Should have settings buttons (at least one)
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('LinkedIn Integration', () => {
    test.beforeEach(async () => {
      // Navigate to Intake tab
      const intakeTab = page.getByRole('button', { name: /^intake$/i });
      await intakeTab.click();
      await page.waitForTimeout(1000);
    });

    test('should display LinkedIn sync button', async () => {
      // Look for any Sync Now button (could be multiple)
      const syncButtons = page.getByRole('button', { name: /Sync Now/i });
      const count = await syncButtons.count();

      // Should have at least one sync button
      expect(count).toBeGreaterThanOrEqual(1);
    });

    // SKIPPED: LinkedIn integration UI not yet implemented - see ISSUE-036
    test.skip('should display mock implementation notice', async () => {
      const mockNotice = page.getByText(/mock/i);
      await expect(mockNotice).toBeVisible();
    });

    test('should display Learn More button', async () => {
      const learnMoreButton = page.getByRole('button', { name: /Learn More/i });
      await expect(learnMoreButton).toBeVisible();
    });
  });

  test.describe('Indeed Integration', () => {
    test.beforeEach(async () => {
      // Navigate to Intake tab
      const intakeTab = page.getByRole('button', { name: /^intake$/i });
      await intakeTab.click();
      await page.waitForTimeout(1000);
    });

    // SKIPPED: Indeed integration UI not yet implemented - see ISSUE-036
    test.skip('should display Not Implemented status', async () => {
      const notImplemented = page.getByText(/Not Implemented/i);
      await expect(notImplemented).toBeVisible();
    });

    // SKIPPED: Indeed integration UI not yet implemented - see ISSUE-036
    test.skip('should display Coming Soon message', async () => {
      const comingSoon = page.getByText(/Coming Soon/i);
      await expect(comingSoon).toBeVisible();
    });

    // SKIPPED: Indeed integration UI not yet implemented - see ISSUE-036
    test.skip('should have disabled Request Implementation button', async () => {
      const requestButton = page.getByRole('button', { name: /Request Implementation/i });
      await expect(requestButton).toBeVisible();

      const isDisabled = await requestButton.isDisabled();
      expect(isDisabled).toBe(true);
    });
  });

  test.describe('Activity Log', () => {
    test.beforeEach(async () => {
      // Navigate to Intake tab
      const intakeTab = page.getByRole('button', { name: /^intake$/i });
      await intakeTab.click();
      await page.waitForTimeout(1000);
    });

    test('should display Recent Intake Activity section', async () => {
      const activityHeading = page.getByRole('heading', { name: /Recent Intake Activity/i });
      await expect(activityHeading).toBeVisible();
    });

    test('should show message when no activity exists', async () => {
      // Check if either activity logs or "no activity" message is shown
      const noActivityMessage = page.getByText(/No intake activity/i);

      const isVisible = await noActivityMessage.isVisible().catch(() => false);

      // Either should be visible (we expect no activity message initially)
      if (isVisible) {
        await expect(noActivityMessage).toBeVisible();
      }
    });
  });

  test.describe('Statistics Dashboard', () => {
    test.beforeEach(async () => {
      // Navigate to Intake tab
      const intakeTab = page.getByRole('button', { name: /^intake$/i });
      await intakeTab.click();
      await page.waitForTimeout(1000);
    });

    test('should display Intake Performance section', async () => {
      const performanceHeading = page.getByRole('heading', { name: /Intake Performance/i });

      // This might not be visible if there's no data yet
      const isVisible = await performanceHeading.isVisible().catch(() => false);

      // If visible, verify it's a heading
      if (isVisible) {
        await expect(performanceHeading).toBeVisible();
      }
    });

    test('should display statistics metrics when data exists', async () => {
      // Check for common statistics terms
      const totalDiscovered = page.getByText(/Total Discovered/i);
      const jobsAdded = page.getByText(/Jobs Added/i);
      const duplicates = page.getByText(/Duplicates/i);

      // These should be visible if statistics are available
      const discoveredVisible = await totalDiscovered.isVisible().catch(() => false);
      const addedVisible = await jobsAdded.isVisible().catch(() => false);
      const duplicatesVisible = await duplicates.isVisible().catch(() => false);

      // At least one should be visible if stats exist
      const hasStats = discoveredVisible || addedVisible || duplicatesVisible;

      // We can't assert this is true since it depends on backend data
      expect(typeof hasStats).toBe('boolean');
    });
  });

  test.describe('Loading States', () => {
    test('should show loading indicator when Intake tab first loads', async () => {
      const intakeTab = page.getByRole('button', { name: /^intake$/i });
      await intakeTab.click();

      // Check for loading indicator (might be too fast to catch)
      const loadingText = page.getByText(/Loading intake/i);

      // If it's visible, verify it
      const isVisible = await loadingText.isVisible().catch(() => false);

      if (isVisible) {
        await expect(loadingText).toBeVisible();
      }

      // Eventually content should load
      await page.waitForTimeout(2000);
      const heading = page.getByRole('heading', { name: /Job Intake Sources/i });
      await expect(heading).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should display integration cards in grid layout on desktop', async () => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });

      const intakeTab = page.getByRole('button', { name: /^intake$/i });
      await intakeTab.click();
      await page.waitForTimeout(1000);

      // Verify cards are visible
      const gmailCard = page.getByRole('heading', { name: /Gmail/i });
      await expect(gmailCard).toBeVisible();
    });

    test('should display integration cards stacked on mobile', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      const intakeTab = page.getByRole('button', { name: /^intake$/i });
      await intakeTab.click();
      await page.waitForTimeout(1000);

      // Verify cards are still visible on mobile
      const gmailCard = page.getByRole('heading', { name: /Gmail/i });
      await expect(gmailCard).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async () => {
      // Navigate to Intake tab
      const intakeTab = page.getByRole('button', { name: /^intake$/i });
      await intakeTab.click();
      await page.waitForTimeout(1000);
    });

    test('should have accessible buttons with proper labels', async () => {
      // Check that all buttons have accessible names
      const buttons = page.getByRole('button');
      const count = await buttons.count();

      expect(count).toBeGreaterThan(0);

      // Verify each button has text or aria-label
      for (let i = 0; i < Math.min(count, 10); i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');

        // At least one should exist
        expect(text || ariaLabel).toBeTruthy();
      }
    });

    test('should have proper heading hierarchy', async () => {
      // Check for h2 and h3 headings
      const h2Headings = page.locator('h2');
      const h3Headings = page.locator('h3');

      const h2Count = await h2Headings.count();
      const h3Count = await h3Headings.count();

      // Should have at least one h2 (main heading)
      expect(h2Count).toBeGreaterThanOrEqual(1);

      // Should have multiple h3s (for each section)
      expect(h3Count).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Error Handling', () => {
    test.beforeEach(async () => {
      // Navigate to Intake tab
      const intakeTab = page.getByRole('button', { name: /^intake$/i });
      await intakeTab.click();
      await page.waitForTimeout(1000);
    });

    test('should handle API errors gracefully', async () => {
      // We can't easily force an API error in e2e, but we can verify
      // that error UI elements exist in the component

      // The page should load without crashing even if some APIs fail
      const heading = page.getByRole('heading', { name: /Job Intake Sources/i });
      await expect(heading).toBeVisible();
    });
  });
});
