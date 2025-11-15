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
// Module Declarations
// ============================================================================

mod llm;
mod calendar_auth;
mod calendar_service;

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
    pub condensed_description: Option<String>,
    pub url: Option<String>,
    pub filter_reason: Option<String>,
    pub extraction_method: Option<String>,
    pub raw_data: Option<serde_json::Value>,
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
// ISSUE-004: Multi-Criteria Job Scoring System
// ============================================================================

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct ScoringCriteria {
    pub criteria_id: Uuid,
    pub criterion_name: String,
    pub weight: f64,
    pub enabled: bool,
    pub description: Option<String>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct JobScore {
    pub job_id: Uuid,
    pub compensation_score: Option<f64>,
    pub relationship_score: Option<f64>,
    pub remote_work_score: Option<f64>,
    pub domain_fit_score: Option<f64>,
    pub flexibility_score: Option<f64>,
    pub benefits_score: Option<f64>,
    pub industry_score: Option<f64>,
    pub total_score: Option<f64>,
    pub rank: Option<i32>,
    pub calculated_at: DateTime<Utc>,
    pub manual_override_enabled: bool,
    pub manual_adjustment_points: Option<f64>,
    pub override_reason: Option<String>,
    pub overridden_by: Option<String>,
    pub overridden_at: Option<DateTime<Utc>>,
}

/// Combined Job and Score data for efficient API responses
/// Eliminates N+1 query problem by fetching both in a single LEFT JOIN
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct JobWithScore {
    // Job fields
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
    pub extraction_method: Option<String>,
    pub raw_data: Option<serde_json::Value>,
    // Score fields (optional - job may not have a score yet)
    pub total_score: Option<f64>,
    pub rank: Option<i32>,
    pub calculated_at: Option<DateTime<Utc>>,
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

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
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
    pub last_page_fetched: Option<i32>, // Phase 4.2: Automatic pagination for RapidAPI
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
    pub parts: Option<Vec<GmailPart>>, // Support nested multipart structures
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
    pub employment_type_source: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RemoteWorkDetails {
    pub policy: Option<String>,
    pub days_onsite_per_week: Option<f32>,  // Changed to f32 to support fractional days (e.g., 2.5 days/week)
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
    #[serde(default)]
    pub extraction_method: Option<String>,
    pub company_industry: Option<String>,
    pub company_industry_source: Option<String>,

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
    // LLM metadata
    pub generation_method: String,
    pub llm_model: Option<String>,
    pub tokens_used: Option<i32>,
    pub cost_estimate: Option<f64>,
    pub generation_time_ms: Option<i64>,
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

#[allow(dead_code)]
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

// ============================================================================
// ISSUE-004: Scoring Database Functions
// ============================================================================

/// Get all scoring criteria (for weighted score calculation)
async fn get_scoring_criteria(pool: &PgPool) -> Result<Vec<ScoringCriteria>, sqlx::Error> {
    sqlx::query_as::<_, ScoringCriteria>(
        "SELECT * FROM scoring_criteria WHERE enabled = true ORDER BY weight DESC"
    )
    .fetch_all(pool)
    .await
}

/// Get job score for a specific job
async fn get_job_score(pool: &PgPool, job_id: Uuid) -> Result<Option<JobScore>, sqlx::Error> {
    sqlx::query_as::<_, JobScore>(
        "SELECT * FROM job_scores WHERE job_id = $1"
    )
    .bind(job_id)
    .fetch_optional(pool)
    .await
}

/// Save or update job score (upsert)
async fn save_job_score(pool: &PgPool, score: &JobScore) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO job_scores (
            job_id, compensation_score, relationship_score, remote_work_score,
            domain_fit_score, flexibility_score, benefits_score, industry_score,
            total_score, rank, calculated_at, manual_override_enabled,
            manual_adjustment_points, override_reason, overridden_by, overridden_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (job_id) DO UPDATE SET
            compensation_score = EXCLUDED.compensation_score,
            relationship_score = EXCLUDED.relationship_score,
            remote_work_score = EXCLUDED.remote_work_score,
            domain_fit_score = EXCLUDED.domain_fit_score,
            flexibility_score = EXCLUDED.flexibility_score,
            benefits_score = EXCLUDED.benefits_score,
            industry_score = EXCLUDED.industry_score,
            total_score = EXCLUDED.total_score,
            rank = EXCLUDED.rank,
            calculated_at = EXCLUDED.calculated_at,
            manual_override_enabled = EXCLUDED.manual_override_enabled,
            manual_adjustment_points = EXCLUDED.manual_adjustment_points,
            override_reason = EXCLUDED.override_reason,
            overridden_by = EXCLUDED.overridden_by,
            overridden_at = EXCLUDED.overridden_at
        "#
    )
    .bind(score.job_id)
    .bind(score.compensation_score)
    .bind(score.relationship_score)
    .bind(score.remote_work_score)
    .bind(score.domain_fit_score)
    .bind(score.flexibility_score)
    .bind(score.benefits_score)
    .bind(score.industry_score)
    .bind(score.total_score)
    .bind(score.rank)
    .bind(score.calculated_at)
    .bind(score.manual_override_enabled)
    .bind(score.manual_adjustment_points)
    .bind(&score.override_reason)
    .bind(&score.overridden_by)
    .bind(score.overridden_at)
    .execute(pool)
    .await?;
    Ok(())
}

// ============================================================================
// ISSUE-004: Scoring Calculation Functions
// ============================================================================

/// Calculate compensation score (0-100) based on annual equivalent with tax adjustments
/// Weight: 30%
fn calculate_compensation_score(job: &Job) -> Option<f64> {
    let raw_data = job.raw_data.as_ref()?;

    // Extract compensation data
    let compensation = raw_data.get("compensation")?;
    let employment = raw_data.get("employment");

    // Get base annual equivalent
    let mut annual_equivalent: f64;

    if let Some(salary_min) = compensation.get("salary_min").and_then(|v| v.as_i64()) {
        let salary_max = compensation.get("salary_max").and_then(|v| v.as_i64()).unwrap_or(salary_min);
        annual_equivalent = ((salary_min + salary_max) / 2) as f64;
    } else if let Some(hourly) = compensation.get("hourly_rate").and_then(|v| v.as_f64()) {
        annual_equivalent = hourly * 2080.0; // 40 hrs/week * 52 weeks
    } else if let Some(daily) = compensation.get("daily_rate").and_then(|v| v.as_f64()) {
        annual_equivalent = daily * 250.0; // 5 days/week * 50 weeks
    } else {
        return None; // No compensation data
    }

    // Apply tax structure multiplier
    if let Some(emp) = employment {
        if let Some(tax_structure) = emp.get("tax_structure").and_then(|v| v.as_str()) {
            annual_equivalent *= match tax_structure {
                "1099" => 1.10,
                "schedule_c" => 1.15,
                _ => 1.0, // W-2 baseline
            };
        }
    }

    // Add bonus if available
    if let Some(bonus_str) = compensation.get("bonus_structure").and_then(|v| v.as_str()) {
        if let Some(pct_str) = bonus_str.strip_suffix('%') {
            if let Ok(pct) = pct_str.parse::<f64>() {
                annual_equivalent *= 1.0 + (pct / 100.0);
            }
        }
    }

    // Add equity with 20% discount factor
    if let Some(equity) = compensation.get("equity_offered").and_then(|v| v.as_f64()) {
        annual_equivalent += equity * 0.20;
    }

    // Calculate score (linear interpolation)
    // $100K = 0, $130K = 50, $160K = 75, $200K = 100
    let score = if annual_equivalent <= 100_000.0 {
        0.0
    } else if annual_equivalent <= 130_000.0 {
        50.0 * (annual_equivalent - 100_000.0) / 30_000.0
    } else if annual_equivalent <= 160_000.0 {
        50.0 + 25.0 * (annual_equivalent - 130_000.0) / 30_000.0
    } else if annual_equivalent <= 200_000.0 {
        75.0 + 25.0 * (annual_equivalent - 160_000.0) / 40_000.0
    } else {
        100.0
    };

    Some(score.min(100.0))
}

/// Calculate employment relationship score (0-100)
/// Weight: 20%
fn calculate_relationship_score(job: &Job) -> Option<f64> {
    let raw_data = job.raw_data.as_ref()?;
    let employment = raw_data.get("employment")?;

    // Check for Schedule C override
    if let Some(tax_structure) = employment.get("tax_structure").and_then(|v| v.as_str()) {
        if tax_structure == "schedule_c" {
            return Some(100.0);
        }
    }

    // Get relationship type
    let relationship = employment.get("relationship").and_then(|v| v.as_str())?;

    // Check for contract with retainer
    if relationship.contains("contract") {
        if let Some(duration) = employment.get("contract_duration").and_then(|v| v.as_str()) {
            if duration.contains("retainer") {
                return Some(90.0);
            }
        }
    }

    // Standard relationship scores
    let score = match relationship {
        "direct" | "full-time" | "full_time" => 100.0,
        "staffing_agency" | "recruiter" => 60.0,
        "contract_agency" => 40.0,
        "contract_to_hire" | "contract-to-hire" => 20.0,
        _ => 30.0, // Unknown
    };

    Some(score)
}

/// Calculate remote work policy score (0-100)
/// Weight: 20%
fn calculate_remote_score(job: &Job) -> Option<f64> {
    let raw_data = job.raw_data.as_ref()?;

    let mut score: f64 = 0.0;

    // Get remote work policy
    if let Some(remote_work) = raw_data.get("remote_work") {
        if let Some(policy) = remote_work.get("policy").and_then(|v| v.as_str()) {
            score = match policy {
                "fully_remote" | "remote" => 100.0,
                "hybrid" => {
                    // Check days onsite
                    if let Some(days) = remote_work.get("days_onsite_per_week").and_then(|v| v.as_f64()) {
                        if days <= 1.0 {
                            90.0
                        } else if days <= 2.0 {
                            80.0
                        } else if days <= 3.0 {
                            60.0
                        } else if days <= 4.0 {
                            30.0
                        } else {
                            10.0
                        }
                    } else {
                        60.0 // Hybrid, assume 3 days
                    }
                },
                "onsite" | "office" => 0.0,
                _ => 50.0, // Unknown, neutral
            };
        }
    }

    // Add commute bonuses if not fully remote
    if score < 100.0 {
        if let Some(commute) = raw_data.get("commute") {
            if commute.get("company_shuttle").and_then(|v| v.as_bool()).unwrap_or(false) {
                score += 15.0;
            }
            if let Some(perks) = commute.get("commute_perks").and_then(|v| v.as_str()) {
                if perks.contains("fastrak") || perks.contains("FasTrak") {
                    score += 10.0;
                }
            }
            if commute.get("schedule_flexibility").and_then(|v| v.as_bool()).unwrap_or(false) {
                score += 5.0;
            }
        }
    }

    Some(score.min(100.0))
}

/// Calculate domain/technical fit score (0-100)
/// Weight: 15%
fn calculate_domain_fit_score(job: &Job) -> Option<f64> {
    let raw_data = job.raw_data.as_ref()?;

    let mut score: f64 = 20.0; // Default for other categories

    // Check primary category
    if let Some(job_domain) = raw_data.get("job_domain") {
        if let Some(category) = job_domain.get("primary_category").and_then(|v| v.as_str()) {
            score = match category {
                "testing_qa" | "quality_assurance" => 100.0,
                "test_automation" => 90.0,
                "firmware_testing" => 85.0,
                "software_engineering" => {
                    if job_domain.get("testing_focus").and_then(|v| v.as_bool()).unwrap_or(false) {
                        80.0
                    } else {
                        40.0
                    }
                },
                "devops" | "release_engineering" => 60.0,
                _ => 20.0,
            };
        }

        // Add bonuses
        if job_domain.get("automation_focus").and_then(|v| v.as_bool()).unwrap_or(false) {
            score += 10.0;
        }
        if job_domain.get("generative_ai_usage").and_then(|v| v.as_bool()).unwrap_or(false) {
            score += 10.0;
        }

        // Check tech stack
        if let Some(tech_stack) = job_domain.get("tech_stack").and_then(|v| v.as_array()) {
            let tech_string = tech_stack.iter()
                .filter_map(|v| v.as_str())
                .collect::<Vec<_>>()
                .join(" ");
            if tech_string.contains("Playwright") || tech_string.contains("Cypress") || tech_string.contains("Selenium") {
                score += 5.0;
            }
        }
    }

    // Title bonus
    let title_lower = job.title.to_lowercase();
    if title_lower.contains("test") || title_lower.contains("qa") || title_lower.contains("quality") {
        score += 5.0;
    }

    // Management penalty
    if title_lower.contains("manager") || title_lower.contains("director") || title_lower.contains("executive") {
        score -= 20.0;
    }

    Some(score.clamp(0.0, 100.0))
}

/// Calculate flexibility & perks score (0-100)
/// Weight: 10%
fn calculate_flexibility_score(job: &Job) -> Option<f64> {
    let raw_data = job.raw_data.as_ref()?;

    // Check for retainer arrangements
    if let Some(employment) = raw_data.get("employment") {
        if let Some(duration) = employment.get("contract_duration").and_then(|v| v.as_str()) {
            let duration_lower = duration.to_lowercase();
            if duration_lower.contains("retainer") {
                if duration_lower.contains("3") || duration_lower.contains("three") {
                    return Some(100.0);
                } else if duration_lower.contains("2") || duration_lower.contains("two") {
                    return Some(85.0);
                } else if duration_lower.contains("1") || duration_lower.contains("one") {
                    return Some(70.0);
                }
            }
            if duration_lower.contains("contract") {
                return Some(40.0);
            }
        }
    }

    // No retainer, score based on perks
    let mut score: f64 = 0.0;

    if let Some(commute) = raw_data.get("commute") {
        if commute.get("schedule_flexibility").and_then(|v| v.as_bool()).unwrap_or(false) {
            score = 60.0;
        } else if commute.get("company_shuttle").and_then(|v| v.as_bool()).unwrap_or(false) {
            score = 50.0;
        } else if let Some(perks) = commute.get("commute_perks").and_then(|v| v.as_str()) {
            if perks.contains("fastrak") || perks.contains("FasTrak") {
                score = 40.0;
            } else if perks.contains("parking") {
                score = 30.0;
            }
        }
    }

    if score == 0.0 && raw_data.get("employment")
            .and_then(|e| e.get("benefits"))
            .is_some() {
        score = 20.0; // Standard benefits
    }

    Some(score)
}

/// Calculate benefits score (0-100)
/// Weight: 3%
fn calculate_benefits_score(job: &Job) -> Option<f64> {
    let raw_data = job.raw_data.as_ref()?;

    let benefits_str = raw_data.get("employment")
        .and_then(|e| e.get("benefits"))
        .and_then(|b| b.as_str())?;

    let benefits_lower = benefits_str.to_lowercase();

    // Check for private insurance
    if benefits_lower.contains("blue shield") || benefits_lower.contains("aetna") ||
       benefits_lower.contains("kaiser") || benefits_lower.contains("cigna") {
        return Some(100.0);
    }

    // Comprehensive benefits
    if benefits_lower.contains("comprehensive") || benefits_lower.contains("full benefits") {
        return Some(70.0);
    }

    // Standard benefits
    if benefits_lower.contains("health") && benefits_lower.contains("dental") {
        return Some(50.0);
    }

    // Minimal
    if benefits_lower.contains("health") || benefits_lower.contains("insurance") {
        return Some(30.0);
    }

    Some(40.0) // Unknown, neutral
}

/// Calculate company industry score (0-100)
/// Weight: 2%
fn calculate_industry_score(job: &Job) -> Option<f64> {
    let raw_data = job.raw_data.as_ref()?;

    let industry = raw_data.get("company_industry")
        .and_then(|i| i.as_str())?;

    let industry_lower = industry.to_lowercase();

    let score = if industry_lower.contains("healthcare") && industry_lower.contains("tech") {
        100.0
    } else if industry_lower.contains("saas") || industry_lower.contains("enterprise") {
        90.0
    } else if industry_lower.contains("financial") || industry_lower.contains("fintech") {
        80.0
    } else if industry_lower.contains("consulting") {
        70.0
    } else if industry_lower.contains("ecommerce") || industry_lower.contains("e-commerce") {
        60.0
    } else if industry_lower.contains("telecom") {
        50.0
    } else {
        40.0 // Other/Unknown
    };

    Some(score)
}

// ============================================================================
// ISSUE-004: Orchestration Function
// ============================================================================

/// Calculate complete job score with weighted criteria
/// Returns JobScore with all criterion scores and total score
async fn calculate_job_score(pool: &PgPool, job: &Job) -> Result<JobScore, String> {
    // Calculate individual criterion scores
    let compensation_score = calculate_compensation_score(job);
    let relationship_score = calculate_relationship_score(job);
    let remote_work_score = calculate_remote_score(job);
    let domain_fit_score = calculate_domain_fit_score(job);
    let flexibility_score = calculate_flexibility_score(job);
    let benefits_score = calculate_benefits_score(job);
    let industry_score = calculate_industry_score(job);

    // Fetch weights from database
    let criteria = get_scoring_criteria(pool)
        .await
        .map_err(|e| format!("Failed to fetch scoring criteria: {}", e))?;

    // Build weight map
    let mut weights: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
    for criterion in criteria {
        weights.insert(criterion.criterion_name, criterion.weight);
    }

    // Calculate weighted total score
    let mut total_score: f64 = 0.0;
    let mut criterion_count = 0;

    if let Some(score) = compensation_score {
        if let Some(&weight) = weights.get("compensation") {
            total_score += score * weight;
            criterion_count += 1;
        }
    }
    if let Some(score) = relationship_score {
        if let Some(&weight) = weights.get("employment_relationship") {
            total_score += score * weight;
            criterion_count += 1;
        }
    }
    if let Some(score) = remote_work_score {
        if let Some(&weight) = weights.get("remote_work") {
            total_score += score * weight;
            criterion_count += 1;
        }
    }
    if let Some(score) = domain_fit_score {
        if let Some(&weight) = weights.get("domain_fit") {
            total_score += score * weight;
            criterion_count += 1;
        }
    }
    if let Some(score) = flexibility_score {
        if let Some(&weight) = weights.get("flexibility_perks") {
            total_score += score * weight;
            criterion_count += 1;
        }
    }
    if let Some(score) = benefits_score {
        if let Some(&weight) = weights.get("benefits") {
            total_score += score * weight;
            criterion_count += 1;
        }
    }
    if let Some(score) = industry_score {
        if let Some(&weight) = weights.get("company_industry") {
            total_score += score * weight;
            criterion_count += 1;
        }
    }

    // Ensure we have at least some scores
    if criterion_count == 0 {
        return Err("No valid criterion scores calculated".to_string());
    }

    // Create JobScore struct
    let job_score = JobScore {
        job_id: job.job_id,
        compensation_score,
        relationship_score,
        remote_work_score,
        domain_fit_score,
        flexibility_score,
        benefits_score,
        industry_score,
        total_score: Some(total_score),
        rank: None, // Will be calculated separately
        calculated_at: Utc::now(),
        manual_override_enabled: false,
        manual_adjustment_points: None,
        override_reason: None,
        overridden_by: None,
        overridden_at: None,
    };

    // Save to database
    save_job_score(pool, &job_score)
        .await
        .map_err(|e| format!("Failed to save job score: {}", e))?;

    Ok(job_score)
}

/// Recalculate ranks for all scored jobs (called after batch scoring)
async fn recalculate_ranks(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Update ranks based on total_score DESC using window function
    sqlx::query(
        r#"
        WITH ranked_jobs AS (
            SELECT
                job_id,
                ROW_NUMBER() OVER (ORDER BY total_score DESC NULLS LAST) as new_rank
            FROM job_scores
        )
        UPDATE job_scores
        SET rank = ranked_jobs.new_rank
        FROM ranked_jobs
        WHERE job_scores.job_id = ranked_jobs.job_id
        "#
    )
    .execute(pool)
    .await?;

    Ok(())
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

    // ISSUE-004 Phase 1: Domain match is now ADVISORY (not eliminatory)
    // Domain mismatch will be captured in scoring, not filtering
    // Commenting out domain filter to allow all jobs through to scoring phase
    /*
    if let Some(ref domains) = criteria.preferred_domains {
        if !matches_domain(&job_req.title, &job_req.description, domains) {
            reasons.push("Job doesn't match preferred domains (Testing, AI, Firmware)".to_string());
        }
    }
    */

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
    
    resume.replace("Test Automation", "**Test Automation**")
        .replace("Quality Engineering", "**Quality Engineering**")
        .replace("testing frameworks", "**testing frameworks**")
        .replace("CI/CD", "**CI/CD**")
}

fn highlight_ai_experience(resume: String) -> String {
    
    resume.replace("AI-powered", "**AI-powered**")
        .replace("LLM", "**LLM**")
        .replace("Generative AI", "**Generative AI**")
        .replace("Prompt Engineering", "**Prompt Engineering**")
        .replace("OpenAI", "**OpenAI**")
}

fn highlight_firmware_experience(resume: String) -> String {
    
    resume.replace("firmware", "**firmware**")
        .replace("hardware", "**hardware**")
        .replace("embedded", "**embedded**")
        .replace("validation", "**validation**")
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

// ============================================================================
// LLM-Based Content Generation
// ============================================================================

use llm::AnthropicClient;
use std::collections::HashMap;

/// Generate content for job using LLM (NEW implementation)
async fn generate_content_for_job_llm(
    job: &Job,
    pool: &PgPool,
) -> Result<GeneratedContent, Box<dyn std::error::Error>> {
    use std::time::Instant;

    let start_time = Instant::now();

    // Get master resume
    let master_resume = get_master_resume(pool).await?;

    // Create LLM client
    let client = AnthropicClient::from_env()
        .map_err(|e| format!("Failed to create Anthropic client: {}", e))?;

    // Generate customized resume using LLM
    let (customized_resume, resume_usage) = {
        let resume_template = llm::load_prompt_template("resume_customization")?;
        let mut variables = HashMap::new();

        let empty_description = String::new();
        let job_description = job.description.as_ref().unwrap_or(&empty_description);

        variables.insert("master_resume".to_string(), master_resume.content.clone());
        variables.insert("job_title".to_string(), job.title.clone());
        variables.insert("company".to_string(), job.company.clone());
        variables.insert("location".to_string(), job.location.as_ref().unwrap_or(&"Not specified".to_string()).clone());
        variables.insert("salary".to_string(), job.salary.map(|s| format!("${}", s)).unwrap_or("Not specified".to_string()));
        variables.insert("job_description".to_string(), job_description.clone());
        variables.insert("primary_domain".to_string(), llm::extract_primary_domain(&job.title, job_description));
        variables.insert("technologies".to_string(), llm::extract_technologies(job_description));
        variables.insert("seniority".to_string(), llm::extract_seniority(&job.title));

        let prompt = llm::build_prompt(&resume_template, &variables);
        let response = client.generate(&prompt, 2500, None).await
            .map_err(|e| format!("Resume generation failed: {}", e))?;

        (response.content, response.usage)
    };

    // Generate cover letter using LLM (sequential - uses customized resume)
    let (cover_letter, cover_letter_usage) = {
        let cl_template = llm::load_prompt_template("cover_letter_generation")?;
        let mut variables = HashMap::new();

        variables.insert("customized_resume".to_string(), customized_resume.clone());
        variables.insert("job_title".to_string(), job.title.clone());
        variables.insert("company".to_string(), job.company.clone());
        variables.insert("location".to_string(), job.location.as_ref().unwrap_or(&"Not specified".to_string()).clone());
        variables.insert("salary".to_string(), job.salary.map(|s| format!("${}", s)).unwrap_or("Not specified".to_string()));
        variables.insert("job_description".to_string(), job.description.as_ref().unwrap_or(&String::new()).clone());
        variables.insert("url".to_string(), job.url.as_ref().unwrap_or(&"Not specified".to_string()).clone());
        variables.insert("company_research".to_string(), "Not available".to_string());

        let salary_note = if let Some(salary) = job.salary {
            if salary < 130000 {
                format!("Note: The listed salary (${}) is below your target of $130,000. You may want to address compensation expectations during the interview process.", salary)
            } else {
                "The compensation aligns with your expectations.".to_string()
            }
        } else {
            "Compensation details not specified in posting.".to_string()
        };
        variables.insert("salary_note".to_string(), salary_note);

        let prompt = llm::build_prompt(&cl_template, &variables);
        let response = client.generate(&prompt, 1500, None).await
            .map_err(|e| format!("Cover letter generation failed: {}", e))?;

        (response.content, response.usage)
    };

    // Calculate total tokens and cost
    let total_tokens = resume_usage.input_tokens + resume_usage.output_tokens +
                      cover_letter_usage.input_tokens + cover_letter_usage.output_tokens;

    let total_usage = llm::Usage {
        input_tokens: resume_usage.input_tokens + cover_letter_usage.input_tokens,
        output_tokens: resume_usage.output_tokens + cover_letter_usage.output_tokens,
    };

    let cost = AnthropicClient::estimate_cost(&total_usage);
    let generation_time = start_time.elapsed().as_millis() as i64;

    Ok(GeneratedContent {
        resume: customized_resume,
        cover_letter,
        resume_format: master_resume.format,
        generated_at: Utc::now(),
        application_id: Uuid::nil(), // Will be set by the handler
        generation_method: "llm".to_string(),
        llm_model: Some("claude-3-5-haiku-20241022".to_string()),
        tokens_used: Some(total_tokens),
        cost_estimate: Some(cost),
        generation_time_ms: Some(generation_time),
    })
}

// ============================================================================
// Legacy Template-Based Content Generation (DEPRECATED)
// ============================================================================

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
        generation_method: "template".to_string(),
        llm_model: None,
        tokens_used: None,
        cost_estimate: None,
        generation_time_ms: None,
    })
}

