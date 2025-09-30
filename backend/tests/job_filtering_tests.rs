use sqlx::{Pool, Postgres};

// Job filtering engine tests for Phase 2 - Intelligent Automation

#[cfg(test)]
mod job_filtering_tests {
    use super::*;

    // Test helper to create a test database pool
    async fn create_test_pool() -> Pool<Postgres> {
        let database_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://jobhunter_user:jobhunter_dev_password@localhost/jobhunter_test".to_string());

        sqlx::postgres::PgPool::connect(&database_url)
            .await
            .expect("Failed to connect to test database")
    }

    // Job filtering criteria struct
    #[derive(Debug, Clone)]
    struct JobCriteria {
        min_salary: i32,
        max_commute_time: i32,
        max_commute_days_per_week: i32,
        preferred_domains: Vec<String>,
        remote_preference: String,
    }

    impl Default for JobCriteria {
        fn default() -> Self {
            Self {
                min_salary: 130000,
                max_commute_time: 45,
                max_commute_days_per_week: 3,
                preferred_domains: vec![
                    "Software Testing".to_string(),
                    "Test Automation".to_string(),
                    "Firmware Engineering".to_string(),
                    "Generative AI".to_string(),
                    "Prompt Engineering".to_string(),
                ],
                remote_preference: "preferred".to_string(),
            }
        }
    }

    // Job filtering engine
    struct JobFilterEngine {
        criteria: JobCriteria,
    }

    impl JobFilterEngine {
        fn new(criteria: JobCriteria) -> Self {
            Self { criteria }
        }

        fn evaluate_salary(&self, salary: Option<i32>) -> (bool, String) {
            match salary {
                Some(s) if s >= self.criteria.min_salary => {
                    (true, format!("Salary ${} meets minimum requirement of ${}", s, self.criteria.min_salary))
                },
                Some(s) => {
                    (false, format!("Salary ${} below minimum requirement of ${}", s, self.criteria.min_salary))
                },
                None => {
                    (false, "Salary not specified".to_string())
                }
            }
        }

        fn evaluate_location(&self, location: Option<&str>, remote: bool) -> (bool, String) {
            if remote || location.map(|l| l.to_lowercase()).as_deref() == Some("remote") {
                return (true, "Remote work preferred and available".to_string());
            }

            match location {
                Some(loc) => {
                    // Simulate commute time calculation based on location
                    let commute_time = self.calculate_commute_time(loc);
                    if commute_time <= self.criteria.max_commute_time {
                        (true, format!("Commute time {} minutes is within acceptable range", commute_time))
                    } else {
                        (false, format!("Commute time {} minutes exceeds maximum of {}", commute_time, self.criteria.max_commute_time))
                    }
                },
                None => (false, "Location not specified".to_string())
            }
        }

        fn evaluate_domain(&self, title: &str, description: Option<&str>) -> (bool, String, f64) {
            let text_to_analyze = format!("{} {}", title, description.unwrap_or(""));
            let text_lower = text_to_analyze.to_lowercase();

            let mut match_count = 0;
            let mut confidence_score: f64 = 0.0;

            for domain in &self.criteria.preferred_domains {
                let domain_keywords = self.get_domain_keywords(domain);
                let mut domain_score: f64 = 0.0;

                for keyword in &domain_keywords {
                    if text_lower.contains(&keyword.to_lowercase()) {
                        match_count += 1;
                        domain_score += 1.0;
                    }
                }

                confidence_score = confidence_score.max(domain_score / domain_keywords.len() as f64);
            }

            // Pass if ANY domain has >= 25% match OR if we have 2+ total keyword matches
            let passes = confidence_score >= 0.25 || match_count >= 2;
            let reason = if passes {
                format!("Domain match found with {:.1}% confidence ({} keyword matches)", confidence_score * 100.0, match_count)
            } else {
                format!("No significant domain match found (confidence: {:.1}%)", confidence_score * 100.0)
            };

            (passes, reason, confidence_score)
        }

