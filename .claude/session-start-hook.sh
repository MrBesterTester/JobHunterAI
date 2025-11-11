#!/bin/bash

# Session Start Hook - Switch to Personal Development Database
# This hook runs at the start of every Claude Code session
#
# IMPORTANT (ISSUE-040): Single-database architecture
# - All development and E2E testing uses jobhunter_personal
# - E2E tests use seed-test-data.sh --truncate (with automatic backup)
# - Use restore-from-backup.sh to recover from test runs
# - The jobhunter_dev database is deprecated

set -e

# Read hook input from stdin
input=$(cat)

# Extract source to determine if this is a new session or resume
source=$(echo "$input" | python3 -c "import sys, json; print(json.load(sys.stdin).get('source', 'unknown'))" 2>/dev/null || echo "unknown")

# Run switch-to-personal.sh script and capture output
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Change to project root to ensure consistent working directory
cd "${SCRIPT_DIR}"

SWITCH_OUTPUT=$("${SCRIPT_DIR}/switch-to-personal.sh" 2>&1)

# Get current database from .env file
ENV_FILE="${SCRIPT_DIR}/backend/.env"
DB_URL=$(grep "^DATABASE_URL=" "${ENV_FILE}" | cut -d'=' -f2 || echo "unknown")
DB_NAME=$(echo "$DB_URL" | sed 's|.*@localhost/||')

# Create user-visible message
USER_MESSAGE="🔒 Database: Using personal development database: ${DB_NAME}"

# Echo to terminal (stderr) so user sees it
echo "" >&2
echo "=== SessionStart Hook ===" >&2
echo "$USER_MESSAGE" >&2

# Check for orphaned processes from previous session (non-interactive check)
orphaned_node=$(pgrep -f "node.*vitest|vitest.*node" 2>/dev/null | wc -l | xargs)
orphaned_bash=$(pgrep -f "claude.*bash|bash.*claude" 2>/dev/null | wc -l | xargs)

if [ "$orphaned_node" -gt 0 ] || [ "$orphaned_bash" -gt 0 ]; then
    echo "" >&2
    echo "Cleaning up orphaned processes from previous session:" >&2
    echo "  Node/Vitest: $orphaned_node, Claude bash: $orphaned_bash" >&2

    # Kill orphaned processes (non-interactive)
    pkill -f "node.*vitest|vitest.*node" 2>/dev/null || true
    pkill -f "claude.*bash|bash.*claude" 2>/dev/null || true

    sleep 1
    echo "✅ Cleanup complete" >&2
fi

echo "========================" >&2
echo "" >&2

# Output JSON for Claude Code using Python for proper JSON encoding
# Pass variables via environment to avoid quoting issues
export HOOK_DB_NAME="${DB_NAME}"
export HOOK_SWITCH_OUTPUT="${SWITCH_OUTPUT}"

python3 <<'PYTHON_EOF'
import json
import os

db_name = os.environ.get('HOOK_DB_NAME', 'unknown')

# Keep context minimal for compact mode compatibility
context = f"Database: Using personal development database `{db_name}`"

output = {
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": context
    }
}

print(json.dumps(output))
PYTHON_EOF
