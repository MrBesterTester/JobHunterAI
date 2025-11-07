import React, { useState, useEffect } from 'react';
import { Mail, AlertCircle, RefreshCw, Clock, User, Trash2, CheckSquare, Square } from 'lucide-react';

const API_URL = 'http://localhost:8080/api';

interface IgnoredEmail {
  email_job_id: string;
  message_id: string;
  subject: string;
  sender_email: string;
  sender_name?: string;
  received_date: string;
  body_text?: string;
  body_html?: string;
  extraction_confidence?: number;
  processing_errors?: string;
  source?: string;
}

const IgnoredTab: React.FC = () => {
  const [ignoredEmails, setIgnoredEmails] = useState<IgnoredEmail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<IgnoredEmail | null>(null);
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);

  const fetchIgnoredEmails = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/intake/ignored-emails`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ignored emails: ${response.status}`);
      }
      const data: IgnoredEmail[] = await response.json();
      setIgnoredEmails(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching ignored emails:', err);
      setError('Failed to fetch ignored emails');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIgnoredEmails();
  }, []);

  const toggleEmailSelection = (emailJobId: string): void => {
    setSelectedForDeletion(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailJobId)) {
        newSet.delete(emailJobId);
      } else {
        newSet.add(emailJobId);
      }
      return newSet;
    });
  };

  const selectAllGmailEmails = (): void => {
    const gmailEmails = ignoredEmails.filter(e => e.source === 'gmail');
    setSelectedForDeletion(new Set(gmailEmails.map(e => e.email_job_id)));
  };

  const deselectAll = (): void => {
    setSelectedForDeletion(new Set());
  };

  const handleBulkDelete = async (): Promise<void> => {
    if (selectedForDeletion.size === 0) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_URL}/email-jobs/bulk-delete-gmail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_job_ids: Array.from(selectedForDeletion) })
      });

      if (!response.ok) {
        throw new Error(`Failed to delete emails: ${response.status}`);
      }

      const result = await response.json();

      if (result.success_count > 0) {
        // Refresh the list
        await fetchIgnoredEmails();
        setSelectedForDeletion(new Set());
        setError(null);
        alert(`Successfully deleted ${result.success_count} email(s) from Gmail`);
      }

      if (result.failure_count > 0) {
        const failureMsg = result.failures.map((f: any) => `${f.id}: ${f.error}`).join('\n');
        setError(`Failed to delete ${result.failure_count} email(s):\n${failureMsg}`);
      }
    } catch (err) {
      console.error('Error deleting emails:', err);
      setError('Failed to delete emails from Gmail');
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
    }
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <RefreshCw style={{ width: '48px', height: '48px', color: '#3b82f6', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#6b7280' }}>Loading ignored emails...</p>
      </div>
    );
  }

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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>Ignored Emails</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Emails that were not processed or had low extraction confidence
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={fetchIgnoredEmails}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <RefreshCw style={{ width: '18px', height: '18px' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Bulk Action Controls */}
      {ignoredEmails.some(e => e.source === 'gmail') && (
        <div style={{
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={selectAllGmailEmails}
              disabled={ignoredEmails.filter(e => e.source === 'gmail').length === 0}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                color: '#374151',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '14px',
                opacity: ignoredEmails.filter(e => e.source === 'gmail').length === 0 ? 0.5 : 1
              }}
            >
              Select All Gmail
            </button>
            <button
              onClick={deselectAll}
              disabled={selectedForDeletion.size === 0}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                color: '#374151',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '14px',
                opacity: selectedForDeletion.size === 0 ? 0.5 : 1
              }}
            >
              Deselect All
            </button>
          </div>
          <button
            onClick={() => setShowConfirmDialog(true)}
            disabled={selectedForDeletion.size === 0 || isDeleting}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: selectedForDeletion.size === 0 || isDeleting ? '#9ca3af' : '#ef4444',
              color: 'white',
              fontWeight: '600',
              cursor: selectedForDeletion.size === 0 || isDeleting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <Trash2 style={{ width: '18px', height: '18px' }} />
            {isDeleting ? 'Deleting...' : `Delete ${selectedForDeletion.size} from Gmail`}
          </button>
        </div>
      )}

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
          <AlertCircle style={{ width: '20px', height: '20px', color: '#dc2626' }} />
          <span style={{ color: '#991b1b', fontSize: '14px' }}>{error}</span>
        </div>
      )}

      {/* Stats */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#f97316', margin: 0 }}>
              {ignoredEmails.length}
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>Total Ignored</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444', margin: 0 }}>
              {ignoredEmails.filter(e => e.extraction_confidence !== undefined && e.extraction_confidence < 0.3).length}
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>Low Confidence</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#6b7280', margin: 0 }}>
              {ignoredEmails.filter(e => e.processing_errors).length}
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>With Errors</p>
          </div>
        </div>
      </div>

      {/* Emails List */}
      {ignoredEmails.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '48px 20px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <Mail style={{ width: '64px', height: '64px', color: '#d1d5db', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280', fontSize: '16px', margin: 0 }}>No ignored emails found</p>
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: '8px 0 0 0' }}>
            All emails have been successfully processed
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ignoredEmails.map(email => (
              <div
                key={email.email_job_id}
                data-testid="ignored-email-card"
                style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  gap: '12px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                {/* Checkbox for Gmail emails only */}
                {email.source === 'gmail' && (
                  <div
                    style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '2px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleEmailSelection(email.email_job_id);
                    }}
                  >
                    {selectedForDeletion.has(email.email_job_id) ? (
                      <CheckSquare style={{ width: '20px', height: '20px', color: '#3b82f6', cursor: 'pointer' }} />
                    ) : (
                      <Square style={{ width: '20px', height: '20px', color: '#9ca3af', cursor: 'pointer' }} />
                    )}
                  </div>
                )}

                <div
                  style={{ flex: 1 }}
                  onClick={() => setSelectedEmail(selectedEmail?.email_job_id === email.email_job_id ? null : email)}
                >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Mail style={{ width: '18px', height: '18px', color: '#f97316' }} />
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                        {email.subject}
                      </h4>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <User style={{ width: '14px', height: '14px', color: '#6b7280' }} />
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>
                        {email.sender_name ? `${email.sender_name} <${email.sender_email}>` : email.sender_email}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock style={{ width: '14px', height: '14px', color: '#6b7280' }} />
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>
                        {formatRelativeTime(email.received_date)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                    {email.extraction_confidence !== undefined && (
                      <div style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: email.extraction_confidence < 0.3 ? '#fee2e2' : '#fef3c7',
                        color: email.extraction_confidence < 0.3 ? '#991b1b' : '#92400e',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Confidence: {(email.extraction_confidence * 100).toFixed(0)}%
                      </div>
                    )}

                    {email.processing_errors && (
                      <div style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        fontSize: '12px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <AlertCircle style={{ width: '12px', height: '12px' }} />
                        Has Errors
                      </div>
                    )}
                  </div>
                </div>

                {selectedEmail?.email_job_id === email.email_job_id && (
                  <div style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
                        Message ID:
                      </p>
                      <p style={{ fontSize: '12px', color: '#374151', margin: 0, fontFamily: 'monospace' }}>
                        {email.message_id}
                      </p>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
                        Received Date:
                      </p>
                      <p style={{ fontSize: '12px', color: '#374151', margin: 0 }}>
                        {new Date(email.received_date).toLocaleString()}
                      </p>
                    </div>

                    {email.processing_errors && (
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
                          Processing Errors:
                        </p>
                        <div style={{
                          fontSize: '12px',
                          color: '#dc2626',
                          backgroundColor: '#fee2e2',
                          padding: '8px',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {email.processing_errors}
                        </div>
                      </div>
                    )}

                    {(email.body_text || email.body_html) && (
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
                          Email Body:
                        </p>
                        <div style={{
                          fontSize: '13px',
                          color: '#374151',
                          backgroundColor: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          padding: '12px',
                          borderRadius: '4px',
                          maxHeight: '400px',
                          overflowY: 'auto',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.5'
                        }}>
                          {email.body_text || email.body_html}
                        </div>
                      </div>
                    )}

                    {email.extraction_confidence !== undefined && (
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
                          Why was this ignored?
                        </p>
                        <p style={{ fontSize: '12px', color: '#374151', margin: 0 }}>
                          {email.extraction_confidence < 0.3
                            ? `The LLM's confidence in extracting job information was too low (${(email.extraction_confidence * 100).toFixed(0)}%). This typically means the email does not contain a clear job posting.`
                            : 'This email was not processed due to extraction errors.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
              Confirm Deletion
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
              Move {selectedForDeletion.size} email{selectedForDeletion.size !== 1 ? 's' : ''} to Gmail trash?
              Emails will be removed from JobHunter. You can permanently delete them later in Gmail trash
              (they will be recoverable for 30 days).
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={isDeleting}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontWeight: '600',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isDeleting ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isDeleting ? '#9ca3af' : '#ef4444',
                  color: 'white',
                  fontWeight: '600',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 style={{ width: '18px', height: '18px' }} />
                    Delete from Gmail
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IgnoredTab;
