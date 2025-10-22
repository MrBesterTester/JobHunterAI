<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [id: ISSUE-005
title: Jobs with Missing Descriptions Not Ranked Appropriately
status: open
priority: medium
severity: medium
component: frontend
created: 2025-10-22
updated: 2025-10-22
affects: [Filtered Tab, Job Ranking, User Experience]
related: []](#id-issue-005%0Atitle-jobs-with-missing-descriptions-not-ranked-appropriately%0Astatus-open%0Apriority-medium%0Aseverity-medium%0Acomponent-frontend%0Acreated-2025-10-22%0Aupdated-2025-10-22%0Aaffects-filtered-tab-job-ranking-user-experience%0Arelated-)
- [ISSUE-005: Jobs with Missing Descriptions Not Ranked Appropriately](#issue-005-jobs-with-missing-descriptions-not-ranked-appropriately)
  - [Summary](#summary)
  - [Impact](#impact)
  - [Steps to Reproduce](#steps-to-reproduce)
  - [Expected Behavior](#expected-behavior)
  - [Actual Behavior](#actual-behavior)
  - [Root Cause](#root-cause)
  - [Evidence](#evidence)
  - [Proposed Solutions](#proposed-solutions)
    - [Option 1: Rank Last in Current Tab](#option-1-rank-last-in-current-tab)
    - [Option 2: Move to Rejected Tab](#option-2-move-to-rejected-tab)
    - [Option 3: Visual Warning + Manual Action](#option-3-visual-warning--manual-action)
  - [Decision](#decision)
  - [Implementation](#implementation)
  - [Testing](#testing)
  - [Status History](#status-history)
  - [Notes](#notes)
  - [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
id: ISSUE-005
title: Jobs with Missing Descriptions Not Ranked Appropriately
status: open
priority: medium
severity: medium
component: frontend
created: 2025-10-22
updated: 2025-10-22
affects: [Filtered Tab, Job Ranking, User Experience]
related: []
---

# ISSUE-005: Jobs with Missing Descriptions Not Ranked Appropriately

## Summary

Job cards in the Filtered tab that have no condensed job description appear mixed in with valid jobs, making it difficult to assess which jobs have sufficient information for evaluation.

## Impact

**Who is affected**: Users reviewing filtered jobs in the Filtered tab

**Severity**: Medium - doesn't block functionality but degrades user experience and makes job review inefficient

- Users must manually identify which jobs lack descriptions
- Time wasted clicking into incomplete job cards
- Reduced confidence in the filtering/extraction system
- Unclear whether these jobs should be reviewed or rejected

## Steps to Reproduce

1. Start the application with `./start.sh`
2. Navigate to the **Filtered** tab
3. Scroll through job cards
4. Observe: Several job cards have no condensed job description text visible

## Expected Behavior

Jobs without condensed descriptions should be:
- **Either**: Automatically moved to the **Rejected** tab (they can't be properly evaluated)
- **Or**: Ranked last in the current tab with clear visual indicator
- Should not appear mixed in with valid, complete job postings

## Actual Behavior

Jobs with missing condensed descriptions appear intermixed with complete jobs in the Filtered tab, with no special treatment or visual distinction.

## Root Cause

**Technical Explanation**:

The current sorting/ranking logic does not account for missing `condensed_description` field. Possible causes:

1. **LLM Extraction Failure**: Some jobs failed to extract properly from email HTML
2. **Missing Data Validation**: No check for required fields before displaying in Filtered tab
3. **Sort Logic Incomplete**: Sorting doesn't penalize or segregate jobs with null/empty descriptions
4. **Status Classification**: Jobs are marked as "filtered" even when extraction is incomplete

**Location**: Likely in:
- Frontend: `frontend/src/FilteredJobsTab.tsx` - display and sorting logic
- Backend: `backend/src/main.rs` - job status determination after extraction

## Evidence

- User report: "In the filtered tab there are still several job cards with no condensed job description"
- Visual observation: Multiple job cards in Filtered tab missing description text
- No automatic handling or visual warning for incomplete extractions

## Proposed Solutions

### Option 1: Rank Last in Current Tab

**Description**: Modify the Filtered tab's sorting logic to always rank jobs with missing descriptions at the bottom, with a visual warning badge.

**Pros**:
- Keeps jobs in Filtered tab for potential manual review
- User can still decide whether to keep or reject
- Non-destructive - doesn't auto-reject potentially valid jobs
- Clear visual indicator of incomplete data

**Cons**:
- Still clutters the Filtered tab
- Requires extra click to reject individually
- May accumulate incomplete jobs over time

**Implementation Effort**: 2-3 hours
- Add sort key checking for null/empty `condensed_description`
- Add "⚠️ No Description" badge to cards
- Update sorting logic in FilteredJobsTab.tsx

### Option 2: Move to Rejected Tab

**Description**: Automatically move jobs with missing descriptions to the Rejected tab on creation/extraction failure, with a specific rejection reason.

**Pros**:
- Keeps Filtered tab clean and focused on reviewable jobs
- Reduces cognitive load - only see valid jobs
- Can still be found in Rejected tab if needed
- Clear system behavior: no description = not filterable

**Cons**:
- More aggressive - auto-rejects potentially valid jobs
- Might reject jobs that could be manually salvaged
- Requires backend logic change (status update)

**Implementation Effort**: 3-4 hours
- Backend: Update job status determination logic
- Backend: Set status to "rejected" with reason "Missing job description"
- Database: Update existing jobs with missing descriptions
- Frontend: No changes needed (already handled by tab filtering)

### Option 3: Visual Warning + Manual Action

**Description**: Add a prominent warning badge and provide a bulk "Reject All Incomplete" button.

**Pros**:
- User maintains control over decisions
- Bulk action makes cleanup fast
- Visual warning helps identification
- Flexible - can handle case-by-case

**Cons**:
- Still requires manual action
- Extra UI complexity (bulk action button)
- Incomplete jobs still visible in tab

**Implementation Effort**: 3-4 hours
- Add visual warning badge
- Implement bulk action UI component
- Backend endpoint for bulk status update

## Decision

**Status**: Pending user/developer decision

**Recommendation**: Option 2 (Move to Rejected Tab) is recommended because:
- Jobs without descriptions cannot be properly evaluated by users
- LLM extraction failures indicate low-quality or incompatible job postings
- Keeps Filtered tab focused on actionable, complete jobs
- Rejected jobs can still be manually reviewed if needed
- Clearest system behavior and user expectations

## Implementation

[To be filled after decision is made]

## Testing

**Test Cases**:
1. ✅ Jobs with valid condensed_description appear normally in Filtered tab
2. ✅ Jobs with null/empty condensed_description are handled per chosen solution:
   - Option 1: Ranked last with warning badge
   - Option 2: Moved to Rejected tab
   - Option 3: Show warning with bulk reject button
3. ✅ Existing jobs in database are handled correctly on next load
4. ✅ New jobs from Gmail extraction respect the new logic

**Test Commands**:
```bash
# Check for jobs with missing descriptions
psql -U jobhunter_user -d jobhunter_personal -c "SELECT job_id, title, status, condensed_description FROM jobs WHERE condensed_description IS NULL OR condensed_description = '' ORDER BY status;"

# Frontend visual testing
npm start
# Navigate to Filtered tab, verify behavior
```

## Status History

- 2025-10-22: Issue discovered by user during review of Filtered tab
- 2025-10-22: Issue filed, root cause analyzed, solutions proposed

## Notes

- This issue highlights the need for better data validation after LLM extraction
- Consider adding extraction quality metrics to track success rates
- May want to implement automatic re-extraction attempts for failed jobs
- Related to ISSUE-001 (HTML preprocessing) - better preprocessing might reduce extraction failures

## Related Files

- `frontend/src/FilteredJobsTab.tsx` - Filtered tab display and sorting
- `frontend/src/App.tsx` - Main app component with tab routing
- `backend/src/main.rs` - Job extraction and status determination logic (lines ~2900-3200)
- `database/schema.sql` - Jobs table schema with condensed_description field
