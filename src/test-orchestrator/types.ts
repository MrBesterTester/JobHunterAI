/**
 * Type definitions for test orchestrator
 */

export interface TestFailure {
  testName: string;
  testFile: string;
  errorMessage: string;
  stackTrace?: string;
  duration?: number;
}

export interface TestResult {
  suite: 'backend' | 'frontend' | 'e2e';
  passed: number;
  failed: number;
  skipped: number;
  duration: number; // milliseconds
  startTime: Date;
  endTime: Date;
  success: boolean;
  failures?: TestFailure[];  // Detailed failure information
}

export interface TestProgress {
  suite: 'backend' | 'frontend' | 'e2e';
  status: 'pending' | 'running' | 'completed' | 'failed';
  testsRun: number;
  testsTotal: number;
  currentTest?: string;
}

export interface ComprehensiveTestReport {
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  results: {
    backend: TestResult;
    frontend: TestResult;
    e2e: TestResult;
  };
  summary: {
    totalPassed: number;
    totalFailed: number;
    totalSkipped: number;
    overallSuccess: boolean;
  };
}

// Jest JSON format
export interface JestTestResult {
  numFailedTestSuites: number;
  numFailedTests: number;
  numPassedTestSuites: number;
  numPassedTests: number;
  numPendingTests: number;
  numTotalTestSuites: number;
  numTotalTests: number;
  success: boolean;
  startTime: number;
  testResults: Array<{
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    startTime: number;
    endTime: number;
    assertionResults: Array<{
      fullName: string;
      status: 'passed' | 'failed' | 'pending';
      title: string;
      duration: number | null;
      failureMessages?: string[];
    }>;
  }>;
}

// Playwright JSON format (based on test output)
export interface PlaywrightTestResult {
  config: object;
  suites: Array<{
    title: string;
    file: string;
    specs: Array<{
      title: string;
      tests: Array<{
        status: 'passed' | 'failed' | 'skipped' | 'timedOut';
        duration: number;
        results: Array<{
          status: 'passed' | 'failed' | 'skipped' | 'timedOut';
          duration: number;
          error?: {
            message: string;
            stack?: string;
          };
        }>;
      }>;
    }>;
  }>;
}

// Cargo JSON format (unstable - JSON Lines)
export interface CargoTestEvent {
  type: 'suite' | 'test';
  event: 'started' | 'ok' | 'failed' | 'ignored';
  name?: string;
  exec_time?: number;
}

// Orchestrator configuration for debug/testing modes
export interface OrchestratorConfig {
  // Preflight options
  runPreflight: boolean;           // Run all preflight checks
  runProcessCleanup: boolean;      // Stop servers
  runGitCheck: boolean;            // Check git status
  runDatabaseCheck: boolean;       // Check database selection
  runDatabasePrep: boolean;        // Backup/clear/seed
  runOAuthCheck: boolean;          // Validate OAuth tokens

  // Build options
  runBuilds: boolean;              // Run all builds
  runBackendBuild: boolean;        // cargo clean + build
  runFrontendBuild: boolean;       // npm build
  runE2ETypecheck: boolean;        // typecheck E2E tests

  // Test options
  runTests: boolean;               // Run all tests
  runBackendTests: boolean;        // cargo test
  runFrontendTests: boolean;       // npm test
  runE2ETests: boolean;            // playwright test

  // Output options
  sendNotification: boolean;       // Desktop notification
  verbose: boolean;                // Extra logging
}
