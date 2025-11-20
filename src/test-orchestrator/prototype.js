#!/usr/bin/env node
/**
 * Prototype Test Orchestrator (JavaScript version)
 *
 * Minimal proof-of-concept showing:
 * 1. Spawning test process with JSON output
 * 2. Capturing structured JSON results
 * 3. Desktop notification on completion
 */

const { spawn } = require('child_process');
const { writeFileSync, mkdirSync } = require('fs');
const path = require('path');

/**
 * Run Jest tests and capture JSON output
 */
async function runJestTests() {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    console.log('🧪 Running Jest tests with JSON output...');

    const child = spawn('npm', ['test', '--', '--json'], {
      cwd: path.join(__dirname, '../../frontend'),
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      // Show progress in real-time
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.includes('PASS') || line.includes('FAIL')) {
          console.log(line);
        }
      }
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;

      try {
        // Jest outputs JSON on the last line of stdout
        const lines = stdout.trim().split('\n');
        const jsonLine = lines[lines.length - 1];
        const result = JSON.parse(jsonLine);

        const testResult = {
          suite: 'frontend',
          passed: result.numPassedTests,
          failed: result.numFailedTests,
          duration,
          success: result.success
        };

        // Write detailed results to file
        try {
          mkdirSync(path.join(__dirname, '../../test-results'), { recursive: true });
        } catch (err) {
          // Directory may already exist
        }

        writeFileSync(
          path.join(__dirname, '../../test-results/jest-result.json'),
          JSON.stringify(result, null, 2)
        );

        console.log(`✅ Jest tests completed: ${testResult.passed} passed, ${testResult.failed} failed (${(duration/1000).toFixed(1)}s)`);

        resolve(testResult);
      } catch (err) {
        reject(new Error(`Failed to parse Jest JSON output: ${err.message}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Send desktop notification (macOS)
 */
async function sendNotification(message) {
  return new Promise((resolve, reject) => {
    // Play sound first
    const soundChild = spawn('afplay', ['/System/Library/Sounds/Glass.aiff']);

    soundChild.on('close', () => {
      // Then show dialog
      const dialogChild = spawn('osascript', [
        '-e',
        `display dialog "${message}" with title "Test Orchestrator" buttons {"OK"} default button "OK" with icon note`
      ]);

      dialogChild.on('close', () => resolve());
      dialogChild.on('error', reject);
    });

    soundChild.on('error', reject);
  });
}

/**
 * Main prototype execution
 */
async function main() {
  console.log('🚀 Test Orchestrator Prototype');
  console.log('=============================\n');

  const overallStart = Date.now();

  try {
    // Run Jest tests
    const jestResult = await runJestTests();

    const overallDuration = Date.now() - overallStart;

    // Show summary
    console.log('\n📊 Test Summary');
    console.log('===============');
    console.log(`Suite: ${jestResult.suite}`);
    console.log(`Passed: ${jestResult.passed}`);
    console.log(`Failed: ${jestResult.failed}`);
    console.log(`Duration: ${(jestResult.duration / 1000).toFixed(1)}s`);
    console.log(`Status: ${jestResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`\nTotal time: ${(overallDuration / 1000).toFixed(1)}s`);

    // Send notification
    const notifMessage = `Tests completed!\\n\\n${jestResult.passed} passed, ${jestResult.failed} failed\\n\\nDuration: ${(jestResult.duration / 1000).toFixed(1)}s`;

    console.log('\n🔔 Sending desktop notification...');
    await sendNotification(notifMessage);
    console.log('✅ Notification sent!');

    process.exit(jestResult.success ? 0 : 1);
  } catch (err) {
    console.error('❌ Test orchestrator failed:', err.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runJestTests, sendNotification };
