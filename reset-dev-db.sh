#!/bin/bash

# Reset Development Database with Test Data
# WARNING: This will DROP and RECREATE the jobhunter_dev database!

set -e

echo "🗑️  Resetting Development Database..."
echo ""
echo "⚠️  WARNING: This will DELETE ALL DATA in jobhunter_dev!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted."
    exit 0
fi

DB_NAME="jobhunter_dev"
DB_USER="jobhunter_user"

echo ""
echo "🔄 Dropping database ${DB_NAME}..."
psql -U postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" || {
    echo "❌ Failed to drop database. Is it in use?"
    exit 1
}

echo "✅ Database dropped"
echo ""

echo "🔨 Creating fresh database ${DB_NAME}..."
psql -U postgres -c "CREATE DATABASE ${DB_NAME};"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
echo "✅ Database created"
echo ""

echo "📊 Loading schema..."
psql -U ${DB_USER} -d ${DB_NAME} -f database/schema.sql
echo "✅ Schema loaded"
echo ""

echo "🔄 Running Phase 5.1 migration..."
psql -U ${DB_USER} -d ${DB_NAME} -f database/migration_phase5.1.sql
echo "✅ Migration applied"
echo ""

echo "🌱 Loading test seed data..."
psql -U ${DB_USER} -d ${DB_NAME} -f database/test-seed-data.sql
echo "✅ Test seed data loaded"
echo ""

echo "🌱 Loading extended test data..."
psql -U ${DB_USER} -d ${DB_NAME} -f database/test-seed-data-extension.sql
echo "✅ Extended test data loaded"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Development database reset complete!"
echo ""
echo "Database: ${DB_NAME}"
echo "To use this database, run: ./switch-to-dev.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
