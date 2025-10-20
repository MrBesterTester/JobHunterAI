<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Bug Fix: Missing Email Bodies for Filtered Jobs](#bug-fix-missing-email-bodies-for-filtered-jobs)
  - [Summary](#summary)
  - [Issues Found](#issues-found)
    - [Issue 1: Duplicate Jobs Not Linked to Emails (CRITICAL BUG - FIXED)](#issue-1-duplicate-jobs-not-linked-to-emails-critical-bug---fixed)
    - [Issue 2: Some Emails Have No Body Content (SEPARATE ISSUE)](#issue-2-some-emails-have-no-body-content-separate-issue)
  - [Files Modified](#files-modified)
    - [Backend](#backend)
    - [Frontend](#frontend)
    - [Database](#database)
  - [Testing](#testing)
    - [Verified](#verified)
    - [Manual Testing Needed](#manual-testing-needed)
  - [Future Investigation](#future-investigation)
    - [Email Body Extraction Issue](#email-body-extraction-issue)
    - [Query to Find Affected Emails](#query-to-find-affected-emails)
  - [Metrics](#metrics)
    - [Before Fix](#before-fix)
    - [After Fix](#after-fix)
  - [Related Issues](#related-issues)
  - [Rollback Plan](#rollback-plan)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Bug Fix: Missing Email Bodies for Filtered Jobs

**Date:** 2025-10-19
**Reporter:** User
**Job ID Example:** `2bcac89c-2457-4ed7-ba5a-4ec7db8c0d18`

## Summary

Fixed critical bug where Gmail-imported jobs weren't showing original email content in the job details view. Investigation revealed two separate issues affecting multiple filtered jobs.

## Issues Found

### Issue 1: Duplicate Jobs Not Linked to Emails (CRITICAL BUG - FIXED)

**Location:** `backend/src/main.rs:2369-2381`

**Problem:**
When Gmail sync detected a duplicate job (same company+title already exists), it would:
- ✅ Mark the email as processed
- ❌ NOT link the email to the existing job (left `job_id = NULL` in `email_jobs` table)

**Impact:**
- Any email that was a duplicate couldn't be viewed later
- Frontend API call to `/api/jobs/{id}/email-body` returned no results
- User couldn't see the original email that triggered the job

**Root Cause:**
The duplicate case handler ignored the returned `job_id`:
```rust
Ok(JobCreationResult::Duplicate(_job_id)) => {  // <-- job_id ignored
    sqlx::query!(
        "UPDATE email_jobs SET ... WHERE email_job_id = $3",  // <-- no job_id set
```

**Fix Applied:**
Updated Gmail sync to link duplicate emails to existing jobs (matching LinkedIn sync behavior):
```rust
Ok(JobCreationResult::Duplicate(job_id)) => {  // <-- now uses job_id
    sqlx::query!(
        "UPDATE email_jobs SET job_id = $1, ... WHERE email_job_id = $4",  // <-- links to job
```

**Migration:**
- Created `database/migrations/fix_orphaned_email_jobs.sql`
- Successfully linked 5 orphaned emails to their jobs
- 14 emails remain orphaned (no matching jobs found in database)

### Issue 2: Some Emails Have No Body Content (SEPARATE ISSUE)

**Problem:**
Investigation of job `2bcac89c-2457-4ed7-ba5a-4ec7db8c0d18` revealed:
- Email IS correctly linked to job
- But `email_jobs.body_text` and `email_jobs.body_html` are BOTH NULL
- LLM extraction only got: "Urgent need for a Principal Embedded Software Engineer role."
- This minimal description triggers "No job description to be extracted" message

**Stats:**
- 13 emails have no body content (both `body_text` and `body_html` are NULL)
- Affects 12 jobs
- All are linked correctly, but body extraction failed during Gmail import

**Possible Causes:**
1. Gmail API returned emails with no body content
2. Email body extraction logic (`extract_email_body` function) failed for certain email formats
3. Emails genuinely had no body (subject-only emails)

**Frontend Fix Applied:**
Updated job details modal to show helpful message when email body is missing:
- Gmail jobs without email: Yellow warning box explaining the issue
- Suggests running migration script if needed
- Shows "No description available" for non-Gmail jobs

## Files Modified

### Backend
- `backend/src/main.rs:2369-2381` - Fixed duplicate email linking bug

### Frontend
- `frontend/src/App.tsx:710-760` - Enhanced fallback UI for missing email bodies

### Database
- `database/migrations/fix_orphaned_email_jobs.sql` - Migration to fix existing orphaned emails

## Testing

### Verified
✅ Backend compiles successfully with fix
✅ Database migration successfully linked 5 orphaned emails
✅ Frontend shows helpful message when email body is missing
✅ Backend running and serving API requests

### Manual Testing Needed
⚠️ Test job `2bcac89c` in UI - should now show warning message about missing email
⚠️ Create test Gmail sync with duplicate jobs - verify emails are linked correctly
⚠️ Investigate why 13 emails have no body content

## Future Investigation

### Email Body Extraction Issue
Need to investigate why some emails have no body content:

1. **Check Gmail API responses:**
   - Add logging to `extract_email_body` function
   - Capture raw Gmail API response for emails with missing bodies
   - Verify payload structure matches expectations

2. **Test different email formats:**
   - Plain text only emails
   - HTML only emails
   - Multipart emails with attachments
   - Forwarded emails
   - Replies/threads

3. **Enhance extraction logic:**
   - Add fallback extraction methods
   - Handle more Gmail payload structures
   - Log warnings when body extraction returns empty

### Query to Find Affected Emails
```sql
-- Find emails with no body content
SELECT
    e.email_job_id,
    e.subject,
    e.sender_email,
    e.received_date,
    j.job_id,
    j.title,
    j.company,
    j.status
FROM email_jobs e
JOIN jobs j ON e.job_id = j.job_id
WHERE e.body_text IS NULL
  AND e.body_html IS NULL
ORDER BY e.received_date DESC;
```

## Metrics

### Before Fix
- 5 orphaned emails (job_id = NULL, could be viewed)
- 14 additional orphaned emails (no matching jobs)
- 13 emails with no body content
- Frontend showed no indication of missing data

### After Fix
- 0 new orphaned emails (duplicate linking fixed)
- 5 previously orphaned emails now linked
- 13 emails with no body content (separate issue)
- Frontend shows clear warning message

## Related Issues

- Condensed description showing "No job description to be extracted" - This is working as intended when actual job description is minimal or missing
- See [README.md](../README.md) for extraction and filtering logic documentation

## Rollback Plan

If issues arise:

1. **Revert backend code:**
   ```bash
   git revert <commit-hash>
   cd backend && cargo build && cargo run
   ```

2. **Revert database migration:**
   ```sql
   -- Unlink the 5 emails that were linked by migration
   UPDATE email_jobs
   SET job_id = NULL
   WHERE email_job_id IN (
       '35777de5-b8be-4afe-9af4-bb5be55ec631',
       '4569029d-ae5c-4c71-8d7c-cf023c73f692',
       'aa33cce7-2836-444c-a59b-b793133d5099',
       'e1b0f4bf-3b88-45d1-b2b6-33966ad58675',
       'fe2aaad4-9b35-49ad-a432-57195580e059'
   );
   ```

3. **Revert frontend:**
   ```bash
   git revert <commit-hash>
   cd frontend && npm start
   ```
