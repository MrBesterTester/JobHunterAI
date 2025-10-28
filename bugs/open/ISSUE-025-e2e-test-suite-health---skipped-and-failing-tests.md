---
id: ISSUE-025
title: E2E Test Suite Health - Skipped and Failing Tests
status: open
priority: medium
severity: medium
component: frontend
created: 2025-10-28
updated: 2025-10-28
affects: [e2e-testing, test-reliability, ci-cd]
related: [ISSUE-018]
---

# ISSUE-025: E2E Test Suite Health - Skipped and Failing Tests

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Current State](#current-state)
- [Expected Behavior](#expected-behavior)
- [Actual Behavior](#actual-behavior)
- [Root Cause](#root-cause)
- [Evidence](#evidence)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Investigation Phase (Recommended First Step)](#option-1-investigation-phase-recommended-first-step)
  - [Option 2: Quick Fixes for Known Issues](#option-2-quick-fixes-for-known-issues)
  - [Option 3: Optimize Test Execution](#option-3-optimize-test-execution)
  - [Option 4: Disable E2E Tests Temporarily](#option-4-disable-e2e-tests-temporarily)
  - [Option 5: Hybrid Approach (Recommended)](#option-5-hybrid-approach-recommended)
- [Decision](#decision)
- [Implementation Plan](#implementation-plan)
  - [Phase 1: Investigation & Analysis (4-8 hours)](#phase-1-investigation--analysis-4-8-hours)
  - [Phase 2: Quick Wins (2-4 hours)](#phase-2-quick-wins-2-4-hours)
  - [Phase 3: Systematic Fixes (20-30 hours)](#phase-3-systematic-fixes-20-30-hours)
  - [Phase 4: Maintenance (Ongoing)](#phase-4-maintenance-ongoing)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

**Context**: E2E (end-to-end) test suite has significant health issues identified in the Oct 23, 2025 test report.

**Problem**:
- **219 of 544 tests passed** (40.3% pass rate)
- **76 tests failing**
- **248 tests skipped** (due to 20-minute global timeout)
- **1 flaky test**

**Scope**: Investigate and fix E2E test suite to achieve reliable, comprehensive browser-based testing.

**Priority**: Medium - Unit tests provide good coverage (78.3%), but E2E tests validate full user workflows and are critical for production confidence.

## Impact

**Who/What is affected:**
- **Developers**: Cannot trust E2E tests to catch integration issues
- **CI/CD Pipeline**: E2E tests likely failing or disabled in CI
- **Production Confidence**: Missing validation of complete user workflows
- **Deployment Risk**: No automated browser-based validation before releases

**Severity**: **Medium**
- Unit test suite is strong (78.3% coverage, 481 tests passing)
- E2E tests validate different aspects (integration, browser behavior, full workflows)
- Both test types are complementary, not redundant
- Low E2E pass rate undermines confidence in production readiness

## Current State

**E2E Test Status** (as of Oct 23, 2025):

| Metric | Value | Notes |
|--------|-------|-------|
| **Total Tests** | 544 | Full suite |
| **Passed** | 219 (40.3%) | Less than half passing |
| **Failed** | 76 (14.0%) | Need investigation |
| **Skipped** | 248 (45.6%) | Due to global timeout |
| **Flaky** | 1 | Intermittent failure |
| **Runtime** | 20min (timeout) | Actual: 53 minutes |

**Test Files**: 38 E2E spec files in `frontend/e2e/tests/`

**Framework**: Playwright (supports Chromium, Firefox, WebKit)

**Reference**: [README_test-report-10-23-2025.md](../README_test-report-10-23-2025.md)

## Expected Behavior

E2E test suite should:
- Have 90%+ pass rate (excluding intentionally skipped tests)
- Complete within reasonable time (<10 minutes for full suite)
- Provide reliable validation of user workflows
- Run successfully in CI/CD pipeline
- Catch integration issues that unit tests miss

## Actual Behavior

**Problems Identified:**

1. **Low Pass Rate (40.3%)**
   - Only 219 of 544 tests passing
   - Indicates widespread issues with test reliability or app functionality

2. **76 Failing Tests (14.0%)**
   - Need investigation to determine:
     - Are these app bugs?
     - Are these test bugs (incorrect expectations)?
     - Are these environment issues (timing, setup)?

3. **248 Skipped Tests (45.6%)**
   - Test suite hit 20-minute global timeout
   - 248 tests never ran
   - Actual runtime was 53 minutes before manual termination
   - Indicates severe performance issues

4. **Slow Execution**
   - Expected: <10 minutes
   - Actual: 53 minutes (2.6x longer than timeout, 5.3x slower than target)
   - Suggests tests are waiting, timing out, or running inefficiently

5. **Flaky Test**
   - 1 test has intermittent pass/fail behavior
   - Reduces confidence in test results

## Root Cause

**Hypothesis (requires investigation)**:

1. **Timeout Issues**:
   - Tests may be waiting too long for elements
   - Backend API calls may be slow or timing out
   - Database queries may be slow
   - Test isolation issues (state bleeding between tests)

2. **Test Configuration**:
   - Global timeout (20 min) may be too aggressive
   - Individual test timeouts may be too long
   - Parallelization not optimized
   - Retries configured incorrectly

3. **Backend/Database Dependencies**:
   - Tests require backend running (localhost:8080)
   - Database must be populated with test data
   - Network latency or database performance issues
   - Backend may be crashing or hanging during tests

4. **Test Quality**:
   - Tests may have incorrect expectations (causing false failures)
   - Selectors may be brittle (elements not found)
   - Race conditions in tests (async timing issues)

5. **Outdated Tests**:
   - Tests written for older version of UI
   - Component structure changed but tests not updated
   - API contracts changed but mocks not updated

## Evidence

**From Oct 23, 2025 Test Report:**

```
E2E Test Suite (Playwright)
- Total: 544 tests
- Passed: 219 (40.3%)
- Failed: 76 (14.0%)
- Skipped: 248 (45.6%)
- Flaky: 1
- Runtime: 20 minutes (global timeout), actual 53 minutes
```

**Test File Structure:**
```
frontend/e2e/
├── tests/              # 38 E2E spec files
│   ├── 01-setup-load.spec.ts
│   ├── 02-tab-navigation.spec.ts
│   ├── 03-job-status-updates.spec.ts
│   ├── 04-content-generation-integration.spec.ts
│   ├── 05-job-details.spec.ts
│   └── ... (33 more files)
├── pages/              # Page Object Models
├── fixtures/           # Test data and helpers
└── README.md
```

**Test Commands:**
```bash
# Run E2E tests
cd frontend
npm run test:e2e                  # Chromium only
npm run test:e2e:headed           # Visible browser
npm run test:e2e:ui               # Interactive mode
npm run test:e2e:chromium         # Specific browser
npm run test:e2e:report           # View results
```

**Documentation**: `frontend/e2e/README.md` claims "163 Automated Tests Implemented (100% Coverage)"
- **Discrepancy**: Report shows 544 tests, not 163
- Suggests documentation is outdated

## Proposed Solutions

### Option 1: Investigation Phase (Recommended First Step)

**Priority**: **HIGH** - Must understand root cause before fixing

**Description**: Run E2E tests in current state and analyze failures systematically

**Investigation Steps**:
1. **Run current E2E suite**:
   ```bash
   cd frontend
   npm run test:e2e:headed  # Watch tests run
   npm run test:e2e:report  # Review failures
   ```

2. **Categorize failures**:
   - App bugs (real issues)
   - Test bugs (incorrect expectations)
   - Environment issues (timing, setup)
   - Flaky tests (intermittent)

3. **Analyze skipped tests**:
   - Why did suite timeout?
   - Which tests are slowest?
   - Are there infinite loops or hangs?

4. **Check prerequisites**:
   - Is backend running correctly?
   - Is database populated with correct test data?
   - Are there missing environment variables?

5. **Review test configuration**:
   - `playwright.config.ts` settings
   - Timeout values
   - Parallelization settings
   - Retry configuration

**Pros**:
- Provides data-driven understanding of problems
- Identifies quick wins vs. long-term fixes
- Prevents wasted effort on wrong solutions

**Cons**:
- Takes time (4-8 hours) before fixes can start

**Implementation Effort**: **4-8 hours** (investigation only)

**Deliverable**: Detailed report of failures categorized by root cause

---

### Option 2: Quick Fixes for Known Issues

**Priority**: **MEDIUM** - Can be done in parallel with investigation

**Description**: Address common E2E test issues immediately

**Quick Fixes**:
1. **Increase global timeout**: 20min → 30min (handle slow runs)
2. **Update dependencies**: Playwright, browser drivers
3. **Reduce parallelization**: Fewer workers = less contention
4. **Add explicit waits**: Ensure elements exist before interacting
5. **Fix flaky test**: Identify and stabilize the 1 flaky test

**Pros**:
- Can improve pass rate quickly
- Low risk (configuration changes)
- May unblock some failing tests

**Cons**:
- Treats symptoms, not root cause
- May hide real issues (longer timeouts mask problems)

**Implementation Effort**: **2-4 hours**

**Maintenance**: May need further tuning

---

### Option 3: Optimize Test Execution

**Priority**: **MEDIUM** - Addresses performance issues

**Description**: Make E2E suite run faster and more reliably

**Optimization Strategies**:
1. **Reduce test scope**:
   - Split into critical vs. nice-to-have tests
   - Run critical tests in CI, full suite nightly

2. **Improve parallelization**:
   - Configure optimal worker count
   - Ensure test isolation (no shared state)

3. **Mock slow operations**:
   - Mock LLM API calls (content generation)
   - Use in-memory database for tests
   - Pre-populate test data efficiently

4. **Optimize selectors**:
   - Use data-testid attributes
   - Avoid brittle CSS selectors
   - Reduce wait times for fast operations

5. **Improve test data setup**:
   - Use global setup for database seeding
   - Reset between tests efficiently
   - Share fixtures across tests

**Pros**:
- Faster execution = faster feedback
- More reliable tests
- Better developer experience

**Cons**:
- Requires significant refactoring
- May take weeks to complete

**Implementation Effort**: **20-40 hours** (major refactor)

**Maintenance**: Ongoing optimization as suite grows

---

### Option 4: Disable E2E Tests Temporarily

**Priority**: **LOW** - Not recommended

**Description**: Disable E2E tests until they can be fixed properly

**Pros**:
- Unblocks CI/CD pipeline immediately
- Allows focus on unit tests (which are working well)

**Cons**:
- Loses integration test coverage
- Misses browser-specific bugs
- Reduces production confidence
- Tests will rot further if disabled long-term

**Implementation Effort**: **0 hours** (just disable)

**Maintenance**: Tests become harder to fix the longer they're disabled

**Recommendation**: **Do not choose this option**

---

### Option 5: Hybrid Approach (Recommended)

**Priority**: **HIGH** - Best balance of short and long term

**Description**: Combine investigation, quick fixes, and incremental optimization

**Phased Approach**:

**Phase 1: Investigation (Week 1)**
- Run tests and categorize failures
- Identify quick wins and long-term work
- Document findings in this issue

**Phase 2: Quick Wins (Week 2)**
- Fix flaky test
- Update configuration (timeouts, parallelization)
- Fix obvious test bugs (wrong expectations)
- Update outdated selectors

**Phase 3: Systematic Fixes (Weeks 3-4)**
- Fix app bugs identified in Phase 1
- Optimize slowest tests
- Improve test isolation
- Update test documentation

**Phase 4: Long-term Health (Ongoing)**
- Monitor E2E test health in CI
- Keep tests updated with UI changes
- Maintain <10 minute execution time
- Keep pass rate >90%

**Pros**:
- Balances speed and thoroughness
- Shows progress incrementally
- Identifies issues before fixing
- Sustainable long-term approach

**Cons**:
- Takes multiple weeks
- Requires dedicated focus

**Implementation Effort**: **40-60 hours** (spread over 4-6 weeks)

**Maintenance**: Ongoing monitoring and updates

## Decision

**Recommendation**: **Option 5 (Hybrid Approach)**

**Reasoning**:
1. Investigation is critical - can't fix what we don't understand
2. Quick wins provide immediate value
3. Systematic fixes ensure long-term health
4. Incremental progress is sustainable

**First Step**: Run E2E tests now and analyze results (Option 1, Phase 1)

## Implementation Plan

### Phase 1: Investigation & Analysis (4-8 hours)

**Goal**: Understand current E2E test failures

**Tasks**:
1. **Run E2E suite**:
   ```bash
   cd frontend
   # Start backend first
   cd ../backend && cargo run &

   # Run E2E tests
   cd ../frontend
   npm run test:e2e:headed     # Watch failures
   npm run test:e2e:report     # Review detailed report
   ```

2. **Categorize failures**:
   - Create spreadsheet of 76 failing tests
   - Classify each: app bug, test bug, timing issue, etc.
   - Identify patterns (same component, same type of failure)

3. **Analyze skipped tests**:
   - Identify which tests are slowest
   - Check for infinite loops or hangs
   - Review timeout configuration

4. **Document findings**:
   - Update this issue with detailed analysis
   - Create sub-issues for specific bugs found
   - Prioritize fixes by impact

**Deliverable**: Detailed report of E2E test health

---

### Phase 2: Quick Wins (2-4 hours)

**Goal**: Improve pass rate with minimal effort

**Tasks**:
1. Fix flaky test (1 test)
2. Update Playwright to latest version
3. Adjust timeout configuration if needed
4. Fix obvious test bugs (wrong expectations)
5. Update brittle selectors

**Deliverable**: Improved pass rate (target: 60%+)

---

### Phase 3: Systematic Fixes (20-30 hours)

**Goal**: Address root causes of failures

**Tasks**:
1. Fix app bugs identified in Phase 1
2. Optimize slowest tests
3. Improve test isolation
4. Refactor brittle tests
5. Update test documentation

**Deliverable**: E2E suite with 90%+ pass rate, <10 min runtime

---

### Phase 4: Maintenance (Ongoing)

**Goal**: Keep E2E tests healthy long-term

**Tasks**:
1. Monitor E2E test results in CI
2. Update tests when UI changes
3. Add new E2E tests for new features
4. Review and optimize quarterly

**Deliverable**: Sustainable E2E test suite

## Testing

**Test Commands:**
```bash
# Prerequisites: Start backend and ensure database is populated
cd backend
cargo run &

# Run E2E tests
cd frontend

# Run all tests (Chromium)
npm run test:e2e

# Run with visible browser (helpful for debugging)
npm run test:e2e:headed

# Run interactive UI mode
npm run test:e2e:ui

# Run specific test file
npm run test:e2e tests/01-setup-load.spec.ts

# Debug specific test
npm run test:e2e:debug tests/02-tab-navigation.spec.ts

# Multi-browser testing
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# View test results
npm run test:e2e:report
```

**Verification:**
- [ ] E2E pass rate >90% (excluding intentional skips)
- [ ] Full suite completes <10 minutes
- [ ] No flaky tests
- [ ] All 76 failing tests either fixed or documented
- [ ] 248 skipped tests either run or intentionally skipped
- [ ] Tests run successfully in CI

## Status History

- 2025-10-28: ISSUE-025 created based on Oct 23, 2025 test report findings

## Notes

**E2E vs Unit Tests - Complementary Coverage:**

| Aspect | Unit Tests (Jest) | E2E Tests (Playwright) |
|--------|------------------|------------------------|
| **Coverage** | 78.3% code coverage | User workflow coverage |
| **Speed** | Fast (~20s) | Slow (target <10min) |
| **Scope** | Component behavior | Full app integration |
| **Browser** | jsdom (simulated) | Real browsers |
| **Backend** | Mocked APIs | Real backend required |
| **Purpose** | TDD, fast feedback | Production confidence |
| **Status** | ✅ Healthy (481 tests) | ⚠️ Needs work (40% pass) |

**Why both are needed:**
- Unit tests catch logic bugs quickly
- E2E tests catch integration bugs, browser issues, full workflow problems
- Unit tests enable TDD; E2E tests validate production readiness

**Related to ISSUE-018:**
- ISSUE-018 focused exclusively on frontend **unit tests** (Jest)
- ISSUE-025 addresses **E2E tests** (Playwright) - completely separate suite
- Both test types are important and complementary

## Related Files

**E2E Test Suite**:
- `frontend/e2e/tests/` - 38 E2E spec files
- `frontend/e2e/README.md` - E2E test documentation
- `frontend/playwright.config.ts` - Playwright configuration
- `frontend/e2e/pages/` - Page Object Models
- `frontend/e2e/fixtures/` - Test data and helpers

**Test Results**:
- `frontend/playwright-report/` - HTML test reports
- `frontend/test-results/` - Test artifacts (screenshots, videos)

**Reference Documentation**:
- [README_test-report-10-23-2025.md](../README_test-report-10-23-2025.md) - Initial E2E findings
- [TESTING_STATUS.md](../docs/TESTING_STATUS.md) - Overall test status

**Related Issues**:
- [ISSUE-018](../bugs/fixed/ISSUE-018-frontend-unit-test-implementation.md) - Frontend unit tests (closed)
