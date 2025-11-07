#!/bin/bash
set -euo pipefail

# Clear Database Script
# Purpose: Truncate all tables in the database for clean test state
# Usage: ./helper-scripts/clear-database.sh

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
# Format: postgres://user:password@host:port/database
DB_USER=$(echo "$DATABASE_URL" | sed -n 's#.*://\([^:]*\):.*#\1#p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's#.*://[^:]*:\([^@]*\)@.*#\1#p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's#.*@\([^:]*\):.*#\1#p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's#.*:\([0-9]*\)/.*#\1#p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's#.*/\([^?]*\).*#\1#p')

log_info "Clearing database: $DB_NAME"

# Export password for psql
export PGPASSWORD="$DB_PASS"

# Truncate all tables (CASCADE handles foreign keys)
# NOTE: This preserves table structure, triggers, and constraints
psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" << SQL
-- Truncate all tables with CASCADE
TRUNCATE TABLE 
    email_jobs,
    api_job_sources,
    job_intake_logs,
    oauth_credentials,
    job_deduplication,
    communications,
    applications,
    jobs,
    job_sources,
    cover_letter_templates,
    resume_versions
CASCADE;

-- Reset sequences if needed
-- (UUIDs don't need sequence reset)

-- Verify tables are empty
SELECT 
    'jobs' as table_name, 
    COUNT(*) as row_count 
FROM jobs
UNION ALL
SELECT 
    'applications', 
    COUNT(*) 
FROM applications
UNION ALL
SELECT 
    'job_sources', 
    COUNT(*) 
FROM job_sources
UNION ALL
SELECT 
    'oauth_credentials', 
    COUNT(*) 
FROM oauth_credentials;
SQL

if [ $? -eq 0 ]; then
    log_info "Database cleared successfully"
    log_info "All tables truncated (structure preserved)"
    exit 0
else
    log_error "Failed to clear database"
    exit 1
fi
