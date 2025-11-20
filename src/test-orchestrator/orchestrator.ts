/**
 * Comprehensive Test Orchestrator
 *
 * Coordinates backend (Cargo), frontend (Jest), and E2E (Playwright) test suites
 * with real-time progress tracking, structured output, and desktop notifications.
 */

import { spawn, ChildProcess } from 'child_process';
import { writeFileSync } from 'fs';
import * as path from 'path';
import { TestResult, TestProgress, ComprehensiveTestReport } from './types';
import { JestParser } from './reporters/jest-parser';
import { PlaywrightParser } from './reporters/playwright-parser';
import { CargoParser } from './reporters/cargo-parser';

export class TestOrchestrator {
  private progress: Map<string, TestProgress> = new Map();
  private results: Map<string, TestResult> = new Map();
  private startTime: Date = new Date();

  /**
   * Run all test suites concurrently
   */
  async runComprehensive(): Promise<ComprehensiveTestReport> {
    console.log('🚀 Comprehensive Test Orchestrator');
    console.log('==================================\n');

    this.startTime = new Date();

    // Initialize progress tracking
    this.initializeProgress();

    try {
      // Run all test suites concurrently
      const [backendResult, frontendResult, e2eResult] = await Promise.all([
        this.runBackendTests(),
        this.runFrontendTests(),
        this.runE2ETests()
      ]);

      // Store results
      this.results.set('backend', backendResult);
      this.results.set('frontend', frontendResult);
      this.results.set('e2e', e2eResult);

      // Generate comprehensive report
      const report = this.generateReport();

      // Display summary
      this.displaySummary(report);

      // Send notification
      await this.sendNotification(report);

      return report;
    } catch (error) {
      console.error('❌ Test orchestrator failed:', error);
      throw error;
    }
  }

  /**
   * Initialize progress tracking for all suites
   */
  private initializeProgress(): void {
    this.progress.set('backend', {
      suite: 'backend',
      status: 'pending',
      testsRun: 0,
      testsTotal: 0
    });

    this.progress.set('frontend', {
      suite: 'frontend',
      status: 'pending',
      testsRun: 0,
      testsTotal: 0
    });

    this.progress.set('e2e', {
      suite: 'e2e',
      status: 'pending',
      testsRun: 0,
      testsTotal: 0
    });
  }

