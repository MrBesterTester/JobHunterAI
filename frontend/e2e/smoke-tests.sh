#!/bin/bash
#
# E2E Smoke Tests - Category 1 Core Workflows Only
#
# Purpose: Fast CI/CD validation of critical user paths
# Runtime: ~5-8 minutes (vs 15-18 minutes for full suite)
# Coverage: 128 tests across 7 core workflow files
#
# Usage:
#   ./e2e/smoke-tests.sh
#
# Related: ISSUE-025 Option A Implementation
# Date: 2025-10-28
#

echo "🧪 Running E2E Smoke Tests (Category 1: Core Workflows Only)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npx playwright test \
  e2e/tests/01-setup-load.spec.ts \
  e2e/tests/02-tab-navigation.spec.ts \
  e2e/tests/04-content-generation.spec.ts \
  e2e/tests/05-job-details.spec.ts \
  e2e/tests/06-statistics.spec.ts \
  e2e/tests/07-dashboard-statistics.spec.ts \
  e2e/tests/09-error-handling.spec.ts \
  --timeout=30000 \
  --reporter=list

exit_code=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $exit_code -eq 0 ]; then
  echo "✅ Smoke tests PASSED - Critical workflows validated"
else
  echo "❌ Smoke tests FAILED - Check output above for failures"
fi
echo ""

exit $exit_code
