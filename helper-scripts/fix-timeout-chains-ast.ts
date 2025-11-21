#!/usr/bin/env ts-node
/**
 * AST-Based Timeout Chain Fix Tool
 *
 * Uses TypeScript compiler API to properly parse and modify test files.
 * Adds or updates test.setTimeout() calls with correct placement.
 *
 * Usage:
 *   ts-node helper-scripts/fix-timeout-chains-ast.ts <path-to-test-files> [options]
 *
 * Options:
 *   --dry-run           Show what would be fixed without making changes
 *   --min-deficit N     Only fix violations with deficit >= N ms (default: 0)
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { auditDirectory, parseTestFile } from './audit-timeout-chains';

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
 * Find the test function node for a given line number
 */
function findTestAtLine(sourceFile: ts.SourceFile, testLine: number): ts.CallExpression | null {
  let result: ts.CallExpression | null = null;

  function visit(node: ts.Node) {
    // Look for test() call expressions
    if (ts.isCallExpression(node)) {
      const expression = node.expression;

      // Check if this is a test() or test.skip() or test.only() call
      let isTestCall = false;
      if (ts.isIdentifier(expression) && expression.text === 'test') {
        isTestCall = true;
      } else if (ts.isPropertyAccessExpression(expression)) {
        const obj = expression.expression;
        if (ts.isIdentifier(obj) && obj.text === 'test') {
          isTestCall = true;
        }
      }

      if (isTestCall) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        if (line === testLine) {
          result = node;
          return;
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return result;
}

/**
 * Check if test already has setTimeout call
 */
function hasSetTimeout(testNode: ts.CallExpression): { exists: boolean; node?: ts.CallExpression; value?: number } {
  // Get the test function (last argument, should be arrow function or function expression)
  const args = testNode.arguments;
  if (args.length < 2) return { exists: false };

  const testFunc = args[args.length - 1];
  if (!ts.isArrowFunction(testFunc) && !ts.isFunctionExpression(testFunc)) {
    return { exists: false };
  }

  const body = testFunc.body;
  if (!ts.isBlock(body)) return { exists: false };

  // Look for test.setTimeout() in the first few statements
  for (let i = 0; i < Math.min(3, body.statements.length); i++) {
    const stmt = body.statements[i];
    if (ts.isExpressionStatement(stmt)) {
      const expr = stmt.expression;
      if (ts.isCallExpression(expr)) {
        const callExpr = expr.expression;

        // Check for test.setTimeout
        if (ts.isPropertyAccessExpression(callExpr)) {
          const obj = callExpr.expression;
          const prop = callExpr.name;
          if (ts.isIdentifier(obj) && obj.text === 'test' &&
              prop.text === 'setTimeout') {
            // Extract timeout value
            const timeoutArg = expr.arguments[0];
            let timeoutValue = 30000; // default

            // Handle getTestTimeout(N) wrapper
            if (ts.isCallExpression(timeoutArg)) {
              const innerArg = timeoutArg.arguments[0];
              if (ts.isNumericLiteral(innerArg)) {
                timeoutValue = parseInt(innerArg.text);
              }
            } else if (ts.isNumericLiteral(timeoutArg)) {
              timeoutValue = parseInt(timeoutArg.text);
            }

            return { exists: true, node: expr, value: timeoutValue };
          }
        }
      }
    }
  }

  return { exists: false };
}

/**
 * Apply fix using AST manipulation
 */
function applyFixAST(
  filePath: string,
  testLine: number,
  oldTimeout: number,
  newTimeout: number,
  isLoadAware: boolean
): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const testNode = findTestAtLine(sourceFile, testLine);
    if (!testNode) {
      console.error(`  ⚠️  Warning: Could not find test() call at line ${testLine}`);
      return false;
    }

    const setTimeoutInfo = hasSetTimeout(testNode);

    // Get the test function body
    const args = testNode.arguments;
    const testFunc = args[args.length - 1];
    if (!ts.isArrowFunction(testFunc) && !ts.isFunctionExpression(testFunc)) {
      console.error(`  ⚠️  Warning: Test function is not an arrow function or function expression`);
      return false;
    }

    const body = testFunc.body;
    if (!ts.isBlock(body)) {
      console.error(`  ⚠️  Warning: Test function body is not a block`);
      return false;
    }

    let newContent: string;

    if (setTimeoutInfo.exists && setTimeoutInfo.node) {
      // Update existing setTimeout
      const setTimeoutNode = setTimeoutInfo.node;
      const start = setTimeoutNode.getStart();
      const end = setTimeoutNode.getEnd();
      const oldText = content.substring(start, end);

      // Create new setTimeout call
      const newSetTimeout = isLoadAware
        ? `test.setTimeout(getTestTimeout(${newTimeout}))`
        : `test.setTimeout(${newTimeout})`;

      newContent = content.substring(0, start) + newSetTimeout + content.substring(end);
    } else {
      // Add new setTimeout after opening brace
      const bodyStart = body.getStart() + 1; // +1 to skip the opening brace

      // Find the indentation of the first statement
      const firstStatement = body.statements[0];
      let indent = '    '; // default 4 spaces
      if (firstStatement) {
        const firstStmtPos = firstStatement.getStart();
        const lineStart = content.lastIndexOf('\n', firstStmtPos) + 1;
        const leadingWhitespace = content.substring(lineStart, firstStmtPos);
        if (/^\s+$/.test(leadingWhitespace)) {
          indent = leadingWhitespace;
        }
      }

      // Create setTimeout statement
      const setTimeoutCall = isLoadAware
        ? `${indent}test.setTimeout(getTestTimeout(${newTimeout}));\n`
        : `${indent}test.setTimeout(${newTimeout});\n`;

      newContent = content.substring(0, bodyStart) + '\n' + setTimeoutCall + content.substring(bodyStart);
    }

    fs.writeFileSync(filePath, newContent, 'utf-8');
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
    console.log('Usage: ts-node helper-scripts/fix-timeout-chains-ast.ts <path-to-test-files> [options]');
    console.log('\nOptions:');
    console.log('  --dry-run           Show what would be fixed without making changes');
    console.log('  --min-deficit N     Only fix violations with deficit >= N ms (default: 0)');
    console.log('\nExamples:');
    console.log('  ts-node helper-scripts/fix-timeout-chains-ast.ts frontend/e2e/tests/');
    console.log('  ts-node helper-scripts/fix-timeout-chains-ast.ts frontend/e2e/tests/ --dry-run');
    console.log('  ts-node helper-scripts/fix-timeout-chains-ast.ts frontend/e2e/tests/ --min-deficit 10000');
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
    const success = applyFixAST(
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

export { applyFixAST, checkGitStatus };
