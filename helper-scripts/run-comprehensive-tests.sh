#!/bin/bash
set -euo pipefail

# Comprehensive Test Suite Runner
# Purpose: Local, on-demand comprehensive validation (informal CI/CD)
# - Clean rebuild backend and frontend (zero warnings - ALWAYS ENFORCED)
# - Run all test suites (backend, frontend unit, E2E)
# - Report comprehensive results
#
# QUALITY GATE: Build/compilation warnings or errors ALWAYS stop execution
# This ensures clean builds before running tests (not affected by --fail-fast)

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
SKIP_E2E=false
NO_NOTIFY=false

# Results tracking
PREFLIGHT_PASSED=true
BACKEND_BUILD_PASSED=false
FRONTEND_BUILD_PASSED=false
E2E_TYPECHECK_PASSED=false
BACKEND_TESTS_PASSED=false
FRONTEND_TESTS_PASSED=false
E2E_TESTS_PASSED=false

BACKEND_BUILD_TIME=""
FRONTEND_BUILD_TIME=""
E2E_TYPECHECK_TIME=""
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

QUALITY GATE (ALWAYS ENFORCED):
  Build warnings or compilation errors ALWAYS stop execution.
  This ensures clean builds before running tests.

OPTIONS:
    -f, --fail-fast       Stop on first TEST failure (build failures always stop)
    --skip-preflight      Skip preflight checks (not recommended)
    --skip-e2e            Skip E2E tests (run only backend/frontend unit tests)
    --no-notify           Suppress subordinate notifications (final result only)
    -h, --help            Show this help message

EXAMPLES:
    $(basename "$0")                  # Run all tests, report at end
    $(basename "$0") --fail-fast      # Stop at first test failure
    $(basename "$0") --skip-preflight # Skip preflight (use with caution)
    $(basename "$0") --skip-e2e       # Run fast tests only (~4 min, no E2E)

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
        --skip-e2e)
            SKIP_E2E=true
            shift
            ;;
        --no-notify)
            NO_NOTIFY=true
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
    local is_build_failure="${2:-false}"  # Second param indicates if this is a build/compilation failure

    log_error "$phase FAILED"

    # Build/compilation failures ALWAYS stop (quality gate)
    if [ "$is_build_failure" = true ]; then
        log_error "Build/compilation failures are not allowed. Aborting."
        log_error "Fix all warnings and errors before running tests."
        send_notification "Comprehensive Tests FAILED" "$phase failed - fix build issues"
        exit 1
    fi

    # Test failures respect fail-fast flag
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
    local always_notify="${3:-false}"  # Third param for OAuth/critical notifications

    # Skip notification if suppressed (unless it's a critical notification like OAuth)
    if [ "$NO_NOTIFY" = true ] && [ "$always_notify" != true ]; then
        return 0
    fi

    # Play sound (try both foreground and background modes)
    afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true

    # Show dialog - use nohup and output redirection to work from background processes
    # This ensures the notification appears even when running from Claude Code bash tool
    nohup osascript -e "display dialog \"$message\" with title \"$title\" buttons {\"OK\"} default button \"OK\" with icon note" >/dev/null 2>&1 &

    # Also log notification to stdout so user can see it in bash output
    echo "🔔 NOTIFICATION: $title - $message"
}

check_database_selection() {
    log_section "PREFLIGHT: Database Selection"

    # Check which database is configured
    # Extract just the database name from DATABASE_URL (after last slash, before query params)
    local db_name=$(grep '^DATABASE_URL=' backend/.env 2>/dev/null | sed -n 's#.*/\([^?]*\).*#\1#p' || echo "unknown")

    if [[ "$db_name" == "jobhunter_personal" ]]; then
        log_info "Database: jobhunter_personal (correct)"
        return 0
    else
        log_error "Database: $db_name (expected: jobhunter_personal)"
        log_error "Run: ./helper-scripts/switch-to-personal.sh"
        return 1
    fi
}

