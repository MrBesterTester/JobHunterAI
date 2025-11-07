#!/bin/bash
set -euo pipefail

# Clear Gmail State Script
# Purpose: Clear Gmail test state (remove labels, mark emails as read)
# Usage: ./helper-scripts/clear-gmail-state.sh
#
# Requirements:
# - .env.test with valid Gmail OAuth tokens
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
log_info "Ensuring Gmail OAuth token is valid..."
"$SCRIPT_DIR/refresh-oauth-tokens.sh" > /dev/null 2>&1 || {
    log_error "Failed to refresh OAuth tokens"
    exit 1
}

# Reload .env.test (token may have been refreshed)
set -a
source "$PROJECT_ROOT/.env.test"
set +a

log_info "Clearing Gmail state..."

# ============================================================================
# List and delete JobOps and JobOps-OLD labels
# ============================================================================

log_info "Checking for JobOps labels..."

LABELS_RESPONSE=$(curl -s -H "Authorization: Bearer $GMAIL_TEST_ACCESS_TOKEN" \
    "https://gmail.googleapis.com/gmail/v1/users/me/labels")

# Find JobOps label ID
JOBOPS_LABEL_ID=$(echo "$LABELS_RESPONSE" | jq -r '.labels[] | select(.name == "JobOps") | .id // empty')

if [ -n "$JOBOPS_LABEL_ID" ]; then
    log_info "Deleting JobOps label..."
    curl -s -X DELETE \
        -H "Authorization: Bearer $GMAIL_TEST_ACCESS_TOKEN" \
        "https://gmail.googleapis.com/gmail/v1/users/me/labels/$JOBOPS_LABEL_ID" > /dev/null
    log_info "JobOps label deleted"
else
    log_info "JobOps label not found (already clean)"
fi

# Find JobOps-OLD label ID
JOBOPS_OLD_LABEL_ID=$(echo "$LABELS_RESPONSE" | jq -r '.labels[] | select(.name == "JobOps-OLD") | .id // empty')

if [ -n "$JOBOPS_OLD_LABEL_ID" ]; then
    log_info "Deleting JobOps-OLD label..."
    curl -s -X DELETE \
        -H "Authorization: Bearer $GMAIL_TEST_ACCESS_TOKEN" \
        "https://gmail.googleapis.com/gmail/v1/users/me/labels/$JOBOPS_OLD_LABEL_ID" > /dev/null
    log_info "JobOps-OLD label deleted"
else
    log_info "JobOps-OLD label not found (already clean)"
fi

# ============================================================================
# Mark all unread emails as read
# ============================================================================

log_info "Checking for unread emails..."

UNREAD_RESPONSE=$(curl -s -H "Authorization: Bearer $GMAIL_TEST_ACCESS_TOKEN" \
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=UNREAD&maxResults=100")

UNREAD_COUNT=$(echo "$UNREAD_RESPONSE" | jq -r '.resultSizeEstimate // 0')

if [ "$UNREAD_COUNT" -eq 0 ]; then
    log_info "No unread emails found (already clean)"
else
    log_info "Found $UNREAD_COUNT unread email(s), marking as read..."
    
    # Get message IDs
    MESSAGE_IDS=$(echo "$UNREAD_RESPONSE" | jq -r '.messages[]?.id // empty')
    
    if [ -n "$MESSAGE_IDS" ]; then
        # Mark each message as read (batch modify)
        MESSAGE_IDS_JSON=$(echo "$MESSAGE_IDS" | jq -R . | jq -s .)
        
        curl -s -X POST \
            -H "Authorization: Bearer $GMAIL_TEST_ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"ids\": $MESSAGE_IDS_JSON, \"removeLabelIds\": [\"UNREAD\"]}" \
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify" > /dev/null
        
        log_info "Marked $UNREAD_COUNT email(s) as read"
    fi
fi

# ============================================================================
# Summary
# ============================================================================

log_info "Gmail state cleared successfully"
log_info "  ✓ JobOps labels removed"
log_info "  ✓ All emails marked as read"

exit 0
