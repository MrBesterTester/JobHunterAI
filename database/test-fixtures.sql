-- JobHunter Test Database Fixtures
-- Sample data for testing purposes

-- Insert job criteria for testing
INSERT INTO job_criteria (
    min_salary,
    max_commute_time,
    max_commute_days_per_week,
    preferred_domains,
    location_preferences,
    remote_preference
) VALUES (
    130000,
    45,
    3,
    ARRAY['Software Testing', 'Test Automation', 'Firmware Engineering', 'Generative AI', 'Prompt Engineering'],
    '{"acceptable_cities": ["Hayward", "Menlo Park", "Newark", "Union City", "Milpitas", "Fremont"]}'::JSONB,
    'preferred'
) ON CONFLICT DO NOTHING;

-- Insert sample jobs for testing different scenarios
INSERT INTO jobs (job_id, title, company, location, source, salary, commute_time, status, description, url, date_collected) VALUES
-- High salary, remote job (should pass filter)
('11111111-1111-1111-1111-111111111111', 'Senior AI Test Engineer', 'TechCorp', 'Remote', 'manual', 155000, 0, 'new',
 'Exciting opportunity to work on AI testing frameworks...', 'https://techcorp.com/jobs/ai-test-engineer', NOW() - INTERVAL '1 day'),

-- Good salary, acceptable commute (should pass filter)
('22222222-2222-2222-2222-222222222222', 'Firmware Test Engineer', 'HardwareCorp', 'Fremont, CA', 'manual', 145000, 30, 'approved',
 'Work on cutting-edge firmware validation...', 'https://hardwarecorp.com/jobs/firmware-test', NOW() - INTERVAL '2 days'),

-- Low salary job (should be filtered)
('33333333-3333-3333-3333-333333333333', 'Junior Developer', 'StartupCorp', 'San Francisco, CA', 'manual', 85000, 60, 'filtered',
 'Entry level position...', 'https://startupcorp.com/jobs/junior-dev', NOW() - INTERVAL '3 days'),

-- High commute job (should be filtered)
('44444444-4444-4444-4444-444444444444', 'Senior Engineer', 'FarCorp', 'Sacramento, CA', 'manual', 160000, 120, 'filtered',
 'Great role but requires long commute...', 'https://farcorp.com/jobs/senior-eng', NOW() - INTERVAL '4 days'),

-- Applied job
('55555555-5555-5555-5555-555555555555', 'Test Automation Lead', 'AutoCorp', 'Remote', 'linkedin', 165000, 0, 'applied',
 'Lead a team of test automation engineers...', 'https://autocorp.com/jobs/test-lead', NOW() - INTERVAL '1 week'),

-- Gmail sourced job
('66666666-6666-6666-6666-666666666666', 'AI Testing Specialist', 'MLCorp', 'Menlo Park, CA', 'gmail', 150000, 25, 'new',
 'Specialize in testing machine learning models...', 'https://mlcorp.com/jobs/ai-testing', NOW() - INTERVAL '6 hours');

-- Insert deduplication entries for the jobs
INSERT INTO job_deduplication (job_id, company_title_hash, url_hash) VALUES
('11111111-1111-1111-1111-111111111111',
 encode(SHA256('TechCorpSenior AI Test Engineer'::bytea), 'hex'),
 encode(SHA256('https://techcorp.com/jobs/ai-test-engineer'::bytea), 'hex')),

('22222222-2222-2222-2222-222222222222',
 encode(SHA256('HardwareCorpFirmware Test Engineer'::bytea), 'hex'),
 encode(SHA256('https://hardwarecorp.com/jobs/firmware-test'::bytea), 'hex')),

('33333333-3333-3333-3333-333333333333',
 encode(SHA256('StartupCorpJunior Developer'::bytea), 'hex'),
 encode(SHA256('https://startupcorp.com/jobs/junior-dev'::bytea), 'hex')),

('44444444-4444-4444-4444-444444444444',
 encode(SHA256('FarCorpSenior Engineer'::bytea), 'hex'),
 encode(SHA256('https://farcorp.com/jobs/senior-eng'::bytea), 'hex')),

('55555555-5555-5555-5555-555555555555',
 encode(SHA256('AutoCorpTest Automation Lead'::bytea), 'hex'),
 encode(SHA256('https://autocorp.com/jobs/test-lead'::bytea), 'hex')),

('66666666-6666-6666-6666-666666666666',
 encode(SHA256('MLCorpAI Testing Specialist'::bytea), 'hex'),
 encode(SHA256('https://mlcorp.com/jobs/ai-testing'::bytea), 'hex'));

-- Insert sample applications
INSERT INTO applications (application_id, job_id, resume_version, cover_letter_version, application_status, date_applied, notes) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'master_v1.0', 'firmware_template_v1.0', 'pending', NOW() - INTERVAL '1 day',
 'Applied through company website'),

('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'master_v1.0', 'leadership_template_v1.0', 'submitted', NOW() - INTERVAL '1 week',
 'Application submitted via LinkedIn');

-- Insert sample communications
INSERT INTO communications (communication_id, application_id, message_content, message_date, channel, direction, from_contact, to_contact, subject) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 'Thank you for your application. We have received it and will review shortly.',
 NOW() - INTERVAL '12 hours', 'email', 'inbound', 'hr@hardwarecorp.com', 'samuelakirk@me.com',
 'Application Received - Firmware Test Engineer'),

('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 'Hi, I wanted to follow up on my application for the Test Automation Lead position.',
 NOW() - INTERVAL '3 days', 'linkedin', 'outbound', 'samuelakirk@me.com', 'recruiter@autocorp.com',
 'Follow up on Test Automation Lead Application');

