---
id: ISSUE-041
title: E2E Test Code: 153 TypeScript Errors Blocking Comprehensive Test Runs
status: open
priority: high
severity: high
component: frontend
created: 2025-11-12
updated: 2025-11-12
affects: [testing, e2e, quality-gates]
related: []
---

# ISSUE-041: E2E Test Code: 153 TypeScript Errors Blocking Comprehensive Test Runs

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Next Steps](#next-steps)
- [Impact](#impact)
- [Error Analysis & Breakdown](#error-analysis--breakdown)
  - [Quick Statistics](#quick-statistics)
  - [Files with Most Errors](#files-with-most-errors)
  - [Error Type Breakdown](#error-type-breakdown)
    - [1. TS2769: test.skip() Argument Order Issues (141 errors - 92%)](#1-ts2769-testskip-argument-order-issues-141-errors---92%25)
    - [2. TS2339: Property Doesn't Exist (6 errors - 4%)](#2-ts2339-property-doesnt-exist-6-errors---4%25)
    - [3. TS18048: Variable Possibly Undefined (3 errors - 2%)](#3-ts18048-variable-possibly-undefined-3-errors---2%25)
    - [4. TS2345: Argument Type Not Assignable (2 errors - 1%)](#4-ts2345-argument-type-not-assignable-2-errors---1%25)
    - [5. TS7053: Index Signature Issue (1 error - <1%)](#5-ts7053-index-signature-issue-1-error---1%25)
- [Steps to Reproduce](#steps-to-reproduce)
- [Expected Behavior](#expected-behavior)
- [Actual Behavior](#actual-behavior)
- [Root Cause](#root-cause)
- [Evidence](#evidence)
  - [TypeScript Error Log](#typescript-error-log)
  - [Sample Errors](#sample-errors)
  - [Quality Gate Integration](#quality-gate-integration)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Fix All Errors Systematically (RECOMMENDED)](#option-1-fix-all-errors-systematically-recommended)
  - [Option 2: Disable E2E Type-Checking Temporarily (NOT RECOMMENDED)](#option-2-disable-e2e-type-checking-temporarily-not-recommended)
  - [Option 3: Incremental Fixes with Partial Enforcement (COMPROMISE)](#option-3-incremental-fixes-with-partial-enforcement-compromise)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

E2E test type-checking quality gate (added 2025-11-12) discovered **153 TypeScript errors** in E2E test code that were previously being silently ignored. Playwright transpiles `.ts` files at runtime, allowing type-unsafe code to execute. The comprehensive test suite now **enforces E2E type-checking in the BUILD PHASE** and will abort until all errors are fixed.

**Critical Impact**: Next comprehensive test run will **FAIL during BUILD PHASE** until all 153 TypeScript errors are resolved.

## Next Steps

**Decision**: Proceeding with **Option 1 - Fix All Errors Systematically** (see [Proposed Solutions](#proposed-solutions) for full analysis)

**Implementation Plan** (Estimated 5-6 hours):

**Phase 1: Fix test.skip() Issues (141 errors - 80% of work, ~3-4 hours)**
1. Pattern A: Convert `test.skip(!condition, 'message')` → `if (!condition) { test.skip(); }`
2. Pattern B: Remove description strings from in-test skip calls
3. Use find/replace for mechanical fixes where safe
4. Manual review for complex cases

**Phase 2: Fix Property/Type Issues (12 errors - 20% of work, ~1.5 hours)**
1. Remove `Response.timing` usage (1 error) - 15 min
2. Add type guards for possibly-undefined variables (3 errors) - 30 min
3. Fix return types: boolean | null → boolean (2 errors) - 10 min
4. Add index signature to test-config.ts (1 error) - 5 min
5. Fix toBeTruthy on 'never' type (6 errors) - 20 min

**Verification**:
- Run `npm run typecheck:e2e` - verify zero errors
- Run `npm run test:e2e:chromium` - verify tests still execute
- Run `./helper-scripts/run-comprehensive-tests.sh` - verify BUILD PHASE passes

**Why Option 1**:
- ✅ Achieves 100% type safety in one session
- ✅ Unblocks comprehensive test suite immediately
- ✅ Systematic approach (92% of errors are same issue)
- ✅ Low risk (syntactic changes, no behavioral impact)
- ✅ One-time investment eliminates all technical debt

## Impact

**Who/What is affected:**
- ❌ **Comprehensive test suite execution** - Cannot run until errors fixed
- ❌ **E2E test code quality** - 153 type safety violations
- ❌ **Developer workflow** - Blocks quality gate enforcement
- ✅ **Application code** - Not affected (application builds successfully)
- ✅ **Test execution** - E2E tests still RUN successfully (Playwright ignores type errors)

**Severity:**
- **High Priority** - Blocks comprehensive test runs (quality gate)
- **High Severity** - 153 errors across 17 files
- **Low Urgency** - Tests still execute (Playwright runtime transpilation works)
- **Quality Impact** - Type safety not enforced in test code (technical debt)

## Error Analysis & Breakdown

### Quick Statistics

**Total Errors**: 153 TypeScript compilation errors
**Files Affected**: 17 files (16 test files + 1 config file)
**Error Distribution**:
- TS2769: 141 errors (92%) - `test.skip()` API misuse
- TS2339: 6 errors (4%) - Property doesn't exist on type
- TS18048: 3 errors (2%) - Variable possibly undefined
- TS2345: 2 errors (1%) - Argument type not assignable
- TS7053: 1 error (<1%) - Index signature issue

### Files with Most Errors

| File | Errors | Primary Issue |
|------|--------|---------------|
| `tests/04-content-generation.spec.ts` | 35 | test.skip() misuse |
| `tests/05-job-details.spec.ts` | 23 | test.skip() misuse |
| `tests/15-email-composer.spec.ts` | 16 | test.skip() misuse |
| `tests/03-job-status-updates.spec.ts` | 15 | test.skip() misuse |
| `tests/07-filtered-jobs.spec.ts` | 13 | test.skip() misuse |
| `tests/05-phase-3.1.5-testing-refinement.spec.ts` | 11 | test.skip() misuse |
| `tests/11-accessibility.spec.ts` | 6 | test.skip() misuse |
| `tests/08-responsive-design.spec.ts` | 6 | test.skip() misuse |
| `tests/06-statistics.spec.ts` | 6 | test.skip() misuse |
| `tests/23-description-quality.spec.ts` | 5 | Variable possibly undefined |
| Other files (7 files) | 17 | Mixed |

### Error Type Breakdown

#### 1. TS2769: test.skip() Argument Order Issues (141 errors - 92%)

**Problem**: Playwright's `test.skip()` has multiple overloads, and TypeScript cannot match them correctly when arguments are in certain orders.

**Playwright's test.skip() Signatures**:
```typescript
// Overload 1: Skip based on condition
test.skip(condition: boolean, description?: string): void

// Overload 2: Skip with callback
test.skip(callback: () => boolean, description?: string): void

// Overload 3: Skip unconditionally (called inside test)
test.skip(): void

// Overload 4: Skip with description only (called inside test)
test.skip(description: string): void
```

**Current Usage Patterns** (Causing Errors):
```typescript
// Pattern A: condition + description (SHOULD WORK but TypeScript can't match overload)
test.skip(!shouldRunTest('suite-name'), 'Test suite disabled');
// Error: "Argument of type 'string' is not assignable to parameter of type 'boolean'"

// Pattern B: description only (INCORRECT - missing condition)
test.skip('No jobs in Inbox to test approval');
// Error: Same as above (TypeScript expects condition first)

// Pattern C: Inside test body (CORRECT - but causing false positives)
test('should do something', async () => {
  if (condition) {
    test.skip('Reason for skipping');  // This is correct Playwright usage
  }
});
// Error: TypeScript can't distinguish this from Pattern B
```

**Example Locations**:
- `e2e/tests/03-job-status-updates.spec.ts:37` - Pattern A
- `e2e/tests/04-content-generation.spec.ts:45` - Pattern B
- `e2e/tests/05-job-details.spec.ts:80` - Pattern A

#### 2. TS2339: Property Doesn't Exist (6 errors - 4%)

**Problem**: Accessing properties that don't exist on the type.

**Examples**:
```typescript
// Error 1: Response.timing doesn't exist
const timing = response.timing;  // e2e/tests/01-setup-load.spec.ts:175
// Playwright Response doesn't have .timing property

// Error 2: toBeTruthy on never type
const element = await page.locator('.selector').nth(0);
expect(element).toBeTruthy();  // e2e/tests/12-calendar-management.spec.ts:309
// Type system infers element as 'never' in this context
```

#### 3. TS18048: Variable Possibly Undefined (3 errors - 2%)

**Problem**: Using variables without null/undefined checks.

**Example**:
```typescript
const descriptionContainer = await jobCard.locator('.description-container').nth(0);
await expect(descriptionContainer).toHaveText(/something/);
// Error: descriptionContainer possibly undefined (e2e/tests/23-description-quality.spec.ts:177)
```

#### 4. TS2345: Argument Type Not Assignable (2 errors - 1%)

**Problem**: Function argument types don't match expected signature.

**Example**:
```typescript
page.waitForResponse((response) => {
  return response.url().includes('/api/jobs') ? true : null;  // Returns boolean | null
});
// Error: Expected boolean | Promise<boolean>, got boolean | null
// Location: e2e/tests/01-setup-load.spec.ts:106,130
```

#### 5. TS7053: Index Signature Issue (1 error - <1%)

**Problem**: String indexing not allowed on object without index signature.

**Example**:
```typescript
const testConfig = { 'suite-a': true, 'suite-b': false, /* ... */ };
const suiteName: string = 'suite-a';
const enabled = testConfig[suiteName];  // Error: No index signature
// Location: e2e/test-config.ts:96
```

## Steps to Reproduce

1. **Run E2E type-checking**:
   ```bash
   cd frontend
   npm run typecheck:e2e
   ```

2. **Observe**: 153 TypeScript errors across 17 files

3. **Verify**: Errors logged to `/tmp/e2e-typecheck.log`

4. **Test comprehensive suite**:
   ```bash
   cd ..
   ./helper-scripts/run-comprehensive-tests.sh
   ```

5. **Observe**: Script aborts during BUILD PHASE with message:
   ```
   E2E test code has TypeScript errors (zero-error build required)
   Fix all type errors before running tests
   ```

## Expected Behavior

- ✅ E2E test code should pass TypeScript compilation
- ✅ All test.skip() calls should use correct API signatures
- ✅ Type-safe code throughout E2E test suite
- ✅ Zero TypeScript errors in `npm run typecheck:e2e`
- ✅ Comprehensive test suite executes successfully through BUILD PHASE

## Actual Behavior

- ❌ 153 TypeScript errors in E2E test code
- ❌ Comprehensive test suite aborts during BUILD PHASE
- ⚠️ E2E tests still execute successfully when run directly (Playwright ignores type errors)
- ⚠️ Type safety not enforced before this quality gate was added (2025-11-12)

## Root Cause

**Historical Context**:
- E2E tests written before E2E type-checking quality gate was implemented
- Playwright transpiles `.ts` files at runtime using its own TypeScript configuration
- TypeScript errors in test code did NOT block test execution
- No quality gate enforced type-checking on E2E test code until 2025-11-12

**Technical Root Causes**:

1. **test.skip() Overload Ambiguity** (92% of errors):
   - Playwright's test.skip() has 5+ overloads
   - TypeScript's overload resolution can't match certain usage patterns
   - Developers used patterns that WORK at runtime but fail type-checking
   - Mix of pre-test skipping (with conditions) and in-test skipping (without conditions)

2. **Missing Type Guards** (4% of errors):
   - Response type doesn't have expected properties (.timing)
   - Locator operations return possibly-undefined values
   - No runtime null checks in some cases

3. **Type Inference Issues** (2% of errors):
   - TypeScript infers 'never' type in some Playwright assertions
   - Possibly-undefined variables used without checks

4. **Configuration Type Safety** (2% of errors):
   - test-config.ts object lacks index signature
   - Dynamic property access causes type errors

## Evidence

### TypeScript Error Log
```bash
# Full error log available at:
/tmp/e2e-typecheck.log  # After running npm run typecheck:e2e

# Error count by type:
$ grep "error TS" /tmp/e2e-typecheck.log | sed 's/.*error /error /' | sed 's/:.*//' | sort | uniq -c
141 error TS2769
  6 error TS2339
  3 error TS18048
  2 error TS2345
  1 error TS7053
```

### Sample Errors

**TS2769 (test.skip misuse)**:
```
e2e/tests/03-job-status-updates.spec.ts(37,19): error TS2769: No overload matches this call.
  Overload 1 of 5, '(condition: boolean, description?: string): void', gave the following error.
    Argument of type 'string' is not assignable to parameter of type 'boolean'.
  Overload 2 of 5, '(callback: () => boolean, description?: string): void', gave the following error.
    Argument of type 'string' is not assignable to parameter of type 'ConditionBody<...>'.
```

**TS2339 (Property doesn't exist)**:
```
e2e/tests/01-setup-load.spec.ts(175,35): error TS2339: Property 'timing' does not exist on type 'Response'.
```

**TS18048 (Possibly undefined)**:
```
e2e/tests/23-description-quality.spec.ts(177,38): error TS18048: 'descriptionContainer' is possibly 'undefined'.
```

### Quality Gate Integration
```bash
# Comprehensive test script now includes E2E typecheck
$ grep -A5 "typecheck_e2e" helper-scripts/run-comprehensive-tests.sh
typecheck_e2e() {
    log_section "TYPE-CHECKING E2E TESTS (TypeScript)"
    cd "$PROJECT_ROOT/frontend"
    npm run typecheck:e2e 2>&1 | tee /tmp/e2e-typecheck.log
    # Aborts if errors found
}
```

## Proposed Solutions

### Option 1: Fix All Errors Systematically (RECOMMENDED)

**Description**: Address all 153 errors methodically by error type, starting with the most common.

**Implementation Plan**:

**Phase 1: Fix test.skip() Issues (141 errors - 80% of work)**

1. **Pattern A Fixes** (test.skip with condition + description):
   ```typescript
   // Before (causes TS error but works at runtime):
   test.skip(!shouldRunTest('suite'), 'Suite disabled');

   // After (type-safe):
   if (!shouldRunTest('suite')) {
     test.skip();
   }
   ```
   - **Effort**: ~2-3 hours (find/replace with verification)
   - **Files**: 16 test files
   - **Risk**: Low (tests still execute, just different syntax)

2. **Pattern B Fixes** (test.skip with description only):
   ```typescript
   // Before (incorrect - missing condition):
   if (initialCount === 0) {
     test.skip('No jobs in Inbox');
   }

   // After (correct):
   if (initialCount === 0) {
     test.skip();  // Description tracked by Playwright from context
   }

   // OR with explicit test description:
   test('should do something', async () => {
     if (initialCount === 0) {
       test.skip();
       return;
     }
     // ... test code
   });
   ```
   - **Effort**: ~1-2 hours (manual review required)
   - **Files**: All affected test files
   - **Risk**: Low (clarifies test skip logic)

**Phase 2: Fix Property/Type Issues (12 errors - 20% of work)**

3. **Remove Response.timing Usage** (1 error):
   ```typescript
   // Before:
   const timing = response.timing;  // Property doesn't exist

   // After (Playwright alternative):
   const timingEntry = await page.evaluate(() => {
     const entries = performance.getEntriesByType('navigation');
     return entries[0];
   });
   ```
   - **Effort**: 15 minutes
   - **Files**: `e2e/tests/01-setup-load.spec.ts:175`

4. **Add Type Guards** (3 errors):
   ```typescript
   // Before:
   const container = await element.locator('.container').nth(0);
   await expect(container).toHaveText(/text/);

   // After:
   const container = await element.locator('.container').nth(0);
   if (container) {
     await expect(container).toHaveText(/text/);
   }
   ```
   - **Effort**: 30 minutes
   - **Files**: `e2e/tests/23-description-quality.spec.ts` (3 locations)

5. **Fix Return Type** (2 errors):
   ```typescript
   // Before:
   page.waitForResponse((response) =>
     response.url().includes('/api/jobs') ? true : null
   );

   // After:
   page.waitForResponse((response) =>
     response.url().includes('/api/jobs')
   );
   ```
   - **Effort**: 10 minutes
   - **Files**: `e2e/tests/01-setup-load.spec.ts:106,130`

6. **Add Index Signature** (1 error):
   ```typescript
   // Before:
   const config = { 'suite-a': true, 'suite-b': false };
   const enabled = config[suiteName];  // Error

   // After:
   const config: Record<string, boolean> = { 'suite-a': true, 'suite-b': false };
   const enabled = config[suiteName];  // OK
   ```
   - **Effort**: 5 minutes
   - **Files**: `e2e/test-config.ts:96`

7. **Fix toBeTruthy on never type** (6 errors):
   ```typescript
   // Before:
   const element = await page.locator('.selector').nth(0);
   expect(element).toBeTruthy();  // Type inferred as 'never'

   // After:
   const element = await page.locator('.selector').nth(0);
   await expect(element).toBeVisible();  // Playwright assertion
   ```
   - **Effort**: 20 minutes
   - **Files**: calendar-management, follow-ups-management specs

**Total Effort**: ~5-6 hours of focused work

**Pros**:
- ✅ Achieves 100% type safety in E2E tests
- ✅ Unblocks comprehensive test suite immediately
- ✅ Improves code quality and maintainability
- ✅ Systematic approach (fix by error type)
- ✅ Low risk (no behavioral changes to tests)

**Cons**:
- ⏳ Requires 5-6 hours of focused effort
- ⚠️ Must verify each test still executes correctly

**Implementation Effort**: 5-6 hours

**Maintenance**: Zero ongoing maintenance (one-time fix)

### Option 2: Disable E2E Type-Checking Temporarily (NOT RECOMMENDED)

**Description**: Remove E2E typecheck from comprehensive test script, defer fixes to later.

**Implementation**:
```bash
# Comment out E2E typecheck in run-comprehensive-tests.sh
# typecheck_e2e  # TODO: Re-enable after fixing 153 errors
```

**Pros**:
- ⏱️ Immediate unblock (5 minutes)
- 🚀 Comprehensive tests run again

**Cons**:
- ❌ Technical debt accumulates
- ❌ Type safety not enforced (defeats purpose of adding quality gate)
- ❌ Risk of adding more type-unsafe code
- ❌ Violates zero-warning build requirement
- ❌ Must fix eventually anyway

**Implementation Effort**: 5 minutes

**Maintenance**: Must track and fix later (technical debt)

### Option 3: Incremental Fixes with Partial Enforcement (COMPROMISE)

**Description**: Fix high-priority errors (12 errors) immediately, defer test.skip issues (141 errors).

**Phase 1** (Immediate - 1 hour):
- Fix Response.timing (1 error)
- Fix toBeTruthy issues (6 errors)
- Fix type guards (3 errors)
- Fix return types (2 errors)

**Phase 2** (Deferred):
- Fix test.skip issues (141 errors) - schedule for later sprint

**Pros**:
- ⏱️ Faster initial fix (1 hour vs 6 hours)
- ✅ Fixes actual type safety issues first
- ✅ test.skip issues are cosmetic (tests work at runtime)
- 🎯 Prioritizes real bugs over API misuse

**Cons**:
- ⚠️ Still blocks comprehensive test suite (must fix all 153 errors)
- 📊 Only 8% reduction in errors (12/153)
- ⏳ Must return to fix remaining 141 errors anyway

**Implementation Effort**: 1 hour (Phase 1) + 5 hours (Phase 2 later)

**Maintenance**: Requires tracking deferred work

## Decision

**RECOMMENDED: Option 1 - Fix All Errors Systematically**

**Rationale**:
1. ✅ **Quality Gate Purpose**: The E2E typecheck was added to enforce type safety - disabling it defeats the purpose
2. ⏱️ **Reasonable Effort**: 5-6 hours of focused work is manageable
3. 🎯 **Long-term Value**: One-time investment eliminates technical debt
4. 📈 **Systematic Approach**: Fixing by error type is efficient (92% are same issue)
5. ⚠️ **Low Risk**: Changes are syntactic, not behavioral

**Implementation Approach**:
- Start with test.skip() fixes (141 errors = 92% of work)
- Use find/replace for mechanical fixes where safe
- Manual review for complex cases
- Test each file after fixes
- Run comprehensive suite to verify quality gate passes

## Implementation

[To be filled in during implementation]

**Commits**:
- [ ] Phase 1: Fix test.skip() issues (141 errors)
- [ ] Phase 2: Fix property/type issues (12 errors)
- [ ] Verification: Run comprehensive test suite

## Testing

**Test Commands:**
```bash
# Check E2E type errors before fixes
cd frontend
npm run typecheck:e2e 2>&1 | tee /tmp/e2e-errors-before.log
grep -c "error TS" /tmp/e2e-errors-before.log  # Should show 153

# After fixes - verify zero errors
npm run typecheck:e2e
echo $?  # Should be 0 (success)

# Verify E2E tests still execute
npm run test:e2e:chromium

# Verify comprehensive test suite passes BUILD PHASE
cd ..
./helper-scripts/run-comprehensive-tests.sh
# Should pass E2E Type-checking phase and continue to test execution
```

**Verification Checklist**:
- [ ] `npm run typecheck:e2e` returns exit code 0 (zero errors)
- [ ] All E2E tests execute successfully (no test behavior changes)
- [ ] Comprehensive test suite passes BUILD PHASE
- [ ] `/tmp/e2e-typecheck.log` shows zero errors
- [ ] test.skip() calls work correctly at runtime
- [ ] All test files still pass their test cases

## Status History

- **2025-11-12**: ISSUE-041 created
  - E2E type-checking quality gate added to comprehensive test suite
  - Discovered 153 TypeScript errors in E2E test code
  - Analyzed and categorized all errors by type and file
  - Documented root causes and proposed systematic fix approach
  - Priority: HIGH (blocks comprehensive test runs)
  - Severity: HIGH (153 errors across 17 files)

## Notes

**Why This Wasn't Caught Earlier**:
- Playwright transpiles TypeScript at runtime, ignoring type errors
- No quality gate enforced E2E test type-checking before 2025-11-12
- Tests execute successfully despite type errors (runtime transpilation works)
- E2E type-checking enforcement is a NEW requirement as of today

**Why This Matters**:
- Type safety prevents bugs and improves code maintainability
- Quality gates ensure consistent code quality standards
- Zero-warning builds include ALL code (application + test code)
- TypeScript types serve as documentation for test code

**Impact on Development Workflow**:
- ✅ After fixes: Comprehensive test suite runs normally
- ❌ Until fixed: Must fix errors before comprehensive test runs work
- ⚠️ Direct E2E test execution: Still works (Playwright ignores type errors)
- 📊 Quality improvement: Type-safe test code going forward

## Related Files

**E2E Test Files** (16 files with errors):
- `frontend/e2e/tests/04-content-generation.spec.ts` (35 errors)
- `frontend/e2e/tests/05-job-details.spec.ts` (23 errors)
- `frontend/e2e/tests/15-email-composer.spec.ts` (16 errors)
- `frontend/e2e/tests/03-job-status-updates.spec.ts` (15 errors)
- `frontend/e2e/tests/07-filtered-jobs.spec.ts` (13 errors)
- `frontend/e2e/tests/05-phase-3.1.5-testing-refinement.spec.ts` (11 errors)
- `frontend/e2e/tests/11-accessibility.spec.ts` (6 errors)
- `frontend/e2e/tests/08-responsive-design.spec.ts` (6 errors)
- `frontend/e2e/tests/06-statistics.spec.ts` (6 errors)
- `frontend/e2e/tests/23-description-quality.spec.ts` (5 errors)
- `frontend/e2e/tests/10-performance.spec.ts` (4 errors)
- `frontend/e2e/tests/09-error-handling.spec.ts` (3 errors)
- `frontend/e2e/tests/04-content-generation-integration.spec.ts` (3 errors)
- `frontend/e2e/tests/01-setup-load.spec.ts` (3 errors)
- `frontend/e2e/tests/13-follow-ups-management.spec.ts` (2 errors)
- `frontend/e2e/tests/12-calendar-management.spec.ts` (1 error)

**Configuration Files**:
- `frontend/e2e/test-config.ts:96` (1 error)
- `frontend/e2e/tsconfig.json` (E2E TypeScript configuration)
- `frontend/package.json` (typecheck:e2e script)

**Test Infrastructure**:
- `helper-scripts/run-comprehensive-tests.sh:406-428` (typecheck_e2e function)
- `README_auto-test-plan.md` (Quality Gates documentation)
- `docs/TESTING_STATUS.md` (Current status with infrastructure change note)

**Related Commits**:
- `bfbba1d` - "docs(testing): Major restructuring - Add E2E typecheck quality gate"
- `d89ebda` - "docs(testing): Update TESTING_STATUS.md with E2E type-checking infrastructure change"
