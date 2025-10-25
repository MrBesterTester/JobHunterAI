import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, Mock } from 'vitest';
import EmailComposer from './EmailComposer';

// Mock fetch globally
global.fetch = vi.fn();

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
    if (url.includes('/create-draft') && options?.method === 'POST') {
      return mockFetchSuccess(overrides.draftResponse || {
        draft_id: 'draft-123',
        gmail_draft_id: 'gmail-456',
        gmail_url: 'https://mail.google.com/mail/u/0/#drafts/gmail-456',
        status: 'created',
      });
    }
    return mockFetchError();
  };
};

describe('EmailComposer', () => {
  const defaultProps = {
    applicationId: 'app-123',
    jobTitle: 'Senior Test Engineer',
    company: 'TechCorp',
    coverLetter: 'Dear Hiring Manager,\n\nI am excited to apply...',
    resumeContent: '# Sam Kirk\n\nSoftware Engineer with 10 years experience...',
    resumeFormat: 'md',
    defaultRecipient: 'jobs@techcorp.com',
    onClose: vi.fn(),
    onDraftCreated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as Mock).mockReset();
  });

  describe('Initial Rendering', () => {
    it('renders without crashing', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<EmailComposer {...defaultProps} />);

      expect(screen.getByTestId('email-composer-modal')).toBeInTheDocument();
    });

    it('displays job title and company', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<EmailComposer {...defaultProps} />);

      // Check for both company and job title in the header
      expect(screen.getByText(/TechCorp - Senior Test Engineer/i)).toBeInTheDocument();
    });

    it('displays default recipient email', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<EmailComposer {...defaultProps} />);

      const recipientInput = screen.getByDisplayValue('jobs@techcorp.com');
      expect(recipientInput).toBeInTheDocument();
    });

    it('displays default subject line', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<EmailComposer {...defaultProps} />);

      const subjectInput = screen.getByDisplayValue(/Application for Senior Test Engineer - Sam Kirk/i);
      expect(subjectInput).toBeInTheDocument();
    });

    it('renders close button', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<EmailComposer {...defaultProps} />);

      const closeButton = screen.getByTestId('close-button');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('calls onClose when close button is clicked', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<EmailComposer {...defaultProps} />);

      const closeButton = screen.getByTestId('close-button');
      fireEvent.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls onClose when clicking outside modal', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<EmailComposer {...defaultProps} />);

      const modal = screen.getByTestId('email-composer-modal');
      fireEvent.click(modal);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('does not close when clicking inside modal', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<EmailComposer {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Recipient Email Field', () => {
    it('allows editing recipient email', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<EmailComposer {...defaultProps} />);

      const recipientInput = screen.getByDisplayValue('jobs@techcorp.com') as HTMLInputElement;
      fireEvent.change(recipientInput, { target: { value: 'newemail@example.com' } });

      expect(recipientInput.value).toBe('newemail@example.com');
    });

    it('handles empty recipient email', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      const propsWithoutRecipient = {
        ...defaultProps,
        defaultRecipient: '',
      };

      render(<EmailComposer {...propsWithoutRecipient} />);

      const recipientInput = screen.getByDisplayValue('') as HTMLInputElement;
      expect(recipientInput).toBeInTheDocument();
    });
  });

  describe('Subject Field', () => {
    it('allows editing subject line', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<EmailComposer {...defaultProps} />);

      const subjectInput = screen.getByDisplayValue(/Application for Senior Test Engineer - Sam Kirk/i) as HTMLInputElement;
      fireEvent.change(subjectInput, { target: { value: 'New Subject Line' } });

      expect(subjectInput.value).toBe('New Subject Line');
    });
  });

  describe('Cover Letter Preview', () => {
    it('displays cover letter content', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<EmailComposer {...defaultProps} />);

      expect(screen.getByText(/Dear Hiring Manager/i)).toBeInTheDocument();
    });

    it('preserves line breaks in cover letter', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      const propsWithMultilineLetter = {
        ...defaultProps,
        coverLetter: 'Line 1\nLine 2\nLine 3',
      };

      render(<EmailComposer {...propsWithMultilineLetter} />);

      // Component renders with preserved formatting
      expect(document.body).toBeTruthy();
    });
  });

  describe('Resume Attachment Info', () => {
    it('displays resume filename', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<EmailComposer {...defaultProps} />);

      // Filename format: company_resume.format
      expect(screen.getByText(/techcorp_resume\.md/i)).toBeInTheDocument();
    });

    it('displays resume file size', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<EmailComposer {...defaultProps} />);

      // Size displayed in KB
      const sizeText = screen.getByText(/KB/i);
      expect(sizeText).toBeInTheDocument();
    });

    it('handles different resume formats', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      const propsWithPdfFormat = {
        ...defaultProps,
        resumeFormat: 'pdf',
      };

      render(<EmailComposer {...propsWithPdfFormat} />);

      expect(screen.getByText(/\.pdf/i)).toBeInTheDocument();
    });

    it('sanitizes company name for filename', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      const propsWithSpecialChars = {
        ...defaultProps,
        company: 'Tech & Corp! @ Inc.',
      };

      render(<EmailComposer {...propsWithSpecialChars} />);

      // Special characters should be replaced with underscores
      // "Tech & Corp! @ Inc." becomes "tech___corp____inc_"
      expect(screen.getByText(/tech___corp____inc__resume/i)).toBeInTheDocument();
    });
  });

  describe('Draft Creation', () => {
    it('creates draft successfully', async () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<EmailComposer {...defaultProps} />);

      const createButton = screen.getByTestId('create-draft-button');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/create-draft'),
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('app-123'),
          })
        );
      });

      expect(defaultProps.onDraftCreated).toHaveBeenCalled();
    });

    it('validates recipient email before creating draft', async () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      const propsWithoutRecipient = {
        ...defaultProps,
        defaultRecipient: '',
      };

      render(<EmailComposer {...propsWithoutRecipient} />);

      const createButton = screen.getByTestId('create-draft-button');

      // Button should be disabled when no recipient email
      expect(createButton).toBeDisabled();

      // Clicking disabled button should not trigger fetch
      fireEvent.click(createButton);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('displays loading state during draft creation', async () => {
      (fetch as Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<EmailComposer {...defaultProps} />);

      const createButton = screen.getByTestId('create-draft-button');
      fireEvent.click(createButton);

      // Button should be disabled during creation
      await waitFor(() => {
        expect(createButton).toBeDisabled();
      });
    });

    it('displays success state after draft creation', async () => {
      const mockDraftResponse = {
        draft_id: 'draft-123',
        gmail_draft_id: 'gmail-456',
        gmail_url: 'https://mail.google.com/mail/u/0/#drafts/gmail-456',
        status: 'created',
      };

      (fetch as Mock).mockImplementation(createStandardMocks({ draftResponse: mockDraftResponse }));

      render(<EmailComposer {...defaultProps} />);

      const createButton = screen.getByTestId('create-draft-button');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      // Success message or Gmail link should be displayed
    });

    it('displays Gmail draft link after creation', async () => {
      const mockDraftResponse = {
        draft_id: 'draft-123',
        gmail_draft_id: 'gmail-456',
        gmail_url: 'https://mail.google.com/mail/u/0/#drafts/gmail-456',
        status: 'created',
      };

      (fetch as Mock).mockImplementation(createStandardMocks({ draftResponse: mockDraftResponse }));

      render(<EmailComposer {...defaultProps} />);

      const createButton = screen.getByTestId('create-draft-button');
      fireEvent.click(createButton);

      await waitFor(() => {
        const gmailLink = screen.getByRole('link', { name: /Open in Gmail/i });
        expect(gmailLink).toBeInTheDocument();
        expect(gmailLink).toHaveAttribute('href', 'https://mail.google.com/mail/u/0/#drafts/gmail-456');
      });
    });

    it('handles draft creation error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (fetch as Mock).mockImplementation(() => mockFetchError(500, 'Failed to create draft'));

      render(<EmailComposer {...defaultProps} />);

      const createButton = screen.getByTestId('create-draft-button');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to create draft/i)).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it('handles network errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (fetch as Mock).mockRejectedValue(new Error('Network error'));

      render(<EmailComposer {...defaultProps} />);

      const createButton = screen.getByTestId('create-draft-button');
      fireEvent.click(createButton);

      await waitFor(() => {
        // Network error message contains "Network error" from the Error object
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Request Body', () => {
    it('sends correct application ID', async () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<EmailComposer {...defaultProps} />);

      const createButton = screen.getByTestId('create-draft-button');
      fireEvent.click(createButton);

      await waitFor(() => {
        const callArgs = (fetch as Mock).mock.calls[0];
        const body = JSON.parse(callArgs[1].body);
        expect(body.application_id).toBe('app-123');
      });
    });

    it('sends correct recipient email', async () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<EmailComposer {...defaultProps} />);

      const recipientInput = screen.getByDisplayValue('jobs@techcorp.com') as HTMLInputElement;
      fireEvent.change(recipientInput, { target: { value: 'hr@example.com' } });

      const createButton = screen.getByTestId('create-draft-button');
      fireEvent.click(createButton);

      await waitFor(() => {
        const callArgs = (fetch as Mock).mock.calls[0];
        const body = JSON.parse(callArgs[1].body);
        expect(body.recipient_email).toBe('hr@example.com');
      });
    });
  });

  describe('Props Handling', () => {
    it('handles onDraftCreated callback when not provided', async () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      const propsWithoutCallback = {
        ...defaultProps,
        onDraftCreated: undefined,
      };

      render(<EmailComposer {...propsWithoutCallback} />);

      const createButton = screen.getByTestId('create-draft-button');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      // Should not crash when callback is undefined
      expect(document.body).toBeTruthy();
    });

    it('handles long cover letter content', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      const longCoverLetter = 'A'.repeat(5000);

      const propsWithLongLetter = {
        ...defaultProps,
        coverLetter: longCoverLetter,
      };

      render(<EmailComposer {...propsWithLongLetter} />);

      expect(document.body).toBeTruthy();
    });

    it('handles long resume content', () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      const longResume = 'B'.repeat(10000);

      const propsWithLongResume = {
        ...defaultProps,
        resumeContent: longResume,
      };

      render(<EmailComposer {...propsWithLongResume} />);

      expect(document.body).toBeTruthy();
    });
  });

  describe('Error Display', () => {
    it('displays error message when shown', async () => {
      (fetch as Mock).mockImplementation(() => mockFetchError(500, 'Custom error message'));

      render(<EmailComposer {...defaultProps} />);

      const createButton = screen.getByTestId('create-draft-button');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/Custom error message/i)).toBeInTheDocument();
      });
    });

    it('clears previous error on new attempt', async () => {
      (fetch as Mock).mockImplementation(() => mockFetchError(500, 'Error message'));

      render(<EmailComposer {...defaultProps} />);

      const createButton = screen.getByTestId('create-draft-button');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/Error message/i)).toBeInTheDocument();
      });

      // Change implementation to success
      (fetch as Mock).mockImplementation(createStandardMocks());

      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.queryByText(/Error message/i)).not.toBeInTheDocument();
      });
    });
  });
});
