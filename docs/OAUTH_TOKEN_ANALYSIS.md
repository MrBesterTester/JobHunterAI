<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [OAuth Token Management Analysis](#oauth-token-management-analysis)
  - [Research Findings](#research-findings)
    - [Google OAuth Refresh Tokens](#google-oauth-refresh-tokens)
    - [Microsoft OAuth Refresh Tokens](#microsoft-oauth-refresh-tokens)
  - [Current Implementation](#current-implementation)
    - [Scripts](#scripts)
    - [Test Orchestrator Flow](#test-orchestrator-flow)
  - [Root Cause Analysis](#root-cause-analysis)
    - [Primary Issue: Refresh Token Expiration](#primary-issue-refresh-token-expiration)
    - [Secondary Issue: Interactive Script Limitations](#secondary-issue-interactive-script-limitations)
    - [Tertiary Issue: No Detection of Invalid Refresh Tokens](#tertiary-issue-no-detection-of-invalid-refresh-tokens)
  - [Proposed Solution](#proposed-solution)
    - [1. Improved Token Validation Script](#1-improved-token-validation-script)
    - [2. Enhanced Setup Script](#2-enhanced-setup-script)
    - [3. Pre-Test Validation](#3-pre-test-validation)
    - [4. Database Sync Helper](#4-database-sync-helper)
    - [5. Claude Code Policy](#5-claude-code-policy)
  - [Testing Strategy Recommendations](#testing-strategy-recommendations)
    - [Option A: Long-Lived Tokens (Recommended)](#option-a-long-lived-tokens-recommended)
    - [Option B: Mock OAuth for E2E Tests](#option-b-mock-oauth-for-e2e-tests)
    - [Option C: Service Account (Gmail only)](#option-c-service-account-gmail-only)
  - [Immediate Action Items](#immediate-action-items)
  - [Sources](#sources)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# OAuth Token Management Analysis

**Date**: 2025-11-21
**Context**: Comprehensive test failure due to expired OAuth refresh tokens

## Research Findings

### Google OAuth Refresh Tokens

**Key Limitations** ([source](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)):
- **100 token limit**: Maximum 100 refresh tokens per Google Account per OAuth client
- **Auto-invalidation**: Creating token #101 automatically invalidates token #1 (no warning!)
- **Testing projects**: Projects with OAuth consent screen in "Testing" mode expire refresh tokens in **7 days**
- **Invalidation causes**: Password changes, explicit revocation, 6+ months unused, hitting token limit

**Best Practices**:
- Don't refresh access token on every API call (throttled by Google)
- Only refresh when access token expires
- Minimize number of refresh tokens created

### Microsoft OAuth Refresh Tokens

**Key Limitations** ([source](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens)):
- **Access tokens**: 60-90 minutes (average 75 min)
- **Refresh tokens**: 90 days for traditional flows
- **Token rotation**: Each refresh generates a NEW refresh token with new 90-day expiry
- **Auto-revocation**: Service can revoke tokens at any time

**Best Practices**:
- Store and reuse access tokens until expiration
- Implement automatic refresh before expiry
- Handle revocation gracefully (prompt for re-authentication)

## Current Implementation

### Scripts

1. **`setup-test-oauth.sh`** - Manual OAuth setup
   - Opens browser for user authorization
   - Exchanges authorization code for tokens
   - Saves to `.env.test` file
   - **Limitation**: Interactive, requires user to paste callback URLs

2. **`refresh-oauth-tokens.sh`** - Automatic token refresh
   - Checks if access tokens are valid
   - Uses refresh tokens to get new access tokens
   - Updates `.env.test` file
   - **Limitation**: Fails silently if refresh token is invalid

3. **`seed-database.sh`** - Database seeding
   - Loads tokens from `.env.test`
   - Injects into `oauth_credentials` table
   - **Limitation**: Uses whatever tokens are in `.env.test` (may be stale)

### Test Orchestrator Flow

```
1. Run preflight checks
2. Call refresh-oauth-tokens.sh
3. Clear and seed database (from .env.test)
4. Run tests
```

## Root Cause Analysis

### Primary Issue: Refresh Token Expiration

**What happened**:
1. Refresh tokens in `.env.test` became invalid (expired/revoked)
2. `refresh-oauth-tokens.sh` tried to use invalid refresh tokens
3. OAuth providers returned "invalid_grant" error
4. Comprehensive tests failed during preflight

**Why refresh tokens became invalid**:
- **Google**: Likely hit 100 token limit OR 7-day expiry (if project in Testing mode)
- **Microsoft**: 90-day expiry reached
- **Repeated OAuth flows**: Each time we ran `setup-test-oauth.sh`, we created new tokens

### Secondary Issue: Interactive Script Limitations

**Challenge**: Authorization codes expire in ~10 minutes
- User must complete OAuth flow quickly
- If Claude tries to orchestrate (open browser, wait for URL, submit), codes expire
- Multiple failed attempts create more refresh tokens (worsening the limit problem)

### Tertiary Issue: No Detection of Invalid Refresh Tokens

**Problem**: We only discover invalid refresh tokens at test time
- No proactive validation
- No clear error messages about WHY tokens are invalid
- No guidance on how to fix

## Proposed Solution

### 1. Improved Token Validation Script

Create `validate-oauth-tokens.sh` that:
- Checks if access tokens are valid
- **Tests refresh tokens** by attempting a refresh
- Reports clear status: `VALID`, `ACCESS_EXPIRED` (refreshable), `REFRESH_INVALID` (needs re-auth)
- Returns actionable error messages

### 2. Enhanced Setup Script

Improve `setup-test-oauth.sh` to:
- **Check if tokens already exist and are valid** before prompting re-auth
- Provide clear instructions and timing expectations
- Handle authorization code expiry gracefully
- Optionally backup old tokens before overwriting

### 3. Pre-Test Validation

Modify test orchestrator to:
- Run `validate-oauth-tokens.sh` FIRST
- If refresh tokens invalid, **stop immediately** with clear message
- Provide specific command to fix: `./helper-scripts/setup-test-oauth.sh`
- Don't attempt to run tests with invalid tokens

### 4. Database Sync Helper

Create `sync-oauth-to-database.sh` that:
- Reads tokens from `.env.test`
- Updates database `oauth_credentials` table
- Validates tokens work in database
- Can be run independently of full database seeding

### 5. Claude Code Policy

Document clear policy in `CLAUDE.md`:
- **Never** try to orchestrate interactive OAuth flows
- **Always** check token validity before running comprehensive tests
- **Stop immediately** if refresh tokens are invalid
- **Guide user** to run `setup-test-oauth.sh` manually

## Testing Strategy Recommendations

### Option A: Long-Lived Tokens (Recommended)
- Move OAuth app to **Published** mode (not Testing)
- Refresh tokens won't expire in 7 days
- Still subject to 100 token limit and 90-day MS expiry
- **Quarterly maintenance**: Re-run setup every ~90 days

### Option B: Mock OAuth for E2E Tests
- Use test doubles for OAuth flows in E2E tests
- Only use real OAuth for integration tests
- Eliminates token management complexity
- **Tradeoff**: Not testing real OAuth flow

### Option C: Service Account (Gmail only)
- Use Gmail Service Account for automated testing
- No user OAuth required
- **Limitation**: Doesn't test user OAuth flow, MS doesn't support

## Immediate Action Items

1. ✅ Research OAuth best practices (completed)
2. ✅ Review existing scripts (completed)
3. ✅ Identify root cause (completed)
4. Create `validate-oauth-tokens.sh`
5. Enhance `setup-test-oauth.sh` with validation
6. Update test orchestrator to validate tokens first
7. Document policy in `CLAUDE.md`
8. Verify solution with comprehensive test run

## Sources

- [Google OAuth Best Practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)
- [Google OAuth Web Server Flow](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Microsoft Refresh Tokens](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens)
- [OAuth 2.0 Simplified](https://www.oauth.com/oauth2-servers/making-authenticated-requests/refreshing-an-access-token/)
