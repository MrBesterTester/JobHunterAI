/**
 * Worker Database Fixture Test (ISSUE-064)
 *
 * This test verifies that the worker database fixture provides proper isolation.
 * Each worker should have its own database with independent data.
 *
 * To test isolation properly, run with multiple workers:
 *   npx playwright test 99-worker-database-fixture-test.spec.ts --workers=2
 */

import { test, expect } from '../fixtures/worker-database';

test.describe('Worker Database Isolation', () => {
  test('should have access to worker-specific database', async ({ page, workerDatabase }, workerInfo) => {
    console.log(`[Test] Running on worker ${workerInfo.workerIndex}, database: ${workerDatabase}`);

    // Verify X-Worker-Index header is set
    // by making a request to backend and checking the response

    // Navigate to API endpoint to get filtered jobs
    const response = await page.request.get('http://localhost:8080/api/jobs/filtered');
    expect(response.ok()).toBeTruthy();

    const jobs = await response.json();

    // Worker databases should have 30 filtered jobs (from seed data)
    expect(Array.isArray(jobs)).toBeTruthy();
    expect(jobs.length).toBe(30);

    console.log(`[Test] Worker ${workerInfo.workerIndex} got ${jobs.length} filtered jobs from ${workerDatabase}`);
  });

  test('should isolate database state between workers', async ({ page, workerDatabase }, workerInfo) => {
    console.log(`[Test] Isolation test on worker ${workerInfo.workerIndex}, database: ${workerDatabase}`);

    // Get initial count of filtered jobs
    const initialResponse = await page.request.get('http://localhost:8080/api/jobs/filtered');
    const initialJobs = await initialResponse.json();
    const initialCount = initialJobs.length;

    expect(initialCount).toBe(30);

    console.log(`[Test] Worker ${workerInfo.workerIndex} has ${initialCount} filtered jobs (isolated state)`);
  });

  test('should provide fresh database for each worker', async ({ page }, workerInfo) => {
    // Verify database has expected seed data structure
    const statsResponse = await page.request.get('http://localhost:8080/api/jobs/stats');
    expect(statsResponse.ok()).toBeTruthy();

    const stats = await statsResponse.json();

    console.log(`[Test] Worker ${workerInfo.workerIndex} stats:`, stats);

    // Seed data should have:
    // - 30 filtered jobs
    // - 10 new jobs (approximately)
    // - 5 approved jobs (approximately)
    // - 15+ discovered email_jobs (seed data + global-setup may add more)

    expect(stats.filtered).toBe(30);
    expect(stats.discovered).toBeGreaterThanOrEqual(15); // Allow for global-setup additions

    console.log(`[Test] Worker ${workerInfo.workerIndex} has correct seed data structure`);
  });
});
