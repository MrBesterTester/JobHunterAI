<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Helper Scripts](#helper-scripts)
  - [Bug Tracking Scripts](#bug-tracking-scripts)
    - [`create-bug.sh`](#create-bugsh)
    - [`move-bug.sh`](#move-bugsh)
    - [`regenerate-bug-index.sh`](#regenerate-bug-indexsh)
  - [Git Session Management](#git-session-management)
    - [`tag-session.sh`](#tag-sessionsh)
    - [`list-sessions.sh`](#list-sessionssh)
  - [Database Management](#database-management)
    - [`switch-to-personal.sh`](#switch-to-personalsh)
    - [`switch-to-dev.sh`](#switch-to-devsh)
    - [`backup-personal-db.sh`](#backup-personal-dbsh)
    - [`restore-personal-db.sh`](#restore-personal-dbsh)
    - [`reset-dev-db.sh`](#reset-dev-dbsh)
    - [`restart-db.sh`](#restart-dbsh)
  - [Testing Scripts](#testing-scripts)
    - [`run-all-tests.sh`](#run-all-testssh)
  - [System Monitoring](#system-monitoring)
    - [`system-health-check.sh`](#system-health-checksh)
  - [Data Management](#data-management)
    - [`bulk-re-extraction.sh`](#bulk-re-extractionsh)
    - [`check-extraction-progress.sh`](#check-extraction-progresssh)
    - [`clear-cursor-cache.sh`](#clear-cursor-cachesh)
    - [`clear-job-data.sh`](#clear-job-datash)
    - [`sync-extraction-prompt-to-db.sh`](#sync-extraction-prompt-to-dbsh)
  - [Email Testing](#email-testing)
    - [`mark-microsoft-emails-unread.sh`](#mark-microsoft-emails-unreadsh)
  - [Usage Tips](#usage-tips)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Helper Scripts

This directory contains automation and maintenance scripts for the JobHunter project.

**Organization**: All helper scripts are stored here to keep the project root clean. User-facing scripts (`start.sh`, `stop.sh`) remain in the root for convenience.

---

## Bug Tracking Scripts

### `create-bug.sh`
Creates a new bug or issue file with proper ID sequencing.

```bash
./helper-scripts/create-bug.sh              # Interactive mode
./helper-scripts/create-bug.sh --type bug   # Direct bug creation
./helper-scripts/create-bug.sh --type issue # Direct issue creation
```

- Scans all bug directories to find next available ID
- Creates file from template with correct naming
- Regenerates bug index automatically
- Stages files for commit

### `move-bug.sh`
Moves bug files between states (open/mitigated/fixed).

```bash
./helper-scripts/move-bug.sh BUG-001 fixed
```

- Moves file to correct directory
- Updates YAML frontmatter status
- Regenerates bug index
- Stages files for commit

### `regenerate-bug-index.sh`
Regenerates the `bugs/README.md` index file.

```bash
./helper-scripts/regenerate-bug-index.sh
```

- Scans all bug directories
- Creates sorted index by ID
- Called automatically by create-bug.sh and move-bug.sh

---

## Git Session Management

### `tag-session.sh`
Creates date-based git tags for work sessions.

```bash
./helper-scripts/tag-session.sh end-of-pm "Description of work"
./helper-scripts/tag-session.sh end-of-day "Completed Phase 5.1.1"
```

**Tag Format**: `{session-type}-{YYYY-MM-DD}`

**Common session types**: `end-of-am`, `end-of-pm`, `end-of-day`, `end-of-evening`

### `list-sessions.sh`
Lists recent git session tags.

```bash
./helper-scripts/list-sessions.sh         # Last 10 sessions
./helper-scripts/list-sessions.sh --week  # Last week
./helper-scripts/list-sessions.sh --month # Last month
```

---

## Database Management

### `switch-to-personal.sh`
Switches to personal development database.

```bash
./helper-scripts/switch-to-personal.sh
```

- Updates `.env` to use `jobhunter_personal` database
- Default for development work

### `switch-to-dev.sh`
Switches to shared development database.

```bash
./helper-scripts/switch-to-dev.sh
```

- Updates `.env` to use `jobhunter` database
- Use for testing shared scenarios

### `backup-personal-db.sh`
Creates backup of personal database.

```bash
./helper-scripts/backup-personal-db.sh
```

### `restore-personal-db.sh`
Restores personal database from backup.

```bash
./helper-scripts/restore-personal-db.sh <backup-file>
```

### `reset-dev-db.sh`
Resets development database to clean state.

```bash
./helper-scripts/reset-dev-db.sh
```

### `restart-db.sh`
Restarts PostgreSQL service.

```bash
./helper-scripts/restart-db.sh
```

---

## Testing Scripts

### `run-all-tests.sh`
Runs complete test suite (backend + frontend + E2E).

```bash
./helper-scripts/run-all-tests.sh
```

- Runs cargo test (backend)
- Runs npm test (frontend unit)
- Runs npm run test:e2e (E2E)
- Aggregates results

---

## System Monitoring

### `system-health-check.sh`
Checks system resources and running processes.

```bash
./helper-scripts/system-health-check.sh
```

- CPU usage
- Memory usage
- Disk space
- Running services (PostgreSQL, backend, frontend)
- Orphaned processes

---

## Data Management

### `bulk-re-extraction.sh`
Re-extracts job data for multiple jobs.

```bash
./helper-scripts/bulk-re-extraction.sh
```

### `check-extraction-progress.sh`
Monitors LLM extraction progress.

```bash
./helper-scripts/check-extraction-progress.sh
```

### `clear-cursor-cache.sh`
Clears Cursor AI cache.

```bash
./helper-scripts/clear-cursor-cache.sh
```

### `clear-job-data.sh`
Clears job data from database (with confirmation).

```bash
./helper-scripts/clear-job-data.sh
```

### `sync-extraction-prompt-to-db.sh`
Syncs extraction prompt to database.

```bash
./helper-scripts/sync-extraction-prompt-to-db.sh
```

---

## Email Testing

### `mark-microsoft-emails-unread.sh`
Marks Microsoft emails as unread for testing.

```bash
./helper-scripts/mark-microsoft-emails-unread.sh
```

- Used for Phase 2.7 E2E testing
- Requires Microsoft Graph API credentials

---

## Usage Tips

**For Claude Code**:
- Always reference scripts with full path: `./helper-scripts/<script>.sh`
- Use these scripts instead of manual file operations
- Scripts handle ID sequencing, index updates, and git staging automatically

**For Developers**:
- Use `./start.sh` and `./stop.sh` from project root (not moved)
- Check this README for script documentation
- Scripts are designed to be idempotent and safe

---

**Last Updated**: 2025-11-04
