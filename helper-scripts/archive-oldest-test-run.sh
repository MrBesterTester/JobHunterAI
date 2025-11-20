#!/bin/bash

# archive-oldest-test-run.sh - Archive oldest test run from TESTING_STATUS.md
# Usage: ./helper-scripts/archive-oldest-test-run.sh [--dry-run]
#
# This script:
# 1. Checks if TESTING_STATUS.md has 2+ test runs
# 2. Extracts the oldest run section
# 3. Creates archive file: testing-history/TEST_STATUS_YYYY-MM-DD_HHMM.md
# 4. Updates testing-history/README.md index
# 5. Removes oldest run from TESTING_STATUS.md
# 6. Stages files for commit (but doesn't commit - user should review)
#
# Options:
#   --dry-run    Show what would be done without making changes

set -e

# Find the project root (one level up from helper-scripts)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
DRY_RUN=false
if [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
    echo -e "${BLUE}🔍 DRY RUN MODE - No changes will be made${NC}\n"
fi

TESTING_STATUS="docs/TESTING_STATUS.md"
TESTING_HISTORY_DIR="testing-history"
HISTORY_INDEX="$TESTING_HISTORY_DIR/README.md"

# Check if TESTING_STATUS.md exists
if [ ! -f "$TESTING_STATUS" ]; then
    echo -e "${RED}❌ Error: $TESTING_STATUS not found${NC}"
    exit 1
fi

# Check if testing-history/ exists
if [ ! -d "$TESTING_HISTORY_DIR" ]; then
    echo -e "${RED}❌ Error: $TESTING_HISTORY_DIR/ directory not found${NC}"
    exit 1
fi

# Count test runs
RUN_COUNT=$(grep -c "^\*\*Run Date\*\*:" "$TESTING_STATUS" || true)

echo -e "${BLUE}📊 Current state:${NC}"
echo -e "   Test runs in TESTING_STATUS.md: ${GREEN}$RUN_COUNT${NC}"

# Check if archival is needed
if [ "$RUN_COUNT" -lt 2 ]; then
    echo -e "${GREEN}✅ No archival needed (less than 2 runs)${NC}"
    exit 0
fi

echo -e "${YELLOW}⚠️  Archival required (2+ runs found)${NC}\n"

# Find all run dates with line numbers
echo -e "${BLUE}📅 Finding run dates...${NC}"
RUN_DATES=$(grep -n "^\*\*Run Date\*\*:" "$TESTING_STATUS")

echo "$RUN_DATES" | while IFS=: read -r line_num content; do
    echo -e "   Line $line_num: ${YELLOW}$content${NC}"
done
echo ""

# Get the LAST (oldest) run date line number and content
# (They appear in reverse chronological order, so last = oldest)
OLDEST_LINE=$(echo "$RUN_DATES" | tail -1 | cut -d: -f1)
# Extract timestamp using sed (compatible with macOS BSD grep)
OLDEST_RUN_DATE=$(echo "$RUN_DATES" | tail -1 | cut -d: -f2- | sed -E 's/.*([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}).*/\1/')

echo -e "${BLUE}🗄️  Oldest run to archive:${NC}"
echo -e "   Date: ${GREEN}$OLDEST_RUN_DATE${NC}"
echo -e "   Line: ${GREEN}$OLDEST_LINE${NC}\n"

# Convert timestamp to filename format (YYYY-MM-DD_HHMM)
# Example: "2025-11-19 01:36:18 PST" -> "2025-11-19_0136"
FILE_DATE=$(echo "$OLDEST_RUN_DATE" | cut -d' ' -f1)  # 2025-11-19
FILE_TIME=$(echo "$OLDEST_RUN_DATE" | cut -d' ' -f2 | cut -d: -f1-2 | tr -d ':')  # 0136
ARCHIVE_FILENAME="TEST_STATUS_${FILE_DATE}_${FILE_TIME}.md"
ARCHIVE_PATH="$TESTING_HISTORY_DIR/$ARCHIVE_FILENAME"

echo -e "${BLUE}📝 Archive file:${NC}"
echo -e "   ${GREEN}$ARCHIVE_PATH${NC}\n"

# ============================================================================
# EXTRACT SECTION
# ============================================================================
# Strategy: Find the section containing the oldest run date and extract it
# We need to find:
# 1. The heading before this run date (likely "## Latest Comprehensive Test Run" or similar)
# 2. The next major section heading (##) after this run date
# ============================================================================

echo -e "${BLUE}📄 Extracting oldest run section...${NC}"

# Find the heading that precedes the oldest run date
# Look backwards from OLDEST_LINE for the nearest "## " heading
SECTION_START=$(awk -v target="$OLDEST_LINE" '
    NR < target && /^## / {
        last_heading = NR
    }
    END {
        print last_heading
    }
' "$TESTING_STATUS")

if [ -z "$SECTION_START" ]; then
    echo -e "${RED}❌ Error: Could not find section start${NC}"
    exit 1
fi

# Find the next major heading after OLDEST_LINE
# This is where the section ends
SECTION_END=$(awk -v target="$OLDEST_LINE" '
    NR > target && /^## / {
        print NR - 1
        exit
    }
' "$TESTING_STATUS")

if [ -z "$SECTION_END" ]; then
    # If no next section found, go to end of file
    SECTION_END=$(wc -l < "$TESTING_STATUS")
fi

echo -e "   Section lines: ${GREEN}$SECTION_START - $SECTION_END${NC}"
SECTION_LINES=$((SECTION_END - SECTION_START + 1))
echo -e "   Total lines: ${GREEN}$SECTION_LINES${NC}\n"

# Extract the section
SECTION_CONTENT=$(sed -n "${SECTION_START},${SECTION_END}p" "$TESTING_STATUS")

# ============================================================================
# CREATE ARCHIVE FILE
# ============================================================================

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN] Would create: $ARCHIVE_PATH${NC}"
    echo -e "${YELLOW}[DRY RUN] Content preview (first 20 lines):${NC}"
    echo "$SECTION_CONTENT" | head -20
    echo -e "${YELLOW}[DRY RUN] ... (${SECTION_LINES} total lines)${NC}\n"
