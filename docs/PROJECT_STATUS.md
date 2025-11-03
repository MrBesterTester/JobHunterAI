<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [JobHunter Project Status](#jobhunter-project-status)
  - [⚠️ Important: Phase Execution Order](#-important-phase-execution-order)
  - [Current State](#current-state)
  - [Recommended Next Steps](#recommended-next-steps)
    - [Option A: Phase 2.7 Continuation (Microsoft Email Source)](#option-a-phase-27-continuation-microsoft-email-source)
    - [Option B: Phase 5 Planning](#option-b-phase-5-planning)
    - [Option C: Phase 4 Extensions](#option-c-phase-4-extensions)
  - [Development Progress by Execution Order](#development-progress-by-execution-order)
    - [✅ Layer 1: Foundation (Complete)](#-layer-1-foundation-complete)
    - [✅ Layer 2: Job Intake (Complete)](#-layer-2-job-intake-complete)
    - [✅ Layer 3: Job Processing (Complete)](#-layer-3-job-processing-complete)
    - [✅ Layer 4: Content Generation (Complete)](#-layer-4-content-generation-complete)
    - [✅ Layer 5: Application Submission (Complete)](#-layer-5-application-submission-complete)
    - [✅ Layer 6: Follow-up Management (Complete)](#-layer-6-follow-up-management-complete)
  - [Detailed Phase Status](#detailed-phase-status)
    - [Phase 2 Sub-Phases (Email Integration)](#phase-2-sub-phases-email-integration)
    - [Phase 3: Content Generation](#phase-3-content-generation)
    - [Phase 4: Job Board Integrations](#phase-4-job-board-integrations)
    - [Phase 5: Advanced Features](#phase-5-advanced-features)
  - [Testing Status](#testing-status)
  - [Bug Tracking](#bug-tracking)
  - [Project Metrics](#project-metrics)
  - [Related Documentation](#related-documentation)
    - [Primary Documents](#primary-documents)
    - [Phase Plans (By Execution Order)](#phase-plans-by-execution-order)
    - [Deferred/Future](#deferredfuture)
    - [Testing Documentation](#testing-documentation)
    - [Bug Tracking](#bug-tracking-1)
    - [Helper Scripts](#helper-scripts)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# JobHunter Project Status

**Last Updated**: 2025-11-03 15:04:17 PST (Phase 2.7 testing framework complete - manual validation pending)

---

## ⚠️ Important: Phase Execution Order

**Phase numbers are historical, NOT sequential by dependencies.**

📖 **See [PHASE_EXECUTION_ORDER.md](PHASE_EXECUTION_ORDER.md) for the correct dependency chain and what to work on next.**

---

## Current State

**Development Stage**: Core Workflow Complete - Validation & Enhancement Phase

**Functional Completeness**: 🎯 **~95% of Core PRD Requirements Implemented**

**Testing Infrastructure**: ✅ **EXCELLENT**
- Backend Tests: 158/158 passing (100%)
- Frontend Unit Tests: 473/481 passing (98.3%) - 8 intentionally skipped
- Frontend Coverage: 78.3% overall (exceeded 60% goal by 18.3 points!)
- E2E Tests: 359/529 passing (67.9%) - Core workflows validated (+16 Phase 2.5 tests)
- E2E Runtime: 11 min wall clock / 15.9 min Playwright reported
- All 12 components above 75% coverage (none below 60%)

**Recent Achievements** (Last 14 days - since 2025-10-20):
- ✅ Phase 2.7 FOLDER FILTERING COMPLETE (2025-11-03) - Automatic JobOps folder creation and management
- ✅ Phase 2.5 VALIDATION COMPLETE (2025-11-03) - All 16 E2E tests passing with API mocks
- ✅ Phase 2.4 COMPLETE (2025-11-01) - Calendar, Follow-ups, Gmail send with TEST_MODE
- ✅ Phase 2.5 Implementation COMPLETE (2025-11-01) - Email composition feature
- ✅ ISSUE-012: Zero-warning builds (2025-10-31) - All 90 Rust warnings eliminated
- ✅ BUG-0008: Phase 2.4 E2E tests (2025-10-31) - 98.6% pass rate
- ✅ ISSUE-026: RSBuild migration (2025-10-29) - 5x build speed improvement
- ✅ Testing infrastructure (ISSUE-018, 023, 024, 025) - All complete

**See**: [PROJECT_HISTORY.md](PROJECT_HISTORY.md) for detailed historical records

**Open Issues**: 2 bugs/issues (all infrastructure and quality issues resolved!)
- BUG-0007: Phase 5 feature - Refresh Descriptions button (low)
- ISSUE-010: CLAUDE.md token usage optimization (low)

---

## Recommended Next Steps

**🎉 All core workflows complete!** The application implements the full job application workflow from email intake through draft creation.

**Current Status**: All 6 dependency layers complete and validated with E2E tests.

### Option A: Phase 2.7 Continuation (Microsoft Email Source)

**Status**: 🔄 **In Progress** (~95% complete - Testing framework complete, manual validation pending as of 2025-11-03)

**Business Case**: Complete the professional relationship lifecycle tracking

The two email accounts serve different phases of the professional workflow:

1. **MrBesterTester@gmail.com** (Gmail) - **Prospecting Phase** (✅ implemented)
   - High-volume job listings from recruiters, job boards, newsletters
   - Initial discovery and qualification
   - Lower signal-to-noise ratio

2. **sam@samkirk.com** (Microsoft) - **Professional Engagement Phase** (✅ **Implementation complete - Testing pending**)
   - Serious job negotiations and consulting retainers
   - Employee onboarding and professional follow-ups
   - Higher signal-to-noise ratio, business-critical communications

**Completed (2025-11-03)**:
- ✅ Azure App Registration (multitenant + personal accounts)
- ✅ OAuth 2.0 endpoints (`/api/email/microsoft/auth-url`, `/callback`)
- ✅ Token storage with tenant-specific authentication
- ✅ Database migration (`microsoft_email` source, `email_jobs.source` column)
- ✅ OAuth test page and setup documentation
- ✅ Successfully authenticated with sam@samkirk.com (Microsoft 365 custom domain)
- ✅ **Message fetching via Microsoft Graph API** (~450 lines)
  - `sync_microsoft_jobs()` endpoint - Main sync orchestrator
  - `process_microsoft_messages()` - Fetches and processes messages
  - `refresh_microsoft_token()` - OAuth token refresh with tenant auth
  - `mark_microsoft_message_as_read()` - Message status management
  - Microsoft Graph API data structures (MicrosoftMessage, etc.)
- ✅ **Email parsing and LLM integration**
  - Reuses Phase 2.6 extraction pipeline
  - Same filtering logic (confidence > 0.3)
  - MECE counter validation
- ✅ **API endpoint**: `POST /api/intake/microsoft/sync`
- ✅ **First sync test**: 10 emails discovered, 7 jobs created, 0 failures
- ✅ **Frontend UI integration** (~161 lines)
  - handleMicrosoftAuth() and handleMicrosoftSync() handlers
  - Microsoft Email Integration Card
  - Status indicators and sync buttons
  - Microsoft branding (#0078d4 color)
  - Consistent with Gmail card design
- ✅ **Folder filtering with automatic JobOps folder management** (~200 lines)
  - `list_microsoft_folders()` - Lists all mail folders via Graph API
  - `get_or_create_jobops_folder()` - **Automatically checks and creates JobOps folder**
  - Folder-based message filtering (`/me/mailFolders/{id}/messages`)
  - API endpoint: `GET /api/email/microsoft/folders`
  - Frontend folder status indicator showing unread count
  - Syncs only process emails in JobOps folder (reduces noise and LLM costs)
- ✅ **Backend Unit Tests** (2025-11-03) - 8/8 tests passing (100%)
  - OAuth credential storage and token expiration
  - Email job processing with microsoft_email source
  - Message deduplication and job linkage
  - Database schema validation
  - Test file: `backend/tests/microsoft_email_tests.rs` (462 lines)
- ✅ **E2E Test Framework** (2025-11-03) - 13 tests created
  - UI display, branding, authentication
  - Folder status and source differentiation
  - Error handling and integration tests
  - Test file: `frontend/e2e/tests/16-microsoft-email-integration.spec.ts` (197 lines)

**Remaining Tasks to Complete Phase 2.7** (~50 minutes - Manual Testing Only):
1. ⏸️ **Manual OAuth Testing** (~15 min)
   - Authenticate with sam@samkirk.com and verify OAuth flow
2. ⏸️ **Manual Sync Testing** (~20 min)
   - Add test emails to JobOps folder and run sync
   - Verify job extraction and folder management
3. ⏸️ **End-to-End Validation** (~10 min)
   - Complete OAuth → Sync → Extract → Approve → Draft workflow
4. ⏸️ **Error Handling** (~5 min)
   - Test expired token and error scenarios

**See detailed manual testing checklist in** [PHASE_2.7 Testing Strategy](PHASE_2.7_samkirk-email-source-plan.md#testing-strategy)

**Value**: Unified tracking across complete lifecycle: prospecting → engagement → hiring

**Documentation**: [PHASE_2.7](PHASE_2.7_samkirk-email-source-plan.md)

### Option B: Phase 5 Planning
- **Prerequisites**: ✅ All core workflows complete
- **Scope**: Define analytics, mobile support, advanced features
- **Effort**: 1-2 days planning
- **Value**: Roadmap for future enhancements based on real usage patterns
- **Timing**: After Phase 2.7 implementation

### Option C: Phase 4 Extensions
- **Status**: Phase 4.1 complete (RapidAPI JSearch)
- **Available**: Phase 4.2+ (automatic paging, enhanced filtering)
- **Priority**: Low (current functionality sufficient)
- **Timing**: Can be done anytime based on need

---

## Development Progress by Execution Order

**Note**: This section organizes phases by dependency order, not phase numbers.
See [PHASE_EXECUTION_ORDER.md](PHASE_EXECUTION_ORDER.md) for visual dependency chain.

### ✅ Layer 1: Foundation (Complete)

| Feature | Phase # | Status | Completed | Doc |
|---------|---------|--------|-----------|-----|
| Core System | Phase 1 | ✅ Complete | Historic | [PHASE_1](PHASE_1_core-system.md) |

### ✅ Layer 2: Job Intake (Complete)

| Feature | Phase # | Status | Completed | Doc |
|---------|---------|--------|-----------|-----|
| Gmail Integration | Phase 2 (base) | ✅ Complete | Historic | Part of Phase 2 |
| RapidAPI JSearch | Phase 4.1 | ✅ Complete | 2025-10-23 | [PHASE_4.1](PHASE_4.1_job-board-rapidAPI.md) |

**Deferred**:
- Microsoft Email Source (Phase 2.7) - Not needed yet, can add later

### ✅ Layer 3: Job Processing (Complete)

| Feature | Phase # | Status | Completed | Doc |
|---------|---------|--------|-----------|-----|
| LLM Job Extraction | Phase 2.6 | ✅ Complete | 2025-10-11 | [PHASE_2.6](PHASE_2.6_llm-job-extraction.md) |
| Job Scoring/Filtering | Built-in | ✅ Complete | Historic | N/A |

### ✅ Layer 4: Content Generation (Complete)

| Feature | Phase # | Status | Completed | Doc |
|---------|---------|--------|-----------|-----|
| Resume & Cover Letter LLM | Phase 3.1 | ✅ Complete | Historic | [PHASE_3.1](PHASE_3.1_claude-haiku-integration-plan.md) |

**🔗 Critical Dependency**: Layer 5 (Email Composition) requires this layer

### ✅ Layer 5: Application Submission (Complete)

| Feature | Phase # | Status | Implementation | Validation | Doc |
|---------|---------|--------|----------------|------------|-----|
| Email Composition | Phase 2.5 | ✅ Complete | ✅ Complete | ✅ Complete | [PHASE_2.5](PHASE_2.5_email-composition.md) |

**Phase 2.5 Details**:
- **Code Status**: 100% complete
  - Backend: `create_gmail_draft()`, MIME construction, Gmail API integration
  - Frontend: EmailComposer component (404 lines)
  - Database: `email_drafts` table
  - Integration: Fully wired into UI
- **Testing Status**: ✅ ALL TESTS PASSING
  - Unit Tests: 34/34 passing (3 backend + 31 frontend)
  - E2E Tests: 16/16 passing (44.2s runtime with mocked API)
  - Test Strategy: API mocking for instant, reliable tests
- **Validation**: ✅ Completed 2025-11-03
  - E2E tests passing with mocked content generation
  - Fast test execution (~7-17s per test)
  - No dependency on live LLM API calls

**Dependencies**:
- ✅ **Prerequisite**: Phase 3.1 (Content Generation) - COMPLETE
- 🚀 **Blocks**: None (last phase in application workflow)

### ✅ Layer 6: Follow-up Management (Complete)

| Feature | Phase # | Status | Completed | Doc |
|---------|---------|--------|-----------|-----|
| Calendar & Follow-ups | Phase 2.4 | ✅ Complete | 2025-11-01 | [PHASE_2.4](PHASE_2.4_calendar-follow-ups.md) |

**Phase 2.4 Highlights**:
- Google Calendar OAuth integration
- Interview scheduling with automatic calendar events
- Follow-up email system with template rendering
- Gmail send integration with TEST_MODE safety
- E2E Tests: 68/69 passing (98.6%)

---

## Detailed Phase Status

### Phase 2 Sub-Phases (Email Integration)

⚠️ **Note**: "Phase 2" includes unrelated features across different layers:
- 2.4: Application Tracking (Layer 6) ✅
- 2.5: Email Composition (Layer 5) 🔄
- 2.6: Job Extraction (Layer 3) ✅
- 2.7: Email Source (Layer 2) 📋

| Sub-Phase | Title | Layer | Status | Progress | Completed | Doc |
|-----------|-------|-------|--------|----------|-----------|-----|
| 2.4 | Calendar & Follow-ups | 6 | ✅ Complete | 100% | 2025-11-01 | [PHASE_2.4](PHASE_2.4_calendar-follow-ups.md) |
| 2.5 | Email Composition | 5 | ✅ Complete | 100% | 2025-11-03 | [PHASE_2.5](PHASE_2.5_email-composition.md) |
| 2.6 | LLM Job Extraction | 3 | ✅ Complete | 100% | 2025-10-11 | [PHASE_2.6](PHASE_2.6_llm-job-extraction.md) |
| 2.7 | Microsoft Email Source | 2 | 🔄 In Progress | 35% | N/A | [PHASE_2.7](PHASE_2.7_samkirk-email-source-plan.md) |

**Phase 2.4 Details** (Calendar & Follow-ups):
- ✅ Google Calendar OAuth (373 lines): OAuth 2.0 flow, token refresh
- ✅ Calendar Service (319 lines): Full CRUD for calendar events
- ✅ Email Follow-up System: Template rendering, Gmail API integration
- ✅ Frontend UI: CalendarTab, FollowupsTab, TimelineView
- ✅ E2E Tests: 68/69 passing (98.6%)
- ⏸️ **Deferred**: Extended status system, response tracking (require DB migrations)

**Phase 2.5 Details** (Email Composition):
- ✅ **Backend Implementation** (150+ lines):
  - `create_gmail_draft()`: MIME message construction with attachments
  - Base64 encoding for resume files
  - Gmail API integration with OAuth token refresh
  - 3 API endpoints: `/create-draft`, `/draft-status`, `/draft` (DELETE)
  - Communication logging, status updates
- ✅ **Frontend Implementation** (404 lines):
  - EmailComposer component: recipient field, subject, cover letter preview
  - Resume attachment indicator (filename, size)
  - Success/error states, loading indicators
  - "Open in Gmail" link after draft creation
  - Integrated into content generation modal
- ✅ **Database**:
  - `email_drafts` table: draft_id, gmail_draft_id, recipient_email, subject, status, timestamps
  - `applications` table updates: draft_created_at, draft_url
  - `communications` table: gmail_draft_id linking
- ✅ **Testing**: ✅ ALL TESTS PASSING
  - Backend: 3 unit tests (serialization/deserialization)
  - Frontend: 31 unit tests (100% component coverage)
  - E2E: 16/16 passing (44.2s runtime with mocked API)
  - Test Strategy: API mocking for instant, reliable tests
- **Validation**: ✅ Completed 2025-11-03
  - E2E tests passing with mocked content generation
  - Fast test execution (~7-17s per test)
  - No dependency on live LLM API calls

**Phase 2.6 Details** (LLM Job Extraction):
- ✅ Claude 3.5 Haiku integration for email parsing
- ✅ MECE counter system (completed 2025-10-13)
- ✅ Progressive email processing (completed 2025-10-13)
- ✅ Trade-off based evaluation display (completed 2025-10-14)
- 📋 Sub-phase 2.6.3: Gmail label filtering (proposed, not started)

**Phase 2.7 Details** (Microsoft Email Source):
- **Status**: 🔄 **In Progress** (~90% complete - Folder filtering complete 2025-11-03)
- **Feature**: sam@samkirk.com as job source via Microsoft Graph API
- **Completed**:
  - ✅ Azure App Registration (multitenant + personal accounts)
  - ✅ OAuth 2.0 endpoints (`/api/email/microsoft/auth-url`, `/callback`)
  - ✅ Token storage with tenant-specific authentication
  - ✅ Database migration (`microsoft_email` source, `email_jobs.source` column)
  - ✅ OAuth test page (`microsoft-oauth.html`) and documentation
  - ✅ Successfully authenticated with sam@samkirk.com (Microsoft 365 custom domain)
  - ✅ Message fetching implementation (~450 lines)
    - `sync_microsoft_jobs()` - Main sync endpoint
    - `process_microsoft_messages()` - Fetch & process via Graph API
    - `refresh_microsoft_token()` - Token refresh with tenant auth
    - `mark_microsoft_message_as_read()` - Message status updates
  - ✅ Email parsing and LLM extraction integration
  - ✅ API endpoint: `POST /api/intake/microsoft/sync`
  - ✅ First sync: 10 emails processed, 7 jobs created, 0 failures
  - ✅ Frontend UI integration (~161 lines)
    - Microsoft Email Integration Card in IntakeTab
    - handleMicrosoftAuth() and handleMicrosoftSync() handlers
    - Status indicators, sync buttons, settings
  - ✅ **Folder filtering with automatic JobOps folder management** (~200 lines)
    - `list_microsoft_folders()` - Lists all mail folders
    - `get_or_create_jobops_folder()` - Automatic folder creation
    - Folder-based message filtering
    - API endpoint: `GET /api/email/microsoft/folders`
    - Frontend folder status display with unread count
- **Next Steps** (~1-2 hours remaining):
  - ⏭️ Unit and E2E tests for folder management and sync flow

### Phase 3: Content Generation

| Feature | Phase # | Status | Progress | Doc |
|---------|---------|--------|----------|-----|
| Resume & Cover Letter LLM | Phase 3.1 | ✅ Complete | 100% | [PHASE_3.1](PHASE_3.1_claude-haiku-integration-plan.md) |

**Phase 3.1 Highlights**:
- Claude 3.5 Haiku for resume and cover letter generation
- Job-specific content customization
- Prompt engineering with role-based templates
- Cost-optimized ($0.25/application avg)
- ✅ **Critical for Phase 2.5** (Email Composition depends on this)

### Phase 4: Job Board Integrations

| Feature | Phase # | Status | Progress | Completed | Doc |
|---------|---------|--------|----------|-----------|-----|
| RapidAPI JSearch | Phase 4.1 | ✅ Complete | 100% | 2025-10-23 | [PHASE_4.1](PHASE_4.1_job-board-rapidAPI.md) |

**Phase 4.1 Details**:
- ✅ RapidAPI JSearch integration (aggregates 30+ job boards)
- ✅ 10 jobs per sync, 200 requests/month free tier
- ✅ Backend tests: 11/11 passing
- ✅ E2E tests: 5/5 passing
- ✅ Two independent job sources: Gmail + RapidAPI

**Phase 4.2+ Extensions** (Optional, Low Priority):
- Automatic page tracking (4-6 hours)
- Enhanced filtering
- Increased sync limits (paid tier)
- Additional specialized APIs

### Phase 5: Advanced Features

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Analytics | ⏸️ Not Started | Low | Application success rates, response time tracking |
| Mobile Support | ⏸️ Not Started | Low | Responsive design enhancements |
| Advanced Scheduling | ⏸️ Not Started | Low | Automated follow-up management |

**Note**: BUG-0007 (Refresh Descriptions feature) has E2E tests ready - re-enable when implementing

---

## Testing Status

**Current Test Results** (2025-11-01):
- **Backend**: 158/158 tests passing (100%)
- **Frontend Unit**: 473/481 tests passing (98.3%) - 8 intentionally skipped
- **Frontend Coverage**: 78.3% overall (6942/8865 statements)
- **E2E Suite**: 343/529 tests passing (64.8%)
  - Core workflows: 153 tests (✅ all passing)
  - Feature tests: 129 tests (mostly passing)
  - Quality tests: 63 tests (✅ all passing)
  - UI/Styling: 123 tests (⏸️ intentionally disabled)
  - Runtime: 11 min wall clock / 15.9 min Playwright reported

**Coverage by Component** (All above 75%):
- TimelineView.tsx: 100%
- DuplicatesTab.tsx: 99.36%
- **EmailComposer.tsx: 99.25%** ← Phase 2.5
- FollowupsTab.tsx: 98.43%
- RankedJobsTab.tsx: 96.36%
- App.tsx: 86.4% ✅ (exceeded 60% goal!)
- IntakeTab.tsx: 77.89%

**Test Infrastructure**:
- ✅ ISSUE-018: Frontend unit tests (CLOSED)
- ✅ ISSUE-023: State propagation (CLOSED)
- ✅ ISSUE-024: Coverage gaps (CLOSED)
- ✅ ISSUE-025: E2E test suite health (CLOSED)
- ✅ ISSUE-026: RSBuild migration (CLOSED - 2025-10-29)

**See**: [TESTING_STATUS.md](TESTING_STATUS.md) for comprehensive testing progress

---

## Bug Tracking

**Total Bugs**: 38 (2 open, 4 mitigated, 32 fixed)

**Priority Breakdown**:
- Critical: 1
- High: 7
- Medium: 17
- Low: 11
- Unknown: 2

**Recent Fixes** (Last 12 days):
- ISSUE-012: Zero-warning builds (2025-10-31) - All 90 Rust warnings fixed
- BUG-0008: Phase 2.4 E2E tests (2025-10-31) - 98.6% pass rate
- BUG-0004: "All" tab E2E failures (2025-10-30) - Fixed by ISSUE-017
- BUG-0003: Modal reopen issue (2025-10-30) - Fixed by ISSUE-023
- ISSUE-006: Brittle placeholder validation (2025-10-30)
- ISSUE-026: RSBuild migration (2025-10-29) - 5x build improvement

**See**: [bugs/README.md](../bugs/README.md) for complete bug index

---

## Project Metrics

**Codebase Size**:
- Backend (Rust): ~7,970 LOC
- Frontend (TypeScript/React): ~8,900 LOC (excluding tests)
- Frontend Tests: ~18,570 LOC
- **Phase 2.5 Addition**: +558 LOC (404 component + 514 tests + 150 backend)

**Test Coverage**:
- Backend: 158 tests (100% passing)
- Frontend: 481 tests (98.3% pass rate)
- E2E Core: 343/529 passing (64.8%)

**Bug Tracking**:
- Total Tracked: 38 bugs/issues
- Fix Rate: 84% (32/38 fixed)
- Open: 2 (both low priority)

**Development Velocity** (Last 12 days):
- Commits: ~68 commits
- Issues Closed: 7 major issues
- Tests Created: 481 unit tests (from zero)
- Code Quality: Zero-warning builds achieved
- Features Completed: 2 major phases (2.4, 2.5)

---

## Related Documentation

### Primary Documents
- **[PHASE_EXECUTION_ORDER.md](PHASE_EXECUTION_ORDER.md)** ⭐ **NEW** - Correct dependency chain
- [CLAUDE.md](../CLAUDE.md) - Developer preferences and project guidance
- [PROJECT_HISTORY.md](PROJECT_HISTORY.md) - Historical milestone records
- [README.md](../README.md) - End-user getting started guide
- [README_dev.md](../README_dev.md) - Developer workflows and scripts

### Phase Plans (By Execution Order)
1. [PHASE_1: Core System](PHASE_1_core-system.md) ✅
2. Gmail Integration (base Phase 2) ✅
3. [PHASE_4.1: RapidAPI JSearch](PHASE_4.1_job-board-rapidAPI.md) ✅
4. [PHASE_2.6: LLM Job Extraction](PHASE_2.6_llm-job-extraction.md) ✅
5. [PHASE_3.1: Content Generation](PHASE_3.1_claude-haiku-integration-plan.md) ✅
6. [PHASE_2.4: Calendar & Follow-ups](PHASE_2.4_calendar-follow-ups.md) ✅
7. [PHASE_2.5: Email Composition](PHASE_2.5_email-composition.md) 🔄

### Deferred/Future
- [PHASE_2.7: Microsoft Email Source](PHASE_2.7_samkirk-email-source-plan.md) 📋
- Phase 5: Advanced Features (TBD)

### Testing Documentation
- [TESTING_STATUS.md](TESTING_STATUS.md) - Comprehensive test progress
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Investigation examples and tutorials

### Bug Tracking
- [Bug Index](../bugs/README.md) - Auto-generated bug list
- [Open Issues](../bugs/open/) - Active bugs requiring attention
- [Fixed Issues](../bugs/fixed/) - Resolved bugs archive

### Helper Scripts
- `./create-bug.sh` - Create new bug/issue
- `./move-bug.sh` - Move bugs between states
- `./tag-session.sh` - Tag work sessions
- `./system-health-check.sh` - Monitor system resources
- `./switch-to-personal.sh` - Switch to personal database

---

**Last Updated**: 2025-11-03 15:04:17 PST (Phase 2.7 testing framework complete - manual validation pending)

**Major Updates in This Revision**:
- Phase 2.7: Testing framework complete (~95% complete)
  - Backend unit tests: 8/8 passing (100%) - `backend/tests/microsoft_email_tests.rs` (462 lines)
  - E2E test framework: 13 tests created - `frontend/e2e/tests/16-microsoft-email-integration.spec.ts` (197 lines)
  - Manual testing checklist documented in PHASE_2.7 doc
  - Remaining: ~50 minutes of manual OAuth and sync validation
- Updated PROJECT_STATUS.md with Phase 2.7 testing status and next steps
- Updated PHASE_2.7 doc with comprehensive testing strategy

**Manual Updates**: This is a manually maintained document - update as needed

**For detailed historical records**, see: [PROJECT_HISTORY.md](PROJECT_HISTORY.md)
**For dependency chain**, see: [PHASE_EXECUTION_ORDER.md](PHASE_EXECUTION_ORDER.md)
