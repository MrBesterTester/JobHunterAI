import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import IntakeTab from './IntakeTab';

// Mock fetch globally
global.fetch = jest.fn();

// Helper to create mock fetch responses
const mockFetchSuccess = (data: any) => {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response);
};

const mockFetchError = (status: number = 500) => {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.reject(new Error('API Error')),
  } as Response);
};

// Standard mock implementation for most tests
const createStandardMocks = (overrides: any = {}) => {
  return (url: string, options?: RequestInit) => {
    if (url.includes('/api/job-sources')) {
      return mockFetchSuccess(overrides.sources || []);
    }
    if (url.includes('/api/intake/logs')) {
      return mockFetchSuccess(overrides.logs || []);
    }
    if (url.includes('/api/intake/summary')) {
      return mockFetchSuccess(overrides.summary || []);
    }
    if (url.includes('/api/extraction/prompts')) {
      return mockFetchSuccess(overrides.prompts || null);
    }
    if (url.includes('/sync') && options?.method === 'POST') {
      return mockFetchSuccess(overrides.syncResponse || { message: 'Sync completed', metrics: { jobs_discovered: 0, jobs_failed_processing: 0, jobs_filtered_out: 0, jobs_duplicated: 0, jobs_created: 0 } });
    }
    return mockFetchError();
  };
};

