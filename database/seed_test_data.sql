-- =====================================================
-- JobHunter E2E Test Data Seeding Script
-- =====================================================
-- This script seeds the jobhunter (dev) database with test data
-- for E2E tests. It is designed to be idempotent and can be
-- run multiple times safely.
--
-- Data Requirements:
-- - 30 filtered jobs (tests expect this count)
-- - Specific "Expert Systems Architect" job with ID 94558e12-59db-4751-9556-f36edf9f6260
-- - Jobs in various statuses for comprehensive testing
-- - Realistic data that won't interfere with other tests
--
-- Usage:
--   psql -d jobhunter -f database/seed_test_data.sql
--   OR
--   ./helper-scripts/seed-test-data.sh
-- =====================================================

BEGIN;

-- Clear existing test data (optional - comment out if you want to preserve data)
-- TRUNCATE TABLE jobs CASCADE;

-- =====================================================
-- FILTERED JOBS (30 total)
-- =====================================================

-- Job 1: Expert Systems Architect (REQUIRED by tests with specific ID)
INSERT INTO jobs (
    job_id,
    title,
    company,
    location,
    source,
    salary,
    status,
    description,
    filter_reason,
    extraction_method,
    raw_data
) VALUES (
    '94558e12-59db-4751-9556-f36edf9f6260',
    'Expert Systems Architect',
    'OMH Systems',
    'Remote',
    'gmail',
    NULL, -- No salary = filtered
    'filtered',
    'Design and implement expert systems for knowledge-based AI applications. Work with rule engines, knowledge representation, and inference mechanisms.',
    'No salary information provided',
    'llm',
    '{"company": "OMH Systems", "title": "Expert Systems Architect", "location": "Remote", "description": "Design and implement expert systems...", "extraction_method": "llm", "confidence": 0.95}'::jsonb
) ON CONFLICT (job_id) DO UPDATE SET
    title = EXCLUDED.title,
    company = EXCLUDED.company,
    location = EXCLUDED.location,
    source = EXCLUDED.source,
    salary = EXCLUDED.salary,
    status = EXCLUDED.status,
    description = EXCLUDED.description,
    filter_reason = EXCLUDED.filter_reason,
    extraction_method = EXCLUDED.extraction_method,
    raw_data = EXCLUDED.raw_data;

-- Jobs 2-10: Filtered due to low salary (< $130k)
INSERT INTO jobs (job_id, title, company, location, source, salary, status, description, filter_reason, extraction_method, raw_data)
SELECT
    gen_random_uuid(),
    'QA Engineer ' || series,
    'TechCorp ' || series,
    'San Francisco, CA',
    'gmail',
    110000 + (series * 1000), -- Salaries from $111k-$119k
    'filtered',
    'Manual and automated testing for web applications. Experience with Selenium required.',
    'Salary below minimum threshold ($130,000)',
    CASE WHEN series % 2 = 0 THEN 'llm' ELSE 'regex' END,
    ('{"company": "TechCorp ' || series || '", "title": "QA Engineer ' || series || '", "salary": ' || (110000 + series * 1000) || ', "extraction_method": "' || CASE WHEN series % 2 = 0 THEN 'llm' ELSE 'regex' END || '"}')::jsonb
FROM generate_series(2, 10) AS series
ON CONFLICT (job_id) DO NOTHING;

-- Jobs 11-20: Filtered due to location (too far from Fremont)
INSERT INTO jobs (job_id, title, company, location, source, salary, status, description, filter_reason, extraction_method, raw_data)
SELECT
    gen_random_uuid(),
    'Software Test Engineer ' || series,
    'Remote Company ' || series,
    CASE
        WHEN series % 3 = 0 THEN 'New York, NY'
        WHEN series % 3 = 1 THEN 'Austin, TX'
        ELSE 'Boston, MA'
    END,
    'gmail',
    140000 + (series * 1000),
    'filtered',
    'Automated testing and continuous integration for cloud-based applications.',
    'Location exceeds 45 minute commute from Fremont, CA',
    'llm',
    ('{"company": "Remote Company ' || series || '", "title": "Software Test Engineer ' || series || '", "salary": ' || (140000 + series * 1000) || ', "extraction_method": "llm"}')::jsonb
