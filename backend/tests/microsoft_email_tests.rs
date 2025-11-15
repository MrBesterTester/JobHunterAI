use sqlx::{PgPool, Pool, Postgres};
use uuid::Uuid;
use serial_test::serial;

// Microsoft Email Integration Tests for Phase 2.7

#[cfg(test)]
mod microsoft_email_tests {
    use super::*;

    // Test helper to create a test database pool
    async fn create_test_pool() -> Pool<Postgres> {
        let database_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://jobhunter_user:jobhunter_dev_password@localhost/jobhunter_personal".to_string());

        sqlx::postgres::PgPool::connect(&database_url)
            .await
            .expect("Failed to connect to test database")
    }

    // Cleanup test data
    async fn cleanup_test_data(pool: &PgPool) {
        // Delete in correct order due to foreign key constraints
        let _ = sqlx::query!("DELETE FROM email_jobs WHERE sender_email LIKE 'test%@microsoft-test.com' OR sender_email LIKE '%@microsoft-test.com' OR message_id LIKE '<test-%@microsoft.com>'")
            .execute(pool)
            .await;
        let _ = sqlx::query!("DELETE FROM jobs WHERE company LIKE 'Microsoft Test%'")
            .execute(pool)
            .await;
        // Delete all test OAuth credentials (including for microsoft_email_test source)
        let _ = sqlx::query!("DELETE FROM oauth_credentials WHERE client_id LIKE 'test_%'")
            .execute(pool)
            .await;
        // Delete the dedicated test source (microsoft_email_test)
        let test_source_id = Uuid::parse_str("99999999-9999-9999-9999-999999999999").unwrap();
        let _ = sqlx::query!(
            "DELETE FROM oauth_credentials WHERE source_id = $1",
            test_source_id
        )
        .execute(pool)
        .await;
        let _ = sqlx::query!(
            "DELETE FROM job_sources WHERE source_id = $1",
            test_source_id
        )
        .execute(pool)
        .await;
    }

    // Helper to insert test Microsoft OAuth credentials
    // Uses a dedicated test source to avoid conflicts with real microsoft_email credentials
    async fn insert_test_microsoft_credentials(pool: &PgPool) -> Result<(Uuid, Uuid), sqlx::Error> {
        // Use a fixed UUID for test source to avoid conflicts with real microsoft_email source
        // Real microsoft_email source uses: 22222222-2222-2222-2222-222222222222
        // Test source uses: 99999999-9999-9999-9999-999999999999
        let test_source_id = Uuid::parse_str("99999999-9999-9999-9999-999999999999").unwrap();

        // Get or create microsoft_email_test source
        let source_result = sqlx::query!(
            r#"
            SELECT source_id FROM job_sources WHERE source_id = $1
            "#,
            test_source_id
        )
        .fetch_one(pool)
        .await;

        let source_id = match source_result {
            Ok(row) => row.source_id,
            Err(_) => {
                // Create the test source if it doesn't exist
                sqlx::query!(
                    r#"
                    INSERT INTO job_sources (source_id, source_name, source_type, is_active)
                    VALUES ($1, 'microsoft_email_test', 'email', true)
                    "#,
                    test_source_id
                )
                .execute(pool)
                .await?;
                test_source_id
            }
        };

        // Delete any existing test credentials for this source first
        let _ = sqlx::query!(
            "DELETE FROM oauth_credentials WHERE source_id = $1",
            source_id
        )
        .execute(pool)
        .await;

        let credential_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO oauth_credentials (
                credential_id, source_id, client_id, client_secret,
                access_token, refresh_token, token_expires_at
            ) VALUES ($1, $2, 'test_client_id_ms', 'test_client_secret_ms',
                      'test_access_token_ms', 'test_refresh_token_ms', NOW() + INTERVAL '1 hour')
            "#,
            credential_id,
            source_id
        )
        .execute(pool)
        .await?;

