#!/bin/bash
set -euo pipefail

# Add Microsoft Tokens Manual Script
# Purpose: Exchange Microsoft OAuth authorization code for tokens and save to .env.test
# Usage: ./helper-scripts/add-microsoft-tokens-manual.sh <authorization_code_or_url>
#
# This script is useful when:
# - Microsoft tokens expired (90 days) but Gmail tokens are still valid
# - Interactive setup-test-oauth.sh was interrupted after Gmail
# - You want to update only Microsoft tokens without re-authenticating Gmail

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
    echo "  $0 '1.ATcA0GsN5kRC...'"
    echo ""
    echo "Example with URL:"
    echo "  $0 'http://localhost:8080/api/email/microsoft/callback?code=1.ATcA0GsN5kRC...'"
    echo ""
    exit 1
fi

INPUT="$1"

# Extract authorization code from URL if needed
if echo "$INPUT" | grep -q "code="; then
    MSMAIL_AUTH_CODE=$(echo "$INPUT" | sed -n 's/.*code=\([^&]*\).*/\1/p')
    log_info "Extracted authorization code from URL"
else
    MSMAIL_AUTH_CODE="$INPUT"
fi

log_info "Microsoft authorization code received (${#MSMAIL_AUTH_CODE} chars)"

# Load Microsoft credentials from backend/.env
if [ -f "$PROJECT_ROOT/backend/.env" ]; then
    MSMAIL_CLIENT_ID=$(grep '^MICROSOFT_CLIENT_ID=' "$PROJECT_ROOT/backend/.env" | cut -d'=' -f2- || echo "")
    MSMAIL_CLIENT_SECRET=$(grep '^MICROSOFT_CLIENT_SECRET=' "$PROJECT_ROOT/backend/.env" | cut -d'=' -f2- || echo "")
    MSMAIL_TENANT_ID=$(grep '^MICROSOFT_TENANT_ID=' "$PROJECT_ROOT/backend/.env" | cut -d'=' -f2- || echo "")
fi

if [ -z "$MSMAIL_CLIENT_ID" ] || [ -z "$MSMAIL_CLIENT_SECRET" ] || [ -z "$MSMAIL_TENANT_ID" ]; then
    log_error "Microsoft OAuth credentials not found in backend/.env"
    log_error "Required: MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID"
    exit 1
fi

log_info "Exchanging authorization code for tokens..."

MSMAIL_REDIRECT_URI="http://localhost:8080/api/email/microsoft/callback"

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
    echo "$MSMAIL_TOKEN_RESPONSE" | jq '.'
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

# Update .env.test
log_info "Saving Microsoft Mail tokens to .env.test..."

if [ ! -f "$PROJECT_ROOT/.env.test" ]; then
    log_warning ".env.test not found, creating new file"
    cat > "$PROJECT_ROOT/.env.test" << ENVEOF
# JobHunter Test Environment OAuth Configuration
# Microsoft tokens added by add-microsoft-tokens-manual.sh on $(date '+%Y-%m-%d %H:%M:%S %Z')

# Gmail OAuth Configuration (to be filled)
GMAIL_TEST_ACCESS_TOKEN=
GMAIL_TEST_REFRESH_TOKEN=
GMAIL_TEST_CLIENT_ID=
GMAIL_TEST_CLIENT_SECRET=

# Microsoft Mail OAuth Configuration
MSMAIL_TEST_ACCESS_TOKEN=$MSMAIL_ACCESS_TOKEN
MSMAIL_TEST_REFRESH_TOKEN=$MSMAIL_REFRESH_TOKEN
MSMAIL_TEST_CLIENT_ID=$MSMAIL_CLIENT_ID
MSMAIL_TEST_CLIENT_SECRET=$MSMAIL_CLIENT_SECRET
MSMAIL_TEST_TENANT_ID=$MSMAIL_TENANT_ID
ENVEOF
else
    # Update existing file
    sed -i.bak "s#^MSMAIL_TEST_ACCESS_TOKEN=.*#MSMAIL_TEST_ACCESS_TOKEN=$MSMAIL_ACCESS_TOKEN#" "$PROJECT_ROOT/.env.test"
    sed -i.bak "s#^MSMAIL_TEST_REFRESH_TOKEN=.*#MSMAIL_TEST_REFRESH_TOKEN=$MSMAIL_REFRESH_TOKEN#" "$PROJECT_ROOT/.env.test"
    sed -i.bak "s#^MSMAIL_TEST_CLIENT_ID=.*#MSMAIL_TEST_CLIENT_ID=$MSMAIL_CLIENT_ID#" "$PROJECT_ROOT/.env.test"
    sed -i.bak "s#^MSMAIL_TEST_CLIENT_SECRET=.*#MSMAIL_TEST_CLIENT_SECRET=$MSMAIL_CLIENT_SECRET#" "$PROJECT_ROOT/.env.test"
    sed -i.bak "s#^MSMAIL_TEST_TENANT_ID=.*#MSMAIL_TEST_TENANT_ID=$MSMAIL_TENANT_ID#" "$PROJECT_ROOT/.env.test"
    rm -f "$PROJECT_ROOT/.env.test.bak"
fi

log_info "Microsoft Mail tokens saved to .env.test"

echo ""
log_info "✅ Microsoft Mail OAuth setup complete!"
echo ""
log_info "Next steps:"
log_info "  1. Verify tokens: ./helper-scripts/validate-oauth-tokens.sh"
log_info "  2. Run tests: ./run-comprehensive-tests.sh"
echo ""

exit 0