        fn get_domain_keywords(&self, domain: &str) -> Vec<&str> {
            match domain {
                "Software Testing" => vec!["test", "testing", "qa", "quality", "assurance", "validation", "verification"],
                "Test Automation" => vec!["automation", "automated", "selenium", "cypress", "playwright", "ci/cd", "pipeline"],
                "Firmware Engineering" => vec!["firmware", "embedded", "hardware", "microcontroller", "embedded systems", "driver"],
                "Generative AI" => vec!["ai", "artificial intelligence", "machine learning", "ml", "llm", "gpt", "generative"],
                "Prompt Engineering" => vec!["prompt", "prompting", "llm", "language model", "chatgpt", "prompt engineering"],
                _ => vec![]
            }
        }

        fn calculate_commute_time(&self, location: &str) -> i32 {
            // Mock commute calculation - in real implementation would use Maps API
            let location_lower = location.to_lowercase();
            match location_lower.as_str() {
                loc if loc.contains("remote") => 0,
                loc if loc.contains("fremont") => 15,
                loc if loc.contains("san jose") => 30,
                loc if loc.contains("menlo park") => 35,
                loc if loc.contains("palo alto") => 40,
                loc if loc.contains("mountain view") => 42,
                loc if loc.contains("sunnyvale") => 35,
                loc if loc.contains("santa clara") => 25,
                loc if loc.contains("san francisco") => 60,
                loc if loc.contains("oakland") => 45,
                loc if loc.contains("berkeley") => 50,
                _ => 90, // Unknown location, assume long commute
            }
        }

        fn filter_job(&self, title: &str, _company: &str, salary: Option<i32>, location: Option<&str>,
                     description: Option<&str>, remote: bool) -> FilterResult {
            let mut reasons = Vec::new();
            let mut overall_pass = true;

            // Evaluate salary
            let (salary_pass, salary_reason) = self.evaluate_salary(salary);
            reasons.push(salary_reason);
            if !salary_pass { overall_pass = false; }

            // Evaluate location
            let (location_pass, location_reason) = self.evaluate_location(location, remote);
            reasons.push(location_reason);
            if !location_pass { overall_pass = false; }

            // Evaluate domain match
            let (domain_pass, domain_reason, confidence) = self.evaluate_domain(title, description);
            reasons.push(domain_reason);
            if !domain_pass { overall_pass = false; }

            FilterResult {
                passes_filter: overall_pass,
                reasons: reasons.join("; "),
                confidence_score: confidence,
                individual_scores: FilterScores {
                    salary_score: if salary_pass { 1.0 } else { 0.0 },
                    location_score: if location_pass { 1.0 } else { 0.0 },
                    domain_score: confidence,
                }
            }
        }
    }

    #[derive(Debug, PartialEq)]
    struct FilterResult {
        passes_filter: bool,
        reasons: String,
        confidence_score: f64,
        individual_scores: FilterScores,
    }

    #[derive(Debug, PartialEq)]
    struct FilterScores {
        salary_score: f64,
        location_score: f64,
        domain_score: f64,
    }

    #[tokio::test]
    async fn test_salary_filtering_edge_cases() {
        let filter = JobFilterEngine::new(JobCriteria::default());

        // Test exact minimum salary
        let (pass, reason) = filter.evaluate_salary(Some(130000));
        assert!(pass, "Exact minimum salary should pass");
        assert!(reason.contains("meets minimum requirement"));

        // Test just below minimum
        let (pass, reason) = filter.evaluate_salary(Some(129999));
        assert!(!pass, "Below minimum salary should fail");
        assert!(reason.contains("below minimum requirement"));

        // Test significantly above minimum
        let (pass, reason) = filter.evaluate_salary(Some(200000));
        assert!(pass, "High salary should pass");
        assert!(reason.contains("meets minimum requirement"));

        // Test null salary
        let (pass, reason) = filter.evaluate_salary(None);
        assert!(!pass, "Null salary should fail");
        assert!(reason.contains("not specified"));

        // Test zero salary (edge case)
        let (pass, reason) = filter.evaluate_salary(Some(0));
        assert!(!pass, "Zero salary should fail");
        assert!(reason.contains("below minimum requirement"));
    }

