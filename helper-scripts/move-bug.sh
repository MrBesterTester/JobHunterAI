#!/bin/bash

# move-bug.sh - Move bug between states (open/mitigated/fixed/duplicate)
# Usage: ./move-bug.sh [bug-id] [new-status]
# Examples:
#   ./move-bug.sh BUG-001 fixed
#   ./move-bug.sh ISSUE-019 fixed
#   ./move-bug.sh BUG-002 mitigated
#   ./move-bug.sh ISSUE-058 duplicate

set -e

# Find the project root (parent of directory containing this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 2 ]; then
    echo -e "${RED}❌ Error: Missing arguments${NC}"
    echo ""
    echo "Usage: ./move-bug.sh [bug-id] [new-status]"
    echo ""
    echo "Arguments:"
    echo "  bug-id      Bug identifier (e.g., BUG-001, ISSUE-019)"
    echo "  new-status  Target status: open | mitigated | fixed | duplicate"
    echo ""
    echo "Examples:"
    echo "  ./move-bug.sh BUG-001 fixed"
    echo "  ./move-bug.sh ISSUE-019 mitigated"
    echo "  ./move-bug.sh ISSUE-058 duplicate"
    exit 1
fi

BUG_ID="$1"
NEW_STATUS="$2"

# Validate new status
if [[ ! "$NEW_STATUS" =~ ^(open|mitigated|fixed|duplicate)$ ]]; then
    echo -e "${RED}❌ Error: Invalid status '$NEW_STATUS'${NC}"
    echo "Status must be: open | mitigated | fixed | duplicate"
    exit 1
fi

# Get current date
DATE=$(date +%Y-%m-%d)

# Find the bug file (search all status directories)
BUG_FILE=""
CURRENT_STATUS=""
for status in open mitigated fixed duplicate; do
    if ls bugs/${status}/${BUG_ID}-*.md 1> /dev/null 2>&1; then
        BUG_FILE=$(ls bugs/${status}/${BUG_ID}-*.md)
        CURRENT_STATUS="$status"
        break
    fi
done

# Check if bug was found
if [ -z "$BUG_FILE" ]; then
    echo -e "${RED}❌ Error: Bug '$BUG_ID' not found${NC}"
    echo ""
    echo "Searched in:"
    echo "  - bugs/open/"
    echo "  - bugs/mitigated/"
    echo "  - bugs/fixed/"
    echo "  - bugs/duplicate/"
    echo ""
    echo "Available bugs:"
    ls bugs/open/ bugs/mitigated/ bugs/fixed/ bugs/duplicate/ 2>/dev/null | grep -E "(BUG|ISSUE)-[0-9]+" || echo "  (none found)"
    exit 1
fi

# Check if already in target status
if [ "$CURRENT_STATUS" = "$NEW_STATUS" ]; then
    echo -e "${YELLOW}⚠️  Warning: Bug '$BUG_ID' is already in '$NEW_STATUS' status${NC}"
    echo "Current location: $BUG_FILE"
    exit 0
fi

# Extract filename without path
FILENAME=$(basename "$BUG_FILE")
NEW_FILE="bugs/${NEW_STATUS}/${FILENAME}"

echo -e "${GREEN}📋 Moving bug: $BUG_ID${NC}"
echo "  From: $BUG_FILE"
echo "  To:   $NEW_FILE"
echo ""

# Move the file
mv "$BUG_FILE" "$NEW_FILE"
echo -e "${GREEN}✅ File moved${NC}"

# Update YAML frontmatter
# 1. Update status field
sed -i '' "s/^status: .*/status: $NEW_STATUS/" "$NEW_FILE"

# 2. Update the updated field
sed -i '' "s/^updated: .*/updated: $DATE/" "$NEW_FILE"

# 3. Add fixed/mitigated date if applicable (only if not already present)
if [ "$NEW_STATUS" = "fixed" ]; then
    if ! grep -q "^fixed:" "$NEW_FILE"; then
        # Insert fixed date after updated line
        sed -i '' "/^updated:/a\\
fixed: $DATE
" "$NEW_FILE"
    else
        # Update existing fixed date
        sed -i '' "s/^fixed: .*/fixed: $DATE/" "$NEW_FILE"
    fi
elif [ "$NEW_STATUS" = "mitigated" ]; then
    if ! grep -q "^mitigated:" "$NEW_FILE"; then
        # Insert mitigated date after updated line
        sed -i '' "/^updated:/a\\
mitigated: $DATE
" "$NEW_FILE"
    else
        # Update existing mitigated date
        sed -i '' "s/^mitigated: .*/mitigated: $DATE/" "$NEW_FILE"
    fi
fi

echo -e "${GREEN}✅ YAML frontmatter updated${NC}"
echo "  - status: $NEW_STATUS"
echo "  - updated: $DATE"
if [ "$NEW_STATUS" = "fixed" ] || [ "$NEW_STATUS" = "mitigated" ]; then
    echo "  - $NEW_STATUS: $DATE"
fi
echo ""

# Regenerate bug index
echo -e "${YELLOW}🔄 Regenerating bug index...${NC}"
"$SCRIPT_DIR/regenerate-bug-index.sh"
echo -e "${GREEN}✅ Bug index regenerated${NC}"
echo ""

# Stage changes (both the deletion of old file and addition of new file)
git add "$BUG_FILE" "$NEW_FILE" bugs/README.md
echo -e "${GREEN}✅ Changes staged for commit${NC}"
echo ""

# Show git status
echo -e "${YELLOW}📊 Git status:${NC}"
git status --short
echo ""

# Suggest commit message
echo -e "${GREEN}✅ Done! Bug moved successfully.${NC}"
echo ""
echo "Suggested commit command:"
echo -e "${YELLOW}git commit -m \"docs: Move $BUG_ID to $NEW_STATUS status\"${NC}"
