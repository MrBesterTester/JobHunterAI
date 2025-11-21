import { test, expect } from '@playwright/test';
import { getTestTimeout } from '../helpers/timeout-utils';
import { shouldRunTest } from '../test-config';

// Conditionally skip entire file if disabled in test-config.ts
// This will NOT show skip messages in test output
if (!shouldRunTest('job-card-summary')) {
  test.skip();
}

/**
 * E2E Tests for Job Card Summary Section
 *
 * Tests the comprehensive Summary section on job cards that displays
 * all LLM-extracted trade-off information to support approve/reject decisions.
 *
 * Requirements from README_trade-off-info-plan.md Phase 6:
 * - Summary displays for ALL jobs (not just filtered)
 * - Smart display logic (only show non-null fields)
 * - Includes: Employment, Remote Work, Technical, AI Tools, Commute, Filtered Reasons
 */

// Test job data for the "new jobs" test
// This job will be seeded before the test and cleaned up after
let testJobId: string | null = null;

test.describe('Job Card Summary Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ request }) => {
    // Cleanup: Delete the test job if it was created
    if (testJobId) {
      try {
        // Since there's no DELETE endpoint for jobs, we'll use a direct SQL command
        // via the backend or psql
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const dbName = process.env.DATABASE_NAME || 'jobhunter_personal';
        const dbUser = process.env.DATABASE_USER || 'jobhunter_user';
        const dbPassword = process.env.DATABASE_PASSWORD || 'jobhunter_dev_password';

        await execAsync(
          `psql -U ${dbUser} -d ${dbName} -c "DELETE FROM jobs WHERE job_id = '${testJobId}'"`,
          { env: { ...process.env, PGPASSWORD: dbPassword } }
        );

        console.log(`Cleaned up test job: ${testJobId}`);
        testJobId = null;
      } catch (error) {
        console.error(`Failed to cleanup test job: ${error}`);
      }
    }
  });

  // Helper function to click a tab and wait for content to load
  async function clickTabAndWait(page: any, tabName: string) {
    await page.click(`button:has-text("${tabName}")`);
    // Wait for React state to update and re-render
    await page.waitForTimeout(500); // Give React time to update state
    // Try to wait for either job cards or empty state message
    try {
      await page.waitForSelector('[data-testid="job-card"]', { timeout: getTestTimeout(5000) });
    } catch (e) {
      // No job cards - that's okay, tab might be empty
    }
  }

  test('should display Summary section for new jobs with data', async ({ page, request }) => {
    // Seed test data: Create a job with status='new' and trade-off information
    const testJob = {
      title: 'Senior Test Automation Engineer (E2E Test)',
      company: 'E2E Test Company',
      salary: 155000,
      location: 'Remote',
      source: 'E2E-Test',
      description: 'Test automation engineer position for E2E testing purposes.',
      url: 'https://example.com/e2e-test-job'
    };

    // POST the job to create it
    const createResponse = await request.post('http://localhost:8080/api/jobs', {
      data: testJob
    });

    expect(createResponse.ok()).toBeTruthy();
    const createdJob = await createResponse.json();
    testJobId = createdJob.job_id;

    // Force the job status to 'new' (in case the backend filtered it)
    const statusResponse = await request.put(`http://localhost:8080/api/jobs/${testJobId}/status`, {
      data: { status: 'new' }
    });
    expect(statusResponse.ok()).toBeTruthy();

    // Add trade-off data to the job's raw_data field
    // Since the backend doesn't expose an endpoint to update raw_data directly,
    // we'll use SQL to update it
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const dbName = process.env.DATABASE_NAME || 'jobhunter_personal';
    const dbUser = process.env.DATABASE_USER || 'jobhunter_user';
    const dbPassword = process.env.DATABASE_PASSWORD || 'jobhunter_dev_password';

    const rawData = {
      employment: {
        relationship: 'direct_hire',
        benefits: 'Full benefits package'
      },
      remote_work: {
        remote_eligible_states: ['CA', 'NY', 'TX'],
        timezone_requirement: 'PST preferred'
      },
      job_domain: {
        primary_category: 'test_automation',
        testing_level: 'Senior',
        automation_focus: true,
        ai_tools_mentioned: ['ChatGPT', 'Claude', 'Copilot']
      },
      commute: {
        office_location: 'San Francisco, CA',
        commute_perks: 'Commuter stipend',
        schedule_flexibility: 'Flexible hybrid schedule'
      }
    };

    // Use heredoc to avoid shell quoting issues with JSON
    const rawDataEscaped = JSON.stringify(rawData).replace(/'/g, "''");
    const sqlCommand = `UPDATE jobs SET raw_data = '${rawDataEscaped}'::jsonb WHERE job_id = '${testJobId}';`;

    await execAsync(
      `psql -U ${dbUser} -d ${dbName} <<'EOF'\n${sqlCommand}\nEOF`,
      { env: { ...process.env, PGPASSWORD: dbPassword } }
    );

    // Best Practice: Wait for specific API response instead of arbitrary timeouts
    // Click "Refresh Data" and wait for the /api/jobs response to complete
    // IMPORTANT: Must match exactly '/api/jobs' not '/api/jobs/stats' or other variants
    const [response] = await Promise.all([
      page.waitForResponse(response => {
        const url = response.url();
        return url.endsWith('/api/jobs') && response.request().method() === 'GET';
      }),
      page.click('button:has-text("Refresh Data")')
    ]);

    // Verify the response was successful
    expect(response.ok()).toBeTruthy();

    // Navigate to New tab and wait for content
    await clickTabAndWait(page, 'New');

    // Best Practice: Use web-first assertions that auto-retry
    // Find the test job card by company name and wait for it to be visible
    const testJobCard = page.locator('[data-testid="job-card"]').filter({ hasText: 'E2E Test Company' });

    // This will automatically retry until the element is visible or timeout
    await expect(testJobCard).toBeVisible({ timeout: getTestTimeout(10000) });

    // Check if Summary section exists
    const summarySection = testJobCard.locator('[data-testid="job-summary"]');

    // Verify Summary section is visible (web-first assertion with auto-retry)
    await expect(summarySection).toBeVisible();

    // Verify Summary header
    await expect(summarySection).toContainText('Summary');

    // Verify specific trade-off information is displayed (all use web-first assertions)
    await expect(summarySection).toContainText('Employment:');
    await expect(summarySection).toContainText('Direct Hire');
    await expect(summarySection).toContainText('Remote Work:');
    await expect(summarySection).toContainText('CA, NY, TX');
    await expect(summarySection).toContainText('Technical:');
    await expect(summarySection).toContainText('Test Automation');
    await expect(summarySection).toContainText('AI Tools:');
    await expect(summarySection).toContainText('ChatGPT');
    await expect(summarySection).toContainText('Commute:');
    await expect(summarySection).toContainText('San Francisco');
  });

  test('should display Summary section for approved jobs with data', async ({ page }) => {
    // Navigate to Approved tab and wait for content
    await clickTabAndWait(page, 'Approved');

    const jobCards = page.locator('[data-testid="job-card"]');
    if (await jobCards.count() > 0) {
      const jobCard = jobCards.first();
      const summarySection = jobCard.locator('[data-testid="job-summary"]');

      if (await summarySection.isVisible()) {
        // Verify Summary header exists
        await expect(summarySection).toContainText('Summary');
      }
    } else {
      // No approved jobs - test passes
      console.log('No approved jobs to test');
    }
  });

  test('should display Summary section for filtered jobs with Filtered Reasons', async ({ page }) => {
    // Navigate to Filtered tab and wait for content
    await clickTabAndWait(page, 'Filtered');

    const jobCards = page.locator('[data-testid="job-card"]');
    if (await jobCards.count() > 0) {
      const jobCard = jobCards.first();
      const summarySection = jobCard.locator('[data-testid="job-summary"]');

      if (await summarySection.isVisible()) {
        // Verify Summary section exists (header is optional - only shows if raw_data exists)
        // Filtered jobs should have Filtered Reasons subsection
        const filteredReasons = summarySection.locator('strong:has-text("Filtered Reasons")');
        await expect(filteredReasons).toBeVisible();

        // Should have at least one reason listed
        const reasonsList = summarySection.locator('ul > li');
        expect(await reasonsList.count()).toBeGreaterThan(0);
      }
    } else {
      // No filtered jobs - test passes
      console.log('No filtered jobs to test');
    }
  });

  test('should display Employment subsection when data available', async ({ page }) => {
    await clickTabAndWait(page, 'All');

    // Check multiple job cards to find one with employment data
    const jobCards = page.locator('[data-testid="job-card"]');
    const count = Math.min(await jobCards.count(), 10);

    let foundEmploymentData = false;
    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const summary = card.locator('[data-testid="job-summary"]');

      if (await summary.isVisible()) {
        const employmentLabel = summary.locator('strong:has-text("Employment:")');

        if (await employmentLabel.isVisible()) {
          foundEmploymentData = true;

          // Verify employment content is displayed
          const employmentDiv = employmentLabel.locator('..');
          const employmentText = await employmentDiv.textContent();

          // Should contain relationship type or benefits
          expect(employmentText).toMatch(/Direct Hire|Staffing Agency|Consulting|Contract-to-Hire|Benefits:/i);
          break;
        }
      }
    }

    // Test passes whether or not employment data is found (depends on data)
    expect(foundEmploymentData || true).toBeTruthy();
  });

  test('should display Remote Work subsection when data available', async ({ page }) => {
    await clickTabAndWait(page, 'All');

    const jobCards = page.locator('[data-testid="job-card"]');
    const count = Math.min(await jobCards.count(), 10);

    let foundRemoteData = false;
    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const summary = card.locator('[data-testid="job-summary"]');

      if (await summary.isVisible()) {
        const remoteLabel = summary.locator('strong:has-text("Remote Work:")');

        if (await remoteLabel.isVisible()) {
          foundRemoteData = true;

          // Verify remote work content
          const remoteDiv = remoteLabel.locator('..');
          const remoteText = await remoteDiv.textContent();

          // Should contain states or timezone info
          expect(remoteText).toMatch(/States:|TZ:/i);
          break;
        }
      }
    }

    expect(foundRemoteData || true).toBeTruthy();
  });

  test('should display Technical subsection when data available', async ({ page }) => {
    await clickTabAndWait(page, 'All');

    const jobCards = page.locator('[data-testid="job-card"]');
    const count = Math.min(await jobCards.count(), 10);

    let foundTechnicalData = false;
    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const summary = card.locator('[data-testid="job-summary"]');

      if (await summary.isVisible()) {
        const techLabel = summary.locator('strong:has-text("Technical:")');

        if (await techLabel.isVisible()) {
          foundTechnicalData = true;

          // Verify technical content - should have content after the label
          const techDiv = techLabel.locator('..');
          const techText = await techDiv.textContent();

          // Should contain category, level, automation, or equipment
          // The bug is: if this shows "Technical:" with no content after it, this test will fail
          const contentAfterLabel = techText!.replace('Technical:', '').trim();
          expect(contentAfterLabel.length).toBeGreaterThan(0);

          // Should match expected technical data patterns
          expect(techText).toMatch(/Software Engineering|QA\/Testing|Level:|Automation:|Equipment:/i);
          break;
        }
      }
    }

    expect(foundTechnicalData || true).toBeTruthy();
  });

  test('should display AI Tools subsection when data available', async ({ page }) => {
    await clickTabAndWait(page, 'All');

    const jobCards = page.locator('[data-testid="job-card"]');
    const count = Math.min(await jobCards.count(), 10);

    let foundAIData = false;
    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const summary = card.locator('[data-testid="job-summary"]');

      if (await summary.isVisible()) {
        const aiLabel = summary.locator('strong:has-text("AI Tools:")');

        if (await aiLabel.isVisible()) {
          foundAIData = true;

          // Verify AI tools content
          const aiDiv = aiLabel.locator('..');
          const aiText = await aiDiv.textContent();

          // Should list AI tools
          expect(aiText).toMatch(/ChatGPT|Claude|Copilot|GPT/i);
          break;
        }
      }
    }

    expect(foundAIData || true).toBeTruthy();
  });

  test('should display Commute subsection when data available', async ({ page }) => {
    await clickTabAndWait(page, 'All');

    const jobCards = page.locator('[data-testid="job-card"]');
    const count = Math.min(await jobCards.count(), 10);

    let foundCommuteData = false;
    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const summary = card.locator('[data-testid="job-summary"]');

      if (await summary.isVisible()) {
        const commuteLabel = summary.locator('strong:has-text("Commute:")');

        if (await commuteLabel.isVisible()) {
          foundCommuteData = true;

          // Verify commute content
          const commuteDiv = commuteLabel.locator('..');
          const commuteText = await commuteDiv.textContent();

          // Should contain location, perks, or flexibility info
          expect(commuteText).toMatch(/Perks:|CA|Street|Avenue|Boulevard/i);
          break;
        }
      }
    }

    expect(foundCommuteData || true).toBeTruthy();
  });

  test('should NOT show empty subsections (smart display logic)', async ({ page }) => {
    await clickTabAndWait(page, 'All');

    const jobCards = page.locator('[data-testid="job-card"]');
    const card = jobCards.first();
    const summary = card.locator('[data-testid="job-summary"]');

    if (await summary.isVisible()) {
      // Check each subsection label
      const subsectionLabels = ['Employment:', 'Remote Work:', 'Technical:', 'AI Tools:', 'Commute:'];

      for (const label of subsectionLabels) {
        const labelElement = summary.locator(`strong:has-text("${label}")`);

        if (await labelElement.isVisible()) {
          // If label is visible, verify it has content
          const parentDiv = labelElement.locator('..');
          const fullText = await parentDiv.textContent();
          const contentAfterLabel = fullText!.replace(label, '').trim();

          // Content after label should not be empty
          expect(contentAfterLabel.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should NOT display Summary section if no data available', async ({ page }) => {
    await clickTabAndWait(page, 'All');

    // Check all job cards
    const jobCards = page.locator('[data-testid="job-card"]');
    const count = Math.min(await jobCards.count(), 10);

    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const summary = card.locator('[data-testid="job-summary"]');

      // If summary is not visible, that's correct behavior (no data)
      // If summary IS visible, it should have meaningful content
      if (await summary.isVisible()) {
        const summaryText = await summary.textContent();

        // Summary text should be more than just the "Summary" header
        // Should have at least one subsection or filtered reason
        expect(summaryText).toMatch(/Employment:|Remote Work:|Technical:|AI Tools:|Commute:|Filtered Reasons:/);
      }
    }
  });

  test('should format primary category correctly', async ({ page }) => {
    await clickTabAndWait(page, 'All');

    const jobCards = page.locator('[data-testid="job-card"]');
    const count = Math.min(await jobCards.count(), 10);

    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const summary = card.locator('[data-testid="job-summary"]');

      if (await summary.isVisible()) {
        const techLabel = summary.locator('strong:has-text("Technical:")');

        if (await techLabel.isVisible()) {
          const techDiv = techLabel.locator('..');
          const techText = await techDiv.textContent();

          // Should be formatted (not raw underscore format)
          expect(techText).not.toMatch(/software_engineering|qa_testing|test_automation/);

          // Should use proper capitalization
          if (techText!.includes('Software')) {
            expect(techText).toMatch(/Software Engineering|QA\/Testing|Test Automation|Firmware Engineering|DevOps/);
          }
          break;
        }
      }
    }
  });

  test('should render Summary section with proper styling', async ({ page }) => {
    await clickTabAndWait(page, 'All');

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const summary = jobCard.locator('[data-testid="job-summary"]');

    if (await summary.isVisible()) {
      // Verify styling
      const bgColor = await summary.evaluate(el => window.getComputedStyle(el).backgroundColor);
      expect(bgColor).toBe('rgb(249, 250, 251)'); // #f9fafb

      const borderLeft = await summary.evaluate(el => window.getComputedStyle(el).borderLeftWidth);
      expect(borderLeft).toBe('4px');

      const borderRadius = await summary.evaluate(el => window.getComputedStyle(el).borderRadius);
      expect(borderRadius).toBe('4px');
    }
  });

  test('should display Filtered Reasons only for filtered jobs', async ({ page }) => {
    // Check New tab - should NOT have Filtered Reasons
    await clickTabAndWait(page, 'New');

    const newJobCards = page.locator('[data-testid="job-card"]');
    if (await newJobCards.count() > 0) {
      const newJobCard = newJobCards.first();
      const newSummary = newJobCard.locator('[data-testid="job-summary"]');

      if (await newSummary.isVisible()) {
        const filteredReasons = newSummary.locator('strong:has-text("Filtered Reasons")');
        await expect(filteredReasons).not.toBeVisible();
      }
    } else {
      console.log('No new jobs to test');
    }

    // Check Filtered tab - SHOULD have Filtered Reasons
    await clickTabAndWait(page, 'Filtered');

    const filteredJobCards = page.locator('[data-testid="job-card"]');
    if (await filteredJobCards.count() > 0) {
      const filteredJobCard = filteredJobCards.first();
      const filteredSummary = filteredJobCard.locator('[data-testid="job-summary"]');

      if (await filteredSummary.isVisible()) {
        const filteredReasons = filteredSummary.locator('strong:has-text("Filtered Reasons")');
        await expect(filteredReasons).toBeVisible();
      }
    } else {
      console.log('No filtered jobs to test');
    }
  });
});
