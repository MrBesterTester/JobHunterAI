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
 */

import { TestOrchestrator } from './orchestrator';

async function main() {
  const orchestrator = new TestOrchestrator();

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
