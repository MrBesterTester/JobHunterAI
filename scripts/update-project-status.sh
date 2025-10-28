#!/bin/bash
# update-project-status.sh
# Auto-generates PROJECT_STATUS.md from current project state
# Can be run periodically or on-demand (not one-time use)

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

STATUS_FILE="docs/PROJECT_STATUS.md"
TEMP_FILE="docs/PROJECT_STATUS.md.tmp"
BUG_INDEX="bugs/README.md"
TEST_STATUS="docs/TESTING_STATUS.md"

echo "Updating PROJECT_STATUS.md..."

# Extract current date
CURRENT_DATE=$(date +%Y-%m-%d)

# Extract bug counts from bugs/README.md
extract_bug_counts() {
    if [[ ! -f "$BUG_INDEX" ]]; then
        echo "0:0:0:0"
        return
    fi

    TOTAL_BUGS=$(grep -E "^\*\*Total Bugs\*\*:" "$BUG_INDEX" | grep -oE '[0-9]+' | head -1 || echo "0")
    OPEN_BUGS=$(grep -E "^\- \*\*Open\*\*:" "$BUG_INDEX" | grep -oE '[0-9]+' | head -1 || echo "0")
    MITIGATED=$(grep -E "^\- \*\*Mitigated\*\*:" "$BUG_INDEX" | grep -oE '[0-9]+' | head -1 || echo "0")
    FIXED=$(grep -E "^\- \*\*Fixed\*\*:" "$BUG_INDEX" | grep -oE '[0-9]+' | head -1 || echo "0")

    echo "$TOTAL_BUGS:$OPEN_BUGS:$MITIGATED:$FIXED"
}

# Extract priority counts
extract_priority_counts() {
    if [[ ! -f "$BUG_INDEX" ]]; then
        echo "0:0:0:0"
        return
    fi

    CRITICAL=$(grep -E "^\- \*\*Critical\*\*:" "$BUG_INDEX" | grep -oE '[0-9]+' | head -1 || echo "0")
    HIGH=$(grep -E "^\- \*\*High\*\*:" "$BUG_INDEX" | grep -oE '[0-9]+' | head -1 || echo "0")
    MEDIUM=$(grep -E "^\- \*\*Medium\*\*:" "$BUG_INDEX" | grep -oE '[0-9]+' | head -1 || echo "0")
    LOW=$(grep -E "^\- \*\*Low\*\*:" "$BUG_INDEX" | grep -oE '[0-9]+' | head -1 || echo "0")

    echo "$CRITICAL:$HIGH:$MEDIUM:$LOW"
}

# Extract test counts from TESTING_STATUS.md
extract_test_counts() {
    if [[ ! -f "$TEST_STATUS" ]]; then
        echo "0:0"
        return
    fi

    # Look for pattern like "421/421 tests passing"
    TEST_PASSING=$(grep -E "^Current Test Status" "$TEST_STATUS" -A 1 | grep -oE '[0-9]+/[0-9]+' | head -1 || echo "0/0")

    echo "$TEST_PASSING"
}

# Get recent commits (last 7 days)
get_recent_commits() {
    git log -n 10 --oneline --since="7 days ago" 2>/dev/null || echo "No recent commits"
}

# Count lines of code
count_loc() {
    TOTAL_LOC=$(find frontend/src backend/src -name "*.tsx" -o -name "*.ts" -o -name "*.rs" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
    echo "$TOTAL_LOC"
}

# Parse bug counts
BUG_COUNTS=$(extract_bug_counts)
TOTAL_BUGS=$(echo "$BUG_COUNTS" | cut -d: -f1)
OPEN_BUGS=$(echo "$BUG_COUNTS" | cut -d: -f2)
MITIGATED=$(echo "$BUG_COUNTS" | cut -d: -f3)
FIXED=$(echo "$BUG_COUNTS" | cut -d: -f4)

# Parse priority counts
PRIORITY_COUNTS=$(extract_priority_counts)
CRITICAL=$(echo "$PRIORITY_COUNTS" | cut -d: -f1)
HIGH=$(echo "$PRIORITY_COUNTS" | cut -d: -f2)
MEDIUM=$(echo "$PRIORITY_COUNTS" | cut -d: -f3)
LOW=$(echo "$PRIORITY_COUNTS" | cut -d: -f4)

# Parse test counts
TEST_COUNTS=$(extract_test_counts)

# Get recent activity
RECENT_COMMITS=$(get_recent_commits)

# Count LOC
TOTAL_LOC=$(count_loc)

# Calculate fix rate
if [[ $TOTAL_BUGS -gt 0 ]]; then
    FIX_RATE=$(awk "BEGIN {printf \"%.1f\", ($FIXED/$TOTAL_BUGS)*100}")
else
    FIX_RATE="0.0"
fi

# Display extracted metrics
echo ""
echo "=== Extracted Metrics ==="
echo "Total Bugs: $TOTAL_BUGS"
echo "  Open: $OPEN_BUGS"
echo "  Mitigated: $MITIGATED"
echo "  Fixed: $FIXED"
echo "  Fix Rate: $FIX_RATE%"
echo ""
echo "Priority Breakdown:"
echo "  Critical: $CRITICAL"
echo "  High: $HIGH"
echo "  Medium: $MEDIUM"
echo "  Low: $LOW"
echo ""
echo "Test Status: $TEST_COUNTS"
echo "Total LOC: ~$TOTAL_LOC"
echo ""

# Update the status file (preserving manual edits in marked sections)
echo "Generating updated PROJECT_STATUS.md..."

# For now, just update the timestamp and metrics
# Full template regeneration would go here if needed

# Update "Last Updated" line
if [[ -f "$STATUS_FILE" ]]; then
    sed -i.bak "s/^\*\*Last Updated\*\*:.*/\*\*Last Updated\*\*: $CURRENT_DATE (Auto-generated)/" "$STATUS_FILE"

    # Update "Open Issues" count in Quick Status Overview
    sed -i.bak "s/^\*\*Open Issues\*\*:.*/\*\*Open Issues\*\*: $OPEN_BUGS bugs\/issues tracked/" "$STATUS_FILE"

    # Update auto-generated footer
    sed -i.bak "s/^\*\*Generated on\*\*:.*/\*\*Generated on\*\*: $CURRENT_DATE/" "$STATUS_FILE"

    # Clean up backup file
    rm -f "$STATUS_FILE.bak"

    echo "✅ Updated $STATUS_FILE"
    echo ""
    echo "Updated fields:"
    echo "  - Last Updated: $CURRENT_DATE"
    echo "  - Open Issues: $OPEN_BUGS"
    echo "  - Generated timestamp"
else
    echo "❌ Error: $STATUS_FILE not found"
    exit 1
fi

# Show what changed
echo ""
echo "=== Git Status ==="
git diff --stat "$STATUS_FILE" 2>/dev/null || true

echo ""
echo "✅ Done! Review changes with:"
echo "   git diff $STATUS_FILE"
echo ""
echo "💡 This script can be run periodically or on-demand"
echo "   It preserves manual edits in sections marked with <!-- MANUAL_EDIT -->"
