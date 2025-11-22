#!/bin/bash
set -euo pipefail

# Validate OAuth Tokens Script
# Purpose: Comprehensive validation of OAuth tokens before running tests
# Usage: ./helper-scripts/validate-oauth-tokens.sh
#
# Exit codes:
#   0 - All tokens valid (access tokens work OR refresh tokens work)
#   1 - Refresh tokens invalid (requires re-authentication)
#   2 - Configuration error (.env.test missing or incomplete)

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

# Check if .env.test exists
if [ ! -f "$PROJECT_ROOT/.env.test" ]; then
    log_section "OAuth Token Validation"
    log_error ".env.test file not found"
    echo ""
    log_error "OAuth tokens have not been configured"
    log_error "Run: ./helper-scripts/setup-test-oauth.sh"
    echo ""
    exit 2
fi

# Load .env.test
set -a
source "$PROJECT_ROOT/.env.test"
set +a

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed"
    log_error "Install with: brew install jq"
    exit 2
fi

log_section "OAuth Token Validation"

VALIDATION_FAILED=false
GMAIL_STATUS=""
MSMAIL_STATUS=""

# ============================================================================
# Gmail Token Validation
# ============================================================================

echo ""
echo "📧 Gmail OAuth Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if Gmail credentials exist
if [ -z "${GMAIL_TEST_CLIENT_ID:-}" ] || [ -z "${GMAIL_TEST_CLIENT_SECRET:-}" ]; then
    log_error "Gmail OAuth credentials missing in .env.test"
    GMAIL_STATUS="MISSING_CREDENTIALS"
    VALIDATION_FAILED=true
else
    # Test Gmail access token
    GMAIL_ACCESS_VALID=false
    if [ -n "${GMAIL_TEST_ACCESS_TOKEN:-}" ]; then
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer $GMAIL_TEST_ACCESS_TOKEN" \
            "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1" 2>/dev/null || echo "000")

        if [ "$RESPONSE" = "200" ]; then
            GMAIL_ACCESS_VALID=true
            log_info "Access token is valid"
            GMAIL_STATUS="VALID"
        else
            log_warning "Access token is expired or invalid (HTTP $RESPONSE)"
        fi
    else
        log_warning "Access token is missing"
    fi

    # Test Gmail refresh token if access token invalid
    if [ "$GMAIL_ACCESS_VALID" = false ]; then
        if [ -z "${GMAIL_TEST_REFRESH_TOKEN:-}" ]; then
            log_error "Refresh token is missing"
            GMAIL_STATUS="MISSING_REFRESH_TOKEN"
            VALIDATION_FAILED=true
        else
            echo "   Testing refresh token..."
            REFRESH_RESPONSE=$(curl -s -X POST https://oauth2.googleapis.com/token \
                -d "client_id=$GMAIL_TEST_CLIENT_ID" \
                -d "client_secret=$GMAIL_TEST_CLIENT_SECRET" \
                -d "refresh_token=$GMAIL_TEST_REFRESH_TOKEN" \
                -d "grant_type=refresh_token" 2>/dev/null)

            NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.access_token // empty')
            ERROR_CODE=$(echo "$REFRESH_RESPONSE" | jq -r '.error // empty')
            ERROR_DESC=$(echo "$REFRESH_RESPONSE" | jq -r '.error_description // empty')

            if [ -n "$NEW_ACCESS_TOKEN" ]; then
                log_info "Refresh token is valid (can obtain new access token)"
                GMAIL_STATUS="REFRESHABLE"
            else
                log_error "Refresh token is invalid or expired"
                if [ -n "$ERROR_CODE" ]; then
                    echo "   Error: $ERROR_CODE - $ERROR_DESC"
                fi
                GMAIL_STATUS="REFRESH_TOKEN_INVALID"
                VALIDATION_FAILED=true
            fi
        fi
    fi
fi

# ============================================================================
# Microsoft Mail Token Validation
# ============================================================================

echo ""
echo "📧 Microsoft Mail OAuth Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if Microsoft credentials exist
if [ -z "${MSMAIL_TEST_CLIENT_ID:-}" ] || [ -z "${MSMAIL_TEST_CLIENT_SECRET:-}" ] || [ -z "${MSMAIL_TEST_TENANT_ID:-}" ]; then
    log_error "Microsoft OAuth credentials missing in .env.test"
    MSMAIL_STATUS="MISSING_CREDENTIALS"
    VALIDATION_FAILED=true
