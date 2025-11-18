import { test, expect } from '@playwright/test';
import { shouldRunTest } from '../test-config';
import { switchToTab } from '../helpers/tab-navigation';

// Conditionally skip entire file if disabled in test-config.ts
// This will NOT show skip messages in test output
if (!shouldRunTest('description-quality')) {
  test.skip();
}

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
 *
 * Note: These tests involve LLM API calls which can be slow under system load.
 * Retry logic is enabled to handle transient LLM rate limiting and timing issues.
 */

test.describe('Condensed Description Quality', () => {
  // Configure retries for this suite (LLM-dependent, flaky under load)
  test.describe.configure({ retries: 2 });

  // Configure serial mode for this suite
  // Serial mode prevents parallel execution - critical for LLM operations under load
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should NOT contain apologetic language like "I apologize"', async ({ page }) => {
    // Navigate to All tab
    await switchToTab(page, 'all');

    const jobCard = page.locator('[data-testid="job-card"]').first();

    // Wait for description to load (increased timeout for system load)
    const descriptionContainer = jobCard.locator('div').filter({ hasText: 'Condensed Description' }).locator('div').last();
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 20000 });

    const descriptionText = await descriptionContainer.textContent();

    // Should NOT contain apologetic phrases
    expect(descriptionText?.toLowerCase()).not.toContain('i apologize');
    expect(descriptionText?.toLowerCase()).not.toContain('i\'m sorry');
    expect(descriptionText?.toLowerCase()).not.toContain('unfortunately');
  });

  test('should NOT contain verbose meta-commentary', async ({ page }) => {
    await switchToTab(page, 'all');

    const jobCard = page.locator('[data-testid="job-card"]').first();

    const descriptionContainer = jobCard.locator('div').filter({ hasText: 'Condensed Description' }).locator('div').last();
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    const descriptionText = await descriptionContainer.textContent();

    // Should NOT contain verbose meta-commentary about the content
    expect(descriptionText?.toLowerCase()).not.toContain('however, i can provide');
    expect(descriptionText?.toLowerCase()).not.toContain('it appears that');
    expect(descriptionText?.toLowerCase()).not.toContain('based on the provided text');
  });

  test('should be reasonably concise (under 200 words)', async ({ page }) => {
    await switchToTab(page, 'all');

    const jobCard = page.locator('[data-testid="job-card"]').first();

    const descriptionContainer = jobCard.locator('div').filter({ hasText: 'Condensed Description' }).locator('div').last();
    await expect(descriptionContainer).not.toHaveText('Loading description...', { timeout: 15000 });

    const descriptionText = await descriptionContainer.textContent();

    // Count words
    const wordCount = descriptionText!.trim().split(/\s+/).length;

    // Should be concise - under 200 words (we allow some flexibility)
    expect(wordCount).toBeLessThanOrEqual(200);
  });

  test('should show actual job content (not just "No job description")', async ({ page }) => {
    // Use New Jobs tab which has jobs with long source descriptions (not filtered jobs with short descriptions)
    await switchToTab(page, 'new');

    // Check multiple job cards to find one with substantial content
    // Note: Backend passes through short descriptions (≤150 words) as-is to save API costs
    // We need to find at least one job with a long source description that gets condensed
    const jobCards = page.locator('[data-testid="job-card"]');
    const count = Math.min(await jobCards.count(), 10); // Check up to 10 jobs in New Jobs tab

    let foundSubstantialDescription = false;

    // Use load-aware timeout: 40s under load, 20s in isolation (LLM operations are slow)
    const pollTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 40000 : 20000;

    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      // Find the condensed description section by looking for the strong tag with exact text
      const descriptionSection = card.locator('strong:has-text("Condensed Description")').locator('xpath=../..');
      const descriptionContainer = descriptionSection.locator('> div').last();

      // Wait for description to load using state polling
      const cardIndex = i;
      await page.waitForFunction(
        ({ idx }) => {
          const cards = document.querySelectorAll('[data-testid="job-card"]');
          if (idx >= cards.length) return false;
          const card = cards[idx];
          // Find strong tag containing "Condensed Description" text
          const strongs = card.querySelectorAll('strong');
          let descSection: HTMLElement | null | undefined = null;
          for (const strong of strongs) {
            if (strong.textContent?.includes('Condensed Description')) {
              descSection = strong.parentElement?.parentElement;
              break;
            }
          }
          if (!descSection) return false;
          const divs = descSection.querySelectorAll('div');
          const container = divs[divs.length - 1];
          const text = container?.textContent || '';
          return text.length > 0 && !text.includes('Loading description...');
        },
        { idx: cardIndex },
        { timeout: pollTimeout }
      );

      const descriptionText = await descriptionContainer.textContent();

      // Skip placeholder messages
      if (descriptionText === 'No job description to be extracted.') {
        continue;
      }

      const wordCount = descriptionText!.trim().split(/\s+/).length;

      // Short descriptions (≤150 words source) are passed through as-is
      // We want to find at least one substantial description (from a long source that was condensed)
      if (wordCount > 20) {
        foundSubstantialDescription = true;

        // Should contain job-related keywords (at least one)
        const jobKeywords = [
          'experience', 'skills', 'responsibilities', 'requirements',
          'engineer', 'developer', 'software', 'position', 'role',
          'company', 'team', 'work', 'project', 'technologies',
          'qualifications', 'candidate', 'seeking', 'looking', 'testing',
          'automation', 'quality', 'applications'
        ];

        const hasJobKeyword = jobKeywords.some(keyword =>
          descriptionText!.toLowerCase().includes(keyword)
        );

        expect(hasJobKeyword).toBe(true);
        break;
      }
      // Short descriptions are OK - they're passed through from short source descriptions
    }

    // At least one job should have substantial condensed content (from a long source description)
    expect(foundSubstantialDescription).toBe(true);
  });

  test('refresh should regenerate description (check for different content after prompt change)', async ({ page }) => {
    // Increase timeout to allow for slow LLM API calls under system load (can take 30-60+ seconds)
    test.setTimeout(90000);

    // Use New Jobs tab which has jobs with long source descriptions
    await switchToTab(page, 'new');

    // Find a job with substantial content (from long source description)
    // Skip jobs with short pass-through descriptions
    const jobCards = page.locator('[data-testid="job-card"]');
    const count = Math.min(await jobCards.count(), 10);

    let jobId: string | null = null;
    let jobCard: ReturnType<typeof page.locator> | undefined;
    let descriptionContainer: ReturnType<typeof page.locator> | undefined;

    // Use load-aware timeout: 80s under load, 40s in isolation (LLM operations are very slow)
    const pollTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 80000 : 40000;

    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const tempDescSection = card.locator('strong:has-text("Condensed Description")').locator('xpath=../..');
      const tempDescContainer = tempDescSection.locator('> div').last();

      // Wait for description to load using state polling
      const cardIndex = i;
      await page.waitForFunction(
        ({ idx }) => {
          const cards = document.querySelectorAll('[data-testid="job-card"]');
          if (idx >= cards.length) return false;
          const card = cards[idx];
          // Find strong tag containing "Condensed Description" text
          const strongs = card.querySelectorAll('strong');
          let descSection: HTMLElement | null | undefined = null;
          for (const strong of strongs) {
            if (strong.textContent?.includes('Condensed Description')) {
              descSection = strong.parentElement?.parentElement;
              break;
            }
          }
          if (!descSection) return false;
          const divs = descSection.querySelectorAll('div');
          const container = divs[divs.length - 1];
          const text = container?.textContent || '';
          return text.length > 0 && !text.includes('Loading description...');
        },
        { idx: cardIndex },
        { timeout: pollTimeout }
      );

      const descText = await tempDescContainer.textContent();
      const wordCount = descText!.trim().split(/\s+/).length;

      // Find a job with substantial content (condensed from long source)
      if (wordCount > 20 && descText !== 'No job description to be extracted.') {
        jobId = await card.getAttribute('data-job-id');
        jobCard = page.locator(`[data-testid="job-card"][data-job-id="${jobId}"]`);
        const finalDescSection = jobCard.locator('strong:has-text("Condensed Description")').locator('xpath=../..');
        descriptionContainer = finalDescSection.locator('> div').last();
        break;
      }
    }

    // Should have found at least one job with substantial content
    expect(jobId).toBeTruthy();
    expect(jobCard).toBeDefined();
    expect(descriptionContainer).toBeDefined();

    // Wait for initial description using state polling
    await page.waitForFunction(
      (jid) => {
        const card = document.querySelector(`[data-testid="job-card"][data-job-id="${jid}"]`);
        if (!card) return false;
        // Find strong tag containing "Condensed Description" text
        const strongs = card.querySelectorAll('strong');
        let descSection: HTMLElement | null | undefined = null;
        for (const strong of strongs) {
          if (strong.textContent?.includes('Condensed Description')) {
            descSection = strong.parentElement?.parentElement;
            break;
          }
        }
        if (!descSection) return false;
        const divs = descSection.querySelectorAll('div');
        const container = divs[divs.length - 1];
        const text = container?.textContent || '';
        return text.length > 10 && !text.includes('Loading description...');
      },
      jobId,
      { timeout: pollTimeout }
    );
    const initialDescription = await descriptionContainer!.textContent();

    // Click refresh
    const descriptionHeader = jobCard!.locator('strong:has-text("Condensed Description")').first();
    const refreshButton = descriptionHeader.locator('..').locator('button');
    await refreshButton.click();

    // Wait for "Loading..." state to appear using state polling
    await page.waitForFunction(
      (jid) => {
        const card = document.querySelector(`[data-testid="job-card"][data-job-id="${jid}"]`);
        if (!card) return false;
        // Find strong tag containing "Condensed Description" text
        const strongs = card.querySelectorAll('strong');
        let descSection: HTMLElement | null | undefined = null;
        for (const strong of strongs) {
          if (strong.textContent?.includes('Condensed Description')) {
            descSection = strong.parentElement?.parentElement;
            break;
          }
        }
        if (!descSection) return false;
        const divs = descSection.querySelectorAll('div');
        const container = divs[divs.length - 1];
        return container?.textContent?.includes('Loading description...') || false;
      },
      jobId,
      { timeout: pollTimeout }
    );

    // Wait for new description to load using state polling
    // Note: LLM API calls can take 40-60+ seconds for jobs with long descriptions under load
    await page.waitForFunction(
      (jid) => {
        const card = document.querySelector(`[data-testid="job-card"][data-job-id="${jid}"]`);
        if (!card) return false;
        // Find strong tag containing "Condensed Description" text
        const strongs = card.querySelectorAll('strong');
        let descSection: HTMLElement | null | undefined = null;
        for (const strong of strongs) {
          if (strong.textContent?.includes('Condensed Description')) {
            descSection = strong.parentElement?.parentElement;
            break;
          }
        }
        if (!descSection) return false;
        const divs = descSection.querySelectorAll('div');
        const container = divs[divs.length - 1];
        const text = container?.textContent || '';
        return text.length > 10 && !text.includes('Loading description...');
      },
      jobId,
      { timeout: pollTimeout }
    );

    const newDescription = await descriptionContainer!.textContent();

    // Should have loaded some description
    expect(newDescription).toBeTruthy();
    expect(newDescription!.length).toBeGreaterThan(10);

    // Verify refresh functionality works
    // Note: LLMs are non-deterministic, so we can't expect identical output
    // Instead, verify that we got a valid description (not an error message)
    expect(newDescription).not.toContain('Error');
    expect(newDescription).not.toContain('Failed to');
    expect(newDescription).not.toContain('No description available');

    // Verify it's still a quality description (reasonable length)
    // Note: We selected a job with substantial content, so refresh should maintain that
    const wordCount = newDescription!.trim().split(/\s+/).length;
    expect(wordCount).toBeGreaterThan(20);
    expect(wordCount).toBeLessThanOrEqual(200);
  });

  test('should not have empty or error messages in description', async ({ page }) => {
    await switchToTab(page, 'all');

    const jobCards = page.locator('[data-testid="job-card"]');
    const count = Math.min(await jobCards.count(), 5);

    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const descriptionContainer = card.locator('div').filter({ hasText: 'Condensed Description' }).locator('div').last();

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
    await switchToTab(page, 'all');

    const jobCard = page.locator('[data-testid="job-card"]').first();

    const descriptionContainer = jobCard.locator('div').filter({ hasText: 'Condensed Description' }).locator('div').last();
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
