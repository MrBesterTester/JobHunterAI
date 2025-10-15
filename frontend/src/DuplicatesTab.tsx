import React, { useState, useEffect } from 'react';
import { Mail, Copy, RefreshCw, Clock, User } from 'lucide-react';

const API_URL = 'http://localhost:8080/api';

interface DuplicateEmail {
  email_job_id: string;
  message_id: string;
  subject: string;
  sender_email: string;
  sender_name?: string;
  received_date: string;
  body_text?: string;
  body_html?: string;
  extraction_confidence?: number;
  processing_errors?: any;
}

const DuplicatesTab: React.FC = () => {
  const [duplicateEmails, setDuplicateEmails] = useState<DuplicateEmail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<DuplicateEmail | null>(null);

  const fetchDuplicateEmails = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/intake/duplicate-emails`);
      if (!response.ok) {
        throw new Error(`Failed to fetch duplicate emails: ${response.status}`);
      }
      const data: DuplicateEmail[] = await response.json();
      setDuplicateEmails(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching duplicate emails:', err);
      setError('Failed to fetch duplicate emails');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicateEmails();
  }, []);

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
        <RefreshCw style={{ width: '48px', height: '48px', color: '#f59e0b', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#6b7280' }}>Loading duplicate emails...</p>
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
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>Duplicate Emails</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Emails that matched existing job postings in the database
          </p>
        </div>
        <button
          onClick={fetchDuplicateEmails}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#f59e0b',
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

      {/* Error display */}
      {error && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Copy style={{ width: '20px', height: '20px', color: '#d97706' }} />
          <span style={{ color: '#92400e', fontSize: '14px' }}>{error}</span>
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>
              {duplicateEmails.length}
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>Total Duplicates</p>
          </div>
        </div>
      </div>

      {/* Emails List */}
      {duplicateEmails.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '48px 20px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <Copy style={{ width: '64px', height: '64px', color: '#d1d5db', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280', fontSize: '16px', margin: 0 }}>No duplicate emails found</p>
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: '8px 0 0 0' }}>
            No emails matched existing job postings
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
            {duplicateEmails.map(email => (
              <div
                key={email.email_job_id}
                data-testid="duplicate-email-card"
                style={{
                  padding: '16px',
                  backgroundColor: '#fffbeb',
                  borderRadius: '6px',
                  border: '1px solid #fde68a',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => setSelectedEmail(selectedEmail?.email_job_id === email.email_job_id ? null : email)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fef3c7';
                  e.currentTarget.style.borderColor = '#fcd34d';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fffbeb';
                  e.currentTarget.style.borderColor = '#fde68a';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Copy style={{ width: '18px', height: '18px', color: '#f59e0b' }} />
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
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      fontSize: '12px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Copy style={{ width: '12px', height: '12px' }} />
                      Duplicate
                    </div>

                    {email.extraction_confidence !== undefined && (
                      <div style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#dcfce7',
                        color: '#166534',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Confidence: {(email.extraction_confidence * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>

                {selectedEmail?.email_job_id === email.email_job_id && (
                  <div style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid #fde68a'
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

                    <div>
                      <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
                        Why was this marked as duplicate?
                      </p>
                      <p style={{ fontSize: '12px', color: '#374151', margin: 0 }}>
                        This job posting matched an existing entry in the database based on company name and job title, or by URL. No new job was created to avoid duplicates.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DuplicatesTab;
