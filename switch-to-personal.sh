#!/bin/bash

# Switch to Personal Database
# Updates backend/.env to use jobhunter_personal database

set -e

ENV_FILE="./backend/.env"
PERSONAL_DB_URL="postgresql://jobhunter_user:jobhunter_dev_password@localhost/jobhunter_personal"

echo "🔄 Switching to Personal Database..."
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
    sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=${PERSONAL_DB_URL}|" "${ENV_FILE}"
    rm "${ENV_FILE}.bak"
else
    # Add new line
    echo "DATABASE_URL=${PERSONAL_DB_URL}" >> "${ENV_FILE}"
fi

echo "✅ Switched to personal database"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 Active database: jobhunter_personal"
echo "📁 Config file: ${ENV_FILE}"
echo ""
echo "⚠️  Note: Restart backend server for changes to take effect"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
