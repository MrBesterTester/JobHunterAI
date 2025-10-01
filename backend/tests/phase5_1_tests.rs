// ============================================================================
// Phase 5.1: Calendar Integration & Follow-ups Tests
// ============================================================================
// Tests for interviews, follow-ups, timeline, and enhanced application tracking
// Target: 25+ tests covering all Phase 5.1 functionality

use serial_test::serial;
use sqlx::postgres::{PgPool, PgPoolOptions};
use chrono::{Utc, Duration};
use uuid::Uuid;
use std::env;

// ============================================================================
// Test Setup and Helper Functions
// ============================================================================

async fn setup_test_db() -> PgPool {
    dotenv::dotenv().ok();
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set for tests");

    PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to test database")
}

async fn create_test_job(pool: &PgPool) -> Uuid {
    sqlx::query_scalar(
        "INSERT INTO jobs (title, company, salary, location, source, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING job_id"
    )
    .bind("Senior Test Engineer")
    .bind("TechCorp")
    .bind(150000)
    .bind("Remote")
    .bind("linkedin")
    .bind("approved")
    .fetch_one(pool)
    .await
    .expect("Failed to create test job")
}

async fn create_test_application(pool: &PgPool, job_id: Uuid) -> Uuid {
    sqlx::query_scalar(
        "INSERT INTO applications (job_id, application_status, date_applied)
         VALUES ($1, $2, NOW())
         RETURNING application_id"
    )
    .bind(job_id)
    .bind("applied")
    .fetch_one(pool)
    .await
    .expect("Failed to create test application")
}

async fn cleanup_test_data(pool: &PgPool, job_id: Uuid) {
    sqlx::query("DELETE FROM jobs WHERE job_id = $1")
        .bind(job_id)
        .execute(pool)
        .await
        .ok();
}

// ============================================================================
// Interview Management Tests
// ============================================================================

#[tokio::test]
#[serial]
async fn test_create_interview() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    // Create interview
    let scheduled_date = Utc::now() + Duration::days(7);
    let interview_id: Uuid = sqlx::query_scalar(
        "INSERT INTO interviews (
            application_id, interview_type, scheduled_date, duration_minutes,
            location, interviewer_name, interviewer_email
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING interview_id"
    )
    .bind(application_id)
    .bind("technical")
    .bind(scheduled_date)
    .bind(60)
    .bind("https://zoom.us/j/123456")
    .bind("Jane Smith")
    .bind("jane.smith@techcorp.com")
    .fetch_one(&pool)
    .await
    .expect("Failed to create interview");

    // Verify interview was created
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM interviews WHERE interview_id = $1"
    )
    .bind(interview_id)
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(count, 1, "Interview should be created");

    cleanup_test_data(&pool, job_id).await;
}

#[tokio::test]
#[serial]
async fn test_get_upcoming_interviews() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    // Create interview in the future
    let scheduled_date = Utc::now() + Duration::days(5);
    sqlx::query(
        "INSERT INTO interviews (
            application_id, interview_type, scheduled_date, status
        ) VALUES ($1, $2, $3, $4)"
    )
    .bind(application_id)
    .bind("phone")
    .bind(scheduled_date)
    .bind("scheduled")
    .execute(&pool)
    .await
    .expect("Failed to create interview");

    // Query upcoming interviews view
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM upcoming_interviews
         WHERE application_id = $1"
    )
    .bind(application_id)
    .fetch_one(&pool)
    .await
    .unwrap();

    assert!(count > 0, "Upcoming interview should be found");

    cleanup_test_data(&pool, job_id).await;
}

#[tokio::test]
#[serial]
async fn test_update_interview() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    // Create interview
    let scheduled_date = Utc::now() + Duration::days(7);
    let interview_id: Uuid = sqlx::query_scalar(
        "INSERT INTO interviews (application_id, interview_type, scheduled_date)
         VALUES ($1, $2, $3)
         RETURNING interview_id"
    )
    .bind(application_id)
    .bind("phone")
    .bind(scheduled_date)
    .fetch_one(&pool)
    .await
    .unwrap();

    // Update interview
    let new_scheduled_date = Utc::now() + Duration::days(10);
    sqlx::query(
        "UPDATE interviews
         SET scheduled_date = $1, interview_type = $2, status = $3
         WHERE interview_id = $4"
    )
    .bind(new_scheduled_date)
    .bind("video")
    .bind("rescheduled")
    .bind(interview_id)
    .execute(&pool)
    .await
    .expect("Failed to update interview");

    // Verify update
    let (interview_type, status): (String, String) = sqlx::query_as(
        "SELECT interview_type, status FROM interviews WHERE interview_id = $1"
    )
    .bind(interview_id)
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(interview_type, "video");
    assert_eq!(status, "rescheduled");

    cleanup_test_data(&pool, job_id).await;
}

