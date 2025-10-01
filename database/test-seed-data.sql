-- Test Seed Data for JobHunter E2E Tests
-- Purpose: Enable 32 skipped tests by providing sufficient data variety
-- Generated: September 30, 2025
-- Total: 65 new jobs across all statuses

-- ============================================================================
-- 30 'new' status jobs - Enable inbox/new jobs tab tests
-- ============================================================================
-- Mix of salaries (above and below $130K), locations, domains

INSERT INTO jobs (title, company, salary, location, source, status, description, url, date_collected) VALUES
  -- High salary, remote, testing domain (passing jobs)
  ('Senior AI Test Engineer', 'TechCorp AI', 155000, 'Remote', 'LinkedIn', 'new', 'Develop and maintain test automation frameworks for our generative AI products. Experience with LLM testing and prompt engineering required.', 'https://linkedin.com/jobs/ai-test-engineer-1', NOW() - INTERVAL '1 day'),
  ('Test Automation Architect', 'Quality Systems Inc', 175000, 'Remote', 'Indeed', 'new', 'Lead test automation strategy across multiple product lines. Expert knowledge of Playwright, Selenium, and CI/CD pipelines required.', 'https://indeed.com/jobs/test-automation-architect', NOW() - INTERVAL '2 days'),
  ('Firmware Validation Engineer', 'Hardware Innovations', 160000, 'Fremont, CA', 'LinkedIn', 'new', 'Validate embedded firmware for IoT devices and hardware-software integration. Experience with oscilloscopes and logic analyzers required.', 'https://linkedin.com/jobs/firmware-validation-1', NOW() - INTERVAL '1 day'),
  ('Senior Software Test Engineer', 'Cloud Solutions Corp', 165000, 'San Francisco, CA', 'Direct', 'new', 'Build comprehensive test automation using modern frameworks. Focus on API testing, performance testing, and test infrastructure.', 'https://cloudsolutions.com/careers/senior-test-engineer', NOW() - INTERVAL '3 days'),
  ('AI Quality Engineer', 'Machine Learning Labs', 180000, 'Remote', 'Gmail', 'new', 'Develop quality assurance frameworks for large language models. Experience with prompt evaluation, hallucination detection, and bias testing.', 'https://mlabs.ai/careers/qa-engineer', NOW() - INTERVAL '2 days'),

  -- Medium-high salary, good location (borderline passing)
  ('QA Automation Lead', 'Enterprise Tech', 145000, 'San Jose, CA', 'LinkedIn', 'new', 'Lead QA automation team for enterprise SaaS platform. Strong background in test strategy and framework development required.', 'https://linkedin.com/jobs/qa-lead-enterprise', NOW() - INTERVAL '4 days'),
  ('Test Infrastructure Engineer', 'DevOps Solutions', 150000, 'Remote', 'Indeed', 'new', 'Build and maintain test infrastructure and CI/CD pipelines. Experience with Kubernetes, Docker, and cloud platforms.', 'https://indeed.com/jobs/test-infrastructure', NOW() - INTERVAL '1 day'),
  ('Senior Firmware Test Engineer', 'Semiconductor Corp', 158000, 'Milpitas, CA', 'Direct', 'new', 'Test firmware for next-generation semiconductor products. Hardware validation and embedded systems experience required.', 'https://semicorp.com/jobs/firmware-test', NOW() - INTERVAL '2 days'),
  ('AI Testing Specialist', 'Neural Networks Inc', 168000, 'Remote', 'Gmail', 'new', 'Specialize in testing AI/ML models and neural networks. Experience with model validation, accuracy testing, and performance benchmarking.', 'https://neuralnetworks.com/careers/testing', NOW() - INTERVAL '3 days'),
  ('Lead Test Automation Engineer', 'FinTech Innovations', 155000, 'San Francisco, CA', 'LinkedIn', 'new', 'Lead test automation for financial technology platform. Strong background in security testing and compliance validation.', 'https://linkedin.com/jobs/fintech-test-lead', NOW() - INTERVAL '1 day'),

  -- Threshold salary ($130K-$135K)
  ('Software Quality Engineer', 'Mobile Apps Inc', 132000, 'Remote', 'Indeed', 'new', 'Ensure quality across mobile application suite. Experience with iOS/Android testing and mobile automation frameworks.', 'https://indeed.com/jobs/mobile-qa', NOW() - INTERVAL '5 days'),
  ('Test Automation Engineer', 'Web Services Co', 135000, 'Oakland, CA', 'Direct', 'new', 'Build comprehensive test automation for web services. Focus on API testing, contract testing, and microservices validation.', 'https://webservices.com/jobs/automation', NOW() - INTERVAL '2 days'),
  ('Firmware QA Engineer', 'IoT Devices Corp', 138000, 'Fremont, CA', 'LinkedIn', 'new', 'Test firmware for IoT smart home devices. Experience with embedded systems, wireless protocols, and hardware validation.', 'https://linkedin.com/jobs/iot-firmware-qa', NOW() - INTERVAL '3 days'),
  ('AI Model Testing Engineer', 'Deep Learning Co', 142000, 'Remote', 'Gmail', 'new', 'Test and validate deep learning models. Experience with TensorFlow, PyTorch, and model accuracy evaluation.', 'https://deeplearning.com/careers/model-testing', NOW() - INTERVAL '1 day'),
  ('Senior QA Engineer', 'Data Platform Inc', 140000, 'San Jose, CA', 'Indeed', 'new', 'Test big data processing pipelines and ETL workflows. Experience with data validation and performance testing at scale.', 'https://indeed.com/jobs/data-qa-engineer', NOW() - INTERVAL '4 days'),

  -- Good salary, various tech roles (15 more)
  ('Test Engineer - Cloud Infrastructure', 'CloudFirst Technologies', 152000, 'Remote', 'LinkedIn', 'new', 'Test cloud infrastructure and deployment automation. AWS, Azure, or GCP certification preferred.', 'https://linkedin.com/jobs/cloud-test-engineer', NOW() - INTERVAL '2 days'),
  ('Quality Assurance Architect', 'Security Systems Inc', 170000, 'San Francisco, CA', 'Direct', 'new', 'Design QA architecture for cybersecurity products. Background in security testing and penetration testing.', 'https://securitysystems.com/jobs/qa-architect', NOW() - INTERVAL '1 day'),
  ('Embedded Systems Test Engineer', 'Automotive Tech', 148000, 'Fremont, CA', 'Indeed', 'new', 'Test embedded systems for autonomous vehicles. Experience with ADAS testing and automotive protocols.', 'https://indeed.com/jobs/embedded-automotive', NOW() - INTERVAL '3 days'),
  ('AI/ML Quality Engineer', 'Computer Vision Corp', 162000, 'Remote', 'Gmail', 'new', 'Test computer vision algorithms and ML pipelines. Experience with image processing and model evaluation.', 'https://cvision.ai/careers/qa', NOW() - INTERVAL '2 days'),
  ('Test Automation Lead', 'E-Commerce Platform', 144000, 'San Jose, CA', 'LinkedIn', 'new', 'Lead test automation for high-traffic e-commerce platform. Performance testing and load testing expertise.', 'https://linkedin.com/jobs/ecommerce-test-lead', NOW() - INTERVAL '5 days'),

  ('Senior Test Engineer - API', 'API Gateway Inc', 156000, 'Remote', 'Indeed', 'new', 'Build test frameworks for API gateway products. REST, GraphQL, and gRPC testing experience.', 'https://indeed.com/jobs/api-test-engineer', NOW() - INTERVAL '1 day'),
  ('Firmware Validation Specialist', 'Wearable Tech Co', 146000, 'San Francisco, CA', 'Direct', 'new', 'Validate firmware for wearable devices. Experience with Bluetooth, sensors, and low-power systems.', 'https://wearabletech.com/jobs/firmware-validation', NOW() - INTERVAL '4 days'),
  ('AI Platform Test Engineer', 'LLM Solutions Inc', 172000, 'Remote', 'Gmail', 'new', 'Test AI platform APIs and infrastructure. Experience with LLM APIs, tokenization, and prompt engineering.', 'https://llmsolutions.com/careers/platform-test', NOW() - INTERVAL '2 days'),
  ('QA Engineer - Test Infrastructure', 'DevTools Corp', 138000, 'Oakland, CA', 'LinkedIn', 'new', 'Build test infrastructure for developer tools. Experience with build systems and test orchestration.', 'https://linkedin.com/jobs/devtools-qa', NOW() - INTERVAL '3 days'),
  ('Hardware Validation Engineer', 'Chip Design Inc', 164000, 'Milpitas, CA', 'Indeed', 'new', 'Validate hardware designs and silicon. Experience with hardware test automation and validation frameworks.', 'https://indeed.com/jobs/hardware-validation', NOW() - INTERVAL '1 day'),

  ('Test Automation Engineer - Mobile', 'Social Media Corp', 141000, 'San Francisco, CA', 'Direct', 'new', 'Automate testing for mobile social media apps. iOS/Android automation with Appium or XCUITest.', 'https://socialmedia.com/jobs/mobile-automation', NOW() - INTERVAL '6 days'),
  ('AI Testing Engineer - NLP', 'Language Models Inc', 159000, 'Remote', 'Gmail', 'new', 'Test natural language processing models. Experience with text generation, sentiment analysis, and NLU evaluation.', 'https://languagemodels.ai/careers/nlp-testing', NOW() - INTERVAL '2 days'),
  ('Senior QA - Distributed Systems', 'Microservices Co', 153000, 'San Jose, CA', 'LinkedIn', 'new', 'Test distributed systems and microservices. Experience with chaos engineering and resilience testing.', 'https://linkedin.com/jobs/distributed-qa', NOW() - INTERVAL '4 days'),
  ('Firmware Test Lead', 'Smart Home Devices', 149000, 'Fremont, CA', 'Indeed', 'new', 'Lead firmware testing for smart home ecosystem. Zigbee, Z-Wave, and Matter protocol experience.', 'https://indeed.com/jobs/smarthome-firmware', NOW() - INTERVAL '3 days'),
  ('ML Quality Assurance Engineer', 'Robotics AI Lab', 166000, 'Remote', 'Direct', 'new', 'Test machine learning models for robotics applications. Experience with reinforcement learning and simulation testing.', 'https://roboticsai.com/jobs/ml-qa', NOW() - INTERVAL '1 day');

