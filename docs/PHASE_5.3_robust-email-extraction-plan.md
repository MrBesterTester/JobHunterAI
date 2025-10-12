# Phase 5.3: Robust Email Extraction Plan

## Executive Summary

Current job extraction from Gmail achieves only **30% success rate** (15/50 emails), with poor data quality in extracted jobs. This document proposes multiple approaches to improve extraction accuracy and quality, with recommendation for LLM-based extraction.

## Current State Analysis

### Metrics
- **50 emails** discovered from Gmail
- **15 emails** (30%) successfully extracted with confidence > 0.3
- **35 emails** (70%) failed extraction (low confidence)
- **7 unique jobs** created (8 were duplicates)
- **Poor extraction quality**: Random text as company names, incorrect salaries

### Root Causes
1. **Regex-based extraction is too simplistic** for real-world job emails
2. **HTML content** not properly parsed (tags interfere with extraction)
3. **Email structure variation**: Recruiters use diverse formats
4. **Subject line parsing insufficient**: Not all job info in subject
5. **Body text extraction failures**: Many emails have empty body_text field

### Sample Data
**Successful extraction (but poor quality):**
- Subject: "Exciting Job opportunity for Hardware Engineer in Sunnyvale, CA"
- Body: HTML with recruiter message
- Result: Extracted "Extracted Job" as title, random text as company

**Failed extractions:**
- Subject: "Hiring for SDET with JAVA at Weehawken, NJ (Onsite) (Full Time)"
- Body: Empty (extraction failed)
- Result: No job created

## Proposed Solutions

### Option 1: Enhanced Regex + HTML Parsing (Low Cost, Medium Improvement)

**Approach:**
- Add HTML-to-text conversion before extraction
- Expand regex patterns to handle more formats
- Multi-pass extraction (subject → body → combined)
- Structured field extraction (salary patterns, location formats, etc.)

**Pros:**
- No external dependencies
- Fast execution
- Low/no cost
- Full control over logic

**Cons:**
- Still brittle to format variations
- Requires ongoing maintenance as email formats change
- Limited to pattern matching
- May still have low success rate (~50%)

**Estimated Effort:** 2-3 days
**Estimated Cost:** $0/month

### Option 2: LLM-Based Extraction (Recommended)

**Approach:**
- Use Claude API (Anthropic) for structured data extraction
- Leverage same LLM infrastructure (no new dependencies)
- Prompt engineering for job information extraction
- Fallback to regex for simple cases (cost optimization)

**Architecture:**
```rust
async fn extract_job_from_email_llm(
    subject: &Option<String>,
    body: &Option<String>,
    anthropic_api_key: &str
) -> Option<JobExtractionResult> {
    // 1. Convert HTML to clean text
    let clean_text = html_to_text(body);

    // 2. Build extraction prompt
    let prompt = format!(r#"
Extract job posting information from this email:

Subject: {}
Body: {}

Extract the following in JSON format:
{{
  "title": "job title",
  "company": "company name",
  "location": "city, state or 'Remote'",
  "salary": number or null,
  "url": "application URL if present",
  "confidence": 0.0-1.0
}}

Rules:
- If not a job posting, return confidence < 0.3
- Salary should be annual, as a number
- Extract actual company name, not recruiter
- Location should be normalized format
"#, subject.as_deref().unwrap_or(""), clean_text);

    // 3. Call Claude API
    let response = call_anthropic_api(prompt, anthropic_api_key).await?;

    // 4. Parse JSON response
    let extraction: JobExtractionResult = serde_json::from_str(&response)?;

    Some(extraction)
}
```

**Pros:**
- **High accuracy**: LLMs excel at information extraction
- **Handles variation**: Works with diverse email formats
- **Self-improving**: Better models over time
- **Structured output**: JSON schema enforcement
- **Context understanding**: Can distinguish job from spam

**Cons:**
- API costs (~$0.001-0.005 per email)
- Network latency (1-2 seconds per email)
- Requires API key management
- Rate limiting considerations