#[tokio::test]
#[serial]
async fn test_delete_interview() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    // Create interview
    let scheduled_date = Utc::now() + Duration::days(7);
    let interview_id: Uuid = sqlx::query_scalar(
        "INSERT INTO interviews (application_id, interview_type, scheduled_date)
         VALUES ($1, $2, $3)
         RETURNING interview_id"
    )
    .bind(application_id)
    .bind("phone")
    .bind(scheduled_date)
    .fetch_one(&pool)
    .await
    .unwrap();

    // Delete interview
    sqlx::query("DELETE FROM interviews WHERE interview_id = $1")
        .bind(interview_id)
        .execute(&pool)
        .await
        .expect("Failed to delete interview");

    // Verify deletion
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM interviews WHERE interview_id = $1"
    )
    .bind(interview_id)
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(count, 0, "Interview should be deleted");

    cleanup_test_data(&pool, job_id).await;
}

#[tokio::test]
#[serial]
async fn test_interview_cascade_delete() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    // Create interview
    let scheduled_date = Utc::now() + Duration::days(7);
    let interview_id: Uuid = sqlx::query_scalar(
        "INSERT INTO interviews (application_id, interview_type, scheduled_date)
         VALUES ($1, $2, $3)
         RETURNING interview_id"
    )
    .bind(application_id)
    .bind("phone")
    .bind(scheduled_date)
    .fetch_one(&pool)
    .await
    .unwrap();

    // Delete application (should cascade to interview)
    cleanup_test_data(&pool, job_id).await;

    // Verify interview was also deleted
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM interviews WHERE interview_id = $1"
    )
    .bind(interview_id)
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(count, 0, "Interview should be cascade deleted");
}

// ============================================================================
// Follow-up Management Tests
// ============================================================================

#[tokio::test]
#[serial]
async fn test_create_follow_up() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    // Create follow-up
    let scheduled_date = Utc::now() + Duration::days(14);
    let follow_up_id: Uuid = sqlx::query_scalar(
        "INSERT INTO follow_up_schedule (
            application_id, scheduled_date, attempt_number,
            follow_up_type, status, subject, body
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING follow_up_id"
    )
    .bind(application_id)
    .bind(scheduled_date)
    .bind(1)
    .bind("application")
    .bind("pending")
    .bind("Following up on Test Engineer Application")
    .bind("Dear Hiring Manager, I wanted to follow up...")
    .fetch_one(&pool)
    .await
    .expect("Failed to create follow-up");

    // Verify follow-up was created
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM follow_up_schedule WHERE follow_up_id = $1"
    )
    .bind(follow_up_id)
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(count, 1, "Follow-up should be created");

    cleanup_test_data(&pool, job_id).await;
}

#[tokio::test]
#[serial]
async fn test_get_pending_follow_ups() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    // Create pending follow-up scheduled for near future
    let scheduled_date = Utc::now() + Duration::days(5);
    sqlx::query(
        "INSERT INTO follow_up_schedule (
            application_id, scheduled_date, attempt_number, status
        ) VALUES ($1, $2, $3, $4)"
    )
    .bind(application_id)
    .bind(scheduled_date)
    .bind(1)
    .bind("pending")
    .execute(&pool)
    .await
    .expect("Failed to create follow-up");

    // Query pending follow-ups view
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pending_follow_ups
         WHERE application_id = $1"
    )
    .bind(application_id)
    .fetch_one(&pool)
    .await
    .unwrap();

    assert!(count > 0, "Pending follow-up should be found");

    cleanup_test_data(&pool, job_id).await;
}

