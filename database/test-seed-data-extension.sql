-- Test Seed Data Extension for JobHunter E2E Tests
-- Purpose: Add 25 more jobs to reach 100+ threshold for performance stress testing
-- Generated: September 30, 2025
-- Total: 25 additional jobs (78→103 jobs)

-- ============================================================================
-- 10 additional 'new' status jobs (30→40 total)
-- ============================================================================

INSERT INTO jobs (title, company, salary, location, source, status, description, url, date_collected) VALUES
  -- High-value senior roles
  ('Staff Test Engineer', 'Meta Platforms', 195000, 'Remote', 'LinkedIn', 'new', 'Staff-level test engineer for infrastructure testing. Build test frameworks for large-scale distributed systems.', 'https://linkedin.com/jobs/meta-staff-test', NOW() - INTERVAL '1 day'),
  ('Principal QA Architect', 'Netflix Engineering', 210000, 'Remote', 'Direct', 'new', 'Define quality architecture for streaming platform. Chaos engineering and resilience testing at massive scale.', 'https://netflix.com/jobs/principal-qa', NOW() - INTERVAL '2 days'),
  ('Senior AI Safety Engineer', 'OpenAI', 205000, 'San Francisco, CA', 'Gmail', 'new', 'Test and validate AI safety measures for large language models. Red teaming and adversarial testing experience required.', 'https://openai.com/careers/ai-safety', NOW() - INTERVAL '1 day'),

  -- Mid-senior testing roles
  ('Test Engineering Lead', 'Stripe Inc', 178000, 'Remote', 'Indeed', 'new', 'Lead test engineering for payment processing infrastructure. Financial services testing and compliance experience.', 'https://indeed.com/jobs/stripe-test-lead', NOW() - INTERVAL '3 days'),
  ('Hardware Test Engineer', 'Apple Hardware', 172000, 'Cupertino, CA', 'LinkedIn', 'new', 'Test next-generation consumer electronics. Experience with hardware validation and manufacturing test.', 'https://linkedin.com/jobs/apple-hardware-test', NOW() - INTERVAL '2 days'),
  ('Firmware Quality Lead', 'Tesla Autopilot', 185000, 'Fremont, CA', 'Direct', 'new', 'Lead firmware quality for autonomous driving systems. Safety-critical systems testing and validation.', 'https://tesla.com/careers/firmware-qa', NOW() - INTERVAL '4 days'),
  ('AI Model Validation Engineer', 'Google DeepMind', 198000, 'Mountain View, CA', 'Gmail', 'new', 'Validate AI models for production deployment. Experience with model accuracy, bias detection, and performance testing.', 'https://deepmind.google/careers/validation', NOW() - INTERVAL '1 day'),

  -- Specialized testing roles
  ('Security Test Engineer', 'Cloudflare Security', 167000, 'San Francisco, CA', 'LinkedIn', 'new', 'Test security infrastructure and DDoS protection. Penetration testing and security automation experience.', 'https://linkedin.com/jobs/cloudflare-security', NOW() - INTERVAL '5 days'),
  ('Performance Test Architect', 'Amazon AWS', 189000, 'Remote', 'Indeed', 'new', 'Architect performance testing for cloud services. Large-scale load testing and capacity planning.', 'https://indeed.com/jobs/aws-performance', NOW() - INTERVAL '2 days'),
  ('Test Automation Staff Engineer', 'Uber Engineering', 193000, 'San Francisco, CA', 'Direct', 'new', 'Staff engineer for test automation platform. Build infrastructure supporting thousands of engineers.', 'https://uber.com/careers/staff-automation', NOW() - INTERVAL '3 days');

-- ============================================================================
-- 5 additional approved jobs (17→22 total)
-- ============================================================================

INSERT INTO jobs (title, company, salary, location, source, status, description, url, date_collected) VALUES
  ('Senior Test Infrastructure Engineer', 'Microsoft Azure', 181000, 'Remote', 'LinkedIn', 'approved', 'Build test infrastructure for Azure cloud platform. Distributed systems testing at global scale.', 'https://linkedin.com/jobs/microsoft-azure-test', NOW() - INTERVAL '6 days'),
  ('AI Testing Principal Engineer', 'Anthropic', 215000, 'San Francisco, CA', 'Gmail', 'approved', 'Principal engineer for AI safety testing. Develop novel testing methodologies for large language models.', 'https://anthropic.com/careers/ai-testing-principal', NOW() - INTERVAL '5 days'),
  ('Firmware Validation Architect', 'Qualcomm Wireless', 174000, 'San Diego, CA', 'Indeed', 'approved', 'Architect firmware validation for wireless chipsets. 5G and wireless protocol testing expertise.', 'https://indeed.com/jobs/qualcomm-firmware', NOW() - INTERVAL '7 days'),
  ('Test Platform Lead Engineer', 'Airbnb Engineering', 186000, 'Remote', 'Direct', 'approved', 'Lead test platform development for marketplace infrastructure. Focus on E2E testing and test reliability.', 'https://airbnb.com/careers/test-platform', NOW() - INTERVAL '4 days'),
  ('Senior Hardware Validation Engineer', 'NVIDIA AI Compute', 191000, 'Santa Clara, CA', 'LinkedIn', 'approved', 'Validate AI compute hardware and GPU systems. High-performance computing test experience required.', 'https://linkedin.com/jobs/nvidia-hardware-validation', NOW() - INTERVAL '8 days');

