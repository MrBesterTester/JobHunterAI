<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [CLAUDE.md](#claudemd)
  - [Table of Contents](#table-of-contents)
  - [Project Overview](#project-overview)
  - [Developer Preferences](#developer-preferences)
    - [Database Configuration](#database-configuration)
    - [Notifications](#notifications)
    - [File Path Conventions](#file-path-conventions)
    - [Work Session Tagging](#work-session-tagging)
  - [Workflow Standards (Summary)](#workflow-standards-summary)
    - [Testing Status Update Requirements](#testing-status-update-requirements)
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
  - [Work Session Tagging](#work-session-tagging)
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

**Manual database switching** (if needed):
```bash
./switch-to-personal.sh    # Switch to personal database (default)
./switch-to-dev.sh          # Switch to shared dev database
```

**Current database**: `jobhunter_personal` (automatically set at session start)

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

### File Path Conventions

**IMPORTANT**: Always use relative paths with `./` for files in the project directory.

**Working directory**: `/Users/sam/Projects/JobHunterAI-Claude` (available in `<env>`)

**Examples**:
- Root files: `./CLAUDE.md`, `./README.md`, `./package.json`
- Subdirectories: `./backend/src/main.rs`, `./docs/file.md`
- Scripts: `./switch-to-personal.sh`, `./start.sh`

**Why**: Clearer, more portable, eliminates path resolution ambiguity. See [ISSUE-011](bugs/fixed/ISSUE-011-file-path-prefix-conventions.md) for detailed research.

### Work Session Tagging

**✅ IMPLEMENTED**: Date-based git tagging convention for daily work sessions (2025-10-24)

**Quick Reference**:
```bash
./tag-session.sh end-of-pm "Description of today's work"
./list-sessions.sh --week
```

**Tag Format**: `{session-type}-{YYYY-MM-DD}` (e.g., `end-of-pm-2025-10-24`)

**Common session types**: `end-of-am`, `end-of-pm`, `end-of-day`, `end-of-evening`

**Full documentation**: See [README_dev.md - Helper Scripts](README_dev.md#tag-sessionsh) for detailed usage instructions.

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

### Testing Status Update Requirements

**REQUIRED**: When user requests testing status or after running comprehensive tests, ALWAYS update `docs/TESTING_STATUS.md` with:

1. **Latest Test Run Results section** (at top of document):
   - Full date/time stamp in format: `YYYY-MM-DD HH:MM:SS TZ` (e.g., "2025-10-31 09:11:27 PDT")
   - Run type (Comprehensive, Backend only, E2E only, etc.)
   - Total runtime
   - Quick summary table with all test suites
   - Detailed breakdown of results
   - Comparison to previous run
   - Key observations

2. **Comprehensive Test Suite Runtime section**:
   - Update "Latest Actual Runtime" with timestamp
   - Update all tables with actual results (not estimates)
   - Document variance from estimates with explanations
   - Update "Last Runtime Verification" timestamp

3. **"Last Updated" timestamp** (at top of file):
   - Format: `YYYY-MM-DD HH:MM:SS TZ (description)`
   - Example: `2025-10-31 09:11:27 PDT (Comprehensive test suite execution completed)`

**Commands to get current timestamp:**
```bash
date "+%Y-%m-%d %H:%M:%S %Z"  # Full timestamp with timezone
```

**Example workflow when user asks "run tests":**
```bash
# 1. Run tests and capture results
cargo test 2>&1 | tee /tmp/backend-test-results.log
npm test 2>&1 | tee /tmp/frontend-test-results.log
npm run test:e2e 2>&1 | tee /tmp/e2e-test-results.log

# 2. Get timestamp
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S %Z")

# 3. Update TESTING_STATUS.md with:
#    - Latest Test Run Results section (with $TIMESTAMP)
#    - Actual test counts from logs
#    - Runtime data
#    - Comparison to previous run

# 4. Commit the update
git add docs/TESTING_STATUS.md
git commit -m "docs: Update TESTING_STATUS.md with test results ($TIMESTAMP)"
```

**Why this matters:**
- User can see exact test results at any point in time
- Historical tracking of test performance over time
- Prevents confusion between estimates and actual results
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

**Documentation by Type**:
- **Phase Plans**: `docs/PHASE_*.md` - Major feature implementation plans
- **Feature Plans**: `planning/*.md` - Specific feature designs
- **Bug Tracking**: `bugs/open/`, `bugs/mitigated/`, `bugs/fixed/` (see `bugs/README.md` for index)
- **Test Reports**: `README_test-report-*.md` (root level)
- **Testing Status**: `docs/TESTING_STATUS.md` ← **Current status & open issues**
- **Testing History**: `docs/TESTING_HISTORY.md` ← **Completed work archive**
- **Work Summaries**: `README_work-summary-*.md` (root level, dated)
- **Helper Scripts**: `./create-bug.sh`, `./move-bug.sh`, `./tag-session.sh`, etc. (see `README_dev.md`)

**Finding Bugs/Issues**:
1. **Always check index first**: `bugs/README.md` (auto-generated)
2. **Use Glob for patterns**: `bugs/**/*ISSUE-018*.md`
3. **Bug ID format**: `BUG-####` (bugs), `ISSUE-####` (issues)
4. **Next available ID**: Run `./create-bug.sh` to see next ID (scans all directories)

**Navigation Tips**:
- Use `@bugs/README.md` to see current bug list
- Use `@docs/TESTING_STATUS.md` for current test status & open issues
- Use `@docs/TESTING_HISTORY.md` for completed testing work history
- All file paths use `./` prefix convention (ISSUE-011)

**Efficient File Discovery** (per Anthropic system instructions):

**For exploratory searches** (primary method for file discovery):
- **Use Task tool with subagent_type=Explore** - NOT Glob/Grep directly
- This reduces context usage and provides better search results
- **When to use**:
  - "Where are errors from the client handled?"
  - "How does authentication work in this codebase?"
  - "Find files that implement feature X"
  - "What is the codebase structure?"
  - Any open-ended search requiring multiple rounds of discovery

**For specific known targets only** (narrow exceptions):
- **Glob tool**: When you know the exact file pattern you're looking for
  - Example: `Glob: bugs/**/*ISSUE-018*.md` (looking for specific issue file)
  - Use case: You know the file naming pattern and just need to find it
- **Grep tool**: When searching within a specific file or 2-3 known files
  - Example: `Grep: "class Foo" path: ./src/auth.ts` (finding specific class definition)
  - Use case: Narrow search in known locations
- **Read tool**: When you know the exact file path
  - Always preferred over bash commands like `cat`, `head`, `tail`
  - Use case: Direct access to known file

**CRITICAL: Always avoid**:
- Using bash `find`, `grep`, `cat` commands for file operations
- Using Glob/Grep for exploratory searches (use Task/Explore instead)
- Guessing file paths instead of searching properly

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
./create-bug.sh              # Interactive mode
./create-bug.sh --type bug   # Direct bug creation
./create-bug.sh --type issue # Direct issue creation
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
./move-bug.sh BUG-001 fixed
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