else
    # Test Microsoft access token
    MSMAIL_ACCESS_VALID=false
    if [ -n "${MSMAIL_TEST_ACCESS_TOKEN:-}" ]; then
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer $MSMAIL_TEST_ACCESS_TOKEN" \
            "https://graph.microsoft.com/v1.0/me/messages?top=1" 2>/dev/null || echo "000")

        if [ "$RESPONSE" = "200" ]; then
            MSMAIL_ACCESS_VALID=true
            log_info "Access token is valid"
            MSMAIL_STATUS="VALID"
        else
            log_warning "Access token is expired or invalid (HTTP $RESPONSE)"
        fi
    else
        log_warning "Access token is missing"
    fi

    # Test Microsoft refresh token if access token invalid
    if [ "$MSMAIL_ACCESS_VALID" = false ]; then
        if [ -z "${MSMAIL_TEST_REFRESH_TOKEN:-}" ]; then
            log_error "Refresh token is missing"
            MSMAIL_STATUS="MISSING_REFRESH_TOKEN"
            VALIDATION_FAILED=true
        else
            echo "   Testing refresh token..."
            REFRESH_RESPONSE=$(curl -s -X POST \
                "https://login.microsoftonline.com/$MSMAIL_TEST_TENANT_ID/oauth2/v2.0/token" \
                -d "client_id=$MSMAIL_TEST_CLIENT_ID" \
                -d "client_secret=$MSMAIL_TEST_CLIENT_SECRET" \
                -d "refresh_token=$MSMAIL_TEST_REFRESH_TOKEN" \
                -d "grant_type=refresh_token" \
                -d "scope=https://graph.microsoft.com/.default" 2>/dev/null)

            NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.access_token // empty')
            ERROR_CODE=$(echo "$REFRESH_RESPONSE" | jq -r '.error // empty')
            ERROR_DESC=$(echo "$REFRESH_RESPONSE" | jq -r '.error_description // empty')

            if [ -n "$NEW_ACCESS_TOKEN" ]; then
                log_info "Refresh token is valid (can obtain new access token)"
                MSMAIL_STATUS="REFRESHABLE"
            else
                log_error "Refresh token is invalid or expired"
                if [ -n "$ERROR_CODE" ]; then
                    echo "   Error: $ERROR_CODE"
                    if echo "$ERROR_DESC" | grep -q "90 days"; then
                        echo "   Cause: 90-day refresh token expiry reached"
                    fi
                fi
                MSMAIL_STATUS="REFRESH_TOKEN_INVALID"
                VALIDATION_FAILED=true
            fi
        fi
    fi
fi

# ============================================================================
# Summary and Recommendations
# ============================================================================

log_section "Validation Summary"

echo ""
echo "Gmail Status: $GMAIL_STATUS"
echo "Microsoft Mail Status: $MSMAIL_STATUS"
echo ""

if [ "$VALIDATION_FAILED" = true ]; then
    log_error "OAuth token validation FAILED"
    echo ""

    # Determine which providers failed
    GMAIL_FAILED=false
    MSMAIL_FAILED=false

    if [ "$GMAIL_STATUS" = "REFRESH_TOKEN_INVALID" ] || [ "$GMAIL_STATUS" = "MISSING_CREDENTIALS" ] || [ "$GMAIL_STATUS" = "MISSING_REFRESH_TOKEN" ]; then
        GMAIL_FAILED=true
    fi

    if [ "$MSMAIL_STATUS" = "REFRESH_TOKEN_INVALID" ] || [ "$MSMAIL_STATUS" = "MISSING_CREDENTIALS" ] || [ "$MSMAIL_STATUS" = "MISSING_REFRESH_TOKEN" ]; then
        MSMAIL_FAILED=true
    fi

    # Provide targeted guidance based on which provider(s) failed
    if [ "$GMAIL_FAILED" = true ] && [ "$MSMAIL_FAILED" = true ]; then
        # Both failed - need full setup
        log_error "Both Gmail and Microsoft tokens are invalid"
        echo ""
        echo -e "${YELLOW}Required Action:${NC}"
        echo "   Run: ${GREEN}./helper-scripts/setup-test-oauth.sh${NC}"
        echo ""
        echo "This will refresh BOTH providers (2-3 minutes)"

    elif [ "$GMAIL_FAILED" = true ]; then
        # Only Gmail failed
        log_error "Gmail tokens are invalid"
        log_info "Microsoft tokens: ${GREEN}VALID${NC} ✅"
        echo ""
        echo -e "${YELLOW}Choose an option:${NC}"
        echo ""
        echo "   ${BLUE}Option 1: Gmail only (Faster - 1-2 min)${NC}"
        echo "   ./helper-scripts/add-gmail-tokens-manual.sh '<code>'"
        echo "   (Open Gmail OAuth, copy callback URL, paste as argument)"
        echo ""
        echo "   ${BLUE}Option 2: Both providers (Complete - 2-3 min)${NC}"
        echo "   ./helper-scripts/setup-test-oauth.sh"

    elif [ "$MSMAIL_FAILED" = true ]; then
        # Only Microsoft failed
        log_error "Microsoft tokens are invalid"
        log_info "Gmail tokens: ${GREEN}VALID${NC} ✅"
        echo ""
        echo -e "${YELLOW}Choose an option:${NC}"
        echo ""
        echo "   ${BLUE}Option 1: Microsoft only (Faster - 1-2 min)${NC}"
        echo "   ./helper-scripts/add-microsoft-tokens-manual.sh '<code>'"
        echo "   (Open Microsoft OAuth, copy callback URL, paste as argument)"
        echo ""
        echo "   ${BLUE}Option 2: Both providers (Complete - 2-3 min)${NC}"
        echo "   ./helper-scripts/setup-test-oauth.sh"
    fi

    echo ""

    # Provide specific guidance based on failure type
    if [ "$GMAIL_STATUS" = "REFRESH_TOKEN_INVALID" ]; then
        echo "Gmail refresh token issues can be caused by:"
        echo "   - Token unused for 6+ months"
        echo "   - Password change on Google account"
        echo "   - Explicit token revocation"
        echo "   - OAuth app in Testing mode (7-day expiry)"
        echo "   - 100 token limit reached"
        echo ""
    fi

    if [ "$MSMAIL_STATUS" = "REFRESH_TOKEN_INVALID" ]; then
        echo "Microsoft refresh token issues can be caused by:"
        echo "   - 90-day expiry reached (most common)"
        echo "   - Password change on Microsoft account"
        echo "   - Explicit token revocation"
        echo ""
    fi

    exit 1
else
    log_info "All OAuth tokens are valid or refreshable"
    echo ""
    if [ "$GMAIL_STATUS" = "REFRESHABLE" ] || [ "$MSMAIL_STATUS" = "REFRESHABLE" ]; then
        log_info "Access tokens will be auto-refreshed during test setup"
    fi
    echo ""
    exit 0
fi
