---
id: ISSUE-035
title: E2E test failures - 92 tests failing (80.8% pass rate)
status: open
priority: high
severity: high
component: frontend
created: 2025-11-07
updated: 2025-11-07
affects: []
related: []
---

# ISSUE-035: E2E test failures - 92 tests failing (80.8% pass rate)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Steps to Reproduce](#steps-to-reproduce)
- [Expected Behavior](#expected-behavior)
- [Actual Behavior](#actual-behavior)
- [Root Cause](#root-cause)
- [Evidence](#evidence)
- [Proposed Solutions](#proposed-solutions)
  - [Phase 1: Skip Unimplemented Features (15 min)](#phase-1-skip-unimplemented-features-15-min)
  - [Phase 2-3: Fix Job Details & UI (3-5 hours)](#phase-2-3-fix-job-details--ui-3-5-hours)
  - [Phase 4: Fix Email Integration (2-3 hours)](#phase-4-fix-email-integration-2-3-hours)
- [Decision](#decision)
- [Implementation](#implementation)
  - [Targeted Test Execution (Fast Iteration)](#targeted-test-execution-fast-iteration)
  - [Phase 1 Checklist](#phase-1-checklist)
  - [Phase 2-3 Checklist](#phase-2-3-checklist)
  - [Phase 4 Checklist](#phase-4-checklist)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

92 out of 479 executed E2E tests (19.2%) are currently failing. Current pass rate: 80.8%.

**Goal**: Achieve 95%+ pass rate (max 25 failures) through 4-phase fix plan.

**Key Insight**: 22 tests (24% of failures) are for unimplemented features and should be skipped, not fixed.

## Impact

**Who/What is affected:**
- E2E test suite reliability: 92 failing tests reduce confidence in releases
- Development velocity: 20-minute full suite runs slow down iteration
- Feature validation: Critical workflows (job details, email integration) not properly tested
- CI/CD: Cannot rely on E2E tests for deployment gates

**Severity:**
- High: 19.2% failure rate is unacceptable for release confidence
- Impacts: Job details UI (62 tests), Email integration (8 tests), Unimplemented features (22 tests)
- Mitigation: Frontend unit tests all passing (516/516), so core functionality validated

## Steps to Reproduce

1. Run full E2E test suite: `./helper-scripts/run-e2e-tests.sh`
2. Observe 387 passing, 92 failing (80.8% pass rate)
3. Test failures span 7 major categories (see Evidence section)

## Expected Behavior

E2E tests should have 95%+ pass rate with only failures for:
- Known bugs
- Features actively under development
- Infrastructure limitations (documented and skipped)

## Actual Behavior

**92 test failures across 7 categories:**

1. **Job Scoring System** (4 tests) - Feature not implemented
2. **Extraction Method Badges** (6 tests) - Feature not implemented
3. **Responsive Design - Mobile** (4 tests) - Tab navigation timeouts
4. **Performance Tests** (5 tests) - Test infrastructure issues
5. **Content Generation** (3 tests) - Token/cost tracking not implemented
6. **Email Integration** (8 tests) - Sync/workflow timing issues
7. **Job Details & UI** (62 tests) - Selector/timing issues (largest category)

## Root Cause

**Category Breakdown:**

**Unimplemented Features (22 tests - 24% of failures):**
- Job scoring, extraction badges, token tracking features not yet built
- Tests written ahead of implementation (test-driven development)
- Should be skipped until features are implemented

**Selector/Timing Issues (62 tests - 67% of failures):**
- Similar to frontend unit test issues just fixed
- Selectors changed but tests not updated
- Missing `waitFor()` for async operations
- Button visibility checks incorrect

**Workflow Timing (8 tests - 9% of failures):**
- Email sync operations timing out
- Stats update verification racing with API calls
- Missing proper async handling

## Evidence

**Test Results** (from TESTING_STATUS.md):
```
E2E Tests: 387 passed / 92 failed / 115 excluded
Pass Rate: 80.8%
Runtime: 20.0 minutes
```

**Failure Categories** (from `docs/TESTING_STATUS.md`):
- Job Details & UI: 62 tests (67% of failures)
- Unimplemented features: 22 tests (24% of failures)
- Email Integration: 8 tests (9% of failures)

**Test Files**:
- `frontend/e2e/tests/05-job-details.spec.ts` (job details)
- `frontend/e2e/tests/05*.spec.ts` (multiple UI test files)
- `frontend/e2e/tests/06-job-badge-styling.spec.ts` (extraction badges - unimplemented)
- `frontend/e2e/tests/08-responsive-design.spec.ts` (mobile - deferred)
- `frontend/e2e/tests/10-performance.spec.ts` (performance - unimplemented)

## Proposed Solutions

### Phase 1: Skip Unimplemented Features (15 min)

**Description**: Add `test.skip()` to 22 tests for unimplemented features

**Tests to skip:**
1. Job Scoring System (4 tests)
2. Extraction Method Badges (6 tests)
3. Responsive Design - Mobile (4 tests)
4. Performance Tests (5 tests)
5. Content Generation Token/Cost (3 tests)

**Pros**:
- Instant pass rate improvement: 80.8% → 84.7% (+3.9%)
- No code changes required, just test.skip()
- Clean separation of "broken" vs "not implemented"

**Cons**:
- Tests remain unrun until features implemented
- Need to track which tests are skipped

**Implementation Effort**: 15 minutes

**Expected Result**: 387 passing / 70 failing (84.7% pass rate)

### Phase 2-3: Fix Job Details & UI (3-5 hours)

**Description**: Fix 62 job details/UI tests - likely simple selector and timing issues

**Approach**:
1. Run single test file in UI mode: `npx playwright test --ui frontend/e2e/tests/05-job-details.spec.ts`
2. Identify common patterns (similar to frontend unit test fixes)
3. Fix selectors: use `data-testid` instead of text matching
4. Add `waitFor()` for async operations
5. Fix button visibility checks
6. Apply fixes to all `05*.spec.ts` files

**Pros**:
- Largest impact category (62 tests, 67% of failures)
- Likely simple fixes (similar to frontend unit test issues just fixed)
- Fast iteration with targeted test execution

**Cons**:
- Requires investigation time to identify patterns
- May uncover additional issues

**Implementation Effort**: 3-5 hours (1-2 hrs investigation + 2-3 hrs fixes)

**Expected Result**: ~427 passing / ~30 failing (93.4% pass rate)

### Phase 4: Fix Email Integration (2-3 hours)

**Description**: Fix 8 email integration tests - sync workflow timing issues

**Approach**:
1. Run email tests: `npx playwright test -g "email"`
2. Fix API mocking issues
3. Fix sync workflow timing (add proper waits)
4. Fix stats update verification timing

**Pros**:
- Critical workflow validation
- Smaller scope (8 tests)
- Achieves 95%+ goal

**Cons**:
- More complex than UI fixes
- May require backend changes

**Implementation Effort**: 2-3 hours

**Expected Result**: ~435 passing / ~22 failing (95.2% pass rate) ✅

## Decision

**Recommended**: Execute all 4 phases sequentially

**Rationale**:
- Phase 1 provides instant improvement (15 min investment)
- Phases 2-3 fix majority of failures (largest impact)
- Phase 4 achieves 95%+ goal (release-ready)
- Total effort: 6-8 hours spread over 2-3 sessions

**Alternative**: Skip Phase 4 if 93.4% pass rate is acceptable

## Implementation

### Targeted Test Execution (Fast Iteration)

**Key Commands** (avoid 20-minute full suite runs):

```bash
# Run single file (30 sec - 2 min)
npx playwright test frontend/e2e/tests/05-job-details.spec.ts

# Run pattern (e.g., all job details tests)
npx playwright test -g "Job Details"

# Re-run only failed tests
npx playwright test --last-failed

# Visual debugging (fastest iteration)
npx playwright test --ui

# Run specific test by line number
npx playwright test frontend/e2e/tests/05-job-details.spec.ts:82
```

### Phase 1 Checklist

- [ ] Add `test.skip()` to job scoring tests
- [ ] Add `test.skip()` to extraction badge tests
- [ ] Add `test.skip()` to mobile responsive tests
- [ ] Add `test.skip()` to performance tests
- [ ] Add `test.skip()` to token/cost tracking tests
- [ ] Run: `npx playwright test` to verify skips work
- [ ] Commit: "test: Skip unimplemented feature E2E tests"

### Phase 2-3 Checklist

- [ ] Run `05-job-details.spec.ts` in UI mode
- [ ] Identify common failure patterns
- [ ] Fix selectors (use `data-testid`)
- [ ] Add `waitFor()` for async operations
- [ ] Fix button visibility checks
- [ ] Apply fixes to all `05*.spec.ts` files
- [ ] Run: `npx playwright test frontend/e2e/tests/05*.spec.ts`
- [ ] Commit: "fix: E2E test selectors and timing issues"

### Phase 4 Checklist

- [ ] Run email tests in debug mode
- [ ] Fix API mocking issues
- [ ] Fix sync workflow timing
- [ ] Fix stats update verification
- [ ] Run: `npx playwright test -g "email"`
- [ ] Commit: "fix: E2E email integration test timing"

## Testing

**Test Commands:**

```bash
# Phase 1: Verify skips work
npx playwright test

# Phase 2-3: Run job details tests
npx playwright test frontend/e2e/tests/05*.spec.ts --project=chromium
npx playwright test --ui  # Visual debugging

# Phase 4: Run email integration tests
npx playwright test -g "email" --project=chromium

# Full validation after all phases
./helper-scripts/run-e2e-tests.sh
```

**Verification:**
- [ ] Phase 1: Pass rate 80.8% → 84.7% (22 tests skipped)
- [ ] Phase 2-3: Pass rate 84.7% → 93.4% (~40-50 tests fixed)
- [ ] Phase 4: Pass rate 93.4% → 95.2% (~6-8 tests fixed)
- [ ] Final: 95%+ pass rate achieved (max 25 failures)

## Status History

- 2025-11-07: ISSUE-035 created with comprehensive fix plan

## Notes

**Why 20 minutes for full suite?**
- Global setup/teardown (database seeding)
- Web server startup (2 min)
- ~500 tests with retries
- Multiple browser projects (chromium + mobile)
- Full suite runs everything sequentially

**Fast iteration strategy**: Run targeted test files (30 sec - 2 min) instead of full suite

**Success Metrics**:

| Phase | Time | Pass Rate | Improvement |
|-------|------|-----------|-------------|
| Current | - | 80.8% | - |
| Phase 1 | 15 min | 84.7% | +3.9% |
| Phase 2-3 | 3-5 hrs | 93.4% | +8.7% |
| Phase 4 | 2-3 hrs | 95.2% | +1.8% |
| **Total** | **6-8 hrs** | **95.2%** | **+14.4%** |

**Related Documentation**: Full detailed plan in `docs/E2E_TEST_FIX_PLAN.md`

## Related Files

**E2E Test Files:**
- `frontend/e2e/tests/05-job-details.spec.ts` - Job details UI tests (major failures)
- `frontend/e2e/tests/05-phase-3.1.5-testing-refinement.spec.ts` - Job workflow tests
- `frontend/e2e/tests/05b-new-job-badges.spec.ts` - Badge display tests
- `frontend/e2e/tests/03-job-status-updates.spec.ts` - Status update tests
- `frontend/e2e/tests/06-job-badge-styling.spec.ts` - Extraction badges (skip)
- `frontend/e2e/tests/08-responsive-design.spec.ts` - Mobile tests (skip)
- `frontend/e2e/tests/10-performance.spec.ts` - Performance tests (skip)

**Configuration:**
- `frontend/playwright.config.ts` - Playwright configuration
- `docs/E2E_TEST_FIX_PLAN.md` - Full detailed fix plan
