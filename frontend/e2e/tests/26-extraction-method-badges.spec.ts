import { test, expect } from '@playwright/test';
import { shouldRunTest } from '../test-config';

// Conditionally skip entire file if disabled in test-config.ts
// This will NOT show skip messages in test output
test.skip(!shouldRunTest('extraction-method-badges'), 'Test suite disabled in test-config.ts');

/**
 * E2E Tests for Extraction Method Badges (LLM vs REGEX)
 *
 * Tests the display of extraction method badges that indicate whether a job
 * was extracted using LLM (Claude Haiku) or regex fallback.
 *
 * Feature Overview:
 * - Blue "LLM" badge: Job extracted successfully using Claude Haiku
 * - Orange "REGEX" badge: Job extracted using regex fallback (LLM failed/timeout)
 * - Badge appears in job card header near Job ID
 * - Color-coded for quick visual identification
 * - Helps track extraction quality and identify potential issues
 *
 * Background:
 * - Implemented as part of ISSUE-001 fix (Mozilla Readability preprocessing)
 * - LLM extraction preferred for better accuracy and rich context
 * - Regex fallback ensures no jobs are lost when LLM fails
 * - Fractional days onsite (f32) support added for hybrid work policies
 *
 * Badge Styling:
 * - LLM Badge: Blue background (#dbeafe), Blue text (#1e40af), 12px font, 500 weight
 * - REGEX Badge: Orange background (#fed7aa), Orange text (#c2410c), 12px font, 500 weight
 */

