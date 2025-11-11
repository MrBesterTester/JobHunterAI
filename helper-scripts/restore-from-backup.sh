#!/bin/bash

# =====================================================
# Database Backup Restore Script
# =====================================================
# Restores jobhunter_personal database from a backup
# created by seed-test-data.sh --truncate
#
# IMPORTANT: Part of single-database architecture (ISSUE-040)
# - Automatically restores the most recent backup
# - Can specify a specific backup file
# - Lists all available backups
#
# Usage:
#   ./helper-scripts/restore-from-backup.sh                # Restore most recent
#   ./helper-scripts/restore-from-backup.sh --list         # List all backups
#   ./helper-scripts/restore-from-backup.sh --file PATH    # Restore specific backup
# =====================================================

set -e  # Exit on error

DATABASE_NAME="jobhunter_personal"
BACKUP_DIR="/tmp/jobhunter_backups"
LAST_BACKUP_FILE="/tmp/jobhunter_last_backup.txt"

# Parse arguments
LIST_ONLY=false
BACKUP_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --list)
            LIST_ONLY=true
            shift
            ;;
        --file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo ""
            echo "Usage: $0 [--list] [--file PATH]"
            echo ""
            echo "Options:"
            echo "  --list         List all available backups"
            echo "  --file PATH    Restore from specific backup file"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Restore most recent backup"
            echo "  $0 --list                             # Show all available backups"
            echo "  $0 --file /tmp/jobhunter_backups/...  # Restore specific backup"
            exit 1
            ;;
    esac
done

echo "======================================"
echo "JobHunter Database Restore"
echo "======================================"
echo ""

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ ERROR: No backup directory found at $BACKUP_DIR"
    echo "   Backups are created when running:"
    echo "   ./helper-scripts/seed-test-data.sh --truncate"
    exit 1
fi

# Count available backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sql 2>/dev/null | wc -l | xargs)
if [ "$BACKUP_COUNT" = "0" ]; then
    echo "❌ ERROR: No backups found in $BACKUP_DIR"
    echo "   Backups are created when running:"
    echo "   ./helper-scripts/seed-test-data.sh --truncate"
    exit 1
fi

# List-only mode
if [ "$LIST_ONLY" = true ]; then
    echo "Available backups ($BACKUP_COUNT found):"
    echo ""
    echo "Backup File                                      | Size   | Date"
    echo "------------------------------------------------|--------|------------------"
    ls -lt "$BACKUP_DIR"/*.sql | while read -r line; do
        # Parse ls -lt output
        PERMS=$(echo "$line" | awk '{print $1}')
        SIZE=$(echo "$line" | awk '{print $5}')
        MONTH=$(echo "$line" | awk '{print $6}')
        DAY=$(echo "$line" | awk '{print $7}')
        TIME=$(echo "$line" | awk '{print $8}')
        FILEPATH=$(echo "$line" | awk '{print $9}')
        FILENAME=$(basename "$FILEPATH")

        # Format size
        if [ "$SIZE" -gt 1048576 ]; then
            SIZE_MB=$(echo "scale=1; $SIZE/1048576" | bc)
            SIZE_STR="${SIZE_MB}MB"
        else
            SIZE_KB=$(echo "scale=1; $SIZE/1024" | bc)
            SIZE_STR="${SIZE_KB}KB"
        fi

        printf "%-48s | %-6s | %s %2s %s\n" "$FILENAME" "$SIZE_STR" "$MONTH" "$DAY" "$TIME"
    done
    echo ""
    echo "To restore a specific backup:"
    echo "  ./helper-scripts/restore-from-backup.sh --file $BACKUP_DIR/[filename]"
    echo ""
    exit 0
fi

# Determine which backup to restore
if [ -n "$BACKUP_FILE" ]; then
    # User specified a backup file
    if [ ! -f "$BACKUP_FILE" ]; then
        echo "❌ ERROR: Backup file not found: $BACKUP_FILE"
        echo ""
        echo "Available backups:"
        ls -lt "$BACKUP_DIR"/*.sql
        exit 1
    fi
else
    # Use most recent backup (from LAST_BACKUP_FILE or latest in directory)
    if [ -f "$LAST_BACKUP_FILE" ]; then
        BACKUP_FILE=$(cat "$LAST_BACKUP_FILE")
        echo "ℹ️  Using most recent backup (from last truncate operation):"
    else
        # Find most recent backup file
        BACKUP_FILE=$(ls -t "$BACKUP_DIR"/*.sql | head -1)
        echo "ℹ️  Using most recent backup file:"
    fi
fi

echo "   $BACKUP_FILE"
echo ""

# Get backup file size and date
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    BACKUP_DATE=$(ls -lh "$BACKUP_FILE" | awk '{print $6, $7, $8}')
    echo "   Size: $BACKUP_SIZE"
    echo "   Date: $BACKUP_DATE"
    echo ""
else
    echo "❌ ERROR: Backup file no longer exists: $BACKUP_FILE"
    echo ""
    echo "Available backups:"
    ls -lt "$BACKUP_DIR"/*.sql
    exit 1
fi

# Verify database connection
echo "Checking database connection..."
if ! psql -U jobhunter_user -d "$DATABASE_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ ERROR: Cannot connect to $DATABASE_NAME database"
    echo "   Make sure PostgreSQL is running"
    exit 1
fi
echo "✅ Database connection OK"
echo ""

# Show current database state
echo "Current database state (before restore):"
psql -U jobhunter_user -d "$DATABASE_NAME" -c "
    SELECT
        'Jobs' as entity,
        COUNT(*) as count
    FROM jobs
    UNION ALL
    SELECT
        'Applications',
        COUNT(*)
    FROM applications
    UNION ALL
    SELECT
        'Job Sources',
        COUNT(*)
    FROM job_sources;
"
echo ""

# Confirm restore
echo "⚠️  WARNING: This will REPLACE ALL DATA in the $DATABASE_NAME database"
echo "   All current jobs, applications, and sources will be deleted"
echo "   Press Ctrl+C to cancel, or Enter to continue..."
read -r
echo ""

# Perform restore
echo "🔄 Restoring database from backup..."
echo "   This may take a few seconds..."
echo ""

# Drop all existing data and restore from backup
if psql -U jobhunter_user -d "$DATABASE_NAME" < "$BACKUP_FILE" > /dev/null 2>&1; then
    echo "✅ Database restored successfully!"
    echo ""

    # Show restored database state
    echo "Restored database state:"
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
        GROUP BY entity;
    "
    echo ""
    echo "======================================"
    echo "✅ Restore complete!"
    echo "======================================"
else
    echo ""
    echo "❌ ERROR: Restore failed"
    echo "   Check the error messages above for details"
    echo "   Your database may be in an inconsistent state"
    exit 1
fi
