#!/bin/bash

# Session Start Hook - Switch to Personal Development Database
# This hook runs at the start of every Claude Code session

set -e

# Read hook input from stdin
input=$(cat)

# Extract source to determine if this is a new session or resume
source=$(echo "$input" | python3 -c "import sys, json; print(json.load(sys.stdin).get('source', 'unknown'))" 2>/dev/null || echo "unknown")

# Run switch-to-personal.sh script and capture output
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SWITCH_OUTPUT=$("${SCRIPT_DIR}/switch-to-personal.sh" 2>&1)

# Get current database from .env file
ENV_FILE="${SCRIPT_DIR}/backend/.env"
DB_URL=$(grep "^DATABASE_URL=" "${ENV_FILE}" | cut -d'=' -f2 || echo "unknown")
DB_NAME=$(echo "$DB_URL" | sed 's|.*@localhost/||')

# Create context message for Claude (includes the switch script output)
CONTEXT="🔒 **Database Configuration**: Using personal development database: \`${DB_NAME}\`

All database operations in this session will use the personal database, not the shared development database.

**Switch Script Output:**
\`\`\`
${SWITCH_OUTPUT}
\`\`\`"

# Create user-visible message
USER_MESSAGE="🔒 Database: Using personal development database: ${DB_NAME}"

# Echo to terminal (stderr) so user sees it
echo "" >&2
echo "=== SessionStart Hook ===" >&2
echo "$USER_MESSAGE" >&2
echo "========================" >&2
echo "" >&2

# Output JSON for Claude Code
cat <<EOF
{
  "systemMessage": "$USER_MESSAGE",
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "$CONTEXT"
  }
}
EOF
