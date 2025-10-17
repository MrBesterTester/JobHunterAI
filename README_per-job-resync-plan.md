<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Plan: Per-Job Email Re-Sync Feature](#plan-per-job-email-re-sync-feature)
  - [Overview](#overview)
  - [Problem](#problem)
  - [Solution: Per-Job Re-Sync](#solution-per-job-re-sync)
    - [Backend Implementation](#backend-implementation)
    - [Frontend Implementation](#frontend-implementation)
  - [Advantages](#advantages)
  - [Alternative Considered: Global Re-Sync](#alternative-considered-global-re-sync)
  - [Testing](#testing)
  - [Implementation Order](#implementation-order)
  - [Success Criteria](#success-criteria)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Plan: Per-Job Email Re-Sync Feature

## Overview

Add a per-job re-sync button that allows users to re-fetch email bodies from Gmail for specific jobs. This addresses the issue where some jobs have NULL `body_text` in the database despite having a valid `message_id`.

## Problem

Some jobs (e.g., d28c5934, d03d8afc) have:
- Valid `message_id` in `email_jobs` table
- NULL `body_text` and `body_html` fields
- This indicates the original Gmail extraction failed

Simply re-running the sync won't help because:
- Current sync only processes `is:unread -label:JobOp` emails
- Already-synced emails are marked as read with JobOp label
- The `extract_email_body()` function likely failed for certain email formats

## Solution: Per-Job Re-Sync

### Backend Implementation

**New Endpoint**: `POST /api/jobs/{id}/re-sync-email`

**Logic**:
1. Query `email_jobs` table for the job's `message_id`
2. If no `message_id` found, return error (manually created job, no email)
3. Fetch message from Gmail API: `GET /gmail/v1/users/me/messages/{messageId}`
4. Extract body using existing `extract_email_body()` function
5. Update `email_jobs` table:
   ```sql
   UPDATE email_jobs
   SET body_text = $1, body_html = $2, processed_at = NOW()
   WHERE job_id = $3
   ```
6. Return updated body data to frontend

**Error Handling**:
- Missing `message_id`: Return 400 with message "No email associated with this job"
- Gmail message deleted (404): Return 404 with message "Email no longer exists in Gmail"
- Gmail API auth failure: Refresh token and retry
- Extraction failure: Log detailed error, return 500 with error details

**File**: `backend/src/main.rs`

**Function Signature**:
```rust
async fn re_sync_job_email_handler(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
    gmail_credentials: web::Data<GmailCredentials>,
) -> Result<HttpResponse>
```

### Frontend Implementation

**Location**: Job card debug section in `frontend/src/App.tsx`

**UI Changes**:
1. Add "Re-Sync Email" button next to existing per-job refresh button
2. Icon: `RefreshCcw` from lucide-react (circular arrows, different from RefreshCw)
3. Button style: Small, unobtrusive, matches existing refresh button
4. Tooltip: "Re-fetch email body from Gmail"

**Behavior**:
1. On click: Call `POST /api/jobs/{id}/re-sync-email`
2. Show loading state during API call
3. On success:
   - Update email body display in modal (if open)
   - Show success message/toast
4. On error:
   - Show error message explaining what went wrong

**Code Location**: Inside JobCard component, debug section around line 1672

**Example**:
```typescript
<button
  onClick={(e) => {
    e.stopPropagation();
    reSyncJobEmail(job.job_id);
  }}
  style={{
    background: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    padding: '4px 6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  }}
  title="Re-fetch email body from Gmail"
>
  <RefreshCcw style={{ width: '12px', height: '12px' }} />
</button>
```

## Advantages

1. **User Control**: User decides which jobs need re-syncing
2. **Fast**: Single email fetch, instant feedback
3. **Safe**: No interference with new email discovery
4. **Simple**: Minimal code changes, leverages existing functions
5. **Targeted**: Fix specific problematic jobs without re-processing all 50

## Alternative Considered: Global Re-Sync

A global "Re-Sync Now" button was considered but deemed more complex:
- Would need to query last sync from `job_intake_logs`
- Batch process all email_jobs from that sync
- Long-running operation (minutes for 50 jobs)
- Needs progress tracking UI
- Higher risk of Gmail API rate limits
- More complex error handling

Per-job approach is more feasible and aligns with user preference.

## Testing

**E2E Test**: Add to existing `frontend/e2e/tests/22-refresh-buttons.spec.ts`

**Test Cases**:
1. Re-sync button should be visible in job card debug section
2. Clicking re-sync should update email body
3. Re-sync should show loading state during fetch
4. Re-sync should handle errors gracefully
5. Re-sync should work even if modal is closed

## Implementation Order

1. Backend: Create `re_sync_job_email_handler()` function
2. Backend: Add route registration
3. Frontend: Add re-sync button to job card
4. Frontend: Add API call function
5. Frontend: Handle success/error states
6. Testing: Add E2E tests
7. Testing: Manual test with job d28c5934

## Success Criteria

- Job d28c5934 shows full email body after clicking re-sync button
- No errors in console or backend logs
- Button works consistently across multiple jobs
- E2E tests pass
