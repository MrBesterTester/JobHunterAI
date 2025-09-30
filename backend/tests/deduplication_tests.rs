use sqlx::{PgPool, Pool, Postgres};
use uuid::Uuid;
use sha2::{Sha256, Digest};

// Deduplication system tests for Phase 2 - Intelligent Automation

#[cfg(test)]
mod deduplication_tests {
    use super::*;

    // Test helper to create a test database pool
    async fn create_test_pool() -> Pool<Postgres> {
        let database_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://jobhunter_user:jobhunter_dev_password@localhost/jobhunter_test".to_string());

        sqlx::postgres::PgPool::connect(&database_url)
            .await
            .expect("Failed to connect to test database")
    }

    fn generate_hash(input: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(input.to_lowercase());
        hex::encode(hasher.finalize())
    }

    // Helper to insert a test job
    async fn insert_test_job(
        pool: &PgPool,
        job_id: Uuid,
        title: &str,
        company: &str,
        url: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"
            INSERT INTO jobs (job_id, title, company, location, source, status)
            VALUES ($1, $2, $3, 'Remote', 'test', 'new')
            ON CONFLICT (job_id) DO NOTHING
            "#,
            job_id,
            title,
            company
        )
        .execute(pool)
        .await?;

        let company_title_hash = generate_hash(&format!("{}{}", company, title));
        let url_hash = url.map(|u| generate_hash(u));

        sqlx::query!(
            r#"
            INSERT INTO job_deduplication (dedup_id, job_id, company_title_hash, url_hash)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (dedup_id) DO NOTHING
            "#,
            Uuid::new_v4(),
            job_id,
            company_title_hash,
            url_hash
        )
        .execute(pool)
        .await?;