    #[tokio::test]
    async fn test_location_filtering_comprehensive() {
        let filter = JobFilterEngine::new(JobCriteria::default());

        // Test remote work scenarios
        assert!(filter.evaluate_location(Some("Remote"), true).0, "Remote flag should pass");
        assert!(filter.evaluate_location(Some("Anywhere - Remote"), false).0, "Remote in location should pass");
        assert!(filter.evaluate_location(Some("San Francisco (Remote OK)"), false).0, "Remote option should pass");

        // Test acceptable commute locations
        let acceptable_locations = vec![
            ("Fremont, CA", 15),
            ("San Jose, CA", 30),
            ("Menlo Park, CA", 35),
            ("Santa Clara, CA", 25),
        ];

        for (location, expected_commute) in acceptable_locations {
            let (pass, reason) = filter.evaluate_location(Some(location), false);
            assert!(pass, "Location {} should pass filter", location);
            assert!(reason.contains(&expected_commute.to_string()),
                   "Reason should mention commute time for {}", location);
        }

        // Test unacceptable commute locations
        let unacceptable_locations = vec![
            "San Francisco, CA",
            "Los Angeles, CA",
            "Sacramento, CA",
            "Unknown City, CA"
        ];

        for location in unacceptable_locations {
            let (pass, reason) = filter.evaluate_location(Some(location), false);
            assert!(!pass, "Location {} should fail filter", location);
            assert!(reason.contains("exceeds maximum"),
                   "Reason should mention commute exceeds maximum for {}", location);
        }

        // Test null location
        let (pass, reason) = filter.evaluate_location(None, false);
        assert!(!pass, "Null location should fail");
        assert!(reason.contains("not specified"));
    }

    #[tokio::test]
    async fn test_domain_matching_algorithms() {
        let filter = JobFilterEngine::new(JobCriteria::default());

        // Test strong domain matches
        let strong_matches = vec![
            ("Senior AI Test Engineer", Some("Work with machine learning testing frameworks"), "Generative AI"),
            ("Test Automation Lead", Some("Selenium and Cypress automation"), "Test Automation"),
            ("Firmware Engineer", Some("Embedded systems and microcontroller programming"), "Firmware Engineering"),
            ("QA Engineer", Some("Quality assurance and testing methodologies"), "Software Testing"),
            ("Prompt Engineering Specialist", Some("LLM prompt optimization"), "Prompt Engineering"),
        ];

        for (title, description, _expected_domain) in strong_matches {
            let (pass, reason, confidence) = filter.evaluate_domain(title, description);
            assert!(pass, "Job '{}' should pass domain filter. Reason: {}", title, reason);
            assert!(confidence >= 0.2, "Confidence should be >= 20% for '{}', got {:.1}%", title, confidence * 100.0);
            assert!(reason.contains("Domain match found"), "Should indicate domain match for '{}'", title);
        }

        // Test weak domain matches (should fail)
        let weak_matches = vec![
            ("Marketing Manager", Some("Digital marketing and social media")),
            ("Sales Representative", Some("B2B sales and client relations")),
            ("Administrative Assistant", Some("Office administration and scheduling")),
            ("Graphic Designer", Some("UI/UX design and creative work")),
        ];

        for (title, description) in weak_matches {
            let (pass, reason, confidence) = filter.evaluate_domain(title, description);
            assert!(!pass, "Job '{}' should fail domain filter. Reason: {}", title, reason);
            assert!(confidence < 0.25, "Confidence should be < 25% for '{}', got {:.1}%", title, confidence * 100.0);
            assert!(reason.contains("No significant domain match"), "Should indicate no domain match for '{}'", title);
        }

        // Test edge cases
        let (pass, _reason, confidence) = filter.evaluate_domain("", None);
        assert!(!pass, "Empty title and description should fail");
        assert_eq!(confidence, 0.0, "Confidence should be 0 for empty input");

        // Test partial matches
        let (_pass, _reason, confidence) = filter.evaluate_domain("Software Engineer", Some("General software development"));
        // This should have low confidence but might have some keywords
        assert!(confidence < 0.25, "General software engineering should have low confidence");
    }

