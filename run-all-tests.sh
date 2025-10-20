#!/bin/bash
set -e  # Exit on any error

# JobHunter Complete Test Suite Runner
#
# Expected Runtime (based on October 20, 2025 test run):
# - Backend (Rust): ~0.5 minutes (108 tests)
# - Frontend Build: ~1-2 minutes
# - E2E (Playwright): 10.2 minutes (464 tests, 4 workers)
# - Total: ~12-13 minutes
#
# Recommended Timeout: 15 minutes (with buffer for CI/CD)
# Set timeout in CI/CD with: timeout 15m ./run-all-tests.sh

echo "================================================"
echo "  JobHunter Complete Test Suite"
echo "  Expected Duration: ~12-13 minutes"
echo "================================================"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
TOTAL=0

# Backend tests
echo -e "\n${BLUE}[1/3] Running Backend Tests...${NC}"
((TOTAL++))
if (cd "$SCRIPT_DIR/backend" && cargo test); then
    echo -e "${GREEN}✓ Backend tests passed${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Backend tests failed${NC}"
    ((FAILED++))
fi

# Frontend build (ensure TypeScript compiles)
echo -e "\n${BLUE}[2/3] Building Frontend...${NC}"
((TOTAL++))
if (cd "$SCRIPT_DIR/frontend" && npm run build); then
    echo -e "${GREEN}✓ Frontend build passed${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Frontend build failed${NC}"
    ((FAILED++))
fi

# E2E tests
echo -e "\n${BLUE}[3/3] Running E2E Tests (Playwright)...${NC}"
echo -e "${YELLOW}Note: Application must be running (./start.sh)${NC}"
((TOTAL++))
if (cd "$SCRIPT_DIR/frontend" && npm run test:e2e); then
    echo -e "${GREEN}✓ E2E tests passed${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ E2E tests failed${NC}"
    ((FAILED++))
fi

# Database tests (optional)
if [ -d "$SCRIPT_DIR/database/test" ]; then
    echo -e "\n${BLUE}[BONUS] Running Database Tests (pgTAP)...${NC}"
    if command -v pg_prove &> /dev/null; then
        ((TOTAL++))
        if pg_prove -d jobhunter_test "$SCRIPT_DIR/database/test"/*.sql; then
            echo -e "${GREEN}✓ Database tests passed${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗ Database tests failed${NC}"
            ((FAILED++))
        fi
    else
        echo -e "${YELLOW}⊘ pgTAP not installed, skipping database tests${NC}"
        echo -e "  Install with: sudo apt-get install pgtap (Linux) or brew install pgtap (macOS)"
    fi
fi

# Summary
echo -e "\n================================================"
echo -e "  Test Suite Summary"
echo -e "================================================"
echo -e "Passed: ${GREEN}${PASSED}/${TOTAL}${NC}"
echo -e "Failed: ${RED}${FAILED}/${TOTAL}${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    exit 1
fi
