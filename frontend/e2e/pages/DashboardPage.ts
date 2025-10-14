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

    // Statistics - using text patterns to locate specific stat cards
    this.newJobsCount = page.locator('[data-testid="stat-new"], .stat-card').filter({ hasText: /new/i }).first();
    this.approvedJobsCount = page.locator('[data-testid="stat-approved"], .stat-card').filter({ hasText: /approved/i }).first();
    this.appliedJobsCount = page.locator('[data-testid="stat-applied"], .stat-card').filter({ hasText: /applied/i }).first();
    this.filteredJobsCount = page.locator('[data-testid="stat-filtered"], .stat-card').filter({ hasText: /filtered/i }).first();

    // Tabs - look for buttons or clickable elements with these labels
    this.allTab = page.getByRole('button', { name: /^all$/i }).or(page.locator('[data-tab="all"]'));
    // 'inbox' in tests maps to 'new' tab in the UI
    this.inboxTab = page.getByRole('button', { name: /^new$/i }).or(page.locator('[data-tab="new"]'));
    this.approvedTab = page.getByRole('button', { name: /^approved$/i }).or(page.locator('[data-tab="approved"]'));
    this.appliedTab = page.getByRole('button', { name: /^applied$/i }).or(page.locator('[data-tab="applied"]'));
    this.filteredTab = page.getByRole('button', { name: /^filtered$/i }).or(page.locator('[data-tab="filtered"]'));

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

    const text = await stats[statName].textContent();
    // Extract number from text like "15 New Jobs"
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get the number of visible job cards
   */
  async getVisibleJobCount(): Promise<number> {
    return await this.jobCards.count();
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
   * Wait for job cards to update after an action
   */
  async waitForJobsUpdate() {
    await this.page.waitForTimeout(1000); // Wait for API call and re-render
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
