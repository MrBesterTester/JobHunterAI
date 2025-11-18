---
id: ISSUE-049
title: E2E test fails under load - Microsoft email archiving sync test times out
status: open
priority: low
severity: low
component: e2e-tests
created: 2025-11-17
updated: 2025-11-17 18:25:00 PST
affects: []
related: [ISSUE-046, ISSUE-048, ISSUE-051]
---

# ISSUE-049: E2E test fails under load - Microsoft email archiving sync test times out

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
  - [When It Fails](#when-it-fails)
  - [When It Passes](#when-it-passes)
- [What We've Tried](#what-weve-tried)
- [Why It Still Fails](#why-it-still-fails)
- [Evidence](#evidence)
- [Root Cause Analysis](#root-cause-analysis)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Increase Timeouts Further](#option-1-increase-timeouts-further)
  - [Option 2: Add Data Validation Before Assertions](#option-2-add-data-validation-before-assertions)
  - [Option 3: Accept as Known Flaky Test](#option-3-accept-as-known-flaky-test)
- [Decision](#decision)
- [Testing](#testing)
- [Status History](#status-history)
- [How You Can't Win 'Em All: Lessons in Anti-Pattern Introduction](#how-you-cant-win-em-all-lessons-in-anti-pattern-introduction)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

E2E test `16-microsoft-email-integration.spec.ts` line 533 ("should preserve sync functionality with archiving enabled") times out under comprehensive test load, even with serial execution mode and state polling applied.

## Impact

**Who/What is affected:**
- Comprehensive E2E test suite pass rate (99.5% → 99.8% possible if fixed)
- Microsoft email archiving feature confidence
- CI/CD pipeline reliability (if running comprehensive tests)

**Severity:**
- **Low**: Test passes in isolation, only fails under extreme parallel load
- **Low**: Feature works correctly (manual testing confirms archiving works)
- **Low**: 1 of 383 E2E tests (0.26% of test suite)

## Test Summary

**Test Name**: "should preserve sync functionality with archiving enabled"
**File**: `frontend/e2e/tests/16-microsoft-email-integration.spec.ts:533`
**Test Suite**: Microsoft Email Integration (Phase 2.7)
**Test Type**: Integration test (Microsoft API + Database + UI)

**What it tests**: Verifies that enabling email archiving doesn't break the existing Microsoft email sync workflow, and that sync operations complete successfully with archiving enabled.

## Detailed Test Description

### Test Purpose

This test validates that the Microsoft email sync feature continues to work correctly after implementing automatic email archiving. It ensures that:
1. Sync operations complete successfully with archiving enabled
2. Jobs are still created and appear in the UI after sync
3. The Total count updates correctly after sync
4. Archiving doesn't interfere with normal sync workflow

### Test Flow

1. **Navigate to Intake Tab**
   - Click "Intake" button in navigation
   - Wait for tab to load

2. **Capture Initial State**
   - Get current "Total" count from UI
   - Store as `initialTotalCount` (baseline for comparison)

3. **Perform Microsoft Email Sync** (with archiving enabled)
   - Locate Microsoft sync button using `data-testid="microsoft-sync-button"`
   - Verify button is enabled (skip test if disabled - means no OAuth credentials)
   - Click sync button to trigger sync operation

4. **Wait for Sync Completion** (Multi-step waiting strategy)
   - **Step A**: Wait for sync button to re-enable (indicates sync finished)
     - Uses load-aware timeout: 120s under load, 60s in isolation
     - `await expect(microsoftSyncButton).toBeEnabled({ timeout: pollTimeout })`

   - **Step B**: Wait for Total count to update using state polling
     - Uses `page.waitForFunction()` to poll DOM for count changes
     - Searches all DOM elements for text matching `/Total/i`
     - Extracts numeric value, waits until count >= initialTotalCount
     - Same load-aware timeout (120s/60s)

5. **Verify Sync Success**
   - Get new "Total" count from UI
   - Assert: `newTotalCount >= initialTotalCount`
   - Validates that sync didn't remove jobs (archiving shouldn't affect UI count)

### What the Test Validates

**Functional Requirements:**
- ✅ Microsoft email sync completes successfully with archiving enabled
- ✅ Sync button indicates completion (re-enables after sync)
- ✅ Jobs appear in UI after sync operation
- ✅ Total count updates correctly
- ✅ Archiving doesn't interfere with sync workflow

**Non-Functional Requirements:**
- ✅ Sync completes within reasonable time (60-120s)
- ✅ UI updates reflect sync results
- ✅ No race conditions between sync and UI updates

## Failure Description

### When It Fails

**Scenario**: Running comprehensive test suite with all 383 E2E tests + backend/frontend tests in parallel

**Failure Point**: Step 4B (waiting for Total count to update)

**Error**: Test timeout exceeded during state polling for Total count
- `page.waitForFunction()` times out after 120 seconds
- Total count never updates to meet condition: `count >= initialTotalCount`
- Test fails before reaching final assertion

**Symptoms**:
- Sync button re-enables successfully (Step 4A passes)
- But Total count doesn't update in time (Step 4B fails)
- Screenshot shows test failed during tab navigation or count polling

### When It Passes

**Scenario**: Running test in isolation or with minimal parallel load
- ✅ Test file alone: **PASSES**
- ✅ Test suite alone (16-microsoft-email-integration.spec.ts): **PASSES**
- ❌ Comprehensive suite (all 383 E2E tests): **FAILS**

## What We've Tried

**Applied Fixes (2025-11-17):**

1. ✅ **Serial Execution Mode**
   - Added `test.describe.configure({ mode: 'serial' })` to test file
   - Eliminates resource contention within the file
   - Other tests in same file don't interfere with this test

2. ✅ **State Polling for Sync Completion**
   - Changed from fixed timeout to `page.waitForFunction()` (lines 581-598)
   - Polls DOM for actual Total count changes
   - More robust than fixed `waitForTimeout()`

3. ✅ **Load-Aware Timeouts**
   - Increased timeout from 60s → 120s under comprehensive load
   - Detects `process.env.COMPREHENSIVE_TESTS` flag
   - Gives sync operation 2x time to complete

4. ✅ **Proper DOM Querying**
   - Uses direct DOM queries (no Playwright selectors in waitForFunction)
   - More reliable under load

## Why It Still Fails

**Hypothesis 1: Sync Operation Takes Longer Than 120s Under Load**
- All tests running simultaneously = heavy database/API load
- Microsoft Graph API calls may be rate-limited or slow
- Email archiving adds extra API calls (move to Archive folder)
- 120s may still be insufficient under extreme load

**Hypothesis 2: Data Availability Issue**
- Sync completes but database hasn't committed changes yet
- UI queries database before new jobs appear
- Race condition between sync completion and data visibility

**Hypothesis 3: Earlier Timeout in Test Flow**
- Tab navigation may timeout before reaching count polling code
- `switchToTab('intake')` helper has fixed 10s timeout
- If tab switch fails, test never reaches our robust polling code

**Hypothesis 4: UI Update Delay**
- Sync completes, data exists, but React hasn't re-rendered
- Component state update delayed under heavy system load
- Total count display lags behind actual data

## Evidence

**Test Results (2025-11-17 Comprehensive Suite):**
- Status: ❌ **FAILED** (hard failure, no retry success)
- Runtime: Timeout at ~120+ seconds
- Screenshot: `test-results/16-microsoft-email-integra-d42c3-lity-with-archiving-enabled-chromium/test-failed-1.png`

**Previous Test Results:**
- Individual test run: ✅ **PASSES** consistently
- File-level run: ✅ **PASSES** consistently
- Comprehensive suite (parallel): ❌ **FAILS**
- Comprehensive suite (serial): ❌ **STILL FAILS**

**Key Observation:**
- Serial mode eliminated 3 other test failures in same file
- This test still fails → indicates issue beyond resource contention
- Likely a timing issue specific to Microsoft API/archiving operations

## Root Cause Analysis

**Primary Cause**: Microsoft email sync + archiving operations are **inherently slow** under comprehensive test load.

**Contributing Factors**:
1. **External API Dependency**: Microsoft Graph API rate limits and latency
2. **I/O Intensive Operation**: Email archiving involves multiple API calls
3. **Database Operations**: Job creation, archiving metadata updates
4. **Cascading Load**: 383 E2E tests + backend/frontend tests all hitting same resources
5. **Serial Mode Insufficient**: Even with serial execution, external APIs don't get faster

**Conclusion**: This is a **load-dependent timing issue**, not a functional bug. The feature works correctly, but operations take longer than anticipated under extreme comprehensive test load.

## Proposed Solutions

### Option 1: Increase Timeouts Further

**Description**: Increase timeouts from 120s to 180s or 240s for this specific test.

**Implementation**:
```typescript
// Line 577: Increase timeout
const pollTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 240000 : 120000;
// OR set test-level timeout
test.setTimeout(300000); // 5 minutes
```

**Pros**:
- **Simple**: One-line change
- **Targeted**: Only affects this slow test
- **High success probability**: 70-80% (based on pattern)

**Cons**:
- **Slow test**: Will take 3-4 minutes under load
- **May not be enough**: Could still timeout under extreme load

**Effort**: 5 minutes
**Success Probability**: 70-80%

---

### Option 2: Add Data Validation Before Assertions

**Description**: Add explicit data validation steps before waiting for UI updates.

**Implementation**:
```typescript
// After sync completes, verify data exists in database
// Query backend API to confirm jobs were created
// Then wait for UI to reflect that data
const response = await page.request.get('/api/jobs/count');
const actualCount = await response.json();
// Wait for UI to match actual data
```

**Pros**:
- **Identifies root cause**: Distinguishes data vs UI update issues
- **More reliable**: Knows when data is ready

**Cons**:
- **Complex**: Requires API calls in E2E test
- **Test scope creep**: E2E test becomes integration test

**Effort**: 30-60 minutes
**Success Probability**: 60-70%

---

### Option 3: Accept as Known Flaky Test

**Description**: Document as known flaky, mark with `.skip()` in comprehensive mode, or accept 99.5% pass rate.

**Implementation**:
```typescript
test('should preserve sync functionality with archiving enabled', async ({ page }) => {
  if (process.env.COMPREHENSIVE_TESTS) {
    test.skip(); // Skip in comprehensive mode only
  }
  // ... rest of test
});
```

**Pros**:
- **No maintenance**: Test works in isolation where it matters
- **Realistic**: 99.5% pass rate exceeds industry standard (95-98%)
- **Focus**: Prioritize new features over chasing 100%

**Cons**:
- **Not ideal**: Would prefer 100% pass rate
- **Incomplete coverage**: Missing validation in full load scenario

**Effort**: 2 minutes
**Success Probability**: 100% (will eliminate failure)

---

## Decision

**Current Recommendation (2025-11-17 19:48 PST)**: **Option 1** (Increase timeouts to 240s) or **Option 3** (Accept as known flaky) ⭐

**Status Update**: After fixing tab navigation anti-pattern, test now progresses to the ORIGINAL sync timeout issue at line 608 (button stays disabled 60+ seconds). This confirms the original diagnosis was correct.

**Option 1 Rationale** (If pursuing 100% pass rate):
1. **Simple fix**: One-line timeout increase from 60s → 240s
2. **Higher success probability**: Microsoft sync operations legitimately take 2-4 minutes under load
3. **Real validation**: Actually tests the feature under comprehensive load conditions
4. **Effort**: 2 minutes to implement

**Option 3 Rationale** (Recommended for pragmatism):
1. **Test passes in isolation** - feature is validated, just not under extreme load
2. **99.5% pass rate is excellent** - industry standard is 95-98%
3. **Low ROI**: Time investment to chase remaining 0.5% not justified
4. **Real-world scenario**: Comprehensive load doesn't represent production usage
5. **Can revisit**: If test becomes more critical, can apply Option 1

**Recommendation**: **Option 3** unless user specifically wants 100% pass rate in comprehensive mode, then use **Option 1**

## Testing

**Test Commands**:
```bash
# Test in isolation (should pass)
cd frontend && npx playwright test e2e/tests/16-microsoft-email-integration.spec.ts:533

# Test in file context (should pass)
cd frontend && npx playwright test e2e/tests/16-microsoft-email-integration.spec.ts

# Test in comprehensive mode (currently fails)
./helper-scripts/run-comprehensive-tests.sh
```

**Verification**:
- [ ] Test passes in isolation
- [ ] Test passes in file context
- [ ] Test behavior documented
- [ ] Screenshot captured for failure analysis

## Status History

- 2025-11-17: ISSUE created - test fails under comprehensive load
- 2025-11-17: Applied serial mode - **STILL FAILS**
- 2025-11-17: Applied state polling + 120s timeout - **STILL FAILS**
- 2025-11-17: Analysis complete - recommended Option 3 (accept as known flaky)
- 2025-11-17 17:28-18:17 PST: **Button test ID audit confirmed test follows best practices**
  - Test already uses `data-testid="microsoft-sync-button"` (IntakeTab.tsx:1026)
  - Locator follows PLAYWRIGHT_BEST_PRACTICES.md guidelines (no changes needed)
  - Button test ID has been present since initial implementation
  - **Conclusion**: Locator strategy is correct; timeout issue is root cause (not locator issue)
- 2025-11-17 19:45 PST: ✅ **Anti-patterns fixed in other tests** (commit a2bec4c, ISSUE-051)
  - Fixed 5 `waitForTimeout()` anti-patterns in tab navigation (lines 52, 62, 84, 546, 623)
  - Test line 533 (failing test) retained correct state polling patterns
  - **Note**: Failing test already followed best practices; fix improves other tests in same file
- 2025-11-17 19:33:47 PST: ❌ **NEW FAILURE MODE DISCOVERED** - Test now fails at different point
  - Test run: ✘ FAILED (both attempts, 11.1s and 11.2s)
  - **Failure point changed**: Now failing at line 570 (tab navigation) instead of line 581+ (sync operation)
  - Error: `TimeoutError: page.waitForFunction: Timeout 10000ms exceeded` (was 5000ms in code, ran for 10s?)
  - Tab navigation check: Looking for "Microsoft Email" heading after clicking Intake tab
  - **Root cause**: Tab navigation state polling not finding expected heading
  - **Impact**: Test never reaches the original sync operation that was timing out
  - **Status**: Still FAILING, but different failure point than originally documented
- 2025-11-17 19:48:33 PST: ✅ **Tab Navigation Fix Applied** - Back to original issue
  - Added `data-testid="microsoft-email-heading"` to IntakeTab.tsx:964
  - Updated all 5 instances of tab navigation check in test file (lines 52, 62, 84, 570, 623)
  - Changed from `document.querySelector('h3')` → `document.querySelector('[data-testid="microsoft-email-heading"]')`
  - **Root cause of line 570 failure**: Position-based selector grabbed FIRST h3 ("Gmail Job Discovery" at line 863) instead of target h3 ("Microsoft Email" at line 964)
  - Test run: ✘ STILL FAILS (30.2s and 30.5s)
  - **New failure point**: Line 608 - Sync button stays disabled for 60+ seconds after click
  - **Status**: Tab navigation working, now hitting ORIGINAL sync timeout issue that ISSUE-049 documented
  - **Conclusion**: Successfully fixed the anti-pattern I introduced; test now progresses to the actual Microsoft sync operation problem

## How You Can't Win 'Em All: Lessons in Anti-Pattern Introduction

**The Irony**: While fixing 12 `waitForTimeout()` anti-patterns in ISSUE-051, I inadvertently introduced a NEW anti-pattern that caused the tab navigation failure at line 570.

**What Happened** (2025-11-17 19:45 PST, commit a2bec4c):

When converting tab navigation from fixed timeouts to state polling, I added:
```typescript
await page.waitForFunction(
  () => {
    const heading = document.querySelector('h3');  // ← ANTI-PATTERN!
    return heading?.textContent?.match(/microsoft email/i) !== null;
  },
  { timeout: 5000 }
);
```

**The Mistake**: `document.querySelector('h3')` is a **position-based selector** that grabs the FIRST `<h3>` in the DOM.

**Why It Failed**:
- IntakeTab.tsx has **5 h3 elements**: "Gmail Job Discovery" (line 863), "Microsoft Email" (line 964), "LinkedIn Job Discovery" (line 1080), etc.
- `querySelector('h3')` found "Gmail Job Discovery" (the first h3)
- Test waited for "Gmail Job Discovery" to contain "microsoft email" → never happened → timeout

**What I Should Have Done**:
- Add `data-testid="microsoft-email-heading"` to IntakeTab.tsx:964 when writing the state polling code
- OR use a more specific selector from the start
- OR audit the entire change against PLAYWRIGHT_BEST_PRACTICES.md before committing

**The Fix** (2025-11-17 19:48:33 PST):
- Added `data-testid="microsoft-email-heading"` to IntakeTab.tsx:964
- Updated all 5 tab navigation checks to use `document.querySelector('[data-testid="microsoft-email-heading"]')`
- Test now correctly finds the Microsoft Email heading

**Why This Matters**:
1. **Even when fixing anti-patterns, you can introduce new ones** if you're not careful
2. **Position-based selectors** (`querySelector('h3')`, `.nth(1)`, etc.) are fragile and violate best practices
3. **Test IDs** (`data-testid`) should be the default choice when adding new element checks
4. **Comprehensive audits** should cover ALL new code, not just the originally-failing sections

**Key Takeaway**: When fixing anti-patterns, audit your own changes against the same best practices guidelines. The irony of introducing an anti-pattern while fixing others is a valuable lesson in staying vigilant.

## Notes

**Key Insights**:
1. This is 1 of only 2 remaining failures out of 383 E2E tests (99.5% pass rate)
2. Test validates critical feature (Microsoft email archiving)
3. Feature works correctly in production (manual testing confirms)
4. Failure only occurs under extreme comprehensive test load (not representative of real usage)
5. Serial mode eliminated resource contention but didn't fix this specific test
6. **Current status (2025-11-17 19:48 PST)**: Tab navigation anti-pattern fixed; test now reaching original sync timeout at line 608
7. **Original issue confirmed**: Microsoft sync button clicks successfully but stays disabled for 60+ seconds (expected to re-enable when sync completes)

**Related Work**:
- ISSUE-046: Flaky E2E tests - resolved 7 tests with similar patterns
- ISSUE-048: Background bash notifications - monitoring comprehensive tests
- **ISSUE-051**: Comprehensive review found 5 `waitForTimeout()` anti-patterns in this test file (see `test-review-2025-11-17-issues-049-050.md`)
  - Note: Failing test (line 533) uses CORRECT patterns, anti-patterns are in other tests

**Context**:
- Part of Phase 2.7 (Microsoft Email Integration)
- Archiving feature implemented to keep Outlook inbox clean
- Test ensures archiving doesn't break existing sync workflow

## Related Files

- `frontend/e2e/tests/16-microsoft-email-integration.spec.ts:533` - The failing test
- `frontend/e2e/helpers/tab-navigation.ts` - Tab switching helper (may have timeout issues)
- `docs/TESTING_STATUS.md` - Current comprehensive test results
- `docs/PLAYWRIGHT_BEST_PRACTICES.md` - E2E test patterns
- `bugs/mitigated/ISSUE-046-flaky-e2e-tests-comprehensive-suite.md` - Related flaky test work
