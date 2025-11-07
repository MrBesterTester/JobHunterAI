#!/bin/bash
set -euo pipefail

# Refresh OAuth Tokens Script
# Purpose: Auto-refresh Gmail and Microsoft Mail OAuth tokens if expired
# Usage: ./helper-scripts/refresh-oauth-tokens.sh
#
# Returns: 0 if tokens are valid or successfully refreshed, 1 on error

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
    log_error "Run: ./helper-scripts/setup-test-oauth.sh to create it"
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

TOKENS_REFRESHED=false

# ============================================================================
# Gmail Token Refresh
# ============================================================================

log_info "Checking Gmail OAuth tokens..."

# Test if Gmail access token is valid
GMAIL_TOKEN_VALID=false
if [ -n "${GMAIL_TEST_ACCESS_TOKEN:-}" ]; then
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $GMAIL_TEST_ACCESS_TOKEN" \
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1" || echo "000")
    
    if [ "$RESPONSE" = "200" ]; then
        GMAIL_TOKEN_VALID=true
        log_info "Gmail access token is valid"
    fi
fi

# Refresh Gmail token if invalid
if [ "$GMAIL_TOKEN_VALID" = false ]; then
    log_info "Refreshing Gmail access token..."
    
    if [ -z "${GMAIL_TEST_REFRESH_TOKEN:-}" ]; then
        log_error "Gmail refresh token not found in .env.test"
        log_error "Run: ./helper-scripts/setup-test-oauth.sh"
        exit 1
    fi
    
    REFRESH_RESPONSE=$(curl -s -X POST https://oauth2.googleapis.com/token \
        -d "client_id=$GMAIL_TEST_CLIENT_ID" \
        -d "client_secret=$GMAIL_TEST_CLIENT_SECRET" \
        -d "refresh_token=$GMAIL_TEST_REFRESH_TOKEN" \
        -d "grant_type=refresh_token")
    
    NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.access_token // empty')
    
    if [ -z "$NEW_ACCESS_TOKEN" ]; then
        log_error "Failed to refresh Gmail access token"
        echo "$REFRESH_RESPONSE" | jq '.' || echo "$REFRESH_RESPONSE"
        exit 1
    fi
    
    # Update .env.test with new access token
    sed -i.bak "s#^GMAIL_TEST_ACCESS_TOKEN=.*#GMAIL_TEST_ACCESS_TOKEN=$NEW_ACCESS_TOKEN#" "$PROJECT_ROOT/.env.test"
    rm "$PROJECT_ROOT/.env.test.bak"
    
    TOKENS_REFRESHED=true
    log_info "Gmail access token refreshed successfully"
fi

# ============================================================================
# Microsoft Mail Token Refresh
# ============================================================================

log_info "Checking Microsoft Mail OAuth tokens..."

# Test if MS Mail access token is valid
MSMAIL_TOKEN_VALID=false
if [ -n "${MSMAIL_TEST_ACCESS_TOKEN:-}" ]; then
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $MSMAIL_TEST_ACCESS_TOKEN" \
        "https://graph.microsoft.com/v1.0/me/messages?top=1" || echo "000")
    
    if [ "$RESPONSE" = "200" ]; then
        MSMAIL_TOKEN_VALID=true
        log_info "Microsoft Mail access token is valid"
    fi
fi

# Refresh MS Mail token if invalid
if [ "$MSMAIL_TOKEN_VALID" = false ]; then
    log_info "Refreshing Microsoft Mail access token..."
    
    if [ -z "${MSMAIL_TEST_REFRESH_TOKEN:-}" ]; then
        log_error "Microsoft Mail refresh token not found in .env.test"
        log_error "Run: ./helper-scripts/setup-test-oauth.sh"
        exit 1
    fi
    
    if [ -z "${MSMAIL_TEST_TENANT_ID:-}" ]; then
        log_error "Microsoft Mail tenant ID not found in .env.test"
        exit 1
    fi
    
    REFRESH_RESPONSE=$(curl -s -X POST \
        "https://login.microsoftonline.com/$MSMAIL_TEST_TENANT_ID/oauth2/v2.0/token" \
        -d "client_id=$MSMAIL_TEST_CLIENT_ID" \
        -d "client_secret=$MSMAIL_TEST_CLIENT_SECRET" \
        -d "refresh_token=$MSMAIL_TEST_REFRESH_TOKEN" \
        -d "grant_type=refresh_token" \
        -d "scope=https://graph.microsoft.com/.default")
    
    NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.access_token // empty')
    
    if [ -z "$NEW_ACCESS_TOKEN" ]; then
        log_error "Failed to refresh Microsoft Mail access token"
        echo "$REFRESH_RESPONSE" | jq '.' || echo "$REFRESH_RESPONSE"
        
        # Check if refresh token expired
        ERROR_DESC=$(echo "$REFRESH_RESPONSE" | jq -r '.error_description // empty')
        if echo "$ERROR_DESC" | grep -q "expired"; then
            log_error "Refresh token has expired (90 days)"
            log_error "Re-run: ./helper-scripts/setup-test-oauth.sh"
        fi
        
        exit 1
    fi
    
    # Update .env.test with new access token
    sed -i.bak "s#^MSMAIL_TEST_ACCESS_TOKEN=.*#MSMAIL_TEST_ACCESS_TOKEN=$NEW_ACCESS_TOKEN#" "$PROJECT_ROOT/.env.test"
    rm "$PROJECT_ROOT/.env.test.bak"
    
    TOKENS_REFRESHED=true
    log_info "Microsoft Mail access token refreshed successfully"
fi

# ============================================================================
# Summary
# ============================================================================

if [ "$TOKENS_REFRESHED" = true ]; then
    log_info "OAuth tokens refreshed and saved to .env.test"
else
    log_info "All OAuth tokens are valid (no refresh needed)"
fi

exit 0