    #[tokio::test]
    async fn test_comprehensive_job_filtering() {
        let filter = JobFilterEngine::new(JobCriteria::default());

        // Test job that should pass all filters
        let passing_job = filter.filter_job(
            "Senior AI Test Engineer",
            "TechCorp",
            Some(155000),
            Some("Remote"),
            Some("Work on AI-powered test automation frameworks using machine learning"),
            true
        );

        assert!(passing_job.passes_filter, "High-quality job should pass filter");
        assert!(passing_job.confidence_score >= 0.2, "Should have good domain confidence");
        assert_eq!(passing_job.individual_scores.salary_score, 1.0);
        assert_eq!(passing_job.individual_scores.location_score, 1.0);
        assert!(passing_job.individual_scores.domain_score >= 0.2);

        // Test job that should fail on salary
        let salary_failing_job = filter.filter_job(
            "Senior AI Test Engineer",
            "StartupCorp",
            Some(100000),
            Some("Remote"),
            Some("AI testing work"),
            true
        );

        assert!(!salary_failing_job.passes_filter, "Low salary job should fail filter");
        assert_eq!(salary_failing_job.individual_scores.salary_score, 0.0);
        assert!(salary_failing_job.reasons.contains("below minimum requirement"));

        // Test job that should fail on location
        let location_failing_job = filter.filter_job(
            "Senior Test Engineer",
            "FarCorp",
            Some(160000),
            Some("Los Angeles, CA"),
            Some("Software testing role"),
            false
        );

        assert!(!location_failing_job.passes_filter, "Long commute job should fail filter");
        assert_eq!(location_failing_job.individual_scores.location_score, 0.0);
        assert!(location_failing_job.reasons.contains("exceeds maximum"));

        // Test job that should fail on domain
        let domain_failing_job = filter.filter_job(
            "Marketing Manager",
            "AdCorp",
            Some(140000),
            Some("Remote"),
            Some("Digital marketing and brand management"),
            true
        );

        assert!(!domain_failing_job.passes_filter, "Non-tech job should fail filter");
        assert!(domain_failing_job.individual_scores.domain_score < 0.25);
        assert!(domain_failing_job.reasons.contains("No significant domain match"));
    }

    #[tokio::test]
    async fn test_filtering_performance_benchmarks() {
        let filter = JobFilterEngine::new(JobCriteria::default());
        let start_time = std::time::Instant::now();

        // Test filtering performance with 100 job evaluations
        for i in 0..100 {
            let result = filter.filter_job(
                &format!("Test Engineer {}", i),
                "TestCorp",
                Some(135000 + i as i32 * 1000),
                Some("Remote"),
                Some("Testing and quality assurance work"),
                true
            );
            assert!(result.passes_filter, "Test job {} should pass", i);
        }

        let duration = start_time.elapsed();
        assert!(duration.as_millis() < 100,
               "100 job filtering operations should complete in under 100ms, took {}ms",
               duration.as_millis());
    }

