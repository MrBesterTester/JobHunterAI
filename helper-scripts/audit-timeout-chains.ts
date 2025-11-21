#!/usr/bin/env ts-node
/**
 * Timeout Chain Audit Tool
 *
 * Automatically detects timeout budget violations in test code by analyzing
 * sequential operations and comparing against parent timeouts.
 *
 * CRITICAL PRINCIPLE: Parent timeout must be >= sum of all sequential child timeouts
 *
 * Usage:
 *   ts-node helper-scripts/audit-timeout-chains.ts [path-to-test-files]
 *
 * Examples:
 *   ts-node helper-scripts/audit-timeout-chains.ts frontend/e2e/tests/
 *   ts-node helper-scripts/audit-timeout-chains.ts backend/src/tests/
 *
 * Exit codes:
 *   0 - No violations found
 *   1 - Violations detected
 *   2 - Error during execution
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface TimeoutOperation {
  line: number;
  operation: string;
  timeout: number | null; // null = default timeout
  isLoadAware: boolean;
}

interface TestTimeout {
  testName: string;
  testLine: number;
  parentTimeout: number;
  isLoadAware: boolean;
  operations: TimeoutOperation[];
}

interface Violation {
  file: string;
  test: string;
  testLine: number;
  parentTimeout: number;
  childrenSum: number;
  deficit: number;
  operations: TimeoutOperation[];
}

interface FrameworkViolation {
  type: 'framework';
  framework: 'playwright';
  configFile: string;
  configTimeout: number;
  requiredTimeout: number;
  deficit: number;
  affectedOperations: Array<{
    file: string;
    test: string;
    line: number;
    operation: string;
    requestedTimeout: number;
  }>;
}

// Default timeouts for various test frameworks
const DEFAULT_TIMEOUTS = {
  playwright: 30000,        // Playwright test default: 30s
  playwrightAction: 30000,  // Playwright action default: 30s (or test timeout)
  jest: 5000,               // Jest default: 5s
  rust: 60000,              // Rust tokio::test default: 60s
};

const LOAD_MULTIPLIER = 1.5; // getTestTimeout multiplier

/**
 * Parse playwright.config.ts to extract actionTimeout configuration
 */