        Ok(())
    }

    // Helper to cleanup test jobs
    async fn cleanup_test_jobs(pool: &PgPool, company: &str) {
        let _ = sqlx::query!("DELETE FROM job_deduplication WHERE job_id IN (SELECT job_id FROM jobs WHERE company = $1)", company)
            .execute(pool)
            .await;
        let _ = sqlx::query!("DELETE FROM jobs WHERE company = $1", company)
            .execute(pool)
            .await;
    }

    #[tokio::test]
    async fn test_sha256_hashing_consistency() {
        // Test that SHA256 hashing produces consistent results
        let input1 = "TechCorp Senior Engineer";
        let input2 = "TechCorp Senior Engineer";
        let input3 = "techcorp senior engineer"; // Case insensitive
        let input4 = "DifferentCorp Senior Engineer";

        let hash1 = generate_hash(input1);
        let hash2 = generate_hash(input2);
        let hash3 = generate_hash(input3);
        let hash4 = generate_hash(input4);

        // Same input should produce same hash
        assert_eq!(hash1, hash2, "Same input should produce identical hash");

        // Case insensitive - lowercase normalization
        assert_eq!(hash1, hash3, "Hash should be case insensitive");

        // Different input should produce different hash
        assert_ne!(hash1, hash4, "Different input should produce different hash");

        // Verify hash format (64 character hex string for SHA256)
        assert_eq!(hash1.len(), 64, "SHA256 hash should be 64 characters");
        assert!(hash1.chars().all(|c| c.is_ascii_hexdigit()), "Hash should only contain hex characters");
    }

    #[tokio::test]
    async fn test_company_title_deduplication() {
        let pool = create_test_pool().await;
        let company = "TestDedup1Corp";
        let title = "Senior Test Engineer";

        // Cleanup any existing test data
        cleanup_test_jobs(&pool, company).await;

        // Insert first job
        let job_id_1 = Uuid::new_v4();
        let result = insert_test_job(&pool, job_id_1, title, company, None).await;
        assert!(result.is_ok(), "First job insertion should succeed");

        // Try to find duplicate by company+title hash
        let company_title_hash = generate_hash(&format!("{}{}", company, title));
        let duplicate = sqlx::query!(
            "SELECT job_id FROM job_deduplication WHERE company_title_hash = $1",
            company_title_hash
        )
        .fetch_optional(&pool)
        .await
        .expect("Query should execute");

        assert!(duplicate.is_some(), "Should find job by company+title hash");
        assert_eq!(duplicate.unwrap().job_id, job_id_1, "Should return correct job_id");

        // Try to insert duplicate job (same company + title)
        let _job_id_2 = Uuid::new_v4();
        // Check for duplicate before inserting
        let existing_duplicate = sqlx::query!(
            "SELECT job_id FROM job_deduplication WHERE company_title_hash = $1",
            company_title_hash
        )
        .fetch_optional(&pool)
        .await
        .expect("Query should execute");

        assert!(existing_duplicate.is_some(), "Should detect duplicate before insert");
        assert_eq!(existing_duplicate.unwrap().job_id, job_id_1, "Should return original job_id");

        // Cleanup
        cleanup_test_jobs(&pool, company).await;
    }

    #[tokio::test]
    async fn test_url_based_deduplication() {
        let pool = create_test_pool().await;
        let company = "TestDedup2Corp";
        let title1 = "Engineer Position A";
        let title2 = "Engineer Position B";
        let url = "https://jobs.example.com/posting/12345";

        // Cleanup any existing test data
        cleanup_test_jobs(&pool, company).await;

        // Insert first job with URL
        let job_id_1 = Uuid::new_v4();
        let result = insert_test_job(&pool, job_id_1, title1, company, Some(url)).await;
        assert!(result.is_ok(), "First job insertion should succeed");

        // Try to find by URL hash (same URL, different title)
        let url_hash = generate_hash(url);
        let duplicate = sqlx::query!(
            "SELECT job_id FROM job_deduplication WHERE url_hash = $1",
            url_hash
        )
        .fetch_optional(&pool)
        .await
        .expect("Query should execute");

        assert!(duplicate.is_some(), "Should find job by URL hash");
        assert_eq!(duplicate.unwrap().job_id, job_id_1, "Should return correct job_id");

        // Verify different title with same URL would be detected as duplicate
        let company_title_hash_2 = generate_hash(&format!("{}{}", company, title2));
        let duplicate_by_url = sqlx::query!(
            "SELECT job_id FROM job_deduplication WHERE url_hash = $1 AND company_title_hash != $2",
            url_hash,
            company_title_hash_2
        )
        .fetch_optional(&pool)
        .await
        .expect("Query should execute");

        assert!(duplicate_by_url.is_some(), "Should detect duplicate even with different title if URL matches");

        // Cleanup
        cleanup_test_jobs(&pool, company).await;
    }

    #[tokio::test]
    async fn test_collision_handling() {
        let pool = create_test_pool().await;
        let company = "TestDedup3Corp";

        // Cleanup any existing test data
        cleanup_test_jobs(&pool, company).await;

        // Insert multiple unique jobs and verify no collisions
        let job_titles = vec![
            "Senior Software Engineer",
            "Staff Software Engineer",
            "Principal Software Engineer",
            "Lead Software Engineer",
            "Senior Test Engineer",
            "Senior QA Engineer",
            "Senior AI Engineer",
        ];

        let mut inserted_hashes = std::collections::HashSet::new();

        for title in &job_titles {
            let job_id = Uuid::new_v4();
            let result = insert_test_job(&pool, job_id, title, company, None).await;
            assert!(result.is_ok(), "Job insertion should succeed for: {}", title);

            let hash = generate_hash(&format!("{}{}", company, title));
            assert!(!inserted_hashes.contains(&hash), "Hash collision detected for: {}", title);
            inserted_hashes.insert(hash);
        }

        // Verify all jobs were inserted with unique hashes
        let count = sqlx::query!(
            "SELECT COUNT(*) as count FROM job_deduplication WHERE job_id IN (SELECT job_id FROM jobs WHERE company = $1)",
            company
        )
        .fetch_one(&pool)
        .await
        .expect("Query should execute");

        assert_eq!(count.count.unwrap_or(0), job_titles.len() as i64,
                  "All jobs should be inserted with unique hashes");

        // Cleanup
        cleanup_test_jobs(&pool, company).await;
    }

    #[tokio::test]
    async fn test_cross_source_deduplication() {
        let pool = create_test_pool().await;
        let company = "TestDedup4Corp";
        let title = "Senior Test Automation Engineer";

        // Cleanup any existing test data
        cleanup_test_jobs(&pool, company).await;

        // Insert job from first source (Gmail)
        let job_id_1 = Uuid::new_v4();
        sqlx::query!(
            r#"
            INSERT INTO jobs (job_id, title, company, location, source, status)
            VALUES ($1, $2, $3, 'Remote', 'gmail', 'new')
            "#,
            job_id_1,
            title,
            company
        )
        .execute(&pool)
        .await
        .expect("First job insertion should succeed");

        let company_title_hash = generate_hash(&format!("{}{}", company, title));
        sqlx::query!(
            r#"
            INSERT INTO job_deduplication (dedup_id, job_id, company_title_hash, url_hash)
            VALUES ($1, $2, $3, NULL)
            "#,
            Uuid::new_v4(),
            job_id_1,
            company_title_hash
        )
        .execute(&pool)
        .await
        .expect("Deduplication entry should be created");

        // Check for duplicate from second source (LinkedIn)
        let duplicate = sqlx::query!(
            "SELECT job_id FROM job_deduplication WHERE company_title_hash = $1",
            company_title_hash
        )
        .fetch_optional(&pool)
        .await
        .expect("Query should execute");

        assert!(duplicate.is_some(), "Should detect duplicate across sources");
        assert_eq!(duplicate.unwrap().job_id, job_id_1, "Should return original job from Gmail");

        // Verify the original job source
        let original_job = sqlx::query!(
            "SELECT source FROM jobs WHERE job_id = $1",
            job_id_1
        )
        .fetch_one(&pool)
        .await
        .expect("Should fetch original job");

        assert_eq!(original_job.source, "gmail", "Original source should be preserved");

        // Cleanup
        cleanup_test_jobs(&pool, company).await;
    }

    #[tokio::test]
    async fn test_deduplication_table_integrity() {
        let pool = create_test_pool().await;

        // Test that deduplication table has proper constraints
        // 1. Primary key constraint on dedup_id
        // 2. Foreign key constraint on job_id
        // 3. Unique constraint on company_title_hash

        let company = "TestDedup5Corp";
        cleanup_test_jobs(&pool, company).await;

        let job_id = Uuid::new_v4();
        insert_test_job(&pool, job_id, "Test Job", company, None).await
            .expect("Job insertion should succeed");

        // Try to insert duplicate company_title_hash (should fail due to unique constraint)
        let company_title_hash = generate_hash(&format!("{}{}", company, "Test Job"));
        let duplicate_insert = sqlx::query!(
            r#"
            INSERT INTO job_deduplication (dedup_id, job_id, company_title_hash, url_hash)
            VALUES ($1, $2, $3, NULL)
            "#,
            Uuid::new_v4(),
            job_id,
            company_title_hash
        )
        .execute(&pool)
        .await;

        assert!(duplicate_insert.is_err(), "Duplicate company_title_hash should fail due to unique constraint");

        // Try to insert with non-existent job_id (should fail due to foreign key)
        let non_existent_job_id = Uuid::new_v4();
        let fake_hash = generate_hash("NonExistentJob");
        let invalid_fk_insert = sqlx::query!(
            r#"
            INSERT INTO job_deduplication (dedup_id, job_id, company_title_hash, url_hash)
            VALUES ($1, $2, $3, NULL)
            "#,
            Uuid::new_v4(),
            non_existent_job_id,
            fake_hash
        )
        .execute(&pool)
        .await;

        assert!(invalid_fk_insert.is_err(), "Non-existent job_id should fail due to foreign key constraint");

        // Cleanup
        cleanup_test_jobs(&pool, company).await;
    }

    #[tokio::test]
    async fn test_url_normalization_and_deduplication() {
        let pool = create_test_pool().await;
        let company = "TestDedup6Corp";

        cleanup_test_jobs(&pool, company).await;

        // Different URL formats that might be considered the same
        let urls = vec![
            "https://jobs.example.com/posting/12345",
            "https://jobs.example.com/posting/67890",
        ];

        let job_id_1 = Uuid::new_v4();
        insert_test_job(&pool, job_id_1, "Engineer A", company, Some(urls[0])).await
            .expect("First job should insert");

        let job_id_2 = Uuid::new_v4();
        insert_test_job(&pool, job_id_2, "Engineer B", company, Some(urls[1])).await
            .expect("Second job with different URL should insert");

        // Verify both jobs exist with different URL hashes
        let url_hash_1 = generate_hash(urls[0]);
        let url_hash_2 = generate_hash(urls[1]);

        assert_ne!(url_hash_1, url_hash_2, "Different URLs should have different hashes");

        let count = sqlx::query!(
            "SELECT COUNT(*) as count FROM job_deduplication WHERE job_id IN ($1, $2)",
            job_id_1,
            job_id_2
        )
        .fetch_one(&pool)
        .await
        .expect("Query should execute");

        assert_eq!(count.count.unwrap_or(0), 2, "Both jobs should exist with unique URL hashes");

        // Try to insert duplicate of first URL
        let url_hash_duplicate = generate_hash(urls[0]);
        let duplicate_check = sqlx::query!(
            "SELECT job_id FROM job_deduplication WHERE url_hash = $1",
            url_hash_duplicate
        )
        .fetch_optional(&pool)
        .await
        .expect("Query should execute");

        assert!(duplicate_check.is_some(), "Should find existing job by URL hash");
        assert_eq!(duplicate_check.unwrap().job_id, job_id_1, "Should return first job");

        // Cleanup
        cleanup_test_jobs(&pool, company).await;
    }

    #[tokio::test]
    async fn test_deduplication_performance() {
        let pool = create_test_pool().await;
        let company = "TestDedupPerfCorp";

        cleanup_test_jobs(&pool, company).await;

        // Insert 100 jobs and measure deduplication lookup performance
        let start_time = std::time::Instant::now();

        for i in 0..100 {
            let job_id = Uuid::new_v4();
            let title = format!("Test Engineer {}", i);
            insert_test_job(&pool, job_id, &title, company, None).await
                .expect("Job insertion should succeed");

            // Verify deduplication lookup is fast
            let lookup_start = std::time::Instant::now();
            let company_title_hash = generate_hash(&format!("{}{}", company, title));
            let _ = sqlx::query!(
                "SELECT job_id FROM job_deduplication WHERE company_title_hash = $1",
                company_title_hash
            )
            .fetch_optional(&pool)
            .await
            .expect("Lookup should succeed");

            let lookup_duration = lookup_start.elapsed();
            assert!(lookup_duration.as_millis() < 50,
                   "Individual deduplication lookup should be under 50ms, took {}ms",
                   lookup_duration.as_millis());
        }

        let total_duration = start_time.elapsed();
        assert!(total_duration.as_millis() < 5000,
               "100 job insertions with deduplication should complete in under 5 seconds, took {}ms",
               total_duration.as_millis());

        // Cleanup
        cleanup_test_jobs(&pool, company).await;
    }

    #[tokio::test]
    async fn test_case_insensitive_deduplication() {
        let pool = create_test_pool().await;
        let company_lower = "testdedup7corp";
        let company_upper = "TestDedup7Corp";
        let company_mixed = "TESTDEDUP7CORP";
        let title = "Senior Engineer";

        cleanup_test_jobs(&pool, company_upper).await;

        // All these should produce the same hash due to lowercase normalization
        let hash_lower = generate_hash(&format!("{}{}", company_lower, title));
        let hash_upper = generate_hash(&format!("{}{}", company_upper, title));
        let hash_mixed = generate_hash(&format!("{}{}", company_mixed, title));

        assert_eq!(hash_lower, hash_upper, "Case variations should produce same hash");
        assert_eq!(hash_lower, hash_mixed, "Case variations should produce same hash");

        // Insert job with mixed case
        let job_id = Uuid::new_v4();
        insert_test_job(&pool, job_id, title, company_upper, None).await
            .expect("Job insertion should succeed");

        // Verify lowercase version would be detected as duplicate
        let duplicate_check = sqlx::query!(
            "SELECT job_id FROM job_deduplication WHERE company_title_hash = $1",
            hash_lower
        )
        .fetch_optional(&pool)
        .await
        .expect("Query should execute");

        assert!(duplicate_check.is_some(), "Lowercase hash should find uppercase job");
        assert_eq!(duplicate_check.unwrap().job_id, job_id, "Should return same job regardless of case");

        // Cleanup
        cleanup_test_jobs(&pool, company_upper).await;
    }

    #[tokio::test]
    async fn test_null_url_handling() {
        let pool = create_test_pool().await;
        let company = "TestDedup8Corp";

        cleanup_test_jobs(&pool, company).await;

        // Insert jobs with and without URLs
        let job_id_1 = Uuid::new_v4();
        insert_test_job(&pool, job_id_1, "Engineer With URL", company, Some("https://example.com/job1")).await
            .expect("Job with URL should insert");

        let job_id_2 = Uuid::new_v4();
        insert_test_job(&pool, job_id_2, "Engineer Without URL", company, None).await
            .expect("Job without URL should insert");

        // Verify both jobs exist
        let count = sqlx::query!(
            "SELECT COUNT(*) as count FROM job_deduplication WHERE job_id IN ($1, $2)",
            job_id_1,
            job_id_2
        )
        .fetch_one(&pool)
        .await
        .expect("Query should execute");

        assert_eq!(count.count.unwrap_or(0), 2, "Both jobs should exist");

        // Verify URL hash is null for second job
        let job_2_dedup = sqlx::query!(
            "SELECT url_hash FROM job_deduplication WHERE job_id = $1",
            job_id_2
        )
        .fetch_one(&pool)
        .await
        .expect("Query should execute");

        assert!(job_2_dedup.url_hash.is_none(), "Job without URL should have null url_hash");

        // Verify URL hash is populated for first job
        let job_1_dedup = sqlx::query!(
            "SELECT url_hash FROM job_deduplication WHERE job_id = $1",
            job_id_1
        )
        .fetch_one(&pool)
        .await
        .expect("Query should execute");

        assert!(job_1_dedup.url_hash.is_some(), "Job with URL should have url_hash");

        // Cleanup
        cleanup_test_jobs(&pool, company).await;
    }
}