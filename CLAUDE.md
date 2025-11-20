<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [CLAUDE.md](#claudemd)
  - [Table of Contents](#table-of-contents)
  - [Project Overview](#project-overview)
  - [Developer Preferences](#developer-preferences)
    - [Database Configuration](#database-configuration)
    - [Notifications](#notifications)
    - [TypeScript Preference](#typescript-preference)
    - [Language Choice by Domain](#language-choice-by-domain)
    - [File Path Conventions](#file-path-conventions)
    - [File Discovery Tools](#file-discovery-tools)
    - [Work Session Tagging](#work-session-tagging)
    - [Comprehensive Testing Policy](#comprehensive-testing-policy)
  - [Workflow Standards (Summary)](#workflow-standards-summary)
    - [Documentation Timestamp Standards](#documentation-timestamp-standards)
    - [Results Document Organization (General Principle)](#results-document-organization-general-principle)
    - [PROJECT_STATUS.md Organization](#project_statusmd-organization)
    - [TESTING_STATUS.md Organization](#testing_statusmd-organization)
    - [Testing Status Update Requirements](#testing-status-update-requirements)
      - [Step 1: Archive Oldest Run (If Needed)](#step-1-archive-oldest-run-if-needed)
      - [Step 2: Add New Run to TESTING_STATUS.md](#step-2-add-new-run-to-testing_statusmd)
      - [Step 3: Commit Changes](#step-3-commit-changes)
      - [Step 4: Managing Historical Investigation Content](#step-4-managing-historical-investigation-content)
  - [Development Commands](#development-commands)
    - [Database Setup](#database-setup)
    - [Backend (Rust)](#backend-rust)
    - [Frontend (React/TypeScript)](#frontend-reacttypescript)
  - [Architecture](#architecture)
    - [Core Data Models](#core-data-models)
    - [Database Schema Key Features](#database-schema-key-features)
    - [Job Filtering Criteria](#job-filtering-criteria)
    - [Development Phases](#development-phases)
  - [Quick Reference: Where to Find Things](#quick-reference-where-to-find-things)
  - [File Structure](#file-structure)
  - [API Endpoints](#api-endpoints)
  - [GitHub Publication Workflow](#github-publication-workflow)
  - [Bug Tracking Workflow](#bug-tracking-workflow)
    - [When User Asks to "File a Bug"](#when-user-asks-to-file-a-bug)
    - [Moving Bugs Between States](#moving-bugs-between-states)
    - [Key Principles](#key-principles)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# CLAUDE.md

This file provides essential project information and guidance to Claude Code (claude.ai/code) when working with code in this repository.

**For detailed workflow standards and behavioral guidelines**, see [CLAUDE_WORKFLOWS.md](CLAUDE_WORKFLOWS.md).

---

## Table of Contents

- [Project Overview](#project-overview)
- [Developer Preferences](#developer-preferences)
  - [Database Configuration](#database-configuration)
  - [Notifications](#notifications)
  - [File Path Conventions](#file-path-conventions)
  - [File Discovery Tools](#file-discovery-tools)
  - [Work Session Tagging](#work-session-tagging)
  - [Comprehensive Testing Policy](#comprehensive-testing-policy)
- [Workflow Standards (Summary)](#workflow-standards-summary)
- [Development Commands](#development-commands)
  - [Database Setup](#database-setup)
  - [Backend (Rust)](#backend-rust)
  - [Frontend (React/TypeScript)](#frontend-reacttypescript)
- [Architecture](#architecture)
  - [Core Data Models](#core-data-models)
  - [Database Schema Key Features](#database-schema-key-features)
  - [Job Filtering Criteria](#job-filtering-criteria)
  - [Development Phases](#development-phases)
- [Quick Reference: Where to Find Things](#quick-reference-where-to-find-things)
- [File Structure](#file-structure)
- [API Endpoints](#api-endpoints)
- [Bug Tracking Workflow](#bug-tracking-workflow)
  - [When User Asks to "File a Bug"](#when-user-asks-to-file-a-bug)
  - [Moving Bugs Between States](#moving-bugs-between-states)
  - [Key Principles](#key-principles)

---

## Project Overview

JobHunter is a workflow-driven job application management system built to streamline job search processes. The application helps automatically collect, filter, and manage job opportunities based on specific criteria.

**Tech Stack:**
- Backend: Rust (Actix-web framework)
- Frontend: TypeScript/React with RSBuild
- Database: PostgreSQL

---

## Developer Preferences

### Database Configuration

**✅ IMPLEMENTED**: Automatic personal database selection via SessionStart hook!

At the start of every Claude Code session, a SessionStart hook automatically:
- Runs `./switch-to-personal.sh` to configure the personal development database
- Displays which database is being used: `jobhunter_personal`
- Provides context that all database operations will use the personal database

**Hook configuration**: `.claude/session-start-hook.sh` (runs automatically)

**Current database**: `jobhunter_personal` (used for development AND testing)

**Database Usage:**
- `jobhunter_personal` - Used for:
  - Manual development work
  - E2E test execution (with test data seeding)
  - Backend API testing
  - OAuth credentials stored here (needed for email ingestion tests)
- `jobhunter_dev` - Legacy database, not actively used
  - Exists but no longer part of standard workflow
  - Decision: Single database (personal) is simpler and avoids OAuth credential sync issues

**Test Data Seeding (ISSUE-040):**
- E2E tests seed controlled test data into `jobhunter_personal` before running
- Use `./helper-scripts/seed-test-data.sh --truncate` to clear and reseed database
- **Automatic backup/restore available** - see [CLAUDE_WORKFLOWS.md - Database Backup & Restore](CLAUDE_WORKFLOWS.md#database-backup--restore-procedures)

**Manual database switching** (if needed):
```bash
./switch-to-personal.sh    # Switch to personal database (default)
./switch-to-dev.sh          # ⚠️ DEPRECATED (ISSUE-040) - legacy only
```

### Notifications

**✅ IMPLEMENTED**: iPhone notification setup is active! See [README_iPhone-notify-setup.md](README_iPhone-notify-setup.md) for configuration details.

**IMPORTANT**: Always show dialog boxes WITH SOUND when completing long-running tasks (>30 seconds).

**Command to use (sound then dialog):**
```bash
afplay /System/Library/Sounds/Glass.aiff && osascript -e "display dialog \"[message]\" with title \"Claude Code\" buttons {\"OK\"} default button \"OK\" with icon note"
```

**When to send notifications:**
- After running test suites (backend cargo test, E2E playwright tests)
- After build operations (cargo build, npm build)
- After extended operations that take >30 seconds
- When waiting for user input after completing a complex multi-step task

**Why dialog boxes with sound:**
- Dialog box appears front and center (not in Notification Center)
- Requires user acknowledgment (must click OK)
- Sound alert plays immediately so you know task is done
- Not affected by Focus mode or notification settings

**Note**: Use **double quotes** on the outside with **escaped quotes** (`\"`) inside. Single quotes don't work with the curly braces in AppleScript.

### TypeScript Preference

**⚠️ CRITICAL PROJECT STANDARD**: Always use TypeScript (.ts) instead of JavaScript (.js) for all code.

**Applies to:**
- Application code (frontend/backend utilities)
- Testing utilities and helpers
- Build scripts and tooling
- Test orchestration and automation

**Why TypeScript:**
- Type safety catches errors at compile time
- Better IDE support and refactoring
- Self-documenting code with interfaces
- Consistent with project architecture (frontend is TypeScript/React)

**Examples:**
- ✅ `src/test-orchestrator/prototype.ts` - Correct
- ❌ `src/test-orchestrator/prototype.js` - Wrong (don't mix .js and .ts)

**Execution:**
- Use `ts-node` for standalone scripts: `ts-node src/script.ts`
- Add npm scripts in `package.json` for common tasks
- Configure `tsconfig.json` for proper TypeScript compilation

**Exception:**
- Bash scripts (`.sh`) for shell operations are acceptable
- Configuration files that must be `.js` (e.g., some legacy tool configs)

**See also:** ISSUE-060 Phase 1 - Test orchestrator initially had both `.js` and `.ts`, cleaned up to TypeScript-only

### Language Choice by Domain

**Backend: Rust** 🦀
- **Always okay and absolutely great** for backend work
- Performance, memory safety, and concurrency without compromises
- Current backend: Rust (Actix-web framework)
- Use Rust for:
  - API endpoints and web server logic
  - Database operations and data processing
  - Background jobs and schedulers
  - System utilities and performance-critical code

**Frontend: TypeScript** 📘
- **More practically suitable** for frontend work
- Rich ecosystem for UI development (React, bundlers, UI libraries)
- Current frontend: TypeScript/React with RSBuild
- Use TypeScript for:
  - React components and UI logic
  - Frontend state management
  - Client-side utilities and helpers
  - Test orchestration and build tooling

**Why This Matters:**
- Each language excels in its domain
- Rust for backend: speed, safety, low-level control
- TypeScript for frontend: rapid development, UI ecosystem, type safety
- This is the project's proven architecture - don't second-guess it

**Exception:**
- Bash scripts (`.sh`) remain acceptable for shell operations and helper scripts

### File Path Conventions

**IMPORTANT**: Always use relative paths with `./` for files in the project directory.

**Working directory**: `/Users/sam/Projects/JobHunterAI-Claude` (available in `<env>`)

**Examples**:
- Root files: `./CLAUDE.md`, `./README.md`, `./package.json`
- Subdirectories: `./backend/src/main.rs`, `./docs/file.md`
- Helper scripts: `./helper-scripts/create-bug.sh`, `./helper-scripts/start.sh`, `./helper-scripts/stop.sh`

**Why**: Clearer, more portable, eliminates path resolution ambiguity. See [ISSUE-011](bugs/fixed/ISSUE-011-file-path-prefix-conventions.md) for detailed research.

**Helper Scripts Organization**:
- **All scripts** live in `./helper-scripts/` directory
- Claude should always reference scripts as `./helper-scripts/<script-name>.sh`
- This ensures uniformity and easy discoverability

### File Discovery Tools

**⚠️ CRITICAL REQUIREMENT**: NEVER use bash commands for file operations!

**Prohibited bash commands** (ALWAYS WRONG):
- ❌ `find` - Use Glob or Task/Explore instead
- ❌ `ls` - Use Glob or Read instead
- ❌ `grep` - Use Grep tool or Task/Explore instead
- ❌ `cat`, `head`, `tail` - Use Read tool instead

**Required tools** (ALWAYS CORRECT):
- ✅ **Read** - For known file paths
- ✅ **Glob** - For known file patterns (e.g., `bugs/**/*ISSUE-*.md`)
- ✅ **Grep** - For searching content in 1-3 known files
- ✅ **Task/Explore** - For exploratory searches ("Where is X?", "How does Y work?")

**Why this matters**:
- Bash commands waste tokens and may fail due to permissions
- Proper tools provide better results and follow project standards
- This is a documented anti-pattern (see [ISSUE-031](bugs/open/ISSUE-031-claude-ignoring-file-discovery-guidance.md))

**See "Efficient File Discovery" section below for detailed guidance.**

### Work Session Tagging

**✅ IMPLEMENTED**: Date-based git tagging convention for daily work sessions (2025-10-24)

**Quick Reference**:
```bash
./helper-scripts/tag-session.sh end-of-pm "Description of today's work"
./helper-scripts/list-sessions.sh --week
```

**Tag Format**: `{session-type}-{YYYY-MM-DD}` (e.g., `end-of-pm-2025-10-24`)

**Common session types**: `end-of-am`, `end-of-pm`, `end-of-day`, `end-of-evening`

**Full documentation**: See [README_dev.md - Helper Scripts](README_dev.md#tag-sessionsh) for detailed usage instructions.

### Comprehensive Testing Policy

**⚠️ CRITICAL DISTINCTION**:
- ✅ **Running individual/targeted tests is ALWAYS FINE** - Do this freely!
- ❌ **Running the comprehensive test suite requires explicit user permission**

**What is the "Comprehensive Test Suite"?**
- **The script**: `./helper-scripts/run-comprehensive-tests.sh` (TypeScript orchestrator, ISSUE-060)
  - **Symlink available**: `./run-comprehensive-tests.sh` (in project root)
  - **IMPORTANT**: Run from project root, NOT from frontend directory
  - **Location**: Script lives in `helper-scripts/` directory with symlink in root for convenience
- **Legacy alternative**: `./helper-scripts/run-comprehensive-tests-bash-legacy.sh` (original bash implementation)
- Runs ALL tests: Backend + Frontend + Full E2E suite
- **Includes**:
  - Preflight checks (process cleanup, git, database, OAuth)
  - Build phase (cargo clean + build, npm build, E2E typecheck)
  - Zero-warning/error requirement (quality gate)
  - Test execution (all 3 test suites concurrently)
  - Desktop notification with per-group stats
- **Runtime**: ~15-20 minutes
- **Requires**: Clean git status, valid OAuth tokens, jobhunter_personal database
- **Cost**: Significant token usage + developer time

**❌ NEVER run `./helper-scripts/run-comprehensive-tests.sh` UNLESS**:
- User explicitly requests it ("run comprehensive tests", "run all tests", "run the full test suite")
- OR: Major refactoring, pre-release verification, critical multi-system fixes

**⚠️ CRITICAL REQUIREMENT - Test Orchestrator Must Be Clean**:
- **BEFORE running comprehensive tests**: Verify the test orchestrator TypeScript code compiles error-free and warning-free
- **WHEN to check**: After ANY changes to files in `src/test-orchestrator/` directory
- **How to verify**:
  ```bash
  npx tsc --noEmit src/test-orchestrator/**/*.ts --module commonjs --target es2017 --esModuleInterop
  ```
- **Why**: The test orchestrator itself is code that must meet zero-warning/error standards
- **If compilation fails**: Fix all TypeScript errors/warnings BEFORE running comprehensive tests

**✅ ALWAYS OKAY to run targeted tests freely**:
```bash
# Backend only (fast: ~90 seconds)
cd backend && cargo test

# Frontend only (fast: ~25 seconds)
cd frontend && npm test

# Specific E2E test file (fast: ~1-5 minutes)
cd frontend && npx playwright test e2e/tests/03-job-status-updates.spec.ts

# Backend + Frontend unit tests only (fast: ~2 minutes)
cd backend && cargo test && cd ../frontend && npm test
```

**Current Testing State** (as of 2025-11-15):
- Backend: 164/164 passing (100%)
- Frontend: 516/516 passing (100%)
- E2E: ~98% pass rate expected (381-390 passed, 4-6 failed estimated)
- **Status**: Tests at "acceptable" state for active development

**When User Says "Run Tests"**:
- **Default to targeted**: Run affected tests based on recent changes (e.g., backend test, specific E2E file)
- **Ask for clarification** if ambiguous: "Which tests? (backend/frontend/specific E2E tests/comprehensive)"
- **ONLY run comprehensive** if user explicitly says: "run comprehensive tests", "run all tests", "run the full test suite"

**Key Principle**: Use your judgment to run targeted tests freely. Only ask permission for the comprehensive suite.

**Documentation**:
- Current test status: `docs/TESTING_STATUS.md`
- Test plan: `README_auto-test-plan.md`
- Test history: `docs/TESTING_HISTORY.md`
- **TypeScript orchestrator details**: `bugs/open/ISSUE-060-replace-ad-hoc-comprehensive-test-flow-with-proper-test-orchestration-tooling.md`
- **Orchestrator README**: `src/test-orchestrator/README.md`
- **E2E best practices**: `docs/PLAYWRIGHT_BEST_PRACTICES.md` ← **Required reading for E2E test work**

**Analyzing Test Results - Phased Approach** ⭐:

When creating summary reports after comprehensive test runs, use this **phased approach for maximum token efficiency**:

**Phase 1: JSON Report Only** (PREFERRED)
- **File**: `/Users/sam/Projects/JobHunterAI-Claude/test-results/comprehensive-report.json` (working directory available in `<env>`)
- **When**: Default approach for all test result summaries
- **Why**:
  - ✅ Most token-efficient (~77 lines structured data)
  - ✅ Complete information: test counts, durations, failure details (testName, testFile, errorMessage, stackTrace)
  - ✅ Easy to parse programmatically
  - ✅ All data needed for summary reports

**Phase 2: Detailed Text File** (ONLY IF NEEDED)
- **File**: `/Users/sam/Projects/JobHunterAI-Claude/test-results/failures-detailed.txt` (working directory available in `<env>`)
- **When**: Only consult in these specific cases:
  - JSON file missing or corrupted
  - User explicitly asks to see human-readable formatted output
  - Need to verify text formatting itself
  - Debugging the report generation process
- **Why**: Designed for human consumption in terminal, not LLM analysis

**Standard Workflow**:
1. Read `/Users/sam/Projects/JobHunterAI-Claude/test-results/comprehensive-report.json`
2. Generate summary with:
   - Overall stats (passed/failed/skipped, duration)
   - Per-suite breakdown
   - Failure list with test name, file, error summary (first line)
3. Only read `failures-detailed.txt` if user requests full details for specific failure

**Key Principle**: JSON for efficiency, detailed text only when specifically needed.

**Standard Test Result File Paths** (always use these exact absolute paths):
- **JSON Report**: `/Users/sam/Projects/JobHunterAI-Claude/test-results/comprehensive-report.json`
- **Detailed Failures**: `/Users/sam/Projects/JobHunterAI-Claude/test-results/failures-detailed.txt`
- **Pushover Notification Script**: `~/bin/notify_claude.sh`

---

## Workflow Standards (Summary)

Claude Code follows comprehensive workflow standards for this project. **For detailed guidelines**, see [CLAUDE_WORKFLOWS.md](CLAUDE_WORKFLOWS.md).

**Key workflows:**

1. **Session Management** - Token efficiency monitoring, automatic session restart suggestions
2. **Documentation Standards** - Git history review, status accuracy, iterative refinement
3. **Testing Standards** - Investigation requirements, test result reporting, performance monitoring
4. **System Health** - Proactive resource monitoring, health checks, orphaned process cleanup
5. **Testing Status Updates** - Real-time status tracking with full timestamps (see below)

**Critical rules (enforced automatically):**
- Never mark work "✅ COMPLETED" until tests verify it works
- Always investigate test failures, skipped tests, and warnings
- Review git history before updating documentation
- Monitor token usage and suggest session restarts proactively
- Run system health checks before intensive operations
- Update TESTING_STATUS.md with full timestamps after every test run

### Documentation Timestamp Standards

**REQUIRED**: All status documents MUST use full timestamps in the format:

**Format**: `YYYY-MM-DD HH:MM:SS TZ (optional description)`

**Examples**:
- `2025-10-31 09:52:20 PDT`
- `2025-10-31 09:52:20 PDT (Bug tracking synchronized)`

**Applies to**:
- `docs/PROJECT_STATUS.md` - "Last Updated" field (top and bottom)
- `docs/TESTING_STATUS.md` - All timestamp fields
- `docs/TESTING_HISTORY.md` - All timestamp fields
- Work summaries (`README_work-summary-*.md`) - Date headers
- Bug tracking files - `created`, `updated`, `fixed` fields

**Get current timestamp**:
```bash
date "+%Y-%m-%d %H:%M:%S %Z"  # Full timestamp with timezone
```

**Why this matters**:
- Provides precise point-in-time references for all documentation
- Enables exact correlation between doc updates and git commits
- Tracks historical changes with minute-level precision
- Prevents ambiguity when multiple updates happen same day

### Results Document Organization (General Principle)

**⭐ CRITICAL USER PREFERENCE**: All "Results" documents (living status docs) MUST have "Next Steps" near the top.

**Why this matters**:
- Provides immediate visibility of priorities without scrolling
- Makes documents actionable, not just informational
- User can see what to work on next first, then dive into details
- Aligns with project management best practices

**Applies to**:
- `docs/PROJECT_STATUS.md` - Development priorities
- `docs/TESTING_STATUS.md` - Testing priorities
- Any other living status/results document

**Structure requirement**: Next Steps should appear as section #2 or #3 (right after Last Updated / Current State, before detailed content).

---

### PROJECT_STATUS.md Organization

**REQUIRED**: When updating `docs/PROJECT_STATUS.md`, maintain this structure:

**Document Order**:
1. **Last Updated** (at top) - Full timestamp format
2. **Current State** - Brief overview with key metrics
3. **Recommended Next Steps** ⭐ **MUST be here** - Immediate visibility of priorities
4. **Development Phases** - Overview and detailed phase status
5. **Phase 2 Sub-Phases** - Detailed sub-phase tracking
6. **Feature Work Options** - Available work options
7. **Testing Status** - Current test metrics summary
8. **Bug Tracking** - Bug counts and recent fixes
9. **Project Metrics** - Codebase and velocity metrics
10. **Related Documentation** - Links to other docs
11. **Last Updated** (at bottom) - Full timestamp with major updates history

---

### TESTING_STATUS.md Organization

**REQUIRED**: When updating `docs/TESTING_STATUS.md`, maintain this structure:

**Document Order**:
1. **Last Updated** (at top) - Full timestamp format
2. **Latest Test Run Results** - Quick summary of most recent run
3. **Next Steps / Priorities** ⭐ **MUST be here** - Immediate visibility of testing priorities
4. **Detailed Test Results** - Full breakdown of latest run
5. **Previous Test Run Results** - Summary of previous run
6. **Historical Context - Past Investigation Work** - Archived investigations with clear timeline warnings (see Step 4)
7. **Related Files** - Links to test files and docs
8. **Quick Commands** - Common testing commands

**Why**: Users should see testing priorities immediately without scrolling through detailed test results.

**Important**: Historical investigation content MUST include clear timeline warnings to prevent confusion (see "Step 4: Managing Historical Investigation Content" below).

### Testing Status Update Requirements

**REQUIRED**: When user requests testing status or after running comprehensive tests, follow this workflow:

#### Step 1: Archive Oldest Run (If Needed)

**Policy**: TESTING_STATUS.md keeps only **2 most recent comprehensive test runs**

**Helper Scripts Available** ✅:
```bash
# Check if archival is needed
./helper-scripts/count-test-runs.sh

# Archive oldest run (if needed)
./helper-scripts/archive-oldest-test-run.sh

# Preview what would be archived (dry run)
./helper-scripts/archive-oldest-test-run.sh --dry-run
```

**What the archival script does automatically**:
1. Checks if TESTING_STATUS.md has 2+ test runs
2. Extracts the oldest run section
3. Creates archive file: `testing-history/TEST_STATUS_YYYY-MM-DD_HHMM.md` (24-hour format)
4. Updates `testing-history/README.md` index with new entry
5. Removes oldest run from TESTING_STATUS.md
6. Updates archived run count in index
7. Stages all files for commit (user reviews and commits)

**Manual archival** (if scripts not available):
1. Copy oldest run section to `testing-history/TEST_STATUS_YYYY-MM-DD_HHMM.md`
2. Use 24-hour time format (e.g., `TEST_STATUS_2025-11-19_0136.md` for 01:36 PST run)
3. Update `testing-history/README.md` index with new entry
4. Remove archived run from TESTING_STATUS.md

**See also**: [README_dev.md - Helper Scripts](README_dev.md#helper-scripts) for full script documentation

#### Step 2: Add New Run to TESTING_STATUS.md

**Content to add**:
1. **Latest Test Run Results section** (position #2 - after frontmatter):
   - Full date/time stamp in format: `YYYY-MM-DD HH:MM:SS TZ` (e.g., "2025-10-31 09:11:27 PDT")
   - Run type (Comprehensive, Backend only, E2E only, etc.)
   - Total runtime
   - Quick summary table with all test suites
   - Detailed breakdown of results
   - Comparison to previous run
   - Key observations

2. **Update "Last Updated" timestamp** (in frontmatter):
   - Format: `YYYY-MM-DD HH:MM:SS TZ (description)`
   - Example: `2025-10-31 09:11:27 PDT (Added comprehensive test run results)`

3. **Update "Next Steps" section** (position #3):
   - Reflect new priorities based on test results
   - Mark completed priorities as ✅ FIXED
   - Add new priorities if failures discovered

#### Step 3: Commit Changes

```bash
# Get timestamp
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S %Z")

# Commit all changes
git add docs/TESTING_STATUS.md testing-history/
git commit -m "docs: Add test results ($TIMESTAMP), archive oldest run to testing-history"
```

#### Step 4: Managing Historical Investigation Content

**⚠️ CRITICAL**: To prevent timeline confusion, historical investigation content (tests that failed during investigation but were fixed) MUST be clearly distinguished from current test status.

**When to Apply This**:
- When TESTING_STATUS.md contains detailed investigation of test failures
- When test failures occurred during investigation but were fixed before current runs
- When historical context could be confused with current test status

**Required Actions**:

1. **Add Clear Timeline Warnings**:
   - Add prominent warning box at top of historical section
   - Emphasize that failures occurred DURING INVESTIGATION (with specific date)
   - Clarify that tests were FIXED (with specific date)
   - State this is historical documentation, not current status

   Example:
   ```markdown
   > **⚠️ IMPORTANT TIMELINE NOTE**
   > The investigation below describes tests that **FAILED on [DATE] during investigation**.
   > **All tests were FIXED the same day ([DATE])** and have been passing in all subsequent runs.
   > This section is **historical documentation** only - all tests are currently working.
   ```

2. **Move Detailed Investigations to Archive**:
   - Create investigation archive file in `testing-history/`
   - Naming convention: `ISSUE-NNN_INVESTIGATION_YYYY-MM-DD.md` or similar descriptive name
   - Include complete investigation timeline, evidence, fixes, and final status
   - Include same timeline warning in archive file

3. **Update Section Structure**:
   - Rename section to clearly indicate historical context
   - Example: "Historical Context - Past Investigation Work" instead of "Recent Testing Work"
   - Replace detailed content with brief summary + link to archive
   - Summary should include: investigation date, status (✅ COMPLETED), affected tests, key finding, link to detailed archive
   - Update `testing-history/README.md` index with new investigation archive

**Example Summary Structure**:
```markdown
## Historical Context - Past Investigation Work

### ISSUE-055 Investigation (November 18, 2025) - ✅ COMPLETED

> **⚠️ IMPORTANT TIMELINE NOTE**
> [Timeline clarification here]

**Investigation Date**: 2025-11-18 (completed same day)
**Status**: ✅ All 4 tests fixed and verified
**Affected Tests**: #504, #511, #441, #547
**Key Fix**: Replaced UI state waits with API response waits
**Detailed Investigation**: See [testing-history/ISSUE-055_INVESTIGATION_2025-11-18.md](...)
```

**Why This Matters**:
- Prevents confusion where current runs show "all passed" while investigation section describes failures
- Makes timeline crystal clear: failures were during investigation, not in current runs
- Maintains valuable investigation documentation without cluttering current status
- Enables future reference to investigation process without timeline ambiguity

**Important Notes**:
- TESTING_STATUS.md = workspace for **current + previous run only** (2 runs max)
- testing-history/ = permanent archive of **all older runs** (one file per run) + **investigation archives**
- Completed work summaries (like ISSUE-053) can stay in TESTING_STATUS.md for 1-2 weeks, then archive
- Use `testing-history/README.md` as index to find specific runs and investigations

**See also**: `testing-history/README.md` for full archive index

**Why this matters:**
- User can see exact test results at any point in time
- Historical tracking of test performance over time
- Prevents confusion between estimates and actual results
- Prevents confusion between historical investigations and current test status
- Enables debugging of test regressions with precise timestamps

---

## Development Commands

### Database Setup
```bash
# Install PostgreSQL (macOS)
brew install postgresql@14
brew services start postgresql@14

# Create database and user
psql -U postgres
CREATE DATABASE jobhunter;
CREATE USER jobhunter_user WITH PASSWORD 'jobhunter_dev_password';
GRANT ALL PRIVILEGES ON DATABASE jobhunter TO jobhunter_user;
\q

# Run schema
psql -U jobhunter_user -d jobhunter -f database/schema.sql
```

### Backend (Rust)
```bash
cd backend
cargo build          # Build the project
cargo run            # Run development server (http://localhost:8080)
cargo test            # Run tests
```

### Frontend (React/TypeScript)
```bash
cd frontend
npm install           # Install dependencies
npm start            # Development server (http://localhost:3000)
npm run build        # Production build
npm test             # Run tests

# Recommended: Use test script for better logging/diagnostics
./run-tests.sh       # Frontend tests with logging (from frontend/ directory)
```

---

## Architecture

### Core Data Models
The system centers around three main entities:
- **Jobs**: Job postings collected from various sources with filtering criteria
- **Applications**: Job applications with resume/cover letter versions
- **Communications**: Tracking of all communication related to applications

### Database Schema Key Features
- UUID primary keys throughout
- PostgreSQL-specific features (JSONB, arrays, triggers)
- Automated `updated_at` timestamps
- Views for common queries (`pending_approval_jobs`, `application_stats`, `jobs_with_applications`)
- Deduplication system using content hashes

### Job Filtering Criteria
- Minimum salary: $130,000
- Domain focus: Software/Firmware Testing, Test Automation, Generative AI
- Location: Remote preferred, or ≤45 min from Fremont, CA
- Commute: ≤3 days/week if required

### Development Phases
1. **Phase 1**: Core system with manual job entry
2. **Phase 2** (Current): Gmail integration and automated filtering
3. **Phase 3**: Resume/cover letter generation with LLM integration
4. **Phase 4**: Job board integrations (LinkedIn, Indeed, Dice)
5. **Phase 5**: Advanced features (scheduling, analytics, mobile)

---

## Quick Reference: Where to Find Things

**Document Organization**:

The project uses a consistent structure for development and testing documentation:

**Development Track:**
- **Plans**: `docs/PHASE_*.md` - Detailed development plans for each phase
- **Results**: `docs/PROJECT_STATUS.md` - Summary results + terse recent history
- **Archive**: `docs/PROJECT_HISTORY.md` - Detailed milestone history (permanent record)

**Testing Track:**
- **Plan**: `README_auto-test-plan.md` - Comprehensive testing strategy
- **Results**: `docs/TESTING_STATUS.md` - Latest 2 test runs only (current + previous)
- **Archive**: `testing-history/` - All older test runs (one file per run, see `testing-history/README.md` for index)
- **Guide**: `docs/TESTING_GUIDE.md` - Testing principles and investigation workflows
- **Playwright Best Practices**: `docs/PLAYWRIGHT_BEST_PRACTICES.md` ← **E2E test patterns & anti-patterns**

**Key Pattern**: Plans → Results → Archive (with Results keeping only 2 most recent runs)

---

**Documentation by Type**:
- **Phase Plans**: `docs/PHASE_*.md` - Major feature implementation plans
- **Feature Plans**: `planning/*.md` - Specific feature designs
- **Bug Tracking**: `bugs/open/`, `bugs/mitigated/`, `bugs/fixed/` (see `bugs/README.md` for index)
- **Test Reports**: `README_test-report-*.md` (root level)
- **Testing Status**: `docs/TESTING_STATUS.md` ← **Current + previous run only (2 runs max)**
- **Testing History**: `testing-history/` ← **Archived test runs** (see `testing-history/README.md` for index)
- **Work Summaries**: `README_work-summary-*.md` (root level, dated)
- **Helper Scripts**: `helper-scripts/` directory (see `README_dev.md`)

**Finding Bugs/Issues**:
1. **Always check index first**: `bugs/README.md` (auto-generated)
2. **Use Glob for patterns**: `bugs/**/*ISSUE-018*.md`
3. **Bug ID format**: `BUG-####` (bugs), `ISSUE-####` (issues)
4. **Next available ID**: Run `./helper-scripts/create-bug.sh` to see next ID (scans all directories)

**Finding Test Runs**:
1. **Current + previous run**: `docs/TESTING_STATUS.md` (2 most recent runs only)
2. **Older runs**: `testing-history/README.md` (index of all archived runs)
3. **Specific date**: `testing-history/TEST_STATUS_YYYY-MM-DD_HHMM.md`
4. **Use Glob for patterns**: `testing-history/TEST_STATUS_2025-11-*.md` (all November 2025 runs)

**Navigation Tips**:
- Use `@bugs/README.md` to see current bug list
- Use `@docs/TESTING_STATUS.md` for current test status (2 most recent runs)
- Use `@testing-history/README.md` to find specific archived test runs
- All file paths use `./` prefix convention (ISSUE-011)

**Efficient File Discovery**:
- Use **Task tool with subagent_type=Explore** for exploratory searches (NOT Glob/Grep directly)
- Use **Glob/Grep/Read** only for specific known targets
- Never use bash `find`, `grep`, `cat` for file operations
- **Full details**: See [CLAUDE_WORKFLOWS.md - File Discovery & Code Navigation](CLAUDE_WORKFLOWS.md#file-discovery--code-navigation)

---

**E2E Testing with Playwright**:
- ⚠️ **CRITICAL**: Always consult `docs/PLAYWRIGHT_BEST_PRACTICES.md` when writing or fixing E2E tests
- **Use `data-testid` attributes** for stable locators (especially when multiple similar elements exist)
- **Use serial execution** for tests that modify shared database state or performance tests
- **Use state polling** (`page.waitForFunction()`) instead of fixed timeouts (`page.waitForTimeout()`)
- **Battle-tested patterns** from fixing 10+ flaky tests documented with code examples
- **Full guidance**: See [docs/PLAYWRIGHT_BEST_PRACTICES.md](docs/PLAYWRIGHT_BEST_PRACTICES.md)

---

**Debugging Extraction Issues**:
- ⚠️ **ALWAYS suggest debug mode screenshot FIRST** when user reports extraction problems
- Enable with: `echo "REACT_APP_DEBUG_MODE=true" >> frontend/.env.development.local`
- Reduces debugging time: 5-10 min → <1 min (visual inspection vs database queries)
- **Full workflow**: See [CLAUDE_WORKFLOWS.md - Debugging Extraction Issues](CLAUDE_WORKFLOWS.md#debugging-extraction-issues-workflow)

---

## File Structure
```
backend/src/main.rs    # Single Rust file with full backend implementation
frontend/src/App.tsx   # Main React application component
database/schema.sql    # PostgreSQL database schema
docs/PRD.md           # Product Requirements Document
```

---

## API Endpoints
- `GET /api/jobs` - List all jobs
- `GET /api/jobs/{id}` - Get specific job
- `POST /api/jobs` - Create new job
- `PUT /api/jobs/{id}/status` - Update job status
- `GET /api/jobs/status/{status}` - Get jobs by status
- `GET /api/applications` - List all applications
- `POST /api/applications` - Create new application

---

## GitHub Publication Workflow

**✅ IMPLEMENTED**: Database sanitization workflow for secure public repository publication (ISSUE-040 Phase 5)

**CRITICAL**: Before pushing repository to GitHub public, sanitize database to remove all sensitive credentials.

**Quick Start**:
```bash
./helper-scripts/sanitize-database.sh    # Step 1: Sanitize OAuth credentials
# Review output, commit sanitized schema, then push
```

**What's Protected**:
- OAuth credentials automatically cleared
- `.env*` files blocked by `.gitignore`
- Database backups stored outside repo (`/tmp/`)
- Git history verified clean (no credential leaks)

**Full procedure and verification commands**: See [CLAUDE_WORKFLOWS.md - GitHub Publication Workflow](CLAUDE_WORKFLOWS.md#github-publication-workflow)

---

## Bug Tracking Workflow

**System**: File-based bug tracking optimized for LLM-assisted development (83% token savings vs monolithic files)

**Directory Structure**:
```
bugs/
├── README.md           # Auto-generated index (updated via script)
├── BUG-TEMPLATE.md     # Template for new bugs
├── open/               # Active bugs requiring attention
├── mitigated/          # Partially fixed bugs
└── fixed/              # Fully resolved bugs
```

### When User Asks to "File a Bug"

**REQUIRED: Always use the helper script (never create bug files manually):**
```bash
./helper-scripts/create-bug.sh              # Interactive mode
./helper-scripts/create-bug.sh --type bug   # Direct bug creation
./helper-scripts/create-bug.sh --type issue # Direct issue creation
```

**CRITICAL**: The script will output the next available bug/issue ID (e.g., "Next ID: ISSUE-021"). **ALWAYS use the exact ID the script provides.** The script scans all three directories (open, mitigated, fixed) to avoid ID collisions. Never second-guess or override the script's ID assignment.

**What the script does automatically**:
- Determines next available ID (scans all bug directories)
- Prompts for required fields
- Creates file with correct naming
- Regenerates bug index
- Stages files for commit

**Why this is required**:
- Prevents ID collisions with existing bugs in other directories
- Ensures consistent file naming and YAML frontmatter
- Maintains bug index integrity
- Avoids manual errors in ID assignment

See [README_dev.md - Helper Scripts](README_dev.md#helper-scripts) for full documentation.

### Moving Bugs Between States

**REQUIRED: Always use the helper script (never move bug files manually):**
```bash
./helper-scripts/move-bug.sh BUG-001 fixed
```

**What the script does automatically**:
- Moves file to correct directory (open/mitigated/fixed)
- Updates YAML frontmatter status
- Regenerates bug index
- Stages files for commit

**Why this is required**:
- Ensures YAML frontmatter matches file location
- Maintains bug index integrity
- Prevents manual errors

See [README_dev.md - Helper Scripts](README_dev.md#helper-scripts) for full documentation.

### Key Principles

- **Token Efficiency**: Read only the specific bug file needed (avg 6KB) vs entire bug list (12KB+)
- **Complete Documentation**: Fill ALL sections - don't leave placeholders
- **Proposed Solutions**: Always include multiple options with pros/cons/effort estimates
- **Related Files**: Reference specific file paths and line numbers (e.g., `backend/src/main.rs:2652`)
- **Testing Commands**: Include exact commands to reproduce and verify
