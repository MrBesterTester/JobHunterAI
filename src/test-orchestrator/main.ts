#!/usr/bin/env ts-node
/**
 * Comprehensive Test Orchestrator - Main Entry Point
 *
 * Runs all test suites (backend, frontend, E2E) with structured output
 * and desktop notifications.
 *
 * Usage:
 *   npm run test:comprehensive
 *   # or directly:
 *   ts-node src/test-orchestrator/main.ts
 *   # E2E only:
 *   ts-node src/test-orchestrator/main.ts --e2e-only
 *   # E2E only, skip builds:
 *   ts-node src/test-orchestrator/main.ts --e2e-only --skip-builds
 *   # Backend only:
 *   ts-node src/test-orchestrator/main.ts --backend-only
 *   # Frontend only:
 *   ts-node src/test-orchestrator/main.ts --frontend-only
 *
 * Flags:
 *   --e2e-only        Run only E2E tests (skip backend/frontend unit tests)
 *   --backend-only    Run only backend tests
 *   --frontend-only   Run only frontend tests
 *   --skip-builds     Skip build phase (use existing builds)
 *   --skip-preflight  Skip preflight checks (use for rapid iteration)
 */

import { TestOrchestrator } from './orchestrator';

async function main() {
  // Signal comprehensive testing (enables load-aware timeouts)
  // This env var is checked by global-setup.ts and propagated to Playwright workers
  // (ISSUE-056: Playwright workers don't inherit command-line env vars reliably)
  // (ISSUE-064: E2E tests use 4-project architecture with workers=1 for deterministic execution)
  process.env.COMPREHENSIVE_TESTS = 'true';

  // Parse command-line arguments
  const args = process.argv.slice(2);
  const config: any = {};

  if (args.includes('--e2e-only')) {
    config.runBackendTests = false;
    config.runFrontendTests = false;
    config.runE2ETests = true;
  } else if (args.includes('--backend-only')) {
    config.runBackendTests = true;
    config.runFrontendTests = false;
    config.runE2ETests = false;
  } else if (args.includes('--frontend-only')) {
    config.runBackendTests = false;
    config.runFrontendTests = true;
    config.runE2ETests = false;
  }

  // Optional flags
  if (args.includes('--skip-builds')) {
    config.runBuilds = false;
  }
  if (args.includes('--skip-preflight')) {
    config.runPreflight = false;
  }

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

// Run if called directly
if (require.main === module) {
  main();
}

export { main };
