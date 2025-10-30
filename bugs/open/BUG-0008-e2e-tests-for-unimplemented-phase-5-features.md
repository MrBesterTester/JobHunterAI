<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [id: BUG-0008
title: E2E Tests for Unimplemented Phase 5 Features
status: open
priority: low
severity: low
component: frontend
created: 2025-10-30
updated: 2025-10-30
affects: [e2e-tests, calendar-management, follow-ups, timeline-view, intake-integrations]
related: []](#id-bug-0008%0Atitle-e2e-tests-for-unimplemented-phase-5-features%0Astatus-open%0Apriority-low%0Aseverity-low%0Acomponent-frontend%0Acreated-2025-10-30%0Aupdated-2025-10-30%0Aaffects-e2e-tests-calendar-management-follow-ups-timeline-view-intake-integrations%0Arelated-)
- [BUG-0008: E2E Tests for Unimplemented Phase 5 Features](#bug-0008-e2e-tests-for-unimplemented-phase-5-features)
  - [Summary](#summary)
  - [Impact](#impact)
  - [Affected Features](#affected-features)
    - [1. Calendar Management (4 tests)](#1-calendar-management-4-tests)
    - [2. Follow-ups Management (6 tests)](#2-follow-ups-management-6-tests)
    - [3. Timeline View (2 tests)](#3-timeline-view-2-tests)
    - [4. Intake Integrations (5 tests)](#4-intake-integrations-5-tests)
  - [Expected Behavior](#expected-behavior)
  - [Actual Behavior](#actual-behavior)
  - [Root Cause](#root-cause)
  - [Evidence](#evidence)
  - [Proposed Solutions](#proposed-solutions)
    - [Option 1: Skip Tests Until Features Implemented](#option-1-skip-tests-until-features-implemented)
    - [Option 2: Delete Tests](#option-2-delete-tests)
  - [Decision](#decision)
  - [Implementation](#implementation)
  - [Testing](#testing)
  - [Status History](#status-history)
  - [Notes](#notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
id: BUG-0008
title: E2E Tests for Unimplemented Phase 5 Features
status: open
priority: low
severity: low
component: frontend
created: 2025-10-30
updated: 2025-10-30
affects: [e2e-tests, calendar-management, follow-ups, timeline-view, intake-integrations]
related: []
---

# BUG-0008: E2E Tests for Unimplemented Phase 5 Features

## Summary

Fifteen E2E tests are failing because they test Phase 5 features that haven't been implemented yet (Calendar Management, Follow-ups Management, Timeline View, and additional Intake integrations).

## Impact

**Affected Tests**: 15 failing tests
- Calendar Management: 4 tests
- Follow-ups Management: 6 tests
- Timeline View: 2 tests
- Intake Tab - Indeed integration: 1 test
- Intake Tab - other unimplemented features: 4 tests

**User Impact**: None - features not implemented yet
**Development Impact**: Low - these are future features, tests written ahead of implementation

## Affected Features

### 1. Calendar Management (4 tests)
**File**: `frontend/e2e/tests/12-calendar-management.spec.ts`

Tests expecting:
- Schedule interview modal
- Interview form fields
- Calendar display
- Error handling

### 2. Follow-ups Management (6 tests)
**File**: `frontend/e2e/tests/13-follow-ups-management.spec.ts`

Tests expecting:
- Follow-ups tab navigation
- Pending follow-ups list
- Follow-up approval workflow
- Error handling
- API integration

### 3. Timeline View (2 tests)
**File**: `frontend/e2e/tests/14-timeline-view.spec.ts`

Tests expecting:
- Timeline tab functionality
- Empty timeline handling

### 4. Intake Integrations (5 tests)
**File**: `frontend/e2e/tests/15-intake-tab.spec.ts`

Tests expecting:
- Indeed integration card
- LinkedIn mock implementation notice
- Integration status displays
- "Coming Soon" messages
- "Request Implementation" buttons

## Expected Behavior

Features should be implemented before tests are written, OR tests should be marked as skipped until features are ready.

## Actual Behavior

Tests fail because UI elements and API endpoints don't exist yet.

## Root Cause

Tests were written proactively for planned Phase 5 features. This is actually good practice for TDD (Test-Driven Development), but tests should be skipped until implementation begins.

## Evidence

**Test output** (from test run 2025-10-30):
```
Error: expect(locator).toBeVisible() failed
test-results/12-calendar-management-Cal-eaeb0-en-schedule-interview-modal-chromium/test-failed-1.png

Error: expect(locator).toBeVisible() failed
test-results/13-follow-ups-management-F-e4df7--to-Follow-ups-tab-on-click-chromium/test-failed-1.png

TimeoutError: page.click: Timeout 10000ms exceeded
test-results/14-timeline-view-Timeline--982f9-e-empty-timeline-gracefully-chromium/test-failed-1.png

Error: expect(locator).toBeVisible() failed
test-results/15-intake-tab-Intake-Tab-I-19f3f-lay-Indeed-integration-card-chromium/test-failed-1.png
```

## Proposed Solutions

### Option 1: Skip Tests Until Features Implemented

**Description**: Add `.skip` or configuration flags to disable these tests

**Pros**:
- Preserves tests for future use
- Clean test suite (no false failures)
- Easy to re-enable when features ready
- Maintains TDD approach

**Cons**:
- Tests sit unused until Phase 5
- Need to remember to re-enable them

**Implementation Effort**: 30 minutes

### Option 2: Delete Tests

**Description**: Remove test files entirely and recreate when building features

**Pros**:
- Cleaner codebase
- No maintenance burden
- Tests written with actual implementation

**Cons**:
- Loses advance planning work
- May forget edge cases captured in tests
- Harder to estimate Phase 5 scope

**Implementation Effort**: 15 minutes

## Decision

**Selected**: Option 1 - Skip tests until features implemented

**Rationale**:
- Tests represent valuable planning and edge case thinking
- Easy to re-enable when Phase 5 begins
- Maintains TDD benefits
- Minimal cost to preserve

## Implementation

**Files to modify**:
1. `frontend/e2e/tests/12-calendar-management.spec.ts` - Add `.skip` to test suite
2. `frontend/e2e/tests/13-follow-ups-management.spec.ts` - Add `.skip` to test suite
3. `frontend/e2e/tests/14-timeline-view.spec.ts` - Add `.skip` to test suite
4. `frontend/e2e/tests/15-intake-tab.spec.ts` - Add `.skip` to specific test cases (or entire unimplemented features section)

**Alternatively**: Add to `frontend/e2e/test-config.ts`:
```typescript
export const DISABLED_SUITES = {
  // ... existing
  PHASE_5_FEATURES: true, // Calendar, Follow-ups, Timeline
};
```

## Testing

1. Run E2E test suite
2. Verify these 15 tests are now skipped (not failed)
3. Confirm passing test count increases
4. Document which tests are skipped and why

**Success Criteria**:
- 15 fewer failures
- Tests preserved for Phase 5
- Test suite cleaner

## Status History

- 2025-10-30: Bug discovered during E2E test investigation
- 2025-10-30: Decision made to skip tests until Phase 5

## Notes

- **This is not really a bug** - it's proactive test planning
- Tests should be re-enabled when Phase 5 implementation begins
- Consider adding TODO comments in test files about when to re-enable
- Document in Phase 5 planning docs that tests already exist
- Test files affected:
  - `frontend/e2e/tests/12-calendar-management.spec.ts` (4 tests)
  - `frontend/e2e/tests/13-follow-ups-management.spec.ts` (6 tests)
  - `frontend/e2e/tests/14-timeline-view.spec.ts` (2 tests)
  - `frontend/e2e/tests/15-intake-tab.spec.ts` (5 tests - specific sections only)
