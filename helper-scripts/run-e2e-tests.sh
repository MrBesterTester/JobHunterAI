#!/bin/bash
set -euo pipefail

# Run E2E Tests Script
# Purpose: Run only E2E Playwright tests
# Usage: ./helper-scripts/run-e2e-tests.sh [--no-notify]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Default behavior
NO_NOTIFY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-notify)
            NO_NOTIFY=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_section() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

cd "$FRONTEND_DIR"

START_TIME=$(date +%s)

log_section "RUNNING E2E TESTS (Playwright)"
log_warning "E2E tests typically take 20-25 minutes"
log_info "Running Playwright with COMPREHENSIVE_TESTS=true..."
log_info "This enables longer timeouts (45s vs 10s) for tests under load"

# Export COMPREHENSIVE_TESTS environment variable
# This tells E2E test helpers to use longer timeouts (45s vs 10s)
# for operations that are slower under comprehensive test load
export COMPREHENSIVE_TESTS=true

# Run Playwright directly instead of via npm to ensure environment variables are passed through
# npm can sometimes filter or reset environment variables when spawning child processes
if COMPREHENSIVE_TESTS=true npx playwright test 2>&1 | tee /tmp/e2e-test.log; then
    END_TIME=$(date +%s)
    RUNTIME=$((END_TIME - START_TIME))
    RUNTIME_MIN=$((RUNTIME / 60))
    RUNTIME_SEC=$((RUNTIME % 60))

    # Extract test summary
    PASSED_COUNT=$(grep -o "[0-9]* passed" /tmp/e2e-test.log | tail -1 | grep -o "[0-9]*")

    log_info "E2E tests PASSED (${RUNTIME_MIN}m ${RUNTIME_SEC}s)"
    log_info "Passed: ${PASSED_COUNT:-0} tests"

    echo ""
    echo -e "${GREEN}✅ E2E tests completed successfully${NC}"
    echo "Runtime: ${RUNTIME_MIN}m ${RUNTIME_SEC}s"

    # Send notification (unless suppressed)
    if [ "$NO_NOTIFY" = false ]; then
        afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true
        osascript -e "display dialog \"E2E tests passed (${RUNTIME_MIN}m ${RUNTIME_SEC}s)\" with title \"Claude Code\" buttons {\"OK\"} default button \"OK\" with icon note" 2>/dev/null || true
    fi

    exit 0
else
    END_TIME=$(date +%s)
    RUNTIME=$((END_TIME - START_TIME))
    RUNTIME_MIN=$((RUNTIME / 60))
    RUNTIME_SEC=$((RUNTIME % 60))

    log_error "E2E tests FAILED (${RUNTIME_MIN}m ${RUNTIME_SEC}s)"

    # Show failure summary
    if grep -q "passed" /tmp/e2e-test.log; then
        PASSED=$(grep -o "[0-9]* passed" /tmp/e2e-test.log | tail -1)
        FAILED=$(grep -o "[0-9]* failed" /tmp/e2e-test.log | tail -1)
        echo "Results: $PASSED, $FAILED"
    fi

    echo ""
    echo -e "${RED}❌ E2E tests failed${NC}"
    echo "See /tmp/e2e-test.log for details"

    # Send notification (unless suppressed)
    if [ "$NO_NOTIFY" = false ]; then
        afplay /System/Library/Sounds/Basso.aiff 2>/dev/null || true
        osascript -e "display dialog \"E2E tests failed\" with title \"Claude Code\" buttons {\"OK\"} default button \"OK\" with icon caution" 2>/dev/null || true
    fi

    exit 1
fi
