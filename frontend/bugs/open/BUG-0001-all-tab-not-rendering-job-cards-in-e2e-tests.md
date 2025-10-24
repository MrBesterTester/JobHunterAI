<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [id: BUG-0001
title: "All" tab not rendering job cards in E2E tests
status: open
priority: high
severity: high
component: frontend
created: 2025-10-23
updated: 2025-10-23
affects: e2e-tests
related: []](#id-bug-0001%0Atitle-all-tab-not-rendering-job-cards-in-e2e-tests%0Astatus-open%0Apriority-high%0Aseverity-high%0Acomponent-frontend%0Acreated-2025-10-23%0Aupdated-2025-10-23%0Aaffects-e2e-tests%0Arelated-)
- [BUG-0001: "All" tab not rendering job cards in E2E tests](#bug-0001-all-tab-not-rendering-job-cards-in-e2e-tests)
  - [Summary](#summary)
  - [Impact](#impact)
  - [Steps to Reproduce](#steps-to-reproduce)
  - [Expected Behavior](#expected-behavior)
  - [Actual Behavior](#actual-behavior)
  - [Root Cause](#root-cause)
  - [Proposed Solutions](#proposed-solutions)
    - [Option 1: Add explicit wait after tab click (Low effort, Medium reliability)](#option-1-add-explicit-wait-after-tab-click-low-effort-medium-reliability)
    - [Option 2: Add test-specific tab indicator (Medium effort, High reliability)](#option-2-add-test-specific-tab-indicator-medium-effort-high-reliability)
    - [Option 3: Debug tab switching in test environment (High effort, addresses root cause)](#option-3-debug-tab-switching-in-test-environment-high-effort-addresses-root-cause)
  - [Testing](#testing)
    - [Test Commands](#test-commands)
    - [Verification Criteria](#verification-criteria)
  - [Status History](#status-history)
  - [Notes](#notes)
  - [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
id: BUG-0001
title: "All" tab not rendering job cards in E2E tests
status: open
priority: high
severity: high
component: frontend
created: 2025-10-23
updated: 2025-10-23
affects: e2e-tests
related: []
---

# BUG-0001: "All" tab not rendering job cards in E2E tests

## Summary

The job trade-off display E2E tests (all 17 tests in `05-job-tradeoff-display.spec.ts`) are failing because job cards are not rendering when the "All" tab is clicked during test execution. The tests timeout waiting for `[data-testid="job-card"]` elements that never appear.

## Impact

- **Severity**: High - blocks all 17 job trade-off display E2E tests
- **Test Coverage**: 40.3% of E2E tests pass (219/544), with these 17 tests contributing to failures
- **User Impact**: Unknown - issue may be E2E test-specific, not production
- **Development Impact**: Cannot verify trade-off badge and detail section functionality via automated tests

## Steps to Reproduce

1. Start backend and frontend servers
2. Run E2E test: `npx playwright test e2e/tests/05-job-tradeoff-display.spec.ts:21`
3. Test navigates to http://localhost:3000
4. Test clicks button with text "All"
5. Test waits for `[data-testid="job-card"]` selector
6. **Result**: Timeout after 10 seconds - no job cards found

## Expected Behavior

After clicking the "All" tab button:
1. Tab state should change from 'intake' to 'all'
2. `getAllActiveJobs()` function should be called (frontend/src/App.tsx:1309)
3. Job cards should render with `data-testid="job-card"` attributes (frontend/src/App.tsx:1398)
4. Trade-off badges should be visible for jobs with relevant data (tax structure, remote status, etc.)

## Actual Behavior

After clicking the "All" tab button:
1. Page continues showing Intake tab content (error-context.md shows "Job Intake Sources" heading)
2. No job cards render
3. Test times out waiting for job cards

## Root Cause

**Investigation findings** (verified 2025-10-23):

✅ **Backend API**: Returns raw_data correctly with nested structures
- Confirmed via curl: `GET /api/jobs/{id}` returns `raw_data.compensation`, `raw_data.employment`, `raw_data.remote_work`, `raw_data.commute`, `raw_data.job_domain`
- Database query: 60 jobs have raw_data populated with trade-off structures

✅ **Frontend Code**: All components implemented correctly
- Job cards have `data-testid="job-card"` attribute (App.tsx:1398)
- Badges implemented: tax-structure-badge, fully-remote-badge, shuttle-badge, ai-badge, testing-badge (App.tsx:1584-1660)
- Detail sections implemented: compensation-section, employment-section, location-commute-section, technical-section (App.tsx:555-682)

✅ **Data Availability**: Jobs have badge-worthy data
- 7 jobs with `generative_ai_usage = true`
- 38 jobs with `testing_focus = true`
- Multiple jobs with tax_structure values: "W2", "1099", "corp_to_corp"
- Multiple jobs with remote_work.policy: "fully_remote", "hybrid", "onsite"

❌ **Tab Switching Logic**: Tab click not triggering state change
- Default tab state: `useState<TabType>('intake')` (App.tsx:887)
- Tab buttons defined correctly with onClick: `setActiveTab(tab)` (App.tsx:2371)
- "All" tab renders correctly: `getTabLabel('all')` → "All" (App.tsx:1338)
- **Issue**: After Playwright clicks "All" button, page remains on Intake tab (confirmed via error-context.md)

**Likely causes**:
1. **Race condition**: Playwright click happens before React event handlers attach
2. **Event propagation**: Click event not reaching button's onClick handler
3. **Test environment issue**: setState not triggering re-render in test environment
4. **Timing issue**: Need to wait for network requests or state updates after click

## Proposed Solutions

### Option 1: Add explicit wait after tab click (Low effort, Medium reliability)
**Approach**: Wait for tab content to change before looking for job cards
```typescript
await page.click('button:has-text("All")');
await page.waitForFunction(() => {
  const intake = document.querySelector('[data-testid="intake-heading"]');
  return intake === null; // Intake tab content should be gone
});
await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });
```
**Pros**: Quick fix, addresses timing issue
**Cons**: Doesn't fix root cause, brittle selector dependency
**Effort**: 1-2 hours (update test file)

### Option 2: Add test-specific tab indicator (Medium effort, High reliability)
**Approach**: Add data-testid to tab content areas for reliable state verification
```typescript
// In App.tsx
{activeTab === 'all' && (
  <div data-testid="all-tab-content">
    {getAllActiveJobs().map(job => <JobCard ... />)}
  </div>
)}

// In test
await page.click('button:has-text("All")');
await page.waitForSelector('[data-testid="all-tab-content"]');
await page.waitForSelector('[data-testid="job-card"]');
```
**Pros**: Reliable, explicit state verification, reusable pattern
**Cons**: Requires frontend changes
**Effort**: 2-3 hours (frontend changes + test updates)

### Option 3: Debug tab switching in test environment (High effort, addresses root cause)
**Approach**: Add logging and investigate why React state isn't updating
```typescript
// Add test fixture to capture console logs
test.beforeEach(async ({ page }) => {
  page.on('console', msg => console.log('Browser:', msg.text()));
  await page.goto('http://localhost:3000');
  await page.click('button:has-text("All")');
  await page.evaluate(() => console.log('Active tab:', localStorage.getItem('activeTab')));
});
```
**Pros**: Addresses root cause, may reveal broader issues
**Cons**: Time-consuming investigation
**Effort**: 4-6 hours (debugging + fix)

## Testing

### Test Commands
```bash
# Run single failing test
npx playwright test e2e/tests/05-job-tradeoff-display.spec.ts:21 --reporter=line

# Run all trade-off tests
npx playwright test e2e/tests/05-job-tradeoff-display.spec.ts --reporter=line

# Check error context
cat test-results/*/error-context.md
```

### Verification Criteria
- [ ] Test clicks "All" tab button
- [ ] Tab content switches from Intake to job card grid
- [ ] At least one job card renders with `data-testid="job-card"`
- [ ] Test completes without timeout (< 10 seconds)
- [ ] All 17 trade-off display tests pass

## Status History

- **2025-10-23 (Created)**: Investigation completed, root cause identified as tab switching failure in E2E test environment. Frontend code and backend API verified working correctly.

## Notes

- This may be a Playwright-specific issue rather than a production bug
- Manual testing recommended to verify "All" tab works in actual browsers
- Consider adding Playwright debugging guide to project documentation
- Trade-off display feature is fully implemented - tests are validating existing functionality

## Related Files

- **Test file**: frontend/e2e/tests/05-job-tradeoff-display.spec.ts:18 (waitForSelector timeout)
- **Frontend**: frontend/src/App.tsx:887 (activeTab state), :2371 (tab onClick), :1309 (getAllActiveJobs), :1398 (job-card testid)
- **Badge rendering**: frontend/src/App.tsx:1584-1660 (trade-off badges)
- **Detail sections**: frontend/src/App.tsx:555-682 (compensation, employment, location, technical sections)
- **Backend API**: backend/src/main.rs:1726, 1740, 1840 (raw_data returned in job queries)
- **Database schema**: database/schema.sql (raw_data JSONB field)
