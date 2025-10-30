import { test, expect } from '@playwright/test';
import { shouldRunTest } from '../test-config';

// Conditionally skip entire file if disabled in test-config.ts
// This will NOT show skip messages in test output
test.skip(!shouldRunTest('extraction-method-badge-test'), 'Test suite disabled in test-config.ts');

/**
 * Test to verify the Expert Systems Architect job shows LLM badge after HTML preprocessing fix
 * This test verifies ISSUE-001 is resolved
 */

test.describe('Extraction Method Badge - Expert Systems Architect', () => {
  test('should display blue LLM badge for Expert Systems Architect job', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Click on "All" tab to see all jobs
    await page.click('button:has-text("All")');

    // Wait for jobs to load
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    // Find the Expert Systems Architect job card
    const jobCards = page.locator('[data-testid="job-card"]');
    const count = await jobCards.count();

    console.log(`Found ${count} job cards`);

    let foundJob = false;
    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const titleElement = card.locator('[data-testid="job-title"]');
      const title = await titleElement.textContent();

      console.log(`Card ${i}: ${title}`);

      if (title?.includes('Expert Systems Architect')) {
        console.log('Found Expert Systems Architect job!');
        foundJob = true;

        // Find all badge-like spans within this card
        const badges = card.locator('span').filter({
          has: page.locator('text=/LLM|REGEX/i')
        });

        const badgeCount = await badges.count();
        console.log(`Found ${badgeCount} extraction method badges`);

        if (badgeCount > 0) {
          const badge = badges.first();
          const badgeText = await badge.textContent();
          const bgColor = await badge.evaluate(el => window.getComputedStyle(el).backgroundColor);
          const textColor = await badge.evaluate(el => window.getComputedStyle(el).color);

          console.log(`Badge text: ${badgeText}`);
          console.log(`Badge bg color: ${bgColor}`);
          console.log(`Badge text color: ${textColor}`);

          // Verify it shows "LLM" (not "REGEX")
          expect(badgeText).toContain('LLM');

          // Verify blue styling (LLM badge color)
          // Blue background: #dbeafe = rgb(219, 234, 254)
          // Blue text: #1e40af = rgb(30, 64, 175)
          expect(bgColor).toBe('rgb(219, 234, 254)');
          expect(textColor).toBe('rgb(30, 64, 175)');
        } else {
          // Try alternate method - find by text content
          const allSpans = card.locator('span');
          const spanCount = await allSpans.count();
          console.log(`Found ${spanCount} total spans in card`);

          for (let j = 0; j < spanCount; j++) {
            const span = allSpans.nth(j);
            const text = await span.textContent();
            if (text === 'LLM' || text === 'REGEX') {
              console.log(`Found extraction method badge with text: ${text}`);
              const bgColor = await span.evaluate(el => window.getComputedStyle(el).backgroundColor);
              console.log(`Background color: ${bgColor}`);

              expect(text).toBe('LLM');
              expect(bgColor).toBe('rgb(219, 234, 254)');
            }
          }
        }

        break;
      }
    }

    expect(foundJob).toBeTruthy();
  });

  test('should verify job data via API', async ({ request }) => {
    // First, verify the API returns the correct extraction method
    const response = await request.get('http://localhost:8080/api/jobs/94558e12-59db-4751-9556-f36edf9f6260');
    expect(response.ok()).toBeTruthy();

    const job = await response.json();
    console.log('Job extraction_method:', job.extraction_method);
    console.log('Job title:', job.title);
    console.log('Job company:', job.raw_data?.company);

    // Verify extraction method is 'llm' not 'regex'
    expect(job.extraction_method).toBe('llm');
    expect(job.title).toBe('Expert Systems Architect');
    expect(job.raw_data?.company).toBe('OMH Systems');
  });
});
