<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Test Orchestrator](#test-orchestrator)
  - [Architecture](#architecture)
  - [Features](#features)
  - [Usage](#usage)
    - [Run Comprehensive Tests](#run-comprehensive-tests)
    - [Output](#output)
  - [Debug and Testing Modes](#debug-and-testing-modes)
    - [Quick Reference](#quick-reference)
    - [Usage](#usage-1)
    - [Examples](#examples)
    - [Available Options](#available-options)
    - [Development Workflows](#development-workflows)
      - [Orchestrator Code Development](#orchestrator-code-development)
      - [E2E Test Development](#e2e-test-development)
      - [Backend Code Changes](#backend-code-changes)
    - [Important Notes](#important-notes)
  - [Implementation Status](#implementation-status)
  - [Comparison: Old vs New](#comparison-old-vs-new)
    - [Old (Bash-based)](#old-bash-based)
    - [New (TypeScript Orchestrator)](#new-typescript-orchestrator)
  - [Related](#related)
  - [Future Enhancements](#future-enhancements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Test Orchestrator

Node.js/TypeScript-based test orchestrator for coordinating backend (Cargo), frontend (Jest), and E2E (Playwright) test suites.

## Architecture

```
src/test-orchestrator/
├── main.ts              # Entry point
├── orchestrator.ts      # Core coordinator
├── reporters/           # JSON parsers
│   ├── jest-parser.ts     - Jest JSON output parser
│   ├── playwright-parser.ts - Playwright JSON report parser
│   └── cargo-parser.ts    - Cargo test output parser
└── types.ts             # TypeScript interfaces
```

## Features

✅ **Zero token burn** - Structured JSON data, no log file reading
✅ **Real-time progress** - In-memory tracking with live updates
✅ **Reliable notifications** - macOS desktop notifications with sound
✅ **Concurrent execution** - All 3 test suites run in parallel
✅ **Structured output** - JSON report with complete test results
✅ **Error handling** - Graceful failure handling for each suite

## Usage

### Run Comprehensive Tests

```bash
npm run test:comprehensive
```

This runs:
1. **Backend tests** (Cargo) - `cargo test` in `backend/`
2. **Frontend tests** (Jest) - `npm test --json` in `frontend/`
3. **E2E tests** (Playwright) - `npx playwright test --reporter=json` in `frontend/`

All suites run **concurrently** for maximum speed.

### Output

**Console:**
- Real-time progress for each test suite
- Live test names as they execute
- Summary table with pass/fail counts
- Total duration and overall status

**Files:**
- `test-results/comprehensive-report.json` - Full structured report
- `test-results/playwright-results.json` - Playwright JSON output

**Notification:**
- Sound alert (Glass.aiff)
- Dialog box with summary (requires OK click)
- Immediate notification on completion

## Debug and Testing Modes

For faster iteration during development, the orchestrator supports debug modes that skip certain phases:

### Quick Reference

| Mode | Runtime | Use Case | Command |
|------|---------|----------|---------|
| **Smoke Test** | ~30s | Verify orchestrator code works | `--smoke` |
| **Unit Tests Only** | ~2m | Quick validation after code changes | `--unit-only` |
| **Skip Builds** | ~12m | Test with existing builds (most common) | `--skip-builds` |
| **Skip Database** | ~18m | Test with current database state | `--skip-db` |
| **E2E Only** | ~10m | E2E test development | `--e2e-only` |
| **Skip Preflight** | ~15m | Skip all safety checks (DANGEROUS) | `--skip-preflight` |

### Usage

```bash
# Primary method (recommended):
./helper-scripts/run-tests-debug.sh [MODE] [OPTIONS]

# Alternative (direct):
npx ts-node src/test-orchestrator/debug-main.ts [MODE] [OPTIONS]
```

### Examples

```bash
# Smoke test (verify orchestrator compiles + preflight works)
./helper-scripts/run-tests-debug.sh --smoke

# Quick unit test validation
./helper-scripts/run-tests-debug.sh --unit-only

# Test with existing builds (skip slow rebuilds)
./helper-scripts/run-tests-debug.sh --skip-builds

# E2E only with existing builds
./helper-scripts/run-tests-debug.sh --e2e-only --skip-builds

# Combine flags: Unit tests + E2E (skip backend tests)
./helper-scripts/run-tests-debug.sh --skip-builds --no-backend-test

# Silent mode (no notification)
./helper-scripts/run-tests-debug.sh --unit-only --no-notification

# Verbose smoke test
./helper-scripts/run-tests-debug.sh --smoke --verbose
```

### Available Options

**Preset Modes** (mutually exclusive):
- `--smoke` - Preflight checks only (~30s)
- `--unit-only` - Backend + frontend tests only (~2m)
- `--skip-builds` - Run tests with existing builds (~12m)
- `--skip-db` - Skip database backup/clear/seed (~18m)
- `--e2e-only` - Run only E2E tests (~10-12m)
- `--skip-preflight` - Skip all preflight checks (~15m, DANGEROUS)

**Individual Flags** (can combine):
- `--no-backend-test` - Skip backend tests
- `--no-frontend-test` - Skip frontend tests
- `--no-e2e-test` - Skip E2E tests
- `--no-notification` - Skip desktop notification
- `--verbose` - Extra logging (shows what's being skipped)

### Development Workflows

#### Orchestrator Code Development
```bash
# 1. Make changes to orchestrator code
vim src/test-orchestrator/orchestrator.ts

# 2. Smoke test (verify code compiles + preflight works)
./helper-scripts/run-tests-debug.sh --smoke
# Runtime: 30s

# 3. If smoke test passes, run unit tests
./helper-scripts/run-tests-debug.sh --unit-only
# Runtime: 2m

# 4. If unit tests pass, run full suite with existing builds
./helper-scripts/run-tests-debug.sh --skip-builds
# Runtime: 12m

# Total iteration time: 14.5m (vs 20m for comprehensive)
# Time saved: 5.5m (27.5%)
```

#### E2E Test Development
```bash
# 1. Make changes to E2E test
vim frontend/e2e/tests/05-email-ingestion.spec.ts

# 2. Run E2E only (skip unit tests, reuse builds)
./helper-scripts/run-tests-debug.sh --e2e-only --skip-builds
# Runtime: 10m

# Total iteration time: 10m (vs 20m for comprehensive)
# Time saved: 10m (50%)
```

#### Backend Code Changes
```bash
# 1. Make changes to backend code
vim backend/src/main.rs

# 2. Run backend tests only
cd backend && cargo test
# Runtime: 90s

# 3. If backend tests pass, run unit tests (both suites)
./helper-scripts/run-tests-debug.sh --unit-only
# Runtime: 2m

# 4. If unit tests pass, run E2E with existing builds
./helper-scripts/run-tests-debug.sh --e2e-only --skip-builds
# Runtime: 10m

# Total iteration time: 13.5m (vs 20m for comprehensive)
# Time saved: 6.5m (32.5%)
```

### Important Notes

- **For comprehensive tests**, always use: `./helper-scripts/run-comprehensive-tests.sh`
- Debug modes skip safety checks - use with caution
- All modes reuse existing orchestrator code (no duplication)
- The wrapper script verifies orchestrator TypeScript compiles cleanly before running

## Implementation Status

**Phase 1: ✅ Complete**
- Research JSON formats
- Directory structure
- Working prototype
- Desktop notifications

**Phase 2: ✅ Complete**
- Core orchestrator class
- JSON parsers for all 3 suites
- In-memory progress tracking
- Error handling

**Phase 3: ✅ Complete**
- Result aggregation
- Comprehensive reporting
- Performance metrics
- Desktop notifications

**Phase 4: 🚧 In Progress**
- Integration with existing infrastructure
- Testing with real comprehensive suite
- Documentation

## Comparison: Old vs New

### Old (Bash-based)

```bash
./helper-scripts/run-comprehensive-tests.sh
```

**Problems:**
- ❌ Token burn reading log files repeatedly
- ❌ Unreliable notifications (14 min delay reported)
- ❌ Manual result aggregation from unstructured logs
- ❌ Sequential execution (slower)

### New (TypeScript Orchestrator)

```bash
npm run test:comprehensive
```

**Benefits:**
- ✅ Zero token burn (structured JSON streams)
- ✅ Reliable notifications (proper library)
- ✅ Automatic result aggregation
- ✅ Concurrent execution (faster)
- ✅ Type-safe with full IDE support
- ✅ Maintainable and extensible

## Related

- **ISSUE-060**: Replace ad-hoc test flow with proper orchestration
- **ISSUE-048**: Token burn monitoring test progress
- **ISSUE-059**: Completion marker implemented but notifications not working

## Future Enhancements

- [ ] WebSocket for real-time progress streaming
- [ ] Test retry logic for flaky tests
- [ ] Parallel E2E test sharding
- [ ] CI/CD integration
- [ ] Test result history tracking
- [ ] Performance regression detection