-- ============================================================================
-- 10 additional approved jobs - Supplement existing 7 (total 17)
-- ============================================================================
-- All meet filtering criteria: salary ≥$130K, good location, matching domain

INSERT INTO jobs (title, company, salary, location, source, status, description, url, date_collected) VALUES
  ('Lead Software Testing Engineer', 'Enterprise Solutions LLC', 170000, 'Remote', 'Gmail', 'approved', 'Lead testing initiatives across multiple product lines. Focus on test strategy, automation frameworks, and quality metrics.', 'https://enterprise.com/jobs/lead-testing', NOW() - INTERVAL '5 days'),
  ('Principal Test Architect', 'Cloud Native Technologies', 185000, 'San Francisco, CA', 'LinkedIn', 'approved', 'Define test architecture for cloud-native applications. Kubernetes, service mesh, and observability testing.', 'https://linkedin.com/jobs/principal-architect', NOW() - INTERVAL '4 days'),
  ('Senior AI/ML Test Engineer', 'Generative AI Corp', 178000, 'Remote', 'Indeed', 'approved', 'Test generative AI models including text, image, and code generation. LLM evaluation and prompt engineering.', 'https://indeed.com/jobs/genai-test', NOW() - INTERVAL '6 days'),
  ('Firmware Test Architect', 'Connected Devices Inc', 162000, 'Fremont, CA', 'Direct', 'approved', 'Design test architecture for firmware across device portfolio. Hardware-software integration and validation.', 'https://connecteddevices.com/jobs/firmware-architect', NOW() - INTERVAL '3 days'),
  ('Staff Test Automation Engineer', 'Platform Engineering Co', 190000, 'Remote', 'Gmail', 'approved', 'Staff-level test automation role. Build company-wide test infrastructure and frameworks.', 'https://platformeng.com/careers/staff-automation', NOW() - INTERVAL '7 days'),

  ('Senior Quality Engineer - AI', 'Neural Computing Labs', 173000, 'San Jose, CA', 'LinkedIn', 'approved', 'Test neural network training pipelines and inference systems. GPU testing and performance optimization.', 'https://linkedin.com/jobs/neural-qa', NOW() - INTERVAL '4 days'),
  ('Test Engineering Manager', 'SaaS Platform Inc', 165000, 'Remote', 'Indeed', 'approved', 'Manage test engineering team for enterprise SaaS. Technical leadership and hands-on automation.', 'https://indeed.com/jobs/test-manager', NOW() - INTERVAL '5 days'),
  ('Hardware Test Engineer - Senior', 'Semiconductor Testing Corp', 157000, 'Milpitas, CA', 'Direct', 'approved', 'Senior hardware test engineer for chip validation. ATE programming and test coverage analysis.', 'https://semitesting.com/jobs/hardware-senior', NOW() - INTERVAL '8 days'),
  ('AI Quality Architect', 'Vision AI Systems', 182000, 'Remote', 'Gmail', 'approved', 'Architect quality systems for computer vision AI. Model validation, accuracy benchmarking, bias detection.', 'https://visionai.com/careers/qa-architect', NOW() - INTERVAL '6 days'),
  ('Lead Firmware Validation Engineer', 'Embedded Solutions Inc', 168000, 'Fremont, CA', 'LinkedIn', 'approved', 'Lead firmware validation for embedded products. Real-time systems testing and hardware debugging.', 'https://linkedin.com/jobs/lead-firmware-validation', NOW() - INTERVAL '4 days');

