#!/bin/bash

# Clear Job Data
# Removes all job-related data while preserving configuration
# Safe to use with both personal and dev databases

set -e

echo "🗑️  Clear Job Data"
echo ""
echo "This will remove:"
echo "  • All jobs and applications"
echo "  • Email processing history"
echo "  • Intake logs and sync history"
echo "  • Interviews and follow-ups"
echo "  • Communications and drafts"
echo ""
echo "This will preserve:"
echo "  ✓ Job criteria configuration"
echo "  ✓ Resume versions"
echo "  ✓ Cover letter templates"
echo "  ✓ OAuth credentials"
echo "  ✓ Job sources configuration"
echo "  ✓ LLM extraction prompts"
echo ""

# Detect active database from .env file
if [ -f backend/.env ]; then
    # Extract database name from DATABASE_URL (format: postgresql://user:pass@host/dbname)
    DB_URL=$(grep "^DATABASE_URL=" backend/.env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    DB_NAME=$(echo "$DB_URL" | sed 's/.*\///')
    if [ -z "$DB_NAME" ]; then
        echo "❌ Could not detect database name from backend/.env"
        echo "Expected DATABASE_URL format: postgresql://user:pass@host/dbname"
        exit 1
    fi
else
    echo "❌ backend/.env not found"
    exit 1
fi

DB_USER="jobhunter_user"

echo "📊 Active Database: ${DB_NAME}"
echo ""
echo "⚠️  WARNING: This will DELETE ALL JOB DATA in ${DB_NAME}!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted."
    exit 0
fi

echo ""
echo "🔄 Clearing job data from ${DB_NAME}..."

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running"
    echo "Start it with: brew services start postgresql@14"
    exit 1
fi

# Clear job-related tables
# CASCADE automatically handles dependent tables: applications, communications, interviews, follow_up_schedule, email_drafts
psql -U ${DB_USER} -d ${DB_NAME} -c "TRUNCATE TABLE job_deduplication, email_jobs, job_intake_logs, jobs, api_job_sources CASCADE;" 2>&1 | grep -v "^NOTICE:" || {
    echo "❌ Failed to clear job data"
    exit 1
}

echo "✅ Job data cleared successfully"
echo ""

# Show what was cleared
JOBS_COUNT=$(psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM jobs;" | tr -d ' ')
APPS_COUNT=$(psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM applications;" | tr -d ' ')
EMAILS_COUNT=$(psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM email_jobs;" | tr -d ' ')
LOGS_COUNT=$(psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM job_intake_logs;" | tr -d ' ')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Database cleared!"
echo ""
echo "Current counts:"
echo "  • Jobs: ${JOBS_COUNT}"
echo "  • Applications: ${APPS_COUNT}"
echo "  • Email Jobs: ${EMAILS_COUNT}"
echo "  • Intake Logs: ${LOGS_COUNT}"
echo ""
echo "🔄 You can now run a fresh Gmail sync"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
