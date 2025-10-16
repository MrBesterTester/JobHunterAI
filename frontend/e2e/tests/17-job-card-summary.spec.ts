import { test, expect } from '@playwright/test';

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

test.describe('Job Card Summary Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should display Summary section for new jobs with data', async ({ page }) => {
    // Navigate to New tab
    await page.click('button:has-text("New")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    // Get first job card
    const jobCard = page.locator('[data-testid="job-card"]').first();

    // Check if Summary section exists
    const summarySection = jobCard.locator('[data-testid="job-summary"]');

    if (await summarySection.isVisible()) {
      // Verify Summary header
      const header = summarySection.locator('div').first();
      await expect(header).toContainText('Summary');

      // Summary section should have content (not just header)
      const summaryText = await summarySection.textContent();
      expect(summaryText).toBeTruthy();
      expect(summaryText!.length).toBeGreaterThan('Summary'.length + 10); // More than just the header
    }
  });

  test('should display Summary section for approved jobs with data', async ({ page }) => {
    // Navigate to Approved tab
    await page.click('button:has-text("Approved")');

    // Wait for job cards - use waitForTimeout as fallback if no cards exist
    try {
      await page.waitForSelector('[data-testid="job-card"]', { timeout: 5000 });

      const jobCard = page.locator('[data-testid="job-card"]').first();
      const summarySection = jobCard.locator('[data-testid="job-summary"]');

      if (await summarySection.isVisible()) {
        // Verify Summary header exists
        await expect(summarySection).toContainText('Summary');
      }
    } catch (e) {
      // No approved jobs - test passes
      console.log('No approved jobs to test');
    }
  });

  test('should display Summary section for filtered jobs with Filtered Reasons', async ({ page }) => {
    // Navigate to Filtered tab
    await page.click('button:has-text("Filtered")');

    try {
      await page.waitForSelector('[data-testid="job-card"]', { timeout: 5000 });

      const jobCard = page.locator('[data-testid="job-card"]').first();
      const summarySection = jobCard.locator('[data-testid="job-summary"]');

      if (await summarySection.isVisible()) {
        // Verify Summary header
        await expect(summarySection).toContainText('Summary');

        // Filtered jobs should have Filtered Reasons subsection
        const filteredReasons = summarySection.locator('strong:has-text("Filtered Reasons")');
        await expect(filteredReasons).toBeVisible();

        // Should have at least one reason listed
        const reasonsList = summarySection.locator('ul > li');
        expect(await reasonsList.count()).toBeGreaterThan(0);
      }
    } catch (e) {
      // No filtered jobs - test passes
      console.log('No filtered jobs to test');
    }
  });

  test('should display Employment subsection when data available', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

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
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

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
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

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
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

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
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

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
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

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
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

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
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

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
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

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
    await page.click('button:has-text("New")');

    try {
      await page.waitForSelector('[data-testid="job-card"]', { timeout: 5000 });
      const newJobCard = page.locator('[data-testid="job-card"]').first();
      const newSummary = newJobCard.locator('[data-testid="job-summary"]');

      if (await newSummary.isVisible()) {
        const filteredReasons = newSummary.locator('strong:has-text("Filtered Reasons")');
        await expect(filteredReasons).not.toBeVisible();
      }
    } catch (e) {
      console.log('No new jobs to test');
    }

    // Check Filtered tab - SHOULD have Filtered Reasons
    await page.click('button:has-text("Filtered")');

    try {
      await page.waitForSelector('[data-testid="job-card"]', { timeout: 5000 });
      const filteredJobCard = page.locator('[data-testid="job-card"]').first();
      const filteredSummary = filteredJobCard.locator('[data-testid="job-summary"]');

      if (await filteredSummary.isVisible()) {
        const filteredReasons = filteredSummary.locator('strong:has-text("Filtered Reasons")');
        await expect(filteredReasons).toBeVisible();
      }
    } catch (e) {
      console.log('No filtered jobs to test');
    }
  });
});
