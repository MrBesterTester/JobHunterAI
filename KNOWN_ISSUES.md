# Known Issues

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Issue Status Definitions](#issue-status-definitions)
- [Active Issues](#active-issues)
  - [ISSUE-001: LLM extraction fails on HTML-heavy Dice emails](#issue-001-llm-extraction-fails-on-html-heavy-dice-emails)
    - [Affected Job(s)](#affected-jobs)
    - [Problem Description](#problem-description)
    - [Symptoms](#symptoms)
    - [Root Cause Analysis](#root-cause-analysis)
    - [Potential Solutions](#potential-solutions)
    - [Related Files and References](#related-files-and-references)
    - [Test Commands](#test-commands)
    - [Notes](#notes)
- [Resolved Issues](#resolved-issues)
- [Won't Fix Issues](#wont-fix-issues)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

This document tracks known bugs and issues in the JobHunter application. Issues are documented with full analysis to enable efficient resolution in future work sessions.

## Issue Status Definitions

- **Active**: Issue is present and unresolved
- **In Progress**: Actively being worked on
- **Resolved**: Issue has been fixed (kept for reference)
- **Won't Fix**: Issue documented but not planned for resolution

---

## Active Issues

### ISSUE-001: LLM extraction fails on HTML-heavy Dice emails

**Status:** Active
**Priority:** Medium
**Date Discovered:** 2025-10-20
**Component:** Backend LLM extraction
**Affected File(s):** `backend/src/main.rs` (extract_job_from_email_async, lines 2700-2800)

#### Affected Job(s)
- **Job ID:** `94558e12-59db-4751-9556-f36edf9f6260`
- **Title:** "Expert Systems Architect"
- **Subject:** "Hybrid in Albany, NY :: Expert Systems Architect :: Any Vise Except H1B"
- **Source:** Dice recruiting email
- **Current Status:** `filtered` (job status not changed by extraction failure)

#### Problem Description

LLM extraction fails on certain Dice recruiting emails with excessive HTML markup. During bulk re-extraction (`bulk-re-extraction.sh`), 2 out of 37 jobs failed to extract, with this job being one of them.

#### Symptoms

1. Job's `updated_at` timestamp not updated during bulk re-extraction
2. No `company_industry` or `employment_type_source` fields populated
3. Job remained in its original status (not moved to "failed")
4. No error logged to backend console (silent failure)

#### Root Cause Analysis

**Email Structure:**
- **Body text size:** 36,612 characters of HTML
- **Content:** Full HTML document with:
  - DOCTYPE declaration
  - Extensive `<style>` blocks with CSS
  - Complex nested `<table>` structures for layout
  - Tracking pixels (1x1 images)
  - Minimal actual job content buried in markup

**Why it fails:**
- Not "too structured" but "too much HTML noise"
- Actual job description buried in ~36KB of boilerplate
- Likely causes:
  1. LLM API timeout processing excessive input
  2. LLM produces malformed JSON due to confusion
  3. Token limits exceeded
  4. Silent error in JSON parsing

**Comparison with successful extractions:**
- Typical successful job: 2-8KB of clean text
- This failed job: 36KB of HTML markup

#### Potential Solutions

1. **HTML-to-text preprocessing** (Recommended)
   - Strip HTML tags before sending to LLM
   - Use a library like `html2text` or `readability`
   - Extract plain text content only
   - Pros: Cleaner input, lower token usage
   - Cons: Might lose formatting clues

2. **Increase LLM API timeout**
   - Current timeout might be too aggressive
   - Allow more processing time for large inputs
   - Pros: Simple fix
   - Cons: Doesn't address root cause, slower overall

3. **Better error handling and logging**
   - Capture and log raw LLM errors
   - Add response validation before parsing
   - Log when jobs are skipped or fail
   - Pros: Better visibility into failures
   - Cons: Doesn't fix the issue, just makes it visible

4. **Character limit threshold**
   - Skip extraction for emails over N characters
   - Flag for manual review
   - Pros: Prevents waste of API calls
   - Cons: Jobs might not get processed at all

5. **Hybrid approach** (Best)
   - Apply HTML stripping + character limit
   - Add timeout handling + better logging
   - Retry failed extractions with plain text
   - Track extraction method used

#### Related Files and References

- `backend/src/main.rs`: Lines 2700-2800 (extract_job_from_email_async)
- `backend/src/main.rs`: Lines 3525-3590 (reextract_all_jobs endpoint)
- `bulk-re-extraction.sh`: Bulk re-extraction script that revealed the issue
- Database: `email_jobs` table, `body_text` field

#### Test Commands

```bash
# Check the problematic job
psql -U jobhunter_user -d jobhunter_personal -c "
SELECT
  j.job_id,
  j.title,
  j.status,
  LENGTH(e.body_text) as body_chars,
  e.body_text IS NOT NULL as has_body
FROM jobs j
JOIN email_jobs e ON j.job_id = e.job_id
WHERE j.job_id = '94558e12-59db-4751-9556-f36edf9f6260';
"

# Manually retry extraction
curl -X POST http://localhost:8080/api/intake/reextract/94558e12-59db-4751-9556-f36edf9f6260
```

#### Notes

- The job status remained "filtered" - extraction failure doesn't change workflow status
- This is the correct behavior (re-extraction only updates raw_data, not status)
- The other failed job "AI Essentials" (4e8e5c5d) is actually a course, not a real job
- 35/37 jobs (94.6%) extracted successfully, so this is an edge case

---

## Resolved Issues

*No resolved issues yet.*

---

## Won't Fix Issues

*No "won't fix" issues yet.*
