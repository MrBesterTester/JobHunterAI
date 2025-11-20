<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Deprecated Test Scripts](#deprecated-test-scripts)
  - [Deprecated Scripts](#deprecated-scripts)
  - [Why Deprecated?](#why-deprecated)
  - [New Test Orchestrator](#new-test-orchestrator)
  - [Documentation](#documentation)
  - [Removal Timeline](#removal-timeline)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Deprecated Test Scripts

These scripts have been superseded by the TypeScript test orchestrator (ISSUE-060).

## Deprecated Scripts

All scripts in this directory are **deprecated** and should not be used.

| Script | Deprecated | Replacement |
|--------|------------|-------------|
| `check-test-completion.sh` | 2025-11-20 | Automatic notifications (ISSUE-059 resolved) |
| `run-all-tests.sh` | 2025-11-20 | `./helper-scripts/run-comprehensive-tests.sh` |
| `run-fast-tests.sh` | 2025-11-20 | `./helper-scripts/run-tests-debug.sh --unit-only` |
| `run-backend-tests.sh` | 2025-11-20 | `cd backend && cargo test` |
| `run-frontend-tests.sh` | 2025-11-20 | `cd frontend && npm test` |
| `run-e2e-tests.sh` | 2025-11-20 | `./helper-scripts/run-tests-debug.sh --e2e-only --skip-builds` |

## Why Deprecated?

The TypeScript test orchestrator (implemented in ISSUE-060) provides:

- ✅ **Structured JSON output** - No log parsing needed
- ✅ **Real-time notifications** - Built-in desktop notifications (sound + dialog)
- ✅ **Concurrent execution** - Tests run in parallel where safe
- ✅ **Better reporting** - Comprehensive JSON reports with timing
- ✅ **Debug modes** - Flexible testing modes for development iteration
- ✅ **Type safety** - TypeScript with proper error handling
- ✅ **Single source of truth** - No code duplication

## New Test Orchestrator

**Comprehensive tests:**
```bash
./helper-scripts/run-comprehensive-tests.sh
```

**Debug modes:**
```bash
# Unit tests only (~2m)
./helper-scripts/run-tests-debug.sh --unit-only

# Test with existing builds (~12m)
./helper-scripts/run-tests-debug.sh --skip-builds

# E2E only (~10m)
./helper-scripts/run-tests-debug.sh --e2e-only --skip-builds

# Smoke test (~30s)
./helper-scripts/run-tests-debug.sh --smoke

# Show all options
./helper-scripts/run-tests-debug.sh --help
```

**Direct test commands:**
```bash
# Backend tests
cd backend && cargo test

# Frontend tests
cd frontend && npm test

# E2E tests (requires app running)
cd frontend && npm run test:e2e
```

## Documentation

- Test orchestrator: `src/test-orchestrator/README.md`
- ISSUE-060: `bugs/open/ISSUE-060-replace-ad-hoc-comprehensive-test-flow-with-proper-test-orchestration-tooling.md`
- README_dev.md: Testing section

## Removal Timeline

These scripts are preserved for reference and may be removed in future releases (estimated: Q1 2026).
