---
id: ISSUE-057
title: Test #441 flaky - switchToTab helper has fixed timeouts that don't adapt to load
status: open
priority: medium
severity: medium
component: frontend
created: 2025-11-19
updated: 2025-11-19
affects: []
related: []
---

# ISSUE-057: Test #441 flaky - switchToTab helper has fixed timeouts that don't adapt to load

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Steps to Reproduce](#steps-to-reproduce)
- [Expected Behavior](#expected-behavior)
- [Actual Behavior](#actual-behavior)
- [Root Cause](#root-cause)
- [Evidence](#evidence)
  - [Test History](#test-history)
  - [Pattern Analysis](#pattern-analysis)
  - [Best Practices Audit](#best-practices-audit)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Make switchToTab Helper Load-Aware (RECOMMENDED) ⭐](#option-1-make-switchtotab-helper-load-aware-recommended-)
  - [Option 2: Align Test #441 Timeout with Helper (Optional)](#option-2-align-test-441-timeout-with-helper-optional)
  - [Option 3: Add Diagnostic Logging (Optional)](#option-3-add-diagnostic-logging-optional)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

Test #441 (`e2e/tests/16-gmail-sync-integration.spec.ts:229` - "should allow approving jobs synced from Gmail") is **flaky but not broken**. It fails initially with an ~11s timeout but **consistently passes on retry**. The root cause is a **timing issue under comprehensive test load** due to fixed 5s timeouts in the `switchToTab` helper function that don't adapt to system load.

## Impact

**Who/What is affected:**
- Test #441: Gmail sync job approval flow
- All E2E tests that use the `switchToTab` helper function
- Comprehensive test runs (causes retry overhead, increases runtime)

**Severity:**
- **Medium**: Test passes on retry (not blocking), but adds ~11s retry overhead
- **Scope**: Isolated to comprehensive test runs under load (4 parallel workers)
- **Reliability**: Consistently flaky (failed in both 2025-11-19 01:36 PST and 16:15 PST runs)

## Steps to Reproduce

1. Run comprehensive test suite with `COMPREHENSIVE_TESTS=true` and 4 parallel workers:
   ```bash
   ./helper-scripts/run-comprehensive-tests.sh
   ```
2. Observe Test #441 (`e2e/tests/16-gmail-sync-integration.spec.ts:229`) execution
3. Test fails initially at ~11.1s timeout
4. Playwright automatically retries
5. Test passes on retry

**Pattern**: Timing varies slightly (10.1s → 11.1s) but consistently fails around 10-11 seconds on first attempt.

## Expected Behavior

Test #441 should pass on first attempt, even under comprehensive test load with 4 parallel workers.

## Actual Behavior

Test #441 fails initially with timeout at ~11.1s, then passes on retry. The test times out during the **initial tab navigation** (line 231: `await switchToTab(page, 'new')`) before the main test logic executes.

**Timeline Reconstruction:**
```
t=0s:    Test starts, navigates to New Jobs tab
t=0-1s:  Click tab button (fast, no timeout)
t=1-6s:  Wait for aria-selected="true" (5s timeout - succeeds or barely succeeds)
t=6-11s: Wait for tab content (5s timeout - TIMES OUT HERE under load)
t=11.1s: Test fails with timeout
```

## Root Cause

The `switchToTab` helper function in `frontend/e2e/helpers/tab-navigation.ts` has **two fixed 5s timeouts** (lines 44 and 52) that are **NOT load-aware**, while the third wait (job cards) correctly uses a load-aware timeout (45s for `COMPREHENSIVE_TESTS`).

**Problem Code** (`frontend/e2e/helpers/tab-navigation.ts:33-64`):
```typescript
// Line 44: ❌ Fixed 5s timeout (NOT load-aware)
await page.waitForSelector(`${tabButtonSelector}[aria-selected="true"]`, { timeout: 5000 });

// Line 52: ❌ Fixed 5s timeout (NOT load-aware) - THIS IS WHERE IT FAILS
await page.waitForSelector(`[data-testid="${tab}-tab-content"]`, { timeout: 5000 });

// Line 58: ✅ Load-aware timeout (GOOD)
const pollTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 45000 : 10000;
await page.waitForFunction(..., { timeout: pollTimeout });
```

Under comprehensive test load (4 parallel workers + Gmail API calls), the tab content container takes >5s to appear, causing timeout at line 52.

**Why this happens:**
- Comprehensive tests run 4 parallel workers, increasing resource contention
- Gmail API calls add additional latency
- Tab navigation UI operations (React state updates, DOM rendering) take longer under load
- Fixed 5s timeout is insufficient when system is under load
- Even though `COMPREHENSIVE_TESTS` environment variable is set, these two waits don't use it

## Evidence

### Test History

**Recent Runs:**
1. **2025-11-19 16:15:24 PST**
   - Initial: ❌ Failed (11.1s timeout)
   - Retry: ✅ Passed
   - COMPREHENSIVE_TESTS: Detected and set to 45s

2. **2025-11-19 01:36:18 PST**
   - Initial: ❌ Failed (10.1s timeout)
   - Retry: ✅ Passed (1.8s)
   - COMPREHENSIVE_TESTS: Not detected (ISSUE-056 not yet fixed)

**Historical Context** (git log analysis):
- **825023b4** (2025-11-18): ISSUE-053 Phase 2 - Removed fixed timeouts, replaced with state polling
- **635fd3f3**: Fixed stats refresh issue - wait for both status update AND stats refresh API calls
- **f458c574**: Made Gmail tests run serially to prevent database race conditions
- **01c55af1**: Made LLM-dependent tests more robust under system load
- Multiple earlier fixes for flakiness (tab navigation, stats refresh, etc.)

### Pattern Analysis

- Test has been historically flaky but gradually improved
- Consistently passes on retry (100% retry success rate)
- Timeout varies slightly (10.1s → 11.1s) but always around 10-11 seconds
- Even with ISSUE-056 fix (extended timeouts), still times out initially at the helper function level

### Best Practices Audit

**✅ GOOD: Test #441 Code**
- Test uses load-aware timeouts correctly (line 275: 20s for COMPREHENSIVE_TESTS)
- Uses `waitForFunction()` for state polling (best practice)
- Waits for API responses before assertions (lines 259-271)
- Uses `data-testid` selectors

**⚠️ PROBLEM: switchToTab Helper**
- Two fixed 5s timeouts don't adapt to load
- Inconsistent timeout strategy (fixed vs load-aware within same function)
- Violates PLAYWRIGHT_BEST_PRACTICES.md Section 6 guidance

## Proposed Solutions

### Option 1: Make switchToTab Helper Load-Aware (RECOMMENDED) ⭐

**Description**: Make ALL timeouts in `switchToTab` helper load-aware by using the `COMPREHENSIVE_TESTS` environment variable.

**Implementation** (`frontend/e2e/helpers/tab-navigation.ts`):
```typescript
export async function switchToTab(
  page: Page,
  tab: TabType,
  expectJobCards: boolean = shouldExpectJobCards(tab)
): Promise<void> {
  const tabButtonSelector = `[data-testid="${tab}-tab-button"]`;

  // Calculate load-aware timeout for ALL waits
  const baseTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 15000 : 5000;
  const jobCardsTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 45000 : 10000;

  // Click the tab button
  await page.click(tabButtonSelector);

  // Wait for tab to become active (React state update complete)
  // CHANGE: 5000 → baseTimeout (15s under load)
  await page.waitForSelector(`${tabButtonSelector}[aria-selected="true"]`, { timeout: baseTimeout });

  // For tabs with custom components, we don't need to wait for tab content container
  const customComponentTabs: TabType[] = ['intake', 'calendar', 'follow-ups', 'ranked', 'ignored', 'failed', 'duplicates'];

  if (!customComponentTabs.includes(tab)) {
    // Wait for tab content container to appear
    // CHANGE: 5000 → baseTimeout (15s under load)
    await page.waitForSelector(`[data-testid="${tab}-tab-content"]`, { timeout: baseTimeout });

    // Optionally wait for job cards with load-aware timeout
    if (expectJobCards) {
      await page.waitForFunction(
        () => document.querySelectorAll('[data-testid="job-card"]').length > 0,
        { timeout: jobCardsTimeout }  // Already load-aware: 45s under load
      );
    }
  }
}
```

**Pros**:
- ✅ Fixes flakiness in test #441
- ✅ Prevents similar issues in other tests using `switchToTab`
- ✅ Maintains fast execution for non-comprehensive test runs (5s default)
- ✅ Aligns with PLAYWRIGHT_BEST_PRACTICES.md Section 6 guidance
- ✅ Consistent timeout strategy throughout helper function

**Cons**:
- None identified (only increases timeouts under load, doesn't change logic)

**Implementation Effort**: 5 minutes

**Maintenance**: None - pattern is consistent with existing load-aware timeout approach

---

### Option 2: Align Test #441 Timeout with Helper (Optional)

**Description**: Change test timeout from 20s to 45s for consistency with helper's job cards timeout.

**Implementation** (`frontend/e2e/tests/16-gmail-sync-integration.spec.ts:275`):
```typescript
// BEFORE
const pollTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 20000 : 10000;

// AFTER
const pollTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 45000 : 10000;
```

**Pros**:
- ✅ Consistent timeout values across test and helper
- ✅ Provides additional buffer for approval wait under load

**Cons**:
- Minor: Increases wait time if test does fail (but test should pass after Option 1)

**Implementation Effort**: 1 minute

**Maintenance**: None

---

### Option 3: Add Diagnostic Logging (Optional)

**Description**: Add timing logs to understand where delays occur.

**Implementation**:
```typescript
console.log('Starting tab navigation...');
const navStart = Date.now();

await switchToTab(page, 'new');

const navEnd = Date.now();
console.log(`Tab navigation completed in ${navEnd - navStart}ms`);
```

**Pros**:
- ✅ Provides visibility into actual timing under load
- ✅ Helps identify future timing issues

**Cons**:
- Minor: Adds log noise to test output

**Implementation Effort**: 2 minutes

**Maintenance**: None

## Decision

**Recommended**: Implement **Option 1 (Priority 1)** immediately to eliminate flakiness.

**Rationale**:
- Low risk (only increases timeouts, no logic changes)
- High impact (fixes current flakiness + prevents future issues)
- 5 minutes of work for permanent fix
- Aligns with established best practices

**Optional**: Consider Options 2 and 3 as enhancements if desired.

## Implementation

[To be updated when fix is applied]

## Testing

**Test Commands:**
```bash
# Reproduce the flaky behavior (before fix)
cd frontend
COMPREHENSIVE_TESTS=true npx playwright test e2e/tests/16-gmail-sync-integration.spec.ts:229 --workers=4

# Verify the fix (after implementation)
./helper-scripts/run-comprehensive-tests.sh

# Run test in isolation (should always pass)
cd frontend
npx playwright test e2e/tests/16-gmail-sync-integration.spec.ts:229

# Run full file with load (comprehensive test conditions)
cd frontend
COMPREHENSIVE_TESTS=true npx playwright test e2e/tests/16-gmail-sync-integration.spec.ts --workers=4
```

**Verification:**
- [ ] Test #441 passes on first attempt (no retry) in comprehensive test run
- [ ] Test #441 passes in isolation (no regression)
- [ ] Other tests using `switchToTab` continue to pass
- [ ] No increase in overall E2E test runtime

## Status History

- 2025-11-19: ISSUE created and documented
- 2025-11-19: Comprehensive audit completed (TEST_441_AUDIT.md)

## Notes

**Test Health Assessment**: 🟡 **ACCEPTABLE** (Flaky but Reliable)

**Strengths**:
- ✅ Passes consistently on retry (100% retry success rate)
- ✅ Test code uses state polling instead of fixed timeouts
- ✅ Test code waits for API responses before assertions
- ✅ Uses `data-testid` selectors
- ✅ Has proper conditional skipping for empty states

**Weaknesses**:
- ⚠️ Flaky on first attempt under load
- ⚠️ Helper function has fixed timeouts that don't adapt to load
- ⚠️ Inconsistent timeout values (20s test vs 45s helper)

**Risk Level**: 🟡 LOW-MEDIUM
- Not blocking (passes on retry)
- Does not indicate application bugs
- Timing issue, not logic issue
- Can be fixed with simple timeout adjustments

**Related Issues**:
- **ISSUE-056**: ✅ FIXED - COMPREHENSIVE_TESTS env var propagation (verified working)
- **ISSUE-055**: Related - Load-aware timeout patterns
- **ISSUE-053**: Previous fixes for this test (Phase 2)
- **ISSUE-046**: Historical flaky test fixes

## Related Files

**Primary Files**:
- `frontend/e2e/helpers/tab-navigation.ts:44` - Fixed 5s timeout (aria-selected wait)
- `frontend/e2e/helpers/tab-navigation.ts:52` - Fixed 5s timeout (tab content wait) ← **TIMES OUT HERE**
- `frontend/e2e/helpers/tab-navigation.ts:57-64` - Load-aware timeout (job cards wait)
- `frontend/e2e/tests/16-gmail-sync-integration.spec.ts:229` - Test #441 (flaky test)
- `frontend/e2e/tests/16-gmail-sync-integration.spec.ts:231` - `switchToTab` call (where timeout occurs)
- `frontend/e2e/tests/16-gmail-sync-integration.spec.ts:275` - Test's own load-aware timeout

**Related Files**:
- `docs/PLAYWRIGHT_BEST_PRACTICES.md` - Section 6: Load-aware timeout patterns
- `frontend/e2e/global-setup.ts:92-100` - Environment variable propagation (ISSUE-056 fix)
- `docs/TESTING_STATUS.md` - Current test status and flaky test tracking
