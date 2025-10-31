import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Phone, Mail, X, Edit2, Trash2 } from 'lucide-react';

const API_URL = 'http://localhost:8080/api';

interface Interview {
  interview_id: string;
  application_id: string;
  calendar_event_id?: string;
  interview_type: string;
  scheduled_date: string;
  duration_minutes: number;
  location?: string;
  interviewer_name?: string;
  interviewer_email?: string;
  interviewer_phone?: string;
  notes?: string;
  status: string;
  reminder_sent: boolean;
  calendar_invite_sent: boolean;
  job_title?: string;
  company?: string;
  job_location?: string;
}

interface ScheduleInterviewRequest {
  application_id: string;
  interview_type: string;
  scheduled_date: string;
  duration_minutes?: number;
  location?: string;
  interviewer_name?: string;
  interviewer_email?: string;
  interviewer_phone?: string;
  notes?: string;
}

const CalendarTab: React.FC = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [scheduleForm, setScheduleForm] = useState<ScheduleInterviewRequest>({
    application_id: '',
    interview_type: 'phone',
    scheduled_date: '',
    duration_minutes: 60,
    location: '',
    interviewer_name: '',
    interviewer_email: '',
    interviewer_phone: '',
    notes: ''
  });

  const fetchInterviews = async (): Promise<void> => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/interviews/upcoming`);
      if (response.ok) {
        const data: Interview[] = await response.json();
        setInterviews(data);
      } else {
        setError('Failed to load interviews');
      }
    } catch (error) {
      console.error('Error fetching interviews:', error);
      setError('Error loading interviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const scheduleInterview = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm)
      });
      if (response.ok) {
        setShowScheduleModal(false);
        fetchInterviews();
        // Reset form
        setScheduleForm({
          application_id: '',
          interview_type: 'phone',
          scheduled_date: '',
          duration_minutes: 60,
          location: '',
          interviewer_name: '',
          interviewer_email: '',
          interviewer_phone: '',
          notes: ''
        });
      }
    } catch (error) {
      console.error('Error scheduling interview:', error);
    }
  };

  const deleteInterview = async (interviewId: string): Promise<void> => {
    if (!window.confirm('Cancel this interview?')) return;

    try {
      const response = await fetch(`${API_URL}/interviews/${interviewId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchInterviews();
        setSelectedInterview(null);
      }
    } catch (error) {
      console.error('Error deleting interview:', error);
    }
  };

  const getInterviewTypeColor = (type: string): string => {
    switch (type) {
      case 'phone': return '#3b82f6';
      case 'video': return '#8b5cf6';
      case 'onsite': return '#10b981';
      case 'technical': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const InterviewCard: React.FC<{ interview: Interview }> = ({ interview }) => (
    <div
      className="interview-card"
      onClick={() => setSelectedInterview(interview)}
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
            {interview.job_title || 'Interview'}
          </h3>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            {interview.company || 'Company'}
          </p>
        </div>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 500,
            backgroundColor: getInterviewTypeColor(interview.interview_type) + '20',
            color: getInterviewTypeColor(interview.interview_type)
          }}
        >
          {interview.interview_type}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', color: '#374151', fontSize: '14px' }}>
        <Clock style={{ width: '16px', height: '16px' }} />
        <span>{new Date(interview.scheduled_date).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })}</span>
      </div>

      {interview.location && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: '#374151', fontSize: '14px' }}>
          <MapPin style={{ width: '16px', height: '16px' }} />
          <span>{interview.location}</span>
        </div>
      )}

      {interview.interviewer_name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: '#374151', fontSize: '14px' }}>
          <User style={{ width: '16px', height: '16px' }} />
          <span>{interview.interviewer_name}</span>
        </div>
      )}
    </div>
  );

  const InterviewDetailsModal: React.FC<{ interview: Interview; onClose: () => void }> = ({ interview, onClose }) => (
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
          maxWidth: '600px',
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
                {interview.job_title}
              </h2>
              <p style={{ fontSize: '16px', color: '#6b7280', margin: '4px 0 0 0' }}>
                {interview.company}
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
              <X style={{ width: '24px', height: '24px' }} />
            </button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <span
              style={{
                padding: '6px 16px',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: 500,
                backgroundColor: getInterviewTypeColor(interview.interview_type) + '20',
                color: getInterviewTypeColor(interview.interview_type)
              }}
            >
              {interview.interview_type} Interview
            </span>
            <span
              style={{
                marginLeft: '8px',
                padding: '6px 16px',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: 500,
                backgroundColor: '#f3f4f6',
                color: '#374151'
              }}
            >
              {interview.status}
            </span>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Clock style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280' }}>Date & Time</span>
              </div>
              <p style={{ margin: '0 0 0 28px', fontSize: '16px', color: '#111827' }}>
                {new Date(interview.scheduled_date).toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </p>
              <p style={{ margin: '4px 0 0 28px', fontSize: '14px', color: '#6b7280' }}>
                Duration: {interview.duration_minutes} minutes
              </p>
            </div>

            {interview.location && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <MapPin style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280' }}>Location</span>
                </div>
                <p style={{ margin: '0 0 0 28px', fontSize: '16px', color: '#111827' }}>
                  {interview.location}
                </p>
              </div>
            )}

            {interview.interviewer_name && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <User style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280' }}>Interviewer</span>
                </div>
                <p style={{ margin: '0 0 0 28px', fontSize: '16px', color: '#111827' }}>
                  {interview.interviewer_name}
                </p>
                {interview.interviewer_email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0 0 28px' }}>
                    <Mail style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                    <a href={`mailto:${interview.interviewer_email}`} style={{ fontSize: '14px', color: '#3b82f6' }}>
                      {interview.interviewer_email}
                    </a>
                  </div>
                )}
                {interview.interviewer_phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0 0 28px' }}>
                    <Phone style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                    <a href={`tel:${interview.interviewer_phone}`} style={{ fontSize: '14px', color: '#3b82f6' }}>
                      {interview.interviewer_phone}
                    </a>
                  </div>
                )}
              </div>
            )}

            {interview.notes && (
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280', marginBottom: '4px' }}>Notes</p>
                <p style={{ margin: 0, fontSize: '14px', color: '#111827', whiteSpace: 'pre-wrap' }}>
                  {interview.notes}
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
            <button
              onClick={() => deleteInterview(interview.interview_id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              <Trash2 style={{ width: '16px', height: '16px' }} />
              Cancel Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const ScheduleModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
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
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Schedule Interview</h3>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                Application ID
              </label>
              <input
                type="text"
                value={scheduleForm.application_id}
                onChange={(e) => setScheduleForm({ ...scheduleForm, application_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter application ID"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                Interview Type
              </label>
              <select
                value={scheduleForm.interview_type}
                onChange={(e) => setScheduleForm({ ...scheduleForm, interview_type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="phone">Phone</option>
                <option value="video">Video</option>
                <option value="onsite">On-site</option>
                <option value="technical">Technical</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                Scheduled Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduleForm.scheduled_date}
                onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                Duration (minutes)
              </label>
              <input
                type="number"
                value={scheduleForm.duration_minutes}
                onChange={(e) => setScheduleForm({ ...scheduleForm, duration_minutes: parseInt(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                Location
              </label>
              <input
                type="text"
                value={scheduleForm.location}
                onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                placeholder="Video link or physical address"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                Interviewer Name
              </label>
              <input
                type="text"
                value={scheduleForm.interviewer_name}
                onChange={(e) => setScheduleForm({ ...scheduleForm, interviewer_name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                Interviewer Email
              </label>
              <input
                type="email"
                value={scheduleForm.interviewer_email}
                onChange={(e) => setScheduleForm({ ...scheduleForm, interviewer_email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                Notes
              </label>
              <textarea
                value={scheduleForm.notes}
                onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
            <button
              onClick={onClose}
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
              Cancel
            </button>
            <button
              onClick={scheduleInterview}
              style={{
                flex: 1,
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
              Schedule Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <Clock style={{ width: '48px', height: '48px', color: '#3b82f6', margin: '0 auto 16px' }} />
        <p style={{ color: '#6b7280' }}>Loading interviews...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ color: '#ef4444', fontSize: '16px' }}>{error}</p>
        <button
          onClick={fetchInterviews}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Upcoming Interviews</h2>
        <button
          onClick={() => setShowScheduleModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          <Calendar style={{ width: '18px', height: '18px' }} />
          Schedule Interview
        </button>
      </div>

      {interviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Calendar style={{ width: '64px', height: '64px', color: '#d1d5db', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280', fontSize: '16px' }}>No upcoming interviews</p>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px' }}>
            Schedule your first interview to get started
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {interviews.map((interview) => (
            <InterviewCard key={interview.interview_id} interview={interview} />
          ))}
        </div>
      )}

      {selectedInterview && (
        <InterviewDetailsModal interview={selectedInterview} onClose={() => setSelectedInterview(null)} />
      )}

      {showScheduleModal && (
        <ScheduleModal onClose={() => setShowScheduleModal(false)} />
      )}
    </div>
  );
};

export default CalendarTab;
