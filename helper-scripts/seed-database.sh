#!/bin/bash
set -euo pipefail

# Seed Database Script
# Purpose: Load test fixtures and inject OAuth tokens from .env.test
# Usage: ./helper-scripts/seed-database.sh

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

# Read database connection info from backend/.env
if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
    log_error "backend/.env file not found"
    exit 1
fi

# Extract DATABASE_URL from backend/.env
DATABASE_URL=$(grep '^DATABASE_URL=' "$PROJECT_ROOT/backend/.env" | cut -d'=' -f2-)

if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL not found in backend/.env"
    exit 1
fi

# Parse DATABASE_URL to extract connection parameters
DB_USER=$(echo "$DATABASE_URL" | sed -n 's#.*://\([^:]*\):.*#\1#p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's#.*://[^:]*:\([^@]*\)@.*#\1#p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's#.*@\([^:]*\):.*#\1#p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's#.*:\([0-9]*\)/.*#\1#p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's#.*/\([^?]*\).*#\1#p')

log_info "Seeding database: $DB_NAME"

# Export password for psql
export PGPASSWORD="$DB_PASS"

# Load test fixtures
log_info "Loading test fixtures..."
if ! psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -f "$PROJECT_ROOT/database/test-fixtures.sql" > /dev/null 2>&1; then
    log_error "Failed to load test fixtures"
    exit 1
fi

log_info "Test fixtures loaded successfully"

# Check if .env.test exists
if [ ! -f "$PROJECT_ROOT/.env.test" ]; then
    log_warning ".env.test not found - OAuth tokens not injected"
    log_warning "Run: ./helper-scripts/setup-test-oauth.sh to create .env.test"
    log_info "Database seeded with placeholder OAuth credentials"
    exit 0
fi

# Source .env.test to load OAuth tokens
log_info "Injecting OAuth tokens from .env.test..."
set -a  # Export all variables
source "$PROJECT_ROOT/.env.test"
set +a

# Update Gmail OAuth credentials if tokens are present
if [ -n "${GMAIL_TEST_CLIENT_ID:-}" ] && [ -n "${GMAIL_TEST_ACCESS_TOKEN:-}" ]; then
    psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" << SQL
UPDATE oauth_credentials
SET
    client_id = '$GMAIL_TEST_CLIENT_ID',
    client_secret = '$GMAIL_TEST_CLIENT_SECRET',
    access_token = '$GMAIL_TEST_ACCESS_TOKEN',
    refresh_token = '$GMAIL_TEST_REFRESH_TOKEN',
    token_expires_at = NOW() + INTERVAL '1 hour'
WHERE source_id = (SELECT source_id FROM job_sources WHERE source_name = 'gmail');
SQL
    log_info "Gmail OAuth tokens injected"
else
    log_warning "Gmail OAuth tokens not found in .env.test"
fi

# Update Microsoft Mail OAuth credentials if tokens are present
if [ -n "${MSMAIL_TEST_CLIENT_ID:-}" ] && [ -n "${MSMAIL_TEST_ACCESS_TOKEN:-}" ]; then
    psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" << SQL
UPDATE oauth_credentials
SET
    client_id = '$MSMAIL_TEST_CLIENT_ID',
    client_secret = '$MSMAIL_TEST_CLIENT_SECRET',
    access_token = '$MSMAIL_TEST_ACCESS_TOKEN',
    refresh_token = '$MSMAIL_TEST_REFRESH_TOKEN',
    token_expires_at = NOW() + INTERVAL '1 hour'
WHERE source_id = (SELECT source_id FROM job_sources WHERE source_name = 'microsoft_email');
SQL
    log_info "Microsoft Mail OAuth tokens injected"
else
    log_warning "Microsoft Mail OAuth tokens not found in .env.test"
fi

log_info "Database seeded successfully"

# Show summary
psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" << SQL
SELECT 
    'Jobs' as entity, 
    COUNT(*) as count,
    string_agg(DISTINCT status, ', ') as statuses
FROM jobs
UNION ALL
SELECT 
    'Applications', 
    COUNT(*),
    string_agg(DISTINCT application_status, ', ')
FROM applications
UNION ALL
SELECT 
    'Job Sources', 
    COUNT(*),
    string_agg(source_name, ', ')
FROM job_sources
UNION ALL
SELECT 
    'OAuth Credentials', 
    COUNT(*),
    string_agg(
        CASE 
            WHEN access_token LIKE 'GMAIL%' THEN 'gmail (placeholder)'
            WHEN access_token LIKE 'MSMAIL%' THEN 'microsoft_email (placeholder)'
            ELSE 'configured'
        END, 
        ', '
    )
FROM oauth_credentials;
SQL

exit 0
