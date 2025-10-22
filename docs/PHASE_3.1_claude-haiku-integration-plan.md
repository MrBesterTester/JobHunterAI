<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [PHASE 3.1: Claude Haiku Integration for Resume & Cover Letter Generation](#phase-31-claude-haiku-integration-for-resume--cover-letter-generation)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Current State Analysis](#current-state-analysis)
    - [What Exists ✅](#what-exists-)
    - [What's Missing ❌](#whats-missing-)
  - [Goals & Objectives](#goals--objectives)
    - [Primary Goals](#primary-goals)
    - [Success Criteria](#success-criteria)
  - [Technical Architecture](#technical-architecture)
    - [Component Overview](#component-overview)
    - [Data Flow](#data-flow)
  - [Implementation Phases](#implementation-phases)
    - [Phase 3.1.1: Anthropic API Integration (2-3 hours)](#phase-311-anthropic-api-integration-2-3-hours)
    - [Phase 3.1.2: Prompt Engineering (3-4 hours)](#phase-312-prompt-engineering-3-4-hours)
    - [Phase 3.1.3: Backend Integration (3-4 hours)](#phase-313-backend-integration-3-4-hours)
    - [Phase 3.1.4: Frontend Updates (1-2 hours)](#phase-314-frontend-updates-1-2-hours)
    - [Phase 3.1.5: Testing & Refinement (2-3 hours)](#phase-315-testing--refinement-2-3-hours)
  - [Prompt Engineering](#prompt-engineering)
    - [Prompt 1: Resume Customization](#prompt-1-resume-customization)
    - [Prompt 2: Cover Letter Generation](#prompt-2-cover-letter-generation)
  - [Cost & Performance](#cost--performance)
    - [Model Selection: Claude 3.5 Haiku](#model-selection-claude-35-haiku)
    - [Cost Estimation](#cost-estimation)
    - [Performance Targets](#performance-targets)
  - [Database Schema Updates](#database-schema-updates)
    - [Add Columns to `applications` Table](#add-columns-to-applications-table)
    - [Updated `GeneratedContent` Struct](#updated-generatedcontent-struct)
  - [Testing Strategy](#testing-strategy)
    - [Unit Tests](#unit-tests)
    - [Integration Tests](#integration-tests)
    - [Quality Tests](#quality-tests)
    - [Performance Tests](#performance-tests)
    - [Cost Tests](#cost-tests)
  - [Key Decisions](#key-decisions)
    - [Decision 1: Fallback to Templates?](#decision-1-fallback-to-templates)
    - [Decision 2: Regeneration Limits?](#decision-2-regeneration-limits)
    - [Decision 3: Content Storage?](#decision-3-content-storage)
    - [Decision 4: Manual Editing Before Saving?](#decision-4-manual-editing-before-saving)
    - [Decision 5: Parallel vs Sequential LLM Calls?](#decision-5-parallel-vs-sequential-llm-calls)
  - [Success Metrics](#success-metrics)
    - [Launch Metrics (Week 1)](#launch-metrics-week-1)
    - [Quality Metrics (Month 1)](#quality-metrics-month-1)
    - [Cost Metrics (Month 1)](#cost-metrics-month-1)
    - [Adoption Metrics (Month 3)](#adoption-metrics-month-3)
  - [Risks & Mitigations](#risks--mitigations)
    - [Risk 1: API Reliability](#risk-1-api-reliability)
    - [Risk 2: Output Quality Issues](#risk-2-output-quality-issues)
    - [Risk 3: Cost Overruns](#risk-3-cost-overruns)
    - [Risk 4: Prompt Injection](#risk-4-prompt-injection)
    - [Risk 5: Slow Performance](#risk-5-slow-performance)
  - [References](#references)
    - [Documentation](#documentation)
    - [Existing Phase Documents](#existing-phase-documents)
    - [Related Files](#related-files)
    - [CLAUDE.md Context](#claudemd-context)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# PHASE 3.1: Claude Haiku Integration for Resume & Cover Letter Generation

**Status**: Planning
**Created**: 2025-10-22
**Owner**: Sam Kirk
**Estimated Effort**: 9-14 hours

---

## Table of Contents

- [Overview](#overview)
- [Current State Analysis](#current-state-analysis)
- [Goals & Objectives](#goals--objectives)
- [Technical Architecture](#technical-architecture)
- [Implementation Phases](#implementation-phases)
- [Prompt Engineering](#prompt-engineering)
- [Cost & Performance](#cost--performance)
- [Database Schema Updates](#database-schema-updates)
- [Testing Strategy](#testing-strategy)
- [Key Decisions](#key-decisions)
- [Success Metrics](#success-metrics)
- [Risks & Mitigations](#risks--mitigations)
- [References](#references)

---

## Overview

Replace the current placeholder template-based content generation system with **Claude 3.5 Haiku** LLM integration for intelligent, personalized resume and cover letter generation.

**Current System** (Placeholder):
- Simple string replacement (e.g., `replace("Test Automation", "**Test Automation**")`)
- Handlebars templates with hardcoded context variables
- No intelligence or personalization

**Target System** (LLM-Powered):
- Claude 3.5 Haiku API integration
- Intelligent extraction of relevant resume sections
- Domain-specific highlighting based on job requirements
- Personalized cover letters with specific examples
- Company research integration
- Tone matching to job description

---

## Current State Analysis

### What Exists ✅

1. **Database Schema**
   - `resume_versions` table with master resume support
   - `cover_letter_templates` table (currently unused after LLM)
   - `applications` table linking jobs to generated content

2. **Master Resume**
   - Stored at `data/resumes/master_resume.md`
   - Markdown format with structured sections
   - API endpoint to load from file: `POST /api/resumes/load-from-file`

3. **Content Generation Engine**
   - Located in `backend/src/main.rs:1367-1588`
   - Functions: `generate_content_for_job()`, `extract_relevant_resume_sections()`
   - API endpoint: `GET /api/jobs/{id}/generate-content`

4. **Test Suite**
   - `backend/tests/content_generation_tests.rs`
   - 18 tests covering database operations, handlebars rendering, highlighting

5. **Frontend Components**
   - `frontend/src/ResumeManagement.tsx` for resume upload/management
   - Email composer for sending applications

### What's Missing ❌

1. **NO LLM Integration**
   - No Anthropic SDK dependency
   - No API client wrapper
   - No API key configuration

2. **NO Intelligent Prompts**
   - No prompt templates in `prompts/` directory
   - No job-specific context building
   - No company research integration

3. **NO Quality Measures**
   - No output quality validation
   - No A/B testing vs templates
   - No user feedback mechanism

4. **NO Cost Tracking**
   - No token counting
   - No cost estimation
   - No usage monitoring

---

## Goals & Objectives

### Primary Goals

1. **Replace Template System** with LLM-powered generation
2. **Improve Quality** of resumes and cover letters
3. **Increase Personalization** based on job details
4. **Maintain Performance** (< 15 seconds total generation time)
5. **Control Costs** (< $0.05 per generation)

### Success Criteria

- ✅ Resume customization highlights relevant experience for job domain
- ✅ Cover letter includes specific examples from resume
- ✅ Tone matches company culture (when inferrable from job description)
- ✅ 95%+ generation success rate
- ✅ Average generation time < 10 seconds
- ✅ Average cost < $0.02 per generation

---

## Technical Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                  │
│  - ResumeManagement.tsx (upload master resume)      │
│  - JobCard (trigger generation button)              │
│  - GeneratedContentModal (preview/edit)             │
└────────────────┬────────────────────────────────────┘
                 │
                 │ HTTP API
                 ▼
┌─────────────────────────────────────────────────────┐
│              Backend (Rust/Actix-web)               │
│  ┌───────────────────────────────────────────────┐  │
│  │  Content Generation Orchestrator              │  │
│  │  - generate_content_for_job()                 │  │
│  │  - Fetches master resume from DB              │  │
│  │  - Calls LLM services in sequence             │  │
│  └───────┬────────────────────────────┬──────────┘  │
│          │                            │              │
│          ▼                            ▼              │
│  ┌──────────────────┐      ┌──────────────────┐    │
│  │ Resume Service   │      │ Cover Letter Svc │    │
│  │ - Build prompt   │      │ - Build prompt   │    │
│  │ - Call LLM       │      │ - Call LLM       │    │
│  │ - Parse response │      │ - Parse response │    │
│  └────────┬─────────┘      └────────┬─────────┘    │
│           │                         │               │
│           └────────┬────────────────┘               │
│                    │                                │
│          ┌─────────▼──────────┐                     │
│          │  AnthropicClient   │                     │
│          │  - API wrapper     │                     │
│          │  - Retry logic     │                     │
│          │  - Error handling  │                     │
│          │  - Token counting  │                     │
│          └─────────┬──────────┘                     │
└────────────────────┼────────────────────────────────┘
                     │
                     │ HTTPS
                     ▼
          ┌──────────────────────┐
          │  Anthropic API       │
          │  Claude 3.5 Haiku    │
          │  (api.anthropic.com) │
          └──────────────────────┘
```

### Data Flow

1. **User Action**: Click "Generate Content" on job card
2. **API Call**: `GET /api/jobs/{job_id}/generate-content`
3. **Orchestrator**:
   - Fetch job details from DB
   - Fetch master resume from DB
   - Create/update application record
4. **Resume Customization**:
   - Build prompt with master resume + job details
   - Call Claude Haiku API
   - Parse markdown response
5. **Cover Letter Generation**:
   - Build prompt with customized resume + job details
   - Call Claude Haiku API
   - Parse plain text response
6. **Response**: Return `GeneratedContent` JSON with resume, cover letter, metadata
7. **Frontend**: Display in preview modal, allow regeneration

---

## Implementation Phases

### Phase 3.1.1: Anthropic API Integration (2-3 hours)

**Tasks:**
1. Add `anthropic-sdk` dependency to `backend/Cargo.toml`
2. Configure API key in environment (`ANTHROPIC_API_KEY`)
3. Create `AnthropicClient` struct in `backend/src/llm.rs` (new module)
4. Implement basic API call with retry logic
5. Add unit tests with mocked responses

**Deliverables:**
- Working API client that can call Claude Haiku
- Basic error handling (rate limits, timeouts, API errors)
- Integration test (marked `#[ignore]` for CI)

**Code Structure:**
```rust
// backend/src/llm.rs
pub struct AnthropicClient {
    api_key: String,
    base_url: String,
    client: reqwest::Client,
}

impl AnthropicClient {
    pub async fn generate(
        &self,
        prompt: &str,
        max_tokens: usize,
    ) -> Result<GenerateResponse, AnthropicError> {
        // Implementation
    }
}
```

**Dependencies:**
```toml
[dependencies]
reqwest = { version = "0.11", features = ["json"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

---

### Phase 3.1.2: Prompt Engineering (3-4 hours)

**Tasks:**
1. Create `prompts/resume_customization.md`
2. Create `prompts/cover_letter_generation.md`
3. Test prompts manually in Claude.ai
4. Iterate on quality and output format
5. Add prompt loading utility in backend

**Prompt 1: Resume Customization**
- **Input**: Master resume (markdown) + job details (title, company, description, domain)
- **Task**: Extract and emphasize relevant sections
- **Output**: Customized resume in markdown format
- **Key Instructions**:
  - Preserve all original content (no fabrication)
  - Emphasize domain-specific keywords (testing, AI, firmware)
  - Reorder sections to highlight relevant experience
  - Add bold formatting to key skills/achievements
  - Maintain professional tone and formatting

**Prompt 2: Cover Letter Generation**
- **Input**: Customized resume + job details + company info
- **Task**: Write compelling, personalized cover letter
- **Output**: 3-4 paragraph cover letter in plain text
- **Key Instructions**:
  - Opening: Express genuine interest with specific reason
  - Body: 2-3 specific examples from resume matching job requirements
  - Closing: Strong call-to-action
  - Tone: Professional but personable
  - Length: 250-400 words

**Deliverables:**
- Two prompt template files
- Prompt loader utility function
- Manual testing results with 5 sample jobs

---

### Phase 3.1.3: Backend Integration (3-4 hours)

**Tasks:**
1. Update `generate_content_for_job()` to use LLM
2. Replace `extract_relevant_resume_sections()` with LLM call
3. Replace handlebars template rendering with LLM call
4. Add token counting and cost estimation
5. Update error handling
6. Add retry logic for failed generations
7. Update existing tests

**Functions to Update:**
```rust
// OLD: backend/src/main.rs:1398-1418
fn extract_relevant_resume_sections(master_resume: &str, job: &Job) -> String {
    // Simple string replacement (DELETE THIS)
}

// NEW: backend/src/main.rs (refactored to llm.rs)
async fn customize_resume_with_llm(
    client: &AnthropicClient,
    master_resume: &str,
    job: &Job,
) -> Result<String, LlmError> {
    let prompt = build_resume_customization_prompt(master_resume, job);
    let response = client.generate(&prompt, 2000).await?;
    Ok(response.content)
}

async fn generate_cover_letter_with_llm(
    client: &AnthropicClient,
    customized_resume: &str,
    job: &Job,
) -> Result<String, LlmError> {
    let prompt = build_cover_letter_prompt(customized_resume, job);
    let response = client.generate(&prompt, 1000).await?;
    Ok(response.content)
}
```

**Deliverables:**
- Updated `generate_content_for_job()` function
- New LLM integration module (`backend/src/llm.rs`)
- Token counting utility
- Updated error types
- Passing test suite

---

### Phase 3.1.4: Frontend Updates (1-2 hours)

**Tasks:**
1. Add loading state to "Generate Content" button
2. Show progress indicator (5-10 seconds expected)
3. Display token usage and cost estimate
4. Add "Regenerate" button if user doesn't like output
5. Update preview modal with LLM-generated content

**UI Changes:**
```tsx
// frontend/src/JobCard.tsx
const handleGenerateContent = async () => {
  setIsGenerating(true);
  setGenerationError(null);

  try {
    const response = await fetch(`/api/jobs/${job.job_id}/generate-content`);
    const data = await response.json();

    setGeneratedContent(data);
    setShowPreviewModal(true);

    // Show success message with cost
    toast.success(`Generated! Cost: $${data.cost_estimate.toFixed(4)}`);
  } catch (error) {
    setGenerationError('Failed to generate content. Please try again.');
  } finally {
    setIsGenerating(false);
  }
};

// Show loading indicator
{isGenerating && (
  <div className="loading-overlay">
    <Spinner />
    <p>Generating personalized content with AI...</p>
    <p className="text-sm text-gray-500">This may take 5-10 seconds</p>
  </div>
)}
```

**Deliverables:**
- Updated JobCard component with loading states
- Preview modal for generated content
- Regenerate functionality
- Cost/token display

---

### Phase 3.1.5: Testing & Refinement (2-3 hours)

**Tasks:**
1. End-to-end testing with 10+ real job postings
2. Quality assessment (compare LLM vs template output)
3. Prompt tuning based on results
4. Performance optimization (caching, parallel calls)
5. Cost monitoring and alerting
6. Documentation updates

**Test Coverage:**
- Unit tests for LLM client (mocked)
- Integration tests with real API (ignored in CI)
- Quality tests (manual review + automated metrics)
- Performance tests (< 15 seconds)
- Cost tests (< $0.05 per generation)
- Error handling tests (API failures, timeouts, rate limits)

**Quality Metrics:**
- Relevance score (1-5): Does content match job requirements?
- Personalization score (1-5): Is it generic or specific?
- Accuracy score (1-5): Are resume claims faithful to master resume?
- Tone score (1-5): Is tone appropriate for company/role?

**Deliverables:**
- Comprehensive test suite
- Quality assessment report
- Performance benchmarks
- Updated documentation

---

## Prompt Engineering

### Prompt 1: Resume Customization

**File**: `prompts/resume_customization.md`

**Structure**:
```markdown
# Resume Customization Prompt

You are a professional resume writer helping customize a resume for a specific job application.

## Input Data

**Master Resume (Markdown)**:
{master_resume}

**Job Details**:
- Title: {job_title}
- Company: {company}
- Location: {location}
- Salary: {salary}
- Description: {job_description}

**Job Domain Analysis**:
- Primary Domain: {primary_domain}  (e.g., "testing", "ai", "firmware")
- Key Technologies: {technologies}  (extracted from description)
- Seniority Level: {seniority}

## Task

Customize the master resume to highlight the most relevant experience for this job. Follow these rules:

1. **Preserve Truth**: Do NOT fabricate experience. Only emphasize existing content.
2. **Reorder Sections**: Move most relevant experience to the top.
3. **Highlight Keywords**: Use **bold** for domain-specific skills matching job requirements.
4. **Tailor Summary**: Adjust professional summary to emphasize relevant domains.
5. **Quantify Impact**: Emphasize metrics and achievements relevant to this role.
6. **Maintain Format**: Output valid markdown preserving section structure.

## Domain-Specific Guidelines

**Testing/QA Roles**:
- Emphasize: Test automation, CI/CD, quality engineering, testing frameworks
- Highlight: Test coverage metrics, defect reduction, automation ROI

**AI/ML Roles**:
- Emphasize: LLM integration, prompt engineering, AI-powered tools
- Highlight: AI projects, machine learning, generative AI experience

**Firmware/Hardware Roles**:
- Emphasize: Embedded systems, hardware validation, firmware testing
- Highlight: Board-level testing, ATE, validation frameworks

## Output Format

Return ONLY the customized resume in markdown format. Do NOT add commentary or explanations.

Start with "# [Name]" and end with the last section of the resume.
```

---

### Prompt 2: Cover Letter Generation

**File**: `prompts/cover_letter_generation.md`

**Structure**:
```markdown
# Cover Letter Generation Prompt

You are a professional career coach helping write a compelling cover letter for a job application.

## Input Data

**Customized Resume (Already tailored to this job)**:
{customized_resume}

**Job Details**:
- Title: {job_title}
- Company: {company}
- Location: {location}
- Salary: {salary}
- Description: {job_description}
- Application URL: {url}

**Company Research** (if available):
{company_research}

**Candidate Context**:
- Current Location: Fremont, CA
- Work Preference: Remote or hybrid (≤3 days/week)
- Salary Target: ${salary_target}

## Task

Write a personalized, compelling cover letter that:

1. **Opening Paragraph**:
   - Express genuine interest in the role
   - Mention a specific aspect of the company or role that appeals
   - Brief statement of qualification (years of experience, key domain)

2. **Body Paragraphs (2-3)**:
   - Provide 2-3 specific examples from resume matching job requirements
   - Use concrete metrics and achievements
   - Connect experience to company's needs
   - Show understanding of role responsibilities

3. **Closing Paragraph**:
   - Strong call-to-action
   - Express enthusiasm for next steps
   - Mention willingness to discuss further

## Guidelines

- **Tone**: Professional but personable (not overly formal)
- **Length**: 250-400 words (3-4 paragraphs)
- **Specificity**: Reference actual projects/achievements from resume
- **Relevance**: Every sentence should relate to the job
- **Honesty**: Do NOT exaggerate or fabricate claims
- **Format**: Plain text, suitable for email body

## Salary Awareness

{salary_note}

## Output Format

Return ONLY the cover letter text. Do NOT include:
- Subject line
- Recipient name/address (unknown in most cases)
- Signature block (will be added separately)
- Commentary or explanations

Start with "Dear Hiring Manager," (or specific name if provided) and end with the closing paragraph.
```

---

## Cost & Performance

### Model Selection: Claude 3.5 Haiku

**Why Haiku?**
- **Speed**: 5-10 second response time
- **Cost**: $0.25/MTok input, $1.25/MTok output
- **Quality**: Sufficient for resume/cover letter tasks
- **Context**: 200K token context window

**Alternative Considered**: Claude 3.5 Sonnet
- ❌ 3x more expensive
- ❌ Overkill for this task
- ✅ Only if quality issues with Haiku

### Cost Estimation

**Typical Token Usage**:
- Resume customization prompt: ~1500 input + ~800 output = 2300 tokens
- Cover letter prompt: ~1200 input + ~500 output = 1700 tokens
- **Total per generation**: ~4000 tokens

**Cost per Generation**:
- Input: (1500 + 1200) × $0.25 / 1M = $0.000675
- Output: (800 + 500) × $1.25 / 1M = $0.001625
- **Total**: ~$0.0023 per generation

**Volume Projections**:
- 10 applications/week × 4 weeks = 40/month
- Monthly cost: 40 × $0.0023 = **$0.09/month**
- Annual cost: **~$1.10/year**

**Worst Case** (100 applications/month):
- Monthly cost: 100 × $0.0023 = **$0.23/month**
- Annual cost: **~$2.76/year**

### Performance Targets

| Metric | Target | Current (Templates) |
|--------|--------|---------------------|
| Resume generation time | < 8 seconds | < 1 second |
| Cover letter generation time | < 7 seconds | < 1 second |
| **Total time** | **< 15 seconds** | **< 2 seconds** |
| Success rate | > 95% | ~100% (templates) |
| Cost per generation | < $0.005 | $0 (no API) |

**Optimization Strategies**:
1. **Prompt Caching**: Cache master resume (5-minute TTL)
2. **Parallel Calls**: Generate resume + cover letter simultaneously (if safe)
3. **Token Reduction**: Compress job descriptions > 1000 words
4. **Retry Logic**: Max 2 retries with exponential backoff
5. **Circuit Breaker**: Fall back to templates if API unavailable

---

## Database Schema Updates

### Add Columns to `applications` Table

```sql
-- Migration: Add LLM tracking columns
ALTER TABLE applications
ADD COLUMN llm_tokens_used INTEGER,
ADD COLUMN llm_cost_estimate DECIMAL(10, 6),
ADD COLUMN generation_time_ms INTEGER,
ADD COLUMN generation_method VARCHAR(20) DEFAULT 'template';

-- Index for monitoring
CREATE INDEX idx_applications_generation_method
ON applications(generation_method);

-- Track generation attempts
CREATE TABLE generation_attempts (
    attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(application_id),
    attempt_number INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'timeout'
    error_message TEXT,
    tokens_used INTEGER,
    cost_estimate DECIMAL(10, 6),
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Updated `GeneratedContent` Struct

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct GeneratedContent {
    pub resume: String,
    pub cover_letter: String,
    pub resume_format: String,
    pub generated_at: DateTime<Utc>,
    pub application_id: Uuid,

    // New fields
    pub generation_method: String,  // "llm" or "template"
    pub llm_model: Option<String>,  // "claude-3-5-haiku-20241022"
    pub tokens_used: Option<i32>,
    pub cost_estimate: Option<f64>,
    pub generation_time_ms: Option<i32>,
}
```

---

## Testing Strategy

### Unit Tests

**LLM Client Tests** (`backend/src/llm.rs`):
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use mockito::{mock, server_url};

    #[tokio::test]
    async fn test_generate_success() {
        let _m = mock("POST", "/v1/messages")
            .with_status(200)
            .with_body(r#"{"content": [{"text": "Generated content"}], "usage": {"input_tokens": 100, "output_tokens": 50}}"#)
            .create();

        let client = AnthropicClient::new("test-key".to_string(), server_url());
        let response = client.generate("Test prompt", 100).await;

        assert!(response.is_ok());
        assert_eq!(response.unwrap().content, "Generated content");
    }

    #[tokio::test]
    async fn test_generate_rate_limit_retry() {
        // Test retry logic on 429 responses
    }

    #[tokio::test]
    async fn test_generate_timeout() {
        // Test timeout handling
    }
}
```

**Prompt Builder Tests**:
```rust
#[test]
fn test_build_resume_customization_prompt() {
    let job = /* create test job */;
    let master_resume = "# Test Resume\n...";

    let prompt = build_resume_customization_prompt(master_resume, &job);

    assert!(prompt.contains(&job.title));
    assert!(prompt.contains(&job.company));
    assert!(prompt.contains(master_resume));
}
```

### Integration Tests

**Real API Tests** (marked `#[ignore]`):
```rust
#[tokio::test]
#[ignore] // Run manually with: cargo test -- --ignored
async fn test_real_api_resume_generation() {
    let api_key = std::env::var("ANTHROPIC_API_KEY")
        .expect("ANTHROPIC_API_KEY required for integration tests");

    let client = AnthropicClient::new(api_key, "https://api.anthropic.com".to_string());
    let job = create_test_job();
    let master_resume = load_test_resume();

    let result = customize_resume_with_llm(&client, &master_resume, &job).await;

    assert!(result.is_ok());
    let customized = result.unwrap();
    assert!(customized.contains("# Samuel Kirk")); // Should preserve name
    assert!(customized.len() > master_resume.len() / 2); // Should not truncate heavily
}
```

### Quality Tests

**Automated Quality Checks**:
```rust
#[tokio::test]
async fn test_resume_quality_checks() {
    let generated_resume = /* generate resume */;
    let master_resume = /* load master */;

    // 1. No fabrication check
    let master_words = extract_keywords(&master_resume);
    let generated_words = extract_keywords(&generated_resume);
    assert!(is_subset(&generated_words, &master_words),
            "Generated resume should not contain new claims");

    // 2. Relevance check
    assert!(contains_domain_keywords(&generated_resume, "testing"),
            "Should emphasize testing keywords for QA role");

    // 3. Format check
    assert!(generated_resume.starts_with("# "),
            "Should maintain markdown heading format");
}
```

**Manual Quality Assessment** (after Phase 3.1.5):
- Generate content for 10 diverse jobs
- Rate each output on 4 metrics (1-5 scale)
- Compare against template baseline
- Iterate on prompts if scores < 4.0 average

### Performance Tests

```rust
#[tokio::test]
async fn test_generation_performance() {
    let start = std::time::Instant::now();

    let result = generate_content_for_job(&test_job, &pool).await;

    let duration = start.elapsed();
    assert!(duration.as_secs() < 15,
            "Generation should complete in < 15 seconds, took {}s",
            duration.as_secs());

    assert!(result.is_ok());
    let content = result.unwrap();
    assert!(content.generation_time_ms.unwrap() < 15000);
}
```

### Cost Tests

```rust
#[test]
fn test_cost_estimation() {
    let tokens_used = 4000;
    let cost = estimate_cost(tokens_used, "claude-3-5-haiku-20241022");

    assert!(cost < 0.005, "Cost should be under half a cent, was ${}", cost);
}
```

---

## Key Decisions

### Decision 1: Fallback to Templates?

**Question**: Should we keep template-based generation as fallback if LLM fails?

**Options**:
- **A. Yes** - Keep template code, fall back on API failure
  - ✅ Graceful degradation
  - ✅ Always generates something
  - ❌ More code to maintain
  - ❌ Inconsistent quality (some LLM, some template)

- **B. No** - Remove templates, show error if LLM fails
  - ✅ Simpler codebase
  - ✅ Forces reliability improvements
  - ❌ User sees error on API failure
  - ✅ Can retry manually

**Recommendation**: **Option B** (no fallback)
- Show clear error message: "Content generation failed. Please try again."
- Implement robust retry logic (2 attempts)
- Monitor API reliability (should be > 99.9%)
- Templates can be completely removed after Phase 3 ships

---

### Decision 2: Regeneration Limits?

**Question**: How many times can user regenerate content for same job?

**Options**:
- **A. Unlimited** - Let user regenerate as many times as they want
  - ✅ Maximum flexibility
  - ❌ Cost could spiral if user regenerates 20+ times
  - ❌ Potential for abuse

- **B. Limited (5 per job)** - Hard limit per application
  - ✅ Protects against runaway costs
  - ✅ Forces user to think about what they want
  - ❌ Arbitrary limit might frustrate power users

- **C. Cost-based throttling** - Warn after $0.05 cumulative cost per job
  - ✅ Flexible for normal use
  - ✅ Clear cost feedback
  - ✅ Can override with confirmation

**Recommendation**: **Option C** (cost-based throttling)
- First 5 generations: No warning
- After $0.05 cumulative: "You've spent $0.05 on this job. Continue?"
- Track cumulative cost in `generation_attempts` table

---

### Decision 3: Content Storage?

**Question**: Should we store multiple versions of generated content?

**Options**:
- **A. Store only latest** - Overwrite on each regeneration
  - ✅ Simpler database schema
  - ✅ Less storage
  - ❌ Can't A/B test versions
  - ❌ Can't roll back to previous version

- **B. Store all versions** - Keep history of generations
  - ✅ Can compare versions
  - ✅ Can roll back
  - ✅ Useful for quality analysis
  - ❌ More storage (but text is cheap)
  - ❌ Slightly more complex UI

**Recommendation**: **Option B** (store all versions)
- Create `content_versions` table
- Track which version is "active" for application
- Show version history in UI (collapsible)
- Useful data for prompt tuning

**Schema**:
```sql
CREATE TABLE content_versions (
    version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(application_id),
    version_number INTEGER NOT NULL,
    resume_content TEXT NOT NULL,
    cover_letter_content TEXT NOT NULL,
    generation_method VARCHAR(20) NOT NULL,
    tokens_used INTEGER,
    cost_estimate DECIMAL(10, 6),
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### Decision 4: Manual Editing Before Saving?

**Question**: Should user be able to edit LLM output before saving?

**Options**:
- **A. Yes** - Show editable preview modal
  - ✅ User can fix small issues
  - ✅ User has final control
  - ❌ More complex UI
  - ❌ Edited content != LLM output (affects quality metrics)

- **B. No** - Show read-only preview, regenerate if not satisfied
  - ✅ Simpler UI
  - ✅ Clear attribution (LLM or manual)
  - ✅ Better quality feedback loop
  - ❌ Can't fix small typos

**Recommendation**: **Option A** (allow editing)
- Mark edited content with `is_edited: true` flag
- Track edits for quality analysis
- Most users won't edit, but power users appreciate flexibility

---

### Decision 5: Parallel vs Sequential LLM Calls?

**Question**: Should we call resume + cover letter APIs in parallel or sequence?

**Options**:
- **A. Sequential** - Generate resume first, then use it for cover letter
  - ✅ Cover letter can reference specific resume content
  - ✅ Guaranteed consistency
  - ❌ Takes 2× as long (~14 seconds total)

- **B. Parallel** - Generate both simultaneously
  - ✅ Faster (~7 seconds total)
  - ❌ Cover letter doesn't reference customized resume
  - ❌ May have minor inconsistencies

**Recommendation**: **Option A** (sequential)
- Quality > Speed for this use case
- 15 seconds is acceptable for AI generation
- Cover letter quality benefits from seeing customized resume

---

## Success Metrics

### Launch Metrics (Week 1)

- [ ] 100% of generations succeed or provide clear error
- [ ] Average generation time < 15 seconds
- [ ] Average cost < $0.005 per generation
- [ ] 0 critical bugs reported

### Quality Metrics (Month 1)

- [ ] User satisfaction > 4.0/5.0 (survey after 10 applications)
- [ ] Manual quality assessment > 4.0/5.0 average
- [ ] < 10% regeneration rate (users happy with first try)
- [ ] Resume relevance score > 4.0/5.0

### Cost Metrics (Month 1)

- [ ] Total monthly cost < $1.00
- [ ] Average cost per generation < $0.005
- [ ] 0 runaway cost incidents (> $5 in single day)

### Adoption Metrics (Month 3)

- [ ] 90%+ of applications use LLM generation (vs manual)
- [ ] < 5% fallback to template-based system
- [ ] Average time-to-apply reduced by 50% vs manual

---

## Risks & Mitigations

### Risk 1: API Reliability

**Risk**: Anthropic API downtime prevents content generation

**Probability**: Low (Anthropic has 99.9%+ uptime)

**Impact**: High (blocks job applications)

**Mitigations**:
- Implement retry logic with exponential backoff
- Show clear error message with "Retry" button
- Monitor API status endpoint
- Consider fallback to templates (Decision 1)
- Cache successful responses for 5 minutes

---

### Risk 2: Output Quality Issues

**Risk**: LLM generates poor quality or inaccurate content

**Probability**: Medium (depends on prompt quality)

**Impact**: High (damages application quality)

**Mitigations**:
- Extensive prompt testing before launch
- Manual quality review of first 20 generations
- Implement quality checks (no fabrication, format validation)
- Allow regeneration (Decision 2)
- Enable manual editing (Decision 4)
- A/B test prompts over time

---

### Risk 3: Cost Overruns

**Risk**: Costs exceed budget due to high usage or abuse

**Probability**: Low (single user, predictable volume)

**Impact**: Low ($10/month is acceptable even in worst case)

**Mitigations**:
- Implement cost-based throttling (Decision 2)
- Monitor daily spend with alerts (> $1/day)
- Set hard monthly limit in Anthropic console ($10)
- Optimize prompts to reduce token usage

---

### Risk 4: Prompt Injection

**Risk**: Malicious job descriptions inject prompts to manipulate output

**Probability**: Very Low (single user, trusted job sources)

**Impact**: Medium (could generate inappropriate content)

**Mitigations**:
- Sanitize job descriptions before prompt insertion
- Use Claude's built-in prompt injection protections
- Review generated content before sending
- Limit job description length (< 5000 chars)

---

### Risk 5: Slow Performance

**Risk**: LLM calls take > 15 seconds, frustrating user

**Probability**: Medium (depends on API latency)

**Impact**: Medium (annoying but not blocking)

**Mitigations**:
- Set aggressive timeouts (20 seconds max)
- Show progress indicator with estimated time
- Optimize prompts to reduce token count
- Consider parallel calls if safe (Decision 5)
- Cache frequently used content

---

## References

### Documentation

- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Claude 3.5 Haiku Model Card](https://www.anthropic.com/claude/haiku)
- [Prompt Engineering Guide](https://docs.anthropic.com/en/docs/prompt-engineering)

### Existing Phase Documents

- `docs/PHASE_5.3_robust-email-extraction-plan.md` - Email extraction with LLM
- `docs/PHASE_5.2_IMPLEMENTATION.md` - Gmail integration implementation

### Related Files

- `backend/src/main.rs:1367-1588` - Current content generation code
- `backend/tests/content_generation_tests.rs` - Test suite
- `frontend/src/ResumeManagement.tsx` - Resume upload UI
- `data/resumes/master_resume.md` - Master resume file
- `prompts/job_extraction_default.md` - Example LLM prompt (for job extraction)

### CLAUDE.md Context

From `CLAUDE.md:159-163`:
```markdown
### Development Phases
1. **Phase 1 (Current)**: Core system with manual job entry
2. **Phase 2**: Gmail integration and automated filtering
3. **Phase 3**: Resume/cover letter generation with LLM integration
4. **Phase 4**: Job board integrations (LinkedIn, Indeed, Dice)
5. **Phase 5**: Advanced features (scheduling, analytics, mobile)
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-22
**Status**: Ready for implementation
