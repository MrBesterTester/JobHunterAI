/**
 * Playwright JSON Output Parser
 *
 * Parses Playwright's JSON reporter output into our unified TestResult structure
 */

import { TestResult, TestFailure } from '../types';
import { readFileSync } from 'fs';

interface PlaywrightSpec {
  title: string;
  ok: boolean;
  file: string;
  tests: Array<{
    status: string;
    results: Array<{
      status: 'passed' | 'failed' | 'skipped' | 'timedOut';
      duration: number;
      error?: {
        message?: string;
        stack?: string;
      };
    }>;
  }>;
}

interface PlaywrightSuite {
  title: string;
  file?: string;
  specs: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightReport {
  config: any;
  suites: PlaywrightSuite[];
  stats?: {
    startTime: string;
    duration: number;
  };
}

export class PlaywrightParser {
  /**
   * Parse Playwright JSON report file into TestResult
   */
  static parseFile(jsonFilePath: string): TestResult {
    try {
      const fileContent = readFileSync(jsonFilePath, 'utf-8');
      return this.parse(fileContent);
    } catch (err) {
      throw new Error(`Failed to read Playwright JSON file: ${err}`);
    }
  }

  /**
   * Parse Playwright JSON output into TestResult
   */
  static parse(jsonOutput: string): TestResult {
    try {
      const report: PlaywrightReport = JSON.parse(jsonOutput);

      // Count test results and extract failures recursively
      const { counts, failures } = this.countTests(report.suites);

      const endTime = new Date();
      const startTime = report.stats?.startTime
        ? new Date(report.stats.startTime)
        : new Date(endTime.getTime() - (report.stats?.duration || 0));
      const duration = report.stats?.duration || (endTime.getTime() - startTime.getTime());

      return {
        suite: 'e2e',
        passed: counts.passed,
        failed: counts.failed,
        skipped: counts.skipped,
        duration,
        startTime,
        endTime,
        success: counts.failed === 0,
        failures: failures.length > 0 ? failures : undefined
      };
    } catch (err) {
      throw new Error(`Failed to parse Playwright JSON output: ${err}`);
    }
  }

  /**
   * Recursively count tests and extract failures in Playwright suites
   */
  private static countTests(suites: PlaywrightSuite[]): {
    counts: {
      passed: number;
      failed: number;
      skipped: number;
    };
    failures: TestFailure[];
  } {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const failures: TestFailure[] = [];

    for (const suite of suites) {
      // Count specs in this suite
      for (const spec of suite.specs || []) {
        // Each spec contains multiple test runs (one per browser/retry)
        for (const test of spec.tests || []) {
          // Each test has results (retries)
          for (const result of test.results || []) {
            if (result.status === 'passed') {
              passed++;
            } else if (result.status === 'failed' || result.status === 'timedOut') {
              failed++;

              // Extract failure details
              failures.push({
                testName: `${suite.title} › ${spec.title}`,
                testFile: spec.file || suite.file || 'unknown',
                errorMessage: result.error?.message || `Test ${result.status}`,
                stackTrace: result.error?.stack,
                duration: result.duration
              });
            } else if (result.status === 'skipped') {
              skipped++;
            }
          }
        }
      }

      // Recursively count nested suites
      if (suite.suites) {
        const nestedResults = this.countTests(suite.suites);
        passed += nestedResults.counts.passed;
        failed += nestedResults.counts.failed;
        skipped += nestedResults.counts.skipped;
        failures.push(...nestedResults.failures);
      }
    }

    return {
      counts: { passed, failed, skipped },
      failures
    };
  }
}
