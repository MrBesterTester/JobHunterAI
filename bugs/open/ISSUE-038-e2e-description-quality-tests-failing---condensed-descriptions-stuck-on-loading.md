---
id: ISSUE-038
title: E2E description quality tests failing - condensed descriptions stuck on 'Loading...'
status: fixed
priority: medium
severity: medium
component: frontend
created: 2025-11-10
updated: 2025-11-10
fixed: 2025-11-10
affects: []
related: [ISSUE-036, ISSUE-022]
---

# ISSUE-038: E2E description quality tests failing - condensed descriptions stuck on 'Loading...'

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Steps to Reproduce](#steps-to-reproduce)
- [Expected Behavior](#expected-behavior)
- [Actual Behavior](#actual-behavior)
- [Root Cause](#root-cause)
- [Evidence](#evidence)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Investigate with Playwright Trace Analysis](#option-1-investigate-with-playwright-trace-analysis)
  - [Option 2: Pre-generate Condensed Descriptions in Seed Data](#option-2-pre-generate-condensed-descriptions-in-seed-data)
  - [Option 3: Skip These Tests Temporarily](#option-3-skip-these-tests-temporarily)
- [Decision](#decision)
- [Resolution](#resolution)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

Two E2E tests in `23-description-quality.spec.ts` fail because condensed descriptions remain stuck on "Loading description..." and never complete. The backend API works correctly when tested manually (returns condensed descriptions in ~3 seconds), but fails in the E2E test environment.

## Impact

**Who/What is affected:**
- E2E test suite for description quality validation
- Automated testing workflow (2 of 7 tests in suite failing)
- Feature validation: Condensed job descriptions functionality

**Severity:**
- Medium: Backend functionality works correctly in production; only affects automated testing
- Tests fail quickly (1.6-2 seconds), indicating API calls may not be triggered or are failing silently
- Blocks completion of ISSUE-036 Phase 3 bug fixes

## Steps to Reproduce

1. Ensure backend is connected to `jobhunter_dev` database
2. Seed test data with long job descriptions (1890 chars) for new jobs
3. Run tests: `npx playwright test e2e/tests/23-description-quality.spec.ts --grep "should show actual job content|refresh should regenerate" --project=chromium`
4. Observe: All 10 job cards show "Loading description..." indefinitely
5. Tests fail at line 131 and 169 with "Expected: true, Received: false"

## Expected Behavior

- Frontend makes GET request to `/api/jobs/{id}/condense-description` for each visible job card
- Backend condenses long descriptions using Claude Haiku API (~3 seconds per request)
- Frontend displays condensed description (100-110 words)
- Tests find at least one job with >20 word condensed description

## Actual Behavior

- All job cards show "Loading description..." and never complete
- Tests fail in 1.6-2 seconds (too fast for API calls to complete)
- Screenshots show 10 job cards stuck in loading state
- No condensed descriptions are rendered

## Root Cause

**IDENTIFIED**: Test was using a generic DOM selector that matched the wrong element.

The tests were stuck on "Loading description..." because the selector was finding the wrong DOM element (the job card header container instead of the description content div):

**Problematic selector (lines 93, 154, 165):**
```typescript
const descriptionContainer = card.locator('div')
  .filter({ hasText: 'Condensed Description' })
  .locator('div').last();
```

**Why this failed:**
- `.filter({ hasText: 'Condensed Description' })` matches any ancestor div containing that text
- This would match the outer job card container, not the specific description section
- The subsequent `.locator('div').last()` would then select the last div inside the card, which was the job header, not the description

**Root cause connection:**
This is the same selector issue discovered and fixed in ISSUE-036 Phase 4 for the refresh buttons test (22-refresh-buttons.spec.ts:59). The pattern occurred in three locations in the description quality tests.

## Evidence

- Test logs: `/tmp/description-quality-final.log` - shows "Loading description..." for all cards
- Screenshot: `test-results/.../test-failed-1.png` - visual confirmation of loading state
- Manual API test: `curl http://localhost:8080/api/jobs/2d015480-7e0f-4ebf-b3f4-d92ee283bd03/condense-description` - returns valid response
- Database query: Job with ID `2d015480...` exists in `jobhunter_dev` with 1890 char description

## Proposed Solutions

### Option 1: Investigate with Playwright Trace Analysis

**Description**: Use Playwright's built-in trace viewer to analyze network requests, console logs, and timing during test execution.

**Pros**:
- Shows exact network activity (are requests being made?)
- Reveals any console errors or warnings
- Identifies timing/race condition issues
- Built into Playwright, no additional tools needed

**Cons**:
- Requires manual trace review
- May not reveal root cause if issue is environmental

**Implementation Effort**: 1-2 hours

**Maintenance**: None - diagnostic only

### Option 2: Pre-generate Condensed Descriptions in Seed Data

**Description**: Add a `condensed_description` column to database and populate it during seeding, bypassing LLM API calls in tests.

**Pros**:
- Tests become fast and deterministic
- No dependency on external API during tests
- Removes timing/rate-limit concerns

**Cons**:
- Doesn't test actual API integration
- Requires database schema change
- Doesn't match production behavior

**Implementation Effort**: 3-4 hours

**Maintenance**: Need to update seed data when prompt changes

### Option 3: Skip These Tests Temporarily

**Description**: Mark tests as `.skip()` with clear comment explaining the issue, defer investigation.

**Pros**:
- Unblocks other testing work
- Quick solution
- Can revisit when more time available

**Cons**:
- Reduces test coverage
- Feature not validated automatically
- May hide real bugs

**Implementation Effort**: 5 minutes

**Maintenance**: None

## Decision

**Chosen**: Option 3 (Skip tests temporarily) - to unblock ISSUE-036 Phase 3 completion

**Rationale**:
- Backend functionality works correctly when tested manually
- 3 of 4 bugs from Phase 3 are successfully fixed
- Can investigate these 2 failing tests separately without blocking progress
- ISSUE-038 documents the problem for future investigation

## Resolution

**Fixed in ISSUE-036 Phase 4 follow-up work** (2025-11-10)

After fixing the refresh buttons test in Phase 4 using a more specific selector pattern, the same issue was identified in the description quality tests. Applied the same fix to all three selector occurrences.

**Fix applied:**
```typescript
// OLD (problematic - matches wrong element):
const descriptionContainer = card.locator('div')
  .filter({ hasText: 'Condensed Description' })
  .locator('div').last();

// NEW (specific - matches correct element):
const descriptionSection = card.locator('strong:has-text("Condensed Description")')
  .locator('xpath=../..');  // Navigate up to section container
const descriptionContainer = descriptionSection.locator('> div').last();
```

**Locations fixed:**
- Line 93-95: First test "should show actual job content" (temp selector in loop)
- Line 154-155: Second test "refresh should regenerate" (temp selector in loop)
- Line 166-167: Second test "refresh should regenerate" (final selector assignment)

**Test results:**
- ✅ "should show actual job content" - PASSED (4.5s)
- ✅ "refresh should regenerate description" - PASSED (9.0s)

**Verification:**
```bash
cd frontend
npx playwright test e2e/tests/23-description-quality.spec.ts \
  --grep "should show actual job content|refresh should regenerate" \
  --project=chromium
# Result: 2 passed (10.5s)
```

## Implementation

~~Tests will be marked with `.skip()` and reference this ISSUE number.~~

**Actual implementation**: Fixed test selectors to properly target condensed description content div.

## Testing

**Test Commands:**
```bash
# Reproduce the issue
cd frontend
npx playwright test e2e/tests/23-description-quality.spec.ts --grep "should show actual job content|refresh should regenerate" --project=chromium

# Manually verify backend API works
curl http://localhost:8080/api/jobs/$(psql -U jobhunter_user -d jobhunter_dev -t -c "SELECT job_id FROM jobs WHERE status='new' LIMIT 1" | tr -d ' ')/condense-description

# Check database connection
psql -U jobhunter_user -d jobhunter_dev -c "SELECT COUNT(*) FROM jobs WHERE status='new';"
```

**Verification:**
- [ ] Playwright trace shows network requests (or lack thereof)
- [ ] Console logs reveal any frontend errors
- [ ] Manual browser test confirms feature works outside Playwright
- [ ] Seed data has proper long descriptions (verified: 1890 chars)

## Status History

- 2025-11-10: ISSUE created and documented during ISSUE-036 Phase 3 work
- 2025-11-10: Investigated for ~2 hours, backend confirmed working, tests still fail in E2E environment
- 2025-11-10: **FIXED** - Root cause identified as generic DOM selector matching wrong element. Applied same fix from ISSUE-036 Phase 4 refresh buttons test. All 2 tests now passing (10.5s runtime).

## Notes

**Context from ISSUE-036 Phase 3:**
- This issue blocked completion of "Fix description quality/refresh issues (2 tests)" task
- 3 other bugs were successfully fixed: console errors, badge sync, accessibility
- Backend was restarted to ensure correct database connection
- Changed tests from 'all' tab → 'inbox' tab → 'new' tab, still failing

**Investigation findings:**
- Backend API responds correctly with 111-word condensed descriptions
- Frontend code structure appears correct (useEffect triggers fetchCondensedDescription)
- Database has correct seed data with long descriptions
- Issue appears specific to E2E test environment, not production code

## Related Files

- `frontend/e2e/tests/23-description-quality.spec.ts:79` - First failing test
- `frontend/e2e/tests/23-description-quality.spec.ts:134` - Second failing test
- `frontend/src/App.tsx:1414` - fetchCondensedDescription function
- `frontend/src/App.tsx:1697` - useEffect that triggers API call
- `frontend/src/App.tsx:2345` - Render location showing "Loading description..."
- `backend/src/main.rs:2859` - condense_description_handler backend endpoint
- `prompts/job_condensed_description.md` - Claude Haiku prompt for condensing
- `database/seed_test_data.sql:143-156` - New jobs seed data with long descriptions
