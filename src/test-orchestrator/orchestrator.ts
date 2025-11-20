/**
 * Comprehensive Test Orchestrator
 *
 * Coordinates backend (Cargo), frontend (Jest), and E2E (Playwright) test suites
 * with real-time progress tracking, structured output, and desktop notifications.
 */

import { spawn, ChildProcess } from 'child_process';
import { writeFileSync } from 'fs';
import * as path from 'path';
import { TestResult, TestProgress, ComprehensiveTestReport, OrchestratorConfig } from './types';
import { JestParser } from './reporters/jest-parser';
import { PlaywrightParser } from './reporters/playwright-parser';
import { CargoParser } from './reporters/cargo-parser';

export class TestOrchestrator {
  private progress: Map<string, TestProgress> = new Map();
  private results: Map<string, TestResult> = new Map();
  private startTime: Date = new Date();
  private config: OrchestratorConfig;

  constructor(config?: Partial<OrchestratorConfig>) {
    // Defaults (comprehensive mode - all checks enabled)
    this.config = {
      runPreflight: true,
      runProcessCleanup: true,
      runGitCheck: true,
      runDatabaseCheck: true,
      runDatabasePrep: true,
      runOAuthCheck: true,
      runBuilds: true,
      runBackendBuild: true,
      runFrontendBuild: true,
      runE2ETypecheck: true,
      runTests: true,
      runBackendTests: true,
      runFrontendTests: true,
      runE2ETests: true,
      sendNotification: true,
      verbose: false,
      ...config
    };
  }

  /**
   * Run all test suites concurrently (with preflight + build phases first)
   */
  async runComprehensive(): Promise<ComprehensiveTestReport> {
    console.log('🚀 Comprehensive Test Orchestrator');
    console.log('==================================\n');

    if (this.config.verbose) {
      console.log('📋 Configuration:');
      console.log(JSON.stringify(this.config, null, 2));
      console.log('');
    }

    this.startTime = new Date();

    // Initialize progress tracking
    this.initializeProgress();

    try {
      // PREFLIGHT CHECKS (HARD requirements - abort if any fail)
      if (this.config.runPreflight) {
        console.log('\n✅ PREFLIGHT CHECKS');
        console.log('===================\n');

        await this.runPreflightChecks();

        console.log('\n✅ All preflight checks passed!\n');
      } else if (this.config.verbose) {
        console.log('⏭️  SKIPPING: Preflight checks\n');
      }

      // BUILD PHASE (Quality Gate - must pass before tests)
      if (this.config.runBuilds) {
        console.log('\n🏗️  BUILD PHASE (Quality Gate)');
        console.log('==============================\n');

        if (this.config.runBackendBuild) {
          await this.buildBackend();
        } else if (this.config.verbose) {
          console.log('⏭️  SKIPPING: Backend build\n');
        }

        if (this.config.runFrontendBuild) {
          await this.buildFrontend();
        } else if (this.config.verbose) {
          console.log('⏭️  SKIPPING: Frontend build\n');
        }

        if (this.config.runE2ETypecheck) {
          await this.typecheckE2E();
        } else if (this.config.verbose) {
          console.log('⏭️  SKIPPING: E2E typecheck\n');
        }

        console.log('\n✅ All builds passed!\n');
      } else if (this.config.verbose) {
        console.log('⏭️  SKIPPING: Build phase\n');
      }

      // START BACKEND SERVER (for E2E tests)
      if (this.config.runTests && this.config.runE2ETests) {
        console.log('\n🚀 STARTING BACKEND SERVER');
        console.log('===========================\n');
        await this.startBackend();
        console.log('\n✅ Backend server ready!\n');
      }

      // TEST PHASE - Run test suites (only those enabled in config)
      if (this.config.runTests) {
        console.log('\n🧪 TEST PHASE');
        console.log('=============\n');
        const testPromises: Promise<TestResult | null>[] = [
          this.config.runBackendTests ? this.runBackendTests() : Promise.resolve(null),
          this.config.runFrontendTests ? this.runFrontendTests() : Promise.resolve(null),
          this.config.runE2ETests ? this.runE2ETests() : Promise.resolve(null)
        ];

        const [backendResult, frontendResult, e2eResult] = await Promise.all(testPromises);

        // Store results (with defaults for skipped suites)
        if (backendResult) {
          this.results.set('backend', backendResult);
        } else {
          this.results.set('backend', this.createSkippedResult('backend'));
        }

        if (frontendResult) {
          this.results.set('frontend', frontendResult);
        } else {
          this.results.set('frontend', this.createSkippedResult('frontend'));
        }

        if (e2eResult) {
          this.results.set('e2e', e2eResult);
        } else {
          this.results.set('e2e', this.createSkippedResult('e2e'));
        }
      } else if (this.config.verbose) {
        console.log('⏭️  SKIPPING: All tests\n');
        // Create skipped results for all suites
        this.results.set('backend', this.createSkippedResult('backend'));
        this.results.set('frontend', this.createSkippedResult('frontend'));
        this.results.set('e2e', this.createSkippedResult('e2e'));
      }

      // Generate comprehensive report
      const report = this.generateReport();

      // Display summary
      this.displaySummary(report);

      // Send notification
      if (this.config.sendNotification) {
        await this.sendNotification(report);
      } else if (this.config.verbose) {
        console.log('⏭️  SKIPPING: Desktop notification\n');
      }

      return report;
    } catch (error) {
      console.error('❌ Test orchestrator failed:', error);
      throw error;
    }
  }