check_oauth_expiry() {
    log_section "PREFLIGHT: OAuth Token Expiry"

    # Query database for OAuth token expiry times
    # This is a fast check (~10ms) that prevents wasting time on tests
    # when OAuth tokens are expired and E2E tests will fail anyway
    local expired_count=$(psql -U jobhunter_user -d jobhunter_personal -tAc "
        SELECT COUNT(*) FROM oauth_credentials
        WHERE token_expires_at < NOW();
    " 2>/dev/null)

    # Check if query succeeded
    if [ $? -ne 0 ]; then
        log_warning "Could not check OAuth token expiry (database issue)"
        return 0  # Don't block tests for database query issues
    fi

    if [ "$expired_count" -gt 0 ]; then
        log_warning "Found $expired_count expired OAuth token(s)"
        log_info "Starting OAuth token refresh process..."

        # Start backend server for OAuth callbacks
        log_info "Starting backend server for OAuth validation..."
        cd "$PROJECT_ROOT/backend"
        cargo run > /tmp/oauth-backend.log 2>&1 &
        local BACKEND_PID=$!
        echo $BACKEND_PID > /tmp/preflight-backend.pid
        cd "$PROJECT_ROOT"

        # Wait for backend to start
        log_info "Waiting for backend to be ready..."
        local retries=0
        while ! curl -s http://localhost:8080/health > /dev/null 2>&1; do
            sleep 1
            ((retries++))
            if [ $retries -gt 30 ]; then
                log_error "Backend failed to start within 30 seconds"
                kill $BACKEND_PID 2>/dev/null || true
                rm -f /tmp/preflight-backend.pid
                return 1
            fi
        done
        log_info "Backend ready"

        # Send notification
        send_notification "OAuth Required" "Please complete Gmail and Microsoft OAuth in your browser" true

        # Step 1: Gmail OAuth
        log_info "Opening Gmail OAuth page in browser..."
        open "$PROJECT_ROOT/gmail-oauth.html"
        echo ""
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}Gmail OAuth browser window should now be open.${NC}"
        echo -e "${YELLOW}Complete the OAuth flow, then press ENTER to continue...${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        read -r
        log_info "Gmail OAuth completed"

        # Step 2: Microsoft OAuth
        log_info "Opening Microsoft OAuth page in browser..."
        open "$PROJECT_ROOT/microsoft-oauth.html"
        echo ""
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}Microsoft OAuth browser window should now be open.${NC}"
        echo -e "${YELLOW}Complete the OAuth flow, then press ENTER to continue...${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        read -r
        log_info "Microsoft OAuth completed"

        # Verify tokens are now valid
        log_info "Verifying OAuth tokens..."
        local new_expired_count=$(psql -U jobhunter_user -d jobhunter_personal -tAc "
            SELECT COUNT(*) FROM oauth_credentials
            WHERE token_expires_at < NOW();
        " 2>/dev/null)

        if [ "$new_expired_count" -gt 0 ]; then
            log_error "OAuth tokens still expired after refresh"
            log_error "Please check that both OAuth flows completed successfully"
            kill $BACKEND_PID 2>/dev/null || true
            rm -f /tmp/preflight-backend.pid
            return 1
        fi

        log_info "OAuth tokens refreshed successfully"
        log_info "Backend server will remain running for E2E tests"
        # Keep backend running - it will be reused by E2E phase
        return 0
    fi

    log_info "OAuth tokens valid (not expired)"
    return 0
}

