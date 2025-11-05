#!/bin/bash

# Switch to Development Database
# Updates backend/.env to use jobhunter_dev database

set -e

ENV_FILE="./backend/.env"
DEV_DB_URL="postgresql://jobhunter_user:jobhunter_dev_password@localhost/jobhunter_dev"

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
