#!/bin/bash

# =====================================================
# Database Sanitization Script for GitHub Publication
# =====================================================
# Removes all sensitive OAuth credentials and tokens
# before publishing the database to GitHub
#
# IMPORTANT (ISSUE-040): Part of single-database architecture
# - Clears oauth_credentials table completely
# - Verifies no sensitive data remains
# - Exports sanitized database for publication
#
# Usage:
#   ./helper-scripts/sanitize-database.sh
# =====================================================

set -e  # Exit on error

DATABASE_NAME="jobhunter_personal"
SANITIZED_FILE="database/schema_with_sanitized_data.sql"

echo "======================================"
echo "Database Sanitization for GitHub"
echo "======================================"
echo ""

# Verify database connection
echo "Checking database connection..."
if ! psql -U jobhunter_user -d "$DATABASE_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ ERROR: Cannot connect to $DATABASE_NAME database"
    echo "   Make sure PostgreSQL is running"
    exit 1
fi
echo "✅ Database connection OK"
echo ""

# Show current OAuth state
echo "Current OAuth credentials state:"
OAUTH_COUNT=$(psql -U jobhunter_user -d "$DATABASE_NAME" -t -c "SELECT COUNT(*) FROM oauth_credentials;" | xargs)
echo "   OAuth credentials found: $OAUTH_COUNT"
echo ""

if [ "$OAUTH_COUNT" = "0" ]; then
    echo "ℹ️  Database is already sanitized (no OAuth credentials)"
    echo ""
else
    # Clear OAuth credentials
    echo "⚠️  WARNING: About to remove ALL OAuth credentials from $DATABASE_NAME"
    echo "   This will delete $OAUTH_COUNT credential(s)"
    echo "   Press Ctrl+C to cancel, or Enter to continue..."
    read -r
    echo ""

    echo "1️⃣  Clearing OAuth credentials..."
    psql -U jobhunter_user -d "$DATABASE_NAME" -c "TRUNCATE TABLE oauth_credentials CASCADE;"
    echo "✅ OAuth credentials cleared"
    echo ""
fi

# Verify no sensitive data remains
echo "2️⃣  Verifying no sensitive data..."
OAUTH_COUNT=$(psql -U jobhunter_user -d "$DATABASE_NAME" -t -c "SELECT COUNT(*) FROM oauth_credentials;" | xargs)
if [ "$OAUTH_COUNT" != "0" ]; then
    echo "❌ ERROR: OAuth credentials still present!"
    echo "   Found: $OAUTH_COUNT credential(s)"
    exit 1
fi
echo "✅ No OAuth credentials found"
echo ""

# Show database state before export
echo "Database state (before export):"
psql -U jobhunter_user -d "$DATABASE_NAME" -c "
    SELECT
        'Jobs' as entity,
        COUNT(*) as count,
        string_agg(DISTINCT status::text, ', ') as statuses
    FROM jobs
    GROUP BY entity
    UNION ALL
    SELECT
        'Applications',
        COUNT(*),
        string_agg(DISTINCT status::text, ', ')
    FROM applications
    GROUP BY entity
    UNION ALL
    SELECT
        'Job Sources',
        COUNT(*),
        string_agg(DISTINCT source_type::text, ', ')
    FROM job_sources
    GROUP BY entity
    UNION ALL
    SELECT
        'OAuth Credentials',
        COUNT(*),
        'SANITIZED (count should be 0)'
    FROM oauth_credentials
    GROUP BY entity;
"
echo ""

# Export sanitized database
echo "3️⃣  Exporting sanitized database..."
echo "   Output file: $SANITIZED_FILE"
echo ""

# Create database directory if it doesn't exist
mkdir -p "$(dirname "$SANITIZED_FILE")"

# Export with options suitable for Git
pg_dump -U jobhunter_user -d "$DATABASE_NAME" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    > "$SANITIZED_FILE"

echo "✅ Sanitized database exported successfully"
echo ""

# Show file info
FILE_SIZE=$(ls -lh "$SANITIZED_FILE" | awk '{print $5}')
echo "======================================"
echo "✅ Sanitization complete!"
echo "======================================"
echo ""
echo "Sanitized file: $SANITIZED_FILE"
echo "File size: $FILE_SIZE"
echo ""
echo "⚠️  IMPORTANT: Review the file before committing to GitHub"
echo "   Check for any remaining sensitive data:"
echo "   - OAuth tokens, API keys, passwords"
echo "   - Personal email addresses or names in test data"
echo "   - Any other private information"
echo ""
echo "To commit this file:"
echo "   git add $SANITIZED_FILE"
echo "   git commit -m \"chore: Add sanitized database export for GitHub\""
echo ""
