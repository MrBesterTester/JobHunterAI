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

  console.log(`[Worker ${workerIndex}] ✅ Database ready: ${dbName}`);
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
 * Extend base test with worker database fixture
 *
 * Usage in tests:
 * ```typescript
 * import { test, expect } from '../fixtures/worker-database';
 *
 * test('my test', async ({ page, workerDatabase }) => {
 *   // workerDatabase contains the database name
 *   // X-Worker-Index header is automatically set
 *   await page.goto('http://localhost:3000');
 *   // ...
 * });
 * ```
 */
export const test = base.extend<{}, WorkerFixtures>({
  // Worker-scoped fixture: runs once per worker, not per test
  workerDatabase: [async ({ }, use, workerInfo) => {
    const workerIndex = workerInfo.workerIndex;
    const dbName = `jobhunter_test_worker_${workerIndex}`;

    // Setup: Create and seed worker database
    await createWorkerDatabase(workerIndex);

    // Provide database name to tests (though they rarely need it directly)
    await use(dbName);

    // Teardown: Drop worker database
    await dropWorkerDatabase(workerIndex);
  }, { scope: 'worker' }],
});

/**
 * Extended page fixture that automatically sets X-Worker-Index header
 *
 * This ensures all requests from this page go to the correct worker database.
 */
export const testWithPage = test.extend<{ page: Page }>({
  page: async ({ page, workerDatabase }, use, workerInfo) => {
    // Set X-Worker-Index header on all requests from this page
    await page.setExtraHTTPHeaders({
      'X-Worker-Index': workerInfo.workerIndex.toString()
    });

    await use(page);
  },
});

// Re-export expect for convenience
export { expect } from '@playwright/test';
