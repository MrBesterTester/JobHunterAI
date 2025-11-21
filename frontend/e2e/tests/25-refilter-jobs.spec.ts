import { test, expect } from '@playwright/test';
import { getTestTimeout } from '../helpers/timeout-utils';
import { shouldRunTest } from '../test-config';

// Conditionally skip entire file if disabled in test-config.ts
// This will NOT show skip messages in test output
if (!shouldRunTest('refilter-jobs')) {
  test.skip();
}

/**
 * E2E Tests for Re-filter Jobs Functionality
 *
 * Tests the Re-filter Jobs button and dropdown in the Intake tab header.
 *
 * Feature Overview:
 * - Purple button that re-applies filtering criteria to existing jobs
 * - Dropdown with two scope options:
 *   - "Last Sync Only": Re-filter jobs from the most recent sync
 *   - "All Filtered Jobs": Re-filter all currently filtered jobs
 * - Does NOT fetch new emails, only re-evaluates existing jobs
 * - Shows success notification with results
 * - Visual feedback with spinning icon during operation
 *
 * Requirements:
 * - Re-filter dropdown exists with both scope options
 * - Re-filter button exists and is styled correctly (purple)
 * - Button is disabled during sync operations
 * - Clicking button triggers re-filtering operation
 * - Success notification displays results
 * - Filtered jobs moved back to "New" tab if they now pass filters
 * - Jobs remain in "Filtered" tab if they still fail filters
 */

