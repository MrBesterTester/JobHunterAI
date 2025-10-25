#!/bin/bash

# create-bug.sh - Create a new bug or issue with automated ID assignment
# Usage: ./create-bug.sh [--type bug|issue]
# Examples:
#   ./create-bug.sh                    # Interactive mode (prompts for type)
#   ./create-bug.sh --type bug         # Create a BUG
#   ./create-bug.sh --type issue       # Create an ISSUE

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
TYPE=""
if [ "$1" = "--type" ]; then
    TYPE="$2"
fi

# Prompt for type if not provided
if [ -z "$TYPE" ]; then
    echo -e "${BLUE}📋 Bug Tracking System${NC}"
    echo ""
    echo "What type of item would you like to create?"
    echo ""
    echo "  1) BUG   - Software defect that needs fixing"
    echo "  2) ISSUE - Enhancement, task, or improvement"
    echo ""
    read -p "Enter choice (1 or 2): " choice

    case $choice in
        1) TYPE="bug" ;;
        2) TYPE="issue" ;;
        *)
            echo -e "${RED}❌ Invalid choice. Please enter 1 or 2.${NC}"
            exit 1
            ;;
    esac
fi

# Validate type
TYPE=$(echo "$TYPE" | tr '[:upper:]' '[:lower:]')
if [[ ! "$TYPE" =~ ^(bug|issue)$ ]]; then
    echo -e "${RED}❌ Error: Invalid type '$TYPE'${NC}"
    echo "Type must be: bug | issue"
    exit 1
fi

# Convert to uppercase for display
TYPE_UPPER=$(echo "$TYPE" | tr '[:lower:]' '[:upper:]')

# Determine next ID
echo -e "${YELLOW}🔍 Finding next available ${TYPE_UPPER} ID...${NC}"

