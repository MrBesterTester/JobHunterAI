use sqlx::{PgPool, Pool, Postgres};
use uuid::Uuid;
use std::collections::HashMap;
use bigdecimal::ToPrimitive;

// Real-time analytics and statistics tests for Phase 2 - Intelligent Automation

#[cfg(test)]
mod analytics_tests {
    use super::*;

    // Test helper to create a test database pool
    async fn create_test_pool() -> Pool<Postgres> {
        let database_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://jobhunter_user:jobhunter_dev_password@localhost/jobhunter_test".to_string());

        sqlx::postgres::PgPool::connect(&database_url)
            .await
            .expect("Failed to connect to test database")
    }

    // Helper to insert test jobs with different statuses
    async fn insert_test_jobs_with_statuses(
        pool: &PgPool,
        company_prefix: &str,
        status_counts: HashMap<&str, i32>,
    ) -> Result<Vec<Uuid>, sqlx::Error> {
        let mut job_ids = Vec::new();

        for (status, count) in status_counts {
            for i in 0..count {
                let job_id = Uuid::new_v4();
                sqlx::query!(
                    r#"
                    INSERT INTO jobs (job_id, title, company, location, source, status)
                    VALUES ($1, $2, $3, 'Remote', 'test', $4)
                    "#,
                    job_id,
                    format!("Test Job {}", i),
                    format!("{}_{}", company_prefix, status),
                    status
                )
                .execute(pool)
                .await?;

                job_ids.push(job_id);
            }
        }

        Ok(job_ids)
    }

    // Helper to cleanup test jobs
    async fn cleanup_test_jobs(pool: &PgPool, company_prefix: &str) {
        let _ = sqlx::query!(
            "DELETE FROM jobs WHERE company LIKE $1",
            format!("{}%", company_prefix)
        )
        .execute(pool)
        .await;
    }

    #[tokio::test]
    async fn test_job_statistics_accuracy() {
        let pool = create_test_pool().await;
        let company_prefix = "StatsTest1";

        cleanup_test_jobs(&pool, company_prefix).await;

        // Insert jobs with known status distribution
        let mut status_counts = HashMap::new();
        status_counts.insert("new", 10);
        status_counts.insert("filtered", 5);
        status_counts.insert("approved", 3);
        status_counts.insert("applied", 2);

        let _ = insert_test_jobs_with_statuses(&pool, company_prefix, status_counts.clone()).await
            .expect("Test jobs should be inserted");

        // Query statistics
        let stats = sqlx::query!(
            r#"
            SELECT
                status,
                COUNT(*) as count
            FROM jobs
            WHERE company LIKE $1
            GROUP BY status
            "#,
            format!("{}%", company_prefix)
        )
        .fetch_all(&pool)
        .await
        .expect("Stats query should succeed");

        // Verify counts match expected
        for row in stats {
            let status = row.status.as_deref().unwrap_or("");
            let count = row.count.unwrap_or(0) as i32;
            let expected = status_counts.get(status).unwrap_or(&0);

            assert_eq!(count, *expected,
                      "Count for status '{}' should match expected", status);
        }

        // Cleanup
        cleanup_test_jobs(&pool, company_prefix).await;
    }

    #[tokio::test]
    async fn test_statistics_query_performance() {
        let pool = create_test_pool().await;
        let company_prefix = "StatsPerfTest";

        cleanup_test_jobs(&pool, company_prefix).await;

        // Insert large dataset
        let mut status_counts = HashMap::new();
        status_counts.insert("new", 100);
        status_counts.insert("filtered", 200);
        status_counts.insert("approved", 50);
        status_counts.insert("applied", 30);
        status_counts.insert("rejected", 20);

        let _ = insert_test_jobs_with_statuses(&pool, company_prefix, status_counts).await
            .expect("Test jobs should be inserted");

        // Measure query performance
        let start_time = std::time::Instant::now();

        let stats = sqlx::query!(
            r#"
            SELECT
                status,
                COUNT(*) as count
            FROM jobs
            GROUP BY status
            "#
        )
        .fetch_all(&pool)
        .await
        .expect("Stats query should succeed");

        let duration = start_time.elapsed();

        assert!(!stats.is_empty(), "Should return statistics");
        assert!(duration.as_millis() < 100,
               "Statistics query should complete in under 100ms, took {}ms",
               duration.as_millis());

        // Cleanup
        cleanup_test_jobs(&pool, company_prefix).await;
    }

