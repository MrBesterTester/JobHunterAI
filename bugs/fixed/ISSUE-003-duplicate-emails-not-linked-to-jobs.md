<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [ISSUE-003: Duplicate Gmail Emails Not Linked to Existing Jobs](#issue-003-duplicate-gmail-emails-not-linked-to-existing-jobs)
  - [Summary](#summary)
  - [Impact](#impact)
  - [Root Cause](#root-cause)
  - [Fix Implementation (2025-10-19)](#fix-implementation-2025-10-19)
  - [Test Results (2025-10-19)](#test-results-2025-10-19)
  - [Success Criteria (All Achieved ✅)](#success-criteria-all-achieved-)
  - [Root Cause Resolution](#root-cause-resolution)
  - [Documentation Updates](#documentation-updates)
  - [Testing Commands](#testing-commands)
  - [Status History](#status-history)
  - [Notes](#notes)
  - [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
id: ISSUE-003
title: Duplicate Gmail emails not linked to existing jobs
status: fixed
priority: high
severity: high
component: backend
created: 2025-10-19
updated: 2025-10-19
fixed: 2025-10-19
affects: [Gmail Integration, Email Processing, Job Viewing]
related: [ISSUE-002]
commits: []
---

# ISSUE-003: Duplicate Gmail Emails Not Linked to Existing Jobs

## Summary

When Gmail sync detected a duplicate job (same company+title already exists), it marked the email as processed but failed to link it to the existing job, leaving `job_id = NULL` in the `email_jobs` table. This prevented users from viewing the original email content for duplicate jobs.

## Impact

- 5 orphaned emails with `job_id = NULL` (could not be viewed in UI)
- Users couldn't access original email content for any duplicate job postings
- Frontend API call to `/api/jobs/{id}/email-body` returned no results
- 14 additional emails orphaned (no matching jobs found in database)

## Root Cause

**Location**: `backend/src/main.rs:2369-2381`

**Problem**: The duplicate case handler in Gmail sync ignored the returned `job_id` from the duplicate detection logic.

**Original Code**:
```rust
Ok(JobCreationResult::Duplicate(_job_id)) => {  // <-- job_id ignored
    sqlx::query!(
        "UPDATE email_jobs SET processed = true, ... WHERE email_job_id = $3",
        // <-- no job_id set, remains NULL
    )
}
```

**Why it happened**:
- Gmail sync detected duplicate correctly
- Job creation logic returned the existing job's ID
- Update query ignored the `job_id` parameter
- Email marked as processed but not linked to job
- LinkedIn sync had correct behavior, Gmail sync did not

## Fix Implementation (2025-10-19)

**Code Fix**:
Updated Gmail sync to link duplicate emails to existing jobs (matching LinkedIn sync behavior):

```rust
Ok(JobCreationResult::Duplicate(job_id)) => {  // <-- now uses job_id
    sqlx::query!(
        "UPDATE email_jobs SET job_id = $1, processed = true, ... WHERE email_job_id = $4",
        job_id,  // <-- properly links to existing job
        // ...
    )
}
```

**Database Migration**:
- Created `database/migrations/fix_orphaned_email_jobs.sql`
- Migration query:
  ```sql
  UPDATE email_jobs e
  SET job_id = j.job_id
  FROM jobs j
  WHERE e.job_id IS NULL
    AND e.processed = true
    AND j.company_name = (e.raw_data->>'company')
    AND j.title = (e.raw_data->>'title');
  ```
- Successfully linked 5 orphaned emails to their jobs
- 14 emails remain orphaned (no matching jobs found in database - likely deleted or never created)

**Frontend Enhancement**:
- Added helpful warning message in job details modal when email body is missing
- Yellow warning box explains the issue
- Suggests running migration script if needed

## Test Results (2025-10-19)

**Migration Results**:
```sql
-- Before migration:
SELECT COUNT(*) FROM email_jobs WHERE job_id IS NULL AND processed = true;
-- Result: 19

-- After migration:
SELECT COUNT(*) FROM email_jobs WHERE job_id IS NULL AND processed = true;
-- Result: 14

-- Successfully linked: 5 emails
```

**Verification**:
```sql
-- Check linked emails
SELECT e.email_job_id, e.subject, j.job_id, j.title, j.company_name
FROM email_jobs e
JOIN jobs j ON e.job_id = j.job_id
WHERE e.email_job_id IN (
    '35777de5-b8be-4afe-9af4-bb5be55ec631',
    '4569029d-ae5c-4c71-8d7c-cf023c73f692',
    'aa33cce7-2836-444c-a59b-b793133d5099',
    'e1b0f4bf-3b88-45d1-b2b6-33966ad58675',
    'fe2aaad4-9b35-49ad-a432-57195580e059'
);
-- Result: All 5 emails now linked to jobs
```

## Success Criteria (All Achieved ✅)

✅ New duplicate emails link correctly to existing jobs
✅ Migration successfully fixed 5 existing orphaned emails
✅ Frontend shows helpful warning for any remaining orphaned emails
✅ Gmail sync behavior now matches LinkedIn sync behavior
✅ No new orphaned emails will be created going forward

## Root Cause Resolution

✅ Duplicate detection logic now properly links emails to existing jobs
✅ Migration script available for fixing historical data
✅ Frontend provides clear feedback when email body unavailable
✅ Behavior consistent across all email sources (Gmail, LinkedIn)

## Documentation Updates

- Created `database/migrations/fix_orphaned_email_jobs.sql` with migration logic
- Updated `docs/bug-fix-missing-email-bodies.md` with investigation details

## Testing Commands

```bash
# Check for orphaned emails
psql -U jobhunter_user -d jobhunter_personal -c "
SELECT COUNT(*) as orphaned_emails
FROM email_jobs
WHERE job_id IS NULL AND processed = true;"

# Run migration to fix orphaned emails
psql -U jobhunter_user -d jobhunter_personal -f database/migrations/fix_orphaned_email_jobs.sql

# Verify specific email is linked
psql -U jobhunter_user -d jobhunter_personal -c "
SELECT e.email_job_id, e.subject, j.job_id, j.title
FROM email_jobs e
LEFT JOIN jobs j ON e.job_id = j.job_id
WHERE e.email_job_id = '35777de5-b8be-4afe-9af4-bb5be55ec631';"

# Test Gmail sync with duplicate
curl -X POST http://localhost:8080/api/intake/gmail/sync
```

## Status History

- 2025-10-19: Bug discovered - 5 orphaned emails with no job link
- 2025-10-19: Root cause identified - duplicate handler ignored job_id
- 2025-10-19: Fix implemented - update query now links to existing job
- 2025-10-19: Migration created and executed - 5 emails linked successfully
- 2025-10-19: Frontend enhanced - warning message for missing emails
- 2025-10-19: Marked as **RESOLVED**

## Notes

- This bug only affected Gmail sync, not LinkedIn sync
- LinkedIn sync had correct behavior from the start (used as reference for fix)
- 14 orphaned emails remain because matching jobs don't exist in database (likely deleted or never created)
- Frontend now gracefully handles missing email bodies with helpful message
- Migration is idempotent and can be run multiple times safely
- Fix ensures no new orphaned emails will be created going forward

## Related Files

- `backend/src/main.rs:2369-2381` - Duplicate email linking logic
- `database/migrations/fix_orphaned_email_jobs.sql` - Migration script
- `frontend/src/App.tsx:710-760` - Enhanced fallback UI for missing emails
- `docs/bug-fix-missing-email-bodies.md` - Complete investigation documentation
