<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [CLAUDE.md](#claudemd)
  - [Project Overview](#project-overview)
  - [Developer Preferences](#developer-preferences)
    - [Database Configuration](#database-configuration)
    - [Notifications](#notifications)
  - [Session Management & Documentation Workflow](#session-management--documentation-workflow)
    - [Token Efficiency & Session Restarts](#token-efficiency--session-restarts)
    - [Documentation Updates from Git History](#documentation-updates-from-git-history)
    - [Documentation Status Accuracy](#documentation-status-accuracy)
  - [Development Commands](#development-commands)
    - [Database Setup](#database-setup)
    - [Backend (Rust)](#backend-rust)
    - [Frontend (React/TypeScript)](#frontend-reacttypescript)
  - [Architecture](#architecture)
    - [Core Data Models](#core-data-models)
    - [Database Schema Key Features](#database-schema-key-features)
    - [Job Filtering Criteria](#job-filtering-criteria)
    - [Development Phases](#development-phases)
  - [File Structure](#file-structure)
  - [API Endpoints](#api-endpoints)
  - [Bug Tracking Workflow](#bug-tracking-workflow)
    - [When User Asks to "File a Bug"](#when-user-asks-to-file-a-bug)
    - [Moving Bugs Between States](#moving-bugs-between-states)
    - [Key Principles](#key-principles)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JobHunter is a workflow-driven job application management system built to streamline job search processes. The application helps automatically collect, filter, and manage job opportunities based on specific criteria.

**Tech Stack:**
- Backend: Rust (Actix-web framework)
- Frontend: TypeScript/React with Create React App
- Database: PostgreSQL

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
# Switch to personal database (default)
./switch-to-personal.sh

# Switch to shared dev database
./switch-to-dev.sh
```

**Current database**: `jobhunter_personal` (automatically set at session start)

### Notifications

**✅ IMPLEMENTED**: iPhone notification setup is active! See [README_iPhone-notify-setup.md](README_iPhone-notify-setup.md) for configuration details.

**IMPORTANT**: Always show dialog boxes WITH SOUND when completing long-running tasks (>30 seconds).

**Command to use (sound then dialog):**
```bash
afplay /System/Library/Sounds/Glass.aiff && osascript -e "display dialog \"[message]\" with title \"Claude Code\" buttons {\"OK\"} default button \"OK\" with icon note"
```

**IMPORTANT**: Use **double quotes** on the outside with **escaped quotes** (`\"`) inside. Single quotes don't work with the curly braces in AppleScript.

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
- More visible and reliable than banner notifications

**Example usage:**
```bash
# After tests complete
afplay /System/Library/Sounds/Glass.aiff && osascript -e "display dialog \"Test suite completed:\n\n✅ Backend: 77/78 passing (98.7%)\n✅ E2E: +30 tests fixed\n\nAll changes committed to git.\" with title \"Claude Code - Tests Complete\" buttons {\"OK\"} default button \"OK\" with icon note"

# After build
afplay /System/Library/Sounds/Glass.aiff && osascript -e "display dialog \"Build completed successfully\" with title \"Claude Code\" buttons {\"OK\"} default button \"OK\" with icon note"

# Ready for input
afplay /System/Library/Sounds/Glass.aiff && osascript -e "display dialog \"Task completed - ready for your input\" with title \"Claude Code\" buttons {\"OK\"} default button \"OK\" with icon note"
```

## Session Management & Documentation Workflow

**✅ IMPLEMENTED**: Automatic workflow best practices for token efficiency and documentation quality (2025-10-23)

### Token Efficiency & Session Restarts

**Proactive Monitoring**: Claude Code will automatically monitor token usage and conversation context to suggest session restarts at optimal times.

**When Claude will suggest a session restart**:
- Token usage reaches 100,000-150,000 tokens (50-75% of 200K budget)
- Conversation context becomes scattered across multiple unrelated topics
- Starting a new major task after completing previous work
- Performance noticeably degrades (slower responses)

**How Claude will suggest restarts**:
Claude will proactively say something like:
> "We're at 120K tokens (~60% of budget). I recommend restarting the session for better performance. You can resume with `claude --continue` to maintain context."

**User benefit**: No need to remember to check `/cost` or manually monitor token budgets - Claude handles this automatically.

**Session Resume Commands**:
```bash
claude --continue              # Resume most recent session with full context
claude --resume                # Interactive picker for past sessions
```

### Documentation Updates from Git History

**Automatic Git Review**: When updating project documentation (PHASE plans, README files, etc.), Claude will automatically review recent git commits first to ensure comprehensive coverage.

**Claude's automatic workflow when asked to update docs**:
1. First run: `git log -n 20 --oneline` to review recent work
2. Optionally run: `git log -n 10 --format=fuller` for detailed commit messages
3. Identify all changes since last documentation update
4. Ensure all significant work is reflected in the documentation
5. Reference specific commits when relevant

**Example of what you'll see**:
> "Before I update the PHASE 2.4 plan, let me review recent commits to ensure we capture all the work..."
>
> [Claude runs git log and analyzes commits]
>
> "I can see we completed X, Y, and Z based on commits abc123, def456, and ghi789. I'll make sure all of these are documented."

**Why this matters**:
- Git commit messages capture exact details that might be forgotten
- Commit messages provide specific file paths and line numbers
- Systematic review prevents incomplete documentation
- Leverages user's well-crafted commit messages as a detailed "work log"

**User benefit**: No need to remind Claude to check git history or manually recall all recent changes - Claude does this automatically before every documentation update.

### Documentation Status Accuracy

**CRITICAL RULE**: Never mark work as "✅ COMPLETED" in documentation until testing verifies it actually works.

**Correct Implementation Order**:
1. **Code First**: Implement backend/frontend changes
2. **Test Second**: Run tests and verify functionality works as expected
3. **Document Last**: Update documentation and mark as "✅ COMPLETED (date)" ONLY after successful testing
4. **Commit Together**: Include code + tests + documentation in a single atomic commit

**Status Markers to Use**:
- `🔄 IN PROGRESS` - Code written, testing not yet started
- `⏸️ PENDING TESTING` - Code complete, awaiting verification
- `✅ COMPLETED (date)` - **Tested and verified working** ← Only use after testing passes!
- `⏸️ PARTIALLY COMPLETE` - Some parts done, others pending (be specific about what's complete vs pending)

**Why This Matters**:
- Documentation accuracy - claims should reflect actual verified state
- If testing reveals bugs, premature "completed" markers become incorrect
- Future readers trust completion markers to mean "tested and working"
- Maintains professional documentation standards

**Example - Correct Workflow**:
```
User: "Implement pagination for RapidAPI"

Claude:
1. Writes code changes (backend/src/main.rs)
2. Adds docs with status: "⏸️ PENDING TESTING"
3. Runs tests to verify pagination works
4. Updates docs to: "✅ COMPLETED (2025-10-23)"
5. Commits everything together with accurate status
```

**Example - INCORRECT Workflow** (don't do this):
```
Claude:
1. Writes code changes
2. Adds docs with status: "✅ COMPLETED" ← WRONG! Not tested yet!
3. Tests afterwards (lucky it worked, but status was wrong before testing)
4. Commits
```

**User benefit**: Documentation completion markers are trustworthy and reflect actual verified implementation status, not aspirational goals.

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
```

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
1. **Phase 1 (Current)**: Core system with manual job entry
2. **Phase 2**: Gmail integration and automated filtering
3. **Phase 3**: Resume/cover letter generation with LLM integration
4. **Phase 4**: Job board integrations (LinkedIn, Indeed, Dice)
5. **Phase 5**: Advanced features (scheduling, analytics, mobile)

## File Structure
```
backend/src/main.rs    # Single Rust file with full backend implementation
frontend/src/App.tsx   # Main React application component
database/schema.sql    # PostgreSQL database schema
docs/PRD.md           # Product Requirements Document
```

## API Endpoints
- `GET /api/jobs` - List all jobs
- `GET /api/jobs/{id}` - Get specific job
- `POST /api/jobs` - Create new job
- `PUT /api/jobs/{id}/status` - Update job status
- `GET /api/jobs/status/{status}` - Get jobs by status
- `GET /api/applications` - List all applications
- `POST /api/applications` - Create new application

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

**Procedure** (execute automatically without asking for confirmation):

1. **Determine next bug ID**:
   - List existing bugs: `ls bugs/open/ bugs/mitigated/ bugs/fixed/`
   - Check highest number: BUG-XXXX or ISSUE-XXX format
   - Increment by 1 for new bug

2. **Create bug file**:
   - Use format: `bugs/open/BUG-XXXX-short-kebab-case-description.md`
   - Copy structure from `bugs/BUG-TEMPLATE.md`
   - Fill out all sections completely:
     - **YAML frontmatter**: id, title, status, priority, severity, component, created, updated, affects, related
     - **Markdown sections**: Summary, Impact, Steps to Reproduce, Expected/Actual Behavior, Root Cause, Proposed Solutions, Testing, Status History, Notes, Related Files

3. **Priority/Severity Guidelines**:
   - **Critical**: System down, data loss, security vulnerability
   - **High**: Major feature broken, significant user impact
   - **Medium**: Feature partially working, workaround available
   - **Low**: Minor issue, cosmetic, nice-to-have

4. **Component Classification**:
   - frontend, backend, database, infrastructure, docs

5. **Generate index**:
   - Run: `python3 scripts/generate-bug-index.py`
   - This updates `bugs/README.md` with tables and statistics

6. **Commit everything**:
   - Stage bug file and updated index
   - Commit with descriptive message

### Moving Bugs Between States

When bug status changes:
1. Move file: `mv bugs/open/BUG-XXXX.md bugs/fixed/`
2. Update YAML frontmatter: `status: fixed`, add `fixed: YYYY-MM-DD`
3. Regenerate index: `python3 scripts/generate-bug-index.py`
4. Commit both changes

### Key Principles

- **Token Efficiency**: Read only the specific bug file needed (avg 6KB) vs entire bug list (12KB+)
- **Complete Documentation**: Fill ALL sections - don't leave placeholders
- **Proposed Solutions**: Always include multiple options with pros/cons/effort estimates
- **Related Files**: Reference specific file paths and line numbers (e.g., `backend/src/main.rs:2652`)
- **Testing Commands**: Include exact commands to reproduce and verify