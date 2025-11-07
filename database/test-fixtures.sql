-- JobHunter Test Fixtures
-- Minimal test data for comprehensive test suite
--
-- Usage: psql -U jobhunter_user -d jobhunter_personal -f database/test-fixtures.sql
--
-- This file provides:
-- - 3 job sources (Gmail, MS Email, RapidAPI)
-- - OAuth credentials (loaded from .env.test at runtime)
-- - 8 test jobs (various statuses for workflow testing)
-- - 3 test applications
-- - 1 master resume version
-- - 1 cover letter template
--
-- All test data uses consistent UUIDs for reproducibility

-- ============================================================================
-- Job Sources
-- ============================================================================
-- Note: Gmail and MS Email sources already inserted by schema.sql
-- We'll update them to ensure they're configured for testing

-- Update Gmail source
UPDATE job_sources
SET
    is_active = TRUE,
    last_sync = NOW() - INTERVAL '1 hour',
    configuration = jsonb_set(
        configuration,
        '{test_mode}',
        'true'
    )
WHERE source_name = 'gmail';

-- Insert Microsoft Email source (if not exists)
INSERT INTO job_sources (
    source_id,
    source_name,
    source_type,
    auth_required,
    auth_type,
    is_active,
    configuration
) VALUES (
    '22222222-2222-2222-2222-222222222222'::UUID,
    'microsoft_email',
    'email',
    TRUE,
    'oauth2',
    TRUE,
    '{"scopes": ["Mail.Read", "Mail.ReadWrite"], "folder_name": "JobOps", "test_mode": true}'::JSONB
) ON CONFLICT (source_name) DO UPDATE SET
    is_active = TRUE,
    last_sync = NOW() - INTERVAL '1 hour',
    configuration = jsonb_set(
        EXCLUDED.configuration,
        '{test_mode}',
        'true'
    );

-- Update RapidAPI source (JSearch)
INSERT INTO job_sources (
    source_id,
    source_name,
    source_type,
    base_url,
    api_endpoint,
    auth_required,
    auth_type,
    is_active,
    rate_limit_requests,
    rate_limit_window_minutes,
    configuration
) VALUES (
    '33333333-3333-3333-3333-333333333333'::UUID,
    'rapidapi_jsearch',
    'api',
    'https://jsearch.p.rapidapi.com',
    '/search',
    TRUE,
    'api_key',
    TRUE,
    200,
    1440,
    '{"query": "software test automation", "location": "Fremont, CA", "radius": "45", "employment_types": "FULLTIME", "date_posted": "week", "test_mode": true}'::JSONB
) ON CONFLICT (source_name) DO UPDATE SET
    is_active = TRUE,
    configuration = jsonb_set(
        EXCLUDED.configuration,
        '{test_mode}',
        'true'
    );

-- ============================================================================
-- OAuth Credentials (Placeholders - actual tokens loaded from .env.test)
-- ============================================================================
-- Note: These are placeholders. The seed-database.sh script will inject
-- actual tokens from .env.test into these records.

INSERT INTO oauth_credentials (
    credential_id,
    source_id,
    client_id,
    client_secret,
    access_token,
    refresh_token,
    token_expires_at,
    scope
) VALUES (
    '11111111-1111-1111-1111-111111111111'::UUID,
    (SELECT source_id FROM job_sources WHERE source_name = 'gmail'),
    'GMAIL_CLIENT_ID_PLACEHOLDER',
    'GMAIL_CLIENT_SECRET_PLACEHOLDER',
    'GMAIL_ACCESS_TOKEN_PLACEHOLDER',
    'GMAIL_REFRESH_TOKEN_PLACEHOLDER',
    NOW() + INTERVAL '1 hour',
    ARRAY['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify']
) ON CONFLICT ON CONSTRAINT idx_oauth_credentials_source DO UPDATE SET
    client_id = EXCLUDED.client_id,
    client_secret = EXCLUDED.client_secret,
    access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
    token_expires_at = EXCLUDED.token_expires_at,
    scope = EXCLUDED.scope;

