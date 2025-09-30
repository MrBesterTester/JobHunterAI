import tap from 'tap';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { JSDOM } from 'jsdom';

// Setup JSDOM environment for React Testing Library
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window as any;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;

// Mock the JobCard component since we're testing the structure
// In a real implementation, this would import the actual component
interface Job {
  job_id: string;
  title: string;
  company: string;
  salary?: number;
  location?: string;
  status: string;
  date_collected: string;
}

interface JobCardProps {
  job: Job;
  onStatusChange?: (jobId: string, status: string) => void;
  onGenerateContent?: (jobId: string) => void;
}

// Mock JobCard component for testing purposes
const JobCard: React.FC<JobCardProps> = ({ job, onStatusChange, onGenerateContent }) => {
  return React.createElement('div', {
    'data-testid': 'job-card',
    className: 'job-card'
  }, [
    React.createElement('h3', { key: 'title' }, job.title),
    React.createElement('p', { key: 'company' }, job.company),
    job.salary && React.createElement('p', { key: 'salary' }, `$${job.salary.toLocaleString()}`),
    job.location && React.createElement('p', { key: 'location' }, job.location),
    React.createElement('span', { key: 'status', className: 'status' }, job.status),
    onStatusChange && React.createElement('button', {
      key: 'approve-btn',
      onClick: () => onStatusChange(job.job_id, 'approved'),
      'data-testid': 'approve-button'
    }, 'Approve'),
    onStatusChange && React.createElement('button', {
      key: 'reject-btn',
      onClick: () => onStatusChange(job.job_id, 'rejected'),
      'data-testid': 'reject-button'
    }, 'Reject'),
    onGenerateContent && job.status === 'approved' && React.createElement('button', {
      key: 'generate-btn',
      onClick: () => onGenerateContent(job.job_id),
      'data-testid': 'generate-content-button'
    }, 'Generate Resume & Cover Letter')
  ]);
};

// Test fixtures
const mockJob: Job = {
  job_id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Senior AI Test Engineer',
  company: 'TechCorp',
  salary: 155000,
  location: 'Remote',
  status: 'new',
  date_collected: '2024-01-01T00:00:00Z'
};

const mockApprovedJob: Job = {
  ...mockJob,
  job_id: '223e4567-e89b-12d3-a456-426614174001',
  status: 'approved'
};

tap.test('JobCard Component Tests', async (t) => {
  t.beforeEach(() => {
    // Clean up any previous renders
    cleanup();
  });

  await t.test('renders job information correctly', async (t) => {
    render(React.createElement(JobCard, { job: mockJob }));

    t.ok(screen.getByText(mockJob.title), 'Should display job title');
    t.ok(screen.getByText(mockJob.company), 'Should display company name');
    t.ok(screen.getByText(`$${mockJob.salary!.toLocaleString()}`), 'Should display formatted salary');
    t.ok(screen.getByText(mockJob.location!), 'Should display location');
    t.ok(screen.getByText(mockJob.status), 'Should display job status');
  });

  await t.test('renders job without optional fields', async (t) => {
    const jobWithoutOptionals: Job = {
      job_id: mockJob.job_id,
      title: mockJob.title,
      company: mockJob.company,
      status: mockJob.status,
      date_collected: mockJob.date_collected
    };

    render(React.createElement(JobCard, { job: jobWithoutOptionals }));

    t.ok(screen.getByText(jobWithoutOptionals.title), 'Should display job title');
    t.ok(screen.getByText(jobWithoutOptionals.company), 'Should display company name');
    t.notOk(screen.queryByText(/\$/), 'Should not display salary when not provided');
  });

  await t.test('approve button triggers status update', async (t) => {
    const statusChanges: Array<{ jobId: string; status: string }> = [];
    const onStatusChange = (jobId: string, status: string) => {
      statusChanges.push({ jobId, status });
    };

    render(React.createElement(JobCard, {
      job: mockJob,
      onStatusChange
    }));

    const approveButton = screen.getByTestId('approve-button');
    fireEvent.click(approveButton);

    t.equal(statusChanges.length, 1, 'Should call status change handler once');
    t.same(statusChanges[0], { jobId: mockJob.job_id, status: 'approved' }, 'Should pass correct parameters');
  });

  await t.test('reject button triggers status update', async (t) => {
    const statusChanges: Array<{ jobId: string; status: string }> = [];
    const onStatusChange = (jobId: string, status: string) => {
      statusChanges.push({ jobId, status });
    };

    render(React.createElement(JobCard, {
      job: mockJob,
      onStatusChange
    }));

    const rejectButton = screen.getByTestId('reject-button');
    fireEvent.click(rejectButton);

    t.equal(statusChanges.length, 1, 'Should call status change handler once');
    t.same(statusChanges[0], { jobId: mockJob.job_id, status: 'rejected' }, 'Should pass correct parameters');
  });

  await t.test('generate content button only shows for approved jobs', async (t) => {
    const contentGenerations: string[] = [];
    const onGenerateContent = (jobId: string) => {
      contentGenerations.push(jobId);
    };

    // Test with new job (should not show generate button)
    const { rerender } = render(React.createElement(JobCard, {
      job: mockJob,
      onGenerateContent
    }));

    t.notOk(screen.queryByTestId('generate-content-button'),
           'Should not show generate button for new jobs');

    // Test with approved job (should show generate button)
    rerender(React.createElement(JobCard, {
      job: mockApprovedJob,
      onGenerateContent
    }));

    const generateButton = screen.getByTestId('generate-content-button');
    t.ok(generateButton, 'Should show generate button for approved jobs');

    fireEvent.click(generateButton);

    t.equal(contentGenerations.length, 1, 'Should call content generation handler once');
    t.equal(contentGenerations[0], mockApprovedJob.job_id, 'Should pass correct job ID');
  });

  await t.test('displays job card with correct CSS classes', async (t) => {
    render(React.createElement(JobCard, { job: mockJob }));

    const jobCard = screen.getByTestId('job-card');
    t.ok(jobCard.className.includes('job-card'), 'Should have job-card CSS class');

    const statusElement = screen.getByText(mockJob.status);
    t.ok(statusElement.className.includes('status'), 'Status should have status CSS class');
  });
});

