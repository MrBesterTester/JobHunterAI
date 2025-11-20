#!/bin/bash
set -euo pipefail

# Run Frontend Tests Script
# Purpose: Run only frontend tests (build + jest)
# Usage: ./helper-scripts/run-frontend-tests.sh [--no-build]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
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

# Parse arguments
SKIP_BUILD=false
if [[ "${1:-}" == "--no-build" ]]; then
    SKIP_BUILD=true
fi

cd "$FRONTEND_DIR"

START_TIME=$(date +%s)

# Build frontend
if [ "$SKIP_BUILD" = false ]; then
    log_section "BUILDING FRONTEND (React/TypeScript/RSBuild)"
    log_info "Running npm run build..."

    if npm run build 2>&1 | tee /tmp/frontend-build.log; then
        log_info "Frontend build PASSED"
    else
        log_error "Frontend build FAILED"
        exit 1
    fi
else
    log_info "Skipping build (--no-build flag)"
fi

# Run tests
log_section "RUNNING FRONTEND UNIT TESTS (Jest)"
log_info "Running npm test..."

if npm test 2>&1 | tee /tmp/frontend-test.log; then
    END_TIME=$(date +%s)
    RUNTIME=$((END_TIME - START_TIME))

    # Extract test summary
    TEST_SUMMARY=$(grep "Test Suites:" /tmp/frontend-test.log | tail -1)
    TESTS_SUMMARY=$(grep "Tests:" /tmp/frontend-test.log | tail -1)

    log_info "Frontend tests PASSED (${RUNTIME}s)"
    log_info "$TEST_SUMMARY"
    log_info "$TESTS_SUMMARY"

    echo ""
    echo -e "${GREEN}✅ Frontend tests completed successfully${NC}"
    echo "Runtime: ${RUNTIME}s"
    exit 0
else
    END_TIME=$(date +%s)
    RUNTIME=$((END_TIME - START_TIME))

    log_error "Frontend tests FAILED (${RUNTIME}s)"

    # Show failure summary
    if grep -q "Test Suites:" /tmp/frontend-test.log; then
        TEST_SUMMARY=$(grep "Test Suites:" /tmp/frontend-test.log | tail -1)
        TESTS_SUMMARY=$(grep "Tests:" /tmp/frontend-test.log | tail -1)
        echo "$TEST_SUMMARY"
        echo "$TESTS_SUMMARY"
    fi

    echo ""
    echo -e "${RED}❌ Frontend tests failed${NC}"
    echo "See /tmp/frontend-test.log for details"
    exit 1
fi
