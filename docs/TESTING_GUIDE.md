---
document_type: testing_guide
purpose: General testing principles, investigation workflows, and examples for all testing activities
scope: Applies to all testing - whether from auto-test-plan, bugs, issues, or ad-hoc testing
relationship: Reference guide used during execution of README_auto-test-plan.md or any testing work
update_policy: Update when new testing patterns emerge or investigation techniques are discovered
content_lifecycle: Living reference document - grows as testing practices evolve
related_docs:
  - README_auto-test-plan.md (testing plan)
  - TESTING_STATUS.md (testing results)
  - CLAUDE.md (core testing standards)
last_updated: 2025-11-19
---

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Testing Investigation Guide](#testing-investigation-guide)
  - [Investigation Examples](#investigation-examples)
    - [Example 1: Single Test Failure](#example-1-single-test-failure)
    - [Example 2: Skipped Tests](#example-2-skipped-tests)
    - [Example 3: Performance Degradation](#example-3-performance-degradation)
  - [Detailed Investigation Workflows](#detailed-investigation-workflows)
    - [When Tests Fail](#when-tests-fail)
    - [When Tests Are Skipped](#when-tests-are-skipped)
    - [When Warnings Appear](#when-warnings-appear)
  - [Performance Baselines](#performance-baselines)
  - [Test Log Files](#test-log-files)
  - [Common Test Issues & Solutions](#common-test-issues--solutions)
    - [Issue: Mock not returning expected data](#issue-mock-not-returning-expected-data)
    - [Issue: Timing/async problems](#issue-timingasync-problems)
    - [Issue: Orphaned processes causing slowdown](#issue-orphaned-processes-causing-slowdown)
  - [Case Study: Pattern Recognition in Test Failures](#case-study-pattern-recognition-in-test-failures)
    - [The Investigation Process](#the-investigation-process)
      - [1. **Initial Clue: Description Suggests Timing, Not Breakage**](#1-initial-clue-description-suggests-timing-not-breakage)
      - [2. **Read the Test Code - Spot the Anti-Pattern**](#2-read-the-test-code---spot-the-anti-pattern)
      - [3. **The Smoking Gun: Test Passes in Isolation**](#3-the-smoking-gun-test-passes-in-isolation)
      - [4. **Pattern Matching Against Known Issues**](#4-pattern-matching-against-known-issues)
      - [5. **The Pattern Match Table**](#5-the-pattern-match-table)
      - [6. **Key Insight: Two Descriptions, Same Phenomenon**](#6-key-insight-two-descriptions-same-phenomenon)
      - [7. **Hypothesis Verification**](#7-hypothesis-verification)
    - [The Solution Applied](#the-solution-applied)
    - [Key Lessons](#key-lessons)
    - [Investigation Checklist for "Fails Under Load" Pattern](#investigation-checklist-for-fails-under-load-pattern)
    - [Why Documentation Matters](#why-documentation-matters)
  - [Accountability Checklist](#accountability-checklist)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Testing Investigation Guide

**Purpose**: Detailed examples and tutorials for investigating test failures, following the principles in [CLAUDE.md](../CLAUDE.md#testing--verification-standards).

**When to use this guide**:
- Learning how to investigate test failures systematically
- Reference examples when encountering similar issues
- Training new developers on testing standards
- Debugging complex test failures

**See also**:
- [CLAUDE.md - Testing & Verification Standards](../CLAUDE.md#testing--verification-standards) - Core principles and requirements
- [TESTING_STATUS.md](TESTING_STATUS.md) - Current test status and progress
- [README_dev.md - Test Scripts](../README_dev.md#run-testssh) - Script documentation

---

## Investigation Examples

### Example 1: Single Test Failure

**Scenario**: One test fails out of 78 passing tests.

```
User: "Run the frontend tests"

Claude:
✅ Ran frontend tests with ./run-tests.sh

Results: 77/78 passing (98.7%)
❌ 1 failure detected

[Claude reads test output]
[Claude reads failing test file]
[Claude reads component being tested]
[Claude reads test log for stack trace]

The failure is in IntakeTab.test.tsx:245:
- Test: "should handle source identification"
- Expected: API response includes sourceType field
- Actual: sourceType is undefined
- Root cause: Mock API response missing sourceType field in test setup

This is a test bug, not a component bug. The mock in line 38 needs to include:
  sourceType: 'gmail'

Let me fix this...
```

**Key takeaways**:
- Read the test file to understand intent
- Read the component to understand actual behavior
- Check logs for full stack traces
- Identify root cause (test bug vs app bug)
- Propose specific fix with reasoning

### Example 2: Skipped Tests

**Scenario**: Tests pass but some are skipped - need to understand why.

```
User: "Run the frontend tests"

Claude:
✅ Ran frontend tests with ./run-tests.sh

Results: 78/78 passing (100%)
⏭️ 2 tests skipped

[Claude searches for .skip() in test files]
[Claude reads comments explaining why]

Found 2 skipped tests in CalendarTab.test.tsx:
1. Line 82: "should sync with Google Calendar"
   - Reason: Google Calendar API integration not yet implemented
   - Tracked in: ISSUE-018 Phase 3
   - Assessment: Intentional skip, properly documented

2. Line 183: "should handle recurring events"
   - Reason: Unclear - no comment, no tracking issue
   - Assessment: May be forgotten or obsolete
   - Recommendation: Investigate if this should be un-skipped

Would you like me to investigate test #2 further?
```

**Key takeaways**:
- Skipped tests require investigation, not just acceptance
- Check for `.skip()` or `.todo()` in source files
- Verify intentional skips are tracked in issues
- Flag unintentional or obsolete skips
- Ask user if unclear cases need further investigation

**Investigation steps for skipped tests**:
```bash
# 1. Find the .skip() or .todo() in source
Grep "\.skip\(\)" or "\.todo\(\)" in test files

# 2. Read comments explaining why
# 3. Determine if skip is:
#    - Intentional (work in progress) → OK, verify it's tracked
#    - Accidental (forgotten) → Flag for fixing
#    - Obsolete (reason no longer applies) → Suggest un-skipping

# 4. Check related issue tracker
# 5. Report findings to user
```

### Example 3: Performance Degradation

**Scenario**: All tests pass but execution time is significantly slower than baseline.

```
User: "Run the Phase 2A tests"

Claude:
✅ Ran Phase 2A tests (18 tests)

Results: 18/18 passing (100%)
⚠️ Performance concern detected

Execution time: 45 seconds
Expected: 5-10 seconds
Degradation: 4.5-9x slower than baseline

[Claude checks system resources]
[Claude reviews test log]

Investigation:
- System resources: OK (no CPU/memory pressure)
- No hanging or timeouts visible
- Pattern: All tests slow, not just specific suite

Running system health check...
[Claude runs ./system-health-check.sh]

Found: 12 orphaned Node.js processes from previous test runs
Recommendation: Run cleanup and re-test

./system-health-check.sh --cleanup

[After cleanup]
Re-running tests...
Execution time: 8 seconds ✅ (back to baseline)
```

**Key takeaways**:
- Performance degradation requires investigation
- Compare actual vs baseline execution times
- Check system resources with health check script
- Look for patterns (specific suite vs all tests)
- Clean up orphaned processes
- Re-test after cleanup to verify fix

**Performance investigation steps**:
```bash
# 1. Compare with baseline
echo "Expected: 10s, Actual: 45s → 4.5x slower (investigate)"

# 2. Check system resources
./system-health-check.sh

# 3. Look for patterns
# - Specific test suite slow?
# - All tests slow?
# - Only first run slow (cold start)?

# 4. Review test logs for timeouts or hangs
grep -i "timeout\|hang" logs/frontend-tests/*.log

# 5. Check for orphaned processes
# - Look for multiple Node.js or Jest processes
# - Run cleanup if found

# 6. Re-run tests after cleanup
# - Verify performance returns to baseline
```

---

## Detailed Investigation Workflows

### When Tests Fail

**Step-by-step process**:

1. **Read Full Test Output**
   - Don't just count passed/failed - read the error messages
   - Look for patterns (same error repeated, related failures)
   - Note any warnings or deprecation notices
   - Check execution times for anomalies

2. **Read the Test File**
   ```bash
   Read frontend/src/components/IntakeTab.test.tsx
   ```
   - Understand what the test is trying to validate
   - Check test setup (mocks, fixtures, beforeEach)
   - Identify test assertions and expected behavior

3. **Read the Component Being Tested**
   ```bash
   Read frontend/src/components/IntakeTab.tsx
   ```
   - Understand actual implementation
   - Compare implementation vs test expectations
   - Look for recent changes (git blame/log)

4. **Check Test Logs**
   ```bash
   Read logs/frontend-tests/test-run-TIMESTAMP.log
   ```
   - Full stack traces often in logs, not console
   - Look for clues about timing issues
   - Check for suppressed warnings

5. **Identify Root Cause**
   - Is it a test bug (bad mock, wrong assertion)?
   - Is it an app bug (incorrect implementation)?
   - Is it a timing issue (async/await problem)?
   - Is it environmental (missing dependency, wrong data)?

6. **Propose Fix with Reasoning**
   - Explain what's wrong and why
   - Provide specific code fix
   - Explain how fix addresses root cause
   - Consider if other tests have same issue

### When Tests Are Skipped

**Investigation checklist**:

- [ ] Find `.skip()` or `.todo()` in test source code
- [ ] Read comments explaining why test is skipped
- [ ] Determine skip category:
  - **Intentional** (work in progress): Verify tracked in issue
  - **Accidental** (forgotten): Flag for fixing
  - **Obsolete** (reason no longer applies): Suggest un-skipping
- [ ] Check issue tracker for related work
- [ ] Report findings to user with recommendation

### When Warnings Appear

**Warning categories requiring investigation**:

| Warning Type | Action Required |
|--------------|----------------|
| Deprecation warnings | Check if library updates needed |
| Performance warnings | Check for bottlenecks, inefficient code |
| Memory warnings | Check for leaks, excessive allocations |
| Security warnings | **Immediate attention required** |
| Type warnings | Fix TypeScript errors, improve type safety |

**Investigation steps**:
```bash
# 1. Identify warning source
grep -i "warning\|deprecated" logs/frontend-tests/*.log

# 2. Check library versions
npm list <package-name>

# 3. Research deprecation timeline
# - Check package documentation
# - Look for migration guides

# 4. Plan fix
# - Update package if needed
# - Refactor code to avoid deprecated API
# - File issue if fix is complex
```

---

## Performance Baselines

**Expected Execution Times** (for comparison):

| Test Suite | Expected Time | Investigation Threshold |
|------------|--------------|-------------------------|
| Frontend unit tests (all) | 15-25 seconds | >50 seconds (>2x) |
| Frontend Phase 2A (18 tests) | 5-10 seconds | >20 seconds (>2x) |
| Backend cargo test (78 tests) | 2-5 seconds | >10 seconds (>2x) |
| E2E tests (full suite) | 3-5 minutes | >10 minutes (>2x) |

**When to investigate**:
- Execution time >2x expected baseline
- Gradual degradation over multiple runs
- Tests hang or time out
- Resource usage spikes

---

## Test Log Files

**Location**: `logs/frontend-tests/test-run-TIMESTAMP.log`

**When to review logs**:
- Tests failed unexpectedly
- Performance degraded
- Output looked unusual
- User asks for deep dive
- Warnings or errors suppressed in console

**Useful log searches**:
```bash
# Find all recent test logs
ls -lt logs/frontend-tests/ | head -10

# Search for errors
grep -i "error" logs/frontend-tests/test-run-TIMESTAMP.log

# Search for timeouts
grep -i "timeout\|hang" logs/frontend-tests/*.log

# Search for specific test
grep "IntakeTab.test.tsx" logs/frontend-tests/test-run-TIMESTAMP.log
```

---

## Common Test Issues & Solutions

### Issue: Mock not returning expected data

**Symptoms**:
- Test fails with "undefined" or "null" values
- Expected data doesn't match actual

**Investigation**:
1. Read mock setup in test file
2. Check what mock function returns
3. Verify mock matches API contract

**Solution**: Update mock to return correct data structure

---

### Issue: Timing/async problems

**Symptoms**:
- Tests fail intermittently (flaky)
- "Element not found" or "Query failed"
- Works sometimes, fails other times

**Investigation**:
1. Check for `waitFor()` or `await` keywords
2. Look for race conditions
3. Check if component uses async state updates

**Solution**: Add proper `waitFor()` assertions, increase timeouts if needed

---

### Issue: Orphaned processes causing slowdown

**Symptoms**:
- Tests progressively slower
- High memory usage
- Multiple Node.js processes

**Investigation**:
1. Run `./system-health-check.sh`
2. Check process counts
3. Identify orphaned processes

**Solution**: Run `./system-health-check.sh --cleanup`

---

## Case Study: Pattern Recognition in Test Failures

**Real Example**: How Test #504 was diagnosed as identical to Test #511 (2025-11-19)

**Scenario**: Test #504 appears in TESTING_STATUS.md Priority 2 with description:
> "Refresh button click doesn't trigger LLM extraction - description never changes"
> "Test waits 120s for 'Loading description...' but it never appears"

### The Investigation Process

#### 1. **Initial Clue: Description Suggests Timing, Not Breakage**

The phrasing "doesn't trigger" and "never appears" suggested this wasn't truly **broken** (functional issue), but rather a **timing/observation issue** - the test is *waiting* for something that doesn't happen.

**Key insight**: If the button was truly broken, the description would be "button click has no effect" or "handler not firing." Instead, it says the result "never appears" - suggesting the operation happens, but the expected outcome isn't observed.

#### 2. **Read the Test Code - Spot the Anti-Pattern**

Read `frontend/e2e/tests/22-refresh-buttons.spec.ts:61`:

```typescript
// Line 82: await refreshButton.click();
// Line 88: await expect(descriptionText).toHaveText('Loading description...', { timeout: pollTimeout });
```

**Pattern observed**:
- Click button
- Wait for UI "Loading..." state to appear
- LLM operation in the background

This is a known anti-pattern from previous investigations.

#### 3. **The Smoking Gun: Test Passes in Isolation**

Ran the test: `npx playwright test e2e/tests/22-refresh-buttons.spec.ts:61`

**Result**: ✅ PASSED in 5.7 seconds

**Critical reasoning**:
- If it was a **functional issue** (button broken, event handler not firing, state management bug), it would **fail in isolation** too
- But it **passed**, which proves:
  - ✅ Button works
  - ✅ Event handler fires
  - ✅ API call happens
  - ✅ UI updates

**Conclusion**: The ONLY difference between isolation (passes) and comprehensive suite (fails) is **LOAD**.

#### 4. **Pattern Matching Against Known Issues**

Searched `docs/TESTING_STATUS.md` for similar patterns and found Test #511 (lines 384-409):

> **Root Cause**: Test waited for UI loading state, but under heavy load (4 parallel workers):
> - Backend LLM queue is backed up from other test files
> - UI doesn't show "Loading..." because API call is queued (not started yet)
> - Test times out waiting for state that never appears

> **Solution Applied**: Replace UI state wait with API response wait

#### 5. **The Pattern Match Table**

| Aspect | Test #504 | Test #511 |
|--------|-----------|-----------|
| **Operation** | Refresh button (LLM) | Refresh button (LLM) |
| **Test Pattern** | Wait for "Loading..." UI state | Wait for "Loading..." UI state |
| **Isolation** | ✅ Passes (5.7s) | ✅ Passed (4.7s) |
| **Under Load** | ❌ Fails (2.1m timeout) | ❌ Failed (120s timeout) |
| **Root Cause** | LLM queue backed up | LLM queue backed up |
| **Fix** | API response wait | API response wait |

**Patterns matched exactly.**

#### 6. **Key Insight: Two Descriptions, Same Phenomenon**

**Test #504 description** (external observation):
> "Refresh button click doesn't trigger LLM extraction"

**Test #511 root cause** (after investigation):
> "LLM queue backlog prevented UI from showing 'Loading...' state under load"

These describe **the same phenomenon from different perspectives**:
- **User sees**: Button doesn't work
- **Reality**: Button works, but LLM queue is backed up, so UI state never appears before timeout

#### 7. **Hypothesis Verification**

**Hypothesis**: "Test #504 = Test #511 pattern because it passes in isolation"

**Predictions if hypothesis is true**:
- Test should pass in isolation → ✅ Confirmed (5.7s)
- Same fix (API response wait) should work → ✅ Confirmed (5.4s after fix)

**Predictions if hypothesis is false**:
- Test would fail in isolation → ❌ But it passed!
- Fix wouldn't help → ❌ But it did!

**Conclusion**: Hypothesis validated. Test #504 is the same pattern as Test #511.

### The Solution Applied

Applied the proven Test #511 fix:

```typescript
// Set up API response wait BEFORE clicking (avoids race condition)
const responsePromise = page.waitForResponse(
  response => response.url().includes('/condense-description') && response.status() === 200,
  { timeout: 120000 }
);

// Click refresh button
await refreshButton.click();

// Wait for API response (guarantees operation completed)
await responsePromise;

// Verify UI updated
await expect(descriptionText).not.toHaveText('Loading description...', { timeout: 10000 });
```

**Result**: Test #504 now passes reliably (5.4s) with API wait pattern.

### Key Lessons

**1. "Doesn't work" ≠ Broken**

When tests "don't work" under load but pass in isolation:
- It's usually NOT a functional bug
- It's usually a timing/observation issue
- The operation happens, but test can't observe the expected intermediate states

**2. Run in Isolation First**

Before deep investigation, always run the test in isolation:
```bash
npx playwright test path/to/test.spec.ts:line
```

If it passes, you immediately know:
- ✅ Code is functionally correct
- ❌ Test has load/timing issue
- 🎯 Focus investigation on race conditions and state observation

**3. Pattern Matching Saves Time**

Good documentation enables pattern recognition:
- Test #511 was investigated thoroughly and documented
- When Test #504 appeared with similar symptoms, pattern matching was instant
- Without that documentation, would have re-investigated the same root cause

**4. Empirical Evidence Beats Assumptions**

Don't assume based on error message alone:
- **Error message**: "Button doesn't trigger extraction"
- **Assumption**: Button is broken
- **Empirical test**: Runs in isolation → passes → button works!
- **Reality**: LLM queue backlog prevents UI state observation

### Investigation Checklist for "Fails Under Load" Pattern

When a test fails under comprehensive suite load but passes in isolation:

- [ ] **Run test in isolation** - Confirms functional correctness
- [ ] **Check for UI state waits** - Look for `expect(...).toHaveText('Loading...')`
- [ ] **Check for async operations** - API calls, LLM operations, database queries
- [ ] **Search for similar patterns** - Review TESTING_STATUS.md and TESTING_HISTORY.md
- [ ] **Consider race conditions** - Does test wait for state that might never appear?
- [ ] **Replace UI waits with API waits** - Use `page.waitForResponse()` instead
- [ ] **Verify fix in isolation** - Test should still pass
- [ ] **Document the pattern** - Add to test investigation history for future reference

### Why Documentation Matters

This case study demonstrates the **compound value of good documentation**:

1. **Test #511** was investigated → root cause identified → solution documented
2. **Test #504** appeared months later with similar symptoms
3. **Pattern recognition** was instant because Test #511 was well-documented
4. **Solution** was applied in minutes instead of hours
5. **This case study** now documents the meta-reasoning for future investigations

**Time saved**: ~2 hours (deep investigation avoided through pattern recognition)

**Documentation used**:
- `docs/TESTING_STATUS.md` (Test #511 root cause and solution)
- `docs/PLAYWRIGHT_BEST_PRACTICES.md` (API wait vs UI state wait patterns)
- Test code reading (recognizing the anti-pattern)

**Related Commits**:
- Test #511 fix: `cd5e440` (ISSUE-055 Priority 1)
- Test #504 fix: `6658f43` (applied same pattern)

---

## Accountability Checklist

**Hold Claude accountable** - If you ever see:

- [ ] Just pass/fail stats without investigation
- [ ] Ignoring skipped tests
- [ ] Not reading error messages or stack traces
- [ ] Marking work complete without running tests
- [ ] Superficial "looks good" without verification
- [ ] Not checking performance baselines
- [ ] Skipping log file review when tests fail

**Please call it out immediately.** These examples codify the investigation standard expected for every test run.
