#!/bin/bash
set -euo pipefail

# Setup Microsoft Mail State Script
# Purpose: Setup MS Mail test state (clear JobOps-OLD, populate JobOps folder)
# Usage: ./helper-scripts/setup-msmail-state.sh
#
# Requirements:
# - .env.test with valid Microsoft Mail OAuth tokens
# - jq installed (brew install jq)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if .env.test exists
if [ ! -f "$PROJECT_ROOT/.env.test" ]; then
    log_error ".env.test not found"
    log_error "Run: ./helper-scripts/setup-test-oauth.sh"
    exit 1
fi

# Load .env.test
set -a
source "$PROJECT_ROOT/.env.test"
set +a

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed"
    log_error "Install with: brew install jq"
    exit 1
fi

# Refresh tokens if needed
log_info "Ensuring Microsoft Mail OAuth token is valid..."
"$SCRIPT_DIR/refresh-oauth-tokens.sh" > /dev/null 2>&1 || {
    log_error "Failed to refresh OAuth tokens"
    exit 1
}

# Reload .env.test (token may have been refreshed)
set -a
source "$PROJECT_ROOT/.env.test"
set +a

log_info "Setting up Microsoft Mail state..."

# ============================================================================
# Get or create JobOps and JobOps-OLD folders
# ============================================================================

log_info "Checking for mail folders..."

FOLDERS_RESPONSE=$(curl -s -H "Authorization: Bearer $MSMAIL_TEST_ACCESS_TOKEN" \
    "https://graph.microsoft.com/v1.0/me/mailFolders")

# Find JobOps folder ID
JOBOPS_FOLDER_ID=$(echo "$FOLDERS_RESPONSE" | jq -r '.value[] | select(.displayName == "JobOps") | .id // empty')

if [ -z "$JOBOPS_FOLDER_ID" ]; then
    log_warning "JobOps folder not found, creating..."
    CREATE_RESPONSE=$(curl -s -X POST \
        -H "Authorization: Bearer $MSMAIL_TEST_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"displayName": "JobOps"}' \
        "https://graph.microsoft.com/v1.0/me/mailFolders")
    JOBOPS_FOLDER_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id // empty')
    log_info "JobOps folder created"
else
    log_info "JobOps folder found: $JOBOPS_FOLDER_ID"
fi

# Find JobOps-OLD folder ID
JOBOPS_OLD_FOLDER_ID=$(echo "$FOLDERS_RESPONSE" | jq -r '.value[] | select(.displayName == "JobOps-OLD") | .id // empty')

if [ -z "$JOBOPS_OLD_FOLDER_ID" ]; then
    log_warning "JobOps-OLD folder not found, creating..."
    CREATE_RESPONSE=$(curl -s -X POST \
        -H "Authorization: Bearer $MSMAIL_TEST_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"displayName": "JobOps-OLD"}' \
        "https://graph.microsoft.com/v1.0/me/mailFolders")
    JOBOPS_OLD_FOLDER_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id // empty')
    log_info "JobOps-OLD folder created"
else
    log_info "JobOps-OLD folder found: $JOBOPS_OLD_FOLDER_ID"
fi

# ============================================================================
# Clear JobOps-OLD folder (delete all messages)
# ============================================================================

log_info "Clearing JobOps-OLD folder..."

OLD_MESSAGES_RESPONSE=$(curl -s -H "Authorization: Bearer $MSMAIL_TEST_ACCESS_TOKEN" \
    "https://graph.microsoft.com/v1.0/me/mailFolders/$JOBOPS_OLD_FOLDER_ID/messages?\$top=100")

OLD_MESSAGE_COUNT=$(echo "$OLD_MESSAGES_RESPONSE" | jq -r '.value | length')

if [ "$OLD_MESSAGE_COUNT" -eq 0 ]; then
    log_info "JobOps-OLD folder already empty"
else
    log_info "Deleting $OLD_MESSAGE_COUNT message(s) from JobOps-OLD..."
    
    # Delete each message
    echo "$OLD_MESSAGES_RESPONSE" | jq -r '.value[].id' | while read -r MESSAGE_ID; do
        curl -s -X DELETE \
            -H "Authorization: Bearer $MSMAIL_TEST_ACCESS_TOKEN" \
            "https://graph.microsoft.com/v1.0/me/messages/$MESSAGE_ID" > /dev/null
    done
    
    log_info "JobOps-OLD folder cleared"
fi

# ============================================================================
# Clear JobOps folder (for fresh start)
# ============================================================================

log_info "Clearing JobOps folder..."

JOBOPS_MESSAGES_RESPONSE=$(curl -s -H "Authorization: Bearer $MSMAIL_TEST_ACCESS_TOKEN" \
    "https://graph.microsoft.com/v1.0/me/mailFolders/$JOBOPS_FOLDER_ID/messages?\$top=100")

JOBOPS_MESSAGE_COUNT=$(echo "$JOBOPS_MESSAGES_RESPONSE" | jq -r '.value | length')

if [ "$JOBOPS_MESSAGE_COUNT" -eq 0 ]; then
    log_info "JobOps folder already empty"
else
    log_info "Deleting $JOBOPS_MESSAGE_COUNT message(s) from JobOps..."
    
    # Delete each message
    echo "$JOBOPS_MESSAGES_RESPONSE" | jq -r '.value[].id' | while read -r MESSAGE_ID; do
        curl -s -X DELETE \
            -H "Authorization: Bearer $MSMAIL_TEST_ACCESS_TOKEN" \
            "https://graph.microsoft.com/v1.0/me/messages/$MESSAGE_ID" > /dev/null
    done
    
    log_info "JobOps folder cleared"
fi

# ============================================================================
# Populate JobOps folder with test emails (optional)
# ============================================================================

log_warning "JobOps folder population skipped (no test email fixtures available)"
log_warning "Manual testing: Move job opportunity emails to JobOps folder before running E2E tests"

# NOTE: To populate JobOps with test emails, you would need to either:
# 1. Create draft messages using MS Graph API (requires Mail.Send permission)
# 2. Copy existing messages from Inbox to JobOps folder
# 3. Manually move test emails to JobOps folder before running tests
#
# For now, we skip this step and rely on manual population or existing emails.

# ============================================================================
# Summary
# ============================================================================

log_info "Microsoft Mail state configured successfully"
log_info "  ✓ JobOps folder: empty and ready"
log_info "  ✓ JobOps-OLD folder: empty"
log_warning "  ⚠ Manual step: Move test job emails to JobOps folder before testing"

exit 0