#[tokio::test]
#[serial]
async fn test_approve_follow_up() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    // Create follow-up
    let scheduled_date = Utc::now() + Duration::days(14);
    let follow_up_id: Uuid = sqlx::query_scalar(
        "INSERT INTO follow_up_schedule (application_id, scheduled_date, status)
         VALUES ($1, $2, $3)
         RETURNING follow_up_id"
    )
    .bind(application_id)
    .bind(scheduled_date)
    .bind("pending")
    .fetch_one(&pool)
    .await
    .unwrap();

    // Approve follow-up
    sqlx::query(
        "UPDATE follow_up_schedule
         SET status = $1, approved_by = $2, approved_at = NOW()
         WHERE follow_up_id = $3"
    )
    .bind("approved")
    .bind("Sam Kirk")
    .bind(follow_up_id)
    .execute(&pool)
    .await
    .expect("Failed to approve follow-up");

    // Verify approval
    let (status, approved_by): (String, Option<String>) = sqlx::query_as(
        "SELECT status, approved_by FROM follow_up_schedule WHERE follow_up_id = $1"
    )
    .bind(follow_up_id)
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(status, "approved");
    assert_eq!(approved_by, Some("Sam Kirk".to_string()));

    cleanup_test_data(&pool, job_id).await;
}

#[tokio::test]
#[serial]
async fn test_send_follow_up() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    // Create and approve follow-up
    let scheduled_date = Utc::now() + Duration::days(14);
    let follow_up_id: Uuid = sqlx::query_scalar(
        "INSERT INTO follow_up_schedule (application_id, scheduled_date, status)
         VALUES ($1, $2, $3)
         RETURNING follow_up_id"
    )
    .bind(application_id)
    .bind(scheduled_date)
    .bind("approved")
    .fetch_one(&pool)
    .await
    .unwrap();

    // Mark as sent
    sqlx::query(
        "UPDATE follow_up_schedule
         SET status = $1, sent_at = NOW()
         WHERE follow_up_id = $2"
    )
    .bind("sent")
    .bind(follow_up_id)
    .execute(&pool)
    .await
    .expect("Failed to mark follow-up as sent");

    // Verify sent status
    let (status, sent_at): (String, Option<chrono::DateTime<Utc>>) = sqlx::query_as(
        "SELECT status, sent_at FROM follow_up_schedule WHERE follow_up_id = $1"
    )
    .bind(follow_up_id)
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(status, "sent");
    assert!(sent_at.is_some(), "sent_at should be set");

    cleanup_test_data(&pool, job_id).await;
}

#[tokio::test]
#[serial]
async fn test_follow_up_attempt_tracking() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    // Create first follow-up
    let scheduled_date_1 = Utc::now() + Duration::days(14);
    sqlx::query(
        "INSERT INTO follow_up_schedule (
            application_id, scheduled_date, attempt_number, status
        ) VALUES ($1, $2, $3, $4)"
    )
    .bind(application_id)
    .bind(scheduled_date_1)
    .bind(1)
    .bind("sent")
    .execute(&pool)
    .await
    .unwrap();

    // Create second follow-up
    let scheduled_date_2 = Utc::now() + Duration::days(28);
    sqlx::query(
        "INSERT INTO follow_up_schedule (
            application_id, scheduled_date, attempt_number, status
        ) VALUES ($1, $2, $3, $4)"
    )
    .bind(application_id)
    .bind(scheduled_date_2)
    .bind(2)
    .bind("pending")
    .execute(&pool)
    .await
    .unwrap();

    // Verify both attempts exist
    let attempts: Vec<i32> = sqlx::query_scalar(
        "SELECT attempt_number FROM follow_up_schedule
         WHERE application_id = $1 ORDER BY attempt_number"
    )
    .bind(application_id)
    .fetch_all(&pool)
    .await
    .unwrap();

    assert_eq!(attempts, vec![1, 2], "Should have two follow-up attempts");

    cleanup_test_data(&pool, job_id).await;
}

#[tokio::test]
#[serial]
async fn test_follow_up_cascade_delete() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    // Create follow-up
    let scheduled_date = Utc::now() + Duration::days(14);
    let follow_up_id: Uuid = sqlx::query_scalar(
        "INSERT INTO follow_up_schedule (application_id, scheduled_date, status)
         VALUES ($1, $2, $3)
         RETURNING follow_up_id"
    )
    .bind(application_id)
    .bind(scheduled_date)
    .bind("pending")
    .fetch_one(&pool)
    .await
    .unwrap();

    // Delete application (should cascade to follow-up)
    cleanup_test_data(&pool, job_id).await;

    // Verify follow-up was also deleted
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM follow_up_schedule WHERE follow_up_id = $1"
    )
    .bind(follow_up_id)
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(count, 0, "Follow-up should be cascade deleted");
}

// ============================================================================
// Timeline Tests
// ============================================================================

