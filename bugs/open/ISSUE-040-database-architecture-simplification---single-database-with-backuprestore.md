---
id: ISSUE-040
title: Database Architecture Simplification - Single Database with Backup/Restore
status: open
priority: high
severity: medium
component: infrastructure
created: 2025-11-10
updated: 2025-11-10
affects: []
related: [ISSUE-039]
---

# ISSUE-040: Database Architecture Simplification - Single Database with Backup/Restore

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Background: The Two-Database Problem](#background-the-two-database-problem)
- [Current State Analysis](#current-state-analysis)
  - [Database Usage Confusion](#database-usage-confusion)
  - [Files Affected by Database Switching](#files-affected-by-database-switching)
- [Root Cause](#root-cause)
- [Evidence](#evidence)
- [Proposed Solutions](#proposed-solutions)
  - [Option A: Destructive E2E Testing (Rejected)](#option-a-destructive-e2e-testing-rejected)
  - [Option B: Single Database with Backup/Restore (RECOMMENDED)](#option-b-single-database-with-backuprestore-recommended)
  - [Option C: Keep Two Databases, Clarify Roles (Rejected)](#option-c-keep-two-databases-clarify-roles-rejected)
- [Decision](#decision)
- [Implementation Plan](#implementation-plan)
  - [Phase 1: Backup/Restore Infrastructure (1-2 hours)](#phase-1-backuprestore-infrastructure-1-2-hours)
  - [Phase 2: Script Updates (1 hour)](#phase-2-script-updates-1-hour)
  - [Phase 3: Documentation Updates (30 minutes)](#phase-3-documentation-updates-30-minutes)
  - [Phase 4: Testing and Verification (30 minutes)](#phase-4-testing-and-verification-30-minutes)
- [Testing](#testing)
- [Relationship to ISSUE-039](#relationship-to-issue-039)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

The project currently maintains two separate PostgreSQL databases (`jobhunter_personal` and `jobhunter_dev`) with switching logic between them. This creates significant complexity and confusion about which database is active, particularly for E2E testing. This issue proposes simplifying to a **single database (`jobhunter_personal`)** with automatic backup/restore functionality for E2E test runs.

**Goal**: Eliminate database switching complexity while protecting development data during destructive E2E test operations.

## Impact

**Who/What is affected:**
- All E2E test execution (Playwright tests)
- Backend test execution (Cargo tests)
- Development workflow (database seeding, data persistence)
- Helper scripts (`seed-test-data.sh`, `switch-to-*.sh`, session hooks)
- Documentation (CLAUDE.md, README_dev.md)

**Severity:**
- **Medium** - Not blocking development, but causing significant confusion and wasted time
- Currently blocking ISSUE-039 (11 E2E test failures) due to database configuration confusion
- Has led to investigation of wrong database, wasted effort on ISSUE-039

## Background: The Two-Database Problem

**Current Architecture:**
```
jobhunter_personal  # Development database (default via SessionStart hook)
jobhunter_dev       # Test database (hardcoded in seed-test-data.sh)
```

**The Confusion:**
1. `frontend/e2e/global-setup.ts:70-72` comments say E2E tests use `jobhunter_personal`
2. `helper-scripts/seed-test-data.sh:22` hardcodes `DATABASE_NAME="jobhunter_dev"`
3. SessionStart hook configures `jobhunter_personal` as default
4. Tests call `seed-test-data.sh --truncate` which clears wrong database
5. Result: Tests run against personal database with no test data seeded

**Why Two Databases Existed:**
- Original intent: Separate dev work from test execution
- Rationale: Protect dev data from truncation during test runs
- Reality: Confusion about which is active, switching overhead, documentation drift

## Current State Analysis

### Database Usage Confusion

**Discovery from ISSUE-039 investigation:**
```bash
# E2E test global-setup.ts says:
"Note: E2E tests use jobhunter_personal database (set by SessionStart hook)"

# But seed-test-data.sh does:
DATABASE_NAME="jobhunter_dev"  # Line 22

# Result: Test data seeded to wrong database!
```

**Actual Database Contents:**
```bash
# jobhunter_personal (8 jobs, real dev data)
$ psql -U jobhunter_user -d jobhunter_personal -c "SELECT status, COUNT(*) FROM jobs GROUP BY status;"
 status  | count
---------+-------
 applied |     1
 approved|     5
 filtered|     1
 rejected|     1

# jobhunter_dev (has test data including "Expert Systems Architect")
$ psql -U jobhunter_user -d jobhunter_dev -c "SELECT COUNT(*) FROM jobs WHERE title = 'Expert Systems Architect';"
 count
-------
     1
```

### Files Affected by Database Switching

**Helper Scripts:**
- `helper-scripts/seed-test-data.sh` - Hardcoded `jobhunter_dev`
- `helper-scripts/switch-to-personal.sh` - Updates `backend/.env`
- `helper-scripts/switch-to-dev.sh` - Updates `backend/.env`
- `.claude/session-start-hook.sh` - Calls `switch-to-personal.sh`

**Test Setup:**
- `frontend/e2e/global-setup.ts` - Calls seed script, assumes personal DB
- `frontend/e2e/global-teardown.ts` - Cleanup logic
- Backend test configs (need investigation)

**Documentation:**
- `CLAUDE.md` - Database Configuration section
- `README_dev.md` - Testing workflow
- Multiple mentions of "dev database" vs "personal database"

**Configuration:**
- `backend/.env` - DATABASE_URL (switches between databases)
- `.env.example` - Default patterns

## Root Cause

**Architectural Complexity**: Maintaining two databases creates a coordination problem:
1. Which database should be active for which operation?
2. How to ensure test data is in the right database?
3. How to protect dev data from test truncation?
4. How to keep documentation synchronized with reality?

**The fundamental issue**: Trying to solve data protection (good goal) with database separation (adds complexity) instead of backup/restore (simpler solution).

## Evidence

**ISSUE-039 Investigation:**
- Spent ~2 hours investigating `jobhunter_dev` database
- Found test data WAS present in dev database
- But E2E tests run against `jobhunter_personal` (which has no test data)
- Root cause: database configuration mismatch

**E2E Test Failures:**
- 11 tests failing due to missing test data
- Tests expect "Expert Systems Architect" job (not in personal DB)
- Tests expect 30 filtered jobs (only 1 in personal DB)

**SessionStart Hook Output:**
```bash
🔒 Active database: jobhunter_personal
📁 Config file: ./backend/.env
```

**But seed script does:**
```bash
DATABASE_NAME="jobhunter_dev"  # Wrong database!
```

## Proposed Solutions

### Option A: Destructive E2E Testing (Rejected)

**Description**: Single database (`jobhunter_personal`), E2E tests truncate without backup.

**Pros:**
- Simplest implementation (just change DATABASE_NAME)
- Clean, predictable test state
- No backup overhead

**Cons:**
- **Lose dev data on every test run** (unacceptable)
- Have to rebuild dev data after each test
- Discourages frequent test execution

**Implementation Effort:** 30 minutes

**Decision:** **Rejected** - Too destructive to development workflow

---

### Option B: Single Database with Backup/Restore (RECOMMENDED)

**Description**:
- Single database: `jobhunter_personal`
- Before truncating for tests: automatic backup to `/tmp/`
- After tests: optional restore from backup
- Backup overhead: ~1-2 seconds (acceptable)

**Pros:**
- **Best of both worlds**: Simple architecture + data protection
- No database switching logic needed
- No mental overhead about which database is active
- Backup/restore is one-time implementation cost
- Automatic safety net for all destructive operations
- Test data matches development environment

**Cons:**
- Small time overhead for backup (~1-2 seconds per test run)
- Need to implement backup/restore scripts
- Requires disk space for backup dumps (minimal, ~1-10MB)

**Implementation Effort:** 3-4 hours total
- Backup/restore infrastructure: 1-2 hours
- Script updates: 1 hour
- Documentation: 30 minutes
- Testing: 30 minutes

**Maintenance:** Low - once implemented, just works

**Decision:** **RECOMMENDED** - Provides simplicity with safety

---

### Option C: Keep Two Databases, Clarify Roles (Rejected)

**Description:**
- Rename `jobhunter_dev` → `jobhunter_test`
- Keep switching logic, clarify documentation
- E2E tests explicitly switch to test database

**Pros:**
- No data loss risk
- Clear separation of concerns

**Cons:**
- **Still have all the complexity** (just renamed)
- Still need switching logic
- Still need to track which is active
- Doesn't solve the fundamental problem

**Implementation Effort:** 2-3 hours

**Decision:** **Rejected** - Just renames the problem, doesn't solve it

---

## Decision

**Option B: Single Database with Backup/Restore** has been selected.

**Rationale:**
1. Eliminates root cause (database switching complexity)
2. Protects dev data (automatic backup)
3. Minimal overhead (~1-2 seconds per test run)
4. One-time implementation cost, then invisible
5. Aligns with principle: "Simplest solution that preserves safety"

## Implementation Plan

### Phase 1: Backup/Restore Infrastructure (1-2 hours)

**1.1 Update `seed-test-data.sh` with backup logic:**

```bash
# Add at top of file (after argument parsing)
BACKUP_DIR="/tmp/jobhunter_backups"
BACKUP_FILE="$BACKUP_DIR/jobhunter_personal_$(date +%Y%m%d_%H%M%S).sql"
LAST_BACKUP_FILE="/tmp/jobhunter_last_backup.txt"

# Update truncate section
if [ "$TRUNCATE" = true ]; then
    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    # Backup current state
    echo "📦 Backing up database to $BACKUP_FILE..."
    pg_dump -U jobhunter_user -d jobhunter_personal > "$BACKUP_FILE"

    # Store backup path for potential restore
    echo "$BACKUP_FILE" > "$LAST_BACKUP_FILE"
    echo "✅ Backup saved: $BACKUP_FILE"

    # Clean up old backups (keep last 5)
    ls -t "$BACKUP_DIR"/*.sql | tail -n +6 | xargs rm -f 2>/dev/null || true

    # Now safe to truncate
    echo "🗑️  Truncating database..."
    psql -U jobhunter_user -d jobhunter_personal -c "TRUNCATE TABLE jobs CASCADE;"
    echo "✅ Database truncated"
fi
```

**1.2 Change DATABASE_NAME:**
```bash
# OLD:
DATABASE_NAME="jobhunter_dev"

# NEW:
DATABASE_NAME="jobhunter_personal"
```

**1.3 Create `helper-scripts/restore-from-backup.sh`:**

```bash
#!/bin/bash
# Restore database from most recent backup

set -e

LAST_BACKUP_FILE="/tmp/jobhunter_last_backup.txt"

if [ ! -f "$LAST_BACKUP_FILE" ]; then
    echo "❌ No backup file found"
    echo "   Backup tracking file: $LAST_BACKUP_FILE"
    exit 1
fi

BACKUP_FILE=$(cat "$LAST_BACKUP_FILE")

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "🔄 Restoring from backup..."
echo "   Backup file: $BACKUP_FILE"
echo ""

# Clear current data
echo "🗑️  Clearing current database..."
psql -U jobhunter_user -d jobhunter_personal -c "TRUNCATE TABLE jobs CASCADE;"

# Restore from backup
echo "📥 Restoring data..."
psql -U jobhunter_user -d jobhunter_personal < "$BACKUP_FILE"

echo ""
echo "✅ Database restored successfully"
```

### Phase 2: Script Updates (1 hour)

**2.1 Deprecate `switch-to-dev.sh`:**
- Add deprecation notice at top
- Suggest using single database instead

**2.2 Simplify `switch-to-personal.sh`:**
- Already default, so becomes less critical
- Could keep for explicit confirmation

**2.3 Update `.claude/session-start-hook.sh`:**
- Simplify to just confirm personal DB is active
- No longer need to "switch"

**2.4 Update `frontend/e2e/global-setup.ts` comments:**
- Remove "Decision: Single database" comment (now reality)
- Update to reflect backup/restore workflow

### Phase 3: Documentation Updates (30 minutes)

**3.1 CLAUDE.md updates:**
- Database Configuration section: Remove switching, document backup/restore
- Update workflow examples

**3.2 README_dev.md updates:**
- Testing workflow: Document backup/restore process
- Remove references to dev database

**3.3 Add to documentation:**
```markdown
## Database Architecture

**Single Database:** `jobhunter_personal`

**E2E Test Safety:**
- Tests call `seed-test-data.sh --truncate`
- Automatic backup created before truncation
- Restore with `./helper-scripts/restore-from-backup.sh`

**Backup Location:** `/tmp/jobhunter_backups/` (keeps last 5)
```

### Phase 4: Testing and Verification (30 minutes)

**4.1 Manual Testing:**
```bash
# Populate personal database with some data
psql -U jobhunter_user -d jobhunter_personal -c "SELECT COUNT(*) FROM jobs;"
# Note the count

# Run seed with truncate (should backup)
./helper-scripts/seed-test-data.sh --truncate
# Verify backup file created in /tmp/jobhunter_backups/

# Verify test data seeded
psql -U jobhunter_user -d jobhunter_personal -c "SELECT COUNT(*) FROM jobs WHERE title = 'Expert Systems Architect';"
# Should find the test job

# Restore from backup
./helper-scripts/restore-from-backup.sh

# Verify original data restored
psql -U jobhunter_user -d jobhunter_personal -c "SELECT COUNT(*) FROM jobs;"
# Should match original count
```

**4.2 E2E Test Run:**
```bash
# Run E2E tests (should automatically backup/seed)
cd frontend
npx playwright test e2e/tests/99-extraction-method-badge-test.spec.ts --project=chromium

# Should pass now (test data in correct database)
```

## Testing

**Test Commands:**
```bash
# Test backup creation
./helper-scripts/seed-test-data.sh --truncate
ls -lh /tmp/jobhunter_backups/  # Should show backup file

# Test restore
./helper-scripts/restore-from-backup.sh

# Test E2E with new architecture
cd frontend
npx playwright test e2e/tests/99-extraction-method-badge-test.spec.ts --project=chromium
npx playwright test e2e/tests/99b-filtered-tab-test.spec.ts --project=chromium
```

**Verification:**
- [ ] Backup created automatically when `--truncate` used
- [ ] Backup file contains all current data
- [ ] Old backups cleaned up (keeps last 5)
- [ ] Restore successfully brings back original data
- [ ] E2E tests find expected test data
- [ ] No references to `jobhunter_dev` in active scripts
- [ ] Documentation reflects single-database architecture

## Relationship to ISSUE-039

**ISSUE-039 is blocked by this issue.**

ISSUE-039 tracks 11 E2E test failures discovered after ISSUE-036 completion. Investigation revealed the root cause is database architecture confusion:
- Tests expect data in `jobhunter_personal`
- Seed script populates `jobhunter_dev`
- Result: Tests fail due to missing data

**Once ISSUE-040 is implemented:**
1. All test data will be seeded to correct database
2. ISSUE-039 failures should largely resolve (at minimum Category 6: 4 tests)
3. Can resume ISSUE-039 investigation for any remaining failures

**Return to ISSUE-039 ASAP** after ISSUE-040 implementation is complete.

## Status History

- 2025-11-10: ISSUE created with comprehensive analysis and implementation plan
- 2025-11-10: Decision made: Option B (Single Database with Backup/Restore)

## Notes

**Design Principle**: Choose simplest solution that preserves safety.

**Backup Performance:**
- Small dev database (~8 jobs): ~0.5 seconds
- Medium database (~100 jobs): ~1-2 seconds
- Acceptable overhead for test runs

**Backup Retention:**
- Keep last 5 backups automatically
- Each backup timestamped for identification
- Stored in `/tmp/` (cleared on system restart - acceptable for dev environment)

**Future Enhancement:**
- Could add `--no-backup` flag for truly destructive operations (if needed)
- Could add backup to permanent location (if needed)
- For now: Keep it simple

## Related Files

**Scripts:**
- `helper-scripts/seed-test-data.sh:22` - DATABASE_NAME hardcoded to `jobhunter_dev`
- `helper-scripts/switch-to-personal.sh` - Database switching logic
- `helper-scripts/switch-to-dev.sh` - Database switching logic (to be deprecated)
- `.claude/session-start-hook.sh` - Session initialization

**Test Setup:**
- `frontend/e2e/global-setup.ts:70-72` - Comments about database selection
- `frontend/e2e/global-teardown.ts` - Cleanup logic

**Documentation:**
- `CLAUDE.md` - Database Configuration section
- `README_dev.md` - Testing workflow documentation

**Configuration:**
- `backend/.env` - DATABASE_URL configuration
- `.env.example` - Default configuration patterns
