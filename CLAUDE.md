<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [CLAUDE.md](#claudemd)
  - [Project Overview](#project-overview)
  - [Developer Preferences](#developer-preferences)
    - [Database Configuration](#database-configuration)
    - [Notifications](#notifications)
    - [File Path Conventions](#file-path-conventions)
    - [Work Session Tagging](#work-session-tagging)
  - [Session Management & Documentation Workflow](#session-management--documentation-workflow)
    - [Token Efficiency & Session Restarts](#token-efficiency--session-restarts)
    - [Documentation Updates from Git History](#documentation-updates-from-git-history)
    - [Documentation Status Accuracy](#documentation-status-accuracy)
    - [Iterative Documentation Refinement](#iterative-documentation-refinement)
  - [Testing & Verification Standards](#testing--verification-standards)
    - [Core Principles](#core-principles)
    - [Test Result Reporting Standards](#test-result-reporting-standards)
    - [Investigation Workflow](#investigation-workflow)
    - [Performance Monitoring](#performance-monitoring)
    - [Automated Test Execution](#automated-test-execution)
    - [When to Mark Tests as Complete](#when-to-mark-tests-as-complete)
    - [User Accountability](#user-accountability)
  - [System Health Monitoring & Resource Management](#system-health-monitoring--resource-management)
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

### File Path Conventions

**IMPORTANT**: Always use relative paths with `./` for files in the project directory.

**Working directory**: `/Users/sam/Projects/JobHunterAI-Claude` (available in `<env>`)

**Examples**:
- Root files: `./CLAUDE.md`, `./README.md`, `./package.json`
- Subdirectories: `./backend/src/main.rs`, `./docs/file.md`
- Scripts: `./switch-to-personal.sh`, `./start.sh`

**Why**: Clearer, more portable, eliminates path resolution ambiguity. See [ISSUE-011](bugs/fixed/ISSUE-011-file-path-prefix-conventions.md) for detailed research on when `./` is required vs optional.

**Alternative**: Full absolute paths also work but are more verbose.

### Work Session Tagging

**✅ IMPLEMENTED**: Date-based git tagging convention for daily work sessions (2025-10-24)

**Quick Reference**:
```bash
./tag-session.sh end-of-pm "Description of today's work"
./list-sessions.sh --week
```

**Tag Format**: `{session-type}-{YYYY-MM-DD}` (e.g., `end-of-pm-2025-10-24`)

**Common session types**: `end-of-am`, `end-of-pm`, `end-of-day`, `end-of-evening`

**Full documentation**: See [README_dev.md - Helper Scripts](README_dev.md#tag-sessionsh) for detailed usage instructions and [ISSUE-014](bugs/fixed/ISSUE-014-work-session-tagging-convention.md) for rationale and design decisions.

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

### Iterative Documentation Refinement

**IMPORTANT PRINCIPLE**: The best summaries always come at the end of investigation, after understanding is complete.

**The Challenge**:
- During investigation, you write detailed documentation in issue files
- After investigation completes, you gain clarity and can write concise summaries
- Summary documents (like `docs/TESTING_STATUS.md`) should remain high-level "forest view"
- Detail documents (like `bugs/open/ISSUE-*.md`) contain the "tree view" investigation

**Best Practice - Two-Pass Documentation**:

1. **First Pass** (during investigation):
   - Write detailed findings in the issue/bug file
   - Include root causes, evidence, technical analysis
   - Document everything discovered

2. **Second Pass** (after investigation):
   - Review what you wrote and distill key insights
   - Update summary documents with concise "forest view"
   - Link to detail documents for deep dives
   - Remove duplicate detail from summary docs

**Example - TESTING_STATUS.md should contain**:
```markdown
✅ Fixed 4/8 tests (50%)
⚠️ Remaining 4 expose app code bugs
Pattern: Sequential generation fails
Details: See [ISSUE-023](link) for full investigation
```

**Example - TESTING_STATUS.md should NOT contain**:
- Line-by-line test analysis
- Detailed root cause explanations
- Full stack traces
- Technical implementation details
- Everything that's already in ISSUE-023

**Forest vs Trees Analogy**:
- **Forest view** (summary docs): "4 tests reveal sequential generation bug"
- **Tree view** (issue docs): "Test 2 fails at line 4145 because modal doesn't appear after second generateContent() call due to state not resetting..."

**User benefit**: Summary documents remain readable and provide quick status overview, while detailed investigation remains available in linked issue files.

## Testing & Verification Standards

**✅ IMPLEMENTED**: Comprehensive testing standards for frontend (Jest) and backend (Cargo) test suites (2025-10-27)

**Context**: Created to ensure rigorous test result analysis beyond superficial pass/fail reporting. Console output suppression (ISSUE-021) makes output cleaner, but does NOT mean ignoring failures, skipped tests, or warnings. Investigation depth and test result understanding are critical.

**Testing Status & Progress Tracking**:
- **Current Status**: See [docs/TESTING_STATUS.md](docs/TESTING_STATUS.md) for comprehensive frontend testing progress
- **Investigation Guide**: See [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md) for detailed investigation examples and tutorials
- **Genesis Report**: [README_test-report-10-23-2025.md](README_test-report-10-23-2025.md) - Initial assessment revealing zero frontend unit tests
- **Active Issues**: ISSUE-018 (frontend unit test implementation), ISSUE-023 (test failure fixes)

### Core Principles

**CRITICAL RULE**: Test results require investigation and understanding, not just pass/fail counts.

**What "passing tests" actually means**:
- ✅ All assertions passed
- ✅ No skipped tests (or skipped tests are intentional and documented)
- ✅ No unexpected warnings or deprecation notices
- ✅ Execution time is reasonable (not hanging or degraded)
- ✅ No flaky behavior (consistent pass/fail across runs)

**Investigation is ALWAYS required for**:
- Test failures (even a single failure)
- Skipped tests (understand why they're skipped)
- Warnings or deprecation notices
- Performance degradation (execution time increases)
- Exit codes other than 0 (especially 143, 137)
- Unusual patterns in output

### Test Result Reporting Standards

**❌ UNACCEPTABLE Reporting** (superficial):
```
Tests passed! ✅
```

**✅ REQUIRED Reporting** (investigative):
```
Test results from ./run-tests.sh:
- ✅ 77/78 tests passing (98.7%)
- ❌ 1 failing: IntakeTab.test.tsx:245 - assertion failure in 'should handle source identification'
  - Expected: sourceType = 'gmail'
  - Actual: sourceType = 'unknown'
  - Root cause: API mock not returning correct source identification
- ⏭️ 2 skipped: CalendarTab.test.tsx:82, :183
  - Reason: Marked as .skip() with comment 'TODO: API integration pending'
  - Assessment: Intentional, tracked in ISSUE-018 Phase 2B
- ⚠️ Warning: Test execution took 45s (expected 10-15s)
  - Possible cause: Resource contention or memory pressure
  - Action: Running system health check...
- 📊 Log saved: logs/frontend-tests/test-run-20251027-143022.log

Investigating the IntakeTab.test.tsx:245 failure...
```

### Investigation Workflow

**IMPORTANT**: When investigating test failures, **proactively read** [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md) for detailed examples before reporting results. Don't rely on memory - use the documented examples.

When tests fail, investigate systematically:
1. Read full test output (error messages, patterns, warnings)
2. Read the failing test file and component being tested
3. Check test logs for stack traces
4. Identify root cause (not just symptoms)
5. Propose specific fix with reasoning

For skipped tests: Find `.skip()` in source, verify intentional and tracked in issues.

For warnings: Investigate deprecations, performance issues, memory leaks - don't ignore.

For performance degradation: Compare with baseline, check system resources with `./system-health-check.sh`.

**Reference documentation**:
- Investigation examples: [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md)
- System health procedures: [README_dev.md - system-health-check.sh](README_dev.md#system-health-checksh)

### Performance Monitoring

**Expected baselines**: Frontend tests ~15-25s, Backend ~2-5s, E2E ~3-5 mins

Investigate when execution time >2x baseline, tests hang, or resource usage spikes. Use `./system-health-check.sh` to diagnose.

### Automated Test Execution

**Use standardized test scripts** (ISSUE-021):
```bash
# Frontend tests (recommended)
cd frontend && ./run-tests.sh

# Frontend tests (fast iteration, skip typecheck temporarily)
cd frontend && ./run-tests.sh --no-typecheck

# Frontend tests (specific suite)
cd frontend && ./run-tests.sh --filter "Phase 2A"

# Backend tests
cd backend && cargo test
```

**Why use scripts vs direct commands**:
- Automatic log file creation with timestamps
- Clear exit code explanations (143, 137, etc.)
- Integrated TypeScript checking
- Timing measurements
- Consistent execution across sessions

### When to Mark Tests as Complete

**Before marking any work "✅ COMPLETED" in documentation**:
1. ✅ All tests pass (no failures)
2. ✅ No unintentional skipped tests
3. ✅ No new warnings introduced
4. ✅ Performance is acceptable (within 2x baseline)
5. ✅ Test coverage meets requirements
6. ✅ Tests actually validate the implemented functionality (not just mock stubs)

**This aligns with**: "Documentation Status Accuracy" section above - only mark complete after verification.

### User Accountability

**Hold Claude accountable** - If you ever see:
- ❌ Just pass/fail stats without investigation
- ❌ Ignoring skipped tests
- ❌ Not reading error messages or stack traces
- ❌ Marking work complete without running tests
- ❌ Superficial "looks good" without verification

**Please call it out immediately.** This documentation codifies the investigation standard expected for every test run.

**User benefit**: Rigorous, investigative test result analysis ensures test suite integrity, catches regressions early, and maintains high code quality. Documentation and completion markers are trustworthy.

## System Health Monitoring & Resource Management

**✅ IMPLEMENTED**: Automated health monitoring for Claude Code sessions (created after ISSUE-019 critical incident)

**IMPORTANT**: When system performance issues arise, **proactively read** [README_dev.md - system-health-check.sh](README_dev.md#system-health-checksh) for detailed monitoring procedures, thresholds, and diagnostic steps.

**Claude proactively monitors:**
- Process counts (Node.js, Jest, background shells)
- Memory usage patterns and orphaned processes
- Session duration/complexity
- Test run performance
- Claude Code memory leak reports (GitHub)

**When Claude will remind you:**
- Before intensive test runs (>100 tests)
- Every 60-90 minutes during extended sessions
- After long-running tasks (builds, test suites >5 mins)
- When system feels slow or resource-constrained

**Primary commands:**
```bash
./system-health-check.sh           # Quick check (Claude runs automatically)
./system-health-check.sh --full    # Hardware diagnostics (needs sudo)
./system-health-check.sh --cleanup # Kill orphaned processes (you approve)
/bashes                             # Check background shells
```

**Jest resource limits**: `maxWorkers: 4` in `jest.config.js` (ISSUE-022) prevents system overload during parallel test execution.

**Full documentation**: [README_dev.md - system-health-check.sh](README_dev.md#system-health-checksh) - includes usage examples, thresholds, and troubleshooting.

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

## Quick Reference: Where to Find Things

**Documentation by Type**:
- **Phase Plans**: `docs/PHASE_*.md` - Major feature implementation plans
- **Feature Plans**: `planning/*.md` - Specific feature designs
- **Bug Tracking**: `bugs/open/`, `bugs/mitigated/`, `bugs/fixed/` (see `bugs/README.md` for index)
- **Test Reports**: `README_test-report-*.md` (root level)
- **Testing Status**: `docs/TESTING_STATUS.md` ← **Current progress tracking**
- **Work Summaries**: `README_work-summary-*.md` (root level, dated)
- **Helper Scripts**: `./create-bug.sh`, `./move-bug.sh`, `./tag-session.sh`, etc. (see `README_dev.md`)

**Finding Bugs/Issues**:
1. **Always check index first**: `bugs/README.md` (auto-generated)
2. **Use Glob for patterns**: `bugs/**/*ISSUE-018*.md`
3. **Bug ID format**: `BUG-####` (bugs), `ISSUE-####` (issues)
4. **Next available ID**: Run `./create-bug.sh` to see next ID (scans all directories)

**Navigation Tips**:
- Use `@bugs/README.md` to see current bug list
- Use `@docs/TESTING_STATUS.md` for test progress
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