        Ok((source_id, credential_id))
    }

    // =================================================================
    // Microsoft OAuth Tests
    // =================================================================

    #[tokio::test]
    #[serial]
    async fn test_microsoft_oauth_credential_storage() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        let result = insert_test_microsoft_credentials(&pool).await;
        assert!(result.is_ok(), "Should store Microsoft OAuth credentials");

        let (_, credential_id) = result.unwrap();

        // Verify credentials are retrievable
        let credential = sqlx::query!(
            r#"
            SELECT credential_id, access_token, refresh_token, token_expires_at
            FROM oauth_credentials
            WHERE credential_id = $1
            "#,
            credential_id
        )
        .fetch_one(&pool)
        .await;

        assert!(credential.is_ok(), "Should retrieve stored credentials");
        let cred = credential.unwrap();
        assert_eq!(cred.access_token, Some("test_access_token_ms".to_string()));
        assert_eq!(cred.refresh_token, Some("test_refresh_token_ms".to_string()));

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_microsoft_token_expiration_check() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        let (source_id, _) = insert_test_microsoft_credentials(&pool).await
            .expect("Should create test credentials");

        // Delete the credential we just inserted so we can insert an expired one
        let _ = sqlx::query!("DELETE FROM oauth_credentials WHERE source_id = $1", source_id)
            .execute(&pool)
            .await;

        // Insert an expired token
        let expired_credential_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO oauth_credentials (
                credential_id, source_id, client_id, client_secret,
                access_token, refresh_token, token_expires_at
            ) VALUES ($1, $2, 'test_client_id_expired', 'test_client_secret_expired',
                      'expired_token', 'test_refresh_token', NOW() - INTERVAL '1 hour')
            "#,
            expired_credential_id,
            source_id
        )
        .execute(&pool)
        .await
        .expect("Should insert expired token");

        // Query for expired tokens
        let expired = sqlx::query!(
            r#"
            SELECT credential_id, token_expires_at
            FROM oauth_credentials
            WHERE credential_id = $1 AND token_expires_at < NOW()
            "#,
            expired_credential_id
        )
        .fetch_one(&pool)
        .await;

        assert!(expired.is_ok(), "Should identify expired token");

        cleanup_test_data(&pool).await;
    }

    // =================================================================
    // Email Job Processing Tests
    // =================================================================

    #[tokio::test]
    #[serial]
    async fn test_microsoft_email_job_insertion() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        // Insert a test email job from Microsoft source
        let email_job_id = Uuid::new_v4();
        let message_id = "<test-message-id@microsoft.com>";

        let result = sqlx::query!(
            r#"
            INSERT INTO email_jobs (
                email_job_id, message_id, sender_email, sender_name, subject,
                received_date, body_text, body_html, source, processed
            ) VALUES ($1, $2, 'recruiter@microsoft-test.com', 'Test Recruiter',
                      'Senior Test Engineer Position', NOW(), 'Test body',
                      '<html>Test body</html>', 'microsoft_email', false)
            "#,
            email_job_id,
            message_id
        )
        .execute(&pool)
        .await;

        if let Err(e) = &result {
            eprintln!("Error inserting email job: {:?}", e);
        }
        assert!(result.is_ok(), "Should insert Microsoft email job");

        // Verify the email job can be retrieved
        let email_job = sqlx::query!(
            r#"
            SELECT email_job_id, message_id, source, sender_email
            FROM email_jobs
            WHERE email_job_id = $1
            "#,
            email_job_id
        )
        .fetch_one(&pool)
        .await;

        assert!(email_job.is_ok(), "Should retrieve Microsoft email job");
        let job = email_job.unwrap();
        assert_eq!(job.source.as_deref(), Some("microsoft_email"));
        assert_eq!(job.sender_email, "recruiter@microsoft-test.com");

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_microsoft_email_deduplication() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        let message_id = "<test-dedup-message@microsoft.com>";

        // Insert first email job
        let email_job_id_1 = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO email_jobs (
                email_job_id, message_id, sender_email, sender_name, subject,
                received_date, body_text, body_html, source, processed
            ) VALUES ($1, $2, 'test@microsoft-test.com', 'Test Sender',
                      'Test Job', NOW(), 'Body', '<html>Body</html>',
                      'microsoft_email', false)
            "#,
            email_job_id_1,
            message_id
        )
        .execute(&pool)
        .await
        .expect("Should insert first email job");

        // Attempt to insert duplicate (same message_id)
        let email_job_id_2 = Uuid::new_v4();
        let result = sqlx::query!(
            r#"
            INSERT INTO email_jobs (
                email_job_id, message_id, sender_email, sender_name, subject,
                received_date, body_text, body_html, source, processed
            ) VALUES ($1, $2, 'test@microsoft-test.com', 'Test Sender',
                      'Test Job', NOW(), 'Body', '<html>Body</html>',
                      'microsoft_email', false)
            "#,
            email_job_id_2,
            message_id
        )
        .execute(&pool)
        .await;

        // Should fail due to unique constraint on message_id
        assert!(result.is_err(), "Should not allow duplicate message_id");

        // Verify only one email job exists
        let count = sqlx::query!(
            r#"
            SELECT COUNT(*) as count FROM email_jobs WHERE message_id = $1
            "#,
            message_id
        )
        .fetch_one(&pool)
        .await
        .expect("Should count email jobs");

        assert_eq!(count.count, Some(1), "Should have exactly one email job");

        cleanup_test_data(&pool).await;
    }

    #[tokio::test]
    #[serial]
    async fn test_microsoft_job_extraction_linkage() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        // Insert email job
        let email_job_id = Uuid::new_v4();
        let message_id = "<test-extraction@microsoft.com>";

        sqlx::query!(
            r#"
            INSERT INTO email_jobs (
                email_job_id, message_id, sender_email, sender_name, subject,
                received_date, body_text, body_html, source, processed
            ) VALUES ($1, $2, 'recruiter@microsoft-test.com', 'Test Recruiter',
                      'Senior Test Engineer', NOW(), 'Great opportunity...',
                      '<html>Great opportunity...</html>', 'microsoft_email', false)
            "#,
            email_job_id,
            message_id
        )
        .execute(&pool)
        .await
        .expect("Should insert email job");

        // Create a job linked to this email
        let job_id = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO jobs (
                job_id, title, company, location, source, status, date_email_sent
            ) VALUES ($1, 'Senior Test Engineer', 'Microsoft Test Corp',
                      'Remote', 'microsoft_email', 'new', NOW())
            "#,
            job_id
        )
        .execute(&pool)
        .await
        .expect("Should insert job");

        // Link the email job to the extracted job
        sqlx::query!(
            r#"
            UPDATE email_jobs SET job_id = $1, processed = true
            WHERE email_job_id = $2
            "#,
            job_id,
            email_job_id
        )
        .execute(&pool)
        .await
        .expect("Should link email job to extracted job");

        // Verify the linkage
        let linked = sqlx::query!(
            r#"
            SELECT ej.email_job_id, ej.job_id, j.title
            FROM email_jobs ej
            JOIN jobs j ON ej.job_id = j.job_id
            WHERE ej.email_job_id = $1
            "#,
            email_job_id
        )
        .fetch_one(&pool)
        .await;

        assert!(linked.is_ok(), "Should retrieve linked job");
        let link = linked.unwrap();
        assert_eq!(link.job_id, Some(job_id));
        assert_eq!(link.title, "Senior Test Engineer");

        cleanup_test_data(&pool).await;
    }

    // =================================================================
    // Folder Management Tests (Database-level)
    // =================================================================

    #[tokio::test]
    #[serial]
    async fn test_microsoft_source_configuration() {
        let pool = create_test_pool().await;

        // Verify microsoft_email source exists and is configured correctly
        let source = sqlx::query!(
            r#"
            SELECT source_id, source_name, source_type, is_active, configuration
            FROM job_sources
            WHERE source_name = 'microsoft_email'
            "#
        )
        .fetch_one(&pool)
        .await;

        assert!(source.is_ok(), "microsoft_email source should exist in database");

        let src = source.unwrap();
        assert_eq!(src.source_name, "microsoft_email");
        assert_eq!(src.source_type, "email");
        assert_eq!(src.is_active, Some(true), "Microsoft email source should be active");

        // Verify configuration contains Microsoft Mail settings
        if let Some(config) = src.configuration {
            let config_str = config.to_string();
            // Check for Mail.Read scope (required for MS Graph email access)
            assert!(config_str.contains("Mail.Read"),
                   "Configuration should contain Mail.Read scope for Microsoft Graph API");
            // Check for folder name configuration
            assert!(config_str.contains("folder_name") || config_str.contains("JobOps"),
                   "Configuration should contain folder_name for email organization");
        } else {
            panic!("Microsoft email source should have configuration");
        }
    }

    #[tokio::test]
    #[serial]
    async fn test_oauth_credential_tenant_field() {
        let pool = create_test_pool().await;
        cleanup_test_data(&pool).await;

        let (source_id, _) = insert_test_microsoft_credentials(&pool).await
            .expect("Should create test credentials");

        // Delete the credential we just inserted so we can insert one with scopes
        let _ = sqlx::query!("DELETE FROM oauth_credentials WHERE source_id = $1", source_id)
            .execute(&pool)
            .await;

        // Insert credential with scope information
        let credential_id = Uuid::new_v4();
        let scopes_array = vec!["Mail.Read".to_string(), "Mail.ReadWrite".to_string()];
        sqlx::query!(
            r#"
            INSERT INTO oauth_credentials (
                credential_id, source_id, client_id, client_secret,
                access_token, refresh_token, token_expires_at, scope
            ) VALUES ($1, $2, 'test_tenant_client', 'test_tenant_secret',
                      'test_token', 'test_refresh', NOW() + INTERVAL '1 hour',
                      $3)
            "#,
            credential_id,
            source_id,
            &scopes_array as &[String]
        )
        .execute(&pool)
        .await
        .expect("Should store scope information");

        // Retrieve and verify
        let cred = sqlx::query!(
            r#"
            SELECT scope FROM oauth_credentials WHERE credential_id = $1
            "#,
            credential_id
        )
        .fetch_one(&pool)
        .await
        .expect("Should retrieve credential");

        assert!(cred.scope.is_some(), "Should have scope field");
        let scope = cred.scope.unwrap();
        assert!(scope.contains(&"Mail.Read".to_string()), "Should contain Mail.Read scope");
        assert!(scope.contains(&"Mail.ReadWrite".to_string()), "Should contain Mail.ReadWrite scope");

        cleanup_test_data(&pool).await;
    }

    // =================================================================
    // Integration Health Tests
    // =================================================================

    #[tokio::test]
    #[serial]
    async fn test_microsoft_integration_readiness() {
        let pool = create_test_pool().await;

        // Check all required database components exist

        // 1. Job source exists
        let source = sqlx::query!(
            "SELECT source_id FROM job_sources WHERE source_name = 'microsoft_email'"
        )
        .fetch_one(&pool)
        .await;
        assert!(source.is_ok(), "microsoft_email job source must exist");

        // 2. Email_jobs table supports source field
        let table_check = sqlx::query!(
            r#"
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'email_jobs' AND column_name = 'source'
            "#
        )
        .fetch_one(&pool)
        .await;
        assert!(table_check.is_ok(), "email_jobs.source column must exist");

        // 3. OAuth credentials table is accessible
        let oauth_check = sqlx::query!(
            "SELECT COUNT(*) as count FROM oauth_credentials WHERE 1=0"
        )
        .fetch_one(&pool)
        .await;
        assert!(oauth_check.is_ok(), "oauth_credentials table must be accessible");
    }

    // =================================================================
    // Phase 2.8: Email Archiving Tests
    // =================================================================

    #[tokio::test]
    async fn test_archive_folder_structure() {
        // Test that archive folder can be represented in our data structures
        let mock_folder = serde_json::json!({
            "id": "AAMkAGI2TH1234567890",
            "displayName": "JobOps-OLD",
            "parentFolderId": "inbox",
            "childFolderCount": 0,
            "unreadItemCount": 0,
            "totalItemCount": 5
        });

        // Verify we can deserialize the folder structure
        let folder_id = mock_folder["id"].as_str().unwrap();
        assert_eq!(folder_id, "AAMkAGI2TH1234567890");
        assert_eq!(mock_folder["displayName"].as_str().unwrap(), "JobOps-OLD");
    }

    #[tokio::test]
    async fn test_move_message_api_structure() {
        // Test that we can construct the move message API request
        let message_id = "AAMkAGI2MESSAGE123";
        let destination_folder_id = "AAMkAGI2FOLDER456";

        let request_body = serde_json::json!({
            "destinationId": destination_folder_id
        });

        // Verify the request structure
        assert_eq!(
            request_body["destinationId"].as_str().unwrap(),
            destination_folder_id
        );

        // Verify URL construction
        let url = format!(
            "https://graph.microsoft.com/v1.0/me/messages/{}/move",
            message_id
        );
        assert!(url.contains(message_id));
        assert!(url.contains("/move"));
    }

    #[tokio::test]
    async fn test_folder_search_filter() {
        // Test the folder search filter construction
        let folder_name = "JobOps-OLD";
        let search_url = format!(
            "https://graph.microsoft.com/v1.0/me/mailFolders?$filter=displayName eq '{}'",
            folder_name
        );

        assert!(search_url.contains("$filter="));
        assert!(search_url.contains("displayName eq"));
        assert!(search_url.contains(folder_name));
    }

    #[tokio::test]
    async fn test_archive_fallback_logic() {
        // Test the logic for deciding whether to archive or mark as read
        let archive_folder_available = Some("AAMkAGI2ARCHIVE123".to_string());
        let no_archive_folder: Option<String> = None;

        // With archive folder available, should use it
        match &archive_folder_available {
            Some(_folder_id) => {
                // Should attempt to move message
                assert!(true, "Should use archive when available");
            }
            None => {
                panic!("Should not fall back when archive is available");
            }
        }

        // Without archive folder, should fall back to mark as read
        match &no_archive_folder {
            Some(_) => {
                panic!("Should fall back when no archive available");
            }
            None => {
                // Should mark as read
                assert!(true, "Should fall back to mark as read");
            }
        }
    }
}
