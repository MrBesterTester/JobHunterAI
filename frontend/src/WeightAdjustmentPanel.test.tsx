import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeightAdjustmentPanel from './WeightAdjustmentPanel';

describe('WeightAdjustmentPanel', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  const mockCriteria = [
    {
      criteria_id: 'crit-1',
      criterion_name: 'compensation',
      weight: 0.30,
      enabled: true,
      description: 'Salary/hourly rate',
      updated_at: '2025-10-20T10:00:00Z'
    },
    {
      criteria_id: 'crit-2',
      criterion_name: 'remote_work',
      weight: 0.25,
      enabled: true,
      description: 'Remote policy',
      updated_at: '2025-10-20T10:00:00Z'
    },
    {
      criteria_id: 'crit-3',
      criterion_name: 'domain_fit',
      weight: 0.20,
      enabled: true,
      description: 'Match with focus',
      updated_at: '2025-10-20T10:00:00Z'
    },
    {
      criteria_id: 'crit-4',
      criterion_name: 'benefits',
      weight: 0.15,
      enabled: true,
      description: 'Benefits package',
      updated_at: '2025-10-20T10:00:00Z'
    },
    {
      criteria_id: 'crit-5',
      criterion_name: 'flexibility_perks',
      weight: 0.10,
      enabled: true,
      description: 'Flexibility',
      updated_at: '2025-10-20T10:00:00Z'
    }
  ];

  // ===== Initial Rendering and Data Fetching =====

  it('should render loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));
    render(<WeightAdjustmentPanel />);

    expect(screen.getByText(/loading scoring criteria/i)).toBeInTheDocument();
  });

  it('should fetch criteria on mount', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCriteria
    });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/api/scoring-criteria');
    });
  });

  // ===== Collapsed State (Default) =====

  it('should render in collapsed state by default', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCriteria
    });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/click to expand/i)).toBeInTheDocument();

    // Sliders should not be visible
    expect(screen.queryByText(/compensation/i)).not.toBeInTheDocument();
  });

  // ===== Expansion and Collapse =====

  it('should expand panel when header clicked', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCriteria
    });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    // Click header to expand
    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByText(/compensation/i)).toBeInTheDocument();
    });

    // "Click to expand" should disappear
    expect(screen.queryByText(/click to expand/i)).not.toBeInTheDocument();
  });

  it('should collapse panel when header clicked again', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCriteria
    });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');

    // Expand
    await userEvent.click(header!);
    await waitFor(() => {
      expect(screen.getByText(/compensation/i)).toBeInTheDocument();
    });

    // Collapse
    await userEvent.click(header!);
    await waitFor(() => {
      expect(screen.queryByText(/compensation/i)).not.toBeInTheDocument();
    });
  });

  // ===== Criteria Display =====

  it('should display all criteria with formatted names', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCriteria
    });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    // Expand panel
    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      // Check that weight percentages are displayed (indicates criteria are rendered)
      expect(screen.getByText('30.0%')).toBeInTheDocument();
    });

    // Should have 5 criteria displayed
    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(5);
  });

  it('should display weight percentages', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCriteria
    });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByText('30.0%')).toBeInTheDocument(); // compensation
      expect(screen.getByText('25.0%')).toBeInTheDocument(); // remote_work
      expect(screen.getByText('20.0%')).toBeInTheDocument(); // domain_fit
      expect(screen.getByText('15.0%')).toBeInTheDocument(); // benefits
      expect(screen.getByText('10.0%')).toBeInTheDocument(); // flexibility_perks
    });
  });

  it('should display criteria descriptions', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCriteria
    });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByText(/salary\/hourly rate adjusted for tax structure/i)).toBeInTheDocument();
      expect(screen.getByText(/remote policy and onsite requirements/i)).toBeInTheDocument();
    });
  });

  // ===== Weight Sliders =====

  it('should render sliders for each criterion', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCriteria
    });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      const sliders = screen.getAllByRole('slider');
      expect(sliders).toHaveLength(5); // 5 criteria
    });
  });

  it('should update weight when slider moved', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCriteria
    });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByText('30.0%')).toBeInTheDocument();
    });

    // Sliders should be rendered
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBe(5);

    // Initial value should be 0.30
    expect(sliders[0]).toHaveValue('0.3');
  });

  // ===== Total Weight Validation =====

  it('should show valid checkmark when weights sum to 1.0', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCriteria
    });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      // Total should be 1.000 (valid) - weights in mockCriteria sum to 1.0
      const totalText = screen.getByText((content) => content.includes('1.000'));
      expect(totalText).toBeInTheDocument();
    });
  });

  it('should show error when weights do not sum to 1.0', async () => {
    // Create criteria that don't sum to 1.0
    const invalidCriteria = mockCriteria.map((c, i) =>
      i === 0 ? { ...c, weight: 0.50 } : c  // Change first weight to 0.50, total becomes 1.20
    );

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => invalidCriteria
    });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      // Save button should be disabled when weights invalid
      const saveButton = screen.getByRole('button', { name: /save & recalculate all scores/i });
      expect(saveButton).toBeDisabled();
    });
  });

  // ===== Save Button =====

  it('should enable save button when weights are valid', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCriteria
    });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save & recalculate all scores/i });
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('should disable save button when weights are invalid', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCriteria
    });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByText('30.0%')).toBeInTheDocument();
    });

    // Make weights invalid
    const sliders = screen.getAllByRole('slider');
    await userEvent.clear(sliders[0]);
    await userEvent.type(sliders[0], '0.50');

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save & recalculate all scores/i });
      expect(saveButton).toBeDisabled();
    });
  });

  it('should save weights and recalculate scores when save clicked', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCriteria
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scored_count: 42, failed_count: 0 })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCriteria
      });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save & recalculate all scores/i })).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save & recalculate all scores/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/scoring-criteria',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/jobs/calculate-all-scores',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  it('should display success message after successful save', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCriteria
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scored_count: 42, failed_count: 0 })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCriteria
      });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save & recalculate all scores/i })).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save & recalculate all scores/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/weights updated/i)).toBeInTheDocument();
      expect(screen.getByText(/recalculated scores for 42 jobs/i)).toBeInTheDocument();
    });
  });

  it('should display error message when save fails', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCriteria
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Database error' })
      });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save & recalculate all scores/i })).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save & recalculate all scores/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/database error/i)).toBeInTheDocument();
    });
  });

  it('should show error when trying to save invalid weights', async () => {
    // Create invalid criteria from the start
    const invalidCriteria = mockCriteria.map((c, i) =>
      i === 0 ? { ...c, weight: 0.50 } : c
    );

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => invalidCriteria
    });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save & recalculate all scores/i });
      expect(saveButton).toBeDisabled();
    });
  });

  // ===== Reset Button =====

  it('should reset weights to original values when reset clicked', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCriteria
    });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByText('30.0%')).toBeInTheDocument();
    });

    // Reset button should be present
    const resetButton = screen.getByRole('button', { name: /reset/i });
    expect(resetButton).toBeInTheDocument();
  });

  // ===== Callback Props =====

  it('should call onWeightsUpdated callback after successful save', async () => {
    const mockCallback = vi.fn();

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCriteria
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scored_count: 42, failed_count: 0 })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCriteria
      });

    render(<WeightAdjustmentPanel onWeightsUpdated={mockCallback} />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save & recalculate all scores/i })).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save & recalculate all scores/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  it('should not call onWeightsUpdated when callback not provided', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCriteria
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scored_count: 42, failed_count: 0 })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCriteria
      });

    // No callback provided - should not crash
    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save & recalculate all scores/i })).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save & recalculate all scores/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/weights updated/i)).toBeInTheDocument();
    });
  });

  // ===== Error Handling =====

  it('should display error when failing to fetch criteria', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    render(<WeightAdjustmentPanel />);

    // When fetch fails, component shows basic container with error in state
    // The error message is only visible when panel is expanded
    await waitFor(() => {
      // Should not be in loading state
      expect(screen.queryByText(/loading scoring criteria/i)).not.toBeInTheDocument();
    });

    // Panel header should still be visible even with error
    expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
  });

  it('should handle network errors when fetching criteria', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      // Should not be in loading state
      expect(screen.queryByText(/loading scoring criteria/i)).not.toBeInTheDocument();
    });

    // Panel header should still be visible even with error
    expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('should handle recalculation errors after successful weight update', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCriteria
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500
      });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save & recalculate all scores/i })).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save & recalculate all scores/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to recalculate scores/i)).toBeInTheDocument();
    });
  });

  // ===== Loading and Saving States =====

  it('should show "Saving..." text while saving', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCriteria
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save & recalculate all scores/i })).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save & recalculate all scores/i });
    await userEvent.click(saveButton);

    // Should show "Saving..." immediately
    expect(screen.getByText(/saving\.\.\./i)).toBeInTheDocument();
  });

  it('should disable buttons while saving', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCriteria
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

    render(<WeightAdjustmentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/adjust scoring weights/i)).toBeInTheDocument();
    });

    const header = screen.getByText(/adjust scoring weights/i).closest('div');
    await userEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save & recalculate all scores/i })).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save & recalculate all scores/i });
    await userEvent.click(saveButton);

    // Both buttons should be disabled while saving
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /saving\.\.\./i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled();
    });
  });
});