  /**
   * Run backend tests (Cargo)
   */
  private async runBackendTests(): Promise<TestResult> {
    return new Promise((resolve, reject) => {
      console.log('🦀 Running backend tests (Cargo)...');
      this.updateProgress('backend', { status: 'running' });

      const startTime = new Date();
      const child = spawn('cargo', ['test', '--', '--nocapture'], {
        cwd: path.join(__dirname, '../../backend'),
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        // Show test progress
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.includes('test ') && line.includes('...')) {
            const match = line.match(/test ([\w:]+)/);
            if (match) {
              this.updateProgress('backend', { currentTest: match[1] });
            }
          }
        }
      });

      child.on('close', (code) => {
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        try {
          // Parse cargo test output
          const result = CargoParser.parseRegularOutput(stderr);
          result.duration = duration; // Use actual duration
          result.startTime = startTime;
          result.endTime = endTime;

          console.log(`✅ Backend tests: ${result.passed} passed, ${result.failed} failed (${(duration/1000).toFixed(1)}s)`);

          this.updateProgress('backend', { status: 'completed' });
          resolve(result);
        } catch (err) {
          this.updateProgress('backend', { status: 'failed' });
          reject(new Error(`Failed to parse backend test output: ${err}`));
        }
      });

      child.on('error', (err) => {
        this.updateProgress('backend', { status: 'failed' });
        reject(err);
      });
    });
  }

  /**
   * Run frontend tests (Jest)
   */
  private async runFrontendTests(): Promise<TestResult> {
    return new Promise((resolve, reject) => {
      console.log('📘 Running frontend tests (Jest)...');
      this.updateProgress('frontend', { status: 'running' });

      const startTime = new Date();
      const child = spawn('npm', ['test', '--', '--json'], {
        cwd: path.join(__dirname, '../../frontend'),
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        // Show test progress
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.includes('PASS') || line.includes('FAIL')) {
            const match = line.match(/(?:PASS|FAIL) (.+)/);
            if (match) {
              this.updateProgress('frontend', { currentTest: match[1] });
            }
          }
        }
      });

      child.on('close', (code) => {
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        try {
          // Extract and parse Jest JSON output
          const jsonLine = JestParser.extractJSON(stdout);
          const result = JestParser.parse(jsonLine);
          result.duration = duration; // Use actual duration
          result.startTime = startTime;
          result.endTime = endTime;

          console.log(`✅ Frontend tests: ${result.passed} passed, ${result.failed} failed (${(duration/1000).toFixed(1)}s)`);

          this.updateProgress('frontend', { status: 'completed' });
          resolve(result);
        } catch (err) {
          this.updateProgress('frontend', { status: 'failed' });
          reject(new Error(`Failed to parse frontend test output: ${err}`));
        }
      });

      child.on('error', (err) => {
        this.updateProgress('frontend', { status: 'failed' });
        reject(err);
      });
    });
  }

  /**
   * Run E2E tests (Playwright)
   */
  private async runE2ETests(): Promise<TestResult> {
    return new Promise((resolve, reject) => {
      console.log('🎭 Running E2E tests (Playwright)...');
      this.updateProgress('e2e', { status: 'running' });

      const startTime = new Date();
      const jsonOutputPath = path.join(__dirname, '../../frontend/test-results/playwright-results.json');

      const child = spawn(
        'npx',
        ['playwright', 'test', `--reporter=json,list`, `--output=${jsonOutputPath}`],
        {
          cwd: path.join(__dirname, '../../frontend'),
          stdio: ['inherit', 'pipe', 'pipe'],
          env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: 'playwright-results.json' }
        }
      );

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        // Show test progress
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.includes('[chromium]') || line.includes('›')) {
            this.updateProgress('e2e', { currentTest: line.trim() });
          }
        }
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        try {
          // Try to parse JSON output file
          const result = PlaywrightParser.parseFile(jsonOutputPath);
          result.duration = duration; // Use actual duration
          result.startTime = startTime;
          result.endTime = endTime;

          console.log(`✅ E2E tests: ${result.passed} passed, ${result.failed} failed (${(duration/1000).toFixed(1)}s)`);

          this.updateProgress('e2e', { status: 'completed' });
          resolve(result);
        } catch (err) {
          // Fallback: create basic result from exit code
          const result: TestResult = {
            suite: 'e2e',
            passed: code === 0 ? 1 : 0,
            failed: code === 0 ? 0 : 1,
            skipped: 0,
            duration,
            startTime,
            endTime,
            success: code === 0
          };

          console.log(`⚠️  E2E tests completed (JSON parse failed): exit code ${code} (${(duration/1000).toFixed(1)}s)`);

          this.updateProgress('e2e', { status: 'completed' });
          resolve(result);
        }
      });

      child.on('error', (err) => {
        this.updateProgress('e2e', { status: 'failed' });
        reject(err);
      });
    });
  }

  /**
   * Update progress for a test suite
   */
  private updateProgress(suite: string, update: Partial<TestProgress>): void {
    const current = this.progress.get(suite);
    if (current) {
      this.progress.set(suite, { ...current, ...update });
    }
  }

  /**
   * Generate comprehensive report
   */
  private generateReport(): ComprehensiveTestReport {
    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();

    const backend = this.results.get('backend')!;
    const frontend = this.results.get('frontend')!;
    const e2e = this.results.get('e2e')!;

    const totalPassed = backend.passed + frontend.passed + e2e.passed;
    const totalFailed = backend.failed + frontend.failed + e2e.failed;
    const totalSkipped = backend.skipped + frontend.skipped + e2e.skipped;
    const overallSuccess = backend.success && frontend.success && e2e.success;

    return {
      startTime: this.startTime,
      endTime,
      duration,
      results: { backend, frontend, e2e },
      summary: {
        totalPassed,
        totalFailed,
        totalSkipped,
        overallSuccess
      }
    };
  }

  /**
   * Display summary to console
   */
  private displaySummary(report: ComprehensiveTestReport): void {
    console.log('\n📊 Comprehensive Test Summary');
    console.log('=============================');
    console.log(`Total Duration: ${(report.duration / 1000).toFixed(1)}s`);
    console.log(`\nBackend:  ${report.results.backend.passed} passed, ${report.results.backend.failed} failed, ${report.results.backend.skipped} skipped`);
    console.log(`Frontend: ${report.results.frontend.passed} passed, ${report.results.frontend.failed} failed, ${report.results.frontend.skipped} skipped`);
    console.log(`E2E:      ${report.results.e2e.passed} passed, ${report.results.e2e.failed} failed, ${report.results.e2e.skipped} skipped`);
    console.log(`\nTotal:    ${report.summary.totalPassed} passed, ${report.summary.totalFailed} failed, ${report.summary.totalSkipped} skipped`);
    console.log(`Status:   ${report.summary.overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}\n`);

    // Write report to file
    try {
      const reportPath = path.join(__dirname, '../../test-results/comprehensive-report.json');
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Report saved to: ${reportPath}`);
    } catch (err) {
      console.warn('⚠️  Failed to write report file:', err);
    }
  }

  /**
   * Send desktop notification (macOS)
   */
  private async sendNotification(report: ComprehensiveTestReport): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('\n🔔 Sending desktop notification...');

      const message = [
        'Comprehensive tests completed!',
        '',
        `✅ Passed: ${report.summary.totalPassed}`,
        `❌ Failed: ${report.summary.totalFailed}`,
        `⏭️  Skipped: ${report.summary.totalSkipped}`,
        '',
        `Duration: ${(report.duration / 1000).toFixed(1)}s`,
        `Status: ${report.summary.overallSuccess ? 'SUCCESS' : 'FAILED'}`
      ].join('\\n');

      // Play sound first
      const soundChild = spawn('afplay', ['/System/Library/Sounds/Glass.aiff']);

      soundChild.on('close', () => {
        // Then show dialog
        const dialogChild = spawn('osascript', [
          '-e',
          `display dialog "${message}" with title "Test Orchestrator" buttons {"OK"} default button "OK" with icon note`
        ]);

        dialogChild.on('close', () => {
          console.log('✅ Notification sent!\n');
          resolve();
        });
        dialogChild.on('error', reject);
      });

      soundChild.on('error', reject);
    });
  }
}