FROM generate_series(11, 20) AS series
ON CONFLICT (job_id) DO NOTHING;

-- Jobs 21-25: Filtered due to no salary information
INSERT INTO jobs (job_id, title, company, location, source, salary, status, description, filter_reason, extraction_method, raw_data)
SELECT
    gen_random_uuid(),
    'Test Automation Engineer ' || series,
    'Startup ' || series,
    'Remote',
    'gmail',
    NULL,
    'filtered',
    'Build and maintain test automation frameworks using Python and pytest.',
    'No salary information provided',
    CASE WHEN series % 2 = 0 THEN 'llm' ELSE 'regex' END,
    ('{"company": "Startup ' || series || '", "title": "Test Automation Engineer ' || series || '", "extraction_method": "' || CASE WHEN series % 2 = 0 THEN 'llm' ELSE 'regex' END || '"}')::jsonb
FROM generate_series(21, 25) AS series
ON CONFLICT (job_id) DO NOTHING;

-- Jobs 26-30: Filtered due to commute requirement (>3 days/week)
INSERT INTO jobs (job_id, title, company, location, source, salary, status, description, filter_reason, extraction_method, raw_data)
SELECT
    gen_random_uuid(),
    'Senior QA Lead ' || series,
    'Enterprise Corp ' || series,
    'San Jose, CA',
    'gmail',
    150000 + (series * 2000),
    'filtered',
    'Lead QA team for enterprise software. Required in-office 5 days/week.',
    'Commute requirement exceeds 3 days per week',
    'llm',
    ('{"company": "Enterprise Corp ' || series || '", "title": "Senior QA Lead ' || series || '", "salary": ' || (150000 + series * 2000) || ', "commute_days": 5, "extraction_method": "llm"}')::jsonb
FROM generate_series(26, 30) AS series
ON CONFLICT (job_id) DO NOTHING;

-- =====================================================
-- NEW JOBS (10 total)
-- These are jobs awaiting approval
-- =====================================================

INSERT INTO jobs (job_id, title, company, location, source, salary, status, description, extraction_method, raw_data)
SELECT
    gen_random_uuid(),
    'Test Automation Specialist ' || series,
    'New Company ' || series,
    CASE WHEN series % 2 = 0 THEN 'Remote' ELSE 'Fremont, CA' END,
    'gmail',
    135000 + (series * 3000),
    'new',
    'We are seeking an experienced Test Automation Specialist to join our growing engineering team. In this role, you will be responsible for designing, developing, and maintaining comprehensive automated test suites for both web and mobile applications. You will work closely with development teams to ensure high quality software releases through effective test automation strategies. Key Responsibilities: Develop and maintain automated test frameworks using Selenium WebDriver for web applications and Appium for mobile testing on iOS and Android platforms. Design test cases and test scenarios based on functional requirements and user stories. Integrate automated tests into CI/CD pipelines using Jenkins, GitLab CI, or similar tools. Perform API testing using REST Assured or Postman automation. Collaborate with developers to identify testable requirements and edge cases. Analyze test results, report defects, and track issues to resolution. Mentor junior team members on automation best practices. Required Skills: 5+ years of experience in software testing with at least 3 years focused on test automation. Strong programming skills in Java, Python, or JavaScript. Hands-on experience with Selenium WebDriver and Appium frameworks. Experience with version control systems (Git) and CI/CD tools. Knowledge of testing methodologies, test design patterns, and Page Object Model. Excellent problem-solving skills and attention to detail. Strong communication skills for collaborating with cross-functional teams. Preferred Qualifications: Experience with performance testing tools like JMeter or Gatling. Familiarity with containerization technologies (Docker, Kubernetes). ISTQB certification or similar testing certification. We offer competitive compensation, comprehensive benefits, flexible work arrangements, and opportunities for professional growth in a collaborative environment.',
    CASE WHEN series % 2 = 0 THEN 'llm' ELSE 'regex' END,
    ('{"company": "New Company ' || series || '", "title": "Test Automation Specialist ' || series || '", "salary": ' || (135000 + series * 3000) || ', "extraction_method": "' || CASE WHEN series % 2 = 0 THEN 'llm' ELSE 'regex' END || '"}')::jsonb
