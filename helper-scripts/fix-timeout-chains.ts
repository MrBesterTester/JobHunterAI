#!/usr/bin/env ts-node
/**
 * Automatic Timeout Chain Fix Tool
 *
 * Automatically fixes timeout budget violations by updating test.setTimeout() values
 * to accommodate sequential operation chains.
 *
 * PREREQUISITES:
 * - Clean git status (no uncommitted changes)
 *
 * BEHAVIOR:
 * - Analyzes test files for timeout violations
 * - Applies fixes automatically
 * - Reports changes made
 * - Does NOT commit (allows comprehensive test verification first)
 *
 * Usage:
 *   ts-node helper-scripts/fix-timeout-chains.ts [path-to-test-files] [options]
 *
 * Options:
 *   --dry-run    Show what would be fixed without making changes
 *   --min-deficit N  Only fix violations with deficit >= N ms (default: 0)
 *
 * Examples:
 *   ts-node helper-scripts/fix-timeout-chains.ts frontend/e2e/tests/
 *   ts-node helper-scripts/fix-timeout-chains.ts frontend/e2e/tests/ --dry-run
 *   ts-node helper-scripts/fix-timeout-chains.ts frontend/e2e/tests/ --min-deficit 10000
 *
 * Exit codes:
 *   0 - No violations or all fixed successfully
 *   1 - Git status not clean
 *   2 - Error during execution
 *
 * See: bugs/open/ISSUE-063-*.md "Sequential Timeout Budget Principle" section
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { auditDirectory, analyzeTimeoutBudget, parseTestFile } from './audit-timeout-chains';

interface FixResult {
  file: string;
  test: string;
  testLine: number;
  oldTimeout: number;
  newTimeout: number;
  deficit: number;
}

interface FixOptions {
  dryRun: boolean;
  minDeficit: number;
}

/**
 * Check if git working directory is clean
 */
function checkGitStatus(): boolean {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    return status.trim().length === 0;
  } catch (error) {
    console.error('❌ Error: Could not check git status. Are you in a git repository?');
    return false;
  }
}

/**
 * Find the test.setTimeout() line in a test
 */
function findSetTimeoutLine(filePath: string, testLine: number): number | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Search within ~20 lines after test declaration
  const searchStart = testLine - 1; // Convert to 0-indexed
  const searchEnd = Math.min(searchStart + 20, lines.length);

  for (let i = searchStart; i < searchEnd; i++) {
    if (lines[i].match(/test\.setTimeout\s*\(/)) {
      return i + 1; // Convert back to 1-indexed
    }
  }

  return null;
}

/**
 * Apply fix to a single test file
 */