-- Insert master resume version for testing
INSERT INTO resume_versions (version_id, version_name, content, format, is_master) VALUES
('rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr', 'master_v1.0',
'# Samuel Kirk
## Professional Summary
Senior Test Engineer with 10+ years of experience in software testing, test automation, and AI-powered testing solutions.

## Experience
### Senior Test Engineer | TechCorp | 2020-2024
- Led implementation of AI-powered test generation systems
- Developed comprehensive test automation frameworks
- Mentored junior engineers in testing best practices

### Test Automation Engineer | PrevCorp | 2018-2020
- Built CI/CD testing pipelines
- Implemented end-to-end test automation
- Reduced testing cycle time by 60%

## Skills
- **Testing**: Test Automation, Quality Engineering, CI/CD, Performance Testing
- **AI/ML**: AI-powered testing, LLM integration, Prompt Engineering
- **Programming**: Python, TypeScript, Rust, JavaScript
- **Tools**: Selenium, Playwright, Jest, pytest, Docker',
'markdown', true);

-- Insert cover letter templates for testing
INSERT INTO cover_letter_templates (template_id, template_name, content) VALUES
('tttttttt-tttt-tttt-tttt-tttttttttttt', 'firmware_template_v1.0',
'Dear {{hiring_manager_name}},

I am writing to express my strong interest in the {{job_title}} position at {{company_name}}. With over 10 years of experience in test engineering and a particular focus on firmware validation, I am excited about the opportunity to contribute to your team.

In my current role, I have extensively worked with:
- Hardware validation and firmware testing
- Embedded systems testing frameworks
- Cross-platform compatibility validation

My experience with {{job_title}} roles has prepared me well for the challenges at {{company_name}}. I am particularly drawn to your work in {{company_domain}} and would welcome the opportunity to discuss how my background in firmware testing can contribute to your team''s success.

Thank you for considering my application.

Best regards,
Samuel Kirk'),

('uuuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuuu', 'leadership_template_v1.0',
'Dear {{hiring_manager_name}},

I am excited to apply for the {{job_title}} position at {{company_name}}. As a senior engineer with extensive leadership experience, I am drawn to opportunities where I can both contribute technically and help guide engineering teams.

My leadership experience includes:
- Managing cross-functional engineering teams
- Implementing scalable testing strategies
- Mentoring junior and mid-level engineers

The {{job_title}} role at {{company_name}} represents exactly the type of technical leadership opportunity I am seeking. I would welcome the chance to discuss how my experience can help drive your testing initiatives forward.

Best regards,
Samuel Kirk');

-- Insert job sources for Phase 4 testing
INSERT INTO job_sources (source_id, source_name, source_type, auth_required, auth_type, is_active, sync_interval_minutes, configuration, last_sync) VALUES
('ssssssss-ssss-ssss-ssss-ssssssssssss', 'gmail', 'email', true, 'oauth2', true, 60,
 '{"scopes": ["https://www.googleapis.com/auth/gmail.readonly"], "batch_size": 50}'::JSONB, NOW() - INTERVAL '30 minutes'),

('tttttttt-tttt-tttt-tttt-tttttttttttt', 'linkedin', 'api', true, 'oauth2', true, 120,
 '{"base_url": "https://api.linkedin.com/v2", "search_params": {"locationNames": ["San Francisco Bay Area"], "salary": "130000"}}'::JSONB, NOW() - INTERVAL '1 hour'),

('uuuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuuu', 'indeed', 'api', false, null, false, 180,
 '{"base_url": "https://indeed-indeed.p.rapidapi.com", "search_params": {"location": "Fremont, CA", "radius": "45"}}'::JSONB, null),

('vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvvvv', 'manual', 'manual', false, null, true, null,
 '{}'::JSONB, null);

-- Insert sample intake logs for testing
INSERT INTO job_intake_logs (log_id, source_id, sync_started_at, sync_completed_at, jobs_discovered, jobs_filtered, jobs_deduplicated, jobs_approved, errors_count, sync_status) VALUES
('llllllll-llll-llll-llll-llllllllllll', 'ssssssss-ssss-ssss-ssss-ssssssssssss',
 NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '30 minutes', 5, 2, 1, 2, 0, 'completed'),

('mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm', 'tttttttt-tttt-tttt-tttt-tttttttttttt',
 NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 55 minutes', 8, 4, 2, 2, 1, 'completed');

-- Insert sample email jobs for Gmail testing
INSERT INTO email_jobs (email_job_id, message_id, thread_id, sender_email, sender_name, subject, received_date, body_text, processed, job_id, extraction_confidence) VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '17a1b2c3d4e5f6g7', '17a1b2c3d4e5f6g7',
 'recruiter@techcorp.com', 'Jane Smith', 'Exciting AI Testing Opportunity',
 NOW() - INTERVAL '6 hours',
 'Hi Samuel, We have an exciting opportunity for a Senior AI Test Engineer position at TechCorp. Remote work, $155K salary...',
 true, '11111111-1111-1111-1111-111111111111', 0.85),

('ffffffff-ffff-ffff-ffff-ffffffffffff', '18a1b2c3d4e5f6g8', '18a1b2c3d4e5f6g8',
 'noreply@jobsite.com', 'JobSite Alerts', 'New Job Alert: Junior Developer',
 NOW() - INTERVAL '12 hours',
 'New job posted: Junior Developer at StartupCorp, San Francisco, $85K...',
 true, '33333333-3333-3333-3333-333333333333', 0.65);