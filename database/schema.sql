-- JobHunter Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Jobs Table
-- ============================================================================
CREATE TABLE jobs (
    job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    source VARCHAR(50) NOT NULL,
    salary INTEGER,
    commute_time INTEGER,
    status VARCHAR(20) DEFAULT 'new',
    date_collected TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT,
    url TEXT,
    raw_data JSONB,
    filter_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_date_collected ON jobs(date_collected DESC);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_source ON jobs(source);

-- ============================================================================
-- Applications Table
-- ============================================================================
CREATE TABLE applications (
    application_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
    resume_version VARCHAR(255),
    cover_letter_version VARCHAR(255),
    application_status VARCHAR(20) DEFAULT 'pending',
    date_applied TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(application_status);
CREATE INDEX idx_applications_follow_up ON applications(follow_up_date);

-- ============================================================================
-- Communications Table
-- ============================================================================
CREATE TABLE communications (
    communication_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
    message_content TEXT NOT NULL,
    message_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    channel VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    from_contact VARCHAR(255),
    to_contact VARCHAR(255),
    subject VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_communications_application ON communications(application_id);
CREATE INDEX idx_communications_date ON communications(message_date DESC);

-- ============================================================================
-- Resume Versions Table
-- ============================================================================
CREATE TABLE resume_versions (
    version_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_name VARCHAR(100) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    format VARCHAR(20) DEFAULT 'markdown',
    file_path VARCHAR(500),
    is_master BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Cover Letter Templates Table
-- ============================================================================
CREATE TABLE cover_letter_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Job Criteria Configuration Table
-- ============================================================================
CREATE TABLE job_criteria (
    criteria_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    min_salary INTEGER DEFAULT 130000,
    max_commute_time INTEGER DEFAULT 45,
    max_commute_days_per_week INTEGER DEFAULT 3,
    preferred_domains TEXT[],
    location_preferences JSONB,
    remote_preference VARCHAR(20) DEFAULT 'preferred',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
);

-- ============================================================================
-- Deduplication Table
-- ============================================================================
CREATE TABLE job_deduplication (
    dedup_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
    company_title_hash VARCHAR(64) NOT NULL,
    url_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_dedup_company_title ON job_deduplication(company_title_hash);
CREATE INDEX idx_dedup_url ON job_deduplication(url_hash);

-- ============================================================================
-- Triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resume_versions_updated_at BEFORE UPDATE ON resume_versions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Views
-- ============================================================================

CREATE VIEW pending_approval_jobs AS
SELECT 
    j.*,
    CASE 
        WHEN j.salary >= 130000 THEN 'pass'
        ELSE 'fail'
    END as salary_check
FROM jobs j
WHERE j.status = 'new';

CREATE VIEW application_stats AS
SELECT 
    application_status,
    COUNT(*) as count,
    MAX(date_applied) as latest_application
FROM applications
GROUP BY application_status;

CREATE VIEW jobs_with_applications AS
SELECT
    j.*,
    a.application_id,
    a.application_status,
    a.date_applied,
    a.follow_up_date
FROM jobs j
LEFT JOIN applications a ON j.job_id = a.job_id
ORDER BY j.date_collected DESC;

-- ============================================================================
-- Phase 4: Automated Job Intake Tables
-- ============================================================================

-- Job Sources Configuration Table
CREATE TABLE job_sources (
    source_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name VARCHAR(50) NOT NULL UNIQUE,
    source_type VARCHAR(20) NOT NULL, -- 'email', 'api', 'webhook', 'rss'
    base_url TEXT,
    api_endpoint TEXT,
    auth_required BOOLEAN DEFAULT FALSE,
    auth_type VARCHAR(20), -- 'oauth2', 'api_key', 'basic'
    is_active BOOLEAN DEFAULT TRUE,
    rate_limit_requests INTEGER DEFAULT 100,
    rate_limit_window_minutes INTEGER DEFAULT 60,
    last_sync TIMESTAMP WITH TIME ZONE,
    sync_interval_minutes INTEGER DEFAULT 60,
    configuration JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OAuth Credentials Table
CREATE TABLE oauth_credentials (
    credential_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES job_sources(source_id) ON DELETE CASCADE,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL, -- Should be encrypted in production
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job Intake Logs Table
CREATE TABLE job_intake_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES job_sources(source_id) ON DELETE CASCADE,
    sync_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_completed_at TIMESTAMP WITH TIME ZONE,
    jobs_discovered INTEGER DEFAULT 0,
    jobs_filtered INTEGER DEFAULT 0,
    jobs_deduplicated INTEGER DEFAULT 0,
    jobs_approved INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_details JSONB,
    sync_status VARCHAR(20) DEFAULT 'running', -- 'running', 'completed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Processing Table (for Gmail integration)
CREATE TABLE email_jobs (
    email_job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id VARCHAR(255) NOT NULL UNIQUE, -- Gmail message ID
    thread_id VARCHAR(255), -- Gmail thread ID
    sender_email VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255),
    subject VARCHAR(500),
    received_date TIMESTAMP WITH TIME ZONE NOT NULL,
    body_text TEXT,
    body_html TEXT,
    attachments JSONB,
    processed BOOLEAN DEFAULT FALSE,
    job_id UUID REFERENCES jobs(job_id) ON DELETE SET NULL,
    extraction_confidence DECIMAL(3,2), -- 0.00 to 1.00
    extracted_data JSONB,
    processing_errors JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- API Job Sources Table (for LinkedIn, Indeed, etc.)
CREATE TABLE api_job_sources (
    api_job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES job_sources(source_id) ON DELETE CASCADE,
    external_job_id VARCHAR(255) NOT NULL,
    external_url TEXT,
    raw_response JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    job_id UUID REFERENCES jobs(job_id) ON DELETE SET NULL,
    extraction_confidence DECIMAL(3,2),
    extracted_data JSONB,
    processing_errors JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(source_id, external_job_id)
);

-- Indexes for Phase 4 tables
CREATE INDEX idx_job_sources_type ON job_sources(source_type);
CREATE INDEX idx_job_sources_active ON job_sources(is_active);
CREATE INDEX idx_job_sources_last_sync ON job_sources(last_sync);

CREATE UNIQUE INDEX idx_oauth_credentials_source ON oauth_credentials(source_id);
CREATE INDEX idx_oauth_credentials_expires ON oauth_credentials(token_expires_at);

CREATE INDEX idx_intake_logs_source ON job_intake_logs(source_id);
CREATE INDEX idx_intake_logs_started ON job_intake_logs(sync_started_at DESC);
CREATE INDEX idx_intake_logs_status ON job_intake_logs(sync_status);

CREATE INDEX idx_email_jobs_message ON email_jobs(message_id);
CREATE INDEX idx_email_jobs_processed ON email_jobs(processed);
CREATE INDEX idx_email_jobs_received ON email_jobs(received_date DESC);

CREATE INDEX idx_api_jobs_source ON api_job_sources(source_id);
CREATE INDEX idx_api_jobs_external ON api_job_sources(external_job_id);
CREATE INDEX idx_api_jobs_processed ON api_job_sources(processed);

-- Add triggers for Phase 4 tables
CREATE TRIGGER update_job_sources_updated_at BEFORE UPDATE ON job_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_credentials_updated_at BEFORE UPDATE ON oauth_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default job sources
INSERT INTO job_sources (source_name, source_type, auth_required, auth_type, configuration) VALUES
('gmail', 'email', TRUE, 'oauth2', '{"scopes": ["https://www.googleapis.com/auth/gmail.readonly"], "batch_size": 50}'::JSONB),
('linkedin', 'api', TRUE, 'oauth2', '{"base_url": "https://api.linkedin.com/v2", "search_params": {"locationNames": ["San Francisco Bay Area"], "salary": "130000"}}'::JSONB),
('indeed', 'api', FALSE, NULL, '{"base_url": "https://indeed-indeed.p.rapidapi.com", "search_params": {"location": "Fremont, CA", "radius": "45"}}'::JSONB),
('manual', 'manual', FALSE, NULL, '{}'::JSONB);

-- View for monitoring job intake status
CREATE VIEW job_intake_summary AS
SELECT
    js.source_name,
    js.source_type,
    js.is_active,
    js.last_sync,
    COALESCE(SUM(jil.jobs_discovered), 0) as total_discovered,
    COALESCE(SUM(jil.jobs_approved), 0) as total_approved,
    COALESCE(AVG(jil.jobs_discovered), 0) as avg_per_sync,
    COUNT(jil.log_id) as sync_count,
    MAX(jil.sync_started_at) as last_sync_attempt
FROM job_sources js
LEFT JOIN job_intake_logs jil ON js.source_id = jil.source_id
    AND jil.sync_completed_at IS NOT NULL
GROUP BY js.source_id, js.source_name, js.source_type, js.is_active, js.last_sync;
