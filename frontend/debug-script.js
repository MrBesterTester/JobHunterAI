/**
 * DEBUG TOOL: Manual Debug Section Verification Script
 *
 * PURPOSE: This is a DEBUGGING TOOL, not an automated test.
 * Used to manually verify the debug section feature and capture console errors.
 *
 * WHEN TO USE:
 * - When debug section is not displaying correctly on job cards
 * - To capture browser console errors that don't show in E2E tests
 * - To visually verify styling and layout issues
 * - For manual smoke testing after major changes
 *
 * AUTOMATED TESTS: See frontend/e2e/tests/18-debug-section.spec.ts
 * - 8 automated E2E tests cover debug section functionality
 * - Tests run as part of comprehensive test suite (test-config.ts line 65)
 * - Use this script only for manual debugging/troubleshooting
 *
 * USAGE:
 *   cd frontend
 *   node debug-script.js
 *
 * RELATED:
 * - ISSUE-037: Debug section implementation
 * - Created: 2025-11-11 to diagnose "process is not defined" error
 * - Result: Identified RSBuild config issue with environment variable injection
 */

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs and errors
  const logs = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    logs.push({ type, text });
    console.log(`[${type.toUpperCase()}] ${text}`);
  });

  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
    console.log(error.stack);
  });

  try {
    console.log('\n🔍 Navigating to app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('✅ Page loaded\n');

    console.log('📸 Taking screenshot of initial page...');
    await page.screenshot({ path: '/tmp/debug-01-initial.png' });

    console.log('\n🔍 Clicking "New Jobs" tab...');
    await page.click('button:has-text("New Jobs")');
    await page.waitForTimeout(2000);

    console.log('📸 Taking screenshot after clicking New Jobs...');
    await page.screenshot({ path: '/tmp/debug-02-new-jobs-clicked.png' });

    console.log('\n🔍 Checking for job cards...');
    const jobCardCount = await page.locator('[data-testid="job-card"]').count();
    console.log(`Found ${jobCardCount} job cards`);

    if (jobCardCount === 0) {
      console.log('\n❌ NO JOB CARDS FOUND - Checking page content...');
      const bodyText = await page.locator('body').textContent();
      console.log(`Page text length: ${bodyText.length} characters`);
      console.log(`First 500 chars: ${bodyText.substring(0, 500)}`);
    }

    console.log('\n🔍 Checking for debug sections...');
    const debugCount = await page.locator('div:has-text("🔧 Debug Info")').count();
    console.log(`Found ${debugCount} debug sections`);

    console.log('\n📊 Console Error Summary:');
    const errors = logs.filter(log => log.type === 'error');
    if (errors.length > 0) {
      console.log(`❌ Found ${errors.length} console errors:`);
      errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.text}`);
      });
    } else {
      console.log('✅ No console errors');
    }

    console.log('\n⏸️  Browser will stay open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
})();