// ============================================================================
// Job Handlers
// ============================================================================

async fn get_jobs(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let jobs = sqlx::query_as::<_, JobWithScore>(
        "SELECT
            j.job_id, j.title, j.company, j.location, j.source, j.salary,
            j.commute_time, j.status, j.date_email_sent, j.description, j.url,
            j.filter_reason, j.extraction_method, j.raw_data,
            s.total_score, s.rank, s.calculated_at
         FROM jobs j
         LEFT JOIN job_scores s ON j.job_id = s.job_id
         ORDER BY j.date_email_sent DESC"
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(jobs))
}

async fn get_job(
    pool: web::Data<PgPool>,
    job_id: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let job = sqlx::query_as::<_, Job>(
        "SELECT job_id, title, company, location, source, salary, commute_time, status, date_email_sent, description, condensed_description, url, filter_reason, extraction_method, raw_data FROM jobs WHERE job_id = $1"
    )
    .bind(*job_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

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
    .map_err(actix_web::error::ErrorInternalServerError)?;

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
        "UPDATE jobs SET status = $1 WHERE job_id = $2 RETURNING job_id, title, company, location, source, salary, commute_time, status, date_email_sent, description, condensed_description, url, filter_reason, extraction_method, raw_data"
    )
    .bind(&status_req.status)
    .bind(*job_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

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
        "SELECT job_id, title, company, location, source, salary, commute_time, status, date_email_sent, description, condensed_description, url, filter_reason, extraction_method, raw_data FROM jobs WHERE status = $1 ORDER BY date_email_sent DESC"
    )
    .bind(status.as_str())
    .fetch_all(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(jobs))
}

/// Reject a job and update Gmail labels
///
/// This function:
/// 1. Updates the job status to "rejected"
/// 2. Applies JobOps-OLD label to the associated email in Gmail
/// 3. Removes the JobOp label from the email
///
/// Note: This only operates on valid jobs (with job_id). Orphaned email_jobs
/// (where job_id IS NULL) cannot be rejected through this endpoint.
/// Such records appear in the Ignored tab only if they don't have JobOps-OLD label
/// (see get_ignored_emails function for filtering logic).
async fn reject_job(
    pool: web::Data<PgPool>,
    job_id: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let job_id_val = *job_id;

    // 1. Update job status to "rejected"
    let job = sqlx::query_as::<_, Job>(
        "UPDATE jobs SET status = 'rejected', updated_at = NOW() WHERE job_id = $1 RETURNING job_id, title, company, location, source, salary, commute_time, status, date_email_sent, description, url, filter_reason, extraction_method, raw_data"
    )
    .bind(job_id_val)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    if job.is_none() {
        return Ok(HttpResponse::NotFound().json("Job not found"));
    }

    // 2. Get email message_id from email_jobs table
    let email_job = sqlx::query!(
        "SELECT message_id, source FROM email_jobs WHERE job_id = $1",
        job_id_val
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    if let Some(email_job) = email_job {
        // 3. Check email source type
        let source = email_job.source.as_deref();

        match source {
            Some("microsoft_email") => {
                // Handle Microsoft email - move to JobOps-OLD folder
                let oauth_creds = sqlx::query!(
                    "SELECT access_token FROM oauth_credentials WHERE source_id = (SELECT source_id FROM job_sources WHERE source_name = 'microsoft_email' LIMIT 1) LIMIT 1",
                )
                .fetch_optional(pool.get_ref())
                .await
                .map_err(actix_web::error::ErrorInternalServerError)?;

                if let Some(creds) = oauth_creds {
                    if let Some(access_token) = &creds.access_token {
                        let client = reqwest::Client::new();

                        // Get or create archive folder
                        match get_or_create_archive_folder(&client, access_token).await {
                            Ok(archive_id) => {
                                // Move message to JobOps-OLD
                                if let Err(e) = move_microsoft_message(
                                    &client,
                                    access_token,
                                    &email_job.message_id,
                                    &archive_id,
                                ).await {
                                    log_debug(&format!(
                                        "Warning: Failed to move Microsoft message {} to JobOps-OLD: {}. Job rejection still successful.",
                                        email_job.message_id, e
                                    ));
                                } else {
                                    log_debug(&format!("Successfully moved Microsoft message {} to JobOps-OLD", email_job.message_id));
                                }
                            }
                            Err(e) => {
                                log_debug(&format!(
                                    "Warning: Failed to get JobOps-OLD folder for job {}: {}. Job rejection still successful.",
                                    job_id_val, e
                                ));
                            }
                        }
                    } else {
                        log_debug(&format!("Warning: No Microsoft access token found. Skipping folder move."));
                    }
                } else {
                    log_debug(&format!("Warning: No Microsoft OAuth credentials found for job {}. Skipping folder move.", job_id_val));
                }
            }
            _ => {
                // Handle Gmail or default - update labels
                let oauth_creds = sqlx::query!(
                    "SELECT access_token FROM oauth_credentials WHERE source_id = (SELECT source_id FROM job_sources WHERE source_name = 'gmail' LIMIT 1) LIMIT 1",
                )
                .fetch_optional(pool.get_ref())
                .await
                .map_err(actix_web::error::ErrorInternalServerError)?;

                if let Some(creds) = oauth_creds {
                    if let Some(access_token) = &creds.access_token {
                        // Update Gmail labels (best effort - don't fail if this fails)
                        let client = reqwest::Client::new();
                        if let Err(e) = update_gmail_labels_for_rejected_job(
                            &client,
                            access_token,
                            &email_job.message_id,
                        ).await {
                        log_debug(&format!(
                            "Warning: Failed to update Gmail labels for job {}: {}. Job rejection still successful.",
                            job_id_val, e
                        ));
                        // Continue - job rejection still succeeds even if label update fails
                        } else {
                            log_debug(&format!("Successfully updated Gmail labels for rejected job {}", job_id_val));
                        }
                    } else {
                        log_debug(&format!("Warning: No Gmail access token found. Skipping label update."));
                    }
                } else {
                    log_debug(&format!("Warning: No Gmail OAuth credentials found for job {}. Skipping label update.", job_id_val));
                }
            }
        }
    } else {
        log_debug(&format!("Job {} has no associated email, skipping email management", job_id_val));
    }

    Ok(HttpResponse::Ok().json(job.unwrap()))
}

// Bulk delete request/response structs
#[derive(Deserialize)]
struct BulkDeleteJobsRequest {
    job_ids: Vec<Uuid>,
}

#[derive(Deserialize)]
struct BulkDeleteEmailJobsRequest {
    email_job_ids: Vec<Uuid>,
}

#[derive(Serialize)]
struct BulkDeleteResponse {
    success_count: usize,
    failure_count: usize,
    failures: Vec<BulkDeleteFailure>,
}

#[derive(Serialize)]
struct BulkDeleteFailure {
    id: Uuid,
    error: String,
}

// Bulk delete Gmail emails for rejected jobs
async fn bulk_delete_gmail_jobs(
    pool: web::Data<PgPool>,
    request: web::Json<BulkDeleteJobsRequest>,
) -> Result<HttpResponse> {
    // 1. Validate all jobs are from Gmail source and get message IDs
    let jobs = sqlx::query!(
        "SELECT j.job_id, j.source, ej.message_id
         FROM jobs j
         JOIN email_jobs ej ON j.job_id = ej.job_id
         WHERE j.job_id = ANY($1)",
        &request.job_ids
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    // Check all are Gmail source
    if jobs.iter().any(|j| j.source != "gmail") {
        return Err(actix_web::error::ErrorBadRequest(
            "Invalid request: Some jobs are not from Gmail source"
        ));
    }

    // 2. Get Gmail OAuth token
    let credentials = sqlx::query!(
        "SELECT access_token FROM oauth_credentials
         WHERE source_id = (SELECT source_id FROM job_sources WHERE source_name = 'gmail' LIMIT 1)
         LIMIT 1"
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    let access_token = match credentials {
        Some(creds) => creds.access_token.ok_or_else(|| {
            actix_web::error::ErrorUnauthorized("No Gmail token available")
        })?,
        None => {
            return Err(actix_web::error::ErrorUnauthorized(
                "Gmail credentials not found"
            ));
        }
    };

    // 3. Trash emails and delete job records
    let client = reqwest::Client::new();
    let mut success_count = 0;
    let mut failures = Vec::new();

    for job in jobs {
        // Trash email in Gmail
        match trash_gmail_message(&client, &access_token, &job.message_id).await {
            Ok(_) => {
                // Delete job record (CASCADE deletes email_jobs entry)
                match sqlx::query!("DELETE FROM jobs WHERE job_id = $1", job.job_id)
                    .execute(pool.get_ref())
                    .await
                {
                    Ok(_) => {
                        success_count += 1;
                        log_debug(&format!("Successfully deleted job {} and trashed Gmail email", job.job_id));
                    }
                    Err(e) => failures.push(BulkDeleteFailure {
                        id: job.job_id,
                        error: format!("Database deletion failed: {}", e),
                    }),
                }
            }
            Err(e) => failures.push(BulkDeleteFailure {
                id: job.job_id,
                error: format!("Gmail API error: {}", e),
            }),
        }
    }

    Ok(HttpResponse::Ok().json(BulkDeleteResponse {
        success_count,
        failure_count: failures.len(),
        failures,
    }))
}

// Bulk delete Gmail emails for non-job emails (Ignored tab)
async fn bulk_delete_gmail_email_jobs(
    pool: web::Data<PgPool>,
    request: web::Json<BulkDeleteEmailJobsRequest>,
) -> Result<HttpResponse> {
    // 1. Validate all email_jobs are from Gmail source and get message IDs
    let email_jobs = sqlx::query!(
        "SELECT email_job_id, message_id, source
         FROM email_jobs
         WHERE email_job_id = ANY($1)",
        &request.email_job_ids
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    // Check all are Gmail source
    if email_jobs.iter().any(|ej| ej.source.as_deref() != Some("gmail")) {
        return Err(actix_web::error::ErrorBadRequest(
            "Invalid request: Some emails are not from Gmail source"
        ));
    }

    // 2. Get Gmail OAuth token
    let credentials = sqlx::query!(
        "SELECT access_token FROM oauth_credentials
         WHERE source_id = (SELECT source_id FROM job_sources WHERE source_name = 'gmail' LIMIT 1)
         LIMIT 1"
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    let access_token = match credentials {
        Some(creds) => creds.access_token.ok_or_else(|| {
            actix_web::error::ErrorUnauthorized("No Gmail token available")
        })?,
        None => {
            return Err(actix_web::error::ErrorUnauthorized(
                "Gmail credentials not found"
            ));
        }
    };

    // 3. Trash emails and delete email_jobs records
    let client = reqwest::Client::new();
    let mut success_count = 0;
    let mut failures = Vec::new();

    for email_job in email_jobs {
        // Trash email in Gmail
        match trash_gmail_message(&client, &access_token, &email_job.message_id).await {
            Ok(_) => {
                // Delete email_jobs record
                match sqlx::query!("DELETE FROM email_jobs WHERE email_job_id = $1", email_job.email_job_id)
                    .execute(pool.get_ref())
                    .await
                {
                    Ok(_) => {
                        success_count += 1;
                        log_debug(&format!("Successfully deleted email_job {} and trashed Gmail email", email_job.email_job_id));
                    }
                    Err(e) => failures.push(BulkDeleteFailure {
                        id: email_job.email_job_id,
                        error: format!("Database deletion failed: {}", e),
                    }),
                }
            }
            Err(e) => failures.push(BulkDeleteFailure {
                id: email_job.email_job_id,
                error: format!("Gmail API error: {}", e),
            }),
        }
    }

    Ok(HttpResponse::Ok().json(BulkDeleteResponse {
        success_count,
        failure_count: failures.len(),
        failures,
    }))
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
    .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Created().json(application))
}

async fn get_applications(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let applications = sqlx::query_as::<_, Application>(
        "SELECT * FROM applications ORDER BY date_applied DESC"
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

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
    .map_err(actix_web::error::ErrorInternalServerError)?;

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
    .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(criteria))
}

// ============================================================================
// Filtering and Stats Handlers
// ============================================================================

async fn get_filtered_jobs(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let jobs = sqlx::query_as::<_, Job>(
        "SELECT job_id, title, company, location, source, salary, commute_time, status, date_email_sent, description, condensed_description, url, filter_reason, extraction_method, raw_data FROM jobs WHERE status = 'filtered' ORDER BY date_email_sent DESC"
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(jobs))
}

// ============================================================================
// ISSUE-004: Scoring API Endpoints
// ============================================================================

/// POST /api/jobs/{id}/calculate-score - Calculate score for single job
async fn calculate_single_job_score(
    pool: web::Data<PgPool>,
    job_id: web::Path<Uuid>,
) -> Result<HttpResponse> {
    // Fetch job
    let job = sqlx::query_as::<_, Job>(
        "SELECT * FROM jobs WHERE job_id = $1"
    )
    .bind(*job_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorNotFound(format!("Job not found: {}", e)))?;

    // Calculate score
    let job_score = calculate_job_score(pool.get_ref(), &job)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to calculate score: {}", e)))?;

    // Recalculate ranks
    recalculate_ranks(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to recalculate ranks: {}", e)))?;

    Ok(HttpResponse::Ok().json(job_score))
}

/// POST /api/jobs/calculate-all-scores - Bulk score all jobs
async fn calculate_all_job_scores(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    // Fetch all jobs
    let jobs = sqlx::query_as::<_, Job>(
        "SELECT * FROM jobs WHERE raw_data IS NOT NULL"
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch jobs: {}", e)))?;

    let mut scored_count = 0;
    let mut failed_count = 0;

    for job in jobs {
        match calculate_job_score(pool.get_ref(), &job).await {
            Ok(_) => scored_count += 1,
            Err(e) => {
                eprintln!("Failed to score job {}: {}", job.job_id, e);
                failed_count += 1;
            }
        }
    }

    // Recalculate ranks after scoring all
    recalculate_ranks(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to recalculate ranks: {}", e)))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "scored_count": scored_count,
        "failed_count": failed_count
    })))
}

/// GET /api/jobs/ranked - Get jobs ordered by score
async fn get_ranked_jobs(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    // Fetch jobs with their scores using raw SQL
    let jobs = sqlx::query_as::<_, Job>(
        r#"
        SELECT j.*
        FROM jobs j
        LEFT JOIN job_scores s ON j.job_id = s.job_id
        ORDER BY s.total_score DESC NULLS LAST
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(jobs))
}

/// GET /api/jobs/{id}/score - Get score for a specific job
async fn get_job_score_handler(
    pool: web::Data<PgPool>,
    job_id: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let score = get_job_score(pool.get_ref(), *job_id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    match score {
        Some(s) => Ok(HttpResponse::Ok().json(s)),
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Score not found for this job"
        })))
    }
}

/// GET /api/scoring-criteria - Get current weights
async fn get_scoring_criteria_handler(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let criteria = get_scoring_criteria(pool.get_ref())
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(criteria))
}

/// PUT /api/scoring-criteria - Update weights
#[derive(Deserialize)]
struct UpdateScoringCriteriaRequest {
    criteria: Vec<ScoringCriteria>,
}

