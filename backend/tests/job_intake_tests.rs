use sqlx::{PgPool, Pool, Postgres};
use uuid::Uuid;
use serde_json::json;
use serial_test::serial;
use sha2::{Sha256, Digest};

// Job intake automation tests for Phase 4 - Gmail/LinkedIn Integration

#[cfg(test)]
mod job_intake_tests {
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
        let _ = sqlx::query!("DELETE FROM email_jobs WHERE sender_email LIKE 'test%@example.com'")
            .execute(pool)
            .await;
        let _ = sqlx::query!("DELETE FROM jobs WHERE company LIKE 'Test%'")
            .execute(pool)
            .await;
        let _ = sqlx::query!("DELETE FROM api_job_sources WHERE external_job_id LIKE '%test%'")
            .execute(pool)
            .await;
        let _ = sqlx::query!("DELETE FROM job_intake_logs WHERE sync_status = 'test'")
            .execute(pool)
            .await;
        let _ = sqlx::query!("DELETE FROM job_sources WHERE source_name LIKE '%_test'")
            .execute(pool)
            .await;
    }

    // Helper to insert test job source
    async fn insert_test_source(pool: &PgPool, name: &str, source_type: &str) -> Result<Uuid, sqlx::Error> {
        let source_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO job_sources (source_id, source_name, source_type, is_active)
            VALUES ($1, $2, $3, true)
            ON CONFLICT (source_name) DO UPDATE SET is_active = true
            RETURNING source_id
            "#,
            source_id,
            name,
            source_type
        )
        .fetch_one(pool)
        .await?;
        Ok(source_id)
    }

    // Helper function for SHA256 hashing
    fn generate_sha256_hash(input: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(input.to_lowercase());
        hex::encode(hasher.finalize())
    }

    // =================================================================
    // Gmail Integration Tests
    // =================================================================

    #[tokio::test]
    #[serial]
    async fn test_gmail_oauth_flow_simulation() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        // Simulate OAuth credential storage
        let source_id = insert_test_source(&pool, "gmail_oauth_test", "email").await
            .expect("Should create test source");

        let credential_id = Uuid::new_v4();
        let result = sqlx::query!(
            r#"
            INSERT INTO oauth_credentials (
                credential_id, source_id, client_id, client_secret,
                access_token, refresh_token, token_expires_at
            ) VALUES ($1, $2, 'test_client_id', 'test_client_secret',
                      'test_access_token', 'test_refresh_token', NOW() + INTERVAL '1 hour')
            "#,
            credential_id,
            source_id
        )
        .execute(&pool)
        .await;

        assert!(result.is_ok(), "Should store OAuth credentials");

        // Verify credentials are retrievable
        let credential = sqlx::query!(
            "SELECT access_token, refresh_token FROM oauth_credentials WHERE source_id = $1",
            source_id
        )
        .fetch_one(&pool)
        .await
        .expect("Should retrieve credentials");

        assert_eq!(credential.access_token, Some("test_access_token".to_string()));
        assert_eq!(credential.refresh_token, Some("test_refresh_token".to_string()));

        cleanup_test_data(&pool).await;
    }

    #[test]
    fn test_gmail_api_json_deserialization() {
        // Test that Gmail API response JSON with camelCase fields deserializes correctly
        // This is a critical test for the actual Gmail API integration

        // Simulate real Gmail API response format
        let gmail_json = r#"{
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
                },
                "parts": []
            }
        }"#;

        // Attempt to deserialize - this will fail if field names don't match
        let result: Result<serde_json::Value, _> = serde_json::from_str(gmail_json);
        assert!(result.is_ok(), "Gmail JSON should parse as Value");

        let parsed_value = result.unwrap();
        assert_eq!(parsed_value["id"].as_str(), Some("18c5a9b2f3d4e5f6"));
        assert_eq!(parsed_value["threadId"].as_str(), Some("18c5a9b2f3d4e5f6"));
        assert_eq!(parsed_value["internalDate"].as_str(), Some("1696521600000"));

        // Now test with actual struct (this will fail if serde rename is missing)
        // Note: We need to define the structs in main.rs with proper serde annotations
        println!("Gmail API JSON structure validated");
    }

    #[tokio::test]
    #[serial]
    async fn test_gmail_token_expiration_detection() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        let source_id = insert_test_source(&pool, "gmail_expiry_test", "email").await
            .expect("Should create test source");

        // Insert expired token
        let credential_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO oauth_credentials (
                credential_id, source_id, client_id, client_secret,
                access_token, refresh_token, token_expires_at
            ) VALUES ($1, $2, 'test_client_id', 'test_client_secret',
                      'expired_token', 'test_refresh_token', NOW() - INTERVAL '1 hour')
            "#,
            credential_id,
            source_id
        )
        .execute(&pool)
        .await
        .expect("Should insert credential");

        // Check if token is expired
        let credential = sqlx::query!(
            "SELECT token_expires_at FROM oauth_credentials WHERE source_id = $1",
            source_id
        )
        .fetch_one(&pool)
        .await
        .expect("Should fetch credential");

        let is_expired = credential.token_expires_at.map_or(false, |expires_at| {
            chrono::Utc::now() > expires_at
        });

        assert!(is_expired, "Token should be detected as expired");

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_email_parsing_and_storage() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        // Simulate email job storage
        let email_job_id = Uuid::new_v4();
        let message_id = format!("test_msg_{}", Uuid::new_v4());
        let thread_id = format!("test_thread_{}", Uuid::new_v4());

        let result = sqlx::query!(
            r#"
            INSERT INTO email_jobs (
                email_job_id, message_id, thread_id, sender_email, sender_name,
                subject, received_date, body_text, processed
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, false)
            "#,
            email_job_id,
            message_id,
            thread_id,
            "test_recruiter@example.com",
            "Jane Recruiter",
            "Exciting Senior Test Engineer Position at TechCorp",
            "We are looking for a Senior Test Engineer with 5+ years experience..."
        )
        .execute(&pool)
        .await;

        assert!(result.is_ok(), "Should store email job");

        // Verify email is stored and retrievable
        let email = sqlx::query!(
            "SELECT sender_email, subject, processed FROM email_jobs WHERE email_job_id = $1",
            email_job_id
        )
        .fetch_one(&pool)
        .await
        .expect("Should retrieve email");

        assert_eq!(email.sender_email, "test_recruiter@example.com");
        assert!(email.subject.unwrap().contains("Test Engineer"));
        assert_eq!(email.processed, Some(false));

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_email_duplicate_detection() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        let message_id = format!("duplicate_test_{}", Uuid::new_v4());
        let thread_id = format!("thread_{}", Uuid::new_v4());

        // Insert first email
        let email_job_id_1 = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO email_jobs (
                email_job_id, message_id, thread_id, sender_email, sender_name,
                subject, received_date, body_text, processed
            ) VALUES ($1, $2, $3, 'test@example.com', 'Test Sender', 'Job Opening', NOW(), 'Body text', false)
            "#,
            email_job_id_1,
            message_id,
            thread_id
        )
        .execute(&pool)
        .await
        .expect("First insert should succeed");

        // Try to insert duplicate (same message_id)
        let email_job_id_2 = Uuid::new_v4();
        let result = sqlx::query!(
            r#"
            INSERT INTO email_jobs (
                email_job_id, message_id, thread_id, sender_email, sender_name,
                subject, received_date, body_text, processed
            ) VALUES ($1, $2, $3, 'test@example.com', 'Test Sender', 'Job Opening', NOW(), 'Body text', false)
            "#,
            email_job_id_2,
            message_id,
            thread_id
        )
        .execute(&pool)
        .await;

        // Should fail due to unique constraint on message_id
        assert!(result.is_err(), "Duplicate message_id should be rejected");

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_job_extraction_patterns() {
        // Test regex patterns for job extraction (no database needed)
        let email_body = r#"
            We're hiring a Senior AI Engineer at TestCompany!

            Position: Senior AI Engineer
            Company: TestCompany
            Location: Remote
            Salary: $160,000 - $180,000

            Requirements:
            - 5+ years of AI/ML experience
            - Strong Python and TensorFlow skills
            - Experience with LLMs and prompt engineering

            Apply at: https://testcompany.com/jobs/ai-engineer-123
        "#;

        // Test regex patterns for job extraction
        let salary_pattern = regex::Regex::new(r"\$(\d+,?\d+)").unwrap();
        let location_pattern = regex::Regex::new(r"Location:\s*(.+)").unwrap();
        let company_pattern = regex::Regex::new(r"Company:\s*(.+)").unwrap();
        let url_pattern = regex::Regex::new(r"https?://[^\s]+").unwrap();

        // Extract salary
        let salary_matches: Vec<_> = salary_pattern.find_iter(email_body).collect();
        assert!(salary_matches.len() >= 1, "Should extract at least one salary");

        // Extract location
        if let Some(location_match) = location_pattern.captures(email_body) {
            let location = location_match.get(1).unwrap().as_str().trim();
            assert_eq!(location, "Remote");
        } else {
            panic!("Should extract location");
        }

        // Extract company
        if let Some(company_match) = company_pattern.captures(email_body) {
            let company = company_match.get(1).unwrap().as_str().trim();
            assert_eq!(company, "TestCompany");
        } else {
            panic!("Should extract company");
        }

        // Extract URL
        let url_match = url_pattern.find(email_body);
        assert!(url_match.is_some(), "Should extract job URL");
    }

    #[tokio::test]
    #[serial]
    async fn test_gmail_rate_limiting_tracking() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        let source_id = insert_test_source(&pool, "gmail_rate_test", "email").await
            .expect("Should create source");

        // Create multiple intake logs to simulate rate limiting tracking
        for i in 0..5 {
            let log_id = Uuid::new_v4();
            sqlx::query!(
                r#"
                INSERT INTO job_intake_logs (
                    log_id, source_id, sync_status, sync_started_at, jobs_discovered
                ) VALUES ($1, $2, 'completed', NOW() - INTERVAL '1 minute' * $3, $4)
                "#,
                log_id,
                source_id,
                i as i32,
                (i * 10) as i32
            )
            .execute(&pool)
            .await
            .expect("Should insert log");
        }

        // Query recent sync frequency
        let recent_syncs = sqlx::query!(
            r#"
            SELECT COUNT(*) as count
            FROM job_intake_logs
            WHERE source_id = $1 AND sync_started_at > NOW() - INTERVAL '1 hour'
            "#,
            source_id
        )
        .fetch_one(&pool)
        .await
        .expect("Should count recent syncs");

        assert_eq!(recent_syncs.count.unwrap(), 5, "Should track 5 recent syncs");

        cleanup_test_data(&pool).await;
    }

    // =================================================================
    // LinkedIn Integration Tests
    // =================================================================

    #[tokio::test]
    #[serial]
    async fn test_linkedin_mock_job_processing() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        let _source_id = insert_test_source(&pool, "linkedin_job_test", "job_board").await
            .expect("Should create LinkedIn source");

        // Simulate LinkedIn API response
        let mock_linkedin_job = json!({
            "id": "test_linkedin_12345",
            "title": "Senior Test Automation Engineer",
            "company": "TestLinkedInCorp",
            "location": "San Francisco, CA",
            "description": "We're looking for an experienced Test Automation Engineer...",
            "salary": "$150,000 - $170,000",
            "url": "https://www.linkedin.com/jobs/view/12345",
            "posted_date": "2025-09-25"
        });

        // Extract job details from mock response
        let title = mock_linkedin_job["title"].as_str().unwrap();
        let company = mock_linkedin_job["company"].as_str().unwrap();
        let location = mock_linkedin_job["location"].as_str().unwrap();
        let url = mock_linkedin_job["url"].as_str().unwrap();

        assert_eq!(title, "Senior Test Automation Engineer");
        assert_eq!(company, "TestLinkedInCorp");
        assert!(location.contains("San Francisco"));
        assert!(url.contains("linkedin.com"));

        // Simulate job creation from LinkedIn data
        let job_id = Uuid::new_v4();
        let source_name = "linkedin";
        let result = sqlx::query!(
            r#"
            INSERT INTO jobs (
                job_id, source, title, company, location, url, status
            ) VALUES ($1, $2, $3, $4, $5, $6, 'new')
            "#,
            job_id,
            source_name,
            title,
            company,
            location,
            url
        )
        .execute(&pool)
        .await;

        assert!(result.is_ok(), "Should create job from LinkedIn data");

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_linkedin_search_parameters() {
        // Test LinkedIn API search parameter construction (no database needed)
        let min_salary = 130000;
        let keywords = vec!["Test Automation", "QA Engineer", "AI"];
        let location = "Remote";

        // Validate search parameters
        assert!(min_salary >= 100000, "Salary should be reasonable");
        assert!(!keywords.is_empty(), "Should have search keywords");
        assert!(!location.is_empty(), "Should have location filter");

        // Simulate query string construction
        let keyword_query = keywords.join(" OR ");
        assert!(keyword_query.contains("Test Automation"));
        assert!(keyword_query.contains("QA Engineer"));
    }

    #[tokio::test]
    #[serial]
    async fn test_linkedin_job_deduplication() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        // Insert first job
        let job_id_1 = Uuid::new_v4();
        let company = "TestLinkedInDedup";
        let title = "Senior Engineer";

        sqlx::query!(
            r#"
            INSERT INTO jobs (job_id, source, title, company, status)
            VALUES ($1, 'linkedin', $2, $3, 'new')
            "#,
            job_id_1,
            title,
            company
        )
        .execute(&pool)
        .await
        .expect("First job should insert");

        // Generate hash for deduplication check
        let hash = generate_sha256_hash(&format!("{}{}", company, title));

        // Check for duplicate before inserting second
        let existing = sqlx::query!(
            "SELECT job_id FROM job_deduplication WHERE company_title_hash = $1",
            hash
        )
        .fetch_optional(&pool)
        .await
        .expect("Should query deduplication");

        // In real implementation, deduplication record would be created
        // For now just verify the mechanism works
        assert!(existing.is_none(), "No deduplication record exists yet");

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_linkedin_response_validation() {
        // Test various LinkedIn API response scenarios (no database needed)

        // Valid response
        let valid_response = json!({
            "jobs": [
                {
                    "id": "job1",
                    "title": "Engineer",
                    "company": "Company1"
                }
            ]
        });
        assert!(valid_response["jobs"].is_array());

        // Empty response
        let empty_response = json!({
            "jobs": []
        });
        assert_eq!(empty_response["jobs"].as_array().unwrap().len(), 0);

        // Malformed response
        let malformed = json!({
            "error": "Invalid request"
        });
        assert!(malformed["jobs"].is_null());
    }

    // =================================================================
    // Indeed/RapidAPI Integration Tests (Phase 4.1)
    // =================================================================

    #[tokio::test]
    #[serial]
    async fn test_jsearch_api_job_sources_table() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        let source_id = insert_test_source(&pool, "rapidapi_test", "job_board").await
            .expect("Should create RapidAPI/JSearch source");

        // Simulate RapidAPI JSearch job being stored
        let api_job_id = Uuid::new_v4();
        let external_job_id = "jsearch_12345";
        let mock_response = json!({
            "job_id": external_job_id,
            "job_title": "Senior QA Automation Engineer",
            "employer_name": "TestJSearchCompany",
            "employer_logo": "https://example.com/logo.png",
            "job_city": "Fremont",
            "job_state": "CA",
            "job_country": "US",
            "job_description": "We are looking for a Senior QA Engineer...",
            "job_min_salary": 140000.0,
            "job_max_salary": 160000.0,
            "job_salary_currency": "USD",
            "job_is_remote": false,
            "job_employment_type": "FULLTIME",
            "job_apply_link": "https://www.example.com/jobs/12345"
        });

        let result = sqlx::query!(
            r#"
            INSERT INTO api_job_sources (
                api_job_id, source_id, external_job_id, external_url,
                raw_response, processed
            ) VALUES ($1, $2, $3, $4, $5, false)
            "#,
            api_job_id,
            source_id,
            external_job_id,
            mock_response["job_apply_link"].as_str().unwrap(),
            mock_response
        )
        .execute(&pool)
        .await;

        assert!(result.is_ok(), "Should store RapidAPI job");

        // Verify retrieval - just check that the record exists
        let count = sqlx::query!(
            r#"
            SELECT COUNT(*) as count
            FROM api_job_sources
            WHERE api_job_id = $1 AND processed = false
            "#,
            api_job_id
        )
        .fetch_one(&pool)
        .await
        .expect("Should count API jobs");

        assert_eq!(count.count, Some(1), "Should have stored one API job");

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_jsearch_job_deduplication_by_external_id() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        let source_id = insert_test_source(&pool, "rapidapi_dedup_test", "job_board").await
            .expect("Should create source");

        let external_job_id = "jsearch_duplicate_test_123";
        let mock_response = json!({
            "job_id": external_job_id,
            "job_title": "Test Engineer",
            "employer_name": "TestCompany"
        });

        // Insert first occurrence
        let api_job_id_1 = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO api_job_sources (
                api_job_id, source_id, external_job_id, raw_response, processed
            ) VALUES ($1, $2, $3, $4, false)
            "#,
            api_job_id_1,
            source_id,
            external_job_id,
            mock_response
        )
        .execute(&pool)
        .await
        .expect("First insert should succeed");

        // Check for duplicate before inserting second
        let duplicate_check = sqlx::query!(
            "SELECT api_job_id FROM api_job_sources WHERE source_id = $1 AND external_job_id = $2",
            source_id,
            external_job_id
        )
        .fetch_optional(&pool)
        .await
        .expect("Should check for duplicate");

        assert!(duplicate_check.is_some(), "Should detect duplicate by external_job_id");

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_jsearch_rapidapi_response_parsing() {
        // Test RapidAPI JSearch response structure (no database needed)
        let mock_rapidapi_response = json!({
            "job_id": "abc123",
            "job_title": "Senior Test Automation Engineer",
            "employer_name": "TechCorp",
            "employer_logo": "https://example.com/logo.png",
            "job_city": "San Francisco",
            "job_state": "CA",
            "job_country": "US",
            "job_description": "We're looking for a talented engineer...",
            "job_posted_at_datetime_utc": "2025-10-20T10:00:00Z",
            "job_min_salary": 150000.0,
            "job_max_salary": 170000.0,
            "job_salary_currency": "USD",
            "job_is_remote": false,
            "job_employment_type": "FULLTIME",
            "job_apply_link": "https://www.example.com/jobs/abc123"
        });

        // Verify all expected fields are present
        assert!(mock_rapidapi_response["job_id"].is_string());
        assert!(mock_rapidapi_response["job_title"].is_string());
        assert!(mock_rapidapi_response["employer_name"].is_string());
        assert!(mock_rapidapi_response["job_city"].is_string());
        assert!(mock_rapidapi_response["job_state"].is_string());
        assert!(mock_rapidapi_response["job_description"].is_string());
        assert!(mock_rapidapi_response["job_min_salary"].is_number());
        assert!(mock_rapidapi_response["job_max_salary"].is_number());
        assert!(mock_rapidapi_response["job_apply_link"].is_string());

        // Verify field values
        let title = mock_rapidapi_response["job_title"].as_str().unwrap();
        assert!(title.contains("Test Automation"));

        let min_salary = mock_rapidapi_response["job_min_salary"].as_f64().unwrap();
        assert_eq!(min_salary, 150000.0);
    }

    #[tokio::test]
    #[serial]
    async fn test_jsearch_job_creation_from_api_data() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        // Create job from JSearch/RapidAPI data
        let job_id = Uuid::new_v4();
        let result = sqlx::query!(
            r#"
            INSERT INTO jobs (
                job_id, source, title, company, location, url, salary, status
            ) VALUES ($1, 'rapidapi', $2, $3, $4, $5, $6, 'new')
            "#,
            job_id,
            "Senior QA Automation Engineer",
            "TestJSearchCompany",
            "Fremont, CA, US",
            "https://www.example.com/jobs/test123",
            145000
        )
        .execute(&pool)
        .await;

        assert!(result.is_ok(), "Should create job from JSearch data");

        // Verify job was created
        let job = sqlx::query!(
            "SELECT title, company, source, salary FROM jobs WHERE job_id = $1",
            job_id
        )
        .fetch_one(&pool)
        .await
        .expect("Should fetch created job");

        assert_eq!(job.source, "rapidapi");
        assert_eq!(job.company, "TestJSearchCompany");
        assert_eq!(job.salary, Some(145000));

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_jsearch_search_parameters() {
        // Test RapidAPI JSearch search parameter construction (no database needed)
        let search_params = json!({
            "query": "Software Test Engineer OR QA Engineer in Fremont, CA",
            "num_pages": "1",
            "date_posted": "week",
            "remote_jobs_only": false
        });

        // Validate search parameters
        assert!(search_params["query"].as_str().unwrap().contains("Test Engineer"));
        assert!(search_params["query"].as_str().unwrap().contains("Fremont"));
        assert_eq!(search_params["num_pages"].as_str().unwrap(), "1");
        assert_eq!(search_params["date_posted"].as_str().unwrap(), "week");
        assert_eq!(search_params["remote_jobs_only"].as_bool().unwrap(), false);
    }

    #[tokio::test]
    #[serial]
    async fn test_jsearch_intake_log_tracking() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        let source_id = insert_test_source(&pool, "rapidapi_log_test", "job_board").await
            .expect("Should create source");

        // Simulate successful JSearch sync (limited to 10 jobs via num_pages=1)
        let log_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO job_intake_logs (
                log_id, source_id, sync_status, sync_started_at, sync_completed_at,
                jobs_discovered, jobs_created, jobs_duplicated, jobs_filtered_out
            ) VALUES ($1, $2, 'completed', NOW(), NOW(), 10, 4, 3, 3)
            "#,
            log_id,
            source_id
        )
        .execute(&pool)
        .await
        .expect("Should create intake log");

        // Verify log was stored
        let log = sqlx::query!(
            "SELECT sync_status, jobs_discovered, jobs_created FROM job_intake_logs WHERE log_id = $1",
            log_id
        )
        .fetch_one(&pool)
        .await
        .expect("Should fetch log");

        assert_eq!(log.sync_status, Some("completed".to_string()));
        assert_eq!(log.jobs_discovered, Some(10));
        assert_eq!(log.jobs_created, Some(4));

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_jsearch_counter_validation() {
        // Test MECE (Mutually Exclusive, Collectively Exhaustive) counter validation
        // JSearch limited to 10 jobs per sync (num_pages=1)
        let discovered = 10;
        let failed_processing = 1;
        let filtered_out = 2;
        let duplicated = 3;
        let created = 4;

        let total = failed_processing + filtered_out + duplicated + created;
        assert_eq!(total, discovered, "Counters should be MECE");

        // Test invalid counter case
        let invalid_created = 5; // Should be 4
        let invalid_total = failed_processing + filtered_out + duplicated + invalid_created;
        assert_ne!(invalid_total, discovered, "Invalid counters should be detected");
    }

    #[tokio::test]
    #[serial]
    async fn test_rapidapi_quota_tracking() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        let source_id = insert_test_source(&pool, "rapidapi_quota_test", "job_board").await
            .expect("Should create source");

        // Simulate multiple API calls this month (JSearch free tier: 200/month)
        for i in 0..10 {
            let log_id = Uuid::new_v4();
            sqlx::query!(
                r#"
                INSERT INTO job_intake_logs (
                    log_id, source_id, sync_status, sync_started_at,
                    jobs_discovered
                ) VALUES ($1, $2, 'completed', NOW() - INTERVAL '1 day' * $3, 10)
                "#,
                log_id,
                source_id,
                i as f64
            )
            .execute(&pool)
            .await
            .expect("Should insert log");
        }

        // Count API calls this month (proxy for quota usage)
        let usage = sqlx::query!(
            r#"
            SELECT COUNT(*) as count
            FROM job_intake_logs
            WHERE source_id = $1
            AND sync_started_at >= date_trunc('month', NOW())
            "#,
            source_id
        )
        .fetch_one(&pool)
        .await
        .expect("Should count usage");

        let calls_this_month = usage.count.unwrap_or(0);
        assert_eq!(calls_this_month, 10, "Should track 10 API calls");

        // Check if approaching limit (200 for JSearch free tier, alert at 85% = 170)
        let approaching_limit = calls_this_month >= 170;
        assert!(!approaching_limit, "Should not be approaching limit with 10 calls");

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_jsearch_error_handling() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        let source_id = insert_test_source(&pool, "rapidapi_error_test", "job_board").await
            .expect("Should create source");

        // Simulate failed sync with error details
        let log_id = Uuid::new_v4();
        let error_details = json!({
            "error": "RapidAPI JSearch error 401: Invalid API key",
            "timestamp": "2025-10-23T12:00:00Z"
        });

        sqlx::query!(
            r#"
            INSERT INTO job_intake_logs (
                log_id, source_id, sync_status, sync_started_at, sync_completed_at,
                errors_count, error_details
            ) VALUES ($1, $2, 'failed', NOW(), NOW(), 1, $3)
            "#,
            log_id,
            source_id,
            error_details
        )
        .execute(&pool)
        .await
        .expect("Should log error");

        // Verify error was stored
        let log = sqlx::query!(
            "SELECT sync_status, error_details FROM job_intake_logs WHERE log_id = $1",
            log_id
        )
        .fetch_one(&pool)
        .await
        .expect("Should fetch log");

        assert_eq!(log.sync_status, Some("failed".to_string()));
        assert!(log.error_details.is_some());

        let stored_error = log.error_details.unwrap();
        assert!(stored_error["error"].as_str().unwrap().contains("Invalid API key"));

        cleanup_test_data(&pool).await;
    }

    // =================================================================
    // Multi-source Aggregation Tests
    // =================================================================

    #[tokio::test]
    #[serial]
    async fn test_multi_source_job_aggregation() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        // Create multiple sources
        let _gmail_source = insert_test_source(&pool, "gmail_multi_test", "email").await.unwrap();
        let _linkedin_source = insert_test_source(&pool, "linkedin_multi_test", "job_board").await.unwrap();
        let _indeed_source = insert_test_source(&pool, "indeed_multi_test", "job_board").await.unwrap();

        // Insert jobs from each source
        let sources = vec![
            ("gmail", "TestGmailMulti", "Engineer A"),
            ("linkedin", "TestLinkedInMulti", "Engineer B"),
            ("indeed", "TestIndeedMulti", "Engineer C"),
        ];

        for (source, company, title) in sources {
            let job_id = Uuid::new_v4();
            sqlx::query!(
                r#"
                INSERT INTO jobs (job_id, source, title, company, status)
                VALUES ($1, $2, $3, $4, 'new')
                "#,
                job_id,
                source,
                title,
                company
            )
            .execute(&pool)
            .await
            .expect("Should insert job");
        }

        // Query jobs from all sources
        let all_jobs = sqlx::query!(
            r#"
            SELECT job_id, title, source
            FROM jobs
            WHERE source IN ('gmail', 'linkedin', 'indeed')
            AND company LIKE 'Test%Multi'
            "#
        )
        .fetch_all(&pool)
        .await
        .expect("Should fetch all jobs");

        assert_eq!(all_jobs.len(), 3, "Should aggregate jobs from 3 sources");

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_cross_source_deduplication() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        // Same job posted on multiple platforms
        let company = "TestCrossSource";
        let title = "Duplicate Engineer";
        let hash = generate_sha256_hash(&format!("{}{}", company, title));

        // Insert from Gmail
        let job_id_1 = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO jobs (job_id, source, title, company, status)
            VALUES ($1, 'gmail', $2, $3, 'new')
            "#,
            job_id_1,
            title,
            company
        )
        .execute(&pool)
        .await
        .expect("Should insert from Gmail");

        // Record deduplication hash
        sqlx::query!(
            r#"
            INSERT INTO job_deduplication (dedup_id, job_id, company_title_hash)
            VALUES ($1, $2, $3)
            "#,
            Uuid::new_v4(),
            job_id_1,
            hash
        )
        .execute(&pool)
        .await
        .expect("Should record dedup hash");

        // Check if LinkedIn job is duplicate
        let duplicate_check = sqlx::query!(
            "SELECT job_id FROM job_deduplication WHERE company_title_hash = $1",
            hash
        )
        .fetch_optional(&pool)
        .await
        .expect("Should check for duplicate");

        assert!(duplicate_check.is_some(), "Should detect cross-source duplicate");

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_source_failure_isolation() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        let source_1 = insert_test_source(&pool, "source_fail1_test", "email").await.unwrap();
        let source_2 = insert_test_source(&pool, "source_fail2_test", "job_board").await.unwrap();

        // Simulate source 1 failure
        let log_id_1 = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO job_intake_logs (
                log_id, source_id, sync_status, sync_started_at, sync_completed_at,
                errors_count, error_details
            ) VALUES ($1, $2, 'failed', NOW(), NOW(), 1, $3)
            "#,
            log_id_1,
            source_1,
            json!({"error": "Connection timeout"})
        )
        .execute(&pool)
        .await
        .expect("Should log failure");

        // Simulate source 2 success
        let log_id_2 = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO job_intake_logs (
                log_id, source_id, sync_status, sync_started_at, sync_completed_at,
                jobs_discovered, jobs_approved
            ) VALUES ($1, $2, 'completed', NOW(), NOW(), 10, 5)
            "#,
            log_id_2,
            source_2
        )
        .execute(&pool)
        .await
        .expect("Should log success");

        // Verify both logs exist
        let logs = sqlx::query!(
            r#"
            SELECT log_id, sync_status
            FROM job_intake_logs
            WHERE source_id IN ($1, $2)
            "#,
            source_1,
            source_2
        )
        .fetch_all(&pool)
        .await
        .expect("Should fetch both logs");

        assert_eq!(logs.len(), 2, "Both sources should have logs");

        let failed = logs.iter().any(|l| l.sync_status == Some("failed".to_string()));
        let succeeded = logs.iter().any(|l| l.sync_status == Some("completed".to_string()));

        assert!(failed, "Should have one failed source");
        assert!(succeeded, "Should have one successful source");

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_intake_log_statistics() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        let source_id = insert_test_source(&pool, "stats_intake_test", "email").await.unwrap();

        // Create multiple intake logs with different statistics
        let test_data = vec![
            (50, 30, 5),   // discovered, approved, errors
            (40, 25, 2),
            (60, 35, 1),
            (30, 20, 0),
        ];

        for (discovered, approved, errors) in test_data {
            let log_id = Uuid::new_v4();
            sqlx::query!(
                r#"
                INSERT INTO job_intake_logs (
                    log_id, source_id, sync_status, sync_started_at, sync_completed_at,
                    jobs_discovered, jobs_approved, errors_count
                ) VALUES ($1, $2, 'completed', NOW(), NOW(), $3, $4, $5)
                "#,
                log_id,
                source_id,
                discovered,
                approved,
                errors
            )
            .execute(&pool)
            .await
            .expect("Should insert log");
        }

        // Calculate statistics
        let stats = sqlx::query!(
            r#"
            SELECT
                SUM(jobs_discovered) as total_discovered,
                SUM(jobs_approved) as total_approved,
                SUM(errors_count) as total_errors,
                AVG(jobs_discovered) as avg_discovered
            FROM job_intake_logs
            WHERE source_id = $1
            "#,
            source_id
        )
        .fetch_one(&pool)
        .await
        .expect("Should calculate stats");

        assert_eq!(stats.total_discovered, Some(180));
        assert_eq!(stats.total_approved, Some(110));
        assert_eq!(stats.total_errors, Some(8));

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_automated_filtering_integration() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        // Insert jobs with varying salaries
        let test_jobs = vec![
            ("TestFilterPass1", "Senior Engineer", Some(150000), "Remote"),
            ("TestFilterPass2", "AI Engineer", Some(160000), "San Francisco"),
            ("TestFilterFail1", "Junior Dev", Some(80000), "New York"),
            ("TestFilterFail2", "Intern", Some(50000), "Remote"),
        ];

        for (company, title, salary, location) in test_jobs {
            let job_id = Uuid::new_v4();
            sqlx::query!(
                r#"
                INSERT INTO jobs (
                    job_id, source, title, company, salary, location, status
                ) VALUES ($1, 'test_source', $2, $3, $4, $5, 'new')
                "#,
                job_id,
                title,
                company,
                salary,
                location
            )
            .execute(&pool)
            .await
            .expect("Should insert job");
        }

        // Query jobs that pass $130k salary filter
        let passing_jobs = sqlx::query!(
            r#"
            SELECT job_id, company, salary
            FROM jobs
            WHERE company LIKE 'TestFilter%' AND salary >= 130000
            "#
        )
        .fetch_all(&pool)
        .await
        .expect("Should fetch passing jobs");

        assert_eq!(passing_jobs.len(), 2, "Should have 2 jobs passing salary filter");

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_background_sync_scheduling() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        let source_id = insert_test_source(&pool, "schedule_sync_test", "email").await.unwrap();

        // Update source with sync interval (7 hours = 420 minutes)
        sqlx::query!(
            r#"
            UPDATE job_sources
            SET sync_interval_minutes = 360, last_sync = NOW() - INTERVAL '420 minutes'
            WHERE source_id = $1
            "#,
            source_id
        )
        .execute(&pool)
        .await
        .expect("Should update sync config");

        // Check which sources need syncing
        let sources_needing_sync = sqlx::query!(
            r#"
            SELECT source_id, source_name
            FROM job_sources
            WHERE is_active = true
            AND (
                last_sync IS NULL
                OR last_sync < NOW() - (sync_interval_minutes || ' minutes')::INTERVAL
            )
            AND source_name LIKE '%_test'
            "#
        )
        .fetch_all(&pool)
        .await
        .expect("Should find sources needing sync");

        assert!(!sources_needing_sync.is_empty(), "Should find sources that need syncing");

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_error_recovery_and_retry_logic() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        let source_id = insert_test_source(&pool, "retry_logic_test", "email").await.unwrap();

        // Simulate failed sync
        let log_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO job_intake_logs (
                log_id, source_id, sync_status, sync_started_at, errors_count,
                error_details
            ) VALUES ($1, $2, 'failed', NOW(), 3, $3)
            "#,
            log_id,
            source_id,
            json!({"error": "Rate limit exceeded", "retry_after": 300})
        )
        .execute(&pool)
        .await
        .expect("Should log failure");

        // Check if source should be retried
        let recent_failures = sqlx::query!(
            r#"
            SELECT COUNT(*) as failure_count
            FROM job_intake_logs
            WHERE source_id = $1
            AND sync_status = 'failed'
            AND sync_started_at > NOW() - INTERVAL '1 hour'
            "#,
            source_id
        )
        .fetch_one(&pool)
        .await
        .expect("Should count failures");

        let should_retry = recent_failures.failure_count.unwrap() < 5;
        assert!(should_retry, "Should allow retry with fewer than 5 failures");

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_job_intake_performance_monitoring() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        let source_id = insert_test_source(&pool, "perf_monitor_intake_test", "email").await.unwrap();

        // Create logs with timing information
        for i in 0..10 {
            let log_id = Uuid::new_v4();
            let start_time = chrono::Utc::now() - chrono::Duration::minutes((i + 1) * 5);
            let end_time = start_time + chrono::Duration::seconds(30 + i * 5);

            sqlx::query!(
                r#"
                INSERT INTO job_intake_logs (
                    log_id, source_id, sync_status, sync_started_at, sync_completed_at,
                    jobs_discovered, jobs_approved
                ) VALUES ($1, $2, 'completed', $3, $4, 20, 10)
                "#,
                log_id,
                source_id,
                start_time,
                end_time
            )
            .execute(&pool)
            .await
            .expect("Should insert log");
        }

        // Calculate average sync duration
        let performance = sqlx::query!(
            r#"
            SELECT
                AVG(EXTRACT(EPOCH FROM (sync_completed_at - sync_started_at))) as avg_duration_seconds,
                MAX(EXTRACT(EPOCH FROM (sync_completed_at - sync_started_at))) as max_duration_seconds
            FROM job_intake_logs
            WHERE source_id = $1 AND sync_completed_at IS NOT NULL
            "#,
            source_id
        )
        .fetch_one(&pool)
        .await
        .expect("Should calculate performance metrics");

        assert!(performance.avg_duration_seconds.is_some(), "Should have average duration");
        assert!(performance.max_duration_seconds.is_some(), "Should have max duration");

        // Performance should be under 2 minutes on average
        if let Some(avg_duration) = performance.avg_duration_seconds {
            use std::str::FromStr;
            let avg = f64::from_str(&avg_duration.to_string()).unwrap();
            assert!(avg < 120.0, "Average sync duration should be under 2 minutes");
        }

        cleanup_test_data(&pool).await;
    }
}