INSERT INTO oauth_credentials (
    credential_id,
    source_id,
    client_id,
    client_secret,
    access_token,
    refresh_token,
    token_expires_at,
    scope
) VALUES (
    '22222222-2222-2222-2222-222222222222'::UUID,
    (SELECT source_id FROM job_sources WHERE source_name = 'microsoft_email'),
    'MSMAIL_CLIENT_ID_PLACEHOLDER',
    'MSMAIL_CLIENT_SECRET_PLACEHOLDER',
    'MSMAIL_ACCESS_TOKEN_PLACEHOLDER',
    'MSMAIL_REFRESH_TOKEN_PLACEHOLDER',
    NOW() + INTERVAL '1 hour',
    ARRAY['Mail.Read', 'Mail.ReadWrite']
) ON CONFLICT ON CONSTRAINT idx_oauth_credentials_source DO UPDATE SET
    client_id = EXCLUDED.client_id,
    client_secret = EXCLUDED.client_secret,
    access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
    token_expires_at = EXCLUDED.token_expires_at,
    scope = EXCLUDED.scope;

-- ============================================================================
-- Test Jobs (8 jobs with various statuses)
-- ============================================================================

-- Job 1: "new" status - Awaiting approval (high salary, remote)
INSERT INTO jobs (
    job_id,
    title,
    company,
    location,
    source,
    salary,
    status,
    description,
    url,
    date_email_sent
) VALUES (
    'aaaaaaaa-0001-0001-0001-000000000001'::UUID,
    'Senior Test Automation Engineer',
    'TestCorp Technologies',
    'Remote (US)',
    'gmail',
    150000,
    'new',
    'Seeking a senior test automation engineer to lead our QA efforts. Strong Python and Selenium experience required.',
    'https://testcorp.com/jobs/senior-automation-engineer',
    NOW() - INTERVAL '1 day'
);

-- Job 2: "new" status - Awaiting approval (on-site acceptable)
INSERT INTO jobs (
    job_id,
    title,
    company,
    location,
    source,
    salary,
    commute_time,
    status,
    description,
    url,
    date_email_sent
) VALUES (
    'aaaaaaaa-0002-0002-0002-000000000002'::UUID,
    'QA Engineering Manager',
    'InnovateTech Inc',
    'Fremont, CA',
    'microsoft_email',
    165000,
    25,
    'new',
    'Lead a team of QA engineers in building robust test automation frameworks. Experience with CI/CD pipelines required.',
    'https://innovatetech.com/careers/qa-manager',
    NOW() - INTERVAL '2 days'
);

-- Job 3: "new" status - Awaiting approval (contract/1099)
INSERT INTO jobs (
    job_id,
    title,
    company,
    location,
    source,
    salary,
    status,
    description,
    url,
    date_email_sent,
    raw_data
) VALUES (
    'aaaaaaaa-0003-0003-0003-000000000003'::UUID,
    'Contract Test Automation Specialist',
    'AgileConsulting LLC',
    'Remote (CA)',
    'rapidapi_jsearch',
    140000,
    'new',
    '6-month contract with potential for extension. Build and maintain test automation for fintech applications.',
    'https://agileconsulting.com/contracts/test-specialist',
    NOW() - INTERVAL '3 days',
    '{"employment_type": "CONTRACTOR", "benefits": null}'::JSONB
);

-- Job 4: "approved" status - Ready for application
INSERT INTO jobs (
    job_id,
    title,
    company,
    location,
    source,
    salary,
    status,
    description,
    url,
    date_email_sent
) VALUES (
    'bbbbbbbb-0004-0004-0004-000000000004'::UUID,
    'Principal SDET',
    'CloudScale Systems',
    'Hybrid - San Jose, CA',
    'gmail',
    175000,
    'approved',
    'Architect and implement comprehensive test strategies for distributed systems. Strong Rust and TypeScript skills preferred.',
    'https://cloudscale.com/jobs/principal-sdet',
    NOW() - INTERVAL '5 days'
);

-- Job 5: "approved" status - Ready for application (AI/ML focus)
INSERT INTO jobs (
    job_id,
    title,
    company,
    location,
    source,
    salary,
    status,
    description,
    url,
    date_email_sent
) VALUES (
    'bbbbbbbb-0005-0005-0005-000000000005'::UUID,
    'AI Test Engineer',
    'DeepMind Labs',
    'Remote (Global)',
    'microsoft_email',
    160000,
    'approved',
    'Test and validate large language model outputs. Experience with prompt engineering and generative AI testing required.',
    'https://deepmindlabs.com/careers/ai-test-engineer',
    NOW() - INTERVAL '7 days'
);

