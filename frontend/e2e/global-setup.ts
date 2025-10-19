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

async function globalSetup() {
  console.log('🧪 Setting up test environment...');

  // Check if backend is already running
  try {
    const response = await fetch('http://localhost:8080/api/jobs');
    if (response.ok) {
      console.log('✅ Backend already running on port 8080');
      return;
    }
  } catch (error) {
    // Backend not running, need to start it
  }

  console.log('🦀 Starting backend server...');

  // Start backend server
  try {
    // Use the start-test-servers.sh script which handles backend startup
    await execAsync('cd frontend && ./start-test-servers.sh');

    // Wait for backend to be ready
    const isReady = await checkBackendHealth();
    if (!isReady) {
      throw new Error('Backend failed to start within 30 seconds');
    }

    console.log('✅ Test environment setup complete');
  } catch (error) {
    console.error('❌ Failed to start backend:', error);
    throw error;
  }
}

export default globalSetup;