**Cost Analysis:**
- Claude Haiku (recommended): ~$0.25 per 1M input tokens, ~$1.25 per 1M output tokens
- Average email: ~2,000 tokens input, ~200 tokens output
- Cost per email: ~$0.0005-0.001
- 50 emails/sync: ~$0.025-0.05
- Monthly (daily syncs): ~$0.75-1.50/month

**Estimated Effort:** 3-4 days
**Estimated Cost:** ~$1-2/month

### Option 3: Hybrid Approach (Balanced)

**Approach:**
- Fast regex pre-filter (is this a job email?)
- LLM extraction only for promising candidates
- Cache extraction results
- Async processing for non-blocking sync

**Implementation:**
```rust
async fn extract_job_hybrid(
    subject: &Option<String>,
    body: &Option<String>
) -> Option<JobExtractionResult> {
    // Quick regex check
    if !looks_like_job_email(subject, body) {
        return None;
    }

    // Use LLM for actual extraction
    extract_job_from_email_llm(subject, body).await
}
```

**Pros:**
- Optimizes cost (skip non-job emails)
- Fast path for obvious non-jobs
- Still gets LLM accuracy for real jobs

**Cons:**
- More complex implementation
- Pre-filter can miss edge cases

**Estimated Effort:** 4-5 days
**Estimated Cost:** ~$0.50-1.00/month (50% reduction from Option 2)

### Option 4: Local LLM (Ollama) (Zero Cost, High Complexity)

**Approach:**
- Run local LLM (Llama 3, Mistral, etc.) via Ollama
- Same extraction approach as Option 2
- No API costs

**Pros:**
- No per-request costs
- Full data privacy
- No rate limits

**Cons:**
- Requires Ollama installation
- Significantly slower inference
- Lower accuracy than Claude
- More memory usage
- Deployment complexity

**Estimated Effort:** 5-7 days
**Estimated Cost:** $0/month (but slower, lower quality)

## Recommendation

**Use Option 2 (LLM-Based Extraction with Claude)**

### Rationale:
1. **Accuracy first**: Current 30% success rate is unacceptable
2. **Low cost**: ~$1-2/month is negligible for significant quality improvement
3. **Existing infrastructure**: Project already targets Claude Code users
4. **Best UX**: Fast, accurate, handles all edge cases
5. **Future-proof**: Benefits from model improvements

### Why not others:
- **Option 1**: Won't achieve sufficient accuracy improvement
- **Option 3**: Added complexity not worth 50% cost savings on $2/month
- **Option 4**: Slower, lower quality, deployment complexity

## Implementation Plan

### Phase 1: Core LLM Integration (Day 1-2)
- [ ] Add `anthropic-rs` or similar Rust client crate
- [ ] Implement `call_anthropic_api()` function
- [ ] Add `ANTHROPIC_API_KEY` to environment variables
- [ ] Create extraction prompt template
- [ ] Implement JSON schema validation

### Phase 2: Email Processing (Day 2-3)
- [ ] Add HTML-to-text conversion (html2text crate)
- [ ] Update `extract_job_from_email()` to use LLM
- [ ] Add error handling and retries
- [ ] Implement fallback to regex for API failures
- [ ] Add logging for extraction quality tracking

### Phase 3: Testing & Optimization (Day 3-4)
- [ ] Test on existing 50 emails
- [ ] Measure accuracy improvement
- [ ] Optimize prompt for better extraction
- [ ] Add confidence threshold tuning
- [ ] Performance testing (latency, throughput)

### Phase 4: Cost Optimization (Optional, Day 4+)
- [ ] Implement request batching if possible
- [ ] Add caching for re-processed emails
- [ ] Consider Claude Haiku for cost reduction
- [ ] Monitor usage and costs

## Success Metrics

### Targets (vs Current):
- **Extraction success rate**: 30% → **85%+**
- **Data quality (manual review)**: Poor → **Good**
- **Title extraction accuracy**: ~40% → **90%+**
- **Company extraction accuracy**: ~30% → **85%+**
- **Salary extraction accuracy**: ~20% → **70%+**
- **Processing time per email**: <1s → <2s (acceptable)

### Monitoring:
- Track extraction confidence scores
- Log failed extractions for prompt tuning
- Monitor API costs weekly
- User feedback on job quality

