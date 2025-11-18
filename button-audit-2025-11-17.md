<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Button Test ID Audit - 2025-11-17](#button-test-id-audit---2025-11-17)
  - [Summary](#summary)
  - [Audit Status](#audit-status)
    - [IntakeTab.tsx (15 buttons) - ✅ EXCELLENT COVERAGE](#intaketabtsx-15-buttons----excellent-coverage)
    - [App.tsx (28 buttons)](#apptsx-28-buttons)
      - [Modal Buttons](#modal-buttons)
      - [Job Card Buttons](#job-card-buttons)
      - [Header Buttons](#header-buttons)
      - [Tab Navigation (13 tabs)](#tab-navigation-13-tabs)
      - [Content Generation Modal](#content-generation-modal)
      - [Bulk Delete (Rejected Tab)](#bulk-delete-rejected-tab)
  - [Buttons Missing Test IDs (19 total)](#buttons-missing-test-ids-19-total)
    - [High Priority (Used in E2E Tests)](#high-priority-used-in-e2e-tests)
    - [Medium Priority (Modals & Important Actions)](#medium-priority-modals--important-actions)
    - [Lower Priority (IntakeTab buttons)](#lower-priority-intaketab-buttons)
  - [Next Steps](#next-steps)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Button Test ID Audit - 2025-11-17

## Summary
- **Total Buttons in App.tsx**: 28
- **Total Buttons in IntakeTab.tsx**: 15
- **Total**: 43 buttons

## Audit Status

### IntakeTab.tsx (15 buttons) - ✅ EXCELLENT COVERAGE
All sync buttons already have test IDs:
- ✅ Line 742: `sync-all-sources-button`
- ✅ Line 892: `gmail-auth-button`
- ✅ Line 910: `gmail-sync-button` (used in ISSUE-049 test!)
- ✅ Line 935: `gmail-settings-button`
- ✅ Line 1008: `microsoft-auth-button`
- ✅ Line 1026: `microsoft-sync-button` (used in ISSUE-049 test!)
- ✅ Line 1051: `microsoft-settings-button`
- ✅ Line 1110: `linkedin-sync-button`
- ✅ Line 1134: `linkedin-learn-more-button`
- ✅ Line 1218: `rapidapi-sync-button`
- ✅ Line 1246: `rapidapi-reset-button`
- ❌ Line 719: Refilter button - **NEEDS TEST ID**
- ❌ Line 1302: Prompt editor toggle - **NEEDS TEST ID**
- ❌ Line 1373: Prompt editor cancel - **NEEDS TEST ID**
- ❌ Line 1393: Prompt editor save - **NEEDS TEST ID**

### App.tsx (28 buttons)

#### Modal Buttons
- ✅ Line 513: `modal-close-x` (job detail modal)
- ✅ Line 2993: `modal-close-x` (content generation modal)
- ✅ Line 3138: `modal-close-button`
- ✅ Line 3267: `criteria-modal-close-x`
- ✅ Line 3432: `criteria-modal-cancel-button`
- ✅ Line 3448: `criteria-modal-save-button`

#### Job Card Buttons
- ✅ Line 2307: `per-job-refresh-button`
- ✅ Line 2451: `generate-content-button`
- ❌ Line 826: Job modal approve button - **NEEDS TEST ID**
- ❌ Line 841: Job modal reject button - **NEEDS TEST ID**
- ❌ Line 861: Job modal generate content - **NEEDS TEST ID**
- ❌ Line 879: Job modal mark applied - **NEEDS TEST ID**
- ❌ Line 2414: Job card approve button - **NEEDS TEST ID**
- ❌ Line 2429: Job card reject button - **NEEDS TEST ID**

#### Header Buttons
- ✅ Line 2638: `global-refresh-button`
- ✅ Line 2668: `manage-resume-button`
- ❌ Line 2532: Refresh Data button - **NEEDS TEST ID**
- ❌ Line 2573: Configure Criteria button - **NEEDS TEST ID**
- ❌ Line 2603: Rescore All button - **NEEDS TEST ID**

#### Tab Navigation (13 tabs)
- ✅ Line 2765-2770: All tab buttons have dynamic test IDs: `${tab}-tab-button`

#### Content Generation Modal
- ✅ Line 3155: `regenerate-button`
- ✅ Line 3179: `download-button`
- ✅ Line 3199: `create-draft-button`

#### Bulk Delete (Rejected Tab)
- ❌ Line 2829: Select All Gmail button - **NEEDS TEST ID**
- ❌ Line 2846: Deselect All button - **NEEDS TEST ID**
- ❌ Line 2864: Delete Selected button - **NEEDS TEST ID**
- ❌ Line 3524: Delete confirm cancel - **NEEDS TEST ID**
- ❌ Line 3541: Delete confirm execute - **NEEDS TEST ID**

## Buttons Missing Test IDs (19 total)

### High Priority (Used in E2E Tests)
1. Job card approve button (line 2414)
2. Job card reject button (line 2429)
3. Refresh Data button (line 2532)
4. Rescore All button (line 2603)
5. Configure Criteria button (line 2573)

### Medium Priority (Modals & Important Actions)
6. Job modal approve (line 826)
7. Job modal reject (line 841)
8. Job modal generate content (line 861)
9. Job modal mark applied (line 879)
10. Select All Gmail (line 2829)
11. Deselect All (line 2846)
12. Delete Selected (line 2864)
13. Delete confirm cancel (line 3524)
14. Delete confirm execute (line 3541)

### Lower Priority (IntakeTab buttons)
15. Refilter button (IntakeTab line 719)
16. Prompt editor toggle (IntakeTab line 1302)
17. Prompt editor cancel (IntakeTab line 1373)
18. Prompt editor save (IntakeTab line 1393)

## Next Steps
1. Add test IDs to all 19 missing buttons
2. Update E2E tests to use test IDs instead of text/structural locators
3. Run test suite to verify changes
