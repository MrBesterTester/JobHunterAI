<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Comprehensive Test Preflight Checklist Research](#comprehensive-test-preflight-checklist-research)
  - [Executive Summary](#executive-summary)
  - [Current Test Behavior Analysis](#current-test-behavior-analysis)
    - [Backend Tests (Rust/Cargo)](#backend-tests-rustcargo)
    - [E2E Tests (Playwright)](#e2e-tests-playwright)
    - [Auto-Test-Plan Documentation](#auto-test-plan-documentation)
  - [User's Proposed Preflight Checklist](#users-proposed-preflight-checklist)
    - [1. Git Status](#1-git-status)
    - [2. Database Selection](#2-database-selection)
    - [3. Database State](#3-database-state)
    - [4. Gmail State](#4-gmail-state)
    - [5. Microsoft Mail State](#5-microsoft-mail-state)
  - [Analysis: Conflicts and Questions](#analysis-conflicts-and-questions)
    - [Conflict #1: Database Cleared vs Tests Expecting Data](#conflict-1-database-cleared-vs-tests-expecting-data)
    - [Conflict #2: Gmail/MS Mail State](#conflict-2-gmailms-mail-state)
  - [Email Integration Tests Research](#email-integration-tests-research)
    - [Gmail Tests](#gmail-tests)
    - [Microsoft Email Tests](#microsoft-email-tests)
  - [Recommended Preflight Checklist (Draft v1)](#recommended-preflight-checklist-draft-v1)
    - [1. Git Status ✅](#1-git-status-)
    - [2. Database Selection ✅](#2-database-selection-)
    - [3. Database State 🔄](#3-database-state-)
    - [4. Gmail State ⚠️](#4-gmail-state-)
    - [5. Microsoft Email State ⚠️](#5-microsoft-email-state-)
  - [Decisions Made (2025-11-07)](#decisions-made-2025-11-07)
    - [1. Automation Level](#1-automation-level)
    - [2. Database Strategy](#2-database-strategy)
    - [3. Preflight Requirements](#3-preflight-requirements)
    - [4. OAuth Token Management](#4-oauth-token-management)
  - [Implementation Plan](#implementation-plan)
    - [File Structure](#file-structure)
    - [Components to Implement](#components-to-implement)
      - [1. Database Fixtures (`database/test-fixtures.sql`)](#1-database-fixtures-databasetest-fixturessql)
      - [2. OAuth Setup Script (`helper-scripts/setup-test-oauth.sh`)](#2-oauth-setup-script-helper-scriptssetup-test-oauthsh)
      - [3. Token Refresh Script (`helper-scripts/refresh-oauth-tokens.sh`)](#3-token-refresh-script-helper-scriptsrefresh-oauth-tokenssh)
      - [4. Gmail State Script (`helper-scripts/clear-gmail-state.sh`)](#4-gmail-state-script-helper-scriptsclear-gmail-statesh)
      - [5. MS Mail State Script (`helper-scripts/setup-msmail-state.sh`)](#5-ms-mail-state-script-helper-scriptssetup-msmail-statesh)
      - [6. Database Scripts](#6-database-scripts)
      - [7. Updated Preflight (`run-comprehensive-tests.sh`)](#7-updated-preflight-run-comprehensive-testssh)
    - [Security Considerations](#security-considerations)
      - [`.env.test` Example (gitignored)](#envtest-example-gitignored)
      - [`.gitignore` Update](#gitignore-update)
    - [API Implementation Details](#api-implementation-details)
      - [Gmail API (using `curl` + `jq`)](#gmail-api-using-curl--jq)
      - [MS Graph API (using `curl` + `jq`)](#ms-graph-api-using-curl--jq)
  - [Next Steps for Implementation](#next-steps-for-implementation)
  - [Appendix: Test Files Analyzed](#appendix-test-files-analyzed)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Comprehensive Test Preflight Checklist Research

**Purpose**: Document the initial conditions required for running comprehensive test suite

**Created**: 2025-11-07
**Status**: Draft - Needs review and refinement

---

## Executive Summary

Based on research of test files and the auto-test-plan, the comprehensive test suite requires specific initial conditions to run reliably. This document analyzes what those conditions should be.

---

## Current Test Behavior Analysis

### Backend Tests (Rust/Cargo)

**Location**: `backend/tests/*.rs`

**Database Handling**:
- Tests use `cleanup_test_data()` functions that DELETE rows based on patterns:
  - `email_jobs` where `sender_email LIKE 'test%@example.com'`
  - `jobs` where `company LIKE 'Test%'`
  - `api_job_sources` where `external_job_id LIKE '%test%'`
  - `job_intake_logs` where `sync_status = 'test'`
  - `job_sources` where `source_name LIKE '%_test'`
- Tests connect to `TEST_DATABASE_URL` env var (defaults to `jobhunter_test` database)
- Each test does cleanup BEFORE running (not after)

**Key Insight**: Backend tests are **self-cleaning** but expect to **start with existing data intact**. They only clean up their own test patterns.

### E2E Tests (Playwright)

**Location**: `frontend/e2e/tests/*.spec.ts`

**Setup** (from `global-setup.ts`):
1. Check if backend is running (or start it)
2. Call `POST /api/jobs/calculate-all-scores` to pre-calculate scores
3. Individual tests seed their own data via API calls

**Database Handling**:
- Tests do NOT clear database
- Tests expect jobs to exist (for testing UI)
- Some tests create specific jobs via API
- One test deletes a specific job by ID after test

**Key Insight**: E2E tests **expect existing job data** for UI testing. They don't require empty database.

### Auto-Test-Plan Documentation

**From `README_auto-test-plan.md` - "Test Database Setup" section**:

- Mentions "Fresh database state for each test suite"
- Mentions "Fixture Management: Consistent test data across all test scenarios"
- Mentions `test-fixtures.sql` file (but this file doesn't exist in project)
- Proposes `jobhunter_test` database on port 5433

**Key Insight**: Plan describes ideal state, but actual tests diverge from this.

---

## User's Proposed Preflight Checklist

From conversation with user:

### 1. Git Status
- **Requirement**: No uncommitted changes
- **Reason**: Ensure clean baseline for comprehensive test run
- **Status**: ✅ Implemented in script

### 2. Database Selection
- **Requirement**: `jobhunter_personal` database only (for now)
- **Reason**: `jobhunter_test` or shared `jobhunter` may be dead/inconsistent
- **Status**: ✅ Implemented in script

### 3. Database State
- **Requirement**: Completely cleared
- **Reason**: Ensure consistent initial state
- **Status**: ⚠️ **CONFLICTS WITH TEST BEHAVIOR**

### 4. Gmail State
- **Requirement**: No unread emails, no JobOps or JobOps-OLD tags/labels
- **Reason**: Email intake tests expect clean slate
- **Status**: ⚠️ Needs investigation

### 5. Microsoft Mail State
- **Requirement**:
  - JobOps-OLD folder empty
  - JobOps folder pre-populated with test data
- **Reason**: MS Email intake tests expect specific initial state
- **Status**: ⚠️ Needs investigation

---

## Analysis: Conflicts and Questions

### Conflict #1: Database Cleared vs Tests Expecting Data

**User's Requirement**: "Database completely cleared"

**Test Behavior**:
- E2E tests expect jobs to exist (to test UI display, filtering, tabs)
- Backend tests clean only their own test patterns (don't require empty DB)

**Resolution Options**:

**Option A: Require Empty DB + Seed Fixtures** (aligns with auto-test-plan vision)
- Clear database completely
- Load standard test fixtures (need to create `database/test-fixtures.sql`)
- Tests run against known fixture data
- **Pros**: Consistent, repeatable, matches plan
- **Cons**: Requires creating comprehensive fixture file, tests may need updates

**Option B: Require Existing Data State** (matches current test behavior)
- Database should have existing jobs (doesn't matter which ones)
- Tests create/clean their own specific data as needed
- **Pros**: Works with existing tests as-is
- **Cons**: Not truly "comprehensive" if initial state varies

**Option C: Hybrid Approach**
- Clear database
- Run `./helper-scripts/seed-test-data.sh` to create minimal test data
- Tests work with this known data set
- **Pros**: Clean slate + predictable data
- **Cons**: Need to create seed script

**Recommendation**: **Option C (Hybrid)** - Clear DB, seed known test data, document expected state

---

### Conflict #2: Gmail/MS Mail State

**User's Requirements**:
- Gmail: No unread, no JobOps/JobOps-OLD tags
- MS Mail: JobOps-OLD empty, JobOps pre-populated

**Question**: Do current E2E tests for email integration actually validate this?

**Research Needed**:
1. Check `frontend/e2e/tests/*gmail*.spec.ts` files
2. Check `frontend/e2e/tests/*microsoft*.spec.ts` files
3. See what email state they expect

Let me do this research now...

---

## Email Integration Tests Research

### Gmail Tests

**Files to check**: Look for Gmail-related E2E tests

```bash
# Search for Gmail test files
find frontend/e2e/tests -name "*gmail*.spec.ts" -o -name "*email*.spec.ts"
```

**Finding**: Need to search actual test files to see what email state is required

### Microsoft Email Tests

**File**: `frontend/e2e/tests/16-microsoft-email-integration.spec.ts`

**From TESTING_HISTORY.md**:
- 13 E2E tests created
- Manual testing required (OAuth flow with sam@samkirk.com)
- Tests expect:
  - UI display (no email state needed)
  - Folder status display (may need pre-populated folders)
  - OAuth flow (requires live Microsoft 365 account)

**Key Insight**: MS Email tests may need pre-populated JobOps folder for folder status tests

---

## Recommended Preflight Checklist (Draft v1)

Based on analysis, here's a practical preflight checklist:

### 1. Git Status ✅
- **Check**: No uncommitted changes
- **Action**: Abort if changes detected

### 2. Database Selection ✅
- **Check**: Using `jobhunter_personal`
- **Action**: Abort if wrong database

### 3. Database State 🔄
- **Check**: Database cleared AND test fixtures loaded
- **Action**:
  ```bash
  # Clear all tables
  psql -U jobhunter_user -d jobhunter_personal -c "
    TRUNCATE TABLE email_jobs CASCADE;
    TRUNCATE TABLE jobs CASCADE;
    TRUNCATE TABLE applications CASCADE;
    TRUNCATE TABLE communications CASCADE;
    TRUNCATE TABLE interviews CASCADE;
    TRUNCATE TABLE followups CASCADE;
    TRUNCATE TABLE api_job_sources CASCADE;
    TRUNCATE TABLE job_intake_logs CASCADE;
    TRUNCATE TABLE job_sources CASCADE;
    TRUNCATE TABLE oauth_credentials CASCADE;
  "

  # Load test fixtures
  psql -U jobhunter_user -d jobhunter_personal -f database/test-fixtures.sql
  ```
- **Status**: Need to create `database/test-fixtures.sql`

### 4. Gmail State ⚠️
- **Current Status**: Test suite doesn't appear to test Gmail API integration comprehensively
- **User's Requirement**: No unread, no JobOps tags
- **Recommendation**: Document as "nice to have" but don't block tests
- **Action**: Warning only (not abort)

### 5. Microsoft Email State ⚠️
- **Current Status**: MS Email tests require manual OAuth flow
- **User's Requirement**: JobOps-OLD empty, JobOps pre-populated
- **Recommendation**: Document for manual testing, but E2E can't fully validate without OAuth
- **Action**: Warning only (not abort)

---

## Decisions Made (2025-11-07)

### 1. Automation Level
✅ **DECISION**: Fully automated approach, even at the expense of developing additional code

### 2. Database Strategy
✅ **DECISION**: Clear database + seed fixtures (Option C - Hybrid Approach)
- Database: Continue using `jobhunter_personal` (don't resurrect `jobhunter_test` for now)
- Clear all tables completely
- Seed with minimal test fixtures (5-10 jobs sufficient for full E2E workflows)
- Fixtures provide known initial state for repeatable testing

### 3. Preflight Requirements
✅ **DECISION**: All requirements are HARD (abort if not met)
- Git status: HARD requirement (abort)
- Database selection: HARD requirement (abort)
- Database state: HARD requirement (abort)
- Gmail state: HARD requirement (abort)
- MS Mail state: HARD requirement (abort)

### 4. OAuth Token Management
✅ **DECISION**: Hybrid Approach (Option A + C)

**Security Strategy**:
- NO tokens committed to git (major security vulnerability)
- Refresh tokens stored in `.env.test` (gitignored)
- Access tokens auto-refreshed during preflight (~2-4 seconds overhead)

**Implementation**:
```bash
# One-time setup (manual browser OAuth flow)
./helper-scripts/setup-test-oauth.sh
# - Opens browser for Gmail OAuth consent
# - Opens browser for MS Mail OAuth consent
# - Saves refresh tokens to .env.test

# Every test run (fully automated)
./helper-scripts/run-comprehensive-tests.sh
# - Checks if access tokens are valid
# - If expired, auto-refresh using refresh tokens (~2-4 sec)
# - If refresh token expired, abort with helpful error
```

**Token Lifecycle**:
- **Access Tokens**: Expire after 1 hour (both Gmail and MS Mail)
- **Refresh Tokens**:
  - Gmail: Never expires (unless unused for 6 months or revoked)
  - MS Mail: Expires after 90 days (default)

**Maintenance Schedule**:
- **Gmail**: Truly one-time setup (valid for years)
- **MS Mail**: Re-run setup every 90 days (~30 seconds)

**Why This Works**:
- ✅ Fast: 0.1 sec if tokens valid, 2-4 sec if refresh needed
- ✅ Secure: No tokens in git repository
- ✅ Automated: No manual intervention per test run
- ✅ Low maintenance: Refresh tokens last months/years

---

## Implementation Plan

### File Structure

```
database/
  test-fixtures.sql                      # NEW: Minimal test data

helper-scripts/
  run-comprehensive-tests.sh             # UPDATED: Hard preflight checks
  setup-test-oauth.sh                    # NEW: One-time OAuth setup
  preflight-comprehensive-tests.sh       # NEW: Standalone preflight
  clear-database.sh                      # NEW: Truncate all tables
  seed-database.sh                       # NEW: Load test fixtures
  clear-gmail-state.sh                   # NEW: Gmail API cleanup
  setup-msmail-state.sh                  # NEW: MS Mail API setup
  refresh-oauth-tokens.sh                # NEW: Auto-refresh tokens

.env.test                                # NEW: OAuth tokens (gitignored)
```

### Components to Implement

#### 1. Database Fixtures (`database/test-fixtures.sql`)
Create SQL file with minimal but complete test data:
- **Job Sources**: Gmail, MS Email, RapidAPI (configured, active)
- **OAuth Credentials**: Placeholder for tokens (loaded from .env.test at runtime)
- **Jobs**: 5-10 representative jobs
  - 3 jobs: "new" status (for approval workflow tests)
  - 2 jobs: "approved" status (for application workflow tests)
  - 1 job: "filtered" status (for rejection workflow tests)
  - 1 job: "applied" status (for follow-up workflow tests)
  - Various companies, salaries, locations (test filtering criteria)
- **Applications**: 2-3 test applications (for content generation tests)
- **Standard data**: User preferences, filter criteria, templates

**Why Minimal Works**:
- Fixtures provide known initial state
- Tests create additional data as needed via API
- Enables full E2E workflow validation
- Fast to load, easy to maintain

#### 2. OAuth Setup Script (`helper-scripts/setup-test-oauth.sh`)
One-time manual setup for OAuth credentials:
```bash
#!/bin/bash
# Prompts:
# 1. Open Gmail OAuth consent URL in browser
# 2. User grants access, gets auth code
# 3. Exchange code for tokens, save refresh token to .env.test
# 4. Repeat for MS Mail OAuth
# 5. Validate tokens work
# 6. Display success message with maintenance schedule
```

#### 3. Token Refresh Script (`helper-scripts/refresh-oauth-tokens.sh`)
Automated token refresh (called by preflight):
```bash
#!/bin/bash
# 1. Check if access tokens in .env.test are valid
# 2. If expired, use refresh token to get new access token
# 3. Update .env.test with new access token
# 4. Validate new token works
# 5. Return success/failure
```

#### 4. Gmail State Script (`helper-scripts/clear-gmail-state.sh`)
Automated Gmail cleanup using Gmail API:
```bash
#!/bin/bash
# 1. Load access token from .env.test
# 2. List all messages with "JobOps" or "JobOps-OLD" labels
# 3. Delete the labels
# 4. Mark all unread emails as read
# 5. Verify state is clean
```

#### 5. MS Mail State Script (`helper-scripts/setup-msmail-state.sh`)
Automated MS Mail setup using MS Graph API:
```bash
#!/bin/bash
# 1. Load access token from .env.test
# 2. Empty "JobOps-OLD" folder (delete all messages)
# 3. Empty "JobOps" folder (delete all messages)
# 4. Populate "JobOps" with test emails from fixtures
# 5. Verify state is correct
```

#### 6. Database Scripts
```bash
# helper-scripts/clear-database.sh
# Truncate all tables (CASCADE to handle foreign keys)

# helper-scripts/seed-database.sh
# Load test-fixtures.sql
# Inject OAuth tokens from .env.test into oauth_credentials table
```

#### 7. Updated Preflight (`run-comprehensive-tests.sh`)
All checks become HARD requirements:
```bash
check_git_status()           # Abort if uncommitted changes
check_database_selection()   # Abort if not jobhunter_personal
refresh_oauth_tokens()       # Abort if token refresh fails
clear_database()             # Abort if truncate fails
seed_database()              # Abort if fixture load fails
clear_gmail_state()          # Abort if Gmail API fails
setup_msmail_state()         # Abort if MS Mail API fails
```

### Security Considerations

#### `.env.test` Example (gitignored)
```bash
# Gmail OAuth
GMAIL_TEST_ACCESS_TOKEN=ya29.a0AfH6SMB...
GMAIL_TEST_REFRESH_TOKEN=1//0gHGw6k...
GMAIL_TEST_CLIENT_ID=123456789.apps.googleusercontent.com
GMAIL_TEST_CLIENT_SECRET=GOCSPX-abc123...

# MS Mail OAuth
MSMAIL_TEST_ACCESS_TOKEN=eyJ0eXAiOiJKV...
MSMAIL_TEST_REFRESH_TOKEN=0.AXoAqZ8...
MSMAIL_TEST_CLIENT_ID=12345678-1234-1234-1234-123456789012
MSMAIL_TEST_CLIENT_SECRET=abc123~xyz789...
MSMAIL_TEST_TENANT_ID=12345678-1234-1234-1234-123456789012
```

#### `.gitignore` Update
```
.env
.env.test
.env.local
.env.*.local
```

### API Implementation Details

#### Gmail API (using `curl` + `jq`)
```bash
# Token refresh
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=$GMAIL_CLIENT_ID" \
  -d "client_secret=$GMAIL_CLIENT_SECRET" \
  -d "refresh_token=$GMAIL_REFRESH_TOKEN" \
  -d "grant_type=refresh_token"

# List messages
curl -H "Authorization: Bearer $GMAIL_ACCESS_TOKEN" \
  "https://gmail.googleapis.com/gmail/v1/users/me/messages"

# Delete label
curl -X DELETE \
  -H "Authorization: Bearer $GMAIL_ACCESS_TOKEN" \
  "https://gmail.googleapis.com/gmail/v1/users/me/labels/$LABEL_ID"
```

#### MS Graph API (using `curl` + `jq`)
```bash
# Token refresh
curl -X POST https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token \
  -d "client_id=$MSMAIL_CLIENT_ID" \
  -d "client_secret=$MSMAIL_CLIENT_SECRET" \
  -d "refresh_token=$MSMAIL_REFRESH_TOKEN" \
  -d "grant_type=refresh_token"

# List folder messages
curl -H "Authorization: Bearer $MSMAIL_ACCESS_TOKEN" \
  "https://graph.microsoft.com/v1.0/me/mailFolders/$FOLDER_ID/messages"

# Delete message
curl -X DELETE \
  -H "Authorization: Bearer $MSMAIL_ACCESS_TOKEN" \
  "https://graph.microsoft.com/v1.0/me/messages/$MESSAGE_ID"
```

---

## Next Steps for Implementation

1. ✅ Update this document with decisions (DONE)
2. ⏳ Commit documentation updates
3. ⏳ Create `.env.test.example` template
4. ⏳ Create `database/test-fixtures.sql`
5. ⏳ Implement OAuth setup script
6. ⏳ Implement token refresh script
7. ⏳ Implement Gmail state script
8. ⏳ Implement MS Mail state script
9. ⏳ Implement database clear/seed scripts
10. ⏳ Update `run-comprehensive-tests.sh` with hard preflight checks
11. ⏳ Create standalone `preflight-comprehensive-tests.sh`
12. ⏳ Test end-to-end workflow
13. ⏳ Document usage in README_auto-test-plan.md

---

## Appendix: Test Files Analyzed

- `frontend/e2e/global-setup.ts` - E2E test setup
- `frontend/e2e/fixtures/test-helpers.ts` - Helper functions
- `backend/tests/job_intake_tests.rs` - Backend test patterns
- `README_auto-test-plan.md` - Test database setup section
- `docs/TESTING_HISTORY.md` - MS Email test documentation
