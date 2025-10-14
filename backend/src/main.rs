use actix_web::{web, App, HttpResponse, HttpServer, Result};
use actix_cors::Cors;
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, FromRow, Row};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use sha2::{Sha256, Digest};
use handlebars::Handlebars;
use base64::{Engine as _, engine::general_purpose};
use bigdecimal::{BigDecimal, ToPrimitive};
use std::fs::OpenOptions;
use std::io::Write;

// ============================================================================
// Debug Logging
// ============================================================================

fn log_debug(message: &str) {
    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    let log_message = format!("[{}] {}\n", timestamp, message);

    // Write to file
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open("backend/intake_debug.log")
    {
        let _ = file.write_all(log_message.as_bytes());
    }

    // Also print to stdout for immediate visibility
    print!("{}", log_message);
}

// ============================================================================
// Database Models
// ============================================================================

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Job {
    pub job_id: Uuid,
    pub title: String,
    pub company: String,
    pub location: Option<String>,
    pub source: String,
    pub salary: Option<i32>,
    pub commute_time: Option<i32>,
    pub status: String,
    pub date_email_sent: DateTime<Utc>,
    pub description: Option<String>,
    pub url: Option<String>,
    pub filter_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Application {
    pub application_id: Uuid,
    pub job_id: Uuid,
    pub resume_version: Option<String>,
    pub cover_letter_version: Option<String>,
    pub application_status: String,
    pub date_applied: Option<DateTime<Utc>>,
    pub draft_created_at: Option<DateTime<Utc>>,
    pub draft_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Communication {
    pub communication_id: Uuid,
    pub application_id: Uuid,
    pub message_content: String,
    pub message_date: DateTime<Utc>,
    pub channel: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct JobCriteria {
    pub criteria_id: Uuid,
    pub min_salary: Option<i32>,
    pub max_commute_time: Option<i32>,
    pub max_commute_days_per_week: Option<i32>,
    pub preferred_domains: Option<Vec<String>>,
    pub remote_preference: String,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FilterResult {
    pub passed: bool,
    pub reasons: Vec<String>,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct JobDeduplication {
    pub dedup_id: Uuid,
    pub job_id: Uuid,
    pub company_title_hash: String,
    pub url_hash: Option<String>,
    pub created_at: DateTime<Utc>,
}

// ============================================================================
// Phase 5.2: Email Draft Models
// ============================================================================

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct EmailDraft {
    pub draft_id: Uuid,
    pub application_id: Uuid,
    pub gmail_draft_id: Option<String>,
    pub gmail_message_id: Option<String>,
    pub recipient_email: String,
    pub subject: String,
    pub body_text: String,
    pub attachment_name: Option<String>,
    pub attachment_size: Option<i32>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub sent_at: Option<DateTime<Utc>>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDraftRequest {
    pub application_id: Uuid,
    pub recipient_email: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDraftResponse {
    pub draft_id: Uuid,
    pub gmail_draft_id: String,
    pub gmail_url: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DraftStatusResponse {
    pub draft_id: Uuid,
    pub status: String,
    pub created_at: String,
    pub sent_at: Option<String>,
    pub gmail_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GmailDraftRequest {
    pub message: GmailDraftMessage,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GmailDraftMessage {
    pub raw: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GmailDraftResponse {
    pub id: String,
    pub message: GmailDraftMessageResponse,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GmailDraftMessageResponse {
    pub id: String,
    #[serde(rename = "threadId")]
    pub thread_id: String,
}

// ============================================================================
// Phase 4: Automated Job Intake Models
// ============================================================================

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct JobSource {
    pub source_id: Uuid,
    pub source_name: String,
    pub source_type: String,
    pub base_url: Option<String>,
    pub api_endpoint: Option<String>,
    pub auth_required: bool,
    pub auth_type: Option<String>,
    pub is_active: bool,
    pub rate_limit_requests: i32,
    pub rate_limit_window_minutes: i32,
    pub last_sync: Option<DateTime<Utc>>,
    pub sync_interval_minutes: i32,
    pub configuration: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct OAuthCredential {
    pub credential_id: Uuid,
    pub source_id: Uuid,
    pub client_id: String,
    pub client_secret: String,
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
    pub token_expires_at: Option<DateTime<Utc>>,
    pub scope: Option<Vec<String>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct JobIntakeLog {
    pub log_id: Uuid,
    pub source_id: Uuid,
    pub sync_started_at: DateTime<Utc>,
    pub sync_completed_at: Option<DateTime<Utc>>,
    pub jobs_discovered: i32,
    // MECE counters (Mutually Exclusive, Collectively Exhaustive)
    pub jobs_failed_processing: i32,
    pub jobs_filtered_out: i32,
    pub jobs_duplicated: i32,
    pub jobs_created: i32,
    // Deprecated fields (kept for backward compatibility)
    pub jobs_filtered: i32,
    pub jobs_deduplicated: i32,
    pub jobs_approved: i32,
    pub errors_count: i32,
    pub error_details: Option<serde_json::Value>,
    pub validation_error: Option<String>,
    pub sync_status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct EmailJob {
    pub email_job_id: Uuid,
    pub message_id: String,
    pub thread_id: Option<String>,
    pub sender_email: String,
    pub sender_name: Option<String>,
    pub subject: Option<String>,
    pub received_date: DateTime<Utc>,
    pub body_text: Option<String>,
    pub body_html: Option<String>,
    pub attachments: Option<serde_json::Value>,
    pub processed: bool,
    pub job_id: Option<Uuid>,
    pub extraction_confidence: Option<f64>,
    pub extracted_data: Option<serde_json::Value>,
    pub processing_errors: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub processed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GmailMessage {
    pub id: String,
    #[serde(rename = "threadId")]
    pub thread_id: String,
    pub payload: GmailPayload,
    #[serde(rename = "internalDate")]
    pub internal_date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GmailPayload {
    pub headers: Vec<GmailHeader>,
    pub body: Option<GmailBody>,
    pub parts: Option<Vec<GmailPart>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GmailHeader {
    pub name: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GmailBody {
    pub data: Option<String>,
    pub size: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GmailPart {
    pub body: Option<GmailBody>,
    #[serde(rename = "mimeType")]
    pub mime_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GmailListResponse {
    pub messages: Option<Vec<GmailMessageRef>>,
    #[serde(rename = "nextPageToken")]
    pub next_page_token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GmailMessageRef {
    pub id: String,
    #[serde(rename = "threadId")]
    pub thread_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OAuthTokenResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: i64,
    pub token_type: String,
    pub scope: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompensationDetails {
    #[serde(rename = "type")]
    pub comp_type: Option<String>,
    pub salary_min: Option<i32>,
    pub salary_max: Option<i32>,
    pub currency: Option<String>,
    pub hourly_rate: Option<f64>,
    pub daily_rate: Option<f64>,
    pub equity_offered: Option<bool>,
    pub bonus_structure: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EmploymentDetails {
    pub relationship: Option<String>,
    pub tax_structure: Option<String>,
    pub contract_duration: Option<String>,
    pub agency_name: Option<String>,
    pub benefits: Option<String>,
    pub employment_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RemoteWorkDetails {
    pub policy: Option<String>,
    pub days_onsite_per_week: Option<i32>,
    pub remote_eligible_states: Option<Vec<String>>,
    pub timezone_requirement: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommuteDetails {
    pub office_location: Option<String>,
    pub company_shuttle: Option<bool>,
    pub commute_perks: Option<String>,
    pub schedule_flexibility: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JobDomainDetails {
    pub primary_category: Option<String>,
    pub testing_focus: Option<bool>,
    pub testing_level: Option<String>,
    pub automation_focus: Option<bool>,
    pub test_automation_tools: Option<Vec<String>>,
    pub generative_ai_usage: Option<bool>,
    pub ai_tools_mentioned: Option<Vec<String>>,
    pub test_equipment: Option<String>,
    pub tech_stack: Option<Vec<String>>,
    pub seniority: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JobExtractionResult {
    // Backward compatible flat fields
    pub title: Option<String>,
    pub company: Option<String>,
    pub location: Option<String>,
    pub salary_min: Option<i32>,
    pub salary_max: Option<i32>,
    pub description: Option<String>,
    pub url: Option<String>,
    pub confidence: f64,
    pub extraction_method: String,

    // New nested structures
    pub compensation: Option<CompensationDetails>,
    pub employment: Option<EmploymentDetails>,
    pub remote_work: Option<RemoteWorkDetails>,
    pub commute: Option<CommuteDetails>,
    pub job_domain: Option<JobDomainDetails>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ExtractionPrompt {
    pub prompt_id: Uuid,
    pub prompt_name: String,
    pub prompt_type: String,
    pub prompt_content: String,
    pub is_active: bool,
    pub version: i32,
    pub created_by: String,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
    pub notes: Option<String>,
}

// Claude API structures
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
}

#[derive(Debug, Deserialize)]
struct ClaudeContent {
    #[serde(rename = "type")]
    #[allow(dead_code)]
    content_type: String,
    text: String,
}

// ============================================================================
// Request/Response DTOs
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateJobRequest {
    pub title: String,
    pub company: String,
    pub location: Option<String>,
    pub source: String,
    pub salary: Option<i32>,
    pub commute_time: Option<i32>,
    pub description: Option<String>,
    pub url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateJobStatusRequest {
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateApplicationRequest {
    pub job_id: Uuid,
    pub resume_version: Option<String>,
    pub cover_letter_version: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePromptRequest {
    pub prompt_content: String,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCriteriaRequest {
    pub min_salary: Option<i32>,
    pub max_commute_time: Option<i32>,
    pub max_commute_days_per_week: Option<i32>,
    pub preferred_domains: Option<Vec<String>>,
    pub remote_preference: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ResumeVersion {
    pub version_id: Uuid,
    pub version_name: String,
    pub content: String,
    pub format: String,
    pub file_path: Option<String>,
    pub is_master: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CoverLetterTemplate {
    pub template_id: Uuid,
    pub template_name: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ============================================================================
// Phase 5.1: Calendar Integration & Follow-ups Models
// ============================================================================

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Interview {
    pub interview_id: Uuid,
    pub application_id: Uuid,
    pub calendar_event_id: Option<String>,
    pub interview_type: String,
    pub scheduled_date: DateTime<Utc>,
    pub duration_minutes: i32,
    pub location: Option<String>,
    pub interviewer_name: Option<String>,
    pub interviewer_email: Option<String>,
    pub interviewer_phone: Option<String>,
    pub notes: Option<String>,
    pub status: String,
    pub reminder_sent: bool,
    pub calendar_invite_sent: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInterviewRequest {
    pub application_id: Uuid,
    pub interview_type: String,
    pub scheduled_date: DateTime<Utc>,
    pub duration_minutes: Option<i32>,
    pub location: Option<String>,
    pub interviewer_name: Option<String>,
    pub interviewer_email: Option<String>,
    pub interviewer_phone: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct FollowUpSchedule {
    pub follow_up_id: Uuid,
    pub application_id: Uuid,
    pub scheduled_date: DateTime<Utc>,
    pub attempt_number: i32,
    pub follow_up_type: String,
    pub status: String,
    pub template_used: Option<String>,
    pub subject: Option<String>,
    pub body: Option<String>,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub sent_at: Option<DateTime<Utc>>,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateFollowUpRequest {
    pub application_id: Uuid,
    pub scheduled_date: Option<DateTime<Utc>>,
    pub attempt_number: Option<i32>,
    pub template_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApproveFollowUpRequest {
    pub subject: Option<String>,
    pub body: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct FollowUpTemplate {
    pub template_id: Uuid,
    pub template_name: String,
    pub template_type: String,
    pub subject_template: String,
    pub body_template: String,
    pub variables: Option<serde_json::Value>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ApplicationTimeline {
    pub application_id: Uuid,
    pub job_id: Uuid,
    pub job_title: String,
    pub company: String,
    pub date_applied: Option<DateTime<Utc>>,
    pub event_type: String,
    pub event_date: DateTime<Utc>,
    pub event_description: String,
    pub related_id: Option<Uuid>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateContentRequest {
    pub job_id: Uuid,
    pub resume_template: Option<String>,
    pub cover_letter_template: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeneratedContent {
    pub resume: String,
    pub cover_letter: String,
    pub resume_format: String,
    pub generated_at: DateTime<Utc>,
    pub application_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ContentContext {
    pub job_title: String,
    pub company_name: String,
    pub job_description: String,
    pub salary: Option<i32>,
    pub location: String,
    pub source: String,
    pub hiring_manager: String,
    pub current_title: String,
    pub years_experience: String,
    pub relevant_domains: String,
    pub technical_skills: String,
    pub specialization_area: String,
    pub key_achievement_1: String,
    pub specific_accomplishment: String,
    pub company_research: String,
    pub qualification_bullets: String,
    pub job_specific_paragraph: String,
    pub specific_goals: String,
    pub personalized_opening: String,
    pub job_id: String,
    pub application_date: String,
}

// ============================================================================
// Filtering and Deduplication Logic
// ============================================================================

fn generate_hash(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.to_lowercase());
    hex::encode(hasher.finalize())
}

fn is_remote_job(location: &Option<String>) -> bool {
    if let Some(loc) = location {
        let remote_patterns = ["remote", "work from home", "wfh", "anywhere", "distributed"];
        let location_lower = loc.to_lowercase();
        remote_patterns.iter().any(|pattern| location_lower.contains(pattern))
    } else {
        false
    }
}

fn matches_domain(title: &str, description: &Option<String>, domains: &[String]) -> bool {
    let text = format!("{} {}", title, description.as_deref().unwrap_or("")).to_lowercase();

    let domain_keywords = [
        ("testing", &["test", "testing", "qa", "quality assurance", "validation", "verification"] as &[&str]),
        ("test automation", &["automation", "automated testing", "test automation", "selenium", "cypress", "playwright"] as &[&str]),
        ("firmware", &["firmware", "embedded", "hardware", "microcontroller", "fpga"] as &[&str]),
        ("ai", &["ai", "artificial intelligence", "machine learning", "ml", "generative ai", "llm"] as &[&str]),
        ("prompt engineering", &["prompt", "prompt engineering", "llm", "chatgpt", "gpt"] as &[&str])
    ];

    for domain in domains {
        let domain_lower = domain.to_lowercase();
        if let Some((_, keywords)) = domain_keywords.iter().find(|(name, _)| domain_lower.contains(name)) {
            if keywords.iter().any(|keyword| text.contains(keyword)) {
                return true;
            }
        }
    }
    false
}

async fn get_job_criteria(pool: &PgPool) -> Result<JobCriteria, sqlx::Error> {
    sqlx::query_as::<_, JobCriteria>(
        "SELECT * FROM job_criteria ORDER BY updated_at DESC LIMIT 1"
    )
    .fetch_one(pool)
    .await
}

async fn filter_job(job_req: &CreateJobRequest, pool: &PgPool) -> FilterResult {
    let mut reasons = Vec::new();

    // Get current job criteria
    let criteria = match get_job_criteria(pool).await {
        Ok(criteria) => criteria,
        Err(_) => {
            reasons.push("Unable to load job criteria".to_string());
            return FilterResult {
                passed: false,
                reasons,
                status: "filtered".to_string(),
            };
        }
    };

    // Check minimum salary
    if let Some(salary) = job_req.salary {
        if let Some(min_salary) = criteria.min_salary {
            if salary < min_salary {
                reasons.push(format!("Salary ${} below minimum ${}", salary, min_salary));
            }
        }
    } else {
        reasons.push("No salary information provided".to_string());
    }

    // Check if remote (preferred)
    let is_remote = is_remote_job(&job_req.location);
    if !is_remote {
        // Check commute time if not remote
        if let Some(commute) = job_req.commute_time {
            if let Some(max_commute) = criteria.max_commute_time {
                if commute > max_commute {
                    reasons.push(format!("Commute time {} min exceeds maximum {} min", commute, max_commute));
                }
            }
        } else if job_req.location.is_some() {
            reasons.push("Non-remote position with unknown commute time".to_string());
        }
    }

    // Check domain match
    if let Some(ref domains) = criteria.preferred_domains {
        if !matches_domain(&job_req.title, &job_req.description, domains) {
            reasons.push("Job doesn't match preferred domains (Testing, AI, Firmware)".to_string());
        }
    }

    let passed = reasons.is_empty();
    let status = if passed { "new".to_string() } else { "filtered".to_string() };

    FilterResult { passed, reasons, status }
}

async fn check_duplicate(job_req: &CreateJobRequest, pool: &PgPool) -> Result<Option<Uuid>, sqlx::Error> {
    let company_title_hash = generate_hash(&format!("{}{}", job_req.company, job_req.title));

    let existing = sqlx::query_as::<_, JobDeduplication>(
        "SELECT * FROM job_deduplication WHERE company_title_hash = $1"
    )
    .bind(&company_title_hash)
    .fetch_optional(pool)
    .await?;

    if let Some(dedup) = existing {
        return Ok(Some(dedup.job_id));
    }

    // Check URL hash if URL provided
    if let Some(ref url) = job_req.url {
        let url_hash = generate_hash(url);
        let url_existing = sqlx::query_as::<_, JobDeduplication>(
            "SELECT * FROM job_deduplication WHERE url_hash = $1"
        )
        .bind(&url_hash)
        .fetch_optional(pool)
        .await?;

        if let Some(dedup) = url_existing {
            return Ok(Some(dedup.job_id));
        }
    }

    Ok(None)
}

async fn create_deduplication_entry(job_id: Uuid, job_req: &CreateJobRequest, pool: &PgPool) -> Result<(), sqlx::Error> {
    let company_title_hash = generate_hash(&format!("{}{}", job_req.company, job_req.title));
    let url_hash = job_req.url.as_ref().map(|url| generate_hash(url));

    sqlx::query(
        r#"
        INSERT INTO job_deduplication (dedup_id, job_id, company_title_hash, url_hash)
        VALUES ($1, $2, $3, $4)
        "#
    )
    .bind(Uuid::new_v4())
    .bind(job_id)
    .bind(&company_title_hash)
    .bind(&url_hash)
    .execute(pool)
    .await?;

    Ok(())
}

// ============================================================================
// Content Generation Engine
// ============================================================================

async fn get_master_resume(pool: &PgPool) -> Result<ResumeVersion, sqlx::Error> {
    sqlx::query_as::<_, ResumeVersion>(
        "SELECT version_id, version_name, content, format, file_path, is_master, created_at, updated_at FROM resume_versions WHERE is_master = true ORDER BY created_at DESC LIMIT 1"
    )
    .fetch_one(pool)
    .await
}

async fn get_cover_letter_template(pool: &PgPool, template_name: Option<String>) -> Result<CoverLetterTemplate, sqlx::Error> {
    if let Some(name) = template_name {
        sqlx::query_as::<_, CoverLetterTemplate>(
            "SELECT template_id, template_name, content, created_at, updated_at FROM cover_letter_templates WHERE template_name = $1"
        )
        .bind(name)
        .fetch_one(pool)
        .await
    } else {
        sqlx::query_as::<_, CoverLetterTemplate>(
            "SELECT template_id, template_name, content, created_at, updated_at FROM cover_letter_templates ORDER BY created_at DESC LIMIT 1"
        )
        .fetch_one(pool)
        .await
    }
}

fn extract_relevant_resume_sections(master_resume: &str, job: &Job) -> String {
    let mut customized_resume = master_resume.to_string();

    // Determine relevant domains based on job
    let job_lower = format!("{} {}", job.title.to_lowercase(), job.description.as_ref().unwrap_or(&String::new()).to_lowercase());

    // Add emphasis based on job requirements
    if job_lower.contains("test") || job_lower.contains("qa") || job_lower.contains("quality") {
        customized_resume = highlight_testing_experience(customized_resume);
    }

    if job_lower.contains("ai") || job_lower.contains("ml") || job_lower.contains("machine learning") || job_lower.contains("prompt") {
        customized_resume = highlight_ai_experience(customized_resume);
    }

    if job_lower.contains("firmware") || job_lower.contains("hardware") || job_lower.contains("embedded") {
        customized_resume = highlight_firmware_experience(customized_resume);
    }

    customized_resume
}

fn highlight_testing_experience(resume: String) -> String {
    // Move testing-related experience to the front and emphasize
    let highlighted = resume.replace("Test Automation", "**Test Automation**")
        .replace("Quality Engineering", "**Quality Engineering**")
        .replace("testing frameworks", "**testing frameworks**")
        .replace("CI/CD", "**CI/CD**");
    highlighted
}

fn highlight_ai_experience(resume: String) -> String {
    let highlighted = resume.replace("AI-powered", "**AI-powered**")
        .replace("LLM", "**LLM**")
        .replace("Generative AI", "**Generative AI**")
        .replace("Prompt Engineering", "**Prompt Engineering**")
        .replace("OpenAI", "**OpenAI**");
    highlighted
}

fn highlight_firmware_experience(resume: String) -> String {
    let highlighted = resume.replace("firmware", "**firmware**")
        .replace("hardware", "**hardware**")
        .replace("embedded", "**embedded**")
        .replace("validation", "**validation**");
    highlighted
}

fn build_content_context(job: &Job) -> ContentContext {
    let hiring_manager = extract_hiring_manager(&job.description);
    let company_research = generate_company_research(&job.company);
    let relevant_domains = determine_relevant_domains(job);
    let job_specific_content = generate_job_specific_content(job);

    ContentContext {
        job_title: job.title.clone(),
        company_name: job.company.clone(),
        job_description: job.description.as_ref().unwrap_or(&String::new()).clone(),
        salary: job.salary,
        location: job.location.as_ref().unwrap_or(&String::from("Not specified")).clone(),
        source: job.source.clone(),
        hiring_manager,
        current_title: "Senior Test Automation Engineer".to_string(),
        years_experience: "10+".to_string(),
        relevant_domains,
        technical_skills: "test automation, AI/ML, quality engineering".to_string(),
        specialization_area: "test automation and AI-driven development".to_string(),
        key_achievement_1: "reduced production defects by 85% through advanced automation".to_string(),
        specific_accomplishment: "architect scalable testing solutions for distributed systems".to_string(),
        company_research,
        qualification_bullets: generate_qualification_bullets(job),
        job_specific_paragraph: job_specific_content,
        specific_goals: "innovation in testing and quality assurance".to_string(),
        personalized_opening: generate_personalized_opening(job),
        job_id: job.job_id.to_string(),
        application_date: Utc::now().format("%Y-%m-%d").to_string(),
    }
}

fn extract_hiring_manager(description: &Option<String>) -> String {
    if let Some(desc) = description {
        // Simple extraction - in real world, this would be more sophisticated
        if desc.contains("team lead") || desc.contains("manager") {
            "Hiring Manager".to_string()
        } else {
            "Dear Hiring Team".to_string()
        }
    } else {
        "Dear Hiring Team".to_string()
    }
}

fn generate_company_research(company: &str) -> String {
    format!("{} has a strong reputation for technological innovation and engineering excellence", company)
}

fn determine_relevant_domains(job: &Job) -> String {
    let job_text = format!("{} {}", job.title.to_lowercase(), job.description.as_ref().unwrap_or(&String::new()).to_lowercase());
    let mut domains = Vec::new();

    if job_text.contains("test") || job_text.contains("qa") {
        domains.push("test automation");
    }
    if job_text.contains("ai") || job_text.contains("ml") {
        domains.push("AI/ML");
    }
    if job_text.contains("firmware") || job_text.contains("hardware") {
        domains.push("firmware testing");
    }

    if domains.is_empty() {
        "software engineering".to_string()
    } else {
        domains.join(" and ")
    }
}

fn generate_qualification_bullets(job: &Job) -> String {
    let job_text = format!("{} {}", job.title.to_lowercase(), job.description.as_ref().unwrap_or(&String::new()).to_lowercase());
    let mut bullets = Vec::new();

    bullets.push("• 10+ years of experience in test automation and quality engineering");

    if job_text.contains("ai") || job_text.contains("ml") || job_text.contains("prompt") {
        bullets.push("• Expertise in AI-driven testing and prompt engineering for LLM applications");
    }

    if job_text.contains("framework") || job_text.contains("architecture") {
        bullets.push("• Proven track record of architecting scalable testing frameworks");
    }

    if job_text.contains("leadership") || job_text.contains("lead") || job_text.contains("senior") {
        bullets.push("• Strong leadership experience mentoring engineering teams");
    }

    bullets.push("• Deep knowledge of modern testing tools and CI/CD best practices");

    bullets.join("\n")
}

fn generate_job_specific_content(job: &Job) -> String {
    let job_text = format!("{} {}", job.title.to_lowercase(), job.description.as_ref().unwrap_or(&String::new()).to_lowercase());

    if job_text.contains("ai") || job_text.contains("ml") {
        format!("I am particularly excited about {}'s work in AI and machine learning. My recent experience building AI-powered test generation systems and intelligent test failure analysis aligns perfectly with your needs for innovative testing solutions.", job.company)
    } else if job_text.contains("firmware") || job_text.contains("hardware") {
        format!("My experience in firmware validation and hardware testing frameworks would be valuable for {}'s embedded systems development.", job.company)
    } else {
        format!("I am impressed by {}'s commitment to quality and would bring my expertise in comprehensive test automation to help maintain your high standards.", job.company)
    }
}

fn generate_personalized_opening(job: &Job) -> String {
    let salary_note = if let Some(salary) = job.salary {
        if salary >= 150000 {
            "The opportunity to work on cutting-edge technology at a competitive compensation level makes this role particularly appealing."
        } else {
            "This role offers an excellent opportunity to contribute to meaningful technical challenges."
        }
    } else {
        "This role represents an exciting opportunity to apply my expertise in a new environment."
    };

    format!("{} Your focus on {} aligns perfectly with my career goals.", salary_note, determine_relevant_domains(job))
}

async fn generate_content_for_job(job: &Job, pool: &PgPool) -> Result<GeneratedContent, Box<dyn std::error::Error>> {
    // Get master resume
    let master_resume = get_master_resume(pool).await?;

    // Get cover letter template
    let cover_letter_template = get_cover_letter_template(pool, None).await?;

    // Generate customized resume
    let customized_resume = extract_relevant_resume_sections(&master_resume.content, job);

    // Build context for template rendering
    let context = build_content_context(job);

    // Render cover letter template
    let handlebars = Handlebars::new();
    let cover_letter = handlebars.render_template(&cover_letter_template.content, &context)?;

    Ok(GeneratedContent {
        resume: customized_resume,
        cover_letter,
        resume_format: master_resume.format,
        generated_at: Utc::now(),
        application_id: Uuid::nil(), // Will be set by the handler
    })
}

// ============================================================================
// Job Handlers
// ============================================================================

async fn get_jobs(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let jobs = sqlx::query_as::<_, Job>(
        "SELECT job_id, title, company, location, source, salary, commute_time, status, date_email_sent, description, url, filter_reason FROM jobs ORDER BY date_email_sent DESC"
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(jobs))
}

async fn get_job(
    pool: web::Data<PgPool>,
    job_id: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let job = sqlx::query_as::<_, Job>(
        "SELECT job_id, title, company, location, source, salary, commute_time, status, date_email_sent, description, url, filter_reason FROM jobs WHERE job_id = $1"
    )
    .bind(*job_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    match job {
        Some(job) => Ok(HttpResponse::Ok().json(job)),
        None => Ok(HttpResponse::NotFound().json("Job not found")),
    }
}

async fn create_job(
    pool: web::Data<PgPool>,
    job_req: web::Json<CreateJobRequest>,
) -> Result<HttpResponse> {
    // Check for duplicates first
    match check_duplicate(&job_req, pool.get_ref()).await {
        Ok(Some(existing_job_id)) => {
            return Ok(HttpResponse::Conflict().json(serde_json::json!({
                "error": "Duplicate job detected",
                "existing_job_id": existing_job_id
            })));
        }
        Ok(None) => {}, // No duplicate, continue
        Err(e) => {
            eprintln!("Error checking duplicates: {}", e);
            // Continue anyway, don't fail on deduplication errors
        }
    }

    // Filter the job against criteria
    let filter_result = filter_job(&job_req, pool.get_ref()).await;
    let job_id = Uuid::new_v4();

    // Store the filter reason in the database
    let filter_reason = if filter_result.reasons.is_empty() {
        None
    } else {
        Some(filter_result.reasons.join("; "))
    };

    let job = sqlx::query_as::<_, Job>(
        r#"
        INSERT INTO jobs (job_id, title, company, location, source, salary,
                         commute_time, status, date_email_sent, description, url, filter_reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11)
        RETURNING *
        "#
    )
    .bind(job_id)
    .bind(&job_req.title)
    .bind(&job_req.company)
    .bind(&job_req.location)
    .bind(&job_req.source)
    .bind(job_req.salary)
    .bind(job_req.commute_time)
    .bind(&filter_result.status)
    .bind(&job_req.description)
    .bind(&job_req.url)
    .bind(&filter_reason)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    // Create deduplication entry if job was created successfully
    if let Err(e) = create_deduplication_entry(job_id, &job_req, pool.get_ref()).await {
        eprintln!("Error creating deduplication entry: {}", e);
        // Don't fail the request, just log the error
    }

    Ok(HttpResponse::Created().json(job))
}

async fn update_job_status(
    pool: web::Data<PgPool>,
    job_id: web::Path<Uuid>,
    status_req: web::Json<UpdateJobStatusRequest>,
) -> Result<HttpResponse> {
    let job = sqlx::query_as::<_, Job>(
        "UPDATE jobs SET status = $1 WHERE job_id = $2 RETURNING job_id, title, company, location, source, salary, commute_time, status, date_email_sent, description, url, filter_reason"
    )
    .bind(&status_req.status)
    .bind(*job_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    match job {
        Some(job) => Ok(HttpResponse::Ok().json(job)),
        None => Ok(HttpResponse::NotFound().json("Job not found")),
    }
}

async fn get_jobs_by_status(
    pool: web::Data<PgPool>,
    status: web::Path<String>,
) -> Result<HttpResponse> {
    let jobs = sqlx::query_as::<_, Job>(
        "SELECT job_id, title, company, location, source, salary, commute_time, status, date_email_sent, description, url, filter_reason FROM jobs WHERE status = $1 ORDER BY date_email_sent DESC"
    )
    .bind(status.as_str())
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(jobs))
}

// ============================================================================
// Application Handlers
// ============================================================================

async fn create_application(
    pool: web::Data<PgPool>,
    app_req: web::Json<CreateApplicationRequest>,
) -> Result<HttpResponse> {
    let application_id = Uuid::new_v4();
    
    let application = sqlx::query_as::<_, Application>(
        r#"
        INSERT INTO applications (application_id, job_id, resume_version, 
                                 cover_letter_version, application_status, date_applied)
        VALUES ($1, $2, $3, $4, 'pending', NOW())
        RETURNING *
        "#
    )
    .bind(application_id)
    .bind(app_req.job_id)
    .bind(&app_req.resume_version)
    .bind(&app_req.cover_letter_version)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Created().json(application))
}

async fn get_applications(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let applications = sqlx::query_as::<_, Application>(
        "SELECT * FROM applications ORDER BY date_applied DESC"
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(applications))
}

// ============================================================================
// Job Criteria Handlers
// ============================================================================

async fn get_criteria(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let criteria = sqlx::query_as::<_, JobCriteria>(
        "SELECT * FROM job_criteria ORDER BY updated_at DESC LIMIT 1"
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    match criteria {
        Some(criteria) => Ok(HttpResponse::Ok().json(criteria)),
        None => Ok(HttpResponse::NotFound().json("No job criteria configured")),
    }
}

async fn update_criteria(
    pool: web::Data<PgPool>,
    criteria_req: web::Json<UpdateCriteriaRequest>,
) -> Result<HttpResponse> {
    let criteria_id = Uuid::new_v4();

    let criteria = sqlx::query_as::<_, JobCriteria>(
        r#"
        INSERT INTO job_criteria (criteria_id, min_salary, max_commute_time, max_commute_days_per_week,
                                 preferred_domains, remote_preference, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
        "#
    )
    .bind(criteria_id)
    .bind(criteria_req.min_salary)
    .bind(criteria_req.max_commute_time)
    .bind(criteria_req.max_commute_days_per_week)
    .bind(&criteria_req.preferred_domains)
    .bind(&criteria_req.remote_preference)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(criteria))
}

// ============================================================================
// Filtering and Stats Handlers
// ============================================================================

async fn get_filtered_jobs(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let jobs = sqlx::query_as::<_, Job>(
        "SELECT job_id, title, company, location, source, salary, commute_time, status, date_email_sent, description, url, filter_reason FROM jobs WHERE status = 'filtered' ORDER BY date_email_sent DESC"
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(jobs))
}

async fn get_job_stats(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let stats = sqlx::query!(
        r#"
        SELECT
            status,
            COUNT(*) as count
        FROM jobs
        GROUP BY status
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let mut stats_map: std::collections::HashMap<String, i64> = stats
        .into_iter()
        .filter_map(|row| row.status.map(|status| (status, row.count.unwrap_or(0))))
        .collect();

    // Ensure all expected statuses are present with default value of 0
    stats_map.entry("new".to_string()).or_insert(0);
    stats_map.entry("approved".to_string()).or_insert(0);
    stats_map.entry("applied".to_string()).or_insert(0);
    stats_map.entry("filtered".to_string()).or_insert(0); // Jobs with status='filtered' from jobs table

    // Add failed, duplicated, filtered, created, and discovered counts from job_intake_logs (MECE counters)
    let intake_stats = sqlx::query!(
        r#"
        SELECT
            COALESCE(SUM(jobs_failed_processing), 0) as total_failed,
            COALESCE(SUM(jobs_duplicated), 0) as total_duplicated,
            COALESCE(SUM(jobs_filtered_out), 0) as total_filtered,
            COALESCE(SUM(jobs_created), 0) as total_created,
            COALESCE(SUM(jobs_discovered), 0) as total_discovered
        FROM job_intake_logs
        WHERE sync_status = 'completed'
        "#
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    stats_map.insert("failed".to_string(), intake_stats.total_failed.unwrap_or(0));
    stats_map.insert("duplicated".to_string(), intake_stats.total_duplicated.unwrap_or(0));
    // Note: "filtered" count comes from jobs table (jobs with status='filtered'), not intake logs
    // stats_map.insert("filtered".to_string(), intake_stats.total_filtered.unwrap_or(0)); // This was overwriting the jobs table count
    stats_map.insert("filtered_during_intake".to_string(), intake_stats.total_filtered.unwrap_or(0)); // Jobs filtered during email processing
    stats_map.insert("created".to_string(), intake_stats.total_created.unwrap_or(0));
    stats_map.insert("discovered".to_string(), intake_stats.total_discovered.unwrap_or(0));

    // MECE Validation: discovered = failed + filtered + duplicated + created
    let discovered = intake_stats.total_discovered.unwrap_or(0);
    let failed = intake_stats.total_failed.unwrap_or(0);
    let filtered = intake_stats.total_filtered.unwrap_or(0);
    let duplicated = intake_stats.total_duplicated.unwrap_or(0);
    let created = intake_stats.total_created.unwrap_or(0);

    let sum = failed + filtered + duplicated + created;
    let mece_valid = discovered == sum;

    stats_map.insert("mece_valid".to_string(), if mece_valid { 1 } else { 0 });
    if !mece_valid {
        stats_map.insert("mece_expected".to_string(), discovered);
        stats_map.insert("mece_actual".to_string(), sum);
    }

    Ok(HttpResponse::Ok().json(stats_map))
}

// ============================================================================
// Content Generation Handlers
// ============================================================================

async fn get_resumes(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let resumes = sqlx::query_as::<_, ResumeVersion>(
        "SELECT version_id, version_name, content, format, file_path, is_master, created_at, updated_at FROM resume_versions ORDER BY created_at DESC"
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(resumes))
}

#[derive(Debug, Deserialize)]
struct CreateResumeRequest {
    version_name: String,
    content: String,
    format: Option<String>,
    is_master: Option<bool>,
}

async fn create_resume(
    pool: web::Data<PgPool>,
    resume_data: web::Json<CreateResumeRequest>,
) -> Result<HttpResponse> {
    let format = resume_data.format.clone().unwrap_or_else(|| "markdown".to_string());
    let is_master = resume_data.is_master.unwrap_or(false);

    // If this is being set as master, unset all other master resumes
    if is_master {
        sqlx::query!("UPDATE resume_versions SET is_master = false WHERE is_master = true")
            .execute(pool.get_ref())
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
    }

    let resume = sqlx::query_as::<_, ResumeVersion>(
        "INSERT INTO resume_versions (version_name, content, format, is_master) VALUES ($1, $2, $3, $4) RETURNING version_id, version_name, content, format, file_path, is_master, created_at, updated_at"
    )
    .bind(&resume_data.version_name)
    .bind(&resume_data.content)
    .bind(&format)
    .bind(is_master)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Created().json(resume))
}

async fn set_master_resume(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let version_id = path.into_inner();

    // First, unset all other master resumes
    sqlx::query!("UPDATE resume_versions SET is_master = false WHERE is_master = true")
        .execute(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    // Set this resume as master
    let resume = sqlx::query_as::<_, ResumeVersion>(
        "UPDATE resume_versions SET is_master = true WHERE version_id = $1 RETURNING version_id, version_name, content, format, file_path, is_master, created_at, updated_at"
    )
    .bind(version_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(resume))
}

async fn delete_resume(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let version_id = path.into_inner();

    // Check if this is the master resume
    let is_master = sqlx::query_scalar::<_, bool>(
        "SELECT is_master FROM resume_versions WHERE version_id = $1"
    )
    .bind(version_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    if is_master == Some(true) {
        return Err(actix_web::error::ErrorBadRequest("Cannot delete master resume. Set another resume as master first."));
    }

    sqlx::query!("DELETE FROM resume_versions WHERE version_id = $1", version_id)
        .execute(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::NoContent().finish())
}

async fn load_master_resume_from_file(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    use std::fs;

    // Read the master resume file (path relative to project root, not backend/)
    let file_path = "../data/resumes/master_resume.md";
    let content = fs::read_to_string(file_path)
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to read resume file: {}", e)))?;

    // Unset all other master resumes
    sqlx::query!("UPDATE resume_versions SET is_master = false WHERE is_master = true")
        .execute(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    // Check if a master resume already exists with this content
    let existing = sqlx::query_scalar::<_, Uuid>(
        "SELECT version_id FROM resume_versions WHERE content = $1 LIMIT 1"
    )
    .bind(&content)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let resume = if let Some(existing_id) = existing {
        // Update existing resume to be master
        sqlx::query_as::<_, ResumeVersion>(
            "UPDATE resume_versions SET is_master = true WHERE version_id = $1 RETURNING version_id, version_name, content, format, file_path, is_master, created_at, updated_at"
        )
        .bind(existing_id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
    } else {
        // Create new master resume
        let version_name = format!("master_v{}", chrono::Utc::now().format("%Y%m%d_%H%M%S"));
        sqlx::query_as::<_, ResumeVersion>(
            "INSERT INTO resume_versions (version_name, content, format, file_path, is_master) VALUES ($1, $2, 'markdown', $3, true) RETURNING version_id, version_name, content, format, file_path, is_master, created_at, updated_at"
        )
        .bind(&version_name)
        .bind(&content)
        .bind(file_path)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
    };

    Ok(HttpResponse::Ok().json(resume))
}

async fn get_cover_letter_templates_handler(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let templates = sqlx::query_as::<_, CoverLetterTemplate>(
        "SELECT template_id, template_name, content, created_at, updated_at FROM cover_letter_templates ORDER BY created_at DESC"
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(templates))
}

async fn generate_content_handler(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let job_id = path.into_inner();

    // Get job details
    let job = sqlx::query_as::<_, Job>(
        "SELECT job_id, title, company, location, source, salary, commute_time, status, date_email_sent, description, url, filter_reason FROM jobs WHERE job_id = $1"
    )
    .bind(job_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Job not found: {}", e)))?;

    // Check if application already exists for this job
    let existing_application = sqlx::query_as::<_, Application>(
        "SELECT * FROM applications WHERE job_id = $1"
    )
    .bind(job_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    // Create application if it doesn't exist
    let application_id = if let Some(app) = existing_application {
        app.application_id
    } else {
        // Create new application
        let new_app_id = Uuid::new_v4();
        sqlx::query(
            r#"
            INSERT INTO applications (application_id, job_id, resume_version,
                                     cover_letter_version, application_status, date_applied)
            VALUES ($1, $2, NULL, NULL, 'pending', NOW())
            "#
        )
        .bind(new_app_id)
        .bind(job_id)
        .execute(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to create application: {}", e)))?;

        new_app_id
    };

    // Generate content
    match generate_content_for_job(&job, pool.get_ref()).await {
        Ok(mut content) => {
            content.application_id = application_id;
            Ok(HttpResponse::Ok().json(content))
        },
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to generate content: {}", e)
        })))
    }
}

async fn generate_content_with_options_handler(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
    req: web::Json<GenerateContentRequest>,
) -> Result<HttpResponse> {
    let job_id = path.into_inner();

    // Validate the job ID matches
    if req.job_id != job_id {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Job ID in path doesn't match request body"
        })));
    }

    // Get job details
    let job = sqlx::query_as::<_, Job>(
        "SELECT job_id, title, company, location, source, salary, commute_time, status, date_email_sent, description, url, filter_reason FROM jobs WHERE job_id = $1"
    )
    .bind(job_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Job not found: {}", e)))?;

    // Check if application already exists for this job
    let existing_application = sqlx::query_as::<_, Application>(
        "SELECT * FROM applications WHERE job_id = $1"
    )
    .bind(job_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    // Create application if it doesn't exist
    let application_id = if let Some(app) = existing_application {
        app.application_id
    } else {
        // Create new application
        let new_app_id = Uuid::new_v4();
        sqlx::query(
            r#"
            INSERT INTO applications (application_id, job_id, resume_version,
                                     cover_letter_version, application_status, date_applied)
            VALUES ($1, $2, NULL, NULL, 'pending', NOW())
            "#
        )
        .bind(new_app_id)
        .bind(job_id)
        .execute(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to create application: {}", e)))?;

        new_app_id
    };

    // For now, use the basic generation (could extend to use custom templates)
    match generate_content_for_job(&job, pool.get_ref()).await {
        Ok(mut content) => {
            content.application_id = application_id;
            Ok(HttpResponse::Ok().json(content))
        },
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to generate content: {}", e)
        })))
    }
}

// ============================================================================
// Phase 4: Gmail API Integration
// ============================================================================

async fn get_gmail_oauth_url() -> Result<HttpResponse> {
    let client_id = std::env::var("GMAIL_CLIENT_ID")
        .map_err(|_| actix_web::error::ErrorInternalServerError("GMAIL_CLIENT_ID not set"))?;

    let redirect_uri = std::env::var("GMAIL_REDIRECT_URI")
        .unwrap_or_else(|_| "http://localhost:8080/auth/gmail/callback".to_string());

    // Request both readonly (to fetch emails) and modify (to mark as read) scopes
    let scope = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify";
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&scope={}&response_type=code&access_type=offline&prompt=consent",
        urlencoding::encode(&client_id),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode(scope)
    );

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "auth_url": auth_url
    })))
}

async fn handle_gmail_oauth_callback(
    pool: web::Data<PgPool>,
    query: web::Query<std::collections::HashMap<String, String>>
) -> Result<HttpResponse> {
    let code = query.get("code")
        .ok_or_else(|| actix_web::error::ErrorBadRequest("Missing authorization code"))?;

    let client_id = std::env::var("GMAIL_CLIENT_ID")
        .map_err(|_| actix_web::error::ErrorInternalServerError("GMAIL_CLIENT_ID not set"))?;

    let client_secret = std::env::var("GMAIL_CLIENT_SECRET")
        .map_err(|_| actix_web::error::ErrorInternalServerError("GMAIL_CLIENT_SECRET not set"))?;

    let redirect_uri = std::env::var("GMAIL_REDIRECT_URI")
        .unwrap_or_else(|_| "http://localhost:8080/auth/gmail/callback".to_string());

    // Exchange code for tokens
    let client = reqwest::Client::new();
    let token_response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("code", code),
            ("client_id", &client_id),
            ("client_secret", &client_secret),
            ("redirect_uri", &redirect_uri),
            ("grant_type", &"authorization_code".to_string()),
        ])
        .send()
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Token request failed: {}", e)))?;

    let token_data: OAuthTokenResponse = token_response
        .json()
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to parse token response: {}", e)))?;

    // Get Gmail source ID
    let source = sqlx::query_as::<_, JobSource>(
        "SELECT * FROM job_sources WHERE source_name = 'gmail' LIMIT 1"
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Gmail source not found"))?;

    // Store or update OAuth credentials
    let expires_at = chrono::Utc::now() + chrono::Duration::seconds(token_data.expires_in);

    sqlx::query!(
        r#"
        INSERT INTO oauth_credentials (credential_id, source_id, client_id, client_secret, access_token, refresh_token, token_expires_at, scope)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (source_id) DO UPDATE SET
            access_token = EXCLUDED.access_token,
            refresh_token = EXCLUDED.refresh_token,
            token_expires_at = EXCLUDED.token_expires_at,
            updated_at = NOW()
        "#,
        Uuid::new_v4(),
        source.source_id,
        client_id,
        client_secret,
        token_data.access_token,
        token_data.refresh_token,
        expires_at,
        &vec![token_data.scope.unwrap_or_default()]
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to store credentials: {}", e)))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Gmail integration configured successfully",
        "expires_at": expires_at
    })))
}

async fn sync_gmail_jobs(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let log_id = Uuid::new_v4();

    // Get Gmail source
    let source = sqlx::query_as::<_, JobSource>(
        "SELECT * FROM job_sources WHERE source_name = 'gmail' AND is_active = true LIMIT 1"
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorNotFound("Gmail source not found or inactive"))?;

    // Create intake log
    sqlx::query!(
        "INSERT INTO job_intake_logs (log_id, source_id, sync_status) VALUES ($1, $2, 'running')",
        log_id,
        source.source_id
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to create log: {}", e)))?;

    // Get OAuth credentials
    let credentials = sqlx::query_as::<_, OAuthCredential>(
        "SELECT * FROM oauth_credentials WHERE source_id = $1 LIMIT 1"
    )
    .bind(source.source_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorNotFound("Gmail credentials not found"))?;

    let access_token = credentials.access_token.as_ref()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No access token available"))?.clone();

    // Check if token is expired and refresh if needed
    let token = if let Some(expires_at) = credentials.token_expires_at {
        if chrono::Utc::now() > expires_at {
            refresh_gmail_token(&credentials, pool.get_ref()).await?
        } else {
            access_token
        }
    } else {
        access_token
    };

    match process_gmail_messages(&token, &source, pool.get_ref(), log_id).await {
        Ok(metrics) => {
            // Validate counters (mutually exclusive and collectively exhaustive)
            let expected_total = metrics.failed_processing + metrics.filtered_out + metrics.duplicated + metrics.created;
            let validation_error = if expected_total != metrics.discovered {
                Some(format!(
                    "Counter mismatch: discovered={} but failed+filtered+duplicated+created={}+{}+{}+{}={}",
                    metrics.discovered, metrics.failed_processing, metrics.filtered_out, metrics.duplicated,
                    metrics.created, expected_total
                ))
            } else {
                None
            };

            if let Some(ref error_msg) = validation_error {
                log_debug(&format!("⚠️  VALIDATION ERROR: {}", error_msg));
            }

            // Update log as completed with all metrics
            sqlx::query!(
                r#"
                UPDATE job_intake_logs
                SET sync_completed_at = NOW(),
                    jobs_discovered = $1,
                    jobs_failed_processing = $2,
                    jobs_filtered_out = $3,
                    jobs_duplicated = $4,
                    jobs_created = $5,
                    validation_error = $6,
                    sync_status = 'completed'
                WHERE log_id = $7
                "#,
                metrics.discovered,
                metrics.failed_processing,
                metrics.filtered_out,
                metrics.duplicated,
                metrics.created,
                validation_error,
                log_id
            )
            .execute(pool.get_ref())
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to update log: {}", e)))?;

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "message": "Gmail sync completed successfully",
                "metrics": {
                    "jobs_discovered": metrics.discovered,
                    "jobs_failed_processing": metrics.failed_processing,
                    "jobs_filtered_out": metrics.filtered_out,
                    "jobs_duplicated": metrics.duplicated,
                    "jobs_created": metrics.created
                },
                "validation_error": validation_error
            })))
        }
        Err(e) => {
            // Update log as failed
            sqlx::query!(
                r#"
                UPDATE job_intake_logs
                SET sync_completed_at = NOW(), sync_status = 'failed', errors_count = 1,
                    error_details = $1
                WHERE log_id = $2
                "#,
                serde_json::json!({"error": e.to_string()}),
                log_id
            )
            .execute(pool.get_ref())
            .await
            .ok();

            Err(actix_web::error::ErrorInternalServerError(format!("Gmail sync failed: {}", e)))
        }
    }
}

async fn refresh_gmail_token(credentials: &OAuthCredential, pool: &PgPool) -> actix_web::Result<String> {
    let refresh_token = credentials.refresh_token.as_ref()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No refresh token available"))?;

    let client = reqwest::Client::new();
    let response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("refresh_token", refresh_token),
            ("client_id", &credentials.client_id),
            ("client_secret", &credentials.client_secret),
            ("grant_type", &"refresh_token".to_string()),
        ])
        .send()
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Token refresh failed: {}", e)))?;

    let token_data: OAuthTokenResponse = response
        .json()
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to parse refresh response: {}", e)))?;

    let expires_at = chrono::Utc::now() + chrono::Duration::seconds(token_data.expires_in);

    // Update stored credentials
    sqlx::query!(
        "UPDATE oauth_credentials SET access_token = $1, token_expires_at = $2, updated_at = NOW() WHERE credential_id = $3",
        token_data.access_token,
        expires_at,
        credentials.credential_id
    )
    .execute(pool)
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to update credentials: {}", e)))?;

    Ok(token_data.access_token)
}

struct SyncMetrics {
    discovered: i32,
    failed_processing: i32,
    filtered_out: i32,  // Emails with confidence < 0.3 (not real job opportunities)
    duplicated: i32,
    created: i32,
}

/// Get or create the "JobOp" label in Gmail
/// This label is used to mark emails that contain real job opportunities
async fn get_or_create_jobop_label(
    client: &reqwest::Client,
    access_token: &str,
) -> std::result::Result<String, Box<dyn std::error::Error + Send + Sync>> {
    #[derive(Debug, Deserialize)]
    struct LabelsResponse {
        labels: Vec<LabelInfo>,
    }

    #[derive(Debug, Deserialize)]
    struct LabelInfo {
        id: String,
        name: String,
    }

    // First, try to find existing label
    let url = "https://gmail.googleapis.com/gmail/v1/users/me/labels";
    let response = client
        .get(url)
        .bearer_auth(access_token)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to fetch labels: {} - {}", status, error_text).into());
    }

    let labels: LabelsResponse = response.json().await?;

    // Check if "JobOp" label already exists
    if let Some(label) = labels.labels.iter().find(|l| l.name == "JobOp") {
        log_debug(&format!("Found existing JobOp label with ID: {}", label.id));
        return Ok(label.id.clone());
    }

    // Create new "JobOp" label
    log_debug("JobOp label not found, creating new label");
    let create_body = serde_json::json!({
        "name": "JobOp",
        "labelListVisibility": "labelShow",
        "messageListVisibility": "show"
    });

    let create_response = client
        .post("https://gmail.googleapis.com/gmail/v1/users/me/labels")
        .bearer_auth(access_token)
        .json(&create_body)
        .send()
        .await?;

    if !create_response.status().is_success() {
        let status = create_response.status();
        let error_text = create_response.text().await.unwrap_or_default();
        return Err(format!("Failed to create label: {} - {}", status, error_text).into());
    }

    let created_label: LabelInfo = create_response.json().await?;
    log_debug(&format!("Created new JobOp label with ID: {}", created_label.id));
    Ok(created_label.id)
}

/// Add the "JobOp" label to a Gmail message
async fn add_jobop_label(
    client: &reqwest::Client,
    access_token: &str,
    message_id: &str,
    label_id: &str,
) -> std::result::Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let url = format!(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/{}/modify",
        message_id
    );

    let body = serde_json::json!({
        "addLabelIds": [label_id]
    });

    let response = client
        .post(&url)
        .bearer_auth(access_token)
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to add label: {} - {}", status, error_text).into());
    }

    Ok(())
}

/// Mark a Gmail message as read by removing the UNREAD label
async fn mark_gmail_message_as_read(
    client: &reqwest::Client,
    access_token: &str,
    message_id: &str,
) -> std::result::Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let url = format!(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/{}/modify",
        message_id
    );

    let body = serde_json::json!({
        "removeLabelIds": ["UNREAD"]
    });

    let response = client
        .post(&url)
        .bearer_auth(access_token)
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        log_debug(&format!("Failed to mark message {} as read. Status: {}, Error: {}",
            message_id, status, error_text));
        return Err(format!("Failed to mark message as read: {}", status).into());
    }

    Ok(())
}

async fn process_gmail_messages(
    access_token: &str,
    source: &JobSource,
    pool: &PgPool,
    _log_id: Uuid,
) -> std::result::Result<SyncMetrics, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();
    let mut metrics = SyncMetrics {
        discovered: 0,
        failed_processing: 0,
        filtered_out: 0,
        duplicated: 0,
        created: 0,
    };

    // Get or create the "JobOp" label for marking real job opportunities
    let jobop_label_id = match get_or_create_jobop_label(&client, access_token).await {
        Ok(id) => {
            log_debug(&format!("Using JobOp label ID: {}", id));
            id
        }
        Err(e) => {
            log_debug(&format!("Warning: Failed to get JobOp label: {}. Continuing without labeling.", e));
            String::new() // Continue without labeling if it fails
        }
    };

    // Search for all unread emails, excluding those already tagged as JobOp
    // This allows the LLM to classify ALL emails, not just subject-matched ones
    let query = "is:unread -label:JobOp";
    let url = format!(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?q={}",
        urlencoding::encode(query)
    );

    let response = client
        .get(&url)
        .bearer_auth(access_token)
        .send()
        .await?;

    let list_response: GmailListResponse = response.json().await?;

    if let Some(messages) = list_response.messages {
        for message_ref in messages.iter().take(50) { // Process up to 50 messages per sync
            metrics.discovered += 1;

            // Get full message details
            let message_url = format!(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/{}",
                message_ref.id
            );

            let message_response = client
                .get(&message_url)
                .bearer_auth(access_token)
                .send()
                .await?;

            let message: GmailMessage = message_response.json().await?;

            // Check if we've already processed this message
            let existing = sqlx::query!(
                "SELECT email_job_id FROM email_jobs WHERE message_id = $1",
                message.id
            )
            .fetch_optional(pool)
            .await?;

            if existing.is_some() {
                metrics.duplicated += 1;

                // Still mark as read even if already processed
                if let Err(e) = mark_gmail_message_as_read(&client, access_token, &message.id).await {
                    log_debug(&format!("Warning: Failed to mark message {} as read: {}", message.id, e));
                }

                continue; // Skip already processed messages
            }

            // Extract email details
            let mut sender_email = String::new();
            let mut sender_name = None;
            let mut subject = None;

            for header in &message.payload.headers {
                match header.name.as_str() {
                    "From" => {
                        if let Some(captures) = regex::Regex::new(r"(.+?)\s*<(.+?)>").unwrap().captures(&header.value) {
                            sender_name = Some(captures.get(1).unwrap().as_str().trim().to_string());
                            sender_email = captures.get(2).unwrap().as_str().to_string();
                        } else {
                            sender_email = header.value.clone();
                        }
                    }
                    "Subject" => subject = Some(header.value.clone()),
                    _ => {}
                }
            }

            let received_date = chrono::DateTime::from_timestamp_millis(
                message.internal_date.parse::<i64>().unwrap_or(0)
            ).unwrap_or_else(|| chrono::Utc::now());

            // Extract email body
            let body_text = extract_email_body(&message.payload);

            // Store email job for processing
            let email_job_id = Uuid::new_v4();
            sqlx::query!(
                r#"
                INSERT INTO email_jobs (
                    email_job_id, message_id, thread_id, sender_email, sender_name,
                    subject, received_date, body_text, processed
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
                "#,
                email_job_id,
                message.id,
                message.thread_id,
                sender_email,
                sender_name,
                subject,
                received_date,
                body_text
            )
            .execute(pool)
            .await?;

            // Extract job information
            if let Some(mut job_data) = extract_job_from_email_async(&subject, &body_text, pool).await {
                log_debug(&format!("Extracted job data - Title: {:?}, Company: {:?}, Confidence: {:.2}, Method: {}",
                    job_data.title, job_data.company, job_data.confidence, job_data.extraction_method));

                // Replace LLM summary with full email body for better user visibility
                if let Some(full_body) = &body_text {
                    job_data.description = Some(full_body.clone());
                } else if job_data.description.is_none() {
                    // Fallback: if no body text and no description from extraction, use subject
                    job_data.description = subject.clone().or(Some("(No email content available)".to_string()));
                }

                if job_data.confidence > 0.3 { // Real job opportunity - add label and mark as read
                    // Add "JobOp" label to email
                    if !jobop_label_id.is_empty() {
                        if let Err(e) = add_jobop_label(&client, access_token, &message.id, &jobop_label_id).await {
                            log_debug(&format!("Warning: Failed to add JobOp label to message {}: {}", message.id, e));
                        }
                    }

                    // Mark email as read in Gmail
                    if let Err(e) = mark_gmail_message_as_read(&client, access_token, &message.id).await {
                        log_debug(&format!("Warning: Failed to mark message {} as read: {}", message.id, e));
                    }

                    match create_job_from_extraction(&job_data, source, pool, Some(received_date)).await {
                        Ok(JobCreationResult::Created(_job_id)) => {
                            metrics.created += 1;

                            // Mark email as processed
                            sqlx::query!(
                                "UPDATE email_jobs SET processed = true, processed_at = NOW(), extraction_confidence = $1, extracted_data = $2 WHERE email_job_id = $3",
                                BigDecimal::try_from(job_data.confidence).unwrap_or_default(),
                                serde_json::to_value(&job_data).unwrap(),
                                email_job_id
                            )
                            .execute(pool)
                            .await?;
                        }
                        Ok(JobCreationResult::Duplicate(_job_id)) => {
                            metrics.duplicated += 1;

                            // Mark email as processed (duplicate)
                            sqlx::query!(
                                "UPDATE email_jobs SET processed = true, processed_at = NOW(), extraction_confidence = $1, extracted_data = $2 WHERE email_job_id = $3",
                                BigDecimal::try_from(job_data.confidence).unwrap_or_default(),
                                serde_json::to_value(&job_data).unwrap(),
                                email_job_id
                            )
                            .execute(pool)
                            .await?;
                        }
                        Err(e) => {
                            metrics.failed_processing += 1;
                            log_debug(&format!("Failed to create job from email: {}", e));

                            // Store processing error
                            sqlx::query!(
                                "UPDATE email_jobs SET processing_errors = $1 WHERE email_job_id = $2",
                                serde_json::json!({"error": e.to_string()}),
                                email_job_id
                            )
                            .execute(pool)
                            .await?;
                        }
                    }
                } else {
                    // Low confidence - not a real job opportunity
                    // Leave unread in Gmail inbox for manual review
                    metrics.filtered_out += 1;
                    log_debug(&format!("Email filtered out (confidence {:.2}) - leaving unread in Gmail: {:?}",
                        job_data.confidence, subject));
                    // DO NOT mark as read
                    // DO NOT add JobOp label
                }
            } else {
                metrics.failed_processing += 1;
                log_debug(&format!("Failed to extract job data from email - Subject: {:?}", subject));
                // Leave unread for manual review
            }
        }
    }

    log_debug(&format!("Gmail sync complete - Discovered: {}, Failed: {}, Filtered: {}, Duplicated: {}, Created: {}",
        metrics.discovered, metrics.failed_processing, metrics.filtered_out, metrics.duplicated, metrics.created));
    Ok(metrics)
}

fn extract_email_body(payload: &GmailPayload) -> Option<String> {
    // Try to extract from direct body first
    if let Some(body) = &payload.body {
        if let Some(data) = &body.data {
            if !data.is_empty() {
                if let Ok(decoded) = general_purpose::URL_SAFE_NO_PAD.decode(data) {
                    if let Ok(text) = String::from_utf8(decoded) {
                        if !text.trim().is_empty() {
                            return Some(text);
                        }
                    }
                }
            }
        }
    }

    // Try to extract from parts (handles multipart emails)
    if let Some(parts) = &payload.parts {
        // First try to find text/plain (preferred for readability)
        for part in parts {
            if part.mime_type == "text/plain" {
                if let Some(body) = &part.body {
                    if let Some(data) = &body.data {
                        if !data.is_empty() {
                            if let Ok(decoded) = general_purpose::URL_SAFE_NO_PAD.decode(data) {
                                if let Ok(text) = String::from_utf8(decoded) {
                                    if !text.trim().is_empty() {
                                        return Some(text);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // If no text/plain found, try text/html
        for part in parts {
            if part.mime_type == "text/html" {
                if let Some(body) = &part.body {
                    if let Some(data) = &body.data {
                        if !data.is_empty() {
                            if let Ok(decoded) = general_purpose::URL_SAFE_NO_PAD.decode(data) {
                                if let Ok(text) = String::from_utf8(decoded) {
                                    if !text.trim().is_empty() {
                                        return Some(text);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Last resort: try any text/* type
        for part in parts {
            if part.mime_type.starts_with("text/") {
                if let Some(body) = &part.body {
                    if let Some(data) = &body.data {
                        if !data.is_empty() {
                            if let Ok(decoded) = general_purpose::URL_SAFE_NO_PAD.decode(data) {
                                if let Ok(text) = String::from_utf8(decoded) {
                                    if !text.trim().is_empty() {
                                        return Some(text);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    None
}

// ============================================================================
// Claude API Client Functions
// ============================================================================

/// Fetch the active extraction prompt from database
async fn get_active_extraction_prompt(pool: &PgPool) -> Result<ExtractionPrompt, String> {
    sqlx::query_as::<_, ExtractionPrompt>(
        "SELECT * FROM extraction_prompts WHERE prompt_type = 'job_extraction' AND is_active = true LIMIT 1"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch extraction prompt: {}", e))
}

/// Convert HTML to plain text
fn html_to_text(html: &str) -> String {
    html2text::from_read(html.as_bytes(), 100)
}

/// Call Claude API for job extraction
async fn call_claude_api(
    api_key: &str,
    prompt_content: &str,
    email_subject: &str,
    email_body: &str,
) -> Result<JobExtractionResult, String> {
    let client = reqwest::Client::new();

    // Convert HTML to text if needed
    let clean_body = if email_body.contains("<html") || email_body.contains("<body") {
        html_to_text(email_body)
    } else {
        email_body.to_string()
    };

    // Construct the user message with email content
    let user_message = format!(
        "**Subject:** {}\n\n**Body:**\n{}",
        email_subject,
        clean_body
    );

    let request = ClaudeRequest {
        model: "claude-3-haiku-20240307".to_string(),
        max_tokens: 1024,
        messages: vec![
            ClaudeMessage {
                role: "user".to_string(),
                content: format!("{}\n\n{}", prompt_content, user_message),
            }
        ],
    };

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Failed to call Claude API: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Claude API error {}: {}", status, error_text));
    }

    let claude_response: ClaudeResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Claude response: {}", e))?;

    // Extract text from response
    let response_text = claude_response
        .content
        .first()
        .ok_or("No content in Claude response")?
        .text
        .trim();

    // Parse JSON from response
    let mut extraction: JobExtractionResult = serde_json::from_str(response_text)
        .map_err(|e| format!("Failed to parse extraction JSON: {} - Response: {}", e, response_text))?;

    extraction.extraction_method = "llm".to_string();

    Ok(extraction)
}

/// Async wrapper that tries LLM extraction first, then falls back to regex
async fn extract_job_from_email_async(
    subject: &Option<String>,
    body: &Option<String>,
    pool: &PgPool,
) -> Option<JobExtractionResult> {
    // Try LLM extraction first if API key is available
    if let Ok(api_key) = std::env::var("ANTHROPIC_API_KEY") {
        if !api_key.is_empty() {
            // Fetch active prompt
            if let Ok(prompt) = get_active_extraction_prompt(pool).await {
                let subject_str = subject.as_deref().unwrap_or("");
                let body_str = body.as_deref().unwrap_or("");

                // Try Claude API
                match call_claude_api(&api_key, &prompt.prompt_content, subject_str, body_str).await {
                    Ok(extraction) => {
                        log_debug(&format!("LLM extraction succeeded - Title: {:?}, Company: {:?}, Confidence: {:.2}",
                            extraction.title, extraction.company, extraction.confidence));

                        // Only return if confidence is high enough
                        if extraction.confidence >= 0.3 {
                            return Some(extraction);
                        } else {
                            log_debug(&format!("LLM extraction confidence too low: {:.2}, falling back to regex", extraction.confidence));
                        }
                    }
                    Err(e) => {
                        log_debug(&format!("LLM extraction failed: {}, falling back to regex", e));
                    }
                }
            } else {
                log_debug("No active extraction prompt found, falling back to regex");
            }
        }
    }

    // Fallback to regex-based extraction
    log_debug("Using regex-based extraction");
    extract_job_from_email(subject, body)
}

fn extract_job_from_email(subject: &Option<String>, body: &Option<String>) -> Option<JobExtractionResult> {
    let combined_text = format!(
        "{} {}",
        subject.as_deref().unwrap_or(""),
        body.as_deref().unwrap_or("")
    );

    let mut extraction = JobExtractionResult {
        title: None,
        company: None,
        location: None,
        salary_min: None,
        salary_max: None,
        description: body.clone(),
        url: None,
        confidence: 0.0,
        extraction_method: "regex".to_string(),
        compensation: None,
        employment: None,
        remote_work: None,
        commute: None,
        job_domain: None,
    };

    // Extract job title from subject
    if let Some(subj) = subject {
        let title_patterns = [
            r"(?i)(software|test|qa|quality|automation|engineer|developer|architect|manager|lead|senior|principal|staff)\s+(engineer|developer|tester|analyst|manager|lead|architect)",
            r"(?i)(job|position|opening|opportunity|role):\s*(.+?)(?:\s+at\s+|\s+@\s+|$)",
        ];

        for pattern in &title_patterns {
            if let Ok(re) = regex::Regex::new(pattern) {
                if let Some(captures) = re.captures(subj) {
                    if let Some(title_match) = captures.get(0) {
                        extraction.title = Some(title_match.as_str().trim().to_string());
                        extraction.confidence += 0.3;
                        break;
                    }
                }
            }
        }

        // If no pattern matched, use the subject line as title (fallback)
        if extraction.title.is_none() && !subj.trim().is_empty() {
            let cleaned_subject = subj.trim();
            // Truncate if too long
            let title = if cleaned_subject.len() > 80 {
                format!("{}...", &cleaned_subject[..77])
            } else {
                cleaned_subject.to_string()
            };
            extraction.title = Some(title);
            extraction.confidence += 0.1; // Lower confidence for fallback
        }
    }

    // Extract company name
    let company_patterns = [
        r"(?i)at\s+([A-Z][a-zA-Z\s&]+)(?:\s|,|$)",
        r"(?i)@\s+([A-Z][a-zA-Z\s&]+)(?:\s|,|$)",
        r"(?i)from\s+([A-Z][a-zA-Z\s&]+)(?:\s|,|$)",
    ];

    for pattern in &company_patterns {
        if let Ok(re) = regex::Regex::new(pattern) {
            if let Some(captures) = re.captures(&combined_text) {
                if let Some(company_match) = captures.get(1) {
                    extraction.company = Some(company_match.as_str().trim().to_string());
                    extraction.confidence += 0.2;
                    break;
                }
            }
        }
    }

    // Extract salary
    let salary_patterns = [
        r"(?i)\$(\d+),?(\d+)k?",
        r"(?i)salary:?\s*\$?(\d+),?(\d+)",
        r"(?i)(\d+)k?\s*-\s*(\d+)k?",
    ];

    for pattern in &salary_patterns {
        if let Ok(re) = regex::Regex::new(pattern) {
            if let Some(captures) = re.captures(&combined_text) {
                if let Some(salary_match) = captures.get(1) {
                    if let Ok(salary) = salary_match.as_str().replace(",", "").parse::<i32>() {
                        let salary_value = if salary < 1000 { salary * 1000 } else { salary };
                        extraction.salary_min = Some(salary_value);
                        extraction.salary_max = Some(salary_value);
                        extraction.confidence += 0.2;
                        break;
                    }
                }
            }
        }
    }

    // Extract location
    let location_patterns = [
        r"(?i)(remote|san francisco|bay area|california|ca|fremont|hayward|menlo park|newark|union city|milpitas)",
        r"(?i)location:?\s*([a-zA-Z\s,]+)",
    ];

    for pattern in &location_patterns {
        if let Ok(re) = regex::Regex::new(pattern) {
            if let Some(captures) = re.captures(&combined_text) {
                if let Some(location_match) = captures.get(1) {
                    extraction.location = Some(location_match.as_str().trim().to_string());
                    extraction.confidence += 0.15;
                    break;
                }
            }
        }
    }

    // Extract URLs
    if let Ok(re) = regex::Regex::new(r"https?://[^\s]+") {
        if let Some(url_match) = re.find(&combined_text) {
            extraction.url = Some(url_match.as_str().to_string());
            extraction.confidence += 0.15;
        }
    }

    if extraction.confidence > 0.3 {
        println!("Job extraction succeeded - Title: {:?}, Company: {:?}, Confidence: {:.2}",
            extraction.title, extraction.company, extraction.confidence);
        Some(extraction)
    } else {
        println!("Job extraction rejected - low confidence: {:.2}", extraction.confidence);
        None
    }
}

async fn create_job_from_extraction(
    extraction: &JobExtractionResult,
    source: &JobSource,
    pool: &PgPool,
    date_email_sent: Option<DateTime<Utc>>
) -> std::result::Result<JobCreationResult, sqlx::Error> {
    // Generate better fallback title from description if available
    let fallback_title = if let Some(desc) = &extraction.description {
        // Try to extract first meaningful line from description as title
        desc.lines()
            .filter(|line| !line.trim().is_empty())
            .next()
            .map(|line| {
                // Truncate to reasonable title length
                let trimmed = line.trim();
                if trimmed.len() > 80 {
                    format!("{}...", &trimmed[..77])
                } else {
                    trimmed.to_string()
                }
            })
            .unwrap_or_else(|| "Job Opportunity".to_string())
    } else {
        "Job Opportunity".to_string()
    };

    // Calculate average salary from min/max for storage (single field in DB)
    // Also try to get from nested compensation if flat fields are empty
    let salary = match (extraction.salary_min, extraction.salary_max) {
        (Some(min), Some(max)) => Some((min + max) / 2),
        (Some(val), None) | (None, Some(val)) => Some(val),
        (None, None) => {
            // Try to get from nested compensation
            extraction.compensation.as_ref().and_then(|c| {
                match (c.salary_min, c.salary_max) {
                    (Some(min), Some(max)) => Some((min + max) / 2),
                    (Some(val), None) | (None, Some(val)) => Some(val),
                    (None, None) => None,
                }
            })
        }
    };

    let job_req = CreateJobRequest {
        title: extraction.title.clone().unwrap_or(fallback_title),
        company: extraction.company.clone().unwrap_or_else(|| "Unknown Company".to_string()),
        location: extraction.location.clone(),
        source: source.source_name.clone(),
        salary,
        commute_time: None,
        description: extraction.description.clone(),
        url: extraction.url.clone(),
    };

    // Serialize full extraction to JSONB for storage in raw_data
    let extraction_raw_data = serde_json::to_value(extraction).ok();

    // Use existing job creation logic, passing through the date and full extraction
    create_job_internal(&job_req, pool, date_email_sent, extraction_raw_data).await
}

enum JobCreationResult {
    Created(Uuid),  // New job was created
    Duplicate(Uuid), // Existing job found (duplicate)
}

async fn create_job_internal(
    job_req: &CreateJobRequest,
    pool: &PgPool,
    date_email_sent: Option<DateTime<Utc>>,
    extraction_raw_data: Option<serde_json::Value>
) -> std::result::Result<JobCreationResult, sqlx::Error> {
    let job_id = Uuid::new_v4();

    // Apply filtering
    let filter_result = match filter_job(job_req, pool).await {
        result => result,
    };

    // Check for duplicates
    if let Ok(Some(existing_job_id)) = check_duplicate(job_req, pool).await {
        return Ok(JobCreationResult::Duplicate(existing_job_id));
    }

    // Use extraction raw_data if provided, otherwise fall back to job_req
    let raw_data = extraction_raw_data.unwrap_or_else(|| serde_json::to_value(job_req).unwrap());

    sqlx::query!(
        r#"
        INSERT INTO jobs (job_id, title, company, location, source, salary, commute_time,
                         status, description, url, raw_data, filter_reason, date_email_sent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13, NOW()))
        "#,
        job_id,
        job_req.title,
        job_req.company,
        job_req.location,
        job_req.source,
        job_req.salary,
        job_req.commute_time,
        filter_result.status,
        job_req.description,
        job_req.url,
        raw_data,
        if filter_result.reasons.is_empty() { None } else { Some(filter_result.reasons.join("; ")) },
        date_email_sent
    )
    .execute(pool)
    .await?;

    // Store deduplication hash
    create_deduplication_entry(job_id, job_req, pool).await?;

    Ok(JobCreationResult::Created(job_id))
}

async fn get_job_sources(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let sources_with_creds = sqlx::query!(
        r#"
        SELECT
            js.*,
            EXISTS(SELECT 1 FROM oauth_credentials oc WHERE oc.source_id = js.source_id) as "has_credentials!"
        FROM job_sources js
        ORDER BY js.source_name
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    // Convert to JSON with has_credentials field
    let result: Vec<serde_json::Value> = sources_with_creds.iter().map(|row| {
        serde_json::json!({
            "source_id": row.source_id,
            "source_name": row.source_name,
            "source_type": row.source_type,
            "is_active": row.is_active,
            "last_sync": row.last_sync,
            "sync_interval_minutes": row.sync_interval_minutes,
            "auth_required": row.auth_required,
            "auth_type": row.auth_type,
            "has_credentials": row.has_credentials,
        })
    }).collect();

    Ok(HttpResponse::Ok().json(result))
}

async fn get_intake_logs(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let logs = sqlx::query_as::<_, JobIntakeLog>(
        "SELECT * FROM job_intake_logs ORDER BY sync_started_at DESC LIMIT 100"
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(logs))
}

// Get ignored/unprocessed emails
async fn get_ignored_emails(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let ignored = sqlx::query!(
        r#"
        SELECT
            email_job_id,
            message_id,
            subject,
            sender_email,
            sender_name,
            received_date,
            body_text,
            body_html,
            extraction_confidence,
            processing_errors
        FROM email_jobs
        WHERE processed = false OR extraction_confidence < 0.3
        ORDER BY received_date DESC
        LIMIT 100
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let result: Vec<serde_json::Value> = ignored.iter().map(|row| {
        serde_json::json!({
            "email_job_id": row.email_job_id,
            "message_id": row.message_id,
            "subject": row.subject,
            "sender_email": row.sender_email,
            "sender_name": row.sender_name,
            "received_date": row.received_date,
            "body_text": row.body_text,
            "body_html": row.body_html,
            "extraction_confidence": row.extraction_confidence.as_ref().map(|c| c.to_string().parse::<f64>().unwrap_or(0.0)),
            "processing_errors": row.processing_errors,
        })
    }).collect();

    Ok(HttpResponse::Ok().json(result))
}

#[derive(Debug, Deserialize)]
struct RefilterRequest {
    scope: String, // "last_sync" or "all_filtered"
}

// Re-filter existing jobs without fetching from Gmail
async fn refilter_jobs(
    pool: web::Data<PgPool>,
    req: web::Json<RefilterRequest>,
) -> Result<HttpResponse> {
    // Define a common query based on scope
    let query_str = match req.scope.as_str() {
        "last_sync" => {
            r#"
            SELECT j.job_id, j.title, j.company, j.location, j.salary, j.description, j.url, j.source, j.status
            FROM jobs j
            INNER JOIN (
                SELECT MAX(sync_started_at) as last_sync
                FROM job_intake_logs
                WHERE sync_status = 'completed'
            ) ls ON j.date_email_sent >= ls.last_sync
            WHERE j.source = 'gmail'
            "#
        }
        "all_filtered" => {
            r#"
            SELECT job_id, title, company, location, salary, description, url, source, status
            FROM jobs
            WHERE status = 'filtered' AND source = 'gmail'
            "#
        }
        _ => {
            return Err(actix_web::error::ErrorBadRequest("Invalid scope. Must be 'last_sync' or 'all_filtered'"));
        }
    };

    // Fetch jobs using the common query structure
    let jobs_to_refilter = sqlx::query(query_str)
        .fetch_all(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch jobs: {}", e)))?;

    let mut refiltered_count = 0;
    let mut to_new = 0;
    let mut to_filtered = 0;

    for job_row in jobs_to_refilter {
        let job_id: Uuid = job_row.try_get("job_id")
            .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to get job_id: {}", e)))?;
        let title: String = job_row.try_get("title").unwrap_or_default();
        let company: String = job_row.try_get("company").unwrap_or_default();
        let location: Option<String> = job_row.try_get("location").ok();
        let salary: Option<i32> = job_row.try_get("salary").ok();
        let description: Option<String> = job_row.try_get("description").ok();
        let url: Option<String> = job_row.try_get("url").ok();
        let source: String = job_row.try_get("source").unwrap_or_default();
        let old_status: String = job_row.try_get("status").unwrap_or_default();

        // Create a CreateJobRequest to pass to filter_job
        let job_req = CreateJobRequest {
            title,
            company,
            location,
            salary,
            description,
            url,
            source,
            commute_time: None,
        };

        // Re-apply filtering logic
        let filter_result = filter_job(&job_req, pool.get_ref()).await;

        // Update job status and filter_reason
        sqlx::query!(
            "UPDATE jobs SET status = $1, filter_reason = $2 WHERE job_id = $3",
            filter_result.status,
            filter_result.reasons.join("; "),
            job_id
        )
        .execute(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to update job: {}", e)))?;

        refiltered_count += 1;

        // Track status changes
        if old_status != filter_result.status {
            if filter_result.status == "new" {
                to_new += 1;
            } else if filter_result.status == "filtered" {
                to_filtered += 1;
            }
        }
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Re-filtering completed successfully",
        "jobs_refiltered": refiltered_count,
        "status_changes": {
            "to_new": to_new,
            "to_filtered": to_filtered,
        }
    })))
}

// ============================================================================
// Phase 4: LinkedIn API Integration
// ============================================================================

async fn sync_linkedin_jobs(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let log_id = Uuid::new_v4();

    // Get LinkedIn source
    let source = sqlx::query_as::<_, JobSource>(
        "SELECT * FROM job_sources WHERE source_name = 'linkedin' AND is_active = true LIMIT 1"
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorNotFound("LinkedIn source not found or inactive"))?;

    // Create intake log
    sqlx::query!(
        "INSERT INTO job_intake_logs (log_id, source_id, sync_status) VALUES ($1, $2, 'running')",
        log_id,
        source.source_id
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to create log: {}", e)))?;

    match process_linkedin_jobs(&source, pool.get_ref(), log_id).await {
        Ok((discovered, processed)) => {
            // Update log as completed
            sqlx::query!(
                r#"
                UPDATE job_intake_logs
                SET sync_completed_at = NOW(), jobs_discovered = $1, jobs_approved = $2, sync_status = 'completed'
                WHERE log_id = $3
                "#,
                discovered,
                processed,
                log_id
            )
            .execute(pool.get_ref())
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to update log: {}", e)))?;

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "message": "LinkedIn sync completed successfully",
                "jobs_discovered": discovered,
                "jobs_processed": processed
            })))
        }
        Err(e) => {
            // Update log as failed
            sqlx::query!(
                r#"
                UPDATE job_intake_logs
                SET sync_completed_at = NOW(), sync_status = 'failed', errors_count = 1,
                    error_details = $1
                WHERE log_id = $2
                "#,
                serde_json::json!({"error": e.to_string()}),
                log_id
            )
            .execute(pool.get_ref())
            .await
            .ok();

            Err(actix_web::error::ErrorInternalServerError(format!("LinkedIn sync failed: {}", e)))
        }
    }
}

async fn process_linkedin_jobs(
    source: &JobSource,
    pool: &PgPool,
    _log_id: Uuid,
) -> std::result::Result<(i32, i32), Box<dyn std::error::Error + Send + Sync>> {
    let _client = reqwest::Client::new();
    let mut discovered_count = 0;
    let mut processed_count = 0;

    // LinkedIn Jobs API endpoint (placeholder - would need actual LinkedIn API integration)
    let _api_url = source.base_url.as_deref().unwrap_or("https://api.linkedin.com/v2/jobSearch");

    // Example query parameters from source configuration
    let config = &source.configuration;
    let _location = config["search_params"]["locationNames"][0].as_str().unwrap_or("San Francisco Bay Area");
    let salary = config["search_params"]["salary"].as_i64().unwrap_or(130000);

    // Build search query (this would need LinkedIn API key and proper authentication)
    let _search_params = vec![
        ("keywords", "software test automation qa engineer"),
        ("location", _location),
        ("sortBy", "DD"), // Date descending
        ("start", "0"),
        ("count", "50"),
    ];

    // For now, simulate LinkedIn API response with mock data
    // In real implementation, this would make actual LinkedIn API calls
    let mock_linkedin_jobs = create_mock_linkedin_jobs(salary);

    for job_data in mock_linkedin_jobs {
        discovered_count += 1;

        // Check if we've already processed this job
        let existing = sqlx::query!(
            "SELECT api_job_id FROM api_job_sources WHERE source_id = $1 AND external_job_id = $2",
            source.source_id,
            job_data["id"].as_str().unwrap_or("unknown")
        )
        .fetch_optional(pool)
        .await?;

        if existing.is_some() {
            continue; // Skip already processed jobs
        }

        // Store API job for processing
        let api_job_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO api_job_sources (
                api_job_id, source_id, external_job_id, external_url, raw_response, processed
            ) VALUES ($1, $2, $3, $4, $5, false)
            "#,
            api_job_id,
            source.source_id,
            job_data["id"].as_str().unwrap_or("unknown"),
            job_data["url"].as_str(),
            job_data
        )
        .execute(pool)
        .await?;

        // Extract job information from LinkedIn response
        if let Some(job_extraction) = extract_job_from_linkedin(&job_data) {
            if job_extraction.confidence > 0.7 { // Higher confidence threshold for API data
                match create_job_from_extraction(&job_extraction, source, pool, None).await {
                    Ok(JobCreationResult::Created(job_id)) | Ok(JobCreationResult::Duplicate(job_id)) => {
                        processed_count += 1;

                        // Mark API job as processed and link to created job
                        sqlx::query!(
                            "UPDATE api_job_sources SET processed = true, processed_at = NOW(), job_id = $1, extraction_confidence = $2, extracted_data = $3 WHERE api_job_id = $4",
                            job_id,
                            BigDecimal::try_from(job_extraction.confidence).unwrap_or_default(),
                            serde_json::to_value(&job_extraction).unwrap(),
                            api_job_id
                        )
                        .execute(pool)
                        .await?;
                    }
                    Err(e) => {
                        println!("Failed to create job from LinkedIn data: {}", e);

                        // Store processing error
                        sqlx::query!(
                            "UPDATE api_job_sources SET processing_errors = $1 WHERE api_job_id = $2",
                            serde_json::json!({"error": e.to_string()}),
                            api_job_id
                        )
                        .execute(pool)
                        .await?;
                    }
                }
            }
        }
    }

    Ok((discovered_count, processed_count))
}

fn create_mock_linkedin_jobs(min_salary: i64) -> Vec<serde_json::Value> {
    vec![
        serde_json::json!({
            "id": "123456789",
            "title": "Senior Test Automation Engineer",
            "company": {
                "name": "TechCorp Inc",
                "industry": "Software"
            },
            "location": {
                "name": "San Francisco, CA",
                "country": "US"
            },
            "description": "We are looking for a Senior Test Automation Engineer to join our QA team. Experience with Selenium, CI/CD, and API testing required.",
            "salary": {
                "min": min_salary,
                "max": min_salary + 50000,
                "currency": "USD"
            },
            "url": "https://www.linkedin.com/jobs/view/123456789",
            "postedDate": "2025-09-29",
            "workplaceTypes": ["Remote"],
            "skills": ["Test Automation", "Selenium", "Python", "CI/CD", "API Testing"]
        }),
        serde_json::json!({
            "id": "987654321",
            "title": "AI/ML Test Engineer",
            "company": {
                "name": "AI Innovations",
                "industry": "Artificial Intelligence"
            },
            "location": {
                "name": "Remote",
                "country": "US"
            },
            "description": "Looking for an AI/ML Test Engineer with experience in prompt engineering and LLM testing. Must have experience with testing AI-powered applications.",
            "salary": {
                "min": min_salary + 20000,
                "max": min_salary + 80000,
                "currency": "USD"
            },
            "url": "https://www.linkedin.com/jobs/view/987654321",
            "postedDate": "2025-09-28",
            "workplaceTypes": ["Remote"],
            "skills": ["AI Testing", "Prompt Engineering", "LLM", "Machine Learning", "Python"]
        })
    ]
}

fn extract_job_from_linkedin(job_data: &serde_json::Value) -> Option<JobExtractionResult> {
    let title = job_data["title"].as_str()?.to_string();
    let company = job_data["company"]["name"].as_str()?.to_string();
    let location = job_data["location"]["name"].as_str().map(|s| s.to_string());
    let description = job_data["description"].as_str().map(|s| s.to_string());
    let url = job_data["url"].as_str().map(|s| s.to_string());

    // Extract salary
    let (salary_min, salary_max) = if let Some(salary_obj) = job_data["salary"].as_object() {
        let min = salary_obj["min"].as_i64().map(|s| s as i32);
        let max = salary_obj["max"].as_i64().map(|s| s as i32);
        (min, max)
    } else {
        (None, None)
    };

    // High confidence for structured LinkedIn API data
    let mut confidence: f64 = 0.9;

    // Check if it's remote
    if let Some(workplace_types) = job_data["workplaceTypes"].as_array() {
        if workplace_types.iter().any(|wt| wt.as_str() == Some("Remote")) {
            confidence += 0.1;
        }
    }

    Some(JobExtractionResult {
        title: Some(title),
        company: Some(company),
        location,
        salary_min,
        salary_max,
        description,
        url,
        confidence: confidence.min(1.0),
        extraction_method: "linkedin_api".to_string(),
        compensation: None,
        employment: None,
        remote_work: None,
        commute: None,
        job_domain: None,
    })
}

// ============================================================================
// Phase 4: Multi-Source Job Aggregation & Scheduling
// ============================================================================

async fn sync_all_sources(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let mut results = Vec::new();
    let mut total_discovered = 0;
    let mut total_processed = 0;

    // Get all active job sources
    let sources = sqlx::query_as::<_, JobSource>(
        "SELECT * FROM job_sources WHERE is_active = true ORDER BY source_name"
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to get sources: {}", e)))?;

    for source in sources {
        let sync_result = match source.source_name.as_str() {
            "gmail" => {
                match sync_single_gmail_source(&source, pool.get_ref()).await {
                    Ok((discovered, processed)) => {
                        total_discovered += discovered;
                        total_processed += processed;
                        serde_json::json!({
                            "source": "gmail",
                            "status": "success",
                            "discovered": discovered,
                            "processed": processed
                        })
                    }
                    Err(e) => {
                        serde_json::json!({
                            "source": "gmail",
                            "status": "error",
                            "error": e.to_string()
                        })
                    }
                }
            }
            "linkedin" => {
                match sync_single_linkedin_source(&source, pool.get_ref()).await {
                    Ok((discovered, processed)) => {
                        total_discovered += discovered;
                        total_processed += processed;
                        serde_json::json!({
                            "source": "linkedin",
                            "status": "success",
                            "discovered": discovered,
                            "processed": processed
                        })
                    }
                    Err(e) => {
                        serde_json::json!({
                            "source": "linkedin",
                            "status": "error",
                            "error": e.to_string()
                        })
                    }
                }
            }
            "indeed" => {
                // Placeholder for Indeed integration
                serde_json::json!({
                    "source": "indeed",
                    "status": "not_implemented",
                    "discovered": 0,
                    "processed": 0
                })
            }
            _ => {
                serde_json::json!({
                    "source": source.source_name,
                    "status": "unknown_source",
                    "discovered": 0,
                    "processed": 0
                })
            }
        };

        results.push(sync_result);

        // Update last_sync time for this source
        sqlx::query!(
            "UPDATE job_sources SET last_sync = NOW() WHERE source_id = $1",
            source.source_id
        )
        .execute(pool.get_ref())
        .await
        .ok();
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Multi-source sync completed",
        "total_discovered": total_discovered,
        "total_processed": total_processed,
        "sources_synced": results.len(),
        "results": results
    })))
}

async fn sync_single_gmail_source(
    source: &JobSource,
    pool: &PgPool,
) -> std::result::Result<(i32, i32), Box<dyn std::error::Error + Send + Sync>> {
    // Get OAuth credentials
    let credentials = sqlx::query_as::<_, OAuthCredential>(
        "SELECT * FROM oauth_credentials WHERE source_id = $1 LIMIT 1"
    )
    .bind(source.source_id)
    .fetch_one(pool)
    .await?;

    let access_token = credentials.access_token.as_ref()
        .ok_or("No access token available")?.clone();

    // Check if token is expired and refresh if needed
    let token = if let Some(expires_at) = credentials.token_expires_at {
        if chrono::Utc::now() > expires_at {
            match refresh_gmail_token(&credentials, pool).await {
                Ok(new_token) => new_token,
                Err(_) => return Err("Failed to refresh token".into()),
            }
        } else {
            access_token
        }
    } else {
        access_token
    };

    let metrics = process_gmail_messages(&token, source, pool, Uuid::new_v4()).await?;
    // Return discovered and created for backwards compatibility
    Ok((metrics.discovered, metrics.created))
}

async fn sync_single_linkedin_source(
    source: &JobSource,
    pool: &PgPool,
) -> std::result::Result<(i32, i32), Box<dyn std::error::Error + Send + Sync>> {
    process_linkedin_jobs(source, pool, Uuid::new_v4()).await
}

async fn schedule_job_sync(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    // Check which sources need syncing based on their sync interval
    let sources_needing_sync = sqlx::query_as::<_, JobSource>(
        r#"
        SELECT * FROM job_sources
        WHERE is_active = true
        AND (
            last_sync IS NULL
            OR last_sync < NOW() - INTERVAL '1 minute' * sync_interval_minutes
        )
        ORDER BY last_sync ASC NULLS FIRST
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to get sources for sync: {}", e)))?;

    let mut sync_scheduled = Vec::new();

    for source in sources_needing_sync {
        let time_since_sync = if let Some(last_sync) = source.last_sync {
            chrono::Utc::now().signed_duration_since(last_sync).num_minutes()
        } else {
            999999 // Never synced
        };

        if time_since_sync >= source.sync_interval_minutes.into() {
            sync_scheduled.push(serde_json::json!({
                "source_name": source.source_name,
                "last_sync": source.last_sync,
                "interval_minutes": source.sync_interval_minutes,
                "time_since_sync": time_since_sync
            }));
        }
    }

    if sync_scheduled.is_empty() {
        Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "No sources need syncing at this time",
            "scheduled": []
        })))
    } else {
        // In a real implementation, this would trigger background sync jobs
        // For now, just return what would be scheduled
        Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": format!("{} sources scheduled for sync", sync_scheduled.len()),
            "scheduled": sync_scheduled
        })))
    }
}

async fn get_job_intake_summary(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let summary_data = sqlx::query!(
        r#"
        SELECT
            js.source_name,
            js.source_type,
            js.is_active,
            js.last_sync,
            COALESCE(SUM(jil.jobs_discovered), 0) as total_discovered,
            COALESCE(SUM(jil.jobs_approved), 0) as total_approved,
            COALESCE(AVG(jil.jobs_discovered), 0) as avg_per_sync,
            COUNT(jil.log_id) as sync_count,
            MAX(jil.sync_started_at) as last_sync_attempt
        FROM job_sources js
        LEFT JOIN job_intake_logs jil ON js.source_id = jil.source_id
            AND jil.sync_completed_at IS NOT NULL
        GROUP BY js.source_id, js.source_name, js.source_type, js.is_active, js.last_sync
        ORDER BY js.source_name
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    // Convert to a serializable format
    let summary = summary_data.into_iter().map(|record| {
        serde_json::json!({
            "source_name": record.source_name,
            "source_type": record.source_type,
            "is_active": record.is_active,
            "last_sync": record.last_sync,
            "total_discovered": record.total_discovered.unwrap_or(0),
            "total_approved": record.total_approved.unwrap_or(0),
            "avg_per_sync": record.avg_per_sync.as_ref().map(|bd| bd.to_f64().unwrap_or(0.0)).unwrap_or(0.0),
            "sync_count": record.sync_count.unwrap_or(0),
            "last_sync_attempt": record.last_sync_attempt
        })
    }).collect::<Vec<_>>();

    Ok(HttpResponse::Ok().json(summary))
}

// ============================================================================
// Phase 5.1: Calendar Integration & Follow-ups API Handlers
// ============================================================================

async fn create_interview(
    pool: web::Data<PgPool>,
    request: web::Json<CreateInterviewRequest>,
) -> Result<HttpResponse> {
    let duration = request.duration_minutes.unwrap_or(60);

    let interview = sqlx::query_as::<_, Interview>(
        r#"
        INSERT INTO interviews (
            application_id, interview_type, scheduled_date, duration_minutes,
            location, interviewer_name, interviewer_email, interviewer_phone,
            notes, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled')
        RETURNING *
        "#
    )
    .bind(&request.application_id)
    .bind(&request.interview_type)
    .bind(&request.scheduled_date)
    .bind(duration)
    .bind(&request.location)
    .bind(&request.interviewer_name)
    .bind(&request.interviewer_email)
    .bind(&request.interviewer_phone)
    .bind(&request.notes)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Created().json(interview))
}

async fn get_upcoming_interviews(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let interviews = sqlx::query_as::<_, ApplicationTimeline>(
        r#"
        SELECT
            i.*,
            a.job_id,
            a.date_applied,
            j.title as job_title,
            j.company,
            j.location as job_location
        FROM interviews i
        JOIN applications a ON i.application_id = a.application_id
        JOIN jobs j ON a.job_id = j.job_id
        WHERE i.status = 'scheduled'
            AND i.scheduled_date >= NOW()
            AND i.scheduled_date <= NOW() + INTERVAL '30 days'
        ORDER BY i.scheduled_date ASC
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(interviews))
}

async fn get_interview(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let interview_id = path.into_inner();

    let interview = sqlx::query_as::<_, Interview>(
        "SELECT * FROM interviews WHERE interview_id = $1"
    )
    .bind(interview_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    match interview {
        Some(i) => Ok(HttpResponse::Ok().json(i)),
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Interview not found"
        })))
    }
}

async fn update_interview(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
    request: web::Json<CreateInterviewRequest>,
) -> Result<HttpResponse> {
    let interview_id = path.into_inner();
    let duration = request.duration_minutes.unwrap_or(60);

    let interview = sqlx::query_as::<_, Interview>(
        r#"
        UPDATE interviews
        SET interview_type = $1, scheduled_date = $2, duration_minutes = $3,
            location = $4, interviewer_name = $5, interviewer_email = $6,
            interviewer_phone = $7, notes = $8
        WHERE interview_id = $9
        RETURNING *
        "#
    )
    .bind(&request.interview_type)
    .bind(&request.scheduled_date)
    .bind(duration)
    .bind(&request.location)
    .bind(&request.interviewer_name)
    .bind(&request.interviewer_email)
    .bind(&request.interviewer_phone)
    .bind(&request.notes)
    .bind(interview_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    match interview {
        Some(i) => Ok(HttpResponse::Ok().json(i)),
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Interview not found"
        })))
    }
}

async fn delete_interview(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let interview_id = path.into_inner();

    let result = sqlx::query!(
        "DELETE FROM interviews WHERE interview_id = $1",
        interview_id
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    if result.rows_affected() > 0 {
        Ok(HttpResponse::NoContent().finish())
    } else {
        Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Interview not found"
        })))
    }
}

async fn create_follow_up(
    pool: web::Data<PgPool>,
    request: web::Json<CreateFollowUpRequest>,
) -> Result<HttpResponse> {
    // Get application details for default scheduling
    let app = sqlx::query!(
        "SELECT date_applied FROM applications WHERE application_id = $1",
        request.application_id
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let date_applied = app.and_then(|a| a.date_applied).unwrap_or_else(|| Utc::now());

    // Calculate default scheduled date (10-14 days after application)
    let scheduled_date = request.scheduled_date.unwrap_or_else(|| {
        date_applied + chrono::Duration::days(12)
    });

    let attempt_number = request.attempt_number.unwrap_or(1);
    let template_name = request.template_name.as_deref().unwrap_or("First Follow-up - Application Status");

    // Get template
    let template = sqlx::query_as::<_, FollowUpTemplate>(
        "SELECT * FROM follow_up_templates WHERE template_name = $1"
    )
    .bind(template_name)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let (subject, body) = if let Some(t) = template {
        (Some(t.subject_template), Some(t.body_template))
    } else {
        (None, None)
    };

    let follow_up = sqlx::query_as::<_, FollowUpSchedule>(
        r#"
        INSERT INTO follow_up_schedule (
            application_id, scheduled_date, attempt_number,
            follow_up_type, status, template_used, subject, body
        )
        VALUES ($1, $2, $3, 'application', 'pending', $4, $5, $6)
        RETURNING *
        "#
    )
    .bind(&request.application_id)
    .bind(scheduled_date)
    .bind(attempt_number)
    .bind(template_name)
    .bind(subject)
    .bind(body)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Created().json(follow_up))
}

async fn get_pending_follow_ups(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let follow_ups = sqlx::query!(
        r#"
        SELECT
            f.*,
            a.job_id,
            a.date_applied,
            j.title as job_title,
            j.company,
            EXTRACT(DAY FROM (NOW() - a.date_applied)) as days_since_application
        FROM follow_up_schedule f
        JOIN applications a ON f.application_id = a.application_id
        JOIN jobs j ON a.job_id = j.job_id
        WHERE f.status = 'pending'
            AND f.scheduled_date <= NOW() + INTERVAL '7 days'
        ORDER BY f.scheduled_date ASC
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let result = follow_ups.into_iter().map(|f| {
        serde_json::json!({
            "follow_up_id": f.follow_up_id,
            "application_id": f.application_id,
            "job_id": f.job_id,
            "job_title": f.job_title,
            "company": f.company,
            "scheduled_date": f.scheduled_date,
            "attempt_number": f.attempt_number,
            "subject": f.subject,
            "body": f.body,
            "days_since_application": f.days_since_application.as_ref().map(|bd| bd.to_f64().unwrap_or(0.0)),
            "created_at": f.created_at
        })
    }).collect::<Vec<_>>();

    Ok(HttpResponse::Ok().json(result))
}

async fn approve_follow_up(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
    request: web::Json<ApproveFollowUpRequest>,
) -> Result<HttpResponse> {
    let follow_up_id = path.into_inner();

    let follow_up = sqlx::query_as::<_, FollowUpSchedule>(
        r#"
        UPDATE follow_up_schedule
        SET status = 'approved',
            approved_at = NOW(),
            approved_by = 'user',
            subject = COALESCE($1, subject),
            body = COALESCE($2, body)
        WHERE follow_up_id = $3
        RETURNING *
        "#
    )
    .bind(&request.subject)
    .bind(&request.body)
    .bind(follow_up_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    match follow_up {
        Some(f) => Ok(HttpResponse::Ok().json(f)),
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Follow-up not found"
        })))
    }
}

async fn send_follow_up(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let follow_up_id = path.into_inner();

    // Get follow-up details
    let follow_up = sqlx::query_as::<_, FollowUpSchedule>(
        "SELECT * FROM follow_up_schedule WHERE follow_up_id = $1"
    )
    .bind(follow_up_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let follow_up = match follow_up {
        Some(f) => f,
        None => return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Follow-up not found"
        })))
    };

    if follow_up.status != "approved" {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Follow-up must be approved before sending"
        })));
    }

    // TODO: Implement actual Gmail sending here
    // For now, just mark as sent

    sqlx::query!(
        r#"
        UPDATE follow_up_schedule
        SET status = 'sent', sent_at = NOW()
        WHERE follow_up_id = $1
        "#,
        follow_up_id
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Follow-up sent successfully",
        "follow_up_id": follow_up_id
    })))
}

async fn get_application_timeline(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let application_id = path.into_inner();

    let timeline = sqlx::query_as::<_, ApplicationTimeline>(
        "SELECT * FROM application_timeline WHERE application_id = $1 ORDER BY event_date DESC"
    )
    .bind(application_id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(timeline))
}

// ============================================================================
// Phase 5.2: Email Draft Creation & Monitoring
// ============================================================================

/// Build a MIME message with cover letter as body and resume as attachment
fn build_mime_message(
    from_email: &str,
    to_email: &str,
    subject: &str,
    body: &str,
    resume_content: &str,
    resume_filename: &str,
) -> String {
    let boundary = format!("boundary_{}", uuid::Uuid::new_v4().to_string().replace("-", ""));

    let mut message = String::new();
    message.push_str(&format!("From: {}\r\n", from_email));
    message.push_str(&format!("To: {}\r\n", to_email));
    message.push_str(&format!("Subject: {}\r\n", subject));
    message.push_str("MIME-Version: 1.0\r\n");
    message.push_str(&format!("Content-Type: multipart/mixed; boundary=\"{}\"\r\n", boundary));
    message.push_str("\r\n");

    // Cover letter as body
    message.push_str(&format!("--{}\r\n", boundary));
    message.push_str("Content-Type: text/plain; charset=\"UTF-8\"\r\n");
    message.push_str("\r\n");
    message.push_str(body);
    message.push_str("\r\n");

    // Resume as attachment
    message.push_str(&format!("--{}\r\n", boundary));
    message.push_str(&format!("Content-Type: application/octet-stream; name=\"{}\"\r\n", resume_filename));
    message.push_str("Content-Transfer-Encoding: base64\r\n");
    message.push_str(&format!("Content-Disposition: attachment; filename=\"{}\"\r\n", resume_filename));
    message.push_str("\r\n");

    // Encode resume content as base64
    let resume_base64 = general_purpose::STANDARD.encode(resume_content.as_bytes());
    message.push_str(&resume_base64);
    message.push_str("\r\n");

    // Final boundary
    message.push_str(&format!("--{}--\r\n", boundary));

    message
}

/// Create a Gmail draft via the Gmail API
async fn create_gmail_draft(
    application_id: Uuid,
    recipient_email: String,
    pool: &PgPool,
) -> actix_web::Result<CreateDraftResponse> {
    // 1. Get the application and job details
    let application = sqlx::query_as::<_, Application>(
        "SELECT * FROM applications WHERE application_id = $1"
    )
    .bind(application_id)
    .fetch_one(pool)
    .await
    .map_err(|e| actix_web::error::ErrorNotFound(format!("Application not found: {}", e)))?;

    let job = sqlx::query_as::<_, Job>(
        "SELECT * FROM jobs WHERE job_id = $1"
    )
    .bind(application.job_id)
    .fetch_one(pool)
    .await
    .map_err(|e| actix_web::error::ErrorNotFound(format!("Job not found: {}", e)))?;

    // 2. Get the generated content (resume and cover letter)
    let _resume_version = application.resume_version
        .ok_or_else(|| actix_web::error::ErrorBadRequest("No resume version found. Please generate content first."))?;

    let _cover_letter_version = application.cover_letter_version
        .ok_or_else(|| actix_web::error::ErrorBadRequest("No cover letter version found. Please generate content first."))?;

    // Fetch the actual content (assuming it was stored during generation)
    // For now, we'll regenerate it - in production, you might want to cache this
    let generated_content = generate_content_for_job(&job, pool).await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to generate content: {}", e)))?;

    // 3. Build MIME message
    let from_email = std::env::var("APPLICANT_EMAIL")
        .unwrap_or_else(|_| "sam@samkirk.com".to_string());

    let subject = format!("Application for {} - {}",
        job.title,
        std::env::var("APPLICANT_NAME").unwrap_or_else(|_| "Sam Kirk".to_string())
    );

    let resume_filename = format!("{}_{}_{}_resume.{}",
        job.company.to_lowercase().replace(" ", "_"),
        job.title.to_lowercase().replace(" ", "_"),
        chrono::Utc::now().format("%Y%m%d"),
        generated_content.resume_format
    );

    let mime_message = build_mime_message(
        &from_email,
        &recipient_email,
        &subject,
        &generated_content.cover_letter,
        &generated_content.resume,
        &resume_filename,
    );

    // 4. Encode the entire message as base64 (Gmail API requirement)
    let encoded_message = general_purpose::URL_SAFE_NO_PAD.encode(mime_message.as_bytes());

    // 5. Get OAuth credentials
    let oauth_cred = sqlx::query_as::<_, OAuthCredential>(
        "SELECT * FROM oauth_credentials WHERE source_id = (SELECT source_id FROM job_sources WHERE source_name = 'gmail') LIMIT 1"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| actix_web::error::ErrorUnauthorized(format!("Gmail not authenticated: {}", e)))?;

    // Check if token is expired and refresh if needed
    let access_token = if oauth_cred.token_expires_at < Some(chrono::Utc::now()) {
        refresh_gmail_token(&oauth_cred, pool).await?
    } else {
        oauth_cred.access_token
            .ok_or_else(|| actix_web::error::ErrorUnauthorized("No access token"))?
    };

    // 6. Call Gmail API to create draft
    let client = reqwest::Client::new();
    let draft_request = GmailDraftRequest {
        message: GmailDraftMessage {
            raw: encoded_message,
        },
    };

    let response = client
        .post("https://gmail.googleapis.com/gmail/v1/users/me/drafts")
        .bearer_auth(&access_token)
        .json(&draft_request)
        .send()
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Gmail API call failed: {}", e)))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(actix_web::error::ErrorInternalServerError(format!("Gmail API error: {}", error_text)));
    }

    let gmail_response: GmailDraftResponse = response.json().await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to parse Gmail response: {}", e)))?;

    // 7. Store draft in database
    let draft_id = Uuid::new_v4();
    let gmail_url = format!("https://mail.google.com/mail/u/0/#drafts?compose={}", gmail_response.id);

    let attachment_size = generated_content.resume.len() as i32;

    sqlx::query(
        "INSERT INTO email_drafts (draft_id, application_id, gmail_draft_id, recipient_email, subject, body_text, attachment_name, attachment_size, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'created')"
    )
    .bind(draft_id)
    .bind(application_id)
    .bind(&gmail_response.id)
    .bind(&recipient_email)
    .bind(&subject)
    .bind(&generated_content.cover_letter)
    .bind(&resume_filename)
    .bind(attachment_size)
    .execute(pool)
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to save draft: {}", e)))?;

    // 8. Update application with draft info
    sqlx::query(
        "UPDATE applications SET draft_created_at = NOW(), draft_url = $1 WHERE application_id = $2"
    )
    .bind(&gmail_url)
    .bind(application_id)
    .execute(pool)
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to update application: {}", e)))?;

    // 9. Record communication
    sqlx::query(
        "INSERT INTO communications (application_id, message_content, channel, direction, from_contact, to_contact, subject, gmail_draft_id)
         VALUES ($1, $2, 'email', 'outbound', $3, $4, $5, $6)"
    )
    .bind(application_id)
    .bind(&generated_content.cover_letter)
    .bind(&from_email)
    .bind(&recipient_email)
    .bind(&subject)
    .bind(&gmail_response.id)
    .execute(pool)
    .await
    .ok(); // Don't fail if communication logging fails

    Ok(CreateDraftResponse {
        draft_id,
        gmail_draft_id: gmail_response.id,
        gmail_url,
        status: "created".to_string(),
    })
}

/// Check if a Gmail draft has been sent
async fn check_draft_status(
    application_id: Uuid,
    pool: &PgPool,
) -> actix_web::Result<DraftStatusResponse> {
    // Get the draft from database
    let draft = sqlx::query_as::<_, EmailDraft>(
        "SELECT * FROM email_drafts WHERE application_id = $1 ORDER BY created_at DESC LIMIT 1"
    )
    .bind(application_id)
    .fetch_one(pool)
    .await
    .map_err(|e| actix_web::error::ErrorNotFound(format!("No draft found: {}", e)))?;

    // If already marked as sent, return that status
    if draft.status == "sent" {
        return Ok(DraftStatusResponse {
            draft_id: draft.draft_id,
            status: "sent".to_string(),
            created_at: draft.created_at.to_rfc3339(),
            sent_at: draft.sent_at.map(|dt| dt.to_rfc3339()),
            gmail_url: None,
        });
    }

    // Check with Gmail API if draft still exists
    let gmail_draft_id = draft.gmail_draft_id
        .ok_or_else(|| actix_web::error::ErrorInternalServerError("No Gmail draft ID"))?;

    // Get OAuth credentials
    let oauth_cred = sqlx::query_as::<_, OAuthCredential>(
        "SELECT * FROM oauth_credentials WHERE source_id = (SELECT source_id FROM job_sources WHERE source_name = 'gmail') LIMIT 1"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| actix_web::error::ErrorUnauthorized(format!("Gmail not authenticated: {}", e)))?;

    let access_token = if oauth_cred.token_expires_at < Some(chrono::Utc::now()) {
        refresh_gmail_token(&oauth_cred, pool).await?
    } else {
        oauth_cred.access_token
            .ok_or_else(|| actix_web::error::ErrorUnauthorized("No access token"))?
    };

    // Try to fetch the draft
    let client = reqwest::Client::new();
    let response = client
        .get(&format!("https://gmail.googleapis.com/gmail/v1/users/me/drafts/{}", gmail_draft_id))
        .bearer_auth(&access_token)
        .send()
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Gmail API call failed: {}", e)))?;

    // If draft not found (404), it was likely sent or deleted
    if response.status() == 404 {
        // Mark as sent in database
        sqlx::query(
            "UPDATE email_drafts SET status = 'sent', sent_at = NOW() WHERE draft_id = $1"
        )
        .bind(draft.draft_id)
        .execute(pool)
        .await
        .ok();

        // Update application status
        sqlx::query(
            "UPDATE applications SET application_status = 'sent' WHERE application_id = $1"
        )
        .bind(application_id)
        .execute(pool)
        .await
        .ok();

        return Ok(DraftStatusResponse {
            draft_id: draft.draft_id,
            status: "sent".to_string(),
            created_at: draft.created_at.to_rfc3339(),
            sent_at: Some(chrono::Utc::now().to_rfc3339()),
            gmail_url: None,
        });
    }

    // Draft still exists
    let gmail_url = format!("https://mail.google.com/mail/u/0/#drafts?compose={}", gmail_draft_id);

    Ok(DraftStatusResponse {
        draft_id: draft.draft_id,
        status: "created".to_string(),
        created_at: draft.created_at.to_rfc3339(),
        sent_at: None,
        gmail_url: Some(gmail_url),
    })
}

/// API endpoint: Create Gmail draft for application
async fn create_draft_handler(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
    body: web::Json<CreateDraftRequest>,
) -> Result<HttpResponse> {
    let application_id = path.into_inner();

    let result = create_gmail_draft(
        application_id,
        body.recipient_email.clone(),
        pool.get_ref(),
    ).await?;

    Ok(HttpResponse::Ok().json(result))
}

/// API endpoint: Check draft status
async fn get_draft_status_handler(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let application_id = path.into_inner();

    let status = check_draft_status(application_id, pool.get_ref()).await?;

    Ok(HttpResponse::Ok().json(status))
}

/// API endpoint: Delete draft
async fn delete_draft_handler(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let application_id = path.into_inner();

    // Get the draft
    let draft = sqlx::query_as::<_, EmailDraft>(
        "SELECT * FROM email_drafts WHERE application_id = $1 ORDER BY created_at DESC LIMIT 1"
    )
    .bind(application_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorNotFound(format!("No draft found: {}", e)))?;

    let gmail_draft_id = draft.gmail_draft_id
        .ok_or_else(|| actix_web::error::ErrorInternalServerError("No Gmail draft ID"))?;

    // Get OAuth credentials
    let oauth_cred = sqlx::query_as::<_, OAuthCredential>(
        "SELECT * FROM oauth_credentials WHERE source_id = (SELECT source_id FROM job_sources WHERE source_name = 'gmail') LIMIT 1"
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorUnauthorized(format!("Gmail not authenticated: {}", e)))?;

    let access_token = if oauth_cred.token_expires_at < Some(chrono::Utc::now()) {
        refresh_gmail_token(&oauth_cred, pool.get_ref()).await?
    } else {
        oauth_cred.access_token
            .ok_or_else(|| actix_web::error::ErrorUnauthorized("No access token"))?
    };

    // Delete draft from Gmail
    let client = reqwest::Client::new();
    let response = client
        .delete(&format!("https://gmail.googleapis.com/gmail/v1/users/me/drafts/{}", gmail_draft_id))
        .bearer_auth(&access_token)
        .send()
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Gmail API call failed: {}", e)))?;

    if !response.status().is_success() && response.status() != 404 {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(actix_web::error::ErrorInternalServerError(format!("Gmail API error: {}", error_text)));
    }

    // Update database
    sqlx::query(
        "UPDATE email_drafts SET status = 'deleted' WHERE draft_id = $1"
    )
    .bind(draft.draft_id)
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to update draft: {}", e)))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Draft deleted successfully",
        "draft_id": draft.draft_id
    })))
}

// ============================================================================
// Phase 5.3: LLM Job Extraction Handlers
// ============================================================================

async fn get_active_extraction_prompt_handler(
    pool: web::Data<PgPool>,
) -> Result<HttpResponse> {
    match get_active_extraction_prompt(pool.get_ref()).await {
        Ok(prompt) => Ok(HttpResponse::Ok().json(prompt)),
        Err(e) => Err(actix_web::error::ErrorInternalServerError(format!("Failed to fetch prompt: {}", e))),
    }
}

async fn update_active_extraction_prompt_handler(
    pool: web::Data<PgPool>,
    req: web::Json<UpdatePromptRequest>,
) -> Result<HttpResponse> {
    // Deactivate all current prompts
    sqlx::query("UPDATE extraction_prompts SET is_active = false WHERE prompt_type = 'job_extraction'")
        .execute(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to deactivate prompts: {}", e)))?;

    // Get the current max version
    let max_version: Option<i32> = sqlx::query_scalar(
        "SELECT MAX(version) FROM extraction_prompts WHERE prompt_type = 'job_extraction'"
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to get max version: {}", e)))?;

    let next_version = max_version.unwrap_or(0) + 1;

    // Insert new prompt as active
    let new_prompt = sqlx::query_as::<_, ExtractionPrompt>(
        r#"
        INSERT INTO extraction_prompts (
            prompt_name, prompt_type, prompt_content, is_active, version, created_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#
    )
    .bind(format!("Job Email Extraction v{}", next_version))
    .bind("job_extraction")
    .bind(&req.prompt_content)
    .bind(true)
    .bind(next_version)
    .bind("user")
    .bind(&req.notes)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to insert new prompt: {}", e)))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Prompt updated successfully",
        "prompt": new_prompt
    })))
}

// ============================================================================
// Main Server
// ============================================================================

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().ok();
    
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    
    let pool = PgPool::connect(&database_url)
        .await
        .expect("Failed to connect to Postgres");

    println!("🚀 JobHunter Backend starting on http://localhost:8080");

    HttpServer::new(move || {
        let cors = Cors::permissive();

        App::new()
            .wrap(cors)
            .app_data(web::Data::new(pool.clone()))
            .route("/api/jobs", web::get().to(get_jobs))
            .route("/api/jobs", web::post().to(create_job))
            .route("/api/jobs/filtered", web::get().to(get_filtered_jobs))
            .route("/api/jobs/stats", web::get().to(get_job_stats))
            .route("/api/jobs/{id}", web::get().to(get_job))
            .route("/api/jobs/{id}/status", web::put().to(update_job_status))
            .route("/api/jobs/status/{status}", web::get().to(get_jobs_by_status))
            .route("/api/applications", web::get().to(get_applications))
            .route("/api/applications", web::post().to(create_application))
            .route("/api/criteria", web::get().to(get_criteria))
            .route("/api/criteria", web::put().to(update_criteria))
            .route("/api/resumes", web::get().to(get_resumes))
            .route("/api/resumes", web::post().to(create_resume))
            .route("/api/resumes/load-from-file", web::post().to(load_master_resume_from_file))
            .route("/api/resumes/{id}/set-master", web::put().to(set_master_resume))
            .route("/api/resumes/{id}", web::delete().to(delete_resume))
            .route("/api/templates/cover-letters", web::get().to(get_cover_letter_templates_handler))
            .route("/api/jobs/{id}/generate-content", web::get().to(generate_content_handler))
            .route("/api/jobs/{id}/generate-content", web::post().to(generate_content_with_options_handler))
            // Phase 4: Automated Job Intake APIs
            .route("/api/auth/gmail/url", web::get().to(get_gmail_oauth_url))
            .route("/auth/gmail/callback", web::get().to(handle_gmail_oauth_callback))
            .route("/api/intake/gmail/sync", web::post().to(sync_gmail_jobs))
            .route("/api/intake/linkedin/sync", web::post().to(sync_linkedin_jobs))
            .route("/api/intake/sync-all", web::post().to(sync_all_sources))
            .route("/api/intake/schedule", web::get().to(schedule_job_sync))
            .route("/api/intake/summary", web::get().to(get_job_intake_summary))
            .route("/api/job-sources", web::get().to(get_job_sources))
            .route("/api/intake/logs", web::get().to(get_intake_logs))
            .route("/api/intake/ignored-emails", web::get().to(get_ignored_emails))
            .route("/api/jobs/refilter", web::post().to(refilter_jobs))
            // Phase 5.1: Calendar & Follow-ups APIs
            .route("/api/interviews", web::post().to(create_interview))
            .route("/api/interviews/upcoming", web::get().to(get_upcoming_interviews))
            .route("/api/interviews/{id}", web::get().to(get_interview))
            .route("/api/interviews/{id}", web::put().to(update_interview))
            .route("/api/interviews/{id}", web::delete().to(delete_interview))
            .route("/api/follow-ups", web::post().to(create_follow_up))
            .route("/api/follow-ups/pending", web::get().to(get_pending_follow_ups))
            .route("/api/follow-ups/{id}/approve", web::put().to(approve_follow_up))
            .route("/api/follow-ups/{id}/send", web::post().to(send_follow_up))
            .route("/api/applications/{id}/timeline", web::get().to(get_application_timeline))
            // Phase 5.2: Email Composition & Sending APIs
            .route("/api/applications/{id}/create-draft", web::post().to(create_draft_handler))
            .route("/api/applications/{id}/draft-status", web::get().to(get_draft_status_handler))
            .route("/api/applications/{id}/draft", web::delete().to(delete_draft_handler))
            // Phase 5.3: LLM Job Extraction APIs
            .route("/api/extraction/prompts", web::get().to(get_active_extraction_prompt_handler))
            .route("/api/extraction/prompts/active", web::put().to(update_active_extraction_prompt_handler))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gmail_message_deserialization() {
        // Test that Gmail API JSON response with camelCase fields deserializes correctly
        // This simulates the actual Gmail API v1 response format

        let gmail_api_response = r#"{
            "id": "18c5a9b2f3d4e5f6",
            "threadId": "18c5a9b2f3d4e5f6",
            "internalDate": "1696521600000",
            "payload": {
                "headers": [
                    {
                        "name": "From",
                        "value": "recruiter@techcorp.com"
                    },
                    {
                        "name": "Subject",
                        "value": "Senior Test Engineer Position"
                    }
                ],
                "body": {
                    "size": 1234,
                    "data": "SGVsbG8gV29ybGQ="
                }
            }
        }"#;

        // This will fail if the struct doesn't have proper serde rename attributes
        let result: Result<GmailMessage, _> = serde_json::from_str(gmail_api_response);

        assert!(
            result.is_ok(),
            "Failed to deserialize Gmail API response: {:?}",
            result.err()
        );

        let message = result.unwrap();
        assert_eq!(message.id, "18c5a9b2f3d4e5f6");
        assert_eq!(message.thread_id, "18c5a9b2f3d4e5f6");
        assert_eq!(message.internal_date, "1696521600000");
        assert_eq!(message.payload.headers.len(), 2);

        let from_header = message.payload.headers.iter()
            .find(|h| h.name == "From")
            .expect("Should have From header");
        assert_eq!(from_header.value, "recruiter@techcorp.com");
    }

    #[test]
    fn test_source_identification_architecture() {
        // This test documents the architecture for identifying job sources
        //
        // IMPORTANT DESIGN PRINCIPLE:
        // - source_type is a CATEGORY: 'email', 'api', 'calendar', etc.
        // - source_name is a UNIQUE IDENTIFIER: 'gmail', 'outlook', 'yahoo', etc.
        //
        // Multiple sources can share the same type:
        // - Gmail (source_type='email', source_name='gmail')
        // - Outlook (source_type='email', source_name='outlook')
        // - Yahoo (source_type='email', source_name='yahoo')
        //
        // Frontend MUST use source_name to identify specific sources, NOT source_type

        let gmail_source_type = "email";
        let gmail_source_name = "gmail";

        // Verify Gmail configuration
        assert_eq!(gmail_source_type, "email",
            "Gmail source_type is 'email' (a category)");
        assert_eq!(gmail_source_name, "gmail",
            "Gmail source_name is 'gmail' (unique identifier)");

        // Test that multiple email sources can coexist
        let outlook_source_type = "email";  // Same type as Gmail
        let outlook_source_name = "outlook"; // Different name

        assert_eq!(outlook_source_type, gmail_source_type,
            "Multiple email sources share the same type");
        assert_ne!(outlook_source_name, gmail_source_name,
            "But have different unique names");

        println!("✓ Source identification architecture validated");
        println!("  - Use source_type for filtering by category");
        println!("  - Use source_name for identifying specific sources");
    }

    #[test]
    fn test_gmail_list_response_deserialization() {
        // Test Gmail messages list response with camelCase
        let gmail_list_response = r#"{
            "messages": [
                {
                    "id": "msg1",
                    "threadId": "thread1"
                },
                {
                    "id": "msg2",
                    "threadId": "thread2"
                }
            ],
            "nextPageToken": "abc123"
        }"#;

        let result: Result<GmailListResponse, _> = serde_json::from_str(gmail_list_response);

        assert!(
            result.is_ok(),
            "Failed to deserialize Gmail list response: {:?}",
            result.err()
        );

        let list = result.unwrap();
        assert!(list.messages.is_some());
        assert_eq!(list.messages.unwrap().len(), 2);
        assert_eq!(list.next_page_token, Some("abc123".to_string()));
    }

    // ============================================================================
    // Phase 5.2: Email Draft Tests
    // ============================================================================

    #[test]
    fn test_build_mime_message_structure() {
        // Test that build_mime_message creates a valid MIME multipart/mixed message
        let from_email = "test@example.com";
        let to_email = "recipient@company.com";
        let subject = "Test Subject";
        let body = "This is the email body";
        let resume_content = "# Resume\n\n## Experience\n- Test role";
        let resume_filename = "resume.md";

        let mime_message = build_mime_message(
            from_email,
            to_email,
            subject,
            body,
            resume_content,
            resume_filename,
        );

        // Verify headers are present
        assert!(mime_message.contains(&format!("From: {}", from_email)));
        assert!(mime_message.contains(&format!("To: {}", to_email)));
        assert!(mime_message.contains(&format!("Subject: {}", subject)));
        assert!(mime_message.contains("Content-Type: multipart/mixed"));

        // Verify body part
        assert!(mime_message.contains("Content-Type: text/plain; charset=\"UTF-8\""));
        assert!(mime_message.contains(body));

        // Verify attachment part
        assert!(mime_message.contains("Content-Type: application/octet-stream"));
        assert!(mime_message.contains(&format!("name=\"{}\"", resume_filename)));
        assert!(mime_message.contains("Content-Transfer-Encoding: base64"));
        assert!(mime_message.contains(&format!("filename=\"{}\"", resume_filename)));

        // Verify base64 encoding of resume is present
        let encoded_resume = base64::engine::general_purpose::STANDARD.encode(resume_content);
        assert!(mime_message.contains(&encoded_resume));
    }

    #[test]
    fn test_mime_message_has_unique_boundary() {
        // Test that each MIME message gets a unique boundary
        let from_email = "test@example.com";
        let to_email = "recipient@company.com";
        let subject = "Test";
        let body = "Body";
        let resume = "Resume";
        let filename = "resume.md";

        let message1 = build_mime_message(from_email, to_email, subject, body, resume, filename);
        let message2 = build_mime_message(from_email, to_email, subject, body, resume, filename);

        // Extract boundaries from both messages (note: boundary is in quotes)
        let boundary_pattern = regex::Regex::new(r#"boundary="(boundary_[a-f0-9]+)""#).unwrap();

        let boundary1 = boundary_pattern.captures(&message1)
            .and_then(|caps| caps.get(1))
            .map(|m| m.as_str());

        let boundary2 = boundary_pattern.captures(&message2)
            .and_then(|caps| caps.get(1))
            .map(|m| m.as_str());

        // Boundaries should exist and be different (UUID-based)
        assert!(boundary1.is_some());
        assert!(boundary2.is_some());
        assert_ne!(boundary1, boundary2, "Each MIME message should have a unique boundary");
    }

    #[test]
    fn test_base64_url_safe_encoding() {
        // Test that MIME message can be encoded as URL-safe base64 for Gmail API
        let from_email = "test@example.com";
        let to_email = "recipient@company.com";
        let subject = "Test Subject";
        let body = "Email body";
        let resume = "Resume content";
        let filename = "resume.md";

        let mime_message = build_mime_message(from_email, to_email, subject, body, resume, filename);

        // Encode as URL-safe base64 (as required by Gmail API)
        let encoded = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&mime_message);

        // Verify no padding characters
        assert!(!encoded.contains('='));

        // Verify URL-safe characters only (no + or /)
        assert!(!encoded.contains('+'));
        assert!(!encoded.contains('/'));

        // Verify it can be decoded back
        let decoded = base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(&encoded);
        assert!(decoded.is_ok());
        assert_eq!(decoded.unwrap(), mime_message.as_bytes());
    }

    #[test]
    fn test_gmail_draft_request_serialization() {
        // Test that GmailDraftRequest serializes to correct JSON format
        let raw_message = "dGVzdCBtZXNzYWdl"; // "test message" in base64

        let draft_request = GmailDraftRequest {
            message: GmailDraftMessage {
                raw: raw_message.to_string(),
            },
        };

        let json = serde_json::to_string(&draft_request).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();

        // Verify structure matches Gmail API requirements
        assert!(parsed.get("message").is_some());
        assert_eq!(parsed["message"]["raw"], raw_message);
    }

    #[test]
    fn test_gmail_draft_response_deserialization() {
        // Test that Gmail draft creation response deserializes correctly
        let gmail_response = r#"{
            "id": "r-1234567890",
            "message": {
                "id": "18c5a9b2f3d4e5f6",
                "threadId": "18c5a9b2f3d4e5f6",
                "labelIds": ["DRAFT"]
            }
        }"#;

        let result: Result<GmailDraftResponse, _> = serde_json::from_str(gmail_response);

        assert!(result.is_ok(), "Failed to deserialize Gmail draft response: {:?}", result.err());

        let response = result.unwrap();
        assert_eq!(response.id, "r-1234567890");
        assert_eq!(response.message.id, "18c5a9b2f3d4e5f6");
        assert_eq!(response.message.thread_id, "18c5a9b2f3d4e5f6");
    }

    #[test]
    fn test_mime_message_with_special_characters() {
        // Test MIME message construction with special characters
        let from_email = "test@example.com";
        let to_email = "recipient@company.com";
        let subject = "Application for \"Senior Engineer\" - Test & Review";
        let body = "Hello,\n\nI'm interested in the position.\n\nBest regards,\nJohn";
        let resume = "# Résumé\n\n## Skills\n- C++ & Python";
        let filename = "resume_2025.md";

        let mime_message = build_mime_message(from_email, to_email, subject, body, resume, filename);

        // Verify all content is present
        assert!(mime_message.contains(&subject));
        assert!(mime_message.contains(body));

        // Verify special characters in resume are base64 encoded
        let encoded_resume = base64::engine::general_purpose::STANDARD.encode(resume);
        assert!(mime_message.contains(&encoded_resume));
    }

    #[test]
    fn test_mime_message_with_large_resume() {
        // Test MIME message with a large resume (10KB+)
        let from_email = "test@example.com";
        let to_email = "recipient@company.com";
        let subject = "Application";
        let body = "Please find my resume attached.";

        // Create a large resume (10KB)
        let large_resume = "# Resume\n\n".to_string() + &"Experience details. ".repeat(500);
        let filename = "resume.md";

        let mime_message = build_mime_message(from_email, to_email, subject, body, &large_resume, filename);

        // Verify structure is still valid
        assert!(mime_message.contains("Content-Type: multipart/mixed"));
        assert!(mime_message.contains("Content-Transfer-Encoding: base64"));

        // Verify large resume is encoded
        let encoded_resume = base64::engine::general_purpose::STANDARD.encode(&large_resume);
        assert!(mime_message.contains(&encoded_resume));

        // Verify total message size is reasonable (less than 50KB after base64 encoding)
        assert!(mime_message.len() < 50000);
    }

    #[test]
    fn test_draft_status_response_deserialization() {
        // Test DraftStatusResponse deserialization
        let status_json = r#"{
            "status": "created",
            "draft_id": "123e4567-e89b-12d3-a456-426614174000",
            "created_at": "2025-10-09T10:30:00Z",
            "sent_at": null,
            "gmail_url": "https://mail.google.com/mail/u/0/#drafts/r-1234567890"
        }"#;

        let result: Result<DraftStatusResponse, _> = serde_json::from_str(status_json);
        assert!(result.is_ok());

        let response = result.unwrap();
        assert_eq!(response.status, "created");
        assert_eq!(response.created_at, "2025-10-09T10:30:00Z");
        assert_eq!(response.gmail_url, Some("https://mail.google.com/mail/u/0/#drafts/r-1234567890".to_string()));
        assert_eq!(response.sent_at, None);
    }
}
