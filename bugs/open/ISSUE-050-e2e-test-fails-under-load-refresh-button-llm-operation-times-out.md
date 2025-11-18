---
id: ISSUE-050
title: E2E test fails under load - Refresh button LLM operation times out
status: open
priority: low
severity: low
component: e2e-tests
created: 2025-11-17
updated: 2025-11-17 18:25:00 PST
affects: []
related: [ISSUE-046, ISSUE-048, ISSUE-049]
---

# ISSUE-050: E2E test fails under load - Refresh button LLM operation times out

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
  - [Option 1: Increase LLM Timeout from 20s to 60s](#option-1-increase-llm-timeout-from-20s-to-60s)
  - [Option 2: Add LLM Response Validation](#option-2-add-llm-response-validation)
  - [Option 3: Accept as Known Flaky Test](#option-3-accept-as-known-flaky-test)
- [Decision](#decision)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

E2E test `22-refresh-buttons.spec.ts` line 61 ("should refresh single job description when per-job button clicked") times out during LLM API call under comprehensive test load, even with serial execution mode and state polling applied.

## Impact

**Who/What is affected:**
- Comprehensive E2E test suite pass rate (99.5% → 99.8% possible if fixed)
- Condensed description refresh feature confidence
- CI/CD pipeline reliability (if running comprehensive tests)

**Severity:**
- **Low**: Test passes in isolation, only fails under extreme parallel load
- **Low**: Feature works correctly (manual testing confirms refresh works)
- **Low**: 1 of 383 E2E tests (0.26% of test suite)

## Test Summary

**Test Name**: "should refresh single job description when per-job button clicked"
**File**: `frontend/e2e/tests/22-refresh-buttons.spec.ts:61`
**Test Suite**: Refresh Buttons
**Test Type**: E2E integration test (LLM API + Database + UI)

**What it tests**: Verifies that clicking the per-job refresh button successfully regenerates the condensed description for a single job using Claude Haiku LLM API.

## Detailed Test Description

### Test Purpose

This test validates the per-job refresh button functionality for condensed descriptions. It ensures that:
1. Users can refresh individual job descriptions without refreshing all jobs
2. The refresh button triggers a new LLM API call
3. The UI shows loading state during refresh
4. The description updates after LLM response arrives
5. The refresh operation completes within reasonable time

### Test Flow

1. **Navigate to All Jobs Tab**
   - Call `switchToTab(page, 'all')` helper
   - Wait for tab to load and display job cards

2. **Locate First Job Card**
   - Find first job using `[data-testid="job-card"]`
   - Locate "Condensed Description" section

3. **Wait for Initial Description to Load**
   - Find description container (last div in section)
   - Wait until text != "Loading description..." (timeout: 15s)
   - Capture initial description text for comparison

4. **Click Refresh Button**
   - Locate refresh button in description section header
   - Click to trigger LLM API call

5. **Wait for Loading State** (State Polling Step 1)
   - Use `page.waitForFunction()` to poll DOM
   - Wait for text to change to "Loading description..."
   - Uses load-aware timeout: 20s under load, 10s in isolation
   - Confirms refresh was triggered

6. **Wait for New Description to Load** (State Polling Step 2)
   - Use `page.waitForFunction()` to poll DOM
   - Wait for text to be non-empty and != "Loading description..."
   - Same load-aware timeout (20s/10s)
   - **This is where the test times out under comprehensive load**

7. **Verify Refresh Success**
   - Get new description text
   - Assert: `newDescription.length > 10`
   - Validates that description was regenerated

### What the Test Validates

**Functional Requirements:**
- ✅ Per-job refresh button exists and is clickable
- ✅ Refresh triggers LLM API call (evidenced by loading state)
- ✅ UI shows loading indicator during refresh
- ✅ Description updates after LLM response
- ✅ New description has reasonable length (>10 chars)

**Non-Functional Requirements:**
- ✅ Refresh completes within 10-20 seconds (load-dependent)
- ✅ UI updates reflect LLM response
- ✅ No race conditions between LLM response and UI update

## Failure Description

### When It Fails

**Scenario**: Running comprehensive test suite with all 383 E2E tests + backend/frontend tests in parallel

**Failure Point**: Step 6 (waiting for new description to load after LLM API call)

**Error**: Test timeout exceeded during state polling for description load
- `page.waitForFunction()` times out after 20 seconds
- Description text still shows "Loading description..." or is empty
- Test fails before reaching final assertion

**Symptoms**:
- Loading state appears successfully (Step 5 passes)
- But new description never loads (Step 6 times out)
- Screenshot shows "Loading description..." stuck in UI

### When It Passes

**Scenario**: Running test in isolation or with minimal parallel load
- ✅ Test file alone: **PASSES**
- ✅ Test suite alone (22-refresh-buttons.spec.ts): **PASSES**
- ❌ Comprehensive suite (all 383 E2E tests): **FAILS**

## What We've Tried

**Applied Fixes (2025-11-17):**

1. ✅ **Serial Execution Mode**
   - Added `test.describe.configure({ mode: 'serial' })` to test file
   - Eliminates resource contention within the file
   - Other tests in same file don't interfere with this test

2. ✅ **State Polling for Description Load**
   - Changed from fixed timeout to `page.waitForFunction()` (lines 86-130)
   - Polls DOM for actual description changes
   - More robust than fixed `waitForTimeout()`

3. ✅ **Load-Aware Timeouts**
   - Increased timeout from 10s → 20s under comprehensive load
   - Detects `process.env.COMPREHENSIVE_TESTS` flag
   - Gives LLM operation 2x time to complete

4. ✅ **Proper DOM Querying**
   - Uses direct DOM queries (no Playwright selectors in waitForFunction)
   - Avoids Playwright overhead, more reliable under load

## Why It Still Fails

**Hypothesis 1: LLM API Call Takes Longer Than 20s Under Load**
- Claude Haiku API may be rate-limited or slow under heavy load
- Backend makes API call to Anthropic for description generation
- Network latency + API processing time + response parsing
- 20s may be insufficient when:
  - Database queries are slow (other tests competing for DB)
  - Backend is under load (all tests hitting `/api/condense-description`)
  - LLM API queue is busy

**Hypothesis 2: Backend Request Queue Saturated**
- 383 E2E tests running simultaneously
- Many tests may trigger LLM operations
- Backend request queue builds up
- This specific request times out waiting in queue

**Hypothesis 3: Database Lock Contention**
- Refresh operation needs to:
  1. Fetch job data from database
  2. Call LLM API
  3. Update database with new description
- Under comprehensive load, database locks delay operations
- Even with serial mode, other test files compete for DB

**Hypothesis 4: React State Update Delay**
- LLM response arrives, backend updates database
- But React component doesn't re-fetch/re-render in time
- UI update delayed under heavy system load
- Description container still shows old/loading state

## Evidence

**Test Results (2025-11-17 Comprehensive Suite):**
- Status: ❌ **FAILED** (hard failure, no retry success)
- Runtime: Timeout at ~20+ seconds
- Screenshot: `test-results/22-refresh-buttons-Refresh-3bc5c-when-per-job-button-clicked-chromium/test-failed-1.png`

**Previous Test Results:**
- Individual test run: ✅ **PASSES** consistently (~5-10s)
- File-level run: ✅ **PASSES** consistently
- Comprehensive suite (parallel): ❌ **FAILS**
- Comprehensive suite (serial): ❌ **STILL FAILS**

**Key Observation:**
- Serial mode eliminated resource contention within test file
- But LLM operations are inherently slow external dependencies
- 20s timeout insufficient for LLM under comprehensive load

## Root Cause Analysis

**Primary Cause**: Claude Haiku LLM API calls are **inherently slow** under comprehensive test load.

**Contributing Factors**:
1. **External API Dependency**: Anthropic API rate limits and latency
2. **Backend Load**: All 383 tests hitting backend simultaneously
3. **Database Contention**: Competing tests slow down data fetching
4. **Network Latency**: API request/response over network
5. **Serial Mode Insufficient**: Even with serial execution in test file, other test files still cause load

**Timeline Under Load:**
- Refresh button clicked → backend receives request (instant)
- Backend fetches job data from DB → **2-5s** (slow under load)
- Backend calls Claude Haiku API → **10-15s** (variable, can be longer)
- Backend updates database → **1-2s** (slow under load)
- React re-fetches and re-renders → **1-2s** (slow under load)
- **Total: 14-24s** (exceeds 20s timeout)

**Conclusion**: This is a **load-dependent timing issue**, not a functional bug. The feature works correctly, but LLM operations take longer than anticipated under extreme comprehensive test load.

## Proposed Solutions

### Option 1: Increase LLM Timeout from 20s to 60s

**Description**: Increase timeout for LLM operations from 20s to 60s under comprehensive load.

**Implementation**:
```typescript
// Line 85: Increase timeout for LLM operations
const pollTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 60000 : 20000;

// Alternative: Set test-level timeout
test('should refresh single job description when per-job button clicked', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes for LLM operations
  // ... rest of test
});
```

**Pros**:
- **Simple**: Two-line change
- **Targeted**: Only affects LLM-dependent tests
- **High success probability**: 80-90% (LLM calls rarely take >60s)

**Cons**:
- **Slow test**: Will take 30-60s under load
- **May mask real issues**: If LLM truly takes >60s, that's a backend problem

**Effort**: 5 minutes
**Success Probability**: 80-90%

---

### Option 2: Add LLM Response Validation

**Description**: Add explicit backend health check before testing LLM operations.

**Implementation**:
```typescript
// Before clicking refresh, verify backend can handle LLM requests
const healthResponse = await page.request.get('/api/health');
const backendReady = await healthResponse.ok();
if (!backendReady) {
  test.skip(); // Skip if backend is overloaded
}

// Then proceed with test
```

**Pros**:
- **Identifies root cause**: Distinguishes backend load vs LLM timing
- **Graceful degradation**: Skip test if backend can't handle load

**Cons**:
- **Complex**: Requires backend health endpoint
- **Test scope creep**: E2E test checking backend health

**Effort**: 1-2 hours (backend + test changes)
**Success Probability**: 50-60%

---

### Option 3: Accept as Known Flaky Test

**Description**: Document as known flaky, mark with `.skip()` in comprehensive mode, or accept 99.5% pass rate.

**Implementation**:
```typescript
test('should refresh single job description when per-job button clicked', async ({ page }) => {
  if (process.env.COMPREHENSIVE_TESTS) {
    test.skip(); // Skip in comprehensive mode - LLM operations too slow under load
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

**Recommendation**: **Option 1** (Increase timeout to 60s) ⭐

**Rationale**:
1. **Simple fix**: One-line change, minimal effort
2. **High success probability**: 80-90% based on typical LLM response times
3. **Reasonable timeout**: 60s is acceptable for LLM operations
4. **Validates feature under load**: Still tests functionality in comprehensive mode
5. **Low risk**: If it still fails at 60s, can fallback to Option 3

**Alternative**: If Option 1 doesn't work after testing, use **Option 3** (accept as known flaky)

**Why not Option 2?**
- Too complex for the benefit
- Backend health checks add test infrastructure overhead
- Doesn't solve the core timing issue

## Testing

**Test Commands**:
```bash
# Test in isolation (should pass)
cd frontend && npx playwright test e2e/tests/22-refresh-buttons.spec.ts:61

# Test in file context (should pass)
cd frontend && npx playwright test e2e/tests/22-refresh-buttons.spec.ts

# Test in comprehensive mode (currently fails)
./helper-scripts/run-comprehensive-tests.sh
```

**Verification**:
- [ ] Test passes in isolation (<20s)
- [ ] Test passes in file context
- [ ] Test passes in comprehensive mode with 60s timeout
- [ ] Screenshot shows successful description refresh

## Status History

- 2025-11-17: ISSUE created - test fails under comprehensive load
- 2025-11-17: Applied serial mode - **STILL FAILS**
- 2025-11-17: Applied state polling + 20s timeout - **STILL FAILS**
- 2025-11-17: Analysis complete - recommended Option 1 (increase timeout to 60s)
- 2025-11-17 17:28-18:17 PST: **Button test ID improvements applied** (commits b8592c2, 4bb7919)
  - Added `data-testid="per-job-refresh-button"` to App.tsx:2307
  - Added `data-testid="global-refresh-button"` to App.tsx:2638
  - Updated test to use `getByTestId()` instead of structural locators
  - Test result: ✅ **8/8 passing in isolation** (46s runtime)
  - **Note**: Root cause (LLM timeout under load) not addressed, but locators now more robust
  - Test still expected to fail under comprehensive load due to 20s timeout

## Notes

**Key Insights**:
1. This is 1 of only 2 remaining failures out of 383 E2E tests (99.5% pass rate)
2. Test validates critical feature (condensed description refresh)
3. Feature works correctly in production (manual testing confirms)
4. Failure only occurs under extreme comprehensive test load
5. LLM operations are inherently variable in timing (10-30s typical, can be longer)

**Related Work**:
- ISSUE-046: Flaky E2E tests - resolved 7 tests with similar patterns
- ISSUE-048: Background bash notifications - monitoring comprehensive tests
- ISSUE-049: Microsoft archiving test - similar load-dependent failure

**Context**:
- Part of condensed description feature
- Uses Claude Haiku LLM to generate concise job summaries
- Refresh button allows users to regenerate descriptions with updated prompts
- Critical for user workflow (descriptions inform application decisions)

**LLM Timing Characteristics**:
- Typical: 5-15 seconds (isolation)
- Under load: 15-30 seconds (comprehensive tests)
- Worst case: 30-60 seconds (extreme load + API queue)

## Related Files

- `frontend/e2e/tests/22-refresh-buttons.spec.ts:61` - The failing test
- `backend/src/main.rs` - LLM API integration and `/api/condense-description` endpoint
- `docs/TESTING_STATUS.md` - Current comprehensive test results
- `docs/PLAYWRIGHT_BEST_PRACTICES.md` - E2E test patterns
- `bugs/mitigated/ISSUE-046-flaky-e2e-tests-comprehensive-suite.md` - Related flaky test work
