#!/bin/bash
set -euo pipefail

# Setup Test OAuth Script
# Purpose: One-time OAuth authorization for Gmail and Microsoft Mail test automation
# Usage: ./helper-scripts/setup-test-oauth.sh
#
# This script:
# 1. Prompts for OAuth client credentials (or reads from backend/.env)
# 2. Opens browser for user authorization
# 3. Exchanges authorization code for tokens
# 4. Saves tokens to .env.test
# 5. Validates tokens work

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

log_section() {
    echo ""
    echo -e "${BLUE}============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================================${NC}"
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed"
    log_error "Install with: brew install jq"
    exit 1
fi

# Initialize .env.test if it doesn't exist
if [ ! -f "$PROJECT_ROOT/.env.test" ]; then
    log_info "Creating .env.test from template..."
    cp "$PROJECT_ROOT/.env.test.example" "$PROJECT_ROOT/.env.test"
fi

# ============================================================================
# Gmail OAuth Setup
# ============================================================================

log_section "Gmail OAuth Setup"

# Try to read Gmail credentials from backend/.env
GMAIL_CLIENT_ID=""
GMAIL_CLIENT_SECRET=""

if [ -f "$PROJECT_ROOT/backend/.env" ]; then
    GMAIL_CLIENT_ID=$(grep '^GMAIL_CLIENT_ID=' "$PROJECT_ROOT/backend/.env" | cut -d'=' -f2- || echo "")
    GMAIL_CLIENT_SECRET=$(grep '^GMAIL_CLIENT_SECRET=' "$PROJECT_ROOT/backend/.env" | cut -d'=' -f2- || echo "")
fi

# Prompt for credentials if not found
if [ -z "$GMAIL_CLIENT_ID" ]; then
    echo "Enter Gmail OAuth Client ID (from Google Cloud Console):"
    read -r GMAIL_CLIENT_ID
fi

if [ -z "$GMAIL_CLIENT_SECRET" ]; then
    echo "Enter Gmail OAuth Client Secret:"
    read -r GMAIL_CLIENT_SECRET
fi

log_info "Gmail Client ID: ${GMAIL_CLIENT_ID:0:20}..."

# Gmail OAuth scopes
GMAIL_SCOPES="https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify"
GMAIL_SCOPES_ENCODED=$(echo "$GMAIL_SCOPES" | sed 's/ /%20/g')

# Generate Gmail OAuth URL
GMAIL_REDIRECT_URI="http://localhost:8080/oauth/callback"
GMAIL_REDIRECT_URI_ENCODED=$(echo "$GMAIL_REDIRECT_URI" | sed 's/:/%3A/g; s|/|%2F|g')

GMAIL_AUTH_URL="https://accounts.google.com/o/oauth2/v2/auth?client_id=$GMAIL_CLIENT_ID&redirect_uri=$GMAIL_REDIRECT_URI_ENCODED&response_type=code&scope=$GMAIL_SCOPES_ENCODED&access_type=offline&prompt=consent"

echo ""
log_info "Opening Gmail OAuth consent page in browser..."
echo ""
echo -e "${YELLOW}If browser doesn't open automatically, visit this URL:${NC}"
echo "$GMAIL_AUTH_URL"
echo ""

# Open browser (macOS)
open "$GMAIL_AUTH_URL" 2>/dev/null || true

sleep 2

echo "After authorizing, you'll be redirected to: $GMAIL_REDIRECT_URI?code=..."
echo ""
echo "Paste the FULL redirect URL here (or just the 'code' parameter):"
read -r GMAIL_RESPONSE

# Extract authorization code
if echo "$GMAIL_RESPONSE" | grep -q "code="; then
    GMAIL_AUTH_CODE=$(echo "$GMAIL_RESPONSE" | sed -n 's/.*code=\([^&]*\).*/\1/p')
else
    GMAIL_AUTH_CODE="$GMAIL_RESPONSE"
fi

log_info "Gmail authorization code received (${#GMAIL_AUTH_CODE} chars)"

# Exchange code for tokens
log_info "Exchanging authorization code for tokens..."

GMAIL_TOKEN_RESPONSE=$(curl -s -X POST https://oauth2.googleapis.com/token \
    -d "client_id=$GMAIL_CLIENT_ID" \
    -d "client_secret=$GMAIL_CLIENT_SECRET" \
    -d "code=$GMAIL_AUTH_CODE" \
    -d "redirect_uri=$GMAIL_REDIRECT_URI" \
    -d "grant_type=authorization_code")

GMAIL_ACCESS_TOKEN=$(echo "$GMAIL_TOKEN_RESPONSE" | jq -r '.access_token // empty')
GMAIL_REFRESH_TOKEN=$(echo "$GMAIL_TOKEN_RESPONSE" | jq -r '.refresh_token // empty')

if [ -z "$GMAIL_ACCESS_TOKEN" ] || [ -z "$GMAIL_REFRESH_TOKEN" ]; then
    log_error "Failed to get Gmail tokens"
    echo "$GMAIL_TOKEN_RESPONSE" | jq '.' || echo "$GMAIL_TOKEN_RESPONSE"
    exit 1
fi

log_info "Gmail tokens received successfully"

# Validate Gmail token
log_info "Validating Gmail access token..."
GMAIL_VALIDATION=$(curl -s -H "Authorization: Bearer $GMAIL_ACCESS_TOKEN" \
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1")

if echo "$GMAIL_VALIDATION" | jq -e '.messages' > /dev/null 2>&1 || echo "$GMAIL_VALIDATION" | jq -e '.resultSizeEstimate' > /dev/null 2>&1; then
    log_info "Gmail token validated successfully"
else
    log_error "Gmail token validation failed"
    echo "$GMAIL_VALIDATION" | jq '.' || echo "$GMAIL_VALIDATION"
    exit 1
fi

# ============================================================================
# Microsoft Mail OAuth Setup
# ============================================================================

log_section "Microsoft Mail OAuth Setup"

# Try to read Microsoft credentials from backend/.env
MSMAIL_CLIENT_ID=""
MSMAIL_CLIENT_SECRET=""
MSMAIL_TENANT_ID=""

if [ -f "$PROJECT_ROOT/backend/.env" ]; then
    MSMAIL_CLIENT_ID=$(grep '^MICROSOFT_CLIENT_ID=' "$PROJECT_ROOT/backend/.env" | cut -d'=' -f2- || echo "")
    MSMAIL_CLIENT_SECRET=$(grep '^MICROSOFT_CLIENT_SECRET=' "$PROJECT_ROOT/backend/.env" | cut -d'=' -f2- || echo "")
    MSMAIL_TENANT_ID=$(grep '^MICROSOFT_TENANT_ID=' "$PROJECT_ROOT/backend/.env" | cut -d'=' -f2- || echo "")
fi

# Prompt for credentials if not found
if [ -z "$MSMAIL_CLIENT_ID" ]; then
    echo "Enter Microsoft OAuth Client ID (from Azure Portal):"
    read -r MSMAIL_CLIENT_ID
fi

if [ -z "$MSMAIL_CLIENT_SECRET" ]; then
    echo "Enter Microsoft OAuth Client Secret:"
    read -r MSMAIL_CLIENT_SECRET
fi

if [ -z "$MSMAIL_TENANT_ID" ]; then
    echo "Enter Microsoft Tenant ID:"
    read -r MSMAIL_TENANT_ID
fi

log_info "Microsoft Client ID: ${MSMAIL_CLIENT_ID:0:20}..."
log_info "Microsoft Tenant ID: ${MSMAIL_TENANT_ID:0:20}..."

# Microsoft OAuth scopes
MSMAIL_SCOPES="https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite offline_access"
MSMAIL_SCOPES_ENCODED=$(echo "$MSMAIL_SCOPES" | sed 's/ /%20/g')

# Generate Microsoft OAuth URL
MSMAIL_REDIRECT_URI="http://localhost:8080/oauth/callback"
MSMAIL_REDIRECT_URI_ENCODED=$(echo "$MSMAIL_REDIRECT_URI" | sed 's/:/%3A/g; s|/|%2F|g')

MSMAIL_AUTH_URL="https://login.microsoftonline.com/$MSMAIL_TENANT_ID/oauth2/v2.0/authorize?client_id=$MSMAIL_CLIENT_ID&redirect_uri=$MSMAIL_REDIRECT_URI_ENCODED&response_type=code&scope=$MSMAIL_SCOPES_ENCODED&response_mode=query&prompt=consent"

echo ""
log_info "Opening Microsoft OAuth consent page in browser..."
echo ""
echo -e "${YELLOW}If browser doesn't open automatically, visit this URL:${NC}"
echo "$MSMAIL_AUTH_URL"
echo ""

# Open browser (macOS)
open "$MSMAIL_AUTH_URL" 2>/dev/null || true

sleep 2

echo "After authorizing, you'll be redirected to: $MSMAIL_REDIRECT_URI?code=..."
echo ""
echo "Paste the FULL redirect URL here (or just the 'code' parameter):"
read -r MSMAIL_RESPONSE

# Extract authorization code
if echo "$MSMAIL_RESPONSE" | grep -q "code="; then
    MSMAIL_AUTH_CODE=$(echo "$MSMAIL_RESPONSE" | sed -n 's/.*code=\([^&]*\).*/\1/p')
else
    MSMAIL_AUTH_CODE="$MSMAIL_RESPONSE"
fi

log_info "Microsoft authorization code received (${#MSMAIL_AUTH_CODE} chars)"

# Exchange code for tokens
log_info "Exchanging authorization code for tokens..."

MSMAIL_TOKEN_RESPONSE=$(curl -s -X POST \
    "https://login.microsoftonline.com/$MSMAIL_TENANT_ID/oauth2/v2.0/token" \
    -d "client_id=$MSMAIL_CLIENT_ID" \
    -d "client_secret=$MSMAIL_CLIENT_SECRET" \
    -d "code=$MSMAIL_AUTH_CODE" \
    -d "redirect_uri=$MSMAIL_REDIRECT_URI" \
    -d "grant_type=authorization_code" \
    -d "scope=https://graph.microsoft.com/.default")

MSMAIL_ACCESS_TOKEN=$(echo "$MSMAIL_TOKEN_RESPONSE" | jq -r '.access_token // empty')
MSMAIL_REFRESH_TOKEN=$(echo "$MSMAIL_TOKEN_RESPONSE" | jq -r '.refresh_token // empty')

if [ -z "$MSMAIL_ACCESS_TOKEN" ] || [ -z "$MSMAIL_REFRESH_TOKEN" ]; then
    log_error "Failed to get Microsoft Mail tokens"
    echo "$MSMAIL_TOKEN_RESPONSE" | jq '.' || echo "$MSMAIL_TOKEN_RESPONSE"
    exit 1
fi

log_info "Microsoft Mail tokens received successfully"

# Validate Microsoft Mail token
log_info "Validating Microsoft Mail access token..."
MSMAIL_VALIDATION=$(curl -s -H "Authorization: Bearer $MSMAIL_ACCESS_TOKEN" \
    "https://graph.microsoft.com/v1.0/me/messages?top=1")

if echo "$MSMAIL_VALIDATION" | jq -e '.value' > /dev/null 2>&1; then
    log_info "Microsoft Mail token validated successfully"
else
    log_error "Microsoft Mail token validation failed"
    echo "$MSMAIL_VALIDATION" | jq '.' || echo "$MSMAIL_VALIDATION"
    exit 1
fi

# ============================================================================
# Save tokens to .env.test
# ============================================================================

log_section "Saving OAuth Tokens"

cat > "$PROJECT_ROOT/.env.test" << ENVEOF
# JobHunter Test Environment OAuth Configuration
# Auto-generated by setup-test-oauth.sh on $(date '+%Y-%m-%d %H:%M:%S %Z')
#
# IMPORTANT: This file contains sensitive OAuth tokens
# - NEVER commit this file to git (.gitignore excludes it)
# - Tokens enable automated comprehensive testing
# - Refresh tokens auto-refresh access tokens during preflight

# ============================================================================
# Gmail OAuth Configuration
# ============================================================================

GMAIL_TEST_ACCESS_TOKEN=$GMAIL_ACCESS_TOKEN
GMAIL_TEST_REFRESH_TOKEN=$GMAIL_REFRESH_TOKEN
GMAIL_TEST_CLIENT_ID=$GMAIL_CLIENT_ID
GMAIL_TEST_CLIENT_SECRET=$GMAIL_CLIENT_SECRET

# ============================================================================
# Microsoft Mail OAuth Configuration
# ============================================================================

MSMAIL_TEST_ACCESS_TOKEN=$MSMAIL_ACCESS_TOKEN
MSMAIL_TEST_REFRESH_TOKEN=$MSMAIL_REFRESH_TOKEN
MSMAIL_TEST_CLIENT_ID=$MSMAIL_CLIENT_ID
MSMAIL_TEST_CLIENT_SECRET=$MSMAIL_CLIENT_SECRET
MSMAIL_TEST_TENANT_ID=$MSMAIL_TENANT_ID

# ============================================================================
# Token Maintenance Schedule (Auto-generated)
# ============================================================================
#
# Gmail:
#   - Access token: Expires in 1 hour (auto-refreshed by preflight)
#   - Refresh token: Valid indefinitely (unless unused for 6+ months)
#   - Next manual re-authorization: Not required (unless token revoked)
#
# Microsoft Mail:
#   - Access token: Expires in 1 hour (auto-refreshed by preflight)
#   - Refresh token: Valid for 90 days from $(date '+%Y-%m-%d')
#   - Next manual re-authorization: Approximately $(date -v+90d '+%Y-%m-%d' 2>/dev/null || date -d '+90 days' '+%Y-%m-%d')
#
# ============================================================================
ENVEOF

log_info ".env.test saved successfully"

# ============================================================================
# Summary
# ============================================================================

log_section "OAuth Setup Complete"

echo ""
log_info "Gmail OAuth:"
log_info "  ✓ Access token valid"
log_info "  ✓ Refresh token saved (never expires)"
log_info "  ✓ Scopes: gmail.readonly, gmail.modify"
echo ""
log_info "Microsoft Mail OAuth:"
log_info "  ✓ Access token valid"
log_info "  ✓ Refresh token saved (90 days)"
log_info "  ✓ Scopes: Mail.Read, Mail.ReadWrite"
echo ""
log_info "Tokens saved to: .env.test"
echo ""
log_warning "Maintenance Schedule:"
log_warning "  Gmail: Re-authorize only if unused for 6+ months or revoked"
log_warning "  Microsoft Mail: Re-run this script in ~90 days (quarterly)"
echo ""
log_info "Next steps:"
log_info "  1. Run: ./helper-scripts/clear-database.sh"
log_info "  2. Run: ./helper-scripts/seed-database.sh"
log_info "  3. Run: ./helper-scripts/run-comprehensive-tests.sh"
echo ""

exit 0
