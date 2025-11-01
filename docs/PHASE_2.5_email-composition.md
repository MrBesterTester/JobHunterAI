<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Phase 2.5 Implementation: Email Composition & Sending](#phase-25-implementation-email-composition--sending)
  - [Overview](#overview)
  - [Implementation Roadmap](#implementation-roadmap)
    - [📋 Week 1 - Days 1-2: Backend Gmail Draft API](#-week-1---days-1-2-backend-gmail-draft-api)
      - [1. Gmail API Draft Creation (`backend/src/main.rs`)](#1-gmail-api-draft-creation-backendsrcmainrs)
      - [2. Database Schema Updates](#2-database-schema-updates)
      - [3. Integration with Communications Table](#3-integration-with-communications-table)
    - [📋 Week 1 - Days 2-3: Frontend Email Composer UI](#-week-1---days-2-3-frontend-email-composer-ui)
      - [1. Email Composer Component (`frontend/src/EmailComposer.tsx`)](#1-email-composer-component-frontendsrcemailcomposertsx)
      - [2. Integration into Existing UI](#2-integration-into-existing-ui)
      - [3. Application Tracker Enhancements](#3-application-tracker-enhancements)
    - [📋 Week 1 - Day 3: Testing & Validation](#-week-1---day-3-testing--validation)
  - [Technical Architecture](#technical-architecture)
    - [Backend Structure](#backend-structure)
    - [Frontend Structure](#frontend-structure)
    - [Database Changes](#database-changes)
  - [API Endpoints](#api-endpoints)
    - [Email Draft Endpoints](#email-draft-endpoints)
  - [Gmail API Integration](#gmail-api-integration)
    - [Draft Creation Request](#draft-creation-request)
    - [MIME Message Structure](#mime-message-structure)
    - [OAuth Scopes Required](#oauth-scopes-required)
  - [Environment Variables](#environment-variables)
    - [Google OAuth Setup Update](#google-oauth-setup-update)
  - [Testing Strategy](#testing-strategy)
    - [⚠️ Testing Safety Requirements](#-testing-safety-requirements)
    - [Backend Tests (cargo test)](#backend-tests-cargo-test)
    - [Frontend Tests (Playwright)](#frontend-tests-playwright)
    - [Manual Testing](#manual-testing)
  - [Success Criteria](#success-criteria)
    - [Functional Requirements (PRD 4.4)](#functional-requirements-prd-44)
    - [Completion Checklist](#completion-checklist)
  - [Known Challenges & Solutions](#known-challenges--solutions)
    - [Challenge 1: MIME Message Construction](#challenge-1-mime-message-construction)
    - [Challenge 2: OAuth Scope Updates](#challenge-2-oauth-scope-updates)
    - [Challenge 3: Resume Format](#challenge-3-resume-format)
    - [Challenge 4: Draft Status Monitoring](#challenge-4-draft-status-monitoring)
    - [Challenge 5: Email Rate Limits](#challenge-5-email-rate-limits)
  - [Integration with Existing Features](#integration-with-existing-features)
    - [Phase 4 (Gmail Integration)](#phase-4-gmail-integration)
    - [Phase 3 (Content Generation)](#phase-3-content-generation)
    - [Phase 2.4 (Calendar & Follow-ups)](#phase-24-calendar--follow-ups)
  - [Future Enhancements (Post Phase 2.5)](#future-enhancements-post-phase-25)
    - [Phase 2.6 Ideas:](#phase-26-ideas)
  - [Progress Log](#progress-log)
    - [October 9, 2025 - Session 1: Planning & Documentation](#october-9-2025---session-1-planning--documentation)
  - [Estimated Timeline](#estimated-timeline)
  - [PRD Alignment](#prd-alignment)
  - [References](#references)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Phase 2.5 Implementation: Email Composition & Sending

**Status**: Planning → Implementation
**Priority**: CRITICAL (completes core PRD workflow)
**Started**: October 9, 2025
**Estimated Completion**: 2-3 days

---

## Overview

Phase 2.5 implements the **Email Composition & Sending** feature (PRD Section 4.4) - the final critical piece of the job application workflow. This phase enables the system to automatically create Gmail drafts with cover letters as email body and resumes as attachments, allowing you to review and send application emails directly from Gmail.

**What This Completes:**
- End-to-end job application automation: Intake → Filter → Approve → Generate → **Create Draft** → Send
- PRD Section 4.4: Email Composition & Sending
- The last major requirement from the original Product Requirements Document

---

## Implementation Roadmap

### 📋 Week 1 - Days 1-2: Backend Gmail Draft API

**Backend Tasks:**

#### 1. Gmail API Draft Creation (`backend/src/main.rs`)
- [ ] Create data models:
  - [ ] `GmailDraftRequest` struct
  - [ ] `GmailDraftResponse` struct
  - [ ] `EmailAttachment` struct
  - [ ] `EmailDraft` struct (for database tracking)

- [ ] Implement `create_gmail_draft()` function:
  - [ ] Build MIME message with cover letter as body
  - [ ] Encode resume file as base64 attachment
  - [ ] Create draft via Gmail API: `POST https://gmail.googleapis.com/gmail/v1/users/me/drafts`
  - [ ] Return draft ID and Gmail URL

- [ ] Implement draft monitoring:
  - [ ] `check_draft_status()` function - Query if draft still exists
  - [ ] `get_sent_message()` function - Detect when draft was sent
  - [ ] Auto-update application status to "sent"

- [ ] Create API endpoints:
  - [ ] `POST /api/applications/{application_id}/create-draft`
  - [ ] `GET /api/applications/{application_id}/draft-status`
  - [ ] `DELETE /api/applications/{application_id}/draft` (cancel/delete draft)

#### 2. Database Schema Updates
- [ ] Create `email_drafts` table:
  ```sql
  CREATE TABLE email_drafts (
      draft_id UUID PRIMARY KEY,
      application_id UUID REFERENCES applications(application_id),
      gmail_draft_id VARCHAR(255) UNIQUE,
      gmail_message_id VARCHAR(255), -- When sent
      recipient_email VARCHAR(255),
      subject TEXT,
      status VARCHAR(20), -- 'created', 'sent', 'deleted'
      created_at TIMESTAMP,
      sent_at TIMESTAMP
  );
  ```

- [ ] Update `applications` table:
  - [ ] Add `draft_created_at TIMESTAMP`
  - [ ] Add `draft_url TEXT` (link to open in Gmail)

- [ ] Update `communications` table:
  - [ ] Add `gmail_draft_id VARCHAR(255)` (link draft to sent email)

#### 3. Integration with Communications Table
- [ ] Auto-record when draft is created (direction='outbound', channel='email')
- [ ] Update communication record when draft is sent
- [ ] Link sent email to original draft_id

---

### 📋 Week 1 - Days 2-3: Frontend Email Composer UI

**Frontend Tasks:**

#### 1. Email Composer Component (`frontend/src/EmailComposer.tsx`)
- [ ] Create modal component with:
  - [ ] Preview of cover letter (email body)
  - [ ] Resume attachment indicator (filename, size)
  - [ ] Recipient email field (editable)
  - [ ] Subject line preview (editable)
  - [ ] "Create Gmail Draft" button
  - [ ] Loading state during draft creation
  - [ ] Success message with "Open in Gmail" link
  - [ ] Error handling and retry

#### 2. Integration into Existing UI
- [ ] Add "Create Email Draft" button to approved jobs:
  - [ ] Job cards in "Approved" tab
  - [ ] Job detail modal for approved jobs
  - [ ] Only show if content has been generated

- [ ] Add draft status indicators:
  - [ ] Badge showing "Draft Created" on applications
  - [ ] Show draft creation date
  - [ ] Link to open draft in Gmail
  - [ ] Show "Sent" status when detected

#### 3. Application Tracker Enhancements
- [ ] Update "Applied" tab to show:
  - [ ] Draft status (created, sent, deleted)
  - [ ] Draft creation date
  - [ ] Link to Gmail draft
  - [ ] Sent date (when detected)

---

### 📋 Week 1 - Day 3: Testing & Validation

**Backend Tests (`backend/src/main.rs` - test module):**
- [ ] Test Gmail draft creation with mock API
- [ ] Test MIME message construction
- [ ] Test base64 attachment encoding
- [ ] Test draft status monitoring
- [ ] Test automatic status updates
- [ ] Test communication recording
- [ ] **Target**: 8+ new backend tests

**Frontend E2E Tests (`frontend/e2e/tests/15-email-composer.spec.ts`):**
- [ ] Test email composer modal display
- [ ] Test draft creation workflow
- [ ] Test success message and Gmail link
- [ ] Test error handling
- [ ] Test draft status display in application tracker
- [ ] Test integration with content generation
- [ ] **Target**: 10+ new E2E tests

**Manual Testing Checklist:**
- [ ] Generate resume/cover letter for approved job
- [ ] Click "Create Email Draft"
- [ ] Verify draft appears in Gmail
- [ ] Verify cover letter is email body
- [ ] Verify resume is attached correctly
- [ ] Edit and send draft from Gmail
- [ ] Verify application status updates to "sent"
- [ ] Verify communication is recorded

---

## Technical Architecture

### Backend Structure
```
backend/src/
├── main.rs (add email draft functionality)
│   ├── GmailDraftRequest struct
│   ├── GmailDraftResponse struct
│   ├── EmailDraft struct
│   ├── create_gmail_draft() function
│   ├── check_draft_status() function
│   ├── get_sent_message() function
│   └── 3 new API endpoints
└── tests/
    └── email_draft_tests.rs (new test module)
```

### Frontend Structure
```
frontend/src/
├── App.tsx (integrate email composer)
├── EmailComposer.tsx (new component)
└── e2e/tests/
    └── 15-email-composer.spec.ts (new test suite)
```

### Database Changes
```sql
-- New table
email_drafts (draft_id, application_id, gmail_draft_id, status, ...)

-- Updated tables
applications (+ draft_created_at, draft_url)
communications (+ gmail_draft_id)
```

---

## API Endpoints

### Email Draft Endpoints
- `POST /api/applications/{application_id}/create-draft`
  - Creates Gmail draft with cover letter and resume
  - Returns: `{ draft_id, gmail_draft_id, gmail_url, status }`

- `GET /api/applications/{application_id}/draft-status`
  - Checks if draft exists and if it was sent
  - Returns: `{ status: 'created'|'sent'|'deleted', sent_at? }`

- `DELETE /api/applications/{application_id}/draft`
  - Deletes draft from Gmail
  - Updates status in database

---

## Gmail API Integration

### Draft Creation Request
```json
POST https://gmail.googleapis.com/gmail/v1/users/me/drafts
{
  "message": {
    "raw": "<base64-encoded-MIME-message>"
  }
}
```

### MIME Message Structure
```
From: sam@samkirk.com
To: recruiter@company.com
Subject: Application for Senior Test Engineer - Sam Kirk

Content-Type: multipart/mixed; boundary="boundary123"

--boundary123
Content-Type: text/plain; charset="UTF-8"

[Cover letter text here]

--boundary123
Content-Type: application/octet-stream; name="resume.md"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="resume.md"

[Base64-encoded resume content]
--boundary123--
```

### OAuth Scopes Required
- `https://www.googleapis.com/auth/gmail.compose` (create/send drafts)
- `https://www.googleapis.com/auth/gmail.modify` (check draft status)

Already have: `gmail.readonly` from Phase 4 - need to add compose scope.

---

## Environment Variables

Add to `backend/.env`:
```bash
# Existing
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REDIRECT_URI=http://localhost:8080/auth/gmail/callback

# New for Phase 2.5 (update OAuth scope)
GMAIL_SCOPES=https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/gmail.compose,https://www.googleapis.com/auth/gmail.modify
```

### Google OAuth Setup Update
1. Go to Google Cloud Console → OAuth consent screen
2. Add additional scopes:
   - `https://www.googleapis.com/auth/gmail.compose`
   - `https://www.googleapis.com/auth/gmail.modify`
3. Re-authenticate in the app (Intake tab → "Authenticate with Gmail")

---

## Testing Strategy

### ⚠️ Testing Safety Requirements

**CRITICAL**: All automated test scripts that send Gmail messages MUST use a test recipient address to prevent accidental emails to real recruiters.

**Test Email Configuration**:
- **Test Recipient**: `MrBesterTester@gmail.com`
- **Usage**: ALL automated tests (backend unit tests, integration tests, E2E tests)
- **Override Mechanism**: Test scripts should override the actual reply-to email from job offers

**Production vs Test Separation**:
| Mode | Recipient Address | Approval Required | Use Case |
|------|------------------|-------------------|----------|
| **Test** | `MrBesterTester@gmail.com` | No (automated) | Backend tests, E2E tests, development testing |
| **Production** | Real recruiter email from job offer | Yes (manual) | Actual job applications |

**Implementation Notes**:
- Test fixtures should include `test_mode: true` flag
- When `test_mode = true`, override recipient to `MrBesterTester@gmail.com`
- When `test_mode = false`, use actual email from job offer (requires user approval)
- Backend handler should check environment variable (e.g., `TEST_MODE=true`) or request parameter

**Rationale**: Prevents embarrassing/unprofessional test emails from being sent to real companies during development and testing.

---

### Backend Tests (cargo test)
- **Unit Tests**:
  - MIME message construction
  - Base64 encoding/decoding
  - Draft request formatting
  - Status monitoring logic
  - **Test email override mechanism** (verify `MrBesterTester@gmail.com` is used)

- **Integration Tests**:
  - Gmail API draft creation (with mock)
  - Draft status checking
  - Communication recording
  - Status transitions
  - **Test mode recipient override** (ensure production emails never sent in tests)

- **Target**: 8+ new tests (including test email safety verification)

### Frontend Tests (Playwright)
- Email composer modal display
- Draft creation workflow
- Success/error states
- Status display in UI
- Integration with content generation
- End-to-end: Generate → Create Draft → Verify
- **Target**: 10+ new tests

### Manual Testing

**⚠️ IMPORTANT**: For manual testing, use test data with `MrBesterTester@gmail.com` as the recipient to avoid sending test emails to real recruiters.

1. **Happy Path** (with test email):
   - Generate content for test job (with `MrBesterTester@gmail.com` as contact)
   - Create draft → Open in Gmail → Verify recipient is test email → Send → Verify status

2. **Edge Cases**:
   - No content generated yet
   - Gmail API errors
   - Network failures
   - Large resume files
   - Special characters in subject/body
   - **Test mode verification**: Ensure production emails never sent during testing

3. **Status Monitoring**:
   - Draft created and not sent
   - Draft created and sent
   - Draft deleted before sending

4. **Production Verification** (use with extreme caution):
   - Only test with jobs you intend to actually apply to
   - Verify recipient email is correct before creating draft
   - Review draft thoroughly in Gmail before sending

---

## Success Criteria

### Functional Requirements (PRD 4.4)
- ✅ Email body is the cover letter
- ✅ Resume is attached in generated format
- ✅ Draft-based workflow for user approval
- ✅ Gmail Integration to create drafts
- ✅ Track when draft is created
- ✅ Monitor for sent status
- ✅ Record sent email in Communications table
- ✅ Update application status to "sent"

### Completion Checklist
- [ ] Can create Gmail draft from approved job
- [ ] Cover letter appears as email body
- [ ] Resume attached correctly
- [ ] Gmail draft opens in browser
- [ ] Can edit draft in Gmail before sending
- [ ] Sending draft updates application status
- [ ] Communication recorded with full details
- [ ] All 18+ new tests passing (8 backend + 10 E2E)
- [ ] Documentation updated
- [ ] **End-to-end workflow complete**: Intake → Filter → Approve → Generate → **Draft** → Send → Track

---

## Known Challenges & Solutions

### Challenge 1: MIME Message Construction
**Issue**: Gmail API requires properly formatted MIME messages with base64 encoding.
**Solution**: Use Rust crates: `mime`, `base64`, `lettre` (email library) for message building.

### Challenge 2: OAuth Scope Updates
**Issue**: Users who already authenticated will need to re-authenticate with new scopes.
**Solution**: Clear instructions in UI, automatic detection of missing scopes, prompt to re-auth.

### Challenge 3: Resume Format
**Issue**: PRD says "attach resume in whatever format was generated" (currently Markdown).
**Solution**: Detect format from content generation, attach as `.md` file. Future: support PDF conversion.

### Challenge 4: Draft Status Monitoring
**Issue**: No webhook for "draft sent" - must poll Gmail API.
**Solution**: Check draft status when user views application, or periodic background job (Phase 2.6).

### Challenge 5: Email Rate Limits
**Issue**: Gmail API has sending limits (500/day for free tier).
**Solution**: Not a concern for individual use case (typically <10 applications/day). Add rate limit warning in UI if needed.

---

## Integration with Existing Features

### Phase 4 (Gmail Integration)
- **Reuses**: OAuth credentials, token refresh, Gmail API client
- **Extends**: Add compose/modify scopes

### Phase 3 (Content Generation)
- **Consumes**: Generated resume and cover letter
- **Triggers on**: "Generate Resume & Cover Letter" → "Create Email Draft"

### Phase 2.4 (Calendar & Follow-ups)
- **Coordinates with**: Application tracking, communication history
- **Future**: Link draft creation to follow-up schedule

---

## Future Enhancements (Post Phase 2.5)

### Phase 2.6 Ideas:
1. **Automatic Draft Status Monitoring**
   - Background job to check all drafts every 30 minutes
   - Auto-update status when sent

2. **PDF Resume Export**
   - Convert Markdown resume to PDF before attaching
   - Use `pandoc` or Rust PDF libraries

3. **Email Templates**
   - Multiple cover letter templates
   - Template selection per job

4. **Batch Draft Creation**
   - Create drafts for multiple approved jobs at once
   - Queue management

5. **Email Analytics**
   - Track open rates (requires tracking pixels - privacy concern)
   - Response time tracking
   - Success rates by job source

---

## Progress Log

### October 9, 2025 - Session 1: Planning & Documentation

**Documentation**
- ✅ Created PHASE_2.5_email-composition.md
- ✅ Consolidated gap analysis into Phase 2.5 plan
- ✅ Aligned with existing phase structure (follows Phase 2.x format)
- ⏳ Need to update README.md Implementation Status
- ⏳ Need to delete GAP_ANALYSIS.md

**Next Steps**
- [ ] Update README.md to add Phase 2.5 section
- [ ] Delete GAP_ANALYSIS.md (content now in Phase 2.5)
- [ ] Begin backend implementation: Gmail draft API
- [ ] Create database migration for email_drafts table
- [ ] Implement create_gmail_draft() function
- [ ] Add API endpoints
- [ ] Write backend tests
- [ ] Implement frontend EmailComposer component
- [ ] Write E2E tests
- [ ] Manual testing and validation

---

## Estimated Timeline

**Total: 2-3 days** (16-24 hours of development time)

**Day 1** (8 hours):
- Backend: Gmail draft API (4h)
- Database: Schema updates (1h)
- Backend: Tests (3h)

**Day 2** (8 hours):
- Frontend: EmailComposer component (4h)
- Frontend: UI integration (2h)
- Frontend: E2E tests (2h)

**Day 3** (4-8 hours):
- Manual testing (2h)
- Bug fixes and polish (2h)
- Documentation updates (2h)
- Optional: PDF export feature (4h)

---

## PRD Alignment

This phase completes **PRD Section 4.4: Email Composition & Sending**, which is the last major requirement from the original Product Requirements Document.

**PRD Section 4.4 Requirements:**
- [✓] Email body is the cover letter
- [✓] Resume is attached
- [✓] Draft-based workflow for user approval
- [✓] Gmail Integration to create drafts
- [✓] Track draft creation and monitor sent status
- [✓] Record in Communications table
- [✓] Update application status

**After Phase 2.5:**
- ✅ **100% of PRD core requirements complete**
- ✅ **Full end-to-end workflow operational**
- ✅ **Ready for production use**

---

## References

- **PRD Section 4.4**: Email Composition & Sending (docs/PRD.md:70-83)
- **Phase 2.4**: Calendar & Follow-ups (completed October 1, 2025)
- **Phase 4**: Automated Job Intake with Gmail integration (completed)
- **Gmail API Docs**: https://developers.google.com/gmail/api/guides/drafts
- **MIME RFC**: https://tools.ietf.org/html/rfc2045 (multipart messages)
