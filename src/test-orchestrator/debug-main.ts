#!/usr/bin/env ts-node
/**
 * Debug entry point for test orchestrator
 * Provides configurable debug modes for faster iteration during development
 */

import { TestOrchestrator } from './orchestrator';
import { OrchestratorConfig } from './types';

function parseArgs(): Partial<OrchestratorConfig> {
  const args = process.argv.slice(2);

  // Show usage if requested
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
  }

  // Preset modes (mutually exclusive - first one wins)
  if (args.includes('--smoke')) {
    console.log('🔍 Debug Mode: SMOKE TEST (preflight checks only)');
    return {
      runPreflight: true,
      runBuilds: false,
      runTests: false,
      sendNotification: false,
      verbose: true
    };
  }

  if (args.includes('--unit-only')) {
    console.log('🔍 Debug Mode: UNIT TESTS ONLY (backend + frontend)');
    return {
      runPreflight: false,
      runBuilds: false,
      runTests: true,
      runBackendTests: true,
      runFrontendTests: true,
      runE2ETests: false,
      sendNotification: true
    };
  }

  // Check --e2e-only BEFORE --skip-builds since --e2e-only can combine with --skip-builds
  if (args.includes('--e2e-only')) {
    const skipBuilds = args.includes('--skip-builds');
    console.log(`🔍 Debug Mode: E2E ONLY${skipBuilds ? ' (skip builds)' : ''}`);
    return {
      runPreflight: !skipBuilds,
      runBuilds: !skipBuilds,
      runTests: true,
      runBackendTests: false,
      runFrontendTests: false,
      runE2ETests: true,
      sendNotification: true
    };
  }

  if (args.includes('--skip-builds')) {
    console.log('🔍 Debug Mode: SKIP BUILDS (tests with existing builds)');
    return {
      runPreflight: true,
      runBuilds: false,
      runTests: true,
      sendNotification: true
    };
  }

  if (args.includes('--skip-db')) {
    console.log('🔍 Debug Mode: SKIP DATABASE PREP (current database state)');
    return {
      runPreflight: true,
      runDatabasePrep: false,
      runBuilds: true,
      runTests: true,
      sendNotification: true
    };
  }

  if (args.includes('--skip-preflight')) {
    console.log('🔍 Debug Mode: SKIP PREFLIGHT (⚠️  DANGEROUS - no safety checks)');
    return {
      runPreflight: false,
      runBuilds: true,
      runTests: true,
      sendNotification: true
    };
  }

  // Individual flags (can combine with presets or standalone)
  const config: Partial<OrchestratorConfig> = {};

  if (args.includes('--no-backend-test')) {
    console.log('  ⏭️  Disabled: Backend tests');
    config.runBackendTests = false;
  }
  if (args.includes('--no-frontend-test')) {
    console.log('  ⏭️  Disabled: Frontend tests');
    config.runFrontendTests = false;
  }
  if (args.includes('--no-e2e-test')) {
    console.log('  ⏭️  Disabled: E2E tests');
    config.runE2ETests = false;
  }
  if (args.includes('--no-notification')) {
    console.log('  ⏭️  Disabled: Desktop notification');
    config.sendNotification = false;
  }
  if (args.includes('--verbose')) {
    console.log('  🔊 Enabled: Verbose logging');
    config.verbose = true;
  }

  // If no preset and no individual flags, show usage and exit
  if (Object.keys(config).length === 0) {
    console.error('❌ Error: No debug mode specified\n');
    showUsage();
    process.exit(1);
  }

  return config;
}

function showUsage() {
  console.log(`
Usage: ts-node src/test-orchestrator/debug-main.ts [MODE] [OPTIONS]

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
  ts-node src/test-orchestrator/debug-main.ts --smoke

  # Quick unit test validation
  ts-node src/test-orchestrator/debug-main.ts --unit-only

  # Test with existing builds (skip slow rebuilds)
  ts-node src/test-orchestrator/debug-main.ts --skip-builds

  # E2E only with existing builds
  ts-node src/test-orchestrator/debug-main.ts --e2e-only --skip-builds

  # Unit tests + E2E (skip backend tests)
  ts-node src/test-orchestrator/debug-main.ts --skip-builds --no-backend-test

NOTES:
  - For comprehensive tests, use: ./helper-scripts/run-comprehensive-tests.sh
  - Debug modes skip safety checks - use with caution
  - All modes reuse existing orchestrator code (no duplication)
  - Use wrapper script: ./helper-scripts/run-tests-debug.sh [MODE]
`);
}

async function main() {
  const config = parseArgs();
  const orchestrator = new TestOrchestrator(config);

  try {
    const report = await orchestrator.runComprehensive();

    // Exit with appropriate code
    process.exit(report.summary.overallSuccess ? 0 : 1);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
