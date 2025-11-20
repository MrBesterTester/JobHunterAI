/**
 * Playwright JSON Output Parser
 *
 * Parses Playwright's JSON reporter output into our unified TestResult structure
 */

import { TestResult } from '../types';
import { readFileSync } from 'fs';

interface PlaywrightSuite {
  title: string;
  tests: Array<{
    title: string;
    status: 'passed' | 'failed' | 'skipped' | 'timedOut';
    duration: number;
  }>;
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

      // Count test results recursively
      const counts = this.countTests(report.suites);

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
        success: counts.failed === 0
      };
    } catch (err) {
      throw new Error(`Failed to parse Playwright JSON output: ${err}`);
    }
  }

  /**
   * Recursively count tests in Playwright suites
   */
  private static countTests(suites: PlaywrightSuite[]): {
    passed: number;
    failed: number;
    skipped: number;
  } {
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const suite of suites) {
      // Count tests in this suite
      for (const test of suite.tests || []) {
        if (test.status === 'passed') {
          passed++;
        } else if (test.status === 'failed' || test.status === 'timedOut') {
          failed++;
        } else if (test.status === 'skipped') {
          skipped++;
        }
      }

      // Recursively count nested suites
      if (suite.suites) {
        const nestedCounts = this.countTests(suite.suites);
        passed += nestedCounts.passed;
        failed += nestedCounts.failed;
        skipped += nestedCounts.skipped;
      }
    }

    return { passed, failed, skipped };
  }
}
