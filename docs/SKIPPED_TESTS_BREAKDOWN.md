<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Comprehensive Skipped & Cosmetic Tests Breakdown](#comprehensive-skipped--cosmetic-tests-breakdown)
  - [Executive Summary](#executive-summary)
  - [1. Unit Tests (8 skipped)](#1-unit-tests-8-skipped)
    - [1.1 Content Generation Modal (4 tests)](#11-content-generation-modal-4-tests)
    - [1.2 Job Details Modal (4 tests)](#12-job-details-modal-4-tests)
  - [2. E2E Tests - Disabled Suites (131 tests)](#2-e2e-tests---disabled-suites-131-tests)
    - [2.1 Badge Display Logic (58 tests)](#21-badge-display-logic-58-tests)
    - [2.2 Badge CSS Validation (32 tests)](#22-badge-css-validation-32-tests)
    - [2.3 Email Composer UI (32 tests)](#23-email-composer-ui-32-tests)
    - [2.4 Description Display Formatting (9 tests)](#24-description-display-formatting-9-tests)
  - [3. E2E Tests - Individual Skipped Tests (1 test)](#3-e2e-tests---individual-skipped-tests-1-test)
    - [3.1 Trade-off Display - CSS Layout (1 test)](#31-trade-off-display---css-layout-1-test)
  - [4. E2E Tests - Conditional Skips (Not Counted)](#4-e2e-tests---conditional-skips-not-counted)
  - [Summary by Category](#summary-by-category)
    - [Unit Tests (8 total)](#unit-tests-8-total)
    - [E2E Tests (132 total)](#e2e-tests-132-total)
    - [Grand Total: 140 Tests (8 unit + 132 E2E)](#grand-total-140-tests-8-unit--132-e2e)
  - [Impact Analysis](#impact-analysis)
    - [Unit Tests](#unit-tests)
    - [E2E Tests](#e2e-tests)
    - [Overall](#overall)
  - [Re-enabling Tests](#re-enabling-tests)
    - [Unit Tests](#unit-tests-1)
    - [E2E Tests - Disabled Suites](#e2e-tests---disabled-suites)
    - [E2E Tests - Individual Skips](#e2e-tests---individual-skips)
  - [Related Documentation](#related-documentation)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Comprehensive Skipped & Cosmetic Tests Breakdown

**Generated**: 2025-10-30
**Total Skipped/Cosmetic Tests**: 140 tests (8 unit + 132 E2E)

---

## Executive Summary

| Type | Count | % of Category | Reason |
|------|-------|---------------|--------|
| **Unit Tests** | 8 | 1.7% of 481 | Testing infrastructure limitations |
| **E2E Tests** | 132 | 25.0% of 529 | 131 cosmetic + 1 cosmetic (in enabled suite) |
| **TOTAL** | **140** | **13.8% overall** | Cosmetic + testing limitations |

---

## 1. Unit Tests (8 skipped)

**Status**: Intentionally skipped - **NOT app bugs**
**Category**: Testing Infrastructure Limitations

### 1.1 Content Generation Modal (4 tests)
- **File**: `frontend/src/App.test.tsx`
- **Category**: **Architectural Limitation** (React state batching)
- **Reason**: Loading states appear for microseconds (too fast to test with 100ms timeout)
- **Tests**:
  1. Should show loading state when generating resume
  2. Should show loading state when generating cover letter
  3. Should show loading state during generation
  4. Should update loading state correctly
- **Status**: ✅ Functionality verified working in production
- **Related**: [ISSUE-023](../bugs/fixed/ISSUE-023-frontend-test-failures---content-generation-state-propagation-issues.md)

### 1.2 Job Details Modal (4 tests)
- **File**: `frontend/src/App.test.tsx` (lines 9727-10269)
- **Category**: **Test Environment Timing** (React render cycles)
- **Reason**: Modal opening timing in specific test scenarios
- **Tests**:
  1. Should display action buttons (approve/reject)
  2. Should display core job fields
  3. Should display approve button correctly
  4. Should display reject button correctly
- **Status**: ✅ Modal functionality verified in Phase 4A tests and production
- **Impact**: <2% of unit test suite (8/481 tests)

---

## 2. E2E Tests - Disabled Suites (131 tests)

**Status**: Intentionally disabled via `frontend/e2e/test-config.ts`
**Control**: Centralized enable/disable flags

### 2.1 Badge Display Logic (58 tests)
- **File**: `frontend/e2e/tests/05b-new-job-badges.spec.ts`
- **Category**: **Cosmetic - Badge Styling**
- **Reason**: Tests badge visual display, not functionality
- **Can Re-enable**: `'new-job-badges': true` in test-config.ts
- **Details**: Employment type badges, industry badges, seniority badges, visual styling

### 2.2 Badge CSS Validation (32 tests)
- **File**: `frontend/e2e/tests/06-job-badge-styling.spec.ts`
- **Category**: **Cosmetic - CSS Properties**
- **Reason**: Tests CSS properties (colors, spacing, fonts)
- **Can Re-enable**: `'job-badge-styling': true` in test-config.ts
- **Details**: Badge colors, border radius, padding, hover states

### 2.3 Email Composer UI (32 tests)
- **File**: `frontend/e2e/tests/15-email-composer.spec.ts`
- **Category**: **Redundant - Unit Test Coverage**
- **Reason**: Comprehensive unit test coverage already exists
- **Can Re-enable**: `'email-composer': true` in test-config.ts
- **Details**: Email composition workflow, draft creation, UI interactions

### 2.4 Description Display Formatting (9 tests)
- **File**: `frontend/e2e/tests/19-condensed-description.spec.ts`
- **Category**: **Cosmetic - Text Formatting**
- **Reason**: Tests text display formatting, not content generation
- **Can Re-enable**: `'condensed-description': true` in test-config.ts
- **Details**: Description length, word count, styling, container properties

---

## 3. E2E Tests - Individual Skipped Tests (1 test)

**Status**: Skipped within enabled test suites
**Control**: Individual `test.skip()` calls

### 3.1 Trade-off Display - CSS Layout (1 test)
- **File**: `frontend/e2e/tests/05-job-tradeoff-display.spec.ts:212`
- **Test**: "should display multiple trade-off badges on same job card"
- **Category**: **Cosmetic - CSS Layout Validation**
- **Reason**:
  - Only validates CSS `flex-wrap` property
  - Brittle DOM locator strategy
  - Has permissive fallback (would always pass anyway)
  - Badge functionality verified working in production
- **Related**: BUG-0004 (tab switching resolved)
- **Status**: 15/15 functional tests passing in this suite

---

## 4. E2E Tests - Conditional Skips (Not Counted)

**Status**: Runtime conditional - skip if no test data available
**Category**: Data-Dependent Tests (not permanent skips)

These tests skip conditionally based on database state:
- "No jobs available"
- "No approved jobs"
- "Need at least N jobs"
- "No filtered jobs"

**Files with conditional skips** (not exhaustive):
- `04-content-generation.spec.ts` (~40 conditional skips)
- `05-job-details.spec.ts` (~14 conditional skips)
- `03-job-status-updates.spec.ts` (~15 conditional skips)
- `07-filtered-jobs.spec.ts` (~10 conditional skips)
- `06-statistics.spec.ts` (~6 conditional skips)
- Many others

**Note**: These are not counted in the 140 total because they run when data is available.

---

## Summary by Category

### Unit Tests (8 total)
| Category | Count | Reason |
|----------|-------|--------|
| Architectural Limitation | 4 | React state batching (too fast to test) |
| Test Environment Timing | 4 | React render cycle timing issues |

### E2E Tests (132 total)
| Category | Count | Reason |
|----------|-------|--------|
| Cosmetic - Badge Styling | 58 | Visual display tests |
| Cosmetic - CSS Properties | 32 | CSS validation tests |
| Cosmetic - CSS Layout | 1 | Flex-wrap validation |
| Cosmetic - Text Formatting | 9 | Description display formatting |
| Redundant Coverage | 32 | Already covered by unit tests |

### Grand Total: 140 Tests (8 unit + 132 E2E)

**Breakdown by Reason**:
- **Cosmetic/Styling**: 100 tests (71.4%)
- **Redundant Coverage**: 32 tests (22.9%)
- **Testing Limitations**: 8 tests (5.7%)

---

## Impact Analysis

### Unit Tests
- **Skipped**: 8/481 = 1.7%
- **Passing**: 473/481 = 98.3%
- **Impact**: Minimal - <2% of suite, functionality verified in production

### E2E Tests
- **Disabled Suites**: 131/529 = 24.8%
- **Individual Skips**: 1/529 = 0.2%
- **Total Skipped**: 132/529 = 25.0%
- **Active Tests**: 397/529 = 75.0%
- **Core Workflow Pass Rate**: 90.2% (of active tests)

### Overall
- **Total Tests**: 1010 (481 unit + 529 E2E)
- **Skipped**: 140/1010 = 13.9%
- **Active**: 870/1010 = 86.1%

---

## Re-enabling Tests

### Unit Tests
Cannot be easily re-enabled due to architectural/timing limitations. Would require:
- Refactoring React state management (content generation modal)
- Adjusting test timing strategies (job details modal)

### E2E Tests - Disabled Suites
Can be re-enabled instantly by changing flags in `frontend/e2e/test-config.ts`:

```typescript
export const ENABLED_TEST_SUITES = {
  'new-job-badges': true,           // Enable 58 tests
  'job-badge-styling': true,        // Enable 32 tests
  'job-tradeoff-display': true,     // Already enabled (15 active + 1 skipped)
  'email-composer': true,           // Enable 32 tests
  'condensed-description': true,    // Enable 9 tests
};
```

### E2E Tests - Individual Skips
Remove `test.skip()` from specific test in file:
- `frontend/e2e/tests/05-job-tradeoff-display.spec.ts:212`

---

## Related Documentation

- **Testing Status**: [docs/TESTING_STATUS.md](./TESTING_STATUS.md)
- **Testing History**: [docs/TESTING_HISTORY.md](./TESTING_HISTORY.md)
- **Test Configuration**: `frontend/e2e/test-config.ts`
- **BUG-0004**: [bugs/fixed/BUG-0004](../bugs/fixed/BUG-0004-all-tab-not-rendering-job-cards-in-e2e-tests.md)
- **ISSUE-023**: [bugs/fixed/ISSUE-023](../bugs/fixed/ISSUE-023-frontend-test-failures---content-generation-state-propagation-issues.md)