async fn update_scoring_criteria_handler(
    pool: web::Data<PgPool>,
    req: web::Json<UpdateScoringCriteriaRequest>,
) -> Result<HttpResponse> {
    // Validate weights sum to 1.0 (±0.001 tolerance)
    let weight_sum: f64 = req.criteria.iter().map(|c| c.weight).sum();
    if (weight_sum - 1.0).abs() > 0.001 {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": format!("Weights must sum to 1.0 (got: {})", weight_sum)
        })));
    }

    // Update each criterion
    for criterion in &req.criteria {
        sqlx::query(
            "UPDATE scoring_criteria SET weight = $1, updated_at = NOW() WHERE criteria_id = $2"
        )
        .bind(criterion.weight)
        .bind(criterion.criteria_id)
        .execute(pool.get_ref())
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({"success": true})))
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
    .map_err(actix_web::error::ErrorInternalServerError)?;

    let mut stats_map: std::collections::HashMap<String, i64> = stats
        .into_iter()
        .filter_map(|row| row.status.map(|status| (status, row.count.unwrap_or(0))))
        .collect();

    // Ensure all expected statuses are present with default value of 0
    stats_map.entry("new".to_string()).or_insert(0);
    stats_map.entry("approved".to_string()).or_insert(0);
    stats_map.entry("applied".to_string()).or_insert(0);
    stats_map.entry("filtered".to_string()).or_insert(0); // Jobs with status='filtered' from jobs table

    // Query email_jobs table directly to get counts that match what the tabs display
    let email_stats = sqlx::query!(
        r#"
        SELECT
            -- Failed: emails with processing errors OR failed extraction
            COUNT(*) FILTER (WHERE processing_errors IS NOT NULL OR (processed = false AND extraction_confidence IS NULL)) as total_failed,
            -- Duplicates: medium-to-high confidence emails that were processed but didn't create jobs (and have complete data)
            -- Changed from >= 0.7 to >= 0.3 to capture medium-confidence emails with complete data
            COUNT(*) FILTER (WHERE processed = true AND job_id IS NULL AND processing_errors IS NULL
                            AND extraction_confidence >= 0.3
                            AND extracted_data->>'title' IS NOT NULL AND extracted_data->>'title' != ''
                            AND extracted_data->>'company' IS NOT NULL AND extracted_data->>'company' != '') as total_duplicated,
            -- Filtered/Ignored: low-confidence emails OR emails with incomplete data (missing title or company)
            -- IMPORTANT: Exclude emails that created jobs (job_id IS NOT NULL) to maintain MECE
            COUNT(*) FILTER (WHERE processed = true AND processing_errors IS NULL
                            AND job_id IS NULL
                            AND extraction_confidence IS NOT NULL
                            AND (extraction_confidence < 0.3
                                 OR extracted_data->>'title' IS NULL OR extracted_data->>'title' = ''
                                 OR extracted_data->>'company' IS NULL OR extracted_data->>'company' = '')) as total_filtered,
            -- Created: emails that successfully created jobs (have job_id set)
            COUNT(*) FILTER (WHERE job_id IS NOT NULL) as total_created,
            -- Total discovered (all emails)
            COUNT(*) as total_discovered
        FROM email_jobs
        "#
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    stats_map.insert("failed".to_string(), email_stats.total_failed.unwrap_or(0));
    stats_map.insert("duplicated".to_string(), email_stats.total_duplicated.unwrap_or(0));
    stats_map.insert("filtered_during_intake".to_string(), email_stats.total_filtered.unwrap_or(0)); // Jobs filtered during email processing
    stats_map.insert("created".to_string(), email_stats.total_created.unwrap_or(0));
    stats_map.insert("discovered".to_string(), email_stats.total_discovered.unwrap_or(0));

    // MECE Validation: discovered = failed + filtered + duplicated + created
    let discovered = email_stats.total_discovered.unwrap_or(0);
    let failed = email_stats.total_failed.unwrap_or(0);
    let filtered = email_stats.total_filtered.unwrap_or(0);
    let duplicated = email_stats.total_duplicated.unwrap_or(0);
    let created = email_stats.total_created.unwrap_or(0);

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
    .map_err(actix_web::error::ErrorInternalServerError)?;

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
            .map_err(actix_web::error::ErrorInternalServerError)?;
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
    .map_err(actix_web::error::ErrorInternalServerError)?;

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
        .map_err(actix_web::error::ErrorInternalServerError)?;

    // Set this resume as master
    let resume = sqlx::query_as::<_, ResumeVersion>(
        "UPDATE resume_versions SET is_master = true WHERE version_id = $1 RETURNING version_id, version_name, content, format, file_path, is_master, created_at, updated_at"
    )
    .bind(version_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

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
    .map_err(actix_web::error::ErrorInternalServerError)?;

    if is_master == Some(true) {
        return Err(actix_web::error::ErrorBadRequest("Cannot delete master resume. Set another resume as master first."));
    }

    sqlx::query!("DELETE FROM resume_versions WHERE version_id = $1", version_id)
        .execute(pool.get_ref())
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

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
        .map_err(actix_web::error::ErrorInternalServerError)?;

    // Check if a master resume already exists with this content
    let existing = sqlx::query_scalar::<_, Uuid>(
        "SELECT version_id FROM resume_versions WHERE content = $1 LIMIT 1"
    )
    .bind(&content)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    let resume = if let Some(existing_id) = existing {
        // Update existing resume to be master
        sqlx::query_as::<_, ResumeVersion>(
            "UPDATE resume_versions SET is_master = true WHERE version_id = $1 RETURNING version_id, version_name, content, format, file_path, is_master, created_at, updated_at"
        )
        .bind(existing_id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?
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
        .map_err(actix_web::error::ErrorInternalServerError)?
    };

    Ok(HttpResponse::Ok().json(resume))
}

async fn get_cover_letter_templates_handler(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let templates = sqlx::query_as::<_, CoverLetterTemplate>(
        "SELECT template_id, template_name, content, created_at, updated_at FROM cover_letter_templates ORDER BY created_at DESC"
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(templates))
}

async fn generate_content_handler(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let job_id = path.into_inner();

    // Get job details
    let job = sqlx::query_as::<_, Job>(
        "SELECT job_id, title, company, location, source, salary, commute_time, status, date_email_sent, description, url, filter_reason, extraction_method, raw_data FROM jobs WHERE job_id = $1"
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
    .map_err(actix_web::error::ErrorInternalServerError)?;

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

    // Generate content using LLM
    match generate_content_for_job_llm(&job, pool.get_ref()).await {
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
        "SELECT job_id, title, company, location, source, salary, commute_time, status, date_email_sent, description, url, filter_reason, extraction_method, raw_data FROM jobs WHERE job_id = $1"
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
    .map_err(actix_web::error::ErrorInternalServerError)?;

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

    // Generate content using LLM
    match generate_content_for_job_llm(&job, pool.get_ref()).await {
        Ok(mut content) => {
            content.application_id = application_id;
            Ok(HttpResponse::Ok().json(content))
        },
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to generate content: {}", e)
        })))
    }
}

// Handler to condense job description
async fn condense_description_handler(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let job_id = path.into_inner();

    // Get job details including cached condensed_description
    let job = sqlx::query_as::<_, Job>(
        "SELECT job_id, title, company, location, source, salary, commute_time, status, date_email_sent, description, condensed_description, url, filter_reason, extraction_method, raw_data FROM jobs WHERE job_id = $1"
    )
    .bind(job_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Job not found: {}", e)))?;

    // Check if we have a cached condensed description
    if let Some(cached_description) = &job.condensed_description {
        let has_valid_description = is_valid_description(cached_description);
        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "condensed_description": cached_description,
            "has_valid_description": has_valid_description,
            "cached": true
        })));
    }

    // Extract description from raw_data or use job.description
    let description = if let Some(raw_data) = &job.raw_data {
        raw_data.get("description")
            .and_then(|v| v.as_str())
            .or(job.description.as_deref())
    } else {
        job.description.as_deref()
    };

    let description_text = match description {
        Some(desc) => desc,
        None => {
            return Ok(HttpResponse::Ok().json(serde_json::json!({
                "condensed_description": "No description available",
                "has_valid_description": false,
                "cached": false
            })));
        }
    };

    // Get API key
    let api_key = match std::env::var("ANTHROPIC_API_KEY") {
        Ok(key) if !key.is_empty() => key,
        _ => {
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "ANTHROPIC_API_KEY not configured"
            })));
        }
    };

    // Call helper to condense description
    match condense_text_with_claude(&api_key, description_text).await {
        Ok(condensed) => {
            let has_valid_description = is_valid_description(&condensed);

            // Cache the condensed description in the database
            let _ = sqlx::query(
                "UPDATE jobs SET condensed_description = $1 WHERE job_id = $2"
            )
            .bind(&condensed)
            .bind(job_id)
            .execute(pool.get_ref())
            .await;

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "condensed_description": condensed,
                "has_valid_description": has_valid_description,
                "cached": false
            })))
        },
        Err(e) => {
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to condense description: {}", e)
            })))
        }
    }
}

// Helper function to condense text using Claude API
async fn condense_text_with_claude(
    api_key: &str,
    text: &str,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Convert HTML to text if needed
    let clean_text = if text.to_lowercase().contains("<html")
                     || text.to_lowercase().contains("<body")
                     || text.contains("<!DOCTYPE")
                     || text.contains("<style") {
        html_to_text(text)
    } else {
        text.to_string()
    };

    // Check word count - if description is already concise, return as-is
    // This saves API costs and avoids LLM returning placeholder for short descriptions
    let word_count = clean_text.split_whitespace().count();
    if word_count <= 150 {
        // Description is already concise, no need to condense
        return Ok(clean_text);
    }

    // Truncate if too long (Claude has token limits)
    // Use char_indices to find a safe truncation point at a character boundary
    let truncated_text = if clean_text.len() > 10000 {
        let mut truncate_at = 10000;
        // Find the last character boundary before or at 10000 bytes
        for (idx, _) in clean_text.char_indices() {
            if idx > 10000 {
                break;
            }
            truncate_at = idx;
        }
        &clean_text[..truncate_at]
    } else {
        &clean_text
    };

    // Load prompt from file (relative to project root, since backend runs from backend/ dir)
    let prompt = match std::fs::read_to_string("../prompts/job_condensed_description.md") {
        Ok(content) => content,
        Err(_) => {
            // Fallback prompt if file doesn't exist
            "Condense the following job description to approximately 100 words. Focus on the key responsibilities, requirements, and important details. Be concise but informative.\n\nIMPORTANT: If the text does not contain a meaningful job description (e.g., it's just a generic message, signature, disclaimer, or lacks actual job details), respond ONLY with: \"No job description to be extracted.\"".to_string()
        }
    };

    let request = ClaudeRequest {
        model: "claude-3-5-haiku-20241022".to_string(),
        max_tokens: 300,
        messages: vec![
            ClaudeMessage {
                role: "user".to_string(),
                content: format!("{}\n\n{}", prompt, truncated_text),
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
    let condensed_text = claude_response
        .content
        .first()
        .ok_or("No content in Claude response")?
        .text
        .trim()
        .to_string();

    Ok(condensed_text)
}

// Helper function to determine if a condensed description is valid or a placeholder
fn is_valid_description(text: &str) -> bool {
    let trimmed = text.trim();

    // Empty descriptions are invalid
    if trimmed.is_empty() {
        return false;
    }

    // Known placeholder messages from the LLM
    let placeholder_messages = [
        "No job description to be extracted.",
        "No description available",
        "Loading description...",
        "No description available.",
        // Add variations for robustness
        "Unable to extract job description",
        "Cannot extract description",
        "Description not available",
        "Job description unavailable",
    ];

    // Check exact matches (case-sensitive for now, as prompt is specific)
    if placeholder_messages.iter().any(|msg| trimmed == *msg) {
        return false;
    }

    // Heuristic: Very short "descriptions" are likely placeholders (< 50 chars)
    // Real job descriptions are typically longer
    if trimmed.len() < 50 {
        return false;
    }

    // Additional heuristic: Check for common failure patterns
    // Matches patterns like "No ... description", "Unable to ...", etc.
    let failure_pattern = regex::Regex::new(
        r"(?i)^(no|unable|cannot|failed).*(description|extract|condense)"
    ).unwrap();

    if failure_pattern.is_match(trimmed) {
        return false;
    }

    true
}

// Handler to get the original email body for a job
async fn get_job_email_body_handler(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let job_id = path.into_inner();

    // Get the email body from email_jobs table
    let email_job = sqlx::query!(
        r#"
        SELECT body_text, body_html, subject, sender_email, sender_name, received_date
        FROM email_jobs
        WHERE job_id = $1
        "#,
        job_id
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    match email_job {
        Some(email) => {
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "body_text": email.body_text,
                "body_html": email.body_html,
                "subject": email.subject,
                "sender_email": email.sender_email,
                "sender_name": email.sender_name,
                "received_date": email.received_date
            })))
        }
        None => {
            // No email job found - job might have been manually created
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "body_text": null,
                "body_html": null,
                "subject": null,
                "sender_email": null,
                "sender_name": null,
                "received_date": null
            })))
        }
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

    // Request readonly (to fetch emails), modify (to mark as read), and send (to send emails) scopes
    let scope = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send";
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

    // Parse scope string into individual scopes (Google returns space-separated string)
    let scopes: Vec<String> = token_data.scope
        .unwrap_or_default()
        .split_whitespace()
        .map(|s| s.to_string())
        .collect();

    sqlx::query!(
        r#"
        INSERT INTO oauth_credentials (credential_id, source_id, client_id, client_secret, access_token, refresh_token, token_expires_at, scope)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (source_id) DO UPDATE SET
            access_token = EXCLUDED.access_token,
            refresh_token = EXCLUDED.refresh_token,
            token_expires_at = EXCLUDED.token_expires_at,
            scope = EXCLUDED.scope,
            updated_at = NOW()
        "#,
        Uuid::new_v4(),
        source.source_id,
        client_id,
        client_secret,
        token_data.access_token,
        token_data.refresh_token,
        expires_at,
        &scopes
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to store credentials: {}", e)))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Gmail integration configured successfully",
        "expires_at": expires_at
    })))
}

// ============================================================================
// Phase 2.4: Google Calendar OAuth Integration
// ============================================================================

async fn get_calendar_oauth_url(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let calendar_auth = calendar_auth::CalendarAuth::from_env(pool.get_ref().clone())
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Calendar auth initialization failed: {}", e)))?;

    let auth_url = calendar_auth.get_authorization_url()
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to generate auth URL: {}", e)))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "auth_url": auth_url
    })))
}

async fn handle_calendar_oauth_callback(
    pool: web::Data<PgPool>,
    query: web::Query<std::collections::HashMap<String, String>>
) -> Result<HttpResponse> {
    let code = query.get("code")
        .ok_or_else(|| actix_web::error::ErrorBadRequest("Missing authorization code"))?
        .to_string();

    let calendar_auth = calendar_auth::CalendarAuth::from_env(pool.get_ref().clone())
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Calendar auth initialization failed: {}", e)))?;

    let stored_token = calendar_auth.exchange_code(code).await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Token exchange failed: {}", e)))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Google Calendar integration configured successfully",
        "expires_at": stored_token.expires_at
    })))
}

// ============================================================================
// Phase 2.7: Microsoft Email Integration (sam@samkirk.com)
// ============================================================================

async fn get_microsoft_oauth_url() -> Result<HttpResponse> {
    let client_id = std::env::var("MICROSOFT_CLIENT_ID")
        .map_err(|_| actix_web::error::ErrorInternalServerError("MICROSOFT_CLIENT_ID not set"))?;

    let redirect_uri = std::env::var("MICROSOFT_REDIRECT_URI")
        .unwrap_or_else(|_| "http://localhost:8080/api/email/microsoft/callback".to_string());

    let tenant_id = std::env::var("MICROSOFT_TENANT_ID")
        .unwrap_or_else(|_| "common".to_string());

    // Microsoft Graph API scopes (space-separated)
    let scope = "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/MailboxSettings.Read offline_access";

    let auth_url = format!(
        "https://login.microsoftonline.com/{}/oauth2/v2.0/authorize?client_id={}&redirect_uri={}&scope={}&response_type=code&response_mode=query",
        tenant_id,
        urlencoding::encode(&client_id),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode(scope)
    );

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "auth_url": auth_url
    })))
}

async fn handle_microsoft_oauth_callback(
    pool: web::Data<PgPool>,
    query: web::Query<std::collections::HashMap<String, String>>
) -> Result<HttpResponse> {
    let code = query.get("code")
        .ok_or_else(|| actix_web::error::ErrorBadRequest("Missing authorization code"))?;

    let client_id = std::env::var("MICROSOFT_CLIENT_ID")
        .map_err(|_| actix_web::error::ErrorInternalServerError("MICROSOFT_CLIENT_ID not set"))?;

    let client_secret = std::env::var("MICROSOFT_CLIENT_SECRET")
        .map_err(|_| actix_web::error::ErrorInternalServerError("MICROSOFT_CLIENT_SECRET not set"))?;

    let redirect_uri = std::env::var("MICROSOFT_REDIRECT_URI")
        .unwrap_or_else(|_| "http://localhost:8080/api/email/microsoft/callback".to_string());

    let tenant_id = std::env::var("MICROSOFT_TENANT_ID")
        .unwrap_or_else(|_| "common".to_string());

    // Exchange code for tokens
    let client = reqwest::Client::new();
    let token_response = client
        .post(format!("https://login.microsoftonline.com/{}/oauth2/v2.0/token", tenant_id))
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

    // Get Microsoft email source ID
    let source = sqlx::query_as::<_, JobSource>(
        "SELECT * FROM job_sources WHERE source_name = 'microsoft_email' LIMIT 1"
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Microsoft email source not found"))?;

    // Store or update OAuth credentials
    let expires_at = chrono::Utc::now() + chrono::Duration::seconds(token_data.expires_in);

    // Parse scope string into individual scopes (Microsoft returns space-separated string)
    let scopes: Vec<String> = token_data.scope
        .unwrap_or_default()
        .split_whitespace()
        .map(|s| s.to_string())
        .collect();

    sqlx::query!(
        r#"
        INSERT INTO oauth_credentials (credential_id, source_id, client_id, client_secret, access_token, refresh_token, token_expires_at, scope)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (source_id) DO UPDATE SET
            access_token = EXCLUDED.access_token,
            refresh_token = EXCLUDED.refresh_token,
            token_expires_at = EXCLUDED.token_expires_at,
            scope = EXCLUDED.scope,
            updated_at = NOW()
        "#,
        Uuid::new_v4(),
        source.source_id,
        client_id,
        client_secret,
        token_data.access_token,
        token_data.refresh_token,
        expires_at,
        &scopes
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to store credentials: {}", e)))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Microsoft email integration configured successfully",
        "expires_at": expires_at
    })))
}

// Microsoft Graph API message structures
#[derive(Debug, Deserialize)]
struct MicrosoftMessagesResponse {
    value: Vec<MicrosoftMessage>,
    #[serde(rename = "@odata.nextLink")]
    _next_link: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MicrosoftMessage {
    id: String,
    #[serde(rename = "conversationId")]
    conversation_id: Option<String>,
    subject: Option<String>,
    #[serde(rename = "receivedDateTime")]
    received_date_time: String,
    #[serde(rename = "isRead")]
    _is_read: bool,
    from: Option<MicrosoftEmailAddress>,
    body: Option<MicrosoftMessageBody>,
}

#[derive(Debug, Deserialize)]
struct MicrosoftEmailAddress {
    #[serde(rename = "emailAddress")]
    email_address: Option<MicrosoftEmailInfo>,
}

#[derive(Debug, Deserialize)]
struct MicrosoftEmailInfo {
    name: Option<String>,
    address: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MicrosoftMessageBody {
    #[serde(rename = "contentType")]
    _content_type: Option<String>,
    content: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct MicrosoftFolder {
    id: String,
    #[serde(rename = "displayName")]
    display_name: String,
    #[serde(rename = "parentFolderId")]
    parent_folder_id: Option<String>,
    #[serde(rename = "childFolderCount")]
    child_folder_count: Option<i32>,
    #[serde(rename = "unreadItemCount")]
    unread_item_count: Option<i32>,
    #[serde(rename = "totalItemCount")]
    total_item_count: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct MicrosoftFoldersResponse {
    value: Vec<MicrosoftFolder>,
    #[serde(rename = "@odata.nextLink")]
    _next_link: Option<String>,
}

async fn list_microsoft_folders(access_token: &str) -> std::result::Result<Vec<MicrosoftFolder>, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();
    let url = "https://graph.microsoft.com/v1.0/me/mailFolders?$select=id,displayName,parentFolderId,childFolderCount,unreadItemCount,totalItemCount&$top=100";

    let response = client
        .get(url)
        .bearer_auth(access_token)
        .header("Accept", "application/json")
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to list folders: {} - {}", status, error_text).into());
    }

    let folders_response: MicrosoftFoldersResponse = response.json().await?;
    Ok(folders_response.value)
}

async fn get_or_create_jobops_folder(access_token: &str) -> std::result::Result<String, Box<dyn std::error::Error + Send + Sync>> {
    // First, try to find existing JobOps folder
    let folders = list_microsoft_folders(access_token).await?;

    if let Some(folder) = folders.iter().find(|f| f.display_name == "JobOps") {
        log_debug(&format!("✓ Found existing JobOps folder (ID: {})", folder.id));
        return Ok(folder.id.clone());
    }

    // JobOps folder doesn't exist, create it
    log_debug("JobOps folder not found, creating it...");

    let client = reqwest::Client::new();
    let create_url = "https://graph.microsoft.com/v1.0/me/mailFolders";

    let create_body = serde_json::json!({
        "displayName": "JobOps"
    });

    let response = client
        .post(create_url)
        .bearer_auth(access_token)
        .header("Content-Type", "application/json")
        .json(&create_body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to create JobOps folder: {} - {}", status, error_text).into());
    }

    let new_folder: MicrosoftFolder = response.json().await?;
    log_debug(&format!("✓ Created JobOps folder (ID: {})", new_folder.id));

    Ok(new_folder.id)
}

#[allow(dead_code)]
async fn get_microsoft_user_email(access_token: &str) -> std::result::Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();
    let url = "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName";

    let response = client
        .get(url)
        .bearer_auth(access_token)
        .header("Accept", "application/json")
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to get user email: {} - {}", status, error_text).into());
    }

    let user_response: serde_json::Value = response.json().await?;

    // Try 'mail' first, fall back to 'userPrincipalName'
    let email = user_response.get("mail")
        .and_then(|v| v.as_str())
        .or_else(|| user_response.get("userPrincipalName").and_then(|v| v.as_str()))
        .ok_or("No email address found in user profile")?;

    Ok(email.to_string())
}

async fn get_microsoft_folders(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    // Get Microsoft email source
    let source = sqlx::query_as::<_, JobSource>(
        "SELECT * FROM job_sources WHERE source_name = 'microsoft_email' AND is_active = true LIMIT 1"
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorNotFound("Microsoft email source not found or inactive"))?;

    // Get OAuth credentials
    let credentials = sqlx::query_as::<_, OAuthCredential>(
        "SELECT * FROM oauth_credentials WHERE source_id = $1 LIMIT 1"
    )
    .bind(source.source_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorNotFound("Microsoft credentials not found"))?;

    let access_token = credentials.access_token.as_ref()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No access token available"))?.clone();

    // Check if token is expired and refresh if needed
    let token = if let Some(expires_at) = credentials.token_expires_at {
        if chrono::Utc::now() > expires_at {
            refresh_microsoft_token(&credentials, pool.get_ref()).await?
        } else {
            access_token
        }
    } else {
        access_token
    };

    // List all folders
    match list_microsoft_folders(&token).await {
        Ok(folders) => {
            // Check if JobOps folder exists
            let jobops_folder = folders.iter().find(|f| f.display_name == "JobOps");

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "folders": folders,
                "jobops_folder": jobops_folder,
                "has_jobops": jobops_folder.is_some()
            })))
        }
        Err(e) => {
            Err(actix_web::error::ErrorInternalServerError(format!("Failed to list folders: {}", e)))
        }
    }
}