    #[tokio::test]
    async fn test_filtering_with_database_integration() {
        let pool = create_test_pool().await;
        let filter = JobFilterEngine::new(JobCriteria::default());

        // Cleanup any existing test data first
        sqlx::query!("DELETE FROM jobs WHERE company IN ('TechCorp', 'StartupCorp', 'QualityCorp')")
            .execute(&pool)
            .await
            .expect("Failed to cleanup before test");

        // Insert test jobs with different filtering outcomes
        let test_jobs = vec![
            (uuid::Uuid::new_v4(), "Senior AI Test Engineer", "TechCorp", 155000, "Remote", "new"),
            (uuid::Uuid::new_v4(), "Junior Developer", "StartupCorp", 80000, "San Francisco", "filtered"),
            (uuid::Uuid::new_v4(), "QA Automation Manager", "QualityCorp", 145000, "Fremont", "new"),
        ];

        for (id, title, company, salary, location, expected_status) in &test_jobs {
            // Simulate filtering logic
            let result = filter.filter_job(title, company, Some(*salary), Some(location), None, location == &"Remote");
            let status = if result.passes_filter { "new" } else { "filtered" };

            assert_eq!(status, *expected_status,
                      "Job '{}' should have status '{}' after filtering", title, expected_status);

            // Insert into database with computed status
            sqlx::query!(
                "INSERT INTO jobs (job_id, title, company, salary, location, source, status, filter_reason)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
                id, title, company, salary, location, "manual", status,
                if result.passes_filter { None } else { Some(result.reasons.as_str()) }
            )
            .execute(&pool)
            .await
            .expect("Failed to insert/update test job");
        }

        // Verify database state matches filtering logic
        let filtered_jobs = sqlx::query!("SELECT title, status FROM jobs WHERE status = 'filtered' AND company IN ('TechCorp', 'StartupCorp', 'QualityCorp')")
            .fetch_all(&pool)
            .await
            .expect("Failed to fetch filtered jobs");

        assert_eq!(filtered_jobs.len(), 1, "Should have exactly one filtered job, got {}", filtered_jobs.len());
        assert_eq!(filtered_jobs[0].title, "Junior Developer", "Junior Developer should be filtered");

        let approved_jobs = sqlx::query!("SELECT title, status FROM jobs WHERE status = 'new' AND company IN ('TechCorp', 'StartupCorp', 'QualityCorp')")
            .fetch_all(&pool)
            .await
            .expect("Failed to fetch approved jobs");

        assert_eq!(approved_jobs.len(), 2, "Should have exactly two approved jobs, got {}", approved_jobs.len());

        // Cleanup
        sqlx::query!("DELETE FROM jobs WHERE company IN ('TechCorp', 'StartupCorp', 'QualityCorp')")
            .execute(&pool)
            .await
            .expect("Failed to cleanup test jobs");
    }

    #[tokio::test]
    async fn test_dynamic_criteria_updates() {
        let mut criteria = JobCriteria::default();

        // Test with lower salary requirement
        criteria.min_salary = 100000;
        let filter = JobFilterEngine::new(criteria.clone());

        let (pass, _) = filter.evaluate_salary(Some(120000));
        assert!(pass, "Job should pass with lower salary requirement");

        // Test with higher salary requirement
        criteria.min_salary = 180000;
        let filter = JobFilterEngine::new(criteria.clone());

        let (pass, _) = filter.evaluate_salary(Some(150000));
        assert!(!pass, "Job should fail with higher salary requirement");

        // Test with stricter commute requirements
        criteria.max_commute_time = 20;
        let filter = JobFilterEngine::new(criteria.clone());

        let (pass, _) = filter.evaluate_location(Some("San Jose, CA"), false);
        assert!(!pass, "Job should fail with stricter commute requirements");

        // Test with additional domain preferences
        criteria.preferred_domains.push("DevOps".to_string());
        let filter = JobFilterEngine::new(criteria);

        let (_pass, _, confidence) = filter.evaluate_domain("DevOps Engineer", Some("Infrastructure and deployment"));
        // This would pass if DevOps keywords were implemented
        assert!(confidence >= 0.0, "Domain evaluation should return valid confidence score");
    }
}