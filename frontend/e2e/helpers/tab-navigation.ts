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

  // Click the tab button
  await page.click(tabButtonSelector);

  // Wait for tab to become active (React state update complete)
  await page.waitForSelector(`${tabButtonSelector}[aria-selected="true"]`, { timeout: 5000 });

  // For tabs with custom components (intake, calendar, follow-ups, ranked, ignored, failed, duplicates)
  // we don't need to wait for tab content container
  const customComponentTabs: TabType[] = ['intake', 'calendar', 'follow-ups', 'ranked', 'ignored', 'failed', 'duplicates'];

  if (!customComponentTabs.includes(tab)) {
    // Wait for tab content container to appear
    await page.waitForSelector(`[data-testid="${tab}-tab-content"]`, { timeout: 5000 });

    // Optionally wait for job cards
    if (expectJobCards) {
      await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });
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
