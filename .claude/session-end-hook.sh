#!/bin/bash

# Session End Hook - Cleanup Orphaned Processes
# This hook runs when Claude Code session ends

set -e

# Read hook input from stdin
input=$(cat)

# Extract reason to understand why session is ending
reason=$(echo "$input" | python3 -c "import sys, json; print(json.load(sys.stdin).get('reason', 'unknown'))" 2>/dev/null || echo "unknown")

# Get project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${SCRIPT_DIR}"

# Echo to terminal so user sees it
echo "" >&2
echo "=== SessionEnd Hook (reason: ${reason}) ===" >&2

# Check for orphaned processes (non-interactive check)
orphaned_node=$(pgrep -f "node.*vitest|vitest.*node" 2>/dev/null | wc -l | xargs)
orphaned_bash=$(pgrep -f "claude.*bash|bash.*claude" 2>/dev/null | wc -l | xargs)

if [ "$orphaned_node" -gt 0 ] || [ "$orphaned_bash" -gt 0 ]; then
    echo "Found orphaned processes:" >&2
    echo "  Node/Vitest: $orphaned_node" >&2
    echo "  Claude bash: $orphaned_bash" >&2
    echo "" >&2
    echo "Cleaning up orphaned processes..." >&2

    # Kill orphaned processes (non-interactive)
    pkill -f "node.*vitest|vitest.*node" 2>/dev/null || true
    pkill -f "claude.*bash|bash.*claude" 2>/dev/null || true

    sleep 1

    echo "✅ Cleanup complete" >&2
else
    echo "✅ No orphaned processes found" >&2
fi

echo "========================================" >&2
echo "" >&2

# Output JSON for Claude Code
python3 <<'PYTHON_EOF'
import json

output = {
    "hookSpecificOutput": {
        "hookEventName": "SessionEnd",
        "additionalContext": "Cleanup completed: checked for orphaned processes"
    }
}

print(json.dumps(output))
PYTHON_EOF
