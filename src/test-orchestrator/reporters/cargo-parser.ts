/**
 * Cargo Test JSON Output Parser
 *
 * Parses Cargo's --format json output (unstable) into our unified TestResult structure
 * Format: JSON Lines (one JSON object per line)
 */

import { TestResult, CargoTestEvent } from '../types';

export class CargoParser {
  /**
   * Parse Cargo test JSON Lines output into TestResult
   *
   * Cargo outputs one JSON object per line with events like:
   * - {"type":"suite","event":"started",...}
   * - {"type":"test","event":"started","name":"test_name",...}
   * - {"type":"test","event":"ok","name":"test_name","exec_time":0.001}
   * - {"type":"test","event":"failed","name":"test_name"}
   * - {"type":"suite","event":"ok",...}
   */
  static parse(jsonLinesOutput: string): TestResult {
    const startTime = new Date();
    let passed = 0;
    let failed = 0;
    let ignored = 0;

    const lines = jsonLinesOutput.trim().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const event: CargoTestEvent = JSON.parse(line);

        if (event.type === 'test') {
          if (event.event === 'ok') {
            passed++;
          } else if (event.event === 'failed') {
            failed++;
          } else if (event.event === 'ignored') {
            ignored++;
          }
        }
      } catch (err) {
        // Skip lines that aren't valid JSON (e.g., cargo output messages)
        continue;
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    return {
      suite: 'backend',
      passed,
      failed,
      skipped: ignored,
      duration,
      startTime,
      endTime,
      success: failed === 0
    };
  }

  /**
   * Parse regular cargo test output (non-JSON fallback)
   *
   * Parses output like:
   * "test result: ok. 166 passed; 0 failed; 4 ignored; 0 measured; 0 filtered out"
   */
  static parseRegularOutput(output: string): TestResult {
    const startTime = new Date();

    // Look for the summary line
    // Example: "test result: FAILED. 31 passed; 1 failed; 4 ignored; 0 measured; 0 filtered out; finished in 1.03s"
    const summaryRegex = /test result: (\w+)\. (\d+) passed; (\d+) failed; (\d+) ignored;/;
    const match = output.match(summaryRegex);

    if (!match) {
      throw new Error('Failed to parse cargo test output: summary line not found');
    }

    const [, result, passedStr, failedStr, ignoredStr] = match;
    const passed = parseInt(passedStr, 10);
    const failed = parseInt(failedStr, 10);
    const ignored = parseInt(ignoredStr, 10);

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    return {
      suite: 'backend',
      passed,
      failed,
      skipped: ignored,
      duration,
      startTime,
      endTime,
      success: result === 'ok' || result === 'PASSED'
    };
  }
}
