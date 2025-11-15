---
document_type: testing_plan
purpose: Comprehensive testing plan and strategy for all test suite execution
scope: Testing infrastructure, quality gates, preflight requirements, and implementation status
relationship: This is the PLAN; TESTING_STATUS.md contains RESULTS of executing this plan
update_policy: Update as testing strategy evolves; historical test RESULTS moved to TESTING_HISTORY.md
related_docs:
  - TESTING_STATUS.md (results of this plan)
  - TESTING_HISTORY.md (historical test results archive)
  - TESTING_GUIDE.md (testing principles and investigation guide)
  - PROJECT_STATUS.md (overall project status)
last_updated: 2025-11-14 17:03:34 PST (Comprehensive testing flow redesign: HTML-based OAuth automation, optimized test phase ordering, notification control with --no-notify flag)
---

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Comprehensive Automated Test Suite Plan - JobHunter](#comprehensive-automated-test-suite-plan---jobhunter)
  - [Overview](#overview)
  - [Current Implementation](#current-implementation)
    - [Global Configuration Parameters](#global-configuration-parameters)
    - [Comprehensive Test Suite Script](#comprehensive-test-suite-script)
    - [Notification System](#notification-system)
      - [Why Dialog Boxes with Sound?](#why-dialog-boxes-with-sound)
      - [Implementation](#implementation)
      - [When Notifications Are Sent](#when-notifications-are-sent)
      - [Message Format](#message-format)
      - [Cross-Reference](#cross-reference)
    - [Separate Test Runner Scripts](#separate-test-runner-scripts)
      - [Backend Tests Only](#backend-tests-only)
      - [Frontend Tests Only](#frontend-tests-only)
      - [E2E Tests Only](#e2e-tests-only)
    - [HTML-Based OAuth Validation](#html-based-oauth-validation)
      - [Purpose](#purpose)
      - [When It Runs](#when-it-runs)
      - [How It Works](#how-it-works)
      - [Notification Behavior](#notification-behavior)
      - [Files Used](#files-used)
      - [Implementation Reference](#implementation-reference)
    - [Recommended Test Workflow](#recommended-test-workflow)
    - [Quality Gates & Error Handling](#quality-gates--error-handling)
      - [Build/Compilation Failures (ALWAYS STOP ⛔)](#buildcompilation-failures-always-stop-)
      - [Test Failures (RESPECTS --fail-fast FLAG ⚠️)](#test-failures-respects---fail-fast-flag-)
      - [Preflight Failures (ALWAYS ABORT 🚫)](#preflight-failures-always-abort-)
      - [Error Handling Summary](#error-handling-summary)
    - [Preflight Requirements (HARD Requirements)](#preflight-requirements-hard-requirements)
      - [0. Process Cleanup ✅](#0-process-cleanup-)
      - [1. Git Status ✅](#1-git-status-)
      - [2. Database Selection ✅](#2-database-selection-)
      - [3. Database State ✅](#3-database-state-)
        - [Database Backup & Restore](#database-backup--restore)
      - [4. Gmail State ✅](#4-gmail-state-)
      - [5. Microsoft Email State ✅](#5-microsoft-email-state-)
    - [OAuth Token Management Strategy](#oauth-token-management-strategy)
    - [Test Result Documentation](#test-result-documentation)
      - [What to Update](#what-to-update)
      - [Timestamp Format Requirements](#timestamp-format-requirements)
      - [Update Workflow Example](#update-workflow-example)
      - [What to Document](#what-to-document)
      - [Cross-References](#cross-references)
  - [Implementation Status & Gap Analysis](#implementation-status--gap-analysis)
    - [✅ Implementation Summary](#-implementation-summary)
    - [Preflight Requirements Status](#preflight-requirements-status)
    - [Critical Safety Enhancement (Database Backup)](#critical-safety-enhancement-database-backup)
    - [Infrastructure Components Status](#infrastructure-components-status)
    - [Test Execution Flow](#test-execution-flow)
    - [Helper Scripts Inventory](#helper-scripts-inventory)
    - [Documentation Update Requirements](#documentation-update-requirements)
    - [Historical Context](#historical-context)
    - [Compliance Verification](#compliance-verification)
  - [Implementation Details](#implementation-details)
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
  - [Decisions & Research](#decisions--research)
    - [Automation Level](#automation-level)
    - [Database Strategy](#database-strategy)
    - [Preflight Requirements](#preflight-requirements)
    - [OAuth Token Management](#oauth-token-management)
    - [TAP (Test Anything Protocol) - Evaluated and Not Adopted](#tap-test-anything-protocol---evaluated-and-not-adopted)
    - [Current Test Behavior Analysis](#current-test-behavior-analysis)
      - [Backend Tests (Rust/Cargo)](#backend-tests-rustcargo)
      - [E2E Tests (Playwright)](#e2e-tests-playwright)
      - [Conflict Resolution: Database Cleared vs Tests Expecting Data](#conflict-resolution-database-cleared-vs-tests-expecting-data)
  - [Test Architecture](#test-architecture)
    - [Test Environment Structure](#test-environment-structure)
  - [Test Infrastructure & Dependencies](#test-infrastructure--dependencies)
    - [Backend Testing Stack (Rust)](#backend-testing-stack-rust)
    - [Frontend Testing Stack - Playwright E2E](#frontend-testing-stack---playwright-e2e)
    - [Database Testing](#database-testing)
  - [Test Database Setup](#test-database-setup)
    - [Isolated Test Environment](#isolated-test-environment)
    - [Test Data Management](#test-data-management)
  - [Performance & Security Testing](#performance--security-testing)
    - [Performance Benchmarks](#performance-benchmarks)
    - [Security Testing](#security-testing)
  - [CI/CD Integration](#cicd-integration)
    - [Automated Test Pipeline (TAP-Integrated)](#automated-test-pipeline-tap-integrated)
    - [Quality Gates](#quality-gates)
  - [Test Categories & Scenarios](#test-categories--scenarios)
    - [Unit Tests (40% of test suite)](#unit-tests-40%25-of-test-suite)
    - [Integration Tests (35% of test suite)](#integration-tests-35%25-of-test-suite)
    - [End-to-End Tests (15% of test suite)](#end-to-end-tests-15%25-of-test-suite)
    - [Performance Tests (10% of test suite)](#performance-tests-10%25-of-test-suite)
  - [Success Criteria](#success-criteria)
    - [Coverage Targets](#coverage-targets)
    - [Performance Standards](#performance-standards)
    - [Quality Standards](#quality-standards)
  - [Manual Frontend Testing Checklist](#manual-frontend-testing-checklist)
    - [Test Procedure](#test-procedure)
      - [Setup & Initial Load](#setup--initial-load)
      - [Tab Navigation & Filtering](#tab-navigation--filtering)
      - [Job Status Updates](#job-status-updates)
      - [Content Generation](#content-generation)
      - [Job Details View](#job-details-view)
      - [Statistics & Real-time Updates](#statistics--real-time-updates)
      - [Filtered Jobs Display](#filtered-jobs-display)
      - [Responsive Design & Layout](#responsive-design--layout)
      - [Error Handling & Edge Cases](#error-handling--edge-cases)
      - [Performance & Browser Compatibility](#performance--browser-compatibility)
      - [Accessibility Testing](#accessibility-testing)
    - [Test Completion Checklist](#test-completion-checklist)
    - [Issue Reporting Format](#issue-reporting-format)
  - [Maintenance & Evolution](#maintenance--evolution)
    - [Test Suite Maintenance](#test-suite-maintenance)
    - [Documentation Updates](#documentation-updates)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Comprehensive Automated Test Suite Plan - JobHunter

## Overview

This document outlines the comprehensive testing strategy for the JobHunter autonomous job application management system. Our testing approach ensures reliability, performance, and correctness across all 4 phases of the platform, from core functionality through automated job intake and content generation.

---

## Current Implementation

### Global Configuration Parameters

**Core Testing Limits** (Email Processing):
- **Preflight Gmail Cleanup**: 500 unread emails maximum (`clear-gmail-state.sh`)
- **Gmail Sync Limit**: 30 emails per sync (`POST /api/intake/gmail/sync`)
- **RapidAPI Sync Limit**: 15 jobs per sync (`POST /api/intake/rapidapi/sync`)
- **Microsoft Mail Sync**: Processes all unread emails in JobOps folder (no hard limit)

**Database Configuration**:
- **Test Database**: `jobhunter_personal` (required by preflight checks)
- **Test Fixtures**: `database/test-fixtures.sql` (8 jobs, 3 applications, 3 sources)
- **OAuth Credentials**: Stored in `oauth_credentials` table (injected from `.env.test`)

**OAuth & Security**:
- **OAuth Tokens File**: `.env.test` (gitignored, required for all email operations)
- **Token Refresh**: Auto-refresh during preflight if expired (~2-4 sec overhead)
- **Gmail Scopes**: `gmail.readonly`, `gmail.modify`
- **MS Mail Scopes**: `Mail.Read`, `Mail.ReadWrite`

**Environment Files**:
- `.env.test` - OAuth tokens for test automation (gitignored, user-created)
- `.env.test.example` - Template with placeholders
- `backend/.env` - Backend configuration (DATABASE_URL, OAuth client IDs)

**Token Lifecycle**:
- **Gmail Access Token**: 1 hour (auto-refreshed)
- **Gmail Refresh Token**: Never expires (unless unused 6+ months)
- **MS Mail Access Token**: 1 hour (auto-refreshed)
- **MS Mail Refresh Token**: 90 days (quarterly re-authorization required)

**Build Requirements**:
- **Zero-warning builds**: Both backend (Rust/Cargo) and frontend (React/RSBuild) must build with zero warnings
- **Backend**: `cargo clean && cargo build`
- **Frontend**: `npm run build`

---

### Comprehensive Test Suite Script

**Script**: `./helper-scripts/run-comprehensive-tests.sh`

**Purpose**: Local, on-demand comprehensive validation (informal CI/CD)

**What it does**:
1. **Preflight checks** (git, database, process cleanup)
2. **Build phase** (backend, frontend, E2E typecheck - zero warnings required)
3. **Unit test phase** (backend tests, frontend tests - no servers needed)
4. **E2E phase** (start backend → HTML-based OAuth validation → start frontend → E2E tests)
5. **Report comprehensive results** with iPhone notification

**Usage**:
```bash
# Run all tests, report at end (default) - ~27 min
./helper-scripts/run-comprehensive-tests.sh

# Suppress subordinate notifications (only OAuth and final results notify)
./helper-scripts/run-comprehensive-tests.sh --no-notify

# Two-phase testing (fast tests only) - ~4 min
./helper-scripts/run-comprehensive-tests.sh --skip-e2e
# Runs: Preflight, Backend build/tests, Frontend build/unit tests
# Skips: E2E tests (can run separately later)

# Stop at first failure (fail-fast mode)
./helper-scripts/run-comprehensive-tests.sh --fail-fast

# Skip preflight checks (not recommended)
./helper-scripts/run-comprehensive-tests.sh --skip-preflight

# Combine flags as needed
./helper-scripts/run-comprehensive-tests.sh --no-notify --skip-e2e
```

**Runtime Estimates** (with 15% margin):
- **Preflight**: ~2.5 min (OAuth refresh, database seed, email setup)
- **Backend Build**: ~20 sec (zero-warning requirement)
- **Backend Tests**: ~60 sec (estimate - needs actual measurement)
- **Frontend Build**: ~10 sec
- **Frontend Unit**: ~25 sec (517 tests)
- **E2E Tests**: ~23 min (594 tests - 85% of total time)
- **TOTAL**: ~27 min (full suite) | ~4 min (with --skip-e2e)

**Latest actual runtimes**: See [TESTING_STATUS.md - Comprehensive Test Suite Runtime](docs/TESTING_STATUS.md#comprehensive-test-suite-runtime) for measured values from recent test runs.

---

### Notification System

The test scripts use **macOS dialog boxes with sound alerts** to notify when long-running tasks complete. This approach is more reliable than macOS Notification Center for ensuring awareness of test completion.

#### Why Dialog Boxes with Sound?

**Advantages over Notification Center**:
- ✅ **Front and center**: Dialog appears as modal window (not hidden in sidebar)
- ✅ **Requires acknowledgment**: User must click OK (not just dismissible)
- ✅ **Not affected by Focus mode**: Works even when notifications are silenced
- ✅ **Immediate audio alert**: Sound plays instantly when task completes
- ✅ **Always visible**: Can't be missed or ignored like banner notifications

#### Implementation

**Command syntax**:
```bash
afplay /System/Library/Sounds/Glass.aiff && osascript -e "display dialog \"Test Results: 1077/1077 passed (100%)\" with title \"Claude Code\" buttons {\"OK\"} default button \"OK\" with icon note"
```

**Components**:
1. `afplay /System/Library/Sounds/Glass.aiff` - Plays system sound (Glass for success, Basso for failure)
2. `osascript -e` - Runs AppleScript command
3. `display dialog` - Creates modal dialog box
4. `with title "Claude Code"` - Sets dialog title
5. `buttons {"OK"}` - Adds OK button (user must click)
6. `with icon note` - Shows informational icon

**Note**: Must use **double quotes** on outside with **escaped quotes** (`\"`) inside. Single quotes don't work with curly braces in AppleScript.

#### When Notifications Are Sent

**Default behavior** (without `--no-notify` flag):
- ✅ `run-comprehensive-tests.sh` - After full test suite completes (~27 min)
- ✅ `run-e2e-tests.sh` - After E2E tests complete (~20-25 min)
- ❌ `run-backend-tests.sh` - Too fast (~1-2 min)
- ❌ `run-frontend-tests.sh` - Too fast (~30 sec)

**With `--no-notify` flag** (subordinate notification suppression):
- ✅ **OAuth notifications** - ALWAYS sent (requires manual user action)
- ✅ **Final comprehensive test results** - ALWAYS sent
- ❌ **E2E test completion** - Suppressed when run as part of comprehensive suite
- ❌ **Build/compile notifications** - Suppressed (intermediate steps)

**Rationale**:
- Long-running tests (>30 sec) deserve notifications
- OAuth requires manual intervention, must always notify
- `--no-notify` flag reduces notification noise during comprehensive runs while keeping critical alerts
- Final result notification always sent so user knows comprehensive testing is complete

#### Message Format

**Success notification**:
```bash
afplay /System/Library/Sounds/Glass.aiff && osascript -e "display dialog \"✅ All Tests Passed!\n\nBackend: 162/162\nFrontend: 516/516\nE2E: 399/399\n\nTotal: 1077/1077 (100%)\nRuntime: 12.5 minutes\" with title \"Test Suite Complete\" buttons {\"OK\"} default button \"OK\" with icon note"
```

**Failure notification**:
```bash
afplay /System/Library/Sounds/Basso.aiff && osascript -e "display dialog \"❌ Tests Failed\n\nBackend: 160/162 (2 failed)\nFrontend: 516/516\nE2E: 395/399 (4 failed)\n\nCheck logs in /tmp/ for details\" with title \"Test Suite Failed\" buttons {\"OK\"} default button \"OK\" with icon caution"
```

**Key differences for failures**:
- Sound: `Basso.aiff` (lower, more urgent tone)
- Icon: `caution` (warning icon instead of note)
- Message includes failed test counts and log file location

#### Cross-Reference

**Developer preferences**: See [CLAUDE.md - Notifications](../CLAUDE.md#notifications) for full notification requirements and setup details.

**Test result reporting**: See [Test Result Documentation](#test-result-documentation) section below for requirements to update TESTING_STATUS.md after comprehensive test runs.

---

### Separate Test Runner Scripts

For faster iteration and targeted testing, individual test suites can be run separately:

#### Backend Tests Only

**Script**: `./helper-scripts/run-backend-tests.sh`

**Purpose**: Run only backend tests (build + cargo test)

**Runtime**: ~2 minutes

**Usage**:
```bash
# Build and test backend
./helper-scripts/run-backend-tests.sh

# Test only (skip build)
./helper-scripts/run-backend-tests.sh --no-build
```

**What it does**:
1. Builds backend with zero-warning requirement
2. Runs `cargo test`
3. Reports pass/fail with test summary

**Use when**: Making backend-only changes (Rust code, API endpoints)

---

#### Frontend Tests Only

**Script**: `./helper-scripts/run-frontend-tests.sh`

**Purpose**: Run only frontend unit tests (build + jest)

**Runtime**: ~30 seconds

**Usage**:
```bash
# Build and test frontend
./helper-scripts/run-frontend-tests.sh

# Test only (skip build)
./helper-scripts/run-frontend-tests.sh --no-build
```

**What it does**:
1. Builds frontend (TypeScript check + RSBuild)
2. Runs `npm test` (Jest unit tests)
3. Reports test suite and individual test counts

**Use when**: Making frontend-only changes (React components, TypeScript)

---

#### E2E Tests Only

**Script**: `./helper-scripts/run-e2e-tests.sh`

**Purpose**: Run only Playwright E2E tests

**Runtime**: ~20-25 minutes

**Usage**:
```bash
# Run E2E tests
./helper-scripts/run-e2e-tests.sh
```

**What it does**:
1. Runs `npm run test:e2e` (Playwright)
2. Reports pass/fail counts
3. Sends iPhone notification when complete

**Use when**: Validating end-to-end workflows after backend/frontend tests pass

**Note**: When run as part of comprehensive tests with `--no-notify` flag, E2E test completion notifications are suppressed (only OAuth and final results notify).

---

### HTML-Based OAuth Validation

#### Purpose
Automated OAuth token validation using local HTML files for manual authorization flow

#### When It Runs
During the E2E phase of comprehensive testing (before E2E tests execute)

#### How It Works
1. **Backend server starts** - Required for OAuth callback endpoints
2. **Token validation check** - Script checks if OAuth tokens are valid using `refresh-oauth-tokens.sh`
3. **Automatic browser opening** (if tokens invalid):
   - Opens `gmail-oauth.html` in default browser
   - Opens `microsoft-oauth.html` in default browser (2-second delay)
   - User completes OAuth consent flow in browser
   - Tokens saved automatically via backend OAuth callback endpoints
4. **Token polling** - Script polls for valid tokens (max 5 minutes)
5. **Success** - Once tokens validated, E2E tests proceed
6. **Backend stays running** - No stop/restart between OAuth and E2E tests (efficiency optimization)

#### Notification Behavior
- **OAuth notification ALWAYS sent** (regardless of `--no-notify` flag)
- User must manually complete OAuth flow (cannot be automated)
- Dialog appears: "OAuth Required - Please complete Gmail and Microsoft OAuth in your browser"
- Once OAuth complete, tests automatically resume

#### Files Used
- `gmail-oauth.html` (project root) - Gmail OAuth consent UI
- `microsoft-oauth.html` (project root) - Microsoft OAuth consent UI
- Backend OAuth callback endpoints: `/auth/gmail/callback`, `/auth/microsoft/callback`

#### Implementation Reference
See `helper-scripts/run-comprehensive-tests.sh` function `validate_oauth_with_html()` (lines 267-339)

---

### Recommended Test Workflow

**Fast Iteration** (2-3 minutes):
```bash
# 1. Backend changes
./helper-scripts/run-backend-tests.sh --no-build

# 2. Frontend changes
./helper-scripts/run-frontend-tests.sh --no-build
```

**Full Validation** (25-30 minutes):
```bash
# 1. Fast tests first
./helper-scripts/run-backend-tests.sh
./helper-scripts/run-frontend-tests.sh

# 2. E2E tests last (if fast tests pass)
./helper-scripts/run-e2e-tests.sh
```

**Comprehensive Pre-commit** (30 minutes):
```bash
# Run everything with preflight checks
./helper-scripts/run-comprehensive-tests.sh
```

---

### Quality Gates & Error Handling

The comprehensive test script enforces different failure policies depending on the type of failure. Understanding this distinction is critical for effective debugging.

#### Build/Compilation Failures (ALWAYS STOP ⛔)

**Build and compilation failures are quality gates that ALWAYS stop execution**, regardless of the `--fail-fast` flag.

**What qualifies as a build failure:**
- Rust compilation errors (`error[E0123]`)
- Rust compiler warnings (zero-warning requirement)
- TypeScript compilation errors (application code)
- **TypeScript compilation errors (E2E test code)** ⚠️ **CRITICAL**
- Frontend build warnings (RSBuild/webpack)
- Missing dependencies or configuration errors

**Behavior:**
```bash
# Backend build failure
cargo build 2>&1 | tee /tmp/backend-build.log
# ❌ If warnings found: Script aborts immediately
# Error message: "Build/compilation failures are not allowed. Aborting."

# Frontend build failure
npm run build 2>&1 | tee /tmp/frontend-build.log
# ❌ If warnings found: Script aborts immediately

# E2E test type-checking failure
npm run typecheck:e2e 2>&1 | tee /tmp/e2e-typecheck.log
# ❌ If TypeScript errors found: Script aborts immediately
# Error message: "E2E test code has TypeScript errors. Fix before running tests."
```

**Why this is enforced:**
- Ensures clean, production-ready code quality
- Prevents test failures caused by broken builds
- **Catches E2E test TypeScript errors that Playwright would otherwise ignore**
- Catches configuration issues early
- Maintains zero-warning standard across codebase (application AND test code)

**Recovery:**
1. Check log files: `/tmp/backend-build.log`, `/tmp/frontend-build.log`, or `/tmp/e2e-typecheck.log`
2. Fix all warnings and compilation errors
3. Re-run comprehensive tests from scratch

**⚠️ IMPORTANT - E2E Test Type-Checking:**

Playwright has built-in TypeScript support and transpiles `.ts` test files at runtime. This means **TypeScript errors in E2E tests do NOT block test execution** - Playwright will attempt to run tests even with type errors, potentially causing confusing runtime failures.

**The comprehensive test script enforces E2E type-checking as a quality gate** to catch these errors before tests run.

---

#### Test Failures (RESPECTS --fail-fast FLAG ⚠️)

**Test failures follow the `--fail-fast` flag policy:**

**Default behavior (no --fail-fast):**
- All tests run regardless of failures
- Comprehensive results collected
- Notification shows aggregate pass/fail counts

**With --fail-fast flag:**
- Execution stops at first test failure
- Remaining tests NOT executed
- Faster feedback for debugging

**Detection for backend tests:**
The script differentiates between compilation errors during test runs (treated as build failures) and actual test failures:

```bash
# Compilation error during test run (ALWAYS STOP):
error[E0425]: cannot find value `foo` in this scope

# Test failure (respects --fail-fast):
test test_job_filtering ... FAILED
```

**Why this matters:**
- Compilation errors = code is broken (can't proceed)
- Test failures = logic errors (can continue collecting data)

---

#### Preflight Failures (ALWAYS ABORT 🚫)

**All preflight checks are HARD requirements** - any failure aborts the entire test run before tests begin.

**Examples:**
- Uncommitted git changes
- Wrong database selected (`jobhunter_dev` instead of `jobhunter_personal`)
- OAuth token refresh failed
- Database clear/seed failed
- Gmail/MS Mail state clear failed
- Processes still running on required ports

**Recovery:**
1. Fix the specific preflight failure
2. Re-run comprehensive tests (preflight runs again)

**See**: [Preflight Requirements](#preflight-requirements-hard-requirements) section below for detailed requirements

---

#### Error Handling Summary

| Failure Type | Behavior | Affected by --fail-fast? | Recovery |
|--------------|----------|-------------------------|----------|
| **Build/Compilation** | ⛔ ALWAYS STOP | ❌ No (always stops) | Fix code, re-run |
| **Test Failures** | ⚠️ Configurable | ✅ Yes | Investigate, fix logic |
| **Preflight Checks** | 🚫 ABORT | ❌ No (always aborts) | Fix environment, re-run |

**Log file locations:**
- Backend build: `/tmp/backend-build.log`
- Frontend build: `/tmp/frontend-build.log`
- E2E test type-checking: `/tmp/e2e-typecheck.log` ⚠️ **NEW**
- Backend tests: `/tmp/backend-test.log`
- Frontend tests: `/tmp/frontend-test.log`
- E2E tests: `/tmp/e2e-test.log`

**Cross-reference:** See `./helper-scripts/run-comprehensive-tests.sh` lines 119-141 for implementation details

---

### Preflight Requirements (HARD Requirements)

All preflight checks are **HARD requirements** - the script aborts if any check fails.

#### 0. Process Cleanup ✅
- **Requirement**: All application processes stopped, ports available
- **Why**: Ensures clean resource state for accurate performance measurements and prevents port conflicts
- **Implementation**:
  ```bash
  # Stop application servers and clean up orphaned processes
  ./helper-scripts/stop.sh

  # What this does:
  # - Stops backend server (cargo run / jobhunter-backend)
  # - Stops frontend server (npm start / rsbuild)
  # - Cleans up orphaned Playwright test processes
  # - Verifies ports 8080 and 3000 are available
  # - Returns exit code 0 on success, 1 on failure
  # - PostgreSQL remains running (tests need database access)
  ```
- **Port Verification**:
  - Port 8080 (backend) must be available
  - Port 3000 (frontend) must be available
  - Script exits with error if ports are occupied
- **Exit Codes**: Returns 0 on success (for preflight scripting), 1 on failure
- **Status**: ✅ Fully implemented and integrated into stop.sh

#### 1. Git Status ✅
- **Requirement**: No uncommitted changes
- **Why**: Ensure clean baseline for comprehensive test run
- **Implementation**: `git diff-index --quiet HEAD --`

#### 2. Database Selection ✅
- **Requirement**: Using `jobhunter_personal` database only
- **Why**: Ensures consistent test environment
- **Implementation**: Check `DATABASE_URL` in `backend/.env`

#### 3. Database State ✅
- **Requirement**: Database cleared AND test fixtures loaded (WITH automatic backup)
- **Why**: Provides known initial state for repeatable testing
- **Status**: ✅ **COMPLETE** (automatic backup integrated 2025-11-11)
- **Implementation**:
  ```bash
  # Clear all tables (CASCADE handles foreign keys)
  ./helper-scripts/clear-database.sh

  # Load test fixtures (5-10 representative jobs)
  ./helper-scripts/seed-database.sh
  ```
- **Status**: ⚠️ Implementation in progress (see "Components to Implement" below)

##### Database Backup & Restore

**Critical**: E2E tests truncate and seed test data into `jobhunter_personal` database. Automatic backups protect your development data from loss.

**Automatic Backup Creation**:
```bash
# Seed test data with automatic backup
./helper-scripts/seed-test-data.sh --truncate

# What happens:
# 1. Prompts user to confirm truncation
# 2. Creates backup: /tmp/jobhunter_backups/jobhunter_personal_YYYYMMDD_HHMMSS.sql
# 3. Saves backup path to: /tmp/jobhunter_last_backup.txt
# 4. Cleans up old backups (keeps last 5)
# 5. Truncates jobs table with CASCADE
# 6. Seeds test data from database/seed_test_data.sql
```

**Safety Features**:
- ✅ **Backup MUST succeed before truncate** - If backup fails, truncate is aborted (data is safe)
- ✅ **Confirmation required** - User must explicitly confirm destructive operation
- ✅ **Clear recovery instructions** - Shows restore command if something goes wrong
- ✅ **Automatic cleanup** - Old backups cleaned up (keeps last 5 to save disk space)

**Manual Restore**:
```bash
# Restore most recent backup
./helper-scripts/restore-from-backup.sh

# List all available backups
./helper-scripts/restore-from-backup.sh --list

# Restore specific backup
./helper-scripts/restore-from-backup.sh --file /tmp/jobhunter_backups/jobhunter_personal_20251111_140522.sql
```

**Restore Process**:
1. Locates most recent backup (from `/tmp/jobhunter_last_backup.txt` or latest in directory)
2. Shows current database state (jobs, applications, sources)
3. Prompts user to confirm restore (warns about data loss)
4. Drops all existing data
5. Restores from backup SQL file
6. Shows restored database state

**Backup Storage**:
- **Location**: `/tmp/jobhunter_backups/` (outside git repository)
- **Naming**: `jobhunter_personal_YYYYMMDD_HHMMSS.sql`
- **Retention**: Last 5 backups kept automatically
- **Cleanup**: Older backups automatically deleted to save disk space
- **Persistence**: Lives in `/tmp/` so survives reboots but not system shutdown

**When Backups Are Created**:
- ✅ **Automatically during test data seeding** (`seed-test-data.sh --truncate`)
- ✅ **Before comprehensive test runs** (via preflight checks)
- ❌ **NOT during normal development** (only when seeding test data)

**When Restore Is Needed**:
- ❌ **NOT automatically** - Restore requires explicit user action (safety mechanism)
- ✅ **User-initiated recovery** - When development data needs to be restored
- ✅ **After catastrophic data loss** - If something goes wrong during testing
- ✅ **Rolling back test data** - Return to pre-test state

**Architecture Note (ISSUE-040)**:
- **Single database architecture**: `jobhunter_personal` used for BOTH development AND testing
- **Test data seeding**: E2E tests seed controlled test data before running
- **No separate test database**: Simplified architecture reduces configuration complexity
- **Backup/restore safety net**: Protects development data during testing

**Cross-reference**: See [CLAUDE_WORKFLOWS.md - Database Backup & Restore Procedures](../CLAUDE_WORKFLOWS.md#database-backup--restore-procedures) for detailed workflows and troubleshooting.

---

#### 4. Gmail State ✅
- **Requirement**: No unread emails, no JobOps or JobOps-OLD labels
- **Why**: Email intake tests expect clean slate
- **Status**: ✅ **COMPLETE** (fully implemented, 143-line script)
- **Implementation**:
  ```bash
  ./helper-scripts/clear-gmail-state.sh
  # - Uses Gmail API to remove labels
  # - Marks all unread emails as read
  # - Auto-refreshes OAuth tokens if needed
  ```

#### 5. Microsoft Email State ✅
- **Requirement**: JobOps-OLD folder empty, JobOps folder seeded with 3 test emails
- **Why**: MS Email intake tests expect specific initial state
- **Implementation**:
  ```bash
  ./helper-scripts/setup-msmail-state.sh
  # - Uses MS Graph API to manage folders
  # - Empties JobOps-OLD folder (delete all messages)
  # - Empties JobOps folder (delete all messages)
  # - Calls backend API to seed 3 test emails via MS Graph API
  # - Auto-refreshes OAuth tokens if needed
  ```
- **Test Emails Created** (via `POST /api/test/seed-msmail`):
  1. Senior Software Test Engineer - Remote ($145k-$165k) - TechCorp Inc
  2. Test Automation Lead - AI/ML Focus ($150k-$180k) - DataMind Solutions
  3. Principal QA Engineer - Generative AI Platform ($160k-$190k) - AI Innovations Corp
- **Status**: ✅ Fully implemented and working

### OAuth Token Management Strategy

**Security Approach**: Hybrid - Refresh tokens stored locally, access tokens auto-refreshed

**One-Time Setup** (manual browser OAuth flow):
```bash
./helper-scripts/setup-test-oauth.sh
# 1. Opens browser for Gmail OAuth consent
# 2. Opens browser for MS Mail OAuth consent
# 3. Saves refresh tokens to .env.test (gitignored)
```

**Every Test Run** (fully automated):
```bash
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
- ✅ Secure: No tokens committed to git repository
- ✅ Automated: No manual intervention per test run
- ✅ Low maintenance: Refresh tokens last months/years

---

### Test Result Documentation

**REQUIRED**: After running comprehensive tests, update `docs/TESTING_STATUS.md` with full test results and timestamps.

#### What to Update

**Primary document**: [`docs/TESTING_STATUS.md`](docs/TESTING_STATUS.md)

**Sections to update**:

1. **Latest Test Run Results** (top of document):
   - Full timestamp: `YYYY-MM-DD HH:MM:SS TZ` (e.g., "2025-11-11 01:00:00 PST")
   - Run type (Comprehensive, Backend only, E2E only, etc.)
   - Total runtime (wall clock time, not CPU time)
   - Quick summary table with all test suites
   - Detailed breakdown of results
   - Comparison to previous run
   - Key observations

2. **Comprehensive Test Suite Runtime** section:
   - Update "Latest Actual Runtime" with timestamp
   - Update all tables with actual results (not estimates)
   - Document variance from estimates with explanations
   - Update "Last Runtime Verification" timestamp

3. **"Last Updated" timestamp** (at top of file):
   - Format: `YYYY-MM-DD HH:MM:SS TZ (description)`
   - Example: `2025-11-11 09:11:27 PST (Comprehensive test suite execution completed)`

#### Timestamp Format Requirements

**CRITICAL**: All status documents MUST use full timestamps:

**Required format**: `YYYY-MM-DD HH:MM:SS TZ (optional description)`

**Examples**:
- `2025-11-11 09:52:20 PST`
- `2025-11-11 09:52:20 PST (Bug tracking synchronized)`

**Get current timestamp**:
```bash
date "+%Y-%m-%d %H:%M:%S %Z"  # Full timestamp with timezone
```

**Why full timestamps matter**:
- Provides precise point-in-time references for all documentation
- Enables exact correlation between doc updates and git commits
- Tracks historical changes with minute-level precision
- Prevents ambiguity when multiple updates happen same day

#### Update Workflow Example

```bash
# 1. Run comprehensive tests and capture results
./helper-scripts/run-comprehensive-tests.sh 2>&1 | tee /tmp/comprehensive-test-run.log

# 2. Get current timestamp
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S %Z")
echo "Test run completed at: $TIMESTAMP"

# 3. Update TESTING_STATUS.md with:
#    - Latest Test Run Results section (with $TIMESTAMP)
#    - Actual test counts from logs
#    - Runtime data (wall clock time)
#    - Comparison to previous run
#    - Key observations

# 4. Commit the update
git add docs/TESTING_STATUS.md
git commit -m "docs: Update TESTING_STATUS.md with test results ($TIMESTAMP)"
```

#### What to Document

**Test counts**:
- Backend: X/X tests passing (Y ignored)
- Frontend Unit: X/X tests passing (Y skipped)
- E2E: X/X tests passing (Y skipped)
- Total: X/X tests passing across all suites

**Runtime breakdown** (wall clock time):
- Preflight: X min
- Backend build + tests: X sec
- Frontend build + unit tests: X sec
- E2E tests: X min
- **Total**: X min (actual elapsed time)

**Comparison to previous run**:
- Pass rate changes: X% → Y% (+/- Z%)
- New failures discovered: N tests
- Previous failures fixed: N tests
- Runtime variance: Previous X min → Current Y min (+/- Z min)

**Key observations**:
- Notable improvements or regressions
- New test infrastructure changes
- Performance improvements
- Issues discovered

#### Cross-References

**Testing status requirements**: See [CLAUDE.md - Testing Status Update Requirements](../CLAUDE.md#testing-status-update-requirements) for complete documentation standards.

**Documentation timestamp standards**: See [CLAUDE.md - Documentation Timestamp Standards](../CLAUDE.md#documentation-timestamp-standards) for timestamp format requirements across all status documents.

**Testing history archive**: Previous comprehensive test results are archived to [`docs/TESTING_HISTORY.md`](docs/TESTING_HISTORY.md) when a new comprehensive run completes.

---

## Implementation Status & Gap Analysis

**Last Reviewed**: 2025-11-12 PST
**Review Type**: Comprehensive gap analysis comparing plan requirements vs actual implementation

### ✅ Implementation Summary

**Overall Compliance**: ✅ **100% PLAN-COMPLIANT** (as of 2025-11-12 18:00 PST)

**E2E Test Type-Checking Enforcement** ✅ **IMPLEMENTED** (2025-11-12)

- **Implementation**: E2E test TypeScript compilation errors are now enforced as quality gate
- **Components Added**:
  - ✅ `frontend/e2e/tsconfig.json` - TypeScript configuration for E2E tests
  - ✅ `package.json:typecheck:e2e` - npm script for E2E type-checking
  - ✅ Comprehensive test script integration - E2E typecheck runs in BUILD PHASE
- **Impact**: 148 TypeScript errors in E2E test code will now block test execution
- **Enforcement**: E2E type errors treated as build failures (ALWAYS STOP)
- **Log File**: `/tmp/e2e-typecheck.log`

All critical requirements from the testing plan have been fully implemented and validated.

### Preflight Requirements Status

| Check # | Component | Status | Implementation | Notes |
|---------|-----------|--------|----------------|-------|
| 0 | **Process Cleanup** | ✅ **COMPLETE** | `stop.sh` | Stops backend/frontend servers, cleans orphaned processes, frees ports 8080/3000 |
| 1 | **Git Status** | ✅ **COMPLETE** | `git diff-index --quiet HEAD` | Ensures no uncommitted changes before test run |
| 2 | **Database Selection** | ✅ **COMPLETE** | Validates `backend/.env` | Confirms `jobhunter_personal` database in use |
| 3 | **Database State** | ✅ **COMPLETE** | Backup + Clear + Seed | **Automatic backup before clear** (integrated 2025-11-11) |
| 4 | **Gmail State** | ✅ **COMPLETE** | `clear-gmail-state.sh` (143 lines) | Clears labels, marks emails read via Gmail API |
| 5 | **Microsoft Email State** | ✅ **COMPLETE** | `setup-msmail-state.sh` | Seeds 3 test emails via MS Graph API |
| - | **OAuth Token Refresh** | ✅ **COMPLETE** | `refresh-oauth-tokens.sh` | Auto-refreshes expired Gmail & MS Mail tokens |

### Critical Safety Enhancement (Database Backup)

**Problem Identified** (2025-11-11):
- Initial comprehensive test run executed WITHOUT database backup
- Plan required "Critical: Backup MUST succeed before truncate"
- Risk: Development data in `jobhunter_personal` permanently destroyed

**Solution Implemented** (2025-11-11, commit `743269b`):
- Integrated automatic backup into `run-comprehensive-tests.sh` (lines 171-226)
- Backup created BEFORE database clear operation
- Backup MUST succeed or truncate is aborted (safety requirement)
- Backup location: `/tmp/jobhunter_backups/jobhunter_personal_YYYYMMDD_HHMMSS.sql`
- Retention: Keeps last 5 backups automatically
- Restore command: `./helper-scripts/restore-from-backup.sh`

**Impact**:
- ✅ Development data now protected during comprehensive test runs
- ✅ Can restore to pre-test state if needed
- ✅ Plan-compliant: "Backup MUST succeed before truncate" enforced

### Infrastructure Components Status

| Component | File/Location | Status | Notes |
|-----------|--------------|--------|-------|
| **Database Fixtures** | `database/test-fixtures.sql` | ✅ Exists | Test data for comprehensive runs |
| **E2E Test Seeds** | `database/seed_test_data.sql` | ✅ Exists | E2E-specific test data |
| **Backup Script** | `backup-personal-db.sh` | ✅ Exists | Manual backup tool |
| **Restore Script** | `restore-from-backup.sh` | ✅ Exists | Restore from any backup |
| **OAuth Setup** | `setup-test-oauth.sh` | ✅ Exists | One-time OAuth consent flow |
| **OAuth Refresh** | `refresh-oauth-tokens.sh` | ✅ Exists | Auto-refresh expired tokens |
| **Gmail State** | `clear-gmail-state.sh` | ✅ Exists | Gmail API integration (143 lines) |
| **MS Mail State** | `setup-msmail-state.sh` | ✅ Exists | MS Graph API integration |
| **E2E TypeScript Config** | `e2e/tsconfig.json` | ✅ **IMPLEMENTED** | ✅ TypeScript config for E2E tests (2025-11-12) |
| **E2E Typecheck Script** | `package.json:typecheck:e2e` | ✅ **IMPLEMENTED** | ✅ Build-phase validation (2025-11-12) |
| **Test Runner** | `run-comprehensive-tests.sh` | ✅ Complete | Full preflight + build (inc. E2E typecheck) + test |

### Test Execution Flow

```
┌─────────────────────────────────────────────────────────┐
│ PREFLIGHT CHECKS (HARD Requirements - Abort if Failed) │
├─────────────────────────────────────────────────────────┤
│ 1. Process Cleanup (stop.sh)                           │
│ 2. Git Status (no uncommitted changes)                 │
│ 3. Database Selection (jobhunter_personal)             │
│ 4. Database Backup → Clear → Seed ⚠️ CRITICAL          │
│ 5. Gmail State Clear                                    │
│ 6. MS Mail State Setup                                 │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ BUILD PHASE (ALWAYS STOP on warnings/errors)           │
├─────────────────────────────────────────────────────────┤
│ 1. Backend Build (cargo build) - zero warnings         │
│ 2. Frontend Build (rsbuild) - zero warnings            │
│ 3. E2E Typecheck (tsc --noEmit) - zero errors ✅       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ UNIT TEST PHASE (No servers needed)                    │
├─────────────────────────────────────────────────────────┤
│ 1. Backend Tests (cargo test)                          │
│ 2. Frontend Unit Tests (jest)                          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ E2E PHASE (Servers + OAuth + E2E Tests)                │
├─────────────────────────────────────────────────────────┤
│ 1. Start Backend Server (for OAuth callbacks)          │
│ 2. HTML-Based OAuth Validation ⚠️ MANUAL STEP          │
│    - Check if tokens valid (refresh-oauth-tokens.sh)   │
│    - If invalid: Open gmail-oauth.html & microsoft-     │
│      oauth.html in browser                             │
│    - User completes OAuth consent (manual)             │
│    - Tokens saved via backend callbacks               │
│    - Poll for valid tokens (max 5 min)                │
│    - ✅ CRITICAL: OAuth notification ALWAYS sent       │
│ 3. Keep Backend Running (no restart)                   │
│ 4. Start Frontend Server (npm start)                   │
│ 5. Wait for Frontend Ready (port 3000)                 │
│ 6. Run E2E Tests (playwright)                          │
│ 7. Stop Servers (backend + frontend)                   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ RESULTS & NOTIFICATION                                  │
├─────────────────────────────────────────────────────────┤
│ • Summary table with pass/fail counts                  │
│ • iPhone notification (dialog + sound)                 │
│   - With --no-notify: Only OAuth and final notify      │
│   - Without flag: E2E notify + final notify            │
│ • Update TESTING_STATUS.md with timestamp              │
└─────────────────────────────────────────────────────────┘
```

### Helper Scripts Inventory

**Total Scripts**: 35 scripts in `helper-scripts/` directory

**Key Testing Scripts**:
- `run-comprehensive-tests.sh` - Full test suite with preflight
- `run-backend-tests.sh` - Backend tests only
- `run-frontend-tests.sh` - Frontend unit tests only
- `run-e2e-tests.sh` - E2E tests only

**Database Scripts**:
- `backup-personal-db.sh` - Manual backup creation
- `restore-from-backup.sh` - Restore from backup (automatic or specific file)
- `clear-database.sh` - Truncate all tables
- `seed-database.sh` - Load test fixtures
- `seed-test-data.sh` - E2E test data with backup
- `switch-to-personal.sh` - Switch to personal database
- `reset-dev-db.sh` - Reset development database

**OAuth/Email Scripts**:
- `setup-test-oauth.sh` - One-time OAuth setup (browser flow)
- `refresh-oauth-tokens.sh` - Auto-refresh expired tokens
- `clear-gmail-state.sh` - Clear Gmail labels and unread emails
- `setup-msmail-state.sh` - Seed MS Mail test emails

**Utility Scripts**:
- `start.sh` / `stop.sh` - Application lifecycle
- `system-health-check.sh` - Check system resources
- `create-bug.sh` / `move-bug.sh` - Bug tracking
- `tag-session.sh` / `list-sessions.sh` - Git session tagging

### Documentation Update Requirements

**When updating plan status (this file)**:
- ⚠️ → ✅ when component is fully implemented
- 🔄 → ✅ when component moves from partial to complete
- Add implementation date and commit reference
- Update "Last Reviewed" timestamp in this section

**When updating test results (`docs/TESTING_STATUS.md`)**:
- Replace entire document with latest run results
- Move previous run to `docs/TESTING_HISTORY.md`
- Use full timestamp format: `YYYY-MM-DD HH:MM:SS TZ`
- Include infrastructure notes (e.g., backup status)

### Historical Context

**2025-11-11 15:15:21 PST** - First comprehensive test run
- Result: 97.1% pass rate (1060/1092 tests)
- Issue: Ran WITHOUT database backup (non-compliant with plan)
- Tagged: `comprehensive-test-2025-11-11`

**2025-11-11 16:45:00 PST** - Database backup integration
- Fixed: Integrated automatic backup into comprehensive test script
- Commit: `743269b`
- Status: NOW plan-compliant
- Impact: Development data protected going forward

**2025-11-14 17:03:34 PST** - Comprehensive testing flow redesign
- **Implementation**: Complete redesign of comprehensive test execution flow
- **Key Changes**:
  - ✅ HTML-based OAuth automation (gmail-oauth.html, microsoft-oauth.html)
  - ✅ Optimized test phase ordering: builds → unit tests → servers+OAuth → E2E
  - ✅ Backend server stays running (no wasteful stop/start between OAuth and E2E)
  - ✅ Notification control with `--no-notify` flag
  - ✅ OAuth notifications always sent (critical, requires manual action)
  - ✅ Subordinate E2E notifications suppressed with `--no-notify`
- **Commit**: `6926880` (test flow implementation)
- **Impact**: Fully automated testing with minimal manual intervention (only OAuth when needed)
- **Implementation Location**: `helper-scripts/run-comprehensive-tests.sh` (validate_oauth_with_html function, lines 267-339)

### Compliance Verification

| Requirement Category | Score | Status |
|---------------------|-------|--------|
| Preflight Checks | 7/7 | ✅ 100% |
| Safety Measures | Complete | ✅ Backup integrated |
| Helper Scripts | All present | ✅ 35 scripts |
| OAuth Management | Complete | ✅ Setup + refresh |
| Test Fixtures | Complete | ✅ Both SQL files |
| Error Handling | Complete | ✅ All paths covered |
| Notifications | Complete | ✅ iPhone alerts |

**Overall Compliance**: ✅ **100% PLAN-COMPLIANT**

---

## Implementation Details

### File Structure

```
database/
  test-fixtures.sql                      # NEW: Minimal test data (5-10 jobs)

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
.env.test.example                        # NEW: Template for .env.test
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
Automated MS Mail setup using MS Graph API + Backend API:
```bash
#!/bin/bash
# 1. Load access token from .env.test
# 2. Auto-refresh OAuth tokens if needed
# 3. Get/create JobOps and JobOps-OLD folders
# 4. Empty "JobOps-OLD" folder (delete all messages via MS Graph API)
# 5. Empty "JobOps" folder (delete all messages via MS Graph API)
# 6. Seed 3 test emails via backend API endpoint (POST /api/test/seed-msmail)
# 7. Verify 3 emails created successfully
```

**Backend API Endpoint** (`POST /api/test/seed-msmail`):
- Creates 3 real test job opportunity emails via MS Graph API
- Emails contain realistic job descriptions matching search criteria
- Created directly in JobOps folder (no user email recipient needed)
- Returns count of successfully created emails

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

## Decisions & Research

### Automation Level
✅ **DECISION**: Fully automated approach, even at the expense of developing additional code

### Database Strategy
✅ **DECISION**: Clear database + seed fixtures (Hybrid Approach)
- Database: Continue using `jobhunter_personal` (don't resurrect `jobhunter_test` for now)
- Clear all tables completely
- Seed with minimal test fixtures (5-10 jobs sufficient for full E2E workflows)
- Fixtures provide known initial state for repeatable testing

### Preflight Requirements
✅ **DECISION**: All requirements are HARD (abort if not met)
- Git status: HARD requirement (abort)
- Database selection: HARD requirement (abort)
- Database state: HARD requirement (abort)
- Gmail state: HARD requirement (abort)
- MS Mail state: HARD requirement (abort)

### OAuth Token Management
✅ **DECISION**: Hybrid Approach
- NO tokens committed to git (major security vulnerability)
- Refresh tokens stored in `.env.test` (gitignored)
- Access tokens auto-refreshed during preflight (~2-4 seconds overhead)

### TAP (Test Anything Protocol) - Evaluated and Not Adopted
❌ **DECISION**: Not using TAP for frontend testing
- **Evaluated**: December 2024 for frontend component testing
- **Removed**: Two TAP test files (JobCard.test.ts, jobs-api.test.ts) deleted
- **Reason**: ES Module/CommonJS circular dependency errors, tests used mocks instead of real components
- **Alternative Chosen**: Playwright E2E tests provide superior real-browser validation
- **Infrastructure**: TAP dependencies kept in package.json for potential future backend API testing (will not interfere with Playwright)
- **Current Approach**: Playwright E2E tests as primary frontend testing strategy

### Current Test Behavior Analysis

#### Backend Tests (Rust/Cargo)

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

#### E2E Tests (Playwright)

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

#### Conflict Resolution: Database Cleared vs Tests Expecting Data

**Original Conflict**: User required "Database completely cleared", but tests expect existing data.

**Resolution**: Hybrid Approach - Clear DB + Seed Fixtures
- Clear database completely
- Load standard test fixtures (create `database/test-fixtures.sql`)
- Tests run against known fixture data
- **Pros**: Consistent, repeatable, matches auto-test-plan vision
- **Result**: Aligned user requirements with test behavior

---

## Test Architecture

### Test Environment Structure
```
JobHuntAI/
├── backend/tests/          # Rust backend tests
│   ├── unit/              # Individual function tests
│   ├── integration/       # API endpoint tests
│   ├── performance/       # Load and benchmark tests
│   └── security/          # Auth and validation tests
├── frontend/src/__tests__/ # React component tests
│   ├── components/        # UI component tests
│   ├── integration/       # API communication tests
│   ├── e2e/              # End-to-end workflow tests
│   └── accessibility/     # ARIA and keyboard tests
├── database/tests/         # PostgreSQL schema tests
│   ├── schema/           # Constraint and trigger tests
│   ├── integrity/        # Foreign key and cascade tests
│   ├── performance/      # Query optimization tests
│   └── migration/        # Schema evolution tests
└── tests/integration/      # Cross-system tests
    ├── api/              # Contract and compliance tests
    ├── workflows/        # Complete user journeys
    ├── external/         # Third-party integrations
    └── scenarios/        # Error and edge cases
```

## Test Infrastructure & Dependencies

### Backend Testing Stack (Rust)
```toml
[dev-dependencies]
tokio-test = "0.4"      # Async testing framework
sqlx-test = "0.6"       # Database testing utilities
mockall = "0.11"        # Mock object generation
wiremock = "0.5"        # HTTP service mocking
criterion = "0.5"       # Performance benchmarking
proptest = "1.2"        # Property-based testing
```

### Frontend Testing Stack - Playwright E2E

**Primary Testing Approach: Playwright E2E**
- ✅ **Comprehensive test coverage** in real Chrome browser
- ✅ **Page Object Model** architecture for maintainability
- ✅ **Full feature coverage** across all UI components and workflows
- ✅ **TypeScript-based** with full type safety
- See comprehensive test execution results in [TESTING_STATUS.md](docs/TESTING_STATUS.md)

**Alternative: Jest Available as Fallback**
- react-scripts includes Jest pre-configured for React component testing
- Can use `npm test` with Jest if component-level unit tests are needed in the future
- Currently not needed due to comprehensive Playwright E2E coverage

### Database Testing
- **SQL Schema Validation**: Constraints, triggers, and indexes verified via backend tests
- **Docker Compose**: Isolated test database containers
- **Test Fixtures**: Consistent seed data for scenario testing (see `database/test-fixtures.sql`)
- **Migration Testing**: Schema evolution validation

## Test Database Setup

### Isolated Test Environment
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  test-db:
    image: postgres:14
    environment:
      POSTGRES_DB: jobhunter_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
    ports:
      - "5433:5432"
    volumes:
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
      - ./database/test-fixtures.sql:/docker-entrypoint-initdb.d/fixtures.sql
```

### Test Data Management
- **Automated Setup/Teardown**: Fresh database state for each test suite
- **Fixture Management**: Consistent test data across all test scenarios
- **Transaction Rollback**: Isolated test execution without side effects
- **Seed Data**: Realistic job, company, and user data for comprehensive testing

## Performance & Security Testing

### Performance Benchmarks
- **API Response Times**: <100ms for critical endpoints
- **Database Queries**: <50ms for standard operations
- **Content Generation**: <2 seconds for resume/cover letter creation
- **Job Filtering**: <100ms for multi-criteria evaluation
- **Load Testing**: 100+ concurrent users without degradation

### Security Testing
- **Authentication**: OAuth 2.0 flow validation and token security
- **Authorization**: Proper access controls and permission validation
- **Input Validation**: SQL injection and XSS prevention
- **Rate Limiting**: API abuse prevention and DDoS protection
- **Data Privacy**: PII handling and secure data transmission

## CI/CD Integration

### Automated Test Pipeline (TAP-Integrated)
```yaml
# .github/workflows/test.yml
name: Comprehensive TAP-Based Test Suite
on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
      - name: Setup test database
        run: |
          psql -h localhost -U postgres -c "CREATE DATABASE jobhunter_test;"
          psql -h localhost -U postgres -d jobhunter_test < database/schema.sql
      - name: Run Rust unit tests
        run: cargo test --verbose
      - name: Run Rust integration tests
        run: cargo test --test '*' --verbose

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
      - name: Run TAP tests with coverage
        working-directory: ./frontend
        run: |
          npm run test:coverage
          npm run test:reporter > tap-results.txt
      - name: Upload TAP results
        uses: actions/upload-artifact@v3
        with:
          name: tap-test-results
          path: frontend/tap-results.txt
      - name: Parse TAP results for GitHub
        run: |
          # Convert TAP output to GitHub Actions annotations
          cat frontend/tap-results.txt | grep -E "^(not )?ok" | while read line; do
            if [[ $line == "not ok"* ]]; then
              echo "::error::Test failed: $line"
            else
              echo "::notice::Test passed: $line"
            fi
          done

  database-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
    steps:
      - uses: actions/checkout@v3
      - name: Install pgTAP
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-14-pgtap
      - name: Setup test database
        run: |
          psql -h localhost -U postgres -c "CREATE DATABASE jobhunter_test;"
          psql -h localhost -U postgres -d jobhunter_test < database/schema.sql
      - name: Run pgTAP tests
        run: |
          pg_prove -h localhost -U postgres -d jobhunter_test test/database/*.sql

  integration-tests:
    needs: [backend-tests, frontend-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup full test environment
        run: docker-compose -f docker-compose.test.yml up -d
      - name: Run integration tests
        working-directory: ./frontend
        run: npm run test:integration
      - name: Generate TAP summary
        run: |
          echo "# Integration Test Summary" > integration-summary.md
          echo "TAP Version: 14" >> integration-summary.md
          echo "Test Results:" >> integration-summary.md
          cat frontend/tap-results.txt >> integration-summary.md
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const summary = fs.readFileSync('integration-summary.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '## 🧪 TAP Test Results\n\n```\n' + summary + '\n```'
            });
```

### Quality Gates
- **95% Code Coverage**: Minimum threshold for all components
- **Zero Security Vulnerabilities**: Automated security scanning
- **Performance Regression**: <5% degradation tolerance
- **Test Success Rate**: 100% passing tests required for deployment

## Test Categories & Scenarios

### Unit Tests (40% of test suite)
- Individual function behavior validation
- Edge case and boundary condition testing
- Mock dependencies for isolated testing
- Pure function mathematical correctness

### Integration Tests (35% of test suite)
- API endpoint comprehensive testing
- Database interaction validation
- Service-to-service communication
- Third-party API integration testing

### End-to-End Tests (15% of test suite)
- Complete user workflow validation
- Multi-step process verification
- Cross-browser compatibility testing
- Real-world scenario simulation

### Performance Tests (10% of test suite)
- Load testing and stress testing
- Memory usage and leak detection
- Database query optimization validation
- Scalability and bottleneck identification

## Success Criteria

### Coverage Targets
- **Backend Rust Code**: 95%+ line coverage
- **Frontend TypeScript**: 90%+ line coverage
- **Database Schema**: 100% constraint validation
- **API Endpoints**: 100% endpoint testing
- **Critical Workflows**: 100% E2E coverage

### Performance Standards
- **API Response Time**: <100ms (95th percentile)
- **Database Queries**: <50ms average
- **Content Generation**: <2 seconds
- **Page Load Time**: <3 seconds first contentful paint
- **Memory Usage**: <512MB backend, <256MB frontend

### Quality Standards
- **Zero Critical Security Issues**
- **Zero High-Priority Bugs**
- **100% Accessibility Compliance** (WCAG 2.1 AA)
- **Cross-browser Compatibility** (Chrome, Firefox, Safari, Edge)
- **Mobile Responsiveness** (iOS/Android)

## Manual Frontend Testing Checklist

**Purpose**: This checklist provides a systematic procedure for QA testers and developers to manually verify frontend functionality until automated browser testing is implemented (Playwright). Once Playwright tests are complete, this checklist serves as the specification that automated tests implement.

**Browser Recommendation**: Use **Chrome** for manual testing to match the automated Playwright Chromium tests (ensures consistency between manual and automated validation).

**Prerequisites**:
- Backend server running on `http://localhost:8080`
- Frontend dev server running on `http://localhost:3000`
- Test database populated with sample job data
- Browser: **Chrome** (recommended), or Firefox/Safari/Edge for cross-browser validation

### Test Procedure

#### Setup & Initial Load
1. **Page Load Test**
   - [ ] Open `http://localhost:3000` in browser
   - [ ] Verify page loads within 3 seconds
   - [ ] Confirm no console errors in browser DevTools
   - [ ] Check that JobHunter Dashboard header is visible
   - [ ] Verify statistics cards display at top (New, Approved, Applied, Filtered counts)

2. **Network Connectivity Test**
   - [ ] Open browser Network tab (F12 → Network)
   - [ ] Refresh page
   - [ ] Verify `GET /api/jobs` request returns 200 OK
   - [ ] Verify `GET /api/criteria` request returns 200 OK
   - [ ] Verify `GET /api/jobs/stats` request returns 200 OK
   - [ ] Check that response times are <100ms for API calls

#### Tab Navigation & Filtering
3. **Tab Switching Test**
   - [ ] Click "Inbox" tab → Verify only jobs with status="new" are displayed
   - [ ] Click "Approved" tab → Verify only jobs with status="approved" are displayed
   - [ ] Click "Applied" tab → Verify only jobs with status="applied" are displayed
   - [ ] Click "Filtered" tab → Verify only jobs with status="filtered" are displayed
   - [ ] Click "All" tab → Verify all jobs are displayed regardless of status
   - [ ] Verify tab active state (blue background) changes correctly
   - [ ] Verify job count badges on tabs match displayed jobs

4. **Job Card Display Test**
   - [ ] Verify each job card displays: Title, Company, Salary (if available), Location, Source
   - [ ] Check salary badge color: Green if ≥$130K, Red if <$130K
   - [ ] Check location badge color: Blue for "Remote", Gray for other locations
   - [ ] Verify commute time badge shows correct color (Green ≤45min, Orange >45min)
   - [ ] For filtered jobs: Verify "Filtered Reasons" section displays in red box
   - [ ] Verify status icons appear correctly (AlertCircle for "new", CheckCircle for "approved", etc.)

#### Job Status Updates
5. **Approve/Reject Workflow Test**
   - [ ] Navigate to "Inbox" tab
   - [ ] Click "Approve" button on a job card
   - [ ] Verify job disappears from Inbox
   - [ ] Navigate to "Approved" tab
   - [ ] Verify job now appears in Approved tab
   - [ ] Navigate back to "Inbox" tab
   - [ ] Click "Reject" button on a different job card
   - [ ] Verify job disappears from Inbox
   - [ ] Check statistics cards update correctly (New count decreased, Approved/Rejected count increased)

6. **Status Update API Validation**
   - [ ] Open Network tab while approving/rejecting
   - [ ] Verify `PUT /api/jobs/{id}/status` request is sent
   - [ ] Verify request body contains correct status: "approved" or "rejected"
   - [ ] Verify response returns 200 OK
   - [ ] Verify job list refreshes automatically after status update

#### Content Generation
7. **Generate Resume & Cover Letter Test**
   - [ ] Navigate to "Approved" tab
   - [ ] Click "Generate Resume & Cover Letter" button on an approved job
   - [ ] Verify button changes to "Generating..." with disabled state
   - [ ] Wait for content generation (should complete within 2 seconds)
   - [ ] Verify modal appears with side-by-side resume and cover letter display
   - [ ] Check resume content displays in left panel with proper formatting
   - [ ] Check cover letter displays in right panel with job-specific personalization
   - [ ] Verify company name and job title appear in cover letter
   - [ ] Check for domain-specific keywords highlighted in resume (e.g., "Test Automation", "AI", "Firmware")

8. **Content Generation Modal Test**
   - [ ] Verify modal has close button (✕) in top-right corner
   - [ ] Click close button → Verify modal closes
   - [ ] Re-open modal by generating content again
   - [ ] Click outside modal (on dark overlay) → Verify modal closes
   - [ ] Verify modal is scrollable if content exceeds viewport height

#### Job Details View
9. **Job Details Modal Test**
   - [ ] Click on any job card (not on Approve/Reject buttons)
   - [ ] Verify job details modal opens
   - [ ] Check modal displays: Title, Company, Status badge, Salary, Location, Source
   - [ ] Verify job URL link is displayed and clickable (if available)
   - [ ] Verify job description displays (if available)
   - [ ] Verify "Date Collected" shows formatted date
   - [ ] Click close button (✕) → Verify modal closes
   - [ ] Re-open modal and click outside on overlay → Verify modal closes

10. **Job Details Action Buttons**
    - [ ] Open job details for a "new" status job
    - [ ] Verify "Approve" and "Reject" buttons appear at bottom
    - [ ] Click "Approve" → Verify modal closes and job moves to Approved tab
    - [ ] Open job details for an "approved" status job
    - [ ] Verify "Generate Resume & Cover Letter" button appears
    - [ ] Click button → Verify content generation modal opens

#### Statistics & Real-time Updates
11. **Statistics Display Test**
    - [ ] Verify statistics cards at top show correct counts:
      - New: Count of jobs with status="new"
      - Approved: Count of jobs with status="approved"
      - Applied: Count of jobs with status="applied"
      - Filtered: Count of jobs with status="filtered"
    - [ ] Perform status update (approve a job)
    - [ ] Verify statistics update immediately without page refresh

12. **Criteria Configuration Test**
    - [ ] Click "Configure Criteria" button (if available in UI)
    - [ ] Verify criteria modal/panel opens
    - [ ] Check current criteria displays: Min Salary ($130,000), Max Commute (45 min), Domains (Testing, AI, Firmware)
    - [ ] If editable: Modify a criterion and save
    - [ ] Verify `PUT /api/criteria` request is sent
    - [ ] Verify criteria updates reflected in job filtering logic

#### Filtered Jobs Display
13. **Filtered Jobs Validation Test**
    - [ ] Navigate to "Filtered" tab
    - [ ] Verify filtered jobs display with orange/red "Filter" icon
    - [ ] Check each filtered job shows "Filtered Reasons" section
    - [ ] Verify reasons are specific and accurate:
      - "Salary below minimum ($130,000)" for low-salary jobs
      - "Commute time exceeds 45 minutes" for long-commute jobs
      - "Domain does not match preferred domains" for non-matching jobs
    - [ ] Verify multiple reasons listed if job fails multiple criteria

#### Responsive Design & Layout
14. **Desktop Layout Test** (1920x1080)
    - [ ] Verify page layout uses full width appropriately
    - [ ] Check job cards display in grid or list format
    - [ ] Verify statistics cards display horizontally at top
    - [ ] Check modals are centered and properly sized
    - [ ] Verify no horizontal scrolling required

15. **Tablet Layout Test** (768px width)
    - [ ] Resize browser window to 768px width
    - [ ] Verify layout remains functional
    - [ ] Check job cards stack appropriately
    - [ ] Verify modals resize to fit screen
    - [ ] Check tab navigation remains accessible

16. **Mobile Layout Test** (375px width)
    - [ ] Resize browser window to 375px width
    - [ ] Verify all content is accessible without horizontal scroll
    - [ ] Check buttons are large enough for touch targets (minimum 44x44px)
    - [ ] Verify modals occupy full screen on mobile
    - [ ] Test tab navigation on mobile view

#### Error Handling & Edge Cases
17. **API Failure Simulation Test**
    - [ ] Stop backend server
    - [ ] Refresh frontend page
    - [ ] Verify graceful error handling (sample data displayed or error message)
    - [ ] Check console for error messages
    - [ ] Restart backend server
    - [ ] Verify page recovers and loads real data

18. **Empty State Test**
    - [ ] Clear all jobs from a specific status (e.g., empty Inbox)
    - [ ] Navigate to that tab
    - [ ] Verify appropriate empty state message displays
    - [ ] Check that page doesn't break with zero jobs

19. **Long Content Test**
    - [ ] Test job with very long title (>100 characters)
    - [ ] Verify title displays without breaking layout
    - [ ] Test job with very long description
    - [ ] Verify description is scrollable in modal
    - [ ] Test job with very long company name
    - [ ] Verify company name truncates or wraps appropriately

20. **Special Characters Test**
    - [ ] Test job with special characters in title (e.g., "Sr. Test Engineer & QA Lead (Remote)")
    - [ ] Verify special characters display correctly
    - [ ] Test job with Unicode characters (e.g., company name with accents)
    - [ ] Check that filtering and sorting work correctly

#### Performance & Browser Compatibility
21. **Performance Validation**
    - [ ] Open browser Performance tab (F12 → Performance)
    - [ ] Record page load
    - [ ] Verify First Contentful Paint <3 seconds
    - [ ] Check Time to Interactive <5 seconds
    - [ ] Verify no memory leaks during navigation between tabs
    - [ ] Monitor Network tab: Verify no unnecessary duplicate API calls

22. **Cross-browser Testing**
    - [ ] **Chrome**: Repeat critical tests (tab navigation, status updates, content generation)
    - [ ] **Firefox**: Repeat critical tests
    - [ ] **Safari**: Repeat critical tests (macOS/iOS)
    - [ ] **Edge**: Repeat critical tests
    - [ ] Document any browser-specific issues

#### Accessibility Testing
23. **Keyboard Navigation Test**
    - [ ] Use Tab key to navigate through page
    - [ ] Verify all interactive elements receive focus indicator
    - [ ] Press Enter on focused buttons → Verify actions trigger
    - [ ] Use Shift+Tab to navigate backwards
    - [ ] Verify modal traps focus (Tab cycles within modal)
    - [ ] Press Escape key on modal → Verify modal closes

24. **Screen Reader Test** (Optional but Recommended)
    - [ ] Enable VoiceOver (macOS) or NVDA/JAWS (Windows)
    - [ ] Navigate page with screen reader
    - [ ] Verify job cards announce title, company, and status
    - [ ] Check that buttons announce their purpose
    - [ ] Verify form inputs have appropriate labels

### Test Completion Checklist
- [ ] All tests passing in at least 2 major browsers
- [ ] No critical console errors observed
- [ ] All user workflows functional (view jobs, approve/reject, generate content)
- [ ] Performance targets met (<3s page load, <2s content generation)
- [ ] Responsive design verified on desktop, tablet, mobile
- [ ] Documented any issues found in test execution log

### Issue Reporting Format
When issues are found, document using this format:
```
Issue ID: FE-YYYYMMDD-###
Test Section: [Section number and name]
Browser: [Chrome/Firefox/Safari/Edge + version]
Steps to Reproduce:
1. [Step 1]
2. [Step 2]
Expected Result: [What should happen]
Actual Result: [What actually happened]
Severity: [Critical/High/Medium/Low]
Screenshot: [Attach if applicable]
```

---

## Maintenance & Evolution

### Test Suite Maintenance
- **Weekly Test Review**: Identify flaky or outdated tests
- **Monthly Performance Baseline**: Update performance expectations
- **Quarterly Security Audit**: Review and update security test scenarios
- **Continuous Test Enhancement**: Add tests for new features and bug fixes

### Documentation Updates
- **Test Results Dashboard**: Live update of test status and metrics
- **Known Issues Tracking**: Document and track test failures and fixes
- **Performance Trending**: Historical performance data and analysis
- **Coverage Evolution**: Track coverage improvements over time

This comprehensive testing strategy ensures the JobHunter system maintains the highest standards of quality, performance, and reliability as it evolves from a manual job management tool to a fully autonomous job application platform.

---

**See Also:** [Test Results Dashboard](README_auto-test-results.md) for latest test run details