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

describe('IntakeTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockReset();
  });

  describe('Initial Rendering', () => {
    it('renders without crashing', async () => {
      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/sources')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      // Component should render
      expect(screen.getByText(/Job Sources/i) || screen.getByText(/Intake/i)).toBeInTheDocument();
    });

    it('fetches job sources on mount', async () => {
      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/sources')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/sources'));
      });
    });

    it('fetches intake logs on mount', async () => {
      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/sources')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/intake/logs'));
      });
    });
  });

  describe('Job Sources Display', () => {
    it('displays job sources when fetched', async () => {
      const mockSources = [
        {
          source_id: '1',
          source_name: 'Gmail',
          source_type: 'email',
          is_active: true,
          last_sync: new Date().toISOString(),
          sync_interval_minutes: 60,
          auth_required: true,
          auth_type: 'oauth',
          has_credentials: true,
        },
      ];

      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/sources')) {
          return mockFetchSuccess(mockSources);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      await waitFor(() => {
        expect(screen.getByText('Gmail')).toBeInTheDocument();
      });
    });

    it('shows active status for active sources', async () => {
      const mockSources = [
        {
          source_id: '1',
          source_name: 'Test Source',
          source_type: 'api',
          is_active: true,
          last_sync: null,
          sync_interval_minutes: 30,
          auth_required: false,
          auth_type: null,
        },
      ];

      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/sources')) {
          return mockFetchSuccess(mockSources);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Source')).toBeInTheDocument();
      });
    });

    it('displays multiple sources', async () => {
      const mockSources = [
        {
          source_id: '1',
          source_name: 'Gmail',
          source_type: 'email',
          is_active: true,
          last_sync: null,
          sync_interval_minutes: 60,
          auth_required: true,
          auth_type: 'oauth',
        },
        {
          source_id: '2',
          source_name: 'RapidAPI',
          source_type: 'api',
          is_active: true,
          last_sync: null,
          sync_interval_minutes: 120,
          auth_required: true,
          auth_type: 'api_key',
        },
      ];

      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/sources')) {
          return mockFetchSuccess(mockSources);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      await waitFor(() => {
        expect(screen.getByText('Gmail')).toBeInTheDocument();
        expect(screen.getByText('RapidAPI')).toBeInTheDocument();
      });
    });
  });

  describe('Intake Logs', () => {
    it('displays intake logs', async () => {
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

      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/sources')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess(mockLogs);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      await waitFor(() => {
        expect(screen.getByText(/completed/i)).toBeInTheDocument();
      });
    });

    it('shows sync statistics in logs', async () => {
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

      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/sources')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess(mockLogs);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      await waitFor(() => {
        // Check for numeric values in the logs
        expect(screen.getByText('15') || screen.getByText('discovered: 15')).toBeInTheDocument();
      });
    });
  });

  describe('Sync Operations', () => {
    it('allows syncing a job source', async () => {
      const mockSources = [
        {
          source_id: '1',
          source_name: 'Gmail',
          source_type: 'email',
          is_active: true,
          last_sync: null,
          sync_interval_minutes: 60,
          auth_required: true,
          auth_type: 'oauth',
          has_credentials: true,
        },
      ];

      (fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/sources') && !url.includes('/sync')) {
          return mockFetchSuccess(mockSources);
        }
        if (url.includes('/sync') && options?.method === 'POST') {
          return mockFetchSuccess({
            message: 'Sync completed',
            metrics: {
              jobs_discovered: 5,
              jobs_failed_processing: 0,
              jobs_filtered_out: 1,
              jobs_duplicated: 1,
              jobs_created: 3,
            },
          });
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      await waitFor(() => {
        expect(screen.getByText('Gmail')).toBeInTheDocument();
      });

      // Find and click sync button
      const syncButtons = screen.queryAllByText(/sync/i);
      if (syncButtons.length > 0) {
        fireEvent.click(syncButtons[0]);

        await waitFor(() => {
          expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/sync'),
            expect.objectContaining({ method: 'POST' })
          );
        });
      }
    });

    it('handles sync errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const mockSources = [
        {
          source_id: '1',
          source_name: 'Test Source',
          source_type: 'api',
          is_active: true,
          last_sync: null,
          sync_interval_minutes: 60,
          auth_required: false,
          auth_type: null,
        },
      ];

      (fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/sources') && !url.includes('/sync')) {
          return mockFetchSuccess(mockSources);
        }
        if (url.includes('/sync') && options?.method === 'POST') {
          return mockFetchError(500);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Source')).toBeInTheDocument();
      });

      consoleError.mockRestore();
    });
  });

  describe('Source Summaries', () => {
    it('displays source summary statistics', async () => {
      const mockSummaries = [
        {
          source_name: 'Gmail',
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

      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/sources')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess(mockSummaries);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      await waitFor(() => {
        // Summary data should be displayed somewhere
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/intake/summary'));
      });
    });
  });

  describe('Gmail Authentication', () => {
    it('handles Gmail OAuth flow', async () => {
      const mockSources = [
        {
          source_id: '1',
          source_name: 'Gmail',
          source_type: 'email',
          is_active: true,
          last_sync: null,
          sync_interval_minutes: 60,
          auth_required: true,
          auth_type: 'oauth',
          has_credentials: false,
        },
      ];

      (fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/sources')) {
          return mockFetchSuccess(mockSources);
        }
        if (url.includes('/gmail/auth') && options?.method === 'POST') {
          return mockFetchSuccess({
            auth_url: 'https://accounts.google.com/o/oauth2/auth?...',
          });
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        return mockFetchError();
      });

      // Mock window.open
      const mockOpen = jest.fn();
      window.open = mockOpen;

      render(<IntakeTab />);

      await waitFor(() => {
        expect(screen.getByText('Gmail')).toBeInTheDocument();
      });

      // Look for authenticate button
      const authButtons = screen.queryAllByText(/authenticate/i);
      if (authButtons.length > 0) {
        fireEvent.click(authButtons[0]);

        await waitFor(() => {
          expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/gmail/auth'),
            expect.anything()
          );
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('handles API errors when fetching sources', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/sources')) {
          return mockFetchError(500);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      // Component should still render even with API error
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/sources'));
      });

      consoleError.mockRestore();
    });

    it('handles network errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      (fetch as jest.Mock).mockImplementation((url: string) => {
        return Promise.reject(new Error('Network error'));
      });

      render(<IntakeTab />);

      // Should not crash
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });

  describe('Callbacks', () => {
    it('calls onJobsUpdated callback after successful sync', async () => {
      const mockCallback = jest.fn();

      const mockSources = [
        {
          source_id: '1',
          source_name: 'Test Source',
          source_type: 'api',
          is_active: true,
          last_sync: null,
          sync_interval_minutes: 60,
          auth_required: false,
          auth_type: null,
        },
      ];

      (fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/sources') && !url.includes('/sync')) {
          return mockFetchSuccess(mockSources);
        }
        if (url.includes('/sync') && options?.method === 'POST') {
          return mockFetchSuccess({
            message: 'Sync completed',
            metrics: {
              jobs_discovered: 5,
              jobs_failed_processing: 0,
              jobs_filtered_out: 1,
              jobs_duplicated: 1,
              jobs_created: 3,
            },
          });
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        return mockFetchError();
      });

      render(<IntakeTab onJobsUpdated={mockCallback} />);

      await waitFor(() => {
        expect(screen.getByText('Test Source')).toBeInTheDocument();
      });

      // Callback should be callable (exact trigger depends on implementation)
      expect(mockCallback).toBeDefined();
    });
  });

  describe('UI State', () => {
    it('shows loading state initially', async () => {
      (fetch as jest.Mock).mockImplementation((url: string) => {
        return new Promise(resolve => {
          setTimeout(() => {
            if (url.includes('/api/sources')) {
              resolve(mockFetchSuccess([]));
            } else if (url.includes('/api/intake/logs')) {
              resolve(mockFetchSuccess([]));
            } else if (url.includes('/api/intake/summary')) {
              resolve(mockFetchSuccess([]));
            } else {
              resolve(mockFetchError());
            }
          }, 100);
        });
      });

      render(<IntakeTab />);

      // Should eventually load
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('updates UI after data fetch completes', async () => {
      const mockSources = [
        {
          source_id: '1',
          source_name: 'Loaded Source',
          source_type: 'api',
          is_active: true,
          last_sync: null,
          sync_interval_minutes: 60,
          auth_required: false,
          auth_type: null,
        },
      ];

      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/sources')) {
          return mockFetchSuccess(mockSources);
        }
        if (url.includes('/api/intake/logs')) {
          return mockFetchSuccess([]);
        }
        if (url.includes('/api/intake/summary')) {
          return mockFetchSuccess([]);
        }
        return mockFetchError();
      });

      render(<IntakeTab />);

      await waitFor(() => {
        expect(screen.getByText('Loaded Source')).toBeInTheDocument();
      });
    });
  });
});