## Alternative: Claude Haiku vs Opus/Sonnet

For cost optimization, consider:

| Model | Cost/Email | Quality | Recommendation |
|-------|-----------|---------|----------------|
| Claude Haiku | $0.0005 | Good | **Start here** |
| Claude Sonnet | $0.003 | Excellent | If Haiku insufficient |
| Claude Opus | $0.015 | Best | Overkill for this task |

**Recommendation**: Start with Haiku, validate with sample of 50 emails.

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| API costs exceed budget | Set monthly spending limit, monitor usage |
| API rate limiting | Implement exponential backoff, queue system |
| API downtime | Fallback to regex, queue for retry |
| Poor extraction quality | Iterative prompt engineering, add examples |
| Slow processing | Async processing, parallel requests (within limits) |

## Dependencies

### New Crates:
```toml
[dependencies]
# HTTP client for Anthropic API
reqwest = { version = "0.11", features = ["json"] }

# HTML to text conversion
html2text = "0.12"

# Optional: Official Anthropic client when available
# anthropic-rs = "0.1"
```

### Environment Variables:
```bash
ANTHROPIC_API_KEY=sk-ant-...
```

## Cost Projection

### Conservative Estimate:
- 50 emails/sync
- 2 syncs/day (hourly would be 48 syncs)
- 30 days/month
- Claude Haiku pricing

**Monthly cost**: 50 × 2 × 30 × $0.0005 = **$1.50/month**

### Upper Bound (hourly sync):
- 50 emails/sync × 24 syncs/day × 30 days = 36,000 emails/month
- Cost: **~$18/month**

**Note**: Most emails are duplicates after first sync, so real cost will be lower.

## Next Steps

1. **Review & approve plan** ✓
2. **Set up Anthropic API key**
3. **Implement Phase 1** (LLM integration)
4. **Test on sample emails**
5. **Iterate on prompt engineering**
6. **Deploy and monitor**

## Appendix A: Sample Extraction Prompt

```
You are a job information extraction assistant. Your task is to analyze emails and extract structured job posting information.

Email to analyze:
---
Subject: {subject}

Body:
{body_text}
---

Extract the following information in JSON format:

{{
  "title": "exact job title from the posting",
  "company": "actual hiring company (not recruiter/staffing firm)",
  "location": "city, state format or 'Remote'",
  "salary_min": annual salary minimum as number or null,
  "salary_max": annual salary maximum as number or null,
  "url": "application URL if mentioned",
  "description": "brief job description (2-3 sentences)",
  "confidence": 0.0-1.0 confidence score
}}

Guidelines:
- Return confidence < 0.3 if this is not a job posting
- Distinguish between recruiter and actual employer
- Normalize location to "City, ST" or "Remote"
- Extract annual salary only (convert if needed)
- URL should be application link, not unsubscribe
- If multiple jobs in email, extract the primary one

Return only valid JSON, no other text.
```

## Appendix B: Current Regex Patterns (For Reference)

Current patterns being used:
```rust
// Title extraction
r"(?i)(software|test|qa|quality|automation|engineer|developer|architect|manager|lead|senior|principal|staff)\s+(engineer|developer|tester|analyst|manager|lead|architect)"

// Company extraction
r"(?i)at\s+([A-Z][a-zA-Z\s&]+)(?:\s|,|$)"
r"(?i)@\s+([A-Z][a-zA-Z\s&]+)(?:\s|,|$)"

// These work < 30% of the time
```

## Appendix C: Success Stories (Expected)

After implementation, we expect to successfully extract jobs like:

1. **Recruiter emails with embedded HTML**
   - Current: Fail
   - After: Extract company, title, location from HTML

2. **Multi-job emails**
   - Current: Fail or extract wrong job
   - After: Extract primary job correctly

3. **Non-standard subject lines**
   - Current: Fail
   - After: Extract from body content

4. **Contract vs Full-time distinction**
   - Current: Not extracted
   - After: Can add to schema

---

**Document Version**: 1.0
**Last Updated**: 2025-10-11
**Author**: Claude Code
**Status**: Awaiting Approval
