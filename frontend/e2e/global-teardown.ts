import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Global teardown for Playwright tests
 * Cleans up backend server and other test resources
 * ONLY if global-setup started them
 */
async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');

  // Check if we started the services (if not, leave them running!)
  const shouldCleanup = process.env.E2E_STARTED_SERVICES === 'true';

  if (!shouldCleanup) {
    console.log('✅ Services were already running - leaving them active');
    console.log('   (Backend and frontend will continue running after tests)');
    return;
  }

  console.log('🛑 Stopping services that were started by tests...');

  try {
    // Kill backend server by port
    console.log('🛑 Stopping backend server on port 8080...');
    try {
      // Find process using port 8080 and kill it
      await execAsync('lsof -ti:8080 | xargs kill -9 2>/dev/null || true');
      console.log('✅ Backend server stopped (port 8080)');
    } catch (error) {
      // Port not in use, that's fine
      console.log('✅ No backend server found on port 8080');
    }

    // Kill any remaining jobhunter-backend processes
    console.log('🛑 Stopping any remaining backend processes...');
    try {
      await execAsync('pkill -f "jobhunter-backend" 2>/dev/null || true');
      await execAsync('pkill -f "cargo run" 2>/dev/null || true');
      console.log('✅ Backend processes cleaned up');
    } catch (error) {
      // No processes found, that's fine
      console.log('✅ No backend processes found');
    }

    // Kill any React dev servers (frontend)
    console.log('🛑 Stopping any remaining frontend servers...');
    try {
      await execAsync('pkill -f "react-scripts" 2>/dev/null || true');
      console.log('✅ Frontend dev servers stopped');
    } catch (error) {
      // No processes found, that's fine
      console.log('✅ No frontend dev servers found');
    }

    console.log('✅ Test environment cleanup complete');
  } catch (error) {
    console.error('⚠️  Error during cleanup:', error);
    // Don't throw - we want cleanup to be best-effort
  }
}

export default globalTeardown;