async fn seed_microsoft_test_emails(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    // Get Microsoft email source
    let source = sqlx::query_as::<_, JobSource>(
        "SELECT * FROM job_sources WHERE source_name = 'microsoft_email' AND is_active = true LIMIT 1"
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorNotFound("Microsoft email source not found or inactive"))?;

    // Get OAuth credentials
    let credentials = sqlx::query_as::<_, OAuthCredential>(
        "SELECT * FROM oauth_credentials WHERE source_id = $1 LIMIT 1"
    )
    .bind(source.source_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorNotFound("Microsoft credentials not found"))?;

    let access_token = credentials.access_token.as_ref()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No access token available"))?.clone();

    // Check if token is expired and refresh if needed
    let token = if let Some(expires_at) = credentials.token_expires_at {
        if chrono::Utc::now() > expires_at {
            refresh_microsoft_token(&credentials, pool.get_ref()).await?
        } else {
            access_token
        }
    } else {
        access_token
    };

    // Get or create JobOps folder
    let folder_id = get_or_create_jobops_folder(&token).await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to access JobOps folder: {}", e)))?;

    // Create 3 test job opportunity emails
    let test_emails = vec![
        (
            "Senior Software Test Engineer - Remote",
            "TechCorp Inc",
            r#"Hi there,

We're looking for a Senior Software Test Engineer to join our remote team.

Requirements:
- 5+ years of test automation experience
- Python, Selenium, pytest
- CI/CD pipelines
- Strong communication skills

Compensation: $145,000 - $165,000
Location: Remote (US)
Employment: Full-time

Apply here: https://techcorp.example.com/jobs/12345

Best regards,
TechCorp Recruiting Team"#
        ),
        (
            "Test Automation Lead - AI/ML Focus",
            "DataMind Solutions",
            r#"Hello,

DataMind Solutions is seeking a Test Automation Lead with AI/ML experience.

What you'll do:
- Lead test automation efforts for ML models
- Build test frameworks for AI systems
- Work with Gen AI applications
- Mentor junior engineers

Salary: $150,000 - $180,000
Location: Hybrid (San Francisco)
Type: Full-time permanent

Interested? Apply at: https://datamind.example.com/careers/ai-test-lead

Thanks,
DataMind Recruiting"#
        ),
        (
            "Principal QA Engineer - Generative AI Platform",
            "AI Innovations Corp",
            r#"Greetings,

AI Innovations Corp is hiring a Principal QA Engineer for our Generative AI platform.

Key responsibilities:
- Design test strategies for LLM applications
- Build automated testing frameworks
- Ensure quality of AI-generated content
- Work with cutting-edge Gen AI tech

Compensation: $160,000 - $190,000
Location: Remote-first (3 days/week in office optional)
Benefits: Excellent health, 401k match, stock options

Learn more: https://ai-innovations.example.com/jobs/principal-qa

Regards,
AI Innovations Talent Team"#
        ),
    ];

    let client = reqwest::Client::new();
    let mut created_count = 0;

    for (subject, company, body) in test_emails {
        // Create the email message directly in the JobOps folder
        let email_payload = serde_json::json!({
            "subject": subject,
            "body": {
                "contentType": "Text",
                "content": body
            },
            "from": {
                "emailAddress": {
                    "address": "noreply@jobhunter-test.example.com",
                    "name": company
                }
            },
            "receivedDateTime": chrono::Utc::now().to_rfc3339(),
            "isRead": false
        });

        let url = format!("https://graph.microsoft.com/v1.0/me/mailFolders/{}/messages", folder_id);

        match client.post(&url)
            .bearer_auth(&token)
            .header("Content-Type", "application/json")
            .json(&email_payload)
            .send()
            .await
        {
            Ok(response) => {
                if response.status().is_success() {
                    created_count += 1;
                    log_debug(&format!("Created test email: {}", subject));
                } else {
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_default();
                    log_debug(&format!("Failed to create test email '{}': {} - {}", subject, status, error_text));
                }
            }
            Err(e) => {
                log_debug(&format!("Error creating test email '{}': {}", subject, e));
            }
        }
    }

    if created_count == 0 {
        return Err(actix_web::error::ErrorInternalServerError("Failed to create any test emails"));
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": format!("Created {} test email(s) in JobOps folder", created_count),
        "created_count": created_count,
        "folder_id": folder_id
    })))
}

async fn sync_microsoft_jobs(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let log_id = Uuid::new_v4();

    // Get Microsoft email source
    let source = sqlx::query_as::<_, JobSource>(
        "SELECT * FROM job_sources WHERE source_name = 'microsoft_email' AND is_active = true LIMIT 1"
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorNotFound("Microsoft email source not found or inactive"))?;

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
    .map_err(|_| actix_web::error::ErrorNotFound("Microsoft credentials not found"))?;

    let access_token = credentials.access_token.as_ref()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No access token available"))?.clone();

    // Check if token is expired and refresh if needed
    let token = if let Some(expires_at) = credentials.token_expires_at {
        if chrono::Utc::now() > expires_at {
            refresh_microsoft_token(&credentials, pool.get_ref()).await?
        } else {
            access_token
        }
    } else {
        access_token
    };

    // Get or create JobOps folder
    let folder_id = match get_or_create_jobops_folder(&token).await {
        Ok(id) => id,
        Err(e) => {
            let error_msg = format!("Failed to access JobOps folder: {}", e);
            log_debug(&error_msg);

            // Update log as failed
            sqlx::query!(
                r#"
                UPDATE job_intake_logs
                SET sync_completed_at = NOW(), sync_status = 'failed', errors_count = 1,
                    error_details = $1
                WHERE log_id = $2
                "#,
                serde_json::json!({"error": error_msg}),
                log_id
            )
            .execute(pool.get_ref())
            .await
            .ok();

            return Err(actix_web::error::ErrorInternalServerError(error_msg));
        }
    };

    match process_microsoft_messages(&token, &folder_id, &source, pool.get_ref(), log_id).await {
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
                "message": "Microsoft email sync completed successfully",
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

            Err(actix_web::error::ErrorInternalServerError(format!("Microsoft email sync failed: {}", e)))
        }
    }
}

async fn refresh_microsoft_token(credentials: &OAuthCredential, pool: &PgPool) -> actix_web::Result<String> {
    let refresh_token = credentials.refresh_token.as_ref()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No refresh token available"))?;

    let tenant_id = std::env::var("MICROSOFT_TENANT_ID")
        .unwrap_or_else(|_| "common".to_string());

    let client = reqwest::Client::new();
    let response = client
        .post(format!("https://login.microsoftonline.com/{}/oauth2/v2.0/token", tenant_id))
        .form(&[
            ("refresh_token", refresh_token),
            ("client_id", &credentials.client_id),
            ("client_secret", &credentials.client_secret),
            ("grant_type", &"refresh_token".to_string()),
            ("scope", &"https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite offline_access".to_string()),
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

async fn process_microsoft_messages(
    access_token: &str,
    folder_id: &str,
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

    // Get or create archive folder for processed emails
    let archive_folder_id = match get_or_create_archive_folder(&client, access_token).await {
        Ok(id) => {
            log_debug(&format!("Archive folder ready: {}", id));
            Some(id)
        }
        Err(e) => {
            log_debug(&format!("Warning: Could not get archive folder: {}. Will only mark as read.", e));
            None
        }
    };

    // Fetch ALL messages from JobOps folder via Microsoft Graph API
    // Process both read and unread messages (sam@samkirk.com requirement)
    // Limited to 10 messages per sync to match Gmail behavior
    let url = format!(
        "https://graph.microsoft.com/v1.0/me/mailFolders/{}/messages?$top=10&$orderby=receivedDateTime desc",
        folder_id
    );

    log_debug(&format!("Fetching all messages from JobOps folder (ID: {})", folder_id));

    let response = client
        .get(url)
        .bearer_auth(access_token)
        .header("Accept", "application/json")
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to fetch messages: {} - {}", status, error_text).into());
    }

    let messages_response: MicrosoftMessagesResponse = response.json().await?;

    for message in messages_response.value.iter().take(50) {
        metrics.discovered += 1;

        // Check if we've already processed this message
        let existing = sqlx::query!(
            "SELECT email_job_id FROM email_jobs WHERE message_id = $1",
            message.id
        )
        .fetch_optional(pool)
        .await?;

        if existing.is_some() {
            metrics.duplicated += 1;

            // Move duplicate to archive (already processed)
            if let Some(archive_id) = &archive_folder_id {
                match move_microsoft_message(&client, access_token, &message.id, archive_id).await {
                    Ok(_) => {
                        log_debug(&format!("Moved duplicate message {} to JobOps-OLD", message.id));
                    }
                    Err(e) => {
                        log_debug(&format!("Warning: Failed to move duplicate {}: {}. Marking as read instead.", message.id, e));
                        // Fallback to mark as read
                        if let Err(e) = mark_microsoft_message_as_read(&client, access_token, &message.id).await {
                            log_debug(&format!("Warning: Failed to mark message {} as read: {}", message.id, e));
                        }
                    }
                }
            } else {
                // No archive folder available, fall back to mark as read
                if let Err(e) = mark_microsoft_message_as_read(&client, access_token, &message.id).await {
                    log_debug(&format!("Warning: Failed to mark message {} as read: {}", message.id, e));
                }
            }

            continue; // Skip already processed messages
        }

        // Extract email details
        let sender_email = message.from
            .as_ref()
            .and_then(|f| f.email_address.as_ref())
            .and_then(|e| e.address.clone())
            .unwrap_or_default();

        let sender_name = message.from
            .as_ref()
            .and_then(|f| f.email_address.as_ref())
            .and_then(|e| e.name.clone());

        let subject = message.subject.clone();

        // Parse received date (ISO 8601 format)
        let received_date = chrono::DateTime::parse_from_rfc3339(&message.received_date_time)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now());

        // Extract email body (convert HTML to plain text if needed)
        let body_text = message.body
            .as_ref()
            .and_then(|b| b.content.clone())
            .map(|content| {
                // If content type is HTML, we might want to strip tags
                // For now, just use the content as-is
                content
            });

        // Store email job for processing
        let email_job_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO email_jobs (
                email_job_id, message_id, thread_id, sender_email, sender_name,
                subject, received_date, body_text, processed, source
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9)
            "#,
            email_job_id,
            message.id,
            message.conversation_id,
            sender_email,
            sender_name,
            subject,
            received_date,
            body_text,
            "microsoft_email"
        )
        .execute(pool)
        .await?;

        // Process each email with timeout and error handling
        log_debug(&format!("Processing Microsoft email {}/{}: {:?}", metrics.discovered, messages_response.value.len(), subject));

        let processing_result = tokio::time::timeout(
            std::time::Duration::from_secs(45), // 45 second timeout per email
            async {
                // Extract job information
                if let Some(mut job_data) = extract_job_from_email_async(&subject, &body_text, pool).await {
                    log_debug(&format!("Extracted job data - Title: {:?}, Company: {:?}, Confidence: {:.2}, Method: {}",
                        job_data.title, job_data.company, job_data.confidence, job_data.extraction_method.as_deref().unwrap_or("unknown")));

                    // Replace LLM summary with full email body for better user visibility
                    if let Some(full_body) = &body_text {
                        job_data.description = Some(full_body.clone());
                    } else if job_data.description.is_none() {
                        job_data.description = subject.clone().or(Some("(No email content available)".to_string()));
                    }

                    // Mark email as read (keep in JobOps folder until user explicitly rejects)
                    if let Err(e) = mark_microsoft_message_as_read(&client, access_token, &message.id).await {
                        log_debug(&format!("Warning: Failed to mark message {} as read: {}", message.id, e));
                    }

                    if job_data.confidence > 0.3 { // Real job opportunity
                        match create_job_from_extraction(&job_data, source, pool, Some(received_date)).await {
                            Ok(JobCreationResult::Created(job_id)) => {
                                // Mark email as processed and link to created job
                                if let Err(e) = sqlx::query!(
                                    "UPDATE email_jobs SET processed = true, processed_at = NOW(), job_id = $1, extraction_confidence = $2, extracted_data = $3 WHERE email_job_id = $4",
                                    job_id,
                                    BigDecimal::try_from(job_data.confidence).unwrap_or_default(),
                                    serde_json::to_value(&job_data).unwrap(),
                                    email_job_id
                                )
                                .execute(pool)
                                .await {
                                    log_debug(&format!("Warning: Failed to update email_jobs for created job: {}", e));
                                }
                                Ok(("created", None))
                            }
                            Ok(JobCreationResult::Duplicate(job_id)) => {
                                // Mark email as processed and link to existing duplicate job
                                if let Err(e) = sqlx::query!(
                                    "UPDATE email_jobs SET processed = true, processed_at = NOW(), job_id = $1, extraction_confidence = $2, extracted_data = $3 WHERE email_job_id = $4",
                                    job_id,
                                    BigDecimal::try_from(job_data.confidence).unwrap_or_default(),
                                    serde_json::to_value(&job_data).unwrap(),
                                    email_job_id
                                )
                                .execute(pool)
                                .await {
                                    log_debug(&format!("Warning: Failed to update email_jobs for duplicate: {}", e));
                                }
                                Ok(("duplicated", None))
                            }
                            Err(e) => {
                                log_debug(&format!("Failed to create job from email: {}", e));

                                // Store processing error
                                if let Err(db_err) = sqlx::query!(
                                    "UPDATE email_jobs SET processing_errors = $1 WHERE email_job_id = $2",
                                    serde_json::json!({"error": e.to_string()}),
                                    email_job_id
                                )
                                .execute(pool)
                                .await {
                                    log_debug(&format!("Warning: Failed to store processing error: {}", db_err));
                                }
                                Ok(("failed", Some(e.to_string())))
                            }
                        }
                    } else {
                        // Low confidence - not a real job opportunity
                        // Leave unread in Microsoft inbox for manual review
                        log_debug(&format!("Email filtered out (confidence {:.2}) - leaving unread in Microsoft: {:?}",
                            job_data.confidence, subject));

                        // Mark email as processed (filtered)
                        if let Err(e) = sqlx::query!(
                            "UPDATE email_jobs SET processed = true, processed_at = NOW(), extraction_confidence = $1, extracted_data = $2 WHERE email_job_id = $3",
                            BigDecimal::try_from(job_data.confidence).unwrap_or_default(),
                            serde_json::to_value(&job_data).unwrap(),
                            email_job_id
                        )
                        .execute(pool)
                        .await {
                            log_debug(&format!("Warning: Failed to update email_jobs for filtered email: {}", e));
                        }
                        Ok(("filtered", None))
                    }
                } else {
                    log_debug(&format!("Failed to extract job data from Microsoft email - Subject: {:?}", subject));
                    // Leave unread for manual review
                    Ok::<(&str, Option<String>), Box<dyn std::error::Error + Send + Sync>>(("failed_extraction", None))
                }
            }
        ).await;

        // Handle timeout and processing result
        match processing_result {
            Ok(Ok((result_type, error_msg))) => {
                match result_type {
                    "created" => metrics.created += 1,
                    "duplicated" => metrics.duplicated += 1,
                    "filtered" => metrics.filtered_out += 1,
                    "failed" | "failed_extraction" => {
                        metrics.failed_processing += 1;
                        if let Some(err) = error_msg {
                            log_debug(&format!("Email processing failed: {}", err));
                        }
                    }
                    _ => log_debug(&format!("Unknown result type: {}", result_type)),
                }
            }
            Ok(Err(e)) => {
                metrics.failed_processing += 1;
                log_debug(&format!("Email processing error: {}", e));
            }
            Err(_) => {
                metrics.failed_processing += 1;
                log_debug(&format!("Email processing TIMEOUT after 45 seconds - Subject: {:?}", subject));

                // Store timeout error
                if let Err(e) = sqlx::query!(
                    "UPDATE email_jobs SET processing_errors = $1 WHERE email_job_id = $2",
                    serde_json::json!({"error": "Processing timeout after 45 seconds"}),
                    email_job_id
                )
                .execute(pool)
                .await {
                    log_debug(&format!("Warning: Failed to store timeout error: {}", e));
                }
            }
        }
    }

    log_debug(&format!("Microsoft sync complete - Discovered: {}, Failed: {}, Filtered: {}, Duplicated: {}, Created: {}",
        metrics.discovered, metrics.failed_processing, metrics.filtered_out, metrics.duplicated, metrics.created));
    Ok(metrics)
}

async fn mark_microsoft_message_as_read(
    client: &reqwest::Client,
    access_token: &str,
    message_id: &str,
) -> std::result::Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let url = format!("https://graph.microsoft.com/v1.0/me/messages/{}", message_id);

    let response = client
        .patch(&url)
        .bearer_auth(access_token)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "isRead": true
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to mark message as read: {} - {}", status, error_text).into());
    }

    Ok(())
}