check_database_state() {
    log_section "PREFLIGHT: Database State"

    # Backup infrastructure (per README_auto-test-plan.md requirements)
    local BACKUP_DIR="/tmp/jobhunter_backups"
    local TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    local BACKUP_FILE="$BACKUP_DIR/jobhunter_personal_${TIMESTAMP}.sql"
    local LAST_BACKUP_FILE="/tmp/jobhunter_last_backup.txt"

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    # Create automatic backup before clearing database
    # CRITICAL REQUIREMENT: Backup MUST succeed before truncate (per plan)
    log_info "Creating automatic database backup..."
    log_info "Backup location: $BACKUP_FILE"

    if pg_dump -U jobhunter_user -d jobhunter_personal > "$BACKUP_FILE" 2>&1; then
        # Store backup path for potential restore
        echo "$BACKUP_FILE" > "$LAST_BACKUP_FILE"

        local BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
        log_info "Backup created successfully ($BACKUP_SIZE)"
        log_info "To restore: ./helper-scripts/restore-from-backup.sh"

        # Clean up old backups (keep last 5)
        local BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sql 2>/dev/null | wc -l | xargs)
        if [ "$BACKUP_COUNT" -gt 5 ]; then
            log_info "Cleaning up old backups (keeping last 5)..."
            ls -t "$BACKUP_DIR"/*.sql | tail -n +6 | xargs rm -f
        fi
    else
        log_error "Backup failed! Aborting database clear."
        log_error "Your data is safe (nothing was deleted)"
        return 1
    fi

    # Clear database (safe now that backup exists)
    log_info "Clearing database..."
    if ! "$SCRIPT_DIR/clear-database.sh"; then
        log_error "Failed to clear database"
        log_error "Backup available: $BACKUP_FILE"
        return 1
    fi

    # Seed database with test fixtures
    log_info "Seeding database with test fixtures..."
    if ! "$SCRIPT_DIR/seed-database.sh"; then
        log_error "Failed to seed database"
        log_error "To restore backup: ./helper-scripts/restore-from-backup.sh"
        return 1
    fi

    log_info "Database state: backed up, cleared, and seeded"
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

    # NOTE (ISSUE-034): MS Mail seeding moved to E2E test setup phase
    # Preflight now only validates OAuth tokens (done in check above)
    # Test setup will seed MS Mail data after backend starts

    log_info "MS Mail OAuth validated (seeding handled by E2E setup)"
    return 0
}

validate_oauth_with_html() {
    log_section "OAUTH VALIDATION (HTML-based)"

    # Backend must be running for OAuth callbacks
    log_info "Starting backend server for OAuth validation..."
    cd "$PROJECT_ROOT/backend"
    cargo run > /tmp/oauth-backend.log 2>&1 &
    local BACKEND_PID=$!
    cd "$PROJECT_ROOT"

    # Wait for backend to start
    log_info "Waiting for backend to be ready..."
    local retries=0
    while ! curl -s http://localhost:8080/health > /dev/null 2>&1; do
        sleep 1
        ((retries++))
        if [ $retries -gt 30 ]; then
            log_error "Backend failed to start within 30 seconds"
            kill $BACKEND_PID 2>/dev/null || true
            return 1
        fi
    done
    log_info "Backend ready"

    # Check if OAuth tokens need refresh
    local needs_oauth=false
    if ! "$SCRIPT_DIR/refresh-oauth-tokens.sh" > /dev/null 2>&1; then
        needs_oauth=true
        log_warning "OAuth tokens invalid or missing"

        # Always notify for OAuth (requires user action)
        send_notification "OAuth Required" "Please complete Gmail and Microsoft OAuth in your browser" true

        # Step 1: Gmail OAuth
        log_info "Opening Gmail OAuth page in browser..."
        open "$PROJECT_ROOT/gmail-oauth.html"
        echo ""
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}Gmail OAuth browser window should now be open.${NC}"
        echo -e "${YELLOW}Complete the OAuth flow, then press ENTER to continue...${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        read -r
        log_info "Gmail OAuth completed"

        # Step 2: Microsoft OAuth
        log_info "Opening Microsoft OAuth page in browser..."
        open "$PROJECT_ROOT/microsoft-oauth.html"
        echo ""
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}Microsoft OAuth browser window should now be open.${NC}"
        echo -e "${YELLOW}Complete the OAuth flow, then press ENTER to continue...${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        read -r
        log_info "Microsoft OAuth completed"

        # Verify tokens are now valid
        log_info "Verifying OAuth tokens..."
        if ! "$SCRIPT_DIR/refresh-oauth-tokens.sh" > /dev/null 2>&1; then
            log_error "OAuth tokens still invalid after completion"
            log_error "Please check that both OAuth flows completed successfully"
            kill $BACKEND_PID 2>/dev/null || true
            return 1
        fi
        log_info "OAuth tokens validated successfully!"
    else
        log_info "OAuth tokens are valid"
    fi

    # Clear Gmail state (now that OAuth tokens are valid)
    log_info "Clearing Gmail state..."
    if ! "$SCRIPT_DIR/clear-gmail-state.sh"; then
        log_error "Failed to clear Gmail state"
        kill $BACKEND_PID 2>/dev/null || true
        return 1
    fi

    # Setup MS Mail state (now that OAuth tokens are valid)
    log_info "Setting up MS Mail state..."
    if ! "$SCRIPT_DIR/setup-msmail-state.sh"; then
        log_error "Failed to setup MS Mail state"
        kill $BACKEND_PID 2>/dev/null || true
        return 1
    fi

    # Keep backend running for E2E tests (don't kill it)
    log_info "Backend server will remain running for E2E tests"

    # Store PID for later cleanup if needed
    echo $BACKEND_PID > /tmp/test-backend.pid

    return 0
}

check_process_cleanup() {
    log_section "PREFLIGHT: Process Cleanup"

    # Stop all application servers and clean up orphaned processes
    log_info "Stopping application servers and cleaning up..."
    if ! "$SCRIPT_DIR/stop.sh"; then
        log_error "Failed to stop processes or ports are occupied"
        log_error "Check manually: ps aux | grep -E '(cargo|rsbuild|playwright)'"
        log_error "Check ports: lsof -ti:8080 or lsof -ti:3000"
        return 1
    fi

    log_info "All processes stopped, ports available"
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

    # Process cleanup (HARD requirement - abort if fails)
    if ! check_process_cleanup; then
        all_passed=false
    fi

    # Git status (HARD requirement - abort if fails)
    if ! check_git_status; then
        all_passed=false
    fi

    # Database selection (HARD requirement - abort if fails)
    if ! check_database_selection; then
        all_passed=false
    fi

    # OAuth expiry check (HARD requirement - abort if expired)
    # Fast SQL query (~10ms) to detect expired tokens before wasting time on tests
    if ! check_oauth_expiry; then
        all_passed=false
    fi

    # Database state (HARD requirement - abort if fails)
    if ! check_database_state; then
        all_passed=false
    fi

    # Gmail/MS Mail state checks moved to E2E phase (require OAuth tokens)
    # These will be validated after HTML-based OAuth validation completes

    if [ "$all_passed" = false ]; then
        log_error "Preflight checks FAILED"
        # No notification for preflight failures - just log and exit
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
            handle_failure "Backend build" true
            BACKEND_BUILD_PASSED=false
        else
            local end_time=$(date +%s)
            BACKEND_BUILD_TIME="$((end_time - start_time))s"
            log_info "Backend build PASSED (${BACKEND_BUILD_TIME})"
            BACKEND_BUILD_PASSED=true
        fi
    else
        log_error "Backend build FAILED"
        handle_failure "Backend build" true
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
            handle_failure "Frontend build" true
            FRONTEND_BUILD_PASSED=false
        else
            local end_time=$(date +%s)
            FRONTEND_BUILD_TIME="$((end_time - start_time))s"
            log_info "Frontend build PASSED (${FRONTEND_BUILD_TIME})"
            FRONTEND_BUILD_PASSED=true
        fi
    else
        log_error "Frontend build FAILED"
        handle_failure "Frontend build" true
        FRONTEND_BUILD_PASSED=false
    fi

    cd "$PROJECT_ROOT"
}

typecheck_e2e() {
    log_section "TYPE-CHECKING E2E TESTS (TypeScript)"

    cd "$PROJECT_ROOT/frontend"
    local start_time=$(date +%s)

    log_info "Running npm run typecheck:e2e..."
    if npm run typecheck:e2e 2>&1 | tee /tmp/e2e-typecheck.log; then
        local end_time=$(date +%s)
        E2E_TYPECHECK_TIME="$((end_time - start_time))s"
        log_info "E2E type-checking PASSED (${E2E_TYPECHECK_TIME})"
        E2E_TYPECHECK_PASSED=true
    else
        log_error "E2E test code has TypeScript errors (zero-error build required)"
        log_error "Fix all type errors before running tests"
        cat /tmp/e2e-typecheck.log | grep -E "error TS[0-9]+" | head -20
        log_error "See /tmp/e2e-typecheck.log for full details"
        handle_failure "E2E type-checking" true
        E2E_TYPECHECK_PASSED=false
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
        # Check if it's a compilation error (not a test failure)
        if grep -i "error\[E[0-9]\+\]" /tmp/backend-test.log > /dev/null || \
           grep -i "error: could not compile" /tmp/backend-test.log > /dev/null || \
           grep -i "error returned from database" /tmp/backend-test.log > /dev/null; then
            log_error "Backend test compilation FAILED"
            log_error "Test code has compilation errors - fix before running tests"
            cat /tmp/backend-test.log | grep -A 2 "error:"
            handle_failure "Backend test compilation" true
        else
            log_error "Backend tests FAILED"
            handle_failure "Backend tests" false
        fi
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

    local start_time=$(date +%s)

    # Pass --no-notify flag to subordinate script if set
    local notify_flag=""
    if [ "$NO_NOTIFY" = true ]; then
        notify_flag="--no-notify"
    fi

    log_info "Running E2E test script..."
    if "$SCRIPT_DIR/run-e2e-tests.sh" $notify_flag; then
        local end_time=$(date +%s)
        E2E_TEST_TIME="$((end_time - start_time))s"
        log_info "E2E tests PASSED (${E2E_TEST_TIME})"
        E2E_TESTS_PASSED=true
    else
        log_error "E2E tests FAILED"
        handle_failure "E2E tests"
        E2E_TESTS_PASSED=false
    fi
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

    # E2E Typecheck
    if [ "$E2E_TYPECHECK_PASSED" = true ]; then
        echo -e "E2E Type-checking          ${GREEN}PASSED${NC}      $E2E_TYPECHECK_TIME"
        ((total_passed++))
    else
        echo -e "E2E Type-checking          ${RED}FAILED${NC}      $E2E_TYPECHECK_TIME"
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
    if [ "$SKIP_E2E" = true ]; then
        echo -e "E2E Tests                  ${YELLOW}SKIPPED${NC}     -"
    elif [ "$E2E_TESTS_PASSED" = true ]; then
        echo -e "E2E Tests                  ${GREEN}PASSED${NC}      $E2E_TEST_TIME"
        ((total_passed++))
    else
        echo -e "E2E Tests                  ${RED}FAILED${NC}      $E2E_TEST_TIME"
        ((total_failed++))
    fi

    echo "-------------------------------------------"
    echo -e "Total: ${total_passed} passed, ${total_failed} failed"
    echo ""

    # E2E reminder if skipped
    if [ "$SKIP_E2E" = true ]; then
        log_warning "E2E tests were skipped. Run without --skip-e2e to execute them (~23 min)"
    fi

    # Overall result
    if [ $total_failed -eq 0 ]; then
        if [ "$SKIP_E2E" = true ]; then
            log_info "✅ FAST TESTS PASSED (E2E skipped)"
            send_notification "Fast Tests PASSED" "Backend and frontend tests completed successfully" true
        else
            log_info "✅ ALL TESTS PASSED"
            send_notification "Comprehensive Tests PASSED" "All phases completed successfully" true
        fi
        return 0
    else
        log_error "❌ SOME TESTS FAILED"
        send_notification "Comprehensive Tests FAILED" "$total_failed phase(s) failed" true
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
    echo "Skip E2E tests: $SKIP_E2E"
    echo "No notify: $NO_NOTIFY"

    # Preflight checks (includes OAuth expiry check with auto-refresh if needed)
    if [ "$SKIP_PREFLIGHT" = false ]; then
        run_preflight_checks
    else
        log_warning "Skipping preflight checks (not recommended)"
    fi

    # Build phase (Quality Gate - must pass before tests)
    build_backend
    build_frontend
    typecheck_e2e

    # Unit test phase (no servers needed)
    run_backend_tests
    run_frontend_tests

    # E2E phase (requires servers and OAuth)
    if [ "$SKIP_E2E" = false ]; then
        # Check if backend is already running from preflight OAuth refresh
        if [ -f /tmp/preflight-backend.pid ] && kill -0 $(cat /tmp/preflight-backend.pid) 2>/dev/null; then
            log_info "Backend already running from preflight OAuth refresh (reusing)"
            BACKEND_PID=$(cat /tmp/preflight-backend.pid)
        else
            # Start backend server and validate OAuth
            if ! validate_oauth_with_html; then
                log_error "OAuth validation failed"
                send_notification "OAuth Validation Failed" "Cannot proceed with E2E tests"
                E2E_TESTS_PASSED=false
            fi
        fi

        # Only proceed if OAuth validation succeeded (or backend already running)
        if [ "$E2E_TESTS_PASSED" != false ]; then
            # Start frontend server
            log_info "Starting frontend server..."
            cd "$PROJECT_ROOT/frontend"
            npm start > /tmp/frontend-server.log 2>&1 &
            local FRONTEND_PID=$!
            echo $FRONTEND_PID > /tmp/test-frontend.pid
            cd "$PROJECT_ROOT"

            # Wait for frontend to be ready
            log_info "Waiting for frontend to be ready..."
            local retries=0
            while ! curl -s http://localhost:3000 > /dev/null 2>&1; do
                sleep 1
                ((retries++))
                if [ $retries -gt 30 ]; then
                    log_error "Frontend failed to start within 30 seconds"
                    E2E_TESTS_PASSED=false
                    break
                fi
            done

            if [ $retries -lt 30 ]; then
                log_info "Frontend ready"

                # Run E2E tests
                run_e2e_tests
            fi

            # Cleanup servers after E2E tests
            log_info "Stopping test servers..."
            if [ -f /tmp/test-frontend.pid ]; then
                kill $(cat /tmp/test-frontend.pid) 2>/dev/null || true
                rm /tmp/test-frontend.pid
            fi
            if [ -f /tmp/test-backend.pid ]; then
                kill $(cat /tmp/test-backend.pid) 2>/dev/null || true
                rm /tmp/test-backend.pid
            fi
            if [ -f /tmp/preflight-backend.pid ]; then
                kill $(cat /tmp/preflight-backend.pid) 2>/dev/null || true
                rm /tmp/preflight-backend.pid
            fi
        fi
    else
        log_warning "Skipping E2E tests (--skip-e2e flag set)"
        E2E_TESTS_PASSED=false  # Mark as not run
    fi

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
