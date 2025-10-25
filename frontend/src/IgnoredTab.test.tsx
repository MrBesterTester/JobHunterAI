import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IgnoredTab from './IgnoredTab';

describe('IgnoredTab', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  // ===== Initial Rendering and Data Fetching =====

  it('should render loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));
    render(<IgnoredTab />);

    expect(screen.getByText(/loading ignored emails/i)).toBeInTheDocument();
  });

  it('should fetch ignored emails on mount', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/api/intake/ignored-emails');
    });
  });

  // ===== Empty State =====

  it('should render empty state when no ignored emails', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText(/no ignored emails found/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/all emails have been successfully processed/i)).toBeInTheDocument();
  });

  // ===== Display with Ignored Emails =====

  it('should display ignored emails with subject and sender', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Job Alert: Software Engineer',
        sender_email: 'alerts@jobboard.com',
        sender_name: 'Job Board',
        received_date: new Date().toISOString(),
        extraction_confidence: 0.15
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText('Job Alert: Software Engineer')).toBeInTheDocument();
    });

    expect(screen.getByText(/Job Board/)).toBeInTheDocument();
    expect(screen.getByText(/alerts@jobboard.com/)).toBeInTheDocument();
  });

  it('should display multiple ignored emails', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'First Email',
        sender_email: 'first@example.com',
        received_date: new Date().toISOString(),
        extraction_confidence: 0.2
      },
      {
        email_job_id: 'email-2',
        message_id: 'msg-2',
        subject: 'Second Email',
        sender_email: 'second@example.com',
        received_date: new Date().toISOString(),
        extraction_confidence: 0.25
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText('First Email')).toBeInTheDocument();
    });

    expect(screen.getByText('Second Email')).toBeInTheDocument();
  });

  // ===== Stats Display =====

  it('should display stats correctly', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Email 1',
        sender_email: 'sender1@example.com',
        received_date: new Date().toISOString(),
        extraction_confidence: 0.15  // Low confidence (<0.3)
      },
      {
        email_job_id: 'email-2',
        message_id: 'msg-2',
        subject: 'Email 2',
        sender_email: 'sender2@example.com',
        received_date: new Date().toISOString(),
        extraction_confidence: 0.25,  // Low confidence (<0.3)
        processing_errors: 'Some error'
      },
      {
        email_job_id: 'email-3',
        message_id: 'msg-3',
        subject: 'Email 3',
        sender_email: 'sender3@example.com',
        received_date: new Date().toISOString(),
        extraction_confidence: 0.5  // High confidence (>=0.3)
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      // Total Ignored
      const totalElements = screen.getAllByText('3');
      expect(totalElements.length).toBeGreaterThan(0);
    });

    // Low Confidence count (2 emails with confidence < 0.3)
    const lowConfidenceElements = screen.getAllByText('2');
    expect(lowConfidenceElements.length).toBeGreaterThan(0);

    // With Errors count (1 email with processing_errors)
    const errorElements = screen.getAllByText('1');
    expect(errorElements.length).toBeGreaterThan(0);
  });

  // ===== Confidence Badges =====

  it('should display confidence badge with low confidence styling', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Low Confidence Email',
        sender_email: 'sender@example.com',
        received_date: new Date().toISOString(),
        extraction_confidence: 0.15  // 15% confidence
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText(/confidence: 15%/i)).toBeInTheDocument();
    });
  });

  it('should display confidence badge with medium confidence styling', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Medium Confidence Email',
        sender_email: 'sender@example.com',
        received_date: new Date().toISOString(),
        extraction_confidence: 0.45  // 45% confidence
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText(/confidence: 45%/i)).toBeInTheDocument();
    });
  });

  // ===== Error Badges =====

  it('should display "Has Errors" badge when processing errors exist', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Failed Email',
        sender_email: 'sender@example.com',
        received_date: new Date().toISOString(),
        extraction_confidence: 0.5,
        processing_errors: 'Failed to extract job data'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText(/has errors/i)).toBeInTheDocument();
    });
  });

  it('should not display error badge when no processing errors', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Clean Email',
        sender_email: 'sender@example.com',
        received_date: new Date().toISOString(),
        extraction_confidence: 0.5
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText('Clean Email')).toBeInTheDocument();
    });

    expect(screen.queryByText(/has errors/i)).not.toBeInTheDocument();
  });

  // ===== Email Expansion =====

  it('should expand email to show details when clicked', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-12345',
        subject: 'Expandable Email',
        sender_email: 'sender@example.com',
        received_date: '2025-10-20T10:00:00Z',
        extraction_confidence: 0.2,
        body_text: 'This is the email body'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText('Expandable Email')).toBeInTheDocument();
    });

    // Message ID should not be visible initially
    expect(screen.queryByText('msg-12345')).not.toBeInTheDocument();

    // Click to expand
    const emailCard = screen.getByTestId('ignored-email-card');
    await userEvent.click(emailCard);

    // Details should now be visible
    await waitFor(() => {
      expect(screen.getByText('msg-12345')).toBeInTheDocument();
    });

    expect(screen.getByText('This is the email body')).toBeInTheDocument();
  });

  it('should collapse email when clicked again', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-12345',
        subject: 'Collapsible Email',
        sender_email: 'sender@example.com',
        received_date: '2025-10-20T10:00:00Z',
        extraction_confidence: 0.2
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText('Collapsible Email')).toBeInTheDocument();
    });

    const emailCard = screen.getByTestId('ignored-email-card');

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

  it('should display all email details when expanded', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-12345',
        subject: 'Detailed Email',
        sender_email: 'sender@example.com',
        received_date: '2025-10-20T10:00:00Z',
        extraction_confidence: 0.15,
        processing_errors: 'Extraction failed',
        body_text: 'Full email content here'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText('Detailed Email')).toBeInTheDocument();
    });

    // Expand
    const emailCard = screen.getByTestId('ignored-email-card');
    await userEvent.click(emailCard);

    await waitFor(() => {
      // Message ID
      expect(screen.getByText('msg-12345')).toBeInTheDocument();

      // Processing errors
      expect(screen.getByText('Extraction failed')).toBeInTheDocument();

      // Email body
      expect(screen.getByText('Full email content here')).toBeInTheDocument();

      // Why ignored explanation
      expect(screen.getByText(/confidence in extracting job information was too low/i)).toBeInTheDocument();
    });
  });

  it('should display HTML body if text body not available', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-12345',
        subject: 'HTML Email',
        sender_email: 'sender@example.com',
        received_date: '2025-10-20T10:00:00Z',
        extraction_confidence: 0.2,
        body_html: '<p>HTML content</p>'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText('HTML Email')).toBeInTheDocument();
    });

    // Expand
    const emailCard = screen.getByTestId('ignored-email-card');
    await userEvent.click(emailCard);

    await waitFor(() => {
      expect(screen.getByText(/HTML content/i)).toBeInTheDocument();
    });
  });

  // ===== Refresh Functionality =====

  it('should refresh emails when refresh button clicked', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Initial Email',
        sender_email: 'sender@example.com',
        received_date: new Date().toISOString(),
        extraction_confidence: 0.2
      }
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockEmails
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText('Initial Email')).toBeInTheDocument();
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

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch ignored emails/i)).toBeInTheDocument();
    });
  });

  it('should display error message when network error occurs', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch ignored emails/i)).toBeInTheDocument();
    });
  });

  it('should clear error message on successful refresh', async () => {
    // First fail
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch ignored emails/i)).toBeInTheDocument();
    });

    // Then succeed
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await userEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.queryByText(/failed to fetch ignored emails/i)).not.toBeInTheDocument();
    });
  });

  // ===== Relative Time Formatting =====

  it('should format relative time for recent emails', async () => {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Recent Email',
        sender_email: 'sender@example.com',
        received_date: tenMinutesAgo.toISOString(),
        extraction_confidence: 0.2
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText(/10 minutes ago/i)).toBeInTheDocument();
    });
  });

  it('should format relative time for older emails', async () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Old Email',
        sender_email: 'sender@example.com',
        received_date: twoDaysAgo.toISOString(),
        extraction_confidence: 0.2
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText(/2 days ago/i)).toBeInTheDocument();
    });
  });

  // ===== Sender Display =====

  it('should display sender name and email when both available', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Email with Name',
        sender_email: 'john@example.com',
        sender_name: 'John Doe',
        received_date: new Date().toISOString(),
        extraction_confidence: 0.2
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/john@example.com/)).toBeInTheDocument();
    });
  });

  it('should display only email when sender name not available', async () => {
    const mockEmails = [
      {
        email_job_id: 'email-1',
        message_id: 'msg-1',
        subject: 'Email without Name',
        sender_email: 'noreply@example.com',
        received_date: new Date().toISOString(),
        extraction_confidence: 0.2
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails
    });

    render(<IgnoredTab />);

    await waitFor(() => {
      expect(screen.getByText('noreply@example.com')).toBeInTheDocument();
    });

    // Should not have angle brackets when only email is shown
    expect(screen.queryByText(/<noreply@example.com>/)).not.toBeInTheDocument();
  });
});
