---
id: ISSUE-030
title: Low-confidence emails appear in Filtered tab instead of Non-Job Emails
status: open
priority: medium
severity: medium
component: backend
created: 2025-11-03
updated: 2025-11-03
affects: []
related: []
---

# ISSUE-030: Low-confidence emails appear in Filtered tab instead of Non-Job Emails

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Steps to Reproduce](#steps-to-reproduce)
- [Expected Behavior](#expected-behavior)
- [Actual Behavior](#actual-behavior)
- [Root Cause](#root-cause)
- [Evidence](#evidence)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Frontend Tab Routing Fix](#option-1-frontend-tab-routing-fix)
  - [Option 2: Backend Status Field Addition](#option-2-backend-status-field-addition)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

Emails with confidence ≤ 0.3 get status 'filtered' instead of 'ignored', causing non-job emails to appear in wrong tab

## Impact

**Who/What is affected:**
- Users viewing the "Non-Job Emails" tab in the UI
- Potentially the "Filtered" tab showing emails that should be in "Non-Job Emails"

**Severity:**
- Medium - UI organization issue, doesn't affect core functionality
- Low-confidence emails are correctly NOT creating job records (working as expected)

## Steps to Reproduce

1. Sync emails with confidence ≤ 0.3 (non-job emails) via Gmail or Microsoft
2. Check which tab displays these emails in the UI
3. Compare expected tab ("Non-Job Emails") vs actual tab

## Expected Behavior

- Emails with confidence ≤ 0.3 should appear in the "Non-Job Emails" tab
- The `email_jobs` table should show these as low-confidence, unprocessed emails
- No job record should be created (this is working correctly)

## Actual Behavior

**NEEDS VERIFICATION**: Initial report suggests these appear in "Filtered" tab instead

**Code Analysis Findings (2025-11-04)**:
- Both Gmail (`backend/src/main.rs:4053`) and Microsoft (`backend/src/main.rs:3455`) correctly check `confidence > 0.3` before creating jobs
- Low-confidence emails correctly do NOT create job records
- These emails only update the `email_jobs` table with `processed = true`, `job_id IS NULL`
- The `/api/intake/ignored-emails` endpoint (`main.rs:5269-5289`) correctly queries for:
  - `processed = true`
  - `job_id IS NULL` (no job created)
  - `extraction_confidence < 0.3` OR missing title/company

**Status**: Need to reproduce the reported behavior to confirm if this is still an issue

## Root Cause

**Investigation Status**: Preliminary code review suggests the logic is correct

**Code flow for low-confidence emails**:
1. Email is processed via `process_gmail_messages()` or `process_microsoft_messages()`
2. LLM extraction returns `confidence ≤ 0.3`
3. Code path at `main.rs:3508-3526` (Microsoft) or `main.rs:4113-4133` (Gmail):
   - Does NOT create a job record
   - Updates `email_jobs` with `processed = true`, no `job_id`
   - Leaves email unread in inbox for manual review
   - Metrics: `filtered_out += 1`
4. API endpoint `/api/intake/ignored-emails` should retrieve these correctly

**Hypothesis**: May be a frontend routing issue, not a backend data issue. Need to verify which API endpoint the "Non-Job Emails" tab is calling.

## Evidence

**Code References**:
- Gmail processing: `backend/src/main.rs:4113-4133` (low-confidence branch)
- Microsoft processing: `backend/src/main.rs:3508-3526` (low-confidence branch)
- Ignored emails endpoint: `backend/src/main.rs:5269-5289`
- Confidence threshold checks: `main.rs:3455`, `main.rs:4053`

**Next Steps for Investigation**:
- [ ] Reproduce: Sync email with known low confidence (< 0.3)
- [ ] Verify: Check `email_jobs` table for the record
- [ ] Check: Which API endpoint does "Non-Job Emails" tab call?
- [ ] Test: Query `/api/intake/ignored-emails` directly to see if email appears
- [ ] Compare: Check if email appears in wrong tab in UI

## Proposed Solutions

**PENDING**: Awaiting reproduction of the issue to determine if fix is needed

If issue is confirmed, potential solutions:

### Option 1: Frontend Tab Routing Fix

**Description**: If the "Non-Job Emails" tab is calling the wrong API endpoint, update the frontend to use `/api/intake/ignored-emails`

**Pros**:
- Simple frontend change
- Backend logic is already correct
- No database changes needed

**Cons**:
- Only fixes UI issue, not data issue (if there is one)

**Implementation Effort**: 1-2 hours

**Maintenance**: Minimal

### Option 2: Backend Status Field Addition

**Description**: Add explicit `status` field to `email_jobs` table to distinguish "filtered" vs "ignored" emails

**Pros**:
- Clearer data model
- Explicit status tracking
- Easier to query and debug

**Cons**:
- Requires database migration
- More complex implementation
- May not be necessary if issue is frontend-only

**Implementation Effort**: 3-4 hours (migration, backend, frontend)

**Maintenance**: Minimal, clearer data model

## Decision

**DEFERRED**: Need to reproduce the issue first to determine the actual problem

Current code review suggests backend logic is correct. Next step is manual testing.

## Implementation

[Details of what was implemented - update during/after implementation]

## Testing

**Test Commands:**
```bash
# Commands to reproduce the bug
# Commands to verify the fix
```

**Verification:**
- [ ] Test case 1
- [ ] Test case 2
- [ ] Test case 3

## Status History

- 2025-11-03: ISSUE created and documented
- 2025-11-04: Code analysis completed - backend logic appears correct, awaiting reproduction

## Notes

**From Manual Testing (Phase 2.7 validation - 2025-11-03)**:
- Original issue was filed during Phase 2.7 manual testing
- Context: Testing Microsoft Email Source integration
- May have been observed during email sync but not fully documented

**Investigation Priority**: Medium - doesn't block core functionality, but affects UX

## Related Files

**Backend (Email Processing)**:
- `backend/src/main.rs:3508-3526` - Microsoft low-confidence email handling
- `backend/src/main.rs:4113-4133` - Gmail low-confidence email handling
- `backend/src/main.rs:3455` - Microsoft confidence threshold check
- `backend/src/main.rs:4053` - Gmail confidence threshold check
- `backend/src/main.rs:5269-5289` - `/api/intake/ignored-emails` endpoint

**Frontend (Tabs)**:
- `frontend/src/components/IntakeTab.tsx` - May contain tab routing logic
- (Need to identify which component renders "Non-Job Emails" tab)
