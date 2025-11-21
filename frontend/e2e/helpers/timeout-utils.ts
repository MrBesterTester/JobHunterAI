/**
 * Timeout utility for E2E tests that adapts to test load
 *
 * When running comprehensive tests with multiple parallel workers,
 * timeouts need to be extended to account for increased system load.
 * This utility provides a centralized way to scale timeouts appropriately.
 *
 * Usage:
 *   test.setTimeout(getTestTimeout(60000)); // 60s → 90s under load
 *   await page.waitForSelector('[data-testid="foo"]', {
 *     timeout: getTestTimeout(5000) // 5s → 7.5s under load
 *   });
 *
 * See: ISSUE-062 for rationale and implementation details
 */

/**
 * Get a load-aware timeout value
 *
 * @param baseTimeout - The timeout in milliseconds for normal (single-test) runs
 * @returns Scaled timeout for comprehensive test runs (1.5x multiplier), or base timeout for normal runs
 *
 * @example
 * // Test timeout
 * test.setTimeout(getTestTimeout(60000)); // 60s → 90s under comprehensive load
 *
 * @example
 * // Selector timeout
 * await page.waitForSelector('.job-card', {
 *   timeout: getTestTimeout(5000) // 5s → 7.5s under comprehensive load
 * });
 */
export function getTestTimeout(baseTimeout: number): number {
  const isComprehensiveTests = process.env.COMPREHENSIVE_TESTS === 'true';
  const multiplier = isComprehensiveTests ? 1.5 : 1.0;
  return Math.floor(baseTimeout * multiplier);
}
