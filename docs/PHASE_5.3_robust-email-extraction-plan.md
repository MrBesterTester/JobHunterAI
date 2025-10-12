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

## Detailed Implementation Guide

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Intake Tab UI                         │
│  ┌────────────────┐  ┌─────────────────────────────────┐   │
│  │  Sync Button   │  │   Prompt Editor (expandable)    │   │
│  └────────┬───────┘  └───────────┬─────────────────────┘   │
└───────────┼──────────────────────┼───────────────────────────┘
            │                      │
            │ POST /api/intake/    │ GET/PUT /api/
            │ gmail/sync           │ extraction-prompts
            │                      │
┌───────────▼──────────────────────▼───────────────────────────┐
│                      Backend (Rust)                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ sync_gmail_jobs()                                     │   │
│  │   └─> process_gmail_messages()                       │   │
│  │         └─> extract_job_from_email_llm()             │   │
│  │               ├─> get_active_extraction_prompt()     │   │
│  │               ├─> html_to_text()                     │   │
│  │               └─> call_claude_api()                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Prompt Management API                                 │   │
│  │   ├─> get_extraction_prompt()                        │   │
│  │   └─> update_extraction_prompt()                     │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬──────────────────────┬──────────────────┘
                     │                      │
                     │ HTTPS                │ SQL
                     │                      │
      ┌──────────────▼────────┐  ┌─────────▼──────────────┐
      │  Anthropic Claude API │  │ PostgreSQL Database    │
      │  (Haiku model)        │  │ - extraction_prompts   │
      └───────────────────────┘  │ - email_jobs           │
                                 │ - jobs                 │
                                 └────────────────────────┘
```

### Component 1: Database Schema

**Status**: ✅ Complete

Already created `extraction_prompts` table with:
- Versioning support
- Active prompt tracking
- Prompt content storage
- Audit fields (created_at, updated_at, created_by)

### Component 2: Backend Data Models

**Location**: `backend/src/main.rs` (after existing structs)

```rust
// Add to struct definitions section (~line 280)

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ExtractionPrompt {
    pub prompt_id: Uuid,
    pub prompt_name: String,
    pub prompt_type: String,
    pub prompt_content: String,
    pub is_active: bool,
    pub version: i32,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePromptRequest {
    pub prompt_content: String,
    pub notes: Option<String>,
}

// Update JobExtractionResult to match LLM output
#[derive(Debug, Serialize, Deserialize)]
pub struct JobExtractionResult {
    pub title: Option<String>,
    pub company: Option<String>,
    pub location: Option<String>,
    pub salary_min: Option<i32>,      // Changed: was single 'salary'
    pub salary_max: Option<i32>,      // New field
    pub description: Option<String>,
    pub url: Option<String>,
    pub confidence: f64,
    pub extraction_method: String,
}

// Claude API request/response structures
#[derive(Debug, Serialize)]
struct ClaudeRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<ClaudeMessage>,
}

#[derive(Debug, Serialize)]
struct ClaudeMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ClaudeResponse {
    content: Vec<ClaudeContent>,
    // ... other fields we don't need
}

#[derive(Debug, Deserialize)]
struct ClaudeContent {
    #[serde(rename = "type")]
    content_type: String,
    text: String,
}
```

### Component 3: Claude API Client

**Location**: `backend/src/main.rs` (before `extract_job_from_email`)

```rust
// Add these imports at top of file
use html2text::from_read;

// Add around line 1600 (before extract_job_from_email)

/// Call Claude API for job extraction
async fn call_claude_api(
    prompt: String,
    api_key: &str,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();

    let request = ClaudeRequest {
        model: "claude-3-haiku-20240307".to_string(),
        max_tokens: 1024,
        messages: vec![ClaudeMessage {
            role: "user".to_string(),
            content: prompt,
        }],
    };

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Claude API error {}: {}", status, error_text).into());
    }

    let claude_response: ClaudeResponse = response.json().await?;

    // Extract text from first content block
    if let Some(content) = claude_response.content.first() {
        Ok(content.text.clone())
    } else {
        Err("No content in Claude response".into())
    }
}

/// Convert HTML email body to plain text
fn html_to_text(html: &Option<String>) -> String {
    match html {
        Some(html_content) => {
            // Use html2text to convert HTML to plain text
            from_read(html_content.as_bytes(), 80)
        }
        None => String::new(),
    }
}