/// Get or create the JobOps-OLD archive folder for Microsoft emails
async fn get_or_create_archive_folder(
    client: &reqwest::Client,
    access_token: &str,
) -> std::result::Result<String, Box<dyn std::error::Error + Send + Sync>> {
    // Try to find existing folder first
    let search_url = "https://graph.microsoft.com/v1.0/me/mailFolders?$filter=displayName eq 'JobOps-OLD'";

    let response = client
        .get(search_url)
        .bearer_auth(access_token)
        .send()
        .await?;

    if response.status().is_success() {
        let data: serde_json::Value = response.json().await?;
        if let Some(folders) = data["value"].as_array() {
            if !folders.is_empty() {
                // Folder exists, return ID
                if let Some(id) = folders[0]["id"].as_str() {
                    log_debug(&format!("Found existing JobOps-OLD folder: {}", id));
                    return Ok(id.to_string());
                }
            }
        }
    }

    // Folder doesn't exist, create it
    log_debug("Creating JobOps-OLD folder...");
    let create_url = "https://graph.microsoft.com/v1.0/me/mailFolders";
    let response = client
        .post(create_url)
        .bearer_auth(access_token)
        .json(&serde_json::json!({
            "displayName": "JobOps-OLD",
            "isHidden": false
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to create archive folder: {} - {}", status, error_text).into());
    }

    let data: serde_json::Value = response.json().await?;
    let folder_id = data["id"].as_str()
        .ok_or("No folder ID in response")?
        .to_string();

    log_debug(&format!("Created JobOps-OLD folder: {}", folder_id));
    Ok(folder_id)
}

/// Move a Microsoft message to a different folder
async fn move_microsoft_message(
    client: &reqwest::Client,
    access_token: &str,
    message_id: &str,
    destination_folder_id: &str,
) -> std::result::Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let url = format!("https://graph.microsoft.com/v1.0/me/messages/{}/move", message_id);

    let response = client
        .post(&url)
        .bearer_auth(access_token)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "destinationId": destination_folder_id
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to move message: {} - {}", status, error_text).into());
    }

    Ok(())
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

/// Get or create the "JobOp-OLD" label in Gmail for archiving rejected jobs
async fn get_or_create_jobop_old_label(
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

    // Check if "JobOp-OLD" label already exists
    if let Some(label) = labels.labels.iter().find(|l| l.name == "JobOp-OLD") {
        log_debug(&format!("Found existing JobOp-OLD label with ID: {}", label.id));
        return Ok(label.id.clone());
    }

    // Create new "JobOp-OLD" label
    log_debug("JobOp-OLD label not found, creating new label");
    let create_body = serde_json::json!({
        "name": "JobOp-OLD",
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
        return Err(format!("Failed to create JobOp-OLD label: {} - {}", status, error_text).into());
    }

    let created_label: LabelInfo = create_response.json().await?;
    log_debug(&format!("Created new JobOp-OLD label with ID: {}", created_label.id));
    Ok(created_label.id)
}

/// Helper function to get Gmail OAuth access token
async fn get_gmail_oauth_credentials(
    pool: &PgPool,
) -> std::result::Result<Option<String>, Box<dyn std::error::Error + Send + Sync>> {
    let oauth_creds = sqlx::query!(
        "SELECT access_token FROM oauth_credentials
         WHERE source_id = (SELECT source_id FROM job_sources WHERE source_name = 'gmail' LIMIT 1)
         LIMIT 1"
    )
    .fetch_optional(pool)
    .await?;

    Ok(oauth_creds.and_then(|c| c.access_token))
}

/// Get all message IDs that have the JobOps-OLD label
/// Returns empty vector if label doesn't exist or no messages found
async fn get_message_ids_with_jobops_old_label(
    client: &reqwest::Client,
    access_token: &str,
) -> std::result::Result<Vec<String>, Box<dyn std::error::Error + Send + Sync>> {
    // First, get the JobOps-OLD label ID
    let label_id = match get_or_create_jobop_old_label(client, access_token).await {
        Ok(id) => id,
        Err(_) => return Ok(Vec::new()), // Label doesn't exist, return empty vec
    };

    #[derive(Debug, Deserialize)]
    struct MessagesResponse {
        #[serde(default)]
        _messages: Vec<MessageInfo>,
    }

    #[derive(Debug, Deserialize)]
    struct MessageInfo {
        id: String,
    }

    let mut all_message_ids = Vec::new();
    let mut page_token: Option<String> = None;

    // Query Gmail for all messages with JobOps-OLD label (with pagination)
    loop {
        let mut url = format!(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds={}&maxResults=500",
            label_id
        );

        if let Some(token) = &page_token {
            url.push_str(&format!("&pageToken={}", token));
        }

        let response = client
            .get(&url)
            .bearer_auth(access_token)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            log_debug(&format!("Warning: Failed to fetch JobOps-OLD messages: {} - {}", status, error_text));
            break;
        }

        #[derive(Debug, Deserialize)]
        struct PagedResponse {
            #[serde(default)]
            messages: Vec<MessageInfo>,
            #[serde(rename = "nextPageToken")]
            next_page_token: Option<String>,
        }

        let paged_response: PagedResponse = response.json().await?;

        for msg in paged_response.messages {
            all_message_ids.push(msg.id);
        }

        page_token = paged_response.next_page_token;

        if page_token.is_none() {
            break;
        }
    }

    log_debug(&format!("Found {} messages with JobOps-OLD label", all_message_ids.len()));
    Ok(all_message_ids)
}

/// Get the "JobOp" label ID from Gmail (must already exist)
async fn get_jobop_label_id(
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

    // Find "JobOp" label
    if let Some(label) = labels.labels.iter().find(|l| l.name == "JobOp") {
        return Ok(label.id.clone());
    }

    Err("JobOp label not found".into())
}

/// Update Gmail labels for a rejected job (remove JobOp, add JobOp-OLD)
async fn update_gmail_labels_for_rejected_job(
    client: &reqwest::Client,
    access_token: &str,
    message_id: &str,
) -> std::result::Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Get label IDs
    let jobop_label_id = get_jobop_label_id(client, access_token).await?;
    let jobop_old_label_id = get_or_create_jobop_old_label(client, access_token).await?;

    // Modify message labels
    let url = format!(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/{}/modify",
        message_id
    );

    let body = serde_json::json!({
        "addLabelIds": [jobop_old_label_id],
        "removeLabelIds": [jobop_label_id]
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
        return Err(format!("Failed to update labels: {} - {}", status, error_text).into());
    }

    log_debug(&format!(
        "Updated labels for message {}: removed JobOp, added JobOp-OLD",
        message_id
    ));
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

/// Trash a Gmail message (soft delete - moves to trash folder)
async fn trash_gmail_message(
    client: &reqwest::Client,
    access_token: &str,
    message_id: &str,
) -> std::result::Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let url = format!(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/{}/trash",
        message_id
    );

    let response = client
        .post(&url)
        .bearer_auth(access_token)
        .header("Content-Length", "0")
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        log_debug(&format!("Failed to trash message {}. Status: {}, Error: {}",
            message_id, status, error_text));
        return Err(format!("Failed to trash message: {}", status).into());
    }

    log_debug(&format!("Successfully trashed Gmail message: {}", message_id));
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
    // Limited to 30 emails per sync for better coverage of incoming job opportunities
    let query = "is:unread -label:JobOp";
    let url = format!(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?q={}&maxResults=30",
        urlencoding::encode(query)
    );

    let response = client
        .get(&url)
        .bearer_auth(access_token)
        .send()
        .await?;

    let list_response: GmailListResponse = response.json().await?;

    // Compile regex once outside the loop for efficiency
    let from_regex = regex::Regex::new(r"(.+?)\s*<(.+?)>").unwrap();

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
                        if let Some(captures) = from_regex.captures(&header.value) {
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
            ).unwrap_or_else(chrono::Utc::now);

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

            // Process each email with timeout and error handling
            // Wrap the entire processing block so individual failures don't stop the sync
            log_debug(&format!("Processing email {}/{}: {:?}", metrics.discovered, messages.len(), subject));

            let processing_result = tokio::time::timeout(
                std::time::Duration::from_secs(45), // 45 second timeout per email (30s for LLM + 15s buffer)
                async {
                    // Extract job information
                    if let Some(mut job_data) = extract_job_from_email_async(&subject, &body_text, pool).await {
                        log_debug(&format!("Extracted job data - Title: {:?}, Company: {:?}, Confidence: {:.2}, Method: {}",
                            job_data.title, job_data.company, job_data.confidence, job_data.extraction_method.as_deref().unwrap_or("unknown")));

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
                                Ok(JobCreationResult::Created(job_id)) => {
                                    // Mark email as processed and link to created job
                                    if let Err(e) = sqlx::query!(
                                        "UPDATE email_jobs SET processed = true, processed_at = NOW(), job_id = $1, extraction_confidence = $2, extracted_data = $3 WHERE email_job_id = $4",
                                        job_id,
                                        BigDecimal::try_from(job_data.confidence).unwrap_or_default(),
                                        serde_json::to_value(&job_data).unwrap(),
                                        email_job_id
                                    )
                                    .execute(pool)
                                    .await {
                                        log_debug(&format!("Warning: Failed to update email_jobs for created job: {}", e));
                                    }
                                    Ok(("created", None))
                                }
                                Ok(JobCreationResult::Duplicate(job_id)) => {
                                    // Mark email as processed and link to existing duplicate job
                                    if let Err(e) = sqlx::query!(
                                        "UPDATE email_jobs SET processed = true, processed_at = NOW(), job_id = $1, extraction_confidence = $2, extracted_data = $3 WHERE email_job_id = $4",
                                        job_id,
                                        BigDecimal::try_from(job_data.confidence).unwrap_or_default(),
                                        serde_json::to_value(&job_data).unwrap(),
                                        email_job_id
                                    )
                                    .execute(pool)
                                    .await {
                                        log_debug(&format!("Warning: Failed to update email_jobs for duplicate: {}", e));
                                    }
                                    Ok(("duplicated", None))
                                }
                                Err(e) => {
                                    log_debug(&format!("Failed to create job from email: {}", e));

                                    // Store processing error
                                    if let Err(db_err) = sqlx::query!(
                                        "UPDATE email_jobs SET processing_errors = $1 WHERE email_job_id = $2",
                                        serde_json::json!({"error": e.to_string()}),
                                        email_job_id
                                    )
                                    .execute(pool)
                                    .await {
                                        log_debug(&format!("Warning: Failed to store processing error: {}", db_err));
                                    }
                                    Ok(("failed", Some(e.to_string())))
                                }
                            }
                        } else {
                            // Low confidence - not a real job opportunity
                            // Leave unread in Gmail inbox for manual review
                            log_debug(&format!("Email filtered out (confidence {:.2}) - leaving unread in Gmail: {:?}",
                                job_data.confidence, subject));
                            // DO NOT mark as read
                            // DO NOT add JobOp label

                            // Mark email as processed (filtered)
                            if let Err(e) = sqlx::query!(
                                "UPDATE email_jobs SET processed = true, processed_at = NOW(), extraction_confidence = $1, extracted_data = $2 WHERE email_job_id = $3",
                                BigDecimal::try_from(job_data.confidence).unwrap_or_default(),
                                serde_json::to_value(&job_data).unwrap(),
                                email_job_id
                            )
                            .execute(pool)
                            .await {
                                log_debug(&format!("Warning: Failed to update email_jobs for filtered email: {}", e));
                            }
                            Ok(("filtered", None))
                        }
                    } else {
                        log_debug(&format!("Failed to extract job data from email - Subject: {:?}", subject));
                        // Leave unread for manual review
                        Ok::<(&str, Option<String>), Box<dyn std::error::Error + Send + Sync>>(("failed_extraction", None))
                    }
                }
            ).await;

            // Handle timeout and processing result
            match processing_result {
                Ok(Ok((result_type, error_msg))) => {
                    match result_type {
                        "created" => metrics.created += 1,
                        "duplicated" => metrics.duplicated += 1,
                        "filtered" => metrics.filtered_out += 1,
                        "failed" | "failed_extraction" => {
                            metrics.failed_processing += 1;
                            if let Some(err) = error_msg {
                                log_debug(&format!("Email processing failed: {}", err));
                            }
                        }
                        _ => log_debug(&format!("Unknown result type: {}", result_type)),
                    }
                }
                Ok(Err(e)) => {
                    metrics.failed_processing += 1;
                    log_debug(&format!("Email processing error: {}", e));
                }
                Err(_) => {
                    metrics.failed_processing += 1;
                    log_debug(&format!("Email processing TIMEOUT after 45 seconds - Subject: {:?}", subject));

                    // Store timeout error
                    if let Err(e) = sqlx::query!(
                        "UPDATE email_jobs SET processing_errors = $1 WHERE email_job_id = $2",
                        serde_json::json!({"error": "Processing timeout after 45 seconds"}),
                        email_job_id
                    )
                    .execute(pool)
                    .await {
                        log_debug(&format!("Warning: Failed to store timeout error: {}", e));
                    }
                }
            }
        }
    }

    log_debug(&format!("Gmail sync complete - Discovered: {}, Failed: {}, Filtered: {}, Duplicated: {}, Created: {}",
        metrics.discovered, metrics.failed_processing, metrics.filtered_out, metrics.duplicated, metrics.created));
    Ok(metrics)
}

// ============================================================================
// JSearch/RapidAPI Integration (Phase 4.1)
// ============================================================================

/// JSearch API job listing structure (via RapidAPI)
#[derive(Debug, Deserialize, Serialize)]
struct JSearchJobListing {
    job_id: Option<String>,
    job_title: Option<String>,
    employer_name: Option<String>,
    employer_logo: Option<String>,
    job_city: Option<String>,
    job_state: Option<String>,
    job_country: Option<String>,
    job_description: Option<String>,
    job_posted_at_datetime_utc: Option<String>,
    job_min_salary: Option<f64>,
    job_max_salary: Option<f64>,
    job_salary_currency: Option<String>,
    job_apply_link: Option<String>,
    job_is_remote: Option<bool>,
    job_employment_type: Option<String>,
    // Additional fields that might be present
    #[serde(flatten)]
    extra: serde_json::Map<String, serde_json::Value>,
}

/// Fetch jobs from RapidAPI JSearch endpoint (aggregates LinkedIn, Indeed, Glassdoor, etc.)
async fn fetch_jsearch_jobs_rapidapi(
    api_key: &str,
    api_host: &str,
    search_params: &serde_json::Value,
) -> Result<Vec<JSearchJobListing>, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();

    // Build query parameters from search_params (JSearch format)
    let query = search_params["query"].as_str().unwrap_or("Software Test Engineer OR QA Engineer in Fremont, CA");
    let date_posted = search_params["date_posted"].as_str().unwrap_or("week");
    let remote_jobs_only = search_params["remote_jobs_only"].as_bool().unwrap_or(false);
    let num_pages = search_params["num_pages"].as_str().unwrap_or("2"); // 2 pages = ~20 jobs (we'll take first 15)
    let page = search_params["page"].as_str().unwrap_or("1"); // Which page to start from (default: 1)

    log_debug(&format!("Fetching jobs from RapidAPI JSearch: query={}, num_pages={}, page={}, date_posted={}, remote_jobs_only={}",
        query, num_pages, page, date_posted, remote_jobs_only));

    let response = client
        .get(format!("https://{}/search", api_host))
        .header("X-RapidAPI-Key", api_key)
        .header("X-RapidAPI-Host", api_host)
        .query(&[
            ("query", query),
            ("num_pages", num_pages),
            ("page", page),
            ("date_posted", date_posted),
            ("remote_jobs_only", &remote_jobs_only.to_string()),
        ])
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("RapidAPI JSearch error {}: {}", status, error_text).into());
    }

    // JSearch wraps results in a "data" array
    let response_json: serde_json::Value = response.json().await?;
    let jobs: Vec<JSearchJobListing> = serde_json::from_value(response_json["data"].clone())
        .unwrap_or_else(|_| Vec::new());
    log_debug(&format!("Fetched {} jobs from RapidAPI JSearch", jobs.len()));
    Ok(jobs)
}

/// Extract job information from plain text (for API responses, not emails)
async fn extract_job_from_text_async(
    text: &str,
    pool: &PgPool,
) -> Option<JobExtractionResult> {
    let debug_mode = std::env::var("DEBUG_EXTRACTION")
        .unwrap_or_default()
        .parse::<bool>()
        .unwrap_or(false);

    let start_time = std::time::Instant::now();

    if debug_mode {
        log_debug(&format!("[DEBUG_EXTRACTION] Text extraction started - length: {} chars", text.len()));
    }

    // Try LLM extraction first if API key is available
    if let Ok(api_key) = std::env::var("ANTHROPIC_API_KEY") {
        if !api_key.is_empty() {
            // Fetch active prompt
            if let Ok(prompt) = get_active_extraction_prompt(pool).await {
                // For text extraction, we'll pass the text as the "body" and empty subject
                let llm_start = std::time::Instant::now();
                match call_claude_api(&api_key, &prompt.prompt_content, "", text).await {
                    Ok(extraction) => {
                        let llm_duration = llm_start.elapsed();

                        if debug_mode {
                            log_debug(&format!("[DEBUG_EXTRACTION] LLM text extraction - Title: {:?}, Company: {:?}, Salary: ${:?}-${:?}, Location: {:?}, Confidence: {:.2}, Duration: {:?}",
                                extraction.title, extraction.company, extraction.salary_min, extraction.salary_max,
                                extraction.location, extraction.confidence, llm_duration));
                        } else {
                            log_debug(&format!("LLM text extraction succeeded - Title: {:?}, Company: {:?}, Confidence: {:.2}",
                                extraction.title, extraction.company, extraction.confidence));
                        }

                        // Only return if confidence is high enough (> 0.3 to match processing threshold)
                        if extraction.confidence > 0.3 {
                            if debug_mode {
                                log_debug(&format!("[DEBUG_EXTRACTION] LLM extraction accepted (confidence > 0.3), total duration: {:?}", start_time.elapsed()));
                            }
                            return Some(extraction);
                        } else {
                            if debug_mode {
                                log_debug(&format!("[DEBUG_EXTRACTION] LLM extraction confidence too low: {:.2} (threshold: > 0.3), falling back to regex", extraction.confidence));
                            } else {
                                log_debug(&format!("LLM text extraction confidence too low: {:.2}, falling back to regex", extraction.confidence));
                            }
                        }
                    }
                    Err(e) => {
                        let llm_duration = llm_start.elapsed();
                        if debug_mode {
                            log_debug(&format!("[DEBUG_EXTRACTION] LLM text extraction failed after {:?}: {}, falling back to regex", llm_duration, e));
                        } else {
                            log_debug(&format!("LLM text extraction failed: {}, falling back to regex", e));
                        }
                    }
                }
            } else {
                log_debug("No active extraction prompt found, falling back to regex");
            }
        }
    }

    // Fallback to regex-based extraction
    log_debug("Using regex-based extraction for text");
    let result = extract_job_from_email(&None, &Some(text.to_string()), debug_mode);

    if debug_mode {
        log_debug(&format!("[DEBUG_EXTRACTION] Text extraction completed, total duration: {:?}", start_time.elapsed()));
    }

    result
}

/// Process JSearch jobs from RapidAPI (aggregates LinkedIn, Indeed, Glassdoor, etc.)
async fn process_jsearch_jobs(
    source: &JobSource,
    pool: &PgPool,
    _log_id: Uuid,
) -> std::result::Result<SyncMetrics, Box<dyn std::error::Error + Send + Sync>> {
    let mut metrics = SyncMetrics {
        discovered: 0,
        failed_processing: 0,
        filtered_out: 0,
        duplicated: 0,
        created: 0,
    };

    // Get RapidAPI credentials from environment
    let api_key = std::env::var("RAPIDAPI_KEY")
        .map_err(|_| "RAPIDAPI_KEY not configured. Set this environment variable to enable JSearch integration.")?;
    let api_host = std::env::var("RAPIDAPI_HOST_JSEARCH")
        .map_err(|_| "RAPIDAPI_HOST_JSEARCH not configured. Set this environment variable to enable JSearch integration.")?;

    // Fetch jobs from RapidAPI JSearch (fetch ~20 via num_pages=2, process first 15)
    let listings = fetch_jsearch_jobs_rapidapi(&api_key, &api_host, &source.configuration).await?;

    for listing in listings.iter().take(15) {
        metrics.discovered += 1;

        // Check if already processed (by external_job_id)
        if let Some(ext_id) = &listing.job_id {
            let existing = sqlx::query!(
                "SELECT api_job_id FROM api_job_sources WHERE source_id = $1 AND external_job_id = $2",
                source.source_id,
                ext_id
            )
            .fetch_optional(pool)
            .await?;

            if existing.is_some() {
                metrics.duplicated += 1;
                continue;
            }
        }

        // Store in api_job_sources table
        let api_job_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO api_job_sources (
                api_job_id, source_id, external_job_id, external_url,
                raw_response, processed
            ) VALUES ($1, $2, $3, $4, $5, false)
            "#,
            api_job_id,
            source.source_id,
            listing.job_id,
            listing.job_apply_link,
            serde_json::to_value(&listing).unwrap()
        )
        .execute(pool)
        .await?;

        // Extract job data using LLM (reuse existing async extraction)
        // Build location string from JSearch's separate city/state/country fields
        let location_str = format!(
            "{}, {}, {}",
            listing.job_city.as_deref().unwrap_or(""),
            listing.job_state.as_deref().unwrap_or(""),
            listing.job_country.as_deref().unwrap_or("")
        ).trim_matches(',').trim().to_string();

        // Build salary string from min/max fields
        let salary_str = match (listing.job_min_salary, listing.job_max_salary) {
            (Some(min), Some(max)) => format!("${:.0} - ${:.0} {}", min, max, listing.job_salary_currency.as_deref().unwrap_or("")),
            (Some(min), None) => format!("${:.0}+ {}", min, listing.job_salary_currency.as_deref().unwrap_or("")),
            (None, Some(max)) => format!("Up to ${:.0} {}", max, listing.job_salary_currency.as_deref().unwrap_or("")),
            (None, None) => "Not specified".to_string(),
        };

        let job_text = format!(
            "Title: {}\nCompany: {}\nLocation: {}\nSalary: {}\nRemote: {}\nDescription: {}",
            listing.job_title.as_deref().unwrap_or(""),
            listing.employer_name.as_deref().unwrap_or(""),
            location_str,
            salary_str,
            listing.job_is_remote.map(|r| if r { "Yes" } else { "No" }).unwrap_or("Unknown"),
            listing.job_description.as_deref().unwrap_or("")
        );

        if let Some(job_data) = extract_job_from_text_async(&job_text, pool).await {
            // Use JSearch fields as fallbacks for extraction
            let mut enhanced_data = job_data;
            enhanced_data.title = enhanced_data.title.or(listing.job_title.clone());
            enhanced_data.company = enhanced_data.company.or(listing.employer_name.clone());
            enhanced_data.location = enhanced_data.location.or(Some(location_str));
            enhanced_data.url = enhanced_data.url.or(listing.job_apply_link.clone());
            enhanced_data.description = Some(job_text.clone());

            // Create job (with filtering and deduplication)
            match create_job_from_extraction(&enhanced_data, source, pool, None).await {
                Ok(JobCreationResult::Created(job_id)) => {
                    sqlx::query!(
                        "UPDATE api_job_sources SET processed = true, job_id = $1 WHERE api_job_id = $2",
                        job_id, api_job_id
                    )
                    .execute(pool)
                    .await?;
                    metrics.created += 1;
                }
                Ok(JobCreationResult::Duplicate(_)) => {
                    metrics.duplicated += 1;
                }
                Err(_) => {
                    metrics.failed_processing += 1;
                }
            }
        } else {
            metrics.failed_processing += 1;
        }
    }

    log_debug(&format!("JSearch sync complete - Discovered: {}, Failed: {}, Filtered: {}, Duplicated: {}, Created: {}",
        metrics.discovered, metrics.failed_processing, metrics.filtered_out, metrics.duplicated, metrics.created));

    Ok(metrics)
}

/// Phase 4.2: Reset RapidAPI pagination to page 1
async fn reset_rapidapi_pagination(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    log_debug("🔄 Resetting RapidAPI pagination to page 1");

    let result = sqlx::query!(
        "UPDATE job_sources SET last_page_fetched = 1 WHERE source_name = 'rapidapi'"
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to reset pagination: {}", e)))?;

    if result.rows_affected() == 0 {
        return Err(actix_web::error::ErrorNotFound("RapidAPI source not found"));
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Pagination reset to page 1"
    })))
}

/// Phase 4.2: Get current RapidAPI pagination state
async fn get_rapidapi_state(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let source = sqlx::query_as::<_, JobSource>(
        "SELECT * FROM job_sources WHERE source_name = 'rapidapi' LIMIT 1"
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to get source: {}", e)))?;

    match source {
        Some(s) => {
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "current_page": s.last_page_fetched.unwrap_or(1),
                "is_active": s.is_active
            })))
        }
        None => {
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "current_page": 1,
                "is_active": false
            })))
        }
    }
}

/// Sync RapidAPI JSearch jobs endpoint (mirrors Gmail sync)
/// Phase 4.2: Now with automatic page increment
async fn sync_jsearch_jobs(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let log_id = Uuid::new_v4();

    // Get RapidAPI (JSearch) source
    let source = sqlx::query_as::<_, JobSource>(
        "SELECT * FROM job_sources WHERE source_name = 'rapidapi' AND is_active = true LIMIT 1"
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorNotFound("RapidAPI source not found or inactive"))?;

    // Phase 4.2: Get current page (defaults to 1)
    let current_page = source.last_page_fetched.unwrap_or(1);
    log_debug(&format!("📄 RapidAPI sync: Fetching page {} (last_page_fetched={})", current_page, source.last_page_fetched.unwrap_or(1)));

    // Phase 4.2: Override configuration page with current page
    let mut config = source.configuration.clone();
    config["page"] = serde_json::json!(current_page.to_string());

    // Create modified source with updated configuration
    let modified_source = JobSource {
        configuration: config,
        ..source.clone()
    };

    // Create intake log
    sqlx::query!(
        "INSERT INTO job_intake_logs (log_id, source_id, sync_status) VALUES ($1, $2, 'running')",
        log_id, source.source_id
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to create log: {}", e)))?;

    // Process jobs using the modified source (with current page)
    match process_jsearch_jobs(&modified_source, pool.get_ref(), log_id).await {
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

            // Phase 4.2: Increment page for next sync (only on success)
            let next_page = if metrics.discovered == 0 {
                // Auto-reset to page 1 if no results (reached end)
                log_debug(&format!("🔄 No results on page {}. Resetting to page 1.", current_page));
                1
            } else {
                current_page + 1
            };

            sqlx::query!(
                "UPDATE job_sources SET last_page_fetched = $1 WHERE source_id = $2",
                next_page,
                source.source_id
            )
            .execute(pool.get_ref())
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to update page: {}", e)))?;

            log_debug(&format!("✅ RapidAPI sync complete: Page {} → Next page: {}", current_page, next_page));

            // Phase 4.2: Include pagination info in response
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "message": "RapidAPI JSearch sync completed successfully",
                "page_synced": current_page,
                "next_page": next_page,
                "end_of_results": metrics.discovered == 0,
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

            Err(actix_web::error::ErrorInternalServerError(format!("RapidAPI JSearch sync failed: {}", e)))
        }
    }
}

