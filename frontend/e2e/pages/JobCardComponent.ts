import { Locator, Page, expect } from '@playwright/test';

/**
 * Page Object Model for individual Job Card component
 *
 * Handles interactions with a single job card including:
 * - Reading job details
 * - Status updates (approve/reject)
 * - Content generation
 * - Opening job details modal
 */
export class JobCardComponent {
  readonly card: Locator;
  readonly page: Page;

  // Job information elements
  readonly title: Locator;
  readonly company: Locator;
  readonly salary: Locator;
  readonly location: Locator;
  readonly source: Locator;
  readonly status: Locator;

  // Badges and indicators
  readonly salaryBadge: Locator;
  readonly locationBadge: Locator;
  readonly commuteBadge: Locator;
  readonly statusIcon: Locator;

  // Action buttons
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly generateContentButton: Locator;

  // Filtered reasons (for filtered jobs)
  readonly filteredReasonsSection: Locator;
  readonly filteredReasons: Locator;

  constructor(card: Locator, page: Page) {
    this.card = card;
    this.page = page;

    // Job details
    this.title = card.locator('[data-testid="job-title"], .job-title, h3, h4').first();
    this.company = card.locator('[data-testid="job-company"], .job-company').first();
    this.salary = card.locator('[data-testid="job-salary"], .job-salary').first();
    this.location = card.locator('[data-testid="job-location"], .job-location').first();
    this.source = card.locator('[data-testid="job-source"], .job-source').first();
    this.status = card.locator('[data-testid="job-status"], .job-status').first();

    // Badges
    this.salaryBadge = card.locator('[data-testid="salary-badge"], .salary-badge, .badge').filter({ hasText: /\$/i }).first();
    this.locationBadge = card.locator('[data-testid="location-badge"], .location-badge, .badge').filter({ hasText: /remote|location|commute/i }).first();
    this.commuteBadge = card.locator('[data-testid="commute-badge"], .commute-badge').first();
    this.statusIcon = card.locator('[data-testid="status-icon"], .status-icon, svg').first();

    // Action buttons - more flexible selectors
    this.approveButton = card.getByRole('button', { name: /approve/i }).or(
      card.locator('button').filter({ hasText: /approve/i })
    );
    this.rejectButton = card.getByRole('button', { name: /reject/i }).or(
      card.locator('button').filter({ hasText: /reject/i })
    );
    this.generateContentButton = card.getByRole('button', { name: /generate/i }).or(
      card.locator('button').filter({ hasText: /generate|resume|cover letter/i })
    );

    // Filtered reasons
    this.filteredReasonsSection = card.locator('[data-testid="filtered-reasons"], .filtered-reasons');
    this.filteredReasons = this.filteredReasonsSection.locator('li, .reason');
  }

  /**
   * Get job title text
   */
  async getTitle(): Promise<string> {
    return (await this.title.textContent())?.trim() || '';
  }

  /**
   * Get company name
   */
  async getCompany(): Promise<string> {
    return (await this.company.textContent())?.trim() || '';
  }

  /**
   * Get salary text
   */
  async getSalary(): Promise<string | null> {
    if (await this.salary.isVisible()) {
      return (await this.salary.textContent())?.trim() || null;
    }
    return null;
  }

  /**
   * Get salary as a number (extracts numeric value)
   */
  async getSalaryAmount(): Promise<number | null> {
    const salaryText = await this.getSalary();
    if (!salaryText) return null;

    // Extract number from formats like "$150,000", "$150K", "150000"
    const match = salaryText.match(/\$?([\d,]+)k?/i);
    if (!match) return null;

    let amount = parseInt(match[1].replace(/,/g, ''), 10);

    // Handle "K" suffix
    if (salaryText.toLowerCase().includes('k')) {
      amount *= 1000;
    }

    return amount;
  }

