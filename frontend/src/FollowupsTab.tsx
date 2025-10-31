import React, { useState, useEffect } from 'react';
import { Mail, Clock, CheckCircle, XCircle, Edit2, Send, AlertCircle } from 'lucide-react';

const API_URL = 'http://localhost:8080/api';

interface FollowUp {
  follow_up_id: string;
  application_id: string;
  scheduled_date: string;
  attempt_number: number;
  follow_up_type: string;
  status: string;
  template_used?: string;
  subject?: string;
  body?: string;
  approved_by?: string;
  approved_at?: string;
  sent_at?: string;
  error_message?: string;
  job_title?: string;
  company?: string;
  days_since_application?: number;
}

interface ApproveRequest {
  subject?: string;
  body?: string;
}

const FollowupsTab: React.FC = () => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editedSubject, setEditedSubject] = useState<string>('');
  const [editedBody, setEditedBody] = useState<string>('');

  const fetchFollowUps = async (): Promise<void> => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/follow-ups/pending`);
      if (response.ok) {
        const data: FollowUp[] = await response.json();
        setFollowUps(data);
      } else {
        setError('Failed to load follow-ups');
      }
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
      setError('Error loading follow-ups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const approveFollowUp = async (followUpId: string, request: ApproveRequest): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/follow-ups/${followUpId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      if (response.ok) {
        fetchFollowUps();
        setSelectedFollowUp(null);
        setEditMode(false);
      }
    } catch (error) {
      console.error('Error approving follow-up:', error);
    }
  };

  const sendFollowUp = async (followUpId: string): Promise<void> => {
    if (!window.confirm('Send this follow-up email now?')) return;

    try {
      const response = await fetch(`${API_URL}/follow-ups/${followUpId}/send`, {
        method: 'POST'
      });
      if (response.ok) {
        fetchFollowUps();
        setSelectedFollowUp(null);
      } else {
        const error = await response.json();
        alert(`Failed to send: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending follow-up:', error);
      alert('Failed to send follow-up');
    }
  };

  const getStatusColor = (status: string): { bg: string; text: string } => {
    switch (status) {
      case 'pending':
        return { bg: '#fef3c7', text: '#92400e' };
      case 'approved':
        return { bg: '#d1fae5', text: '#065f46' };
      case 'sent':
        return { bg: '#dbeafe', text: '#1e40af' };
      case 'cancelled':
        return { bg: '#fee2e2', text: '#991b1b' };
      case 'failed':
        return { bg: '#fecaca', text: '#7f1d1d' };
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const getAttemptBadge = (attemptNumber: number): string => {
    return attemptNumber === 1 ? '1st Follow-up' : '2nd Follow-up';
  };

  const FollowUpCard: React.FC<{ followUp: FollowUp }> = ({ followUp }) => {
    const statusColors = getStatusColor(followUp.status);
    const isOverdue = new Date(followUp.scheduled_date) < new Date();

    return (
      <div
        className="followup-card"
        onClick={() => {
          setSelectedFollowUp(followUp);
          setEditedSubject(followUp.subject || '');
          setEditedBody(followUp.body || '');
        }}
        style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '12px',
          cursor: 'pointer',
          transition: 'box-shadow 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: 600, fontSize: '16px', color: '#111827', margin: '0 0 4px 0' }}>
              {followUp.job_title || 'Job Application'}
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              {followUp.company || 'Company'}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: statusColors.bg,
                color: statusColors.text
              }}
            >
              {followUp.status}
            </span>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 500,
                backgroundColor: '#f3f4f6',
                color: '#6b7280'
              }}
            >
              {getAttemptBadge(followUp.attempt_number)}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', color: '#374151', fontSize: '14px' }}>
          <Clock style={{ width: '16px', height: '16px' }} />
          <span>
            Scheduled: {new Date(followUp.scheduled_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
          {isOverdue && followUp.status === 'pending' && (
            <span style={{ color: '#ef4444', fontWeight: 500 }}>(Overdue)</span>
          )}
        </div>

        {followUp.days_since_application && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: '#6b7280', fontSize: '13px' }}>
            <Mail style={{ width: '16px', height: '16px' }} />
            <span>{followUp.days_since_application} days since application</span>
          </div>
        )}

        {followUp.subject && (
          <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0', fontWeight: 500 }}>Subject:</p>
            <p style={{ fontSize: '13px', color: '#111827', margin: 0 }}>{followUp.subject}</p>
          </div>
        )}
      </div>
    );
  };

  const FollowUpDetailsModal: React.FC<{ followUp: FollowUp; onClose: () => void }> = ({ followUp, onClose }) => {
    const statusColors = getStatusColor(followUp.status);

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 50
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                  Follow-up Email
                </h2>
                <p style={{ fontSize: '16px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  {followUp.job_title} at {followUp.company}
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
              <span
                style={{
                  padding: '6px 16px',
                  borderRadius: '16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  backgroundColor: statusColors.bg,
                  color: statusColors.text
                }}
              >
                {followUp.status}
              </span>
              <span
                style={{
                  padding: '6px 16px',
                  borderRadius: '16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  backgroundColor: '#f3f4f6',
                  color: '#374151'
                }}
              >
                {getAttemptBadge(followUp.attempt_number)}
              </span>
            </div>

            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                <div>
                  <span style={{ color: '#6b7280', fontWeight: 500 }}>Scheduled:</span>
                  <span style={{ marginLeft: '8px', color: '#111827' }}>
                    {new Date(followUp.scheduled_date).toLocaleDateString()}
                  </span>
                </div>
                {followUp.days_since_application && (
                  <div>
                    <span style={{ color: '#6b7280', fontWeight: 500 }}>Days since application:</span>
                    <span style={{ marginLeft: '8px', color: '#111827' }}>
                      {followUp.days_since_application}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {editMode ? (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                    Subject
                  </label>
                  <input
                    type="text"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                    Body
                  </label>
                  <textarea
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    rows={12}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      lineHeight: '1.5',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Subject</h3>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#111827'
                  }}>
                    {followUp.subject || 'No subject'}
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Body</h3>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#111827',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}>
                    {followUp.body || 'No body content'}
                  </div>
                </div>
              </div>
            )}

            {followUp.error_message && (
              <div style={{
                marginBottom: '20px',
                padding: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <AlertCircle style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>Error</span>
                </div>
                <p style={{ fontSize: '14px', color: '#991b1b', margin: 0 }}>
                  {followUp.error_message}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              {followUp.status === 'pending' && (
                <>
                  {editMode ? (
                    <>
                      <button
                        onClick={() => {
                          setEditMode(false);
                          setEditedSubject(followUp.subject || '');
                          setEditedBody(followUp.body || '');
                        }}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          backgroundColor: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                      >
                        Cancel Edit
                      </button>
                      <button
                        onClick={() => {
                          approveFollowUp(followUp.follow_up_id, {
                            subject: editedSubject,
                            body: editedBody
                          });
                        }}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                      >
                        <CheckCircle style={{ width: '16px', height: '16px' }} />
                        Save & Approve
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditMode(true)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                      >
                        <Edit2 style={{ width: '16px', height: '16px' }} />
                        Edit
                      </button>
                      <button
                        onClick={() => approveFollowUp(followUp.follow_up_id, {})}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                      >
                        <CheckCircle style={{ width: '16px', height: '16px' }} />
                        Approve
                      </button>
                    </>
                  )}
                </>
              )}

              {followUp.status === 'approved' && (
                <button
                  onClick={() => sendFollowUp(followUp.follow_up_id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  <Send style={{ width: '16px', height: '16px' }} />
                  Send Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <Clock style={{ width: '48px', height: '48px', color: '#3b82f6', margin: '0 auto 16px' }} />
        <p style={{ color: '#6b7280' }}>Loading follow-ups...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ color: '#ef4444', fontSize: '16px' }}>{error}</p>
        <button
          onClick={fetchFollowUps}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Pending Follow-ups</h2>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
          Review and approve follow-up emails before sending
        </p>
      </div>

      {followUps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Mail style={{ width: '64px', height: '64px', color: '#d1d5db', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280', fontSize: '16px' }}>No pending follow-ups</p>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px' }}>
            Follow-ups will appear here when they're ready for review
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {followUps.map((followUp) => (
            <FollowUpCard key={followUp.follow_up_id} followUp={followUp} />
          ))}
        </div>
      )}

      {selectedFollowUp && (
        <FollowUpDetailsModal followUp={selectedFollowUp} onClose={() => {
          setSelectedFollowUp(null);
          setEditMode(false);
        }} />
      )}
    </div>
  );
};

export default FollowupsTab;
