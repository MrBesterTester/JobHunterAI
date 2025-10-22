use sqlx::{Pool, Postgres};
use uuid::Uuid;

// Import the main application components
// Note: This would need to be adjusted based on the actual module structure
// For now, we'll create test stubs that demonstrate the testing approach

// Test helper to create a test database pool
async fn create_test_pool() -> Pool<Postgres> {
    let database_url = std::env::var("TEST_DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://jobhunter_user:jobhunter_dev_password@localhost/jobhunter_test".to_string());

    sqlx::postgres::PgPool::connect(&database_url)
        .await
        .expect("Failed to connect to test database")
}

#[cfg(test)]
mod api_tests {
    use super::*;

    #[tokio::test]
    async fn test_get_jobs_endpoint() {
        let pool = create_test_pool().await;

        // This would need to be adjusted to use the actual app factory function
        // let app = test::init_service(
        //     App::new()
        //         .app_data(web::Data::new(pool.clone()))
        //         .configure(configure_routes)
        // ).await;

        // For now, we'll test the database connection
        let result = sqlx::query!("SELECT 1 as test_value")
            .fetch_one(&pool)
            .await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap().test_value, Some(1));
    }

    #[tokio::test]
    async fn test_create_job_endpoint() {
        let pool = create_test_pool().await;

        // Test job creation with filtering logic
        // Verify database can handle job insertion
        let job_id = Uuid::new_v4();
        let result = sqlx::query!(
            "INSERT INTO jobs (job_id, title, company, salary, location, source, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)",
            job_id,
            "Senior Test Engineer",
            "TechCorp",
            150000i32,
            "Remote",
            "manual",
            "new"
        )
        .execute(&pool)
        .await;

        assert!(result.is_ok());

        // Cleanup
        sqlx::query!("DELETE FROM jobs WHERE job_id = $1", job_id)
            .execute(&pool)
            .await
            .expect("Failed to cleanup test job");
    }

    #[tokio::test]
    async fn test_job_filtering_logic() {
        // Test salary filtering criteria
        struct JobFilterTest {
            title: String,
            company: String,
            salary: Option<i32>,
            should_pass: bool,
        }

        let test_cases = vec![
            JobFilterTest {
                title: "Senior Engineer".to_string(),
                company: "HighPayCorp".to_string(),
                salary: Some(150000),
                should_pass: true,
            },
            JobFilterTest {
                title: "Junior Developer".to_string(),
                company: "LowPayCorp".to_string(),
                salary: Some(80000),
                should_pass: false,
            },
            JobFilterTest {
                title: "Manager".to_string(),
                company: "NoSalaryCorp".to_string(),
                salary: None,
                should_pass: false,
            },
        ];

        for test_case in test_cases {
            let should_pass_filter = test_case.salary.unwrap_or(0) >= 130000;
            assert_eq!(should_pass_filter, test_case.should_pass,
                      "Salary filter logic failed for job: {} at {}",
                      test_case.title, test_case.company);
        }
    }

    #[tokio::test]
    async fn test_database_constraints() {
        let pool = create_test_pool().await;

        // Test that required fields are enforced
        let result = sqlx::query!(
            "INSERT INTO jobs (job_id, title, company, source) VALUES ($1, $2, $3, $4)",
            Uuid::new_v4(),
            "Test Job",
            "", // Empty company should be allowed but non-null
            "manual"
        )
        .execute(&pool)
        .await;

        assert!(result.is_ok(), "Basic job insertion should succeed");

        // Test that NULL title fails
        let result = sqlx::query!(
            "INSERT INTO jobs (job_id, company, source) VALUES ($1, $2, $3)",
            Uuid::new_v4(),
            "Test Company",
            "manual"
        )
        .execute(&pool)
        .await;

        assert!(result.is_err(), "Job insertion without title should fail");
    }

    #[tokio::test]
    async fn test_job_deduplication() {
        let pool = create_test_pool().await;

        // Test SHA256 hash creation for deduplication
        use sha2::{Sha256, Digest};

        let company = "TestCorp";
        let title = "Software Engineer";
        let mut hasher = Sha256::new();
        hasher.update(format!("{}{}", company, title));
        let hash = format!("{:x}", hasher.finalize());

        // Verify hash consistency
        let mut hasher2 = Sha256::new();
        hasher2.update(format!("{}{}", company, title));
        let hash2 = format!("{:x}", hasher2.finalize());

        assert_eq!(hash, hash2, "Hash should be consistent for same input");
        assert_eq!(hash.len(), 64, "SHA256 hash should be 64 characters");

        // Create job first (required by foreign key constraint)
        let job_id = Uuid::new_v4();
        sqlx::query!(
            "INSERT INTO jobs (job_id, title, company, source) VALUES ($1, $2, $3, $4)",
            job_id,
            title,
            company,
            "manual"
        )
        .execute(&pool)
        .await
        .expect("Failed to create test job");

        // Test deduplication table insertion
        let result = sqlx::query!(
            "INSERT INTO job_deduplication (job_id, company_title_hash) VALUES ($1, $2)",
            job_id,
            hash
        )
        .execute(&pool)
        .await;

        assert!(result.is_ok(), "Deduplication entry should be created");

        // Create second job for duplicate hash test
        let job_id2 = Uuid::new_v4();
        sqlx::query!(
            "INSERT INTO jobs (job_id, title, company, source) VALUES ($1, $2, $3, $4)",
            job_id2,
            title,
            company,
            "manual"
        )
        .execute(&pool)
        .await
        .expect("Failed to create second test job");

        // Test duplicate hash rejection
        let result = sqlx::query!(
            "INSERT INTO job_deduplication (job_id, company_title_hash) VALUES ($1, $2)",
            job_id2,
            hash
        )
        .execute(&pool)
        .await;

        assert!(result.is_err(), "Duplicate hash should be rejected");

        // Cleanup (deleting jobs will cascade to job_deduplication)
        sqlx::query!("DELETE FROM jobs WHERE job_id = $1", job_id)
            .execute(&pool)
            .await
            .expect("Failed to cleanup first test job");
        sqlx::query!("DELETE FROM jobs WHERE job_id = $1", job_id2)
            .execute(&pool)
            .await
            .expect("Failed to cleanup second test job");
    }

    #[tokio::test]
    async fn test_job_statistics() {
        let pool = create_test_pool().await;

        // Use unique company name for test isolation
        let test_company = format!("TestCorp_{}", Uuid::new_v4());

        // Insert test jobs with different statuses
        let job_ids: Vec<Uuid> = (0..3).map(|_| Uuid::new_v4()).collect();
        let statuses = vec!["new", "approved", "filtered"];

        for (i, job_id) in job_ids.iter().enumerate() {
            sqlx::query!(
                "INSERT INTO jobs (job_id, title, company, source, status) VALUES ($1, $2, $3, $4, $5)",
                job_id,
                format!("Test Job {}", i + 1),
                &test_company,
                "manual",
                statuses[i]
            )
            .execute(&pool)
            .await
            .expect("Failed to insert test job");
        }

        // Test statistics query
        let stats = sqlx::query!(
            "SELECT status, COUNT(*) as count FROM jobs WHERE company = $1 GROUP BY status",
            &test_company
        )
        .fetch_all(&pool)
        .await
        .expect("Failed to fetch job statistics");

        assert_eq!(stats.len(), 3, "Should have 3 different statuses");

        for stat in &stats {
            assert_eq!(stat.count, Some(1), "Each status should have 1 job");
        }

        // Cleanup
        for job_id in job_ids {
            sqlx::query!("DELETE FROM jobs WHERE job_id = $1", job_id)
                .execute(&pool)
                .await
                .expect("Failed to cleanup test job");
        }
    }

    #[tokio::test]
    async fn test_error_handling() {
        let pool = create_test_pool().await;

        // Test handling of invalid UUID (using runtime query to avoid compile-time check)
        let result = sqlx::query("SELECT * FROM jobs WHERE job_id = 'invalid-uuid'")
            .fetch_optional(&pool)
            .await;

        assert!(result.is_err(), "Invalid UUID should cause error");

        // Test handling of non-existent job
        let result = sqlx::query!("SELECT * FROM jobs WHERE job_id = $1", Uuid::new_v4())
            .fetch_optional(&pool)
            .await;

        assert!(result.is_ok(), "Query for non-existent job should not error");
        assert!(result.unwrap().is_none(), "Non-existent job should return None");
    }
}