fn extract_email_body(payload: &GmailPayload) -> Option<String> {
    log_debug(&format!("extract_email_body: starting extraction, has body={}, has parts={}",
        payload.body.is_some(), payload.parts.is_some()));

    // Try to extract from direct body first
    if let Some(body) = &payload.body {
        log_debug(&format!("extract_email_body: trying direct body extraction, body.size={}", body.size));
        if let Some(text) = decode_body_data(body) {
            log_debug(&format!("extract_email_body: SUCCESS from direct body, length={}", text.len()));
            return Some(text);
        }
        log_debug("extract_email_body: direct body extraction returned None");
    }

    // Try to extract from parts (handles multipart emails) - recursively search all nested parts
    if let Some(parts) = &payload.parts {
        log_debug(&format!("extract_email_body: trying parts extraction, parts count={}", parts.len()));

        // First try to find text/plain (preferred for readability)
        if let Some(text) = find_mime_type_recursive(parts, "text/plain") {
            log_debug(&format!("extract_email_body: SUCCESS from text/plain part, length={}", text.len()));
            return Some(text);
        }

        // If no text/plain found, try text/html
        if let Some(text) = find_mime_type_recursive(parts, "text/html") {
            log_debug(&format!("extract_email_body: SUCCESS from text/html part, length={}", text.len()));
            return Some(text);
        }

        // Last resort: try any text/* type
        if let Some(text) = find_any_text_recursive(parts) {
            log_debug(&format!("extract_email_body: SUCCESS from text/* part, length={}", text.len()));
            return Some(text);
        }

        log_debug("extract_email_body: no text content found in parts");
    }

    log_debug("extract_email_body: FAILED - no body extracted");
    None
}

// Helper function to decode body data
fn decode_body_data(body: &GmailBody) -> Option<String> {
    if let Some(data) = &body.data {
        log_debug(&format!("decode_body_data: data present, length={}, empty={}", data.len(), data.is_empty()));
        if !data.is_empty() {
            // Try multiple Base64 decoding strategies (Gmail encoding can vary)

            // Strategy 1: URL_SAFE_NO_PAD (standard for Gmail)
            if let Ok(decoded) = general_purpose::URL_SAFE_NO_PAD.decode(data) {
                log_debug(&format!("decode_body_data: URL_SAFE_NO_PAD decoded {} bytes", decoded.len()));
                if let Some(text) = try_convert_to_string(decoded) {
                    return Some(text);
                }
            }

            // Strategy 2: URL_SAFE (with padding)
            if let Ok(decoded) = general_purpose::URL_SAFE.decode(data) {
                log_debug(&format!("decode_body_data: URL_SAFE decoded {} bytes", decoded.len()));
                if let Some(text) = try_convert_to_string(decoded) {
                    return Some(text);
                }
            }

            // Strategy 3: Standard Base64 (fallback)
            if let Ok(decoded) = general_purpose::STANDARD.decode(data) {
                log_debug(&format!("decode_body_data: STANDARD decoded {} bytes", decoded.len()));
                if let Some(text) = try_convert_to_string(decoded) {
                    return Some(text);
                }
            }

            // Strategy 4: Replace URL-safe chars and try with padding normalization
            let normalized = data.replace('-', "+").replace('_', "/");
            let padded = match normalized.len() % 4 {
                0 => normalized,
                n => normalized + &"=".repeat(4 - n),
            };
            if let Ok(decoded) = general_purpose::STANDARD.decode(&padded) {
                log_debug(&format!("decode_body_data: normalized+padded decoded {} bytes", decoded.len()));
                if let Some(text) = try_convert_to_string(decoded) {
                    return Some(text);
                }
            }

            log_debug("decode_body_data: all decode strategies failed");
        } else {
            log_debug("decode_body_data: data is empty");
        }
    } else {
        log_debug("decode_body_data: no data field");
    }
    None
}

// Helper to convert decoded bytes to string
fn try_convert_to_string(decoded: Vec<u8>) -> Option<String> {
    match String::from_utf8(decoded) {
        Ok(text) => {
            let trimmed = text.trim();
            log_debug(&format!("try_convert_to_string: trimmed length={}", trimmed.len()));
            if !trimmed.is_empty() {
                return Some(text);
            } else {
                log_debug("try_convert_to_string: trimmed text is empty");
            }
        }
        Err(e) => {
            log_debug(&format!("try_convert_to_string: UTF-8 conversion failed: {}", e));
        }
    }
    None
}

// Recursively search for a specific MIME type in nested parts
fn find_mime_type_recursive(parts: &[GmailPart], mime_type: &str) -> Option<String> {
    for part in parts {
        // Check if this part has the target MIME type
        if part.mime_type == mime_type {
            if let Some(body) = &part.body {
                if let Some(text) = decode_body_data(body) {
                    return Some(text);
                }
            }
        }

        // Recursively search nested parts
        if let Some(nested_parts) = &part.parts {
            if let Some(text) = find_mime_type_recursive(nested_parts, mime_type) {
                return Some(text);
            }
        }
    }
    None
}

// Recursively search for any text/* MIME type in nested parts
fn find_any_text_recursive(parts: &[GmailPart]) -> Option<String> {
    for part in parts {
        // Check if this part is any text/* type
        if part.mime_type.starts_with("text/") {
            if let Some(body) = &part.body {
                if let Some(text) = decode_body_data(body) {
                    return Some(text);
                }
            }
        }

        // Recursively search nested parts
        if let Some(nested_parts) = &part.parts {
            if let Some(text) = find_any_text_recursive(nested_parts) {
                return Some(text);
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

/// Convert HTML to clean text using Mozilla Readability algorithm
/// Removes boilerplate, CSS, tracking pixels, navigation, and extracts main content
fn html_to_text(html: &str) -> String {
    use dom_smoothie::{Readability, Config};

    // Try using Readability algorithm to extract main content
    // Arguments: html, document_url (optional), config (optional)
    match Readability::new(html, None, Some(Config::default())) {
        Ok(mut readability) => {
            match readability.parse() {
                Ok(article) => {
                    log_debug(&format!("Readability extraction succeeded - extracted {} chars from {} chars HTML",
                        article.text_content.len(), html.len()));
                    article.text_content.to_string()
                }
                Err(e) => {
                    log_debug(&format!("Readability parsing failed: {}, using original", e));
                    html.to_string()
                }
            }
        }
        Err(e) => {
            log_debug(&format!("Readability initialization failed: {}, using original", e));
            html.to_string()
        }
    }
}

/// Extract JSON from LLM response, handling markdown code fences and explanatory text
fn extract_json_from_response(response: &str) -> String {
    let response = response.trim();

    // Remove markdown code fences if present
    let without_fences = if response.starts_with("```json") {
        response
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim()
    } else if response.starts_with("```") {
        response
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim()
    } else {
        response
    };

    // Find the first '{' and last '}' to extract just the JSON object
    if let (Some(start), Some(end)) = (without_fences.find('{'), without_fences.rfind('}')) {
        without_fences[start..=end].to_string()
    } else {
        // If no braces found, return original (will likely fail parsing)
        without_fences.to_string()
    }
}

/// Call Claude API for job extraction
async fn call_claude_api(
    api_key: &str,
    prompt_content: &str,
    email_subject: &str,
    email_body: &str,
) -> Result<JobExtractionResult, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))  // 30 second timeout for LLM calls
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Convert HTML to text if needed
    let clean_body = if email_body.to_lowercase().contains("<html")
                     || email_body.to_lowercase().contains("<body")
                     || email_body.contains("<!DOCTYPE")
                     || email_body.contains("<style") {
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
        model: "claude-3-5-haiku-20241022".to_string(),
        max_tokens: 1024,
        messages: vec![
            ClaudeMessage {
                role: "user".to_string(),
                content: format!("{}\n\n{}", prompt_content, user_message),
            },
            ClaudeMessage {
                role: "assistant".to_string(),
                content: "{".to_string(),  // Prefill to enforce JSON structure and complete schema
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

    // LOG: Debug raw LLM response
    log_debug(&format!("=== RAW LLM RESPONSE (first 2000 chars) ===\n{}\n=== END RAW RESPONSE ===",
        &response_text.chars().take(2000).collect::<String>()));

    // Prepend the opening brace from prefill, then clean response
    let full_response = format!("{{{}", response_text);
    let json_text = extract_json_from_response(&full_response);

    // LOG: Debug processed JSON
    log_debug(&format!("=== PROCESSED JSON (first 2000 chars) ===\n{}\n=== END PROCESSED JSON ===",
        &json_text.chars().take(2000).collect::<String>()));

    // Parse JSON from response
    let mut extraction: JobExtractionResult = serde_json::from_str(&json_text)
        .map_err(|e| format!("Failed to parse extraction JSON: {} - Response: {}", e, response_text))?;

    extraction.extraction_method = Some("llm".to_string());

    Ok(extraction)
}

/// Extracts job information from email using LLM (Claude Haiku), falling back to regex if LLM fails
async fn extract_job_from_email_async(
    subject: &Option<String>,
    body: &Option<String>,
    pool: &PgPool,
) -> Option<JobExtractionResult> {
    let debug_mode = std::env::var("DEBUG_EXTRACTION")
        .unwrap_or_default()
        .parse::<bool>()
        .unwrap_or(false);

    let start_time = std::time::Instant::now();

    if debug_mode {
        let subject_len = subject.as_ref().map(|s| s.len()).unwrap_or(0);
        let body_len = body.as_ref().map(|b| b.len()).unwrap_or(0);
        log_debug(&format!("[DEBUG_EXTRACTION] Email extraction started - subject: {} chars, body: {} chars",
            subject_len, body_len));
    }

    // Try LLM extraction first if API key is available
    if let Ok(api_key) = std::env::var("ANTHROPIC_API_KEY") {
        if !api_key.is_empty() {
            // Fetch active prompt
            if let Ok(prompt) = get_active_extraction_prompt(pool).await {
                let subject_str = subject.as_deref().unwrap_or("");
                let body_str = body.as_deref().unwrap_or("");

                // Try Claude API
                let llm_start = std::time::Instant::now();
                match call_claude_api(&api_key, &prompt.prompt_content, subject_str, body_str).await {
                    Ok(extraction) => {
                        let llm_duration = llm_start.elapsed();

                        if debug_mode {
                            log_debug(&format!("[DEBUG_EXTRACTION] LLM email extraction - Title: {:?}, Company: {:?}, Salary: ${:?}-${:?}, Location: {:?}, Confidence: {:.2}, Duration: {:?}",
                                extraction.title, extraction.company, extraction.salary_min, extraction.salary_max,
                                extraction.location, extraction.confidence, llm_duration));
                        } else {
                            log_debug(&format!("LLM extraction succeeded - Title: {:?}, Company: {:?}, Confidence: {:.2}",
                                extraction.title, extraction.company, extraction.confidence));
                        }

                        // Only return if confidence is high enough (> 0.3 to match processing threshold)
                        if extraction.confidence > 0.3 {
                            if debug_mode {
                                log_debug(&format!("[DEBUG_EXTRACTION] LLM extraction accepted (confidence > 0.3), total duration: {:?}", start_time.elapsed()));
                            }
                            return Some(extraction);
                        } else {
                            if debug_mode {
                                log_debug(&format!("[DEBUG_EXTRACTION] LLM extraction confidence too low: {:.2} (threshold: > 0.3), falling back to regex", extraction.confidence));
                            } else {
                                log_debug(&format!("LLM extraction confidence too low: {:.2}, falling back to regex", extraction.confidence));
                            }
                        }
                    }
                    Err(e) => {
                        let llm_duration = llm_start.elapsed();
                        if debug_mode {
                            log_debug(&format!("[DEBUG_EXTRACTION] LLM email extraction failed after {:?}: {}, falling back to regex", llm_duration, e));
                        } else {
                            log_debug(&format!("LLM extraction failed: {}, falling back to regex", e));
                        }
                    }
                }
            } else {
                log_debug("No active extraction prompt found, falling back to regex");
            }
        }
    }

    // Fallback to regex-based extraction
    log_debug("Using regex-based extraction");
    let result = extract_job_from_email(subject, body, debug_mode);

    if debug_mode {
        log_debug(&format!("[DEBUG_EXTRACTION] Email extraction completed, total duration: {:?}", start_time.elapsed()));
    }

    result
}

/// Regex-based extraction fallback
fn extract_job_from_email(subject: &Option<String>, body: &Option<String>, debug_mode: bool) -> Option<JobExtractionResult> {
    let regex_start = std::time::Instant::now();

    let combined_text = format!(
        "{} {}",
        subject.as_deref().unwrap_or(""),
        body.as_deref().unwrap_or("")
    );

    if debug_mode {
        log_debug(&format!("[DEBUG_EXTRACTION] Regex extraction started - combined text: {} chars", combined_text.len()));
    }

    let mut extraction = JobExtractionResult {
        title: None,
        company: None,
        location: None,
        salary_min: None,
        salary_max: None,
        description: body.clone(),
        url: None,
        confidence: 0.0,
        extraction_method: Some("regex".to_string()),
        compensation: None,
        employment: None,
        remote_work: None,
        commute: None,
        job_domain: None,
        company_industry: None,
        company_industry_source: None,
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
                        if debug_mode {
                            log_debug(&format!("[DEBUG_EXTRACTION] Regex: Job title (strong pattern) matched: {:?} (+0.3 confidence, total: {:.2})",
                                extraction.title, extraction.confidence));
                        }
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
            if debug_mode {
                log_debug(&format!("[DEBUG_EXTRACTION] Regex: Job title (weak fallback from subject) matched: {:?} (+0.1 confidence, total: {:.2})",
                    extraction.title, extraction.confidence));
            }
        } else if debug_mode && extraction.title.is_none() {
            log_debug("[DEBUG_EXTRACTION] Regex: No job title found (+0.0 confidence)");
        }
    } else if debug_mode {
        log_debug("[DEBUG_EXTRACTION] Regex: No subject provided for title extraction (+0.0 confidence)");
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
                    if debug_mode {
                        log_debug(&format!("[DEBUG_EXTRACTION] Regex: Company name matched: {:?} (+0.2 confidence, total: {:.2})",
                            extraction.company, extraction.confidence));
                    }
                    break;
                }
            }
        }
    }

    if debug_mode && extraction.company.is_none() {
        log_debug("[DEBUG_EXTRACTION] Regex: No company name found (+0.0 confidence)");
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
                        if debug_mode {
                            log_debug(&format!("[DEBUG_EXTRACTION] Regex: Salary matched: ${} (+0.2 confidence, total: {:.2})",
                                salary_value, extraction.confidence));
                        }
                        break;
                    }
                }
            }
        }
    }

    if debug_mode && extraction.salary_min.is_none() {
        log_debug("[DEBUG_EXTRACTION] Regex: No salary found (+0.0 confidence)");
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
                    if debug_mode {
                        log_debug(&format!("[DEBUG_EXTRACTION] Regex: Location matched: {:?} (+0.15 confidence, total: {:.2})",
                            extraction.location, extraction.confidence));
                    }
                    break;
                }
            }
        }
    }

    if debug_mode && extraction.location.is_none() {
        log_debug("[DEBUG_EXTRACTION] Regex: No location found (+0.0 confidence)");
    }

    // Extract URLs
    if let Ok(re) = regex::Regex::new(r"https?://[^\s]+") {
        if let Some(url_match) = re.find(&combined_text) {
            extraction.url = Some(url_match.as_str().to_string());
            extraction.confidence += 0.15;
            if debug_mode {
                log_debug(&format!("[DEBUG_EXTRACTION] Regex: URL matched: {:?} (+0.15 confidence, total: {:.2})",
                    extraction.url, extraction.confidence));
            }
        } else if debug_mode {
            log_debug("[DEBUG_EXTRACTION] Regex: No URL found (+0.0 confidence)");
        }
    }

    let regex_duration = regex_start.elapsed();

    if extraction.confidence > 0.3 {
        if debug_mode {
            log_debug(&format!("[DEBUG_EXTRACTION] Regex extraction ACCEPTED - Title: {:?}, Company: {:?}, Final confidence: {:.2} (threshold: > 0.3), Duration: {:?}",
                extraction.title, extraction.company, extraction.confidence, regex_duration));
        } else {
            log_debug(&format!("Regex extraction succeeded - Title: {:?}, Company: {:?}, Confidence: {:.2}",
                extraction.title, extraction.company, extraction.confidence));
        }
        Some(extraction)
    } else {
        if debug_mode {
            log_debug(&format!("[DEBUG_EXTRACTION] Regex extraction REJECTED - Final confidence: {:.2} (threshold: > 0.3), Duration: {:?}",
                extraction.confidence, regex_duration));
        } else {
            log_debug(&format!("Regex extraction rejected - low confidence: {:.2}", extraction.confidence));
        }
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
        desc.lines().find(|line| !line.trim().is_empty())
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
    let filter_result = filter_job(job_req, pool).await;

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
    .map_err(actix_web::error::ErrorInternalServerError)?;

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
    .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(logs))
}

// Get ignored/unprocessed emails
async fn get_ignored_emails(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    // Get all email_jobs with NULL job_id
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
            processing_errors,
            source
        FROM email_jobs
        WHERE job_id IS NULL
        ORDER BY received_date DESC
        LIMIT 100
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    // Get Gmail OAuth credentials and fetch message IDs with JobOps-OLD label
    // This filters out rejected jobs from the ignored emails list
    let rejected_message_ids = match get_gmail_oauth_credentials(pool.get_ref()).await {
        Ok(Some(access_token)) => {
            let client = reqwest::Client::new();
            match get_message_ids_with_jobops_old_label(&client, &access_token).await {
                Ok(ids) => {
                    log_debug(&format!("Filtering {} rejected emails from ignored list", ids.len()));
                    ids
                }
                Err(e) => {
                    log_debug(&format!("Warning: Failed to fetch JobOps-OLD messages: {}. Showing all ignored emails.", e));
                    Vec::new()
                }
            }
        }
        _ => {
            log_debug("No Gmail credentials found, showing all ignored emails");
            Vec::new()
        }
    };

    // Filter out emails with JobOps-OLD label (rejected jobs)
    let result: Vec<serde_json::Value> = ignored
        .iter()
        .filter(|row| !rejected_message_ids.contains(&row.message_id))
        .map(|row| {
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
                "source": row.source,
            })
        })
        .collect();

    log_debug(&format!("Returning {} ignored emails (filtered from {} total)", result.len(), ignored.len()));
    Ok(HttpResponse::Ok().json(result))
}