-- ============================================================================
-- 15 filtered jobs - Enable comprehensive filtering tests
-- ============================================================================
-- 5 filtered by salary, 5 by commute, 5 by domain

-- Filtered by salary (<$130K)
INSERT INTO jobs (title, company, salary, location, source, status, filter_reason, date_collected) VALUES
  ('Junior QA Tester', 'StartupCo', 80000, 'Remote', 'Indeed', 'filtered', 'Salary below minimum ($130,000)', NOW() - INTERVAL '3 days'),
  ('QA Engineer I', 'Small Tech Inc', 95000, 'San Francisco, CA', 'LinkedIn', 'filtered', 'Salary below minimum ($130,000)', NOW() - INTERVAL '2 days'),
  ('Software Tester', 'Web Apps LLC', 110000, 'Remote', 'Direct', 'filtered', 'Salary below minimum ($130,000)', NOW() - INTERVAL '4 days'),
  ('Test Engineer - Entry Level', 'Mobile Gaming Co', 120000, 'San Jose, CA', 'Indeed', 'filtered', 'Salary below minimum ($130,000)', NOW() - INTERVAL '5 days'),
  ('QA Analyst', 'E-Learning Platform', 125000, 'Remote', 'LinkedIn', 'filtered', 'Salary below minimum ($130,000)', NOW() - INTERVAL '1 day');

