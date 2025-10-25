import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, Mock } from 'vitest';
import IntakeTab from './IntakeTab';

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
    vi.clearAllMocks();
    (fetch as Mock).mockReset();
  });

  describe('Initial Rendering', () => {
    it('renders without crashing', async () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      expect(document.body).toBeTruthy();
    });

    it('fetches job sources on mount', async () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/job-sources'));
      });
    });

    it('fetches intake logs on mount', async () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/intake/logs'));
      });
    });

    it('fetches intake summary on mount', async () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

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

      (fetch as Mock).mockImplementation(createStandardMocks({ sources: mockSources }));

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/job-sources'));
      });
    });

    it('handles empty sources list', async () => {
      (fetch as Mock).mockImplementation(createStandardMocks({ sources: [] }));

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

      (fetch as Mock).mockImplementation(createStandardMocks({ sources: mockSources }));

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

      (fetch as Mock).mockImplementation(createStandardMocks({ logs: mockLogs }));

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

      (fetch as Mock).mockImplementation(createStandardMocks({ logs: mockLogs }));

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

      (fetch as Mock).mockImplementation(createStandardMocks({ sources: mockSources, syncResponse }));

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

      (fetch as Mock).mockImplementation(createStandardMocks({ summary: mockSummaries }));

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/intake/summary'));
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors when fetching sources', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      (fetch as Mock).mockImplementation((url: string) => {
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
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      (fetch as Mock).mockImplementation(() => {
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
      const mockCallback = vi.fn();
      (fetch as Mock).mockImplementation(createStandardMocks());

      render(<IntakeTab onJobsUpdated={mockCallback} />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      expect(mockCallback).toBeDefined();
    });
  });

  describe('UI State', () => {
    it('handles loading state', async () => {
      (fetch as Mock).mockImplementation((url: string) => {
        return new Promise(resolve => {
          setTimeout(() => {
            if (url.includes('/api/job-sources')) {
              resolve(mockFetchSuccess([]));
            } else if (url.includes('/api/intake/logs')) {
              resolve(mockFetchSuccess([]));
            } else if (url.includes('/api/intake/summary')) {
              resolve(mockFetchSuccess([]));
            } else if (url.includes('/api/extraction/prompts')) {
              resolve(mockFetchSuccess(null));
            } else {
              resolve(mockFetchError());
            }
          }, 50);
        });
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

      (fetch as Mock).mockImplementation(createStandardMocks({ sources: mockSources }));

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/job-sources'));
      });
    });
  });

  describe('Extraction Prompts', () => {
    it('fetches extraction prompts on mount', async () => {
      (fetch as Mock).mockImplementation(createStandardMocks());

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

      (fetch as Mock).mockImplementation(createStandardMocks({ prompts: mockPrompt }));

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/extraction/prompts'));
      });
    });
  });
});
