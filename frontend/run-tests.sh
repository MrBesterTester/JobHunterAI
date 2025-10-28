#!/usr/bin/env bash
#
# run-tests.sh - Standardized frontend test execution script
#
# Usage:
#   ./run-tests.sh                    # Run all tests with typecheck
#   ./run-tests.sh --no-typecheck     # Skip typecheck (faster iteration)
#   ./run-tests.sh --watch            # Watch mode
#   ./run-tests.sh --filter "Phase 2A" # Run specific tests
#   ./run-tests.sh --coverage         # Run with coverage
#   ./run-tests.sh --quiet            # Minimal output
#   ./run-tests.sh --help             # Show help
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$SCRIPT_DIR"
LOGS_DIR="$PROJECT_ROOT/logs/frontend-tests"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

# Default options
RUN_TYPECHECK=true
WATCH_MODE=false
RUN_COVERAGE=false
QUIET_MODE=false
FILTER_PATTERN=""
OUTPUT_MODE="default" # default, dot, verbose, json

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --no-typecheck)
      RUN_TYPECHECK=false
      shift
      ;;
    --watch)
      WATCH_MODE=true
      shift
      ;;
    --coverage)
      RUN_COVERAGE=true
      shift
      ;;
    --quiet)
      QUIET_MODE=true
      OUTPUT_MODE="dot"
      shift
      ;;
    --filter)
      FILTER_PATTERN="$2"
      shift 2
      ;;
    --reporter)
      OUTPUT_MODE="$2"
      shift 2
      ;;
    --help)
      echo "Frontend Test Execution Script"
      echo ""
      echo "Usage: ./run-tests.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --no-typecheck       Skip TypeScript type checking (faster)"
      echo "  --watch              Run in watch mode"
      echo "  --coverage           Generate coverage report"
      echo "  --quiet              Minimal output (dot reporter)"
      echo "  --filter PATTERN     Run only tests matching pattern (e.g., 'Phase 2A')"
      echo "  --reporter MODE      Output mode: default, dot, verbose, json"
      echo "  --help               Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./run-tests.sh                      # Full test run with typecheck"
      echo "  ./run-tests.sh --no-typecheck       # Skip typecheck for faster iteration"
      echo "  ./run-tests.sh --filter 'Phase 2A'  # Run only Phase 2A tests"
      echo "  ./run-tests.sh --quiet              # Minimal output"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Run with --help for usage information"
      exit 1
      ;;
  esac
done

# Create logs directory
mkdir -p "$LOGS_DIR"

# Log file path
LOG_FILE="$LOGS_DIR/test-run-${TIMESTAMP}.log"

# Print header
if [[ "$QUIET_MODE" == "false" ]]; then
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  Frontend Test Execution${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
  echo -e "Log file:  $LOG_FILE"
  echo ""
fi

# Change to frontend directory
cd "$FRONTEND_DIR"

# Step 1: TypeScript Type Checking
if [[ "$RUN_TYPECHECK" == "true" ]]; then
  if [[ "$QUIET_MODE" == "false" ]]; then
    echo -e "${YELLOW}[1/2] Running TypeScript type checking...${NC}"
  fi

  start_time=$(date +%s)
  if npm run typecheck 2>&1 | tee -a "$LOG_FILE"; then
    end_time=$(date +%s)
    elapsed=$((end_time - start_time))
    if [[ "$QUIET_MODE" == "false" ]]; then
      echo -e "${GREEN}✓ Type checking passed (${elapsed}s)${NC}"
      echo ""
    fi
  else
    end_time=$(date +%s)
    elapsed=$((end_time - start_time))
    echo -e "${RED}✗ Type checking failed (${elapsed}s)${NC}"
    echo -e "${RED}Please fix TypeScript errors before running tests${NC}"
    exit 1
  fi
fi

# Step 2: Run Jest
if [[ "$QUIET_MODE" == "false" ]]; then
  if [[ "$RUN_TYPECHECK" == "true" ]]; then
    echo -e "${YELLOW}[2/2] Running Jest tests...${NC}"
  else
    echo -e "${YELLOW}[1/1] Running Jest tests...${NC}"
  fi
fi

# Build jest command
JEST_CMD="npx jest"

# Watch mode vs run mode
if [[ "$WATCH_MODE" == "true" ]]; then
  JEST_CMD="$JEST_CMD --watch"
else
  JEST_CMD="$JEST_CMD --watchAll=false"
fi

# Coverage
if [[ "$RUN_COVERAGE" == "true" ]]; then
  JEST_CMD="$JEST_CMD --coverage"
fi

# Reporter/output mode
if [[ "$OUTPUT_MODE" != "default" ]]; then
  # Map Vitest reporters to Jest reporters
  case "$OUTPUT_MODE" in
    dot)
      JEST_CMD="$JEST_CMD --reporters=jest-silent-reporter"
      ;;
    verbose)
      JEST_CMD="$JEST_CMD --verbose"
      ;;
    json)
      JEST_CMD="$JEST_CMD --json"
      ;;
    *)
      JEST_CMD="$JEST_CMD --reporters=default"
      ;;
  esac
fi

# Filter pattern
if [[ -n "$FILTER_PATTERN" ]]; then
  JEST_CMD="$JEST_CMD --testNamePattern=\"$FILTER_PATTERN\""
fi

# Run tests
if [[ "$QUIET_MODE" == "false" ]]; then
  echo -e "${BLUE}Command: $JEST_CMD${NC}"
  echo ""
fi

start_time=$(date +%s)

# Execute with proper error handling and output capture
set +e
eval "$JEST_CMD" 2>&1 | tee -a "$LOG_FILE"
EXIT_CODE=${PIPESTATUS[0]}
set -e

end_time=$(date +%s)
elapsed=$((end_time - start_time))

# Report results
echo ""
if [[ "$QUIET_MODE" == "false" ]]; then
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi

if [[ $EXIT_CODE -eq 0 ]]; then
  echo -e "${GREEN}✓ Tests passed (${elapsed}s)${NC}"
  if [[ "$QUIET_MODE" == "false" ]]; then
    echo -e "${GREEN}Log saved to: $LOG_FILE${NC}"
  fi
else
  echo -e "${RED}✗ Tests failed with exit code $EXIT_CODE (${elapsed}s)${NC}"

  # Explain exit codes
  case $EXIT_CODE in
    1)
      echo -e "${RED}Exit code 1: Test failures detected${NC}"
      ;;
    143)
      echo -e "${YELLOW}Exit code 143: Process terminated (SIGTERM)${NC}"
      echo -e "${YELLOW}This usually means:${NC}"
      echo -e "${YELLOW}  - User interrupted with Ctrl+C${NC}"
      echo -e "${YELLOW}  - System killed due to resource exhaustion${NC}"
      echo -e "${YELLOW}  - Tests hung and were terminated${NC}"
      echo -e "${YELLOW}Recommendation: Check system resources with ./system-health-check.sh${NC}"
      ;;
    137)
      echo -e "${YELLOW}Exit code 137: Process killed (SIGKILL/OOM)${NC}"
      echo -e "${YELLOW}System likely ran out of memory${NC}"
      echo -e "${YELLOW}Recommendation: Close other applications or run ./system-health-check.sh --cleanup${NC}"
      ;;
    *)
      echo -e "${RED}Unexpected exit code: $EXIT_CODE${NC}"
      ;;
  esac

  echo -e "${RED}Full log: $LOG_FILE${NC}"
fi

if [[ "$QUIET_MODE" == "false" ]]; then
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi

exit $EXIT_CODE
