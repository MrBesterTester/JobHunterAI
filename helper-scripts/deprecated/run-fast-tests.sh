#!/bin/bash
set -euo pipefail

# Fast Test Runner
# Purpose: Run backend + frontend unit tests WITHOUT OAuth validation or cargo clean
# Use this for rapid iteration during development
#
# For full E2E tests with OAuth, use: ./helper-scripts/run-comprehensive-tests.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

START_TIME=$(date +%s)

log_section "FAST TEST SUITE"
echo "Start time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "Mode: Unit tests only (no E2E, no OAuth, no cargo clean)"
echo ""

# Backend tests
log_section "BACKEND TESTS (Rust/Cargo)"
cd "$PROJECT_ROOT/backend"

if cargo test 2>&1 | tee /tmp/backend-test-results.log; then
    TEST_COUNT=$(grep -E "^test result:" /tmp/backend-test-results.log | tail -1)
    log_info "Backend tests PASSED"
    log_info "$TEST_COUNT"
    BACKEND_PASSED=true
else
    log_error "Backend tests FAILED"
    BACKEND_PASSED=false
fi

# Frontend tests
log_section "FRONTEND TESTS (TypeScript/Jest)"
cd "$PROJECT_ROOT/frontend"

if npm test 2>&1 | tee /tmp/frontend-test-results.log; then
    TEST_COUNT=$(grep -E "^Tests:" /tmp/frontend-test-results.log | tail -1)
    log_info "Frontend tests PASSED"
    log_info "$TEST_COUNT"
    FRONTEND_PASSED=true
else
    log_error "Frontend tests FAILED"
    FRONTEND_PASSED=false
fi

# Summary
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

log_section "TEST SUMMARY"
echo "Backend:  $( [ "$BACKEND_PASSED" = true ] && echo -e "${GREEN}✓ PASSED${NC}" || echo -e "${RED}✗ FAILED${NC}" )"
echo "Frontend: $( [ "$FRONTEND_PASSED" = true ] && echo -e "${GREEN}✓ PASSED${NC}" || echo -e "${RED}✗ FAILED${NC}" )"
echo ""
echo "Total time: ${MINUTES}m ${SECONDS}s"
echo ""

if [ "$BACKEND_PASSED" = true ] && [ "$FRONTEND_PASSED" = true ]; then
    log_info "All unit tests PASSED! 🎉"

    # Optional: Play sound notification
    afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true

    exit 0
else
    log_error "Some tests FAILED"
    exit 1
fi
