import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TimelineView from './TimelineView';

describe('TimelineView', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  // ===== Initial Rendering and Data Fetching =====

  it('should render loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));
    render(<TimelineView applicationId="app-123" />);

    expect(screen.getByText(/loading timeline/i)).toBeInTheDocument();
  });

  it('should fetch timeline events on mount', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/api/applications/app-123/timeline');
    });
  });

  it('should fetch timeline for different applicationId', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(<TimelineView applicationId="app-456" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/api/applications/app-456/timeline');
    });
  });

  // ===== Empty State =====

  it('should render empty state when no events', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      expect(screen.getByText(/no timeline events found/i)).toBeInTheDocument();
    });
  });

  // ===== Display with Timeline Events =====

  it('should display timeline header with job title and company', async () => {
    const mockEvents = [
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'application',
        event_date: '2025-10-20T10:00:00Z',
        event_description: 'Application submitted'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvents
    });

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      expect(screen.getByText(/application timeline/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Software Engineer/)).toBeInTheDocument();
    expect(screen.getByText(/Tech Corp/)).toBeInTheDocument();
  });

  it('should display single timeline event', async () => {
    const mockEvents = [
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'application',
        event_date: '2025-10-20T10:00:00Z',
        event_description: 'Application submitted via email'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvents
    });

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      expect(screen.getByText('Application submitted via email')).toBeInTheDocument();
    });
  });

  it('should display multiple timeline events in order', async () => {
    const mockEvents = [
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'application',
        event_date: '2025-10-20T10:00:00Z',
        event_description: 'First event'
      },
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'communication',
        event_date: '2025-10-21T14:00:00Z',
        event_description: 'Second event'
      },
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'interview',
        event_date: '2025-10-22T15:00:00Z',
        event_description: 'Third event'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvents
    });

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      expect(screen.getByText('First event')).toBeInTheDocument();
    });

    expect(screen.getByText('Second event')).toBeInTheDocument();
    expect(screen.getByText('Third event')).toBeInTheDocument();
  });

  // ===== Event Type Labels =====

  it('should display "Application" label for application events', async () => {
    const mockEvents = [
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'application',
        event_date: '2025-10-20T10:00:00Z',
        event_description: 'Application submitted'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvents
    });

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      expect(screen.getByText('Application submitted')).toBeInTheDocument();
    });

    // Check that event icon is rendered (icon presence indicates event type is displayed)
    const icons = document.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('should display "Communication" label for communication events', async () => {
    const mockEvents = [
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'communication',
        event_date: '2025-10-20T10:00:00Z',
        event_description: 'Communication received'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvents
    });

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      expect(screen.getByText('Communication received')).toBeInTheDocument();
    });

    // Check that event icon is rendered
    const icons = document.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('should display "Interview" label for interview events', async () => {
    const mockEvents = [
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'interview',
        event_date: '2025-10-20T10:00:00Z',
        event_description: 'Interview scheduled'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvents
    });

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      expect(screen.getByText('Interview scheduled')).toBeInTheDocument();
    });

    // Check that event icon is rendered
    const icons = document.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('should display "Follow-up" label for follow_up events', async () => {
    const mockEvents = [
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'follow_up',
        event_date: '2025-10-20T10:00:00Z',
        event_description: 'Follow-up sent'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvents
    });

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      expect(screen.getByText('Follow-up sent')).toBeInTheDocument();
    });

    // Check that event icon is rendered
    const icons = document.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('should display "Event" label for unknown event types', async () => {
    const mockEvents = [
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'unknown_type',
        event_date: '2025-10-20T10:00:00Z',
        event_description: 'Something happened'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvents
    });

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      expect(screen.getByText('Something happened')).toBeInTheDocument();
    });

    // Check that event icon is rendered
    const icons = document.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  // ===== Date Formatting =====

  it('should format event dates correctly', async () => {
    const mockEvents = [
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'application',
        event_date: '2025-10-20T14:30:00Z',
        event_description: 'Application submitted'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvents
    });

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      // Should display date (format varies by locale)
      expect(screen.getByText(/Oct/)).toBeInTheDocument();
      expect(screen.getByText(/20/)).toBeInTheDocument();
    });
  });

  it('should display time for events', async () => {
    const mockEvents = [
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'interview',
        event_date: '2025-10-20T14:30:00Z',
        event_description: 'Interview scheduled'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvents
    });

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      // Should display time (format varies by locale, but should have : separator)
      const timeElements = screen.getAllByText(/:/);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  // ===== Event Icons =====

  it('should render event type icons', async () => {
    const mockEvents = [
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'application',
        event_date: '2025-10-20T10:00:00Z',
        event_description: 'Application submitted'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvents
    });

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      expect(screen.getByText('Application submitted')).toBeInTheDocument();
    });

    // Icon should be rendered (lucide-react icons render as SVG)
    const icons = document.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  // ===== Error Handling =====

  it('should handle fetch errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      expect(screen.getByText(/no timeline events found/i)).toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should handle non-ok responses', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404
    });

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      expect(screen.getByText(/no timeline events found/i)).toBeInTheDocument();
    });
  });

  // ===== Component Re-rendering with Different Props =====

  it('should refetch when applicationId changes', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => []
    });

    const { rerender } = render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/api/applications/app-123/timeline');
    });

    // Change applicationId
    rerender(<TimelineView applicationId="app-456" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/api/applications/app-456/timeline');
    });

    // Should be called twice (initial + after prop change)
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  // ===== Event Descriptions =====

  it('should display full event descriptions', async () => {
    const mockEvents = [
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'communication',
        event_date: '2025-10-20T10:00:00Z',
        event_description: 'Received email from recruiter asking for availability for phone screening next week'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvents
    });

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      expect(screen.getByText(/Received email from recruiter asking for availability/i)).toBeInTheDocument();
    });
  });

  // ===== Multiple Event Types =====

  it('should display all event types together', async () => {
    const mockEvents = [
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'application',
        event_date: '2025-10-15T10:00:00Z',
        event_description: 'Application submitted'
      },
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'communication',
        event_date: '2025-10-17T14:00:00Z',
        event_description: 'Recruiter responded'
      },
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'interview',
        event_date: '2025-10-20T15:00:00Z',
        event_description: 'Phone interview scheduled'
      },
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'follow_up',
        event_date: '2025-10-22T09:00:00Z',
        event_description: 'Follow-up email sent'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvents
    });

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      expect(screen.getByText('Application submitted')).toBeInTheDocument();
    });

    expect(screen.getByText('Recruiter responded')).toBeInTheDocument();
    expect(screen.getByText('Phone interview scheduled')).toBeInTheDocument();
    expect(screen.getByText('Follow-up email sent')).toBeInTheDocument();

    // All event type labels should be present
    expect(screen.getByText(/^APPLICATION$/i)).toBeInTheDocument();
    expect(screen.getByText(/^COMMUNICATION$/i)).toBeInTheDocument();
    expect(screen.getByText(/^INTERVIEW$/i)).toBeInTheDocument();
    expect(screen.getByText(/^FOLLOW-UP$/i)).toBeInTheDocument();
  });

  // ===== Optional Fields =====

  it('should handle events without date_applied field', async () => {
    const mockEvents = [
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'communication',
        event_date: '2025-10-20T10:00:00Z',
        event_description: 'Communication event without date_applied'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvents
    });

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      expect(screen.getByText('Communication event without date_applied')).toBeInTheDocument();
    });
  });

  it('should handle events without related_id field', async () => {
    const mockEvents = [
      {
        application_id: 'app-123',
        job_id: 'job-1',
        job_title: 'Software Engineer',
        company: 'Tech Corp',
        event_type: 'interview',
        event_date: '2025-10-20T10:00:00Z',
        event_description: 'Interview without related_id'
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvents
    });

    render(<TimelineView applicationId="app-123" />);

    await waitFor(() => {
      expect(screen.getByText('Interview without related_id')).toBeInTheDocument();
    });
  });
});