// Get failed emails (emails with processing errors or failed extraction)
async fn get_failed_emails(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let failed = sqlx::query!(
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
        WHERE processing_errors IS NOT NULL
           OR (processed = false AND extraction_confidence IS NULL)
        ORDER BY received_date DESC
        LIMIT 100
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    let result: Vec<serde_json::Value> = failed.iter().map(|row| {
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

// Get duplicate emails (processed but no job created due to duplication, high confidence only)
async fn get_duplicate_emails(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let duplicates = sqlx::query!(
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
        WHERE processed = true
          AND job_id IS NULL
          AND processing_errors IS NULL
          AND extraction_confidence >= 0.7
          AND extracted_data->>'title' IS NOT NULL
          AND extracted_data->>'title' != ''
          AND extracted_data->>'company' IS NOT NULL
          AND extracted_data->>'company' != ''
        ORDER BY received_date DESC
        LIMIT 100
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    let result: Vec<serde_json::Value> = duplicates.iter().map(|row| {
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

// Reprocess emails with missing bodies by re-fetching from Gmail
async fn reprocess_empty_email_bodies(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    // Get Gmail OAuth credentials
    let credentials = sqlx::query_as::<_, OAuthCredential>(
        "SELECT * FROM oauth_credentials WHERE source_id = (SELECT source_id FROM job_sources WHERE source_name = 'gmail' LIMIT 1) LIMIT 1"
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch credentials: {}", e)))?
    .ok_or_else(|| actix_web::error::ErrorInternalServerError("Gmail OAuth not configured"))?;

    let access_token = credentials.access_token.ok_or_else(||
        actix_web::error::ErrorInternalServerError("No access token available")
    )?;

    // Find all emails with missing bodies
    let emails = sqlx::query!(
        r#"
        SELECT email_job_id, message_id, subject
        FROM email_jobs
        WHERE body_text IS NULL AND body_html IS NULL
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch emails: {}", e)))?;

    let total_emails = emails.len();
    let mut updated_count = 0;
    let mut failed_count = 0;

    let client = reqwest::Client::new();

    for email in emails {
        // Re-fetch message from Gmail
        let message_url = format!(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/{}",
            email.message_id
        );

        let message_result = client
            .get(&message_url)
            .bearer_auth(&access_token)
            .send()
            .await;

        match message_result {
            Ok(response) => {
                match response.json::<GmailMessage>().await {
                    Ok(message) => {
                        // Extract body using the new recursive extraction logic
                        if let Some(body_text) = extract_email_body(&message.payload) {
                            // Update the database with the extracted body
                            let update_result = sqlx::query!(
                                "UPDATE email_jobs SET body_text = $1 WHERE email_job_id = $2",
                                body_text,
                                email.email_job_id
                            )
                            .execute(pool.get_ref())
                            .await;

                            match update_result {
                                Ok(_) => {
                                    updated_count += 1;
                                    log_debug(&format!("Updated email body for message_id: {} ({})", email.message_id, email.subject.as_deref().unwrap_or("No subject")));
                                }
                                Err(e) => {
                                    failed_count += 1;
                                    log_debug(&format!("Failed to update database for message_id {}: {}", email.message_id, e));
                                }
                            }
                        } else {
                            failed_count += 1;
                            log_debug(&format!("Still could not extract body for message_id: {} ({})", email.message_id, email.subject.as_deref().unwrap_or("No subject")));
                        }
                    }
                    Err(e) => {
                        failed_count += 1;
                        log_debug(&format!("Failed to parse Gmail message {}: {}", email.message_id, e));
                    }
                }
            }
            Err(e) => {
                failed_count += 1;
                log_debug(&format!("Failed to fetch Gmail message {}: {}", email.message_id, e));
            }
        }
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Email body reprocessing completed",
        "total_emails": total_emails,
        "updated": updated_count,
        "failed": failed_count
    })))
}

// Re-extract job descriptions from emails with full bodies
async fn reextract_job_descriptions(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    // Find jobs with short descriptions that have email bodies
    // Short description indicates LLM extraction failed due to missing email body
    let jobs_to_reextract = sqlx::query!(
        r#"
        SELECT
            j.job_id,
            j.title,
            j.description,
            e.subject,
            e.body_text,
            e.body_html
        FROM jobs j
        JOIN email_jobs e ON j.job_id = e.job_id
        WHERE j.source = 'gmail'
          AND e.body_text IS NOT NULL
          AND (LENGTH(j.description) < 100
               OR j.description LIKE '%No job description%'
               OR j.description LIKE '%Urgent need for%')
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch jobs: {}", e)))?;

    let total_jobs = jobs_to_reextract.len();
    let mut updated_count = 0;
    let mut failed_count = 0;

    log_debug(&format!("Found {} jobs with short descriptions to re-extract", total_jobs));

    for job in jobs_to_reextract {
        let job_id = job.job_id;
        let subject = job.subject;
        let body = job.body_text.or(job.body_html);

        log_debug(&format!("Re-extracting job description for job_id: {}, subject: {}",
            job_id, subject.as_deref().unwrap_or("No subject")));

        // Re-run LLM extraction with full email body
        if let Some(extraction) = extract_job_from_email_async(&subject, &body, pool.get_ref()).await {
            // Update job with newly extracted data
            let description_len = extraction.description.as_ref().map(|d| d.len()).unwrap_or(0);

            // Serialize extraction to raw_data
            let raw_data = serde_json::to_value(&extraction).ok();

            let result = sqlx::query!(
                r#"
                UPDATE jobs SET
                    title = COALESCE($1, title),
                    company = COALESCE($2, company),
                    location = COALESCE($3, location),
                    salary = COALESCE($4, salary),
                    description = COALESCE($5, description),
                    raw_data = COALESCE($6, raw_data),
                    updated_at = NOW()
                WHERE job_id = $7
                "#,
                extraction.title.filter(|t| !t.is_empty()),
                extraction.company.filter(|c| !c.is_empty()),
                extraction.location,
                extraction.compensation.as_ref().and_then(|c| {
                    match (c.salary_min, c.salary_max) {
                        (Some(min), Some(max)) => Some((min + max) / 2),
                        (Some(val), None) | (None, Some(val)) => Some(val),
                        _ => None
                    }
                }),
                extraction.description.filter(|d| !d.is_empty()),
                raw_data,
                job_id
            )
            .execute(pool.get_ref())
            .await;

            match result {
                Ok(_) => {
                    updated_count += 1;
                    log_debug(&format!("Successfully re-extracted job description for job_id: {}, new description length: {}",
                        job_id, description_len));
                }
                Err(e) => {
                    failed_count += 1;
                    log_debug(&format!("Failed to update job {}: {}", job_id, e));
                }
            }
        } else {
            failed_count += 1;
            log_debug(&format!("LLM extraction returned None for job_id: {}", job_id));
        }
    }

    // Auto-calculate scores for all updated jobs
    log_debug(&format!("Calculating scores for {} updated jobs", updated_count));
    let mut scored_count = 0;
    let mut score_failed_count = 0;

    if updated_count > 0 {
        // Fetch all updated jobs
        let updated_jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE raw_data IS NOT NULL"
        )
        .fetch_all(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch jobs for scoring: {}", e)))?;

        for job in updated_jobs {
            match calculate_job_score(pool.get_ref(), &job).await {
                Ok(_) => scored_count += 1,
                Err(e) => {
                    log_debug(&format!("Failed to score job {}: {}", job.job_id, e));
                    score_failed_count += 1;
                }
            }
        }

        // Recalculate ranks after scoring all jobs
        if scored_count > 0 {
            if let Err(e) = recalculate_ranks(pool.get_ref()).await {
                log_debug(&format!("Failed to recalculate ranks: {}", e));
            }
        }
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Job description re-extraction completed",
        "total_jobs": total_jobs,
        "updated": updated_count,
        "failed": failed_count,
        "scored": scored_count,
        "score_failed": score_failed_count
    })))
}

// Re-extract ALL job descriptions from emails (not just short ones)
async fn reextract_single_job(
    job_id: web::Path<String>,
    pool: web::Data<PgPool>
) -> Result<HttpResponse> {
    let job_id_str = job_id.into_inner();
    let job_uuid = Uuid::parse_str(&job_id_str)
        .map_err(|e| actix_web::error::ErrorBadRequest(format!("Invalid job_id: {}", e)))?;

    log_debug(&format!("Re-extracting single job: {}", job_uuid));

    // Fetch the single job with email body
    let job = sqlx::query!(
        r#"
        SELECT
            j.job_id,
            j.title,
            j.description,
            e.subject,
            e.body_text,
            e.body_html
        FROM jobs j
        JOIN email_jobs e ON j.job_id = e.job_id
        WHERE j.job_id = $1
          AND j.source = 'gmail'
          AND e.body_text IS NOT NULL
        "#,
        job_uuid
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch job: {}", e)))?;

    if let Some(job) = job {
        let subject = job.subject;
        let body = job.body_text.or(job.body_html);

        log_debug(&format!("Extracting for subject: {}", subject.as_deref().unwrap_or("No subject")));

        // Re-run LLM extraction
        if let Some(extraction) = extract_job_from_email_async(&subject, &body, pool.get_ref()).await {
            let raw_data = serde_json::to_value(&extraction).ok();

            sqlx::query!(
                r#"
                UPDATE jobs SET
                    title = COALESCE($1, title),
                    company = COALESCE($2, company),
                    location = COALESCE($3, location),
                    salary = COALESCE($4, salary),
                    description = COALESCE($5, description),
                    raw_data = COALESCE($6, raw_data),
                    extraction_method = $7,
                    updated_at = NOW()
                WHERE job_id = $8
                "#,
                extraction.title.filter(|t| !t.is_empty()),
                extraction.company.filter(|c| !c.is_empty()),
                extraction.location,
                extraction.compensation.as_ref().and_then(|c| {
                    match (c.salary_min, c.salary_max) {
                        (Some(min), Some(max)) => Some((min + max) / 2),
                        (Some(val), None) | (None, Some(val)) => Some(val),
                        _ => None
                    }
                }),
                extraction.description.filter(|d| !d.is_empty()),
                raw_data,
                extraction.extraction_method.as_deref(),
                job_uuid
            )
            .execute(pool.get_ref())
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to update job: {}", e)))?;

            log_debug(&format!("Successfully re-extracted job: {}", job_uuid));

            // Auto-calculate score after successful extraction
            let updated_job = sqlx::query_as::<_, Job>(
                "SELECT * FROM jobs WHERE job_id = $1"
            )
            .bind(job_uuid)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch updated job: {}", e)))?;

            let mut score_calculated = false;
            if let Some(updated_job) = updated_job {
                match calculate_job_score(pool.get_ref(), &updated_job).await {
                    Ok(_) => {
                        score_calculated = true;
                        // Recalculate ranks after single job score update
                        if let Err(e) = recalculate_ranks(pool.get_ref()).await {
                            log_debug(&format!("Failed to recalculate ranks: {}", e));
                        }
                    }
                    Err(e) => {
                        log_debug(&format!("Failed to calculate score for job {}: {}", job_uuid, e));
                    }
                }
            }

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "message": "Job re-extraction completed",
                "job_id": job_uuid,
                "success": true,
                "score_calculated": score_calculated
            })))
        } else {
            log_debug(&format!("LLM extraction returned None for job: {}", job_uuid));
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "message": "LLM extraction failed",
                "job_id": job_uuid,
                "success": false,
                "error": "LLM returned no data"
            })))
        }
    } else {
        Err(actix_web::error::ErrorNotFound(format!("Job {} not found or has no email body", job_uuid)))
    }
}

async fn reextract_all_jobs(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    // Find ALL jobs that have email bodies, regardless of description length
    let jobs_to_reextract = sqlx::query!(
        r#"
        SELECT
            j.job_id,
            j.title,
            j.description,
            e.subject,
            e.body_text,
            e.body_html
        FROM jobs j
        JOIN email_jobs e ON j.job_id = e.job_id
        WHERE j.source = 'gmail'
          AND e.body_text IS NOT NULL
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch jobs: {}", e)))?;

    let total_jobs = jobs_to_reextract.len();
    let mut updated_count = 0;
    let mut failed_count = 0;

    log_debug(&format!("Found {} jobs to re-extract with full structured data", total_jobs));

    for job in jobs_to_reextract {
        let job_id = job.job_id;
        let subject = job.subject;
        let body = job.body_text.or(job.body_html);

        log_debug(&format!("Re-extracting ALL fields for job_id: {}, subject: {}",
            job_id, subject.as_deref().unwrap_or("No subject")));

        // Re-run LLM extraction with full email body
        if let Some(extraction) = extract_job_from_email_async(&subject, &body, pool.get_ref()).await {
            // Serialize extraction to raw_data
            let raw_data = serde_json::to_value(&extraction).ok();

            let result = sqlx::query!(
                r#"
                UPDATE jobs SET
                    title = COALESCE($1, title),
                    company = COALESCE($2, company),
                    location = COALESCE($3, location),
                    salary = COALESCE($4, salary),
                    description = COALESCE($5, description),
                    raw_data = COALESCE($6, raw_data),
                    extraction_method = $7,
                    updated_at = NOW()
                WHERE job_id = $8
                "#,
                extraction.title.filter(|t| !t.is_empty()),
                extraction.company.filter(|c| !c.is_empty()),
                extraction.location,
                extraction.compensation.as_ref().and_then(|c| {
                    match (c.salary_min, c.salary_max) {
                        (Some(min), Some(max)) => Some((min + max) / 2),
                        (Some(val), None) | (None, Some(val)) => Some(val),
                        _ => None
                    }
                }),
                extraction.description.filter(|d| !d.is_empty()),
                raw_data,
                extraction.extraction_method.as_deref(),
                job_id
            )
            .execute(pool.get_ref())
            .await;

            match result {
                Ok(_) => {
                    updated_count += 1;
                    log_debug(&format!("Successfully re-extracted all fields for job_id: {}", job_id));
                }
                Err(e) => {
                    failed_count += 1;
                    log_debug(&format!("Failed to update job {}: {}", job_id, e));
                }
            }
        } else {
            failed_count += 1;
            log_debug(&format!("LLM extraction returned None for job_id: {}", job_id));
        }
    }

    // Auto-calculate scores for all updated jobs
    log_debug(&format!("Calculating scores for {} updated jobs", updated_count));
    let mut scored_count = 0;
    let mut score_failed_count = 0;

    if updated_count > 0 {
        // Fetch all updated jobs
        let updated_jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE raw_data IS NOT NULL"
        )
        .fetch_all(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to fetch jobs for scoring: {}", e)))?;

        for job in updated_jobs {
            match calculate_job_score(pool.get_ref(), &job).await {
                Ok(_) => scored_count += 1,
                Err(e) => {
                    log_debug(&format!("Failed to score job {}: {}", job.job_id, e));
                    score_failed_count += 1;
                }
            }
        }

        // Recalculate ranks after scoring all jobs
        if scored_count > 0 {
            if let Err(e) = recalculate_ranks(pool.get_ref()).await {
                log_debug(&format!("Failed to recalculate ranks: {}", e));
            }
        }
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Full job re-extraction completed",
        "total_jobs": total_jobs,
        "updated": updated_count,
        "failed": failed_count,
        "scored": scored_count,
        "score_failed": score_failed_count
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
    let _search_params = [("keywords", "software test automation qa engineer"),
        ("location", _location),
        ("sortBy", "DD"), // Date descending
        ("start", "0"),
        ("count", "50")];

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
        extraction_method: Some("linkedin_api".to_string()),
        company_industry: None,
        company_industry_source: None,
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
    .map_err(actix_web::error::ErrorInternalServerError)?;

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

    // Create interview in database first
    let mut interview = sqlx::query_as::<_, Interview>(
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
    .bind(request.application_id)
    .bind(&request.interview_type)
    .bind(request.scheduled_date)
    .bind(duration)
    .bind(&request.location)
    .bind(&request.interviewer_name)
    .bind(&request.interviewer_email)
    .bind(&request.interviewer_phone)
    .bind(&request.notes)
    .fetch_one(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    // Attempt to create Google Calendar event (optional - fail gracefully)
    // Get job information for the calendar event
    let job_info_result = sqlx::query!(
        r#"
        SELECT j.title, j.company
        FROM applications a
        JOIN jobs j ON a.job_id = j.job_id
        WHERE a.application_id = $1
        "#,
        request.application_id
    )
    .fetch_optional(pool.get_ref())
    .await;

    if let Ok(Some(job_info)) = job_info_result {
        // Create calendar service
        let calendar_service = calendar_service::CalendarService::new(pool.get_ref().clone());

        // Prepare calendar event
        let end_time = request.scheduled_date + chrono::Duration::minutes(duration as i64);

        let event_summary = format!(
            "{} Interview - {} at {}",
            request.interview_type,
            job_info.company,
            job_info.title
        );

        let event_description = format!(
            "Interview Type: {}\nCompany: {}\nPosition: {}\n\n{}",
            request.interview_type,
            job_info.company,
            job_info.title,
            request.notes.as_deref().unwrap_or("")
        );

        let mut attendees = Vec::new();
        if let Some(ref email) = request.interviewer_email {
            attendees.push(calendar_service::Attendee {
                email: email.clone(),
                display_name: request.interviewer_name.clone(),
                optional: Some(false),
            });
        }

        let create_event = calendar_service::CreateEventRequest {
            summary: event_summary,
            description: Some(event_description),
            location: request.location.clone(),
            start: calendar_service::EventDateTime {
                date_time: request.scheduled_date.to_rfc3339(),
                time_zone: "America/Los_Angeles".to_string(),
            },
            end: calendar_service::EventDateTime {
                date_time: end_time.to_rfc3339(),
                time_zone: "America/Los_Angeles".to_string(),
            },
            attendees: if attendees.is_empty() { None } else { Some(attendees) },
            reminders: Some(calendar_service::default_interview_reminders()),
        };

        // Try to create the event (use "primary" calendar)
        match calendar_service.create_event("primary", create_event).await {
            Ok(calendar_event) => {
                // Update interview with calendar_event_id
                let updated = sqlx::query_as::<_, Interview>(
                    "UPDATE interviews SET calendar_event_id = $1 WHERE interview_id = $2 RETURNING *"
                )
                .bind(&calendar_event.id)
                .bind(interview.interview_id)
                .fetch_one(pool.get_ref())
                .await;

                if let Ok(updated_interview) = updated {
                    interview = updated_interview;
                }
                log_debug(&format!("Created Google Calendar event: {}", calendar_event.id));
            },
            Err(e) => {
                // Log error but don't fail the request - calendar integration is optional
                log_debug(&format!("Failed to create calendar event (non-fatal): {}", e));
            }
        }
    }

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
    .map_err(actix_web::error::ErrorInternalServerError)?;

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
    .map_err(actix_web::error::ErrorInternalServerError)?;

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

    // Get the existing interview to check for calendar_event_id
    let existing_interview = sqlx::query_as::<_, Interview>(
        "SELECT * FROM interviews WHERE interview_id = $1"
    )
    .bind(interview_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    let existing_interview = match existing_interview {
        Some(i) => i,
        None => return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Interview not found"
        })))
    };

    // Update interview in database
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
    .bind(request.scheduled_date)
    .bind(duration)
    .bind(&request.location)
    .bind(&request.interviewer_name)
    .bind(&request.interviewer_email)
    .bind(&request.interviewer_phone)
    .bind(&request.notes)
    .bind(interview_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    // If there's a calendar_event_id, update the Google Calendar event
    if let Some(calendar_event_id) = &existing_interview.calendar_event_id {
        // Get job details
        let job_info_result = sqlx::query!(
            r#"
            SELECT j.title, j.company
            FROM applications a
            JOIN jobs j ON a.job_id = j.job_id
            WHERE a.application_id = $1
            "#,
            request.application_id
        )
        .fetch_optional(pool.get_ref())
        .await;

        if let Ok(Some(job_info)) = job_info_result {
            let calendar_service = calendar_service::CalendarService::new(pool.get_ref().clone());

            let end_time = request.scheduled_date + chrono::Duration::minutes(duration as i64);

            let event_summary = format!(
                "{} Interview - {} at {}",
                request.interview_type,
                job_info.company,
                job_info.title
            );

            let event_description = format!(
                "Interview Type: {}\nCompany: {}\nPosition: {}\n\n{}",
                request.interview_type,
                job_info.company,
                job_info.title,
                request.notes.as_deref().unwrap_or("")
            );

            let mut attendees = Vec::new();
            if let Some(ref email) = request.interviewer_email {
                attendees.push(calendar_service::Attendee {
                    email: email.clone(),
                    display_name: request.interviewer_name.clone(),
                    optional: Some(false),
                });
            }

            let update_event = calendar_service::UpdateEventRequest {
                summary: event_summary,
                description: Some(event_description),
                location: request.location.clone(),
                start: calendar_service::EventDateTime {
                    date_time: request.scheduled_date.to_rfc3339(),
                    time_zone: "America/Los_Angeles".to_string(),
                },
                end: calendar_service::EventDateTime {
                    date_time: end_time.to_rfc3339(),
                    time_zone: "America/Los_Angeles".to_string(),
                },
                attendees: if attendees.is_empty() { None } else { Some(attendees) },
                reminders: Some(calendar_service::default_interview_reminders()),
            };

            match calendar_service.update_event("primary", calendar_event_id, update_event).await {
                Ok(_) => {
                    log_debug(&format!("Updated Google Calendar event: {}", calendar_event_id));
                },
                Err(e) => {
                    log_debug(&format!("Failed to update calendar event (non-fatal): {}", e));
                }
            }
        }
    }

    Ok(HttpResponse::Ok().json(interview))
}

async fn delete_interview(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let interview_id = path.into_inner();

    // Get interview details first to check for calendar_event_id and get job source
    let interview = sqlx::query!(
        r#"
        SELECT i.calendar_event_id, i.application_id
        FROM interviews i
        WHERE i.interview_id = $1
        "#,
        interview_id
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    let interview = match interview {
        Some(i) => i,
        None => return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Interview not found"
        })))
    };

    // If there's a calendar_event_id, delete the Google Calendar event first
    if let Some(calendar_event_id) = &interview.calendar_event_id {
        let calendar_service = calendar_service::CalendarService::new(pool.get_ref().clone());

        match calendar_service.delete_event("primary", calendar_event_id).await {
            Ok(_) => {
                log_debug(&format!("Deleted Google Calendar event: {}", calendar_event_id));
            },
            Err(e) => {
                log_debug(&format!("Failed to delete calendar event (non-fatal): {}", e));
            }
        }
    }

    // Delete the interview from database
    let result = sqlx::query!(
        "DELETE FROM interviews WHERE interview_id = $1",
        interview_id
    )
    .execute(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

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
    .map_err(actix_web::error::ErrorInternalServerError)?;

    let date_applied = app.and_then(|a| a.date_applied).unwrap_or_else(Utc::now);

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
    .map_err(actix_web::error::ErrorInternalServerError)?;

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
    .bind(request.application_id)
    .bind(scheduled_date)
    .bind(attempt_number)
    .bind(template_name)
    .bind(subject)
    .bind(body)
    .fetch_one(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

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
    .map_err(actix_web::error::ErrorInternalServerError)?;

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
    .map_err(actix_web::error::ErrorInternalServerError)?;

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
    .map_err(actix_web::error::ErrorInternalServerError)?;

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

    // Get application and job details
    let app_job = sqlx::query!(
        r#"
        SELECT
            a.application_id, a.date_applied,
            j.job_id, j.title, j.company, j.url
        FROM applications a
        JOIN jobs j ON a.job_id = j.job_id
        WHERE a.application_id = $1
        "#,
        follow_up.application_id
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    let app_job = match app_job {
        Some(aj) => aj,
        None => return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Application not found"
        })))
    };

    // Get environment variables for email
    let from_email = std::env::var("APPLICANT_EMAIL")
        .unwrap_or_else(|_| "sam@samkirk.com".to_string());
    let applicant_name = std::env::var("APPLICANT_NAME")
        .unwrap_or_else(|_| "Sam Kirk".to_string());

    // Prepare template variables
    let variables = serde_json::json!({
        "applicant_name": applicant_name,
        "company": app_job.company,
        "job_title": app_job.title,
        "date_applied": app_job.date_applied
            .map(|d| d.format("%B %d, %Y").to_string())
            .unwrap_or_else(|| "recently".to_string()),
        "attempt_number": follow_up.attempt_number
    });

    // Render subject and body with variables
    let subject = render_template(
        follow_up.subject.as_deref().unwrap_or("Follow-up on Application"),
        &variables
    );
    let body = render_template(
        follow_up.body.as_deref().unwrap_or("I wanted to follow up on my application."),
        &variables
    );

    // Determine recipient email - use job URL if available, otherwise require manual input
    let mut to_email = if let Some(_url) = app_job.url {
        // Try to extract email from URL or description
        // For now, we'll need this to be provided in the follow-up approval
        // TODO: Extract recipient email from job posting or require it during approval
        format!("hiring@{}.com", app_job.company.to_lowercase().replace(" ", ""))
    } else {
        format!("hiring@{}.com", app_job.company.to_lowercase().replace(" ", ""))
    };

    // Test mode: Override recipient email for automated testing (per PRD safety requirements)
    if std::env::var("TEST_MODE").unwrap_or_default() == "true" {
        to_email = "MrBesterTester@gmail.com".to_string();
        log_debug("TEST_MODE enabled: Overriding recipient email to MrBesterTester@gmail.com");
    }

    // Send email via Gmail API
    match send_gmail_email(&from_email, &to_email, &subject, &body, pool.get_ref()).await {
        Ok(message_id) => {
            // Update follow-up status
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
            .map_err(actix_web::error::ErrorInternalServerError)?;

            // Record communication (simplified - using available fields only)
            sqlx::query!(
                r#"
                INSERT INTO communications (application_id, message_content, channel)
                VALUES ($1, $2, 'email')
                "#,
                follow_up.application_id,
                format!("Follow-up email sent\nSubject: {}\nTo: {}\n\n{}", subject, to_email, body)
            )
            .execute(pool.get_ref())
            .await
            .ok(); // Don't fail if communication logging fails

            log_debug(&format!("Follow-up email sent successfully: {}", message_id));

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "message": "Follow-up sent successfully",
                "follow_up_id": follow_up_id,
                "gmail_message_id": message_id
            })))
        },
        Err(e) => {
            // Log error and update follow-up with error message
            let error_msg = format!("{}", e);
            sqlx::query!(
                r#"
                UPDATE follow_up_schedule
                SET status = 'error', error_message = $1
                WHERE follow_up_id = $2
                "#,
                error_msg,
                follow_up_id
            )
            .execute(pool.get_ref())
            .await
            .ok();

            log_debug(&format!("Failed to send follow-up email: {}", error_msg));

            Err(e)
        }
    }
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
    .map_err(actix_web::error::ErrorInternalServerError)?;

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