FROM generate_series(1, 10) AS series
ON CONFLICT (job_id) DO NOTHING;

-- =====================================================
-- APPROVED JOBS (5 total)
-- These have been reviewed and approved for application
-- =====================================================

INSERT INTO jobs (job_id, title, company, location, source, salary, status, description, extraction_method, raw_data)
SELECT
    gen_random_uuid(),
    'Senior Software Test Engineer ' || series,
    'Approved Corp ' || series,
    'Remote',
    'gmail',
    145000 + (series * 5000),
    'approved',
    'Join our cloud infrastructure team as a Senior Software Test Engineer and lead comprehensive testing initiatives for our next-generation platform. We are building cutting-edge cloud-native applications and need an experienced testing professional to ensure reliability, scalability, and performance at scale. Position Overview: You will be responsible for designing and implementing testing strategies for microservices architectures deployed on Kubernetes clusters. This role requires deep technical expertise in both manual and automated testing approaches, with emphasis on cloud infrastructure validation and continuous integration workflows. Primary Responsibilities: Lead end-to-end testing efforts for containerized applications running on Kubernetes platforms including EKS, GKE, and AKS. Design and implement comprehensive test automation frameworks for microservices using tools like Pytest, Jest, and custom testing harnesses. Develop infrastructure-as-code tests using tools such as Terratest or InSpec to validate Terraform and CloudFormation templates. Build and maintain CI/CD pipelines in Jenkins, GitHub Actions, or GitLab CI with integrated test execution and reporting. Perform load testing and performance analysis using tools like K6, Locust, or JMeter to ensure system scalability. Collaborate with Site Reliability Engineering teams on chaos engineering and resilience testing initiatives. Mentor team members on testing best practices, code review standards, and quality metrics. Required Qualifications: 7+ years of software testing experience with at least 4 years in cloud environments. Strong understanding of Kubernetes architecture, including pods, services, deployments, and StatefulSets. Proficiency in at least one programming language (Python, Go, or Java) for test development. Hands-on experience with Docker containerization and container orchestration. Deep knowledge of CI/CD concepts and practical experience building deployment pipelines. Experience with observability tools (Prometheus, Grafana, ELK stack) for test result analysis. Excellent problem-solving abilities and strong analytical thinking. Preferred Skills: AWS, Azure, or GCP certification. Experience with service mesh technologies like Istio or Linkerd. Knowledge of infrastructure as code using Terraform or Pulumi. Background in site reliability engineering or DevOps practices. We provide a fully remote work environment, competitive salary and equity, comprehensive health benefits, unlimited PTO, and professional development opportunities.',
    'llm',
    ('{"company": "Approved Corp ' || series || '", "title": "Senior Software Test Engineer ' || series || '", "salary": ' || (145000 + series * 5000) || ', "extraction_method": "llm"}')::jsonb
FROM generate_series(1, 5) AS series
ON CONFLICT (job_id) DO NOTHING;

-- =====================================================
-- SUMMARY
-- =====================================================
-- Total jobs seeded: 45
-- - Filtered: 30
-- - New: 10
-- - Approved: 5

COMMIT;

-- Verify seeding
SELECT
    status,
    COUNT(*) as count
FROM jobs
GROUP BY status
ORDER BY status;

\echo 'Test data seeding complete!'
\echo 'Filtered jobs: 30 (including Expert Systems Architect with ID 94558e12-59db-4751-9556-f36edf9f6260)'
\echo 'New jobs: 10'
\echo 'Approved jobs: 5'
\echo 'Total: 45 jobs'
