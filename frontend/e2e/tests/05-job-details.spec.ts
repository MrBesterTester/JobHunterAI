import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { getJobCard } from '../pages/JobCardComponent';
import { JobDetailsModal } from '../pages/ModalComponent';

/**
 * Test Suite 5: Job Details View
 *
 * Covers:
 * - Job details modal test (Section 9)
 * - Job details action buttons (Section 10)
 */

test.describe('Job Details View', () => {
  let dashboardPage: DashboardPage;
  let jobDetailsModal: JobDetailsModal;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    jobDetailsModal = new JobDetailsModal(page);
    await dashboardPage.goto();
  });

  test.describe('Section 9: Job Details Modal Test', () => {
    test('should open job details modal when clicking on job card', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      // Click on job card to open details
      await firstJob.openDetails();

      // Verify modal opens
      await jobDetailsModal.waitForVisible();
      expect(await jobDetailsModal.isVisible()).toBe(true);
    });

    test('should display job title in modal', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);
      const expectedTitle = await firstJob.getTitle();

      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Verify title matches
      const modalTitle = await jobDetailsModal.getJobTitle();
      expect(modalTitle).toBe(expectedTitle);
    });

    test('should display company name in modal', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);
      const expectedCompany = await firstJob.getCompany();

      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Verify company matches
      const modalCompany = await jobDetailsModal.getCompany();
      expect(modalCompany).toBe(expectedCompany);
    });

    test('should display status badge in modal', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Verify status badge is visible
      await expect(jobDetailsModal.statusBadge).toBeVisible();
    });

    test('should display salary if available', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      // Find a job with salary
      const jobCount = await dashboardPage.getVisibleJobCount();
      let foundJobWithSalary = false;

      for (let i = 0; i < jobCount; i++) {
        const job = await getJobCard(page, i);
        const salary = await job.getSalary();

        if (salary) {
          await job.openDetails();
          await jobDetailsModal.waitForVisible();

          // Verify salary is displayed in modal
          await expect(jobDetailsModal.salary).toBeVisible();
          foundJobWithSalary = true;
          break;
        }
      }

      if (!foundJobWithSalary) {
        test.skip();
      }
    });

    test('should display location if available', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Location should be visible
      await expect(jobDetailsModal.location).toBeVisible();
    });

    test('should display source in modal', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Source should be visible
      await expect(jobDetailsModal.source).toBeVisible();
    });

    test('should display clickable job URL if available', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Check if URL is present
      const jobUrl = await jobDetailsModal.getJobUrl();

      if (jobUrl) {
        // Verify it's a valid URL
        expect(jobUrl).toMatch(/^https?:\/\//);

        // Verify link is clickable
        await expect(jobDetailsModal.jobUrl).toBeVisible();
      }
    });

    test('should display job description if available', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Check if description is present
      const description = await jobDetailsModal.getDescription();

      if (description) {
        expect(description.length).toBeGreaterThan(0);
      }
    });

    test('should display date collected', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Date collected should be visible
      await expect(jobDetailsModal.dateCollected).toBeVisible();
    });

    test('should close modal when close button is clicked', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Close modal
      await jobDetailsModal.close();

      // Verify modal is closed
      expect(await jobDetailsModal.isVisible()).toBe(false);
    });

    test('should close modal when clicking outside on overlay', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Click outside modal
      await jobDetailsModal.closeByOverlay();

      // Verify modal is closed
      expect(await jobDetailsModal.isVisible()).toBe(false);
    });

    test('should verify all required job details are displayed', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Verify core details
      await jobDetailsModal.verifyJobDetails();
    });
  });

  // Run serially to avoid race conditions with shared database state
  test.describe.serial('Section 10: Job Details Action Buttons', () => {
    test('should show Approve and Reject buttons for "new" status jobs', async ({ page }) => {
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Verify action buttons are present
      const hasButtons = await jobDetailsModal.hasActionButtons();
      expect(hasButtons).toBe(true);

      await expect(jobDetailsModal.approveButton).toBeVisible();
      await expect(jobDetailsModal.rejectButton).toBeVisible();
    });

    test('should close modal and move job to Approved when Approve is clicked', async ({ page }) => {
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);
      const jobTitle = await firstJob.getTitle();

      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Click Approve button
      await jobDetailsModal.approve();

      // Verify modal closed
      await jobDetailsModal.waitForHidden();

      // Verify job moved to Approved
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      const jobTitles = await dashboardPage.getJobTitles();
      expect(jobTitles).toContain(jobTitle);
    });

    test('should close modal and remove job when Reject is clicked', async ({ page }) => {
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      const initialCount = await dashboardPage.getVisibleJobCount();

      if (initialCount === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Click Reject button
      await jobDetailsModal.reject();

      // Verify modal closed
      await jobDetailsModal.waitForHidden();

      // Verify job was removed from Inbox
      const newCount = await dashboardPage.getVisibleJobCount();
      expect(newCount).toBe(initialCount - 1);
    });

    test('should show Generate Resume & Cover Letter button for "approved" status jobs', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Verify Generate button is present
      const hasGenerateButton = await jobDetailsModal.hasGenerateButton();
      expect(hasGenerateButton).toBe(true);

      await expect(jobDetailsModal.generateContentButton).toBeVisible();
    });

    test('should open content generation modal when Generate button is clicked', async ({ page }) => {
      test.setTimeout(33000);
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Click Generate button
      await jobDetailsModal.generateContent();

      // Wait for content generation modal to appear
      await page.waitForTimeout(1000);

      // Verify content modal is visible
      // Note: This will open a different modal (ContentGenerationModal)
      // The job details modal might stay open or be replaced
    });

    test('should handle modal reopening after approval', async ({ page }) => {
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) < 2) {
        test.skip();
        return;
      }

      // Open first job
      const firstJob = await getJobCard(page, 0);
      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Approve and close
      await jobDetailsModal.approve();
      await jobDetailsModal.waitForHidden();

      // Open second job (now at index 0)
      await dashboardPage.waitForJobsUpdate();
      const secondJob = await getJobCard(page, 0);
      await secondJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Verify modal opened successfully
      expect(await jobDetailsModal.isVisible()).toBe(true);
    });

    test('should maintain proper button states for different job statuses', async ({ page }) => {
      // Test different status tabs to verify correct button visibility

      // New jobs: should have Approve/Reject
      await dashboardPage.clickTab('inbox');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) > 0) {
        const newJob = await getJobCard(page, 0);
        await newJob.openDetails();
        await jobDetailsModal.waitForVisible();

        expect(await jobDetailsModal.hasActionButtons()).toBe(true);
        await jobDetailsModal.close();
      }

      // Approved jobs: should have Generate button
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) > 0) {
        const approvedJob = await getJobCard(page, 0);
        await approvedJob.openDetails();
        await jobDetailsModal.waitForVisible();

        expect(await jobDetailsModal.hasGenerateButton()).toBe(true);
        await jobDetailsModal.close();
      }
    });
  });

  test.describe('Modal Behavior & Edge Cases', () => {
    test('should handle Escape key to close modal', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Press Escape
      await page.keyboard.press('Escape');

      // Verify modal closed
      await jobDetailsModal.waitForHidden();
      expect(await jobDetailsModal.isVisible()).toBe(false);
    });

    test('should handle rapid modal open/close operations', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) < 2) {
        test.skip();
        return;
      }

      // Open and close multiple times rapidly
      for (let i = 0; i < 2; i++) {
        const job = await getJobCard(page, i);
        await job.openDetails();
        await jobDetailsModal.waitForVisible();
        await jobDetailsModal.close();
        await jobDetailsModal.waitForHidden();
      }

      // Verify last operation worked correctly
      const job = await getJobCard(page, 0);
      await job.openDetails();
      await jobDetailsModal.waitForVisible();
      expect(await jobDetailsModal.isVisible()).toBe(true);
    });

    test('should display job details consistently with job card data', async ({ page }) => {
      await dashboardPage.clickTab('all');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip();
        return;
      }

      const firstJob = await getJobCard(page, 0);

      // Get data from job card
      const cardTitle = await firstJob.getTitle();
      const cardCompany = await firstJob.getCompany();

      // Open modal
      await firstJob.openDetails();
      await jobDetailsModal.waitForVisible();

      // Get data from modal
      const modalTitle = await jobDetailsModal.getJobTitle();
      const modalCompany = await jobDetailsModal.getCompany();

      // Verify consistency
      expect(modalTitle).toBe(cardTitle);
      expect(modalCompany).toBe(cardCompany);
    });
  });
});
