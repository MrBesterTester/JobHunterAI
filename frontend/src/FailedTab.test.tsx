import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FailedTab from './FailedTab';

describe('FailedTab', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  // ===== Initial Rendering and Data Fetching =====

  it('should render loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));
    render(<FailedTab />);

    expect(screen.getByText(/loading failed emails/i)).toBeInTheDocument();
  });

  it('should fetch failed emails on mount', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(<FailedTab />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/api/intake/failed-emails');
    });
  });

  // ===== Empty State =====

  it('should render empty state when no failed emails', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText(/no failed emails found/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/all emails have been successfully processed/i)).toBeInTheDocument();
  });

  // ===== Display with Failed Emails =====

  it('should display failed emails with subject and sender', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Job Alert: Software Engineer',
        sender_email: 'alerts@jobboard.com',
        sender_name: 'Job Board',
        received_date: new Date().toISOString(),
        processing_errors: 'Database connection failed'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText('Job Alert: Software Engineer')).toBeInTheDocument();
    });

    expect(screen.getByText(/Job Board/)).toBeInTheDocument();
    expect(screen.getByText(/alerts@jobboard.com/)).toBeInTheDocument();
  });

  it('should display multiple failed emails', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'First Failed Email',
        sender_email: 'first@example.com',
        received_date: new Date().toISOString(),
        processing_errors: 'Error 1'
      },
      {
        email_job_id: 'email-2',
        message_id: 'msg-2',
        subject: 'Second Failed Email',
        sender_email: 'second@example.com',
        received_date: new Date().toISOString(),
        processing_errors: 'Error 2'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText('First Failed Email')).toBeInTheDocument();
    });

    expect(screen.getByText('Second Failed Email')).toBeInTheDocument();
  });

  // ===== Stats Display =====

  it('should display total failed count', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Failed Email 1',
        sender_email: 'sender1@example.com',
        received_date: new Date().toISOString(),
        processing_errors: 'Error 1'
      },
      {
        email_job_id: 'email-2',
        message_id: 'msg-2',
        subject: 'Failed Email 2',
        sender_email: 'sender2@example.com',
        received_date: new Date().toISOString(),
        processing_errors: 'Error 2'
      },
      {
        email_job_id: 'email-3',
        message_id: 'msg-3',
        subject: 'Failed Email 3',
        sender_email: 'sender3@example.com',
        received_date: new Date().toISOString(),
        processing_errors: 'Error 3'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<FailedTab />);

    await waitFor(() => {
      // Total Failed count should be 3
      const totalElements = screen.getAllByText('3');
      expect(totalElements.length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/total failed/i)).toBeInTheDocument();
  });

  // ===== Error Badge Display =====

  it('should display error badge for all failed emails', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Failed Email',
        sender_email: 'sender@example.com',
        received_date: new Date().toISOString(),
        processing_errors: 'Failed to process'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText('Failed Email')).toBeInTheDocument();
    });

    // Should show error badge - multiple instances of "error" exist on the page
    const errorTexts = screen.getAllByText(/error/i);
    expect(errorTexts.length).toBeGreaterThan(0);
  });

  // ===== Email Expansion =====

  it('should expand email to show details when clicked', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-12345',
        subject: 'Expandable Failed Email',
        sender_email: 'sender@example.com',
        received_date: '2025-10-20T10:00:00Z',
        processing_errors: 'Database timeout',
        body_text: 'This is the email body'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText('Expandable Failed Email')).toBeInTheDocument();
    });

    // Message ID should not be visible initially
    expect(screen.queryByText('msg-12345')).not.toBeInTheDocument();

    // Click to expand
    const emailCard = screen.getByTestId('failed-email-card');
    await userEvent.click(emailCard);

    // Details should now be visible
    await waitFor(() => {
      expect(screen.getByText('msg-12345')).toBeInTheDocument();
    });

    expect(screen.getByText('Database timeout')).toBeInTheDocument();
    expect(screen.getByText('This is the email body')).toBeInTheDocument();
  });

  it('should collapse email when clicked again', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-12345',
        subject: 'Collapsible Failed Email',
        sender_email: 'sender@example.com',
        received_date: '2025-10-20T10:00:00Z',
        processing_errors: 'Error message'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText('Collapsible Failed Email')).toBeInTheDocument();
    });

    const emailCard = screen.getByTestId('failed-email-card');

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

  // ===== Error Message Formatting =====

  it('should format string error messages', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Email with String Error',
        sender_email: 'sender@example.com',
        received_date: '2025-10-20T10:00:00Z',
        processing_errors: 'Simple error message'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText('Email with String Error')).toBeInTheDocument();
    });

    const emailCard = screen.getByTestId('failed-email-card');
    await userEvent.click(emailCard);

    await waitFor(() => {
      expect(screen.getByText('Simple error message')).toBeInTheDocument();
    });
  });

  it('should format object error messages with error property', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Email with Object Error',
        sender_email: 'sender@example.com',
        received_date: '2025-10-20T10:00:00Z',
        processing_errors: { error: 'Structured error message' }
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText('Email with Object Error')).toBeInTheDocument();
    });

    const emailCard = screen.getByTestId('failed-email-card');
    await userEvent.click(emailCard);

    await waitFor(() => {
      expect(screen.getByText('Structured error message')).toBeInTheDocument();
    });
  });

  it('should format complex object error messages as JSON', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Email with Complex Error',
        sender_email: 'sender@example.com',
        received_date: '2025-10-20T10:00:00Z',
        processing_errors: { status: 500, message: 'Server error', code: 'ERR_500' }
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText('Email with Complex Error')).toBeInTheDocument();
    });

    const emailCard = screen.getByTestId('failed-email-card');
    await userEvent.click(emailCard);

    await waitFor(() => {
      // Should contain JSON-formatted error
      expect(screen.getByText(/"status": 500/)).toBeInTheDocument();
    });
  });

  // ===== Expanded Email Details =====

  it('should display HTML body if text body not available', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-12345',
        subject: 'HTML Email',
        sender_email: 'sender@example.com',
        received_date: '2025-10-20T10:00:00Z',
        processing_errors: 'Error',
        body_html: '<p>HTML content</p>'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText('HTML Email')).toBeInTheDocument();
    });

    const emailCard = screen.getByTestId('failed-email-card');
    await userEvent.click(emailCard);

    await waitFor(() => {
      expect(screen.getByText(/HTML content/i)).toBeInTheDocument();
    });
  });

  it('should prefer text body over HTML body', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-12345',
        subject: 'Mixed Body Email',
        sender_email: 'sender@example.com',
        received_date: '2025-10-20T10:00:00Z',
        processing_errors: 'Error',
        body_text: 'Text content',
        body_html: '<p>HTML content</p>'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText('Mixed Body Email')).toBeInTheDocument();
    });

    const emailCard = screen.getByTestId('failed-email-card');
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
        subject: 'Initial Failed Email',
        sender_email: 'sender@example.com',
        received_date: new Date().toISOString(),
        processing_errors: 'Error'
      }
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockEmails
    });

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText('Initial Failed Email')).toBeInTheDocument();
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

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch failed emails/i)).toBeInTheDocument();
    });
  });

  it('should display error message when network error occurs', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch failed emails/i)).toBeInTheDocument();
    });
  });

  it('should clear error message on successful refresh', async () => {
    // First fail
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch failed emails/i)).toBeInTheDocument();
    });

    // Then succeed
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await userEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.queryByText(/failed to fetch failed emails/i)).not.toBeInTheDocument();
    });
  });

  // ===== Relative Time Formatting =====

  it('should format relative time for recent emails', async () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Recent Failed Email',
        sender_email: 'sender@example.com',
        received_date: fiveMinutesAgo.toISOString(),
        processing_errors: 'Error'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
    });
  });

  it('should format relative time for older emails', async () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Old Failed Email',
        sender_email: 'sender@example.com',
        received_date: threeDaysAgo.toISOString(),
        processing_errors: 'Error'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText(/3 days ago/i)).toBeInTheDocument();
    });
  });

  // ===== Sender Display =====

  it('should display sender name and email when both available', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Email with Name',
        sender_email: 'jane@example.com',
        sender_name: 'Jane Smith',
        received_date: new Date().toISOString(),
        processing_errors: 'Error'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
      expect(screen.getByText(/jane@example.com/)).toBeInTheDocument();
    });
  });

  it('should display only email when sender name not available', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Email without Name',
        sender_email: 'system@example.com',
        received_date: new Date().toISOString(),
        processing_errors: 'Error'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<FailedTab />);

    await waitFor(() => {
      expect(screen.getByText('system@example.com')).toBeInTheDocument();
    });
  });
});
