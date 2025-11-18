import React, { useState, useEffect, useRef } from 'react';
import { Mail, Briefcase, Search, RefreshCw, Settings, CheckCircle, XCircle, AlertCircle, Clock, TrendingUp, Filter } from 'lucide-react';

const API_URL = 'http://localhost:8080/api';

interface JobSource {
  source_id: string;
  source_name: string;
  source_type: string;
  is_active: boolean;
  last_sync: string | null;
  sync_interval_minutes: number;
  auth_required: boolean;
  auth_type: string | null;
  has_credentials?: boolean;
}

interface IntakeLog {
  log_id: string;
  source_id: string;
  sync_status: string;
  jobs_discovered: number;
  jobs_failed_processing: number;
  jobs_duplicated: number;
  jobs_filtered_out: number;
  jobs_created: number;
  jobs_approved: number; // DEPRECATED
  jobs_filtered: number; // DEPRECATED
  jobs_deduplicated: number; // DEPRECATED
  errors_count: number;
  error_details?: any;
  validation_error?: string;
  sync_started_at: string;
  sync_completed_at?: string;
  created_at: string;
}

interface SourceSummary {
  source_name: string;
  source_type: string;
  is_active: boolean;
  sync_count: number;
  total_discovered: number;
  total_approved: number;
  avg_per_sync: number;
  last_sync: string | null;
  last_sync_attempt: string | null;
}


interface GmailAuthResponse {
  auth_url: string;
}

interface SyncResponse {
  message: string;
  metrics?: {
    jobs_discovered: number;
    jobs_failed_processing: number;
    jobs_filtered_out: number;
    jobs_duplicated: number;
    jobs_created: number;
  };
  validation_error?: string | null;
  // Legacy fields for backward compatibility
  jobs_discovered?: number;
  jobs_added?: number;
  duplicates_skipped?: number;
}

