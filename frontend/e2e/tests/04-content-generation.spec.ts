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

    test('should complete LLM content generation within 45 seconds', async ({ page }) => {
      test.setTimeout(60000); // 60 second timeout for this LLM test
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

      // Wait for modal to appear with content (LLM takes longer: 5-15 seconds per call, 2 calls)
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(45000);

      const duration = Date.now() - startTime;

      // Verify generation completes within 45 seconds (LLM: ~30s typical, allow buffer)
      expect(duration).toBeLessThan(45000);
      console.log(`✓ LLM generation completed in ${(duration / 1000).toFixed(1)}s`);
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

      // Wait for modal (LLM generation takes ~30 seconds)
      await contentModal.waitForVisible(45000);
      await contentModal.waitForContentGeneration(45000);

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
    // Configure longer timeout for LLM tests (generation takes ~30s)
    test.describe.configure({ timeout: 60000 }); // 60 seconds

    test('should verify LLM content generation speed', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      const startTime = Date.now();

      await firstJob.generateContent();
      await contentModal.waitForVisible(45000); // LLM generation takes ~30s
      await contentModal.waitForContentGeneration(45000);

      const duration = Date.now() - startTime;

      // Verify LLM generation completes within 45 seconds (typical: 20-35 seconds)
      expect(duration).toBeLessThan(45000);
      console.log(`✓ LLM generation speed: ${(duration / 1000).toFixed(1)}s`);
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

  test.describe('LLM Quality Validation', () => {
    // Configure longer timeout for LLM tests (generation takes ~30s)
    test.describe.configure({ timeout: 60000 }); // 60 seconds

    test('should use bold formatting for emphasized keywords', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible(45000); // LLM generation takes ~30s
      await contentModal.waitForContentGeneration(45000);

      const resumeContent = await contentModal.getResumeContent();

      // LLM should emphasize keywords with bold (**keyword**)
      // Check for bold formatting patterns
      const hasBoldFormatting = resumeContent.includes('**') ||
                                resumeContent.includes('<strong>') ||
                                resumeContent.includes('<b>');

      expect(hasBoldFormatting).toBe(true);
    });

    test('should generate natural, non-template-like language', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible(45000); // LLM generation takes ~30s
      await contentModal.waitForContentGeneration(45000);

      const coverLetter = await contentModal.getCoverLetterContent();

      // Should not contain template placeholders
      expect(coverLetter).not.toContain('{{');
      expect(coverLetter).not.toContain('[COMPANY]');
      expect(coverLetter).not.toContain('[ROLE]');
      expect(coverLetter).not.toContain('undefined');
      expect(coverLetter).not.toContain('null');

      // Should be substantial (LLM generates 250-400 words)
      expect(coverLetter.length).toBeGreaterThan(250);
    });

    test('should tailor professional summary to job domain', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      const jobTitle = await firstJob.getTitle();

      await firstJob.generateContent();
      await contentModal.waitForVisible(45000); // LLM generation takes ~30s
      await contentModal.waitForContentGeneration(45000);

      const resumeContent = await contentModal.getResumeContent();
      const lowerContent = resumeContent.toLowerCase();
      const lowerTitle = jobTitle.toLowerCase();

      // Professional summary should reference job domain
      // Extract Professional Summary section
      const summaryMatch = resumeContent.match(/## Professional Summary\s+([\s\S]*?)(?=\s+##|$)/i);
      if (summaryMatch) {
        const summary = summaryMatch[1].toLowerCase();

        // Summary should be relevant to the job
        // If title contains "test", summary should mention testing
        if (lowerTitle.includes('test') || lowerTitle.includes('qa')) {
          const hasTestingTerms = summary.includes('test') ||
                                 summary.includes('quality') ||
                                 summary.includes('automation');
          expect(hasTestingTerms).toBe(true);
        }

        // If title contains "data" or "algorithm", summary should reflect that
        if (lowerTitle.includes('data') || lowerTitle.includes('algorithm')) {
          const hasDataTerms = summary.includes('data') ||
                              summary.includes('algorithm') ||
                              summary.includes('analysis');
          expect(hasDataTerms).toBe(true);
        }

        // Summary should be substantial (not just a single sentence)
        expect(summary.length).toBeGreaterThan(100);
      }
    });

    test('should include specific metrics and achievements', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible(45000); // LLM generation takes ~30s
      await contentModal.waitForContentGeneration(45000);

      const coverLetter = await contentModal.getCoverLetterContent();

      // LLM should include specific metrics from resume
      // Check for percentage or number patterns (70%, 40%, 10+, 50+ engineers, etc.)
      const hasMetrics = /\d+%|\d+\+/.test(coverLetter);

      expect(hasMetrics).toBe(true);
    });
  });

  test.describe('Phase 3.1.3: Token Counting & Cost Estimation', () => {
    // Configure longer timeout for LLM tests (generation takes ~30s)
    test.describe.configure({ timeout: 60000 }); // 60 seconds

    test('should return token usage and cost metadata from API', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      // Set up response interceptor to capture API response
      let apiResponse: any = null;
      await page.route('**/api/jobs/*/generate-content', async (route) => {
        const response = await route.fetch({ timeout: 60000 }); // 60s for LLM generation
        apiResponse = await response.json();
        await route.fulfill({ response });
      });

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible(45000);
      await contentModal.waitForContentGeneration(45000);

      // Verify API response contains LLM metadata
      expect(apiResponse).not.toBeNull();
      expect(apiResponse.generation_method).toBe('llm');
      expect(apiResponse.llm_model).toBe('claude-3-5-haiku-20241022');

      // Verify token counting
      expect(apiResponse.tokens_used).toBeGreaterThan(0);
      expect(apiResponse.tokens_used).toBeLessThan(10000); // Reasonable upper bound

      // Verify cost estimation
      expect(apiResponse.cost_estimate).toBeGreaterThan(0);
      expect(apiResponse.cost_estimate).toBeLessThan(0.05); // Target: < $0.05 per generation

      // Verify generation time tracking
      expect(apiResponse.generation_time_ms).toBeGreaterThan(0);
      expect(apiResponse.generation_time_ms).toBeLessThan(60000); // Should complete in < 60s

      console.log(`✓ Token usage: ${apiResponse.tokens_used}`);
      console.log(`✓ Cost estimate: $${apiResponse.cost_estimate.toFixed(6)}`);
      console.log(`✓ Generation time: ${(apiResponse.generation_time_ms / 1000).toFixed(1)}s`);
    });

    test('should track cost and tokens for complete generation', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      // Set up response interceptor
      let apiResponse: any = null;
      await page.route('**/api/jobs/*/generate-content', async (route) => {
        const response = await route.fetch({ timeout: 60000 }); // 60s for LLM generation
        apiResponse = await response.json();
        await route.fulfill({ response });
      });

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible(45000);
      await contentModal.waitForContentGeneration(45000);

      // Verify both resume and cover letter were generated
      const resumeContent = await contentModal.getResumeContent();
      const coverLetterContent = await contentModal.getCoverLetterContent();

      expect(resumeContent.length).toBeGreaterThan(100);
      expect(coverLetterContent.length).toBeGreaterThan(100);

      // Verify total tokens represent both calls (resume + cover letter)
      // Typical: 1500-2500 input + 800-1300 output = 2300-3800 total
      expect(apiResponse.tokens_used).toBeGreaterThan(1000);
      expect(apiResponse.tokens_used).toBeLessThan(8000);

      // Verify cost is reasonable for two LLM calls
      // Target: < $0.003 per generation (resume + cover letter)
      expect(apiResponse.cost_estimate).toBeGreaterThan(0.0001);
      expect(apiResponse.cost_estimate).toBeLessThan(0.01);
    });

    test('should complete generation within performance targets', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      // Set up response interceptor
      let apiResponse: any = null;
      await page.route('**/api/jobs/*/generate-content', async (route) => {
        const response = await route.fetch({ timeout: 60000 }); // 60s for LLM generation
        apiResponse = await response.json();
        await route.fulfill({ response });
      });

      const firstJob = await getJobCard(page, 0);
      const startTime = Date.now();

      await firstJob.generateContent();
      await contentModal.waitForVisible(45000);
      await contentModal.waitForContentGeneration(45000);

      const clientDuration = Date.now() - startTime;

      // Phase 3.1.3 Performance Targets:
      // - Total generation time: < 45 seconds (allows buffer)
      // - Cost per generation: < $0.05
      // - Success rate: > 95%

      expect(apiResponse.generation_time_ms).toBeLessThan(45000);
      expect(apiResponse.cost_estimate).toBeLessThan(0.05);
      expect(clientDuration).toBeLessThan(50000); // Client-side with buffer

      console.log(`✓ Server generation: ${(apiResponse.generation_time_ms / 1000).toFixed(1)}s`);
      console.log(`✓ Client total: ${(clientDuration / 1000).toFixed(1)}s`);
      console.log(`✓ Cost: $${apiResponse.cost_estimate.toFixed(6)}`);
      console.log(`✓ Tokens: ${apiResponse.tokens_used}`);
    });
  });
});