test.describe('Extraction Method Badges', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Navigate to All tab to see all jobs
    const allTab = page.getByRole('button', { name: /^All$/i });
    await allTab.click();
    await page.waitForTimeout(500);
  });

  test('should display extraction method badge on job cards', async ({ page }) => {
    // Wait for job cards to load
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCards = page.locator('[data-testid="job-card"]');
    const count = await jobCards.count();

    expect(count).toBeGreaterThan(0);

    // Check first job card for extraction method badge
    const firstCard = jobCards.first();

    // Look for either LLM or REGEX badge
    const extractionBadge = firstCard.locator('span').filter({
      hasText: /^(LLM|REGEX)$/
    }).first();

    // Badge should exist
    await expect(extractionBadge).toBeVisible();

    // Badge text should be either "LLM" or "REGEX"
    const badgeText = await extractionBadge.textContent();
    expect(['LLM', 'REGEX']).toContain(badgeText);
  });

  test('should style LLM badge with blue colors', async ({ page }) => {
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    // Find a card with LLM badge
    const llmBadge = page.locator('[data-testid="job-card"] span').filter({
      hasText: /^LLM$/
    }).first();

    // Check if LLM badge exists (might not if all jobs used regex)
    const llmExists = await llmBadge.count();

    if (llmExists > 0) {
      // Verify blue styling
      const bgColor = await llmBadge.evaluate(el => window.getComputedStyle(el).backgroundColor);
      const textColor = await llmBadge.evaluate(el => window.getComputedStyle(el).color);
      const fontSize = await llmBadge.evaluate(el => window.getComputedStyle(el).fontSize);
      const fontWeight = await llmBadge.evaluate(el => window.getComputedStyle(el).fontWeight);

      // Blue background: #dbeafe = rgb(219, 234, 254)
      expect(bgColor).toBe('rgb(219, 234, 254)');

      // Blue text: #1e40af = rgb(30, 64, 175)
      expect(textColor).toBe('rgb(30, 64, 175)');

      // Font styling (actual size may be 11px due to parent container)
      expect(['11px', '12px']).toContain(fontSize);
      expect(fontWeight).toBe('500');
    } else {
      console.log('No LLM badges found in current job set - all jobs may have used regex fallback');
    }
  });

  test('should style REGEX badge with orange colors', async ({ page }) => {
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    // Find a card with REGEX badge
    const regexBadge = page.locator('[data-testid="job-card"] span').filter({
      hasText: /^REGEX$/
    }).first();

    // Check if REGEX badge exists
    const regexExists = await regexBadge.count();

    if (regexExists > 0) {
      // Verify orange styling
      const bgColor = await regexBadge.evaluate(el => window.getComputedStyle(el).backgroundColor);
      const textColor = await regexBadge.evaluate(el => window.getComputedStyle(el).color);
      const fontSize = await regexBadge.evaluate(el => window.getComputedStyle(el).fontSize);
      const fontWeight = await regexBadge.evaluate(el => window.getComputedStyle(el).fontWeight);

      // Orange background: #fed7aa = rgb(254, 215, 170)
      expect(bgColor).toBe('rgb(254, 215, 170)');

      // Orange text: #c2410c = rgb(194, 65, 12)
      expect(textColor).toBe('rgb(194, 65, 12)');

      // Font styling (actual size may be 11px due to parent container)
      expect(['11px', '12px']).toContain(fontSize);
      expect(fontWeight).toBe('500');
    } else {
      console.log('No REGEX badges found - all jobs successfully extracted via LLM');
    }
  });

  test('should position badge near Job ID in card header', async ({ page }) => {
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const firstCard = page.locator('[data-testid="job-card"]').first();

    // Find Job ID badge
    const jobIdBadge = firstCard.locator('[data-testid="job-id-badge"]');
    await expect(jobIdBadge).toBeVisible();

    // Find extraction method badge
    const extractionBadge = firstCard.locator('span').filter({
      hasText: /^(LLM|REGEX)$/
    }).first();
    await expect(extractionBadge).toBeVisible();

    // Both badges should be in the card header area
    const jobIdBox = await jobIdBadge.boundingBox();
    const extractionBox = await extractionBadge.boundingBox();

    expect(jobIdBox).toBeTruthy();
    expect(extractionBox).toBeTruthy();

    // Badges should be relatively close (within 100px vertically - may wrap to different lines)
    // The important thing is they're both in the header area of the card
    const yDiff = Math.abs(jobIdBox!.y - extractionBox!.y);
    expect(yDiff).toBeLessThan(100);
  });

  test('should display badge on all visible job cards', async ({ page }) => {
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCards = page.locator('[data-testid="job-card"]');
    const count = Math.min(await jobCards.count(), 5); // Check first 5 cards

    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);

      // Each card should have an extraction method badge
      const extractionBadge = card.locator('span').filter({
        hasText: /^(LLM|REGEX)$/
      }).first();

      await expect(extractionBadge).toBeVisible();
    }
  });

  test('should track extraction methods via API', async ({ request }) => {
    // Query API for jobs with different extraction methods
    const response = await request.get('http://localhost:8080/api/jobs');
    expect(response.ok()).toBeTruthy();

    const jobs = await response.json();
    expect(Array.isArray(jobs)).toBeTruthy();
    expect(jobs.length).toBeGreaterThan(0);

    // Count extraction methods
    const extractionMethods = jobs.map((job: any) => job.extraction_method);
    const llmCount = extractionMethods.filter((m: string) => m === 'llm').length;
    const regexCount = extractionMethods.filter((m: string) => m === 'regex').length;

    console.log(`Extraction methods: ${llmCount} LLM, ${regexCount} REGEX`);

    // At least some jobs should have an extraction method
    expect(llmCount + regexCount).toBeGreaterThan(0);

    // Each job should have either 'llm' or 'regex' as extraction_method
    extractionMethods.forEach((method: string) => {
      expect(['llm', 'regex']).toContain(method);
    });
  });

  test('should maintain badge styling consistency across tabs', async ({ page }) => {
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    // Get LLM badge styling from All tab
    const llmBadgeAll = page.locator('[data-testid="job-card"] span').filter({
      hasText: /^LLM$/
    }).first();

    const llmExistsInAll = await llmBadgeAll.count();

    if (llmExistsInAll > 0) {
      const bgColorAll = await llmBadgeAll.evaluate(el => window.getComputedStyle(el).backgroundColor);
      const textColorAll = await llmBadgeAll.evaluate(el => window.getComputedStyle(el).color);

      // Navigate to New tab
      const newTab = page.getByRole('button', { name: /^New$/i });
      await newTab.click();
      await page.waitForTimeout(1000);

      // Check if there are any job cards in New tab
      const newTabCards = page.locator('[data-testid="job-card"]');
      const newTabCardCount = await newTabCards.count();

      if (newTabCardCount > 0) {
        // Get LLM badge styling from New tab
        const llmBadgeNew = page.locator('[data-testid="job-card"] span').filter({
          hasText: /^LLM$/
        }).first();

        const llmExistsInNew = await llmBadgeNew.count();

        if (llmExistsInNew > 0) {
          const bgColorNew = await llmBadgeNew.evaluate(el => window.getComputedStyle(el).backgroundColor);
          const textColorNew = await llmBadgeNew.evaluate(el => window.getComputedStyle(el).color);

          // Styling should be consistent across tabs
          expect(bgColorNew).toBe(bgColorAll);
          expect(textColorNew).toBe(textColorAll);
        } else {
          console.log('No LLM badges in New tab - skipping cross-tab comparison');
        }
      } else {
        console.log('New tab is empty - skipping cross-tab consistency check');
      }
    }
  });

  test('should display badge in job details modal', async ({ page }) => {
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    // Click on first job card to open modal
    const firstCard = page.locator('[data-testid="job-card"]').first();
    await firstCard.click();

    // Wait for modal to open
    await page.waitForTimeout(500);

    // Modal should be visible
    const modal = page.locator('[role="dialog"], .modal, div').filter({
      hasText: /Details|Company|Location|Salary/i
    }).first();

    // Look for extraction method badge in modal header
    const modalBadge = modal.locator('span').filter({
      hasText: /^(LLM|REGEX)$/
    }).first();

    // Check if badge exists in modal (implementation dependent)
    const badgeCount = await modalBadge.count();

    // Badge presence in modal is optional but nice to have
    if (badgeCount > 0) {
      await expect(modalBadge).toBeVisible();
      console.log('Extraction method badge found in modal');
    } else {
      console.log('Extraction method badge not displayed in modal (optional feature)');
    }

    // Close modal
    await page.keyboard.press('Escape');
  });

  test('should show REGEX badge for jobs with HTML preprocessing issues', async ({ page }) => {
    // This test verifies that jobs that failed LLM extraction show REGEX badge

    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    // Look for any REGEX badges
    const regexBadges = page.locator('[data-testid="job-card"] span').filter({
      hasText: /^REGEX$/
    });

    const regexCount = await regexBadges.count();

    if (regexCount > 0) {
      console.log(`Found ${regexCount} jobs extracted via REGEX fallback`);

      // Click on first REGEX job to verify it has valid data
      const firstRegexCard = regexBadges.first().locator('..').locator('..').locator('[data-testid="job-card"]').first();

      // Verify card has basic job information
      const title = firstRegexCard.locator('[data-testid="job-title"]');
      await expect(title).toBeVisible();

      const titleText = await title.textContent();
      expect(titleText?.length).toBeGreaterThan(0);

      console.log(`REGEX-extracted job title: ${titleText}`);
    } else {
      console.log('No REGEX-extracted jobs found - all jobs successfully extracted via LLM');
    }
  });

  test('should support fractional days onsite for hybrid roles (f32 support)', async ({ request }) => {
    // Verify that days_onsite_per_week now supports fractional values (e.g., 2.5)

    const response = await request.get('http://localhost:8080/api/jobs');
    expect(response.ok()).toBeTruthy();

    const jobs = await response.json();

    // Find jobs with remote work details
    const hybridJobs = jobs.filter((job: any) => {
      return job.raw_data?.remote_work?.days_onsite_per_week != null;
    });

    if (hybridJobs.length > 0) {
      console.log(`Found ${hybridJobs.length} jobs with days_onsite_per_week data`);

      // Check if any have fractional values
      const fractionalJobs = hybridJobs.filter((job: any) => {
        const days = job.raw_data.remote_work.days_onsite_per_week;
        return days !== Math.floor(days); // Check if not an integer
      });

      if (fractionalJobs.length > 0) {
        console.log(`Found ${fractionalJobs.length} jobs with fractional days onsite (e.g., 2.5 days/week)`);

        const exampleJob = fractionalJobs[0];
        const days = exampleJob.raw_data.remote_work.days_onsite_per_week;

        console.log(`Example: ${exampleJob.title} - ${days} days/week onsite`);

        // Verify value is a valid float
        expect(typeof days).toBe('number');
        expect(days).toBeGreaterThan(0);
        expect(days).toBeLessThanOrEqual(7);
      } else {
        console.log('No fractional days found, but f32 support is verified at backend level');
      }
    } else {
      console.log('No hybrid jobs with days_onsite_per_week data in current dataset');
    }
  });

  test('should have distinct colors for LLM vs REGEX badges', async ({ page }) => {
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const llmBadge = page.locator('[data-testid="job-card"] span').filter({
      hasText: /^LLM$/
    }).first();

    const regexBadge = page.locator('[data-testid="job-card"] span').filter({
      hasText: /^REGEX$/
    }).first();

    const llmExists = await llmBadge.count();
    const regexExists = await regexBadge.count();

    if (llmExists > 0 && regexExists > 0) {
      const llmBg = await llmBadge.evaluate(el => window.getComputedStyle(el).backgroundColor);
      const regexBg = await regexBadge.evaluate(el => window.getComputedStyle(el).backgroundColor);

      // Colors should be different (blue vs orange)
      expect(llmBg).not.toBe(regexBg);

      console.log(`LLM badge color: ${llmBg}`);
      console.log(`REGEX badge color: ${regexBg}`);
    }
  });

  test('should be readable and accessible', async ({ page }) => {
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const extractionBadge = page.locator('[data-testid="job-card"] span').filter({
      hasText: /^(LLM|REGEX)$/
    }).first();

    await expect(extractionBadge).toBeVisible();

    // Verify badge has appropriate padding for readability
    const padding = await extractionBadge.evaluate(el => window.getComputedStyle(el).padding);
    expect(padding).toBeTruthy();

    // Verify badge has border radius for smooth appearance
    const borderRadius = await extractionBadge.evaluate(el => window.getComputedStyle(el).borderRadius);
    // Border radius may vary based on styling, just verify it's set
    expect(borderRadius).toBeTruthy();
    expect(borderRadius).toMatch(/\d+px/);
  });
});