/// Get active extraction prompt from database
async fn get_active_extraction_prompt(
    pool: &PgPool,
    prompt_type: &str,
) -> Result<String, sqlx::Error> {
    let prompt = sqlx::query_as::<_, ExtractionPrompt>(
        "SELECT * FROM extraction_prompts WHERE prompt_type = $1 AND is_active = true ORDER BY version DESC LIMIT 1"
    )
    .bind(prompt_type)
    .fetch_one(pool)
    .await?;

    Ok(prompt.prompt_content)
}
```

### Component 4: Updated Job Extraction Function

**Location**: `backend/src/main.rs` (replace existing `extract_job_from_email` around line 1817)

```rust
fn extract_job_from_email(
    subject: &Option<String>,
    body: &Option<String>,
    pool: &PgPool,
) -> Option<JobExtractionResult> {
    // Get Anthropic API key
    let api_key = match std::env::var("ANTHROPIC_API_KEY") {
        Ok(key) => key,
        Err(_) => {
            println!("ANTHROPIC_API_KEY not set, falling back to regex extraction");
            return extract_job_from_email_regex(subject, body);
        }
    };

    // Get active extraction prompt
    let prompt_template = match tokio::task::block_in_place(|| {
        tokio::runtime::Handle::current().block_on(
            get_active_extraction_prompt(pool, "job_extraction")
        )
    }) {
        Ok(template) => template,
        Err(e) => {
            println!("Failed to get extraction prompt: {}, falling back to regex", e);
            return extract_job_from_email_regex(subject, body);
        }
    };

    // Convert HTML to text
    let body_text = html_to_text(body);

    // Truncate if too long (Claude Haiku has 200k context but we want to keep costs low)
    let body_truncated = if body_text.len() > 4000 {
        &body_text[..4000]
    } else {
        &body_text
    };

    // Build prompt
    let subject_str = subject.as_deref().unwrap_or("");
    let full_prompt = format!(
        "{}\n\nEMAIL TO ANALYZE:\n\nSubject: {}\n\nBody:\n{}",
        prompt_template,
        subject_str,
        body_truncated
    );

    // Call Claude API
    let response = match tokio::task::block_in_place(|| {
        tokio::runtime::Handle::current().block_on(
            call_claude_api(full_prompt, &api_key)
        )
    }) {
        Ok(resp) => resp,
        Err(e) => {
            println!("Claude API call failed: {}, falling back to regex", e);
            return extract_job_from_email_regex(subject, body);
        }
    };

    // Parse JSON response
    match serde_json::from_str::<JobExtractionResult>(&response) {
        Ok(mut extraction) => {
            extraction.extraction_method = "llm".to_string();
            println!(
                "LLM extraction succeeded - Title: {:?}, Company: {:?}, Confidence: {:.2}",
                extraction.title, extraction.company, extraction.confidence
            );
            Some(extraction)
        }
        Err(e) => {
            println!("Failed to parse Claude response as JSON: {}", e);
            println!("Response was: {}", response);
            extract_job_from_email_regex(subject, body)
        }
    }
}

// Rename old function as fallback
fn extract_job_from_email_regex(
    subject: &Option<String>,
    body: &Option<String>
) -> Option<JobExtractionResult> {
    // ... existing regex logic ...
    // (keep all the current extraction code)
}
```

**Important Note**: The `create_job_from_extraction` function needs updating to handle salary_min/salary_max:

```rust
// Update around line 1969
async fn create_job_from_extraction(
    extraction: &JobExtractionResult,
    source: &JobSource,
    pool: &PgPool,
) -> std::result::Result<Uuid, sqlx::Error> {
    // ... existing code ...

    // Use average of min/max for single salary field, or max if only max present
    let salary = match (extraction.salary_min, extraction.salary_max) {
        (Some(min), Some(max)) => Some((min + max) / 2),
        (Some(min), None) => Some(min),
        (None, Some(max)) => Some(max),
        (None, None) => None,
    };

    let job_req = CreateJobRequest {
        title: extraction.title.clone().unwrap_or(fallback_title),
        company: extraction.company.clone().unwrap_or_else(|| "Unknown Company".to_string()),
        location: extraction.location.clone(),
        source: source.source_name.clone(),
        salary,  // Use computed salary
        commute_time: None,
        description: extraction.description.clone(),
        url: extraction.url.clone(),
    };

    // ... rest of function ...
}
```

### Component 5: Prompt Management API Endpoints

**Location**: `backend/src/main.rs` (add before `main()` function around line 3300)

```rust
// GET /api/extraction-prompts - Get active extraction prompt
async fn get_extraction_prompt_handler(
    pool: web::Data<PgPool>,
) -> Result<HttpResponse> {
    let prompt = sqlx::query_as::<_, ExtractionPrompt>(
        "SELECT * FROM extraction_prompts WHERE prompt_type = 'job_extraction' AND is_active = true ORDER BY version DESC LIMIT 1"
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(prompt))
}