    #[tokio::test]
    async fn test_real_time_data_consistency() {
        let pool = create_test_pool().await;
        let company_prefix = "ConsistencyTest";

        cleanup_test_jobs(&pool, company_prefix).await;

        // Insert initial jobs
        let mut status_counts = HashMap::new();
        status_counts.insert("new", 5);
        let _ = insert_test_jobs_with_statuses(&pool, company_prefix, status_counts).await
            .expect("Test jobs should be inserted");

        // Get initial stats
        let initial_stats = sqlx::query!(
            r#"
            SELECT COUNT(*) as count
            FROM jobs
            WHERE company LIKE $1 AND status = 'new'
            "#,
            format!("{}%", company_prefix)
        )
        .fetch_one(&pool)
        .await
        .expect("Query should succeed");

        assert_eq!(initial_stats.count.unwrap_or(0), 5,
                  "Initial count should be 5");

        // Update one job status
        let job_to_update = sqlx::query!(
            r#"
            SELECT job_id FROM jobs
            WHERE company LIKE $1 AND status = 'new'
            LIMIT 1
            "#,
            format!("{}%", company_prefix)
        )
        .fetch_one(&pool)
        .await
        .expect("Should find job to update");

        sqlx::query!(
            "UPDATE jobs SET status = 'approved' WHERE job_id = $1",
            job_to_update.job_id
        )
        .execute(&pool)
        .await
        .expect("Update should succeed");

        // Get updated stats immediately
        let updated_stats = sqlx::query!(
            r#"
            SELECT
                status,
                COUNT(*) as count
            FROM jobs
            WHERE company LIKE $1
            GROUP BY status
            "#,
            format!("{}%", company_prefix)
        )
        .fetch_all(&pool)
        .await
        .expect("Stats query should succeed");

        // Verify real-time consistency
        let new_count = updated_stats.iter()
            .find(|row| row.status.as_deref() == Some("new"))
            .and_then(|row| row.count)
            .unwrap_or(0);

        let approved_count = updated_stats.iter()
            .find(|row| row.status.as_deref() == Some("approved"))
            .and_then(|row| row.count)
            .unwrap_or(0);

        assert_eq!(new_count, 4, "New count should decrease to 4");
        assert_eq!(approved_count, 1, "Approved count should increase to 1");

        // Cleanup
        cleanup_test_jobs(&pool, company_prefix).await;
    }

    #[tokio::test]
    async fn test_dashboard_statistics_updates() {
        let pool = create_test_pool().await;
        let company_prefix = "DashboardTest";

        cleanup_test_jobs(&pool, company_prefix).await;

        // Simulate dashboard statistics query
        let get_dashboard_stats = || async {
            sqlx::query!(
                r#"
                SELECT
                    status,
                    COUNT(*) as count
                FROM jobs
                WHERE company LIKE $1
                GROUP BY status
                "#,
                format!("{}%", company_prefix)
            )
            .fetch_all(&pool)
            .await
            .expect("Dashboard query should succeed")
        };

        // Initial state: no jobs
        let initial_stats = get_dashboard_stats().await;
        assert!(initial_stats.is_empty(), "Should start with no jobs");

        // Add new jobs
        let mut status_counts = HashMap::new();
        status_counts.insert("new", 3);
        let _ = insert_test_jobs_with_statuses(&pool, company_prefix, status_counts).await;

        let after_insert_stats = get_dashboard_stats().await;
        let new_count = after_insert_stats.iter()
            .find(|row| row.status.as_deref() == Some("new"))
            .and_then(|row| row.count)
            .unwrap_or(0);
        assert_eq!(new_count, 3, "Should show 3 new jobs");

        // Filter some jobs
        sqlx::query!(
            r#"
            UPDATE jobs
            SET status = 'filtered'
            WHERE job_id IN (
                SELECT job_id FROM jobs
                WHERE company LIKE $1 AND status = 'new'
                LIMIT 1
            )
            "#,
            format!("{}%", company_prefix)
        )
        .execute(&pool)
        .await
        .expect("Update should succeed");

        let after_filter_stats = get_dashboard_stats().await;
        let new_count_after_filter = after_filter_stats.iter()
            .find(|row| row.status.as_deref() == Some("new"))
            .and_then(|row| row.count)
            .unwrap_or(0);
        let filtered_count = after_filter_stats.iter()
            .find(|row| row.status.as_deref() == Some("filtered"))
            .and_then(|row| row.count)
            .unwrap_or(0);

        assert_eq!(new_count_after_filter, 2, "Should show 2 new jobs");
        assert_eq!(filtered_count, 1, "Should show 1 filtered job");

        // Cleanup
        cleanup_test_jobs(&pool, company_prefix).await;
    }

