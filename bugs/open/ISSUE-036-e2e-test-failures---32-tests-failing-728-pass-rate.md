---
id: ISSUE-036
title: E2E Test Failures - 32 tests failing (92.2% pass rate)
status: open
priority: medium
severity: medium
component: frontend
created: 2025-11-08
updated: 2025-11-08
affects: []
related: [ISSUE-035]
---

# ISSUE-036: E2E Test Failures - 32 tests failing (92.2% pass rate)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Failing Tests (32 total)](#failing-tests-32-total)
  - [Category 1: Unimplemented Features (13 tests)](#category-1-unimplemented-features-13-tests)
    - [Timeline View - Phase 5.1 (2 tests)](#timeline-view---phase-51-2-tests)
    - [Intake Tab - Integration Cards (5 tests)](#intake-tab---integration-cards-5-tests)
    - [Debug Section Display (6 tests)](#debug-section-display-6-tests)
  - [Category 2: UI/Display Issues (10 tests)](#category-2-uidisplay-issues-10-tests)
    - [Empty State Handling (1 test)](#empty-state-handling-1-test)
    - [Job Count Badges (1 test)](#job-count-badges-1-test)
    - [Dashboard Statistics (1 test)](#dashboard-statistics-1-test)
    - [Non-Job Emails / Ignored Tab (1 test)](#non-job-emails--ignored-tab-1-test)
    - [Job Card Summary (1 test)](#job-card-summary-1-test)
    - [Modal Scrolling (5 tests)](#modal-scrolling-5-tests)
  - [Category 3: Feature-Specific Issues (6 tests)](#category-3-feature-specific-issues-6-tests)
    - [Console Errors (1 test)](#console-errors-1-test)
    - [Accessibility (1 test)](#accessibility-1-test)
    - [Gmail Integration (1 test)](#gmail-integration-1-test)
    - [Refresh Buttons (1 test)](#refresh-buttons-1-test)
    - [Description Quality (2 tests)](#description-quality-2-tests)
  - [Category 4: Test Data Issues (3 tests)](#category-4-test-data-issues-3-tests)
    - [Extraction Method Badge (2 tests)](#extraction-method-badge-2-tests)
    - [Filtered Tab (2 tests)](#filtered-tab-2-tests)
- [Root Cause](#root-cause)
- [Evidence](#evidence)
  - [E2E Test Run Results (2025-11-08)](#e2e-test-run-results-2025-11-08)
  - [Test Output Log](#test-output-log)
  - [Example Failure: Filtered Tab Test](#example-failure-filtered-tab-test)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Triage and Categorize](#option-1-triage-and-categorize)
  - [Option 2: Focus on Quick Wins](#option-2-focus-on-quick-wins)
  - [Option 3: Comprehensive Fix Pass](#option-3-comprehensive-fix-pass)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

After completing ISSUE-035 fixes which brought the E2E pass rate from 80.8% to 96.0%, a comprehensive E2E test run on 2025-11-08 revealed 32 remaining test failures out of 410 active tests (378 passing, 32 failing), representing a 92.2% pass rate.

**Key Metrics:**
- Total tests: 576 (410 active + 166 skipped)
- Passing: 378 (92.2%)
- Failing: 32 (7.8%)
- Skipped: 166 (intentionally deferred features)
- Test runtime: 12.8 minutes

**Context:** This issue tracks the 32 remaining E2E test failures that are outside the scope of ISSUE-035. Many of these failures are related to unimplemented features (Timeline View, Intake Tab integrations, Debug Section), UI edge cases (modal scrolling, empty states), and test data issues (filtered job counts).

## Impact

**Who/What is affected:**
- E2E test suite coverage and reliability
- Features with tests in this issue are either unimplemented, partially implemented, or have edge case bugs
- Test automation confidence for CI/CD pipeline

**Severity:**
- Medium - Most failures are for unimplemented features or edge cases
- Does not block current production features
- Should be addressed to maintain test suite health and guide future development

## Failing Tests (32 total)

### Category 1: Unimplemented Features (13 tests)

#### Timeline View - Phase 5.1 (2 tests)
1. `e2e/tests/14-timeline-view.spec.ts:15:9` - "should display Timeline section in job details"
2. `e2e/tests/14-timeline-view.spec.ts:32:9` - "should show application event in timeline"

**Status:** Feature not yet implemented (Phase 5.1 future work)

#### Intake Tab - Integration Cards (5 tests)
3. `e2e/tests/15-intake-tab.spec.ts:78:9` - "should display Indeed integration card"
4. `e2e/tests/15-intake-tab.spec.ts:162:9` - "should display mock implementation notice"
5. `e2e/tests/15-intake-tab.spec.ts:181:9` - "should display Not Implemented status"
6. `e2e/tests/15-intake-tab.spec.ts:186:9` - "should display Coming Soon message"
7. `e2e/tests/15-intake-tab.spec.ts:191:9` - "should have disabled Request Implementation button"

**Status:** LinkedIn/Indeed integration UI not yet implemented

#### Debug Section Display (6 tests)
8. `e2e/tests/18-debug-section.spec.ts:28:7` - "should display debug section on job cards"
9. `e2e/tests/18-debug-section.spec.ts:40:7` - "should display extraction method in debug section"
10. `e2e/tests/18-debug-section.spec.ts:54:7` - "should display raw data JSON in debug section"
11. `e2e/tests/18-debug-section.spec.ts:118:7` - "should have scrollable JSON content when data is large"
12. `e2e/tests/18-debug-section.spec.ts:132:7` - "should parse and validate JSON structure in raw_data"
13. `e2e/tests/18-debug-section.spec.ts:181:7` - "should have proper styling for debug section"

**Status:** Debug section feature may be partially implemented or hidden

### Category 2: UI/Display Issues (10 tests)

#### Empty State Handling (1 test)
14. `e2e/tests/02-tab-navigation.spec.ts:319:9` - "should handle tabs with no jobs gracefully"

**Error:** Empty state handling may not be working as expected

#### Job Count Badges (1 test)
15. `e2e/tests/02-tab-navigation.spec.ts:128:9` - "should have job count badges matching displayed jobs"

**Error:** Badge counts may not be syncing properly with displayed job lists

#### Dashboard Statistics (1 test)
16. `e2e/tests/07-dashboard-statistics.spec.ts:158:7` - "stat labels should be correctly named"

**Error:** Statistics labels may have incorrect or inconsistent naming

#### Non-Job Emails / Ignored Tab (1 test)
17. `e2e/tests/08-failed-duplicates-tabs.spec.ts:139:7` - "Non-Job Emails counter should match Ignored tab count"

**Error:** Counter mismatch between stats and tab display

#### Job Card Summary (1 test)
18. `e2e/tests/17-job-card-summary.spec.ts:204:7` - "should display Summary section for filtered jobs with Filtered Reasons"

**Error:** Summary section may not be displaying for filtered jobs

#### Modal Scrolling (5 tests)
19. `e2e/tests/20-modal-scrolling.spec.ts:74:7` - "should allow scrolling through long email content without jumping"
20. `e2e/tests/21-scroll-stability.spec.ts:61:7` - "scroll position should remain stable during multiple scroll events"
21. `e2e/tests/21-scroll-stability.spec.ts:94:7` - "scroll position should remain stable while scrolling slowly with mouse wheel"
22. `e2e/tests/21-scroll-stability.spec.ts:169:7` - "scroll position should persist during rapid scrolling"

**Error:** Modal scroll position instability - possible React re-rendering issue causing scroll jumps

### Category 3: Feature-Specific Issues (6 tests)

#### Console Errors (1 test)
23. `e2e/tests/01-setup-load.spec.ts:73:9` - "should load without console errors"

**Error:** Page may be logging errors to console on load

#### Accessibility (1 test)
24. `e2e/tests/11-accessibility.spec.ts:307:9` - "should have form inputs with labels"

**Error:** Some form inputs may be missing proper accessibility labels

#### Gmail Integration (1 test)
25. `e2e/tests/16-gmail-sync-integration.spec.ts:209:7` - "should allow approving jobs synced from Gmail"

**Error:** Approve workflow may have issues with Gmail-synced jobs

#### Refresh Buttons (1 test)
26. `e2e/tests/22-refresh-buttons.spec.ts:55:7` - "should refresh single job description when per-job button clicked"

**Error:** Per-job refresh functionality may not be working

#### Description Quality (2 tests)
27. `e2e/tests/23-description-quality.spec.ts:79:7` - "should show actual job content (not just 'No job description')"
28. `e2e/tests/23-description-quality.spec.ts:125:7` - "refresh should regenerate description (check for different content after prompt change)"

**Error:** Job descriptions may not be populating correctly or refreshing properly

### Category 4: Test Data Issues (3 tests)

#### Extraction Method Badge (2 tests)
29. `e2e/tests/99-extraction-method-badge-test.spec.ts:15:7` - "should display blue LLM badge for Expert Systems Architect job"
30. `e2e/tests/99-extraction-method-badge-test.spec.ts:92:7` - "should verify job data via API"

**Error:** Test data for "Expert Systems Architect" job may be missing or incorrectly configured

#### Filtered Tab (2 tests)
31. `e2e/tests/99b-filtered-tab-test.spec.ts:13:7` - "should show Expert Systems Architect job in Filtered tab"
32. `e2e/tests/99b-filtered-tab-test.spec.ts:53:7` - "should verify API returns filtered jobs"

**Error:** Expected 30 filtered jobs but only 1 returned - test data seeding issue

## Root Cause

**Preliminary Analysis:**

1. **Unimplemented Features (13 tests):** These are expected failures for features documented in future work phases (Timeline View in Phase 5.1, LinkedIn/Indeed integrations, Debug Section)

2. **UI Edge Cases (10 tests):** Issues with empty states, modal scrolling stability, and display synchronization

3. **Test Data Issues (3 tests):** The "Expert Systems Architect" job and filtered job test data may not be properly seeded in the test database

4. **Feature Regressions (6 tests):** Console errors, accessibility, Gmail integration, and description refresh features may have regressed

**Needs Investigation:**
- Modal scrolling: Likely React re-rendering causing scroll position resets
- Test data seeding: Filtered tab expecting 30 jobs but only finding 1
- Console errors: Need to identify specific errors being logged
- Job count badges: Need to verify sync logic between stats and display

## Evidence

### E2E Test Run Results (2025-11-08)
```bash
cd frontend && npx playwright test --project=chromium

Results:
  32 failed
  166 skipped
  378 passed (12.8m)

Pass Rate: 378 / 410 = 92.2%
```

### Test Output Log
Full test results available at: `/tmp/e2e-final-run.log`

Playwright HTML report: `http://localhost:9323`

### Example Failure: Filtered Tab Test
```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 30
Received: 1

  69 |     expect(jobs.length).toBe(30);
     |                         ^
```

This suggests test data seeding is not creating the expected 30 filtered jobs.

## Proposed Solutions

### Option 1: Triage and Categorize

**Description:** Create sub-issues or skip tests based on category:
- Skip unimplemented feature tests with `.skip()` and proper documentation
- Investigate and fix UI edge cases (modal scrolling, empty states)
- Fix test data seeding issues
- Investigate and fix feature regressions

**Pros:**
- Clear separation of concerns
- Can address high-priority issues first
- Maintains test suite health

**Cons:**
- Requires careful triage and prioritization
- May take multiple work sessions to complete

**Implementation Effort:** 2-4 days (spread across multiple sessions)

**Maintenance:** Medium - need to track skipped tests and re-enable when features are implemented

### Option 2: Focus on Quick Wins

**Description:** Address test data issues and obvious bugs first:
- Fix filtered tab test data seeding (expecting 30 jobs, only getting 1)
- Fix console errors on page load
- Fix job count badge sync
- Skip unimplemented feature tests

**Pros:**
- Immediate pass rate improvement
- Addresses real bugs affecting user experience
- Clear scope

**Cons:**
- Leaves modal scrolling and other edge cases unresolved
- May need follow-up work

**Implementation Effort:** 4-6 hours

**Maintenance:** Low - fixes are straightforward

### Option 3: Comprehensive Fix Pass

**Description:** Address all 32 failures systematically:
- Implement missing features (Timeline, Intake Tab UI, Debug Section)
- Fix all UI edge cases
- Fix test data seeding
- Fix all feature regressions

**Pros:**
- Achieves near-100% pass rate
- Comprehensive solution

**Cons:**
- Very large scope
- May require implementing features not yet prioritized
- Time-consuming

**Implementation Effort:** 2-3 weeks

**Maintenance:** Low once complete

## Decision

**Recommended Approach:** Option 1 (Triage and Categorize) + Option 2 (Quick Wins)

**Rationale:**
1. Skip unimplemented feature tests (13 tests) with proper documentation - this brings pass rate to 95.3%
2. Fix test data seeding issues (3 tests) - quick win
3. Investigate and fix obvious bugs (console errors, job count badges, accessibility) - 3-5 tests
4. Create follow-up issues for modal scrolling and other complex UI edge cases

This approach balances immediate test suite health improvement with pragmatic scoping of work.

## Implementation

**Phase 1: Quick Triage (30 minutes)**
- [ ] Skip 13 unimplemented feature tests with `.skip()` and documentation
- [ ] Document skipped tests in test file comments

**Phase 2: Test Data Fixes (1 hour)**
- [ ] Investigate filtered tab test data seeding issue
- [ ] Fix "Expert Systems Architect" job test data
- [ ] Verify test data after fixes

**Phase 3: Bug Fixes (2-3 hours)**
- [ ] Fix console errors on page load
- [ ] Fix job count badge synchronization
- [ ] Fix accessibility labels for form inputs
- [ ] Fix description quality/refresh issues

**Phase 4: Follow-up Issues (30 minutes)**
- [ ] Create ISSUE-037 for modal scrolling stability
- [ ] Document remaining edge cases for future work

## Testing

**Test Commands:**
```bash
# Run full E2E suite
cd frontend
npx playwright test --project=chromium

# Run specific failing test file
npx playwright test e2e/tests/99b-filtered-tab-test.spec.ts

# Run specific test with trace
npx playwright test e2e/tests/99b-filtered-tab-test.spec.ts:13 --trace on
```

**Verification:**
- [ ] Pass rate improves to >95% after skipping unimplemented features
- [ ] Test data seeding creates expected filtered jobs (30 jobs)
- [ ] No console errors on page load
- [ ] Job count badges match displayed job counts in all tabs
- [ ] Accessibility tests pass for form inputs

## Status History

- 2025-11-08: ISSUE created after comprehensive E2E test run post-ISSUE-035
- 2025-11-08: Documented all 32 failing tests with categories and preliminary root cause analysis

## Notes

**Connection to ISSUE-035:**
- ISSUE-035 brought pass rate from 80.8% (92 failures) to 96.0% (17 failures projected)
- Actual comprehensive run showed 32 failures (92.2% pass rate)
- Discrepancy may be due to:
  - ISSUE-035 metrics calculated from partial test runs
  - New test failures introduced
  - Different test data state

**Priority Recommendation:**
- **High Priority:** Test data seeding (affects multiple tests)
- **High Priority:** Console errors (affects user experience)
- **Medium Priority:** UI edge cases (modal scrolling, empty states)
- **Low Priority:** Unimplemented features (skip tests until features are ready)

## Related Files

- `frontend/e2e/tests/14-timeline-view.spec.ts` - Timeline View tests (unimplemented)
- `frontend/e2e/tests/15-intake-tab.spec.ts` - Intake Tab integration tests
- `frontend/e2e/tests/18-debug-section.spec.ts` - Debug Section display tests
- `frontend/e2e/tests/20-modal-scrolling.spec.ts` - Modal scrolling tests
- `frontend/e2e/tests/21-scroll-stability.spec.ts` - Scroll stability tests
- `frontend/e2e/tests/99b-filtered-tab-test.spec.ts:69` - Test data seeding issue (filtered jobs)
- `frontend/e2e/global-setup.ts:32` - Job score calculation failing (may affect test data)
