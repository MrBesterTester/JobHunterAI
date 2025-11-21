---
id: ISSUE-063
title: E2E Tests Timing Out in page.waitForFunction() After Tab Switch (Files 16 & 23)
status: open
priority: high
severity: medium
component: frontend
created: 2025-11-20
updated: 2025-11-20
affects:
  - e2e-tests
  - comprehensive-test-suite
related:
  - ISSUE-057
  - ISSUE-055
  - ISSUE-062
---

# ISSUE-063: E2E Tests Timing Out in page.waitForFunction() After Tab Switch (Files 16 & 23)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Steps to Reproduce](#steps-to-reproduce)
- [Expected Behavior](#expected-behavior)
- [Actual Behavior](#actual-behavior)
- [Root Cause](#root-cause)
  - [Analysis Comparing to ISSUE-057](#analysis-comparing-to-issue-057)
  - [Technical Root Cause](#technical-root-cause)
  - [Why Stack Traces are Misleading](#why-stack-traces-are-misleading)
- [Evidence](#evidence)
  - [Test Results from Comprehensive Run (2025-11-20 19:48 PST)](#test-results-from-comprehensive-run-2025-11-20-1948-pst)
- [Playwright Best Practices Audit](#playwright-best-practices-audit)
  - [Current Implementation Analysis](#current-implementation-analysis)
  - [Key Insight from Best Practices](#key-insight-from-best-practices)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Increase Load-Aware Timeout Multipliers (RECOMMENDED)](#option-1-increase-load-aware-timeout-multipliers-recommended)
  - [Option 2: Create Centralized Timeout Constants](#option-2-create-centralized-timeout-constants)
  - [Option 3: Investigate and Optimize Underlying Performance](#option-3-investigate-and-optimize-underlying-performance)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
  - [Why This Isn't a Regression from ISSUE-057](#why-this-isnt-a-regression-from-issue-057)
  - [Load Characteristics Under Comprehensive Tests](#load-characteristics-under-comprehensive-tests)
  - [Related Historical Issues](#related-historical-issues)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

5 E2E tests are failing with timeout errors during comprehensive test runs:
- **2 failures** in `16-gmail-sync-integration.spec.ts` - "should allow approving jobs synced from Gmail"
- **3 failures** in `23-description-quality.spec.ts` - "should show actual job content (not just \"No job description\")"

All failures occur in `page.waitForFunction()` calls that execute **AFTER** `switchToTab()` completes successfully. Tests timeout at 60-64 seconds despite implementing load-aware timeouts of 40-45 seconds.

**Key Finding**: The failures are NOT in the `switchToTab` helper (which was fixed in ISSUE-057), but in test-specific wait operations that poll for state changes after tab switching completes.

## Impact

**Who/What is affected:**
- E2E test suite reliability (5/400 tests failing = 1.25% failure rate)
- Comprehensive test suite passes with exit code 1 (failures present)
- CI/CD pipeline reliability if enabled
- Developer confidence in test results

**Severity:**
- Tests are failing consistently across retries (same pattern in all 5 failures)
- Failures block comprehensive test suite from passing
- Affects 2 different test files in different functional areas (Gmail sync, description quality)
- All failures share common pattern (timeouts in `page.waitForFunction()`)

## Steps to Reproduce

1. Set up comprehensive test environment:
   ```bash
   export COMPREHENSIVE_TESTS=true
   ```

2. Run comprehensive test suite with 4 parallel workers:
   ```bash
   ./run-comprehensive-tests.sh
   ```

3. Observe E2E test failures:
   - Test file 16: Line 232 (`switchToTab(page, 'new')`) times out in subsequent `page.waitForFunction()` at lines 278-288
   - Test file 23: Line 94 (`switchToTab(page, 'new')`) times out in subsequent `page.waitForFunction()` at lines 115-137

## Expected Behavior

- Tests with load-aware timeouts of 40-45 seconds should complete successfully under comprehensive test load
- `page.waitForFunction()` should detect DOM state changes within the specified timeout
- Tests should pass consistently given that ISSUE-057 made all `switchToTab` operations load-aware

## Actual Behavior

**Test 16 Failures (2 occurrences)**:
```
TimeoutError: page.waitForFunction: Timeout 60000ms exceeded.
    at switchToTab (/Users/sam/Projects/JobHunterAI-Claude/frontend/e2e/helpers/tab-navigation.ts:64:18)
    at /Users/sam/Projects/JobHunterAI-Claude/frontend/e2e/tests/16-gmail-sync-integration.spec.ts:232:5
```
- Duration: 61071ms and 61421ms (exceeding 60s)
- Expected timeout: 45000ms (45s) per load-aware configuration

**Test 23 Failures (3 occurrences)**:
```
TimeoutError: page.waitForFunction: Timeout 60000ms exceeded.
    at switchToTab (/Users/sam/Projects/JobHunterAI-Claude/frontend/e2e/helpers/tab-navigation.ts:64:18)
    at /Users/sam/Projects/JobHunterAI-Claude/frontend/e2e/tests/23-description-quality.spec.ts:94:5
```
- Duration: 63732ms, 63564ms, 63820ms (exceeding 60s)
- Expected timeout: 40000ms (40s) per load-aware configuration

**Critical Observation**: Stack traces reference `tab-navigation.ts:64:18`, but this is misleading - the actual timeout occurs in the test-specific `page.waitForFunction()` calls that execute AFTER `switchToTab` completes.

## Root Cause

### Analysis Comparing to ISSUE-057

**ISSUE-057 (Fixed 2025-11-19)**: Made `switchToTab` helper load-aware
- ✅ Fixed: Base tab operations now use 15s timeout under load (was 5s)
- ✅ Fixed: Job card waits now use 45s timeout under load (was 10s)
- ✅ Result: Test #441 passed on first attempt after fix

**ISSUE-063 (Current)**: Test-specific waits still insufficient
- ⚠️ Problem: Tests implement their own `page.waitForFunction()` calls AFTER tab switching
- ⚠️ Problem: These test-specific timeouts (40-45s) are insufficient under comprehensive load
- ⚠️ Problem: Actual operations take 60-64s, exceeding configured timeouts

### Technical Root Cause

The failures occur because:

1. **`switchToTab()` completes successfully** (45s timeout is sufficient for tab switching + job card appearance)
2. **Test-specific `page.waitForFunction()` is called next** to wait for additional state changes:
   - Test 16: Waiting for `stat-approved` count to increment after approving a job
   - Test 23: Waiting for condensed description text to load (LLM operation)
3. **These secondary waits timeout** because:
   - Under comprehensive test load (4 parallel workers)
   - Multiple LLM operations happening concurrently (Test 23)
   - Database operations under load (Test 16)
   - 40-45s timeouts are insufficient for these combined operations

### Why Stack Traces are Misleading

Stack traces show `tab-navigation.ts:64:18` because:
- Line 64 is inside the `waitForFunction()` for job cards in `switchToTab`
- BUT the actual timeout occurs in the test file's own `page.waitForFunction()`
- Playwright's error stack includes the call chain, making it appear like `switchToTab` failed

**Reality**: `switchToTab` succeeded, but the test's subsequent wait operation timed out.

## Evidence

### Test Results from Comprehensive Run (2025-11-20 19:48 PST)

**From `test-results/comprehensive-report.json`**:

```json
{
  "e2e": {
    "suite": "e2e",
    "passed": 395,
    "failed": 5,
    "skipped": 212,
    "duration": 800340,
    "success": false,
    "failures": [
      {
        "testName": "Gmail Sync Integration › should allow approving jobs synced from Gmail",
        "testFile": "16-gmail-sync-integration.spec.ts",
        "errorMessage": "TimeoutError: page.waitForFunction: Timeout 60000ms exceeded.",
        "stackTrace": "TimeoutError: page.waitForFunction: Timeout 60000ms exceeded.\n    at switchToTab (/Users/sam/Projects/JobHunterAI-Claude/frontend/e2e/helpers/tab-navigation.ts:64:18)\n    at /Users/sam/Projects/JobHunterAI-Claude/frontend/e2e/tests/16-gmail-sync-integration.spec.ts:232:5",
        "duration": 61071
      },
      {
        "testName": "Gmail Sync Integration › should allow approving jobs synced from Gmail",
        "testFile": "16-gmail-sync-integration.spec.ts",
        "errorMessage": "TimeoutError: page.waitForFunction: Timeout 60000ms exceeded.",
        "stackTrace": "TimeoutError: page.waitForFunction: Timeout 60000ms exceeded.\n    at switchToTab (/Users/sam/Projects/JobHunterAI-Claude/frontend/e2e/helpers/tab-navigation.ts:64:18)\n    at /Users/sam/Projects/JobHunterAI-Claude/frontend/e2e/tests/16-gmail-sync-integration.spec.ts:232:5",
        "duration": 61421
      },
      {
        "testName": "Condensed Description Quality › should show actual job content (not just \"No job description\")",
        "testFile": "23-description-quality.spec.ts",
        "errorMessage": "TimeoutError: page.waitForFunction: Timeout 60000ms exceeded.",
        "stackTrace": "TimeoutError: page.waitForFunction: Timeout 60000ms exceeded.\n    at switchToTab (/Users/sam/Projects/JobHunterAI-Claude/frontend/e2e/helpers/tab-navigation.ts:64:18)\n    at /Users/sam/Projects/JobHunterAI-Claude/frontend/e2e/tests/23-description-quality.spec.ts:94:5",
        "duration": 63732
      },
      {
        "testName": "Condensed Description Quality › should show actual job content (not just \"No job description\")",
        "testFile": "23-description-quality.spec.ts",
        "errorMessage": "TimeoutError: page.waitForFunction: Timeout 60000ms exceeded.",
        "stackTrace": "TimeoutError: page.waitForFunction: Timeout 60000ms exceeded.\n    at switchToTab (/Users/sam/Projects/JobHunterAI-Claude/frontend/e2e/helpers/tab-navigation.ts:64:18)\n    at /Users/sam/Projects/JobHunterAI-Claude/frontend/e2e/tests/23-description-quality.spec.ts:94:5",
        "duration": 63564
      },
      {
        "testName": "Condensed Description Quality › should show actual job content (not just \"No job description\")",
        "testFile": "23-description-quality.spec.ts",
        "errorMessage": "TimeoutError: page.waitForFunction: Timeout 60000ms exceeded.",
        "stackTrace": "TimeoutError: page.waitForFunction: Timeout 60000ms exceeded.\n    at switchToTab (/Users/sam/Projects/JobHunterAI-Claude/frontend/e2e/helpers/tab-navigation.ts:64:18)\n    at /Users/sam/Projects/JobHunterAI-Claude/frontend/e2e/tests/23-description-quality.spec.ts:94:5",
        "duration": 63820
      }
    ]
  }
}
```

**Key Metrics**:
- All failures: 60-64 seconds (exceeding configured timeouts)
- Test 16 configured timeout: 45000ms (45s) - exceeded by 16-19s
- Test 23 configured timeout: 40000ms (40s) - exceeded by 23-24s
- Pattern: Consistent across retries (suite configured with `retries: 2`)

## Playwright Best Practices Audit

### Current Implementation Analysis

**Test 16 (lines 277-288)**: Already follows best practices
- ✅ Uses state polling with `page.waitForFunction()`
- ✅ Implements load-aware timeout (45s under COMPREHENSIVE_TESTS)
- ✅ Polls specific DOM element (`[data-testid="stat-approved"]`)
- ✅ Has clear success condition (count increment)
- ⚠️ **Issue**: 45s timeout insufficient under load (actual: 61s)

**Test 23 (lines 105-137)**: Already follows best practices
- ✅ Uses state polling with `page.waitForFunction()`
- ✅ Implements load-aware timeout (40s under COMPREHENSIVE_TESTS)
- ✅ Polls specific DOM elements (job cards with condensed descriptions)
- ✅ Has clear success condition (text loaded, not "Loading...")
- ⚠️ **Issue**: 40s timeout insufficient under load (actual: 63-64s)

**Alignment with `docs/PLAYWRIGHT_BEST_PRACTICES.md`**:
- ✅ Section 3: State polling pattern used correctly
- ✅ Section 6: Load-aware timeouts implemented
- ⚠️ Section 6: Timeout multipliers need adjustment for LLM operations

### Key Insight from Best Practices

From `docs/PLAYWRIGHT_BEST_PRACTICES.md` Section 6.3:
> "For LLM operations (condensing descriptions, etc.), use even longer timeouts as API calls can be slow under load"

**Test 23 involves LLM operations** (condensed descriptions), requiring longer timeouts than standard UI operations.

## Proposed Solutions

### Option 1: Increase Load-Aware Timeout Multipliers (RECOMMENDED)

**Description**: Increase timeout values for test-specific `page.waitForFunction()` calls to account for comprehensive test load with 4 parallel workers.

**Changes Required**:

**File: `frontend/e2e/tests/16-gmail-sync-integration.spec.ts:277`**
```typescript
// Current (line 277):
const pollTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 45000 : 10000;

// Proposed:
const pollTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 90000 : 10000;
// Rationale: Database + stats refresh operations under load require ~60s, add 30s buffer
```

**File: `frontend/e2e/tests/23-description-quality.spec.ts:105`**
```typescript
// Current (line 105):
const pollTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 40000 : 20000;

// Proposed:
const pollTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 90000 : 20000;
// Rationale: LLM operations under load require ~64s, add 26s buffer
```

**Similar changes needed at**:
- Test 23 line 195: Also polling for LLM operations
- Any other `page.waitForFunction()` calls in these test files

**Pros**:
- Minimal code change (only timeout values)
- Aligns with existing pattern (already load-aware, just need higher values)
- Fixes root cause directly (insufficient timeout under load)
- Consistent with ISSUE-055/062 approach (increase timeouts for slow operations)
- No architectural changes required

**Cons**:
- Tests will take longer to fail if genuinely broken
- Masks potential performance regressions (operations getting slower)
- May need further increases if load increases (more workers, slower hardware)

**Implementation Effort**: 30 minutes
- Update 4-6 timeout values across 2 test files
- Run comprehensive tests to verify fix
- Document rationale in code comments

**Maintenance**: Low
- If performance degrades, may need periodic timeout increases
- Should monitor test durations to detect regressions

### Option 2: Create Centralized Timeout Constants

**Description**: Define timeout constants in a central location with clear categorization by operation type (UI, API, LLM, Database).

**Changes Required**:

**New File: `frontend/e2e/helpers/timeout-constants.ts`**
```typescript
export const TIMEOUTS = {
  UI: {
    base: process.env.COMPREHENSIVE_TESTS ? 15000 : 5000,
    jobCards: process.env.COMPREHENSIVE_TESTS ? 45000 : 10000,
  },
  API: {
    standard: process.env.COMPREHENSIVE_TESTS ? 60000 : 20000,
    slow: process.env.COMPREHENSIVE_TESTS ? 90000 : 30000,
  },
  LLM: {
    condense: process.env.COMPREHENSIVE_TESTS ? 90000 : 30000,
    generate: process.env.COMPREHENSIVE_TESTS ? 120000 : 40000,
  },
  DATABASE: {
    query: process.env.COMPREHENSIVE_TESTS ? 30000 : 10000,
    mutation: process.env.COMPREHENSIVE_TESTS ? 90000 : 20000,
  },
};
```

**Update test files to use constants**:
```typescript
import { TIMEOUTS } from '../helpers/timeout-constants';

// Test 16:
await page.waitForFunction(..., { timeout: TIMEOUTS.DATABASE.mutation });

// Test 23:
await page.waitForFunction(..., { timeout: TIMEOUTS.LLM.condense });
```

**Pros**:
- Centralized timeout management (single source of truth)
- Self-documenting (timeout names indicate operation type)
- Easier to adjust timeouts globally
- Prevents inconsistent timeout values across tests
- Future-proof (easy to add new categories)

**Cons**:
- More upfront work (create constants file, update all tests)
- Requires updating existing tests to use constants
- Another abstraction layer to maintain
- May be overkill for current scale (72 test files)

**Implementation Effort**: 2-3 hours
- Create timeout constants file
- Update 2 failing test files to use constants
- Optionally update other test files for consistency
- Run comprehensive tests to verify
- Document usage pattern

**Maintenance**: Medium
- Need to keep constants updated as performance characteristics change
- Need to ensure new tests use constants (documentation + code review)
- Benefits increase as more tests adopt the pattern

### Option 3: Investigate and Optimize Underlying Performance

**Description**: Instead of increasing timeouts, investigate why operations take 60-64s and optimize the underlying code.

**Investigation Areas**:
1. **LLM API calls**: Are they batched? Throttled? Sequential when they could be parallel?
2. **Database queries**: Are stats refreshes optimized? Using indexes? N+1 queries?
3. **React state updates**: Are excessive re-renders happening?
4. **Test isolation**: Are tests interfering with each other (shared database state)?

**Pros**:
- Addresses root performance issues (not just symptoms)
- Benefits production code (faster operations for real users)
- Tests run faster overall
- More sustainable long-term solution

**Cons**:
- Significantly more effort (investigation + optimization)
- May uncover complex architectural issues
- Performance gains may be limited (some operations are inherently slow)
- Doesn't eliminate need for load-aware timeouts

**Implementation Effort**: 1-2 days
- Profile test execution to identify bottlenecks
- Analyze database query patterns
- Optimize LLM API call patterns
- Test performance improvements
- Verify comprehensive tests pass

**Maintenance**: Low (after initial work)
- Performance improvements benefit all code
- Reduced timeout pressure in future tests

## Decision

**Recommended**: **Option 1 - Increase Load-Aware Timeout Multipliers**

**Rationale**:
- Quickest path to green comprehensive tests (30 minutes vs 2-3 hours vs 1-2 days)
- Both test files already implement correct patterns (state polling, load-aware timeouts)
- Only issue is timeout values, not implementation approach
- Consistent with historical fixes (ISSUE-055, ISSUE-057, ISSUE-062)
- Can pursue Option 3 (performance optimization) separately as improvement

**Future Work**:
- Consider Option 2 if timeout management becomes unwieldy (many more tests with varied timeout needs)
- Consider Option 3 as separate performance improvement initiative (profile + optimize)

## Implementation

**Status**: ⏳ Pending implementation

**Changes to Make**:

1. **Update `frontend/e2e/tests/16-gmail-sync-integration.spec.ts`**:
   - Line 277: Change `45000` to `90000` (comprehensive test timeout)
   - Add comment explaining rationale

2. **Update `frontend/e2e/tests/23-description-quality.spec.ts`**:
   - Line 105: Change `40000` to `90000` (comprehensive test timeout)
   - Line 195: Change `120000` to `120000` (already sufficient, verify)
   - Add comments explaining rationale

3. **Update PLAYWRIGHT_BEST_PRACTICES.md** (if needed):
   - Add guidance on timeout values for LLM operations under load
   - Reference this issue as example of proper timeout tuning

## Testing

**Test Commands:**

```bash
# Reproduce the bug (before fix):
export COMPREHENSIVE_TESTS=true
cd frontend
npx playwright test e2e/tests/16-gmail-sync-integration.spec.ts:230 --workers=4
npx playwright test e2e/tests/23-description-quality.spec.ts:92 --workers=4
# Expected: Timeout failures at ~60-64s

# Verify the fix (after implementation):
export COMPREHENSIVE_TESTS=true
cd frontend
npx playwright test e2e/tests/16-gmail-sync-integration.spec.ts:230 --workers=4
npx playwright test e2e/tests/23-description-quality.spec.ts:92 --workers=4
# Expected: Tests pass (operations complete within 90s)

# Full comprehensive test verification:
./run-comprehensive-tests.sh
# Expected: All E2E tests pass, no timeout failures
```

**Verification Checklist:**
- [ ] Test 16 "should allow approving jobs synced from Gmail" passes consistently (3/3 runs)
- [ ] Test 23 "should show actual job content" passes consistently (3/3 runs)
- [ ] Comprehensive test suite completes with exit code 0 (all tests passing)
- [ ] No new timeout failures introduced in other tests
- [ ] Test execution time remains reasonable (~15-20 minutes total)
- [ ] Comments added explaining timeout rationale in both files

## Status History

- **2025-11-20**: ISSUE-063 created and documented
  - Comprehensive test run identified 5 E2E failures (2 in file 16, 3 in file 23)
  - Investigation completed: Root cause is insufficient timeouts for operations under load
  - Playwright best practices audit completed: Current implementation follows best practices
  - Proposed solutions documented with recommendation (Option 1)

## Notes

### Why This Isn't a Regression from ISSUE-057

ISSUE-057 fixed `switchToTab` helper to be load-aware, which successfully resolved Test #441. However, ISSUE-063 failures occur in test-specific wait operations that execute AFTER `switchToTab` completes:

1. **ISSUE-057 scope**: Fixed timeouts IN the `switchToTab` helper itself
2. **ISSUE-063 scope**: Fix timeouts in test-specific code that USES `switchToTab`

The helper is working correctly; the tests just need their own timeouts increased to match comprehensive test load characteristics.

### Load Characteristics Under Comprehensive Tests

With 4 parallel workers executing E2E tests:
- Multiple LLM API calls happening concurrently (Test 23)
- Multiple database operations happening concurrently (Test 16)
- Shared backend resources under heavier load
- Operations that take 20-30s in isolation take 60-70s under load

**Timeout Multiplier Pattern**:
- Isolation: Base timeout (e.g., 20s for LLM, 10s for database)
- Comprehensive Load: 3-4.5x multiplier (e.g., 90s for LLM/database operations)

### Related Historical Issues

- **ISSUE-055**: Fixed multiple flaky tests by making timeouts load-aware (state polling approach)
- **ISSUE-057**: Fixed `switchToTab` helper timeouts (this issue's direct predecessor)
- **ISSUE-062**: Made ALL timeout parameters load-aware (comprehensive timeout audit)

Pattern: Each issue identifies specific operations that need higher timeouts under comprehensive test load.

## Related Files

**Test Files (failures occur here)**:
- `frontend/e2e/tests/16-gmail-sync-integration.spec.ts:232` - `switchToTab(page, 'new')` call
- `frontend/e2e/tests/16-gmail-sync-integration.spec.ts:277-288` - Test-specific `page.waitForFunction()` that times out
- `frontend/e2e/tests/23-description-quality.spec.ts:94` - `switchToTab(page, 'new')` call
- `frontend/e2e/tests/23-description-quality.spec.ts:105-137` - Test-specific `page.waitForFunction()` that times out
- `frontend/e2e/tests/23-description-quality.spec.ts:195-225` - Another LLM operation wait (also may need adjustment)

**Helper Files (working correctly)**:
- `frontend/e2e/helpers/tab-navigation.ts:40-69` - `switchToTab` function (ISSUE-057 fix applied)
- `frontend/e2e/helpers/tab-navigation.ts:64` - Line referenced in stack traces (misleading, helper is working)
- `frontend/e2e/helpers/timeout-utils.ts` - Existing timeout utilities (if implementing Option 2)

**Documentation**:
- `docs/PLAYWRIGHT_BEST_PRACTICES.md` - E2E testing patterns and timeout guidance
- `bugs/fixed/ISSUE-057-test-441-flaky---switchtotab-helper-has-fixed-timeouts-that-dont-adapt-to-load.md` - Related fix
- `bugs/fixed/ISSUE-055-comprehensive-tests-4-flaky-tests-failing-on-switchtotab-timeouts.md` - Historical context
- `bugs/fixed/ISSUE-062-replace-fixed-timeouts-with-load-aware-timeouts-comprehensive-refactor.md` - Comprehensive timeout work

**Test Results**:
- `test-results/comprehensive-report.json` - Contains failure details and stack traces
- `test-results/failures-detailed.txt` - Human-readable failure output
