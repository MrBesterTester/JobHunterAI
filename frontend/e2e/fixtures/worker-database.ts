/**
 * Worker Database Isolation Fixture (ISSUE-064)
 *
 * Provides per-worker database isolation for E2E tests.
 *
 * Each Playwright worker gets its own isolated PostgreSQL database:
 * - Worker 0 → jobhunter_test_worker_0
 * - Worker 1 → jobhunter_test_worker_1
 * - Worker 2 → jobhunter_test_worker_2
 * - Worker 3 → jobhunter_test_worker_3
 *
 * The fixture handles:
 * - Creating worker-specific database at worker startup
 * - Seeding database with test data
 * - Setting X-Worker-Index header on all requests
 * - Cleaning up database on worker shutdown
 *
 * Backend automatically routes requests to the correct database based on
 * the X-Worker-Index header.
 */

import { test as base, type Page } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

// Worker-scoped fixture type
type WorkerFixtures = {
  workerDatabase: string;
};

/**
 * Create a worker-specific database
 */
async function createWorkerDatabase(workerIndex: number): Promise<void> {
  const dbName = `jobhunter_test_worker_${workerIndex}`;

  console.log(`[Worker ${workerIndex}] Creating database: ${dbName}`);

  // Drop if exists (cleanup from previous failed runs)
  try {
    await execAsync(`dropdb -U sam ${dbName} 2>/dev/null || true`);
  } catch {
    // Ignore - database might not exist
  }

  // Create database with sam superuser (has CREATE EXTENSION privilege)
  await execAsync(`createdb -U sam ${dbName}`);

  // Grant privileges to jobhunter_user
  await execAsync(`psql -U sam -d ${dbName} -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO jobhunter_user"`);

  // Create uuid-ossp extension (requires superuser)
  await execAsync(`psql -U sam -d ${dbName} -c "CREATE EXTENSION IF NOT EXISTS \\"uuid-ossp\\""`);

  // Apply schema
  const schemaPath = path.join(__dirname, '../../../database/schema.sql');
  await execAsync(`psql -U jobhunter_user -d ${dbName} -f ${schemaPath} -q`);

  // Seed test data
  const seedPath = path.join(__dirname, '../../../database/seed_test_data.sql');
  await execAsync(`psql -U jobhunter_user -d ${dbName} -f ${seedPath} -q`);

  console.log(`[Worker ${workerIndex}] ✅ Database seeded: ${dbName}`);
}

/**
 * Seed MS Mail test data for a worker database
 */
async function seedMSMailData(workerIndex: number): Promise<void> {
  try {
    const response = await fetch('http://localhost:8080/api/test/seed-msmail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Worker-Index': workerIndex.toString()
      },
    });

    if (!response.ok) {
      throw new Error(`MS Mail seeding failed with status ${response.status}`);
    }

    const result = await response.json();
    console.log(`[Worker ${workerIndex}] ✅ Seeded ${result.created_count} MS Mail test email(s)`);
  } catch (error) {
    console.warn(`[Worker ${workerIndex}] ⚠️  Could not seed MS Mail data:`, error);
    // Don't throw - some tests may not need MS Mail data
  }
}

/**
 * Calculate job scores for a worker database
 */
async function calculateAllJobScores(workerIndex: number): Promise<void> {
  try {
    const response = await fetch('http://localhost:8080/api/jobs/calculate-all-scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Worker-Index': workerIndex.toString()
      },
    });

    if (!response.ok) {
      throw new Error(`Score calculation failed with status ${response.status}`);
    }

    const result = await response.json();
    console.log(`[Worker ${workerIndex}] ✅ Calculated scores for ${result.scored_count} jobs`);
  } catch (error) {
    console.warn(`[Worker ${workerIndex}] ⚠️  Could not calculate job scores:`, error);
    // Don't throw - some tests may not need pre-calculated scores
  }
}

/**
 * Initialize worker database with all test data
 */
async function initializeWorkerDatabase(workerIndex: number): Promise<void> {
  // Step 1: Create database and seed SQL data
  await createWorkerDatabase(workerIndex);

  // Step 2: Seed MS Mail test data via API
  await seedMSMailData(workerIndex);

  // Step 3: Calculate job scores via API
  await calculateAllJobScores(workerIndex);

  console.log(`[Worker ${workerIndex}] ✅ Worker database fully initialized`);
}

/**
 * Drop a worker-specific database
 */
async function dropWorkerDatabase(workerIndex: number): Promise<void> {
  const dbName = `jobhunter_test_worker_${workerIndex}`;

  console.log(`[Worker ${workerIndex}] Cleaning up database: ${dbName}`);

  try {
    await execAsync(`dropdb -U sam ${dbName} 2>/dev/null || true`);
    console.log(`[Worker ${workerIndex}] ✅ Database dropped: ${dbName}`);
  } catch (error) {
    console.warn(`[Worker ${workerIndex}] ⚠️  Could not drop ${dbName}:`, error);
  }
}

/**
 * Extend base test with worker database fixture and automatic X-Worker-Index header
 *
 * Usage in tests:
 * ```typescript
 * import { test, expect } from '../fixtures/worker-database';
 *
 * test('my test', async ({ page }) => {
 *   // page automatically has X-Worker-Index header set
 *   // Backend routes all requests to this worker's database
 *   await page.goto('http://localhost:3000');
 *   // ...
 * });
 * ```
 */
export const test = base.extend<{ page: Page }, WorkerFixtures>({
  // Worker-scoped fixture: runs once per worker, not per test
  workerDatabase: [async ({ }, use, workerInfo) => {
    const workerIndex = workerInfo.workerIndex;
    const dbName = `jobhunter_test_worker_${workerIndex}`;

    // Setup: Initialize worker database with all test data
    await initializeWorkerDatabase(workerIndex);

    // Provide database name to tests (though they rarely need it directly)
    await use(dbName);

    // Teardown: Drop worker database
    await dropWorkerDatabase(workerIndex);
  }, { scope: 'worker' }],

  // Override page fixture to automatically set X-Worker-Index header
  page: async ({ page }, use, workerInfo) => {
    // Set X-Worker-Index header on all requests from this page
    await page.setExtraHTTPHeaders({
      'X-Worker-Index': workerInfo.workerIndex.toString()
    });

    await use(page);
  },
});

// Re-export expect, types, and devices for convenience
export { expect, type Page, devices } from '@playwright/test';