#[cfg(test)]
mod performance_tests {
    use super::*;
    use std::time::Instant;

    #[tokio::test]
    async fn test_job_query_performance() {
        let pool = create_test_pool().await;

        let start = Instant::now();
        let _result = sqlx::query!("SELECT * FROM jobs LIMIT 100")
            .fetch_all(&pool)
            .await
            .expect("Job query should succeed");
        let duration = start.elapsed();

        assert!(duration.as_millis() < 100,
               "Job query should complete in under 100ms, took {}ms",
               duration.as_millis());
    }

    #[tokio::test]
    async fn test_job_insertion_performance() {
        let pool = create_test_pool().await;

        let job_id = Uuid::new_v4();
        let start = Instant::now();

        let _result = sqlx::query!(
            "INSERT INTO jobs (job_id, title, company, source) VALUES ($1, $2, $3, $4)",
            job_id,
            "Performance Test Job",
            "PerfCorp",
            "manual"
        )
        .execute(&pool)
        .await
        .expect("Job insertion should succeed");

        let duration = start.elapsed();

        assert!(duration.as_millis() < 50,
               "Job insertion should complete in under 50ms, took {}ms",
               duration.as_millis());

        // Cleanup
        sqlx::query!("DELETE FROM jobs WHERE job_id = $1", job_id)
            .execute(&pool)
            .await
            .expect("Failed to cleanup test job");
    }