interface ExtractionPrompt {
  prompt_id: string;
  prompt_name: string;
  prompt_type: string;
  prompt_content: string;
  is_active: boolean;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

interface IntakeTabProps {
  onJobsUpdated?: () => void;
}

interface RefilterResponse {
  message: string;
  jobs_refiltered: number;
  status_changes: {
    to_new: number;
    to_filtered: number;
  };
}

const IntakeTab: React.FC<IntakeTabProps> = ({ onJobsUpdated }) => {
  const [sources, setSources] = useState<JobSource[]>([]);
  const [logs, setLogs] = useState<IntakeLog[]>([]);
  const [sourceSummaries, setSourceSummaries] = useState<SourceSummary[]>([]);
  const [syncingSource, setSyncingSource] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResponse | null>(null);
  const [showLogDetails, setShowLogDetails] = useState<string | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState<boolean>(false);
  const [extractionPrompt, setExtractionPrompt] = useState<ExtractionPrompt | null>(null);
  const [promptContent, setPromptContent] = useState<string>('');
  const [promptNotes, setPromptNotes] = useState<string>('');
  const [savingPrompt, setSavingPrompt] = useState<boolean>(false);
  const [refiltering, setRefiltering] = useState<boolean>(false);
  const [refilterScope, setRefilterScope] = useState<string>('last_sync');
  const [lastRefilterResult, setLastRefilterResult] = useState<RefilterResponse | null>(null);
  const [microsoftFolderInfo, setMicrosoftFolderInfo] = useState<{
    hasJobOps: boolean;
    unreadCount?: number;
    totalCount?: number;
  } | null>(null);
  // Phase 4.2: RapidAPI pagination state
  const [rapidapiPage, setRapidapiPage] = useState<number>(1);
  const [rapidapiEndOfResults, setRapidapiEndOfResults] = useState<boolean>(false);
  const [resettingPagination, setResettingPagination] = useState<boolean>(false);

  // Ref to track setTimeout for cleanup (ISSUE-021 Option iii)
  const gmailAuthTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch job sources
  const fetchSources = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/job-sources`);
      if (!response.ok) {
        throw new Error(`Failed to fetch sources: ${response.status}`);
      }
      const data: JobSource[] = await response.json();
      setSources(data);
    } catch (err) {
      console.error('Error fetching sources:', err);
      setError('Failed to fetch job sources');
    }
  };

  // Fetch intake logs
  const fetchLogs = async (limit: number = 20): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/intake/logs?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.status}`);
      }
      const data: IntakeLog[] = await response.json();
      setLogs(data);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  // Fetch intake summary
  const fetchSummary = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/intake/summary`);
      if (!response.ok) {
        throw new Error(`Failed to fetch summary: ${response.status}`);
      }
      const data: SourceSummary[] = await response.json();
      setSourceSummaries(data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  // Fetch Microsoft folder information
  const fetchMicrosoftFolderInfo = async (): Promise<void> => {
    const microsoftSource = sources.find(s => s.source_name === 'microsoft_email');
    if (!microsoftSource) return;

    try {
      const response = await fetch(`${API_URL}/email/microsoft/folders`);
      if (!response.ok) {
        // If auth fails or endpoint not available, silently skip
        if (response.status === 404 || response.status === 401) {
          setMicrosoftFolderInfo(null);
          return;
        }
        throw new Error(`Failed to fetch folders: ${response.status}`);
      }
      const data: {
        has_jobops: boolean;
        jobops_folder?: {
          unread_item_count?: number;
          total_item_count?: number;
        };
      } = await response.json();

      setMicrosoftFolderInfo({
        hasJobOps: data.has_jobops,
        unreadCount: data.jobops_folder?.unread_item_count,
        totalCount: data.jobops_folder?.total_item_count
      });
    } catch (err) {
      console.error('Error fetching Microsoft folder info:', err);
      setMicrosoftFolderInfo(null);
    }
  };

  // Fetch extraction prompt
  const fetchExtractionPrompt = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/extraction/prompts`);
      if (!response.ok) {
        throw new Error(`Failed to fetch extraction prompt: ${response.status}`);
      }
      const data: ExtractionPrompt = await response.json();
      setExtractionPrompt(data);
      setPromptContent(data.prompt_content);
      setPromptNotes(data.notes || '');
    } catch (err) {
      console.error('Error fetching extraction prompt:', err);
    }
  };

  // Phase 4.2: Fetch RapidAPI pagination state
  const fetchRapidAPIPaginationState = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/intake/rapidapi/state`);
      if (!response.ok) {
        throw new Error(`Failed to fetch RapidAPI state: ${response.status}`);
      }
      const data: { current_page: number; is_active: boolean } = await response.json();
      setRapidapiPage(data.current_page);
    } catch (err) {
      console.error('Error fetching RapidAPI pagination state:', err);
    }
  };

  // Phase 4.2: Reset RapidAPI pagination to page 1
  const handleResetRapidAPIPagination = async (): Promise<void> => {
    setResettingPagination(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/intake/rapidapi/reset-pagination`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Reset failed: ${response.status}`);
      }

      await fetchRapidAPIPaginationState();
      setRapidapiEndOfResults(false);
      alert('RapidAPI pagination reset to page 1');
    } catch (err) {
      console.error('Error resetting RapidAPI pagination:', err);
      setError('Failed to reset RapidAPI pagination');
    } finally {
      setResettingPagination(false);
    }
  };

  // Update extraction prompt
  const updateExtractionPrompt = async (): Promise<void> => {
    setSavingPrompt(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/extraction/prompts/active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_content: promptContent,
          notes: promptNotes || null
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update prompt: ${response.status}`);
      }

      await fetchExtractionPrompt();
      setShowPromptEditor(false);
      alert('Prompt updated successfully! The new prompt will be used for future job extractions.');
    } catch (err) {
      console.error('Error updating prompt:', err);
      setError('Failed to update extraction prompt');
    } finally {
      setSavingPrompt(false);
    }
  };

  // Initial data load
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      setLoading(true);
      await Promise.all([
        fetchSources(),
        fetchLogs(),
        fetchSummary(),
        fetchExtractionPrompt(),
        fetchRapidAPIPaginationState() // Phase 4.2
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Auto-refresh logs during active sync
  useEffect(() => {
    if (syncingSource || syncingAll) {
      const interval = setInterval(() => {
        fetchLogs();
        fetchSummary();
      }, 5000); // Refresh every 5 seconds during sync
      return () => clearInterval(interval);
    }
  }, [syncingSource, syncingAll]);

  // Fetch Microsoft folder info when sources are loaded and Microsoft is connected
  useEffect(() => {
    const microsoftSource = sources.find(s => s.source_name === 'microsoft_email');
    if (microsoftSource) {
      fetchMicrosoftFolderInfo();
    }
  }, [sources]);

  // Cleanup setTimeout on unmount (ISSUE-021 Option iii)
  useEffect(() => {
    return () => {
      if (gmailAuthTimeoutRef.current) {
        clearTimeout(gmailAuthTimeoutRef.current);
      }
    };
  }, []);

  // Gmail authentication
  const handleGmailAuth = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/auth/gmail/url`);
      if (!response.ok) {
        throw new Error(`Failed to get auth URL: ${response.status}`);
      }
      const data: GmailAuthResponse = await response.json();
      window.open(data.auth_url, '_blank', 'width=600,height=600');

      // Refresh sources after a delay to check connection status
      // Store timeout ID for cleanup (ISSUE-021 Option iii)
      gmailAuthTimeoutRef.current = setTimeout(() => {
        fetchSources();
      }, 3000);
    } catch (err) {
      console.error('Error initiating Gmail auth:', err);
      setError('Failed to initiate Gmail authentication');
    }
  };

  // Gmail sync
  const handleGmailSync = async (): Promise<void> => {
    const gmailSource = sources.find(s => s.source_name === 'gmail');
    if (!gmailSource) return;

    setSyncingSource(gmailSource.source_id);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/intake/gmail/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const data: SyncResponse = await response.json();
      setLastSyncResult(data);

      // Refresh all data
      await Promise.all([
        fetchSources(),
        fetchLogs(),
        fetchSummary()
      ]);

      // Notify parent component to refresh jobs list
      if (onJobsUpdated) {
        onJobsUpdated();
      }
    } catch (err) {
      console.error('Error syncing Gmail:', err);
      setError('Failed to sync Gmail jobs');
    } finally {
      setSyncingSource(null);
    }
  };

  // Microsoft authentication
  const handleMicrosoftAuth = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/email/microsoft/auth-url`);
      if (!response.ok) {
        throw new Error(`Failed to get auth URL: ${response.status}`);
      }
      const data: GmailAuthResponse = await response.json();
      window.open(data.auth_url, '_blank', 'width=600,height=600');

      // Refresh sources after a delay to check connection status
      setTimeout(() => {
        fetchSources();
      }, 3000);
    } catch (err) {
      console.error('Error initiating Microsoft auth:', err);
      setError('Failed to initiate Microsoft authentication');
    }
  };

  // Microsoft sync
  const handleMicrosoftSync = async (): Promise<void> => {
    const microsoftSource = sources.find(s => s.source_name === 'microsoft_email');
    if (!microsoftSource) return;

    setSyncingSource(microsoftSource.source_id);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/intake/microsoft/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const data: SyncResponse = await response.json();
      setLastSyncResult(data);

      // Refresh all data
      await Promise.all([
        fetchSources(),
        fetchLogs(),
        fetchSummary(),
        fetchMicrosoftFolderInfo()
      ]);

      // Notify parent component to refresh jobs list
      if (onJobsUpdated) {
        onJobsUpdated();
      }
    } catch (err) {
      console.error('Error syncing Microsoft:', err);
      setError('Failed to sync Microsoft jobs');
    } finally {
      setSyncingSource(null);
    }
  };

  // LinkedIn sync
  const handleLinkedInSync = async (): Promise<void> => {
    const linkedinSource = sources.find(s => s.source_type === 'linkedin');
    if (!linkedinSource) return;

    setSyncingSource(linkedinSource.source_id);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/intake/linkedin/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const data: SyncResponse = await response.json();
      setLastSyncResult(data);

      // Refresh all data
      await Promise.all([
        fetchSources(),
        fetchLogs(),
        fetchSummary()
      ]);

      // Notify parent component to refresh jobs list
      if (onJobsUpdated) {
        onJobsUpdated();
      }
    } catch (err) {
      console.error('Error syncing LinkedIn:', err);
      setError('Failed to sync LinkedIn jobs');
    } finally {
      setSyncingSource(null);
    }
  };

  // RapidAPI (JSearch) sync
  const handleRapidAPISync = async (): Promise<void> => {
    const rapidapiSource = sources.find(s => s.source_name === 'rapidapi');
    if (!rapidapiSource) return;

    setSyncingSource(rapidapiSource.source_id);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/intake/rapidapi/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const data: any = await response.json();
      setLastSyncResult(data);

      // Phase 4.2: Update pagination state from response
      if (data.page_synced !== undefined) {
        setRapidapiPage(data.next_page || 1);
      }
      if (data.end_of_results !== undefined) {
        setRapidapiEndOfResults(data.end_of_results);
      }

      // Refresh all data
      await Promise.all([
        fetchSources(),
        fetchLogs(),
        fetchSummary(),
        fetchRapidAPIPaginationState() // Phase 4.2: Get latest page state
      ]);

      // Notify parent component to refresh jobs list
      if (onJobsUpdated) {
        onJobsUpdated();
      }
    } catch (err) {
      console.error('Error syncing RapidAPI:', err);
      setError('Failed to sync RapidAPI jobs');
    } finally {
      setSyncingSource(null);
    }
  };

  // Sync all sources
  const handleSyncAll = async (): Promise<void> => {
    setSyncingAll(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/intake/sync-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Sync all failed: ${response.status}`);
      }

      const data: SyncResponse = await response.json();
      setLastSyncResult(data);

      // Refresh all data
      await Promise.all([
        fetchSources(),
        fetchLogs(),
        fetchSummary()
      ]);

      // Notify parent component to refresh jobs list
      if (onJobsUpdated) {
        onJobsUpdated();
      }
    } catch (err) {
      console.error('Error syncing all sources:', err);
      setError('Failed to sync all sources');
    } finally {
      setSyncingAll(false);
    }
  };

  // Re-filter existing jobs
  const handleRefilter = async (): Promise<void> => {
    setRefiltering(true);
    setError(null);
    setLastRefilterResult(null);

    try {
      const response = await fetch(`${API_URL}/jobs/refilter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: refilterScope })
      });

      if (!response.ok) {
        throw new Error(`Re-filter failed: ${response.status}`);
      }

      const data: RefilterResponse = await response.json();
      setLastRefilterResult(data);

      // Refresh all data
      await Promise.all([
        fetchLogs(),
        fetchSummary()
      ]);

      // Notify parent component to refresh jobs list
      if (onJobsUpdated) {
        onJobsUpdated();
      }
    } catch (err) {
      console.error('Error re-filtering jobs:', err);
      setError('Failed to re-filter jobs');
    } finally {
      setRefiltering(false);
    }
  };

  const getSourceByName = (name: string): JobSource | undefined => {
    return sources.find(s => s.source_name === name);
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  const getStatusIcon = (status: string): JSX.Element => {
    switch (status) {
      case 'completed':
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
      case 'failure':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <RefreshCw style={{ width: '48px', height: '48px', color: '#3b82f6', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#6b7280' }}>Loading intake sources...</p>
      </div>
    );
  }

  // Use source_name to identify specific sources, not source_type
  // This allows multiple sources of the same type (e.g., Gmail, Outlook, Yahoo all have type 'email')
  const gmailSource = getSourceByName('gmail');
  const microsoftSource = getSourceByName('microsoft_email');
  const linkedinSource = getSourceByName('linkedin');
  const rapidapiSource = getSourceByName('rapidapi');
  // Check if OAuth credentials actually exist
  const isGmailConnected = gmailSource ? (gmailSource.has_credentials === true) : false;
  const isMicrosoftConnected = microsoftSource ? (microsoftSource.has_credentials === true) : false;
  const isGmailSyncing = syncingSource === gmailSource?.source_id;
  const isMicrosoftSyncing = syncingSource === microsoftSource?.source_id;
  const isLinkedInSyncing = syncingSource === linkedinSource?.source_id;
  const isRapidAPISyncing = syncingSource === rapidapiSource?.source_id;
  // RapidAPI is considered "connected" if the source exists and is active
  const isRapidAPIConnected = rapidapiSource ? rapidapiSource.is_active : false;

  return (
    <div style={{ width: '100%' }}>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Header with Sync All button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>Job Intake Sources</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Configure and manage automated job discovery from multiple sources
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Re-filter controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={refilterScope}
              onChange={(e) => setRefilterScope(e.target.value)}
              disabled={refiltering}
              aria-label="Re-filter scope selection"
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                color: '#374151',
                fontSize: '14px',
                cursor: refiltering ? 'not-allowed' : 'pointer',
                opacity: refiltering ? 0.6 : 1
              }}
            >
              <option value="last_sync">Last Sync Only</option>
              <option value="all_filtered">All Filtered Jobs</option>
            </select>
            <button
              data-testid="refilter-jobs-button"
              onClick={handleRefilter}
              disabled={refiltering || syncingAll || syncingSource !== null}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: refiltering ? '#9ca3af' : '#8b5cf6',
                color: 'white',
                fontWeight: '600',
                cursor: refiltering || syncingAll || syncingSource !== null ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                opacity: refiltering || syncingAll || syncingSource !== null ? 0.6 : 1
              }}
            >
              <Filter style={{ width: '18px', height: '18px', animation: refiltering ? 'spin 1s linear infinite' : 'none' }} />
              {refiltering ? 'Re-filtering...' : 'Re-filter Jobs'}
            </button>
          </div>
          <button
            data-testid="sync-all-sources-button"
            onClick={handleSyncAll}
            disabled={syncingAll || syncingSource !== null || refiltering}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: syncingAll ? '#9ca3af' : '#3b82f6',
              color: 'white',
              fontWeight: '600',
              cursor: syncingAll || syncingSource !== null || refiltering ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              opacity: syncingAll || syncingSource !== null || refiltering ? 0.6 : 1
            }}
          >
            <RefreshCw style={{ width: '18px', height: '18px', animation: syncingAll ? 'spin 1s linear infinite' : 'none' }} />
            {syncingAll ? 'Syncing All...' : 'Sync All Sources'}
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <XCircle style={{ width: '20px', height: '20px', color: '#dc2626' }} />
          <span style={{ color: '#991b1b', fontSize: '14px' }}>{error}</span>
        </div>
      )}

      {/* Success notification */}
      {lastSyncResult && !syncingSource && !syncingAll && (
        <div style={{
          backgroundColor: lastSyncResult.validation_error ? '#fee2e2' : '#d1fae5',
          border: `1px solid ${lastSyncResult.validation_error ? '#ef4444' : '#10b981'}`,
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: lastSyncResult.validation_error ? '8px' : '0' }}>
            {lastSyncResult.validation_error ? (
              <XCircle style={{ width: '20px', height: '20px', color: '#dc2626' }} />
            ) : (
              <CheckCircle style={{ width: '20px', height: '20px', color: '#059669' }} />
            )}
            <span style={{ color: lastSyncResult.validation_error ? '#991b1b' : '#065f46', fontSize: '14px' }}>
              {lastSyncResult.message}
              {lastSyncResult.metrics && (
                <> - Discovered: {lastSyncResult.metrics.jobs_discovered}, Failed: {lastSyncResult.metrics.jobs_failed_processing}, Filtered: {lastSyncResult.metrics.jobs_created}, Duplicated: {lastSyncResult.metrics.jobs_duplicated}, Ignored: {lastSyncResult.metrics.jobs_filtered_out}</>
              )}
              {!lastSyncResult.metrics && lastSyncResult.jobs_added !== undefined && (
                <> - {lastSyncResult.jobs_added} new jobs added, {lastSyncResult.duplicates_skipped} duplicates skipped</>
              )}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {lastSyncResult.validation_error ? (
              <>
                <AlertCircle style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                <span style={{ color: '#991b1b', fontSize: '13px', fontWeight: '600' }}>
                  ⚠️ MECE Check Failed: {lastSyncResult.validation_error}
                </span>
              </>
            ) : (
              <>
                <CheckCircle style={{ width: '16px', height: '16px', color: '#059669' }} />
                <span style={{ color: '#065f46', fontSize: '13px', fontWeight: '600' }}>
                  ✓ MECE Check Passed (all emails accounted for)
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Re-filter success notification */}
      {lastRefilterResult && !refiltering && (
        <div style={{
          backgroundColor: '#e0e7ff',
          border: '1px solid #8b5cf6',
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle style={{ width: '20px', height: '20px', color: '#7c3aed' }} />
          <span style={{ color: '#5b21b6', fontSize: '14px' }}>
            {lastRefilterResult.message} - {lastRefilterResult.jobs_refiltered} jobs refiltered,
            {' '}{lastRefilterResult.status_changes.to_new} moved to New,
            {' '}{lastRefilterResult.status_changes.to_filtered} remained Filtered
          </span>
        </div>
      )}

      {/* Integration Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>

        {/* Gmail Integration Card */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Mail style={{ width: '32px', height: '32px', color: '#ea4335' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Gmail Job Discovery</h3>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isGmailConnected ? '#10b981' : '#9ca3af'
              }} />
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                Status: {isGmailConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            {gmailSource?.last_sync && (
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0' }}>
                Last Sync: {formatRelativeTime(gmailSource.last_sync)}
              </p>
            )}
            {gmailSource && (
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0' }}>
                Auto-sync: {gmailSource.is_active ? `Every ${gmailSource.sync_interval_minutes} minutes` : 'Disabled'}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {!isGmailConnected ? (
              <button
                data-testid="gmail-auth-button"
                onClick={handleGmailAuth}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: '1px solid #3b82f6',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Authenticate with Gmail
              </button>
            ) : (
              <button
                data-testid="gmail-sync-button"
                onClick={handleGmailSync}
                disabled={isGmailSyncing || syncingAll}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isGmailSyncing || syncingAll ? '#9ca3af' : '#10b981',
                  color: 'white',
                  fontWeight: '500',
                  cursor: isGmailSyncing || syncingAll ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  opacity: isGmailSyncing || syncingAll ? 0.6 : 1
                }}
              >
                <RefreshCw style={{ width: '16px', height: '16px', animation: isGmailSyncing ? 'spin 1s linear infinite' : 'none' }} />
                {isGmailSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
            <button
              data-testid="gmail-settings-button"
              onClick={handleGmailAuth}
              title="Re-authenticate Gmail"
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <Settings style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>

        {/* Microsoft Email Integration Card */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Mail style={{ width: '32px', height: '32px', color: '#0078d4' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Microsoft Email (sam@samkirk.com)</h3>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isMicrosoftConnected ? '#10b981' : '#9ca3af'
              }} />
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                Status: {isMicrosoftConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            {microsoftSource?.last_sync && (
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0' }}>
                Last Sync: {formatRelativeTime(microsoftSource.last_sync)}
              </p>
            )}
            {microsoftSource && (
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0' }}>
                Auto-sync: {microsoftSource.is_active ? `Every ${microsoftSource.sync_interval_minutes} minutes` : 'Disabled'}
              </p>
            )}
            {isMicrosoftConnected && microsoftFolderInfo && (
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f0f9ff', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e40af' }}>
                    JobOps Folder: {microsoftFolderInfo.hasJobOps ? '✓ Ready' : '⚠ Creating...'}
                  </span>
                </div>
                {microsoftFolderInfo.hasJobOps && microsoftFolderInfo.unreadCount !== undefined && (
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                    {microsoftFolderInfo.unreadCount} unread message{microsoftFolderInfo.unreadCount !== 1 ? 's' : ''}
                    {microsoftFolderInfo.totalCount !== undefined && ` (${microsoftFolderInfo.totalCount} total)`}
                  </p>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {!isMicrosoftConnected ? (
              <button
                data-testid="microsoft-auth-button"
                onClick={handleMicrosoftAuth}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: '1px solid #0078d4',
                  backgroundColor: '#0078d4',
                  color: 'white',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Authenticate with Microsoft
              </button>
            ) : (
              <button
                data-testid="microsoft-sync-button"
                onClick={handleMicrosoftSync}
                disabled={isMicrosoftSyncing || syncingAll}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isMicrosoftSyncing || syncingAll ? '#9ca3af' : '#10b981',
                  color: 'white',
                  fontWeight: '500',
                  cursor: isMicrosoftSyncing || syncingAll ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  opacity: isMicrosoftSyncing || syncingAll ? 0.6 : 1
                }}
              >
                <RefreshCw style={{ width: '16px', height: '16px', animation: isMicrosoftSyncing ? 'spin 1s linear infinite' : 'none' }} />
                {isMicrosoftSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
            <button
              data-testid="microsoft-settings-button"
              onClick={handleMicrosoftAuth}
              title="Re-authenticate Microsoft"
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <Settings style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>

        {/* LinkedIn Integration Card */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Briefcase style={{ width: '32px', height: '32px', color: '#0a66c2' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>LinkedIn Job Discovery</h3>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#f59e0b'
              }} />
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                Status: Mock Implementation
              </span>
            </div>
            {linkedinSource?.last_sync ? (
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0' }}>
                Last Sync: {formatRelativeTime(linkedinSource.last_sync)}
              </p>
            ) : (
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0' }}>
                Last Sync: Never
              </p>
            )}
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0' }}>
              Auto-sync: Disabled (requires LinkedIn API)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              data-testid="linkedin-sync-button"
              onClick={handleLinkedInSync}
              disabled={isLinkedInSyncing || syncingAll}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isLinkedInSyncing || syncingAll ? '#9ca3af' : '#0a66c2',
                color: 'white',
                fontWeight: '500',
                cursor: isLinkedInSyncing || syncingAll ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                opacity: isLinkedInSyncing || syncingAll ? 0.6 : 1
              }}
            >
              <RefreshCw style={{ width: '16px', height: '16px', animation: isLinkedInSyncing ? 'spin 1s linear infinite' : 'none' }} />
              {isLinkedInSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              data-testid="linkedin-learn-more-button"
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Learn More
            </button>
          </div>

          <div style={{
            marginTop: '12px',
            padding: '8px',
            backgroundColor: '#fef3c7',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#92400e'
          }}>
            Currently using mock data for testing
          </div>
        </div>

        {/* RapidAPI JSearch Integration Card */}
        <div data-testid="rapidapi-card" style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Search style={{ width: '32px', height: '32px', color: '#8b5cf6' }} />
            <div>
              <h3 data-testid="rapidapi-heading" style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>RapidAPI JSearch</h3>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>
                Aggregates LinkedIn, Indeed, Glassdoor + 30 more
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isRapidAPIConnected ? '#10b981' : '#9ca3af'
              }} />
              <span data-testid="rapidapi-status" style={{ fontSize: '14px', color: '#6b7280' }}>
                Status: {isRapidAPIConnected ? 'Active' : 'Inactive'}
              </span>
            </div>
            {rapidapiSource?.last_sync ? (
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0' }}>
                Last Sync: {formatRelativeTime(rapidapiSource.last_sync)}
              </p>
            ) : (
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0' }}>
                Last Sync: Never
              </p>
            )}
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0' }}>
              Limit: 10 jobs per sync
            </p>
            {/* Phase 4.2: Display current page */}
            <p data-testid="rapidapi-current-page" style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0' }}>
              Current Page: {rapidapiPage}
              {rapidapiEndOfResults && <span style={{ color: '#f97316', marginLeft: '8px' }}>⚠ End of results</span>}
            </p>
            {rapidapiSource && (
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0' }}>
                Auto-sync: {rapidapiSource.is_active ? `Every ${rapidapiSource.sync_interval_minutes} minutes` : 'Disabled'}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
            <button
              data-testid="rapidapi-sync-button"
              onClick={handleRapidAPISync}
              disabled={isRapidAPISyncing || syncingAll || !isRapidAPIConnected}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isRapidAPISyncing || syncingAll || !isRapidAPIConnected ? '#9ca3af' : '#8b5cf6',
                color: 'white',
                fontWeight: '500',
                cursor: isRapidAPISyncing || syncingAll || !isRapidAPIConnected ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                opacity: isRapidAPISyncing || syncingAll || !isRapidAPIConnected ? 0.6 : 1
              }}
            >
              <RefreshCw style={{ width: '16px', height: '16px', animation: isRapidAPISyncing ? 'spin 1s linear infinite' : 'none' }} />
              {isRapidAPISyncing ? 'Syncing...' : 'Sync Now'}
            </button>
            </div>

            {/* Phase 4.2: Reset pagination button */}
            {isRapidAPIConnected && rapidapiPage > 1 && (
              <button
                data-testid="rapidapi-reset-button"
                onClick={handleResetRapidAPIPagination}
                disabled={resettingPagination || isRapidAPISyncing || syncingAll}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #8b5cf6',
                  backgroundColor: 'white',
                  color: '#8b5cf6',
                  fontWeight: '500',
                  cursor: resettingPagination || isRapidAPISyncing || syncingAll ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  opacity: resettingPagination || isRapidAPISyncing || syncingAll ? 0.6 : 1
                }}
              >
                {resettingPagination ? 'Resetting...' : 'Reset to Page 1'}
              </button>
            )}
          </div>

          {!isRapidAPIConnected && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              backgroundColor: '#fee2e2',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#991b1b'
            }}>
              Configure RAPIDAPI_KEY in backend/.env to enable
            </div>
          )}
        </div>
      </div>

      {/* LLM Extraction Prompt Editor */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>LLM Job Extraction Prompt</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
              Customize the prompt used by Claude Haiku to extract job information from emails
            </p>
          </div>
          <button
            data-testid="prompt-editor-toggle-button"
            onClick={() => setShowPromptEditor(!showPromptEditor)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #3b82f6',
              backgroundColor: showPromptEditor ? '#eff6ff' : 'white',
              color: '#3b82f6',
              fontWeight: '500',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {showPromptEditor ? 'Hide Editor' : 'Edit Prompt'}
          </button>
        </div>

        {extractionPrompt && !showPromptEditor && (
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            <p><strong>Active Version:</strong> v{extractionPrompt.version} - {extractionPrompt.prompt_name}</p>
            <p><strong>Last Updated:</strong> {new Date(extractionPrompt.updated_at).toLocaleString()}</p>
            {extractionPrompt.notes && <p><strong>Notes:</strong> {extractionPrompt.notes}</p>}
          </div>
        )}

        {showPromptEditor && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Prompt Content
              </label>
              <textarea
                value={promptContent}
                onChange={(e) => setPromptContent(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '400px',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
                placeholder="Enter the prompt for job extraction..."
              />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                This prompt is sent to Claude Haiku along with the email subject and body to extract job information.
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Notes (Optional)
              </label>
              <input
                type="text"
                value={promptNotes}
                onChange={(e) => setPromptNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px'
                }}
                placeholder="Description of changes..."
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                data-testid="prompt-editor-cancel-button"
                onClick={() => {
                  setPromptContent(extractionPrompt?.prompt_content || '');
                  setPromptNotes(extractionPrompt?.notes || '');
                  setShowPromptEditor(false);
                }}
                disabled={savingPrompt}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  color: '#6b7280',
                  cursor: savingPrompt ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: savingPrompt ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                data-testid="prompt-editor-save-button"
                onClick={updateExtractionPrompt}
                disabled={savingPrompt || !promptContent.trim()}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: savingPrompt || !promptContent.trim() ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  fontWeight: '500',
                  cursor: savingPrompt || !promptContent.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: savingPrompt || !promptContent.trim() ? 0.6 : 1
                }}
              >
                {savingPrompt ? 'Saving...' : 'Save Prompt'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Activity Log Section */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
          Recent Intake Activity
        </h3>

        {logs.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '24px 0' }}>
            No intake activity yet. Try syncing a source to get started.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {logs.slice(0, 10).map(log => (
              <div
                key={log.log_id}
                style={{
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer'
                }}
                onClick={() => setShowLogDetails(showLogDetails === log.log_id ? null : log.log_id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {getStatusIcon(log.sync_status)}
                    <div>
                      <p style={{ fontWeight: '500', margin: 0, fontSize: '14px' }}>
                        Sync - {sources.find(s => s.source_id === log.source_id)?.source_name || 'Unknown Source'}
                      </p>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                        {formatRelativeTime(log.sync_started_at)}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>
                      {log.jobs_discovered} Total
                    </p>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      <span style={{ color: '#10b981' }}>✓ {log.jobs_created || 0} processed</span>
                      {' • '}
                      <span style={{ color: '#f97316' }}>⚠ {log.jobs_filtered_out || 0} filtered</span>
                      {' • '}
                      <span style={{ color: '#f59e0b' }}>⊕ {log.jobs_duplicated || 0} dupes</span>
                      {' • '}
                      <span style={{ color: '#ef4444' }}>✗ {log.jobs_failed_processing || 0} failed</span>
                    </div>
                  </div>
                </div>

                {showLogDetails === log.log_id && (
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #e5e7eb',
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    <p><strong>Started:</strong> {new Date(log.sync_started_at).toLocaleString()}</p>
                    {log.sync_completed_at && (
                      <p><strong>Completed:</strong> {new Date(log.sync_completed_at).toLocaleString()}</p>
                    )}
                    <p><strong>Total Discovered:</strong> {log.jobs_discovered}</p>
                    <p style={{ color: '#10b981' }}><strong>✓ Jobs Processed:</strong> {log.jobs_created || 0}</p>
                    <p style={{ color: '#f97316' }}><strong>⚠ Jobs Filtered Out:</strong> {log.jobs_filtered_out || 0}</p>
                    <p style={{ color: '#f59e0b' }}><strong>⊕ Duplicates Skipped:</strong> {log.jobs_duplicated || 0}</p>
                    <p style={{ color: '#ef4444' }}><strong>✗ Failed Processing:</strong> {log.jobs_failed_processing || 0}</p>
                    {log.validation_error && (
                      <p style={{ color: '#dc2626', fontWeight: 'bold' }}><strong>⚠️  Validation Error:</strong> {log.validation_error}</p>
                    )}
                    {log.error_details && (
                      <p style={{ color: '#dc2626' }}><strong>Error Details:</strong> {JSON.stringify(log.error_details)}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statistics Dashboard */}
      {sourceSummaries.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp style={{ width: '20px', height: '20px', color: '#10b981' }} />
            Intake Performance
          </h3>

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>By Source</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sourceSummaries.map(summary => {
                const totalDiscovered = sourceSummaries.reduce((sum, s) => sum + s.total_discovered, 0);
                const percentage = totalDiscovered > 0 ? ((summary.total_discovered / totalDiscovered) * 100).toFixed(0) : '0';
                return (
                  <div key={summary.source_name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500', textTransform: 'capitalize' }}>
                        {summary.source_name}
                      </span>
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>
                        {summary.total_discovered} discovered, {summary.total_approved} approved ({percentage}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        backgroundColor: '#3b82f6',
                        borderRadius: '4px'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {sourceSummaries.map(summary => (
              <div key={summary.source_name} style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'capitalize' }}>{summary.source_name}</p>
                <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6', margin: '4px 0' }}>
                  {summary.total_discovered} jobs
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  {summary.sync_count} syncs, avg {summary.avg_per_sync.toFixed(1)} per sync
                </p>
                {summary.last_sync && (
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                    Last: {formatRelativeTime(summary.last_sync)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IntakeTab;
