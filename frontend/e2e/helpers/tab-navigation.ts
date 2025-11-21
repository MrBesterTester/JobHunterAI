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
 * @param customTimeout - Optional custom timeout for job cards wait (ISSUE-063 Option 5)
 */
export async function switchToTab(
  page: Page,
  tab: TabType,
  expectJobCards: boolean = shouldExpectJobCards(tab),
  customTimeout?: number
): Promise<void> {
  const tabButtonSelector = `[data-testid="${tab}-tab-button"]`;

  // Calculate load-aware timeouts for ALL waits (ISSUE-057 fix)
  // Under comprehensive test load (4 parallel workers), UI operations take longer
  const baseTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 15000 : 5000;
  // ISSUE-063 Option 5: Allow custom timeout override for specific tests (e.g., Gmail sync with heavy load)
  const jobCardsTimeout = customTimeout ?? (process.env.CI || process.env.COMPREHENSIVE_TESTS ? 45000 : 10000);

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
