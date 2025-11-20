/**
 * Jest JSON Output Parser
 *
 * Parses Jest's --json output format into our unified TestResult structure
 */

import { TestResult, JestTestResult, TestFailure } from '../types';

export class JestParser {
  /**
   * Parse Jest JSON output into TestResult
   */
  static parse(jsonOutput: string): TestResult {
    try {
      const result: JestTestResult = JSON.parse(jsonOutput);

      const endTime = new Date();
      const startTime = new Date(result.startTime);
      const duration = endTime.getTime() - startTime.getTime();

      // Extract failure details
      const failures: TestFailure[] = [];

      for (const testResult of result.testResults || []) {
        for (const assertion of testResult.assertionResults || []) {
          if (assertion.status === 'failed') {
            // Extract error message from failureMessages array
            const errorMessage = assertion.failureMessages?.join('\n') || 'Test failed';

            failures.push({
              testName: assertion.fullName || assertion.title,
              testFile: testResult.name || 'unknown',
              errorMessage,
              duration: assertion.duration ?? undefined
            });
          }
        }
      }

      return {
        suite: 'frontend',
        passed: result.numPassedTests,
        failed: result.numFailedTests,
        skipped: result.numPendingTests,
        duration,
        startTime,
        endTime,
        success: result.success,
        failures: failures.length > 0 ? failures : undefined
      };
    } catch (err) {
      throw new Error(`Failed to parse Jest JSON output: ${err}`);
    }
  }

  /**
   * Extract JSON from Jest output (last line of stdout)
   */
  static extractJSON(stdout: string): string {
    const lines = stdout.trim().split('\n');
    return lines[lines.length - 1];
  }
}
