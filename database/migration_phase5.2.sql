-- Phase 5.2 Migration: Email Composition & Sending
-- Date: October 9, 2025

-- ============================================================================
-- Email Drafts Table
-- ============================================================================
-- Tracks Gmail drafts created for job applications
CREATE TABLE IF NOT EXISTS email_drafts (
    draft_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
    gmail_draft_id VARCHAR(255) UNIQUE,
    gmail_message_id VARCHAR(255), -- Set when draft is sent
    recipient_email VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    attachment_name VARCHAR(255),
    attachment_size INTEGER,
    status VARCHAR(20) DEFAULT 'created', -- 'created', 'sent', 'deleted'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_drafts_application ON email_drafts(application_id);
CREATE INDEX idx_email_drafts_status ON email_drafts(status);
CREATE INDEX idx_email_drafts_gmail_draft ON email_drafts(gmail_draft_id);
CREATE INDEX idx_email_drafts_created ON email_drafts(created_at DESC);

-- ============================================================================
-- Update Applications Table
-- ============================================================================
-- Add draft tracking fields
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS draft_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS draft_url TEXT;

-- ============================================================================
-- Update Communications Table
-- ============================================================================
-- Link communications to drafts
ALTER TABLE communications
ADD COLUMN IF NOT EXISTS gmail_draft_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_communications_draft ON communications(gmail_draft_id);

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================
CREATE TRIGGER update_email_drafts_updated_at BEFORE UPDATE ON email_drafts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- View: Draft Status Summary
-- ============================================================================
CREATE OR REPLACE VIEW draft_status_summary AS
SELECT
    ed.application_id,
    j.job_id,
    j.title as job_title,
    j.company,
    ed.draft_id,
    ed.gmail_draft_id,
    ed.recipient_email,
    ed.status,
    ed.created_at as draft_created_at,
    ed.sent_at as draft_sent_at,
    CASE
        WHEN ed.status = 'sent' THEN 'Sent'
        WHEN ed.status = 'deleted' THEN 'Cancelled'
        ELSE 'Pending'
    END as draft_status_label
FROM email_drafts ed
JOIN applications a ON ed.application_id = a.application_id
JOIN jobs j ON a.job_id = j.job_id
ORDER BY ed.created_at DESC;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE email_drafts IS 'Tracks Gmail drafts created for job applications with status monitoring';
COMMENT ON COLUMN email_drafts.gmail_draft_id IS 'Gmail API draft ID for tracking';
COMMENT ON COLUMN email_drafts.gmail_message_id IS 'Message ID after draft is sent';
COMMENT ON COLUMN email_drafts.status IS 'Draft status: created, sent, deleted';
COMMENT ON COLUMN applications.draft_created_at IS 'When Gmail draft was created for this application';
COMMENT ON COLUMN applications.draft_url IS 'URL to open draft in Gmail web interface';
