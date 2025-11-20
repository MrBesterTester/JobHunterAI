<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Test Orchestrator](#test-orchestrator)
  - [Architecture](#architecture)
  - [Features](#features)
  - [Usage](#usage)
    - [Run Comprehensive Tests](#run-comprehensive-tests)
    - [Output](#output)
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
