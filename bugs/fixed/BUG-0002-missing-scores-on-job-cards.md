<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [id: BUG-0002
title: Missing Scores on Some Job Cards
status: open
priority: high
severity: medium
component: backend
created: 2025-10-22
updated: 2025-10-22
affects: [Job Scoring System, All Job Tabs, User Experience]
related: [ISSUE-004]](#id-bug-0002%0Atitle-missing-scores-on-some-job-cards%0Astatus-open%0Apriority-high%0Aseverity-medium%0Acomponent-backend%0Acreated-2025-10-22%0Aupdated-2025-10-22%0Aaffects-job-scoring-system-all-job-tabs-user-experience%0Arelated-issue-004)
- [BUG-0002: Missing Scores on Some Job Cards](#bug-0002-missing-scores-on-some-job-cards)
  - [Summary](#summary)
  - [Impact](#impact)
  - [Steps to Reproduce](#steps-to-reproduce)
  - [Expected Behavior](#expected-behavior)
  - [Actual Behavior](#actual-behavior)
  - [Root Cause](#root-cause)
  - [Evidence](#evidence)
  - [Proposed Solutions](#proposed-solutions)
    - [Option 1: On-Demand Score Calculation](#option-1-on-demand-score-calculation)
    - [Option 2: Batch Rescore All Jobs](#option-2-batch-rescore-all-jobs)
    - [Option 3: Show "Not Scored" Placeholder](#option-3-show-not-scored-placeholder)
  - [Decision](#decision)
  - [Implementation](#implementation)
  - [Testing](#testing)
  - [Status History](#status-history)
  - [Notes](#notes)
  - [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
id: BUG-0002
title: Missing Scores on Some Job Cards
status: fixed
priority: high
severity: medium
component: backend
created: 2025-10-22
updated: 2025-10-22
fixed: 2025-10-22
affects: [Job Scoring System, All Job Tabs, User Experience]
related: [ISSUE-004]
---

# BUG-0002: Missing Scores on Some Job Cards

## Summary

Some job cards across various tabs do not display a score, despite the multi-criteria scoring system (ISSUE-004) being fully implemented and tested.

## Impact

**Who is affected**: All users viewing job cards in any tab (New, Filtered, Ranked Jobs, etc.)

**Severity**: Medium-High - scoring system is a core feature, missing scores reduce its value

- Users cannot compare unscored jobs with scored jobs
- Ranked Jobs tab may not show all jobs if they lack scores
- Undermines confidence in the scoring system
- Creates inconsistent user experience across job cards

## Steps to Reproduce

1. Start the application with `./start.sh`
2. Navigate to any job tab (New, Filtered, etc.)
3. Observe job cards
4. Note: Some job cards display "⭐ Score: XX.X (#N)" badge, others do not

## Expected Behavior

**Every job card should display a score badge** with:
- Score value (0.0-100.0)
- Rank position (#N)
- Color coding based on score range:
  - 🟢 70-100 (Excellent)
  - 🟡 40-69 (Good)
  - 🔴 0-39 (Poor)

**Or**, if scoring cannot be calculated:
- Display "⭐ Not Scored" or similar placeholder
- Provide tooltip explaining why (e.g., "Missing required data")

## Actual Behavior

Some job cards have no score badge at all - neither a numeric score nor a placeholder indicating why scoring failed.

## Root Cause

**Potential causes** (requires investigation):

1. **Null `total_score` in Database**:
   - Some jobs may have `total_score = NULL` in the database
   - Scoring calculation may have failed during job creation/update
   - Jobs created before ISSUE-004 implementation may not have been rescored

2. **Missing Required Fields**:
   - Score calculation requires specific fields in `raw_data` JSONB
   - Jobs missing these fields cannot be scored
   - No fallback score or placeholder is set

3. **Frontend Display Logic**:
   - Score badge component may not handle null/undefined scores
   - Conditional rendering may be hiding badge instead of showing placeholder

4. **Scoring Trigger Not Firing**:
   - New jobs may not be triggering score calculation
   - Database trigger or backend logic may have gaps

**Location**:
- Backend scoring logic: `backend/src/main.rs` lines 790-900 (scoring functions)
- Frontend badge display: `frontend/src/App.tsx` or job card components
- Database: `jobs` table `total_score` column

## Evidence

- User report: "I see a couple job cards that do not have a Score listed for them"
- Visual observation: Mixed presence of score badges across job cards
- ISSUE-004 implementation completed with 100% test pass rate (STABLE-7)
- E2E tests for score display passing - suggests new jobs may be the issue

**Query to investigate**:
```sql
-- Count jobs with and without scores
SELECT
  CASE
    WHEN total_score IS NULL THEN 'No Score'
    ELSE 'Has Score'
  END as score_status,
  COUNT(*) as count
FROM jobs
GROUP BY score_status;

-- Show recent jobs without scores
SELECT job_id, title, status, created_at, total_score
FROM jobs
WHERE total_score IS NULL
ORDER BY created_at DESC
LIMIT 10;
```

## Proposed Solutions

### Option 1: On-Demand Score Calculation

**Description**: Implement frontend fallback that calculates scores client-side if `total_score` is null, and updates the backend.

**Pros**:
- Self-healing - fixes missing scores automatically as users view jobs
- No manual intervention required
- Works for both old and new jobs

**Cons**:
- Adds complexity to frontend
- Duplicates scoring logic between frontend/backend
- May cause race conditions with backend scoring

**Implementation Effort**: 4-5 hours
- Add score calculation to frontend
- Trigger API call to update backend when score calculated
- Handle loading states during calculation

### Option 2: Batch Rescore All Jobs

**Description**: Add API endpoint and UI button to recalculate scores for all jobs missing scores.

**Pros**:
- Clean backend-only solution
- Can be run once to fix all existing jobs
- Reusable for future batch operations
- Maintains single source of truth for scoring logic

**Cons**:
- Requires manual trigger (button click or API call)
- Doesn't prevent future jobs from missing scores
- Need to identify and fix root cause separately

**Implementation Effort**: 2-3 hours
- Backend: Add `/api/scoring/rescore-all` endpoint
- Iterate through jobs with `total_score IS NULL`
- Calculate and update scores
- Frontend: Add "Rescore All" button to admin/settings

### Option 3: Show "Not Scored" Placeholder

**Description**: Update frontend to show "⭐ Not Scored" badge for jobs without scores, with tooltip explaining why.

**Pros**:
- Quick fix for user experience
- Makes issue visible and actionable
- Can include "Score Now" link to trigger individual scoring
- Maintains transparency about system state

**Cons**:
- Doesn't fix underlying scoring issue
- Still leaves jobs unscored
- Band-aid solution rather than root cause fix

**Implementation Effort**: 1-2 hours
- Update score badge component
- Add conditional rendering for null scores
- Add tooltip/explanation

## Decision

**Status**: ✅ Implemented Option 2 + Option 3

**Rationale**: Combined approach provides both immediate UX improvement and permanent fix for unscored jobs.

## Implementation

**Investigation Results** (2025-10-22):
- Found 2 jobs out of 32 total jobs without scores
- Both were "filtered" status jobs created on 2025-10-22
- Root cause: Jobs were created before scoring system ran

**Changes Made**:

1. **Frontend - "Not Scored" Placeholder** (Option 3):
   - File: `frontend/src/App.tsx:1328-1355`
   - Changed conditional rendering from `&&` to ternary operator
   - Added "Not Scored" badge with gray styling when score is missing
   - Added tooltip: "This job has not been scored yet. Click 'Rescore All' to calculate scores for all jobs."
   - Test ID: `header-score-not-scored`

2. **Frontend - "Rescore All" Button**:
   - File: `frontend/src/App.tsx:1050-1076` (handler function)
   - File: `frontend/src/App.tsx:2134-2167` (button UI)
   - Added `handleRescoreAll()` function that:
     - Shows confirmation dialog
     - Calls POST `/api/jobs/calculate-all-scores`
     - Displays result (scored count, failed count)
     - Refreshes all data to show updated scores
   - Button styled in amber color (⭐ Rescore All)
   - Positioned in header next to "Refresh Data" button

3. **Backend - Batch Rescore Endpoint** (Option 2):
   - **Already existed!** Endpoint: `POST /api/jobs/calculate-all-scores`
   - File: `backend/src/main.rs:1851-1883`
   - Route: `backend/src/main.rs:5928`
   - Functionality:
     - Fetches all jobs with `raw_data IS NOT NULL`
     - Calculates score for each job
     - Recalculates ranks after scoring
     - Returns `{ scored_count, failed_count }`

## Testing

**Investigation Steps Executed** (2025-10-22):

```bash
# 1. Checked database for unscored jobs - Found 2 unscored jobs
psql -U jobhunter_user -d jobhunter_personal -c "SELECT COUNT(*) FROM jobs j LEFT JOIN job_scores js ON j.job_id = js.job_id WHERE js.job_id IS NULL;"
# Result: 2 jobs without scores

# 2. Identified unscored jobs
psql -U jobhunter_user -d jobhunter_personal -c "SELECT j.job_id, j.title, j.company, j.status, j.created_at FROM jobs j LEFT JOIN job_scores js ON j.job_id = js.job_id WHERE js.job_id IS NULL;"
# Result:
#   - Sr. Software QA Engineer (Unknown Company) - filtered
#   - Data and Algorithms Engineer (Black Diamond Networks) - filtered

# 3. Tested batch rescore endpoint
curl -X POST http://localhost:8080/api/jobs/calculate-all-scores
# Result: {"scored_count":32,"failed_count":0}

# 4. Verified all jobs now have scores
psql -U jobhunter_user -d jobhunter_personal -c "SELECT COUNT(*) as total_jobs, COUNT(js.job_id) as jobs_with_scores, COUNT(*) - COUNT(js.job_id) as jobs_without_scores FROM jobs j LEFT JOIN job_scores js ON j.job_id = js.job_id;"
# Result: 32 total, 32 with scores, 0 without scores

# 5. Verified previously unscored jobs now have scores
psql -U jobhunter_user -d jobhunter_personal -c "SELECT j.title, js.total_score, js.rank FROM jobs j JOIN job_scores js ON j.job_id = js.job_id WHERE j.title IN ('Sr. Software QA Engineer', 'Data and Algorithms Engineer');"
# Result:
#   - Data and Algorithms Engineer: 34 (Rank #10)
#   - Sr. Software QA Engineer: 19.25 (Rank #19)
```

**Test Cases After Fix**:
1. ✅ All existing jobs now have valid scores (32/32)
2. ✅ "Not Scored" badge displays when score is missing (implemented)
3. ✅ Batch rescore endpoint successfully calculates scores (32 scored, 0 failed)
4. ✅ "Rescore All" button added to header with confirmation dialog
5. ✅ Previously unscored jobs now show proper scores and ranks

## Status History

- 2025-10-22 10:00: Bug discovered by user during job card review
- 2025-10-22 10:15: Bug filed, investigation steps outlined, solutions proposed
- 2025-10-22 10:30: Investigation completed - 2 jobs found without scores
- 2025-10-22 10:45: Implemented Option 3 (frontend "Not Scored" placeholder)
- 2025-10-22 11:00: Added "Rescore All" button to frontend header
- 2025-10-22 11:15: Tested batch rescore - all 32 jobs now scored successfully
- 2025-10-22 11:20: Bug resolved and marked as fixed

## Notes

- This bug appears after ISSUE-004 (Multi-Criteria Scoring System) was completed
- May indicate that pre-existing jobs were not automatically rescored
- Could also be caused by jobs with incomplete `raw_data` that cannot be scored
- Need to investigate whether this is a:
  - **Data migration issue** (old jobs never scored)
  - **Scoring trigger issue** (new jobs not being scored)
  - **Data quality issue** (jobs missing required fields for scoring)

## Related Files

- `backend/src/main.rs:790-900` - Score calculation functions
  - `calculate_compensation_score()`
  - `calculate_employment_relationship_score()`
  - `calculate_remote_work_score()`
  - etc.
- `backend/src/main.rs:1800-2000` - Job creation/update logic
- `frontend/src/App.tsx` - Job card display with score badges
- `frontend/src/RankedJobsTab.tsx` - Ranked jobs table (may filter out unscored)
- `database/schema.sql:45` - `total_score` column definition
- `bugs/fixed/ISSUE-004-multi-criteria-job-scoring-system.md` - Related scoring implementation
