<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Testing History - Archived Test Runs](#testing-history---archived-test-runs)
  - [Index of Archived Test Runs](#index-of-archived-test-runs)
    - [Historical Investigation Archives](#historical-investigation-archives)
    - [Legacy Comprehensive Archive](#legacy-comprehensive-archive)
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

**Last Updated**: 2025-11-19 20:06:53 PST (Added ISSUE-055 investigation archive)

---

## Index of Archived Test Runs

**Total Archived Runs**: 2 individual runs + 1 legacy comprehensive archive

**Investigation Archives**: 1 detailed investigation

### Historical Investigation Archives

- **[ISSUE-055_INVESTIGATION_2025-11-18.md](ISSUE-055_INVESTIGATION_2025-11-18.md)** - E2E Test Fixes (November 18, 2025)
  - **Investigation Period**: 2025-11-18 20:15:00 - 21:10:00 PST
  - **Status**: ✅ Completed - All 4 tests fixed same day
  - **Affected Tests**: #504, #511, #441, #547
  - **Key Finding**: UI state waits fail under load → replaced with API response waits
  - **Note**: Tests failed DURING investigation but were fixed the same day (Nov 18). All subsequent runs (Nov 19+) pass successfully.

### Legacy Comprehensive Archive

- **[LEGACY_COMPREHENSIVE_HISTORY_2025-10-23_to_2025-11-19.md](LEGACY_COMPREHENSIVE_HISTORY_2025-10-23_to_2025-11-19.md)** (3221 lines)
  - **Date Range**: October 23, 2025 - November 19, 2025
  - **Type**: Comprehensive testing history archive (multiple runs, ISSUE implementations, completed work)
  - **Content**: Full testing journey including ISSUE-018, ISSUE-023, ISSUE-024, ISSUE-025, ISSUE-026, Phase 2.4-2.7 work, ISSUE-053, ISSUE-055 implementations
  - **Note**: This is the monolithic history file that predates the folder structure. Future test runs will be archived as individual files using `TEST_STATUS_YYYY-MM-DD_HHMM.md` convention.

### November 2025
- **[TEST_STATUS_2025-11-19_1615.md](TEST_STATUS_2025-11-19_1615.md)** - 2025-11-19 16:15:24 PST
- **[TEST_STATUS_2025-11-19_0136.md](TEST_STATUS_2025-11-19_0136.md)** - 2025-11-19 01:36:18 PST
- **[TEST_STATUS_2025-11-19_0136.md](TEST_STATUS_2025-11-19_0136.md)** - 2025-11-19 01:36:18 PST

*(No individual archived runs yet - TESTING_STATUS.md currently contains 2 runs: 2025-11-19 01:36 PST, 2025-11-19 00:43 PST)*

### October 2025

*(See Legacy Comprehensive Archive above for all October 2025 testing work)*

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

**All comprehensive testing work** (legacy archive Oct 23 - Nov 19, 2025):
```bash
cat testing-history/LEGACY_COMPREHENSIVE_HISTORY_2025-10-23_to_2025-11-19.md
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
