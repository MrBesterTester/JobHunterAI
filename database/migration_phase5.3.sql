-- Add extraction_prompts table for storing and versioning LLM prompts
CREATE TABLE IF NOT EXISTS extraction_prompts (
    prompt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_name VARCHAR(100) NOT NULL,
    prompt_type VARCHAR(50) NOT NULL, -- 'job_extraction', 'email_classification', etc.
    prompt_content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    version INTEGER NOT NULL DEFAULT 1,
    created_by VARCHAR(100) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    UNIQUE(prompt_type, version)
);

-- Trigger for updated_at
CREATE TRIGGER update_extraction_prompts_updated_at
    BEFORE UPDATE ON extraction_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default job extraction prompt
INSERT INTO extraction_prompts (prompt_name, prompt_type, prompt_content, is_active, version, notes)
VALUES (
    'Job Email Extraction v1',
    'job_extraction',
    'See prompts/job_extraction_default.md',
    true,
    1,
    'Initial prompt for extracting job information from recruiter emails'
);

-- Add index for quick lookup of active prompts
CREATE INDEX idx_extraction_prompts_active ON extraction_prompts(prompt_type, is_active) WHERE is_active = true;
