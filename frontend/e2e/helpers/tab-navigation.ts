/**
 * E2E Test Helper: Tab Navigation
 *
 * Provides robust tab switching utilities for E2E tests.
 * Addresses BUG-0004: Tab clicks in Playwright don't reliably trigger React state changes.
 *
 * Usage:
 *   import { switchToTab } from '../helpers/tab-navigation';
 *   await switchToTab(page, 'all');
 */

import { Page } from '@playwright/test';

export type TabType = 'ignored' | 'intake' | 'filtered' | 'failed' | 'duplicates' | 'new' | 'approved' | 'applied' | 'follow-ups' | 'calendar' | 'ranked' | 'all';

/**
 * Switches to a tab and waits for React state updates to complete
 *
 * This function addresses the race condition where Playwright clicks happen
 * before React event handlers attach, or setState doesn't trigger re-renders
 * in the test environment.
 *
 * Steps:
 * 1. Click the tab button using explicit data-testid
 * 2. Wait for button's aria-selected="true" (React state updated)
 * 3. Wait for tab content container to appear
 * 4. Optionally wait for job cards if expectJobCards is true
 *
 * @param page - Playwright Page object
 * @param tab - Tab to switch to
 * @param expectJobCards - Whether to wait for job cards (default: true for tabs with job lists)
 */
export async function switchToTab(
  page: Page,
  tab: TabType,
  expectJobCards: boolean = shouldExpectJobCards(tab)
): Promise<void> {
  const tabButtonSelector = `[data-testid="${tab}-tab-button"]`;

  // Calculate load-aware timeouts for ALL waits (ISSUE-057 fix)
  // Under comprehensive test load (4 parallel workers), UI operations take longer

  // DEBUG: FORCE visibility of env var by throwing if not set during comprehensive tests
  // This will make the test fail with a descriptive error showing what the worker sees
  const comprehensiveTestsValue = process.env.COMPREHENSIVE_TESTS;
  const ciValue = process.env.CI;

  // If this times out at 10s, force an explicit error with diagnostic info
  const baseTimeout = ciValue || comprehensiveTestsValue ? 15000 : 5000;
  const jobCardsTimeout = ciValue || comprehensiveTestsValue ? 45000 : 10000;

  // DIAGNOSTIC: If jobCardsTimeout is 10000, this means env var is NOT set
  if (jobCardsTimeout === 10000 && tab === 'new') {
    // Force diagnostic output before the timeout happens
    throw new Error(`[ISSUE-056 DIAGNOSTIC] switchToTab('${tab}') using 10s timeout (NOT 45s)! ` +
      `CI=${ciValue}, COMPREHENSIVE_TESTS=${comprehensiveTestsValue}, ` +
      `baseTimeout=${baseTimeout}, jobCardsTimeout=${jobCardsTimeout}. ` +
      `This means the env var did NOT propagate to this worker!`);
  }

  // Click the tab button
  await page.click(tabButtonSelector);

  // Wait for tab to become active (React state update complete)
  // FIXED: Now uses load-aware timeout instead of fixed 5s
  await page.waitForSelector(`${tabButtonSelector}[aria-selected="true"]`, { timeout: baseTimeout });

  // For tabs with custom components (intake, calendar, follow-ups, ranked, ignored, failed, duplicates)
  // we don't need to wait for tab content container
  const customComponentTabs: TabType[] = ['intake', 'calendar', 'follow-ups', 'ranked', 'ignored', 'failed', 'duplicates'];

  if (!customComponentTabs.includes(tab)) {
    // Wait for tab content container to appear
    // FIXED: Now uses load-aware timeout instead of fixed 5s (this was where Test #441 timed out)
    await page.waitForSelector(`[data-testid="${tab}-tab-content"]`, { timeout: baseTimeout });

    // Optionally wait for job cards with load-aware timeout
    // Increased from 30s to 45s based on ISSUE-055 audit - tab switch + API + render can take longer under comprehensive test load
    if (expectJobCards) {
      await page.waitForFunction(
        () => document.querySelectorAll('[data-testid="job-card"]').length > 0,
        { timeout: jobCardsTimeout }
      );
    }
  }
}

/**
 * Determines if a tab should expect job cards by default
 */
function shouldExpectJobCards(tab: TabType): boolean {
  // Tabs that show job card lists
  const jobCardTabs: TabType[] = ['new', 'approved', 'applied', 'filtered', 'all'];
  return jobCardTabs.includes(tab);
}
