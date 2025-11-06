<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Phase 2.9: Gmail Label Management (JobOps-OLD)](#phase-29-gmail-label-management-jobops-old)
  - [Executive Summary](#executive-summary)
  - [Background](#background)
  - [Problem Statement](#problem-statement)
  - [Goals](#goals)
  - [Technical Design](#technical-design)
    - [Gmail API Label Operations](#gmail-api-label-operations)
    - [Implementation Architecture](#implementation-architecture)
    - [Status Change Trigger Workflow](#status-change-trigger-workflow)
  - [Database Changes](#database-changes)
  - [Frontend Changes](#frontend-changes)
  - [Backend Changes](#backend-changes)
  - [Label Application Rules](#label-application-rules)
  - [Error Handling](#error-handling)
  - [Testing Strategy](#testing-strategy)
    - [Unit Tests](#unit-tests)
    - [E2E Tests](#e2e-tests)
    - [Manual Testing](#manual-testing)
  - [Success Criteria](#success-criteria)
  - [Timeline & Effort](#timeline--effort)
  - [Related Documentation](#related-documentation)
  - [Future Enhancements](#future-enhancements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Phase 2.9: Gmail Label Management (JobOps-OLD)

**Status**: 📋 **REQUIRED** - Ready for Implementation
**Priority**: ⚠️ **HIGH** (Required for complete email management)
**Estimated Effort**: 2-3 hours
**Dependencies**:
- ✅ Phase 2.7 (Microsoft Email Source) - COMPLETE
- ✅ Phase 2.8 (Microsoft Folder Management) - COMPLETE

---

## Executive Summary

This phase adds Gmail label management to enable automatic cleanup of rejected job opportunities. When a user rejects a job in the JobHunter UI, the system will:
1. Update the job status to "rejected" in the database
2. Automatically remove the "JobOps" label from the original Gmail message
3. Apply the "JobOps-OLD" label for archival

**Key Principles**:
- **Conservative approach**: ONLY rejected jobs get JobOps-OLD label (not duplicates or non-jobs)
- **Real-time updates**: Label changes happen immediately when user clicks "Reject" button
- **Parallel functionality**: Mirrors Phase 2.8 Microsoft folder behavior (rejected emails → archive)
- **No retroactive changes**: Existing emails retain current labels (no bulk cleanup)

**User Benefit**: Enables bulk cleanup of rejected job emails via Gmail's label filtering, reducing inbox clutter.

---

## Background

**Current State (Phase 2.0-2.7)**:
- ✅ Gmail integration successfully extracts job offers from Gmail (Phase 2.0)
- ✅ JobOps label applied to job-related emails during extraction (Phase 2.0)
- ✅ LLM-based extraction provides robust job parsing (Phase 2.6)
- ❌ **No label management after user makes job approval decisions**
- ❌ **Rejected jobs remain labeled "JobOps" indefinitely**

**Microsoft Email Parallel (Phase 2.8)**:
- ✅ Microsoft emails moved to JobOps-OLD folder after processing
- ✅ Rejected jobs archived automatically
- ✅ Inbox remains clean with only actionable emails

**Gap**: Gmail integration lacks equivalent label management → rejected jobs clutter Gmail inbox

**User Request**: "I want JobOps-OLD label for rejected jobs so I can bulk delete them"

---

## Problem Statement

**Current Behavior**:
1. User receives job email in Gmail
2. JobHunter extracts job and applies "JobOps" label
3. User reviews job in JobHunter UI
4. User clicks "Reject" → Job marked as rejected in database
5. **Problem**: Gmail message STILL has "JobOps" label
6. User cannot easily distinguish rejected vs active jobs in Gmail
7. Bulk cleanup requires manual label removal (time-consuming)

**Desired Behavior**:
1. User receives job email in Gmail
2. JobHunter extracts job and applies "JobOps" label
3. User reviews job in JobHunter UI
4. User clicks "Reject" → Job marked as rejected in database
5. **New**: System automatically removes "JobOps" label from Gmail
6. **New**: System applies "JobOps-OLD" label for archival
7. User can bulk delete rejected jobs via Gmail label filter

---

## Goals

1. **Automatic Label Management**: Remove JobOps and add JobOps-OLD when user rejects job
2. **Real-Time Updates**: Label changes happen immediately (not on next sync)
3. **Conservative Approach**: ONLY rejected jobs get JobOps-OLD (not duplicates/non-jobs)
4. **Consistency**: Align Gmail behavior with Microsoft folder management (Phase 2.8)
5. **Error Tolerance**: Handle label failures gracefully (job rejection still works)
6. **Audit Trail**: Log all label operations for debugging

---

## Technical Design

### Gmail API Label Operations

**Get or Create Label**:
```
GET https://gmail.googleapis.com/gmail/v1/users/me/labels
Response: { "labels": [{ "id": "Label_123", "name": "JobOps", ... }] }

POST https://gmail.googleapis.com/gmail/v1/users/me/labels
Body: { "name": "JobOps-OLD", "labelListVisibility": "labelShow", "messageListVisibility": "show" }
Response: { "id": "Label_456", "name": "JobOps-OLD", ... }
```

**Modify Message Labels**:
```
POST https://gmail.googleapis.com/gmail/v1/users/me/messages/{messageId}/modify
Body: {
  "addLabelIds": ["Label_456"],      // JobOps-OLD
  "removeLabelIds": ["Label_123"]    // JobOps
}
Response: { "id": "msg_789", "labelIds": ["Label_456", "INBOX"], ... }
```

**Required OAuth Scope**: `https://www.googleapis.com/auth/gmail.modify` (NOT readonly)
- **Current scope**: `gmail.readonly` ❌
- **Required**: Add `gmail.modify` to OAuth configuration
- **Impact**: Requires user to re-authenticate with new scope

### Implementation Architecture

**Location**: `backend/src/main.rs` (Gmail email processing section)

**New Functions** (similar to Microsoft folder management):

```rust
// Get or create JobOps-OLD label
async fn get_or_create_jobops_old_label(
    client: &reqwest::Client,
    access_token: &str,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    // 1. List all labels
    let list_url = "https://gmail.googleapis.com/gmail/v1/users/me/labels";
    let response = client.get(list_url).bearer_auth(access_token).send().await?;

    if response.status().is_success() {
        let data: serde_json::Value = response.json().await?;
        if let Some(labels) = data["labels"].as_array() {
            // Check if JobOps-OLD exists
            for label in labels {
                if label["name"].as_str() == Some("JobOps-OLD") {
                    if let Some(id) = label["id"].as_str() {
                        log_debug(&format!("Found existing JobOps-OLD label: {}", id));
                        return Ok(id.to_string());
                    }
                }
            }
        }
    }

    // 2. Create label if not found
    log_debug("Creating JobOps-OLD label...");
    let create_url = "https://gmail.googleapis.com/gmail/v1/users/me/labels";
    let response = client
        .post(create_url)
        .bearer_auth(access_token)
        .json(&serde_json::json!({
            "name": "JobOps-OLD",
            "labelListVisibility": "labelShow",
            "messageListVisibility": "show"
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(format!("Failed to create JobOps-OLD label: {}", response.status()).into());
    }

    let data: serde_json::Value = response.json().await?;
    let label_id = data["id"].as_str()
        .ok_or("No label ID in response")?
        .to_string();

    log_debug(&format!("Created JobOps-OLD label: {}", label_id));
    Ok(label_id)
}

// Get JobOps label ID
async fn get_jobops_label_id(
    client: &reqwest::Client,
    access_token: &str,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let list_url = "https://gmail.googleapis.com/gmail/v1/users/me/labels";
    let response = client.get(list_url).bearer_auth(access_token).send().await?;

    if response.status().is_success() {
        let data: serde_json::Value = response.json().await?;
        if let Some(labels) = data["labels"].as_array() {
            for label in labels {
                if label["name"].as_str() == Some("JobOps") {
                    if let Some(id) = label["id"].as_str() {
                        return Ok(id.to_string());
                    }
                }
            }
        }
    }

    Err("JobOps label not found".into())
}

// Update message labels (remove JobOps, add JobOps-OLD)
async fn update_gmail_labels_for_rejected_job(
    client: &reqwest::Client,
    access_token: &str,
    message_id: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Get label IDs
    let jobops_label_id = get_jobops_label_id(client, access_token).await?;
    let jobops_old_label_id = get_or_create_jobops_old_label(client, access_token).await?;

    // Modify message labels
    let url = format!("https://gmail.googleapis.com/gmail/v1/users/me/messages/{}/modify", message_id);
    let response = client
        .post(&url)
        .bearer_auth(access_token)
        .json(&serde_json::json!({
            "addLabelIds": [jobops_old_label_id],
            "removeLabelIds": [jobops_label_id]
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to update labels: {} - {}", status, error_text).into());
    }

    log_debug(&format!("Updated labels for message {}: removed JobOps, added JobOps-OLD", message_id));
    Ok(())
}
```

### Status Change Trigger Workflow

**New Endpoint**: `PUT /api/jobs/{id}/reject`

**Implementation**:
```rust
#[put("/api/jobs/{id}/reject")]
async fn reject_job(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, Error> {
    let job_id = path.into_inner();

    // 1. Update job status to "rejected"
    sqlx::query!(
        "UPDATE jobs SET status = 'rejected', updated_at = NOW() WHERE job_id = $1",
        job_id
    )
    .execute(pool.as_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    // 2. Get email message_id from email_jobs table
    let email_job = sqlx::query!(
        "SELECT message_id, source FROM email_jobs WHERE job_id = $1",
        job_id
    )
    .fetch_optional(pool.as_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    if let Some(email_job) = email_job {
        // 3. Check if this is a Gmail job (not Microsoft)
        if email_job.source == "gmail" {
            // 4. Get Gmail OAuth credentials
            let oauth_creds = sqlx::query!(
                "SELECT access_token FROM oauth_credentials WHERE source_id = 'gmail' AND user_id = '00000000-0000-0000-0000-000000000000'",
            )
            .fetch_optional(pool.as_ref())
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

            if let Some(creds) = oauth_creds {
                // 5. Update Gmail labels (best effort - don't fail if this fails)
                let client = reqwest::Client::new();
                if let Err(e) = update_gmail_labels_for_rejected_job(
                    &client,
                    &creds.access_token,
                    &email_job.message_id,
                ).await {
                    log_debug(&format!("Warning: Failed to update Gmail labels for job {}: {}", job_id, e));
                    // Continue - job rejection still succeeds even if label update fails
                }
            }
        }
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "rejected" })))
}
```

**Alternative**: Extend existing `PUT /api/jobs/{id}/status` endpoint to handle "rejected" status with label updates.

---

## Database Changes

**Formalize "rejected" as Valid Status**:

The `jobs` table already has a `status` VARCHAR column. No schema migration needed, but documentation should clarify valid values:

**Valid Status Values**:
- `new` - Pending user review
- `approved` - User approved for application
- `filtered` - Automatically filtered by system criteria
- `rejected` - **NEW**: User manually rejected
- `applied` - User submitted application

**No Schema Changes Required**: Existing `email_jobs` table already links jobs to email messages via `message_id`.

**Example Query** (to find Gmail message for rejected job):
```sql
SELECT ej.message_id, ej.source
FROM email_jobs ej
JOIN jobs j ON ej.job_id = j.job_id
WHERE j.job_id = $1 AND j.status = 'rejected' AND ej.source = 'gmail';
```

---

## Frontend Changes

**IntakeTab.tsx - New Jobs Tab**:

**Current UI**:
- Tabs: "New Jobs" | "Approved" | "Filtered" | "Non-Job Emails"

**New UI**:
- Tabs: "New Jobs" | "Approved" | "Rejected" | "Filtered" | "Non-Job Emails"

**Add "Rejected" Tab**:
- Shows jobs with `status = 'rejected'`
- Display count badge (e.g., "Rejected (5)")
- Same job card layout as other tabs

**Add "Reject" Button to Job Cards**:

**Current Buttons**:
- "Approve" button (green) - Changes status to "approved"
- "Filter" button (gray) - Changes status to "filtered"

**New Button**:
- "Reject" button (red) - Changes status to "rejected"
- Location: Next to "Approve" button in job card actions
- Icon: ❌ or 🗑️
- Color: Red/destructive styling

**Example Implementation** (React/TypeScript):
```tsx
const handleReject = async (jobId: string) => {
  try {
    const response = await fetch(`/api/jobs/${jobId}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to reject job');
    }

    // Refresh job list
    await fetchJobs();

    // Show success notification
    showNotification('Job rejected and Gmail label updated', 'success');
  } catch (error) {
    console.error('Failed to reject job:', error);
    showNotification('Failed to reject job', 'error');
  }
};

// In job card render:
<button onClick={() => handleReject(job.job_id)} className="btn-reject">
  ❌ Reject
</button>
```

**Show Rejected Job Counter**:
```tsx
const RejectedTab = () => {
  const [rejectedCount, setRejectedCount] = useState(0);

  // Fetch rejected jobs count
  useEffect(() => {
    fetch('/api/jobs/status/rejected')
      .then(res => res.json())
      .then(data => setRejectedCount(data.length));
  }, []);

  return (
    <TabButton active={activeTab === 'rejected'}>
      Rejected ({rejectedCount})
    </TabButton>
  );
};
```

---

## Backend Changes

**Summary**:
1. Add Gmail label management functions (3 functions: get_or_create_jobops_old_label, get_jobops_label_id, update_gmail_labels_for_rejected_job)
2. Add or extend job rejection endpoint to trigger label updates
3. Query email_jobs table to get message_id for job
4. Handle OAuth token retrieval and error cases gracefully

**OAuth Scope Update**:
- **Current**: `https://www.googleapis.com/auth/gmail.readonly`
- **Required**: Add `https://www.googleapis.com/auth/gmail.modify`
- **Impact**: User must re-authenticate to grant new permission
- **Migration**: Add scope to `.env` and OAuth configuration

**Location**: `backend/src/main.rs` (lines 2700-2900 for Gmail functions)

---

## Label Application Rules

**Conservative Approach** (only rejected jobs get archived):

| Email Type | Initial Label | After User Action | Gmail Labels After |
|------------|---------------|-------------------|--------------------|
| **New Job** | JobOps | User clicks "Approve" | Keep JobOps only |
| **New Job** | JobOps | User clicks "Reject" | Remove JobOps → Add JobOps-OLD |
| **Non-Job Email** (confidence ≤ 0.3) | (unlabeled) | No action | No labels |
| **Duplicate Job** | JobOps | (automatic detection) | Keep JobOps only |
| **Failed Extraction** | (unlabeled) | No action | No labels |

**Rationale**:
- **Approved jobs**: Keep JobOps label for easy filtering of active opportunities
- **Rejected jobs**: Move to JobOps-OLD for bulk cleanup
- **Non-job emails**: Don't trust detection yet (false positives), leave unlabeled
- **Duplicates**: Don't trust detection yet, keep in JobOps for manual review
- **Failed extractions**: Need manual review, don't auto-label

**Future Enhancement** (Phase 2.9.1): Add JobOps-OLD to duplicates after detection quality improves

---

## Error Handling

**Graceful Degradation**:

| Error Scenario | Behavior | Impact |
|----------------|----------|--------|
| **OAuth token expired** | Log warning, skip label update | Job rejected in DB, Gmail unchanged |
| **JobOps label not found** | Log warning, skip label update | User hasn't manually created JobOps label |
| **Gmail API rate limit (429)** | Log warning, skip label update | Temporary, retry on next sync |
| **Network failure** | Log warning, skip label update | Job rejection still succeeds |
| **Message deleted in Gmail** | Log warning (404), skip update | Email no longer exists |

**Key Principle**: Label update failures NEVER block job rejection in database.

**Logging Examples**:
```rust
log_debug(&format!("Warning: Failed to update Gmail labels for job {}: {}. Job rejection still successful.", job_id, e));
```

**User Notification**: Optional frontend toast: "Job rejected (Gmail label update pending)"

---

## Testing Strategy

### Unit Tests

**Location**: `backend/tests/gmail_label_tests.rs` (new file)

**6 unit tests** (similar to Phase 2.8 pattern):

```rust
#[tokio::test]
async fn test_get_or_create_jobops_old_label_new() {
    // Setup: Mock Gmail API to return labels without JobOps-OLD
    // Action: Call get_or_create_jobops_old_label()
    // Assert:
    //   - GET request to /users/me/labels to check existing
    //   - POST request to create label with name="JobOps-OLD"
    //   - Returns label ID from create response
}

#[tokio::test]
async fn test_get_or_create_jobops_old_label_exists() {
    // Setup: Mock Gmail API to return JobOps-OLD in label list
    // Action: Call get_or_create_jobops_old_label()
    // Assert:
    //   - GET request to /users/me/labels
    //   - NO POST request (no duplicate creation)
    //   - Returns existing label ID
}

#[tokio::test]
async fn test_update_gmail_labels_success() {
    // Setup: Mock Gmail API label list and modify endpoints
    // Action: Call update_gmail_labels_for_rejected_job(message_id)
    // Assert:
    //   - POST request to /messages/{id}/modify
    //   - Body contains addLabelIds=[jobops_old_id]
    //   - Body contains removeLabelIds=[jobops_id]
    //   - Returns Ok(())
}

#[tokio::test]
async fn test_reject_job_updates_labels() {
    // Setup: Database with job linked to Gmail email
    // Action: Call reject_job endpoint
    // Assert:
    //   - Job status updated to "rejected"
    //   - Gmail label update function called
    //   - Returns 200 OK
}

#[tokio::test]
async fn test_reject_job_label_failure_doesnt_block() {
    // Setup: Mock Gmail API to return 500 error on label update
    // Action: Call reject_job endpoint
    // Assert:
    //   - Job status STILL updated to "rejected"
    //   - Error logged but not propagated
    //   - Returns 200 OK (graceful degradation)
}

#[tokio::test]
async fn test_reject_microsoft_job_skips_label_update() {
    // Setup: Database with job linked to Microsoft email (source="microsoft_email")
    // Action: Call reject_job endpoint
    // Assert:
    //   - Job status updated to "rejected"
    //   - Gmail label update NOT called (wrong source)
    //   - Returns 200 OK
}
```

**Testing Pattern** (from Phase 2.7/2.8):
- Use `mockito` crate for Gmail API mocking
- Test database with `sqlx::test` attribute
- Follow existing pattern in `backend/tests/microsoft_email_tests.rs`

### E2E Tests

**Location**: `frontend/e2e/tests/17-gmail-label-management.spec.ts` (new file)

**4 E2E tests**:

```typescript
test.describe('Phase 2.9: Gmail Label Management', () => {

  test('should show Rejected tab with count', async ({ page }) => {
    // Navigate to Intake tab
    // Verify "Rejected" tab exists
    // Verify rejected job count displayed (e.g., "Rejected (5)")
  });

  test('should have Reject button on job cards', async ({ page }) => {
    // Navigate to New Jobs tab
    // Find first job card
    // Verify "Reject" button exists
    // Verify button has red/destructive styling
  });

  test('should reject job and update Gmail labels', async ({ page }) => {
    // Navigate to New Jobs tab
    // Find Gmail-sourced job (check source badge)
    // Click "Reject" button
    // Wait for success notification
    // Verify job moved to Rejected tab
    // Verify Gmail label updated (query email_jobs table)
  });

  test('should handle label update failures gracefully', async ({ page }) => {
    // Setup: Mock Gmail API to return 500 error
    // Navigate to New Jobs tab
    // Click "Reject" button
    // Verify job STILL rejected in database
    // Verify error logged but not shown to user
    // Verify app remains stable
  });

});
```

**Test Patterns from Phase 2.7/2.8**:
- Use `data-testid` selectors for UI elements
- Scope selectors to containers (`.job-card button:has-text("Reject")`)
- Add explicit timeouts for API calls (`test.setTimeout(60000)`)
- Gracefully skip if not authenticated

### Manual Testing

**Manual Test Cases** (10 minutes):

1. **OAuth Re-authentication** (5 min) - MANUAL ONLY
   - [ ] Revoke Gmail OAuth token
   - [ ] Re-authenticate with new scope (`gmail.modify`)
   - [ ] Verify permission screen shows "Manage labels"
   - [ ] Confirm successful re-authentication

2. **Visual Gmail Validation** (5 min) - ONE-TIME
   - [ ] Create test job from Gmail email
   - [ ] Verify email has "JobOps" label in Gmail UI
   - [ ] Click "Reject" in JobHunter
   - [ ] Refresh Gmail → Verify "JobOps" removed, "JobOps-OLD" added
   - [ ] Verify email appears in JobOps-OLD label filter

**Why Manual**: OAuth consent screens require user interaction, Gmail UI validation easiest manually.

---

## Success Criteria

**Phase 2.9 Complete When**:

**Backend Implementation** (5 criteria):
1. ✅ `JobOps-OLD` label auto-created on first rejection
2. ✅ Rejected jobs remove JobOps label
3. ✅ Rejected jobs add JobOps-OLD label
4. ✅ Label update failures don't block job rejection
5. ✅ Microsoft jobs skip Gmail label updates

**Frontend Implementation** (3 criteria):
6. ✅ "Rejected" tab displays with job count
7. ✅ "Reject" button appears on job cards
8. ✅ Success notification shown after rejection

**Automated Testing** (90% of validation):
9. ✅ Unit tests passing (6/6 tests)
10. ✅ E2E tests passing (4/4 tests)

**Manual Testing** (10% of validation):
11. ✅ Gmail labels update correctly (one-time visual check)

---

## Timeline & Effort

**Total Estimate: 2-3 hours**

| Task | Duration | Notes |
|------|----------|-------|
| **Backend Implementation** | | |
| Add Gmail label management functions | 30 min | 3 functions: get_or_create, get_label_id, update_labels |
| Add/extend rejection endpoint | 20 min | PUT /api/jobs/{id}/reject with label trigger |
| OAuth scope update | 10 min | Add gmail.modify to config |
| Error handling and logging | 15 min | Graceful degradation |
| **Frontend Implementation** | | |
| Add "Rejected" tab | 15 min | New tab component with job count |
| Add "Reject" button to job cards | 10 min | Button with click handler |
| Add success notification | 5 min | Toast message |
| **Automated Testing** | | |
| Unit tests (6 tests) | 30 min | Follow Phase 2.8 pattern |
| E2E tests (4 tests) | 20 min | New test file |
| **Manual Testing** | | |
| OAuth re-auth and Gmail validation | 10 min | One-time visual checks |
| **Documentation** | | |
| Update Phase 2.9 docs | 10 min | Test results and patterns |
| **Total** | **~2.5 hours** | |

**Complexity**: Low-Medium (straightforward Gmail API integration, similar to Phase 2.8)

**Phase 2.8 Lessons Applied**:
- Use mockito for API mocking (saves time vs real API calls)
- Follow existing test patterns (faster than creating new patterns)
- Prioritize data-testid selectors (reduces debugging time)
- Implement graceful error handling from the start

---

## Related Documentation

- ✅ [Phase 2.0: Gmail Integration](PHASE_2.0_gmail-integration.md) - Original Gmail integration
- ✅ [Phase 2.7: Microsoft Email Source](PHASE_2.7_samkirk-email-source-plan.md) - COMPLETE (2025-11-06)
- ✅ [Phase 2.8: Microsoft Folder Management](PHASE_2.8_ms-email-processing.md) - COMPLETE (2025-11-06)
- [Gmail API: Labels](https://developers.google.com/gmail/api/guides/labels)
- [Gmail API: Modify Message](https://developers.google.com/gmail/api/reference/rest/v1/users.messages/modify)

---

## Future Enhancements

**Phase 2.9.1 (Potential)**:
- **Auto-archive duplicates**: Apply JobOps-OLD to detected duplicates (after detection improves)
- **Auto-archive non-jobs**: Apply JobOps-OLD to low-confidence emails (after detection improves)
- **Bulk rejection**: Reject multiple jobs at once with batch label updates
- **Undo rejection**: Move job back to "new" and restore JobOps label

**Phase 5.x (Analytics)**:
- Track rejection rate by job source
- Show label distribution statistics
- Trend analysis on rejection reasons

---

**Document Version**: 1.0
**Created**: 2025-11-06
**Status**: 📋 Planning Complete - Ready for Implementation
