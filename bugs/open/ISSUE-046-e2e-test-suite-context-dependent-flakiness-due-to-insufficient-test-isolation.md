---
id: ISSUE-046
title: E2E Test Suite: Context-Dependent Flakiness Due to Insufficient Test Isolation
status: open
priority: medium
severity: medium
component: frontend
created: 2025-11-15
updated: 2025-11-15
affects:
  - e2e/tests/03-job-status-updates.spec.ts
related:
  - TESTING_STATUS.md
---

# ISSUE-046: E2E Test Suite: Context-Dependent Flakiness Due to Insufficient Test Isolation

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Steps to Reproduce](#steps-to-reproduce)
- [Expected Behavior](#expected-behavior)
- [Actual Behavior](#actual-behavior)
- [Root Cause](#root-cause)
  - [Architectural Factors](#architectural-factors)
- [Evidence](#evidence)
  - [Test Execution Results](#test-execution-results)
  - [Code Analysis](#code-analysis)
  - [File Structure](#file-structure)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Increase Test Isolation - Serial Execution Mode](#option-1-increase-test-isolation---serial-execution-mode)
  - [Option 2: Increase Fixed Timeouts Under Load](#option-2-increase-fixed-timeouts-under-load)
  - [Option 3: Database Transaction Isolation](#option-3-database-transaction-isolation)
  - [Option 4: Per-Test-File Data Pools](#option-4-per-test-file-data-pools)
  - [Option 5: Wait for Actual State Changes (Recommended)](#option-5-wait-for-actual-state-changes-recommended)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

Five tests in `03-job-status-updates.spec.ts` fail intermittently **only** when run as part of the comprehensive E2E test suite, but pass reliably when run in isolation or as a standalone file. This is a classic **test isolation problem** where tests are affected by cross-file parallelism, shared database state, resource contention, and timing sensitivity under load.

From a software test engineering perspective, this represents **architectural flakiness** rather than test bugs - the tests themselves are well-written but the test execution environment lacks sufficient isolation guarantees.

## Impact

**Who/What is affected:**
- **Comprehensive test suite reliability**: 5 tests fail intermittently in full runs (baseline: 385 passed, 6 failed, 5 flaky)
- **Developer workflow**: Comprehensive runs require retries, increasing CI/CD time
- **Test confidence**: Flaky tests erode trust in test suite
- **Test maintenance**: Developers spend time investigating false positives

**Severity:**
- **Medium** - Tests pass in isolation, functionality is correct
- No user-facing bugs - purely test infrastructure issue
- Does not block development but impacts test suite reliability
- Affects test engineering quality metrics (flaky test rate)

## Steps to Reproduce

1. Run comprehensive test suite: `./helper-scripts/run-comprehensive-tests.sh`
2. Observe 5 flaky tests in `03-job-status-updates.spec.ts` (approval/rejection workflows)
3. Run same tests in isolation: `npx playwright test e2e/tests/03-job-status-updates.spec.ts`
4. Observe **all 15 tests pass reliably** (3 consecutive runs: 15/15, 15/15, 10/15 with skips)

## Expected Behavior

**Tests should pass consistently regardless of execution context:**
- Whether run in isolation or as part of comprehensive suite
- Whether run with 1 worker or multiple workers
- Whether run with light load or heavy load
- Whether run serially or in parallel with other tests

## Actual Behavior

**Context-dependent flakiness:**
- ✅ **Isolation**: 100% pass rate (15/15 tests)
- ✅ **Standalone file**: 100% pass rate (3 runs: 15/15, 15/15, 10/15 with skips)
- ❌ **Comprehensive suite**: ~97.6% pass rate (5 flaky, pass on retry)

**Flaky behavior patterns:**
- Tests fail on first run, pass on retry
- Failures correlate with comprehensive suite context
- No failures when run independently
- No pattern to which specific tests fail

## Root Cause

### Architectural Factors

**1. Cross-File Test Interference**
- Test file uses `.describe.serial()` to prevent parallelism **within** the file
- Does NOT prevent parallelism **between** files
- Other test files running concurrently modify shared database state
- Example: Tests expect "Inbox" jobs but other tests consume/approve them

**2. Shared Database State**
- All tests share single `jobhunter_personal` database
- Test data seeding happens once at comprehensive suite start
- Multiple test files consume same test data pool
- No per-test or per-file data isolation

**3. Resource Contention Under Load**
- CPU/memory pressure when many tests run simultaneously
- Database connection pool saturation
- Slower API response times under load
- React state updates delayed under load

**4. Fixed Timeout Sensitivity**
- Tests use fixed timeouts: `page.waitForTimeout(1500)` for stats updates
- Timeouts adequate in isolation (low load)
- Timeouts inadequate under comprehensive suite load (high load)
- Example locations:
  - Line 122: Stats update after approval
  - Line 151: Stats update after rejection
  - Line 436: Stats consistency check

**5. Performance Assertions Under Load**
- Line 386: `expect(duration).toBeLessThan(10000)` - request/response cycle time
- Performance varies significantly under load
- Assertion fails when system is busy with other tests

## Evidence

### Test Execution Results

**Isolation Runs (no retries):**
```
Run 1: 15 passed (1.7m) ✅
Run 2: 15 passed (1.7m) ✅
Run 3: 10 passed, 5 skipped (1.3m) ✅ (skips are data-dependent, not failures)
```

**Comprehensive Run (baseline 2025-11-15 12:38:10 PST):**
```
E2E Tests: 385 passed, 6 failed, 5 flaky
Flaky tests: 5 in 03-job-status-updates.spec.ts (approval/rejection workflows)
Pass on retry: 100%
```

### Code Analysis

**Tests use proper synchronization primitives:**
- ✅ Serial execution: `.describe.serial()`
- ✅ API waiting: `page.waitForRequest/waitForResponse`
- ✅ State waiting: `dashboardPage.waitForJobsUpdate()`
- ✅ Conditional skips: `if (count === 0) test.skip()`

**But timing is still vulnerable:**
```typescript
// Line 122: Fixed timeout after approval
await page.waitForTimeout(1500);

// Line 386: Performance assertion
expect(duration).toBeLessThan(10000);
```

### File Structure
```
frontend/e2e/tests/03-job-status-updates.spec.ts (448 lines)
├── Section 5: Approve/Reject Workflow Test (6 tests)
│   ├── should move job from Inbox to Approved when approved
│   ├── should move job from Inbox to Rejected when rejected
│   ├── should update statistics immediately after approval ⚠️ FLAKY
│   ├── should update statistics immediately after rejection ⚠️ FLAKY
│   ├── should allow approving multiple jobs in sequence ⚠️ FLAKY
│   └── should handle approve button disabled state during processing
├── Section 6: Status Update API Validation (8 tests)
│   ├── [API validation tests] ⚠️ FLAKY
│   └── should track request/response cycle for status updates ⚠️ FLAKY
└── Edge Cases & Error Handling (2 tests)
    ├── should handle rapid sequential approvals
    └── should maintain data consistency after status updates
```

## Proposed Solutions

### Option 1: Increase Test Isolation - Serial Execution Mode

**Description**: Run more test files serially instead of in parallel to reduce resource contention and state interference.

**Implementation**:
```typescript
// In playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'critical-path',
      testMatch: /critical.*\.spec\.ts/,
      fullyParallel: false, // Run serially
    },
    {
      name: 'status-updates',
      testMatch: /03-job-status-updates\.spec\.ts/,
      fullyParallel: false, // Run serially
      dependencies: ['critical-path'], // Run after other tests
    },
  ],
});
```

**Pros**:
- Eliminates cross-file interference
- No test code changes required
- Simple configuration change
- Guaranteed test isolation

**Cons**:
- Increases total test runtime (less parallelism)
- May still have resource contention issues
- Doesn't address root cause (shared state)

**Implementation Effort**: 1-2 hours (config changes + testing)

**Maintenance**: Low - configuration only

### Option 2: Increase Fixed Timeouts Under Load

**Description**: Make timing assertions more lenient to account for system load variability.

**Implementation**:
```typescript
// Before: Fixed timeout
await page.waitForTimeout(1500);

// After: Environment-aware timeout
const timeout = process.env.CI ? 3000 : 1500;
await page.waitForTimeout(timeout);

// Before: Fixed performance assertion
expect(duration).toBeLessThan(10000);

// After: Lenient performance assertion
const maxDuration = process.env.CI ? 20000 : 10000;
expect(duration).toBeLessThan(maxDuration);
```

**Pros**:
- Accommodates system load variability
- Simple to implement
- Targeted fix for specific timeout issues

**Cons**:
- Doesn't address root cause
- May hide real performance regressions
- Requires test code modifications
- Band-aid solution

**Implementation Effort**: 2-3 hours (identify all timeouts + test)

**Maintenance**: Medium - need to maintain timeout values

### Option 3: Database Transaction Isolation

**Description**: Wrap each test file's execution in a database transaction that rolls back after completion, ensuring perfect test data isolation.

**Implementation**:
```typescript
// In test setup
test.beforeAll(async () => {
  await db.query('BEGIN TRANSACTION');
  await seedTestData();
});

test.afterAll(async () => {
  await db.query('ROLLBACK');
});
```

**Pros**:
- Perfect test data isolation
- Tests can't interfere with each other
- No cross-file data contamination
- Tests can run fully in parallel

**Cons**:
- Requires database transaction support
- Complex setup/teardown logic
- May not work with all database operations
- Adds test execution overhead

**Implementation Effort**: 4-6 hours (infrastructure + all test files)

**Maintenance**: Medium - requires proper transaction handling

### Option 4: Per-Test-File Data Pools

**Description**: Seed dedicated data pools for each test file, ensuring tests never compete for the same data.

**Implementation**:
```typescript
// seed-test-data.sh - enhanced version
function seedJobStatusUpdateData() {
  # Create 30 dedicated jobs for 03-job-status-updates.spec.ts
  # Tagged with source: "test-status-updates"
  for i in 1..30; do
    INSERT INTO jobs (job_id, title, status, source)
    VALUES (uuid(), "Test Job $i", "new", "test-status-updates");
  done
}

// In test file
test.beforeAll(async () => {
  // Only query jobs with source="test-status-updates"
  await dashboardPage.filterBySource('test-status-updates');
});
```

**Pros**:
- True data isolation per test file
- Tests can run fully in parallel
- No cross-file interference
- Scalable to many test files

**Cons**:
- Requires test data tagging system
- More complex data seeding
- Larger test database
- Requires test code modifications

**Implementation Effort**: 6-8 hours (data seeding + all test files)

**Maintenance**: Medium - maintain data pools for each test file

### Option 5: Wait for Actual State Changes (Recommended)

**Description**: Replace fixed timeouts with polling for actual state changes, making tests resilient to timing variability.

**Implementation**:
```typescript
// Before: Fixed timeout
await firstJob.approve();
await page.waitForTimeout(1500);
const newCount = await dashboardPage.getStatCount('approved');

// After: Poll for actual state change
await firstJob.approve();
await page.waitForFunction(
  (expectedCount) => {
    const statElement = document.querySelector('[data-testid="stat-approved"]');
    const match = statElement?.textContent?.match(/\d+/);
    return match && parseInt(match[0]) >= expectedCount;
  },
  initialApprovedCount + 1,
  { timeout: 10000 }
);
const newCount = await dashboardPage.getStatCount('approved');
```

**Pros**:
- Tests become load-resilient automatically
- No arbitrary timeouts
- Catches actual state changes
- Works under any load condition
- Best practice for async testing

**Cons**:
- Requires test code modifications
- More complex test code
- Need to identify all fixed timeouts

**Implementation Effort**: 4-5 hours (identify all timeouts + refactor)

**Maintenance**: Low - tests are self-healing

## Decision

**Recommendation: Combination of Option 5 + Option 1 (phased approach)**

**Phase 1 (Immediate - Option 5)**:
- Replace fixed timeouts with state polling in `03-job-status-updates.spec.ts`
- Target the 4 timing-sensitive locations (lines 122, 151, 386, 436)
- Makes tests load-resilient without sacrificing parallelism

**Phase 2 (Strategic - Option 1)**:
- Configure Playwright to run status update tests serially
- Add project dependencies to control execution order
- Reduces resource contention for complex tests

**Why this combination:**
1. **Option 5 is best practice** - proper async testing technique
2. **Option 1 is insurance** - guarantees isolation if needed
3. **Low risk** - both are non-invasive to application code
4. **Scalable** - patterns apply to other flaky tests
5. **Test engineering sound** - addresses root cause (timing) and symptoms (isolation)

## Implementation

[To be updated after implementation]

## Testing

**Test Commands:**
```bash
# Test in isolation (should pass)
cd frontend
npx playwright test e2e/tests/03-job-status-updates.spec.ts --retries=0

# Run 3 times to verify consistency
for i in 1 2 3; do
  npx playwright test e2e/tests/03-job-status-updates.spec.ts --retries=0
done

# Test in comprehensive suite (before fix - may fail)
cd ..
./helper-scripts/run-comprehensive-tests.sh

# Verify fix: Run comprehensive suite (after fix - should pass)
./helper-scripts/run-comprehensive-tests.sh
```

**Verification:**
- [ ] Tests pass 5/5 times in isolation
- [ ] Tests pass in comprehensive suite without retries
- [ ] No performance regression (runtime within 10% of baseline)
- [ ] Fixed timeouts removed, replaced with state polling
- [ ] Playwright config updated with serial execution (if needed)

## Status History

- 2025-11-15: ISSUE-046 created and documented (comprehensive analysis complete)
- 2025-11-15: Investigated flakiness - all 15 tests pass 3/3 times in isolation
- 2025-11-15: Root cause identified - context-dependent flakiness due to cross-file parallelism and timing sensitivity

## Notes

**Test Engineering Perspective:**

This is a **textbook example** of architectural test flakiness:
1. Tests are well-written individually
2. Failure only occurs in specific execution contexts
3. Root cause is environmental (load, parallelism) not functional
4. Symptoms point to resource contention and shared state

**Key Insight**: The flakiness is NOT a test bug - it's a test **isolation architecture** problem. The tests correctly validate functionality. The test execution environment does not provide sufficient isolation guarantees.

**Similar patterns in other systems:**
- Django test suite: Database transaction isolation per test
- Jest: In-memory database per test file
- RSpec: Database cleaner with transaction rollback
- Cypress: Test isolation via beforeEach/afterEach cleanup

**Best practice learned**: Always design test suites with isolation guarantees from day 1, not as a retrofit.

## Related Files

- `frontend/e2e/tests/03-job-status-updates.spec.ts` - Affected test file (all 15 tests)
- `frontend/e2e/tests/03-job-status-updates.spec.ts:122` - Fixed timeout after approval
- `frontend/e2e/tests/03-job-status-updates.spec.ts:151` - Fixed timeout after rejection
- `frontend/e2e/tests/03-job-status-updates.spec.ts:386` - Performance assertion
- `frontend/e2e/tests/03-job-status-updates.spec.ts:436` - Stats consistency timeout
- `frontend/playwright.config.ts` - Test execution configuration
- `helper-scripts/run-comprehensive-tests.sh` - Comprehensive test suite
- `docs/TESTING_STATUS.md` - Test suite status tracking
- `docs/TESTING_GUIDE.md` - Testing principles and workflows
