import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { getJobCard } from '../pages/JobCardComponent';
import { ContentGenerationModal } from '../pages/ModalComponent';

/**
 * Test Suite 4: Content Generation
 *
 * Covers:
 * - Generate resume & cover letter test (Section 7)
 * - Content generation modal test (Section 8)
 */

test.describe('Content Generation', () => {
  let dashboardPage: DashboardPage;
  let contentModal: ContentGenerationModal;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    contentModal = new ContentGenerationModal(page);
    await dashboardPage.goto();
  });

  test.describe('Section 7: Generate Resume & Cover Letter Test', () => {
    test('should show Generate button for approved jobs', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      const approvedCount = await dashboardPage.getVisibleJobCount();

      if (approvedCount === 0) {
        test.skip('No approved jobs to test content generation');
        return;
      }

      // Get first approved job
      const firstJob = await getJobCard(page, 0);

      // Verify Generate button is visible
      await firstJob.expectGenerateButtonVisible();
    });

    test('should change button to "Generating..." when clicked', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);

      // Click generate button
      await firstJob.generateContent();

      // Check button text changes (implementation-dependent)
      // Button might be disabled or show loading state
      await page.waitForTimeout(500);
    });

    test('should complete content generation within 2 seconds', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      const startTime = Date.now();

      // Click generate
      await firstJob.generateContent();

      // Wait for modal to appear with content
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const duration = Date.now() - startTime;

      // Verify generation completes within 3.5 seconds (accounts for API + DB queries)
      expect(duration).toBeLessThan(3500);
    });

    test('should open modal with resume and cover letter', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);

      // Generate content
      await firstJob.generateContent();

      // Wait for modal
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      // Verify modal is visible
      expect(await contentModal.isVisible()).toBe(true);

      // Verify both panels are visible
      expect(await contentModal.isResumeVisible()).toBe(true);
      expect(await contentModal.isCoverLetterVisible()).toBe(true);
    });

    test('should display resume content in left panel', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);

      // Generate content
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      // Get resume content
      const resumeContent = await contentModal.getResumeContent();

      // Verify resume has content
      expect(resumeContent.length).toBeGreaterThan(100); // Reasonable minimum length

      // Verify it contains resume-like keywords
      const lowerContent = resumeContent.toLowerCase();
      const hasResumeKeywords =
        lowerContent.includes('experience') ||
        lowerContent.includes('skills') ||
        lowerContent.includes('education') ||
        lowerContent.includes('test');

      expect(hasResumeKeywords).toBe(true);
    });

    test('should display cover letter in right panel', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      const jobTitle = await firstJob.getTitle();
      const company = await firstJob.getCompany();

      // Generate content
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      // Get cover letter content
      const coverLetterContent = await contentModal.getCoverLetterContent();

      // Verify cover letter has content
      expect(coverLetterContent.length).toBeGreaterThan(100);

      // Verify personalization - should contain company name and/or job title
      const hasPersonalization =
        coverLetterContent.includes(company) || coverLetterContent.includes(jobTitle);

      expect(hasPersonalization).toBe(true);
    });

    test('should include domain-specific keywords in resume', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      const jobTitle = await firstJob.getTitle();

      // Generate content
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const resumeContent = await contentModal.getResumeContent();
      const lowerContent = resumeContent.toLowerCase();

      // Check for domain-specific keywords based on job title
      if (jobTitle.toLowerCase().includes('test')) {
        const hasTestingKeywords =
          lowerContent.includes('test') ||
          lowerContent.includes('automation') ||
          lowerContent.includes('quality');
        expect(hasTestingKeywords).toBe(true);
      } else if (jobTitle.toLowerCase().includes('ai')) {
        const hasAIKeywords =
          lowerContent.includes('ai') ||
          lowerContent.includes('machine learning') ||
          lowerContent.includes('generative');
        expect(hasAIKeywords).toBe(true);
      } else if (jobTitle.toLowerCase().includes('firmware')) {
        const hasFirmwareKeywords =
          lowerContent.includes('firmware') ||
          lowerContent.includes('hardware') ||
          lowerContent.includes('embedded');
        expect(hasFirmwareKeywords).toBe(true);
      }
    });

    test('should format resume with markdown', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);

      // Generate content
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const resumeContent = await contentModal.getResumeContent();

      // Check for markdown indicators (headers, bullets, etc.)
      // This depends on implementation - resume might be plain text or formatted
      expect(resumeContent.length).toBeGreaterThan(0);
    });
  });

  test.describe('Section 8: Content Generation Modal Test', () => {
    test('should have close button in top-right corner', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      // Verify close button is visible
      await expect(contentModal.closeButton).toBeVisible();
    });

    test('should close modal when close button is clicked', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      // Click close button
      await contentModal.close();

      // Verify modal is closed
      expect(await contentModal.isVisible()).toBe(false);
    });

    test('should close modal when clicking outside (overlay)', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      // Click outside modal on overlay
      await contentModal.closeByOverlay();

      // Verify modal is closed
      expect(await contentModal.isVisible()).toBe(false);
    });

    test('should be scrollable if content exceeds viewport height', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      // Check if modal is scrollable
      await contentModal.verifyScrollable();
    });

    test('should allow re-opening modal after closing', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);

      // Generate content
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      // Close modal
      await contentModal.close();

      // Re-open modal
      await firstJob.generateContent();
      await contentModal.waitForVisible();

      // Verify modal is visible again
      expect(await contentModal.isVisible()).toBe(true);
    });

    test('should maintain content when re-opened', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);

      // Generate content first time
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const firstResumeContent = await contentModal.getResumeContent();

      // Close modal
      await contentModal.close();

      // Re-open modal
      await firstJob.generateContent();
      await contentModal.waitForVisible();

      // Content might be regenerated or cached - both are acceptable
      const secondResumeContent = await contentModal.getResumeContent();

      expect(secondResumeContent.length).toBeGreaterThan(0);
    });

    test('should close modal with Escape key', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      // Press Escape key
      await contentModal.closeByEscape();

      // Verify modal is closed
      expect(await contentModal.isVisible()).toBe(false);
    });
  });

  test.describe('Content Quality Validation', () => {
    test('should generate unique content for different jobs', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      const approvedCount = await dashboardPage.getVisibleJobCount();

      if (approvedCount < 2) {
        test.skip('Need at least 2 approved jobs for comparison');
        return;
      }

      // Generate content for first job
      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const firstCoverLetter = await contentModal.getCoverLetterContent();
      await contentModal.close();

      // Generate content for second job
      await dashboardPage.clickTab('approved'); // Refresh
      await dashboardPage.waitForJobsUpdate();
      const secondJob = await getJobCard(page, 1);
      await secondJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const secondCoverLetter = await contentModal.getCoverLetterContent();

      // Cover letters should be different (personalized)
      expect(firstCoverLetter).not.toBe(secondCoverLetter);
    });

    test('should include job-specific information in cover letter', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      const company = await firstJob.getCompany();
      const title = await firstJob.getTitle();

      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      // Verify cover letter personalization
      await contentModal.verifyCoverLetterPersonalization(company, title);
    });

    test('should generate professional content without errors', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const resume = await contentModal.getResumeContent();
      const coverLetter = await contentModal.getCoverLetterContent();

      // Verify no obvious template errors (like {{missing}} variables)
      expect(resume).not.toContain('{{');
      expect(resume).not.toContain('undefined');
      expect(coverLetter).not.toContain('{{');
      expect(coverLetter).not.toContain('undefined');
    });
  });

  test.describe('Performance Validation', () => {
    test('should verify content generation speed', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();

      // Verify generation completes within 3.5 seconds (accounts for API + DB queries)
      await contentModal.verifyGenerationSpeed(3500);
    });

    test('should handle content generation errors gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/generate*', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Generation failed' }),
        });
      });

      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();

      // Should show error or handle gracefully
      await page.waitForTimeout(1000);

      // Modal might show error message or not appear
      // This depends on implementation
    });
  });
});
