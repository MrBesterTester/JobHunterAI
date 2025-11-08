#!/bin/bash
set -euo pipefail

# Run Backend Tests Script
# Purpose: Run only backend tests (build + cargo test)
# Usage: ./helper-scripts/run-backend-tests.sh [--no-build]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

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

cd "$BACKEND_DIR"

START_TIME=$(date +%s)

# Build backend
if [ "$SKIP_BUILD" = false ]; then
    log_section "BUILDING BACKEND (Rust/Cargo)"
    log_info "Running cargo build..."

    if cargo build 2>&1 | tee /tmp/backend-build.log; then
        # Check for warnings
        if grep -i "warning" /tmp/backend-build.log > /dev/null; then
            log_error "Backend build has warnings"
            cat /tmp/backend-build.log | grep -i "warning"
            exit 1
        else
            log_info "Backend build PASSED (zero warnings)"
        fi
    else
        log_error "Backend build FAILED"
        exit 1
    fi
else
    log_info "Skipping build (--no-build flag)"
fi

# Run tests
log_section "RUNNING BACKEND TESTS (Cargo Test)"
log_info "Running cargo test..."

if cargo test 2>&1 | tee /tmp/backend-test.log; then
    END_TIME=$(date +%s)
    RUNTIME=$((END_TIME - START_TIME))

    # Extract test summary
    TEST_SUMMARY=$(grep "test result:" /tmp/backend-test.log | tail -1)

    log_info "Backend tests PASSED (${RUNTIME}s)"
    log_info "$TEST_SUMMARY"

    echo ""
    echo -e "${GREEN}✅ Backend tests completed successfully${NC}"
    echo "Runtime: ${RUNTIME}s"
    exit 0
else
    log_error "Backend tests FAILED"
    echo ""
    echo -e "${RED}❌ Backend tests failed${NC}"
    exit 1
fi