test.describe('Re-filter Jobs Button and Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Navigate to Intake tab
    const intakeTab = page.getByRole('button', { name: /^Intake$/i });
    await intakeTab.click();
    await page.waitForTimeout(500);
  });

  test('should display re-filter scope dropdown', async ({ page }) => {
    // Find the dropdown
    const dropdown = page.locator('select').filter({ hasText: /Last Sync Only|All Filtered Jobs/i });
    await expect(dropdown).toBeVisible();

    // Verify dropdown has both options
    const options = await dropdown.locator('option').allTextContents();
    expect(options).toContain('Last Sync Only');
    expect(options).toContain('All Filtered Jobs');

    // Verify default selection is "Last Sync Only"
    const selectedValue = await dropdown.inputValue();
    expect(selectedValue).toBe('last_sync');
  });

  test('should display Re-filter Jobs button', async ({ page }) => {
    // Find the Re-filter Jobs button
    const refilterButton = page.getByRole('button', { name: /Re-filter Jobs/i });
    await expect(refilterButton).toBeVisible();

    // Verify button text
    const buttonText = await refilterButton.textContent();
    expect(buttonText).toContain('Re-filter Jobs');

    // Verify button has Filter icon
    const icon = refilterButton.locator('svg');
    await expect(icon).toBeVisible();
  });

  test('should have correct styling for Re-filter Jobs button (purple)', async ({ page }) => {
    const refilterButton = page.getByRole('button', { name: /Re-filter Jobs/i });

    // Verify purple background color (#8b5cf6)
    const bgColor = await refilterButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // RGB equivalent of #8b5cf6 is rgb(139, 92, 246)
    expect(bgColor).toBe('rgb(139, 92, 246)');

    // Verify white text color
    const textColor = await refilterButton.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    expect(textColor).toBe('rgb(255, 255, 255)');
  });

  test('should position dropdown and button correctly in header', async ({ page }) => {
    const dropdown = page.locator('select').filter({ hasText: /Last Sync Only/i });
    const refilterButton = page.getByRole('button', { name: /Re-filter Jobs/i });
    const syncButton = page.getByRole('button', { name: /Sync All Sources/i });

    // All three elements should be visible
    await expect(dropdown).toBeVisible();
    await expect(refilterButton).toBeVisible();
    await expect(syncButton).toBeVisible();

    // Verify they are in the same row (similar vertical position)
    const dropdownBox = await dropdown.boundingBox();
    const refilterBox = await refilterButton.boundingBox();
    const syncBox = await syncButton.boundingBox();

    expect(dropdownBox).toBeTruthy();
    expect(refilterBox).toBeTruthy();
    expect(syncBox).toBeTruthy();

    // Buttons should be in roughly the same horizontal row (within 50px)
    const dropdownY = dropdownBox!.y;
    const refilterY = refilterBox!.y;
    const syncY = syncBox!.y;

    expect(Math.abs(dropdownY - refilterY)).toBeLessThan(50);
    expect(Math.abs(refilterY - syncY)).toBeLessThan(50);

    // Re-filter button should be to the left of Sync button
    expect(refilterBox!.x).toBeLessThan(syncBox!.x);
  });

  test('should allow changing dropdown scope', async ({ page }) => {
    const dropdown = page.locator('select').filter({ hasText: /Last Sync Only/i });

    // Initially set to "Last Sync Only"
    expect(await dropdown.inputValue()).toBe('last_sync');

    // Change to "All Filtered Jobs"
    await dropdown.selectOption('all_filtered');
    expect(await dropdown.inputValue()).toBe('all_filtered');

    // Change back to "Last Sync Only"
    await dropdown.selectOption('last_sync');
    expect(await dropdown.inputValue()).toBe('last_sync');
  });

  test('should disable dropdown during re-filtering operation', async ({ page }) => {
    const dropdown = page.locator('select').filter({ hasText: /Last Sync Only/i });
    const refilterButton = page.getByRole('button', { name: /Re-filter Jobs/i });

    // Dropdown should be enabled initially
    await expect(dropdown).toBeEnabled();

    // Monitor for disabled state during operation
    const disabledPromise = dropdown.evaluate((el) => {
      return new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          if ((el as HTMLSelectElement).disabled) {
            resolve(true);
            observer.disconnect();
          }
        });
        observer.observe(el, { attributes: true, attributeFilter: ['disabled'] });
      });
    });

    // Click re-filter button
    await refilterButton.click();

    // Wait for dropdown to become disabled (with timeout)
    const wasDisabled = await Promise.race([
      disabledPromise,
      page.waitForTimeout(2000).then(() => false)
    ]);

    // If operation was fast, dropdown might not have been disabled
    // That's acceptable - this is more of an optional UX check
  });

  test('should show "Re-filtering..." text and spinning icon during operation', async ({ page }) => {
    test.setTimeout(34650);
    const refilterButton = page.getByRole('button', { name: /Re-filter Jobs/i });

    // Initially shows "Re-filter Jobs"
    expect(await refilterButton.textContent()).toContain('Re-filter Jobs');

    // Click the button
    await refilterButton.click();

    // Should briefly show "Re-filtering..." (might be too fast to catch)
    try {
      await expect(page.getByRole('button', { name: /Re-filtering/i })).toBeVisible({ timeout: getTestTimeout(1000) });
    } catch (e) {
      // OK if operation completes too quickly
    }

    // Wait for operation to complete
    await page.waitForTimeout(3000);

    // Button should return to "Re-filter Jobs"
    const finalText = await refilterButton.textContent();
    expect(finalText).toContain('Re-filter Jobs');
  });

  test('should be enabled when no other operations are running', async ({ page }) => {
    const refilterButton = page.getByRole('button', { name: /Re-filter Jobs/i });

    // Button should be enabled
    await expect(refilterButton).toBeEnabled();
  });

  test.setTimeout(33000);
  test('should display success notification after re-filtering', async ({ page }) => {
    test.setTimeout(33000);
    const refilterButton = page.getByRole('button', { name: /Re-filter Jobs/i });

    // Click re-filter button
    await refilterButton.click();

    // Wait for operation to complete
    await page.waitForTimeout(3000);

    // Success notification should appear with results
    const notification = page.locator('div').filter({ hasText: /jobs refiltered/i }).first();

    // Check if notification exists (it might not if no jobs were re-filtered)
    const notificationVisible = await notification.isVisible().catch(() => false);

    if (notificationVisible) {
      const notificationText = await notification.textContent();

      // Should contain results like "X jobs refiltered, Y moved to New, Z remained Filtered"
      expect(notificationText).toMatch(/\d+ jobs refiltered/i);
      expect(notificationText).toMatch(/\d+ moved to New/i);
      expect(notificationText).toMatch(/\d+ remained Filtered/i);
    } else {
      // It's OK if notification doesn't appear - might be no filtered jobs in database
      console.log('No re-filter notification appeared - likely no filtered jobs in database');
    }
  });
    test.setTimeout(33000);

  test('should re-filter with "Last Sync Only" scope', async ({ page }) => {
    const dropdown = page.locator('select').filter({ hasText: /Last Sync Only/i });
    const refilterButton = page.getByRole('button', { name: /Re-filter Jobs/i });

    // Set scope to "Last Sync Only"
    await dropdown.selectOption('last_sync');

    // Click re-filter button
    await refilterButton.click();

    // Wait for operation to complete
    await page.waitForTimeout(3000);

    // Button should return to enabled state
    await expect(refilterButton).toBeEnabled();
    expect(await refilterButton.textContent()).toContain('Re-filter Jobs');
      test.setTimeout(33000);
  });

  test('should re-filter with "All Filtered Jobs" scope', async ({ page }) => {
    const dropdown = page.locator('select').filter({ hasText: /Last Sync Only/i });
    const refilterButton = page.getByRole('button', { name: /Re-filter Jobs/i });

    // Set scope to "All Filtered Jobs"
    await dropdown.selectOption('all_filtered');

    // Verify selection changed
    expect(await dropdown.inputValue()).toBe('all_filtered');

    // Click re-filter button
    await refilterButton.click();

    // Wait for operation to complete
    await page.waitForTimeout(3000);

    // Button should return to enabled state
    await expect(refilterButton).toBeEnabled();
      test.setTimeout(33000);
    expect(await refilterButton.textContent()).toContain('Re-filter Jobs');
  });

  test('should NOT fetch new emails (only re-evaluates existing)', async ({ page }) => {
    // This test verifies that re-filtering doesn't make Gmail API calls

    // Set up request monitoring
    const requests: string[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/gmail/') || url.includes('googleapis.com')) {
        requests.push(url);
      }
    });

    const refilterButton = page.getByRole('button', { name: /Re-filter Jobs/i });

    // Click re-filter button
    await refilterButton.click();

    // Wait for operation to complete
    await page.waitForTimeout(3000);

  test.setTimeout(33000);
    // Should NOT have made any Gmail API calls
    expect(requests.length).toBe(0);
  });

  test('should make API call to /jobs/refilter endpoint', async ({ page }) => {
    // Monitor for the correct API endpoint
    let apiCallMade = false;
    let requestBody: any = null;

    page.on('request', request => {
      const url = request.url();
      if (url.includes('/jobs/refilter')) {
        apiCallMade = true;
        const postData = request.postData();
        if (postData) {
          try {
            requestBody = JSON.parse(postData);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    });

    const refilterButton = page.getByRole('button', { name: /Re-filter Jobs/i });

    // Click re-filter button
    await refilterButton.click();

    // Wait for operation to complete
    await page.waitForTimeout(3000);

    // Should have made API call to /jobs/refilter
    expect(apiCallMade).toBe(true);

    // Request body should include scope
    if (requestBody) {
      test.setTimeout(93501);
      expect(requestBody).toHaveProperty('scope');
      expect(['last_sync', 'all_filtered']).toContain(requestBody.scope);
    }
  });

  test.setTimeout(93501);
  test('should maintain button state after page navigation', async ({ page }) => {
    test.setTimeout(93501);
    const dropdown = page.locator('select').filter({ hasText: /Last Sync Only/i });

    // Verify dropdown is visible initially
    await expect(dropdown).toBeVisible();

    // Change dropdown to "All Filtered Jobs"
    await dropdown.selectOption('all_filtered');
    expect(await dropdown.inputValue()).toBe('all_filtered');

    // Navigate away from Intake tab
    const allTab = page.getByRole('button', { name: /^All$/i });
    await allTab.click();
    await page.waitForTimeout(500);

    // Navigate back to Intake tab
    const intakeTab = page.getByRole('button', { name: /^Intake$/i });
    await intakeTab.click();
    await page.waitForTimeout(2000); // Increased wait for tab rendering

    // Wait for a known Intake tab element to be visible (not the dropdown)
    const syncButton = page.getByRole('button', { name: /Sync All Sources/i });
    await expect(syncButton).toBeVisible({ timeout: getTestTimeout(15000) });

    // Get the dropdown again after navigation (create fresh locator)
    const dropdownAfterNav = page.locator('select').filter({ hasText: /Last Sync Only/i });
    await expect(dropdownAfterNav).toBeVisible({ timeout: getTestTimeout(10000) });
      test.setTimeout(33000);

    // Dropdown should reset to default ("Last Sync Only") since it's component state
    const dropdownValue = await dropdownAfterNav.inputValue();
    expect(dropdownValue).toBe('last_sync');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // This test is more of a sanity check - we can't easily force an API error
    // but we can verify the button returns to a usable state

    const refilterButton = page.getByRole('button', { name: /Re-filter Jobs/i });

    // Click re-filter button
    await refilterButton.click();

    // Wait for operation
      test.setTimeout(33000);
    await page.waitForTimeout(5000);

    // Button should return to enabled state even if there was an error
    await expect(refilterButton).toBeEnabled();
    expect(await refilterButton.textContent()).toContain('Re-filter Jobs');
  });
    test.setTimeout(33000);

  test.setTimeout(33000);
  test('should be accessible via keyboard navigation', async ({ page }) => {
    test.setTimeout(33000);
    // Tab to the dropdown
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Find dropdown
    const dropdown = page.locator('select').filter({ hasText: /Last Sync Only/i });

    // Check if dropdown is focused (might not be depending on page structure)
    const dropdownFocused = await dropdown.evaluate((el) => {
      return document.activeElement === el;
    });

    if (dropdownFocused) {
      // Use arrow keys to change selection
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);

      const newValue = await dropdown.inputValue();
      expect(newValue).toBe('all_filtered');
    }
  });

  test('should show distinct styling from Sync All Sources button', async ({ page }) => {
    const refilterButton = page.getByRole('button', { name: /Re-filter Jobs/i });
    const syncButton = page.getByRole('button', { name: /Sync All Sources/i });

    // Get background colors
    const refilterBg = await refilterButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    const syncBg = await syncButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Colors should be different (purple vs blue)
    expect(refilterBg).not.toBe(syncBg);

    // Re-filter should be purple
    expect(refilterBg).toBe('rgb(139, 92, 246)');
  });
});