// PUT /api/extraction-prompts - Update extraction prompt
async fn update_extraction_prompt_handler(
    pool: web::Data<PgPool>,
    update_req: web::Json<UpdatePromptRequest>,
) -> Result<HttpResponse> {
    // Deactivate current active prompt
    sqlx::query!(
        "UPDATE extraction_prompts SET is_active = false WHERE prompt_type = 'job_extraction' AND is_active = true"
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    // Get max version
    let max_version: Option<i32> = sqlx::query_scalar(
        "SELECT MAX(version) FROM extraction_prompts WHERE prompt_type = 'job_extraction'"
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let new_version = max_version.unwrap_or(0) + 1;

    // Insert new prompt version
    let new_prompt = sqlx::query_as::<_, ExtractionPrompt>(
        r#"
        INSERT INTO extraction_prompts (prompt_name, prompt_type, prompt_content, is_active, version, notes)
        VALUES ($1, 'job_extraction', $2, true, $3, $4)
        RETURNING *
        "#
    )
    .bind(format!("Job Email Extraction v{}", new_version))
    .bind(&update_req.prompt_content)
    .bind(new_version)
    .bind(&update_req.notes)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(new_prompt))
}

// Register routes in main() around line 3345:
.route("/api/extraction-prompts", web::get().to(get_extraction_prompt_handler))
.route("/api/extraction-prompts", web::put().to(update_extraction_prompt_handler))
```

### Component 6: Frontend - Prompt Editor UI

**Location**: `frontend/src/IntakeTab.tsx` (add new section after Gmail card, around line 335)

```typescript
// Add to state declarations (around line 70)
const [showPromptEditor, setShowPromptEditor] = useState<boolean>(false);
const [extractionPrompt, setExtractionPrompt] = useState<string>('');
const [promptNotes, setPromptNotes] = useState<string>('');
const [savingPrompt, setSavingPrompt] = useState<boolean>(false);

// Add fetch function
const fetchExtractionPrompt = async (): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/extraction-prompts`);
    if (!response.ok) throw new Error('Failed to fetch prompt');
    const data = await response.json();
    setExtractionPrompt(data.prompt_content);
  } catch (err) {
    console.error('Error fetching extraction prompt:', err);
  }
};

// Add to useEffect (line 116)
useEffect(() => {
  const loadData = async (): Promise<void> => {
    setLoading(true);
    await Promise.all([
      fetchSources(),
      fetchLogs(),
      fetchSummary(),
      fetchExtractionPrompt(),  // Add this
    ]);
    setLoading(false);
  };
  loadData();
}, []);

// Add save handler
const handleSavePrompt = async (): Promise<void> => {
  setSavingPrompt(true);
  try {
    const response = await fetch(`${API_URL}/extraction-prompts`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt_content: extractionPrompt,
        notes: promptNotes || null,
      }),
    });

    if (!response.ok) throw new Error('Failed to save prompt');

    alert('Extraction prompt updated successfully! Changes will apply to next sync.');
    setShowPromptEditor(false);
    setPromptNotes('');
  } catch (err) {
    console.error('Error saving prompt:', err);
    setError('Failed to save extraction prompt');
  } finally {
    setSavingPrompt(false);
  }
};

// Add UI component (insert after Gmail Integration Card, before LinkedIn card)
{/* Extraction Prompt Editor */}
<div style={{
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  gridColumn: 'span 3' // Full width
}}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
    <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>LLM Extraction Prompt</h3>
    <button
      onClick={() => setShowPromptEditor(!showPromptEditor)}
      style={{
        padding: '8px 16px',
        borderRadius: '6px',
        border: '1px solid #3b82f6',
        backgroundColor: showPromptEditor ? '#3b82f6' : 'white',
        color: showPromptEditor ? 'white' : '#3b82f6',
        fontWeight: '500',
        cursor: 'pointer',
        fontSize: '14px'
      }}
    >
      {showPromptEditor ? 'Hide Editor' : 'Edit Prompt'}
    </button>
  </div>

  {showPromptEditor && (
    <div>
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
        Customize the prompt used by Claude Haiku to extract job information from emails.
        Changes take effect immediately on next sync.
      </p>

      <textarea
        value={extractionPrompt}
        onChange={(e) => setExtractionPrompt(e.target.value)}
        style={{
          width: '100%',
          height: '300px',
          padding: '12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '13px',
          fontFamily: 'monospace',
          marginBottom: '12px',
          resize: 'vertical'
        }}
        placeholder="Enter extraction prompt..."
      />

      <input
        type="text"
        value={promptNotes}
        onChange={(e) => setPromptNotes(e.target.value)}
        placeholder="Notes about this change (optional)"
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
          marginBottom: '12px'
        }}
      />

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleSavePrompt}
          disabled={savingPrompt || !extractionPrompt.trim()}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: savingPrompt ? '#9ca3af' : '#10b981',
            color: 'white',
            fontWeight: '600',
            cursor: savingPrompt || !extractionPrompt.trim() ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: savingPrompt || !extractionPrompt.trim() ? 0.6 : 1
          }}
        >
          {savingPrompt ? 'Saving...' : 'Save Prompt'}
        </button>
        <button
          onClick={() => {
            setShowPromptEditor(false);
            fetchExtractionPrompt(); // Reset to current
          }}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: 'white',
            color: '#6b7280',
            fontWeight: '500',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )}
</div>
```

### Component 7: Environment Configuration

**Location**: `backend/.env`

Add:
```bash
# Anthropic API Key for job extraction
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Get your API key from: https://console.anthropic.com/settings/keys

### Component 8: Testing Plan

**Test 1: Verify Prompt Loading**
```bash
# Check database has prompt
psql -U jobhunter_user -d jobhunter_personal -c "SELECT prompt_name, version, is_active FROM extraction_prompts;"

# Test API endpoint
curl http://localhost:8080/api/extraction-prompts | jq .
```

**Test 2: Test Claude API Integration**
```bash
# Add test function to main.rs
#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_claude_extraction() {
        let subject = Some("Senior SDET at TechCorp - Remote - $140k".to_string());
        let body = Some("We're hiring...".to_string());

        let result = extract_job_from_email(&subject, &body, &pool);
        assert!(result.is_some());
        assert!(result.unwrap().confidence > 0.5);
    }
}
```

**Test 3: Compare Extraction Quality**
```bash
# Run extraction on existing 50 emails
psql -U jobhunter_user -d jobhunter_personal -c "
  UPDATE email_jobs SET processed = false;
  -- Then trigger re-sync via UI