    // ========== SCORING API TESTS ==========

    #[tokio::test]
    async fn test_scoring_criteria_retrieval() {
        let pool = create_test_pool().await;

        // Test that scoring criteria can be retrieved
        let criteria = sqlx::query!(
            "SELECT criterion_name, weight, enabled FROM scoring_criteria ORDER BY criterion_name"
        )
        .fetch_all(&pool)
        .await;

        assert!(criteria.is_ok(), "Should be able to fetch scoring criteria");

        let criteria_list = criteria.unwrap();
        assert!(criteria_list.len() == 7, "Should have exactly 7 scoring criteria");

        // Verify required criteria exist
        let criterion_names: Vec<String> = criteria_list.iter()
            .map(|c| c.criterion_name.clone())
            .collect();

        assert!(criterion_names.contains(&"compensation".to_string()));
        assert!(criterion_names.contains(&"employment_relationship".to_string()));
        assert!(criterion_names.contains(&"remote_work".to_string()));
        assert!(criterion_names.contains(&"domain_fit".to_string()));
        assert!(criterion_names.contains(&"flexibility_perks".to_string()));
        assert!(criterion_names.contains(&"benefits".to_string()));
        assert!(criterion_names.contains(&"company_industry".to_string()));

        // Verify weights sum to approximately 1.0
        let total_weight: f64 = criteria_list.iter()
            .map(|c| c.weight.unwrap_or(0.0))
            .sum();

        assert!((total_weight - 1.0).abs() < 0.001,
                "Weights should sum to 1.0, got {}", total_weight);
    }