-- Filtered by commute time (>45 minutes from Fremont)
INSERT INTO jobs (title, company, salary, location, source, status, filter_reason, date_collected) VALUES
  ('Test Engineer', 'Far North Corp', 140000, 'Sacramento, CA', 'Indeed', 'filtered', 'Commute time exceeds 45 minutes (estimated: 65 minutes)', NOW() - INTERVAL '2 days'),
  ('Senior QA Engineer', 'Southern Tech Inc', 155000, 'Los Angeles, CA', 'LinkedIn', 'filtered', 'Commute time exceeds 45 minutes (estimated: 120 minutes)', NOW() - INTERVAL '3 days'),
  ('Test Automation Engineer', 'Coastal Systems', 148000, 'San Diego, CA', 'Direct', 'filtered', 'Commute time exceeds 45 minutes (estimated: 150 minutes)', NOW() - INTERVAL '4 days'),
  ('QA Lead', 'Wine Country Tech', 142000, 'Napa, CA', 'Indeed', 'filtered', 'Commute time exceeds 45 minutes (estimated: 55 minutes)', NOW() - INTERVAL '6 days'),
  ('Firmware Engineer', 'Mountain View Labs', 152000, 'Lake Tahoe, CA', 'LinkedIn', 'filtered', 'Commute time exceeds 45 minutes (estimated: 180 minutes)', NOW() - INTERVAL '5 days');

-- Filtered by domain mismatch (non-tech/non-matching domains)
INSERT INTO jobs (title, company, salary, location, source, status, filter_reason, date_collected) VALUES
  ('Marketing Manager', 'AdTech Corp', 150000, 'Remote', 'LinkedIn', 'filtered', 'Domain does not match preferred domains (Testing, AI, Firmware)', NOW() - INTERVAL '2 days'),
  ('Sales Engineer', 'Enterprise Software Co', 145000, 'San Francisco, CA', 'Indeed', 'filtered', 'Domain does not match preferred domains (Testing, AI, Firmware)', NOW() - INTERVAL '3 days'),
  ('HR Director', 'Tech Recruitment Inc', 160000, 'Remote', 'Direct', 'filtered', 'Domain does not match preferred domains (Testing, AI, Firmware)', NOW() - INTERVAL '4 days'),
  ('Account Executive', 'Cloud Services LLC', 155000, 'San Jose, CA', 'LinkedIn', 'filtered', 'Domain does not match preferred domains (Testing, AI, Firmware)', NOW() - INTERVAL '1 day'),
  ('Product Manager', 'Consumer Apps Inc', 165000, 'Remote', 'Indeed', 'filtered', 'Domain does not match preferred domains (Testing, AI, Firmware)', NOW() - INTERVAL '5 days');

