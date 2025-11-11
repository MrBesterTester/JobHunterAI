#!/bin/bash

# Switch to Development Database
# Updates backend/.env to use jobhunter_dev database
#
# ⚠️  DEPRECATED (ISSUE-040): This script is deprecated.
# The project now uses a single-database architecture with jobhunter_personal.
# - E2E tests run against jobhunter_personal (uses seed-test-data.sh --truncate with automatic backup)
# - Use restore-from-backup.sh to recover from test runs
# - The jobhunter_dev database is no longer used
#
# This script remains for backward compatibility only.
# See ISSUE-040 for full details: bugs/fixed/ISSUE-040-database-architecture-simplification...

set -e

ENV_FILE="./backend/.env"
DEV_DB_URL="postgresql://jobhunter_user:jobhunter_dev_password@localhost/jobhunter_dev"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  DEPRECATION WARNING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This script is deprecated (ISSUE-040)."
echo "The project now uses jobhunter_personal for all development and testing."
echo ""
echo "To seed test data: ./helper-scripts/seed-test-data.sh --truncate"
echo "To restore backup: ./helper-scripts/restore-from-backup.sh"
echo ""
echo "Press Ctrl+C to cancel, or Enter to continue anyway..."
read -r
echo ""
echo "🔄 Switching to Development Database..."
echo ""

# Check if .env exists
if [ ! -f "${ENV_FILE}" ]; then
    echo "❌ ${ENV_FILE} not found!"
    echo "Creating from .env.example..."
    cp ./backend/.env.example "${ENV_FILE}"
fi

# Backup current .env
cp "${ENV_FILE}" "${ENV_FILE}.backup"

# Update DATABASE_URL
if grep -q "^DATABASE_URL=" "${ENV_FILE}"; then
    # Update existing line
    sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=${DEV_DB_URL}|" "${ENV_FILE}"
    rm "${ENV_FILE}.bak"
else
    # Add new line
    echo "DATABASE_URL=${DEV_DB_URL}" >> "${ENV_FILE}"
fi

echo "✅ Switched to development database"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Active database: jobhunter_dev"
echo "📁 Config file: ${ENV_FILE}"
echo ""
echo "⚠️  Note: Restart backend server for changes to take effect"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
