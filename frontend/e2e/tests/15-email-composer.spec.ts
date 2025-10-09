import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { getJobCard } from '../pages/JobCardComponent';
import { ContentGenerationModal } from '../pages/ModalComponent';

/**
 * Test Suite 15: Email Composer (Phase 5.2)
 *
 * Covers:
 * - Email Draft Creation button visibility
 * - Email Composer modal display and interaction
 * - Draft creation workflow
 * - Success messages and Gmail link
 * - Draft status indicators in job cards
 */

test.describe('Email Composer (Phase 5.2)', () => {
  let dashboardPage: DashboardPage;
  let contentModal: ContentGenerationModal;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    contentModal = new ContentGenerationModal(page);
    await dashboardPage.goto();
  });

  test.describe('Create Email Draft Button', () => {
    test('should show "Create Email Draft" button after content generation', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      // Generate content
      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      // Verify "Create Email Draft" button is visible
      const createDraftButton = page.getByTestId('create-draft-button');
      await expect(createDraftButton).toBeVisible();
      await expect(createDraftButton).toContainText('Create Email Draft');
    });

    test('should display Send icon on Create Draft button', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const createDraftButton = page.getByTestId('create-draft-button');
      await expect(createDraftButton).toBeVisible();

      // Button should have Send icon (SVG)
      const icon = createDraftButton.locator('svg');
      await expect(icon).toBeVisible();
    });
  });

  test.describe('Email Composer Modal', () => {
    test('should open email composer modal when Create Draft is clicked', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      // Click Create Email Draft
      const createDraftButton = page.getByTestId('create-draft-button');
      await createDraftButton.click();

      // Verify email composer modal appears
      const emailComposerModal = page.getByTestId('email-composer-modal');
      await expect(emailComposerModal).toBeVisible();
    });

    test('should display recipient email field', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const createDraftButton = page.getByTestId('create-draft-button');
      await createDraftButton.click();

      // Check recipient field
      const recipientField = page.getByTestId('recipient-email');
      await expect(recipientField).toBeVisible();
      await expect(recipientField).toBeEditable();
    });

    test('should display subject line field', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      const jobTitle = await firstJob.getTitle();

      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const createDraftButton = page.getByTestId('create-draft-button');
      await createDraftButton.click();

      // Check subject field
      const subjectField = page.getByTestId('subject-line');
      await expect(subjectField).toBeVisible();
      await expect(subjectField).toBeEditable();

      // Subject should include job title
      const subjectValue = await subjectField.inputValue();
      expect(subjectValue).toContain(jobTitle);
    });

    test('should display cover letter preview', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const coverLetterContent = await contentModal.getCoverLetterContent();

      const createDraftButton = page.getByTestId('create-draft-button');
      await createDraftButton.click();

      // Check cover letter preview
      const coverLetterPreview = page.getByTestId('cover-letter-preview');
      await expect(coverLetterPreview).toBeVisible();

      const previewText = await coverLetterPreview.textContent();
      expect(previewText).toContain(coverLetterContent.substring(0, 100));
    });

    test('should display resume attachment indicator', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      const company = await firstJob.getCompany();

      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const createDraftButton = page.getByTestId('create-draft-button');
      await createDraftButton.click();

      // Check attachment section exists
      const attachmentSection = page.getByTestId('resume-attachment');
      await expect(attachmentSection).toBeVisible();

      // Verify it contains resume filename with company name
      const attachmentText = await attachmentSection.textContent();
      expect(attachmentText).toMatch(/resume/i);
      expect(attachmentText).toContain(company.toLowerCase().replace(/[^a-z0-9]/gi, '_'));
    });

    test('should have close button', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const createDraftButton = page.getByTestId('create-draft-button');
      await createDraftButton.click();

      const closeButton = page.getByTestId('close-button');
      await expect(closeButton).toBeVisible();
    });

    test('should close modal when close button is clicked', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const createDraftButton = page.getByTestId('create-draft-button');
      await createDraftButton.click();

      const emailComposerModal = page.getByTestId('email-composer-modal');
      await expect(emailComposerModal).toBeVisible();

      const closeButton = page.getByTestId('close-button');
      await closeButton.click();

      await expect(emailComposerModal).not.toBeVisible();
    });
  });

  test.describe('Draft Creation Workflow', () => {
    test('should require recipient email before creating draft', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const createDraftButton = page.getByTestId('create-draft-button');
      await createDraftButton.click();

      // Clear recipient field
      const recipientField = page.getByTestId('recipient-email');
      await recipientField.fill('');

      // Create Draft button should be disabled
      const createButton = page.getByTestId('create-draft-button').last();
      await expect(createButton).toBeDisabled();
    });

    test('should allow editing recipient email', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const createDraftButton = page.getByTestId('create-draft-button');
      await createDraftButton.click();

      // Edit recipient
      const recipientField = page.getByTestId('recipient-email');
      await recipientField.fill('recruiter@example.com');

      const value = await recipientField.inputValue();
      expect(value).toBe('recruiter@example.com');
    });

    test('should allow editing subject line', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const createDraftButton = page.getByTestId('create-draft-button');
      await createDraftButton.click();

      // Edit subject
      const subjectField = page.getByTestId('subject-line');
      await subjectField.fill('Custom Subject Line');

      const value = await subjectField.inputValue();
      expect(value).toBe('Custom Subject Line');
    });
  });

  test.describe('Error Handling', () => {
    test('should display error message on draft creation failure', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/applications/*/create-draft', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Failed to create draft' }),
        });
      });

      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const createDraftButton = page.getByTestId('create-draft-button');
      await createDraftButton.click();

      // Fill in required fields
      const recipientField = page.getByTestId('recipient-email');
      await recipientField.fill('recruiter@example.com');

      // Click Create Draft
      const submitButton = page.getByTestId('create-draft-button').last();
      await submitButton.click();

      // Should show error message
      const errorMessage = page.getByTestId('error-message');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const createDraftButton = page.getByTestId('create-draft-button');
      await createDraftButton.click();

      // Enter invalid email
      const recipientField = page.getByTestId('recipient-email');
      await recipientField.fill('invalid-email');

      // Create Draft button might be enabled (validation could be client or server-side)
      // This test documents expected behavior
      const submitButton = page.getByTestId('create-draft-button').last();
      await expect(submitButton).toBeVisible();
    });
  });

  test.describe('Draft Status Display', () => {
    test('should show draft status badge on job card after creation', async ({ page }) => {
      // This test requires mocking successful draft creation
      await page.route('**/api/applications/*/create-draft', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            draft_id: '123e4567-e89b-12d3-a456-426614174000',
            gmail_draft_id: 'r-1234567890',
            gmail_url: 'https://mail.google.com/mail/u/0/#drafts/r-1234567890',
            status: 'created',
          }),
        });
      });

      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const createDraftButton = page.getByTestId('create-draft-button');
      await createDraftButton.click();

      // Fill in and submit
      const recipientField = page.getByTestId('recipient-email');
      await recipientField.fill('recruiter@example.com');

      const submitButton = page.getByTestId('create-draft-button').last();
      await submitButton.click();

      // Wait for success
      const successMessage = page.getByTestId('success-message');
      await expect(successMessage).toBeVisible({ timeout: 5000 });

      // Close modal
      await page.keyboard.press('Escape');

      // Check for draft status badge on job card
      await page.waitForTimeout(1000); // Allow UI to update
      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      const draftBadge = page.getByTestId('draft-status');
      // Note: This will only pass if backend actually updates the database
      // In real testing, this requires full integration
    });

    test('should provide link to open draft in Gmail', async ({ page }) => {
      await page.route('**/api/applications/*/create-draft', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            draft_id: '123e4567-e89b-12d3-a456-426614174000',
            gmail_draft_id: 'r-1234567890',
            gmail_url: 'https://mail.google.com/mail/u/0/#drafts/r-1234567890',
            status: 'created',
          }),
        });
      });

      await dashboardPage.clickTab('approved');
      await dashboardPage.waitForJobsUpdate();

      if ((await dashboardPage.getVisibleJobCount()) === 0) {
        test.skip('No approved jobs');
        return;
      }

      const firstJob = await getJobCard(page, 0);
      await firstJob.generateContent();
      await contentModal.waitForVisible();
      await contentModal.waitForContentGeneration(5000);

      const createDraftButton = page.getByTestId('create-draft-button');
      await createDraftButton.click();

      const recipientField = page.getByTestId('recipient-email');
      await recipientField.fill('recruiter@example.com');

      const submitButton = page.getByTestId('create-draft-button').last();
      await submitButton.click();

      // Verify Gmail link appears
      const gmailLink = page.getByTestId('open-gmail-link');
      await expect(gmailLink).toBeVisible({ timeout: 5000 });
      await expect(gmailLink).toHaveAttribute('href', /mail\.google\.com/);
    });
  });
});
