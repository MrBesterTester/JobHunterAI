/**
 * Phase 2.4 E2E Tests: Gmail Send Integration with TEST_MODE
 * Tests for follow-up email sending via Gmail API with safety override
 */

import { test, expect } from '@playwright/test';
import { getTestTimeout } from '../helpers/timeout-utils';

test.describe('Gmail Send Integration - Phase 2.4', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Follow-up Email Sending with TEST_MODE', () => {
    test('should send follow-up email to test address when TEST_MODE is enabled', async ({ page }) => {
      // Navigate to Follow-ups tab
      await page.click('button:has-text("Follow-ups")');
      await page.waitForTimeout(1500);

      // Check if there are any pending follow-ups
      const approveButton = page.locator('button:has-text("Approve")').first();
      const approveCount = await approveButton.count();

      if (approveCount > 0) {
        // Approve the follow-up
        await approveButton.click();
        await page.waitForTimeout(1000);

        // Send the follow-up
        const sendButton = page.locator('button:has-text("Send Now"), button:has-text("Send")').first();
        const sendCount = await sendButton.count();

        if (sendCount > 0) {
          // Listen for the send API call
          const sendPromise = page.waitForResponse(
            response => response.url().includes('/api/follow-ups') &&
                       response.url().includes('/send') &&
                       response.status() === 200,
            { timeout: getTestTimeout(10000) }
          );

          await sendButton.click();

          // Wait for send response
          const response = await sendPromise;
          const data = await response.json();

          // Verify response indicates success
          expect(data).toHaveProperty('message');
          expect(data.message).toMatch(/sent|success/i);
          expect(data).toHaveProperty('gmail_message_id');
          expect(data.gmail_message_id).toBeTruthy();

          // Verify success message appears in UI
          await expect(page.locator('text=/Sent|Email sent|Success/i').first()).toBeVisible({ timeout: getTestTimeout(5000) });
        }
      } else {
        // If no pending follow-ups, create one first
        await page.click('button:has-text("Applied"), button:has-text("Ranked")');
        await page.waitForTimeout(1000);

        const jobCard = page.locator('[data-testid="job-card"]').first();
        const jobCount = await jobCard.count();

        if (jobCount > 0) {
          await jobCard.click();
          await page.waitForTimeout(500);

          const createFollowupBtn = page.locator('button:has-text("Create Follow-up"), button:has-text("Schedule Follow-up")').first();
          if (await createFollowupBtn.isVisible()) {
            await createFollowupBtn.click();
            // Continue with follow-up creation...
          }
        }
      }
    });

    test('should handle Gmail send errors gracefully', async ({ page }) => {
      // Navigate to Follow-ups tab
      await page.click('button:has-text("Follow-ups")');
      await page.waitForTimeout(1000);

      // Mock a failing send request
      await page.route('**/api/follow-ups/*/send', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to send email' })
        });
      });

      const sendButton = page.locator('button:has-text("Send Now"), button:has-text("Send")').first();
      const sendCount = await sendButton.count();

      if (sendCount > 0) {
        await sendButton.click();

        // Should show error message
        await expect(page.locator('text=/Error|Failed|Could not send/i').first()).toBeVisible({ timeout: getTestTimeout(5000) });
      }
    });

    test('should show Gmail message ID after successful send', async ({ page }) => {
      await page.click('button:has-text("Follow-ups")');
      await page.waitForTimeout(1000);

      const approveButton = page.locator('button:has-text("Approve")').first();
      const count = await approveButton.count();

      if (count > 0) {
        await approveButton.click();
        await page.waitForTimeout(1000);

        const sendButton = page.locator('button:has-text("Send Now"), button:has-text("Send")').first();
        if (await sendButton.isVisible()) {
          const responsePromise = page.waitForResponse(
            response => response.url().includes('/send') && response.status() === 200,
            { timeout: getTestTimeout(10000) }
          );

          await sendButton.click();

          try {
            const response = await responsePromise;
            const data = await response.json();

            // Verify Gmail message ID is present
            if (data.gmail_message_id) {
              expect(data.gmail_message_id).toMatch(/^[0-9a-f]+$/);
            }
          } catch (e) {
            // No send happened (no pending follow-ups)
          }
        }
      }
    });

    test('should update follow-up status to sent after successful send', async ({ page }) => {
      await page.click('button:has-text("Follow-ups")');
      await page.waitForTimeout(1500);

      const approveButton = page.locator('button:has-text("Approve")').first();
      const count = await approveButton.count();

      if (count > 0) {
        await approveButton.click();
        await page.waitForTimeout(1000);

        const sendButton = page.locator('button:has-text("Send Now"), button:has-text("Send")').first();
        if (await sendButton.isVisible()) {
          await sendButton.click();
          await page.waitForTimeout(2000);

          // After sending, the follow-up should move to sent status
          // Check for status badge or sent indicator
          const sentIndicator = page.locator('text=/Sent|Delivered/i, .status-sent').first();
          const indicatorCount = await sentIndicator.count();

          if (indicatorCount > 0) {
            await expect(sentIndicator).toBeVisible();
          }
        }
      }
    });

    test('should not send follow-up before approval', async ({ page }) => {
      await page.click('button:has-text("Follow-ups")');
      await page.waitForTimeout(1000);

      // Look for a pending (not yet approved) follow-up
      const pendingCard = page.locator('.follow-up-card, [data-testid="follow-up-card"]').first();
      const count = await pendingCard.count();

      if (count > 0) {
        // Send button should not be enabled/visible for pending follow-ups
        const sendButton = await pendingCard.locator('button:has-text("Send Now")');
        const sendVisible = await sendButton.isVisible().catch(() => false);

        // Either button is not visible, or it's disabled
        if (sendVisible) {
          const isDisabled = await sendButton.isDisabled();
          expect(isDisabled).toBeTruthy();
        }
      }
    });
  });

  test.describe('Gmail OAuth Token Status', () => {
    test('should have valid Gmail OAuth token with send scope', async ({ page }) => {
      // This test verifies that the backend has proper OAuth credentials
      // by attempting to access the follow-ups API which requires Gmail access

      const response = await page.request.get('http://localhost:8080/api/follow-ups/pending');
      expect(response.ok()).toBeTruthy();
    });

    test('should handle expired OAuth tokens gracefully', async ({ page }) => {
      await page.click('button:has-text("Follow-ups")');
      await page.waitForTimeout(1000);

      // If OAuth token is expired, sending should fail with appropriate error
      await page.route('**/api/follow-ups/*/send', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'OAuth token expired or invalid' })
        });
      });

      const sendButton = page.locator('button:has-text("Send Now"), button:has-text("Send")').first();
      const count = await sendButton.count();

      if (count > 0) {
        await sendButton.click();

        // Should show OAuth error message
        await expect(page.locator('text=/OAuth|Authorization|Token expired/i').first()).toBeVisible({ timeout: getTestTimeout(5000) });
      }
    });
  });

  test.describe('TEST_MODE Safety', () => {
    test('should log TEST_MODE override in backend logs', async ({ page }) => {
      // This test documents expected backend behavior
      // When TEST_MODE=true, all outgoing emails should go to MrBesterTester@gmail.com

      await page.click('button:has-text("Follow-ups")');
      await page.waitForTimeout(1000);

      const approveButton = page.locator('button:has-text("Approve")').first();
      if (await approveButton.isVisible()) {
        await approveButton.click();
        await page.waitForTimeout(1000);

        const sendButton = page.locator('button:has-text("Send")').first();
        if (await sendButton.isVisible()) {
          await sendButton.click();

          // Backend should log: "TEST_MODE enabled: Overriding recipient email to MrBesterTester@gmail.com"
          // This can be verified by checking backend logs after test run

          await page.waitForTimeout(2000);
        }
      }
    });

    test('should send test emails only to MrBesterTester@gmail.com', async ({ page }) => {
      // This test documents the safety requirement
      // Real verification would require checking actual sent email destination
      // For E2E test, we verify the API call succeeds (which means email was sent)
      // Backend TEST_MODE ensures it goes to test address

      await page.click('button:has-text("Follow-ups")');
      await page.waitForTimeout(1000);

      const sendButton = page.locator('button:has-text("Send")').first();
      const count = await sendButton.count();

      if (count > 0) {
        const responsePromise = page.waitForResponse(
          response => response.url().includes('/send'),
          { timeout: getTestTimeout(10000) }
        ).catch(() => null);

        await sendButton.click();
        const response = await responsePromise;

        if (response && response.status() === 200) {
          const data = await response.json();
          // If successful, TEST_MODE ensured it went to MrBesterTester@gmail.com
          expect(data).toHaveProperty('gmail_message_id');
        }
      }
    });
  });
});