    #[tokio::test]
    async fn test_concurrent_statistics_queries() {
        let pool = create_test_pool().await;
        let company_prefix = "ConcurrentTest";

        cleanup_test_jobs(&pool, company_prefix).await;

        // Insert test data
        let mut status_counts = HashMap::new();
        status_counts.insert("new", 50);
        status_counts.insert("filtered", 30);
        let _ = insert_test_jobs_with_statuses(&pool, company_prefix, status_counts).await;

        // Run multiple concurrent statistics queries
        let mut handles = vec![];

        for _ in 0..10 {
            let pool_clone = pool.clone();
            let prefix_clone = company_prefix.to_string();

            let handle = tokio::spawn(async move {
                let stats = sqlx::query!(
                    r#"
                    SELECT
                        status,
                        COUNT(*) as count
                    FROM jobs
                    WHERE company LIKE $1
                    GROUP BY status
                    "#,
                    format!("{}%", prefix_clone)
                )
                .fetch_all(&pool_clone)
                .await
                .expect("Concurrent query should succeed");

                // Verify counts are consistent
                let new_count = stats.iter()
                    .find(|row| row.status.as_deref() == Some("new"))
                    .and_then(|row| row.count)
                    .unwrap_or(0);

                assert_eq!(new_count, 50, "Count should be consistent across concurrent queries");
            });

            handles.push(handle);
        }

        // Wait for all concurrent queries to complete
        for handle in handles {
            handle.await.expect("Concurrent task should complete");
        }

        // Cleanup
        cleanup_test_jobs(&pool, company_prefix).await;
    }

    #[tokio::test]
    async fn test_application_statistics() {
        let pool = create_test_pool().await;
        let company_prefix = "AppStatsTest";

        cleanup_test_jobs(&pool, company_prefix).await;

        // Insert test jobs
        let mut status_counts = HashMap::new();
        status_counts.insert("applied", 5);
        status_counts.insert("approved", 10);
        let job_ids = insert_test_jobs_with_statuses(&pool, company_prefix, status_counts).await
            .expect("Test jobs should be inserted");

        // Create applications for applied jobs
        for job_id in job_ids.iter().take(5) {
            sqlx::query!(
                r#"
                INSERT INTO applications (application_id, job_id, application_status)
                VALUES ($1, $2, 'submitted')
                "#,
                Uuid::new_v4(),
                job_id
            )
            .execute(&pool)
            .await
            .expect("Application insert should succeed");
        }

        // Query application statistics
        let app_stats = sqlx::query!(
            r#"
            SELECT COUNT(*) as count
            FROM applications
            WHERE job_id IN (
                SELECT job_id FROM jobs WHERE company LIKE $1
            )
            "#,
            format!("{}%", company_prefix)
        )
        .fetch_one(&pool)
        .await
        .expect("Application stats query should succeed");

        assert_eq!(app_stats.count.unwrap_or(0), 5,
                  "Should have 5 applications");

        // Cleanup applications first (foreign key)
        let _ = sqlx::query!(
            r#"
            DELETE FROM applications
            WHERE job_id IN (
                SELECT job_id FROM jobs WHERE company LIKE $1
            )
            "#,
            format!("{}%", company_prefix)
        )
        .execute(&pool)
        .await;

        cleanup_test_jobs(&pool, company_prefix).await;
    }

    #[tokio::test]
    async fn test_job_source_statistics() {
        let pool = create_test_pool().await;
        let company_prefix = "SourceStatsTest";

        cleanup_test_jobs(&pool, company_prefix).await;

        // Insert jobs from different sources
        let sources = vec!["gmail", "linkedin", "indeed", "manual"];
        for (i, source) in sources.iter().enumerate() {
            for j in 0..((i + 1) * 2) {
                sqlx::query!(
                    r#"
                    INSERT INTO jobs (job_id, title, company, location, source, status)
                    VALUES ($1, $2, $3, 'Remote', $4, 'new')
                    "#,
                    Uuid::new_v4(),
                    format!("Job {}", j),
                    format!("{}_{}", company_prefix, source),
                    source
                )
                .execute(&pool)
                .await
                .expect("Job insert should succeed");
            }
        }

        // Query statistics by source
        let source_stats = sqlx::query!(
            r#"
            SELECT
                source,
                COUNT(*) as count
            FROM jobs
            WHERE company LIKE $1
            GROUP BY source
            ORDER BY source
            "#,
            format!("{}%", company_prefix)
        )
        .fetch_all(&pool)
        .await
        .expect("Source stats query should succeed");

        assert_eq!(source_stats.len(), 4, "Should have stats for 4 sources");

        // Verify counts - sources are ordered alphabetically: gmail, indeed, linkedin, manual
        // But insertion order was: gmail(2), linkedin(4), indeed(6), manual(8)
        let expected_counts = vec![
            ("gmail", 2),
            ("indeed", 6),
            ("linkedin", 4),
            ("manual", 8),
        ];

        for (i, row) in source_stats.iter().enumerate() {
            let (expected_source, expected_count) = expected_counts[i];
            assert_eq!(row.source, expected_source,
                      "Source at position {} should be {}", i, expected_source);
            assert_eq!(row.count.unwrap_or(0) as usize, expected_count,
                      "Source {} should have {} jobs", row.source, expected_count);
        }

        // Cleanup
        cleanup_test_jobs(&pool, company_prefix).await;
    }

