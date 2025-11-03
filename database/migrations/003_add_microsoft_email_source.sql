-- Migration: Add Microsoft Email Source for Phase 2.7
-- Date: 2025-11-03
-- Description: Adds Microsoft Graph API as a job source for sam@samkirk.com email integration

-- Insert Microsoft job source
INSERT INTO job_sources (source_name, source_type, auth_required, auth_type, configuration, is_active)
VALUES (
    'microsoft_email',
    'email',
    TRUE,
    'oauth2',
    '{
        "scopes": [
            "https://graph.microsoft.com/Mail.Read",
            "https://graph.microsoft.com/Mail.ReadWrite",
            "https://graph.microsoft.com/MailboxSettings.Read"
        ],
        "batch_size": 50,
        "folder_filter": null
    }'::JSONB,
    TRUE
)
ON CONFLICT (source_name) DO UPDATE SET
    source_type = EXCLUDED.source_type,
    auth_required = EXCLUDED.auth_required,
    auth_type = EXCLUDED.auth_type,
    configuration = EXCLUDED.configuration,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
