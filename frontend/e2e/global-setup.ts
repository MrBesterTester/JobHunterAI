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
  console.log('🌱 Seeding test data into jobhunter_dev database...');

  try {
    // Run the seed script
    const { stdout, stderr } = await execAsync('./helper-scripts/seed-test-data.sh', {
      cwd: process.cwd().replace('/frontend', '')
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

  // Switch to dev database for testing
  console.log('🔄 Switching to dev database (jobhunter_dev)...');
  try {
    const projectRoot = process.cwd().replace('/frontend', '');
    await execAsync('./switch-to-dev.sh', { cwd: projectRoot });
    console.log('✅ Switched to jobhunter_dev database');
  } catch (error: any) {
    console.error('❌ Failed to switch database:', error.message);
    console.warn('⚠️  Continuing with current database (tests may use wrong data)');
  }

  // Check if backend is already running
  try {
    const response = await fetch('http://localhost:8080/api/jobs');
    if (response.ok) {
      console.log('✅ Backend already running on port 8080');
      console.warn('⚠️  Note: Backend may be using wrong database. Restart recommended.');

      // Mark that we did NOT start the backend (so teardown won't kill it)
      process.env.E2E_STARTED_SERVICES = 'false';

      // Seed test data before running tests
      await seedTestData();

      // Calculate scores for all jobs to prevent 404 errors in E2E tests
      await calculateAllJobScores();
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

    // Seed test data before running tests
    await seedTestData();

    // Calculate scores for all jobs to prevent 404 errors in E2E tests
    await calculateAllJobScores();

    console.log('✅ Test environment setup complete');
  } catch (error) {
    console.error('❌ Failed to start backend:', error);
    throw error;
  }
}

export default globalSetup;
