#!/bin/bash
set -e  # Exit on any error

echo "================================================"
echo "  JobHunter Complete Test Suite"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Backend tests
echo -e "\n${BLUE}[1/4] Running Backend Tests...${NC}"
if cd backend && cargo test; then
    echo -e "${GREEN}✓ Backend tests passed${NC}"
    ((PASSED++))
    cd ..
else
    echo -e "${RED}✗ Backend tests failed${NC}"
    ((FAILED++))
    cd ..
fi

# Frontend unit tests
echo -e "\n${BLUE}[2/4] Running Frontend Unit Tests...${NC}"
if cd frontend && npm run test:coverage; then
    echo -e "${GREEN}✓ Frontend unit tests passed${NC}"
    ((PASSED++))
    cd ..
else
    echo -e "${RED}✗ Frontend unit tests failed${NC}"
    ((FAILED++))
    cd ..
fi

# E2E tests
echo -e "\n${BLUE}[3/4] Running E2E Tests (Playwright)...${NC}"
echo -e "${YELLOW}Note: Application must be running (./start.sh)${NC}"
if cd frontend && npm run test:e2e; then
    echo -e "${GREEN}✓ E2E tests passed${NC}"
    ((PASSED++))
    cd ..
else
    echo -e "${RED}✗ E2E tests failed${NC}"
    ((FAILED++))
    cd ..
fi

# Database tests
echo -e "\n${BLUE}[4/4] Running Database Tests (pgTAP)...${NC}"
if command -v pg_prove &> /dev/null; then
    if pg_prove -d jobhunter_test database/test/*.sql; then
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

# Summary
echo -e "\n================================================"
echo -e "  Test Suite Summary"
echo -e "================================================"
echo -e "Passed: ${GREEN}${PASSED}/4${NC}"
echo -e "Failed: ${RED}${FAILED}/4${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    exit 1
fi