#[tokio::test]
#[serial]
async fn test_application_timeline_view() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    // Create interview
    let scheduled_date = Utc::now() + Duration::days(7);
    sqlx::query(
        "INSERT INTO interviews (application_id, interview_type, scheduled_date)
         VALUES ($1, $2, $3)"
    )
    .bind(application_id)
    .bind("phone")
    .bind(scheduled_date)
    .execute(&pool)
    .await
    .unwrap();

    // Create follow-up
    let follow_up_date = Utc::now() + Duration::days(14);
    sqlx::query(
        "INSERT INTO follow_up_schedule (application_id, scheduled_date, status)
         VALUES ($1, $2, $3)"
    )
    .bind(application_id)
    .bind(follow_up_date)
    .bind("pending")
    .execute(&pool)
    .await
    .unwrap();

    // Query timeline view
    let event_types: Vec<String> = sqlx::query_scalar(
        "SELECT event_type FROM application_timeline
         WHERE application_id = $1 ORDER BY event_date"
    )
    .bind(application_id)
    .fetch_all(&pool)
    .await
    .unwrap();

    // Should have application, interview, and follow_up events
    assert!(event_types.contains(&"application".to_string()));
    assert!(event_types.contains(&"interview".to_string()));
    assert!(event_types.contains(&"follow_up".to_string()));
    assert!(event_types.len() >= 3, "Timeline should have at least 3 events");

    cleanup_test_data(&pool, job_id).await;
}

#[tokio::test]
#[serial]
async fn test_timeline_with_communications() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    // Add communication
    sqlx::query(
        "INSERT INTO communications (
            application_id, message_content, channel, direction, subject
        ) VALUES ($1, $2, $3, $4, $5)"
    )
    .bind(application_id)
    .bind("Thank you for your application")
    .bind("email")
    .bind("inbound")
    .bind("Application Received")
    .execute(&pool)
    .await
    .unwrap();

    // Query timeline
    let event_types: Vec<String> = sqlx::query_scalar(
        "SELECT event_type FROM application_timeline
         WHERE application_id = $1"
    )
    .bind(application_id)
    .fetch_all(&pool)
    .await
    .unwrap();

    assert!(event_types.contains(&"communication".to_string()));

    cleanup_test_data(&pool, job_id).await;
}

// ============================================================================
// Follow-up Template Tests
// ============================================================================

#[tokio::test]
#[serial]
async fn test_follow_up_templates_exist() {
    let pool = setup_test_db().await;

    // Query default templates
    let template_names: Vec<String> = sqlx::query_scalar(
        "SELECT template_name FROM follow_up_templates
         WHERE is_active = TRUE ORDER BY template_name"
    )
    .fetch_all(&pool)
    .await
    .unwrap();

    assert!(template_names.len() >= 3, "Should have at least 3 default templates");
    assert!(template_names.iter().any(|n| n.contains("First Follow-up")));
    assert!(template_names.iter().any(|n| n.contains("Second Follow-up")));
    assert!(template_names.iter().any(|n| n.contains("Interview Thank You")));
}

#[tokio::test]
#[serial]
async fn test_follow_up_template_variables() {
    let pool = setup_test_db().await;

    // Get first follow-up template
    let (subject_template, body_template, variables): (String, String, serde_json::Value) =
        sqlx::query_as(
            "SELECT subject_template, body_template, variables
             FROM follow_up_templates
             WHERE template_type = 'first_follow_up'
             LIMIT 1"
        )
        .fetch_one(&pool)
        .await
        .unwrap();

    // Verify template contains variable placeholders
    assert!(subject_template.contains("{{job_title}}"));
    assert!(body_template.contains("{{company}}"));
    assert!(body_template.contains("{{applicant_name}}"));

    // Verify variables JSON
    let vars_obj = variables.as_object().unwrap();
    assert!(vars_obj.contains_key("job_title"));
    assert!(vars_obj.contains_key("company"));
    assert!(vars_obj.contains_key("applicant_name"));
}

// ============================================================================
// Application Enhancements Tests
// ============================================================================

#[tokio::test]
#[serial]
async fn test_application_response_tracking() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    // Update response tracking
    sqlx::query(
        "UPDATE applications
         SET response_received = $1, last_contact_date = NOW()
         WHERE application_id = $2"
    )
    .bind(true)
    .bind(application_id)
    .execute(&pool)
    .await
    .unwrap();

    // Verify update
    let (response_received, last_contact_date): (bool, Option<chrono::DateTime<Utc>>) =
        sqlx::query_as(
            "SELECT response_received, last_contact_date
             FROM applications WHERE application_id = $1"
        )
        .bind(application_id)
        .fetch_one(&pool)
        .await
        .unwrap();

    assert!(response_received);
    assert!(last_contact_date.is_some());

    cleanup_test_data(&pool, job_id).await;
}

