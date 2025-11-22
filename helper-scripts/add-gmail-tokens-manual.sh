#!/bin/bash
set -euo pipefail

# Add Gmail Tokens Manual Script
# Purpose: Exchange Gmail OAuth authorization code for tokens and save to .env.test
# Usage: ./helper-scripts/add-gmail-tokens-manual.sh <authorization_code_or_url>
#
# This script is useful when:
# - Gmail tokens expired but Microsoft tokens are still valid
# - Interactive setup-test-oauth.sh was interrupted after Microsoft
# - You want to update only Gmail tokens without re-authenticating Microsoft

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

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed"
    log_error "Install with: brew install jq"
    exit 1
fi

# Check if authorization code/URL provided
if [ $# -eq 0 ]; then
    log_error "Authorization code or callback URL required"
    echo ""
    echo "Usage: $0 <authorization_code_or_url>"
    echo ""
    echo "Example with code:"
    echo "  $0 '4/0Ab32j92...'"
    echo ""
    echo "Example with URL:"
    echo "  $0 'http://localhost:8080/auth/gmail/callback?code=4/0Ab32j92...'"
    echo ""
    exit 1
fi

INPUT="$1"

# Extract authorization code from URL if needed
if echo "$INPUT" | grep -q "code="; then
    GMAIL_AUTH_CODE=$(echo "$INPUT" | sed -n 's/.*code=\([^&]*\).*/\1/p')
    log_info "Extracted authorization code from URL"
else
    GMAIL_AUTH_CODE="$INPUT"
fi

log_info "Gmail authorization code received (${#GMAIL_AUTH_CODE} chars)"

# Load Gmail credentials from backend/.env
if [ -f "$PROJECT_ROOT/backend/.env" ]; then
    GMAIL_CLIENT_ID=$(grep '^GMAIL_CLIENT_ID=' "$PROJECT_ROOT/backend/.env" | cut -d'=' -f2- || echo "")
    GMAIL_CLIENT_SECRET=$(grep '^GMAIL_CLIENT_SECRET=' "$PROJECT_ROOT/backend/.env" | cut -d'=' -f2- || echo "")
fi

if [ -z "$GMAIL_CLIENT_ID" ] || [ -z "$GMAIL_CLIENT_SECRET" ]; then
    log_error "Gmail OAuth credentials not found in backend/.env"
    log_error "Required: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET"
    exit 1
fi

log_info "Exchanging authorization code for tokens..."

GMAIL_REDIRECT_URI="http://localhost:8080/auth/gmail/callback"

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
    echo "$GMAIL_TOKEN_RESPONSE" | jq '.'
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

# Update .env.test
log_info "Saving Gmail tokens to .env.test..."

if [ ! -f "$PROJECT_ROOT/.env.test" ]; then
    log_warning ".env.test not found, creating new file"
    cat > "$PROJECT_ROOT/.env.test" << ENVEOF
# JobHunter Test Environment OAuth Configuration
# Gmail tokens added by add-gmail-tokens-manual.sh on $(date '+%Y-%m-%d %H:%M:%S %Z')

# Gmail OAuth Configuration
GMAIL_TEST_ACCESS_TOKEN=$GMAIL_ACCESS_TOKEN
GMAIL_TEST_REFRESH_TOKEN=$GMAIL_REFRESH_TOKEN
GMAIL_TEST_CLIENT_ID=$GMAIL_CLIENT_ID
GMAIL_TEST_CLIENT_SECRET=$GMAIL_CLIENT_SECRET

# Microsoft Mail OAuth Configuration (to be filled)
MSMAIL_TEST_ACCESS_TOKEN=
MSMAIL_TEST_REFRESH_TOKEN=
MSMAIL_TEST_CLIENT_ID=
MSMAIL_TEST_CLIENT_SECRET=
MSMAIL_TEST_TENANT_ID=
ENVEOF
else
    # Update existing file
    sed -i.bak "s#^GMAIL_TEST_ACCESS_TOKEN=.*#GMAIL_TEST_ACCESS_TOKEN=$GMAIL_ACCESS_TOKEN#" "$PROJECT_ROOT/.env.test"
    sed -i.bak "s#^GMAIL_TEST_REFRESH_TOKEN=.*#GMAIL_TEST_REFRESH_TOKEN=$GMAIL_REFRESH_TOKEN#" "$PROJECT_ROOT/.env.test"
    sed -i.bak "s#^GMAIL_TEST_CLIENT_ID=.*#GMAIL_TEST_CLIENT_ID=$GMAIL_CLIENT_ID#" "$PROJECT_ROOT/.env.test"
    sed -i.bak "s#^GMAIL_TEST_CLIENT_SECRET=.*#GMAIL_TEST_CLIENT_SECRET=$GMAIL_CLIENT_SECRET#" "$PROJECT_ROOT/.env.test"
    rm -f "$PROJECT_ROOT/.env.test.bak"
fi

log_info "Gmail tokens saved to .env.test"

echo ""
log_info "✅ Gmail OAuth setup complete!"
echo ""
log_info "Next steps:"
log_info "  1. Verify tokens: ./helper-scripts/validate-oauth-tokens.sh"
log_info "  2. Run tests: ./run-comprehensive-tests.sh"
echo ""

exit 0
