import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkBackendHealth(maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch('http://localhost:8080/api/jobs');
      if (response.ok) {
        console.log('✅ Backend health check passed');
        return true;
      }
    } catch (error) {
      // Backend not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

async function seedTestData(): Promise<void> {
  console.log('🌱 Seeding test data into current database...');

  try {
    // Run the seed script with --truncate to ensure clean state
    // Automatically answer 'yes' to truncate confirmation
    const { stdout, stderr } = await execAsync('echo "y" | ./helper-scripts/seed-test-data.sh --truncate', {
      cwd: process.cwd().replace('/frontend', ''),
      shell: '/bin/bash'
    });

    if (stderr && !stderr.includes('psql:')) {
      console.warn('Seed script warnings:', stderr);
    }

    console.log('✅ Test data seeding complete');
  } catch (error: any) {
    console.error('❌ Failed to seed test data:', error.message);
    // Don't throw - some tests may work with existing data
    console.warn('⚠️  Continuing with existing data (some tests may fail)');
  }
}

async function seedMSMailData(): Promise<void> {
  console.log('📧 Seeding Microsoft Mail test data...');

  try {
    const response = await fetch('http://localhost:8080/api/test/seed-msmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`MS Mail seeding failed with status ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Seeded ${result.created_count} MS Mail test email(s) in JobOps folder`);
  } catch (error) {
    console.error('❌ Failed to seed MS Mail test data:', error);
    // Don't throw - some tests may not need MS Mail data
    console.warn('⚠️  Continuing without MS Mail test data (email integration tests may fail)');
  }
}

async function calculateAllJobScores(): Promise<void> {
  console.log('📊 Calculating scores for all jobs...');

  try {
    const response = await fetch('http://localhost:8080/api/jobs/calculate-all-scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Score calculation failed with status ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Calculated scores for ${result.scored_count} jobs (${result.failed_count} failed)`);
  } catch (error) {
    console.error('❌ Failed to calculate job scores:', error);
    // Don't throw - some tests may not need scores, and this shouldn't block all tests
    console.warn('⚠️  Continuing without pre-calculated scores (some tests may fail)');
  }
}

async function globalSetup() {
  console.log('🧪 Setting up test environment...');

  // Detect and propagate COMPREHENSIVE_TESTS environment variable to worker processes
  // (ISSUE-056: Playwright workers don't inherit command-line env vars reliably)
  if (process.env.COMPREHENSIVE_TESTS) {
    console.log('✅ COMPREHENSIVE_TESTS detected - enabling extended timeouts (45s)');
    // Explicitly set in globalSetup to ensure worker processes inherit it
    process.env.COMPREHENSIVE_TESTS = 'true';
  } else {
    console.log('ℹ️  COMPREHENSIVE_TESTS not set - using default timeouts (10s)');
  }

  // ISSUE-064 Phase 4: Database seeding now handled by per-worker fixtures
  // Each Playwright worker creates and seeds its own isolated database:
  // - Worker 0 → jobhunter_test_worker_0
  // - Worker 1 → jobhunter_test_worker_1
  // - Worker 2 → jobhunter_test_worker_2
  // - Worker 3 → jobhunter_test_worker_3
  // See frontend/e2e/fixtures/worker-database.ts for implementation

  // Check if backend is already running
  try {
    const response = await fetch('http://localhost:8080/api/jobs');
    if (response.ok) {
      console.log('✅ Backend already running on port 8080');

      // Mark that we did NOT start the backend (so teardown won't kill it)
      process.env.E2E_STARTED_SERVICES = 'false';

      console.log('✅ Test environment setup complete (worker fixtures will handle database seeding)');
      return;
    }
  } catch (error) {
    // Backend not running, need to start it
  }

  // Mark that we ARE starting the backend (so teardown will kill it)
  process.env.E2E_STARTED_SERVICES = 'true';

  console.log('🦀 Starting backend server...');

  // Start backend server
  try {
    // Use the start-test-servers.sh script which handles backend startup
    // Note: This script is in the frontend directory
    await execAsync('./start-test-servers.sh', { cwd: process.cwd().includes('frontend') ? process.cwd() : `${process.cwd()}/frontend` });

    // Wait for backend to be ready
    const isReady = await checkBackendHealth();
    if (!isReady) {
      throw new Error('Backend failed to start within 30 seconds');
    }

    console.log('✅ Test environment setup complete (worker fixtures will handle database seeding)');
  } catch (error) {
    console.error('❌ Failed to start backend:', error);
    throw error;
  }
}

export default globalSetup;
