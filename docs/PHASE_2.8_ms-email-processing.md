<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Phase 2.8: Microsoft Email Processing - Auto-Archive](#phase-28-microsoft-email-processing---auto-archive)
  - [Overview](#overview)
  - [Problem Statement](#problem-statement)
  - [Goals](#goals)
  - [Requirements](#requirements)
    - [Functional Requirements](#functional-requirements)
    - [Non-Functional Requirements](#non-functional-requirements)
  - [Technical Design](#technical-design)
    - [Microsoft Graph API](#microsoft-graph-api)
    - [Implementation Approach](#implementation-approach)
  - [Testing Strategy](#testing-strategy)
    - [Unit Tests](#unit-tests)
    - [E2E Tests](#e2e-tests)
    - [Manual Testing](#manual-testing)
  - [UI Changes](#ui-changes)
  - [Open Questions](#open-questions)
    - [Q1: Folder Naming](#q1-folder-naming)
    - [Q2: What to Archive](#q2-what-to-archive)
    - [Q3: Archive Failure Behavior](#q3-archive-failure-behavior)
  - [Success Criteria](#success-criteria)
  - [Effort Estimate](#effort-estimate)
  - [Implementation Notes](#implementation-notes)
    - [Microsoft Graph API Permissions](#microsoft-graph-api-permissions)
    - [Caching Considerations](#caching-considerations)
    - [Backward Compatibility](#backward-compatibility)
  - [Related Documentation](#related-documentation)
  - [Future Enhancements (Out of Scope)](#future-enhancements-out-of-scope)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Phase 2.8: Microsoft Email Processing - Auto-Archive

**Status**: 📋 Planning
**Priority**: Medium
**Estimated Effort**: 1-2 hours
**Dependencies**: Phase 2.7 (Microsoft Email Source)

---

## Overview

Automatically move processed Microsoft emails from the `JobOps` folder to an archive folder (`JobOps_Processed`) after successful job extraction. This keeps the active JobOps folder clean and provides a clear visual indicator of which emails still need attention.

**User Workflow**:
1. Email arrives at `sam@samkirk.com` with job opportunity
2. User moves email to `JobOps` folder (manual triage)
3. User clicks "Sync Now" in JobHunter
4. System processes email → LLM extracts job data
5. **NEW**: System automatically moves email to `JobOps_Processed` folder
6. JobOps folder remains clean with only unprocessed emails

---

## Problem Statement

**Current Behavior** (Phase 2.7):
- System marks emails as "read" after processing
- Processed emails remain in JobOps folder
- User cannot easily distinguish processed vs unprocessed emails
- Folder gets cluttered over time

**Desired Behavior** (Phase 2.8):
- System moves emails to archive folder after successful processing
- JobOps folder only contains emails needing attention
- Processed emails preserved in archive for audit trail
- Zero manual housekeeping required

---

## Goals

1. **Automatic Archiving**: Move processed emails to `JobOps_Processed` folder
2. **Folder Management**: Auto-create archive folder if it doesn't exist
3. **Clean Workflow**: JobOps folder only shows unprocessed emails
4. **Audit Trail**: All processed emails preserved in archive
5. **Error Handling**: Handle folder creation/move failures gracefully

---

## Requirements

### Functional Requirements

**FR-1: Archive Folder Creation**
- System checks for `JobOps_Processed` folder on startup/first sync
- If not found, create folder at root level of mailbox
- Store folder ID in memory for subsequent moves

**FR-2: Email Archiving**
- After successful job creation from email, move email to archive folder
- Use Microsoft Graph API `POST /me/messages/{id}/move`
- Archive emails where confidence > 0.3 (real job opportunities)

**FR-3: Filtering Behavior**
- **Processed Jobs** (confidence > 0.3): Move to `JobOps_Processed`
- **Non-Jobs** (confidence ≤ 0.3): Leave in JobOps for manual review
- **Duplicates**: Move to `JobOps_Processed` (already in system)
- **Processing Errors**: Leave in JobOps (requires user attention)

**FR-4: Error Handling**
- If folder creation fails: Log warning, continue with mark-as-read only
- If move fails: Log warning, continue (email still marked as read)
- Don't block job creation on archive failures

### Non-Functional Requirements

**NFR-1: Performance**
- Move operation adds <500ms to sync time per email
- Folder lookup cached for sync session

**NFR-2: Reliability**
- Archive failures don't prevent job creation
- Graceful degradation to Phase 2.7 behavior if Graph API issues

**NFR-3: User Experience**
- Invisible to user (automatic)
- JobOps folder count reflects only unprocessed emails

---

## Technical Design

### Microsoft Graph API

**Folder Creation**:
```
POST https://graph.microsoft.com/v1.0/me/mailFolders
Body: {
  "displayName": "JobOps_Processed",
  "isHidden": false
}
Response: { "id": "AAMkA...", "displayName": "JobOps_Processed", ... }
```

**Move Message**:
```
POST https://graph.microsoft.com/v1.0/me/messages/{messageId}/move
Body: {
  "destinationId": "{archiveFolderId}"
}
Response: { "id": "AAMkA...", ... } (moved message)
```

**Find Folder by Name**:
```
GET https://graph.microsoft.com/v1.0/me/mailFolders?$filter=displayName eq 'JobOps_Processed'
Response: { "value": [{ "id": "AAMkA...", ... }] }
```

### Implementation Approach

**1. Add Archive Folder Management Functions**

Location: `backend/src/main.rs` (after `mark_microsoft_message_as_read()`)

```rust
async fn get_or_create_archive_folder(
    client: &reqwest::Client,
    access_token: &str,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    // Try to find existing folder first
    let search_url = "https://graph.microsoft.com/v1.0/me/mailFolders?$filter=displayName eq 'JobOps_Processed'";

    let response = client
        .get(search_url)
        .bearer_auth(access_token)
        .send()
        .await?;

    if response.status().is_success() {
        let data: serde_json::Value = response.json().await?;
        if let Some(folders) = data["value"].as_array() {
            if !folders.is_empty() {
                // Folder exists, return ID
                if let Some(id) = folders[0]["id"].as_str() {
                    log_debug(&format!("Found existing JobOps_Processed folder: {}", id));
                    return Ok(id.to_string());
                }
            }
        }
    }

    // Folder doesn't exist, create it
    log_debug("Creating JobOps_Processed folder...");
    let create_url = "https://graph.microsoft.com/v1.0/me/mailFolders";
    let response = client
        .post(create_url)
        .bearer_auth(access_token)
        .json(&serde_json::json!({
            "displayName": "JobOps_Processed",
            "isHidden": false
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(format!("Failed to create archive folder: {}", response.status()).into());
    }

    let data: serde_json::Value = response.json().await?;
    let folder_id = data["id"].as_str()
        .ok_or("No folder ID in response")?
        .to_string();

    log_debug(&format!("Created JobOps_Processed folder: {}", folder_id));
    Ok(folder_id)
}

async fn move_microsoft_message(
    client: &reqwest::Client,
    access_token: &str,
    message_id: &str,
    destination_folder_id: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let url = format!("https://graph.microsoft.com/v1.0/me/messages/{}/move", message_id);

    let response = client
        .post(&url)
        .bearer_auth(access_token)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "destinationId": destination_folder_id
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to move message: {} - {}", status, error_text).into());
    }

    Ok(())
}
```

**2. Update `process_microsoft_messages()` Function**

Location: `backend/src/main.rs:3300-3584`

Changes:
1. Get/create archive folder at start of function
2. After successful job creation, move email instead of just marking read
3. Handle move failures gracefully (log warning, continue)

```rust
// Near start of function (after getting access token)
let archive_folder_id = match get_or_create_archive_folder(&client, access_token).await {
    Ok(id) => Some(id),
    Err(e) => {
        log_debug(&format!("Warning: Could not get archive folder: {}. Will only mark as read.", e));
        None
    }
};

// Replace mark_as_read calls with archive logic
// OLD (line 3465-3467):
if let Err(e) = mark_microsoft_message_as_read(&client, access_token, &message.id).await {
    log_debug(&format!("Warning: Failed to mark message {} as read: {}", message.id, e));
}

// NEW:
if let Some(archive_id) = &archive_folder_id {
    // Try to move to archive
    match move_microsoft_message(&client, access_token, &message.id, archive_id).await {
        Ok(_) => {
            log_debug(&format!("Moved message {} to JobOps_Processed", message.id));
        }
        Err(e) => {
            log_debug(&format!("Warning: Failed to move message {}: {}. Marking as read instead.", message.id, e));
            // Fallback to mark as read
            if let Err(e) = mark_microsoft_message_as_read(&client, access_token, &message.id).await {
                log_debug(&format!("Warning: Failed to mark message {} as read: {}", message.id, e));
            }
        }
    }
} else {
    // No archive folder available, fall back to mark as read
    if let Err(e) = mark_microsoft_message_as_read(&client, access_token, &message.id).await {
        log_debug(&format!("Warning: Failed to mark message {} as read: {}", message.id, e));
    }
}
```

**3. Update Duplicate Handling**

Location: Same function, around line 3386-3390

```rust
if existing.is_some() {
    metrics.duplicated += 1;

    // Move duplicate to archive (already processed)
    if let Some(archive_id) = &archive_folder_id {
        move_microsoft_message(&client, access_token, &message.id, archive_id).await.ok();
    } else {
        mark_microsoft_message_as_read(&client, access_token, &message.id).await.ok();
    }

    continue;
}
```

---

## Testing Strategy

### Unit Tests

**Location**: `backend/tests/microsoft_email_tests.rs`

Add tests for new functions:

```rust
#[tokio::test]
async fn test_archive_folder_creation() {
    // Test folder creation via Graph API
    // Verify folder ID returned
}

#[tokio::test]
async fn test_archive_folder_exists() {
    // Test finding existing folder
    // Verify returns existing folder ID (no duplicate creation)
}

#[tokio::test]
async fn test_move_message_to_archive() {
    // Test moving message via Graph API
    // Verify message moved successfully
}

#[tokio::test]
async fn test_move_failure_fallback() {
    // Test behavior when move fails
    // Verify falls back to mark-as-read
    // Verify job creation still succeeds
}
```

### E2E Tests

**Location**: `frontend/e2e/tests/17-microsoft-email-archiving.spec.ts`

```typescript
test('should move processed email to archive folder', async ({ page }) => {
  // 1. Place test email in JobOps folder
  // 2. Sync Microsoft email
  // 3. Verify job created
  // 4. Verify email moved to JobOps_Processed
  // 5. Verify JobOps folder is empty
});

test('should leave non-job emails in JobOps', async ({ page }) => {
  // 1. Place non-job email in JobOps folder
  // 2. Sync Microsoft email
  // 3. Verify email NOT moved (confidence ≤ 0.3)
  // 4. Verify email still in JobOps
});

test('should handle archive folder creation', async ({ page }) => {
  // 1. Delete JobOps_Processed folder if exists
  // 2. Sync Microsoft email with job
  // 3. Verify folder auto-created
  // 4. Verify email moved
});
```

### Manual Testing

**Test Cases**:
1. ✅ First sync creates `JobOps_Processed` folder
2. ✅ Processed email moved to archive
3. ✅ JobOps folder shows only unprocessed emails
4. ✅ Duplicate emails moved to archive
5. ✅ Non-job emails (low confidence) left in JobOps
6. ✅ Archive folder visible in Outlook
7. ✅ Moved emails preserve metadata (subject, date, from)

---

## UI Changes

**IntakeTab.tsx** - Microsoft Email card

**Current Display**:
```
JobOps Folder: ✓ Ready
5 unread messages (12 total)
```

**New Display**:
```
JobOps Folder: ✓ Ready
5 unread messages (12 total)
Archive: JobOps_Processed (45 messages)
```

**Implementation**: Optional enhancement (not required for Phase 2.8)
- Show archive folder count in UI
- Helps user know archiving is working
- Low priority (can be deferred)

---

## Open Questions

### Q1: Folder Naming

**Options**:
- `JobOps_Processed` ⭐ (Clear, matches convention)
- `JobOps_Archive` (Generic)
- `JobOps_OLD` (User's original suggestion)

**Decision**: Use `JobOps_Processed` (clearest intent)

### Q2: What to Archive

**Proposal**:
- ✅ Archive: Successfully extracted jobs (confidence > 0.3)
- ✅ Archive: Duplicate jobs (already in system)
- ❌ Don't archive: Non-jobs (confidence ≤ 0.3) - leave for manual review
- ❌ Don't archive: Processing errors - leave for troubleshooting

**Rationale**: JobOps folder = "needs attention", archive = "handled by system"

### Q3: Archive Failure Behavior

**Proposal**: Graceful degradation
- Log warning
- Fall back to mark-as-read behavior (Phase 2.7)
- Don't block job creation
- User can manually move emails if needed

---

## Success Criteria

1. ✅ `JobOps_Processed` folder auto-created on first sync
2. ✅ Processed emails (confidence > 0.3) moved to archive
3. ✅ Duplicate emails moved to archive
4. ✅ Non-job emails (confidence ≤ 0.3) left in JobOps
5. ✅ Archive failures don't prevent job creation
6. ✅ Unit tests passing (4 new tests)
7. ✅ E2E tests passing (3 new tests)
8. ✅ Manual testing confirms clean JobOps folder workflow

---

## Effort Estimate

**Total: 1-2 hours**

| Task | Estimate |
|------|----------|
| Backend: Add folder management functions | 20 min |
| Backend: Update process_microsoft_messages() | 15 min |
| Backend: Error handling and logging | 10 min |
| Testing: Unit tests (4 tests) | 20 min |
| Testing: E2E tests (3 tests) | 25 min |
| Testing: Manual verification | 10 min |
| Documentation: Update Phase 2.7 docs | 10 min |
| **Total** | **110 min (1.8 hours)** |

**Complexity**: Low (straightforward Graph API integration)

---

## Implementation Notes

### Microsoft Graph API Permissions

**Current Permissions** (from Phase 2.7):
- `Mail.Read` - Read emails ✅
- `Mail.ReadWrite` - Needed for moving emails ✅

**No new OAuth scopes required** - Phase 2.7 already has `Mail.ReadWrite`

### Caching Considerations

**Archive Folder ID**:
- Lookup once per sync session
- Store in memory (not persisted)
- Re-lookup on next sync (minimal overhead)

**Alternative**: Store folder ID in database (overkill for this use case)

### Backward Compatibility

**Graceful Degradation**:
- If folder creation fails → Fall back to mark-as-read
- If move fails → Fall back to mark-as-read
- Phase 2.7 behavior preserved as fallback

**No Breaking Changes**:
- Existing functionality unchanged
- New behavior is additive only

---

## Related Documentation

- [Phase 2.7: Microsoft Email Source](PHASE_2.7_samkirk-email-source-plan.md) - Prerequisites
- [Microsoft Graph API: Move Message](https://learn.microsoft.com/en-us/graph/api/message-move)
- [Microsoft Graph API: Create Folder](https://learn.microsoft.com/en-us/graph/api/user-post-mailfolders)

---

## Future Enhancements (Out of Scope)

**Phase 2.9 (Potential)**:
- **Archive Cleanup**: Delete emails from archive after 90 days
- **Archive Search**: Search archived emails from UI
- **Multiple Archives**: Separate folders for different job types
- **Archive Statistics**: Show archive growth over time

**Phase 5.x (Analytics)**:
- Track processing success rate
- Show archive vs active email ratios
- Trend analysis on email volume

---

**Document Version**: 1.0
**Created**: 2025-11-05
**Last Updated**: 2025-11-05