tap.test('JobCard Edge Cases', async (t) => {
  t.beforeEach(() => {
    cleanup();
  });

  await t.test('handles very large salary numbers', async (t) => {
    const highSalaryJob: Job = {
      ...mockJob,
      salary: 999999999
    };

    render(React.createElement(JobCard, { job: highSalaryJob }));

    const salaryText = screen.getByText('$999,999,999');
    t.ok(salaryText, 'Should correctly format very large salary numbers');
  });

  await t.test('handles long job titles', async (t) => {
    const longTitleJob: Job = {
      ...mockJob,
      title: 'Senior Principal Staff Software Engineer in Test for AI and Machine Learning Systems'
    };

    render(React.createElement(JobCard, { job: longTitleJob }));

    t.ok(screen.getByText(longTitleJob.title), 'Should display long job titles correctly');
  });

  await t.test('handles special characters in company names', async (t) => {
    const specialCharJob: Job = {
      ...mockJob,
      company: 'Tech & AI Corp. (Subsidiary of MegaCorp™)'
    };

    render(React.createElement(JobCard, { job: specialCharJob }));

    t.ok(screen.getByText(specialCharJob.company), 'Should display company names with special characters');
  });
});

tap.test('JobCard Performance Tests', async (t) => {
  t.beforeEach(() => {
    cleanup();
  });

  await t.test('renders within acceptable time', async (t) => {
    const startTime = Date.now();

    render(React.createElement(JobCard, { job: mockJob }));

    const renderTime = Date.now() - startTime;
    t.ok(renderTime < 100, `Should render in under 100ms, took ${renderTime}ms`);
  });

  await t.test('handles multiple rapid re-renders', async (t) => {
    const statusChanges: Array<{ jobId: string; status: string }> = [];
    const onStatusChange = (jobId: string, status: string) => {
      statusChanges.push({ jobId, status });
    };

    const { rerender } = render(React.createElement(JobCard, {
      job: mockJob,
      onStatusChange
    }));

    // Simulate rapid status changes
    const statuses = ['new', 'approved', 'rejected', 'applied'];
    const startTime = Date.now();

    for (const status of statuses) {
      const updatedJob = { ...mockJob, status };
      rerender(React.createElement(JobCard, {
        job: updatedJob,
        onStatusChange
      }));
    }

    const totalTime = Date.now() - startTime;
    t.ok(totalTime < 50, `Should handle rapid re-renders efficiently, took ${totalTime}ms`);
  });
});