-- ============================================================================
-- 5 applied jobs - Enable application workflow tests
-- ============================================================================

INSERT INTO jobs (title, company, salary, location, source, status, description, url, date_collected) VALUES
  ('Senior QA Automation Architect', 'Global Tech Solutions', 185000, 'Remote', 'LinkedIn', 'applied', 'Architect test automation strategy for global technology company. Lead multiple automation teams.', 'https://linkedin.com/jobs/qa-architect-global', NOW() - INTERVAL '10 days'),
  ('AI Testing Lead', 'Machine Intelligence Inc', 176000, 'San Francisco, CA', 'Indeed', 'applied', 'Lead AI testing initiatives for machine intelligence platform. Focus on model validation and quality.', 'https://indeed.com/jobs/ai-testing-lead', NOW() - INTERVAL '12 days'),
  ('Principal Firmware Engineer', 'Hardware Validation Corp', 192000, 'Fremont, CA', 'Direct', 'applied', 'Principal-level firmware validation role. Lead validation strategy for hardware products.', 'https://hardwarevalidation.com/jobs/principal', NOW() - INTERVAL '8 days'),
  ('Staff Test Engineer', 'Cloud Platform Technologies', 188000, 'Remote', 'Gmail', 'applied', 'Staff test engineer for cloud platform. Build test infrastructure and automation frameworks at scale.', 'https://cloudplatform.com/careers/staff-test', NOW() - INTERVAL '11 days'),
  ('Test Architect - Enterprise', 'Financial Services Tech', 179000, 'San Jose, CA', 'LinkedIn', 'applied', 'Test architect for financial services platform. Security testing and compliance automation.', 'https://linkedin.com/jobs/test-architect-fintech', NOW() - INTERVAL '9 days');

-- ============================================================================
-- 5 additional rejected jobs - Supplement existing 3 (total 8)
-- ============================================================================
-- Manual rejection scenarios (not auto-filtered)

INSERT INTO jobs (title, company, salary, location, source, status, description, url, date_collected) VALUES
  ('AI Prompt Engineer', 'AI Innovations', 160000, 'Remote', 'Direct', 'rejected', 'Design and optimize prompts for large language models. Focus on prompt engineering and evaluation.', 'https://aiinnovations.com/jobs/prompt-engineer', NOW() - INTERVAL '15 days'),
  ('Test Engineer - Gaming', 'Video Game Studios', 155000, 'San Francisco, CA', 'Indeed', 'rejected', 'Test video game quality and user experience. Focus on gameplay testing and bug reporting.', 'https://indeed.com/jobs/game-testing', NOW() - INTERVAL '14 days'),
  ('QA Manager', 'Legacy Systems Corp', 165000, 'Oakland, CA', 'LinkedIn', 'rejected', 'Manage QA team for legacy enterprise systems. Focus on manual testing and process improvement.', 'https://linkedin.com/jobs/qa-manager-legacy', NOW() - INTERVAL '18 days'),
  ('Hardware Test Technician', 'Manufacturing Co', 142000, 'Milpitas, CA', 'Direct', 'rejected', 'Test hardware components on production line. Hands-on hardware testing and troubleshooting.', 'https://manufacturing.com/jobs/test-tech', NOW() - INTERVAL '20 days'),
  ('AI Research Engineer', 'University Research Lab', 158000, 'Berkeley, CA', 'Indeed', 'rejected', 'Research novel AI testing methodologies. Academic research position with publication focus.', 'https://indeed.com/jobs/ai-research', NOW() - INTERVAL '16 days');

-- ============================================================================
-- Summary: 65 new jobs added
-- ============================================================================
-- 30 new status jobs
-- 10 approved jobs
-- 15 filtered jobs (5 salary, 5 commute, 5 domain)
-- 5 applied jobs
-- 5 rejected jobs
-- Total jobs after seed: ~78 jobs (13 existing + 65 new)
