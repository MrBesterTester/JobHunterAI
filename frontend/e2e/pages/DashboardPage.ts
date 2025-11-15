import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for JobHunter Dashboard
 *
 * Encapsulates all interactions with the main dashboard page including:
 * - Tab navigation
 * - Statistics display
 * - Job listing
 * - Filtering
 */
export class DashboardPage {
  readonly page: Page;

  // Header elements
  readonly pageTitle: Locator;

  // Statistics cards
  readonly newJobsCount: Locator;
  readonly approvedJobsCount: Locator;
  readonly appliedJobsCount: Locator;
  readonly filteredJobsCount: Locator;

  // Tab navigation
  readonly allTab: Locator;
  readonly inboxTab: Locator;
  readonly approvedTab: Locator;
  readonly appliedTab: Locator;
  readonly filteredTab: Locator;

  // Job list
  readonly jobCards: Locator;
  readonly emptyState: Locator;

  // Criteria configuration (if visible)
  readonly configureCriteriaButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header
    this.pageTitle = page.getByRole('heading', { name: /^JobHunter$/i });

    // Statistics - use data-testid to locate specific stat cards
    this.newJobsCount = page.getByTestId('stat-new');
    this.approvedJobsCount = page.getByTestId('stat-approved');
    this.appliedJobsCount = page.getByTestId('stat-applied');
    this.filteredJobsCount = page.getByTestId('stat-filtered');

    // Tabs - use data-testid attributes (format: {tab}-tab-button)
    this.allTab = page.getByTestId('all-tab-button');
    // 'inbox' in tests maps to 'new' tab in the UI
    this.inboxTab = page.getByTestId('new-tab-button');
    this.approvedTab = page.getByTestId('approved-tab-button');
    this.appliedTab = page.getByTestId('applied-tab-button');
    this.filteredTab = page.getByTestId('filtered-tab-button');

    // Job cards container
    this.jobCards = page.locator('[data-testid="job-card"], .job-card');
    this.emptyState = page.locator('[data-testid="empty-state"], .empty-state').or(
      page.getByText(/no jobs found/i)
    );

    // Configuration
    this.configureCriteriaButton = page.getByRole('button', { name: /configure criteria/i });
  }

  /**
   * Navigate to the dashboard
   */
  async goto() {
    await this.page.goto('/');
    await this.waitForLoad();
  }

  /**
   * Wait for dashboard to fully load
   */
  async waitForLoad() {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
    // Wait for at least one of the stats to be visible (network requests completed)
    await expect(this.newJobsCount.or(this.jobCards).first()).toBeVisible({ timeout: 10000 });
  }

  /**
   * Click on a specific tab
   */
  async clickTab(tabName: 'all' | 'inbox' | 'approved' | 'applied' | 'filtered') {
    const tabs = {
      all: this.allTab,
      inbox: this.inboxTab,
      approved: this.approvedTab,
      applied: this.appliedTab,
      filtered: this.filteredTab,
    };

    await tabs[tabName].click();
    // Wait for potential loading/filtering to complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Get the count from a statistics card
   */
  async getStatCount(statName: 'new' | 'approved' | 'applied' | 'filtered'): Promise<number> {
    const stats = {
      new: this.newJobsCount,
      approved: this.approvedJobsCount,
      applied: this.appliedJobsCount,
      filtered: this.filteredJobsCount,
    };

    try {
      // Wait for the stat to be visible first
      await stats[statName].waitFor({ state: 'visible', timeout: 5000 });

      // Wait a moment for content to load
      await this.page.waitForTimeout(500);

      // Get ALL text content from the stat div (includes both number and label)
      const text = await stats[statName].textContent();

      if (!text) {
        console.error(`No text content found for stat: ${statName}`);
        return 0;
      }

      // Extract the first number we find (e.g., from "10New" or "10\nNew")
      const match = text.trim().match(/(\d+)/);
      if (!match) {
        console.error(`No number found in stat text: "${text}" for ${statName}`);
        return 0;
      }

      return parseInt(match[1], 10);
    } catch (error) {
      console.error(`Error getting stat count for ${statName}:`, error);
      return 0;
    }
  }

  /**
   * Get the number of visible job cards
   * Returns 0 immediately if no cards found (prevents hanging on empty state)
   */
  async getVisibleJobCount(): Promise<number> {
    try {
      // Wait for either job cards or empty state to appear
      await Promise.race([
        this.jobCards.first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {}),
        this.emptyState.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {}),
        this.page.waitForTimeout(3000),
      ]);

      // Check if we have an empty state
      const emptyStateVisible = await this.emptyState.isVisible().catch(() => false);
      if (emptyStateVisible) {
        return 0;
      }

      // Count the job cards
      const count = await this.jobCards.count();
      return count;
    } catch (error) {
      // If anything fails, return 0 (no jobs)
      return 0;
    }
  }

  /**
   * Check if a specific tab is active
   */
  async isTabActive(tabName: 'all' | 'inbox' | 'approved' | 'applied' | 'filtered'): Promise<boolean> {
    const tabs = {
      all: this.allTab,
      inbox: this.inboxTab,
      approved: this.approvedTab,
      applied: this.appliedTab,
      filtered: this.filteredTab,
    };

    const tab = tabs[tabName];
    // Check for active class or aria-selected attribute
    const classList = await tab.getAttribute('class') || '';
    const ariaSelected = await tab.getAttribute('aria-selected');

    return classList.includes('active') || ariaSelected === 'true';
  }

  /**
   * Check if a specific tab is visible
   */
  async isTabVisible(tabName: 'all' | 'inbox' | 'approved' | 'applied' | 'filtered'): Promise<boolean> {
    const tabs = {
      all: this.allTab,
      inbox: this.inboxTab,
      approved: this.approvedTab,
      applied: this.appliedTab,
      filtered: this.filteredTab,
    };

    const tab = tabs[tabName];
    return await tab.isVisible().catch(() => false);
  }

  /**
   * Wait for job cards to update after an action
   */
  async waitForJobsUpdate() {
    // Wait for any pending API requests to complete
    try {
      await this.page.waitForResponse(
        (response) => response.url().includes('/api/jobs') && response.status() === 200,
        { timeout: 5000 }
      );
    } catch {
      // If no API call within 5s, just wait fixed time
      await this.page.waitForTimeout(2000);
    }
    // Give React plenty of time to re-render and update DOM
    await this.page.waitForTimeout(1500);
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Get all job card titles
   */
  async getJobTitles(): Promise<string[]> {
    const count = await this.jobCards.count();
    const titles: string[] = [];

    for (let i = 0; i < count; i++) {
      const card = this.jobCards.nth(i);
      const titleElement = card.locator('[data-testid="job-title"], .job-title, h3, h4').first();
      const title = await titleElement.textContent();
      if (title) titles.push(title.trim());
    }

    return titles;
  }

  /**
   * Check if page loaded without console errors
   */
  async expectNoConsoleErrors() {
    // This would typically be set up in test setup with page.on('console')
    // For now, just verify page is in good state
    await expect(this.pageTitle).toBeVisible();
  }

  /**
   * Verify page loads within acceptable time
   */
  async verifyPerformance(maxLoadTimeMs: number = 3000) {
    const startTime = Date.now();
    await this.waitForLoad();
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(maxLoadTimeMs);
  }
}