else
    # Create archive file with frontmatter
    cat > "$ARCHIVE_PATH" <<EOF
---
archived_from: TESTING_STATUS.md
archive_date: $(date "+%Y-%m-%d %H:%M:%S %Z")
original_run_date: $OLDEST_RUN_DATE PST
---

# Archived Test Run - $OLDEST_RUN_DATE PST

**Note**: This test run was archived from TESTING_STATUS.md to maintain the 2-run limit.

---

$SECTION_CONTENT
EOF

    echo -e "${GREEN}✅ Created archive file: $ARCHIVE_PATH${NC}"
    echo -e "   Lines: ${GREEN}$(wc -l < "$ARCHIVE_PATH")${NC}\n"
fi

# ============================================================================
# UPDATE TESTING HISTORY INDEX
# ============================================================================

echo -e "${BLUE}📇 Updating testing-history/README.md index...${NC}"

# Find the line number for the month section (e.g., "### November 2025")
MONTH=$(date -d "$FILE_DATE" "+%B %Y" 2>/dev/null || date -jf "%Y-%m-%d" "$FILE_DATE" "+%B %Y")
MONTH_SECTION="### $MONTH"

# Check if month section exists in index
if grep -q "^$MONTH_SECTION$" "$HISTORY_INDEX"; then
    echo -e "   Month section found: ${GREEN}$MONTH_SECTION${NC}"

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN] Would add entry to $MONTH_SECTION${NC}\n"
    else
        # Add new entry after the month heading
        # Find the line after the month heading and insert there
        MONTH_LINE=$(grep -n "^$MONTH_SECTION$" "$HISTORY_INDEX" | cut -d: -f1)
        INSERT_LINE=$((MONTH_LINE + 1))

        # Create the index entry
        INDEX_ENTRY="- **[$ARCHIVE_FILENAME]($ARCHIVE_FILENAME)** - $OLDEST_RUN_DATE PST"

        # Insert the entry (using sed)
        # First check if there's already a "*(No individual archived runs yet" line to replace
        if sed -n "${INSERT_LINE}p" "$HISTORY_INDEX" | grep -q "^\*(No individual archived runs yet"; then
            # Replace the placeholder line
            sed -i.bak "${INSERT_LINE}s|.*|$INDEX_ENTRY|" "$HISTORY_INDEX"
        else
            # Insert new line after month heading
            sed -i.bak "${INSERT_LINE}i\\