"
```

**Test 4: Monitor Costs**
- Check Anthropic dashboard after processing 50 emails
- Should be ~$0.025-0.05 total

### Deployment Checklist

- [ ] Update `Cargo.toml` with `html2text` dependency
- [ ] Add database migration for `extraction_prompts` table
- [ ] Add `ANTHROPIC_API_KEY` to `.env`
- [ ] Create initial prompt in `prompts/` directory
- [ ] Update backend code (models, API client, extraction function, endpoints)
- [ ] Update frontend (IntakeTab with prompt editor)
- [ ] Restart backend server
- [ ] Test API endpoints
- [ ] Test Gmail sync with LLM extraction
- [ ] Monitor logs for extraction success/failure
- [ ] Compare old vs new extraction results

### Rollback Plan

If LLM extraction fails or costs are too high:

1. **Immediate**: Comment out LLM code, fall back to regex
2. **Database**: Keep extraction_prompts table (no harm)
3. **Environment**: Remove or comment out `ANTHROPIC_API_KEY`
4. **Code**: The fallback logic ensures regex still works

### Performance Optimization

If processing 50 emails is too slow:

```rust
// Option 1: Parallel processing (respect rate limits)
use futures::future::join_all;

let futures: Vec<_> = messages.iter()
    .map(|msg| extract_job_from_email(&msg.subject, &msg.body, pool))
    .collect();

let results = join_all(futures).await;

// Option 2: Batch API calls (if Anthropic supports)
// Currently not supported, but could be added later
```

## Next Steps

1. **Review & approve plan** ✓
2. **Set up Anthropic API key** ← Start here
3. **Implement backend changes** (Components 2-4)
4. **Add API endpoints** (Component 5)
5. **Update frontend** (Component 6)
6. **Test on sample emails**
7. **Iterate on prompt engineering**
8. **Deploy and monitor**

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