-- ============================================================================
-- 5 additional filtered jobs (18→23 total)
-- ============================================================================

-- Filtered by salary (<$130K)
INSERT INTO jobs (title, company, salary, location, source, status, filter_reason, date_collected) VALUES
  ('QA Tester', 'Gaming Studio Co', 75000, 'Remote', 'Indeed', 'filtered', 'Salary below minimum ($130,000)', NOW() - INTERVAL '3 days'),
  ('Junior Test Engineer', 'EdTech Startup', 105000, 'San Francisco, CA', 'LinkedIn', 'filtered', 'Salary below minimum ($130,000)', NOW() - INTERVAL '4 days');

-- Filtered by commute (>45 min)
INSERT INTO jobs (title, company, salary, location, source, status, filter_reason, date_collected) VALUES
  ('Senior QA Engineer', 'Tech Park Systems', 158000, 'Santa Cruz, CA', 'Indeed', 'filtered', 'Commute time exceeds 45 minutes (estimated: 75 minutes)', NOW() - INTERVAL '2 days'),
  ('Test Automation Lead', 'Peninsula Software', 162000, 'Monterey, CA', 'Direct', 'filtered', 'Commute time exceeds 45 minutes (estimated: 90 minutes)', NOW() - INTERVAL '5 days');

-- Filtered by domain mismatch
INSERT INTO jobs (title, company, salary, location, source, status, filter_reason, date_collected) VALUES
  ('Customer Success Manager', 'SaaS Platform Inc', 148000, 'Remote', 'LinkedIn', 'filtered', 'Domain does not match preferred domains (Testing, AI, Firmware)', NOW() - INTERVAL '3 days');

-- ============================================================================
-- 3 additional applied jobs (5→8 total)
-- ============================================================================

INSERT INTO jobs (title, company, salary, location, source, status, description, url, date_collected) VALUES
  ('Principal Test Engineer', 'Salesforce Platform', 202000, 'Remote', 'LinkedIn', 'applied', 'Principal engineer for enterprise platform testing. Lead quality strategy across multiple product lines.', 'https://linkedin.com/jobs/salesforce-principal', NOW() - INTERVAL '13 days'),
  ('Staff Firmware Engineer', 'Rivian Automotive', 188000, 'Fremont, CA', 'Indeed', 'applied', 'Staff firmware engineer for electric vehicle systems. Automotive software and safety-critical systems.', 'https://indeed.com/jobs/rivian-staff-firmware', NOW() - INTERVAL '14 days'),
  ('AI Quality Architect', 'Stability AI', 197000, 'Remote', 'Gmail', 'applied', 'Architect quality systems for generative AI platform. Diffusion models and image generation testing.', 'https://stabilityai.com/careers/qa-architect', NOW() - INTERVAL '12 days');

-- ============================================================================
-- 2 additional rejected jobs (8→10 total)
-- ============================================================================

INSERT INTO jobs (title, company, salary, location, source, status, description, url, date_collected) VALUES
  ('QA Consultant', 'Consulting Group LLC', 175000, 'San Francisco, CA', 'LinkedIn', 'rejected', 'QA consultant for multiple client projects. Heavy travel required and contract-based work.', 'https://linkedin.com/jobs/qa-consultant', NOW() - INTERVAL '22 days'),
  ('Test Manager', 'Enterprise Corp', 168000, 'San Jose, CA', 'Indeed', 'rejected', 'Manage offshore QA team for legacy enterprise systems. Focus on manual testing and process management.', 'https://indeed.com/jobs/test-manager-enterprise', NOW() - INTERVAL '25 days');

-- ============================================================================
-- Summary: 25 additional jobs added
-- ============================================================================
-- 10 new status jobs (30→40)
-- 5 approved jobs (17→22)
-- 5 filtered jobs (18→23)
-- 3 applied jobs (5→8)
-- 2 rejected jobs (8→10)
-- Total jobs after extension: ~103 jobs (78 existing + 25 new)