function applyFix(
  filePath: string,
  testLine: number,
  oldTimeout: number,
  newTimeout: number,
  isLoadAware: boolean
): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const setTimeoutLine = findSetTimeoutLine(filePath, testLine);

    if (!setTimeoutLine) {
      // No existing setTimeout - ADD one right after the test declaration
      const testLineIndex = testLine - 1; // Convert to 0-indexed
      const testLineContent = lines[testLineIndex];

      // Detect indentation from test line
      const indentMatch = testLineContent.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] + '  ' : '  '; // Add 2 spaces to test indent

      // Create setTimeout line
      const setTimeoutCode = isLoadAware
        ? `${indent}test.setTimeout(getTestTimeout(${newTimeout}));`
        : `${indent}test.setTimeout(${newTimeout});`;

      // Insert after test declaration line
      lines.splice(testLineIndex + 1, 0, setTimeoutCode);
      fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');

      return true;
    }

    const line = lines[setTimeoutLine - 1]; // Convert to 0-indexed

    // Replace the timeout value
    let newLine: string;
    if (isLoadAware) {
      // Preserve getTestTimeout wrapper
      newLine = line.replace(
        /test\.setTimeout\s*\(\s*getTestTimeout\s*\(\s*(\d+)\s*\)\s*\)/,
        `test.setTimeout(getTestTimeout(${newTimeout}))`
      );
    } else {
      // Plain timeout value
      newLine = line.replace(
        /test\.setTimeout\s*\(\s*(\d+)\s*\)/,
        `test.setTimeout(${newTimeout})`
      );
    }

    if (line === newLine) {
      console.error(`  ⚠️  Warning: Could not apply fix at line ${setTimeoutLine} (pattern mismatch)`);
      return false;
    }

    // Apply the fix
    lines[setTimeoutLine - 1] = newLine;
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');

    return true;
  } catch (error) {
    console.error(`  ❌ Error applying fix: ${error}`);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse options
  const options: FixOptions = {
    dryRun: args.includes('--dry-run'),
    minDeficit: 0,
  };

  const minDeficitIndex = args.indexOf('--min-deficit');
  let minDeficitValue: string | undefined;
  if (minDeficitIndex !== -1 && args[minDeficitIndex + 1]) {
    options.minDeficit = parseInt(args[minDeficitIndex + 1]);
    minDeficitValue = args[minDeficitIndex + 1];
  }

  // Get target path
  const targetPath = args.find(arg => !arg.startsWith('--') && arg !== minDeficitValue);

  if (!targetPath) {
    console.log('Usage: ts-node helper-scripts/fix-timeout-chains.ts <path-to-test-files> [options]');
    console.log('\nOptions:');
    console.log('  --dry-run           Show what would be fixed without making changes');
    console.log('  --min-deficit N     Only fix violations with deficit >= N ms (default: 0)');
    console.log('\nExamples:');
    console.log('  ts-node helper-scripts/fix-timeout-chains.ts frontend/e2e/tests/');
    console.log('  ts-node helper-scripts/fix-timeout-chains.ts frontend/e2e/tests/ --dry-run');
    console.log('  ts-node helper-scripts/fix-timeout-chains.ts frontend/e2e/tests/ --min-deficit 10000');
    process.exit(2);
  }

  if (!fs.existsSync(targetPath)) {
    console.error(`❌ Error: Path does not exist: ${targetPath}`);
    process.exit(2);
  }

  // Check git status (skip in dry-run mode)
  if (!options.dryRun) {
    console.log('🔍 Checking git status...');
    if (!checkGitStatus()) {
      console.error('\n❌ Error: Git working directory is not clean!');
      console.error('Please commit or stash your changes before running this tool.');
      console.error('\nReason: This tool modifies files automatically. Clean git state ensures');
      console.error('you can easily review and revert changes if needed.');
      process.exit(1);
    }
    console.log('✅ Git status clean\n');
  }

  // Run audit
  console.log(`🔍 Auditing timeout chains in: ${targetPath}\n`);
  const violations = await auditDirectory(targetPath);

  // Filter by minimum deficit
  const filteredViolations = violations.filter(v => v.deficit >= options.minDeficit);

  if (filteredViolations.length === 0) {
    console.log('✅ No violations found that need fixing!');
    if (violations.length > 0 && options.minDeficit > 0) {
      console.log(`   (${violations.length} violations exist but are below --min-deficit ${options.minDeficit}ms threshold)`);
    }
    process.exit(0);
  }

  console.log(`📋 Found ${filteredViolations.length} violations to fix`);
  if (violations.length > filteredViolations.length) {
    console.log(`   (Filtered ${violations.length - filteredViolations.length} violations below --min-deficit ${options.minDeficit}ms threshold)`);
  }
  console.log();

  if (options.dryRun) {
    console.log('🔎 DRY RUN MODE - No files will be modified\n');
  }

  // Apply fixes
  const fixes: FixResult[] = [];
  const failures: string[] = [];

  for (const violation of filteredViolations) {
    const requiredTimeout = Math.ceil(violation.childrenSum * 1.1);

    console.log(`📝 ${violation.file}:${violation.testLine}`);
    console.log(`   Test: "${violation.test}"`);
    console.log(`   Current: ${violation.parentTimeout}ms → Recommended: ${requiredTimeout}ms`);
    console.log(`   Deficit: ${Math.ceil(violation.deficit)}ms`);

    if (options.dryRun) {
      console.log(`   [DRY RUN] Would update timeout\n`);
      continue;
    }

    // Determine if this is a load-aware timeout
    const tests = parseTestFile(violation.file);
    const test = tests.find(t => t.testLine === violation.testLine);
    const isLoadAware = test?.isLoadAware ?? false;

    // Apply fix
    const success = applyFix(
      violation.file,
      violation.testLine,
      violation.parentTimeout,
      requiredTimeout,
      isLoadAware
    );

    if (success) {
      fixes.push({
        file: violation.file,
        test: violation.test,
        testLine: violation.testLine,
        oldTimeout: violation.parentTimeout,
        newTimeout: requiredTimeout,
        deficit: violation.deficit,
      });
      console.log(`   ✅ Fixed\n`);
    } else {
      failures.push(`${violation.file}:${violation.testLine} - ${violation.test}`);
      console.log(`   ❌ Failed\n`);
    }
  }

  // Summary
  console.log('═'.repeat(80));
  console.log('\n📊 SUMMARY\n');

  if (options.dryRun) {
    console.log(`Would fix ${filteredViolations.length} violations`);
  } else {
    console.log(`✅ Successfully fixed: ${fixes.length}`);
    if (failures.length > 0) {
      console.log(`❌ Failed to fix: ${failures.length}`);
      console.log('\nFailed fixes:');
      failures.forEach(f => console.log(`  - ${f}`));
    }

    if (fixes.length > 0) {
      console.log('\n📝 Next Steps:');
      console.log('1. Review changes: git diff');
      console.log('2. Run comprehensive tests: ./run-comprehensive-tests.sh');
      console.log('3. If tests pass, commit: git add -A && git commit -m "fix: Apply sequential timeout budget fixes (ISSUE-063)"');
      console.log('4. If tests fail, investigate and adjust, or revert: git restore .');
    }
  }

  process.exit(failures.length > 0 ? 2 : 0);
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { applyFix, checkGitStatus };
