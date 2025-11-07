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
  - [Implementation Status](#implementation-status)
  - [Detailed Implementation Guide: Rejected Tab](#detailed-implementation-guide-rejected-tab)
    - [Step 1: Add State Management to App.tsx (5 min)](#step-1-add-state-management-to-apptsx-5-min)
    - [Step 2: Add Helper Functions to App.tsx (10 min)](#step-2-add-helper-functions-to-apptsx-10-min)
    - [Step 3: Add Bulk Action Controls in Rejected Tab Section (10 min)](#step-3-add-bulk-action-controls-in-rejected-tab-section-10-min)
    - [Step 4: Modify JobCard to Support Checkboxes (10 min)](#step-4-modify-jobcard-to-support-checkboxes-10-min)
    - [Step 5: Add Confirmation Dialog (5 min)](#step-5-add-confirmation-dialog-5-min)
  - [Testing Strategy](#testing-strategy)
    - [Backend Unit Tests (4 tests)](#backend-unit-tests-4-tests)
    - [E2E Tests (6 tests)](#e2e-tests-6-tests)
    - [Manual Tests (2 tests)](#manual-tests-2-tests)
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

## Implementation Status

**Last Updated**: 2025-11-06 17:45:00 PST

**Backend**: ✅ 100% Complete
- ✅ `trash_gmail_message()` function implemented (main.rs:4285-4311)
- ✅ `POST /api/email-jobs/bulk-delete-gmail` endpoint implemented (main.rs:2075-2154)
- ✅ `POST /api/jobs/bulk-delete-gmail` endpoint implemented (main.rs:1992-2072)
- ✅ Routes registered (main.rs:8472-8473)
- ✅ `get_ignored_emails` updated to include `source` field (main.rs:6024)
- ✅ Backend compiles successfully

**Frontend - Ignored Tab**: ✅ 100% Complete
- ✅ Bulk selection state management (selectedForDeletion Set)
- ✅ Checkboxes for Gmail emails only
- ✅ Bulk action controls (Select All, Deselect All, Delete)
- ✅ Confirmation dialog with email count
- ✅ API integration with error handling
- ✅ Success/failure feedback
- ✅ Frontend compiles successfully

**Frontend - Rejected Tab**: ⏳ Pending Implementation (30-45 min)
- ⏳ Add bulk selection state to App.tsx
- ⏳ Add bulk action controls in rejected jobs section
- ⏳ Add checkboxes to JobCard (conditional rendering)
- ⏳ Add confirmation dialog
- ⏳ Wire up API call to `/api/jobs/bulk-delete-gmail`

**Testing**: ⏳ Pending
- ⏳ Backend unit tests (2 tests)
- ⏳ E2E tests (6 tests - 3 for Ignored + 3 for Rejected)
- ⏳ Manual Gmail trash verification

**Commit**: 379cd12 - Backend + Ignored tab complete

---

## Detailed Implementation Guide: Rejected Tab

**Overview**: The rejected jobs are displayed in App.tsx using a shared JobCard component. This section provides step-by-step instructions for adding bulk delete functionality.

**Estimated Time**: 30-45 minutes

### Step 1: Add State Management to App.tsx (5 min)

Add these state variables near the other state declarations (around line 200):

```typescript
const [selectedJobsForDeletion, setSelectedJobsForDeletion] = useState<Set<string>>(new Set());
const [isDeletingJobs, setIsDeletingJobs] = useState<boolean>(false);
const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState<boolean>(false);
```

### Step 2: Add Helper Functions to App.tsx (10 min)

Add these functions after the `handleReject` function:

```typescript
const toggleJobSelection = (jobId: string): void => {
  setSelectedJobsForDeletion(prev => {
    const newSet = new Set(prev);
    if (newSet.has(jobId)) {
      newSet.delete(jobId);
    } else {
      newSet.add(jobId);
    }
    return newSet;
  });
};

const selectAllGmailJobs = (): void => {
  const gmailJobs = filterJobs('rejected').filter(j => j.source === 'gmail');
  setSelectedJobsForDeletion(new Set(gmailJobs.map(j => j.job_id)));
};

const deselectAllJobs = (): void => {
  setSelectedJobsForDeletion(new Set());
};

const handleBulkDeleteJobs = async (): Promise<void> => {
  if (selectedJobsForDeletion.size === 0) return;

  setIsDeletingJobs(true);
  try {
    const response = await fetch(`${API_URL}/jobs/bulk-delete-gmail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_ids: Array.from(selectedJobsForDeletion) })
    });

    if (!response.ok) {
      throw new Error(`Failed to delete jobs: ${response.status}`);
    }

    const result = await response.json();

    if (result.success_count > 0) {
      // Refresh the jobs list
      await fetchJobs();
      setSelectedJobsForDeletion(new Set());
      alert(`Successfully deleted ${result.success_count} job(s) from Gmail`);
    }

    if (result.failure_count > 0) {
      const failureMsg = result.failures.map((f: any) => `${f.id}: ${f.error}`).join('\n');
      console.error(`Failed to delete ${result.failure_count} job(s):\n${failureMsg}`);
    }
  } catch (err) {
    console.error('Error deleting jobs:', err);
    alert('Failed to delete jobs from Gmail');
  } finally {
    setIsDeletingJobs(false);
    setShowDeleteConfirmDialog(false);
  }
};
```

### Step 3: Add Bulk Action Controls in Rejected Tab Section (10 min)

Find the section where `activeTab === 'rejected'` is rendered (around line 2722). Add the bulk action controls BEFORE the job cards grid:

```typescript
{activeTab === 'rejected' && filterJobs('rejected').some(j => j.source === 'gmail') && (
  <div style={{
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }}>
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <button
        onClick={selectAllGmailJobs}
        disabled={filterJobs('rejected').filter(j => j.source === 'gmail').length === 0}
        style={{
          padding: '8px 16px',
          borderRadius: '6px',
          border: '1px solid #d1d5db',
          backgroundColor: 'white',
          color: '#374151',
          fontWeight: '500',
          cursor: 'pointer',
          fontSize: '14px',
          opacity: filterJobs('rejected').filter(j => j.source === 'gmail').length === 0 ? 0.5 : 1
        }}
      >
        Select All Gmail
      </button>
      <button
        onClick={deselectAllJobs}
        disabled={selectedJobsForDeletion.size === 0}
        style={{
          padding: '8px 16px',
          borderRadius: '6px',
          border: '1px solid #d1d5db',
          backgroundColor: 'white',
          color: '#374151',
          fontWeight: '500',
          cursor: 'pointer',
          fontSize: '14px',
          opacity: selectedJobsForDeletion.size === 0 ? 0.5 : 1
        }}
      >
        Deselect All
      </button>
    </div>
    <button
      onClick={() => setShowDeleteConfirmDialog(true)}
      disabled={selectedJobsForDeletion.size === 0 || isDeletingJobs}
      style={{
        padding: '10px 20px',
        borderRadius: '6px',
        border: 'none',
        backgroundColor: selectedJobsForDeletion.size === 0 || isDeletingJobs ? '#9ca3af' : '#ef4444',
        color: 'white',
        fontWeight: '600',
        cursor: selectedJobsForDeletion.size === 0 || isDeletingJobs ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px'
      }}
    >
      <Trash2 style={{ width: '18px', height: '18px' }} />
      {isDeletingJobs ? 'Deleting...' : `Delete ${selectedJobsForDeletion.size} from Gmail`}
    </button>
  </div>
)}
```

### Step 4: Modify JobCard to Support Checkboxes (10 min)

Find the JobCard component definition. Update it to accept optional checkbox props:

```typescript
interface JobCardProps {
  job: Job;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (jobId: string) => void;
}

const JobCard: React.FC<JobCardProps> = ({
  job,
  showCheckbox = false,
  isSelected = false,
  onToggleSelection
}) => {
  // ... existing code ...

  return (
    <div style={{ /* existing styles */ display: 'flex', gap: '12px' }}>
      {/* Checkbox for Gmail jobs only */}
      {showCheckbox && job.source === 'gmail' && (
        <div
          style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '2px' }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection?.(job.job_id);
          }}
        >
          {isSelected ? (
            <CheckSquare style={{ width: '20px', height: '20px', color: '#3b82f6', cursor: 'pointer' }} />
          ) : (
            <Square style={{ width: '20px', height: '20px', color: '#9ca3af', cursor: 'pointer' }} />
          )}
        </div>
      )}

      <div style={{ flex: 1 }}>
        {/* Existing JobCard content */}
      </div>
    </div>
  );
};
```

Update the JobCard usage in the rejected tab section:

```typescript
{activeTab === 'rejected' ? filterJobs('rejected').map(job => (
  <JobCard
    key={job.job_id}
    job={job}
    showCheckbox={true}
    isSelected={selectedJobsForDeletion.has(job.job_id)}
    onToggleSelection={toggleJobSelection}
  />
)) : /* other tabs */}
```

### Step 5: Add Confirmation Dialog (5 min)

Add the confirmation dialog near the end of the App component return statement (before the closing </div>):

```typescript
{showDeleteConfirmDialog && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  }}>
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '24px',
      maxWidth: '500px',
      width: '90%',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
        Confirm Deletion
      </h3>
      <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
        Move {selectedJobsForDeletion.size} job email{selectedJobsForDeletion.size !== 1 ? 's' : ''} to Gmail trash?
        Jobs will be removed from JobHunter. You can permanently delete emails later in Gmail trash
        (they will be recoverable for 30 days).
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowDeleteConfirmDialog(false)}
          disabled={isDeletingJobs}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: 'white',
            color: '#374151',
            fontWeight: '600',
            cursor: isDeletingJobs ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isDeletingJobs ? 0.5 : 1
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleBulkDeleteJobs}
          disabled={isDeletingJobs}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: isDeletingJobs ? '#9ca3af' : '#ef4444',
            color: 'white',
            fontWeight: '600',
            cursor: isDeletingJobs ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isDeletingJobs ? (
            <>
              <RefreshCw style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 style={{ width: '18px', height: '18px' }} />
              Delete from Gmail
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)}
```

Don't forget to import the new icons at the top of App.tsx:

```typescript
import { CheckSquare, Square, Trash2 } from 'lucide-react';
```

---

## Testing Strategy

**Total Tests**: 10 (4 backend unit + 6 E2E + manual verification)

### Backend Unit Tests (4 tests)

**Test Suite**: `backend/tests/gmail_cleanup_tests.rs`

**For Rejected Tab (`/api/jobs/bulk-delete-gmail`)**:

1. **`test_bulk_delete_jobs_validates_gmail_source`**:
   - Create 2 Gmail jobs and 1 Microsoft job in test database
   - Attempt to bulk delete all 3 jobs (including non-Gmail)
   - Expect 400 Bad Request error
   - Verify error message: "Some jobs are not from Gmail source"
   - Verify no jobs deleted from database

2. **`test_bulk_delete_jobs_success`**:
   - Create 3 Gmail jobs with email_jobs entries
   - Mock Gmail API trash endpoint (return success)
   - Call bulk delete endpoint with all 3 job IDs
   - Verify response: `{ success_count: 3, failure_count: 0, failures: [] }`
   - Verify all jobs deleted from database
   - Verify all email_jobs entries CASCADE deleted

**For Ignored Tab (`/api/email-jobs/bulk-delete-gmail`)**:

3. **`test_bulk_delete_email_jobs_validates_gmail_source`**:
   - Create 2 Gmail email_jobs and 1 Microsoft email_job (no job records)
   - Attempt to bulk delete all 3 email_jobs (including non-Gmail)
   - Expect 400 Bad Request error
   - Verify error message: "Some emails are not from Gmail source"
   - Verify no email_jobs deleted from database

4. **`test_bulk_delete_email_jobs_success`**:
   - Create 3 Gmail email_jobs entries (no job records - ignored emails)
   - Mock Gmail API trash endpoint (return success)
   - Call bulk delete endpoint with all 3 email_job IDs
   - Verify response: `{ success_count: 3, failure_count: 0, failures: [] }`
   - Verify all email_jobs deleted from database

### E2E Tests (6 tests)

**Test Suite**: `frontend/e2e/tests/18-gmail-junk-cleanup.spec.ts`

**For Ignored Tab** (3 tests):

1. **`should show checkboxes only for Gmail emails in Ignored tab`**:
   - Create 2 Gmail ignored emails and 1 Microsoft ignored email
   - Navigate to Ignored tab
   - Verify 2 checkboxes visible (Gmail emails only)
   - Verify no checkbox for Microsoft email
   - Verify bulk action controls visible

2. **`should delete selected Gmail emails from Ignored tab after confirmation`**:
   - Create 3 Gmail ignored emails
   - Navigate to Ignored tab
   - Select 2 emails using checkboxes
   - Click "Delete 2 from Gmail" button
   - Verify confirmation dialog appears with correct count
   - Click "Delete from Gmail" in dialog
   - Mock API response: `{ success_count: 2, failure_count: 0 }`
   - Verify success alert appears
   - Verify Ignored tab refreshes
   - Verify 2 emails removed, 1 remains

3. **`should handle bulk delete cancellation in Ignored tab`**:
   - Create 2 Gmail ignored emails
   - Navigate to Ignored tab
   - Select all emails
   - Click "Delete 2 from Gmail" button
   - Verify confirmation dialog appears
   - Click "Cancel" button
   - Verify dialog closes
   - Verify emails still present in Ignored tab
   - Verify selections cleared

**For Rejected Tab** (3 tests):

4. **`should show checkboxes only for Gmail jobs in Rejected tab`**:
   - Create 2 Gmail rejected jobs and 1 Microsoft rejected job
   - Navigate to Rejected tab
   - Verify 2 checkboxes visible (Gmail jobs only)
   - Verify no checkbox for Microsoft job
   - Verify bulk action controls visible

5. **`should delete selected Gmail jobs from Rejected tab after confirmation`**:
   - Create 3 Gmail rejected jobs
   - Navigate to Rejected tab
   - Select 2 jobs using checkboxes
   - Click "Delete 2 from Gmail" button
   - Verify confirmation dialog appears with correct count
   - Click "Delete from Gmail" in dialog
   - Mock API response: `{ success_count: 2, failure_count: 0 }`
   - Verify success alert appears
   - Verify Rejected tab refreshes
   - Verify 2 jobs removed, 1 remains

6. **`should handle select all and deselect all in Rejected tab`**:
   - Create 3 Gmail rejected jobs and 1 Microsoft rejected job
   - Navigate to Rejected tab
   - Click "Select All Gmail" button
   - Verify 3 Gmail jobs selected (Microsoft job not selected)
   - Verify button shows "Delete 3 from Gmail"
   - Click "Deselect All" button
   - Verify all selections cleared
   - Verify button shows "Delete 0 from Gmail" (disabled)

### Manual Tests (2 tests)

**Test 1: Visual Gmail Trash Verification - Rejected Job** (3 min):
- Reject a Gmail job in JobHunter
- Navigate to Rejected tab
- Select the job using checkbox
- Click "Delete 1 from Gmail"
- Confirm deletion
- Open Gmail → Trash folder
- Verify email appears in Gmail trash (not permanently deleted)
- Verify job removed from JobHunter Rejected tab

**Test 2: Visual Gmail Trash Verification - Ignored Email** (3 min):
- Process a Gmail non-job email (low confidence) → appears in Ignored tab
- Navigate to Ignored tab
- Select the email using checkbox
- Click "Delete 1 from Gmail"
- Confirm deletion
- Open Gmail → Trash folder
- Verify email appears in Gmail trash
- Verify email removed from JobHunter Ignored tab

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