-- Job 6: "filtered" status - Did not meet criteria
INSERT INTO jobs (
    job_id,
    title,
    company,
    location,
    source,
    salary,
    status,
    description,
    url,
    filter_reason,
    date_email_sent
) VALUES (
    'cccccccc-0006-0006-0006-000000000006'::UUID,
    'Junior QA Tester',
    'StartupCo',
    'San Francisco, CA',
    'gmail',
    95000,
    'filtered',
    'Entry-level QA position for recent graduates. Manual testing focus.',
    'https://startupco.com/jobs/junior-qa',
    'Salary below minimum threshold ($95,000 < $130,000)',
    NOW() - INTERVAL '10 days'
);

-- Job 7: "applied" status - Application submitted
INSERT INTO jobs (
    job_id,
    title,
    company,
    location,
    source,
    salary,
    status,
    description,
    url,
    date_email_sent
) VALUES (
    'dddddddd-0007-0007-0007-000000000007'::UUID,
    'Staff Test Engineer',
    'TechGiant Corp',
    'Sunnyvale, CA',
    'rapidapi_jsearch',
    185000,
    'applied',
    'Lead test automation efforts for critical infrastructure. Strong distributed systems and testing experience required.',
    'https://techgiant.com/careers/staff-test-engineer',
    NOW() - INTERVAL '14 days'
);

-- Job 8: "rejected" status - Application rejected
INSERT INTO jobs (
    job_id,
    title,
    company,
    location,
    source,
    salary,
    status,
    description,
    url,
    date_email_sent
) VALUES (
    'eeeeeeee-0008-0008-0008-000000000008'::UUID,
    'Senior QA Engineer',
    'FastGrowth Inc',
    'Palo Alto, CA',
    'gmail',
    155000,
    'rejected',
    'Build test automation for mobile applications. iOS and Android testing experience required.',
    'https://fastgrowth.com/jobs/senior-qa',
    NOW() - INTERVAL '21 days'
);

-- ============================================================================
-- Applications (3 test applications)
-- ============================================================================

-- Application 1: For Job 7 (applied status)
INSERT INTO applications (
    application_id,
    job_id,
    resume_version,
    cover_letter_version,
    application_status,
    date_applied,
    notes
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID,
    'dddddddd-0007-0007-0007-000000000007'::UUID,
    'Master Resume v1.0',
    'Infrastructure Testing Focus',
    'submitted',
    NOW() - INTERVAL '14 days',
    'Emphasized distributed systems testing experience. Highlighted Rust and TypeScript skills.'
);

-- Application 2: For Job 8 (rejected status)
INSERT INTO applications (
    application_id,
    job_id,
    resume_version,
    cover_letter_version,
    application_status,
    date_applied,
    notes,
    follow_up_date
) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID,
    'eeeeeeee-0008-0008-0008-000000000008'::UUID,
    'Master Resume v1.0',
    'Mobile Testing Focus',
    'rejected',
    NOW() - INTERVAL '21 days',
    'Rejected after initial phone screen. Feedback: seeking more mobile-specific experience.',
    NOW() - INTERVAL '14 days'
);

-- Application 3: For Job 4 (ready to apply)
INSERT INTO applications (
    application_id,
    job_id,
    resume_version,
    cover_letter_version,
    application_status,
    date_applied,
    notes
) VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::UUID,
    'bbbbbbbb-0004-0004-0004-000000000004'::UUID,
    'Master Resume v1.0',
    'Distributed Systems Focus',
    'draft',
    NULL,
    'Draft application. Resume and cover letter generated, ready for review.'
);

-- ============================================================================
-- Resume Version (1 master resume)
-- ============================================================================

INSERT INTO resume_versions (
    version_id,
    version_name,
    content,
    format,
    is_master
) VALUES (
    'ffffffff-ffff-ffff-ffff-ffffffffffff'::UUID,
    'Master Resume v1.0',
    E'# Sam Kirk\n\n## Professional Summary\n\nExperienced test automation engineer with 10+ years of experience in software testing, test automation, and quality assurance. Expertise in building scalable test frameworks using modern technologies.\n\n## Skills\n\n- Test Automation: Selenium, Playwright, Cypress\n- Languages: Python, TypeScript, Rust\n- CI/CD: Jenkins, GitLab CI, GitHub Actions\n- Cloud: AWS, Azure, GCP\n- Databases: PostgreSQL, MySQL, MongoDB\n\n## Experience\n\n### Senior Test Automation Engineer | Previous Company | 2018-2024\n\n- Led test automation efforts for distributed systems\n- Reduced test execution time by 60% through parallel test execution\n- Mentored junior engineers on test automation best practices\n\n### QA Engineer | Earlier Company | 2014-2018\n\n- Implemented CI/CD pipelines for automated testing\n- Developed Python-based test frameworks for API testing\n- Collaborated with development teams on quality standards',
    'markdown',
    TRUE
);