  /**
   * Create a skipped test result for a suite that was not run
   */
  private createSkippedResult(suite: 'backend' | 'frontend' | 'e2e'): TestResult {
    const now = new Date();
    return {
      suite,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      startTime: now,
      endTime: now,
      success: true
    };
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
   * Run all preflight checks (HARD requirements - abort if any fail)
   */
  private async runPreflightChecks(): Promise<void> {
    console.log('Running preflight checks...\n');

    // Run enabled preflight checks (all must pass)
    if (this.config.runProcessCleanup) {
      await this.checkProcessCleanup();
    } else if (this.config.verbose) {
      console.log('⏭️  SKIPPING: Process cleanup\n');
    }

    if (this.config.runGitCheck) {
      await this.checkGitStatus();
    } else if (this.config.verbose) {
      console.log('⏭️  SKIPPING: Git status check\n');
    }

    if (this.config.runDatabaseCheck) {
      await this.checkDatabaseSelection();
    } else if (this.config.verbose) {
      console.log('⏭️  SKIPPING: Database selection check\n');
    }

    if (this.config.runDatabasePrep) {
      await this.checkDatabaseState();
    } else if (this.config.verbose) {
      console.log('⏭️  SKIPPING: Database state preparation\n');
    }

    if (this.config.runOAuthCheck) {
      await this.checkOAuthExpiry();
    } else if (this.config.verbose) {
      console.log('⏭️  SKIPPING: OAuth token check\n');
    }
  }

  /**
   * Check process cleanup (stop servers, verify ports available)
   */
  private async checkProcessCleanup(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🧹 Checking process cleanup...');

      const stopScript = spawn('./helper-scripts/stop.sh', [], {
        cwd: path.join(__dirname, '../..'),
        stdio: 'inherit'
      });

      stopScript.on('close', (code) => {
        if (code !== 0) {
          console.error('❌ Process cleanup FAILED');
          reject(new Error('Process cleanup failed - servers still running or ports occupied'));
          return;
        }
        console.log('✅ Process cleanup passed\n');
        resolve();
      });

      stopScript.on('error', reject);
    });
  }

  /**
   * Check git status (no uncommitted changes)
   */
  private async checkGitStatus(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('📋 Checking git status...');

      const gitCheck = spawn('git', ['diff-index', '--quiet', 'HEAD', '--'], {
        cwd: path.join(__dirname, '../..'),
        stdio: 'pipe'
      });

      gitCheck.on('close', (code) => {
        if (code !== 0) {
          console.error('❌ Git status check FAILED');
          console.error('   Uncommitted changes detected');
          console.error('   Please commit or stash changes before running comprehensive tests');
          reject(new Error('Uncommitted git changes detected'));
          return;
        }
        console.log('✅ Git status clean\n');
        resolve();
      });

      gitCheck.on('error', reject);
    });
  }

  /**
   * Check database selection (must be jobhunter_personal)
   */
  private async checkDatabaseSelection(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🗄️  Checking database selection...');

      const { readFileSync } = require('fs');
      const envPath = path.join(__dirname, '../../backend/.env');

      try {
        const envContent = readFileSync(envPath, 'utf-8');
        const dbUrlMatch = envContent.match(/^DATABASE_URL=.*\/([^?\s]+)/m);

        if (!dbUrlMatch) {
          console.error('❌ Database selection check FAILED');
          console.error('   Could not parse DATABASE_URL from backend/.env');
          reject(new Error('Could not parse DATABASE_URL'));
          return;
        }

        const dbName = dbUrlMatch[1].trim();
        if (dbName !== 'jobhunter_personal') {
          console.error('❌ Database selection check FAILED');
          console.error(`   Expected: jobhunter_personal`);
          console.error(`   Found: ${dbName}`);
          console.error('   Run: ./helper-scripts/switch-to-personal.sh');
          reject(new Error(`Wrong database: ${dbName}`));
          return;
        }

        console.log('✅ Database: jobhunter_personal\n');
        resolve();
      } catch (err) {
        reject(new Error(`Failed to check database selection: ${err}`));
      }
    });
  }

  /**
   * Check database state (backup + clear + seed)
   */
  private async checkDatabaseState(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('💾 Preparing database state (backup + clear + seed)...');

      // Run the comprehensive test script's database state check
      // This includes: backup, clear, seed with test fixtures and OAuth tokens
      const dbStateScript = spawn('bash', ['-c', `
        set -e
        # Backup
        BACKUP_DIR="/tmp/jobhunter_backups"
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        BACKUP_FILE="$BACKUP_DIR/jobhunter_personal_\${TIMESTAMP}.sql"
        mkdir -p "$BACKUP_DIR"

        echo "  Creating backup: $BACKUP_FILE"
        pg_dump -U jobhunter_user -d jobhunter_personal > "$BACKUP_FILE" 2>&1
        echo "$BACKUP_FILE" > /tmp/jobhunter_last_backup.txt

        # Clean up old backups (keep last 5)
        ls -t "$BACKUP_DIR"/*.sql 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true

        # Clear database
        echo "  Clearing database..."
        ./helper-scripts/clear-database.sh

        # Seed database
        echo "  Seeding database..."
        ./helper-scripts/seed-database.sh
      `], {
        cwd: path.join(__dirname, '../..'),
        stdio: 'inherit'
      });

      dbStateScript.on('close', (code) => {
        if (code !== 0) {
          console.error('❌ Database state preparation FAILED');
          reject(new Error('Database backup/clear/seed failed'));
          return;
        }
        console.log('✅ Database state prepared\n');
        resolve();
      });

      dbStateScript.on('error', reject);
    });
  }

  /**
   * Check OAuth token expiry (with auto-refresh if expired)
   */
  private async checkOAuthExpiry(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔐 Checking OAuth token expiry...');

      const oauthScript = spawn('./helper-scripts/refresh-oauth-tokens.sh', [], {
        cwd: path.join(__dirname, '../..'),
        stdio: 'inherit'
      });

      oauthScript.on('close', (code) => {
        if (code !== 0) {
          console.error('❌ OAuth token validation FAILED');
          console.error('   Tokens are expired or invalid');
          console.error('   Run: ./helper-scripts/setup-test-oauth.sh');
          reject(new Error('OAuth tokens expired or invalid'));
          return;
        }
        console.log('✅ OAuth tokens valid\n');
        resolve();
      });

      oauthScript.on('error', reject);
    });
  }

  /**
   * Build backend (cargo clean + cargo build)
   * Quality Gate: Zero warnings required
   */
  private async buildBackend(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🦀 Building backend (Cargo)...');
      const startTime = new Date();

      // Step 1: cargo clean
      console.log('  Running cargo clean...');
      const cleanChild = spawn('cargo', ['clean'], {
        cwd: path.join(__dirname, '../../backend'),
        stdio: 'inherit'
      });

      cleanChild.on('close', (cleanCode) => {
        if (cleanCode !== 0) {
          reject(new Error('cargo clean failed'));
          return;
        }

        // Step 2: cargo build
        console.log('  Running cargo build (this may take 1-2 minutes)...');
        const buildChild = spawn('cargo', ['build'], {
          cwd: path.join(__dirname, '../../backend'),
          stdio: ['inherit', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        let crateCount = 0;

        buildChild.stdout?.on('data', (data) => {
          stdout += data.toString();
          process.stdout.write(data); // Show progress
        });

        buildChild.stderr?.on('data', (data) => {
          stderr += data.toString();
          // Count crates being compiled and show progress
          const lines = data.toString().split('\n');
          for (const line of lines) {
            if (line.includes('Compiling')) {
              crateCount++;
              // Show progress every 10 crates
              if (crateCount % 10 === 0) {
                process.stdout.write(`  Compiling: ${crateCount} crates processed...\r`);
              }
            }
          }
          process.stderr.write(data); // Show progress
        });

        buildChild.on('close', (code) => {
          const endTime = new Date();
          const duration = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(1);

          // Clear the crate counter progress line
          process.stdout.write('\r\x1b[K');

          const combinedOutput = stdout + stderr;

          // Check for warnings (quality gate)
          if (combinedOutput.toLowerCase().includes('warning')) {
            console.error(`\n❌ Backend build FAILED: Contains warnings (zero-warning requirement)`);
            reject(new Error('Backend build has warnings (quality gate)'));
            return;
          }

          if (code !== 0) {
            console.error(`\n❌ Backend build FAILED with exit code ${code}`);
            reject(new Error(`Backend build failed with exit code ${code}`));
            return;
          }

          console.log(`✅ Backend build PASSED (${duration}s)\n`);
          resolve();
        });

        buildChild.on('error', reject);
      });

      cleanChild.on('error', reject);
    });
  }

  /**
   * Build frontend (npm run build)
   * Quality Gate: Zero warnings required
   */
  private async buildFrontend(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('📘 Building frontend (React/TypeScript/RSBuild)...');
      console.log('  Running npm run build (typecheck + rsbuild)...');
      const startTime = new Date();

      const buildChild = spawn('npm', ['run', 'build'], {
        cwd: path.join(__dirname, '../../frontend'),
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      buildChild.stdout?.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data); // Show progress
      });

      buildChild.stderr?.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data); // Show progress
      });

      buildChild.on('close', (code) => {
        const endTime = new Date();
        const duration = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(1);

        const combinedOutput = stdout + stderr;

        // Check for warnings (quality gate)
        if (combinedOutput.toLowerCase().includes('warning')) {
          console.error(`\n❌ Frontend build FAILED: Contains warnings (zero-warning requirement)`);
          reject(new Error('Frontend build has warnings (quality gate)'));
          return;
        }

        if (code !== 0) {
          console.error(`\n❌ Frontend build FAILED with exit code ${code}`);
          reject(new Error(`Frontend build failed with exit code ${code}`));
          return;
        }

        console.log(`✅ Frontend build PASSED (${duration}s)\n`);
        resolve();
      });

      buildChild.on('error', reject);
    });
  }

  /**
   * Typecheck E2E tests (npm run typecheck:e2e)
   * Quality Gate: Zero TypeScript errors required
   */
  private async typecheckE2E(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🎭 Type-checking E2E tests (TypeScript)...');
      console.log('  Running tsc --noEmit on E2E test files...');
      const startTime = new Date();

      const typecheckChild = spawn('npm', ['run', 'typecheck:e2e'], {
        cwd: path.join(__dirname, '../../frontend'),
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      typecheckChild.stdout?.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data); // Show progress
      });

      typecheckChild.stderr?.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data); // Show progress
      });

      typecheckChild.on('close', (code) => {
        const endTime = new Date();
        const duration = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(1);

        if (code !== 0) {
          const combinedOutput = stdout + stderr;
          // Extract TypeScript errors (first 20 lines)
          const tsErrors = combinedOutput.match(/error TS\d+:.*/g);
          if (tsErrors) {
            console.error(`\n❌ E2E type-checking FAILED: TypeScript errors found`);
            console.error('First 20 errors:');
            tsErrors.slice(0, 20).forEach(err => console.error(`  ${err}`));
          } else {
            console.error(`\n❌ E2E type-checking FAILED with exit code ${code}`);
          }
          reject(new Error('E2E type-checking failed (quality gate)'));
          return;
        }

        console.log(`✅ E2E type-checking PASSED (${duration}s)\n`);
        resolve();
      });

      typecheckChild.on('error', reject);
    });
  }

  /**
   * Start backend server (after build phase, before E2E tests)
   */
  private async startBackend(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🦀 Starting backend server (cargo run)...');

      const backendChild = spawn('cargo', ['run'], {
        cwd: path.join(__dirname, '../../backend'),
        env: {
          ...process.env,
          TMPDIR: process.env.TMPDIR || `${process.env.HOME}/tmp`
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true  // Run in background
      });

      let stdout = '';
      let stderr = '';

      backendChild.stdout?.on('data', (data) => {
        stdout += data.toString();
        // Show startup messages
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.includes('Starting') || line.includes('Listening')) {
            console.log(`  ${line.trim()}`);
          }
        }
      });

      backendChild.stderr?.on('data', (data) => {
        stderr += data.toString();
        // Show startup messages from stderr too (actix logs to stderr)
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.includes('Starting') || line.includes('Listening') || line.includes('Application')) {
            console.log(`  ${line.trim()}`);
          }
        }
      });

      // Don't wait for process to exit - it runs in background
      backendChild.unref();  // Allow Node to exit without waiting for this process

      // Wait for backend to be ready (health check)
      console.log('⏳ Waiting for backend to be ready...');

      const checkHealth = async (attempt = 0): Promise<void> => {
        if (attempt >= 30) {
          reject(new Error('Backend failed to start within 30 seconds'));
          return;
        }

        try {
          const response = await fetch('http://localhost:8080/api/jobs');
          if (response.ok) {
            console.log('✅ Backend health check passed');
            resolve();
            return;
          }
        } catch (error) {
          // Backend not ready yet
        }

        setTimeout(() => checkHealth(attempt + 1), 1000);
      };

      checkHealth();
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
      let testCount = 0;

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
              testCount++;
              this.updateProgress('backend', { currentTest: match[1], testsRun: testCount });
              // Print status every 5 tests
              if (testCount % 5 === 0) {
                process.stdout.write(`  Backend: ${testCount} tests running...\r`);
              }
            }
          }
        }
      });

      child.on('close', (code) => {
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        try {
          // Clear the progress line
          process.stdout.write('\r\x1b[K');

          // Cargo test outputs summary to stdout, test output to stderr
          const combinedOutput = stdout + stderr;

          // Parse cargo test output (use combined output since summary is on stdout)
          const result = CargoParser.parseRegularOutput(combinedOutput);
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
      let testCount = 0;

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
              testCount++;
              this.updateProgress('frontend', { currentTest: match[1], testsRun: testCount });
              // Print status every 10 tests
              if (testCount % 10 === 0) {
                process.stdout.write(`  Frontend: ${testCount} tests running...\r`);
              }
            }
          }
        }
      });

      child.on('close', (code) => {
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        try {
          // Clear the progress line
          process.stdout.write('\r\x1b[K');

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
      // Use the path from playwright.config.ts: test-results/results.json
      const jsonOutputPath = path.join(__dirname, '../../frontend/test-results/results.json');

      // Run Playwright without --reporter flags to use config file reporters
      const child = spawn(
        'npx',
        ['playwright', 'test'],
        {
          cwd: path.join(__dirname, '../../frontend'),
          stdio: ['inherit', 'pipe', 'pipe'],
          env: {
            ...process.env,
            COMPREHENSIVE_TESTS: 'true'
          }
        }
      );

      let stdout = '';
      let stderr = '';
      let testCount = 0;

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        // Show test progress (list reporter outputs to stderr)
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.includes('[chromium]') || line.includes('›')) {
            testCount++;
            this.updateProgress('e2e', { currentTest: line.trim(), testsRun: testCount });
            // Print status every 10 tests
            if (testCount % 10 === 0) {
              process.stdout.write(`  E2E: ${testCount} tests running...\r`);
            }
          }
        }
      });

      child.on('close', (code) => {
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        try {
          // Clear the progress line
          process.stdout.write('\r\x1b[K');

          // Parse JSON file created by playwright.config.ts reporter
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

    // Display detailed failure information if any tests failed
    if (report.summary.totalFailed > 0) {
      this.displayFailures(report);
      this.writeDetailedFailureReport(report);
    }

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
   * Display detailed failure information
   */
  private displayFailures(report: ComprehensiveTestReport): void {
    console.log('❌ FAILURES DETECTED');
    console.log('====================\n');

    // Backend failures
    if (report.results.backend.failures && report.results.backend.failures.length > 0) {
      const count = report.results.backend.failures.length;
      console.log(`Backend (${count} failure${count > 1 ? 's' : ''}):`);
      for (const failure of report.results.backend.failures) {
        console.log(`  • ${failure.testName}`);
        console.log(`    ${failure.testFile}`);
        // Truncate long error messages to first line
        const errorFirstLine = failure.errorMessage.split('\n')[0];
        console.log(`    Error: ${errorFirstLine}`);
        if (failure.duration) {
          console.log(`    Duration: ${failure.duration}ms`);
        }
        console.log('');
      }
    }

    // Frontend failures
    if (report.results.frontend.failures && report.results.frontend.failures.length > 0) {
      const count = report.results.frontend.failures.length;
      console.log(`Frontend (${count} failure${count > 1 ? 's' : ''}):`);
      for (const failure of report.results.frontend.failures) {
        console.log(`  • ${failure.testName}`);
        console.log(`    ${failure.testFile}`);
        // Truncate long error messages to first line
        const errorFirstLine = failure.errorMessage.split('\n')[0];
        console.log(`    Error: ${errorFirstLine}`);
        if (failure.duration) {
          console.log(`    Duration: ${failure.duration}ms`);
        }
        console.log('');
      }
    }

    // E2E failures
    if (report.results.e2e.failures && report.results.e2e.failures.length > 0) {
      const count = report.results.e2e.failures.length;
      console.log(`E2E (${count} failure${count > 1 ? 's' : ''}):`);
      for (const failure of report.results.e2e.failures) {
        console.log(`  • ${failure.testName}`);
        console.log(`    ${failure.testFile}`);
        // Truncate long error messages to first line
        const errorFirstLine = failure.errorMessage.split('\n')[0];
        console.log(`    Error: ${errorFirstLine}`);
        if (failure.duration) {
          console.log(`    Duration: ${failure.duration}ms`);
        }
        console.log('');
      }
    }
  }

  /**
   * Write detailed failure report to file with full stack traces
   */
  private writeDetailedFailureReport(report: ComprehensiveTestReport): void {
    try {
      const reportPath = path.join(__dirname, '../../test-results/failures-detailed.txt');
      const lines: string[] = [];

      // Header
      lines.push('═══════════════════════════════════════════════════════════════════');
      lines.push('                    DETAILED FAILURE REPORT');
      lines.push('═══════════════════════════════════════════════════════════════════');
      lines.push('');
      lines.push(`Test Run: ${report.startTime.toISOString()}`);
      lines.push(`Duration: ${(report.duration / 1000).toFixed(1)}s`);
      lines.push(`Total Failures: ${report.summary.totalFailed}`);
      lines.push('');
      lines.push('═══════════════════════════════════════════════════════════════════');
      lines.push('');

      let failureNumber = 1;

      // Backend failures
      if (report.results.backend.failures && report.results.backend.failures.length > 0) {
        lines.push('');
        lines.push('┌─────────────────────────────────────────────────────────────────┐');
        lines.push('│ BACKEND FAILURES                                                │');
        lines.push('└─────────────────────────────────────────────────────────────────┘');
        lines.push('');

        for (const failure of report.results.backend.failures) {
          lines.push(`[${failureNumber}] ${failure.testName}`);
          lines.push('─'.repeat(70));
          lines.push(`File: ${failure.testFile}`);
          if (failure.duration) {
            lines.push(`Duration: ${failure.duration}ms`);
          }
          lines.push('');
          lines.push('Error Message:');
          lines.push(failure.errorMessage);
          lines.push('');

          if (failure.stackTrace) {
            lines.push('Stack Trace:');
            lines.push(failure.stackTrace);
            lines.push('');
          }

          lines.push('');
          failureNumber++;
        }
      }

      // Frontend failures
      if (report.results.frontend.failures && report.results.frontend.failures.length > 0) {
        lines.push('');
        lines.push('┌─────────────────────────────────────────────────────────────────┐');
        lines.push('│ FRONTEND FAILURES                                               │');
        lines.push('└─────────────────────────────────────────────────────────────────┘');
        lines.push('');

        for (const failure of report.results.frontend.failures) {
          lines.push(`[${failureNumber}] ${failure.testName}`);
          lines.push('─'.repeat(70));
          lines.push(`File: ${failure.testFile}`);
          if (failure.duration) {
            lines.push(`Duration: ${failure.duration}ms`);
          }
          lines.push('');
          lines.push('Error Message:');
          lines.push(failure.errorMessage);
          lines.push('');

          if (failure.stackTrace) {
            lines.push('Stack Trace:');
            lines.push(failure.stackTrace);
            lines.push('');
          }

          lines.push('');
          failureNumber++;
        }
      }

      // E2E failures
      if (report.results.e2e.failures && report.results.e2e.failures.length > 0) {
        lines.push('');
        lines.push('┌─────────────────────────────────────────────────────────────────┐');
        lines.push('│ E2E FAILURES                                                    │');
        lines.push('└─────────────────────────────────────────────────────────────────┘');
        lines.push('');

        for (const failure of report.results.e2e.failures) {
          lines.push(`[${failureNumber}] ${failure.testName}`);
          lines.push('─'.repeat(70));
          lines.push(`File: ${failure.testFile}`);
          if (failure.duration) {
            lines.push(`Duration: ${failure.duration}ms`);
          }
          lines.push('');
          lines.push('Error Message:');
          lines.push(failure.errorMessage);
          lines.push('');

          if (failure.stackTrace) {
            lines.push('Stack Trace:');
            lines.push(failure.stackTrace);
            lines.push('');
          }

          lines.push('');
          failureNumber++;
        }
      }

      // Footer
      lines.push('');
      lines.push('═══════════════════════════════════════════════════════════════════');
      lines.push(`End of Failure Report - ${new Date().toISOString()}`);
      lines.push('═══════════════════════════════════════════════════════════════════');

      // Write to file
      writeFileSync(reportPath, lines.join('\n'));
      console.log(`📄 Detailed failures saved to: ${reportPath}`);
    } catch (err) {
      console.warn('⚠️  Failed to write detailed failure report:', err);
    }
  }

  /**
   * Format duration in mm:ss format
   */
  private formatDuration(durationMs: number): string {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Send desktop notification (macOS) + Pushover notification (iPhone/Apple Watch)
   */
  private async sendNotification(report: ComprehensiveTestReport): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('\n🔔 Sending notifications...');

      const durationFormatted = this.formatDuration(report.duration);

      const detailedMessage = [
        'Comprehensive tests completed!',
        '',
        `Backend:  ${report.results.backend.passed}/${report.results.backend.failed}/${report.results.backend.skipped} (pass/fail/skip)`,
        `Frontend: ${report.results.frontend.passed}/${report.results.frontend.failed}/${report.results.frontend.skipped} (pass/fail/skip)`,
        `E2E:      ${report.results.e2e.passed}/${report.results.e2e.failed}/${report.results.e2e.skipped} (pass/fail/skip)`,
        '',
        `Total: ${report.summary.totalPassed}/${report.summary.totalFailed}/${report.summary.totalSkipped} (pass/fail/skip)`,
        `Duration: ${durationFormatted} (mm:ss)`,
        `Status: ${report.summary.overallSuccess ? 'SUCCESS' : 'FAILED'}`
      ].join('\\n');

      // Concise message for Pushover (iPhone/Apple Watch)
      const pushoverMessage = `Tests ${report.summary.overallSuccess ? '✅' : '❌'} | ${report.summary.totalPassed}/${report.summary.totalFailed}/${report.summary.totalSkipped} (P/F/S) | ${durationFormatted}`;

      // Check if Pushover script exists
      const pushoverScript = `${process.env.HOME}/bin/notify_claude.sh`;
      const fs = require('fs');
      const usePushover = fs.existsSync(pushoverScript);

      // Send Pushover notification first (iPhone/Apple Watch)
      if (usePushover) {
        console.log('  📱 Sending to iPhone/Apple Watch via Pushover...');
        const pushoverChild = spawn(pushoverScript, [pushoverMessage, 'Glass']);

        pushoverChild.on('close', () => {
          console.log('  ✅ Pushover notification sent');
          // Then continue with Mac notifications
          this.sendMacNotification(detailedMessage, resolve, reject);
        });

        pushoverChild.on('error', (err) => {
          console.log(`  ⚠️  Pushover failed: ${err.message}`);
          // Continue with Mac notifications anyway
          this.sendMacNotification(detailedMessage, resolve, reject);
        });
      } else {
        console.log('  ⚠️  Pushover script not found, Mac notification only');
        this.sendMacNotification(detailedMessage, resolve, reject);
      }
    });
  }

  /**
   * Send Mac-only notification (sound + dialog)
   */
  private sendMacNotification(message: string, resolve: () => void, reject: (err: Error) => void): void {
    // Play sound first
    const soundChild = spawn('afplay', ['/System/Library/Sounds/Glass.aiff']);

    soundChild.on('close', () => {
      // Then show dialog
      const dialogChild = spawn('osascript', [
        '-e',
        `display dialog "${message}" with title "Test Orchestrator" buttons {"OK"} default button "OK" with icon note`
      ]);

      dialogChild.on('close', () => {
        console.log('✅ All notifications sent!\n');
        resolve();
      });
      dialogChild.on('error', reject);
    });

    soundChild.on('error', reject);
  }
}