function parsePlaywrightConfig(configPath: string): { normal: number; comprehensive: number } | null {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');

    // Look for actionTimeout line with ternary expression
    // Format: actionTimeout: process.env.COMPREHENSIVE_TESTS ? 120 * 1000 : 10 * 1000,
    const actionTimeoutMatch = content.match(
      /actionTimeout:\s*process\.env\.(?:COMPREHENSIVE_TESTS|CI)\s*\?\s*(\d+)\s*\*\s*1000\s*:\s*(\d+)\s*\*\s*1000/
    );

    if (actionTimeoutMatch) {
      return {
        comprehensive: parseInt(actionTimeoutMatch[1]) * 1000,
        normal: parseInt(actionTimeoutMatch[2]) * 1000,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if operations exceed framework-level actionTimeout
 */
function checkFrameworkViolations(
  violations: Violation[],
  testFiles: string[],
  projectRoot: string
): FrameworkViolation | null {
  // Look for playwright.config.ts
  const configPath = path.join(projectRoot, 'frontend', 'playwright.config.ts');

  if (!fs.existsSync(configPath)) {
    return null;
  }

  const config = parsePlaywrightConfig(configPath);
  if (!config) {
    return null;
  }

  // Check under comprehensive load scenario (more restrictive)
  const actionTimeout = config.comprehensive;

  // Find all operations that exceed the framework actionTimeout
  const affectedOps: FrameworkViolation['affectedOperations'] = [];
  let maxRequestedTimeout = 0;

  for (const violation of violations) {
    for (const op of violation.operations) {
      const opTimeout = op.timeout ?? DEFAULT_TIMEOUTS.playwrightAction;
      const effectiveTimeout = op.isLoadAware ? Math.floor(opTimeout * LOAD_MULTIPLIER) : opTimeout;

      if (effectiveTimeout > actionTimeout) {
        affectedOps.push({
          file: violation.file,
          test: violation.test,
          line: op.line,
          operation: op.operation,
          requestedTimeout: effectiveTimeout,
        });

        maxRequestedTimeout = Math.max(maxRequestedTimeout, effectiveTimeout);
      }
    }
  }

  if (affectedOps.length === 0) {
    return null;
  }

  return {
    type: 'framework',
    framework: 'playwright',
    configFile: configPath,
    configTimeout: actionTimeout,
    requiredTimeout: maxRequestedTimeout,
    deficit: maxRequestedTimeout - actionTimeout,
    affectedOperations: affectedOps,
  };
}

/**
 * Parse a TypeScript/JavaScript test file to extract timeout information
 */
function parseTestFile(filePath: string): TestTimeout[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const tests: TestTimeout[] = [];

  let currentTest: TestTimeout | null = null;
  let testDepth = 0;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Detect test start
    const testMatch = line.match(/test(?:\.(?:only|skip))?\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (testMatch && testDepth === 0) {
      currentTest = {
        testName: testMatch[1],
        testLine: lineNum,
        parentTimeout: DEFAULT_TIMEOUTS.playwright,
        isLoadAware: false,
        operations: [],
      };
      testDepth++;
    }

    // Track brace depth within test
    if (currentTest) {
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      braceDepth += openBraces - closeBraces;

      // Detect test.setTimeout
      const setTimeoutMatch = line.match(/test\.setTimeout\s*\(\s*(?:getTestTimeout\s*\()?(\d+)\)?/);
      if (setTimeoutMatch) {
        currentTest.parentTimeout = parseInt(setTimeoutMatch[1]);
        currentTest.isLoadAware = line.includes('getTestTimeout');
      }

      // Detect await operations with explicit timeouts
      const awaitMatch = line.match(/await\s+(.+?)\s*\(\s*\{.*?timeout\s*:\s*(?:getTestTimeout\s*\()?(\d+)\)?/);
      if (awaitMatch) {
        currentTest.operations.push({
          line: lineNum,
          operation: awaitMatch[1].trim(),
          timeout: parseInt(awaitMatch[2]),
          isLoadAware: line.includes('getTestTimeout'),
        });
      }

      // Detect await operations without explicit timeout (use default)
      const awaitDefaultMatch = line.match(/await\s+(page\.(click|waitFor|fill|goto|locator|getByRole|getByTestId|getByText))/);
      if (awaitDefaultMatch && !line.includes('timeout:')) {
        currentTest.operations.push({
          line: lineNum,
          operation: awaitDefaultMatch[1].trim(),
          timeout: null, // Will use default
          isLoadAware: false,
        });
      }

      // Detect custom helper calls with timeout parameter
      const helperMatch = line.match(/await\s+(\w+)\s*\([^)]*,\s*(?:getTestTimeout\s*\()?(\d+)\)?/);
      if (helperMatch && !line.includes('page.')) {
        currentTest.operations.push({
          line: lineNum,
          operation: helperMatch[1].trim(),
          timeout: parseInt(helperMatch[2]),
          isLoadAware: line.includes('getTestTimeout'),
        });
      }

      // End of test
      if (braceDepth === 0 && testDepth > 0) {
        tests.push(currentTest);
        currentTest = null;
        testDepth = 0;
      }
    }
  }

  return tests;
}

/**
 * Calculate effective timeout accounting for load-aware multipliers
 */
function getEffectiveTimeout(timeout: number, isLoadAware: boolean, checkLoadScenario: boolean): number {
  if (checkLoadScenario && isLoadAware) {
    return Math.floor(timeout * LOAD_MULTIPLIER);
  }
  return timeout;
}

/**
 * Analyze timeout budget for a test
 */
function analyzeTimeoutBudget(test: TestTimeout, checkLoadScenario: boolean): Violation | null {
  const parentTimeout = getEffectiveTimeout(test.parentTimeout, test.isLoadAware, checkLoadScenario);

  // Calculate sum of sequential child timeouts
  let childrenSum = 0;
  for (const op of test.operations) {
    const opTimeout = op.timeout ?? DEFAULT_TIMEOUTS.playwrightAction;
    childrenSum += getEffectiveTimeout(opTimeout, op.isLoadAware, checkLoadScenario);
  }

  // Add 10% buffer requirement
  const requiredParentTimeout = childrenSum * 1.1;

  if (parentTimeout < requiredParentTimeout) {
    const deficit = requiredParentTimeout - parentTimeout;
    return {
      file: '', // Will be set by caller
      test: test.testName,
      testLine: test.testLine,
      parentTimeout,
      childrenSum,
      deficit,
      operations: test.operations,
    };
  }

  return null;
}

/**
 * Audit all test files in a directory
 */
async function auditDirectory(directory: string): Promise<Violation[]> {
  const violations: Violation[] = [];

  // Find all test files
  const testFiles = await glob(`${directory}/**/*.{spec,test}.{ts,tsx,js,jsx}`, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  });

  for (const file of testFiles) {
    const tests = parseTestFile(file);

    for (const test of tests) {
      // Check both normal and load scenarios
      const normalViolation = analyzeTimeoutBudget(test, false);
      const loadViolation = analyzeTimeoutBudget(test, true);

      if (normalViolation) {
        violations.push({ ...normalViolation, file });
      } else if (loadViolation) {
        violations.push({ ...loadViolation, file });
      }
    }
  }

  return violations;
}

/**
 * Format violation report
 */
function formatReport(violations: Violation[], frameworkViolation: FrameworkViolation | null): string {
  let hasViolations = violations.length > 0 || frameworkViolation !== null;

  if (!hasViolations) {
    return '✅ No timeout budget violations detected!';
  }

  let report = '';

  // Report framework-level violations first (these are critical)
  if (frameworkViolation) {
    report += '\n🚨 CRITICAL: FRAMEWORK-LEVEL TIMEOUT VIOLATION\n';
    report += '═'.repeat(80) + '\n\n';
    report += `❌ ${frameworkViolation.framework.toUpperCase()} CONFIGURATION ISSUE\n\n`;
    report += `   Config File: ${frameworkViolation.configFile}\n`;
    report += `   actionTimeout: ${frameworkViolation.configTimeout}ms (under COMPREHENSIVE_TESTS)\n\n`;
    report += `   ⚠️  PROBLEM: Global actionTimeout is LOWER than operation timeouts in code!\n\n`;
    report += `   The framework enforces a hard cap of ${frameworkViolation.configTimeout}ms on ALL actions,\n`;
    report += `   which overrides any higher timeouts you specify in test code.\n\n`;
    report += `   Required timeout: ${frameworkViolation.requiredTimeout}ms\n`;
    report += `   ⚠️  DEFICIT: ${frameworkViolation.deficit}ms SHORT!\n\n`;
    report += `   Affected operations (${frameworkViolation.affectedOperations.length} total):\n`;
    for (const op of frameworkViolation.affectedOperations.slice(0, 10)) {
      report += `   - ${op.file}:${op.line} "${op.test}"\n`;
      report += `     ${op.operation} requests ${op.requestedTimeout}ms but capped at ${frameworkViolation.configTimeout}ms\n`;
    }
    if (frameworkViolation.affectedOperations.length > 10) {
      report += `   ... and ${frameworkViolation.affectedOperations.length - 10} more\n`;
    }
    report += '\n';
    report += '   🔧 IMMEDIATE FIX REQUIRED:\n';
    report += `   Update ${frameworkViolation.configFile}:\n`;
    report += `   \n`;
    report += `   actionTimeout: process.env.COMPREHENSIVE_TESTS ? ${Math.ceil(frameworkViolation.requiredTimeout / 1000)} * 1000 : 10 * 1000\n`;
    report += `   \n`;
    report += `   Without this fix, ALL other timeout increases will be ineffective!\n`;
    report += '\n' + '═'.repeat(80) + '\n\n';
  }

  // Report test-level violations
  if (violations.length > 0) {
    report += `\n⚠️  TEST-LEVEL TIMEOUT BUDGET VIOLATIONS (${violations.length} total)\n`;
    report += '═'.repeat(80) + '\n\n';

    for (const v of violations) {
      report += `❌ File: ${v.file}:${v.testLine}\n`;
      report += `   Test: "${v.test}"\n`;
      report += `   Parent timeout: ${v.parentTimeout}ms\n`;
      report += `   Sequential operations sum: ${v.childrenSum}ms\n`;
      report += `   Required (with 10% buffer): ${Math.ceil(v.childrenSum * 1.1)}ms\n`;
      report += `   ⚠️  DEFICIT: ${Math.ceil(v.deficit)}ms SHORT!\n\n`;

      report += `   Operations:\n`;
      for (const op of v.operations) {
        const timeout = op.timeout ?? DEFAULT_TIMEOUTS.playwrightAction;
        const loadAwareMarker = op.isLoadAware ? ' (load-aware)' : '';
        report += `   - Line ${op.line}: ${op.operation} → ${timeout}ms${loadAwareMarker}\n`;
      }
      report += '\n';
      report += '   Recommendation:\n';
      report += `   Update test.setTimeout() to at least ${Math.ceil(v.childrenSum * 1.1)}ms\n`;
      report += `   Or use: test.setTimeout(getTestTimeout(${Math.ceil(v.parentTimeout + v.deficit)}));\n`;
      report += '\n' + '─'.repeat(80) + '\n\n';
    }
  }

  report += 'See docs/PLAYWRIGHT_BEST_PRACTICES.md for detailed guidance on timeout budgets.\n';

  return report;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: ts-node helper-scripts/audit-timeout-chains.ts <path-to-test-files>');
    console.log('\nExamples:');
    console.log('  ts-node helper-scripts/audit-timeout-chains.ts frontend/e2e/tests/');
    console.log('  ts-node helper-scripts/audit-timeout-chains.ts backend/src/tests/');
    process.exit(2);
  }

  const targetPath = args[0];

  if (!fs.existsSync(targetPath)) {
    console.error(`❌ Error: Path does not exist: ${targetPath}`);
    process.exit(2);
  }

  console.log(`🔍 Auditing timeout chains in: ${targetPath}\n`);

  try {
    const violations = await auditDirectory(targetPath);

    // Get test files for framework violation checking
    const testFiles = await glob(`${targetPath}/**/*.{spec,test}.{ts,tsx,js,jsx}`, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    });

    // Check for framework-level violations
    const projectRoot = process.cwd();
    const frameworkViolation = checkFrameworkViolations(violations, testFiles, projectRoot);

    const report = formatReport(violations, frameworkViolation);

    console.log(report);

    if (violations.length > 0 || frameworkViolation) {
      process.exit(1); // Exit with error code
    } else {
      process.exit(0); // Success
    }
  } catch (error) {
    console.error('❌ Error during audit:', error);
    process.exit(2);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { auditDirectory, analyzeTimeoutBudget, parseTestFile };
