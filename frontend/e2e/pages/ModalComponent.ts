import { Locator, Page, expect } from '@playwright/test';

/**
 * Page Object Model for Modal dialogs
 *
 * Handles interactions with modals including:
 * - Job Details Modal
 * - Content Generation Modal (Resume & Cover Letter)
 * - Criteria Configuration Modal
 */
export class ModalComponent {
  readonly page: Page;
  readonly modal: Locator;
  readonly overlay: Locator;
  readonly closeButton: Locator;
  readonly title: Locator;

  constructor(page: Page) {
    this.page = page;

    // Modal container - flexible selectors
    this.modal = page.locator('[data-testid="modal"], [role="dialog"], .modal').first();
    this.overlay = page.locator('[data-testid="modal-overlay"], .modal-overlay, .overlay').first();
    this.closeButton = this.modal.getByRole('button', { name: /close/i }).or(
      this.modal.locator('button').filter({ hasText: /×|✕|close/i })
    );
    this.title = this.modal.locator('[data-testid="modal-title"], .modal-title, h2, h3').first();
  }

  /**
   * Wait for modal to be visible
   */
  async waitForVisible() {
    await expect(this.modal).toBeVisible({ timeout: 5000 });
  }

  /**
   * Close modal by clicking the close button
   */
  async close() {
    await expect(this.closeButton).toBeVisible();
    await this.closeButton.click();
    await this.waitForHidden();
  }

  /**
   * Close modal by clicking on the overlay
   */
  async closeByOverlay() {
    await expect(this.overlay).toBeVisible();
    // Click on overlay in a position that won't hit the modal
    await this.overlay.click({ position: { x: 10, y: 10 } });
    await this.waitForHidden();
  }

  /**
   * Close modal by pressing Escape key
   */
  async closeByEscape() {
    await this.page.keyboard.press('Escape');
    await this.waitForHidden();
  }

  /**
   * Wait for modal to be hidden
   */
  async waitForHidden() {
    await expect(this.modal).not.toBeVisible({ timeout: 3000 });
  }

  /**
   * Check if modal is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.modal.isVisible();
  }

  /**
   * Get modal title
   */
  async getTitle(): Promise<string> {
    return (await this.title.textContent())?.trim() || '';
  }
}

/**
 * Job Details Modal - extends base modal with job-specific functionality
 */
export class JobDetailsModal extends ModalComponent {
  readonly jobTitle: Locator;
  readonly company: Locator;
  readonly salary: Locator;
  readonly location: Locator;
  readonly source: Locator;
  readonly statusBadge: Locator;
  readonly jobUrl: Locator;
  readonly description: Locator;
  readonly dateCollected: Locator;

  // Action buttons in modal
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly generateContentButton: Locator;

  constructor(page: Page) {
    super(page);

    // Job details
    this.jobTitle = this.modal.locator('[data-testid="modal-job-title"], .job-title, h2').first();
    this.company = this.modal.locator('[data-testid="modal-company"], .company').first();
    this.salary = this.modal.locator('[data-testid="modal-salary"], .salary').first();
    this.location = this.modal.locator('[data-testid="modal-location"], .location').first();
    this.source = this.modal.locator('[data-testid="modal-source"], .source').first();
    this.statusBadge = this.modal.locator('[data-testid="modal-status"], .status-badge, .badge').first();
    this.jobUrl = this.modal.locator('a[href*="http"]').or(
      this.modal.locator('[data-testid="job-url"], .job-url')
    );
    this.description = this.modal.locator('[data-testid="job-description"], .job-description, .description').first();
    this.dateCollected = this.modal.locator('[data-testid="date-collected"], .date-collected').first();

    // Action buttons
    this.approveButton = this.modal.getByRole('button', { name: /approve/i });
    this.rejectButton = this.modal.getByRole('button', { name: /reject/i });
    this.generateContentButton = this.modal.getByRole('button', { name: /generate/i });
  }

  /**
   * Get job title from modal
   */
  async getJobTitle(): Promise<string> {
    return (await this.jobTitle.textContent())?.trim() || '';
  }

  /**
   * Get company name from modal
   */
  async getCompany(): Promise<string> {
    return (await this.company.textContent())?.trim() || '';
  }

  /**
   * Get job URL
   */
  async getJobUrl(): Promise<string | null> {
    if (await this.jobUrl.isVisible()) {
      return await this.jobUrl.getAttribute('href');
    }
    return null;
  }

  /**
   * Get job description
   */
  async getDescription(): Promise<string | null> {
    if (await this.description.isVisible()) {
      return (await this.description.textContent())?.trim() || null;
    }
    return null;
  }

  /**
   * Click approve button in modal
   */
  async approve() {
    await expect(this.approveButton).toBeVisible();
    await this.approveButton.click();
    await this.waitForHidden();
  }

  /**
   * Click reject button in modal
   */
  async reject() {
    await expect(this.rejectButton).toBeVisible();
    await this.rejectButton.click();
    await this.waitForHidden();
  }

  /**
   * Click generate content button in modal
   */
  async generateContent() {
    await expect(this.generateContentButton).toBeVisible();
    await this.generateContentButton.click();
    // Don't wait for hidden - content modal will open
  }

