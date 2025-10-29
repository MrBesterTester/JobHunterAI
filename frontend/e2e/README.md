<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [JobHunter Frontend E2E Tests](#jobhunter-frontend-e2e-tests)
  - [Overview](#overview)
  - [Test Strategy (Updated 2025-10-28)](#test-strategy-updated-2025-10-28)
    - [Test Categories](#test-categories)
    - [Enabling/Disabling Tests](#enablingdisabling-tests)
  - [Test Structure](#test-structure)
  - [Prerequisites](#prerequisites)
  - [Running Tests](#running-tests)
    - [Local Development (Chromium only)](#local-development-chromium-only)
    - [Multi-Browser Testing](#multi-browser-testing)
    - [View Test Results](#view-test-results)
  - [Test Coverage](#test-coverage)
    - [Phase 5 - Complete Test Suite (Implemented)](#phase-5---complete-test-suite-implemented)
    - [Total: 163 Automated Tests Implemented (100% Coverage) 🎉](#total-163-automated-tests-implemented-100%25-coverage-)
  - [Test Patterns](#test-patterns)
    - [Page Object Model (POM)](#page-object-model-pom)
    - [Test Isolation](#test-isolation)
    - [Retries](#retries)
  - [Configuration](#configuration)
    - [playwright.config.ts](#playwrightconfigts)
    - [Environment Variables](#environment-variables)
  - [Debugging](#debugging)
    - [Visual Debugging](#visual-debugging)
    - [Screenshots & Videos](#screenshots--videos)
    - [Console Logs](#console-logs)
  - [CI/CD Integration](#cicd-integration)
  - [Performance Targets](#performance-targets)
  - [Troubleshooting](#troubleshooting)
    - ["Page didn't load in time"](#page-didnt-load-in-time)
    - ["Element not found"](#element-not-found)
    - ["Flaky tests"](#flaky-tests)
    - ["Tests pass locally but fail in CI"](#tests-pass-locally-but-fail-in-ci)
  - [Best Practices](#best-practices)
  - [Contributing](#contributing)
  - [Resources](#resources)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# JobHunter Frontend E2E Tests

Playwright-based end-to-end tests for JobHunter's React frontend.

## Overview

This test suite provides comprehensive browser-based testing for all JobHunter frontend functionality, with a focus on critical user workflows.

**Browser Strategy:**
- **Chromium**: Primary target (runs on every test execution)
- **Firefox & WebKit**: Secondary targets (CI/CD only by default)

## Test Strategy (Updated 2025-10-28)

**Active Tests**: 318 tests across 4 categories (72% of original 441)
**Disabled Tests**: 123 UI/styling tests (28% - preserved for future resurrection)

See [ISSUE-025](../../bugs/open/ISSUE-025-e2e-test-suite-health---skipped-and-failing-tests.md) for full rationale and ROI assessment.

### Test Categories

**Category 1: Core Workflows (128 tests)** - ALWAYS ENABLED
Critical path user workflows that validate end-to-end functionality.
Files: `01-setup-load`, `02-tab-navigation`, `04-content-generation`, `05-job-details`, `06-statistics`, `07-dashboard-statistics`, `09-error-handling`

**Category 2: Features (82 tests)** - ENABLED
Important features not on critical path.
Files: `12-calendar-management`, `13-follow-ups-management`, `14-timeline-view`, `15-intake-tab`, `16-gmail-sync-integration`

**Category 3: Quality (44 tests)** - ENABLED
Non-functional requirements (responsive design, performance, accessibility).
Files: `08-responsive-design`, `10-performance`, `11-accessibility`

**Category 4: Refinements (29 tests)** - ENABLED FOR NOW
Edge cases and refinements - may be disabled in future if maintenance burden increases.
Files: `05-phase-3.1.5-testing-refinement`, `07-filtered-jobs`, `08-failed-duplicates-tabs`

**Disabled Tests (123 tests)** - Can be re-enabled in `test-config.ts`
UI/styling tests with low ROI for maintenance effort.
Files: `05b-new-job-badges`, `06-job-badge-styling`, `05-job-tradeoff-display`, `15-email-composer`, `19-condensed-description`

### Enabling/Disabling Tests

**To enable a disabled test suite:**
1. Open `e2e/test-config.ts`
2. Change flag from `false` to `true` (e.g., `'new-job-badges': true`)
3. Run tests - they will now execute

**To disable an enabled test suite:**
1. Open the test file (e.g., `e2e/tests/XX-my-test.spec.ts`)
2. Add at the top (after imports):
   ```typescript
   import { shouldRunTest } from '../test-config';
   test.skip(!shouldRunTest('my-test-name'), 'Test suite disabled in test-config.ts');
   ```
3. Add entry to `e2e/test-config.ts`:
   ```typescript
   'my-test-name': false,  // Explanation of why disabled
   ```

## Test Structure

```
e2e/
├── tests/              # Test specifications
│   ├── 01-setup-load.spec.ts           # Page load & network tests
│   ├── 02-tab-navigation.spec.ts       # Tab switching & filtering
│   ├── 03-job-status-updates.spec.ts   # Approve/reject workflows
│   └── 04-content-generation.spec.ts   # Resume & cover letter generation
├── pages/              # Page Object Models
│   ├── DashboardPage.ts                # Main dashboard interactions
│   ├── JobCardComponent.ts             # Job card interactions
│   └── ModalComponent.ts               # Modal dialogs
├── fixtures/           # Test utilities
│   ├── test-data.ts                    # Sample job data
│   └── test-helpers.ts                 # Helper functions
└── README.md           # This file
```

## Prerequisites

1. **Backend server running** on `http://localhost:8080`
   ```bash
   cd backend
   cargo run
   ```

2. **Database populated** with sample job data

3. **Frontend dev server** (will start automatically during tests)

## Running Tests

### Local Development (Chromium only)

```bash
# Run all tests
npm run test:e2e

# Run tests with visible browser
npm run test:e2e:headed

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npm run test:e2e tests/01-setup-load.spec.ts

# Debug mode
npm run test:e2e:debug
```

### Multi-Browser Testing

```bash
# Run on all browsers (Chromium, Firefox, WebKit)
npm run test:e2e:ci

# Run on specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Mobile viewports
npm run test:e2e:mobile
```

### View Test Results

```bash
# Show HTML report
npm run test:e2e:report
```

## Test Coverage

### Phase 5 - Complete Test Suite (Implemented)

✅ **01-setup-load.spec.ts** (10 tests)
- Page load under 3 seconds
- Network API calls validation
- Console error checking
- Performance metrics

✅ **02-tab-navigation.spec.ts** (15 tests)
- Tab switching (Inbox, Approved, Applied, Filtered, All)
- Job count validation
- Job card display (title, company, salary, location, badges)
- Filtered reasons display
- Empty state handling

✅ **03-job-status-updates.spec.ts** (18 tests)
- Approve workflow (Inbox → Approved)
- Reject workflow (Inbox → Rejected)
- Statistics updates
- API request validation (PUT /api/jobs/{id}/status)
- Response validation (200 OK)
- Error handling
- Data consistency checks

✅ **04-content-generation.spec.ts** (20 tests)
- Generate button visibility
- Content generation timing (< 2 seconds)
- Modal display (resume & cover letter side-by-side)
- Domain-specific keywords (Testing, AI, Firmware)
- Job-specific personalization
- Modal interactions (close button, overlay, Escape key)
- Content quality validation
- Performance validation

✅ **05-job-details.spec.ts** (18 tests)
- Job details modal display
- Modal content validation (title, company, salary, location, source, URL, description)
- Action buttons (Approve/Reject for new jobs, Generate for approved jobs)
- Modal interactions (close button, overlay, Escape key)
- Focus management and keyboard navigation

✅ **06-statistics.spec.ts** (18 tests)
- Statistics accuracy for all job statuses
- Real-time updates without page refresh
- Data consistency validation
- API endpoint testing (/api/jobs/stats, /api/criteria)
- Criteria configuration verification ($130K salary, 45-min commute, domains)
- Concurrent update handling

✅ **07-filtered-jobs.spec.ts** (10 tests)
- Filtered jobs display with indicators
- Filtered reasons visibility and accuracy
- Specific reason validation (salary, commute, domain)
- Multiple filter reasons handling
- Visual distinction of filtered content

✅ **08-responsive-design.spec.ts** (18 tests)
- Desktop layout (1920x1080): Full width, grid/list view, horizontal stats
- Tablet layout (768px): Responsive stacking, modal sizing
- Mobile layout (375px): Touch targets (44x44px), full-screen modals, no horizontal scroll
- Cross-viewport transitions
- Orientation changes (portrait/landscape)

✅ **09-error-handling.spec.ts** (20 tests)
- API failure simulation (500 errors, network timeout, server unavailable)
- Empty state handling (no jobs in database, zero jobs per tab)
- Long content handling (200+ character titles, long descriptions)
- Special characters (Unicode, HTML/XSS, symbols)
- Edge cases (rapid actions, concurrent updates, missing fields)

✅ **10-performance.spec.ts** (16 tests)
- First Contentful Paint < 3 seconds
- Time to Interactive < 5 seconds
- Memory leak detection
- API response times < 100ms average
- Content generation < 2 seconds
- Large dataset handling (100+ jobs)
- Network optimization (caching, request minimization)
- Runtime performance (FPS, re-render optimization)

✅ **11-accessibility.spec.ts** (20 tests)
- Keyboard navigation (Tab, Shift+Tab, Enter, Escape, Arrow keys)
- Focus indicators on all interactive elements
- Focus trapping in modals
- ARIA labels and landmarks
- Semantic HTML (headings, nav, main)
- Screen reader support (accessible names, button labels)
- Color contrast validation
- Keyboard-only workflows

### Total: 163 Automated Tests Implemented (100% Coverage) 🎉

**Test Code Statistics:**
- 11 test specification files
- ~4,400 lines of test code
- 3 Page Object Models
- 2 fixture files (test data & helpers)

## Test Patterns

### Page Object Model (POM)

All interactions with UI elements are encapsulated in Page Object Models:

```typescript
// Example: Using DashboardPage
const dashboardPage = new DashboardPage(page);
await dashboardPage.goto();
await dashboardPage.clickTab('inbox');
const count = await dashboardPage.getStatCount('new');
```

### Test Isolation

Each test:
- Starts from dashboard home page
- Is independent of other tests
- Cleans up after itself (if needed)

### Retries

Tests automatically retry 2x if they fail (configured for flakiness tolerance).

## Configuration

### playwright.config.ts

Key settings:
- **Workers**: 4 parallel workers
- **Timeout**: 30 seconds per test
- **Retries**: 2 (CI), 1 (local)
- **Base URL**: http://localhost:3000
- **Screenshots**: On failure only
- **Videos**: On failure only

### Environment Variables

```bash
# Run all browsers (for CI/CD)
CI=true npm run test:e2e

# Skip webkit/firefox (default for local)
npm run test:e2e
```

## Debugging

### Visual Debugging

```bash
# Run with headed browser
npm run test:e2e:headed

# Interactive UI mode
npm run test:e2e:ui

# Debug mode (step through)
npm run test:e2e:debug
```

### Screenshots & Videos

After test failures:
- **Screenshots**: `test-results/*.png`
- **Videos**: `test-results/*.webm`
- **Traces**: `test-results/*.zip` (open with `npx playwright show-trace <file>`)

### Console Logs

Check test output for:
- API request/response logs
- Console errors from browser
- Performance metrics

## CI/CD Integration

See `.github/workflows/e2e-tests.yml` for GitHub Actions configuration.

**Workflow:**
1. Trigger on push to main or PRs
2. Start PostgreSQL service
3. Run backend server
4. Execute E2E tests on Chromium, Firefox, WebKit
5. Upload artifacts (screenshots, videos, reports)
6. Require 100% pass rate to merge

## Performance Targets

- **Page Load**: < 3 seconds
- **API Responses**: < 100ms (average)
- **Content Generation**: < 2 seconds
- **Test Suite Execution**: < 5 minutes (parallelized)

## Troubleshooting

### "Page didn't load in time"
- Ensure backend server is running on port 8080
- Check database is accessible
- Verify frontend builds successfully

### "Element not found"
- UI selectors might have changed - update Page Object Models
- Check if feature is behind a feature flag
- Verify test data exists in database

### "Flaky tests"
- Increase timeouts in page object methods
- Add more robust wait conditions
- Check for race conditions in API calls

### "Tests pass locally but fail in CI"
- Verify CI environment has same Node/browser versions
- Check for timing issues (CI might be slower)
- Ensure test data is seeded correctly

## Best Practices

1. **Use Page Objects**: Never interact with selectors directly in tests
2. **Wait for conditions**: Use `expect(element).toBeVisible()` not `waitForTimeout()`
3. **Test user workflows**: Not implementation details
4. **Keep tests independent**: Don't rely on test execution order
5. **Meaningful assertions**: Check actual behavior, not just "no errors"

## Contributing

When adding new tests:
1. Create test file in `e2e/tests/`
2. Follow naming convention: `##-feature-name.spec.ts`
3. Use existing Page Objects or create new ones
4. Add test to this README's coverage list
5. Ensure tests pass in all browsers (CI will verify)

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Test Best Practices](https://playwright.dev/docs/best-practices)
- [JobHunter Testing Strategy](../../README_auto-test-plan.md)
