<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Testing History - Archived Test Runs](#testing-history---archived-test-runs)
  - [Index of Archived Test Runs](#index-of-archived-test-runs)
    - [November 2025](#november-2025)
    - [October 2025](#october-2025)
  - [Usage](#usage)
  - [Archival Process](#archival-process)
  - [Archive File Format](#archive-file-format)
  - [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Testing History - Archived Test Runs

**Purpose**: Archive of all comprehensive test suite runs (older than the 2 most recent runs in TESTING_STATUS.md)

**Policy**: TESTING_STATUS.md keeps only the **2 most recent comprehensive test runs**. When adding a 3rd run, the oldest run is archived here.

**Naming Convention**: `TEST_STATUS_YYYY-MM-DD_HHMM.md` (24-hour time format)

**Last Updated**: 2025-11-19 15:55:00 PST

---

## Index of Archived Test Runs

**Total Archived Runs**: 0

### November 2025

*(No archived runs yet - TESTING_STATUS.md currently contains 2 runs: 2025-11-19 01:36 PST, 2025-11-19 00:43 PST)*

### October 2025

*(Comprehensive testing history from October 2025 available in legacy `docs/TESTING_HISTORY.md` - 3221 lines)*

---

## Usage

**Finding a specific test run**:
```bash
# By date pattern
ls testing-history/TEST_STATUS_2025-11-*.md

# By specific date
cat testing-history/TEST_STATUS_2025-11-19_0136.md
```

**Current test status** (2 most recent runs):
```bash
cat docs/TESTING_STATUS.md
```

**All comprehensive testing work** (legacy archive through Nov 19, 2025):
```bash
cat docs/TESTING_HISTORY.md  # Will be deprecated once migrated to folder structure
```

---

## Archival Process

When adding a new comprehensive test run to TESTING_STATUS.md:

1. **Check run count**: If TESTING_STATUS.md already has 2 runs, archive the oldest
2. **Extract oldest run**: Copy the oldest run section from TESTING_STATUS.md
3. **Create archive file**: Name it `TEST_STATUS_YYYY-MM-DD_HHMM.md` using the run's timestamp
4. **Update this index**: Add new entry to the appropriate month section
5. **Remove from TESTING_STATUS.md**: Delete the archived run section
6. **Commit**: `git add testing-history/ docs/TESTING_STATUS.md && git commit`

See CLAUDE.md "Testing Status Update Requirements" for full workflow.

---

## Archive File Format

Each archived file contains:
- Frontmatter with run metadata (date, runtime, exit code, context)
- Quick summary table (Backend/Frontend/E2E results)
- Detailed test results breakdown
- Test failures and flaky tests
- Key observations
- Comparison to previous run
- Next steps (as they were at that time)

**Example**:
```markdown
---
run_date: 2025-11-19 01:36:18 PST
runtime: 13.2 minutes
exit_code: 1
context: Priority 1 fix verification
---

# Comprehensive Test Run - 2025-11-19 01:36 PST

[Full test run details...]
```

---

## Related Files

- **TESTING_STATUS.md**: Current + previous run (2 runs max)
- **README_auto-test-plan.md**: Comprehensive testing strategy
- **TESTING_GUIDE.md**: Testing principles and investigation workflows
- **PLAYWRIGHT_BEST_PRACTICES.md**: E2E test patterns & anti-patterns
- **TESTING_HISTORY.md**: Legacy archive (will be deprecated)
