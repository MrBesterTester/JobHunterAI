-- ============================================================================
-- Phase 5.1: Calendar Integration & Follow-ups Migration
-- ============================================================================
-- Date: October 1, 2025
-- Features: Google Calendar integration, automated follow-ups, enhanced tracking

-- ============================================================================
-- Interviews Table
-- ============================================================================
CREATE TABLE interviews (
    interview_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
    calendar_event_id VARCHAR(255), -- Google Calendar event ID
    interview_type VARCHAR(50) DEFAULT 'phone', -- phone, video, onsite, technical
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    location TEXT, -- Physical address or video call link
    interviewer_name VARCHAR(255),
    interviewer_email VARCHAR(255),
    interviewer_phone VARCHAR(50),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, completed, cancelled, rescheduled
    reminder_sent BOOLEAN DEFAULT FALSE,
    calendar_invite_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_interviews_application ON interviews(application_id);
CREATE INDEX idx_interviews_scheduled_date ON interviews(scheduled_date);
CREATE INDEX idx_interviews_status ON interviews(status);
CREATE INDEX idx_interviews_calendar_event ON interviews(calendar_event_id);

-- ============================================================================
-- Follow-up Schedule Table
-- ============================================================================
CREATE TABLE follow_up_schedule (
    follow_up_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    attempt_number INTEGER DEFAULT 1, -- 1 = first follow-up, 2 = second follow-up
    follow_up_type VARCHAR(20) DEFAULT 'application', -- application, interview, offer
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, sent, cancelled, failed
    template_used VARCHAR(100),
    subject VARCHAR(500),
    body TEXT,
    approved_by VARCHAR(100), -- For manual approval workflow
    approved_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_follow_up_application ON follow_up_schedule(application_id);
CREATE INDEX idx_follow_up_scheduled ON follow_up_schedule(scheduled_date);
CREATE INDEX idx_follow_up_status ON follow_up_schedule(status);
CREATE INDEX idx_follow_up_attempt ON follow_up_schedule(attempt_number);

-- ============================================================================
-- Communication Log Enhancements
-- ============================================================================
-- Add calendar_event_id to track calendar-related communications
ALTER TABLE communications ADD COLUMN IF NOT EXISTS calendar_event_id VARCHAR(255);
ALTER TABLE communications ADD COLUMN IF NOT EXISTS follow_up_id UUID REFERENCES follow_up_schedule(follow_up_id) ON DELETE SET NULL;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS interview_id UUID REFERENCES interviews(interview_id) ON DELETE SET NULL;

-- Update communications indexes
CREATE INDEX IF NOT EXISTS idx_communications_calendar_event ON communications(calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_communications_follow_up ON communications(follow_up_id);
CREATE INDEX IF NOT EXISTS idx_communications_interview ON communications(interview_id);

-- ============================================================================
-- Application Status Tracking Enhancements
-- ============================================================================
-- Add last_contact_date to applications table for better tracking
ALTER TABLE applications ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS response_received BOOLEAN DEFAULT FALSE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS offer_received BOOLEAN DEFAULT FALSE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS offer_amount INTEGER;

-- ============================================================================
-- Job Status Enhancements
-- ============================================================================
-- Add new status values for job tracking
-- New statuses: 'responded', 'interview_scheduled', 'offered'
-- Existing: 'new', 'approved', 'applied', 'filtered', 'rejected'
COMMENT ON COLUMN jobs.status IS 'Job status: new, approved, applied, filtered, rejected, responded, interview_scheduled, offered';

-- ============================================================================
-- Follow-up Templates Table
-- ============================================================================
CREATE TABLE follow_up_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name VARCHAR(100) NOT NULL UNIQUE,
    template_type VARCHAR(20) NOT NULL, -- first_follow_up, second_follow_up, interview_thank_you
    subject_template VARCHAR(500) NOT NULL,
    body_template TEXT NOT NULL,
    variables JSONB, -- List of variable names used in template
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default follow-up templates
INSERT INTO follow_up_templates (template_name, template_type, subject_template, body_template, variables) VALUES
(
    'First Follow-up - Application Status',
    'first_follow_up',
    'Following up on {{job_title}} Application',
    E'Dear Hiring Manager,\n\nI recently applied for the {{job_title}} position at {{company}} on {{application_date}}. I wanted to follow up to express my continued interest in this opportunity and inquire about the status of my application.\n\nWith my background in {{primary_skill}}, I believe I would be a strong fit for this role. I am excited about the possibility of contributing to {{company}}''s team.\n\nI would appreciate any updates you can provide regarding the hiring timeline. Thank you for your consideration.\n\nBest regards,\n{{applicant_name}}',
    '{"job_title": "string", "company": "string", "application_date": "date", "primary_skill": "string", "applicant_name": "string"}'::JSONB
),
(
    'Second Follow-up - Gentle Reminder',
    'second_follow_up',
    'Checking in on {{job_title}} Application',
    E'Dear Hiring Manager,\n\nI hope this email finds you well. I wanted to reach out one more time regarding the {{job_title}} position I applied for on {{application_date}}.\n\nI remain very interested in this opportunity and would appreciate any update on the status of my application or the hiring timeline.\n\nThank you for your time and consideration.\n\nBest regards,\n{{applicant_name}}',
    '{"job_title": "string", "company": "string", "application_date": "date", "applicant_name": "string"}'::JSONB
),
(
    'Interview Thank You',
    'interview_thank_you',
    'Thank you for the {{job_title}} Interview',
    E'Dear {{interviewer_name}},\n\nThank you for taking the time to meet with me {{interview_type}} regarding the {{job_title}} position at {{company}}. I enjoyed our conversation and learning more about the role and your team.\n\nI am very excited about the opportunity to contribute to {{company}} and believe my skills in {{primary_skill}} would be a great fit for the position.\n\nPlease let me know if you need any additional information from me. I look forward to hearing from you.\n\nBest regards,\n{{applicant_name}}',
    '{"job_title": "string", "company": "string", "interviewer_name": "string", "interview_type": "string", "primary_skill": "string", "applicant_name": "string"}'::JSONB
);

-- ============================================================================
-- Triggers for Phase 5.1 Tables
-- ============================================================================
CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON interviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_follow_up_schedule_updated_at BEFORE UPDATE ON follow_up_schedule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_follow_up_templates_updated_at BEFORE UPDATE ON follow_up_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Views for Phase 5.1
-- ============================================================================

-- Upcoming Interviews View (next 30 days)
CREATE VIEW upcoming_interviews AS
SELECT
    i.*,
    a.job_id,
    a.date_applied,
    j.title as job_title,
    j.company,
    j.location as job_location
FROM interviews i
JOIN applications a ON i.application_id = a.application_id
JOIN jobs j ON a.job_id = j.job_id
WHERE i.status = 'scheduled'
    AND i.scheduled_date >= NOW()
    AND i.scheduled_date <= NOW() + INTERVAL '30 days'
ORDER BY i.scheduled_date ASC;

-- Pending Follow-ups View (requiring approval)
CREATE VIEW pending_follow_ups AS
SELECT
    f.*,
    a.job_id,
    a.date_applied,
    a.last_contact_date,
    j.title as job_title,
    j.company,
    EXTRACT(DAY FROM (NOW() - a.date_applied)) as days_since_application
FROM follow_up_schedule f
JOIN applications a ON f.application_id = a.application_id
JOIN jobs j ON a.job_id = j.job_id
WHERE f.status = 'pending'
    AND f.scheduled_date <= NOW() + INTERVAL '7 days'
ORDER BY f.scheduled_date ASC;

-- Application Timeline View (complete communication history)
CREATE VIEW application_timeline AS
SELECT
    a.application_id,
    a.job_id,
    j.title as job_title,
    j.company,
    a.date_applied,
    'application' as event_type,
    a.date_applied as event_date,
    'Applied to position' as event_description,
    NULL::UUID as related_id
FROM applications a
JOIN jobs j ON a.job_id = j.job_id

UNION ALL

SELECT
    c.application_id,
    a.job_id,
    j.title as job_title,
    j.company,
    a.date_applied,
    'communication' as event_type,
    c.message_date as event_date,
    CONCAT(c.direction, ': ', COALESCE(c.subject, 'No subject')) as event_description,
    c.communication_id as related_id
FROM communications c
JOIN applications a ON c.application_id = a.application_id
JOIN jobs j ON a.job_id = j.job_id

UNION ALL

SELECT
    i.application_id,
    a.job_id,
    j.title as job_title,
    j.company,
    a.date_applied,
    'interview' as event_type,
    i.scheduled_date as event_date,
    CONCAT(i.interview_type, ' interview - ', i.status) as event_description,
    i.interview_id as related_id
FROM interviews i
JOIN applications a ON i.application_id = a.application_id
JOIN jobs j ON a.job_id = j.job_id

UNION ALL

SELECT
    f.application_id,
    a.job_id,
    j.title as job_title,
    j.company,
    a.date_applied,
    'follow_up' as event_type,
    COALESCE(f.sent_at, f.scheduled_date) as event_date,
    CONCAT('Follow-up #', f.attempt_number, ' - ', f.status) as event_description,
    f.follow_up_id as related_id
FROM follow_up_schedule f
JOIN applications a ON f.application_id = a.application_id
JOIN jobs j ON a.job_id = j.job_id

ORDER BY event_date DESC;

-- Application Statistics with Follow-up Metrics
CREATE VIEW application_stats_enhanced AS
SELECT
    COUNT(DISTINCT a.application_id) as total_applications,
    COUNT(DISTINCT CASE WHEN a.response_received THEN a.application_id END) as responses_received,
    COUNT(DISTINCT CASE WHEN i.interview_id IS NOT NULL THEN a.application_id END) as interviews_scheduled,
    COUNT(DISTINCT CASE WHEN a.offer_received THEN a.application_id END) as offers_received,
    ROUND(
        (COUNT(DISTINCT CASE WHEN a.response_received THEN a.application_id END)::DECIMAL /
        NULLIF(COUNT(DISTINCT a.application_id), 0)) * 100,
        2
    ) as response_rate_percent,
    ROUND(
        (COUNT(DISTINCT CASE WHEN i.interview_id IS NOT NULL THEN a.application_id END)::DECIMAL /
        NULLIF(COUNT(DISTINCT a.application_id), 0)) * 100,
        2
    ) as interview_rate_percent,
    COUNT(DISTINCT CASE WHEN f.status = 'pending' THEN f.follow_up_id END) as pending_follow_ups,
    COUNT(DISTINCT CASE WHEN f.status = 'sent' THEN f.follow_up_id END) as sent_follow_ups
FROM applications a
LEFT JOIN interviews i ON a.application_id = i.application_id
LEFT JOIN follow_up_schedule f ON a.application_id = f.application_id;

-- ============================================================================
-- Google Calendar OAuth Configuration
-- ============================================================================
-- Add Google Calendar to job_sources
INSERT INTO job_sources (source_name, source_type, auth_required, auth_type, configuration)
VALUES (
    'google_calendar',
    'calendar',
    TRUE,
    'oauth2',
    '{"scopes": ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"], "calendar_id": "primary"}'::JSONB
)
ON CONFLICT (source_name) DO NOTHING;

-- ============================================================================
-- Migration Complete
-- ============================================================================
COMMENT ON TABLE interviews IS 'Phase 5.1: Stores scheduled interviews with Google Calendar integration';
COMMENT ON TABLE follow_up_schedule IS 'Phase 5.1: Manages automated follow-up email schedule with manual approval';
COMMENT ON TABLE follow_up_templates IS 'Phase 5.1: Email templates for follow-ups and thank you notes';
