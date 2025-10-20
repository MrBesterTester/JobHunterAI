<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Testing the Email Body Extraction Fix](#testing-the-email-body-extraction-fix)
  - [Overview](#overview)
  - [What Was Fixed](#what-was-fixed)
  - [Root Cause](#root-cause)
  - [Testing Steps](#testing-steps)
    - [Step 1: Refresh Gmail OAuth Token](#step-1-refresh-gmail-oauth-token)
    - [Step 2: Run the Reprocess Endpoint](#step-2-run-the-reprocess-endpoint)
    - [Step 3: Verify Job 2bcac89c](#step-3-verify-job-2bcac89c)
    - [Step 4: Verify in Frontend](#step-4-verify-in-frontend)
    - [Step 5: Test Future Syncs](#step-5-test-future-syncs)
  - [Verification Queries](#verification-queries)
    - [Count Emails Fixed](#count-emails-fixed)
    - [Check Duplicate Linking](#check-duplicate-linking)
    - [Spot Check Email Bodies](#spot-check-email-bodies)
  - [Troubleshooting](#troubleshooting)
    - [Issue: "OAuth not configured" error](#issue-oauth-not-configured-error)
    - [Issue: All emails still show failed = 25](#issue-all-emails-still-show-failed--25)
    - [Issue: Some emails still have NULL body](#issue-some-emails-still-have-null-body)
  - [Test Results ✅](#test-results-)
    - [Reprocess Endpoint Results](#reprocess-endpoint-results)
    - [Database Verification](#database-verification)
    - [Job 2bcac89c Verification](#job-2bcac89c-verification)
    - [Decoding Strategy Analysis](#decoding-strategy-analysis)
  - [Success Criteria](#success-criteria)
  - [Rolling Back](#rolling-back)
  - [Next Steps After Successful Testing](#next-steps-after-successful-testing)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Testing the Email Body Extraction Fix

## Overview

Fixed critical bug where Gmail emails weren't showing body content. The root cause was **incorrect Base64 decoding** - Gmail API returns data with padding, but the code only tried `URL_SAFE_NO_PAD` decoder.

## What Was Fixed

1. **Base64 Decoding Strategy** - Added multi-strategy fallback (URL_SAFE_NO_PAD, URL_SAFE, STANDARD, normalized+padded)
2. **Recursive Email Extraction** - Now handles deeply nested email structures
3. **Duplicate Email Linking** - Duplicate jobs now link to their source emails
4. **Reprocess Endpoint** - New API to re-fetch and fix emails with missing bodies

## Root Cause

Gmail API returns Base64 URL-safe encoded data that **includes padding** (=), but our code only tried `URL_SAFE_NO_PAD` decoder which fails on padded data. Solution: Try multiple decoders in sequence until one succeeds.

**Winning Strategy:** `URL_SAFE` decoder (with padding support)

## Testing Steps

### Step 1: Refresh Gmail OAuth Token

**The current OAuth token has expired.** You need to re-authenticate:

1. Start the frontend: `cd frontend && npm start`
2. Navigate to the Gmail sync page in the UI
3. Click "Connect to Gmail" or "Re-authenticate"
4. Complete the OAuth flow

### Step 2: Run the Reprocess Endpoint

Once OAuth is refreshed, reprocess all emails with missing bodies:

```bash
curl -X POST http://localhost:8080/api/intake/reprocess-empty-bodies
```

**Expected Output:**
```json
{
  "message": "Email body reprocessing completed",
  "total_emails": 25,
  "updated": 25,
  "failed": 0
}
```

**If failed > 0:** Check backend logs for specific errors

### Step 3: Verify Job 2bcac89c

Check the specific job that reported the issue:

```bash
# Check if email body was extracted
psql -U jobhunter_user -d jobhunter_personal -c "
SELECT
    j.job_id,
    j.title,
    LENGTH(e.body_text) as body_length,
    LEFT(e.body_text, 100) as body_preview
FROM jobs j
JOIN email_jobs e ON j.job_id = e.job_id
WHERE j.job_id = '2bcac89c-2457-4ed7-ba5a-4ec7db8c0d18';
"
```

**Expected:** `body_length` should be > 0 (not NULL)

### Step 4: Verify in Frontend

1. Open the frontend
2. Navigate to Filtered jobs tab
3. Find job "Principal Embedded Software Engineer"
4. Click to expand/view details
5. **Verify:** Full email body is now visible

### Step 5: Test Future Syncs

Run a new Gmail sync to verify the fix works for new emails:

```bash
curl -X POST http://localhost:8080/api/intake/gmail/sync
```

Check that newly synced emails have body content:

```sql
-- Should return 0 rows
SELECT COUNT(*) as emails_without_body
FROM email_jobs
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND body_text IS NULL
  AND body_html IS NULL;
```

## Verification Queries

### Count Emails Fixed
```sql
-- Before reprocess: 25 emails
-- After reprocess: Should be 0
SELECT COUNT(*) as remaining_empty_bodies
FROM email_jobs
WHERE body_text IS NULL AND body_html IS NULL;
```

### Check Duplicate Linking
```sql
-- All processed emails should have job_id set
SELECT
    COUNT(*) as total_processed,
    SUM(CASE WHEN job_id IS NULL THEN 1 ELSE 0 END) as orphaned
FROM email_jobs
WHERE processed = true;
```

**Expected:** `orphaned` = 14 (emails with no matching job in database)

### Spot Check Email Bodies
```sql
-- Random sample of 5 emails to verify content extracted
SELECT
    subject,
    sender_email,
    LENGTH(body_text) as body_length,
    LEFT(body_text, 80) as preview
FROM email_jobs
WHERE body_text IS NOT NULL
ORDER BY RANDOM()
LIMIT 5;
```

## Troubleshooting

### Issue: "OAuth not configured" error

**Solution:** Run Step 1 to refresh Gmail OAuth token

### Issue: All emails still show failed = 25

**Solution:**
1. Check backend logs: `tail -f backend/backend.log`
2. Look for specific Gmail API errors
3. Verify OAuth token is valid:
   ```sql
   SELECT
       access_token IS NOT NULL as has_token,
       token_expires_at,
       token_expires_at > NOW() as token_valid
   FROM oauth_credentials;
   ```

### Issue: Some emails still have NULL body

**Possible causes:**
1. Email genuinely has no text content (subject-only, attachment-only)
2. Email uses uncommon MIME structure not handled by extraction
3. Gmail API rate limiting

**Check extraction errors:**
```sql
SELECT
    message_id,
    subject,
    processing_errors
FROM email_jobs
WHERE body_text IS NULL
  AND processing_errors IS NOT NULL;
```

## Test Results ✅

**Date:** 2025-10-19 21:27 PST
**Status:** All tests passed successfully

### Reprocess Endpoint Results

```json
{
  "failed": 0,
  "message": "Email body reprocessing completed",
  "total_emails": 25,
  "updated": 25
}
```

**✅ 100% success rate** - All 25 emails with missing bodies were successfully re-extracted

### Database Verification

```sql
-- Total emails: 50
-- Emails without body: 0
SELECT COUNT(*) FROM email_jobs WHERE body_text IS NULL AND body_html IS NULL;
-- Result: 0
```

### Job 2bcac89c Verification

- **Title:** Principal Embedded Software Engineer
- **body_text length:** 15,724 characters ✅
- **Preview:** Full HTML email with job description successfully extracted

### Decoding Strategy Analysis

From backend logs, the winning strategy was **URL_SAFE decoder** (Strategy 2):
- Strategy 1 (URL_SAFE_NO_PAD): Failed - Invalid padding
- **Strategy 2 (URL_SAFE): SUCCESS** - Decoded all email bodies
- Strategies 3-4: Not needed

## Success Criteria

✅ All Gmail-sourced jobs show email body in frontend
✅ Job 2bcac89c displays full email content (15,724 chars)
✅ New Gmail syncs successfully extract body content
✅ Duplicate jobs link to their source emails
✅ `remaining_empty_bodies` query returns 0
✅ All 25 affected emails successfully reprocessed

## Rolling Back

If the fix causes issues:

```bash
# Revert the commit
git revert 01d2352

# Rebuild backend
cd backend && cargo build && cargo run

# Restart frontend
cd frontend && npm start
```

## Next Steps After Successful Testing

1. Mark this document as complete
2. Update bug-fix-missing-email-bodies.md with test results
3. Consider adding integration tests for nested multipart email extraction
4. Monitor future Gmail syncs for any extraction failures
