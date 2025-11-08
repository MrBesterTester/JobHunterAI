#!/bin/bash

# =====================================================
# Test Data Seeding Script
# =====================================================
# Seeds the jobhunter_dev (dev) database with test data
# for E2E testing.
#
# Usage:
#   ./helper-scripts/seed-test-data.sh
#
# Options:
#   --truncate    Clear all existing jobs before seeding
#   --verify      Only verify seed status, don't seed
# =====================================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SEED_FILE="$PROJECT_ROOT/database/seed_test_data.sql"
DATABASE_NAME="jobhunter_dev"

# Parse arguments
TRUNCATE=false
VERIFY_ONLY=false

for arg in "$@"; do
    case $arg in
        --truncate)
            TRUNCATE=true
            shift
            ;;
        --verify)
            VERIFY_ONLY=true
            shift
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Usage: $0 [--truncate] [--verify]"
            exit 1
            ;;
    esac
done

echo "======================================"
echo "JobHunter Test Data Seeding"
echo "======================================"
echo ""

# Check if seed file exists
if [ ! -f "$SEED_FILE" ]; then
    echo "❌ ERROR: Seed file not found: $SEED_FILE"
    exit 1
fi

# Verify database connection
echo "Checking database connection..."
echo "Target database: $DATABASE_NAME"
if ! psql -U jobhunter_user -d "$DATABASE_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ ERROR: Cannot connect to $DATABASE_NAME database"
    echo "   Make sure PostgreSQL is running and the database exists"
    exit 1
fi
echo "✅ Database connection OK"
echo ""

# Verify-only mode
if [ "$VERIFY_ONLY" = true ]; then
    echo "Verifying current test data state..."
    psql -U jobhunter_user -d "$DATABASE_NAME" -c "
        SELECT
            status,
            COUNT(*) as count
        FROM jobs
        GROUP BY status
        ORDER BY status;
    "

    echo ""
    echo "Checking for Expert Systems Architect job (required by tests)..."
    EXPERT_JOB_EXISTS=$(psql -U jobhunter_user -d "$DATABASE_NAME" -t -c "
        SELECT COUNT(*)
        FROM jobs
        WHERE job_id = '94558e12-59db-4751-9556-f36edf9f6260'
          AND title = 'Expert Systems Architect'
          AND extraction_method = 'llm';
    " | xargs)

    if [ "$EXPERT_JOB_EXISTS" = "1" ]; then
        echo "✅ Expert Systems Architect job exists with correct data"
    else
        echo "❌ Expert Systems Architect job missing or incorrect"
        echo "   Run this script without --verify to seed data"
    fi

    exit 0
fi

# Optional truncate
if [ "$TRUNCATE" = true ]; then
    echo "⚠️  WARNING: About to delete ALL jobs from $DATABASE_NAME database"
    echo "   Press Ctrl+C to cancel, or Enter to continue..."
    read -r

    echo "Truncating jobs table..."
    psql -U jobhunter_user -d "$DATABASE_NAME" -c "TRUNCATE TABLE jobs CASCADE;"
    echo "✅ Jobs table truncated"
    echo ""
fi

# Run the seed script
echo "Running seed script..."
echo "Database: $DATABASE_NAME"
echo "File: $SEED_FILE"
echo ""

if psql -U jobhunter_user -d "$DATABASE_NAME" -f "$SEED_FILE"; then
    echo ""
    echo "======================================"
    echo "✅ Test data seeding complete!"
    echo "======================================"
    echo ""
    echo "Summary:"
    echo "  • 30 filtered jobs (including Expert Systems Architect)"
    echo "  • 10 new jobs awaiting approval"
    echo "  • 5 approved jobs ready for application"
    echo "  • Total: 45 test jobs"
    echo ""
    echo "The database is now ready for E2E testing."
    echo ""
    echo "To verify the data:"
    echo "  $0 --verify"
    echo ""
else
    echo ""
    echo "❌ ERROR: Seeding failed"
    echo "   Check the error messages above for details"
    exit 1
fi
