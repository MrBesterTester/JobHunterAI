#!/bin/bash
set -euo pipefail

# Comprehensive Test Suite Runner
# Purpose: Local, on-demand comprehensive validation (informal CI/CD)
# - Clean rebuild backend and frontend (zero warnings)
# - Run all test suites (backend, frontend unit, E2E)
# - Report comprehensive results

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default behavior
FAIL_FAST=false
SKIP_PREFLIGHT=false

# Results tracking
PREFLIGHT_PASSED=true
BACKEND_BUILD_PASSED=false
FRONTEND_BUILD_PASSED=false
BACKEND_TESTS_PASSED=false
FRONTEND_TESTS_PASSED=false
E2E_TESTS_PASSED=false

BACKEND_BUILD_TIME=""
FRONTEND_BUILD_TIME=""
BACKEND_TEST_TIME=""
FRONTEND_TEST_TIME=""
E2E_TEST_TIME=""

# Parse command line arguments
usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Run comprehensive test suite (local informal CI/CD):
  1. Preflight checks (git, database, email state)
  2. Clean rebuild backend and frontend (zero warnings)
  3. Run all test suites (backend, frontend unit, E2E)
  4. Report results with iPhone notification

OPTIONS:
    -f, --fail-fast       Stop on first failure (default: run all and report)
    --skip-preflight      Skip preflight checks (not recommended)
    -h, --help            Show this help message

EXAMPLES:
    $(basename "$0")                  # Run all tests, report at end
    $(basename "$0") --fail-fast      # Stop at first failure
    $(basename "$0") --skip-preflight # Skip preflight (use with caution)

EOF
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--fail-fast)
            FAIL_FAST=true
            shift
            ;;
        --skip-preflight)
            SKIP_PREFLIGHT=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Helper functions