-- ============================================================================
-- Cover Letter Template (1 generic template)
-- ============================================================================

INSERT INTO cover_letter_templates (
    template_id,
    template_name,
    content
) VALUES (
    'gggggggg-gggg-gggg-gggg-gggggggggggg'::UUID,
    'Generic Test Automation',
    E'Dear Hiring Manager,\n\nI am writing to express my interest in the {{job_title}} position at {{company}}. With over 10 years of experience in test automation and quality assurance, I am confident I can make significant contributions to your team.\n\n{{custom_paragraph}}\n\nI am particularly excited about this opportunity because it aligns with my expertise in {{key_skills}}. My experience with {{relevant_technologies}} has prepared me to tackle the challenges described in your job posting.\n\nThank you for considering my application. I look forward to discussing how my skills and experience can benefit {{company}}.\n\nBest regards,\nSam Kirk'
);

-- ============================================================================
-- Job Deduplication Hashes
-- ============================================================================

-- Create deduplication hashes for existing jobs
INSERT INTO job_deduplication (job_id, company_title_hash, url_hash)
SELECT
    job_id,
    MD5(LOWER(company || '::' || title)) as company_title_hash,
    MD5(url) as url_hash
FROM jobs
WHERE job_id IN (
    'aaaaaaaa-0001-0001-0001-000000000001'::UUID,
    'aaaaaaaa-0002-0002-0002-000000000002'::UUID,
    'aaaaaaaa-0003-0003-0003-000000000003'::UUID,
    'bbbbbbbb-0004-0004-0004-000000000004'::UUID,
    'bbbbbbbb-0005-0005-0005-000000000005'::UUID,
    'cccccccc-0006-0006-0006-000000000006'::UUID,
    'dddddddd-0007-0007-0007-000000000007'::UUID,
    'eeeeeeee-0008-0008-0008-000000000008'::UUID
)
ON CONFLICT (company_title_hash) DO NOTHING;

-- ============================================================================
-- Job Intake Logs (1 sample log per source)
-- ============================================================================

INSERT INTO job_intake_logs (
    log_id,
    source_id,
    sync_started_at,
    sync_completed_at,
    jobs_discovered,
    jobs_failed_processing,
    jobs_filtered_out,
    jobs_duplicated,
    jobs_created,
    errors_count,
    sync_status
) VALUES (
    'aaaaaaaa-aaaa-1111-1111-111111111111'::UUID,
    (SELECT source_id FROM job_sources WHERE source_name = 'gmail'),
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day' + INTERVAL '5 minutes',
    50,
    2,
    35,
    8,
    5,
    0,
    'completed'
);

INSERT INTO job_intake_logs (
    log_id,
    source_id,
    sync_started_at,
    sync_completed_at,
    jobs_discovered,
    jobs_failed_processing,
    jobs_filtered_out,
    jobs_duplicated,
    jobs_created,
    errors_count,
    sync_status
) VALUES (
    'bbbbbbbb-bbbb-2222-2222-222222222222'::UUID,
    (SELECT source_id FROM job_sources WHERE source_name = 'microsoft_email'),
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days' + INTERVAL '3 minutes',
    25,
    1,
    18,
    4,
    2,
    0,
    'completed'
);

INSERT INTO job_intake_logs (
    log_id,
    source_id,
    sync_started_at,
    sync_completed_at,
    jobs_discovered,
    jobs_failed_processing,
    jobs_filtered_out,
    jobs_duplicated,
    jobs_created,
    errors_count,
    sync_status
) VALUES (
    'cccccccc-cccc-3333-3333-333333333333'::UUID,
    (SELECT source_id FROM job_sources WHERE source_name = 'rapidapi_jsearch'),
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days' + INTERVAL '2 minutes',
    10,
    0,
    5,
    4,
    1,
    0,
    'completed'
);

-- ============================================================================
-- Summary
-- ============================================================================
-- Test fixtures loaded successfully:
-- - 3 job sources (Gmail, MS Email, RapidAPI)
-- - 2 OAuth credential placeholders (Gmail, MS Email)
-- - 8 test jobs (various statuses)
-- - 3 test applications
-- - 1 master resume version
-- - 1 cover letter template
-- - 8 deduplication hashes
-- - 3 job intake logs
--
-- Next steps:
-- 1. Run seed-database.sh to inject OAuth tokens from .env.test
-- 2. Run comprehensive test suite
