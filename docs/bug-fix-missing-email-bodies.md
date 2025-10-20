<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Bug Fix: Missing Email Bodies for Filtered Jobs](#bug-fix-missing-email-bodies-for-filtered-jobs)
  - [Summary](#summary)
  - [Issues Found](#issues-found)
    - [Issue 1: Duplicate Jobs Not Linked to Emails (CRITICAL BUG - FIXED)](#issue-1-duplicate-jobs-not-linked-to-emails-critical-bug---fixed)
    - [Issue 2: Base64 Decoding Failure (ROOT CAUSE - FIXED)](#issue-2-base64-decoding-failure-root-cause---fixed)
  - [Files Modified](#files-modified)
    - [Backend](#backend)
    - [Frontend](#frontend)
    - [Database](#database)
  - [Testing](#testing)
    - [Verified ✅](#verified-)
  - [Investigation Complete ✅](#investigation-complete-)
    - [Email Body Extraction Issue - RESOLVED](#email-body-extraction-issue---resolved)
    - [No Further Investigation Needed](#no-further-investigation-needed)
  - [Metrics](#metrics)
    - [Before Fix](#before-fix)
    - [After Fix](#after-fix)
    - [Reprocessing Results](#reprocessing-results)
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

### Issue 2: Base64 Decoding Failure (ROOT CAUSE - FIXED)

**Location:** `backend/src/main.rs:2518-2588`

**Problem:**
Investigation of job `2bcac89c-2457-4ed7-ba5a-4ec7db8c0d18` revealed:
- Email IS correctly linked to job
- But `email_jobs.body_text` and `email_jobs.body_html` are BOTH NULL
- Gmail API was returning full email bodies (verified via curl)
- BUT Base64 decoding was failing with "Invalid padding" errors

**Stats:**
- 25 emails had no body content (both `body_text` and `body_html` were NULL)
- Affects 13 jobs
- All are linked correctly, but Base64 decoding failed during extraction

**Root Cause:**
Gmail API returns Base64 URL-safe encoded data that **includes padding** (= characters), but the code only tried `URL_SAFE_NO_PAD` decoder which fails on padded data. This caused 100% failure rate for all affected emails.

**Original Code:**
```rust
fn decode_body_data(body: &GmailBody) -> Option<String> {
    if let Some(data) = &body.data {
        if !data.is_empty() {
            match general_purpose::URL_SAFE_NO_PAD.decode(data) {  // <-- Only tried one decoder
                Ok(decoded) => { /* convert to string */ }
                Err(e) => { return None; }  // <-- Failed immediately
            }
        }
    }
    None
}
```

**Fix Applied:**
Implemented multi-strategy Base64 decoding fallback:
```rust
fn decode_body_data(body: &GmailBody) -> Option<String> {
    if let Some(data) = &body.data {
        if !data.is_empty() {
            // Strategy 1: URL_SAFE_NO_PAD (standard for Gmail)
            if let Ok(decoded) = general_purpose::URL_SAFE_NO_PAD.decode(data) {
                if let Some(text) = try_convert_to_string(decoded) {
                    return Some(text);
                }
            }

            // Strategy 2: URL_SAFE (with padding) ✅ THIS ONE WORKED
            if let Ok(decoded) = general_purpose::URL_SAFE.decode(data) {
                if let Some(text) = try_convert_to_string(decoded) {
                    return Some(text);
                }
            }

            // Strategy 3: Standard Base64 (fallback)
            // Strategy 4: Normalized + padded (fallback)
            // ...
        }
    }
    None
}
```

**Result:**
- Strategy 2 (URL_SAFE with padding) successfully decoded all 25 affected emails
- 100% success rate after reprocessing
- All emails now have full body content

**Frontend Fix Applied:**
Updated job details modal to show helpful message when email body is missing:
- Gmail jobs without email: Yellow warning box explaining the issue
- Suggests running migration script if needed
- Shows "No description available" for non-Gmail jobs

## Files Modified

### Backend
- `backend/src/main.rs:2369-2381` - Fixed duplicate email linking bug
- `backend/src/main.rs:2518-2588` - Fixed Base64 decoding with multi-strategy fallback
- `backend/src/main.rs:3110-3205` - Added reprocess endpoint for fixing existing emails

### Frontend
- `frontend/src/App.tsx:710-760` - Enhanced fallback UI for missing email bodies

### Database
- `database/migrations/fix_orphaned_email_jobs.sql` - Migration to fix existing orphaned emails

## Testing

### Verified ✅
✅ Backend compiles successfully with fix
✅ Database migration successfully linked 5 orphaned emails
✅ Frontend shows helpful message when email body is missing
✅ Backend running and serving API requests
✅ **Reprocess endpoint successfully updated all 25 emails (100% success rate)**
✅ **Job 2bcac89c now displays full email body (15,724 characters)**
✅ **All 50 emails in database now have body content (0 missing)**
✅ **URL_SAFE decoder (Strategy 2) successfully decodes Gmail email bodies**

## Investigation Complete ✅

### Email Body Extraction Issue - RESOLVED

The issue was identified and fixed through systematic debugging:

1. **Added extensive debug logging** to trace execution flow
2. **Identified root cause:** Base64 "Invalid padding" errors for all 25 affected emails
3. **Implemented solution:** Multi-strategy Base64 decoder fallback
4. **Testing confirmed:** 100% success rate with URL_SAFE decoder (Strategy 2)

**Key Finding:** Gmail API sometimes returns Base64-encoded data with padding (=), but our code only tried the `URL_SAFE_NO_PAD` decoder. The fix adds fallback strategies that handle all encoding variants.

### No Further Investigation Needed

All affected emails have been successfully reprocessed and now contain full body content. Future Gmail syncs will automatically use the multi-strategy decoder.

## Metrics

### Before Fix
- 5 orphaned emails (job_id = NULL, could not be viewed)
- 14 additional orphaned emails (no matching jobs in database)
- **25 emails with no body content** (Base64 decoding failures)
- Frontend showed no indication of missing data

### After Fix
- **0 new orphaned emails** (duplicate linking fixed)
- **5 previously orphaned emails now linked** to existing jobs
- **0 emails with no body content** (all 25 successfully reprocessed)
- **100% extraction success rate** with multi-strategy decoder
- Frontend shows clear warning message for any future issues

### Reprocessing Results
- **Total emails processed:** 25
- **Successfully updated:** 25 (100%)
- **Failed:** 0 (0%)
- **Average body length:** ~15,000 characters
- **Decoding strategy used:** URL_SAFE (with padding)

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
