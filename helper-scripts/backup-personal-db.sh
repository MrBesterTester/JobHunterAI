#!/bin/bash

# Backup Personal Database
# Creates timestamped backups of your personal jobhunter database

set -e

DB_NAME="jobhunter_personal"
DB_USER="jobhunter_user"
BACKUP_DIR="./database/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql"

echo "💾 Backing up Personal Database..."
echo ""

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "📦 Creating backup: ${BACKUP_FILE}"
pg_dump -U ${DB_USER} -d ${DB_NAME} -F p -f "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    # Compress the backup
    gzip "${BACKUP_FILE}"
    BACKUP_FILE="${BACKUP_FILE}.gz"

    FILE_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')

    echo "✅ Backup complete!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📁 Backup location: ${BACKUP_FILE}"
    echo "📊 Size: ${FILE_SIZE}"
    echo ""
    echo "To restore this backup:"
    echo "  gunzip -c ${BACKUP_FILE} | psql -U ${DB_USER} -d ${DB_NAME}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Show last 5 backups
    echo ""
    echo "Recent backups:"
    ls -lht "${BACKUP_DIR}" | head -6 | tail -5
else
    echo "❌ Backup failed!"
    exit 1
fi
