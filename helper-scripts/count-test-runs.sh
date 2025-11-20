#!/bin/bash

# count-test-runs.sh - Count comprehensive test runs in TESTING_STATUS.md
# Usage: ./helper-scripts/count-test-runs.sh
# Exit codes:
#   0 - Less than 2 runs (no archival needed)
#   1 - 2 or more runs (archival needed before adding new run)

set -e

# Find the project root (one level up from helper-scripts)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

TESTING_STATUS="docs/TESTING_STATUS.md"

# Check if TESTING_STATUS.md exists
if [ ! -f "$TESTING_STATUS" ]; then
    echo -e "${YELLOW}⚠️  Warning: $TESTING_STATUS not found${NC}"
    exit 0
fi

# Count test runs by looking for "**Run Date**: YYYY-MM-DD" pattern
# This appears once per comprehensive test run section
RUN_COUNT=$(grep -c "^\*\*Run Date\*\*:" "$TESTING_STATUS" || true)

echo -e "${BLUE}📊 Test runs in TESTING_STATUS.md: ${GREEN}$RUN_COUNT${NC}"

# Policy: Keep only 2 most recent runs
if [ "$RUN_COUNT" -ge 2 ]; then
    echo -e "${YELLOW}⚠️  Archive oldest run before adding new run${NC}"
    echo -e "${YELLOW}   Run: ./helper-scripts/archive-oldest-test-run.sh${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Can add new run without archiving${NC}"
    exit 0
fi