#[tokio::test]
#[serial]
async fn test_application_offer_tracking() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    // Update offer tracking
    sqlx::query(
        "UPDATE applications
         SET offer_received = $1, offer_amount = $2
         WHERE application_id = $3"
    )
    .bind(true)
    .bind(165000)
    .bind(application_id)
    .execute(&pool)
    .await
    .unwrap();

    // Verify update
    let (offer_received, offer_amount): (bool, Option<i32>) =
        sqlx::query_as(
            "SELECT offer_received, offer_amount
             FROM applications WHERE application_id = $1"
        )
        .bind(application_id)
        .fetch_one(&pool)
        .await
        .unwrap();

    assert!(offer_received);
    assert_eq!(offer_amount, Some(165000));

    cleanup_test_data(&pool, job_id).await;
}

// ============================================================================
// Statistics Views Tests
// ============================================================================

#[tokio::test]
#[serial]
async fn test_application_stats_enhanced_view() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    // Add interview
    let scheduled_date = Utc::now() + Duration::days(7);
    sqlx::query(
        "INSERT INTO interviews (application_id, interview_type, scheduled_date)
         VALUES ($1, $2, $3)"
    )
    .bind(application_id)
    .bind("phone")
    .bind(scheduled_date)
    .execute(&pool)
    .await
    .unwrap();

    // Add follow-up
    let follow_up_date = Utc::now() + Duration::days(14);
    sqlx::query(
        "INSERT INTO follow_up_schedule (application_id, scheduled_date, status)
         VALUES ($1, $2, $3)"
    )
    .bind(application_id)
    .bind(follow_up_date)
    .bind("pending")
    .execute(&pool)
    .await
    .unwrap();

    // Query enhanced stats view
    let stats: (i64, i64, i64, Option<i64>) = sqlx::query_as(
        "SELECT
            total_applications,
            interviews_scheduled,
            pending_follow_ups,
            sent_follow_ups
         FROM application_stats_enhanced"
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    let (total_applications, interviews_scheduled, pending_follow_ups, _sent_follow_ups) = stats;

    assert!(total_applications > 0);
    assert!(interviews_scheduled > 0);
    assert!(pending_follow_ups > 0);

    cleanup_test_data(&pool, job_id).await;
}

#[tokio::test]
#[serial]
async fn test_response_rate_calculation() {
    let pool = setup_test_db().await;
    let job_id1 = create_test_job(&pool).await;
    let app_id1 = create_test_application(&pool, job_id1).await;

    // Mark one application as received response
    sqlx::query(
        "UPDATE applications SET response_received = TRUE WHERE application_id = $1"
    )
    .bind(app_id1)
    .execute(&pool)
    .await
    .unwrap();

    // Query response rate (cast NUMERIC to float)
    let response_rate: Option<f64> = sqlx::query_scalar(
        "SELECT response_rate_percent::FLOAT FROM application_stats_enhanced"
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert!(response_rate.is_some());
    assert!(response_rate.unwrap() > 0.0, "Response rate should be greater than 0");

    cleanup_test_data(&pool, job_id1).await;
}

// ============================================================================
// Integration Tests
// ============================================================================

#[tokio::test]
#[serial]
async fn test_complete_interview_workflow() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    // 1. Schedule interview
    let scheduled_date = Utc::now() + Duration::days(7);
    let interview_id: Uuid = sqlx::query_scalar(
        "INSERT INTO interviews (application_id, interview_type, scheduled_date, status)
         VALUES ($1, $2, $3, $4)
         RETURNING interview_id"
    )
    .bind(application_id)
    .bind("phone")
    .bind(scheduled_date)
    .bind("scheduled")
    .fetch_one(&pool)
    .await
    .unwrap();

    // 2. Complete interview
    sqlx::query(
        "UPDATE interviews SET status = $1 WHERE interview_id = $2"
    )
    .bind("completed")
    .bind(interview_id)
    .execute(&pool)
    .await
    .unwrap();

    // 3. Send thank you communication
    sqlx::query(
        "INSERT INTO communications (
            application_id, interview_id, message_content,
            channel, direction, subject
        ) VALUES ($1, $2, $3, $4, $5, $6)"
    )
    .bind(application_id)
    .bind(interview_id)
    .bind("Thank you for the interview")
    .bind("email")
    .bind("outbound")
    .bind("Thank you for the opportunity")
    .execute(&pool)
    .await
    .unwrap();

    // Verify complete workflow in timeline
    let event_types: Vec<String> = sqlx::query_scalar(
        "SELECT event_type FROM application_timeline
         WHERE application_id = $1 ORDER BY event_date"
    )
    .bind(application_id)
    .fetch_all(&pool)
    .await
    .unwrap();

    assert!(event_types.contains(&"interview".to_string()));
    assert!(event_types.contains(&"communication".to_string()));

    cleanup_test_data(&pool, job_id).await;
}

