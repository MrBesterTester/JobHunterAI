<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [id: BUG-0005
title: E2E Test - Debug Section Missing switchToTab Helper
status: open
priority: medium
severity: low
component: frontend
created: 2025-10-30
updated: 2025-10-30
affects: [e2e-tests, debug-section]
related: []](#id-bug-0005%0Atitle-e2e-test---debug-section-missing-switchtotab-helper%0Astatus-open%0Apriority-medium%0Aseverity-low%0Acomponent-frontend%0Acreated-2025-10-30%0Aupdated-2025-10-30%0Aaffects-e2e-tests-debug-section%0Arelated-)
- [BUG-0005: E2E Test - Debug Section Missing switchToTab Helper](#bug-0005-e2e-test---debug-section-missing-switchtotab-helper)
  - [Summary](#summary)
  - [Impact](#impact)
  - [Steps to Reproduce](#steps-to-reproduce)
  - [Expected Behavior](#expected-behavior)
  - [Actual Behavior](#actual-behavior)
  - [Root Cause](#root-cause)
  - [Evidence](#evidence)
  - [Proposed Solutions](#proposed-solutions)
    - [Option 1: Import Helper from Shared Module](#option-1-import-helper-from-shared-module)
    - [Option 2: Define switchToTab in Test File](#option-2-define-switchtotab-in-test-file)
  - [Decision](#decision)
  - [Implementation](#implementation)
  - [Testing](#testing)
  - [Status History](#status-history)
  - [Notes](#notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
id: BUG-0005
title: E2E Test - Debug Section Missing switchToTab Helper
status: open
priority: medium
severity: low
component: frontend
created: 2025-10-30
updated: 2025-10-30
affects: [e2e-tests, debug-section]
related: []
---

# BUG-0005: E2E Test - Debug Section Missing switchToTab Helper

## Summary

Six E2E tests in `18-debug-section.spec.ts` are failing with `ReferenceError: switchToTab is not defined`. The test file uses a helper function that hasn't been imported or defined.

## Impact

**Affected Tests**: 6 failing tests
- All tests in `frontend/e2e/tests/18-debug-section.spec.ts`

**User Impact**: None - this is a test infrastructure issue only
**Development Impact**: Medium - prevents validation of debug section functionality

## Steps to Reproduce

1. Run E2E tests: `cd frontend && npm run test:e2e`
2. Observe tests in file `18-debug-section.spec.ts`
3. All tests fail with: `ReferenceError: switchToTab is not defined`

## Expected Behavior

Tests should import or define the `switchToTab` helper function and execute successfully.

## Actual Behavior

Tests fail immediately with reference error before test logic executes.

## Root Cause

The `switchToTab` helper function is referenced in the test file but never imported or defined. This is likely a missing import statement from a test utilities module.

## Evidence

**Test output**:
```
ReferenceError: switchToTab is not defined
test-results/18-debug-section-Job-Card--1965d--debug-section-on-job-cards-chromium/test-failed-1.png
test-results/18-debug-section-Job-Card--fac9d-ion-method-in-debug-section-chromium/test-failed-1.png
```

**Failing tests** (all 6 in file):
- should display debug section on job cards
- should display extraction method in debug section
- should display raw data JSON in debug section
- should truncate content when data is large
- should display valid JSON structure in raw data
- should have proper styling for debug section

## Proposed Solutions

### Option 1: Import Helper from Shared Module

**Description**: Find the existing `switchToTab` implementation in test utilities and import it

**Pros**:
- Reuses existing tested code
- Consistent with other test files
- No code duplication

**Cons**:
- Must locate existing implementation
- May need to refactor if no shared module exists

**Implementation Effort**: 30 minutes

### Option 2: Define switchToTab in Test File

**Description**: Implement the helper function directly in the test file

**Pros**:
- Quick fix
- Self-contained test file
- No dependencies

**Cons**:
- Code duplication
- Harder to maintain
- Inconsistent with other test files

**Implementation Effort**: 15 minutes

## Decision

**Selected**: Option 1 - Import from shared module

**Rationale**: Better for long-term maintainability and consistency across test suite. The `switchToTab` helper is likely used in other test files and should be shared.

## Implementation

1. Search for existing `switchToTab` implementations in test files
2. If found, extract to shared test utilities module
3. Import into `18-debug-section.spec.ts`
4. If not found, implement in shared module following Playwright best practices

## Testing

1. Run the specific test file: `npm run test:e2e -- tests/18-debug-section.spec.ts`
2. Verify all 6 tests pass or fail for legitimate reasons (not reference errors)
3. Run full E2E suite to ensure no regressions

**Success Criteria**: All 6 tests execute without `ReferenceError`

## Status History

- 2025-10-30: Bug discovered during E2E test investigation
- 2025-10-30: Root cause identified - missing helper function import

## Notes

- This is a test infrastructure issue, not an application bug
- Quick fix that will enable 6 tests (1.1% of total suite)
- Part of broader E2E test cleanup effort (49 failing tests total)
