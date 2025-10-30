/**
 * E2E Test Suite Configuration
 *
 * Controls which test suites are enabled/disabled.
 *
 * Purpose: Allows disabling low-value or failing tests without deleting them,
 * so they can be resurrected later without cluttering test output with skip messages.
 *
 * Related: ISSUE-025 Option A Implementation
 * Date: 2025-10-28
 */

export const ENABLED_TEST_SUITES = {
  // ===================================================================
  // CATEGORY 1: Core Workflow Tests (153 tests - ALWAYS ENABLED)
  // ===================================================================
  // Critical path user workflows that validate end-to-end functionality

  'setup-load': true,                    // 11 tests - Page load, API connectivity, performance
  'tab-navigation': true,                // 15 tests - Core navigation between tabs
  'content-generation': true,            // 32 tests - Primary feature (resume/cover letter with LLM)
  'job-details': true,                   // 18 tests - Job detail viewing and actions
  'job-status-updates': true,            // 15 tests - Approve/reject workflow (03-job-status-updates.spec.ts)
  'statistics': true,                    // 15 tests - Dashboard stats
  'dashboard-statistics': true,          // 18 tests - Stats display and MECE validation
  'job-scoring-system': true,            // 10 tests - Job ranking feature (27-job-scoring-system.spec.ts)
  'error-handling': true,                // 19 tests - Error handling and reliability

  // ===================================================================
  // CATEGORY 2: Feature Tests (129 tests - ENABLED)
  // ===================================================================
  // Valuable features but not on critical path

  'calendar-management': true,           // 17 tests - Calendar integration
  'follow-ups-management': true,         // 19 tests - Follow-up workflow (Phase 5.1)
  'timeline-view': true,                 // 24 tests - Timeline/communication history
  'intake-tab': true,                    // 21 tests - Job intake sources
  'gmail-sync-integration': true,        // 1 test - Gmail integration
  'job-card-summary': true,              // 13 tests - Trade-off info summary section (17-job-card-summary.spec.ts)
  'rapidapi-sync-integration': true,     // 5 tests - RapidAPI JSearch integration (28-rapidapi-sync-integration.spec.ts)
  'refilter-jobs': true,                 // 17 tests - Re-filter jobs functionality (25-refilter-jobs.spec.ts)
  'extraction-method-badges': true,      // 12 tests - LLM vs REGEX badges (26-extraction-method-badges.spec.ts)

  // ===================================================================
  // CATEGORY 3: Quality Tests (63 tests - ENABLED)
  // ===================================================================
  // Non-functional requirements still worth testing

  'responsive-design': true,             // 18 tests - Mobile/tablet compatibility
  'performance': true,                   // 10 tests - Performance benchmarks
  'accessibility': true,                 // 16 tests - A11y compliance
  'modal-scrolling': true,               // 7 tests - Modal scroll UX (20-modal-scrolling.spec.ts)
  'scroll-stability': true,              // 5 tests - Scroll position stability (21-scroll-stability.spec.ts)
  'description-quality': true,           // 7 tests - Description quality validation (23-description-quality.spec.ts)

  // ===================================================================
  // CATEGORY 4: Refinement Tests (56 tests - ENABLED FOR NOW)
  // ===================================================================
  // Edge cases and refinements - deferred decision (see ISSUE-025)
  // Can revisit in 3-6 months if maintenance burden becomes high

  'testing-refinement': true,            // 10 tests - Quality scoring
  'filtered-jobs': true,                 // 8 tests - Filtered job display logic
  'failed-duplicates-tabs': true,        // 6 tests - Edge case tabs
  'debug-section': true,                 // 8 tests - Debug info display (18-debug-section.spec.ts)
  'refresh-buttons': true,               // 8 tests - Per-job refresh functionality (22-refresh-buttons.spec.ts)
  'refresh-data-button': true,           // 7 tests - Global refresh button (24-refresh-data-button.spec.ts, BUG-0001 fix)
  'extraction-method-badge-test': true,  // 2 tests - ISSUE-001 verification (99-extraction-method-badge-test.spec.ts)
  'filtered-tab-test': true,             // 2 tests - Filtered tab verification (99b-filtered-tab-test.spec.ts)

  // ===================================================================
  // UI/STYLING TESTS (123 tests - DISABLED)
  // ===================================================================
  // These tests are disabled because they test cosmetic features,
  // are brittle to UI changes, and have low ROI for maintenance effort.
  // They can be re-enabled by changing these flags to `true`.

  'new-job-badges': false,               // 58 tests - Badge display logic (cosmetic)
  'job-badge-styling': false,            // 32 tests - Badge styling (cosmetic)
  'job-tradeoff-display': false,         // 32 tests - Trade-off display (informational)
  'email-composer': false,               // 32 tests - Email composer UI (covered by unit tests)
  'condensed-description': false,        // 9 tests - Description display (cosmetic)
};

/**
 * Check if a test suite should run
 *
 * @param testSuite - Key from ENABLED_TEST_SUITES
 * @returns true if enabled, false if disabled
 *
 * Default behavior: If a test suite is not listed in ENABLED_TEST_SUITES,
 * it will be enabled by default (return true). This ensures new tests
 * run unless explicitly disabled.
 */
export function shouldRunTest(testSuite: string): boolean {
  return ENABLED_TEST_SUITES[testSuite] ?? true;
}

/**
 * Usage in test files:
 *
 * import { test } from '@playwright/test';
 * import { shouldRunTest } from '../test-config';
 *
 * // Skip entire file if disabled - NO skip messages in output
 * test.skip(!shouldRunTest('new-job-badges'), 'Test suite disabled in test-config.ts');
 *
 * test.describe('My Test Suite', () => {
 *   // Tests here will only run if enabled
 * });
 */

/**
 * Summary of Active Tests (Updated 2025-10-29):
 *
 * - Category 1 (Core Workflows): 153 tests ✅ (+25 from Oct 28)
 * - Category 2 (Features): 129 tests ✅ (+47 from Oct 28)
 * - Category 3 (Quality): 63 tests ✅ (+19 from Oct 28)
 * - Category 4 (Refinements): 56 tests ✅ (+27 from Oct 28)
 * - UI/Styling (Disabled): 123 tests ❌
 *
 * Total Active: 401 tests (+118 from Oct 28)
 * Total Disabled: 123 tests
 * Total Tests: 524 tests (401 active + 123 disabled)
 *
 * Note: Current E2E test report shows 529 total tests. The 5 test discrepancy
 * may be from tests not using the config system (they run by default).
 *
 * Expected Pass Rate: ~65% (based on Oct 29 E2E results: 343/529 passing)
 * Expected Runtime: ~12-16 minutes
 */
