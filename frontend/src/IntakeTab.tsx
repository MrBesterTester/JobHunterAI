import React, { useState, useEffect } from 'react';
import { Mail, Briefcase, Search, RefreshCw, Settings, CheckCircle, XCircle, AlertCircle, Clock, TrendingUp } from 'lucide-react';

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
  jobs_approved: number;
  jobs_filtered: number;
  jobs_deduplicated: number;
  errors_count: number;
  error_details?: any;
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
  jobs_discovered: number;
  jobs_added: number;
  duplicates_skipped: number;
}

const IntakeTab: React.FC = () => {
  const [sources, setSources] = useState<JobSource[]>([]);
  const [logs, setLogs] = useState<IntakeLog[]>([]);
  const [sourceSummaries, setSourceSummaries] = useState<SourceSummary[]>([]);
  const [syncingSource, setSyncingSource] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResponse | null>(null);
  const [showLogDetails, setShowLogDetails] = useState<string | null>(null);

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

  // Initial data load
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      setLoading(true);
      await Promise.all([
        fetchSources(),
        fetchLogs(),
        fetchSummary()
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
      setTimeout(() => {
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
    } catch (err) {
      console.error('Error syncing Gmail:', err);
      setError('Failed to sync Gmail jobs');
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
    } catch (err) {
      console.error('Error syncing LinkedIn:', err);
      setError('Failed to sync LinkedIn jobs');
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
    } catch (err) {
      console.error('Error syncing all sources:', err);
      setError('Failed to sync all sources');
    } finally {
      setSyncingAll(false);
    }
  };

  const getSourceByType = (type: string): JobSource | undefined => {
    return sources.find(s => s.source_type === type);
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
  const linkedinSource = getSourceByName('linkedin');
  // Check if OAuth credentials actually exist
  const isGmailConnected = gmailSource ? (gmailSource.has_credentials === true) : false;
  const isGmailSyncing = syncingSource === gmailSource?.source_id;
  const isLinkedInSyncing = syncingSource === linkedinSource?.source_id;

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
        <button
          onClick={handleSyncAll}
          disabled={syncingAll || syncingSource !== null}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: syncingAll ? '#9ca3af' : '#3b82f6',
            color: 'white',
            fontWeight: '600',
            cursor: syncingAll || syncingSource !== null ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            opacity: syncingAll || syncingSource !== null ? 0.6 : 1
          }}
        >
          <RefreshCw style={{ width: '18px', height: '18px', animation: syncingAll ? 'spin 1s linear infinite' : 'none' }} />
          {syncingAll ? 'Syncing All...' : 'Sync All Sources'}
        </button>
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
          backgroundColor: '#d1fae5',
          border: '1px solid #10b981',
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle style={{ width: '20px', height: '20px', color: '#059669' }} />
          <span style={{ color: '#065f46', fontSize: '14px' }}>
            {lastSyncResult.message} - {lastSyncResult.jobs_added} new jobs added, {lastSyncResult.duplicates_skipped} duplicates skipped
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

        {/* Indeed Integration Card */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          opacity: 0.6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Search style={{ width: '32px', height: '32px', color: '#2164f3' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Indeed Job Discovery</h3>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#9ca3af'
              }} />
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                Status: Not Implemented
              </span>
            </div>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '12px 0' }}>
              Coming Soon: Indeed API integration planned for Phase 4.1
            </p>
          </div>

          <button
            disabled
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#f3f4f6',
              color: '#9ca3af',
              fontWeight: '500',
              cursor: 'not-allowed',
              fontSize: '14px'
            }}
          >
            Request Implementation
          </button>
        </div>
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
                      {log.jobs_discovered} discovered, {log.jobs_approved} approved
                    </p>
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
                    {log.error_details && (
                      <p style={{ color: '#dc2626' }}><strong>Error:</strong> {JSON.stringify(log.error_details)}</p>
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
