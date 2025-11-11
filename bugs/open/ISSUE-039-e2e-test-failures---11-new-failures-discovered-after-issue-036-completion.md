---
id: ISSUE-039
title: E2E test failures - 11 new failures discovered after ISSUE-036 completion
status: open
priority: high
severity: medium
component: frontend
created: 2025-11-10
updated: 2025-11-10
affects: []
related: [ISSUE-036, ISSUE-040]
---

# ISSUE-039: E2E test failures - 11 new failures discovered after ISSUE-036 completion

**✅ UNBLOCKED**: ISSUE-040 is now complete! The database architecture has been simplified to use a single database (`jobhunter_personal`) with automatic backup/restore for testing. The root cause of these test failures was database configuration confusion - tests were configured for `jobhunter_personal` but the seed script was targeting `jobhunter_dev`. With the corrected architecture in place, we can now resume investigation of these 11 test failures.

See: [ISSUE-040 (Database Architecture Simplification)](../fixed/ISSUE-040-database-architecture-simplification---single-database-with-backuprestore.md) for full details.

---

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Background](#background)
- [List of 11 Failing Tests](#list-of-11-failing-tests)
  - [Category 1: Console Errors (1 test)](#category-1-console-errors-1-test)
  - [Category 2: Tab Navigation/Display (2 tests)](#category-2-tab-navigationdisplay-2-tests)
  - [Category 3: Gmail Integration (1 test)](#category-3-gmail-integration-1-test)
  - [Category 4: Refresh Functionality (1 test)](#category-4-refresh-functionality-1-test)
  - [Category 5: Description Quality (2 tests)](#category-5-description-quality-2-tests)
  - [Category 6: Test Data Infrastructure (4 tests)](#category-6-test-data-infrastructure-4-tests)
- [Root Cause Analysis](#root-cause-analysis)
- [Investigation Plan](#investigation-plan)
- [Evidence](#evidence)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Systematic Investigation and Fix](#option-1-systematic-investigation-and-fix)
  - [Option 2: Test Data Refresh](#option-2-test-data-refresh)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

After completing ISSUE-036 (all 32 original E2E test failures resolved), a fresh comprehensive test run discovered **11 NEW test failures** that were not part of the original ISSUE-036 tracking. These failures represent a **2.8% failure rate** of active tests (11/400).

**Current Status**: 388 passed / 11 failed / 194 skipped = **97.0% pass rate**

**Note**: These failures may be related to:
- Test data changes made during ISSUE-036 fixes
- Environment differences between test runs
- Recently introduced regressions
- Tests that were passing intermittently

## Impact

**Who/What is affected:**
- E2E test suite reliability
- Continuous integration confidence
- Development velocity (cannot merge with failing tests)
- Test result credibility

**Severity:**
- **Medium** - Tests are failing but don't represent critical production bugs
- Most appear to be test data or test infrastructure issues
- Need investigation to determine if actual bugs or test-only issues

## Background

**ISSUE-036 Context**:
- Started with 378 passed / 32 failed (92.2% pass rate)
- Completed all 5 phases: 13 skipped + 17 fixed + 2 false positives = 32 resolved
- Expected result: 388 passed / 0 failed / 194 skipped
- **Actual result**: 388 passed / 11 failed / 194 skipped (97.0% pass rate)

**Discovery**: Fresh test run on 2025-11-11 01:00:00 PST using `./helper-scripts/run-e2e-tests.sh`

## List of 11 Failing Tests

### Category 1: Console Errors (1 test)

**1. `01-setup-load.spec.ts:73` - "should load without console errors"**
- **Status**: Was in original ISSUE-036 (Category 5: warnings), marked as "not fixed"
- **Likely Cause**: Console warnings/errors still present in application
- **Investigation**: Check what console messages are being logged

### Category 2: Tab Navigation/Display (2 tests)

**2. `02-tab-navigation.spec.ts:248` - "should display filtered reasons for filtered jobs"**
- **Status**: NEW failure (not in original 32)
- **Likely Cause**: Filtered reasons not displaying correctly OR test data doesn't have filtered reasons
- **Investigation**: Check if filtered jobs have `filtered_reason` field populated

**3. `02-tab-navigation.spec.ts:322` - "should handle tabs with no jobs gracefully"**
- **Status**: NEW failure (not in original 32)
- **Likely Cause**: Empty state handling issue OR test expects specific empty state message
- **Investigation**: Check empty state rendering logic

### Category 3: Gmail Integration (1 test)

**4. `16-gmail-sync-integration.spec.ts:210` - "should allow approving jobs synced from Gmail"**
- **Status**: NEW failure (not in original 32)
- **Likely Cause**: Test data doesn't have Gmail-synced jobs OR approval workflow broken
- **Investigation**: Check if test database has Gmail source jobs

### Category 4: Refresh Functionality (1 test)

**5. `22-refresh-buttons.spec.ts:55` - "should refresh single job description when per-job button clicked"**
- **Status**: NEW failure (not in original 32)
- **Likely Cause**: Refresh button functionality broken OR test data issue
- **Investigation**: Check if refresh button exists and functions correctly

### Category 5: Description Quality (2 tests)

**6. `23-description-quality.spec.ts:79` - "should show actual job content (not just 'No job description')"**
- **Status**: NEW failure (not in original 32)
- **Note**: ISSUE-038 was supposed to fix description quality tests
- **Likely Cause**: Test data jobs may not have descriptions OR regression introduced
- **Investigation**: Check if test data jobs have proper descriptions

**7. `23-description-quality.spec.ts:136` - "refresh should regenerate description"**
- **Status**: NEW failure (not in original 32)
- **Note**: ISSUE-038 was supposed to fix description quality tests
- **Likely Cause**: Refresh functionality broken OR test data issue
- **Investigation**: Verify refresh generates new descriptions

### Category 6: Test Data Infrastructure (4 tests)

**8. `99-extraction-method-badge-test.spec.ts:15` - "should display blue LLM badge"**
- **Status**: NEW failure (but was FIXED in ISSUE-036 Phase 2)
- **Likely Cause**: Test data regression - jobs may not have `extraction_method` set
- **Investigation**: Verify test database has jobs with `extraction_method = 'llm'`

**9. `99-extraction-method-badge-test.spec.ts:92` - "should verify job data via API"**
- **Status**: NEW failure (but was FIXED in ISSUE-036 Phase 2)
- **Likely Cause**: Test data regression
- **Investigation**: Check if API returns correct extraction_method data

**10. `99b-filtered-tab-test.spec.ts:13` - "should show Expert Systems Architect job in Filtered tab"**
- **Status**: NEW failure (but was FIXED in ISSUE-036 Phase 2)
- **Likely Cause**: Test data regression - specific test job may not exist in database
- **Investigation**: Verify "Expert Systems Architect" job exists in test database

**11. `99b-filtered-tab-test.spec.ts:53` - "should verify API returns filtered jobs"**
- **Status**: NEW failure (but was FIXED in ISSUE-036 Phase 2)
- **Likely Cause**: Test data regression
- **Investigation**: Check if API returns filtered jobs correctly

## Root Cause Analysis

**Primary Hypothesis**: Test data regression

**Evidence**:
1. **4 tests (Category 6)** were previously FIXED in ISSUE-036 Phase 2, suggesting test data was modified or not properly maintained
2. These tests specifically rely on `database/seed_test_data.sql` having correct data
3. The test database may have been cleared/reseeded without the proper data

**Secondary Hypothesis**: Recently introduced regressions

**Evidence**:
1. **7 tests (Categories 1-5)** are NEW failures not seen before
2. Some may be legitimate bugs introduced during ISSUE-036 fixes
3. Some may be test environment differences

**Investigation Priority**:
1. **High**: Category 6 (test data infrastructure) - 4 tests, known fixes reverted
2. **Medium**: Category 5 (description quality) - 2 tests, related to ISSUE-038
3. **Medium**: Categories 2-4 (tab navigation, Gmail, refresh) - 4 tests, functionality issues
4. **Low**: Category 1 (console errors) - 1 test, warnings only

## Investigation Plan

**Phase 1: Test Data Verification** (30 minutes)
1. Check current state of `database/seed_test_data.sql`
2. Verify test database has correct data:
   - Jobs with `extraction_method = 'llm'`
   - "Expert Systems Architect" filtered job
   - Jobs with proper descriptions
   - Gmail-sourced jobs
3. If data missing, reseed database and rerun Category 6 tests

**Phase 2: Individual Test Investigation** (2-3 hours)
1. Run each failing test individually to see detailed error messages
2. Categorize failures:
   - Test data issues (fix data)
   - Actual bugs (fix code)
   - Test expectations wrong (fix test)
3. Fix issues systematically by category

**Phase 3: Comprehensive Verification** (30 minutes)
1. Run full E2E suite after all fixes
2. Verify all 11 tests now passing
3. Update TESTING_STATUS.md

## Evidence

**Test Run Log**: `/tmp/e2e-test-fresh-run.log` (2025-11-11 01:00:00 PST)

**Test Results Summary**:
```
11 failed
  [chromium] › e2e/tests/01-setup-load.spec.ts:73:9 › should load without console errors
  [chromium] › e2e/tests/02-tab-navigation.spec.ts:248:9 › should display filtered reasons for filtered jobs
  [chromium] › e2e/tests/02-tab-navigation.spec.ts:322:9 › should handle tabs with no jobs gracefully
  [chromium] › e2e/tests/16-gmail-sync-integration.spec.ts:210:7 › should allow approving jobs synced from Gmail
  [chromium] › e2e/tests/22-refresh-buttons.spec.ts:55:7 › should refresh single job description when per-job button clicked
  [chromium] › e2e/tests/23-description-quality.spec.ts:79:7 › should show actual job content (not just "No job description")
  [chromium] › e2e/tests/23-description-quality.spec.ts:136:7 › refresh should regenerate description
  [chromium] › e2e/tests/99-extraction-method-badge-test.spec.ts:15:7 › should display blue LLM badge
  [chromium] › e2e/tests/99-extraction-method-badge-test.spec.ts:92:7 › should verify job data via API
  [chromium] › e2e/tests/99b-filtered-tab-test.spec.ts:13:7 › should show Expert Systems Architect job in Filtered tab
  [chromium] › e2e/tests/99b-filtered-tab-test.spec.ts:53:7 › should verify API returns filtered jobs

1 flaky
  [chromium] › e2e/tests/11-accessibility.spec.ts:307:9 › should have form inputs with labels

194 skipped
388 passed (11.8m)
```

**Pass Rate**: 97.0% (388/399 active tests)

## Proposed Solutions

### Option 1: Systematic Investigation and Fix

**Description**: Investigate each failing test individually, categorize root cause, and apply appropriate fix (test data, code, or test expectations)

**Pros**:
- Addresses root causes properly
- Provides learning about what went wrong
- Ensures comprehensive fixes

**Cons**:
- Time-intensive (2-4 hours estimated)
- Requires careful investigation of each test

**Implementation Effort**: 2-4 hours

**Maintenance**: Low - proper fixes should be stable

### Option 2: Test Data Refresh

**Description**: Focus first on Category 6 (test data infrastructure) since those tests were previously working. Reseed database and verify fixes.

**Pros**:
- Quick win for 4 tests (36% of failures)
- Low risk - just restoring known good state
- Fast to implement (30 minutes)

**Cons**:
- Doesn't address other 7 tests
- May mask underlying issues

**Implementation Effort**: 30 minutes

**Maintenance**: Medium - need to ensure test data remains stable

**Recommended Approach**: Start with Option 2 (quick win), then proceed with Option 1 for remaining failures

## Testing

**Test Commands:**
```bash
# Run all 11 failing tests to see current state
cd frontend
npx playwright test \
  e2e/tests/01-setup-load.spec.ts:73 \
  e2e/tests/02-tab-navigation.spec.ts:248 \
  e2e/tests/02-tab-navigation.spec.ts:322 \
  e2e/tests/16-gmail-sync-integration.spec.ts:210 \
  e2e/tests/22-refresh-buttons.spec.ts:55 \
  e2e/tests/23-description-quality.spec.ts:79 \
  e2e/tests/23-description-quality.spec.ts:136 \
  e2e/tests/99-extraction-method-badge-test.spec.ts:15 \
  e2e/tests/99-extraction-method-badge-test.spec.ts:92 \
  e2e/tests/99b-filtered-tab-test.spec.ts:13 \
  e2e/tests/99b-filtered-tab-test.spec.ts:53 \
  --project=chromium

# Run Category 6 tests only (test data infrastructure)
npx playwright test \
  e2e/tests/99-extraction-method-badge-test.spec.ts \
  e2e/tests/99b-filtered-tab-test.spec.ts \
  --project=chromium

# Run full test suite after fixes
./helper-scripts/run-e2e-tests.sh
```

**Verification:**
- [ ] All 11 tests passing individually
- [ ] Full E2E suite passes (400 active tests, 97%+ pass rate)
- [ ] No regressions introduced by fixes
- [ ] Test data stability verified

## Status History

- 2025-11-10: ISSUE created and documented
- 2025-11-10: Comprehensive analysis completed, investigation plan defined

## Notes

**Key Insight**: The fact that 4 tests (Category 6) were previously FIXED in ISSUE-036 Phase 2 but are now failing again strongly suggests a test data regression. This should be the first priority to investigate.

**Test Data Dependency**: Several tests depend on specific test data in `database/seed_test_data.sql`:
- Jobs with `extraction_method = 'llm'` for badge tests
- "Expert Systems Architect" filtered job for filtered tab tests
- Jobs with proper descriptions for quality tests
- Gmail-sourced jobs for integration tests

**ISSUE-038 Connection**: Two description quality tests failing despite ISSUE-038 being marked as fixed. Need to verify if:
1. ISSUE-038 fix was incomplete
2. Test data doesn't match ISSUE-038 expectations
3. Regression introduced after ISSUE-038

## Related Files

**Test Files**:
- `frontend/e2e/tests/01-setup-load.spec.ts:73`
- `frontend/e2e/tests/02-tab-navigation.spec.ts:248,322`
- `frontend/e2e/tests/16-gmail-sync-integration.spec.ts:210`
- `frontend/e2e/tests/22-refresh-buttons.spec.ts:55`
- `frontend/e2e/tests/23-description-quality.spec.ts:79,136`
- `frontend/e2e/tests/99-extraction-method-badge-test.spec.ts:15,92`
- `frontend/e2e/tests/99b-filtered-tab-test.spec.ts:13,53`

**Test Data**:
- `database/seed_test_data.sql` - Test database seeding script
- `helper-scripts/seed-test-data.sh` - Test data seeding helper
- `frontend/e2e/global-setup.ts` - E2E test setup (database switching and seeding)

**Application Code** (investigation needed):
- TBD after initial investigation reveals root causes