log_section() {
    echo ""
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

handle_failure() {
    local phase="$1"
    log_error "$phase FAILED"

    if [ "$FAIL_FAST" = true ]; then
        log_error "Fail-fast mode enabled. Aborting."
        send_notification "Comprehensive Tests FAILED" "$phase failed in fail-fast mode"
        exit 1
    else
        log_warning "Continuing with remaining tests..."
    fi
}

send_notification() {
    local title="$1"
    local message="$2"

    # Play sound
    afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true

    # Show dialog
    osascript -e "display dialog \"$message\" with title \"$title\" buttons {\"OK\"} default button \"OK\" with icon note" 2>/dev/null || true
}

check_database_selection() {
    log_section "PREFLIGHT: Database Selection"

    # Check which database is configured
    local db_name=$(grep '^DATABASE_URL=' backend/.env 2>/dev/null | grep -o 'jobhunter[^?]*' || echo "unknown")

    if [[ "$db_name" == "jobhunter_personal" ]]; then
        log_info "Database: jobhunter_personal (correct)"
        return 0
    else
        log_error "Database: $db_name (expected: jobhunter_personal)"
        log_error "Run: ./helper-scripts/switch-to-personal.sh"
        return 1
    fi
}

check_database_state() {
    log_section "PREFLIGHT: Database State"

    # Clear database
    log_info "Clearing database..."
    if ! "$SCRIPT_DIR/clear-database.sh"; then
        log_error "Failed to clear database"
        return 1
    fi

    # Seed database with test fixtures
    log_info "Seeding database with test fixtures..."
    if ! "$SCRIPT_DIR/seed-database.sh"; then
        log_error "Failed to seed database"
        return 1
    fi

    log_info "Database state: cleared and seeded"
    return 0
}

check_gmail_state() {
    log_section "PREFLIGHT: Gmail State"

    # Clear Gmail state (remove labels, mark emails as read)
    log_info "Clearing Gmail state..."
    if ! "$SCRIPT_DIR/clear-gmail-state.sh"; then
        log_error "Failed to clear Gmail state"
        return 1
    fi

    log_info "Gmail state: cleared (no unread, no JobOps labels)"
    return 0
}

check_msmail_state() {
    log_section "PREFLIGHT: Microsoft Mail State"

    # Setup MS Mail state (clear JobOps-OLD, prepare JobOps folder)
    log_info "Setting up Microsoft Mail state..."
    if ! "$SCRIPT_DIR/setup-msmail-state.sh"; then
        log_error "Failed to setup Microsoft Mail state"
        return 1
    fi

    log_info "Microsoft Mail state: JobOps folders ready"
    return 0
}

check_git_status() {
    log_section "PREFLIGHT: Git Status"

    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        log_error "Uncommitted changes detected"
        log_error "Please commit or stash changes before running comprehensive tests"
        git status --short
        return 1
    fi

    log_info "No uncommitted changes"
    return 0
}

run_preflight_checks() {
    log_section "RUNNING PREFLIGHT CHECKS"

    local all_passed=true

    # Git status (HARD requirement - abort if fails)
    if ! check_git_status; then
        all_passed=false
    fi

    # Database selection (HARD requirement - abort if fails)
    if ! check_database_selection; then
        all_passed=false
    fi

    # OAuth token refresh (HARD requirement - abort if fails)
    if [ -f "$PROJECT_ROOT/.env.test" ]; then
        log_info "Refreshing OAuth tokens..."
        if ! "$SCRIPT_DIR/refresh-oauth-tokens.sh"; then
            log_error "Failed to refresh OAuth tokens"
            log_error "Run: ./helper-scripts/setup-test-oauth.sh"
            all_passed=false
        fi
    else
        log_error ".env.test not found - OAuth tokens required"
        log_error "Run: ./helper-scripts/setup-test-oauth.sh"
        all_passed=false
    fi

    # Database state (HARD requirement - abort if fails)
    if ! check_database_state; then
        all_passed=false
    fi

    # Gmail state (HARD requirement - abort if fails)
    if ! check_gmail_state; then
        all_passed=false
    fi

    # MS Mail state (HARD requirement - abort if fails)
    if ! check_msmail_state; then
        all_passed=false
    fi

    if [ "$all_passed" = false ]; then
        log_error "Preflight checks FAILED"
        send_notification "Preflight Checks Failed" "Fix issues and try again"
        exit 1
    fi

    log_info "All preflight checks PASSED"
    PREFLIGHT_PASSED=true
}

build_backend() {
    log_section "BUILDING BACKEND (Rust/Cargo)"

    cd "$PROJECT_ROOT/backend"
    local start_time=$(date +%s)

    # Clean build
    log_info "Running cargo clean..."
    cargo clean

    log_info "Running cargo build..."
    if cargo build 2>&1 | tee /tmp/backend-build.log; then
        # Check for warnings
        if grep -i "warning" /tmp/backend-build.log > /dev/null; then
            log_error "Backend build has warnings (zero-warning build required)"
            cat /tmp/backend-build.log | grep -i "warning"
            handle_failure "Backend build"
            BACKEND_BUILD_PASSED=false
        else
            local end_time=$(date +%s)
            BACKEND_BUILD_TIME="$((end_time - start_time))s"
            log_info "Backend build PASSED (${BACKEND_BUILD_TIME})"
            BACKEND_BUILD_PASSED=true
        fi
    else
        log_error "Backend build FAILED"
        handle_failure "Backend build"
        BACKEND_BUILD_PASSED=false
    fi

    cd "$PROJECT_ROOT"
}

build_frontend() {
    log_section "BUILDING FRONTEND (React/TypeScript/RSBuild)"

    cd "$PROJECT_ROOT/frontend"
    local start_time=$(date +%s)

    log_info "Running npm run build..."
    if npm run build 2>&1 | tee /tmp/frontend-build.log; then
        # Check for warnings
        if grep -i "warning" /tmp/frontend-build.log > /dev/null; then
            log_error "Frontend build has warnings (zero-warning build required)"
            cat /tmp/frontend-build.log | grep -i "warning"
            handle_failure "Frontend build"
            FRONTEND_BUILD_PASSED=false
        else
            local end_time=$(date +%s)
            FRONTEND_BUILD_TIME="$((end_time - start_time))s"
            log_info "Frontend build PASSED (${FRONTEND_BUILD_TIME})"
            FRONTEND_BUILD_PASSED=true
        fi
    else
        log_error "Frontend build FAILED"
        handle_failure "Frontend build"
        FRONTEND_BUILD_PASSED=false
    fi

    cd "$PROJECT_ROOT"
}

run_backend_tests() {
    log_section "RUNNING BACKEND TESTS (Cargo Test)"

    cd "$PROJECT_ROOT/backend"
    local start_time=$(date +%s)

    log_info "Running cargo test..."
    if cargo test 2>&1 | tee /tmp/backend-test.log; then
        local end_time=$(date +%s)
        BACKEND_TEST_TIME="$((end_time - start_time))s"

        # Extract test counts
        local test_summary=$(grep "test result:" /tmp/backend-test.log | tail -1)
        log_info "Backend tests PASSED (${BACKEND_TEST_TIME})"
        log_info "$test_summary"
        BACKEND_TESTS_PASSED=true
    else
        log_error "Backend tests FAILED"
        handle_failure "Backend tests"
        BACKEND_TESTS_PASSED=false
    fi

    cd "$PROJECT_ROOT"
}

run_frontend_tests() {
    log_section "RUNNING FRONTEND UNIT TESTS (Jest)"

    cd "$PROJECT_ROOT/frontend"
    local start_time=$(date +%s)

    log_info "Running npm test..."
    if npm test -- --watchAll=false 2>&1 | tee /tmp/frontend-test.log; then
        local end_time=$(date +%s)
        FRONTEND_TEST_TIME="$((end_time - start_time))s"

        # Extract test counts
        local test_summary=$(grep "Tests:" /tmp/frontend-test.log | tail -1)
        log_info "Frontend unit tests PASSED (${FRONTEND_TEST_TIME})"
        log_info "$test_summary"
        FRONTEND_TESTS_PASSED=true
    else
        log_error "Frontend unit tests FAILED"
        handle_failure "Frontend unit tests"
        FRONTEND_TESTS_PASSED=false
    fi

    cd "$PROJECT_ROOT"
}

run_e2e_tests() {
    log_section "RUNNING E2E TESTS (Playwright)"

    cd "$PROJECT_ROOT/frontend"
    local start_time=$(date +%s)

    log_info "Running npm run test:e2e..."
    if npm run test:e2e 2>&1 | tee /tmp/e2e-test.log; then
        local end_time=$(date +%s)
        E2E_TEST_TIME="$((end_time - start_time))s"

        # Extract test counts
        local test_summary=$(grep "passed\|failed\|skipped" /tmp/e2e-test.log | tail -1)
        log_info "E2E tests PASSED (${E2E_TEST_TIME})"
        log_info "$test_summary"
        E2E_TESTS_PASSED=true
    else
        log_error "E2E tests FAILED"
        handle_failure "E2E tests"
        E2E_TESTS_PASSED=false
    fi

    cd "$PROJECT_ROOT"
}

generate_report() {
    log_section "COMPREHENSIVE TEST RESULTS"

    local total_passed=0
    local total_failed=0

    echo ""
    echo "Phase                      Status      Time"
    echo "-------------------------------------------"

    # Preflight
    if [ "$PREFLIGHT_PASSED" = true ]; then
        echo -e "Preflight Checks           ${GREEN}PASSED${NC}      -"
        ((total_passed++))
    else
        echo -e "Preflight Checks           ${RED}FAILED${NC}      -"
        ((total_failed++))
    fi

    # Backend Build
    if [ "$BACKEND_BUILD_PASSED" = true ]; then
        echo -e "Backend Build              ${GREEN}PASSED${NC}      $BACKEND_BUILD_TIME"
        ((total_passed++))
    else
        echo -e "Backend Build              ${RED}FAILED${NC}      $BACKEND_BUILD_TIME"
        ((total_failed++))
    fi

    # Frontend Build
    if [ "$FRONTEND_BUILD_PASSED" = true ]; then
        echo -e "Frontend Build             ${GREEN}PASSED${NC}      $FRONTEND_BUILD_TIME"
        ((total_passed++))
    else
        echo -e "Frontend Build             ${RED}FAILED${NC}      $FRONTEND_BUILD_TIME"
        ((total_failed++))
    fi

    # Backend Tests
    if [ "$BACKEND_TESTS_PASSED" = true ]; then
        echo -e "Backend Tests              ${GREEN}PASSED${NC}      $BACKEND_TEST_TIME"
        ((total_passed++))
    else
        echo -e "Backend Tests              ${RED}FAILED${NC}      $BACKEND_TEST_TIME"
        ((total_failed++))
    fi

    # Frontend Tests
    if [ "$FRONTEND_TESTS_PASSED" = true ]; then
        echo -e "Frontend Unit Tests        ${GREEN}PASSED${NC}      $FRONTEND_TEST_TIME"
        ((total_passed++))
    else
        echo -e "Frontend Unit Tests        ${RED}FAILED${NC}      $FRONTEND_TEST_TIME"
        ((total_failed++))
    fi

    # E2E Tests
    if [ "$E2E_TESTS_PASSED" = true ]; then
        echo -e "E2E Tests                  ${GREEN}PASSED${NC}      $E2E_TEST_TIME"
        ((total_passed++))
    else
        echo -e "E2E Tests                  ${RED}FAILED${NC}      $E2E_TEST_TIME"
        ((total_failed++))
    fi

    echo "-------------------------------------------"
    echo -e "Total: ${total_passed} passed, ${total_failed} failed"
    echo ""

    # Overall result
    if [ $total_failed -eq 0 ]; then
        log_info "✅ ALL TESTS PASSED"
        send_notification "Comprehensive Tests PASSED" "All phases completed successfully"
        return 0
    else
        log_error "❌ SOME TESTS FAILED"
        send_notification "Comprehensive Tests FAILED" "$total_failed phase(s) failed"
        return 1
    fi
}

# Main execution
main() {
    local start_time=$(date +%s)

    log_section "COMPREHENSIVE TEST SUITE"
    echo "Start time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
    echo "Fail-fast mode: $FAIL_FAST"
    echo "Skip preflight: $SKIP_PREFLIGHT"

    # Preflight checks
    if [ "$SKIP_PREFLIGHT" = false ]; then
        run_preflight_checks
    else
        log_warning "Skipping preflight checks (not recommended)"
    fi

    # Build phase
    build_backend
    build_frontend

    # Test phase
    run_backend_tests
    run_frontend_tests
    run_e2e_tests

    # Generate report
    local end_time=$(date +%s)
    local total_time=$((end_time - start_time))
    local total_minutes=$((total_time / 60))
    local total_seconds=$((total_time % 60))

    generate_report

    echo ""
    echo "End time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
    echo "Total runtime: ${total_minutes}m ${total_seconds}s"

    # Exit with appropriate code
    if [ $total_failed -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main
main