#[tokio::test]
#[serial]
async fn test_complete_follow_up_workflow() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    // 1. Create follow-up
    let scheduled_date = Utc::now() + Duration::days(14);
    let follow_up_id: Uuid = sqlx::query_scalar(
        "INSERT INTO follow_up_schedule (
            application_id, scheduled_date, attempt_number, status, subject, body
        ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING follow_up_id"
    )
    .bind(application_id)
    .bind(scheduled_date)
    .bind(1)
    .bind("pending")
    .bind("Following up on application")
    .bind("Dear Hiring Manager...")
    .fetch_one(&pool)
    .await
    .unwrap();

    // 2. Approve follow-up
    sqlx::query(
        "UPDATE follow_up_schedule
         SET status = $1, approved_by = $2, approved_at = NOW()
         WHERE follow_up_id = $3"
    )
    .bind("approved")
    .bind("Sam Kirk")
    .bind(follow_up_id)
    .execute(&pool)
    .await
    .unwrap();

    // 3. Send follow-up
    sqlx::query(
        "UPDATE follow_up_schedule
         SET status = $1, sent_at = NOW()
         WHERE follow_up_id = $2"
    )
    .bind("sent")
    .bind(follow_up_id)
    .execute(&pool)
    .await
    .unwrap();

    // 4. Create communication record
    sqlx::query(
        "INSERT INTO communications (
            application_id, follow_up_id, message_content,
            channel, direction, subject
        ) VALUES ($1, $2, $3, $4, $5, $6)"
    )
    .bind(application_id)
    .bind(follow_up_id)
    .bind("Dear Hiring Manager...")
    .bind("email")
    .bind("outbound")
    .bind("Following up on application")
    .execute(&pool)
    .await
    .unwrap();

    // Verify complete workflow
    let (status, sent_at): (String, Option<chrono::DateTime<Utc>>) =
        sqlx::query_as(
            "SELECT status, sent_at FROM follow_up_schedule
             WHERE follow_up_id = $1"
        )
        .bind(follow_up_id)
        .fetch_one(&pool)
        .await
        .unwrap();

    assert_eq!(status, "sent");
    assert!(sent_at.is_some());

    cleanup_test_data(&pool, job_id).await;
}

#[tokio::test]
#[serial]
async fn test_database_constraints() {
    let pool = setup_test_db().await;

    // Test that interview requires valid application_id
    let invalid_app_id = Uuid::new_v4();
    let scheduled_date = Utc::now() + Duration::days(7);

    let result = sqlx::query(
        "INSERT INTO interviews (application_id, interview_type, scheduled_date)
         VALUES ($1, $2, $3)"
    )
    .bind(invalid_app_id)
    .bind("phone")
    .bind(scheduled_date)
    .execute(&pool)
    .await;

    assert!(result.is_err(), "Should fail with invalid application_id");
}

#[tokio::test]
#[serial]
async fn test_interview_status_values() {
    let pool = setup_test_db().await;
    let job_id = create_test_job(&pool).await;
    let application_id = create_test_application(&pool, job_id).await;

    let scheduled_date = Utc::now() + Duration::days(7);

    // Test all valid status values
    let valid_statuses = vec!["scheduled", "completed", "cancelled", "rescheduled"];

    for status in valid_statuses {
        let interview_id: Uuid = sqlx::query_scalar(
            "INSERT INTO interviews (application_id, interview_type, scheduled_date, status)
             VALUES ($1, $2, $3, $4)
             RETURNING interview_id"
        )
        .bind(application_id)
        .bind("phone")
        .bind(scheduled_date)
        .bind(status)
        .fetch_one(&pool)
        .await
        .expect(&format!("Should accept status: {}", status));

        // Clean up
        sqlx::query("DELETE FROM interviews WHERE interview_id = $1")
            .bind(interview_id)
            .execute(&pool)
            .await
            .ok();
    }

    cleanup_test_data(&pool, job_id).await;
}
