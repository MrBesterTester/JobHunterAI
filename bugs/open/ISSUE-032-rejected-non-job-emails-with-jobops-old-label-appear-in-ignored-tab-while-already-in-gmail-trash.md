<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [ISSUE-032: Rejected non-job emails with JobOps-OLD label appear in Ignored tab while already in Gmail trash](#issue-032-rejected-non-job-emails-with-jobops-old-label-appear-in-ignored-tab-while-already-in-gmail-trash)
  - [Problem Description](#problem-description)
  - [Example Case](#example-case)
  - [Root Cause Analysis](#root-cause-analysis)
  - [Impact](#impact)
  - [Related Code](#related-code)
  - [Proposed Solutions](#proposed-solutions)
    - [Option 1: Filter out trashed emails from Ignored tab (Quick fix)](#option-1-filter-out-trashed-emails-from-ignored-tab-quick-fix)
    - [Option 2: Improve email classification (Long-term fix)](#option-2-improve-email-classification-long-term-fix)
    - [Option 3: Clean up orphaned email_jobs records](#option-3-clean-up-orphaned-email_jobs-records)
    - [Option 4: Prevent rejection of non-job emails](#option-4-prevent-rejection-of-non-job-emails)
  - [Recommended Approach](#recommended-approach)
  - [Testing Requirements](#testing-requirements)
  - [Related Issues](#related-issues)
  - [Notes](#notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# ISSUE-032: Rejected non-job emails with JobOps-OLD label appear in Ignored tab while already in Gmail trash

**Type**: Issue
**Status**: Open
**Severity**: Medium
**Component**: Email Classification / Job Rejection
**Created**: 2025-11-06
**Discovered During**: Phase 2.10 manual testing

## Problem Description

Non-job emails that were incorrectly classified as job postings and subsequently rejected remain visible in the Ignored tab even though they are already in Gmail trash with the JobOps-OLD label applied.

## Example Case

During Phase 2.10 testing, a Google Payments email was found:
- Visible in the Ignored (Non-Job Emails) tab
- Also present in Gmail trash
- Has JobOps-OLD label applied
- Should never have been classified as a job posting

## Root Cause Analysis

The sequence of events:
1. Non-job email is incorrectly classified as a job posting during intake
2. User rejects the job (manual rejection)
3. Rejection workflow applies JobOps-OLD label and trashes the email in Gmail
4. Job record is deleted, but email_job record remains in database
5. Email now appears in Ignored tab (because `job_id IS NULL`)
6. Email is simultaneously in Gmail trash (from step 3)

## Impact

1. **User confusion**: Emails appear in Ignored tab even though already trashed
2. **Duplicate operations**: User might attempt to delete/trash again
3. **Data inconsistency**: Database state doesn't match Gmail state
4. **Trust issues**: Users may not trust the classification system

## Related Code

- Email classification: `process_gmail_messages` function
- Job rejection: `reject_job` endpoint (line ~1850)
- Label application: `update_gmail_labels_for_rejected_job` (line 4399)
- Ignored tab query: `get_ignored_emails` (line 6010)

## Proposed Solutions

### Option 1: Filter out trashed emails from Ignored tab (Quick fix)
- Modify `get_ignored_emails` query to exclude emails already in Gmail trash
- Would require checking Gmail API for trash status
- **Pros**: Immediate fix, no classification changes needed
- **Cons**: Additional API calls, doesn't fix root classification problem

### Option 2: Improve email classification (Long-term fix)
- Enhance AI model to better distinguish job postings from other emails
- Add validation rules (e.g., emails from payment systems can't be jobs)
- **Pros**: Fixes root cause, prevents future occurrences
- **Cons**: Requires model updates, more complex implementation

### Option 3: Clean up orphaned email_jobs records
- Add periodic cleanup job to remove email_jobs where Gmail email is trashed
- Sync database state with Gmail state
- **Pros**: Keeps database consistent with Gmail
- **Cons**: Requires periodic sync, adds complexity

### Option 4: Prevent rejection of non-job emails
- Add check in rejection workflow: only allow rejection of records with valid job_id
- Prevent applying JobOps-OLD label to non-job emails
- **Pros**: Prevents the labeling issue, simple check
- **Cons**: Doesn't fix past occurrences, user still can't remove bad emails

## Recommended Approach

**Hybrid solution**:
1. **Immediate**: Add filter to exclude trashed emails from Ignored tab (Option 1)
2. **Short-term**: Prevent rejection of email_jobs without job_id (Option 4)
3. **Long-term**: Improve classification accuracy (Option 2)

## Testing Requirements

1. Create test with intentionally misclassified email
2. Reject the email manually
3. Verify it doesn't appear in Ignored tab
4. Verify JobOps-OLD label not applied to non-job emails
5. Verify database cleanup works correctly

## Related Issues

- Email classification accuracy needs improvement
- Need better validation in rejection workflow
- Database-Gmail state synchronization

## Notes

- This issue was discovered during Phase 2.10 manual testing
- Not caused by Phase 2.10 bulk delete feature
- Pre-existing issue from earlier email processing
- User had to manually restore the Google Payments email from trash
