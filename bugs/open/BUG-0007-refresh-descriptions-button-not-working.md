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
title: Refresh Descriptions Button Not Working
status: open
priority: medium
severity: medium
component: frontend
created: 2025-10-30
updated: 2025-10-30
affects: [job-descriptions, refresh-functionality, debug-section]
related: []
---

# BUG-0007: Refresh Descriptions Button Not Working

## Summary

Six E2E tests in `22-refresh-buttons.spec.ts` are failing. Tests expect a "Refresh Descriptions" button that regenerates job descriptions, but the functionality appears incomplete or non-functional.

## Impact

**Affected Tests**: 6 failing tests
- All tests in `frontend/e2e/tests/22-refresh-buttons.spec.ts`

**User Impact**: Medium - Users cannot refresh/regenerate job descriptions
**Development Impact**: Medium - Feature may be partially implemented

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

**Needs Investigation**. Possible causes:
1. Feature not fully implemented
2. Button present but non-functional
3. API endpoint missing or not connected
4. Tests written before feature completion

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

### Option 1: Implement Full Refresh Feature

**Description**: Complete the implementation of description refresh functionality

**Pros**:
- Provides valuable user feature
- Tests become meaningful
- Improves user experience

**Cons**:
- Significant development effort
- May require backend API changes
- Needs LLM integration

**Implementation Effort**: 6-8 hours

### Option 2: Remove/Disable Button

**Description**: Remove the button from UI if feature not planned

**Pros**:
- Clean up incomplete feature
- Removes user confusion
- Tests can be deleted

**Cons**:
- Loses potentially useful feature
- May have been planned functionality

**Implementation Effort**: 1 hour

### Option 3: Disable Tests Until Feature Complete

**Description**: Skip these tests until feature is implemented

**Pros**:
- Quick fix
- Preserves tests for future
- No code changes needed

**Cons**:
- Defers the problem
- Tests remain failing in suite

**Implementation Effort**: 15 minutes

## Decision

**Selected**: TBD - Requires product decision

**Questions**:
1. Is this feature planned for implementation?
2. Is the button visible in the UI currently?
3. Should this be prioritized or deferred?

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
- 2025-10-30: Initial analysis - requires product/design decision

## Notes

- **Recommend**: Option 3 (skip tests) until product decision made
- Feature may have been planned but not implemented
- Related to debug section and LLM description generation
- Test file: `frontend/e2e/tests/22-refresh-buttons.spec.ts`
- Could be valuable feature if prioritized for Phase 4 or 5
