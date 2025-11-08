---
id: ISSUE-037
title: Debug Section Display - Job extraction debugging panel
status: open
priority: medium
severity: low
component: frontend
created: 2025-11-08
updated: 2025-11-08
affects: []
related: [ISSUE-036]
---

# ISSUE-037: Debug Section Display - Job extraction debugging panel

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Feature Requirements](#feature-requirements)
  - [Visual Design](#visual-design)
  - [Data Display](#data-display)
- [Current State](#current-state)
- [Root Cause](#root-cause)
- [Evidence](#evidence)
  - [Test 1: Debug Section Display (line 28)](#test-1-debug-section-display-line-28)
  - [Test 2: Extraction Method Badge (line 40)](#test-2-extraction-method-badge-line-40)
  - [Test 3: Raw JSON Display (line 54)](#test-3-raw-json-display-line-54)
  - [Test 4: Scrollable Content (line 118)](#test-4-scrollable-content-line-118)
  - [Test 5: JSON Validation (line 132)](#test-5-json-validation-line-132)
  - [Test 6: Styling Verification (line 181)](#test-6-styling-verification-line-181)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Implement Full Debug Section UI Component](#option-1-implement-full-debug-section-ui-component)
  - [Option 2: Dev-Only Debug Mode with Environment Toggle](#option-2-dev-only-debug-mode-with-environment-toggle)
  - [Option 3: Browser DevTools Extension Approach](#option-3-browser-devtools-extension-approach)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

The Debug Section is a planned development tool feature that would display detailed extraction debugging information on each job card. This feature would help developers and power users troubleshoot LLM extraction issues by showing:

- **Extraction Method**: Whether the job was extracted using LLM, REGEX, or UNKNOWN methods
- **Raw Data JSON**: The complete raw extraction data in a readable, scrollable format
- **Visual Indicators**: Color-coded badges and styling to quickly identify extraction methods

**Status:** Not yet implemented - tests exist but feature has never been built

**Context:** Discovered during ISSUE-036 E2E test triage. 6 tests are failing because this debugging feature doesn't exist in the UI.

## Impact

**Who/What is affected:**
- Developers debugging LLM extraction issues
- Power users investigating why certain jobs were extracted incorrectly
- Quality assurance during job intake from Gmail/LinkedIn/Indeed
- Development workflow when troubleshooting extraction method performance

**Severity:**
- **Low** - This is a "nice to have" debugging feature, not critical functionality
- Does not block core job application workflow
- Would significantly improve developer experience and troubleshooting capabilities
- Currently developers must query the database directly to see extraction metadata

**Value Proposition:**
- Faster debugging of extraction issues
- Transparency into how jobs are being processed
- Ability to compare LLM vs REGEX extraction quality
- In-app visibility without needing database access

## Feature Requirements

Based on E2E test specifications in `frontend/e2e/tests/18-debug-section.spec.ts`:

### Visual Design
- **Section Heading**: "🔧 Debug Info"
- **Background Color**: Yellow/amber (`#fef3c7` / `rgb(254, 243, 199)`)
- **Border**: Orange left border (`#f59e0b` / `rgb(245, 158, 11)`)
- **Placement**: Appears on all job cards across all tabs (New, Approved, Filtered, All)

### Data Display

**1. Extraction Method Badge**
- Display label: "Extraction Method:"
- Values: LLM, REGEX, or UNKNOWN
- Visual styling:
  - LLM: Blue badge with background `rgb(219, 234, 254)` (`#dbeafe`)
  - REGEX: (styling TBD)
  - UNKNOWN: (styling TBD)

**2. Raw Data JSON**
- Display label: "Raw Data JSON:"
- Content: Complete `raw_data` field from job record
- Format: JSON in `<pre>` element
- Scrolling: Max-height of `200px` with `overflow: auto`
- Validation: Must be valid, parseable JSON

**3. Expected JSON Structure**
The raw_data should contain these fields (may be null):
- `extraction_method`
- `title`
- `company`
- `location`
- `description`
- (Other fields from extraction process)

## Current State

**Feature Status:** Not implemented

**Test Status:** 6 E2E tests skipped in `frontend/e2e/tests/18-debug-section.spec.ts`
- Tests were written as part of test suite expansion
- Tests have been skipped with `.skip()` as part of ISSUE-036 Phase 1
- Tests include detailed assertions about expected UI behavior

## Root Cause

**This is an unimplemented feature**, not a bug. The tests were written proactively as part of comprehensive E2E test coverage, but the Debug Section UI component was never built.

**Why this matters:**
- Developers currently lack in-app visibility into extraction metadata
- Troubleshooting extraction issues requires database access via `psql`
- No quick way to compare LLM vs REGEX extraction quality in the UI
- QA workflow would benefit from this transparency

## Evidence

**Test File:** `frontend/e2e/tests/18-debug-section.spec.ts`

The test file contains 6 comprehensive tests that validate this feature:

### Test 1: Debug Section Display (line 28)
```typescript
test('should display debug section on job cards', async ({ page }) => {
  await switchToTab(page, 'all');
  const jobCard = page.locator('[data-testid="job-card"]').first();
  const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();
  await expect(debugSection).toBeVisible();
});
```
**Purpose:** Verify debug section exists on job cards

### Test 2: Extraction Method Badge (line 40)
```typescript
test('should display extraction method in debug section', async ({ page }) => {
  await switchToTab(page, 'all');
  const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")');
  await expect(debugSection.locator('strong:has-text("Extraction Method:")')).toBeVisible();
  const extractionMethodValue = debugSection.locator('span:text-matches("(LLM|REGEX|UNKNOWN)", "i")');
  await expect(extractionMethodValue).toBeVisible();
});
```
**Purpose:** Verify extraction method is displayed with proper label

### Test 3: Raw JSON Display (line 54)
```typescript
test('should display raw data JSON in debug section', async ({ page }) => {
  const jsonPre = debugSection.locator('pre');
  await expect(jsonPre).toBeVisible();
  const jsonText = await jsonPre.textContent();
  expect(jsonText).toBeTruthy();
  expect(jsonText!.length).toBeGreaterThan(10);
  expect(jsonText!.trim()).toMatch(/^[\{\[]/);
  expect(jsonText!.trim()).toMatch(/[\}\]]$/);
});
```
**Purpose:** Verify raw JSON is displayed and properly formatted

### Test 4: Scrollable Content (line 118)
```typescript
test('should have scrollable JSON content when data is large', async ({ page }) => {
  const jsonPre = jobCard.locator('pre');
  const maxHeight = await jsonPre.evaluate(el => window.getComputedStyle(el).maxHeight);
  const overflow = await jsonPre.evaluate(el => window.getComputedStyle(el).overflow);
  expect(maxHeight).toBe('200px');
  expect(overflow).toBe('auto');
});
```
**Purpose:** Verify JSON content is scrollable with max-height constraint

### Test 5: JSON Validation (line 132)
```typescript
test('should parse and validate JSON structure in raw_data', async ({ page }) => {
  const jsonText = await jsonPre.textContent();
  let parsedJson = JSON.parse(jsonText!);
  expect(typeof parsedJson).toBe('object');
  expect(parsedJson).not.toBeNull();
  const expectedFields = ['extraction_method', 'title', 'company', 'location', 'description'];
  for (const field of expectedFields) {
    expect(parsedJson).toHaveProperty(field);
  }
});
```
**Purpose:** Verify JSON is valid and contains expected extraction fields

### Test 6: Styling Verification (line 181)
```typescript
test('should have proper styling for debug section', async ({ page }) => {
  const debugSection = jobCard.locator('div:has-text("🔧 Debug Info")').first();
  const bgColor = await debugSection.evaluate(el => window.getComputedStyle(el).backgroundColor);
  expect(bgColor).toBe('rgb(254, 243, 199)'); // #fef3c7
  const borderLeft = await debugSection.evaluate(el => window.getComputedStyle(el).borderLeftColor);
  expect(borderLeft).toBe('rgb(245, 158, 11)'); // #f59e0b
});
```
**Purpose:** Verify debug section has correct amber/yellow styling

**Test Suite Configuration:**
- Suite-level skip: `test.skip(!shouldRunTest('debug-section'), 'Test suite disabled in test-config.ts')` (line 7)
- Individual test skips: Added in ISSUE-036 Phase 1 with `.skip()` modifier
- Re-enablement: Remove `.skip()` when feature is implemented

## Proposed Solutions

### Option 1: Implement Full Debug Section UI Component

**Description**: Build a complete debug section component that displays on all job cards, showing extraction method badges and raw JSON data with proper styling and scrolling behavior.

**Implementation Steps:**
1. Create `DebugSection.tsx` component in `frontend/src/components/`
2. Add extraction method badge sub-component with color-coded styling
3. Add raw JSON display with scrollable `<pre>` element (max-height: 200px)
4. Style with amber background (#fef3c7) and orange border (#f59e0b)
5. Integrate into `JobCard.tsx` component
6. Ensure visibility across all tabs (New, Approved, Filtered, All)
7. Add toggle to show/hide debug section (optional enhancement)

**Pros**:
- Full feature implementation with all test requirements
- Significant improvement to developer experience
- Enables in-app debugging without database access
- Transparency into extraction quality and method comparison
- Tests can be re-enabled immediately after implementation

**Cons**:
- ~4-6 hours of development work
- Adds visual clutter to job cards (mitigated with toggle)
- May expose sensitive debug data to end users (consider dev-only mode)

**Implementation Effort**: 4-6 hours

**Maintenance**: Low - stable feature once implemented

### Option 2: Dev-Only Debug Mode with Environment Toggle

**Description**: Implement debug section but only show it when `REACT_APP_DEBUG_MODE=true` environment variable is set, making it a developer-only tool.

**Implementation Steps:**
1. Same implementation as Option 1
2. Add environment variable check: `process.env.REACT_APP_DEBUG_MODE === 'true'`
3. Conditionally render debug section based on env var
4. Document in developer setup guide

**Pros**:
- Same benefits as Option 1
- Keeps production UI clean without debug clutter
- No risk of exposing debug data to end users
- Easy to enable for troubleshooting sessions
- Can be enabled in staging environment for QA

**Cons**:
- Requires environment variable setup
- Less discoverable for new developers
- May need to rebuild frontend to toggle

**Implementation Effort**: 4-6 hours (same as Option 1)

**Maintenance**: Low - stable feature once implemented

### Option 3: Browser DevTools Extension Approach

**Description**: Build debug section as a browser extension or DevTools panel rather than in-app UI component.

**Implementation Steps:**
1. Create browser extension with job data inspector
2. Add message passing between app and extension
3. Display extraction metadata in extension panel
4. No changes to main application UI

**Pros**:
- Zero production UI impact
- Professional debugging tool separation
- Can be distributed to team members who need it
- More powerful debugging capabilities possible

**Cons**:
- Significantly more complex (~2-3 days work)
- Requires extension development expertise
- Harder to maintain alongside main app
- Tests would need to be rewritten or removed
- Less accessible to non-technical users

**Implementation Effort**: 2-3 days

**Maintenance**: Medium - requires ongoing extension maintenance

## Decision

**Recommended:** Option 2 (Dev-Only Debug Mode with Environment Toggle)

**Rationale:**
- Balances full feature implementation with production UI cleanliness
- Provides powerful debugging tool without cluttering end-user experience
- Can be easily enabled for troubleshooting sessions
- Tests can be re-enabled after implementation
- Follows best practice of separating debug tools from production UI
- Lower risk than exposing debug data to all users (Option 1)
- More maintainable than browser extension (Option 3)

**Future Enhancement:** Could add user-facing "Show Details" toggle for power users if demand exists.

## Implementation

**Status:** Not yet implemented

**When implementing, follow these steps:**

1. **Create DebugSection Component** (`frontend/src/components/DebugSection.tsx`)
   - Accept `job` prop with extraction metadata
   - Render only when `process.env.REACT_APP_DEBUG_MODE === 'true'`
   - Display "🔧 Debug Info" heading
   - Show extraction method badge with color coding
   - Show raw_data JSON in scrollable `<pre>` element

2. **Style Component**
   - Background: `#fef3c7` (amber/yellow)
   - Border-left: `4px solid #f59e0b` (orange)
   - JSON pre element: `max-height: 200px`, `overflow: auto`
   - LLM badge: `background: #dbeafe` (blue)

3. **Integrate into JobCard**
   - Import DebugSection component
   - Add after main job card content
   - Pass job data including extraction_method and raw_data

4. **Environment Setup**
   - Add `REACT_APP_DEBUG_MODE=true` to `.env.development.local` example
   - Document in README_dev.md or developer setup guide

5. **Re-enable Tests**
   - Remove `.skip()` from 6 tests in `frontend/e2e/tests/18-debug-section.spec.ts`
   - Update test-config.ts to enable debug-section tests
   - Run tests to verify all pass

## Testing

**Test Commands:**
```bash
# Enable debug mode
echo "REACT_APP_DEBUG_MODE=true" >> frontend/.env.development.local

# Restart frontend
cd frontend
npm start

# Run debug section E2E tests
npx playwright test e2e/tests/18-debug-section.spec.ts --project=chromium

# Verify tests pass
# Expected: 6 passed (was 6 skipped)
```

**Manual Verification:**
- [ ] Debug section visible on all job cards when debug mode enabled
- [ ] Debug section hidden when debug mode disabled
- [ ] Extraction method badge displays correctly (LLM/REGEX/UNKNOWN)
- [ ] Raw JSON is valid and scrollable
- [ ] Styling matches specifications (amber bg, orange border)
- [ ] Debug section appears on all tabs (New, Approved, Filtered, All)

**Verification Checklist:**
- [ ] Test 1: Debug section displays on job cards ✓
- [ ] Test 2: Extraction method badge visible with proper label ✓
- [ ] Test 3: Raw JSON displays in `<pre>` element ✓
- [ ] Test 4: JSON content scrollable (max-height: 200px) ✓
- [ ] Test 5: JSON is valid and contains expected fields ✓
- [ ] Test 6: Styling matches spec (amber bg, orange border) ✓

## Status History

- 2025-11-08: ISSUE-037 created and documented
  * Split from ISSUE-036 Category 1 (Unimplemented Features)
  * Comprehensive feature requirements documented from test specifications
  * 6 E2E tests skipped pending implementation
  * Option 2 (Dev-Only Debug Mode) recommended as implementation approach

## Notes

**Use Cases for Debug Section:**
1. **Extraction Method Comparison**
   - Quickly see which jobs were extracted with LLM vs REGEX
   - Identify patterns in extraction quality
   - Compare extraction methods across different job sources (Gmail, LinkedIn, Indeed)

2. **Troubleshooting Extraction Issues**
   - View raw extraction data without database access
   - Identify malformed or missing extraction fields
   - Debug why certain jobs aren't being filtered correctly

3. **QA Workflow**
   - Verify extraction quality during job intake testing
   - Validate LLM extraction improvements
   - Ensure regex fallback is working correctly

**Related Backend Fields:**
- `jobs.extraction_method` - Enum: LLM, REGEX, UNKNOWN
- `jobs.raw_data` - JSONB field containing complete extraction metadata
- Both fields available in job API responses

**Connection to ISSUE-036:**
- This issue was originally Category 1 in ISSUE-036
- 6 tests were skipped as part of ISSUE-036 Phase 1
- Separated into its own issue due to user request for comprehensive feature planning
- Implementation of this feature would remove 6 skipped tests from test suite

## Related Files

**Frontend:**
- `frontend/e2e/tests/18-debug-section.spec.ts` - All 6 E2E tests for this feature
- `frontend/e2e/test-config.ts:7` - Suite-level skip configuration
- `frontend/src/components/` - Location for future DebugSection.tsx component
- `frontend/src/components/JobCard.tsx` - Integration point for debug section

**Backend:**
- `database/schema.sql` - Jobs table with `extraction_method` and `raw_data` fields
- `backend/src/main.rs` - Job API endpoints that return extraction metadata

**Test Files:**
- All tests in `frontend/e2e/tests/18-debug-section.spec.ts`:
  * Line 28: Test 1 - Debug section display
  * Line 40: Test 2 - Extraction method badge
  * Line 54: Test 3 - Raw JSON display
  * Line 118: Test 4 - Scrollable content
  * Line 132: Test 5 - JSON validation
  * Line 181: Test 6 - Styling verification

**Related Issues:**
- `bugs/open/ISSUE-036-e2e-test-failures---32-tests-failing-728-pass-rate.md` - Parent issue documenting all E2E failures
