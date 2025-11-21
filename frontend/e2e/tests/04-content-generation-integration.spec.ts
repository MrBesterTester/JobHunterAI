import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { getJobCard } from '../pages/JobCardComponent';
import { ContentGenerationModal } from '../pages/ModalComponent';
import { getTestTimeout } from '../helpers/timeout-utils';

/**
 * Integration Test Suite: Content Generation (Real LLM API)
 *
 * These tests use REAL Anthropic Claude API calls and are:
 * - Slower (~2 minutes for 3 tests vs <30 seconds for mocked suite)
 * - More expensive (~$0.01 per run vs free for mocks)
 * - Higher confidence in actual LLM behavior
 *
 * Run with: RUN_LLM_INTEGRATION_TESTS=true npx playwright test 04-content-generation-integration
 * Or: npm run test:e2e:integration
 *
 * Skip by default in CI/CD - run nightly or pre-release only
 */

// Only run these tests if explicitly enabled
const RUN_INTEGRATION_TESTS = process.env.RUN_LLM_INTEGRATION_TESTS === 'true';

test.describe('Content Generation - LLM Integration Tests', () => {
  // Skip entire suite if integration tests not enabled
  test.skip(!RUN_INTEGRATION_TESTS, 'Skipping LLM integration tests (set RUN_LLM_INTEGRATION_TESTS=true to enable)');

  let dashboardPage: DashboardPage;
  let contentModal: ContentGenerationModal;

  // Configure longer timeout for real LLM tests
  test.describe.configure({ timeout: getTestTimeout(60000) });

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    contentModal = new ContentGenerationModal(page);
    // NO MOCKING - these tests use real API
    await dashboardPage.goto();
  });

  test('should generate real content end-to-end with actual LLM', async ({ page }) => {
    await dashboardPage.clickTab('approved');
    await dashboardPage.waitForJobsUpdate();

    if ((await dashboardPage.getVisibleJobCount()) === 0) {
      test.skip();
      return;
    }

    const firstJob = await getJobCard(page, 0);
    const jobTitle = await firstJob.getTitle();
    const company = await firstJob.getCompany();
    const startTime = Date.now();

    // Set up response interceptor to capture real API response
    let apiResponse: any = null;
    await page.route('**/api/jobs/*/generate-content', async (route) => {
      const response = await route.fetch({ timeout: getTestTimeout(60000) });
      apiResponse = await response.json();
      await route.fulfill({ response });
    });

    // Generate content with REAL LLM
    await firstJob.generateContent();
    await contentModal.waitForVisible(45000);
    await contentModal.waitForContentGeneration(45000);

    const duration = Date.now() - startTime;

    // Verify modal opened with content
    expect(await contentModal.isVisible()).toBe(true);
    const resume = await contentModal.getResumeContent();
    const coverLetter = await contentModal.getCoverLetterContent();

    // Verify substantial content was generated
    expect(resume.length).toBeGreaterThan(500);
    expect(coverLetter.length).toBeGreaterThan(250);

    // Verify personalization (cover letter should mention company or role)
    const hasPersonalization =
      coverLetter.includes(company) || coverLetter.includes(jobTitle);
    expect(hasPersonalization).toBe(true);

    // Verify API response metadata
    expect(apiResponse).not.toBeNull();
    expect(apiResponse.generation_method).toBe('llm');
    expect(apiResponse.llm_model).toBe('claude-3-5-haiku-20241022');
    expect(apiResponse.tokens_used).toBeGreaterThan(1000);
    expect(apiResponse.cost_estimate).toBeLessThan(0.05);

    // Verify performance targets
    expect(duration).toBeLessThan(45000);

    console.log('✓ Real LLM Integration Test Results:');
    console.log(`  - Generation time: ${(duration / 1000).toFixed(1)}s`);
    console.log(`  - Tokens used: ${apiResponse.tokens_used}`);
    console.log(`  - Cost: $${apiResponse.cost_estimate.toFixed(6)}`);
    console.log(`  - Resume length: ${resume.length} chars`);
    console.log(`  - Cover letter length: ${coverLetter.length} chars`);
  });

  test('should generate unique content for different jobs with real LLM', async ({ page }) => {
    test.setTimeout(getTestTimeout(120000)); // 120s → 180s under comprehensive load

    await dashboardPage.clickTab('approved');
    await dashboardPage.waitForJobsUpdate();

    const approvedCount = await dashboardPage.getVisibleJobCount();

    if (approvedCount < 2) {
      test.skip();
      return;
    }

    // Generate content for first job
    const firstJob = await getJobCard(page, 0);
    await firstJob.generateContent();
    await contentModal.waitForVisible(45000);
    await contentModal.waitForContentGeneration(45000);

    const firstResume = await contentModal.getResumeContent();
    const firstCoverLetter = await contentModal.getCoverLetterContent();
    await contentModal.close();

    // Generate content for second job
    await dashboardPage.clickTab('approved');
    await dashboardPage.waitForJobsUpdate();
    const secondJob = await getJobCard(page, 1);
    await secondJob.generateContent();
    await contentModal.waitForVisible(45000);
    await contentModal.waitForContentGeneration(45000);

    const secondResume = await contentModal.getResumeContent();
    const secondCoverLetter = await contentModal.getCoverLetterContent();

    // LLM should generate different content for different jobs
    // Resume might be similar (same candidate), but cover letter should differ
    expect(firstCoverLetter).not.toBe(secondCoverLetter);

    console.log('✓ Uniqueness verified:');
    console.log(`  - First cover letter: ${firstCoverLetter.substring(0, 100)}...`);
    console.log(`  - Second cover letter: ${secondCoverLetter.substring(0, 100)}...`);
  });

  test('should verify real LLM quality and formatting', async ({ page }) => {
    await dashboardPage.clickTab('approved');
    await dashboardPage.waitForJobsUpdate();

    if ((await dashboardPage.getVisibleJobCount()) === 0) {
      test.skip();
      return;
    }

    const firstJob = await getJobCard(page, 0);
    const jobTitle = await firstJob.getTitle();

    await firstJob.generateContent();
    await contentModal.waitForVisible(45000);
    await contentModal.waitForContentGeneration(45000);

    const resume = await contentModal.getResumeContent();
    const coverLetter = await contentModal.getCoverLetterContent();

    // Verify LLM-specific quality markers
    // 1. Should use markdown formatting (headers, bold, etc.)
    expect(resume).toContain('##'); // Markdown headers
    expect(resume.includes('**') || resume.includes('<strong>')).toBe(true); // Bold text

    // 2. Should not contain template placeholders
    expect(resume).not.toContain('{{');
    expect(resume).not.toContain('[COMPANY]');
    expect(resume).not.toContain('undefined');
    expect(coverLetter).not.toContain('{{');
    expect(coverLetter).not.toContain('undefined');

    // 3. Should include specific metrics/achievements (LLM characteristic)
    const hasMetrics = /\d+%|\d+\+/.test(resume) || /\d+%|\d+\+/.test(coverLetter);
    expect(hasMetrics).toBe(true);

    // 4. Professional summary should be relevant to job domain
    const lowerTitle = jobTitle.toLowerCase();
    const lowerResume = resume.toLowerCase();

    if (lowerTitle.includes('test') || lowerTitle.includes('qa')) {
      const hasTestingTerms = lowerResume.includes('test') ||
                            lowerResume.includes('quality') ||
                            lowerResume.includes('automation');
      expect(hasTestingTerms).toBe(true);
    }

    // 5. Content should be substantial (real LLM generates detailed content)
    expect(resume.length).toBeGreaterThan(1000);
    expect(coverLetter.length).toBeGreaterThan(300);

    console.log('✓ Real LLM Quality Verified:');
    console.log(`  - Resume length: ${resume.length} chars`);
    console.log(`  - Cover letter length: ${coverLetter.length} chars`);
    console.log(`  - Has markdown: ${resume.includes('##')}`);
    console.log(`  - Has bold: ${resume.includes('**')}`);
    console.log(`  - Has metrics: ${hasMetrics}`);
  });
});