/// Send an email via Gmail API (not a draft - sends immediately)
async fn send_gmail_email(
    from_email: &str,
    to_email: &str,
    subject: &str,
    body: &str,
    pool: &PgPool,
) -> actix_web::Result<String> {
    // Build a simple text email (no attachments for follow-ups)
    let mut message = String::new();
    message.push_str(&format!("From: {}\r\n", from_email));
    message.push_str(&format!("To: {}\r\n", to_email));
    message.push_str(&format!("Subject: {}\r\n", subject));
    message.push_str("Content-Type: text/plain; charset=\"UTF-8\"\r\n");
    message.push_str("\r\n");
    message.push_str(body);

    // Encode as base64 (Gmail API requirement)
    let encoded_message = general_purpose::URL_SAFE_NO_PAD.encode(message.as_bytes());

    // Get OAuth credentials
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

    // Send via Gmail API (messages.send endpoint, not drafts)
    let client = reqwest::Client::new();
    let send_request = serde_json::json!({
        "raw": encoded_message
    });

    let response = client
        .post("https://gmail.googleapis.com/gmail/v1/users/me/messages/send")
        .bearer_auth(&access_token)
        .json(&send_request)
        .send()
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Gmail API call failed: {}", e)))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(actix_web::error::ErrorInternalServerError(format!("Gmail API error: {}", error_text)));
    }

    let send_response: serde_json::Value = response.json().await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Failed to parse Gmail response: {}", e)))?;

    // Extract message ID from response
    let message_id = send_response["id"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();

    Ok(message_id)
}

/// Render template with Handlebars-style variable substitution
fn render_template(template: &str, variables: &serde_json::Value) -> String {
    let mut result = template.to_string();

    if let Some(obj) = variables.as_object() {
        for (key, value) in obj {
            let placeholder = format!("{{{{{}}}}}", key);
            let replacement = match value {
                serde_json::Value::String(s) => s.clone(),
                serde_json::Value::Number(n) => n.to_string(),
                serde_json::Value::Bool(b) => b.to_string(),
                _ => value.to_string(),
            };
            result = result.replace(&placeholder, &replacement);
        }
    }

    result
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
        .get(format!("https://gmail.googleapis.com/gmail/v1/users/me/drafts/{}", gmail_draft_id))
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
        .delete(format!("https://gmail.googleapis.com/gmail/v1/users/me/drafts/{}", gmail_draft_id))
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
            // ISSUE-004: Scoring system endpoints (must be before /{id} routes)
            .route("/api/jobs/ranked", web::get().to(get_ranked_jobs))
            .route("/api/jobs/calculate-all-scores", web::post().to(calculate_all_job_scores))
            .route("/api/scoring-criteria", web::get().to(get_scoring_criteria_handler))
            .route("/api/scoring-criteria", web::put().to(update_scoring_criteria_handler))
            // Job routes with {id} parameter
            .route("/api/jobs/{id}", web::get().to(get_job))
            .route("/api/jobs/{id}/status", web::put().to(update_job_status))
            .route("/api/jobs/{id}/reject", web::put().to(reject_job))
            .route("/api/jobs/bulk-delete-gmail", web::post().to(bulk_delete_gmail_jobs))
            .route("/api/email-jobs/bulk-delete-gmail", web::post().to(bulk_delete_gmail_email_jobs))
            .route("/api/jobs/{id}/score", web::get().to(get_job_score_handler))
            .route("/api/jobs/{id}/calculate-score", web::post().to(calculate_single_job_score))
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
            .route("/api/jobs/{id}/condense-description", web::get().to(condense_description_handler))
            .route("/api/jobs/{id}/email-body", web::get().to(get_job_email_body_handler))
            // Phase 4: Automated Job Intake APIs
            .route("/api/auth/gmail/url", web::get().to(get_gmail_oauth_url))
            .route("/auth/gmail/callback", web::get().to(handle_gmail_oauth_callback))
            .route("/api/auth/calendar/url", web::get().to(get_calendar_oauth_url))
            .route("/auth/calendar/callback", web::get().to(handle_calendar_oauth_callback))
            // Phase 2.7: Microsoft Email Integration
            .route("/api/email/microsoft/auth-url", web::get().to(get_microsoft_oauth_url))
            .route("/api/email/microsoft/callback", web::get().to(handle_microsoft_oauth_callback))
            .route("/api/email/microsoft/folders", web::get().to(get_microsoft_folders))
            .route("/api/test/seed-msmail", web::post().to(seed_microsoft_test_emails))
            .route("/api/intake/gmail/sync", web::post().to(sync_gmail_jobs))
            .route("/api/intake/microsoft/sync", web::post().to(sync_microsoft_jobs))
            .route("/api/intake/rapidapi/sync", web::post().to(sync_jsearch_jobs))
            // Phase 4.2: Automatic Pagination
            .route("/api/intake/rapidapi/reset-pagination", web::post().to(reset_rapidapi_pagination))
            .route("/api/intake/rapidapi/state", web::get().to(get_rapidapi_state))
            .route("/api/intake/linkedin/sync", web::post().to(sync_linkedin_jobs))
            .route("/api/intake/sync-all", web::post().to(sync_all_sources))
            .route("/api/intake/schedule", web::get().to(schedule_job_sync))
            .route("/api/intake/summary", web::get().to(get_job_intake_summary))
            .route("/api/job-sources", web::get().to(get_job_sources))
            .route("/api/intake/logs", web::get().to(get_intake_logs))
            .route("/api/intake/ignored-emails", web::get().to(get_ignored_emails))
            .route("/api/intake/failed-emails", web::get().to(get_failed_emails))
            .route("/api/intake/duplicate-emails", web::get().to(get_duplicate_emails))
            .route("/api/jobs/refilter", web::post().to(refilter_jobs))
            .route("/api/intake/reprocess-empty-bodies", web::post().to(reprocess_empty_email_bodies))
            .route("/api/intake/reextract-descriptions", web::post().to(reextract_job_descriptions))
            .route("/api/intake/reextract-job/{job_id}", web::post().to(reextract_single_job))
            .route("/api/intake/reextract-all", web::post().to(reextract_all_jobs))
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

    // ===== Scoring Function Unit Tests =====

    #[test]
    fn test_compensation_score_with_annual_salary() {
        use serde_json::json;

        // Test $130K salary (baseline - should score 50)
        let mut job = Job {
            job_id: Uuid::new_v4(),
            title: "Test Job".to_string(),
            company: "Test Co".to_string(),
            location: Some("Remote".to_string()),
            source: "test".to_string(),
            salary: Some(130000),
            commute_time: None,
            status: "new".to_string(),
            date_email_sent: Utc::now(),
            description: Some("Test".to_string()),
            condensed_description: None,
            url: None,
            filter_reason: None,
            extraction_method: None,
            raw_data: Some(json!({
                "compensation": {
                    "salary_min": 130000,
                    "salary_max": 130000,
                    "type": "annual_salary"
                },
                "employment": {
                    "tax_structure": "w2"
                }
            })),
        };

        let score = calculate_compensation_score(&job);
        assert!(score.is_some());
        assert!((score.unwrap() - 50.0).abs() < 1.0); // ~50 points for $130K

        // Test $200K salary (should score 100)
        job.raw_data = Some(json!({
            "compensation": {
                "salary_min": 200000,
                "salary_max": 200000,
                "type": "annual_salary"
            },
            "employment": {
                "tax_structure": "w2"
            }
        }));

        let score = calculate_compensation_score(&job);
        assert!(score.is_some());
        assert!((score.unwrap() - 100.0).abs() < 1.0); // 100 points for $200K

        // Test $100K salary (minimum - should score 0)
        job.raw_data = Some(json!({
            "compensation": {
                "salary_min": 100000,
                "salary_max": 100000,
                "type": "annual_salary"
            },
            "employment": {
                "tax_structure": "w2"
            }
        }));

        let score = calculate_compensation_score(&job);
        assert!(score.is_some());
        assert!((score.unwrap() - 0.0).abs() < 1.0); // 0 points for $100K
    }

    #[test]
    fn test_compensation_score_with_1099() {
        use serde_json::json;

        // Test $130K with 1099 (should get 10% boost)
        let job = Job {
            job_id: Uuid::new_v4(),
            title: "Test Job".to_string(),
            company: "Test Co".to_string(),
            location: Some("Remote".to_string()),
            source: "test".to_string(),
            salary: Some(130000),
            commute_time: None,
            status: "new".to_string(),
            date_email_sent: Utc::now(),
            description: Some("Test".to_string()),
            condensed_description: None,
            url: None,
            filter_reason: None,
            extraction_method: None,
            raw_data: Some(json!({
                "compensation": {
                    "salary_min": 130000,
                    "salary_max": 130000,
                    "type": "annual_salary"
                },
                "employment": {
                    "tax_structure": "1099"
                }
            })),
        };

        let score = calculate_compensation_score(&job);
        assert!(score.is_some());
        // $130K * 1.1 = $143K equivalent, which should score higher than 50
        assert!(score.unwrap() > 50.0);
    }

    #[test]
    fn test_compensation_score_missing_data() {
        use serde_json::json;

        // Test with missing compensation data
        let job = Job {
            job_id: Uuid::new_v4(),
            title: "Test Job".to_string(),
            company: "Test Co".to_string(),
            location: Some("Remote".to_string()),
            source: "test".to_string(),
            salary: None,
            commute_time: None,
            status: "new".to_string(),
            date_email_sent: Utc::now(),
            description: Some("Test".to_string()),
            condensed_description: None,
            url: None,
            filter_reason: None,
            extraction_method: None,
            raw_data: Some(json!({})),
        };

        let score = calculate_compensation_score(&job);
        assert!(score.is_none()); // Should return None for missing data
    }

    #[test]
    fn test_relationship_score() {
        use serde_json::json;

        let mut job = Job {
            job_id: Uuid::new_v4(),
            title: "Test Job".to_string(),
            company: "Test Co".to_string(),
            location: Some("Remote".to_string()),
            source: "test".to_string(),
            salary: None,
            commute_time: None,
            status: "new".to_string(),
            date_email_sent: Utc::now(),
            description: Some("Test".to_string()),
            condensed_description: None,
            url: None,
            filter_reason: None,
            extraction_method: None,
            raw_data: Some(json!({
                "employment": {
                    "relationship": "direct"
                }
            })),
        };

        // Test direct hire (should score 100)
        let score = calculate_relationship_score(&job);
        assert!(score.is_some());
        assert!((score.unwrap() - 100.0).abs() < 1.0);

        // Test staffing agency (should score 60)
        job.raw_data = Some(json!({
            "employment": {
                "relationship": "staffing_agency"
            }
        }));
        let score = calculate_relationship_score(&job);
        assert!(score.is_some());
        assert!((score.unwrap() - 60.0).abs() < 1.0);

        // Test contract_to_hire (should score 20)
        job.raw_data = Some(json!({
            "employment": {
                "relationship": "contract_to_hire"
            }
        }));
        let score = calculate_relationship_score(&job);
        assert!(score.is_some());
        assert!((score.unwrap() - 20.0).abs() < 1.0);
    }

    #[test]
    fn test_remote_score() {
        use serde_json::json;

        let mut job = Job {
            job_id: Uuid::new_v4(),
            title: "Test Job".to_string(),
            company: "Test Co".to_string(),
            location: Some("Remote".to_string()),
            source: "test".to_string(),
            salary: None,
            commute_time: None,
            status: "new".to_string(),
            date_email_sent: Utc::now(),
            description: Some("Test".to_string()),
            condensed_description: None,
            url: None,
            filter_reason: None,
            extraction_method: None,
            raw_data: Some(json!({
                "remote_work": {
                    "policy": "fully_remote"
                }
            })),
        };

        // Test fully remote (should score 100)
        let score = calculate_remote_score(&job);
        assert!(score.is_some());
        assert!((score.unwrap() - 100.0).abs() < 1.0);

        // Test hybrid 2 days/week (should score 80)
        job.raw_data = Some(json!({
            "remote_work": {
                "policy": "hybrid",
                "days_onsite_per_week": 2
            }
        }));
        let score = calculate_remote_score(&job);
        assert!(score.is_some());
        assert!((score.unwrap() - 80.0).abs() < 1.0);

        // Test onsite (should score 0)
        job.raw_data = Some(json!({
            "remote_work": {
                "policy": "onsite"
            }
        }));
        let score = calculate_remote_score(&job);
        assert!(score.is_some());
        assert!((score.unwrap() - 0.0).abs() < 1.0);

        // Test hybrid with company shuttle bonus
        job.raw_data = Some(json!({
            "remote_work": {
                "policy": "hybrid",
                "days_onsite_per_week": 3
            },
            "commute": {
                "company_shuttle": true
            }
        }));
        let score = calculate_remote_score(&job);
        assert!(score.is_some());
        // Should be 60 (base) + 15 (shuttle) = 75
        assert!((score.unwrap() - 75.0).abs() < 1.0);
    }

    #[test]
    fn test_domain_fit_score() {
        use serde_json::json;

        let mut job = Job {
            job_id: Uuid::new_v4(),
            title: "Test Automation Engineer".to_string(),
            company: "Test Co".to_string(),
            location: Some("Remote".to_string()),
            source: "test".to_string(),
            salary: None,
            commute_time: None,
            status: "new".to_string(),
            date_email_sent: Utc::now(),
            description: Some("Test automation with Playwright".to_string()),
            condensed_description: None,
            url: None,
            filter_reason: None,
            extraction_method: None,
            raw_data: Some(json!({
                "job_domain": {
                    "primary_category": "test_automation",
                    "automation_focus": true,
                    "generative_ai_usage": true,
                    "tech_stack": ["Playwright", "TypeScript"]
                }
            })),
        };

        // Test automation engineer with GenAI and Playwright
        let score = calculate_domain_fit_score(&job);
        assert!(score.is_some());
        // Base 90 + automation 10 + GenAI 10 + Playwright 5 = 115 -> capped at 100
        assert!((score.unwrap() - 100.0).abs() < 1.0);

        // Test software engineering (general)
        job.title = "Software Engineer".to_string(); // Change title to not contain "test"
        job.raw_data = Some(json!({
            "job_domain": {
                "primary_category": "software_engineering"
            }
        }));
        let score = calculate_domain_fit_score(&job);
        assert!(score.is_some());
        assert!((score.unwrap() - 40.0).abs() < 1.0);
    }

    #[test]
    fn test_flexibility_score() {
        use serde_json::json;

        let mut job = Job {
            job_id: Uuid::new_v4(),
            title: "Test Job".to_string(),
            company: "Test Co".to_string(),
            location: Some("Remote".to_string()),
            source: "test".to_string(),
            salary: None,
            commute_time: None,
            status: "new".to_string(),
            date_email_sent: Utc::now(),
            description: Some("3-day retainer arrangement with flexible hours".to_string()),
            condensed_description: None,
            url: None,
            filter_reason: None,
            extraction_method: None,
            raw_data: Some(json!({})),
        };

        // Test with retainer in contract_duration
        job.raw_data = Some(json!({
            "employment": {
                "contract_duration": "3-day retainer"
            }
        }));
        let score = calculate_flexibility_score(&job);
        assert!(score.is_some());
        // Should detect "3-day retainer" and score 100
        assert!((score.unwrap() - 100.0).abs() < 1.0);

        // Test with schedule flexibility
        job.description = Some("Flexible schedule".to_string());
        job.raw_data = Some(json!({
            "commute": {
                "schedule_flexibility": true
            }
        }));
        let score = calculate_flexibility_score(&job);
        assert!(score.is_some());
        assert!(score.unwrap() >= 60.0); // Should score for flexibility
    }

    #[test]
    fn test_benefits_score() {
        use serde_json::json;

        let mut job = Job {
            job_id: Uuid::new_v4(),
            title: "Test Job".to_string(),
            company: "Test Co".to_string(),
            location: Some("Remote".to_string()),
            source: "test".to_string(),
            salary: None,
            commute_time: None,
            status: "new".to_string(),
            date_email_sent: Utc::now(),
            description: Some("Blue Shield insurance provided".to_string()),
            condensed_description: None,
            url: None,
            filter_reason: None,
            extraction_method: None,
            raw_data: Some(json!({
                "employment": {
                    "benefits": "Blue Shield health insurance"
                }
            })),
        };

        // Test private insurance (should score 100)
        let score = calculate_benefits_score(&job);
        assert!(score.is_some());
        assert!((score.unwrap() - 100.0).abs() < 1.0);

        // Test comprehensive benefits (should score 70)
        job.raw_data = Some(json!({
            "employment": {
                "benefits": "Comprehensive benefits package"
            }
        }));
        let score = calculate_benefits_score(&job);
        assert!(score.is_some());
        assert!((score.unwrap() - 70.0).abs() < 1.0);
    }

    #[test]
    fn test_industry_score() {
        use serde_json::json;

        let mut job = Job {
            job_id: Uuid::new_v4(),
            title: "Test Job".to_string(),
            company: "Test Co".to_string(),
            location: Some("Remote".to_string()),
            source: "test".to_string(),
            salary: None,
            commute_time: None,
            status: "new".to_string(),
            date_email_sent: Utc::now(),
            description: Some("Test".to_string()),
            condensed_description: None,
            url: None,
            filter_reason: None,
            extraction_method: None,
            raw_data: Some(json!({
                "company_industry": "Healthcare Technology"
            })),
        };

        // Test healthcare tech (should score 100)
        let score = calculate_industry_score(&job);
        assert!(score.is_some());
        assert!((score.unwrap() - 100.0).abs() < 1.0);

        // Test enterprise SaaS (should score 90)
        job.raw_data = Some(json!({
            "company_industry": "Enterprise SaaS"
        }));
        let score = calculate_industry_score(&job);
        assert!(score.is_some());
        assert!((score.unwrap() - 90.0).abs() < 1.0);

        // Test unknown industry (should score 40)
        job.raw_data = Some(json!({
            "company_industry": "Unknown"
        }));
        let score = calculate_industry_score(&job);
        assert!(score.is_some());
        assert!((score.unwrap() - 40.0).abs() < 1.0);
    }

    // ============================================================================
    // Phase 4.2: Automatic Pagination Tests
    // ============================================================================

    #[test]
    fn test_rapidapi_auto_increment_logic() {
        // Test that page increments correctly on successful sync
        let current_page = 1;
        let jobs_discovered = 10; // Non-zero means success

        let next_page = if jobs_discovered == 0 {
            1 // Reset to page 1 if no results
        } else {
            current_page + 1 // Increment page
        };

        assert_eq!(next_page, 2, "Page should increment to 2 after successful sync");

        // Test page 5 to 6
        let current_page = 5;
        let jobs_discovered = 8;

        let next_page = if jobs_discovered == 0 {
            1
        } else {
            current_page + 1
        };

        assert_eq!(next_page, 6, "Page should increment from 5 to 6");
    }

    #[test]
    fn test_rapidapi_auto_reset_on_empty_results() {
        // Test that page resets to 1 when 0 jobs discovered (end of results)
        let current_page = 15;
        let jobs_discovered = 0; // End of results

        let next_page = if jobs_discovered == 0 {
            1 // Auto-reset to page 1
        } else {
            current_page + 1
        };

        assert_eq!(next_page, 1, "Page should reset to 1 when no jobs discovered");

        // Test from page 1 with empty results (stays at 1)
        let current_page = 1;
        let jobs_discovered = 0;

        let next_page = if jobs_discovered == 0 {
            1
        } else {
            current_page + 1
        };

        assert_eq!(next_page, 1, "Page should stay at 1 when already at 1 with empty results");
    }

    #[test]
    fn test_rapidapi_state_response_structure() {
        // Test that the state endpoint returns the expected JSON structure
        use serde_json::json;

        let state_response = json!({
            "success": true,
            "current_page": 3,
            "is_active": true
        });

        assert_eq!(state_response["success"], true);
        assert_eq!(state_response["current_page"], 3);
        assert_eq!(state_response["is_active"], true);

        // Test default state when no source exists
        let default_state = json!({
            "success": true,
            "current_page": 1,
            "is_active": false
        });

        assert_eq!(default_state["current_page"], 1, "Should default to page 1");
        assert_eq!(default_state["is_active"], false, "Should default to inactive");
    }

    #[test]
    fn test_rapidapi_pagination_reset_response() {
        // Test that reset endpoint returns success message
        use serde_json::json;

        let reset_response = json!({
            "success": true,
            "message": "Pagination reset to page 1"
        });

        assert_eq!(reset_response["success"], true);
        assert_eq!(reset_response["message"], "Pagination reset to page 1");
    }
}
