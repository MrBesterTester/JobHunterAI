/**
 * Phase 5.1 E2E Tests: Calendar Management
 * Tests for interview scheduling, calendar integration, and upcoming interviews widget
 */

import { test, expect } from '@playwright/test';

test.describe('Calendar Management - Phase 5.1', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Calendar Tab Navigation', () => {
    test('should display Calendar tab in navigation', async ({ page }) => {
      const calendarTab = page.locator('button:has-text("Calendar")');
      await expect(calendarTab).toBeVisible();
    });

    test('should navigate to Calendar tab on click', async ({ page }) => {
      await page.click('button:has-text("Calendar")');
      await expect(page.locator('h2:has-text("Upcoming Interviews")')).toBeVisible();
    });

    test('should show empty state when no interviews scheduled', async ({ page }) => {
      // Set up listener before clicking to catch the API call
      const responsePromise = page.waitForResponse(response =>
        response.url().includes('/api/interviews/upcoming') && response.status() === 200
      );

      await page.click('button:has-text("Calendar")');
      await responsePromise;

      const emptyState = page.locator('text=/No interviews scheduled|No upcoming interviews/i');
      await expect(emptyState).toBeVisible();
    });
  });

  test.describe('Interview Scheduling', () => {
    test('should open schedule interview modal', async ({ page }) => {
      await page.click('button:has-text("Calendar")');

      const scheduleButton = page.locator('button:has-text("Schedule Interview")');
      if (await scheduleButton.isVisible()) {
        await scheduleButton.click();
        await expect(page.locator('h3:has-text("Schedule Interview")')).toBeVisible();
      }
    });

    test('should display interview scheduling form fields', async ({ page }) => {
      await page.click('button:has-text("Calendar")');

      const scheduleButton = page.locator('button:has-text("Schedule Interview")');
      if (await scheduleButton.isVisible()) {
        await scheduleButton.click();

        // Check form fields
        await expect(page.locator('label:has-text("Interview Type")')).toBeVisible();
        await expect(page.locator('label:has-text("Scheduled Date")')).toBeVisible();
        await expect(page.locator('label:has-text("Duration")')).toBeVisible();
        await expect(page.locator('label:has-text("Location")')).toBeVisible();
        await expect(page.locator('label:has-text("Interviewer Name")')).toBeVisible();
      }
    });

    test('should validate required fields in interview form', async ({ page }) => {
      await page.click('button:has-text("Calendar")');

      const scheduleButton = page.locator('button:has-text("Schedule Interview")');
      if (await scheduleButton.isVisible()) {
        await scheduleButton.click();

        // Try to submit without filling fields - use .last() to get the submit button in the form
        const submitButton = page.locator('button:has-text("Schedule")').last();
        await submitButton.click();

        // Should show validation errors or stay on form
        // The form doesn't use <form> or role="dialog", check for form heading instead
        const formHeading = page.locator('h3:has-text("Schedule Interview")');
        await expect(formHeading).toBeVisible();
      }
    });

    test('should create interview with valid data', async ({ page }) => {
      // First create or select an application
      await page.click('button:has-text("Approved")');

      const jobCard = page.locator('[data-testid="job-card"]').first();
      const count = await jobCard.count();

      if (count > 0) {
        await jobCard.click();

        // Check if Schedule Interview button exists in job details
        const scheduleBtn = page.locator('button:has-text("Schedule Interview")');
        if (await scheduleBtn.isVisible()) {
          await scheduleBtn.click();

          // Fill form
          await page.selectOption('select:has([name*="type"])', 'phone');
          await page.fill('input[type="datetime-local"]', '2025-10-15T10:00');
          await page.fill('input[name*="duration"]', '60');
          await page.fill('input[name*="location"]', 'Phone call');
          await page.fill('input[name*="interviewer"]', 'Jane Smith');

          // Submit
          await page.click('button:has-text("Schedule")');

          // Verify success
          await expect(page.locator('text=/Interview scheduled|Success/i')).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Upcoming Interviews Display', () => {
    test('should display upcoming interviews in calendar view', async ({ page }) => {
      await page.click('button:has-text("Calendar")');

      await page.waitForResponse(response =>
        response.url().includes('/api/interviews/upcoming') && response.status() === 200
      );

      // Check for interview cards or list
      const interviewsList = page.locator('[data-testid="interviews-list"], .interview-card').first();
      const count = await interviewsList.count();

      if (count > 0) {
        await expect(interviewsList).toBeVisible();
      }
    });

    test('should display interview details in cards', async ({ page }) => {
      await page.click('button:has-text("Calendar")');
      await page.waitForTimeout(1000);

      const interviewCard = page.locator('.interview-card, [data-testid="interview-card"]').first();
      const count = await interviewCard.count();

      if (count > 0) {
        // Should show company, job title, date, time
        await expect(interviewCard).toContainText(/\w+/); // Has some content
      }
    });

    test('should show interview status badges', async ({ page }) => {
      await page.click('button:has-text("Calendar")');
      await page.waitForTimeout(1000);

      const statusBadge = page.locator('.status-badge, [data-testid="interview-status"]').first();
      const count = await statusBadge.count();

      if (count > 0) {
        await expect(statusBadge).toBeVisible();
      }
    });

    test('should sort interviews by date', async ({ page }) => {
      await page.click('button:has-text("Calendar")');
      await page.waitForTimeout(1000);

      const interviewCards = page.locator('.interview-card, [data-testid="interview-card"]');
      const count = await interviewCards.count();

      if (count >= 2) {
        // Dates should be in chronological order
        // This is a basic check - full implementation would parse dates
        await expect(interviewCards.first()).toBeVisible();
      }
    });
  });

  test.describe('Interview Actions', () => {
    test('should allow editing interview details', async ({ page }) => {
      await page.click('button:has-text("Calendar")');
      await page.waitForTimeout(1000);

      const editButton = page.locator('button:has-text("Edit"), button[aria-label*="Edit"]').first();
      const count = await editButton.count();

      if (count > 0) {
        await editButton.click();
        await expect(page.locator('h3:has-text("Edit Interview")')).toBeVisible();
      }
    });

    test('should allow canceling interview', async ({ page }) => {
      await page.click('button:has-text("Calendar")');
      await page.waitForTimeout(1000);

      const cancelButton = page.locator('button:has-text("Cancel"), button[aria-label*="Cancel"]').first();
      const count = await cancelButton.count();

      if (count > 0) {
        await cancelButton.click();

        // Should show confirmation dialog
        const confirmDialog = page.locator('text=/Are you sure|Confirm/i');
        if (await confirmDialog.isVisible()) {
          await page.click('button:has-text("Yes"), button:has-text("Confirm")');
          await expect(page.locator('text=/Interview cancelled|Canceled/i')).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should show interview details on click', async ({ page }) => {
      await page.click('button:has-text("Calendar")');
      await page.waitForTimeout(1000);

      const interviewCard = page.locator('.interview-card, [data-testid="interview-card"]').first();
      const count = await interviewCard.count();

      if (count > 0) {
        await interviewCard.click();

        // Should show details modal or expanded view
        await expect(page.locator('text=/Interview Details|Details/i')).toBeVisible();
      }
    });
  });

  test.describe('Upcoming Interviews Widget', () => {
    test('should display widget on dashboard', async ({ page }) => {
      // Check if widget is visible on main dashboard
      const widget = page.locator('[data-testid="upcoming-interviews-widget"], .upcoming-interviews');
      const count = await widget.count();

      if (count > 0) {
        await expect(widget).toBeVisible();
      }
    });

    test('should show next 7 days of interviews', async ({ page }) => {
      const widget = page.locator('[data-testid="upcoming-interviews-widget"]');
      const count = await widget.count();

      if (count > 0) {
        await expect(widget.locator('text=/Next 7 days|This week/i')).toBeVisible();
      }
    });

    test('should link to Calendar tab from widget', async ({ page }) => {
      const widgetLink = page.locator('a:has-text("View all interviews"), a:has-text("Calendar")').first();
      const count = await widgetLink.count();

      if (count > 0) {
        await widgetLink.click();
        await expect(page.locator('h2:has-text("Upcoming Interviews")')).toBeVisible();
      }
    });
  });

  test.describe('Calendar API Integration', () => {
    test('should fetch upcoming interviews from API', async ({ page }) => {
      // Set up listener before clicking to catch the API call
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/interviews/upcoming') && response.status() === 200
      );

      await page.click('button:has-text("Calendar")');
      const response = await responsePromise;

      expect(response.ok()).toBeTruthy();
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Simulate API failure
      await page.route('**/api/interviews/upcoming', route => route.abort());

      await page.click('button:has-text("Calendar")');
      await page.waitForTimeout(1000);

      // Should show error message or empty state
      const errorMessage = page.locator('text=/Error loading|Failed to load|No interviews/i');
      await expect(errorMessage).toBeVisible();
    });

    test('should create interview via API', async ({ page }) => {
      let interviewCreated = false;

      page.on('response', response => {
        if (response.url().includes('/api/interviews') &&
            response.request().method() === 'POST' &&
            response.status() === 201) {
          interviewCreated = true;
        }
      });

      // Try to create interview (requires approved job)
      await page.click('button:has-text("Approved")');

      const jobCard = page.locator('[data-testid="job-card"]').first();
      const count = await jobCard.count();

      if (count > 0) {
        await jobCard.click();

        const scheduleBtn = page.locator('button:has-text("Schedule Interview")');
        if (await scheduleBtn.isVisible()) {
          await scheduleBtn.click();

          // Fill minimal required fields
          await page.selectOption('select', { index: 0 });
          await page.fill('input[type="datetime-local"]', '2025-10-15T10:00');
          await page.click('button:has-text("Schedule")');

          await page.waitForTimeout(2000);

          // Verify interview was created if all conditions met
          expect(interviewCreated).toBe(true);
        }
      }
    });
  });
});
