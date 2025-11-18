---
id: ISSUE-052
title: E2E test 22-refresh-buttons.spec.ts line 208 fails - job description stability check times out
status: open
priority: medium
severity: medium
component: frontend
created: 2025-11-17
updated: 2025-11-17 20:00:00 PST
affects:
  - E2E test suite reliability
  - Refresh button feature confidence
related:
  - ISSUE-050
  - ISSUE-051
  - PLAYWRIGHT_BEST_PRACTICES.md
---

# ISSUE-052: E2E test 22-refresh-buttons.spec.ts line 208 fails - job description stability check times out

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Test Summary](#test-summary)
- [Detailed Test Description](#detailed-test-description)
  - [Test Purpose](#test-purpose)
  - [Test Flow](#test-flow)
  - [What the Test Validates](#what-the-test-validates)
- [Failure Description](#failure-description)
  - [Error Details](#error-details)
- [Steps to Reproduce](#steps-to-reproduce)
- [Expected Behavior](#expected-behavior)
- [Actual Behavior](#actual-behavior)
- [Root Cause](#root-cause)
- [Evidence](#evidence)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Fix Stability Check Logic](#option-1-fix-stability-check-logic)
  - [Option 2: Investigate Application Bug](#option-2-investigate-application-bug)
  - [Option 3: Skip or Remove Test](#option-3-skip-or-remove-test)
- [Decision](#decision)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

**Problem**: E2E test "should NOT change to different job descriptions after refresh" (line 208) times out during the 3-second stability verification check.

**Discovery**: Identified during ISSUE-051 implementation (2025-11-17 19:45 PST) when fixing `waitForTimeout()` anti-patterns. Converted fixed timeouts to state polling, but stability check times out at 6 seconds.

**Context**: This is a **derivative issue from ISSUE-050**. ISSUE-050's main failing test (line 61) is now passing with the 60s timeout increase. This is a separate test in the same file that validates description stability after refresh.

## Impact

**Who/What is affected:**
- E2E test suite pass rate: 99.5% → 100% possible if fixed (1 test)
- Confidence in refresh button stability (prevents descriptions from flickering)
- May indicate real application bug (descriptions actually changing unexpectedly)

**Severity:**
- **Medium**: Test fails consistently in isolation mode
- **Medium**: Different from ISSUE-050 (that was load-dependent, this is consistent)
- **Medium**: May indicate real UI bug vs just test logic issue

## Test Summary

**Test Name**: "should NOT change to different job descriptions after refresh"
**File**: `frontend/e2e/tests/22-refresh-buttons.spec.ts:208`
**Test Suite**: Refresh Buttons
**Test Type**: E2E integration test (UI stability validation)

**What it tests**: Verifies that after clicking a job's refresh button, the description for that specific job remains stable and doesn't flicker or change to a different job's description.

## Detailed Test Description

### Test Purpose

This test validates that the refresh operation correctly targets a specific job and doesn't cause UI instability. It ensures:
1. Clicking refresh on Job A only affects Job A (not Job B, C, etc.)
2. After refresh completes, description doesn't continue changing
3. No race conditions cause descriptions to flicker between different jobs
4. The UI correctly tracks which job is being displayed

### Test Flow

1. **Navigate to All Jobs Tab**
   - Uses `switchToTab(page, 'all')` helper

2. **Identify Target Job**
   - Get first job card
   - Extract job ID from badge (e.g., "ID: 2615006f")
   - Create stable locator that tracks this specific job by ID

3. **Get Description Section**
   - Find "Condensed Description" section within the stable job card
   - Wait for initial description to load

4. **Click Refresh Button**
   - Click the per-job refresh button for this specific job
   - Triggers LLM API call to regenerate description

5. **Wait for Refresh to Complete**
   - Uses state polling to wait for new description to load (15s timeout)
   - Verifies still looking at same job ID

6. **Stability Check (WHERE IT FAILS)**
   - Get initial description text
   - Wait 3 seconds while continuously verifying:
     - Same job ID badge still visible
     - Description text hasn't changed
   - Uses `page.waitForFunction()` with 6s timeout (3s wait + buffer)
   - **Fails at line 274**: Timeout exceeded

### What the Test Validates

**Functional Requirements:**
- ✅ Refresh button targets correct job
- ✅ Job ID remains stable after refresh
- ❌ **Description doesn't change unexpectedly** ← FAILS HERE

**Non-Functional Requirements:**
- ✅ UI updates are predictable
- ❌ **No flickering or race conditions** ← UNCERTAIN

## Failure Description

### Error Details

```
TimeoutError: page.waitForFunction: Timeout 6000ms exceeded.

  272 |     const initialDescription = await descriptionContainer.textContent();
  273 |     const stabilityStartTime = Date.now();
> 274 |     await page.waitForFunction(
      |                ^
  275 |       ({ startTime, expectedJobIdText, expectedDescription }) => {
  276 |         // Has 3 seconds elapsed?
  277 |         if (Date.now() - startTime < 3000) return false;
```

**What happens:**
- Test waits 3 seconds for stability verification
- During that time, either:
  1. The job card disappears from DOM (list re-sorts)
  2. The description text changes unexpectedly
  3. The job ID changes (wrong card being tracked)
- State polling can never complete because expected state never occurs

**Frequency:**
- ❌ Fails consistently in isolation mode
- ❌ Not load-dependent (unlike ISSUE-050)

## Steps to Reproduce

1. Run test in isolation:
   ```bash
   cd frontend && npx playwright test e2e/tests/22-refresh-buttons.spec.ts:208
   ```

2. Observe test flow:
   - ✅ Test finds first job
   - ✅ Test clicks refresh button
   - ✅ Description loads successfully
   - ❌ Stability check times out

3. Check screenshot at failure:
   - `test-results/22-refresh-buttons-Refresh-c4916--descriptions-after-refresh-chromium/test-failed-1.png`

## Expected Behavior

**After clicking refresh on a job's description:**
1. Description should update to new LLM-generated content
2. Description should remain stable for at least 3 seconds
3. Job ID badge should remain unchanged
4. UI should not flicker or show other jobs' descriptions

**Stability check should:**
- Wait for 3 seconds to elapse
- Verify description text stays constant throughout
- Verify same job ID is still displayed
- Complete successfully within 6 second timeout

## Actual Behavior

**Stability check times out at 6 seconds**, meaning one of:
1. **Description keeps changing** - LLM keeps regenerating, UI keeps updating
2. **Job card moves in DOM** - List re-sorts, stable locator can't find job
3. **Wrong job displayed** - UI showing different job than expected
4. **Test logic issue** - State polling checking wrong element or condition

## Root Cause

**Unknown - requires investigation to determine if this is:**

**A. Application Bug** - Description actually is unstable:
- LLM generates multiple responses
- React state updates cause re-renders with different data
- Job list re-sorts during refresh operation
- UI bug causes descriptions to flicker

**B. Test Logic Issue** - Test incorrectly tracks state:
- Stable locator not actually stable under refresh
- DOM structure changes after refresh
- Expected description comparison failing incorrectly
- Race condition in test itself

**Key Observation**: This test was modified during ISSUE-051 to use state polling instead of fixed `waitForTimeout()`. The conversion may have introduced the bug, or may have exposed a pre-existing application bug that fixed timeouts were masking.

## Evidence

**Test Results (2025-11-17 19:55 PST):**
- Status: ❌ **FAILED** consistently
- Runtime: Timeout at 8.1 seconds (line 208)
- Error: `page.waitForFunction: Timeout 6000ms exceeded` at line 274
- Screenshot: `test-results/22-refresh-buttons-Refresh-c4916--descriptions-after-refresh-chromium/test-failed-1.png`

**Changes Before Failure:**
- Commit a2bec4c: Converted `waitForTimeout(1000)` × 5 to state polling stability check
- Previous version used 4 separate `await page.waitForTimeout(1000)` calls
- New version uses single `page.waitForFunction()` with 3s + 3s timeout

**BEFORE (lines 223-228):**
```typescript
const description1 = await descriptionContainer.textContent();
await page.waitForTimeout(1000);
const description2 = await descriptionContainer.textContent();
await page.waitForTimeout(1000);
const description3 = await descriptionContainer.textContent();
await page.waitForTimeout(1000);
const description4 = await descriptionContainer.textContent();

expect(description1).toBe(description2);
expect(description2).toBe(description3);
expect(description3).toBe(description4);
```

**AFTER (lines 270-308):**
```typescript
const initialDescription = await descriptionContainer.textContent();
const stabilityStartTime = Date.now();
await page.waitForFunction(
  ({ startTime, expectedJobIdText, expectedDescription }) => {
    // Has 3 seconds elapsed?
    if (Date.now() - startTime < 3000) return false;

    // Find job card and verify description hasn't changed
    // ... complex DOM traversal logic
    return currentDescription === expectedDescription;
  },
  { startTime, expectedJobIdText, expectedDescription: initialDescription },
  { timeout: 6000 }
);
```

## Proposed Solutions

### Option 1: Fix Stability Check Logic

**Description**: Investigate and fix the test's state polling logic to correctly track job card and description.

**Hypothesis**: The stable locator or DOM traversal in `waitForFunction` may not be finding the correct elements after refresh.

**Implementation**:
1. Add debug logging to `waitForFunction` to see what elements it's finding
2. Verify the stable locator actually finds the same job after refresh
3. Simplify DOM traversal or use more direct selectors
4. Consider using Playwright's built-in locators instead of raw DOM queries

**Pros**:
- Fixes test to accurately validate stability
- May reveal real application issues
- Follows best practices (state polling vs fixed timeouts)

**Cons**:
- Requires debugging to understand what's failing
- May still fail if application bug exists

**Implementation Effort**: 1-2 hours

**Maintenance**: Low (proper state polling is maintainable)

---

### Option 2: Investigate Application Bug

**Description**: Assume test logic is correct and investigate why descriptions are actually unstable.

**Hypothesis**: Application may be re-rendering or re-fetching descriptions unexpectedly after refresh.

**Implementation**:
1. Review React component state management for refresh operation
2. Check if LLM API is being called multiple times
3. Verify database queries aren't causing multiple updates
4. Check for race conditions in state updates

**Pros**:
- Fixes real user-facing bug if it exists
- Improves application stability
- Test would then pass correctly

**Cons**:
- May not be an application bug at all
- Harder to debug than test logic
- Requires deep dive into React/API layer

**Implementation Effort**: 3-4 hours

**Maintenance**: N/A (one-time fix)

---

### Option 3: Skip or Remove Test

**Description**: Accept that this specific stability validation is difficult to test reliably and skip or remove it.

**Rationale**:
- Line 61 test already validates refresh works correctly
- Stability may be too granular to test reliably in E2E
- May be better validated in unit/integration tests

**Implementation**:
```typescript
test.skip('should NOT change to different job descriptions after refresh', async ({ page }) => {
  // Skip: Stability check too fragile in E2E context
  // Covered by: line 61 test (refresh works), unit tests (state management)
});
```

**Pros**:
- Immediate fix (100% pass rate)
- Focuses E2E tests on critical user flows
- Reduces test maintenance burden

**Cons**:
- Loses validation coverage
- May hide real stability bugs
- Doesn't address underlying issue

**Implementation Effort**: 2 minutes

**Maintenance**: None

---

## Decision

**Awaiting user decision** on approach:
1. **Option 1**: Debug and fix test logic (recommended if test is valuable)
2. **Option 2**: Investigate application stability bug (if we suspect real bug)
3. **Option 3**: Skip test (if stability validation not critical)

**Recommendation**: **Option 1** - Fix test logic first. If that reveals an application bug, then pursue Option 2.

## Testing

**Test Commands:**
```bash
# Run failing test in isolation
cd frontend && npx playwright test e2e/tests/22-refresh-buttons.spec.ts:208

# Run full test suite to verify no regressions
cd frontend && npx playwright test e2e/tests/22-refresh-buttons.spec.ts

# Enable debug mode to see what's happening
cd frontend && DEBUG=pw:api npx playwright test e2e/tests/22-refresh-buttons.spec.ts:208 --headed
```

**Verification:**
- [ ] Test passes in isolation
- [ ] Test passes consistently (3+ runs)
- [ ] Screenshot shows stable description
- [ ] No errors in browser console
- [ ] Descriptions remain stable for >3 seconds

## Status History

- **2025-11-17 20:00 PST**: ISSUE-052 created - Derivative of ISSUE-050, discovered during ISSUE-051 implementation
- **2025-11-17 19:45 PST**: Test modified (commit a2bec4c) - Converted fixed timeouts to state polling
- **2025-11-17 19:55 PST**: Test failure confirmed in isolation - Not load-dependent

## Notes

**Key Insights:**

1. **This is NOT ISSUE-050** - That test (line 61) is now passing with 60s timeout
2. **Different failure mode** - ISSUE-050 was load-dependent timeout, this is consistent state polling failure
3. **May be test bug or app bug** - Unclear if descriptions are actually unstable or test logic is wrong
4. **Anti-pattern fixes may have exposed issue** - Fixed timeouts could have been masking a problem

**Relationship to Other Issues:**
- **ISSUE-050**: Line 61 test (refresh works) - ✅ PASSING after timeout increase
- **ISSUE-051**: Fixed 12 anti-patterns including this test's timeouts - ✅ FIXED
- **ISSUE-052** (this issue): Line 208 test (stability validation) - ❌ FAILING

**Priority Justification:**
- Medium priority: Test fails consistently but doesn't block other work
- Medium severity: May indicate real bug but feature appears to work in manual testing
- Not blocking: ISSUE-050 main test is passing, this is additional validation

## Related Files

- `frontend/e2e/tests/22-refresh-buttons.spec.ts:208` - Failing test
- `frontend/e2e/tests/22-refresh-buttons.spec.ts:61` - Related passing test (ISSUE-050)
- `frontend/src/App.tsx:2307` - Per-job refresh button implementation
- `docs/PLAYWRIGHT_BEST_PRACTICES.md` - State polling patterns
- `bugs/open/ISSUE-050-*.md` - Parent issue (LLM timeout)
- `bugs/fixed/ISSUE-051-*.md` - Anti-pattern fixes that modified this test
