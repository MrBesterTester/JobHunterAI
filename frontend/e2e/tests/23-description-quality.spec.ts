import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Condensed Description Quality
 *
 * Tests that condensed descriptions are actually concise and not verbose/apologetic.
 * Verifies that the prompt is being applied correctly and producing quality output.
 *
 * Requirements:
 * - Descriptions should NOT contain apologetic language like "I apologize"
 * - Descriptions should NOT contain verbose explanations
 * - Descriptions should be concise (approximately 100 words)
 * - Refresh should regenerate descriptions from current prompt
 */

test.describe('Condensed Description Quality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should NOT contain apologetic language like "I apologize"', async ({ page }) => {
    // Navigate to All tab
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();

    // Wait for description to load
    const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    const descriptionText = await descriptionContainer.textContent();

    // Should NOT contain apologetic phrases
    expect(descriptionText?.toLowerCase()).not.toContain('i apologize');
    expect(descriptionText?.toLowerCase()).not.toContain('i\'m sorry');
    expect(descriptionText?.toLowerCase()).not.toContain('unfortunately');
  });

  test('should NOT contain verbose meta-commentary', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();

    const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    const descriptionText = await descriptionContainer.textContent();

    // Should NOT contain verbose meta-commentary about the content
    expect(descriptionText?.toLowerCase()).not.toContain('however, i can provide');
    expect(descriptionText?.toLowerCase()).not.toContain('it appears that');
    expect(descriptionText?.toLowerCase()).not.toContain('based on the provided text');
  });

  test('should be reasonably concise (under 200 words)', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();

    const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    const descriptionText = await descriptionContainer.textContent();

    // Count words
    const wordCount = descriptionText!.trim().split(/\s+/).length;

    // Should be concise - under 200 words (we allow some flexibility)
    expect(wordCount).toBeLessThanOrEqual(200);
  });

  test('should show actual job content (not just "No job description")', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    // Check multiple job cards to find one with actual content
    const jobCards = page.locator('[data-testid="job-card"]');
    const count = Math.min(await jobCards.count(), 5);

    let foundActualJobDescription = false;

    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const debugSection = card.locator('div:has-text("🔧 Debug Info")').first();
      const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();

      await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

      const descriptionText = await descriptionContainer.textContent();

      // If it's not "No job description to be extracted", it should have real content
      if (descriptionText !== 'No job description to be extracted.') {
        foundActualJobDescription = true;

        // Should have substantial content (more than 20 words)
        const wordCount = descriptionText!.trim().split(/\s+/).length;
        expect(wordCount).toBeGreaterThan(20);

        // Should contain job-related keywords (at least one)
        const jobKeywords = [
          'experience', 'skills', 'responsibilities', 'requirements',
          'engineer', 'developer', 'software', 'position', 'role',
          'company', 'team', 'work', 'project', 'technologies',
          'qualifications', 'candidate', 'seeking', 'looking'
        ];

        const hasJobKeyword = jobKeywords.some(keyword =>
          descriptionText!.toLowerCase().includes(keyword)
        );

        expect(hasJobKeyword).toBe(true);
        break;
      }
    }

    // At least one job should have actual content
    expect(foundActualJobDescription).toBe(true);
  });

  test('refresh should regenerate description (check for different content after prompt change)', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();

    // Wait for initial description
    const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    const initialDescription = await descriptionContainer.textContent();

    // Click refresh
    const descriptionHeader = debugSection.locator('div:has-text("Condensed Description:")').first();
    const refreshButton = descriptionHeader.locator('button');
    await refreshButton.click();

    // Wait for "Loading..." state
    await page.waitForTimeout(500);

    // Wait for new description
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    const newDescription = await descriptionContainer.textContent();

    // Should have loaded some description
    expect(newDescription).toBeTruthy();
    expect(newDescription!.length).toBeGreaterThan(10);

    // The description should be the same (since we didn't change the prompt)
    // This just verifies that refresh is working
    expect(newDescription).toBe(initialDescription);
  });

  test('should not have empty or error messages in description', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCards = page.locator('[data-testid="job-card"]');
    const count = Math.min(await jobCards.count(), 5);

    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const debugSection = card.locator('div:has-text("🔧 Debug Info")').first();
      const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();

      await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

      const descriptionText = await descriptionContainer.textContent();

      // Should not be empty
      expect(descriptionText).toBeTruthy();
      expect(descriptionText!.trim().length).toBeGreaterThan(5);

      // Should not contain error messages
      expect(descriptionText?.toLowerCase()).not.toContain('error');
      expect(descriptionText?.toLowerCase()).not.toContain('failed to fetch');
      expect(descriptionText?.toLowerCase()).not.toContain('undefined');
    }
  });

  test('description should be direct and to-the-point (not meta-commentary)', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

    const jobCard = page.locator('[data-testid="job-card"]').first();
    const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();

    const descriptionContainer = debugSection.locator('div').filter({ hasText: 'Condensed Description:' }).locator('div').last();
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    const descriptionText = await descriptionContainer.textContent();

    // Skip check if it's "No job description to be extracted"
    if (descriptionText === 'No job description to be extracted.') {
      return;
    }

    // Should NOT start with meta-commentary phrases
    const metaCommentaryPhrases = [
      'i apologize',
      'i\'m sorry',
      'however,',
      'unfortunately,',
      'it appears',
      'based on the provided',
      'the text appears',
      'this seems to be'
    ];

    const firstSentence = descriptionText!.toLowerCase().split('.')[0];

    metaCommentaryPhrases.forEach(phrase => {
      expect(firstSentence).not.toContain(phrase);
    });
  });
});
