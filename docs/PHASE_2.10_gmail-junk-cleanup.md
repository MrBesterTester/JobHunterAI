<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Phase 2.10: Gmail Junk Cleanup](#phase-210-gmail-junk-cleanup)
  - [Overview](#overview)
  - [User Story](#user-story)
  - [Scope](#scope)
    - [In Scope](#in-scope)
    - [Out of Scope](#out-of-scope)
  - [Technical Design](#technical-design)
    - [Database Schema](#database-schema)
    - [API Design](#api-design)
      - [New Endpoints](#new-endpoints)
    - [Frontend Design](#frontend-design)
      - [UI Components](#ui-components)
    - [Gmail API Integration](#gmail-api-integration)
  - [Implementation Plan](#implementation-plan)
    - [Step 1: Backend Implementation (45-60 min)](#step-1-backend-implementation-45-60-min)
    - [Step 2: Frontend Implementation (45-60 min)](#step-2-frontend-implementation-45-60-min)
  - [Testing Strategy](#testing-strategy)
    - [Backend Unit Tests (2 tests)](#backend-unit-tests-2-tests)
    - [E2E Tests (3 tests)](#e2e-tests-3-tests)
    - [Manual Test (1 test)](#manual-test-1-test)
  - [Success Criteria](#success-criteria)
  - [Dependencies](#dependencies)
  - [Risks and Mitigations](#risks-and-mitigations)
  - [Future Enhancements (Out of Scope)](#future-enhancements-out-of-scope)
  - [Open Questions](#open-questions)
  - [Implementation Notes](#implementation-notes)
  - [Related Documentation](#related-documentation)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Phase 2.10: Gmail Junk Cleanup

**Status**: 📋 Planning Complete - Ready to Implement

**Created**: 2025-11-06 16:15:00 PST

**Estimated Effort**: 2-3 hours (both Ignored and Rejected tabs)

**Priority**: Medium (Quality of Life feature)

---

## Overview

Enable bulk deletion of Gmail junk emails directly from the JobHunter UI, providing a convenient way to clean up unwanted emails without manual Gmail operations.

**User Pain Point**: Non-job emails (LLM classified as not job-related) and rejected jobs accumulate in the database with corresponding Gmail emails that clutter the inbox. User needs to SEE the email to determine if it's junk. Currently requires manual cleanup in Gmail.

**Solution**: Add bulk email deletion capability to BOTH the Ignored (Non-Job Emails) tab and the Rejected tab for Gmail-sourced emails.

**Primary Target**: Ignored tab - where most junk email accumulates (emails LLM classified as non-jobs)
**Secondary Target**: Rejected tab - jobs user explicitly rejected

---

## User Story

> **As a user**, I want to bulk-delete junk emails from Gmail (both non-job emails and rejected jobs) so I can clean up my inbox without switching to Gmail and manually finding/deleting emails. I need to see the email content to determine if it's junk.

**Acceptance Criteria**:
1. ✅ **Ignored tab** shows checkboxes for Gmail-sourced non-job emails only
2. ✅ **Rejected tab** shows checkboxes for Gmail-sourced rejected jobs only
3. ✅ Both tabs display email content (subject, sender, body) so user can identify junk
4. ✅ "Select All" / "Deselect All" buttons for bulk selection in both tabs
5. ✅ "Delete Selected from Gmail" button appears when emails/jobs selected
6. ✅ Confirmation dialog shows count and requires user confirmation
7. ✅ Emails moved to Gmail trash (soft delete, recoverable)
8. ✅ Database records deleted after successful email trash:
   - Ignored tab: Delete `email_jobs` records (no job exists)
   - Rejected tab: Delete job records (CASCADE deletes `email_jobs`)
9. ✅ User sees success/failure feedback
10. ✅ Gmail emails can be permanently deleted by user in Gmail trash

---

## Scope

### In Scope

**Frontend - Ignored Tab** (Primary):
- Multi-select checkboxes on email cards for Gmail-sourced emails only
- Checkboxes only visible for emails with `source='gmail'`
- "Select All" / "Deselect All" buttons
- "Delete Selected from Gmail" button (disabled when none selected)
- Confirmation dialog with email count
- Success/failure toast notifications
- Automatic refresh of Ignored tab after deletion
- Note: Email display already exists (subject, sender, body content)

**Frontend - Rejected Tab** (Secondary):
- Multi-select checkboxes on job cards for Gmail-sourced jobs only
- Checkboxes only visible for `source='gmail'` jobs
- "Select All" / "Deselect All" buttons
- "Delete Selected from Gmail" button (disabled when none selected)
- Confirmation dialog with job count
- Success/failure toast notifications
- Automatic refresh of Rejected tab after deletion

**Backend**:
- New endpoint: `POST /api/email-jobs/bulk-delete-gmail` (for Ignored tab - deletes email_jobs records)
- New endpoint: `POST /api/jobs/bulk-delete-gmail` (for Rejected tab - deletes job records)
- Input validation (IDs must be from Gmail source)
- Gmail API integration (messages.trash endpoint)
- Database cleanup:
  - Ignored: Delete `email_jobs` records after email trashed
  - Rejected: Delete job records after email trashed (CASCADE deletes email_jobs)
- Error handling and partial success reporting

**Gmail API**:
- Soft delete (trash) emails using Gmail API
- Uses existing `gmail.modify` scope from Phase 2.9
- Graceful handling of API errors (rate limits, network failures)

### Out of Scope

- ❌ Bulk deletion for Microsoft emails (different API, future phase - Phase 2.11)
- ❌ Bulk deletion from Filtered tab (user can Disapprove to move to Rejected, or mark as non-job)
- ❌ Bulk deletion from Failed/Duplicates tabs (different use case)
- ❌ Permanent deletion from Gmail (user does this manually in Gmail trash)
- ❌ Undo functionality (soft delete is sufficient - Gmail trash recoverable for 30 days)
- ❌ Email content display in Ignored tab (already exists)
- ❌ Creating Ignored tab UI (already exists - see IgnoredTab.tsx)

---

## Technical Design

### Database Schema

No schema changes required. Uses existing tables:
- `jobs` - Job records to delete
- `email_jobs` - Contains `message_id` for Gmail API calls

### API Design

#### New Endpoints

**Endpoint 1: Bulk Delete from Ignored Tab (Non-Job Emails)**

```rust
POST /api/email-jobs/bulk-delete-gmail
Content-Type: application/json

{
  "email_job_ids": ["uuid1", "uuid2", "uuid3"]
}

Response (200 OK):
{
  "success_count": 2,
  "failure_count": 1,
  "failures": [
    {
      "email_job_id": "uuid3",
      "error": "Gmail API error: Message not found"
    }
  ]
}
```

**Implementation Steps**:
1. Validate all email_job_ids exist and have source='gmail'
2. Get OAuth credentials for Gmail source
3. For each email_job:
   - Fetch `message_id` from `email_jobs` table
   - Call Gmail API: `POST https://gmail.googleapis.com/gmail/v1/users/me/messages/{messageId}/trash`
   - If success: Delete email_jobs record from database
   - If failure: Log error, continue to next email
4. Return summary of successes and failures

**Endpoint 2: Bulk Delete from Rejected Tab (Rejected Jobs)**

```rust
POST /api/jobs/bulk-delete-gmail
Content-Type: application/json

{
  "job_ids": ["uuid1", "uuid2", "uuid3"]
}

Response (200 OK):
{
  "success_count": 2,
  "failure_count": 1,
  "failures": [
    {
      "job_id": "uuid3",
      "error": "Gmail API error: Message not found"
    }
  ]
}
```

**Implementation Steps**:
1. Validate all job IDs exist and have source='gmail'
2. Get OAuth credentials for Gmail source
3. For each job:
   - Fetch `message_id` from `email_jobs` table (via job_id foreign key)
   - Call Gmail API: `POST https://gmail.googleapis.com/gmail/v1/users/me/messages/{messageId}/trash`
   - If success: Delete job record from database (CASCADE deletes email_jobs entry)
   - If failure: Log error, continue to next job
4. Return summary of successes and failures

**Common Error Responses**:
```rust
Response (400 Bad Request):
{
  "error": "Invalid request: Some emails/jobs are not from Gmail source"
}

Response (401 Unauthorized):
{
  "error": "Gmail OAuth token expired or invalid"
}
```

### Frontend Design

#### UI Components

**Ignored Tab Updates** (Primary):

```tsx
// Email card with checkbox (Gmail emails only)
<div className="email-card">
  {email.source === 'gmail' && (
    <input
      type="checkbox"
      checked={selectedEmails.has(email.email_job_id)}
      onChange={() => toggleEmailSelection(email.email_job_id)}
    />
  )}
  {/* existing email card content - subject, sender, body preview */}
</div>

// Bulk action controls
<div className="bulk-actions">
  <button onClick={selectAllEmails}>Select All Gmail Emails</button>
  <button onClick={deselectAll}>Deselect All</button>
  <button
    onClick={handleBulkDeleteEmails}
    disabled={selectedEmails.size === 0}
  >
    Delete {selectedEmails.size} from Gmail
  </button>
</div>
```

**Rejected Tab Updates** (Secondary):

```tsx
// Job card with checkbox (Gmail jobs only)
<div className="job-card">
  {job.source === 'gmail' && (
    <input
      type="checkbox"
      checked={selectedJobs.has(job.job_id)}
      onChange={() => toggleJobSelection(job.job_id)}
    />
  )}
  {/* existing job card content */}
</div>

// Bulk action controls
<div className="bulk-actions">
  <button onClick={selectAllJobs}>Select All Gmail Jobs</button>
  <button onClick={deselectAll}>Deselect All</button>
  <button
    onClick={handleBulkDeleteJobs}
    disabled={selectedJobs.size === 0}
  >
    Delete {selectedJobs.size} from Gmail
  </button>
</div>
```

**Shared Confirmation Dialog**:

```tsx
<ConfirmDialog
  title="Delete Emails from Gmail"
  message={`Move ${selectedJobs.size} emails to Gmail trash? Jobs will be removed from JobHunter. You can permanently delete emails later in Gmail trash.`}
  onConfirm={confirmBulkDelete}
  onCancel={cancelBulkDelete}
/>
```

**State Management**:
```tsx
const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
const [isDeleting, setIsDeleting] = useState(false);

const handleBulkDelete = async () => {
  const confirmed = await showConfirmDialog();
  if (!confirmed) return;

  setIsDeleting(true);
  try {
    const response = await fetch('/api/jobs/bulk-delete-gmail-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_ids: Array.from(selectedJobs) })
    });

    const result = await response.json();

    if (result.success_count > 0) {
      showSuccessToast(`Deleted ${result.success_count} emails from Gmail`);
    }

    if (result.failure_count > 0) {
      showErrorToast(`Failed to delete ${result.failure_count} emails`);
    }

    // Refresh rejected jobs list
    await refreshRejectedJobs();
    setSelectedJobs(new Set());
  } catch (error) {
    showErrorToast('Failed to delete emails: ' + error.message);
  } finally {
    setIsDeleting(false);
  }
};
```

### Gmail API Integration

**Trash Message Endpoint**:
```rust
async fn trash_gmail_message(
    access_token: &str,
    message_id: &str
) -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/{}/trash",
        message_id
    );

    let response = client
        .post(&url)
        .bearer_auth(access_token)
        .send()
        .await?;

    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(format!("Gmail API error: {}", error_text).into());
    }

    Ok(())
}
```

**Bulk Delete Handler**:
```rust
#[derive(Deserialize)]
struct BulkDeleteRequest {
    job_ids: Vec<Uuid>,
}

#[derive(Serialize)]
struct BulkDeleteResponse {
    success_count: usize,
    failure_count: usize,
    failures: Vec<BulkDeleteFailure>,
}

#[derive(Serialize)]
struct BulkDeleteFailure {
    job_id: Uuid,
    error: String,
}

async fn bulk_delete_gmail_emails(
    pool: web::Data<PgPool>,
    request: web::Json<BulkDeleteRequest>,
) -> Result<HttpResponse> {
    // 1. Validate all jobs are from Gmail source
    let jobs = sqlx::query!(
        "SELECT j.job_id, j.source, ej.message_id
         FROM jobs j
         JOIN email_jobs ej ON j.job_id = ej.job_id
         WHERE j.job_id = ANY($1)",
        &request.job_ids
    )
    .fetch_all(pool.get_ref())
    .await?;

    // Check all are Gmail source
    if jobs.iter().any(|j| j.source != "gmail") {
        return Err(actix_web::error::ErrorBadRequest(
            "Invalid request: Some jobs are not from Gmail source"
        ));
    }

    // 2. Get Gmail OAuth token
    let credentials = sqlx::query_as::<_, OAuthCredential>(
        "SELECT * FROM oauth_credentials
         WHERE source_id = (SELECT source_id FROM job_sources WHERE source_name = 'gmail')
         LIMIT 1"
    )
    .fetch_one(pool.get_ref())
    .await?;

    let access_token = credentials.access_token
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No Gmail token"))?;

    // 3. Trash emails and delete job records
    let mut success_count = 0;
    let mut failures = Vec::new();

    for job in jobs {
        // Trash email in Gmail
        match trash_gmail_message(&access_token, &job.message_id).await {
            Ok(_) => {
                // Delete job record (CASCADE deletes email_jobs entry)
                match sqlx::query!("DELETE FROM jobs WHERE job_id = $1", job.job_id)
                    .execute(pool.get_ref())
                    .await
                {
                    Ok(_) => success_count += 1,
                    Err(e) => failures.push(BulkDeleteFailure {
                        job_id: job.job_id,
                        error: format!("Database deletion failed: {}", e),
                    }),
                }
            }
            Err(e) => failures.push(BulkDeleteFailure {
                job_id: job.job_id,
                error: format!("Gmail API error: {}", e),
            }),
        }
    }

    Ok(HttpResponse::Ok().json(BulkDeleteResponse {
        success_count,
        failure_count: failures.len(),
        failures,
    }))
}
```

---

## Implementation Plan

### Step 1: Backend Implementation (45-60 min)

1. **Add Gmail trash function** (15 min):
   - Implement `trash_gmail_message()` helper
   - Add error handling for API failures
   - Test with manual curl command

2. **Add bulk delete endpoint** (30 min):
   - Implement `bulk_delete_gmail_emails()` handler
   - Add request/response structs
   - Add validation logic
   - Register route in main.rs

3. **Test backend** (15 min):
   - Create integration test for bulk delete
   - Test error cases (invalid job IDs, non-Gmail jobs)
   - Test partial success scenarios

### Step 2: Frontend Implementation (45-60 min)

1. **Add multi-select UI** (20 min):
   - Add checkbox state management
   - Add checkboxes to job cards (Gmail only)
   - Add "Select All" / "Deselect All" buttons
   - Add "Delete Selected" button

2. **Add confirmation dialog** (10 min):
   - Create reusable confirmation dialog component
   - Show email count in message
   - Handle confirm/cancel actions

3. **Wire up API call** (15 min):
   - Implement `handleBulkDelete` function
   - Add loading state during deletion
   - Add success/error toast notifications
   - Refresh job list after deletion

4. **Test frontend** (20 min):
   - Test checkbox selection
   - Test "Select All" / "Deselect All"
   - Test confirmation dialog
   - Test success/error paths

---

## Testing Strategy

### Backend Unit Tests (2 tests)

**Test Suite**: `backend/tests/gmail_cleanup_tests.rs`

1. **`test_bulk_delete_validates_gmail_source`**:
   - Try to delete non-Gmail jobs
   - Expect 400 Bad Request error

2. **`test_bulk_delete_endpoint_integration`**:
   - Create 3 Gmail jobs in test database
   - Call bulk delete endpoint
   - Verify jobs deleted from database
   - Mock Gmail API calls

### E2E Tests (3 tests)

**Test Suite**: `frontend/e2e/tests/18-gmail-junk-cleanup.spec.ts`

1. **`should show checkboxes only for Gmail jobs in Rejected tab`**:
   - Navigate to Rejected tab
   - Verify checkboxes visible for Gmail jobs
   - Verify no checkboxes for non-Gmail jobs

2. **`should delete selected Gmail jobs after confirmation`**:
   - Select 2 Gmail jobs in Rejected tab
   - Click "Delete Selected from Gmail" button
   - Confirm in dialog
   - Verify jobs removed from Rejected tab
   - Verify success toast appears

3. **`should handle bulk delete cancellation`**:
   - Select jobs
   - Click delete button
   - Cancel in confirmation dialog
   - Verify jobs still present in Rejected tab

### Manual Test (1 test)

**Test 1: Visual Gmail Trash Verification** (3 min):
- Reject a Gmail job in JobHunter
- Select it in Rejected tab
- Click "Delete Selected from Gmail"
- Confirm deletion
- Open Gmail → Trash folder
- Verify email appears in Gmail trash (not permanently deleted)
- Verify job removed from JobHunter Rejected tab

---

## Success Criteria

**Phase 2.10 Complete When**:

**Backend Implementation** (2 criteria):
1. ✅ `POST /api/jobs/bulk-delete-gmail-emails` endpoint implemented
2. ✅ Gmail API trash integration working with error handling

**Frontend Implementation** (5 criteria):
1. ✅ Checkboxes appear on Gmail jobs in Rejected tab only
2. ✅ "Select All" / "Deselect All" buttons functional
3. ✅ "Delete Selected from Gmail" button appears when jobs selected
4. ✅ Confirmation dialog shows correct count
5. ✅ Success/error feedback displayed to user

**Testing** (3 criteria):
1. ✅ 2 backend unit tests passing
2. ✅ 3 E2E tests passing
3. ✅ 1 manual test complete (Gmail trash verification)

**User Experience** (3 criteria):
1. ✅ Emails moved to Gmail trash (soft delete, recoverable)
2. ✅ Job records deleted from database
3. ✅ Rejected tab refreshes automatically after deletion

---

## Dependencies

**Requires**:
- ✅ Phase 2.9 complete (gmail.modify scope already authorized)
- ✅ Gmail OAuth credentials configured
- ✅ Rejected tab exists in frontend

**Blocks**:
- None (standalone feature)

---

## Risks and Mitigations

**Risk 1: Gmail API rate limits**
- **Likelihood**: Low (deleting <10 emails at once typically)
- **Impact**: Medium (some deletions fail)
- **Mitigation**: Show partial success feedback, user can retry failed deletions

**Risk 2: OAuth token expired during bulk delete**
- **Likelihood**: Low (token refresh implemented in Phase 2.9)
- **Impact**: High (all deletions fail)
- **Mitigation**: Return clear error message, prompt user to re-authenticate

**Risk 3: User accidentally deletes wrong jobs**
- **Likelihood**: Medium (user error)
- **Impact**: Low (emails in Gmail trash, recoverable)
- **Mitigation**: Confirmation dialog shows count, soft delete allows recovery

**Risk 4: Network failure during bulk delete**
- **Likelihood**: Low
- **Impact**: Medium (partial deletion)
- **Mitigation**: Return partial success response, user can retry

---

## Future Enhancements (Out of Scope)

**Phase 2.11: Microsoft Email Cleanup** (future):
- Similar bulk deletion for Microsoft email jobs
- Uses Microsoft Graph API delete endpoint
- Requires microsoft.mail.write scope

**Phase 2.12: Automatic Cleanup** (future):
- Auto-delete rejected jobs older than X days
- Configurable retention period
- Background job runs daily

**Phase 5.x: Undo/Restore** (future):
- Restore deleted jobs from Gmail trash
- Re-import email and recreate job record
- Time-limited (Gmail trash auto-deletes after 30 days)

---

## Open Questions

None - all design questions answered by user:
- ✅ Delete email + job/email_jobs record (Option B)
- ✅ **PRIMARY**: Ignored (Non-Job Emails) tab - where most junk accumulates
- ✅ **SECONDARY**: Rejected tab - also needs cleanup capability
- ✅ User needs to SEE email content to identify junk (already exists in Ignored tab)
- ✅ Confirmation dialog required
- ✅ Soft delete (Gmail trash, recoverable for 30 days)
- ✅ No undo needed (soft delete is sufficient)

---

## Implementation Notes

**Performance Considerations**:
- Gmail API supports batch requests, but for simplicity we'll do sequential deletes
- If user selects >10 jobs, consider showing progress indicator
- Consider rate limit handling (429 errors) with exponential backoff

**Security Considerations**:
- Validate all job IDs belong to current user (if multi-user auth added in future)
- Verify OAuth token has gmail.modify scope before attempting delete
- Log all bulk delete operations for audit trail

**UX Considerations**:
- Disable "Delete" button during deletion (show loading spinner)
- Clear selection after successful deletion
- Show specific error messages for different failure types
- Consider showing progress for >5 jobs ("Deleting 3 of 8...")

---

## Related Documentation

- [PHASE_2.9_gmail-label-management.md](PHASE_2.9_gmail-label-management.md) - Gmail API integration with modify scope
- [PHASE_2.8.1_microsoft-folder-refinement.md](PHASE_2.8.1_microsoft-folder-refinement.md) - Microsoft email management
- [PROJECT_STATUS.md](PROJECT_STATUS.md) - Overall project status

---

**Document Version**: 1.0
**Last Updated**: 2025-11-06 16:15:00 PST
**Status**: Planning Complete - Ready to Implement