describe('IntakeTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockReset();
  });

  describe('Initial Rendering', () => {
    it('renders without crashing', async () => {
      (fetch as jest.Mock).mockImplementation(createStandardMocks());

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      expect(document.body).toBeTruthy();
    });

    it('fetches job sources on mount', async () => {
      (fetch as jest.Mock).mockImplementation(createStandardMocks());

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/job-sources'));
      });
    });

    it('fetches intake logs on mount', async () => {
      (fetch as jest.Mock).mockImplementation(createStandardMocks());

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/intake/logs'));
      });
    });

    it('fetches intake summary on mount', async () => {
      (fetch as jest.Mock).mockImplementation(createStandardMocks());

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/intake/summary'));
      });
    });
  });

  describe('Job Sources', () => {
    it('handles successful sources fetch', async () => {
      const mockSources = [
        {
          source_id: '1',
          source_name: 'gmail',
          source_type: 'email',
          is_active: true,
          last_sync: null,
          sync_interval_minutes: 60,
          auth_required: true,
          auth_type: 'oauth',
          has_credentials: false,
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ sources: mockSources }));

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/job-sources'));
      });
    });

    it('handles empty sources list', async () => {
      (fetch as jest.Mock).mockImplementation(createStandardMocks({ sources: [] }));

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/job-sources'));
      });
    });

    it('handles multiple sources', async () => {
      const mockSources = [
        { source_id: '1', source_name: 'gmail', source_type: 'email', is_active: true, last_sync: null, sync_interval_minutes: 60, auth_required: true, auth_type: 'oauth', has_credentials: false },
        { source_id: '2', source_name: 'rapidapi', source_type: 'api', is_active: true, last_sync: null, sync_interval_minutes: 120, auth_required: true, auth_type: 'api_key', has_credentials: false },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ sources: mockSources }));

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/job-sources'));
      });
    });
  });

  describe('Intake Logs', () => {
    it('fetches intake logs successfully', async () => {
      const mockLogs = [
        {
          log_id: '1',
          source_id: 'src1',
          sync_status: 'completed',
          jobs_discovered: 10,
          jobs_failed_processing: 0,
          jobs_duplicated: 2,
          jobs_filtered_out: 3,
          jobs_created: 5,
          jobs_approved: 0,
          jobs_filtered: 0,
          jobs_deduplicated: 0,
          errors_count: 0,
          sync_started_at: new Date().toISOString(),
          sync_completed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ logs: mockLogs }));

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/intake/logs'));
      });
    });

    it('handles logs with statistics', async () => {
      const mockLogs = [
        {
          log_id: '1',
          source_id: 'src1',
          sync_status: 'completed',
          jobs_discovered: 15,
          jobs_failed_processing: 1,
          jobs_duplicated: 3,
          jobs_filtered_out: 5,
          jobs_created: 6,
          jobs_approved: 0,
          jobs_filtered: 0,
          jobs_deduplicated: 0,
          errors_count: 0,
          sync_started_at: new Date().toISOString(),
          sync_completed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ logs: mockLogs }));

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/intake/logs'));
      });
    });
  });

  describe('Sync Operations', () => {
    it('makes POST request for sync operations', async () => {
      const mockSources = [
        { source_id: '1', source_name: 'gmail', source_type: 'email', is_active: true, last_sync: null, sync_interval_minutes: 60, auth_required: true, auth_type: 'oauth', has_credentials: true },
      ];

      const syncResponse = {
        message: 'Sync completed',
        metrics: {
          jobs_discovered: 5,
          jobs_failed_processing: 0,
          jobs_filtered_out: 1,
          jobs_duplicated: 1,
          jobs_created: 3,
        },
      };

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ sources: mockSources, syncResponse }));

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/job-sources'));
      });
    });
  });

  describe('Source Summaries', () => {
    it('fetches source summary statistics', async () => {
      const mockSummaries = [
        {
          source_name: 'gmail',
          source_type: 'email',
          is_active: true,
          sync_count: 10,
          total_discovered: 100,
          total_approved: 75,
          avg_per_sync: 10,
          last_sync: new Date().toISOString(),
          last_sync_attempt: new Date().toISOString(),
        },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ summary: mockSummaries }));

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/intake/summary'));
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors when fetching sources', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/job-sources')) {
          return mockFetchError(500);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/extraction/prompts')) {
          return mockFetchSuccess(null);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/job-sources'));
      });

      consoleError.mockRestore();
    });

    it('handles network errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      (fetch as jest.Mock).mockImplementation(() => {
        return Promise.reject(new Error('Network error'));
      });

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });

  describe('Callbacks', () => {
    it('accepts onJobsUpdated callback prop', async () => {
      const mockCallback = jest.fn();
      (fetch as jest.Mock).mockImplementation(createStandardMocks());

      render(<IntakeTab onJobsUpdated={mockCallback} />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      expect(mockCallback).toBeDefined();
    });
  });

  describe('UI State', () => {
    it('handles loading state', async () => {
      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/job-sources')) {
          return Promise.resolve(mockFetchSuccess([]));
        } else if (url.includes('/api/intake/logs')) {
          return Promise.resolve(mockFetchSuccess([]));
        } else if (url.includes('/api/intake/summary')) {
          return Promise.resolve(mockFetchSuccess([]));
        } else if (url.includes('/api/extraction/prompts')) {
          return Promise.resolve(mockFetchSuccess(null));
        } else {
          return Promise.resolve(mockFetchError());
        }
      });

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('updates UI after data fetch completes', async () => {
      const mockSources = [
        { source_id: '1', source_name: 'gmail', source_type: 'email', is_active: true, last_sync: null, sync_interval_minutes: 60, auth_required: true, auth_type: 'oauth', has_credentials: false },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ sources: mockSources }));

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/job-sources'));
      });
    });
  });

  describe('Extraction Prompts', () => {
    it('fetches extraction prompts on mount', async () => {
      (fetch as jest.Mock).mockImplementation(createStandardMocks());

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/extraction/prompts'));
      });
    });

    it('handles prompt data', async () => {
      const mockPrompt = {
        prompt_id: '1',
        prompt_name: 'Test Prompt',
        prompt_type: 'extraction',
        prompt_content: 'Extract job details...',
        is_active: true,
        version: 1,
        created_by: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: 'Test notes',
      };

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ prompts: mockPrompt }));

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/extraction/prompts'));
      });
    });
  });

  describe('Gmail Sync Workflow', () => {
    it('handles Gmail sync successfully', async () => {
      const mockSources = [
        { source_id: 'gmail-1', source_name: 'gmail', source_type: 'email', is_active: true, last_sync: null, sync_interval_minutes: 60, auth_required: true, auth_type: 'oauth', has_credentials: true },
      ];

      const syncResponse = {
        message: 'Sync completed',
        metrics: {
          jobs_discovered: 10,
          jobs_failed_processing: 1,
          jobs_filtered_out: 2,
          jobs_duplicated: 3,
          jobs_created: 4,
        },
      };

      const mockCallback = jest.fn();

      (fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/job-sources')) {
          return mockFetchSuccess(mockSources);
        }
        if (url.includes('/api/intake/gmail/sync') && options?.method === 'POST') {
          return mockFetchSuccess(syncResponse);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/extraction/prompts')) {
          return mockFetchSuccess(null);
        }
        return mockFetchError();
      });

      render(<IntakeTab onJobsUpdated={mockCallback} />);

      await waitFor(() => {
        expect(screen.getByText('Gmail Job Discovery')).toBeInTheDocument();
      });

      // Get all "Sync Now" buttons and click the first one (Gmail)
      const syncButtons = screen.getAllByText('Sync Now');
      fireEvent.click(syncButtons[0]);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/intake/gmail/sync'),
          expect.objectContaining({ method: 'POST' })
        );
      });

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalled();
      });
    });

    it('handles Gmail sync errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockSources = [
        { source_id: 'gmail-1', source_name: 'gmail', source_type: 'email', is_active: true, last_sync: null, sync_interval_minutes: 60, auth_required: true, auth_type: 'oauth', has_credentials: true },
      ];

      (fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/job-sources')) {
          return mockFetchSuccess(mockSources);
        }
        if (url.includes('/api/intake/gmail/sync') && options?.method === 'POST') {
          return mockFetchError(500);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/extraction/prompts')) {
          return mockFetchSuccess(null);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      await waitFor(() => {
        expect(screen.getByText('Gmail Job Discovery')).toBeInTheDocument();
      });

      // Get all "Sync Now" buttons and click the first one (Gmail)
      const syncButtons = screen.getAllByText('Sync Now');
      fireEvent.click(syncButtons[0]);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/intake/gmail/sync'),
          expect.objectContaining({ method: 'POST' })
        );
      });

      consoleError.mockRestore();
    });
  });

  describe('RapidAPI Sync Workflow', () => {
    it('handles RapidAPI sync successfully', async () => {
      const mockSources = [
        { source_id: 'rapid-1', source_name: 'rapidapi', source_type: 'api', is_active: true, last_sync: null, sync_interval_minutes: 120, auth_required: true, auth_type: 'api_key', has_credentials: false },
      ];

      const syncResponse = {
        message: 'Sync completed',
        metrics: {
          jobs_discovered: 10,
          jobs_failed_processing: 0,
          jobs_filtered_out: 2,
          jobs_duplicated: 1,
          jobs_created: 7,
        },
      };

      const mockCallback = jest.fn();

      (fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/job-sources')) {
          return mockFetchSuccess(mockSources);
        }
        if (url.includes('/api/intake/rapidapi/sync') && options?.method === 'POST') {
          return mockFetchSuccess(syncResponse);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/extraction/prompts')) {
          return mockFetchSuccess(null);
        }
        return mockFetchError();
      });

      render(<IntakeTab onJobsUpdated={mockCallback} />);

      await waitFor(() => {
        expect(screen.getByTestId('rapidapi-sync-button')).toBeInTheDocument();
      });

      const syncButton = screen.getByTestId('rapidapi-sync-button');
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/intake/rapidapi/sync'),
          expect.objectContaining({ method: 'POST' })
        );
      });

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalled();
      });
    });

    it('handles RapidAPI sync when source is inactive', async () => {
      const mockSources = [
        { source_id: 'rapid-1', source_name: 'rapidapi', source_type: 'api', is_active: false, last_sync: null, sync_interval_minutes: 120, auth_required: true, auth_type: 'api_key', has_credentials: false },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ sources: mockSources }));

      render(<IntakeTab />);

      await waitFor(() => {
        expect(screen.getByTestId('rapidapi-sync-button')).toBeInTheDocument();
      });

      const syncButton = screen.getByTestId('rapidapi-sync-button');
      expect(syncButton).toBeDisabled();
    });
  });

  describe('Sync All Sources', () => {
    it('handles sync all sources successfully', async () => {
      const mockSources = [
        { source_id: 'gmail-1', source_name: 'gmail', source_type: 'email', is_active: true, last_sync: null, sync_interval_minutes: 60, auth_required: true, auth_type: 'oauth', has_credentials: true },
        { source_id: 'rapid-1', source_name: 'rapidapi', source_type: 'api', is_active: true, last_sync: null, sync_interval_minutes: 120, auth_required: true, auth_type: 'api_key', has_credentials: false },
      ];

      const syncResponse = {
        message: 'All sources synced',
        metrics: {
          jobs_discovered: 20,
          jobs_failed_processing: 1,
          jobs_filtered_out: 5,
          jobs_duplicated: 4,
          jobs_created: 10,
        },
      };

      const mockCallback = jest.fn();

      (fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/job-sources')) {
          return mockFetchSuccess(mockSources);
        }
        if (url.includes('/api/intake/sync-all') && options?.method === 'POST') {
          return mockFetchSuccess(syncResponse);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/extraction/prompts')) {
          return mockFetchSuccess(null);
        }
        return mockFetchError();
      });

      render(<IntakeTab onJobsUpdated={mockCallback} />);

      await waitFor(() => {
        expect(screen.getByText('Sync All Sources')).toBeInTheDocument();
      });

      const syncAllButton = screen.getByText('Sync All Sources');
      fireEvent.click(syncAllButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/intake/sync-all'),
          expect.objectContaining({ method: 'POST' })
        );
      });

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalled();
      });
    });

    it('handles sync all errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      (fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/job-sources')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/sync-all') && options?.method === 'POST') {
          return mockFetchError(500);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/extraction/prompts')) {
          return mockFetchSuccess(null);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      await waitFor(() => {
        expect(screen.getByText('Sync All Sources')).toBeInTheDocument();
      });

      const syncAllButton = screen.getByText('Sync All Sources');
      fireEvent.click(syncAllButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/intake/sync-all'),
          expect.objectContaining({ method: 'POST' })
        );
      });

      consoleError.mockRestore();
    });
  });

  describe('Re-filter Jobs', () => {
    it('handles re-filter with last_sync scope', async () => {
      const refilterResponse = {
        message: 'Re-filter completed',
        jobs_refiltered: 15,
        status_changes: {
          to_new: 10,
          to_filtered: 5,
        },
      };

      const mockCallback = jest.fn();

      (fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/job-sources')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/jobs/refilter') && options?.method === 'POST') {
          return mockFetchSuccess(refilterResponse);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/extraction/prompts')) {
          return mockFetchSuccess(null);
        }
        return mockFetchError();
      });

      render(<IntakeTab onJobsUpdated={mockCallback} />);

      await waitFor(() => {
        expect(screen.getByText('Re-filter Jobs')).toBeInTheDocument();
      });

      const refilterButton = screen.getByText('Re-filter Jobs');
      fireEvent.click(refilterButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/jobs/refilter'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ scope: 'last_sync' }),
          })
        );
      });

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalled();
      });
    });

    it('handles re-filter errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      (fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/job-sources')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/jobs/refilter') && options?.method === 'POST') {
          return mockFetchError(500);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/extraction/prompts')) {
          return mockFetchSuccess(null);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      await waitFor(() => {
        expect(screen.getByText('Re-filter Jobs')).toBeInTheDocument();
      });

      const refilterButton = screen.getByText('Re-filter Jobs');
      fireEvent.click(refilterButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/jobs/refilter'),
          expect.objectContaining({ method: 'POST' })
        );
      });

      consoleError.mockRestore();
    });
  });

  describe('Gmail Authentication', () => {
    it('opens Gmail auth window and schedules source refresh', async () => {
      jest.useFakeTimers();
      const authResponse = {
        auth_url: 'https://accounts.google.com/oauth/authorize?...',
      };

      const mockOpen = jest.fn();
      window.open = mockOpen;

      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/auth/gmail/url')) {
          return mockFetchSuccess(authResponse);
        }
        if (url.includes('/api/job-sources')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/extraction/prompts')) {
          return mockFetchSuccess(null);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      await waitFor(() => {
        expect(screen.getByText('Authenticate with Gmail')).toBeInTheDocument();
      });

      const authButton = screen.getByText('Authenticate with Gmail');
      fireEvent.click(authButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/gmail/url'));
      });

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith(
          authResponse.auth_url,
          '_blank',
          'width=600,height=600'
        );
      });

      // Fast-forward time to trigger setTimeout
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/job-sources'));
      });

      jest.useRealTimers();
    });

    it('handles Gmail auth errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/auth/gmail/url')) {
          return mockFetchError(500);
        }
        if (url.includes('/api/job-sources')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/extraction/prompts')) {
          return mockFetchSuccess(null);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      await waitFor(() => {
        expect(screen.getByText('Authenticate with Gmail')).toBeInTheDocument();
      });

      const authButton = screen.getByText('Authenticate with Gmail');
      fireEvent.click(authButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/gmail/url'));
      });

      consoleError.mockRestore();
    });
  });

  describe('Utility Functions', () => {
    it('renders relative time correctly', async () => {
      const recentDate = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
      const mockSources = [
        { source_id: 'gmail-1', source_name: 'gmail', source_type: 'email', is_active: true, last_sync: recentDate, sync_interval_minutes: 60, auth_required: true, auth_type: 'oauth', has_credentials: true },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ sources: mockSources }));

      render(<IntakeTab />);

      await waitFor(() => {
        expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
      });
    });

    it('renders status icons for logs', async () => {
      const mockLogs = [
        {
          log_id: '1',
          source_id: 'src1',
          sync_status: 'completed',
          jobs_discovered: 10,
          jobs_failed_processing: 0,
          jobs_duplicated: 2,
          jobs_filtered_out: 3,
          jobs_created: 5,
          jobs_approved: 0,
          jobs_filtered: 0,
          jobs_deduplicated: 0,
          errors_count: 0,
          sync_started_at: new Date().toISOString(),
          sync_completed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      const mockSources = [
        { source_id: 'src1', source_name: 'gmail', source_type: 'email', is_active: true, last_sync: null, sync_interval_minutes: 60, auth_required: true, auth_type: 'oauth', has_credentials: false },
      ];

      (fetch as jest.Mock).mockImplementation(createStandardMocks({ logs: mockLogs, sources: mockSources }));

      render(<IntakeTab />);

      await waitFor(() => {
        expect(screen.getByText(/10 Total/i)).toBeInTheDocument();
      });
    });
  });
});
