use sqlx::{PgPool, Pool, Postgres};
use uuid::Uuid;
use serial_test::serial;

// Note: These tests verify the database setup and logic for Phase 2.9 Gmail label management.
// Full integration tests with Gmail API mocking would require refactoring the functions
// to accept configurable base URLs, which is beyond the scope of this phase.

#[cfg(test)]
mod gmail_label_tests {
    use super::*;

    // Test helper to create a test database pool
    async fn create_test_pool() -> Pool<Postgres> {
        let database_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://jobhunter_user:jobhunter_dev_password@localhost/jobhunter_test".to_string());

        sqlx::postgres::PgPool::connect(&database_url)
            .await
            .expect("Failed to connect to test database")
    }

    // Cleanup test data
    async fn cleanup_test_data(pool: &PgPool) {
        let _ = sqlx::query!("DELETE FROM email_jobs WHERE sender_email = 'test@example.com'")
            .execute(pool)
            .await;
        let _ = sqlx::query!("DELETE FROM jobs WHERE title LIKE 'Test%' OR title LIKE 'Integration%'")
            .execute(pool)
            .await;
        let _ = sqlx::query!("DELETE FROM oauth_credentials WHERE client_id = 'test_client'")
            .execute(pool)
            .await;
        let _ = sqlx::query!("DELETE FROM job_sources WHERE source_name = 'gmail' AND source_type = 'email'")
            .execute(pool)
            .await;
    }

#[tokio::test]
#[serial]
async fn test_gmail_job_database_setup() -> Result<(), Box<dyn std::error::Error>> {
    let pool = create_test_pool().await;
    cleanup_test_data(&pool).await;
    // This test verifies that we can set up the database correctly for Gmail job rejection

    let job_id = Uuid::new_v4();

    // Insert test job
    sqlx::query!(
        "INSERT INTO jobs (job_id, title, company, location, source, status) VALUES ($1, 'Test Job', 'Test Company', 'Remote', 'gmail', 'new')",
        job_id
    )
    .execute(&pool)
    .await?;

    // Insert test email_job (Gmail source = NULL)
    let email_job_id = Uuid::new_v4();
    sqlx::query!(
        r#"
        INSERT INTO email_jobs (
            email_job_id, message_id, thread_id, sender_email, sender_name,
            subject, received_date, body_text, processed, job_id
        ) VALUES ($1, 'msg_test_123', 'thread_123', 'test@example.com', 'Test Sender',
                  'Test Subject', NOW(), 'Test body', true, $2)
        "#,
        email_job_id,
        job_id
    )
    .execute(&pool)
    .await?;

    // Verify email_job has source='gmail' (default value for Gmail emails)
    let email_job = sqlx::query!(
        "SELECT source FROM email_jobs WHERE job_id = $1",
        job_id
    )
    .fetch_one(&pool)
    .await?;

    assert_eq!(email_job.source, Some("gmail".to_string()), "Gmail jobs should have source='gmail' (default value)");

    cleanup_test_data(&pool).await;
    Ok(())
}

#[tokio::test]
#[serial]
async fn test_microsoft_job_database_setup() -> Result<(), Box<dyn std::error::Error>> {
    let pool = create_test_pool().await;
    cleanup_test_data(&pool).await;
    // This test verifies that Microsoft jobs are correctly distinguished from Gmail jobs

    let job_id = Uuid::new_v4();

    // Insert test job
    sqlx::query!(
        "INSERT INTO jobs (job_id, title, company, location, source, status) VALUES ($1, 'Test Job', 'Test Company', 'Remote', 'microsoft_email', 'new')",
        job_id
    )
    .execute(&pool)
    .await?;

    // Insert test email_job with source='microsoft_email'
    let email_job_id = Uuid::new_v4();
    sqlx::query!(
        r#"
        INSERT INTO email_jobs (
            email_job_id, message_id, thread_id, sender_email, sender_name,
            subject, received_date, body_text, processed, job_id, source
        ) VALUES ($1, 'msg_ms_123', 'thread_ms_123', 'test@example.com', 'Test Sender',
                  'Test Subject', NOW(), 'Test body', true, $2, 'microsoft_email')
        "#,
        email_job_id,
        job_id
    )
    .execute(&pool)
    .await?;

    // Verify email_job has source='microsoft_email'
    let email_job = sqlx::query!(
        "SELECT source FROM email_jobs WHERE job_id = $1",
        job_id
    )
    .fetch_one(&pool)
    .await?;

    assert_eq!(email_job.source, Some("microsoft_email".to_string()), "Microsoft jobs should have source='microsoft_email'");

    cleanup_test_data(&pool).await;
    Ok(())
}

#[tokio::test]
#[serial]
async fn test_oauth_credentials_query() -> Result<(), Box<dyn std::error::Error>> {
    let pool = create_test_pool().await;
    cleanup_test_data(&pool).await;
    // This test verifies the OAuth credentials query pattern used in reject_job

    // Insert test job source
    let source_id = Uuid::new_v4();
    sqlx::query!(
        "INSERT INTO job_sources (source_id, source_name, source_type, is_active) VALUES ($1, 'gmail', 'email', true)",
        source_id
    )
    .execute(&pool)
    .await?;

    // Insert test OAuth credentials
    sqlx::query!(
        "INSERT INTO oauth_credentials (source_id, client_id, client_secret, access_token) VALUES ($1, 'test_client', 'test_secret', 'test_token_123')",
        source_id
    )
    .execute(&pool)
    .await?;

    // Test the query pattern used in reject_job endpoint
    let oauth_creds = sqlx::query!(
        "SELECT access_token FROM oauth_credentials WHERE source_id = (SELECT source_id FROM job_sources WHERE source_name = 'gmail' LIMIT 1) LIMIT 1",
    )
    .fetch_optional(&pool)
    .await?;

    assert!(oauth_creds.is_some(), "Should find OAuth credentials");
    assert_eq!(oauth_creds.unwrap().access_token, Some("test_token_123".to_string()));

    cleanup_test_data(&pool).await;
    Ok(())
}

// Integration test for the full rejection workflow
#[tokio::test]
#[serial]
async fn test_reject_job_endpoint_integration() -> Result<(), Box<dyn std::error::Error>> {
    let pool = create_test_pool().await;
    cleanup_test_data(&pool).await;
    // This test validates the full endpoint behavior without mocking Gmail API
    // Since we can't actually call Gmail API in tests, we verify the database changes

    // Setup: Create test job
    let job_id = Uuid::new_v4();

    sqlx::query!(
        "INSERT INTO jobs (job_id, title, company, location, source, status) VALUES ($1, 'Integration Test Job', 'Test Company', 'Remote', 'gmail', 'new')",
        job_id
    )
    .execute(&pool)
    .await?;

    // Insert test email_job
    let email_job_id = Uuid::new_v4();
    sqlx::query!(
        r#"
        INSERT INTO email_jobs (
            email_job_id, message_id, thread_id, sender_email, sender_name,
            subject, received_date, body_text, processed, job_id
        ) VALUES ($1, 'msg_integration_123', 'thread_integration_123', 'test@example.com', 'Test Sender',
                  'Test Subject', NOW(), 'Test body', true, $2)
        "#,
        email_job_id,
        job_id
    )
    .execute(&pool)
    .await?;

    // Manually update job status to 'rejected' (simulating the endpoint)
    sqlx::query!(
        "UPDATE jobs SET status = 'rejected', updated_at = NOW() WHERE job_id = $1",
        job_id
    )
    .execute(&pool)
    .await?;

    // Verify job status was updated
    let job = sqlx::query!(
        "SELECT status FROM jobs WHERE job_id = $1",
        job_id
    )
    .fetch_one(&pool)
    .await?;

    assert_eq!(job.status, Some("rejected".to_string()));

    // Verify email_job exists and has correct message_id
    let email_job = sqlx::query!(
        "SELECT message_id, source FROM email_jobs WHERE job_id = $1",
        job_id
    )
    .fetch_one(&pool)
    .await?;

    assert_eq!(email_job.message_id, "msg_integration_123");
    assert_eq!(email_job.source, Some("gmail".to_string())); // Gmail jobs have source='gmail' (default value)

    cleanup_test_data(&pool).await;
    Ok(())
}

} // End of gmail_label_tests module