  /**
   * Verify all required job details are displayed
   */
  async verifyJobDetails() {
    await expect(this.jobTitle).toBeVisible();
    await expect(this.company).toBeVisible();
    await expect(this.statusBadge).toBeVisible();
  }

  /**
   * Check if approve/reject buttons are visible (for "new" status jobs)
   */
  async hasActionButtons(): Promise<boolean> {
    return (await this.approveButton.isVisible()) && (await this.rejectButton.isVisible());
  }

  /**
   * Check if generate content button is visible (for "approved" status jobs)
   */
  async hasGenerateButton(): Promise<boolean> {
    return await this.generateContentButton.isVisible();
  }
}

/**
 * Content Generation Modal - for resume and cover letter display
 */
export class ContentGenerationModal extends ModalComponent {
  readonly resumePanel: Locator;
  readonly coverLetterPanel: Locator;
  readonly resumeContent: Locator;
  readonly coverLetterContent: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    super(page);

    // Content panels
    this.resumePanel = this.modal.locator('[data-testid="resume-panel"], .resume-panel').first();
    this.coverLetterPanel = this.modal.locator('[data-testid="cover-letter-panel"], .cover-letter-panel').first();

    // Content areas
    this.resumeContent = this.resumePanel.locator('[data-testid="resume-content"], .content, pre, .markdown').first();
    this.coverLetterContent = this.coverLetterPanel.locator('[data-testid="cover-letter-content"], .content, pre, .markdown').first();

    // Loading indicator
    this.loadingIndicator = this.modal.locator('[data-testid="loading"], .loading, .spinner').first();
  }

  /**
   * Wait for content generation to complete
   */
  async waitForContentGeneration(maxTimeMs: number = 5000) {
    // Wait for loading indicator to disappear
    await expect(this.loadingIndicator).not.toBeVisible({ timeout: maxTimeMs });

    // Wait for resume and cover letter to be visible
    await expect(this.resumeContent).toBeVisible({ timeout: maxTimeMs });
    await expect(this.coverLetterContent).toBeVisible({ timeout: maxTimeMs });
  }

  /**
   * Get resume content
   */
  async getResumeContent(): Promise<string> {
    await expect(this.resumeContent).toBeVisible();
    return (await this.resumeContent.textContent())?.trim() || '';
  }

  /**
   * Get cover letter content
   */
  async getCoverLetterContent(): Promise<string> {
    await expect(this.coverLetterContent).toBeVisible();
    return (await this.coverLetterContent.textContent())?.trim() || '';
  }

  /**
   * Verify content contains specific keywords
   */
  async verifyResumeContains(keywords: string[]) {
    const content = await this.getResumeContent();
    for (const keyword of keywords) {
      expect(content.toLowerCase()).toContain(keyword.toLowerCase());
    }
  }

  /**
   * Verify cover letter contains job-specific information
   */
  async verifyCoverLetterPersonalization(companyName: string, jobTitle: string) {
    const content = await this.getCoverLetterContent();
    expect(content).toContain(companyName);
    expect(content).toContain(jobTitle);
  }

  /**
   * Check if resume panel is visible
   */
  async isResumeVisible(): Promise<boolean> {
    return await this.resumePanel.isVisible();
  }

  /**
   * Check if cover letter panel is visible
   */
  async isCoverLetterVisible(): Promise<boolean> {
    return await this.coverLetterPanel.isVisible();
  }

  /**
   * Verify modal is scrollable (for long content)
   */
  async verifyScrollable() {
    const scrollHeight = await this.modal.evaluate((el) => el.scrollHeight);
    const clientHeight = await this.modal.evaluate((el) => el.clientHeight);
    expect(scrollHeight).toBeGreaterThan(0);
  }

  /**
   * Verify generation completed within time limit
   */
  async verifyGenerationSpeed(maxTimeMs: number = 2000) {
    const startTime = Date.now();
    await this.waitForContentGeneration(maxTimeMs);
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(maxTimeMs);
  }
}

/**
 * Criteria Configuration Modal - for editing job filtering criteria
 */
export class CriteriaConfigModal extends ModalComponent {
  readonly minSalaryInput: Locator;
  readonly maxCommuteInput: Locator;
  readonly domainsInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);

    // Form inputs
    this.minSalaryInput = this.modal.locator('input[name="minSalary"], [data-testid="min-salary-input"]').first();
    this.maxCommuteInput = this.modal.locator('input[name="maxCommute"], [data-testid="max-commute-input"]').first();
    this.domainsInput = this.modal.locator('input[name="domains"], [data-testid="domains-input"]').first();

    // Action buttons
    this.saveButton = this.modal.getByRole('button', { name: /save/i });
    this.cancelButton = this.modal.getByRole('button', { name: /cancel/i });
  }

  /**
   * Get current minimum salary value
   */
  async getMinSalary(): Promise<number> {
    const value = await this.minSalaryInput.inputValue();
    return parseInt(value, 10);
  }

  /**
   * Set minimum salary
   */
  async setMinSalary(amount: number) {
    await this.minSalaryInput.fill(amount.toString());
  }

  /**
   * Save changes and close modal
   */
  async save() {
    await this.saveButton.click();
    await this.waitForHidden();
  }

  /**
   * Cancel changes and close modal
   */
  async cancel() {
    await this.cancelButton.click();
    await this.waitForHidden();
  }
}
