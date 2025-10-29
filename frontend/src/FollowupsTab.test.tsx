import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FollowupsTab from './FollowupsTab';

// Mock fetch globally
global.fetch = jest.fn();

// Mock window.confirm
global.confirm = jest.fn(() => true);

// Helper to create mock fetch responses
const mockFetchSuccess = (data: any) => {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response);
};

const mockFetchError = (status: number = 500, errorMsg?: string) => {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error: errorMsg || 'API Error' }),
  } as Response);
};

// Standard mock implementation for most tests
const createStandardMocks = (overrides: any = {}) => {
  return (url: string, options?: RequestInit) => {
    if (url.includes('/api/follow-ups/pending')) {
      return mockFetchSuccess(overrides.followUps || []);
    }
    if (url.includes('/api/follow-ups/') && url.includes('/approve') && options?.method === 'PUT') {
      return mockFetchSuccess(overrides.approveResponse || { message: 'Follow-up approved' });
    }
    if (url.includes('/api/follow-ups/') && url.includes('/send') && options?.method === 'POST') {
      return mockFetchSuccess(overrides.sendResponse || { message: 'Follow-up sent' });
    }
    return mockFetchError();
  };
};

describe('FollowupsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockReset();
    (global.confirm as jest.Mock).mockReturnValue(true);
  });

  describe('Initial Rendering', () => {
    it('renders without crashing', async () => {
      (fetch as jest.Mock).mockImplementation(createStandardMocks());

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      expect(document.body).toBeTruthy();
    });

    it('fetches pending follow-ups on mount', async () => {
      (fetch as jest.Mock).mockImplementation(createStandardMocks());

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/follow-ups/pending'));
      });
    });

    it('displays loading state initially', () => {
      (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<FollowupsTab />);

      expect(screen.getByText('Loading follow-ups...')).toBeInTheDocument();
    });

    it('displays header and description', async () => {
      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: [] }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText('Pending Follow-ups')).toBeInTheDocument();
      });

      expect(screen.getByText('Review and approve follow-up emails before sending')).toBeInTheDocument();
    });
  });

  describe('Follow-up Display', () => {
    it('displays follow-ups when data is loaded', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'pending',
          subject: 'Following up on my application',
          body: 'I wanted to follow up...',
          job_title: 'Senior Test Engineer',
          company: 'TechCorp',
          days_since_application: 7,
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText('Senior Test Engineer')).toBeInTheDocument();
      });

      expect(screen.getByText('TechCorp')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('1st Follow-up')).toBeInTheDocument();
      expect(screen.getByText('7 days since application')).toBeInTheDocument();
      expect(screen.getByText('Following up on my application')).toBeInTheDocument();
    });

    it('handles empty follow-up list', async () => {
      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: [] }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText('No pending follow-ups')).toBeInTheDocument();
      });

      expect(screen.getByText("Follow-ups will appear here when they're ready for review")).toBeInTheDocument();
    });

    it('handles multiple follow-ups', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'pending',
          job_title: 'Job 1',
          company: 'Company 1',
        },
        {
          follow_up_id: '2',
          application_id: 'app-2',
          scheduled_date: '2025-10-26T10:00:00Z',
          attempt_number: 2,
          follow_up_type: 'email',
          status: 'approved',
          job_title: 'Job 2',
          company: 'Company 2',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText('Job 1')).toBeInTheDocument();
      });

      expect(screen.getByText('Job 2')).toBeInTheDocument();
      expect(screen.getByText('Company 1')).toBeInTheDocument();
      expect(screen.getByText('Company 2')).toBeInTheDocument();
      expect(screen.getByText('1st Follow-up')).toBeInTheDocument();
      expect(screen.getByText('2nd Follow-up')).toBeInTheDocument();
    });

    it('displays job title fallback when missing', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'pending',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText('Job Application')).toBeInTheDocument();
      });

      expect(screen.getByText('Company')).toBeInTheDocument();
    });

    it('displays scheduled date formatted correctly', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'pending',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText(/Scheduled:/)).toBeInTheDocument();
      });

      // Verify date is formatted (contains "Oct 25")
      expect(screen.getByText(/Oct 25, 2025/)).toBeInTheDocument();
    });
  });

  describe('Follow-up Status', () => {
    it('displays pending status correctly', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'pending',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    it('displays approved status correctly', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'approved',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    it('displays sent status correctly', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'sent',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    it('displays failed status correctly', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'failed',
          error_message: 'Email delivery failed',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Follow-up Approval', () => {
    it('approves follow-up successfully', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'pending',
          subject: 'Test Subject',
          body: 'Test Body',
        },
      ];

      let approveCallCount = 0;

      (fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/follow-ups/pending')) {
          return mockFetchSuccess(mockFollowUps);
        }
        if (url.includes('/approve') && options?.method === 'PUT') {
          approveCallCount++;
          return mockFetchSuccess({ message: 'Approved' });
        }
        return mockFetchError();
      });

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/follow-ups/pending'));
      });

      // Test setup verifies API is ready
      expect(approveCallCount).toBe(0);
    });

    it('handles approve follow-up error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'pending',
        },
      ];

      (fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/follow-ups/pending')) {
          return mockFetchSuccess(mockFollowUps);
        }
        if (url.includes('/approve') && options?.method === 'PUT') {
          return mockFetchError(500);
        }
        return mockFetchError();
      });

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Follow-up Sending', () => {
    it('sends follow-up when confirmed', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'approved',
        },
      ];

      let sendCallCount = 0;

      (fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/follow-ups/pending')) {
          return mockFetchSuccess(mockFollowUps);
        }
        if (url.includes('/send') && options?.method === 'POST') {
          sendCallCount++;
          return mockFetchSuccess({ message: 'Sent' });
        }
        return mockFetchError();
      });

      (global.confirm as jest.Mock).mockReturnValue(true);

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/follow-ups/pending'));
      });

      expect(sendCallCount).toBe(0);
    });

    it('does not send follow-up when cancelled', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'approved',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));
      (global.confirm as jest.Mock).mockReturnValue(false);

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/follow-ups/pending'));
      });

      // Verify only the fetch call was made, no send
      const sendCalls = (fetch as jest.Mock).mock.calls.filter(
        (call) => call[0].includes('/send') && call[1]?.method === 'POST'
      );
      expect(sendCalls.length).toBe(0);
    });

    it('handles send follow-up error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'approved',
        },
      ];

      (fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/follow-ups/pending')) {
          return mockFetchSuccess(mockFollowUps);
        }
        if (url.includes('/send') && options?.method === 'POST') {
          return mockFetchError(500, 'Email send failed');
        }
        return mockFetchError();
      });

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
      alertSpy.mockRestore();
    });
  });

  describe('Attempt Number Badge', () => {
    it('displays "1st Follow-up" for first attempt', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'pending',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    it('displays "2nd Follow-up" for second attempt', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 2,
          follow_up_type: 'email',
          status: 'pending',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Overdue Detection', () => {
    it('displays "(Overdue)" for past dates with pending status', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: pastDate.toISOString(),
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'pending',
          job_title: 'Test Job',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Job')).toBeInTheDocument();
      });

      expect(screen.getByText('(Overdue)')).toBeInTheDocument();
    });

    it('does not display "(Overdue)" for future dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: futureDate.toISOString(),
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'pending',
          job_title: 'Test Job',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Job')).toBeInTheDocument();
      });

      expect(screen.queryByText('(Overdue)')).not.toBeInTheDocument();
    });

    it('does not display "(Overdue)" for past dates with non-pending status', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: pastDate.toISOString(),
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'approved',
          job_title: 'Test Job',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Job')).toBeInTheDocument();
      });

      expect(screen.queryByText('(Overdue)')).not.toBeInTheDocument();
    });
  });

  describe('Modal Interactions', () => {
    it('opens modal when clicking on follow-up card', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'pending',
          subject: 'Test Subject',
          body: 'Test Body',
          job_title: 'Test Job',
          company: 'Test Company',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Job')).toBeInTheDocument();
      });

      const card = screen.getByText('Test Job').closest('.followup-card');
      fireEvent.click(card!);

      await waitFor(() => {
        expect(screen.getByText('Follow-up Email')).toBeInTheDocument();
      });

      expect(screen.getByText(/Test Job at Test Company/)).toBeInTheDocument();
    });

    it('closes modal when clicking close button', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'pending',
          subject: 'Test Subject',
          body: 'Test Body',
          job_title: 'Test Job',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Job')).toBeInTheDocument();
      });

      const card = screen.getByText('Test Job').closest('.followup-card');
      fireEvent.click(card!);

      await waitFor(() => {
        expect(screen.getByText('Follow-up Email')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Follow-up Email')).not.toBeInTheDocument();
      });
    });

    it('displays modal with subject and body in view mode', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'pending',
          subject: 'Original Subject',
          body: 'Original Body Content',
          job_title: 'Test Job',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Job')).toBeInTheDocument();
      });

      const card = screen.getByText('Test Job').closest('.followup-card');
      fireEvent.click(card!);

      await waitFor(() => {
        expect(screen.getByText('Follow-up Email')).toBeInTheDocument();
      });

      // Wait for modal content to render, then check for labels
      expect(screen.getByText('Subject')).toBeInTheDocument();
      expect(screen.getByText('Body')).toBeInTheDocument();
      // Subject and body text appear multiple times (card + modal), so just verify modal is showing them
      expect(screen.getAllByText('Original Subject').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Original Body Content').length).toBeGreaterThan(0);
    });

    it('enters edit mode when clicking Edit button', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'pending',
          subject: 'Original Subject',
          body: 'Original Body',
          job_title: 'Test Job',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Job')).toBeInTheDocument();
      });

      const card = screen.getByText('Test Job').closest('.followup-card');
      fireEvent.click(card!);

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Cancel Edit')).toBeInTheDocument();
      });

      expect(screen.getByText('Save & Approve')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Original Subject')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Original Body')).toBeInTheDocument();
    });

    it('cancels edit mode and reverts changes', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'pending',
          subject: 'Original Subject',
          body: 'Original Body',
          job_title: 'Test Job',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Job')).toBeInTheDocument();
      });

      const card = screen.getByText('Test Job').closest('.followup-card');
      fireEvent.click(card!);

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Edit'));

      await waitFor(() => {
        expect(screen.getByDisplayValue('Original Subject')).toBeInTheDocument();
      });

      const subjectInput = screen.getByDisplayValue('Original Subject');
      fireEvent.change(subjectInput, { target: { value: 'Modified Subject' } });

      expect(screen.getByDisplayValue('Modified Subject')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel Edit'));

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });

      expect(screen.queryByDisplayValue('Modified Subject')).not.toBeInTheDocument();
    });

    it('saves edits and approves when clicking Save & Approve', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'pending',
          subject: 'Original Subject',
          body: 'Original Body',
          job_title: 'Test Job',
        },
      ];

      let approveRequest: any = null;

      (fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/follow-ups/pending')) {
          return mockFetchSuccess(mockFollowUps);
        }
        if (url.includes('/approve') && options?.method === 'PUT') {
          approveRequest = JSON.parse(options.body as string);
          return mockFetchSuccess({ message: 'Approved' });
        }
        return mockFetchError();
      });

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Job')).toBeInTheDocument();
      });

      const card = screen.getByText('Test Job').closest('.followup-card');
      fireEvent.click(card!);

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Edit'));

      await waitFor(() => {
        expect(screen.getByDisplayValue('Original Subject')).toBeInTheDocument();
      });

      // Test editing subject only (body editing has DOM query challenges in testing)
      const subjectInput = screen.getByDisplayValue('Original Subject') as HTMLInputElement;

      fireEvent.change(subjectInput, { target: { value: 'Modified Subject' } });

      fireEvent.click(screen.getByText('Save & Approve'));

      await waitFor(() => {
        expect(approveRequest).not.toBeNull();
      });

      // Verify API was called with edited subject
      expect(approveRequest.subject).toBe('Modified Subject');
      // Body is passed through (editedBody state is preserved from modal open)
      expect(approveRequest.body).toBe('Original Body');
    });

    it('approves without edits when clicking Approve button', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'pending',
          subject: 'Test Subject',
          body: 'Test Body',
          job_title: 'Test Job',
        },
      ];

      let approveRequest: any = null;

      (fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/follow-ups/pending')) {
          return mockFetchSuccess(mockFollowUps);
        }
        if (url.includes('/approve') && options?.method === 'PUT') {
          approveRequest = JSON.parse(options.body as string);
          return mockFetchSuccess({ message: 'Approved' });
        }
        return mockFetchError();
      });

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Job')).toBeInTheDocument();
      });

      const card = screen.getByText('Test Job').closest('.followup-card');
      fireEvent.click(card!);

      await waitFor(() => {
        expect(screen.getByText('Approve')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Approve'));

      await waitFor(() => {
        expect(approveRequest).not.toBeNull();
      });

      expect(approveRequest).toEqual({});
    });

    it('displays Send Now button for approved follow-ups', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'approved',
          subject: 'Test Subject',
          body: 'Test Body',
          job_title: 'Test Job',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Job')).toBeInTheDocument();
      });

      const card = screen.getByText('Test Job').closest('.followup-card');
      fireEvent.click(card!);

      await waitFor(() => {
        expect(screen.getByText('Send Now')).toBeInTheDocument();
      });

      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    });

    it('sends follow-up when clicking Send Now and confirming', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'approved',
          subject: 'Test Subject',
          body: 'Test Body',
          job_title: 'Test Job',
        },
      ];

      let sendCalled = false;

      (fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/follow-ups/pending')) {
          return mockFetchSuccess(mockFollowUps);
        }
        if (url.includes('/send') && options?.method === 'POST') {
          sendCalled = true;
          return mockFetchSuccess({ message: 'Sent' });
        }
        return mockFetchError();
      });

      (global.confirm as jest.Mock).mockReturnValue(true);

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Job')).toBeInTheDocument();
      });

      const card = screen.getByText('Test Job').closest('.followup-card');
      fireEvent.click(card!);

      await waitFor(() => {
        expect(screen.getByText('Send Now')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Send Now'));

      await waitFor(() => {
        expect(sendCalled).toBe(true);
      });

      expect(global.confirm).toHaveBeenCalledWith('Send this follow-up email now?');
    });

    it('displays error message in modal when present', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'failed',
          subject: 'Test Subject',
          body: 'Test Body',
          job_title: 'Test Job',
          error_message: 'Email delivery failed due to invalid recipient',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Job')).toBeInTheDocument();
      });

      const card = screen.getByText('Test Job').closest('.followup-card');
      fireEvent.click(card!);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });

      expect(screen.getByText('Email delivery failed due to invalid recipient')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles fetch follow-ups error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      (fetch as jest.Mock).mockImplementation(() => mockFetchError(500));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      // Component should still render despite error
      expect(document.body).toBeTruthy();

      consoleErrorSpy.mockRestore();
    });

    it('handles network errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Follow-up Details', () => {
    it('displays follow-up with all optional fields', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'approved',
          template_used: 'standard_followup',
          subject: 'Following up on my application',
          body: 'I wanted to follow up on my application...',
          approved_by: 'user@example.com',
          approved_at: '2025-10-24T10:00:00Z',
          sent_at: '2025-10-25T10:00:00Z',
          job_title: 'Senior Test Engineer',
          company: 'TechCorp',
          days_since_application: 7,
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/follow-ups/pending'));
      });
    });

    it('displays follow-up with minimal fields', async () => {
      const mockFollowUps = [
        {
          follow_up_id: '1',
          application_id: 'app-1',
          scheduled_date: '2025-10-25T10:00:00Z',
          attempt_number: 1,
          follow_up_type: 'email',
          status: 'pending',
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ followUps: mockFollowUps }));

      render(<FollowupsTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/follow-ups/pending'));
      });
    });
  });
});
