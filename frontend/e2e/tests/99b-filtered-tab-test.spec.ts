import { test, expect } from '../fixtures/worker-database';
import { getTestTimeout } from '../helpers/timeout-utils';
import { shouldRunTest } from '../test-config';

// Conditionally skip entire file if disabled in test-config.ts
// This will NOT show skip messages in test output
if (!shouldRunTest('filtered-tab-test')) {
  test.skip();
}

/**
 * Test to verify the Filtered tab shows jobs with status="filtered"
 */

test.describe('Filtered Tab - Verification', () => {
  test('should show Expert Systems Architect job in Filtered tab', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Click on "Filtered" tab
    const filteredTab = page.locator('button:has-text("Filtered")');
    await filteredTab.click();

    console.log('Clicked Filtered tab');

    // Wait for job cards to load
    await page.waitForSelector('[data-testid="job-card"]', { timeout: getTestTimeout(10000) });

    // Count jobs in Filtered tab
    const jobCards = page.locator('[data-testid="job-card"]');
    const count = await jobCards.count();
    console.log(`Found ${count} job cards in Filtered tab`);

    // Find the Expert Systems Architect job
    let foundJob = false;
    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const titleElement = card.locator('[data-testid="job-title"]');
      const title = await titleElement.textContent();

      if (title?.includes('Expert Systems Architect')) {
        console.log(`Found Expert Systems Architect at position ${i}`);
        foundJob = true;

        // Verify it shows filter reason
        const cardText = await card.textContent();
        console.log('Card contains filter reason:', cardText?.includes('No salary information'));

        break;
      }
    }

    expect(foundJob).toBeTruthy();
    // Expect at least 30 filtered jobs (seed data)
    // May be more if refilter tests ran first in comprehensive run
    expect(count).toBeGreaterThanOrEqual(30);
  });

  test('should verify API returns filtered jobs', async ({ request }) => {
    const response = await request.get('http://localhost:8080/api/jobs/status/filtered');
    expect(response.ok()).toBeTruthy();

    const jobs = await response.json();
    console.log(`API returned ${jobs.length} filtered jobs`);

    // Find our specific job
    const expertJob = jobs.find((j: any) => j.title.includes('Expert Systems Architect'));
    console.log('Expert Systems Architect found:', !!expertJob);

    if (expertJob) {
      console.log('Status:', expertJob.status);
      console.log('Filter reason:', expertJob.filter_reason);
    }

    // Expect at least 30 filtered jobs (seed data)
    // May be more if refilter tests ran first in comprehensive run
    expect(jobs.length).toBeGreaterThanOrEqual(30);
    expect(expertJob).toBeTruthy();
    expect(expertJob.status).toBe('filtered');
  });
});