  /**
   * Get location text
   */
  async getLocation(): Promise<string | null> {
    if (await this.location.isVisible()) {
      return (await this.location.textContent())?.trim() || null;
    }
    return null;
  }

  /**
   * Check if salary badge is green (≥$130K)
   */
  async isSalaryBadgeGreen(): Promise<boolean> {
    if (!(await this.salaryBadge.isVisible())) return false;

    const classList = await this.salaryBadge.getAttribute('class') || '';
    const style = await this.salaryBadge.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
      };
    });

    // Check for green class or green background color
    return classList.includes('green') ||
           classList.includes('success') ||
           style.backgroundColor.includes('green') ||
           style.backgroundColor.includes('rgb(34, 197, 94)'); // Tailwind green-500
  }

  /**
   * Check if location badge indicates Remote
   */
  async isRemoteJob(): Promise<boolean> {
    const locationText = await this.getLocation();
    return locationText?.toLowerCase().includes('remote') || false;
  }

  /**
   * Click the Approve button
   */
  async approve() {
    await expect(this.approveButton).toBeVisible();
    await this.approveButton.click();
    // Wait for action to complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Click the Reject button
   */
  async reject() {
    await expect(this.rejectButton).toBeVisible();
    await this.rejectButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click the Generate Resume & Cover Letter button
   */
  async generateContent() {
    await expect(this.generateContentButton).toBeVisible();
    await this.generateContentButton.click();
    // Wait for modal to appear or generation to start
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get the Generate button locator (for Phase 3.1.4 tests)
   */
  async getGenerateButton(): Promise<Locator> {
    await expect(this.generateContentButton).toBeVisible();
    return this.generateContentButton;
  }

  /**
   * Click on the job card (not on buttons) to open details modal
   */
  async openDetails() {
    // Click on the title or a non-button area
    await this.title.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get filtered reasons (for jobs with status="filtered")
   */
  async getFilteredReasons(): Promise<string[]> {
    if (!(await this.filteredReasonsSection.isVisible())) {
      return [];
    }

    const count = await this.filteredReasons.count();
    const reasons: string[] = [];

    for (let i = 0; i < count; i++) {
      const reason = await this.filteredReasons.nth(i).textContent();
      if (reason) reasons.push(reason.trim());
    }

    return reasons;
  }

  /**
   * Check if card has filtered reasons displayed
   */
  async hasFilteredReasons(): Promise<boolean> {
    return await this.filteredReasonsSection.isVisible();
  }

  /**
   * Verify approve button is present
   */
  async expectApproveButtonVisible() {
    await expect(this.approveButton).toBeVisible();
  }

  /**
   * Verify reject button is present
   */
  async expectRejectButtonVisible() {
    await expect(this.rejectButton).toBeVisible();
  }

  /**
   * Verify generate content button is present
   */
  async expectGenerateButtonVisible() {
    await expect(this.generateContentButton).toBeVisible();
  }

  /**
   * Wait for card to be removed from DOM (after status change)
   */
  async waitForRemoval() {
    await expect(this.card).not.toBeVisible({ timeout: 3000 });
  }

  /**
   * Check if card is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.card.isVisible();
  }
}

/**
 * Helper function to create a JobCardComponent from a page and index
 */
export async function getJobCard(page: Page, index: number = 0): Promise<JobCardComponent> {
  const cards = page.locator('[data-testid="job-card"], .job-card');
  await expect(cards.nth(index)).toBeVisible({ timeout: 5000 });
  return new JobCardComponent(cards.nth(index), page);
}

/**
 * Helper function to get all job cards
 */
export async function getAllJobCards(page: Page): Promise<JobCardComponent[]> {
  const cards = page.locator('[data-testid="job-card"], .job-card');
  const count = await cards.count();
  const jobCards: JobCardComponent[] = [];

  for (let i = 0; i < count; i++) {
    jobCards.push(new JobCardComponent(cards.nth(i), page));
  }

  return jobCards;
}
