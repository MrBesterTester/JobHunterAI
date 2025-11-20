#!/bin/bash
# Debug wrapper for test orchestrator
# Provides convenient shortcuts for common debugging workflows

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ORCHESTRATOR_DEBUG="$PROJECT_ROOT/src/test-orchestrator/debug-main.ts"

show_usage() {
  cat <<EOF
Usage: ./helper-scripts/run-tests-debug.sh [MODE] [OPTIONS]

PRESET MODES:
  --smoke              Smoke test: Preflight checks only (~30s)
  --unit-only          Unit tests only (backend + frontend, skip E2E) (~2m)
  --skip-builds        Run tests with existing builds (~12m)
  --skip-db            Run tests without database prep (~18m)
  --e2e-only           Run only E2E tests (~10-12m)
  --skip-preflight     Skip all preflight checks (~15m, DANGEROUS)

OPTIONS (combine with modes):
  --no-backend-test    Skip backend tests
  --no-frontend-test   Skip frontend tests
  --no-e2e-test        Skip E2E tests
  --no-notification    Skip desktop notification
  --verbose            Extra logging

EXAMPLES:
  # Rapid orchestrator development (smoke test)
  ./helper-scripts/run-tests-debug.sh --smoke

  # Quick unit test validation
  ./helper-scripts/run-tests-debug.sh --unit-only

  # Test with existing builds (skip slow rebuilds)
  ./helper-scripts/run-tests-debug.sh --skip-builds

  # E2E only with existing builds
  ./helper-scripts/run-tests-debug.sh --e2e-only --skip-builds

  # Unit tests + E2E (skip backend tests)
  ./helper-scripts/run-tests-debug.sh --skip-builds --no-backend-test

NOTES:
  - For comprehensive tests, use: ./helper-scripts/run-comprehensive-tests.sh
  - Debug modes skip safety checks - use with caution
  - All modes reuse existing orchestrator code (no duplication)

EOF
}

if [ $# -eq 0 ] || [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
  show_usage
  exit 0
fi

# Verify orchestrator files exist
if [ ! -f "$ORCHESTRATOR_DEBUG" ]; then
  echo "❌ Error: Orchestrator debug entry point not found: $ORCHESTRATOR_DEBUG"
  exit 1
fi

# Run orchestrator from frontend directory (where node_modules is)
cd "$PROJECT_ROOT/frontend"

# Verify node_modules exists
if [ ! -d "node_modules" ]; then
  echo "❌ Error: node_modules not found. Run: npm install"
  exit 1
fi

npx ts-node "$ORCHESTRATOR_DEBUG" "$@"
