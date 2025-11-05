#!/bin/bash

# Restore Personal Database from Backup
# Restores a compressed backup file to jobhunter_personal database
#
# Usage:
#   ./restore-personal-db.sh                    # Interactive mode: select from available backups
#   ./restore-personal-db.sh <backup-file>      # Direct mode: restore specific backup file

set -e

DB_NAME="jobhunter_personal"
DB_USER="jobhunter_user"
BACKUP_DIR="./database/backups"

# Check if backup directory exists
if [ ! -d "${BACKUP_DIR}" ]; then
    echo "❌ Backup directory not found: ${BACKUP_DIR}"
    echo "   No backups available. Run ./backup-personal-db.sh to create one."
    exit 1
fi

# Function to list available backups
list_backups() {
    echo "Available backups:"
    echo ""
    local count=0
    local files=()

    # List all .sql.gz files sorted by date (newest first)
    while IFS= read -r file; do
        if [ -n "$file" ]; then
            count=$((count + 1))
            files+=("$file")
            local size=$(ls -lh "$file" | awk '{print $5}')
            local date=$(basename "$file" | sed -E 's/jobhunter_personal_([0-9]{8}_[0-9]{6})\.sql\.gz/\1/' | sed 's/_/ /')
            printf "  %2d) %s  (%s)\n" "$count" "$date" "$size"
        fi
    done < <(ls -t "${BACKUP_DIR}"/jobhunter_personal_*.sql.gz 2>/dev/null)

    if [ $count -eq 0 ]; then
        echo "  No backups found in ${BACKUP_DIR}"
        echo ""
        echo "Run ./backup-personal-db.sh to create a backup first."
        exit 1
    fi

    echo ""
    echo "${files[@]}"  # Return array as space-separated string
}

# Check if backup file was provided as argument
if [ $# -eq 1 ]; then
    BACKUP_FILE="$1"

    # Check if file exists
    if [ ! -f "${BACKUP_FILE}" ]; then
        echo "❌ Backup file not found: ${BACKUP_FILE}"
        exit 1
    fi

    MODE="direct"
else
    # Interactive mode - list backups and let user choose
    MODE="interactive"

    echo "💾 Restore Personal Database"
    echo ""

    # Get list of backup files
    backup_list=$(list_backups)

    # Split the output - last line contains file paths, everything else is display
    readarray -t lines <<< "$backup_list"

    # Last line has the file paths
    IFS=' ' read -ra backup_files <<< "${lines[-1]}"

    # Display lines (all but last)
    for ((i=0; i<${#lines[@]}-1; i++)); do
        echo "${lines[$i]}"
    done

    # Get user selection
    read -p "Select backup to restore (1-${#backup_files[@]}, or 'q' to quit): " selection

    if [ "$selection" = "q" ] || [ "$selection" = "Q" ]; then
        echo "❌ Cancelled."
        exit 0
    fi

    # Validate selection
    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#backup_files[@]} ]; then
        echo "❌ Invalid selection: $selection"
        exit 1
    fi

    # Get the selected file (arrays are 0-indexed, user selection is 1-indexed)
    BACKUP_FILE="${backup_files[$((selection-1))]}"
fi

echo ""
echo "🔄 Restoring from backup..."
echo "   Backup: $(basename ${BACKUP_FILE})"
echo "   Target: ${DB_NAME}"
echo ""
echo "⚠️  WARNING: This will DELETE ALL CURRENT DATA in ${DB_NAME}!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Restore cancelled."
    exit 0
fi

echo ""
echo "📦 Dropping existing database..."
psql -U postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" || {
    echo "❌ Failed to drop database. Is it in use?"
    echo "   Try stopping the backend server first."
    exit 1
}

echo "✅ Database dropped"
echo ""

echo "🔨 Creating fresh database..."
psql -U postgres -c "CREATE DATABASE ${DB_NAME};"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
echo "✅ Database created"
echo ""

echo "📥 Restoring data from backup..."
gunzip -c "${BACKUP_FILE}" | psql -U ${DB_USER} -d ${DB_NAME} -q

if [ $? -eq 0 ]; then
    echo "✅ Data restored successfully"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✨ Database restore complete!"
    echo ""
    echo "Database: ${DB_NAME}"
    echo "Restored from: $(basename ${BACKUP_FILE})"
    echo ""
    echo "⚠️  Note: Restart backend server for changes to take effect"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo "❌ Restore failed!"
    exit 1
fi
