#!/bin/bash
#
# run-comprehensive-tests.sh
#
# Runs the comprehensive test suite using TypeScript orchestrator (ISSUE-060)
#
# This is the primary script for running comprehensive tests. It wraps the
# TypeScript test orchestrator for convenient execution.
#
# Flow:
#   1. PREFLIGHT CHECKS (process cleanup, git, database, OAuth)
#   2. BUILD PHASE (cargo clean + build, npm build, E2E typecheck)
#      - Quality Gate: Zero warnings/errors required
#   3. TEST PHASE (backend + frontend + E2E concurrently)
#   4. REPORT & NOTIFY (JSON report + desktop notification)
#
# Usage:
#   ./helper-scripts/run-comprehensive-tests.sh
#
# Legacy Bash Version:
#   The original bash implementation is preserved as:
#   ./helper-scripts/run-comprehensive-tests-bash-legacy.sh
#
# Requirements:
#   - Node.js with ts-node installed
#   - All project dependencies installed (npm install, cargo build)
#   - PostgreSQL running with jobhunter_personal database
#   - OAuth tokens configured (.env.test)
#
# See also:
#   - ISSUE-060: Full orchestrator documentation
#   - README_auto-test-plan.md: Testing strategy
#   - src/test-orchestrator/README.md: Orchestrator details
#

set -e  # Exit on error

# Get project root (script is in helper-scripts/)
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       COMPREHENSIVE TEST ORCHESTRATOR (TypeScript)            ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if ts-node is available (check locally in node_modules)
if [ ! -f "$PROJECT_ROOT/frontend/node_modules/.bin/ts-node" ]; then
    echo -e "${RED}❌ ERROR: ts-node not found${NC}"
    echo ""
    echo "Install with:"
    echo "  cd $PROJECT_ROOT/frontend"
    echo "  npm install"
    echo ""
    exit 1
fi

# Check if orchestrator exists
ORCHESTRATOR_PATH="$PROJECT_ROOT/src/test-orchestrator/main.ts"
if [ ! -f "$ORCHESTRATOR_PATH" ]; then
    echo -e "${RED}❌ ERROR: Test orchestrator not found${NC}"
    echo ""
    echo "Expected: $ORCHESTRATOR_PATH"
    echo ""
    exit 1
fi

# Verify orchestrator TypeScript code compiles cleanly (zero warnings/errors)
echo -e "${BLUE}🔍 Verifying test orchestrator code compiles cleanly...${NC}"
if ! npx tsc --noEmit src/test-orchestrator/**/*.ts --module commonjs --target es2017 --esModuleInterop --lib es2017,es2015 2>&1; then
    echo ""
    echo -e "${RED}❌ ERROR: Test orchestrator has TypeScript compilation errors/warnings${NC}"
    echo ""
    echo "The test orchestrator code itself must be error-free and warning-free."
    echo "Fix all TypeScript errors/warnings in src/test-orchestrator/ before running tests."
    echo ""
    exit 1
fi
echo -e "${GREEN}✅ Test orchestrator code is clean${NC}"
echo ""

# Display what will happen
echo -e "${YELLOW}This will run comprehensive tests with:${NC}"
echo ""
echo "  1. PREFLIGHT CHECKS (process cleanup, git, database, OAuth)"
echo "  2. BUILD PHASE (zero warnings/errors required)"
echo "  3. TEST PHASE (backend + frontend + E2E concurrently)"
echo "  4. REPORT & NOTIFY (JSON report + desktop notification)"
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will:${NC}"
echo "  - Stop all running servers (port 8080, 3000)"
echo "  - Backup and clear the jobhunter_personal database"
echo "  - Seed database with test fixtures"
echo "  - Run cargo clean (full rebuild required)"
echo ""
echo -e "${YELLOW}⏱️  Estimated runtime: 15-20 minutes${NC}"
echo ""

# Run the orchestrator
cd "$PROJECT_ROOT/frontend"

echo -e "${GREEN}🚀 Starting comprehensive test orchestrator...${NC}"
echo ""

# Run via npm script (which calls ts-node)
npm run test:comprehensive

# Exit with orchestrator's exit code
exit $?