$INDEX_ENTRY
" "$HISTORY_INDEX"
        fi

        rm -f "$HISTORY_INDEX.bak"

        echo -e "${GREEN}✅ Updated index with new entry${NC}\n"
    fi
else
    echo -e "${YELLOW}⚠️  Month section not found: $MONTH_SECTION${NC}"
    echo -e "${YELLOW}   You may need to manually add this section to $HISTORY_INDEX${NC}\n"
fi

# ============================================================================
# REMOVE OLDEST RUN FROM TESTING_STATUS.md
# ============================================================================

echo -e "${BLUE}🗑️  Removing oldest run from TESTING_STATUS.md...${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN] Would remove lines $SECTION_START - $SECTION_END${NC}\n"
else
    # Remove the section
    sed -i.bak "${SECTION_START},${SECTION_END}d" "$TESTING_STATUS"
    rm -f "$TESTING_STATUS.bak"

    echo -e "${GREEN}✅ Removed lines $SECTION_START - $SECTION_END from TESTING_STATUS.md${NC}\n"
fi

# ============================================================================
# UPDATE RUN COUNT IN INDEX
# ============================================================================

echo -e "${BLUE}📊 Updating archived run count in index...${NC}"

if [ "$DRY_RUN" = false ]; then
    # Count archive files (exclude legacy and README)
    ARCHIVE_COUNT=$(find "$TESTING_HISTORY_DIR" -name "TEST_STATUS_*.md" | wc -l | tr -d ' ')

    # Update the "Total Archived Runs" line in README
    sed -i.bak "s/^\*\*Total Archived Runs\*\*:.*/\*\*Total Archived Runs\*\*: $ARCHIVE_COUNT individual runs + 1 legacy comprehensive archive/" "$HISTORY_INDEX"
    rm -f "$HISTORY_INDEX.bak"

    echo -e "${GREEN}✅ Updated archived run count to: $ARCHIVE_COUNT${NC}\n"
fi

# ============================================================================
# STAGE FILES FOR COMMIT
# ============================================================================

if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}📋 Summary of changes (dry run):${NC}"
    echo -e "   Would create: ${GREEN}$ARCHIVE_PATH${NC}"
    echo -e "   Would update: ${GREEN}$HISTORY_INDEX${NC}"
    echo -e "   Would update: ${GREEN}$TESTING_STATUS${NC}"
    echo -e "\n${YELLOW}No changes made (dry run mode)${NC}"
else
    echo -e "${BLUE}📋 Staging files for commit...${NC}"
    git add "$ARCHIVE_PATH" "$HISTORY_INDEX" "$TESTING_STATUS"

    echo -e "${GREEN}✅ Files staged successfully${NC}\n"

    echo -e "${BLUE}📋 Summary:${NC}"
    echo -e "   ✅ Created: ${GREEN}$ARCHIVE_PATH${NC}"
    echo -e "   ✅ Updated: ${GREEN}$HISTORY_INDEX${NC}"
    echo -e "   ✅ Updated: ${GREEN}$TESTING_STATUS${NC}"
    echo -e "\n${GREEN}✅ Archival complete!${NC}"
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo -e "   1. Review changes: ${BLUE}git diff --staged${NC}"
    echo -e "   2. Commit: ${BLUE}git commit -m \"docs: Archive test run ($OLDEST_RUN_DATE PST) to testing-history\"${NC}"
fi
