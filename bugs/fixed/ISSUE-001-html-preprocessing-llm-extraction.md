<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [id: ISSUE-001
title: LLM extraction fails on HTML-heavy Dice emails
status: fixed
priority: medium
severity: medium
component: backend
created: 2025-10-20
updated: 2025-10-21
fixed: 2025-10-21
affects: [LLM Extraction, Email Processing, Job Intake]
related: []
commits: [ced923d, 43e6d01, e77bfbc]](#id-issue-001%0Atitle-llm-extraction-fails-on-html-heavy-dice-emails%0Astatus-fixed%0Apriority-medium%0Aseverity-medium%0Acomponent-backend%0Acreated-2025-10-20%0Aupdated-2025-10-21%0Afixed-2025-10-21%0Aaffects-llm-extraction-email-processing-job-intake%0Arelated-%0Acommits-ced923d-43e6d01-e77bfbc)
- [ISSUE-001: LLM Extraction Fails on HTML-Heavy Dice Emails](#issue-001-llm-extraction-fails-on-html-heavy-dice-emails)
  - [Summary](#summary)
  - [Impact](#impact)
  - [Affected Job(s)](#affected-jobs)
  - [Root Cause](#root-cause)
  - [Partial Fix (2025-10-20)](#partial-fix-2025-10-20)
  - [Complete Fix (2025-10-21)](#complete-fix-2025-10-21)
  - [Root Cause Resolution](#root-cause-resolution)
  - [Documentation Updates](#documentation-updates)
  - [Testing](#testing)
    - [Manual Verification](#manual-verification)
    - [Quality Assurance Testing (2025-10-21)](#quality-assurance-testing-2025-10-21)
  - [Status History](#status-history)
  - [Notes](#notes)
  - [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
id: ISSUE-001
title: LLM extraction fails on HTML-heavy Dice emails
status: fixed
priority: medium
severity: medium
component: backend
created: 2025-10-20
updated: 2025-10-21
fixed: 2025-10-21
affects: [LLM Extraction, Email Processing, Job Intake]
related: []
commits: [ced923d, 43e6d01, e77bfbc]
---

# ISSUE-001: LLM Extraction Fails on HTML-Heavy Dice Emails

## Summary

LLM extraction fails on Dice recruiting emails with excessive HTML markup (36KB+). The `html2text` crate produced bloated output (625% larger) that overwhelmed the LLM, causing timeouts or malformed JSON. Replaced with Mozilla Readability algorithm which reduces HTML by 89.7% and enables successful extraction.

## Impact

- 2 out of 37 jobs (5.4%) failed LLM extraction during bulk re-extraction
- Jobs fell back to regex extraction with lower quality data
- Missing: company industry, tech stack, remote work details, employment type

## Affected Job(s)

- **Job ID**: `94558e12-59db-4751-9556-f36edf9f6260`
- **Title**: "Expert Systems Architect"
- **Source**: Dice recruiting email (36,612 chars HTML)
- **Status**: `filtered` (remains unchanged after fix)

## Root Cause

**Email Structure**:
- 36,612 characters of HTML with DOCTYPE, extensive CSS, nested tables, tracking pixels
- Minimal actual job content buried in markup

**Why it failed**:
- `html2text` crate produced output **625% LARGER** than input (36KB → ~225KB with whitespace)
- LLM received bloated, confusing text
- API timeout or malformed JSON response
- System fell back to regex extraction

**Comparison**:
- Typical successful job: 2-8KB clean text
- This failed job: 36KB HTML → 225KB bloated output

## Partial Fix (2025-10-20)

**Commit**: `ced923d` - "feat: Re-enable regex fallback for failed LLM extractions"

**Changes**:
- Re-enabled regex-based extraction as fallback
- Added `extract_job_from_email` function with regex patterns
- Set `extraction_method` field: "regex" vs "llm"
- UI displays orange "REGEX" badge vs blue "LLM" badge

**Limitations**:
- Regex extraction less accurate than LLM
- Misses nuanced information (remote policies, company culture, tech stack)
- Doesn't solve root cause (HTML overwhelming LLM)

## Complete Fix (2025-10-21)

**Commits**:
- `43e6d01` - "feat: Implement Mozilla Readability algorithm for HTML preprocessing"
- `e77bfbc` - "fix: Change days_onsite_per_week from i32 to f32"

**What was fixed**:
1. Replaced `html2text` (v0.12) with `dom_smoothie` (v0.9)
2. Implemented Mozilla Readability algorithm (Firefox Reader View)
3. HTML preprocessing intelligently removes CSS, tracking pixels, navigation, ads
4. Fixed schema bug: `days_onsite_per_week` now accepts float (e.g., 2.5 days/week)

**Code changes**:
- `backend/Cargo.toml`: Dependency swap
- `backend/src/main.rs:2652`: Rewrote `html_to_text()` with Readability
- `backend/src/main.rs:1679,2724`: Improved HTML detection
- `backend/src/main.rs:340`: Changed `Option<i32>` → `Option<f32>`

**Test Results - 36KB Dice Email**:
- ✅ Readability: **3,752 chars** from **36,626 chars** HTML (89.7% reduction)
- ✅ LLM extracted:
  - Title: "Expert Systems Architect"
  - Company: "OMH Systems"
  - Industry: "Healthcare Technology"
  - Location: "Albany, NY (Hybrid)"
  - Remote policy: hybrid, 2 days/week onsite
  - Tech stack: 13 technologies (.NET, MVC, JavaScript, Azure, AWS, AI/ML, etc.)
- ✅ extraction_method: `llm` (not `regex`)
- ✅ Confidence: 0.85

**Performance**:
- Old: 36KB → ~225KB (625% increase)
- New: 36KB → 3.7KB (89.7% decrease)
- Token usage dramatically reduced

## Root Cause Resolution

✅ HTML noise removed before LLM processing
✅ Token usage reduced 89.7%
✅ LLM successfully extracts from HTML-heavy emails
✅ Maintains regex fallback for edge cases
✅ Schema supports fractional days onsite

## Documentation Updates

- `README.md`: Updated workflow with Readability algorithm details
- `README.md`: Updated workflow diagram showing HTML preprocessing step

## Testing

### Manual Verification

```bash
# Verify extraction method
psql -U jobhunter_user -d jobhunter_personal -c "
SELECT job_id, title, extraction_method,
       raw_data->>'confidence' as confidence,
       raw_data->>'company' as company
FROM jobs WHERE job_id = '94558e12-59db-4751-9556-f36edf9f6260';"

# Re-extract job
curl -X POST http://localhost:8080/api/intake/reextract-job/94558e12-59db-4751-9556-f36edf9f6260

# Count by extraction method
curl -s http://localhost:8080/api/jobs | jq 'group_by(.extraction_method) | map({method: .[0].extraction_method, count: length})'
```

### Quality Assurance Testing (2025-10-21)

**Objective**: Verify that dom_smoothie HTML preprocessing maintains extraction quality compared to html2text method.

**Test Scope**: All 30 filtered jobs
- 29 jobs originally extracted with html2text (old method)
- 1 job extracted with dom_smoothie (new method)

**Test Methodology**:
1. Backup current extraction data for all filtered jobs
2. Re-extract all 30 jobs using new dom_smoothie method
3. Compare old vs new extractions across quality metrics:
   - Field completeness percentage
   - Description length and quality
   - Tech stack size
   - Confidence scores
   - Core field accuracy (title, company, location, salary)

**Test Results**:

| Metric | Old (html2text) | New (dom_smoothie) | Change |
|--------|-----------------|--------------------| -------|
| Field Completeness | 47.7% | 47.3% | -0.4% |
| Description Length | 218 chars | 216 chars | -0.8% |
| Tech Stack Size | 3.3 items | 3.2 items | -0.2 |
| Confidence Score | 0.74 | 0.74 | 0.00 |

**Assessment Breakdown**:
- ✅ Improved: 0/30 (0.0%)
- ✅ Similar: 30/30 (100.0%)
- ❌ Regressed: 0/30 (0.0%)

**Overall Result**: ✅ **PASS** - Quality maintained

**Conclusion**: The dom_smoothie HTML preprocessing successfully maintains extraction quality across all 30 filtered jobs. Minor variations in description wording and field values are within acceptable limits. No significant regressions detected.

**Test Artifacts**:
- Test Script: `scripts/test_extraction_quality.py`
- Backup: `scripts/extraction_backup_2025-10-21_200009.json`
- Full Report: `scripts/extraction_qa_report_2025-10-21_200009.txt`

## Status History

- 2025-10-20: Bug discovered during bulk re-extraction
- 2025-10-20: Partial fix - enabled regex fallback (commit ced923d)
- 2025-10-21: Root cause identified - html2text produces bloated output
- 2025-10-21: Complete fix - implemented Mozilla Readability (commit 43e6d01)
- 2025-10-21: Schema bug fixed - float support for days_onsite (commit e77bfbc)
- 2025-10-21: **QA Testing completed** - 30/30 filtered jobs tested, quality maintained (✅ PASS)
- 2025-10-21: Marked as **RESOLVED**

## Notes

- Job status remained "filtered" (correct behavior - re-extraction only updates raw_data)
- Other failed job "AI Essentials" was actually a course, not a job
- 35/37 jobs (94.6%) originally extracted via LLM
- With regex fallback: 36/37 (97.3%)
- With HTML preprocessing: All HTML emails now extract successfully via LLM
- UI distinguishes extraction methods: blue "LLM" badge vs orange "REGEX" badge

## Related Files

**Implementation**:
- `backend/src/main.rs`: Lines 2652-2678 (html_to_text function)
- `backend/src/main.rs`: Lines 1679, 2724 (HTML detection)
- `backend/src/main.rs`: Line 340 (RemoteWorkDetails schema)
- `backend/src/main.rs`: Lines 3594-3687 (reextract_single_job endpoint)
- `backend/Cargo.toml`: dom_smoothie dependency
- Database: `email_jobs.body_text`, `jobs.extraction_method`

**Testing**:
- `scripts/test_extraction_quality.py`: QA test script (500 lines)
- `scripts/extraction_backup_2025-10-21_200009.json`: Pre-test data backup
- `scripts/extraction_qa_report_2025-10-21_200009.txt`: Full QA test report
