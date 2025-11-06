<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Phase 2.8.1: Microsoft Folder Behavior Refinement](#phase-281-microsoft-folder-behavior-refinement)
  - [Executive Summary](#executive-summary)
  - [Background](#background)
  - [Problem Statement](#problem-statement)
  - [Goals](#goals)
  - [Technical Design](#technical-design)
    - [Current Behavior (Phase 2.8 - WRONG)](#current-behavior-phase-28---wrong)
    - [Desired Behavior (Phase 2.8.1 - CORRECT)](#desired-behavior-phase-281---correct)
    - [Implementation Changes](#implementation-changes)
  - [Changes Required](#changes-required)
  - [Folder Management Rules](#folder-management-rules)
  - [Testing Strategy](#testing-strategy)
    - [Update Phase 2.8 Tests](#update-phase-28-tests)
    - [New Test Case](#new-test-case)
  - [Success Criteria](#success-criteria)
  - [Timeline & Effort](#timeline--effort)
  - [Related Documentation](#related-documentation)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Phase 2.8.1: Microsoft Folder Behavior Refinement

**Status**: 📋 **REQUIRED** - Ready for Implementation (After Phase 2.9)
**Priority**: ⚠️ **HIGH** (Required for complete email management)
**Estimated Effort**: 30-45 minutes
**Dependencies**:
- ✅ Phase 2.8 (Microsoft Folder Management) - COMPLETE
- ⏳ Phase 2.9 (Gmail Label Management) - PLANNED

---

## Executive Summary

Phase 2.8 currently moves ALL processed Microsoft emails to JobOps-OLD immediately after processing. This is **incorrect** and inconsistent with the desired Gmail behavior (Phase 2.9).

This phase refines Phase 2.8 to match the Gmail approach:
- **Keep JobOps folder clean** with only New/Approved jobs (actionable items)
- **Move to JobOps-OLD** ONLY when user clicks "Reject" button
- **Align behavior** between Gmail labels and Microsoft folders

**Key Change**: Remove immediate archival from sync function, add rejection trigger instead.

---

## Background

**Phase 2.8 Current Behavior** (2025-11-05 18:13 - bb0659d):
- ✅ Auto-creates JobOps-OLD folder
- ✅ Moves messages via Microsoft Graph API
- ❌ **WRONG**: Archives ALL processed emails immediately during sync
- ❌ **WRONG**: No user control over what gets archived

**Commit bb0659d Rationale** (now obsolete):
> "Keeps JobOps folder completely clean; all processed emails go to archive"

**Problem**: This makes JobOps folder EMPTY after sync, defeating the purpose of manual curation.

**User Workflow Intended**:
1. User moves job email to JobOps folder (manual triage)
2. JobHunter syncs and extracts job data
3. **Email stays in JobOps** until user makes decision
4. User reviews job in JobHunter UI
5. User clicks "Approve" → Email stays in JobOps
6. User clicks "Reject" → **NOW** email moves to JobOps-OLD

**Phase 2.9 Gmail Parallel**:
- Gmail integration (Phase 2.9) will NOT archive emails immediately
- Gmail labels update ONLY when user rejects job
- Microsoft folders should match this behavior

---

## Problem Statement

**Current Phase 2.8 Behavior** (lines 3492-3510):
```rust
// Move ALL processed emails to archive folder (or mark as read if archive unavailable)
if let Some(archive_id) = &archive_folder_id {
    match move_microsoft_message(&client, access_token, &message.id, archive_id).await {
        Ok(_) => {
            log_debug(&format!("Moved processed message {} to JobOps-OLD", message.id));
        }
        Err(e) => {
            log_debug(&format!("Warning: Failed to move message {}: {}. Marking as read instead.", message.id, e));
            // Fallback to mark as read
            if let Err(e) = mark_microsoft_message_as_read(&client, access_token, &message.id).await {
                log_debug(&format!("Warning: Failed to mark message {} as read: {}", message.id, e));
            }
        }
    }
}
```

**Issues**:
1. Archives emails immediately during sync (lines 3492-3511)
2. User has no time to review job in UI before archival
3. JobOps folder becomes empty after sync (no actionable items visible)
4. Inconsistent with Gmail label management approach (Phase 2.9)

**Desired Behavior**:
- Remove immediate archival from sync function
- Keep processed emails in JobOps folder (marked as read only)
- Add rejection trigger to move messages to JobOps-OLD (same as Gmail)
- JobOps folder shows New/Approved jobs (actionable items)

---

## Goals

1. **Align with Gmail Behavior**: Microsoft folders match Gmail label management (Phase 2.9)
2. **User Control**: User decides when to archive via "Reject" button
3. **Clean Workflow**: JobOps folder shows actionable items (not empty)
4. **Consistency**: Same rules across Gmail and Microsoft integrations
5. **Minimal Changes**: Small refactor, no new features needed

---

## Technical Design

### Current Behavior (Phase 2.8 - WRONG)

```
┌─────────────────────────────────────────┐
│ User moves email to JobOps folder       │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ JobHunter syncs (user clicks "Sync Now")│
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ LLM extracts job data                   │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ ❌ Email moved to JobOps-OLD (WRONG)   │ ← REMOVE THIS
└─────────────────────────────────────────┘
```

### Desired Behavior (Phase 2.8.1 - CORRECT)

```
┌─────────────────────────────────────────┐
│ User moves email to JobOps folder       │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ JobHunter syncs (user clicks "Sync Now")│
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ LLM extracts job data                   │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ ✅ Email marked as read (stays in JobOps)│ ← KEEP THIS
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ User reviews job in JobHunter UI        │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
 ┌──────────┐      ┌──────────────┐
 │ Approve  │      │   Reject     │
 └────┬─────┘      └──────┬───────┘
      │                   │
      ▼                   ▼
┌──────────┐      ┌──────────────────────┐
│ Stay in  │      │ Move to JobOps-OLD   │ ← ADD THIS
│ JobOps   │      │ (same as Gmail)      │
└──────────┘      └──────────────────────┘
```

### Implementation Changes

**Location**: `backend/src/main.rs:3492-3510`

**Change 1: Remove Immediate Archival from Sync**

Replace lines 3492-3510 with:
```rust
// Mark email as read (keep in JobOps folder)
if let Err(e) = mark_microsoft_message_as_read(&client, access_token, &message.id).await {
    log_debug(&format!("Warning: Failed to mark message {} as read: {}", message.id, e));
}
```

**Change 2: Add Rejection Trigger** (same as Gmail in Phase 2.9)

**New Endpoint**: `PUT /api/jobs/{id}/reject`

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

    // 2. Get email message_id and source from email_jobs table
    let email_job = sqlx::query!(
        "SELECT message_id, source FROM email_jobs WHERE job_id = $1",
        job_id
    )
    .fetch_optional(pool.as_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    if let Some(email_job) = email_job {
        // 3. Handle based on source
        match email_job.source.as_str() {
            "gmail" => {
                // Update Gmail labels (Phase 2.9)
                // ... (see Phase 2.9 implementation)
            }
            "microsoft_email" => {
                // Move Microsoft message to JobOps-OLD
                let oauth_creds = sqlx::query!(
                    "SELECT access_token FROM oauth_credentials WHERE source_id = 'microsoft_email' AND user_id = '00000000-0000-0000-0000-000000000000'",
                )
                .fetch_optional(pool.as_ref())
                .await
                .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

                if let Some(creds) = oauth_creds {
                    let client = reqwest::Client::new();

                    // Get or create archive folder
                    match get_or_create_archive_folder(&client, &creds.access_token).await {
                        Ok(archive_id) => {
                            // Move message to archive
                            if let Err(e) = move_microsoft_message(
                                &client,
                                &creds.access_token,
                                &email_job.message_id,
                                &archive_id,
                            ).await {
                                log_debug(&format!("Warning: Failed to move Microsoft message {}: {}", email_job.message_id, e));
                                // Continue - job rejection still succeeds
                            }
                        }
                        Err(e) => {
                            log_debug(&format!("Warning: Failed to get archive folder: {}", e));
                            // Continue - job rejection still succeeds
                        }
                    }
                }
            }
            _ => {
                // Unknown source, no action
            }
        }
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "rejected" })))
}
```

---

## Changes Required

**Summary**:
1. ✅ **Remove** immediate archival from `process_microsoft_messages()` (lines 3492-3510)
2. ✅ **Keep** mark-as-read functionality for processed emails (line 3501-3503 pattern)
3. ✅ **Add** rejection trigger to move messages to JobOps-OLD (new endpoint)
4. ✅ **Update** Phase 2.8 tests to match new behavior

**Files to Modify**:
- `backend/src/main.rs` (lines 3492-3510) - Remove archival, simplify to mark-as-read only
- `backend/src/main.rs` (add new endpoint) - Add `reject_job()` endpoint
- `frontend/e2e/tests/16-microsoft-email-integration.spec.ts` (lines 544-583) - Update test expectations
- `docs/PHASE_2.8_ms-email-processing.md` (lines 52-63) - Update behavior description

**Backward Compatibility**: ✅ No breaking changes (folder functions reused, just called at different time)

---

## Folder Management Rules

**Updated Rules** (matches Gmail Phase 2.9):

| Email Type | After Sync | After User Approval | After User Rejection | Final Location |
|------------|------------|---------------------|----------------------|----------------|
| **High-Confidence Job** (>0.3) | Marked as read, stays in JobOps | Stays in JobOps | Moved to JobOps-OLD | JobOps or JobOps-OLD |
| **Low-Confidence Email** (≤0.3) | Marked as read, stays in JobOps | N/A (user doesn't see) | N/A (user doesn't see) | Stays in JobOps |
| **Duplicate Job** | Marked as read, stays in JobOps | N/A (already exists) | N/A (already exists) | Stays in JobOps |
| **Failed Extraction** | Marked as read, stays in JobOps | N/A (no job created) | N/A (no job created) | Stays in JobOps |

**Key Principle**: JobOps folder = "Needs attention or active tracking", JobOps-OLD = "User explicitly rejected"

**Future Enhancement** (Phase 2.9.1): Auto-archive duplicates and non-jobs after detection improves

---

## Testing Strategy

### Update Phase 2.8 Tests

**E2E Test to Update**: `frontend/e2e/tests/16-microsoft-email-integration.spec.ts:544-583`

**Current Test** (line 544):
```typescript
test('should archive ALL processed emails regardless of confidence', async ({ page }) => {
  // Verifies that both high and low confidence emails are archived
  // High-confidence create job records, low-confidence don't
});
```

**Updated Test**:
```typescript
test('should keep processed emails in JobOps until user rejects', async ({ page }) => {
  // 1. Sync Microsoft emails
  // 2. Verify emails marked as read but STILL in JobOps folder
  // 3. Check database: email_jobs.is_archived = false
  // 4. Find job in New Jobs tab
  // 5. Click "Reject" button
  // 6. Wait for rejection to complete
  // 7. Check database: email_jobs.is_archived = true
  // 8. Verify email moved to JobOps-OLD folder (mock Graph API call)
});
```

### New Test Case

**Unit Test** (add to `backend/tests/microsoft_email_tests.rs`):

```rust
#[tokio::test]
async fn test_reject_microsoft_job_moves_to_archive() {
    // Setup: Database with Microsoft job, mock Graph API
    // Action: Call reject_job endpoint
    // Assert:
    //   - Job status updated to "rejected"
    //   - move_microsoft_message() called with correct folder ID
    //   - Message moved to JobOps-OLD
}
```

**E2E Test** (add to `frontend/e2e/tests/16-microsoft-email-integration.spec.ts`):

```typescript
test('should move Microsoft email to archive on rejection', async ({ page }) => {
  // Setup: Sync Microsoft email (stays in JobOps)
  // Action: Navigate to New Jobs → Click "Reject"
  // Assert:
  //   - Job appears in Rejected tab
  //   - Database shows email_jobs.is_archived = true
  //   - Mock Graph API call shows move operation
});
```

---

## Success Criteria

**Phase 2.8.1 Complete When**:

**Behavior Changes** (3 criteria):
1. ✅ Processed emails stay in JobOps folder (not immediately archived)
2. ✅ Emails marked as read during sync
3. ✅ Rejection trigger moves emails to JobOps-OLD (not sync)

**Code Changes** (2 criteria):
4. ✅ Immediate archival removed from `process_microsoft_messages()` (lines 3492-3510)
5. ✅ Rejection endpoint added with folder move logic

**Testing** (2 criteria):
6. ✅ Phase 2.8 E2E test updated (line 544)
7. ✅ New rejection test passes

**Alignment** (1 criterion):
8. ✅ Microsoft folder behavior matches Gmail label behavior (Phase 2.9)

---

## Timeline & Effort

**Total Estimate: 30-45 minutes**

| Task | Duration | Notes |
|------|----------|-------|
| **Code Changes** | | |
| Remove immediate archival from sync | 5 min | Delete lines 3492-3510, simplify to mark-as-read |
| Add rejection endpoint logic | 15 min | Reuse existing folder functions, add endpoint |
| **Testing Updates** | | |
| Update Phase 2.8 E2E test (line 544) | 5 min | Change test expectations |
| Add new rejection test | 5 min | Follow existing test pattern |
| Run full test suite | 5 min | Verify no regressions |
| **Documentation** | | |
| Update Phase 2.8 docs | 5 min | Update behavior description |
| **Total** | **40 min** | |

**Complexity**: Very Low (small refactor, reuses existing functions)

**Risk**: Very Low (backward compatible, no API changes)

---

## Related Documentation

- ✅ [Phase 2.8: Microsoft Folder Management](PHASE_2.8_ms-email-processing.md) - COMPLETE (needs refinement)
- ⏳ [Phase 2.9: Gmail Label Management](PHASE_2.9_gmail-label-management.md) - PLANNED
- ✅ [Phase 2.7: Microsoft Email Source](PHASE_2.7_samkirk-email-source-plan.md) - COMPLETE

---

**Document Version**: 1.0
**Created**: 2025-11-06
**Status**: 📋 Planning Complete - Ready for Implementation (after Phase 2.9 decision)

**Implementation Note**: This phase should be implemented AFTER Phase 2.9 is complete to ensure consistent behavior across Gmail and Microsoft integrations. The rejection endpoint should handle both Gmail labels and Microsoft folders in a unified manner.