    #[tokio::test]
    async fn test_time_based_statistics() {
        let pool = create_test_pool().await;
        let company_prefix = "TimeStatsTest";

        cleanup_test_jobs(&pool, company_prefix).await;

        // Insert jobs and track today's count
        let mut status_counts = HashMap::new();
        status_counts.insert("new", 10);
        let _ = insert_test_jobs_with_statuses(&pool, company_prefix, status_counts).await;

        // Query jobs collected today
        let today_stats = sqlx::query!(
            r#"
            SELECT COUNT(*) as count
            FROM jobs
            WHERE company LIKE $1
            AND DATE(date_collected) = CURRENT_DATE
            "#,
            format!("{}%", company_prefix)
        )
        .fetch_one(&pool)
        .await
        .expect("Today stats query should succeed");

        assert_eq!(today_stats.count.unwrap_or(0), 10,
                  "Should show 10 jobs collected today");

        // Query jobs by week
        let week_stats = sqlx::query!(
            r#"
            SELECT COUNT(*) as count
            FROM jobs
            WHERE company LIKE $1
            AND date_collected >= CURRENT_DATE - INTERVAL '7 days'
            "#,
            format!("{}%", company_prefix)
        )
        .fetch_one(&pool)
        .await
        .expect("Week stats query should succeed");

        assert!(week_stats.count.unwrap_or(0) >= 10,
               "Should show at least 10 jobs in the past week");

        // Cleanup
        cleanup_test_jobs(&pool, company_prefix).await;
    }

    #[tokio::test]
    async fn test_filtering_effectiveness_statistics() {
        let pool = create_test_pool().await;
        let company_prefix = "FilterEffectTest";

        cleanup_test_jobs(&pool, company_prefix).await;

        // Insert jobs with filtering outcomes
        let mut status_counts = HashMap::new();
        status_counts.insert("new", 30);      // Passed filter
        status_counts.insert("filtered", 70);  // Failed filter
        let _ = insert_test_jobs_with_statuses(&pool, company_prefix, status_counts).await;

        // Calculate filtering effectiveness
        let filter_stats = sqlx::query!(
            r#"
            SELECT
                status,
                COUNT(*) as count,
                COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
            FROM jobs
            WHERE company LIKE $1
            GROUP BY status
            "#,
            format!("{}%", company_prefix)
        )
        .fetch_all(&pool)
        .await
        .expect("Filter stats query should succeed");

        // Verify filtering rates
        let filtered_row = filter_stats.iter()
            .find(|row| row.status.as_deref() == Some("filtered"))
            .expect("Should have filtered jobs");

        let filtered_count = filtered_row.count.unwrap_or(0);
        assert_eq!(filtered_count, 70, "Should have 70 filtered jobs");

        // Check percentage (should be 70%)
        let filtered_percentage = filtered_row.percentage
            .as_ref()
            .and_then(|p| p.to_f64())
            .unwrap_or(0.0);
        assert!((filtered_percentage - 70.0).abs() < 1.0,
               "Filtered percentage should be around 70%, got {:.1}%", filtered_percentage);

        // Cleanup
        cleanup_test_jobs(&pool, company_prefix).await;
    }

    #[tokio::test]
    async fn test_statistics_with_zero_counts() {
        let pool = create_test_pool().await;
        let company_prefix = "ZeroCountTest";

        cleanup_test_jobs(&pool, company_prefix).await;

        // Query statistics when no jobs exist
        let empty_stats = sqlx::query!(
            r#"
            SELECT
                status,
                COUNT(*) as count
            FROM jobs
            WHERE company LIKE $1
            GROUP BY status
            "#,
            format!("{}%", company_prefix)
        )
        .fetch_all(&pool)
        .await
        .expect("Empty stats query should succeed");

        assert!(empty_stats.is_empty(), "Should return empty result set");

        // Insert jobs with only one status
        let mut status_counts = HashMap::new();
        status_counts.insert("new", 5);
        let _ = insert_test_jobs_with_statuses(&pool, company_prefix, status_counts).await;

        // Query should only show 'new' status, not other statuses with zero count
        let single_status_stats = sqlx::query!(
            r#"
            SELECT
                status,
                COUNT(*) as count
            FROM jobs
            WHERE company LIKE $1
            GROUP BY status
            "#,
            format!("{}%", company_prefix)
        )
        .fetch_all(&pool)
        .await
        .expect("Single status stats query should succeed");

        assert_eq!(single_status_stats.len(), 1,
                  "Should only return status with non-zero count");
        assert_eq!(single_status_stats[0].status.as_deref(), Some("new"));
        assert_eq!(single_status_stats[0].count.unwrap_or(0), 5);

        // Cleanup
        cleanup_test_jobs(&pool, company_prefix).await;
    }
}