# Find highest ID for this type
if [ "$TYPE" = "bug" ]; then
    # BUG uses 4-digit format: BUG-0001, BUG-0002, etc.
    HIGHEST=$(ls bugs/open/ bugs/mitigated/ bugs/fixed/ 2>/dev/null | \
              grep -E "^BUG-[0-9]+" | \
              sed 's/BUG-\([0-9]*\)-.*/\1/' | \
              sort -n | \
              tail -1)

    if [ -z "$HIGHEST" ]; then
        NEXT_NUM=1
    else
        NEXT_NUM=$((10#$HIGHEST + 1))
    fi

    # Format with leading zeros (4 digits)
    NEXT_ID=$(printf "BUG-%04d" $NEXT_NUM)
else
    # ISSUE uses 3-digit format: ISSUE-001, ISSUE-002, etc.
    HIGHEST=$(ls bugs/open/ bugs/mitigated/ bugs/fixed/ 2>/dev/null | \
              grep -E "^ISSUE-[0-9]+" | \
              sed 's/ISSUE-\([0-9]*\)-.*/\1/' | \
              sort -n | \
              tail -1)

    if [ -z "$HIGHEST" ]; then
        NEXT_NUM=1
    else
        NEXT_NUM=$((10#$HIGHEST + 1))
    fi

    # Format with leading zeros (3 digits)
    NEXT_ID=$(printf "ISSUE-%03d" $NEXT_NUM)
fi

echo -e "${GREEN}✅ Next ID: $NEXT_ID${NC}"
echo ""

# Prompt for title
echo -e "${BLUE}📝 Enter a brief title:${NC}"
read -p "Title: " TITLE

if [ -z "$TITLE" ]; then
    echo -e "${RED}❌ Error: Title cannot be empty${NC}"
    exit 1
fi

# Create kebab-case filename
KEBAB_TITLE=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9-]//g')
FILENAME="${NEXT_ID}-${KEBAB_TITLE}.md"
FILEPATH="bugs/open/${FILENAME}"

echo ""
echo -e "${YELLOW}Creating: $FILEPATH${NC}"
echo ""

# Prompt for required fields
echo -e "${BLUE}Priority (low/medium/high/critical):${NC}"
read -p "Priority [medium]: " PRIORITY
PRIORITY=${PRIORITY:-medium}

echo -e "${BLUE}Severity (low/medium/high/critical):${NC}"
read -p "Severity [medium]: " SEVERITY
SEVERITY=${SEVERITY:-medium}

echo -e "${BLUE}Component (frontend/backend/database/infrastructure/docs):${NC}"
read -p "Component [frontend]: " COMPONENT
COMPONENT=${COMPONENT:-frontend}

echo -e "${BLUE}Summary (1-2 sentences):${NC}"
read -p "Summary: " SUMMARY

# Get current date
DATE=$(date +%Y-%m-%d)

# Create the file from template
cat > "$FILEPATH" << EOF
---
id: $NEXT_ID
title: $TITLE
status: open
priority: $PRIORITY
severity: $SEVERITY
component: $COMPONENT
created: $DATE
updated: $DATE
affects: []
related: []
---

# $NEXT_ID: $TITLE

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

$SUMMARY

## Impact

**Who/What is affected:**
- [Describe affected users, features, or systems]

**Severity:**
- [Describe the severity and scope of impact]

## Steps to Reproduce

1. [First step]
2. [Second step]
3. [Third step]

## Expected Behavior

[What should happen]

## Actual Behavior

[What actually happens]

## Root Cause

[Technical explanation of why this occurs - update after investigation]

## Evidence

- [Database queries showing the issue]
- [Log excerpts]
- [Screenshots]
- [Test results]

## Proposed Solutions

### Option 1: [Solution Name]

**Description**: [How it works]

**Pros**:
- Advantage 1
- Advantage 2

**Cons**:
- Disadvantage 1
- Disadvantage 2

**Implementation Effort**: [X hours/days]

**Maintenance**: [Ongoing maintenance requirements]

### Option 2: [Solution Name]

**Description**: [How it works]

**Pros**:
- Advantage 1
- Advantage 2

**Cons**:
- Disadvantage 1
- Disadvantage 2

**Implementation Effort**: [X hours/days]

**Maintenance**: [Ongoing maintenance requirements]

## Decision

[Which solution was chosen and why - update after decision is made]

## Implementation

[Details of what was implemented - update during/after implementation]

## Testing

**Test Commands:**
\`\`\`bash
# Commands to reproduce the bug
# Commands to verify the fix
\`\`\`

**Verification:**
- [ ] Test case 1
- [ ] Test case 2
- [ ] Test case 3

## Status History

- $DATE: $TYPE_UPPER created and documented

## Notes

[Any additional context or information]

## Related Files

[List specific file paths and line numbers relevant to this $TYPE_UPPER]
- \`path/to/file.rs:123\`
- \`path/to/other_file.tsx:456\`
EOF

echo -e "${GREEN}✅ File created: $FILEPATH${NC}"
echo ""

# Regenerate bug index
echo -e "${YELLOW}🔄 Regenerating bug index...${NC}"
python3 scripts/generate-bug-index.py
echo -e "${GREEN}✅ Bug index regenerated${NC}"
echo ""

# Stage changes
git add "$FILEPATH" bugs/README.md
echo -e "${GREEN}✅ Changes staged for commit${NC}"
echo ""

# Show git status
echo -e "${YELLOW}📊 Git status:${NC}"
git status --short
echo ""

# Summary
echo -e "${GREEN}✅ Done! ${TYPE_UPPER} created successfully.${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "  ID:        $NEXT_ID"
echo "  Title:     $TITLE"
echo "  Priority:  $PRIORITY"
echo "  Severity:  $SEVERITY"
echo "  Component: $COMPONENT"
echo "  File:      $FILEPATH"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Edit $FILEPATH to fill in remaining details"
echo "  2. Add evidence, root cause analysis, and proposed solutions"
echo "  3. Commit when ready:"
echo -e "     ${BLUE}git commit -m \"docs: Create $NEXT_ID - $TITLE\"${NC}"
echo ""
echo -e "${YELLOW}To move to another status later:${NC}"
echo -e "  ${BLUE}./move-bug.sh $NEXT_ID fixed${NC}"
echo -e "  ${BLUE}./move-bug.sh $NEXT_ID mitigated${NC}"
