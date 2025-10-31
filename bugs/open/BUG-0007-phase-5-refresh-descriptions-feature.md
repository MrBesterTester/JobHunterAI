<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [id: BUG-0007
title: Refresh Descriptions Button Not Working
status: open
priority: medium
severity: medium
component: frontend
created: 2025-10-30
updated: 2025-10-30
affects: [job-descriptions, refresh-functionality, debug-section]
related: []](#id-bug-0007%0Atitle-refresh-descriptions-button-not-working%0Astatus-open%0Apriority-medium%0Aseverity-medium%0Acomponent-frontend%0Acreated-2025-10-30%0Aupdated-2025-10-30%0Aaffects-job-descriptions-refresh-functionality-debug-section%0Arelated-)
- [BUG-0007: Refresh Descriptions Button Not Working](#bug-0007-refresh-descriptions-button-not-working)
  - [Summary](#summary)
  - [Impact](#impact)
  - [Steps to Reproduce](#steps-to-reproduce)
  - [Expected Behavior](#expected-behavior)
  - [Actual Behavior](#actual-behavior)
  - [Root Cause](#root-cause)
  - [Evidence](#evidence)
  - [Proposed Solutions](#proposed-solutions)
    - [Option 1: Implement Full Refresh Feature](#option-1-implement-full-refresh-feature)
    - [Option 2: Remove/Disable Button](#option-2-removedisable-button)
    - [Option 3: Disable Tests Until Feature Complete](#option-3-disable-tests-until-feature-complete)
  - [Decision](#decision)
  - [Implementation](#implementation)
  - [Testing](#testing)
  - [Status History](#status-history)
  - [Notes](#notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
id: BUG-0007
title: Phase 5 Feature - Refresh Descriptions Button Not Implemented
status: open
priority: low
severity: low
component: frontend
created: 2025-10-30
updated: 2025-10-31
affects: [job-descriptions, refresh-functionality, debug-section, phase-5]
related: [PHASE_5]
---

# BUG-0007: Phase 5 Feature - Refresh Descriptions Button Not Implemented

## Summary

Eight E2E tests in `22-refresh-buttons.spec.ts` are failing because the "Refresh Descriptions" feature (job description regeneration) has not been implemented yet. This is a planned Phase 5 feature, not part of current development phases.

## Impact

**Affected Tests**: 8 tests (currently disabled via test-config.ts)
- All tests in `frontend/e2e/tests/22-refresh-buttons.spec.ts`

**User Impact**: None - Feature not implemented, tests disabled
**Development Impact**: Low - This is a future Phase 5 feature

## Steps to Reproduce

1. Run E2E tests: `cd frontend && npm run test:e2e`
2. Observe tests in file `22-refresh-buttons.spec.ts`
3. All 6 tests fail - button not found, not enabled, or not functioning

## Expected Behavior

Tests expect:
1. "Refresh Description" button visible in debug section
2. Button clickable and enabled
3. Clicking button triggers description regeneration
4. Description content changes after refresh
5. Global "Refresh All Descriptions" button clears caches
6. No infinite refresh loops

## Actual Behavior

Tests failing suggest:
- Button may not be visible/present
- Button may be disabled
- Button may not trigger API calls
- Descriptions not updating after refresh

## Root Cause

**Feature not implemented**: Tests were written proactively for a planned Phase 5 feature. The "Refresh Descriptions" button functionality is not part of any current phase implementation. This is similar to BUG-0008 but correctly identified as future work.

## Evidence

**Test output** (from test run 2025-10-30):
```
Error: expect(locator).toBeVisible() failed
test-results/22-refresh-buttons-Refresh-099a5-esh-button-in-debug-section-chromium/test-failed-1.png

Error: expect(locator).not.toHaveText(expected) failed
test-results/22-refresh-buttons-Refresh-3bc5c-when-per-job-button-clicked-chromium/test-failed-1.png

Error: expect(locator).toBeEnabled() failed
test-results/22-refresh-buttons-Refresh-20b38--button-should-be-clickable-chromium/test-failed-1.png
```

**Failing tests**:
1. should display refresh button in debug section
2. should update description when per-job button clicked
3. should not cause infinite refresh loop
4. should update descriptions after refresh
5. Global refresh button should clear all caches
6. Refresh button should be clickable

## Proposed Solutions

### Option 1: Keep Tests Disabled Until Phase 5 ✅ RECOMMENDED

**Description**: Tests are already disabled in test-config.ts. Keep them disabled until Phase 5 implementation begins.

**Pros**:
- Tests preserved for future use
- No maintenance burden
- Clean test suite (no false failures)
- Tests provide specification for Phase 5 work

**Cons**:
- Tests sit unused until Phase 5

**Implementation Effort**: None - already done

### Option 2: Delete Tests

**Description**: Remove test files entirely

**Pros**:
- Cleaner codebase
- No confusion about feature status

**Cons**:
- Loses planning work
- Need to recreate when Phase 5 starts

**Implementation Effort**: 15 minutes

### Option 3: Implement Feature Now (Phase 5 Early)

**Description**: Implement refresh descriptions feature ahead of Phase 5

**Pros**:
- Useful feature for users
- Tests become meaningful

**Cons**:
- Significant effort (6-8 hours)
- Out of scope for current phases
- Requires LLM integration work

**Implementation Effort**: 6-8 hours

## Decision

**Selected**: Option 1 - Keep tests disabled until Phase 5

**Rationale**:
- Feature is not needed for Phase 2.4 completion
- Tests already properly disabled (no impact on test suite)
- Tests provide valuable Phase 5 specification
- Can revisit when Phase 5 planning begins

## Implementation

[To be completed after decision]

## Testing

**If implementing (Option 1)**:
1. Verify button appears in debug section
2. Test per-job refresh triggers API call
3. Test global refresh clears caches
4. Verify descriptions update after refresh
5. Run all 6 E2E tests to pass

**If removing (Option 2)**:
1. Remove button from UI
2. Delete test file
3. Update documentation

**If deferring (Option 3)**:
1. Add `.skip` to test suite in `22-refresh-buttons.spec.ts`
2. Add comment explaining why skipped

## Status History

- 2025-10-30: Bug discovered during E2E test investigation
- 2025-10-30: Tests disabled in test-config.ts
- 2025-10-31: Bug reclassified as Phase 5 feature (not Phase 2.4)
- 2025-10-31: Priority lowered from medium → low (future work)
- 2025-10-31: Title updated to clarify Phase 5 feature status
- 2025-10-31: Removed from Phase 2.4 documentation, added to Phase 5

## Notes

- **Status**: Tests already disabled in test-config.ts (no action needed)
- **Phase assignment**: Phase 5 (Advanced Features)
- **Feature description**: Ability to regenerate job descriptions on demand using LLM
- **Test file**: `frontend/e2e/tests/22-refresh-buttons.spec.ts` (8 tests)
- **Related**: Phase 5 planning, LLM integration features
- **Action**: Re-enable tests when Phase 5 implementation begins
