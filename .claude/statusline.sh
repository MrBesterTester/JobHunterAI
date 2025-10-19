#!/bin/bash

# Extract database name from backend/.env file
ENV_FILE="$(dirname "$0")/../backend/.env"

if [ -f "$ENV_FILE" ]; then
    DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2)
    DB_NAME=$(echo "$DB_URL" | sed 's|.*@localhost/||')
    echo "🔒 Database: $DB_NAME"
else
    echo "⚠️ Database: unknown"
fi
