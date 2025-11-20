#!/bin/bash
# Check if comprehensive test suite has completed
# Usage: ./helper-scripts/check-test-completion.sh
#
# Returns:
#   0 - Tests completed (marker file exists)
#   1 - Tests still running or not started (marker file missing)

set -e

MARKER_FILE="/tmp/test-run-complete.json"

if [ -f "$MARKER_FILE" ]; then
    echo "✅ Comprehensive test suite COMPLETED!"
    echo ""

    # Pretty-print the JSON metadata
    if command -v python3 &> /dev/null; then
        cat "$MARKER_FILE" | python3 -m json.tool
    else
        cat "$MARKER_FILE"
    fi

    echo ""
    exit 0
else
    echo "⏳ Comprehensive test suite still running (or not started)"
    echo ""
    echo "Marker file not found: $MARKER_FILE"
    echo ""
    echo "If tests have been running for >25 minutes, check for issues:"
    echo "  - Run: ./helper-scripts/system-health-check.sh"
    echo "  - Check processes: ps aux | grep -E 'playwright|cargo|npm'"
    exit 1
fi
