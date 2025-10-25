import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DuplicatesTab from './DuplicatesTab';

describe('DuplicatesTab', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  // ===== Initial Rendering and Data Fetching =====

  it('should render loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));
    render(<DuplicatesTab />);

    expect(screen.getByText(/loading duplicate emails/i)).toBeInTheDocument();
  });

  it('should fetch duplicate emails on mount', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/api/intake/duplicate-emails');
    });
  });

  // ===== Empty State =====

  it('should render empty state when no duplicate emails', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText(/no duplicate emails found/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/no emails matched existing job postings/i)).toBeInTheDocument();
  });

  // ===== Display with Duplicate Emails =====

  it('should display duplicate emails with subject and sender', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Re: Software Engineer Position',
        sender_email: 'recruiter@company.com',
        sender_name: 'Recruiter',
        received_date: new Date().toISOString(),
        extraction_confidence: 0.95
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText('Re: Software Engineer Position')).toBeInTheDocument();
    });

    expect(screen.getByText(/Recruiter/)).toBeInTheDocument();
    expect(screen.getByText(/recruiter@company.com/)).toBeInTheDocument();
  });

  it('should display multiple duplicate emails', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'First Duplicate',
        sender_email: 'first@example.com',
        received_date: new Date().toISOString(),
        extraction_confidence: 0.9
      },
      {
        email_job_id: 'email-2',
        message_id: 'msg-2',
        subject: 'Second Duplicate',
        sender_email: 'second@example.com',
        received_date: new Date().toISOString(),
        extraction_confidence: 0.85
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText('First Duplicate')).toBeInTheDocument();
    });

    expect(screen.getByText('Second Duplicate')).toBeInTheDocument();
  });

  // ===== Stats Display =====

  it('should display total duplicates count', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Duplicate 1',
        sender_email: 'sender1@example.com',
        received_date: new Date().toISOString()
      },
      {
        email_job_id: 'email-2',
        message_id: 'msg-2',
        subject: 'Duplicate 2',
        sender_email: 'sender2@example.com',
        received_date: new Date().toISOString()
      },
      {
        email_job_id: 'email-3',
        message_id: 'msg-3',
        subject: 'Duplicate 3',
        sender_email: 'sender3@example.com',
        received_date: new Date().toISOString()
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      // Total Duplicates count should be 3
      const totalElements = screen.getAllByText('3');
      expect(totalElements.length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/total duplicates/i)).toBeInTheDocument();
  });

  // ===== Duplicate Badge Display =====

  it('should display duplicate badge for all emails', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Duplicate Email',
        sender_email: 'sender@example.com',
        received_date: new Date().toISOString()
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText('Duplicate Email')).toBeInTheDocument();
    });

    // Should show duplicate badge - there will be multiple instances of "duplicate" (subject, stats, badge)
    const duplicateTexts = screen.getAllByText(/duplicate/i);
    expect(duplicateTexts.length).toBeGreaterThan(0);
  });

  // ===== Confidence Badge Display =====

  it('should display confidence badge when extraction_confidence is available', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Duplicate with Confidence',
        sender_email: 'sender@example.com',
        received_date: new Date().toISOString(),
        extraction_confidence: 0.92  // 92% confidence
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText(/confidence: 92%/i)).toBeInTheDocument();
    });
  });

  it('should not display confidence badge when extraction_confidence is undefined', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Duplicate without Confidence',
        sender_email: 'sender@example.com',
        received_date: new Date().toISOString()
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText('Duplicate without Confidence')).toBeInTheDocument();
    });

    expect(screen.queryByText(/confidence:/i)).not.toBeInTheDocument();
  });

  // ===== Email Expansion =====

  it('should expand email to show details when clicked', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-12345',
        subject: 'Expandable Duplicate',
        sender_email: 'sender@example.com',
        received_date: '2025-10-20T10:00:00Z',
        extraction_confidence: 0.9,
        body_text: 'This is the duplicate email body'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText('Expandable Duplicate')).toBeInTheDocument();
    });

    // Message ID should not be visible initially
    expect(screen.queryByText('msg-12345')).not.toBeInTheDocument();

    // Click to expand
    const emailCard = screen.getByTestId('duplicate-email-card');
    await userEvent.click(emailCard);

    // Details should now be visible
    await waitFor(() => {
      expect(screen.getByText('msg-12345')).toBeInTheDocument();
    });

    expect(screen.getByText('This is the duplicate email body')).toBeInTheDocument();
    expect(screen.getByText(/why was this marked as duplicate/i)).toBeInTheDocument();
  });

  it('should collapse email when clicked again', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-12345',
        subject: 'Collapsible Duplicate',
        sender_email: 'sender@example.com',
        received_date: '2025-10-20T10:00:00Z'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText('Collapsible Duplicate')).toBeInTheDocument();
    });

    const emailCard = screen.getByTestId('duplicate-email-card');

    // Expand
    await userEvent.click(emailCard);
    await waitFor(() => {
      expect(screen.getByText('msg-12345')).toBeInTheDocument();
    });

    // Collapse
    await userEvent.click(emailCard);
    await waitFor(() => {
      expect(screen.queryByText('msg-12345')).not.toBeInTheDocument();
    });
  });

  // ===== Expanded Email Details =====

  it('should display duplicate explanation when expanded', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-12345',
        subject: 'Duplicate with Explanation',
        sender_email: 'sender@example.com',
        received_date: '2025-10-20T10:00:00Z'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText('Duplicate with Explanation')).toBeInTheDocument();
    });

    const emailCard = screen.getByTestId('duplicate-email-card');
    await userEvent.click(emailCard);

    await waitFor(() => {
      expect(screen.getByText(/matched an existing entry in the database/i)).toBeInTheDocument();
      expect(screen.getByText(/no new job was created to avoid duplicates/i)).toBeInTheDocument();
    });
  });

  it('should display HTML body if text body not available', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-12345',
        subject: 'HTML Duplicate Email',
        sender_email: 'sender@example.com',
        received_date: '2025-10-20T10:00:00Z',
        body_html: '<p>HTML content here</p>'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText('HTML Duplicate Email')).toBeInTheDocument();
    });

    const emailCard = screen.getByTestId('duplicate-email-card');
    await userEvent.click(emailCard);

    await waitFor(() => {
      expect(screen.getByText(/HTML content here/i)).toBeInTheDocument();
    });
  });

  it('should prefer text body over HTML body', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-12345',
        subject: 'Mixed Body Duplicate',
        sender_email: 'sender@example.com',
        received_date: '2025-10-20T10:00:00Z',
        body_text: 'Text content',
        body_html: '<p>HTML content</p>'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText('Mixed Body Duplicate')).toBeInTheDocument();
    });

    const emailCard = screen.getByTestId('duplicate-email-card');
    await userEvent.click(emailCard);

    await waitFor(() => {
      expect(screen.getByText('Text content')).toBeInTheDocument();
    });

    // Should not show HTML content when text is available
    expect(screen.queryByText(/HTML content/i)).not.toBeInTheDocument();
  });

  // ===== Refresh Functionality =====

  it('should refresh emails when refresh button clicked', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Initial Duplicate',
        sender_email: 'sender@example.com',
        received_date: new Date().toISOString()
      }
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockEmails
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText('Initial Duplicate')).toBeInTheDocument();
    });

    // Click refresh
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await userEvent.click(refreshButton);

    // Should call API again
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  // ===== Error Handling =====

  it('should display error message when fetch fails', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch duplicate emails/i)).toBeInTheDocument();
    });
  });

  it('should display error message when network error occurs', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch duplicate emails/i)).toBeInTheDocument();
    });
  });

  it('should clear error message on successful refresh', async () => {
    // First fail
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch duplicate emails/i)).toBeInTheDocument();
    });

    // Then succeed
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await userEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.queryByText(/failed to fetch duplicate emails/i)).not.toBeInTheDocument();
    });
  });

  // ===== Relative Time Formatting =====

  it('should format relative time for recent emails', async () => {
    const now = new Date();
    const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000);

    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Recent Duplicate',
        sender_email: 'sender@example.com',
        received_date: twentyMinutesAgo.toISOString()
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText(/20 minutes ago/i)).toBeInTheDocument();
    });
  });

  it('should format relative time for older emails', async () => {
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Old Duplicate',
        sender_email: 'sender@example.com',
        received_date: fiveDaysAgo.toISOString()
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText(/5 days ago/i)).toBeInTheDocument();
    });
  });

  // ===== Sender Display =====

  it('should display sender name and email when both available', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Duplicate with Name',
        sender_email: 'bob@example.com',
        sender_name: 'Bob Johnson',
        received_date: new Date().toISOString()
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText(/Bob Johnson/)).toBeInTheDocument();
      expect(screen.getByText(/bob@example.com/)).toBeInTheDocument();
    });
  });

  it('should display only email when sender name not available', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Duplicate without Name',
        sender_email: 'automated@example.com',
        received_date: new Date().toISOString()
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText('automated@example.com')).toBeInTheDocument();
    });
  });

  // ===== Edge Cases =====

  it('should handle emails with missing body content', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-12345',
        subject: 'No Body Email',
        sender_email: 'sender@example.com',
        received_date: '2025-10-20T10:00:00Z'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<DuplicatesTab />);

    await waitFor(() => {
      expect(screen.getByText('No Body Email')).toBeInTheDocument();
    });

    const emailCard = screen.getByTestId('duplicate-email-card');
    await userEvent.click(emailCard);

    await waitFor(() => {
      expect(screen.getByText('msg-12345')).toBeInTheDocument();
    });

    // Email Body section should not appear if no body
    expect(screen.queryByText(/email body:/i)).not.toBeInTheDocument();
  });
});