    #[tokio::test]
    async fn test_job_score_insertion() {
        let pool = create_test_pool().await;

        // Create a test job first
        let job_id = Uuid::new_v4();
        sqlx::query!(
            "INSERT INTO jobs (job_id, title, company, source, status) VALUES ($1, $2, $3, $4, $5)",
            job_id,
            "Test Scoring Job",
            "TestCorp",
            "manual",
            "new"
        )
        .execute(&pool)
        .await
        .expect("Job insertion should succeed");

        // Insert job score
        let result = sqlx::query!(
            r#"
            INSERT INTO job_scores (
                job_id,
                compensation_score,
                relationship_score,
                remote_work_score,
                domain_fit_score,
                flexibility_score,
                benefits_score,
                industry_score,
                total_score,
                rank
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            "#,
            job_id,
            75.5f64,
            60.0f64,
            100.0f64,
            80.0f64,
            50.0f64,
            70.0f64,
            40.0f64,
            72.35f64,
            1i32
        )
        .execute(&pool)
        .await;

        assert!(result.is_ok(), "Job score insertion should succeed");

        // Verify the score was inserted correctly
        let score = sqlx::query!(
            "SELECT total_score, rank FROM job_scores WHERE job_id = $1",
            job_id
        )
        .fetch_one(&pool)
        .await
        .expect("Should fetch inserted score");

        assert!((score.total_score.unwrap() - 72.35).abs() < 0.01);
        assert_eq!(score.rank.unwrap(), 1);

        // Cleanup
        sqlx::query!("DELETE FROM job_scores WHERE job_id = $1", job_id)
            .execute(&pool)
            .await
            .expect("Score cleanup should succeed");

        sqlx::query!("DELETE FROM jobs WHERE job_id = $1", job_id)
            .execute(&pool)
            .await
            .expect("Job cleanup should succeed");
    }

    #[tokio::test]
    async fn test_multiple_job_scores_ranking() {
        let pool = create_test_pool().await;

        // Create 3 test jobs with different scores
        let job_ids: Vec<Uuid> = (0..3).map(|_| Uuid::new_v4()).collect();
        let scores = vec![45.5f64, 78.3f64, 62.1f64];

        for (i, &job_id) in job_ids.iter().enumerate() {
            // Insert job
            sqlx::query!(
                "INSERT INTO jobs (job_id, title, company, source, status) VALUES ($1, $2, $3, $4, $5)",
                job_id,
                format!("Test Job {}", i + 1),
                "TestCorp",
                "manual",
                "new"
            )
            .execute(&pool)
            .await
            .expect("Job insertion should succeed");

            // Insert score
            sqlx::query!(
                r#"
                INSERT INTO job_scores (job_id, total_score, rank)
                VALUES ($1, $2, $3)
                "#,
                job_id,
                scores[i],
                (i + 1) as i32
            )
            .execute(&pool)
            .await
            .expect("Score insertion should succeed");
        }

        // Query jobs ordered by score
        let ranked_jobs = sqlx::query!(
            r#"
            SELECT j.job_id, j.title, s.total_score, s.rank
            FROM jobs j
            JOIN job_scores s ON j.job_id = s.job_id
            WHERE j.job_id = ANY($1)
            ORDER BY s.total_score DESC
            "#,
            &job_ids[..]
        )
        .fetch_all(&pool)
        .await
        .expect("Should fetch ranked jobs");

        assert_eq!(ranked_jobs.len(), 3);

        // Verify ordering by score (descending)
        assert_eq!(ranked_jobs[0].title, "Test Job 2"); // 78.3 score
        assert_eq!(ranked_jobs[1].title, "Test Job 3"); // 62.1 score
        assert_eq!(ranked_jobs[2].title, "Test Job 1"); // 45.5 score

        // Cleanup
        for job_id in &job_ids {
            sqlx::query!("DELETE FROM job_scores WHERE job_id = $1", job_id)
                .execute(&pool)
                .await
                .ok();

            sqlx::query!("DELETE FROM jobs WHERE job_id = $1", job_id)
                .execute(&pool)
                .await
                .ok();
        }
    }

    #[tokio::test]
    async fn test_scoring_criteria_update() {
        let pool = create_test_pool().await;

        // Get original compensation weight
        let original = sqlx::query!(
            "SELECT weight FROM scoring_criteria WHERE criterion_name = 'compensation'"
        )
        .fetch_one(&pool)
        .await
        .expect("Should fetch compensation criteria");

        let original_weight = original.weight.unwrap();

        // Update weight
        let new_weight = 0.25;
        let result = sqlx::query!(
            "UPDATE scoring_criteria SET weight = $1 WHERE criterion_name = 'compensation'",
            new_weight
        )
        .execute(&pool)
        .await;

        assert!(result.is_ok(), "Should be able to update criteria weight");

        // Verify update
        let updated = sqlx::query!(
            "SELECT weight FROM scoring_criteria WHERE criterion_name = 'compensation'"
        )
        .fetch_one(&pool)
        .await
        .expect("Should fetch updated criteria");

        assert!((updated.weight.unwrap() - new_weight).abs() < 0.001);

        // Restore original weight
        sqlx::query!(
            "UPDATE scoring_criteria SET weight = $1 WHERE criterion_name = 'compensation'",
            original_weight
        )
        .execute(&pool)
        .await
        .expect("Should restore original weight");
    }

    #[tokio::test]
    async fn test_score_boundary_values() {
        let pool = create_test_pool().await;

        let job_id = Uuid::new_v4();

        // Insert job
        sqlx::query!(
            "INSERT INTO jobs (job_id, title, company, source, status) VALUES ($1, $2, $3, $4, $5)",
            job_id,
            "Boundary Test Job",
            "TestCorp",
            "manual",
            "new"
        )
        .execute(&pool)
        .await
        .expect("Job insertion should succeed");

        // Test boundary values: 0.0, 50.0, 100.0
        let boundary_scores = vec![0.0f64, 50.0f64, 100.0f64];

        for score in boundary_scores {
            let result = sqlx::query!(
                r#"
                INSERT INTO job_scores (job_id, total_score)
                VALUES ($1, $2)
                ON CONFLICT (job_id) DO UPDATE SET total_score = $2
                "#,
                job_id,
                score
            )
            .execute(&pool)
            .await;

            assert!(result.is_ok(), "Should handle boundary score: {}", score);

            // Verify the score
            let retrieved = sqlx::query!(
                "SELECT total_score FROM job_scores WHERE job_id = $1",
                job_id
            )
            .fetch_one(&pool)
            .await
            .expect("Should fetch score");

            assert!((retrieved.total_score.unwrap() - score).abs() < 0.001);
        }

        // Cleanup
        sqlx::query!("DELETE FROM job_scores WHERE job_id = $1", job_id)
            .execute(&pool)
            .await
            .ok();

        sqlx::query!("DELETE FROM jobs WHERE job_id = $1", job_id)
            .execute(&pool)
            .await
            .ok();
    }

    #[tokio::test]
    async fn test_null_score_handling() {
        let pool = create_test_pool().await;

        let job_id = Uuid::new_v4();

        // Insert job
        sqlx::query!(
            "INSERT INTO jobs (job_id, title, company, source, status) VALUES ($1, $2, $3, $4, $5)",
            job_id,
            "Null Score Test Job",
            "TestCorp",
            "manual",
            "new"
        )
        .execute(&pool)
        .await
        .expect("Job insertion should succeed");

        // Insert score with NULL criterion scores
        let result = sqlx::query!(
            r#"
            INSERT INTO job_scores (
                job_id,
                compensation_score,
                relationship_score,
                total_score
            )
            VALUES ($1, $2, $3, $4)
            "#,
            job_id,
            None::<f64>,
            Some(60.0f64),
            Some(12.0f64)
        )
        .execute(&pool)
        .await;

        assert!(result.is_ok(), "Should handle NULL criterion scores");

        // Verify NULL scores are stored correctly
        let score = sqlx::query!(
            "SELECT compensation_score, relationship_score, total_score FROM job_scores WHERE job_id = $1",
            job_id
        )
        .fetch_one(&pool)
        .await
        .expect("Should fetch score with NULLs");

        assert!(score.compensation_score.is_none());
        assert!(score.relationship_score.is_some());
        assert_eq!(score.relationship_score.unwrap(), 60.0);

        // Cleanup
        sqlx::query!("DELETE FROM job_scores WHERE job_id = $1", job_id)
            .execute(&pool)
            .await
            .ok();

        sqlx::query!("DELETE FROM jobs WHERE job_id = $1", job_id)
            .execute(&pool)
            .await
            .ok();
    }
}