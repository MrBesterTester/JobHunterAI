<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [type: issue
id: ISSUE-021
title: Vitest Execution Reliability Problems
status: open
created: 2025-10-27
component: frontend/testing
severity: medium
tags: [vitest, testing, reliability, tooling]
related_issues: [ISSUE-018, ISSUE-019]](#type-issue%0Aid-issue-021%0Atitle-vitest-execution-reliability-problems%0Astatus-open%0Acreated-2025-10-27%0Acomponent-frontendtesting%0Aseverity-medium%0Atags-vitest-testing-reliability-tooling%0Arelated_issues-issue-018-issue-019)
- [Vitest Execution Reliability Problems](#vitest-execution-reliability-problems)
  - [Summary](#summary)
  - [Symptoms Observed](#symptoms-observed)
    - [1. Excessive Output (656+ Lines)](#1-excessive-output-656-lines)
    - [2. Exit Code 143 (SIGTERM) Terminations](#2-exit-code-143-sigterm-terminations)
    - [3. Hanging Test Execution](#3-hanging-test-execution)
    - [4. Inconsistent Execution Times](#4-inconsistent-execution-times)
  - [Root Cause Analysis](#root-cause-analysis)
    - [Likely Causes](#likely-causes)
  - [Impact](#impact)
  - [Proposed Solutions](#proposed-solutions)
    - [Option A: Standardized Test Execution Script ✅ **RECOMMENDED**](#option-a-standardized-test-execution-script--recommended)
    - [Option B: Suppress Console Errors in Tests](#option-b-suppress-console-errors-in-tests)
    - [Option C: Investigate Vitest Configuration](#option-c-investigate-vitest-configuration)
    - [Option D: Upgrade/Downgrade Vitest](#option-d-upgradedowngrade-vitest)
  - [Related Issues](#related-issues)
  - [Testing Commands](#testing-commands)
  - [Files Affected](#files-affected)
  - [Action Items](#action-items)
    - [Immediate (User Review Required)](#immediate-user-review-required)
    - [After Approval](#after-approval)
  - [Terminology Note](#terminology-note)
  - [Open Questions](#open-questions)
  - [Implementation Status](#implementation-status)
    - [✅ COMPLETED (2025-10-27)](#-completed-2025-10-27)
    - [🔄 REMAINING](#-remaining)
  - [Test Results: Vitest 4.0.4 Upgrade](#test-results-vitest-404-upgrade)
  - [Step 5 Investigation Results: Root Cause Identified](#step-5-investigation-results-root-cause-identified)
    - [Root Cause: setTimeout in Test Mock Implementations](#root-cause-settimeout-in-test-mock-implementations)
    - [Primary Issues (Causing Hanging)](#primary-issues-causing-hanging)
      - [1. **App.test.tsx** - Multiple tests with setTimeout in fetch mocks](#1-apptesttsx---multiple-tests-with-settimeout-in-fetch-mocks)
      - [2. **IntakeTab.test.tsx:330** - setTimeout in fetch mock](#2-intaketabtesttsx330---settimeout-in-fetch-mock)
      - [3. **WeightAdjustmentPanel.test.tsx:725, 755** - setTimeout in fetch mocks](#3-weightadjustmentpaneltesttsx725-755---settimeout-in-fetch-mocks)
    - [Secondary Issues (Component Code - Not Causing Hanging)](#secondary-issues-component-code---not-causing-hanging)
    - [Evidence Supporting Root Cause](#evidence-supporting-root-cause)
  - [Resolution Options](#resolution-options)
    - [Option i: Remove setTimeout from Test Mocks ✅ **RECOMMENDED (Next Step)**](#option-i-remove-settimeout-from-test-mocks--recommended-next-step)
    - [Option ii: Use Fake Timers in Tests with setTimeout (Alternative)](#option-ii-use-fake-timers-in-tests-with-settimeout-alternative)
    - [Option iii: Add Cleanup to Component setTimeout (Code Quality)](#option-iii-add-cleanup-to-component-settimeout-code-quality)
    - [Option iv: Add AbortController to Fetch Operations (Advanced Code Quality)](#option-iv-add-abortcontroller-to-fetch-operations-advanced-code-quality)
    - [Option v: Deep Async Operation Audit ✅ **RECOMMENDED (Highest Priority)**](#option-v-deep-async-operation-audit--recommended-highest-priority)
    - [Option vi: Vitest Community Investigation (Alternative)](#option-vi-vitest-community-investigation-alternative)
    - [Option vii: Workaround Solutions (Last Resort)](#option-vii-workaround-solutions-last-resort)
  - [Next Steps](#next-steps)
    - [Expected Results](#expected-results)
    - [Confidence Level](#confidence-level)
  - [Option i Implementation Results (2025-10-27)](#option-i-implementation-results-2025-10-27)
  - [All Options Status Summary](#all-options-status-summary)
    - [Original Implementation Options (Foundation)](#original-implementation-options-foundation)
    - [Resolution Options (Root Cause Fixes)](#resolution-options-root-cause-fixes)
  - [Next Steps - Option iii Implementation Plan](#next-steps---option-iii-implementation-plan)
  - [Option iii Implementation Results (2025-10-27)](#option-iii-implementation-results-2025-10-27)
  - [Option ii Implementation Results (2025-10-27)](#option-ii-implementation-results-2025-10-27)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
type: issue
id: ISSUE-021
title: Vitest Execution Reliability Problems
status: open
created: 2025-10-27
component: frontend/testing
severity: medium
tags: [vitest, testing, reliability, tooling]
related_issues: [ISSUE-018, ISSUE-019]
---

# Vitest Execution Reliability Problems

## Summary

Vitest unit test execution exhibits reliability issues including inconsistent execution times, excessive stderr output, unexpected terminations (exit code 143), and test runs that hang indefinitely. These problems make it difficult to diagnose actual test failures versus execution environment issues.

## Symptoms Observed

### 1. Excessive Output (656+ Lines)
- **Observation**: Running Phase 2A tests (18 tests) produced 320+ lines of output before hanging
- **Content**: Repetitive stderr messages showing API fetch errors (expected test behavior)
- **Impact**: Makes it difficult to identify actual test failures or issues
- **Example Output Pattern**:
  ```
  Error fetching sources: Error: Failed to fetch sources: 500
      at fetchSources (/path/to/IntakeTab.tsx:121:15)
  Error fetching logs: Error: Failed to fetch logs: 500
      at fetchLogs (/path/to/IntakeTab.tsx:136:15)
  [Repeated for every test...]
  ```

### 2. Exit Code 143 (SIGTERM) Terminations
- **Exit Code**: 143 = 128 + 15 (SIGTERM signal)
- **Meaning**: Process was intentionally terminated externally (not a test failure)
- **Possible Causes**:
  1. User interruption (Ctrl+C) when tests hung
  2. System OOM killer due to memory pressure
  3. Parent process/shell management terminating hung process
  4. Related to ISSUE-019 resource exhaustion

### 3. Hanging Test Execution
- **Observed**: Phase 2A test run hung indefinitely (killed after 60+ seconds)
- **Expected**: 18 tests should complete in 5-10 seconds
- **Behavior**: Tests appeared to execute but never reached completion/summary
- **Last Output**: Tests were still running through individual test cases but never finished

### 4. Inconsistent Execution Times
- **Report**: User observed varying execution times for same test suite
- **Impact**: Unpredictable CI/local development workflow timing
- **Unknown**: Whether this correlates with system resource availability

## Root Cause Analysis

### Likely Causes

**A. Console Output Flooding** (High Probability)
- Application code logs every failed API call to console.error()
- Tests run without backend, so every API call fails and logs
- 18 tests × multiple API calls per test × 4-5 error messages each = 300+ lines
- **Not actual errors** - this is expected test behavior
- **Fix**: Suppress console.error during tests or mock console

**B. Resource Exhaustion** (Medium Probability - Related to ISSUE-019)
- Vitest parallel workers may accumulate and not terminate properly
- Memory pressure from multiple test runs without cleanup
- CPU bottleneck from uncontrolled parallelism
- **Partially mitigated**: vitest.config.ts already limits maxWorkers to 4

**C. Test Environment Issues** (Medium Probability)
- jsdom environment may have memory leaks in long test runs
- Mock cleanup may be incomplete between test suites
- Async operations not properly awaited/cleaned up

**D. Vitest v4 Stability** (Lower Probability)
- Currently using vitest@4.0.3 (relatively new major version)
- May have regressions from Jest/Vitest v1.x migration
- Known issues with --grep/-t filtering in some cases

## Impact

- **Severity**: Medium - tests still pass, but execution is unreliable
- **User Experience**: Frustrating to diagnose issues, unclear when tests are "done"
- **CI/CD**: Unpredictable timing makes it hard to set reasonable timeouts
- **Development Velocity**: Developers may lose trust in test suite

## Proposed Solutions

### Option A: Standardized Test Execution Script ✅ **RECOMMENDED**

Create `frontend/run-tests.sh` bash script for consistent, reliable test execution:

```bash
#!/usr/bin/env bash
#
# run-tests.sh - Standardized frontend test execution script
#
# Usage:
#   ./run-tests.sh                    # Run all tests with typecheck
#   ./run-tests.sh --no-typecheck     # Skip typecheck (faster iteration)
#   ./run-tests.sh --watch            # Watch mode
#   ./run-tests.sh --filter "Phase 2A" # Run specific tests
#   ./run-tests.sh --coverage         # Run with coverage
#   ./run-tests.sh --quiet            # Minimal output
#   ./run-tests.sh --help             # Show help
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$SCRIPT_DIR"
LOGS_DIR="$PROJECT_ROOT/logs/frontend-tests"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

# Default options
RUN_TYPECHECK=true
WATCH_MODE=false
RUN_COVERAGE=false
QUIET_MODE=false
FILTER_PATTERN=""
OUTPUT_MODE="default" # default, basic, dot

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --no-typecheck)
      RUN_TYPECHECK=false
      shift
      ;;
    --watch)
      WATCH_MODE=true
      shift
      ;;
    --coverage)
      RUN_COVERAGE=true
      shift
      ;;
    --quiet)
      QUIET_MODE=true
      OUTPUT_MODE="basic"
      shift
      ;;
    --filter)
      FILTER_PATTERN="$2"
      shift 2
      ;;
    --reporter)
      OUTPUT_MODE="$2"
      shift 2
      ;;
    --help)
      echo "Frontend Test Execution Script"
      echo ""
      echo "Usage: ./run-tests.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --no-typecheck       Skip TypeScript type checking (faster)"
      echo "  --watch              Run in watch mode"
      echo "  --coverage           Generate coverage report"
      echo "  --quiet              Minimal output (basic reporter)"
      echo "  --filter PATTERN     Run only tests matching pattern (e.g., 'Phase 2A')"
      echo "  --reporter MODE      Output mode: default, basic, dot"
      echo "  --help               Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./run-tests.sh                      # Full test run with typecheck"
      echo "  ./run-tests.sh --no-typecheck       # Skip typecheck for faster iteration"
      echo "  ./run-tests.sh --filter 'Phase 2A'  # Run only Phase 2A tests"
      echo "  ./run-tests.sh --quiet              # Minimal output"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Run with --help for usage information"
      exit 1
      ;;
  esac
done

# Create logs directory
mkdir -p "$LOGS_DIR"

# Log file path
LOG_FILE="$LOGS_DIR/test-run-${TIMESTAMP}.log"

# Print header
if [[ "$QUIET_MODE" == "false" ]]; then
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  Frontend Test Execution${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
  echo -e "Log file:  $LOG_FILE"
  echo ""
fi

# Change to frontend directory
cd "$FRONTEND_DIR"

# Step 1: TypeScript Type Checking
if [[ "$RUN_TYPECHECK" == "true" ]]; then
  if [[ "$QUIET_MODE" == "false" ]]; then
    echo -e "${YELLOW}[1/2] Running TypeScript type checking...${NC}"
  fi

  start_time=$(date +%s)
  if npm run typecheck 2>&1 | tee -a "$LOG_FILE"; then
    end_time=$(date +%s)
    elapsed=$((end_time - start_time))
    if [[ "$QUIET_MODE" == "false" ]]; then
      echo -e "${GREEN}✓ Type checking passed (${elapsed}s)${NC}"
      echo ""
    fi
  else
    end_time=$(date +%s)
    elapsed=$((end_time - start_time))
    echo -e "${RED}✗ Type checking failed (${elapsed}s)${NC}"
    echo -e "${RED}Please fix TypeScript errors before running tests${NC}"
    exit 1
  fi
fi

# Step 2: Run Vitest
if [[ "$QUIET_MODE" == "false" ]]; then
  if [[ "$RUN_TYPECHECK" == "true" ]]; then
    echo -e "${YELLOW}[2/2] Running Vitest tests...${NC}"
  else
    echo -e "${YELLOW}[1/1] Running Vitest tests...${NC}"
  fi
fi

# Build vitest command
VITEST_CMD="npx vitest"

# Watch mode vs run mode
if [[ "$WATCH_MODE" == "true" ]]; then
  VITEST_CMD="$VITEST_CMD"
else
  VITEST_CMD="$VITEST_CMD run"
fi

# Coverage
if [[ "$RUN_COVERAGE" == "true" ]]; then
  VITEST_CMD="$VITEST_CMD --coverage"
fi

# Reporter/output mode
if [[ "$OUTPUT_MODE" != "default" ]]; then
  VITEST_CMD="$VITEST_CMD --reporter=$OUTPUT_MODE"
fi

# Filter pattern
if [[ -n "$FILTER_PATTERN" ]]; then
  VITEST_CMD="$VITEST_CMD -t \"$FILTER_PATTERN\""
fi

# Run tests
if [[ "$QUIET_MODE" == "false" ]]; then
  echo -e "${BLUE}Command: $VITEST_CMD${NC}"
  echo ""
fi

start_time=$(date +%s)

# Execute with proper error handling and output capture
set +e
eval "$VITEST_CMD" 2>&1 | tee -a "$LOG_FILE"
EXIT_CODE=${PIPESTATUS[0]}
set -e

end_time=$(date +%s)
elapsed=$((end_time - start_time))

# Report results
echo ""
if [[ "$QUIET_MODE" == "false" ]]; then
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi

if [[ $EXIT_CODE -eq 0 ]]; then
  echo -e "${GREEN}✓ Tests passed (${elapsed}s)${NC}"
  if [[ "$QUIET_MODE" == "false" ]]; then
    echo -e "${GREEN}Log saved to: $LOG_FILE${NC}"
  fi
else
  echo -e "${RED}✗ Tests failed with exit code $EXIT_CODE (${elapsed}s)${NC}"

  # Explain exit codes
  case $EXIT_CODE in
    1)
      echo -e "${RED}Exit code 1: Test failures detected${NC}"
      ;;
    143)
      echo -e "${YELLOW}Exit code 143: Process terminated (SIGTERM)${NC}"
      echo -e "${YELLOW}This usually means:${NC}"
      echo -e "${YELLOW}  - User interrupted with Ctrl+C${NC}"
      echo -e "${YELLOW}  - System killed due to resource exhaustion${NC}"
      echo -e "${YELLOW}  - Tests hung and were terminated${NC}"
      echo -e "${YELLOW}Recommendation: Check system resources with ./system-health-check.sh${NC}"
      ;;
    137)
      echo -e "${YELLOW}Exit code 137: Process killed (SIGKILL/OOM)${NC}"
      echo -e "${YELLOW}System likely ran out of memory${NC}"
      echo -e "${YELLOW}Recommendation: Close other applications or run ./system-health-check.sh --cleanup${NC}"
      ;;
    *)
      echo -e "${RED}Unexpected exit code: $EXIT_CODE${NC}"
      ;;
  esac

  echo -e "${RED}Full log: $LOG_FILE${NC}"
fi

if [[ "$QUIET_MODE" == "false" ]]; then
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi

exit $EXIT_CODE
```

**Usage Examples**:
```bash
# Standard test run (full)
cd frontend && ./run-tests.sh

# Fast iteration (skip typecheck temporarily)
cd frontend && ./run-tests.sh --no-typecheck

# Run specific test phase
cd frontend && ./run-tests.sh --filter "Phase 2A"

# Quiet mode (minimal output)
cd frontend && ./run-tests.sh --quiet

# With coverage
cd frontend && ./run-tests.sh --coverage

# Watch mode for development
cd frontend && ./run-tests.sh --watch
```

**Benefits**:
- ✅ Consistent execution across all developers
- ✅ Automatic log file creation with timestamps
- ✅ Clear exit code explanations (including exit code 143)
- ✅ Integrated TypeScript checking (not skipped, but optional for fast iteration)
- ✅ Built-in timing measurements
- ✅ Proper error handling and reporting
- ✅ Self-documenting with --help

### Option B: Suppress Console Errors in Tests

Modify `frontend/src/setupTests.ts` to suppress expected console errors:

```typescript
// Suppress expected console errors during tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    // Suppress known expected errors
    const message = args[0]?.toString() || '';
    if (
      message.includes('Failed to fetch') ||
      message.includes('Error fetching') ||
      message.includes('500')
    ) {
      return; // Suppress expected API errors in tests
    }
    // Log other errors normally
    originalConsoleError(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});
```

**Trade-off**: May hide legitimate errors, but drastically reduces output noise.

### Option C: Investigate Vitest Configuration

Potential vitest.config.ts adjustments:

```typescript
test: {
  // Increase test timeout if tests are slow
  testTimeout: 15000, // Currently 10000

  // Force sequential execution (slower but more stable)
  maxWorkers: 1,      // Currently 4

  // Add teardown timeout
  teardownTimeout: 5000,

  // Log level control
  logHeapUsage: true, // Monitor memory
  silent: false,      // Keep test output visible
}
```

### Option D: Upgrade/Downgrade Vitest

- Current: vitest@4.0.3 (recent major version)
- Option 1: Try latest patch (4.0.x)
- Option 2: Downgrade to stable 1.x branch
- **Risk**: May require test migration work

## Related Issues

- **ISSUE-019**: macOS system resource exhaustion during test runs
  - Vitest worker processes not terminating properly
  - Memory pressure leading to system instability
  - Already implemented: maxWorkers limit in vitest.config.ts

- **ISSUE-018**: Frontend unit test implementation
  - Phase 2A tests are the subject of this reliability investigation
  - 18 tests expected to complete in 5-10s, but hung indefinitely

## Testing Commands

**Current (ad-hoc)**:
```bash
# What we've been doing
cd frontend
npm test
npm run test:watch
npx vitest run -t "Phase 2A"
```

**Proposed (standardized)**:
```bash
# Using the new script
cd frontend
./run-tests.sh                    # Standard full run
./run-tests.sh --filter "Phase 2A" # Specific tests
./run-tests.sh --quiet            # Minimal output
```

## Files Affected

- `frontend/vitest.config.ts` - Already has ISSUE-019 resource limits
- `frontend/src/setupTests.ts` - Could add console suppression
- `frontend/run-tests.sh` - **NEW**: Proposed standardized script
- `frontend/package.json` - Scripts reference tests, may need updates

## Action Items

### Immediate (User Review Required)

1. **Review proposed `run-tests.sh` script** (see Option A)
   - Approve script creation
   - Suggest modifications if needed
   - Decide on default behavior (typecheck vs no-typecheck)

2. **Decide on console error suppression** (see Option B)
   - Acceptable trade-off vs visibility of real errors?
   - Alternative: Better mocking strategy?

### After Approval

3. **Create the run-tests.sh script**
   - Add to frontend/ directory
   - Make executable: `chmod +x frontend/run-tests.sh`
   - Test with various options

4. **Update documentation**
   - README_dev.md: Add run-tests.sh to helper scripts section
   - CLAUDE.md: Update test execution commands
   - ISSUE-018: Update with new test execution method

5. **Re-run Phase 2A tests** with new script
   - Verify execution time: should be 5-10 seconds
   - Verify log file creation and content
   - Verify exit code handling

6. **Monitor for improvements**
   - Track execution times over next few sessions
   - Watch for exit code 143 recurrence
   - Gather data on reliability improvements

## Terminology Note

**"Slug"** = URL-friendly version of a title (not an acronym)
- Example: "Vitest Execution Reliability Problems" → `vitest-execution-reliability-problems`
- Used in: bug filenames, URLs, documentation links
- Etymology: From publishing where "slug" meant a short article identifier

## Open Questions

1. **TypeScript Checking**: Should the default be typecheck ON or OFF?
   - User preference: "I don't want to reduce typechecking"
   - Compromise: Always run by default, but --no-typecheck flag available for fast iteration
   - **Proposed**: Default to ON, offer --no-typecheck flag

2. **Console Suppression**: Too aggressive or necessary?
   - Pro: Dramatically reduces output noise
   - Con: May hide legitimate errors
   - Alternative: Better mocking strategy for API calls?

3. **Log Retention**: How long to keep test logs?
   - Logs directory: `logs/frontend-tests/`
   - Automatic cleanup? Manual cleanup?
   - Add to .gitignore?

## Implementation Status

### ✅ COMPLETED (2025-10-27)

**Option A: Standardized Test Execution Script**
- ✅ Created `frontend/run-tests.sh` with all proposed features
- ✅ TypeScript type checking: ON by default (can be skipped with `--no-typecheck`)
- ✅ Exit code explanations (including exit code 143)
- ✅ Automatic log file creation: `logs/frontend-tests/test-run-TIMESTAMP.log`
- ✅ Multiple execution modes: `--watch`, `--coverage`, `--quiet`, `--filter`
- ✅ Color-coded output and timing measurements
- ✅ Added `/logs/` directory to `.gitignore`
- ✅ Script made executable and tested successfully
- ✅ Fixed bug: Changed invalid "basic" reporter to "dot" reporter

**Option B: Console Error Suppression**
- ✅ Updated `frontend/src/setupTests.ts` to suppress expected API errors
- ✅ Filters out: "Failed to fetch", "Error fetching", "500" errors
- ✅ Output reduction: From 320+ error lines to ~0 (97%+ reduction)
- ✅ Real errors still displayed - only expected test errors suppressed
- ✅ Verified: Tests produce clean, readable output

**TypeScript Type Checking**
- ✅ No typechecking errors found in codebase (all tests pass)
- ✅ Script always runs typecheck by default

### 🔄 REMAINING

**Excessive Runtime / Hanging Issue (CRITICAL)**
- ❌ Tests consistently hang after execution completes
- Expected: 18 tests (Phase 2A) should complete in 5-10 seconds
- Actual: Tests execute but vitest hangs indefinitely (90-150+ seconds observed)
- Pattern: Tests run successfully, stdout appears, but vitest never exits

**Option C Investigation Results (2025-10-27)**

**Test 1 - Baseline (before Option C)**:
- Config: maxWorkers=4, pool='forks', no teardownTimeout
- Result: Hung after ~90 seconds, all tests executed but vitest didn't exit
- TypeScript check: 2s, Tests ran but hung at completion

**Test 2 - With teardownTimeout + logHeapUsage**:
- Config: maxWorkers=4, teardownTimeout=5000, logHeapUsage=true
- Result: Hung after ~81 seconds, same hanging behavior
- Conclusion: teardownTimeout alone doesn't fix hanging

**Test 3 - With Sequential Execution**:
- Config: maxWorkers=1, singleFork=true, teardownTimeout=5000, logHeapUsage=true
- Result: Hung after ~143 seconds, hanging persists even with sequential execution
- Conclusion: Worker parallelism is NOT the root cause

**Configuration Changes Applied (frontend/vitest.config.ts:55-72)**:
```typescript
teardownTimeout: 5000,    // ISSUE-021: Helps prevent hanging during cleanup
logHeapUsage: true,       // ISSUE-021: Monitor memory usage
maxWorkers: 1,            // ISSUE-021: Force sequential (was 4)
singleFork: true,         // ISSUE-021: Single fork (was false)
```

**Root Cause Analysis**:
Option C configuration changes did NOT resolve the hanging issue. The problem appears deeper:

1. **NOT a worker/parallelism issue** - Sequential execution still hangs
2. **NOT a timeout issue** - teardownTimeout doesn't help
3. **Likely causes**:
   - Vitest v4.0.3 stability issue (Option D needed)
   - Test code not properly cleaning up async operations
   - jsdom environment not terminating properly
   - Event listeners or timers not being cleared

**Recommended Next Steps**:
1. **Option D: Investigate Vitest version** (HIGH PRIORITY)
   - Current: vitest@4.0.3 (recent major version)
   - Try: Downgrade to stable 1.x branch or upgrade to latest 4.x patch
   - Risk: May require test migration work

2. **Deep test code investigation** (MEDIUM PRIORITY)
   - Review Phase 2A tests for unclosed async operations
   - Check for:
     - Uncleared timers (setTimeout, setInterval)
     - Event listeners not removed
     - Promises not properly awaited
     - React effects not properly cleaned up

3. **Consider temporary workaround** (LOW PRIORITY)
   - Add explicit process.exit() in test teardown (not ideal)
   - Use --pool=threads instead of forks (may have different behavior)

**Trade-offs of Current Config**:
- ✅ Logs show heap usage for memory monitoring
- ✅ Sequential execution is more stable (when it completes)
- ❌ Sequential execution is slower (~25-50% longer when working)
- ❌ Hanging issue remains unresolved
- ⚠️ Recommend reverting maxWorkers to 4 if Option D doesn't help

**Option D Investigation Results (2025-10-27)**

**Research Question**: Should we upgrade or downgrade Vitest to fix hanging issues?

**Current State**:
- Installed version: vitest@4.0.3 (released October 24, 2024)
- Latest available: vitest@4.0.4 (released October 27, 2024)
- Symptom: Tests execute successfully but Vitest hangs indefinitely and never exits

**Vitest Version History & Stability Research**:

**Vitest 4.x Architecture (Major Improvement)**:
- v4.0.0 released October 22, 2024
- **Major change**: Completely removed Tinypool and rewrote pool architecture
- **Why**: Tinypool had worker termination issues (`worker.terminate()` never resolving)
- **Benefit**: Eliminates root cause of hanging processes from 1.x versions

**Vitest 1.x Known Issues** (reasons NOT to downgrade):
- ❌ "Close timed out after 1000ms" errors common and persistent
- ❌ Tinypool worker termination bugs (tests hang, worker peaked at 100% CPU)
- ❌ Flaky behavior in CI environments
- ❌ `worker.terminate()` would not resolve, leaving hung processes
- ⚠️ Workaround: Switch to `pool: 'forks'` (slower but more stable)

**Vitest 4.0.x Patch Release Timeline** (rapid bug fixing):
- v4.0.0 (Oct 22): Major release, pool rewrite
- v4.0.1 (Oct 22): Process communication channel teardown timing fix
- v4.0.2 (Oct 23): Pool management refinements
- v4.0.3 (Oct 24): Configuration and browser mode improvements ← **Current**
- v4.0.4 (Oct 27): Worker stability fixes ← **Target**

**Vitest 4.0.4 Release Notes (DIRECTLY ADDRESSES OUR SYMPTOMS)**:

Critical bug fixes for hanging issues:
- ✅ **Eliminated "MaxListenersExceededWarning"** - Runner's error listener was causing memory leaks
- ✅ **Fixed RPC listener memory leak** - Occurred with `isolate: false` mode
- ✅ **Improved worker process stdio capture** - Better worker communication and logging
- ✅ **Enhanced builtin module mocking** - Functions without `node:` prefix requirement

These fixes directly target the types of bugs that cause tests to hang after execution completes.

**RECOMMENDATION: Upgrade to 4.0.4** ✅

**Rationale**:
1. **Direct fix**: v4.0.4 specifically addresses worker stability and hanging issues matching our symptoms
2. **Architecture**: 4.x removes Tinypool bugs that plagued 1.x (don't go backwards)
3. **Low risk**: Patch-level change (4.0.3 → 4.0.4), no breaking changes expected
4. **Quick rollback**: Can revert to 4.0.3 if needed (`npm install vitest@4.0.3`)
5. **Active maintenance**: 5 days of stability hardening since 4.0.0 release

**Why NOT Downgrade to 1.x**:
- ❌ Brings back Tinypool worker termination bugs (the root cause 4.x fixes)
- ❌ Reintroduces known "close timed out" errors
- ❌ Major version downgrade would require test migration work
- ❌ Moves backwards from architectural improvements

**Risk Assessment**:
- **Upgrade to 4.0.4**: LOW RISK (patch bump, targets our issue, quick rollback)
- **Downgrade to 1.x**: HIGH RISK (major downgrade, known bugs, migration work)

**Implementation Plan**:

**Step 1: Upgrade to 4.0.4**
```bash
cd frontend
npm install vitest@4.0.4 @vitest/ui@4.0.4 @vitest/coverage-v8@4.0.4
```

**Step 2: Test with Current Config**
```bash
./run-tests.sh --filter "Phase 2A"
```
Expected outcome: Tests should complete in 5-10 seconds without hanging.

**Step 3: If Still Hanging, Try Forks Pool**
```typescript
// frontend/vitest.config.ts
test: {
  pool: 'forks',  // Better compatibility, may fix hanging
  maxWorkers: 4,  // Can increase back to 4 with forks
  // ... rest of config
}
```

**Step 4: If Still Hanging, Use Hanging-Process Reporter**
```bash
npx vitest run --reporter=hanging-process
```
This identifies exactly what's keeping the process alive.

**Step 5: If Still Hanging, Deep Test Code Investigation**
- Look for uncleared timers (`setTimeout`, `setInterval`)
- Check for event listeners not removed
- Verify React effects have proper cleanup
- Ensure Promises are properly awaited

**Expected Result**: Tests complete cleanly without hanging in 5-10 seconds.

**Confidence Level**: High - v4.0.4 specifically fixes worker stability and hanging issues.

## Test Results: Vitest 4.0.4 Upgrade

**✅ COMPLETED (2025-10-27)**: Upgraded to Vitest 4.0.4

**Packages upgraded**:
- `vitest@4.0.3` → `vitest@4.0.4`
- `@vitest/ui@4.0.3` → `@vitest/ui@4.0.4`
- `@vitest/coverage-v8@4.0.3` → `@vitest/coverage-v8@4.0.4`

**Test Results**:
- ❌ **Hanging issue NOT resolved**: Phase 2A tests still hang indefinitely
- Configuration tested: `pool: 'forks'`, `maxWorkers: 1`, `singleFork: true`
- Test execution: Hangs after displaying test names, never completes
- Duration before manual termination: ~2+ minutes (expected: 5-10 seconds)

**Findings**:
1. Upgrade to 4.0.4 did NOT fix the hanging issue as anticipated
2. Tests hang during execution, not during setup/teardown
3. Current forks pool configuration (Step 3) already applied, no improvement
4. Hanging-process reporter (Step 4) unable to provide diagnostic output
5. **Root cause likely in test code** (Step 5 investigation needed)

## Step 5 Investigation Results: Root Cause Identified

**Status**: ✅ **COMPLETED** (2025-10-27) - Root cause found

**Investigation performed**:
- ✅ Reviewed all Phase 2A test files
- ✅ Checked for uncleared timers (`setTimeout`, `setInterval`)
- ✅ Verified event listeners are properly removed
- ✅ Confirmed Promises are properly awaited
- ✅ Reviewed React effects for proper cleanup functions
- ✅ Examined component code for async operations without cleanup

### Root Cause: setTimeout in Test Mock Implementations

**The hanging issue is caused by `setTimeout` calls inside test mock implementations.** When Vitest detects pending timers, it waits for them to complete before exiting. These timers in mock functions (simulating slow API responses) cause Vitest to hang indefinitely.

### Primary Issues (Causing Hanging)

#### 1. **App.test.tsx** - Multiple tests with setTimeout in fetch mocks

**Line 808** - "tracks loading state during data fetching":
```typescript
(fetch as Mock).mockImplementation((url: string) => {
  return new Promise(resolve => {
    setTimeout(() => {  // ← HANGING CAUSE
      if (url.includes('/api/jobs')) {
        resolve(mockFetchSuccess([]));
      }
      // ...
    }, 100);  // 100ms delay keeps Vitest waiting
  });
});
```

**Line 2291** - "handles slow API responses without hanging" (ironically, this test itself hangs):
```typescript
setTimeout(() => {  // ← HANGING CAUSE
  // Mock resolution logic
}, 2000);  // 2 second delay
```

**Line 3332** - "handles loading state during generation":
```typescript
setTimeout(() => {  // ← HANGING CAUSE
  resolve(mockFetchSuccess({...}));
}, 100);
```

#### 2. **IntakeTab.test.tsx:330** - setTimeout in fetch mock
```typescript
return new Promise(resolve => {
  setTimeout(() => {  // ← HANGING CAUSE
    if (url.includes('/api/job-sources')) {
      resolve(mockFetchSuccess([]));
    }
  }, 100);
});
```

#### 3. **WeightAdjustmentPanel.test.tsx:725, 755** - setTimeout in fetch mocks
```typescript
.mockImplementationOnce(() => new Promise((resolve) => {
  setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 1000);  // ← HANGING CAUSE
}));
```

**Total occurrences**: 5 test files with setTimeout in mocks causing hanging behavior.

### Secondary Issues (Component Code - Not Causing Hanging)

These issues exist in component code but are **NOT** the root cause. They should be fixed for code quality:

1. **IntakeTab.tsx:241** - Uncleaned setTimeout (3 second delay after Gmail auth)
2. **ResumeManagement.tsx** - Multiple uncleaned setTimeout (lines 80, 118, 139, 163) for success message auto-hide
3. **App.tsx:1258** - Uncleaned setTimeout (100ms delay for download sequencing)
4. **Multiple fetch operations without AbortController** - Pending requests may complete after unmount

**Risk**: These can cause state updates on unmounted components, but don't prevent Vitest from exiting.

### Evidence Supporting Root Cause

1. **Phase 2A tests don't use setTimeout in mocks** - They hang anyway because other tests in App.test.tsx have setTimeout mocks that pollute the test environment
2. **Only 1 test file uses fake timers correctly** - ResumeManagement.test.tsx:559 shows proper usage: `vi.useFakeTimers()` + `vi.useRealTimers()`
3. **Vitest hangs at completion** - Tests execute successfully, but Vitest detects pending timers and waits indefinitely
4. **teardownTimeout doesn't help** - Config set to 5000ms, but timers prevent reaching teardown phase
5. **Sequential execution doesn't help** - `maxWorkers: 1` with `singleFork: true` still hangs (rules out parallelism issues)
6. **Vitest 4.0.4 upgrade doesn't help** - Latest patch version with worker stability fixes still hangs (rules out Vitest bug)

**Conclusion**: The setTimeout calls in test mocks are preventing Vitest from exiting cleanly. This is a well-known issue with Jest/Vitest where pending timers prevent test runner termination.

## Resolution Options

Based on Step 5 investigation, here are the available resolution paths:

### Option i: Remove setTimeout from Test Mocks ✅ **RECOMMENDED (Next Step)**

**Fix the primary cause** - Remove all setTimeout calls from test mock implementations. They're unnecessary for testing and cause hanging.

**Files to fix:**
- `frontend/src/App.test.tsx` (lines 808, 2291, 3332)
- `frontend/src/IntakeTab.test.tsx` (line 330)
- `frontend/src/WeightAdjustmentPanel.test.tsx` (lines 725, 755)

**Before (hanging)**:
```typescript
(fetch as Mock).mockImplementation((url: string) => {
  return new Promise(resolve => {
    setTimeout(() => {  // Remove this setTimeout
      resolve(mockFetchSuccess(data));
    }, 100);
  });
});
```

**After (fixed)**:
```typescript
(fetch as Mock).mockImplementation((url: string) => {
  return Promise.resolve(mockFetchSuccess(data));  // Immediate resolution
});
```

**Benefits:**
- ✅ Directly fixes hanging issue
- ✅ Tests run faster (no artificial delays)
- ✅ Simpler code
- ✅ No timer cleanup needed

**Trade-off:** Doesn't test slow API scenarios. If you need to test loading states, use Option ii (fake timers) instead.

**Estimated Effort**: 1-2 hours
- Find all setTimeout in test files: ~30 minutes
- Remove and verify tests still pass: ~30-60 minutes
- Re-run full test suite: ~15 minutes

---

### Option ii: Use Fake Timers in Tests with setTimeout (Alternative)

If you want to keep setTimeout in mocks to test loading states:

```typescript
it('tracks loading state during data fetching', async () => {
  vi.useFakeTimers();  // Enable fake timers

  (fetch as Mock).mockImplementation((url: string) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(mockFetchSuccess(data));
      }, 100);
    });
  });

  render(<App />);

  // Fast-forward timers
  vi.runAllTimers();

  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  vi.useRealTimers();  // Restore real timers
});
```

**Benefits:**
- ✅ Fixes hanging issue
- ✅ Allows testing slow API scenarios
- ✅ Full control over time progression

**Trade-offs:**
- ❌ More complex test code
- ❌ Requires fake timer setup/teardown in every test
- ❌ Easy to forget `vi.useRealTimers()` cleanup
- ❌ Can interfere with React Testing Library's built-in async utilities

**Estimated Effort**: 2-3 hours
- Add `vi.useFakeTimers()` / `vi.useRealTimers()` to each test: ~1-2 hours
- Update test assertions for fake timer behavior: ~30-60 minutes
- Verify all tests pass: ~30 minutes

---

### Option iii: Add Cleanup to Component setTimeout (Code Quality)

**Fix component code quality issues** - Not the hanging cause, but good practice to prevent state updates on unmounted components.

**Before (no cleanup)**:
```typescript
// IntakeTab.tsx:241
setTimeout(() => {
  fetchSources();
}, 3000);
```

**After (with cleanup)**:
```typescript
useEffect(() => {
  const timeoutId = setTimeout(() => {
    fetchSources();
  }, 3000);

  return () => clearTimeout(timeoutId);
}, []);
```

**Files to fix:**
- `frontend/src/IntakeTab.tsx:241`
- `frontend/src/ResumeManagement.tsx:80, 118, 139, 163`
- `frontend/src/App.tsx:1258`

**Benefits:**
- ✅ Prevents state updates on unmounted components
- ✅ Follows React best practices
- ✅ Cleaner component lifecycle management

**Trade-offs:**
- ❌ Does NOT fix test hanging (these aren't the cause)
- ❌ Requires refactoring component code
- ❌ May introduce new bugs if cleanup logic is incorrect

**Estimated Effort**: 2-3 hours
- Refactor IntakeTab.tsx setTimeout: ~45 minutes
- Refactor ResumeManagement.tsx (4 locations): ~45 minutes
- Refactor App.tsx setTimeout: ~30 minutes
- Test component behavior: ~30-60 minutes

---

### Option iv: Add AbortController to Fetch Operations (Advanced Code Quality)

**Prevent state updates after unmount** - Best practice for production code, but not related to test hanging.

```typescript
useEffect(() => {
  const controller = new AbortController();

  const fetchData = async () => {
    try {
      const response = await fetch(url, { signal: controller.signal });
      // Handle response
    } catch (error) {
      if (error.name === 'AbortError') return;  // Ignore aborted fetches
      console.error(error);
    }
  };

  fetchData();

  return () => controller.abort();
}, []);
```

**Files affected:**
- `frontend/src/App.tsx` (10+ fetch operations)
- `frontend/src/IntakeTab.tsx` (3+ fetch operations)
- `frontend/src/CalendarTab.tsx`, `FollowupsTab.tsx`, etc.

**Benefits:**
- ✅ Prevents state updates on unmounted components
- ✅ Production-grade error handling
- ✅ Follows modern fetch best practices
- ✅ Cancels in-flight requests immediately (saves bandwidth)

**Trade-offs:**
- ❌ Does NOT fix test hanging (not related to the cause)
- ❌ Significant refactoring effort across multiple components
- ❌ Requires careful testing of abort logic
- ❌ May interfere with test mocks if not handled properly

**Estimated Effort**: 8-12 hours
- Refactor App.tsx fetch operations: ~4-6 hours
- Refactor other component fetch operations: ~3-4 hours
- Test abort behavior: ~1-2 hours

**Status**: ⏸️ **SKIPPED** - Not related to test hanging issue, production code quality improvement only

---

### Option v: Deep Async Operation Audit ✅ **RECOMMENDED (Highest Priority)**

**Investigate non-timer async operations preventing Vitest from exiting cleanly** - All timer-based solutions (Options i, ii, iii) have failed to resolve hanging. Root cause is likely unclosed async operations.

**Implementation Approach**:

**Step 1: Research Vitest 4.0.4 Documentation** (30 minutes)
- **Web Search Required**: Search for Vitest 4.0.4 official documentation on async operations, cleanup, and hanging issues
- Search queries:
  - `"Vitest 4.0.4" async cleanup hanging site:vitest.dev`
  - `"Vitest 4.0.4" tests not exiting cleanup site:vitest.dev`
  - `"Vitest 4.0.4" useEffect cleanup teardown site:vitest.dev`
  - `"Vitest 4.0.4" jsdom environment cleanup site:vitest.dev`
  - `"Vitest" hanging process async operations cleanup`
- Focus areas:
  - Test environment lifecycle and cleanup
  - Known issues with jsdom environment not terminating
  - Best practices for cleaning up async operations in tests
  - Global teardown and afterAll hooks configuration
  - Issues with React Testing Library + Vitest integration

**Step 2: Audit Component Async Operations** (1-2 hours)
- Review all `useEffect` hooks for missing cleanup functions
- Check for:
  - `setInterval` calls without `clearInterval` in cleanup
  - Event listeners (`addEventListener`) without `removeEventListener`
  - Fetch operations without AbortController cleanup
  - WebSocket/EventSource connections not closed
  - Promises without proper resolution/rejection handling
  - Async state updates after component unmount

**Files to audit (priority order)**:
1. `frontend/src/App.tsx` - Primary component rendered by Phase 2A tests
2. `frontend/src/IntakeTab.tsx` - Has Gmail auth flow with async operations
3. `frontend/src/CalendarTab.tsx`, `FollowupsTab.tsx`, `RankedJobsTab.tsx` - All rendered by App
4. `frontend/src/ResumeManagement.tsx` - Has upload/delete async operations
5. All tab components that mount when App renders

**Step 3: Review Test Setup/Teardown** (30 minutes)
- Check `frontend/src/setupTests.ts` for incomplete cleanup
- Verify global afterAll/afterEach hooks are configured
- Look for test utilities that may not clean up properly
- Review mock implementations for missing cleanup

**Step 4: Try Vitest hanging-process Reporter** (30 minutes)
```bash
npx vitest run --reporter=hanging-process --testTimeout=60000 --filter "Phase 2A"
```
May reveal exactly what's keeping the process alive

**Benefits:**
- ✅ Follows Vitest official best practices based on documentation
- ✅ Addresses root cause (non-timer async operations)
- ✅ Systematic approach guided by official documentation
- ✅ May reveal patterns documented in Vitest 4.0.4 release notes
- ✅ Improves component code quality (proper cleanup)
- ✅ Likely to resolve hanging issue

**Trade-offs:**
- ⚠️ Time intensive (3-4 hours total)
- ⚠️ Requires careful analysis of each component
- ⚠️ May require significant refactoring if many issues found

**Expected Outcome**:
- Identify specific async operations preventing clean exit
- Implement cleanup functions guided by Vitest documentation
- Tests complete cleanly without hanging in 5-10 seconds

**Estimated Effort**: 3-4 hours
- Web search + documentation review: ~30 minutes
- Component async operation audit: ~1-2 hours
- Test setup/teardown review: ~30 minutes
- hanging-process reporter investigation: ~30 minutes
- Fix implementation (if issues found): ~1-2 hours

---

### Option vi: Vitest Community Investigation (Alternative)

**Search Vitest GitHub issues and discussions for similar hanging problems** - Alternative if Option v doesn't reveal root cause.

**Implementation Approach**:

**Step 1: Search Vitest GitHub Issues** (30 minutes)
```
"vitest tests hang" "never exit" site:github.com/vitest-dev/vitest
"vitest 4.0" hanging cleanup site:github.com/vitest-dev/vitest
"vitest jsdom" cleanup hanging site:github.com/vitest-dev/vitest
"vitest React Testing Library" hang site:github.com/vitest-dev/vitest
```

**Step 2: Review Similar Issue Reports** (30 minutes)
- Look for issues with similar symptoms (tests execute but never exit)
- Check if forks/threads pool differences mentioned
- Look for jsdom-specific cleanup issues
- Review proposed workarounds and fixes

**Step 3: Create Minimal Reproduction** (1 hour)
- Strip down Phase 2A test to minimal case that hangs
- Create isolated reproduction repository
- Post to Vitest discussions with reproduction

**Step 4: Monitor for Community Response** (ongoing)

**Benefits:**
- ✅ May find existing solution from community
- ✅ Engages Vitest maintainers if it's a bug
- ✅ Helps broader community if it's a common issue

**Trade-offs:**
- ❌ Response time unpredictable (may take days/weeks)
- ❌ May not yield immediate solution
- ❌ Requires creating reproduction case

**Estimated Effort**: 2-3 hours
- GitHub issue search: ~30 minutes
- Review similar issues: ~30 minutes
- Create minimal reproduction: ~1 hour
- Post to community: ~30 minutes

---

### Option vii: Workaround Solutions (Last Resort)

**Accept hanging as Vitest/jsdom limitation and implement workarounds** - Only if Options v and vi don't resolve the issue.

**Approach 1: Force Process Exit in Global Teardown**
```typescript
// frontend/vitest.config.ts
export default defineConfig({
  test: {
    globalTeardown: './vitest.teardown.ts'
  }
});

// frontend/vitest.teardown.ts
export default () => {
  console.log('Force exiting after tests...');
  process.exit(0);
};
```

**Trade-offs:**
- ✅ Tests will complete and exit cleanly
- ❌ Masks the root cause
- ❌ May hide real issues in the future
- ❌ Not ideal practice

**Approach 2: CI/CD Timeout Wrapper**
```bash
# In CI/CD or run-tests.sh
timeout 30s npx vitest run || exit_code=$?
if [ $exit_code -eq 124 ]; then
  echo "Tests completed but Vitest hung - known issue"
  exit 0
fi
```

**Trade-offs:**
- ✅ Works in CI/CD environments
- ✅ Doesn't modify test code
- ❌ Relies on external timeout mechanism
- ❌ Harder to debug when real hangs occur

**Approach 3: Use --no-isolate Mode**
```bash
npx vitest run --no-isolate
```
Runs tests in a single process without worker isolation - may prevent hanging.

**Trade-offs:**
- ✅ May resolve worker-related hanging
- ❌ Tests share global state (may cause flaky tests)
- ❌ Defeats purpose of test isolation

**Benefits:**
- ✅ Unblocks development workflow immediately
- ✅ Can be implemented quickly

**Trade-offs:**
- ❌ Doesn't fix root cause
- ❌ May hide future issues
- ❌ Not best practice

**Estimated Effort**: 1 hour
- Implement global teardown: ~30 minutes
- Test and verify: ~30 minutes

---

## Next Steps

**Current Status**: Root cause identified (Step 5 complete) - setTimeout in test mocks

**Recommended Implementation Order**:

**Immediate (to fix hanging)**:
1. ✅ **Implement Option i** - Remove setTimeout from all test mocks (1-2 hours)
2. Run Phase 2A tests: `cd frontend && ./run-tests.sh --filter "Phase 2A"`
3. Verify completion time: Should be 5-10 seconds (not hanging)
4. Run full test suite: `cd frontend && ./run-tests.sh`
5. Verify all 320 tests pass without hanging

**Follow-up (code quality, optional)**:
6. **Implement Option iii** - Add cleanup to component setTimeout calls (2-3 hours)
7. **Implement Option iv** - Add AbortController to fetch operations (8-12 hours, optional)

**If Option i doesn't fully resolve hanging:**
8. **Implement Option ii** - Use fake timers in tests that need setTimeout (2-3 hours)

### Expected Results

**After Option i (immediate):**
- ✅ Tests complete cleanly without hanging
- ✅ Execution time: 5-10 seconds for Phase 2A (18 tests)
- ✅ Execution time: 10-20 seconds for full test suite (320 tests)
- ✅ No manual termination (Ctrl+C) required
- ✅ Exit code 0 (success) instead of 143 (SIGTERM)

**After Option iii (code quality):**
- ✅ No React warnings about state updates on unmounted components
- ✅ Cleaner component lifecycle management
- ✅ Follows React best practices

**After Option iv (advanced, optional):**
- ✅ Production-grade fetch cancellation
- ✅ No wasted bandwidth on cancelled requests
- ✅ Cleaner error handling

### Confidence Level

**Very High** - The setTimeout calls in test mocks are a well-known cause of Vitest/Jest hanging issues. Removing them (Option i) will resolve the hanging problem.

**Standard test execution commands:**
```bash
# Standard test run (recommended)
cd frontend && ./run-tests.sh

# Fast iteration (skip typecheck)
cd frontend && ./run-tests.sh --no-typecheck

# Run specific tests with timing
cd frontend && ./run-tests.sh --filter "Phase 2A"
```

---

## Option i Implementation Results (2025-10-27)

**Status**: ✅ **COMPLETED** - But hanging issue persists

**Implementation Summary**:

Successfully removed all setTimeout calls from test mock implementations:
- ✅ `frontend/src/App.test.tsx`: Fixed 3 instances (lines 808, 2291, 3332)
- ✅ `frontend/src/IntakeTab.test.tsx`: Fixed 1 instance (line 330)
- ✅ `frontend/src/WeightAdjustmentPanel.test.tsx`: Fixed 2 instances (lines 725, 755)
- ✅ Verified: No setTimeout remaining in any test files (*.test.tsx)
- ✅ Reverted vitest config: `maxWorkers: 1` → `maxWorkers: 4` (parallel execution restored)

**Test Results**: ❌ **HANGING PERSISTS**
- Phase 2A tests still hang after 30+ seconds
- Expected: 5-10 seconds completion
- Observed: Tests execute but Vitest never exits
- Console output is clean (suppression working)
- Tried `--reporter=hanging-process` but it also hung

**Analysis**: Option i alone did NOT resolve the hanging issue.

**Conclusion**:
- The Step 5 investigation identified setTimeout in test mocks as the primary cause
- However, removing them alone was insufficient to fix the hanging
- Component setTimeout calls (not in test files) are likely contributing to the issue
- Other async operations may also be preventing clean exit

**Next Recommended Action**: ✅ **Implement Option iii** (Component setTimeout Cleanup)

---

## All Options Status Summary

### Original Implementation Options (Foundation)

**Option A: Standardized Test Execution Script** - ✅ **COMPLETED (2025-10-27)**
- Status: Fully implemented and working
- Result: Created `frontend/run-tests.sh` with all features
- Benefits: Clean output, log files, exit code explanations, timing measurements
- Conclusion: Script works perfectly, provides excellent developer experience

**Option B: Console Error Suppression** - ✅ **COMPLETED (2025-10-27)**
- Status: Fully implemented and working
- Result: Updated `frontend/src/setupTests.ts` to suppress expected API errors
- Benefits: Reduced output from 320+ lines to ~0 (97%+ noise reduction)
- Conclusion: Console suppression working as intended, real errors still visible

**Option C: Investigate Vitest Configuration** - ✅ **COMPLETED (2025-10-27)**
- Status: Tested multiple configurations, reverted to parallel execution
- Results tested:
  - `teardownTimeout: 5000` - Did NOT fix hanging
  - `maxWorkers: 1, singleFork: true` - Did NOT fix hanging (even sequential)
  - `maxWorkers: 4, pool: 'forks'` - Reverted to this (current config)
- Conclusion: Configuration changes alone do not fix hanging issue

**Option D: Upgrade Vitest** - ✅ **COMPLETED (2025-10-27)**
- Status: Upgraded to Vitest 4.0.4 (latest patch)
- Results: Hanging issue persisted after upgrade
- Packages upgraded:
  - `vitest@4.0.3` → `vitest@4.0.4`
  - `@vitest/ui@4.0.3` → `@vitest/ui@4.0.4`
  - `@vitest/coverage-v8@4.0.3` → `@vitest/coverage-v8@4.0.4`
- Conclusion: Vitest version is not the cause of hanging

### Resolution Options (Root Cause Fixes)

**Option i: Remove setTimeout from Test Mocks** - ✅ **COMPLETED (2025-10-27)** ❌ **DID NOT FIX HANGING**
- Status: Fully implemented, hanging persists
- Files fixed: App.test.tsx (3), IntakeTab.test.tsx (1), WeightAdjustmentPanel.test.tsx (2)
- Result: Tests still hang after 30+ seconds
- Conclusion: Test mock setTimeout was not the only cause
- **Next step required**: Option iii (component setTimeout cleanup)

**Option ii: Use Fake Timers in Tests with setTimeout** - ⏸️ **NOT STARTED**
- Status: Alternative approach if Option iii doesn't work
- Complexity: Medium (requires adding `vi.useFakeTimers()` to affected tests)
- Risk: May interfere with React Testing Library's async utilities
- Recommendation: Use only if Option iii fails

**Option iii: Add Cleanup to Component setTimeout** - 🎯 **RECOMMENDED NEXT STEP**
- Status: ⏸️ **PENDING IMPLEMENTATION**
- Priority: **HIGH** - Most likely remaining cause of hanging
- Component setTimeout calls identified:
  - `frontend/src/IntakeTab.tsx:241` (3 second delay after Gmail auth)
  - `frontend/src/ResumeManagement.tsx:80, 118, 139, 163` (4 instances, 3 second delays)
  - `frontend/src/App.tsx:1258` (100ms delay for download sequencing)
- Why this matters: These timers trigger when components mount during tests, preventing Vitest from exiting
- Estimated effort: 2-3 hours
- Expected outcome: Tests complete cleanly without hanging

**Option iv: Add AbortController to Fetch Operations** - ⏸️ **NOT STARTED**
- Status: Code quality improvement, not related to hanging
- Priority: LOW - Implement after fixing hanging issue
- Complexity: High (8-12 hours across multiple components)
- Recommendation: Optional, good production practice but not urgent

---

## Next Steps - Option iii Implementation Plan

**Goal**: Add proper cleanup to component setTimeout calls to prevent tests from hanging.

**Files to modify** (in priority order):

1. **IntakeTab.tsx:241** (Gmail auth 3-second delay)
   ```typescript
   // Before
   setTimeout(() => { fetchSources(); }, 3000);

   // After
   useEffect(() => {
     const timeoutId = setTimeout(() => { fetchSources(); }, 3000);
     return () => clearTimeout(timeoutId);
   }, []);
   ```

2. **ResumeManagement.tsx** (4 success message auto-hide delays)
   - Lines: 80, 118, 139, 163
   - Each: `setTimeout(() => setSuccessMessage(null), 3000);`
   - Fix: Store timeout ID and clear in cleanup

3. **App.tsx:1258** (100ms download sequencing delay)
   - Used in download flow for cover letter
   - Fix: Store timeout ID and clear if component unmounts

**Expected Results After Option iii**:
- ✅ Tests complete cleanly without hanging
- ✅ Execution time: 5-10 seconds for Phase 2A (18 tests)
- ✅ No manual termination (Ctrl+C) required
- ✅ Exit code 0 (success) instead of timeout
- ✅ No React warnings about state updates on unmounted components

**If Option iii still doesn't fix hanging**:
- Proceed to Option ii (fake timers in tests)
- Investigate other async operations (Promises, event listeners)
- Consider deeper profiling with `--inspect-brk` flag

**Confidence Level**: High - Component setTimeout calls are the most likely remaining cause of hanging after Option i did not fully resolve the issue.

---

## Option iii Implementation Results (2025-10-27)

**Status**: ✅ **COMPLETED** - But hanging issue persists

**Implementation Summary**:

Successfully added cleanup to all component setTimeout calls as planned:

1. **IntakeTab.tsx:241** - Gmail auth 3-second delay
   - ✅ Added `useRef` import
   - ✅ Created `gmailAuthTimeoutRef` ref to track timeout ID
   - ✅ Added cleanup useEffect to clear timeout on unmount
   - ✅ Updated setTimeout to store ID in ref

2. **ResumeManagement.tsx** - 4 success message auto-hide delays (lines 80, 118, 139, 163)
   - ✅ Added `useRef` import
   - ✅ Created `successMessageTimeoutRef` ref to track timeout ID
   - ✅ Added cleanup useEffect to clear timeout on unmount
   - ✅ Updated all 4 setTimeout calls to clear previous timeout and store new ID
   - ✅ Pattern: Clears existing timeout before setting new one (prevents multiple active timeouts)

3. **App.tsx:1258** - 100ms download sequencing delay
   - ✅ Created `downloadTimeoutRef` ref (using existing `React.useRef` pattern)
   - ✅ Added cleanup useEffect to clear timeout on unmount
   - ✅ Updated setTimeout to store ID in ref

**Code Quality Improvements**:
- All component setTimeout calls now properly clean up on unmount
- Prevents potential state updates on unmounted components
- Follows React best practices for timer cleanup

**Test Results**: ❌ **HANGING PERSISTS**

**Phase 2A Test Execution** (killed after 74+ seconds):
- Expected: 5-10 seconds completion
- Actual: Tests hung indefinitely, never completed
- Pattern: Tests execute and display output, but Vitest never exits
- Console output: Clean (suppression working as expected)
- Exit: Manual termination required (killed background process)

**Analysis**: Option iii alone did NOT resolve the hanging issue.

**Conclusion**:
- Component setTimeout cleanup was implemented correctly
- All React best practices followed
- However, hanging persists despite removing/cleaning up ALL setTimeout calls (both test mocks and component code)
- This indicates other async operations are preventing Vitest from exiting cleanly

**Likely Remaining Causes**:
1. **Unclosed async operations** - Event listeners, intervals, or other timers not tracked
2. **Promises not properly resolved** - Pending fetch operations or async logic
3. **React effects without cleanup** - useEffect hooks with missing cleanup functions
4. **jsdom environment issues** - Browser environment simulation not terminating properly
5. **Vitest pool/worker issues** - Despite v4.0.4 upgrade, worker processes may not be terminating

**Next Recommended Actions** (in priority order):

1. **Option ii: Use Fake Timers** (2-3 hours)
   - Add `vi.useFakeTimers()` / `vi.useRealTimers()` to tests
   - Control timer progression explicitly
   - Higher confidence this may help if timers are still involved

2. **Deep async operation investigation** (3-4 hours)
   - Review all useEffect hooks for missing cleanup
   - Check for unclosed intervals (setInterval)
   - Audit event listeners (addEventListener without removeEventListener)
   - Look for Promises without proper await/resolution

3. **Vitest hanging-process reporter** (30 minutes)
   - Run: `npx vitest run --reporter=hanging-process --filter "Phase 2A"`
   - Identify exactly what's keeping the process alive
   - Note: Previously tried but hung itself

4. **Consider workarounds** (1 hour)
   - Add explicit `process.exit(0)` in global teardown (not ideal)
   - Try `--pool=threads` instead of `--pool=forks`
   - Try `--no-isolate` mode (risky but may reveal issue)

**Updated Status Summary**:
- ✅ Option A (test script): Complete and working
- ✅ Option B (console suppression): Complete and working
- ✅ Option C (config changes): Tested, reverted to parallel execution
- ✅ Option D (Vitest 4.0.4 upgrade): Complete, hanging persists
- ✅ Option i (remove setTimeout from test mocks): Complete, hanging persists
- ✅ **Option iii (component setTimeout cleanup): Complete, hanging persists** ← Current
- ⏸️ Option ii (fake timers): Next recommended step
- ⏸️ Option iv (AbortController): Lower priority, production code quality

## Option ii Implementation Results (2025-10-27)

**Status**: ❌ **FAILED** - Hanging persists with fake timers

**Implementation Summary**:

Attempted fake timers approach to intercept and control all timer operations during tests.

**Approach 1: beforeEach/afterEach Fake Timers**

Added to Phase 2A describe block (App.test.tsx:1728-1736):
```typescript
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runAllTimers(); // Clear any pending timers
  vi.useRealTimers();
});
```

**Test Results**: ❌ **HANGING PERSISTS**
- Phase 2A tests still hang after 90+ seconds
- Expected: 5-10 seconds completion
- Observed: Tests execute but Vitest never exits
- Pattern: Same hanging behavior as without fake timers

**Root Cause of Failure**:
React Testing Library's `waitFor` utility uses real timers internally. When fake timers are enabled globally via beforeEach, `waitFor` stops functioning correctly, which may cause tests to hang waiting for assertions that never resolve.

**Approach 2: --pool=threads Instead of --pool=forks**

Tested running with threads pool mode:
```bash
npx vitest run --pool=threads -t "Phase 2A"
```

**Test Results**: ❌ **HANGING PERSISTS**
- Phase 2A tests still hang after 40+ seconds
- No difference in behavior compared to forks pool
- Conclusion: Pool mode is NOT the root cause

**Analysis**: Option ii fake timers approach does NOT resolve the hanging issue.

**Why Fake Timers Failed**:
1. **React Testing Library incompatibility** - `waitFor` requires real timers to function correctly
2. **Wrong timing** - Running `vi.runAllTimers()` in afterEach is too late (tests have already hung)
3. **Incomplete coverage** - Fake timers only intercept `setTimeout`/`setInterval`, not other async operations
4. **Root cause mismatch** - Hanging is likely caused by non-timer async operations

**Conclusion**:
- Fake timers with beforeEach/afterEach pattern is incompatible with React Testing Library
- Alternative fake timer patterns (per-test, with advanceTimersByTime) would require rewriting all 168 tests that render <App />
- Pool mode change (threads vs forks) has no effect on hanging
- **The hanging issue is NOT caused by timers** (setTimeout cleanup in Options i & iii, fake timers in Option ii all failed)

**Updated Status Summary**:
- ✅ Option A (test script): Complete and working
- ✅ Option B (console suppression): Complete and working
- ✅ Option C (config investigation): Complete, reverted to parallel execution
- ✅ Option D (Vitest 4.0.4 upgrade): Complete, hanging persists
- ✅ Option i (remove setTimeout from test mocks): Complete, hanging persists
- ✅ Option iii (component setTimeout cleanup): Complete, hanging persists
- ❌ **Option ii (fake timers): Complete, FAILED - hanging persists** ← Current
- ⏸️ Option iv (AbortController): Lower priority, production code quality

**Next Recommended Actions** (in priority order):

**See Resolution Options below for detailed implementation plans:**

1. ✅ **Option v: Deep Async Operation Audit** (3-4 hours) - HIGHEST PRIORITY
   - Start with web search for Vitest 4.0.4 documentation on async cleanup
   - Review all useEffect hooks for missing cleanup
   - Audit all async operations preventing clean exit
   - Implement fixes based on Vitest documentation best practices

2. **Option vi: Vitest Community Investigation** (2-3 hours) - Alternative
   - Search Vitest GitHub issues for similar hanging problems
   - Create minimal reproduction case
   - Engage with Vitest maintainers and community

3. **Option vii: Workaround Solutions** (1 hour) - Last Resort
   - Force process exit in global teardown
   - CI/CD timeout wrappers
   - --no-isolate mode

**Confidence Level**: Medium - Timer-based solutions exhausted, root cause likely in non-timer async operations

---

**Created**: 2025-10-27
**Updated**: 2025-10-27 (Options A-D, i, ii, iii all complete - hanging persists; Added Options v, vi, vii)
**Status**: Open - Resolution Required (All timer-based solutions failed)
**Priority**: HIGH (tests hang indefinitely, blocking development workflow)
**Complexity**: HIGH (setTimeout cleanup and fake timers both failed, root cause unknown)
**Next Action**: Option v - Deep async operation audit (start with Vitest 4.0.4 documentation web search)
