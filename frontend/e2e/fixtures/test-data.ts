/**
 * Test Data Fixtures for JobHunter E2E Tests
 *
 * Provides sample job data for testing various scenarios
 */

export interface Job {
  job_id?: string;
  title: string;
  company: string;
  salary?: number;
  location?: string;
  source: string;
  status: 'new' | 'approved' | 'applied' | 'rejected' | 'filtered';
  url?: string;
  description?: string;
  date_collected?: string;
  filtered_reasons?: string[];
}

/**
 * High-salary job that should pass all filters
 */
export const highSalaryRemoteJob: Job = {
  job_id: 'test-job-1',
  title: 'Senior AI Test Engineer',
  company: 'TechCorp AI',
  salary: 155000,
  location: 'Remote',
  source: 'LinkedIn',
  status: 'new',
  url: 'https://example.com/jobs/ai-test-engineer',
  description: 'We are seeking an experienced AI Test Engineer to develop and maintain test automation frameworks for our generative AI products.',
  date_collected: new Date().toISOString(),
};

/**
 * Low-salary job that should be filtered
 */
export const lowSalaryJob: Job = {
  job_id: 'test-job-2',
  title: 'Junior QA Tester',
  company: 'StartupCo',
  salary: 80000,
  location: 'Remote',
  source: 'Indeed',
  status: 'filtered',
  filtered_reasons: ['Salary below minimum ($130,000)'],
  date_collected: new Date().toISOString(),
};

/**
 * Testing-focused job that matches domain criteria
 */
export const testingJob: Job = {
  job_id: 'test-job-3',
  title: 'Test Automation Engineer',
  company: 'Quality First Inc',
  salary: 145000,
  location: 'San Francisco, CA',
  source: 'Direct',
  status: 'new',
  description: 'Join our team to build comprehensive test automation frameworks using Playwright, Selenium, and CI/CD integration.',
  date_collected: new Date().toISOString(),
};

/**
 * Firmware testing job
 */
export const firmwareJob: Job = {
  job_id: 'test-job-4',
  title: 'Firmware Validation Engineer',
  company: 'Hardware Systems Corp',
  salary: 160000,
  location: 'Fremont, CA',
  source: 'LinkedIn',
  status: 'new',
  description: 'Seeking an engineer to validate embedded firmware for IoT devices and hardware-software integration.',
  date_collected: new Date().toISOString(),
};

/**
 * Approved job ready for content generation
 */
export const approvedJob: Job = {
  job_id: 'test-job-5',
  title: 'Lead Software Testing Engineer',
  company: 'Enterprise Solutions LLC',
  salary: 170000,
  location: 'Remote',
  source: 'Gmail',
  status: 'approved',
  url: 'https://example.com/jobs/lead-testing',
  description: 'Lead our software testing initiatives across multiple product lines, focusing on test automation and quality metrics.',
  date_collected: new Date().toISOString(),
};

/**
 * Applied job (application submitted)
 */
export const appliedJob: Job = {
  job_id: 'test-job-6',
  title: 'Senior QA Automation Architect',
  company: 'Global Tech Solutions',
  salary: 185000,
  location: 'Remote',
  source: 'LinkedIn',
  status: 'applied',
  date_collected: new Date().toISOString(),
};

/**
 * Job with long commute (should be filtered)
 */
export const longCommuteJob: Job = {
  job_id: 'test-job-7',
  title: 'Test Engineer',
  company: 'Far Away Corp',
  salary: 140000,
  location: 'Sacramento, CA', // >45 min from Fremont
  source: 'Indeed',
  status: 'filtered',
  filtered_reasons: ['Commute time exceeds 45 minutes (estimated: 65 minutes)'],
  date_collected: new Date().toISOString(),
};

/**
 * Job outside preferred domains (should be filtered)
 */
export const nonMatchingDomainJob: Job = {
  job_id: 'test-job-8',
  title: 'Marketing Manager',
  company: 'AdTech Corp',
  salary: 150000,
  location: 'Remote',
  source: 'LinkedIn',
  status: 'filtered',
  filtered_reasons: ['Domain does not match preferred domains (Testing, AI, Firmware)'],
  date_collected: new Date().toISOString(),
};

/**
 * Job with multiple filter reasons
 */
export const multipleFilterReasonsJob: Job = {
  job_id: 'test-job-9',
  title: 'Sales Engineer',
  company: 'Corporate Systems',
  salary: 95000,
  location: 'Los Angeles, CA',
  source: 'Indeed',
  status: 'filtered',
  filtered_reasons: [
    'Salary below minimum ($130,000)',
    'Domain does not match preferred domains (Testing, AI, Firmware)',
    'Commute time exceeds 45 minutes (estimated: 120 minutes)',
  ],
  date_collected: new Date().toISOString(),
};

/**
 * Generative AI focused job
 */
export const aiJob: Job = {
  job_id: 'test-job-10',
  title: 'Generative AI Quality Engineer',
  company: 'AI Innovations Inc',
  salary: 180000,
  location: 'Remote',
  source: 'Direct',
  status: 'new',
  description: 'Build quality assurance frameworks for large language models and generative AI applications. Experience with prompt engineering and LLM evaluation required.',
  date_collected: new Date().toISOString(),
};

/**
 * Collection of all test jobs
 */
export const allTestJobs: Job[] = [
  highSalaryRemoteJob,
  lowSalaryJob,
  testingJob,
  firmwareJob,
  approvedJob,
  appliedJob,
  longCommuteJob,
  nonMatchingDomainJob,
  multipleFilterReasonsJob,
  aiJob,
];

/**
 * Jobs grouped by status
 */
export const jobsByStatus = {
  new: [highSalaryRemoteJob, testingJob, firmwareJob, aiJob],
  approved: [approvedJob],
  applied: [appliedJob],
  filtered: [lowSalaryJob, longCommuteJob, nonMatchingDomainJob, multipleFilterReasonsJob],
  rejected: [],
};

/**
 * Expected statistics for test data
 */
export const expectedStats = {
  new: jobsByStatus.new.length,
  approved: jobsByStatus.approved.length,
  applied: jobsByStatus.applied.length,
  filtered: jobsByStatus.filtered.length,
};

/**
 * Job filtering criteria (from PRD)
 */
export const filteringCriteria = {
  minSalary: 130000,
  maxCommuteTime: 45, // minutes from Fremont, CA
  preferredDomains: [
    'Software Testing',
    'Test Automation',
    'Generative AI',
    'AI',
    'Firmware',
    'Hardware Validation',
  ],
  preferredLocation: 'Remote',
};

/**
 * Sample resume content for validation
 */
export const sampleResumeKeywords = [
  'Test Automation',
  'Playwright',
  'Selenium',
  'CI/CD',
  'Quality Engineering',
  'Python',
  'TypeScript',
];

/**
 * Sample cover letter personalization fields
 */
export const coverLetterFields = [
  'companyName',
  'jobTitle',
  'hiringManager',
  'salary',
  'location',
];
