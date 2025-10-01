import React, { useState, useEffect } from 'react';
import { Clock, Mail, Calendar, Send, CheckCircle, XCircle } from 'lucide-react';

const API_URL = 'http://localhost:8080/api';

interface TimelineEvent {
  application_id: string;
  job_id: string;
  job_title: string;
  company: string;
  date_applied?: string;
  event_type: string;
  event_date: string;
  event_description: string;
  related_id?: string;
}

interface TimelineViewProps {
  applicationId: string;
}

const TimelineView: React.FC<TimelineViewProps> = ({ applicationId }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTimeline = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/applications/${applicationId}/timeline`);
      if (response.ok) {
        const data: TimelineEvent[] = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [applicationId]);

  const getEventIcon = (eventType: string): JSX.Element => {
    switch (eventType) {
      case 'application':
        return <Send style={{ width: '20px', height: '20px', color: '#3b82f6' }} />;
      case 'communication':
        return <Mail style={{ width: '20px', height: '20px', color: '#10b981' }} />;
      case 'interview':
        return <Calendar style={{ width: '20px', height: '20px', color: '#8b5cf6' }} />;
      case 'follow_up':
        return <Clock style={{ width: '20px', height: '20px', color: '#f59e0b' }} />;
      default:
        return <CheckCircle style={{ width: '20px', height: '20px', color: '#6b7280' }} />;
    }
  };

  const getEventColor = (eventType: string): string => {
    switch (eventType) {
      case 'application':
        return '#3b82f6';
      case 'communication':
        return '#10b981';
      case 'interview':
        return '#8b5cf6';
      case 'follow_up':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getEventTypeLabel = (eventType: string): string => {
    switch (eventType) {
      case 'application':
        return 'Application';
      case 'communication':
        return 'Communication';
      case 'interview':
        return 'Interview';
      case 'follow_up':
        return 'Follow-up';
      default:
        return 'Event';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <Clock style={{ width: '32px', height: '32px', color: '#3b82f6', margin: '0 auto 12px' }} />
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading timeline...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <XCircle style={{ width: '48px', height: '48px', color: '#d1d5db', margin: '0 auto 12px' }} />
        <p style={{ color: '#6b7280', fontSize: '14px' }}>No timeline events found</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>
          Application Timeline
        </h3>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
          {events[0]?.job_title} at {events[0]?.company}
        </p>
      </div>

      <div style={{ position: 'relative', paddingLeft: '32px' }}>
        {/* Timeline line */}
        <div
          style={{
            position: 'absolute',
            left: '10px',
            top: '24px',
            bottom: '24px',
            width: '2px',
            backgroundColor: '#e5e7eb'
          }}
        />

        {events.map((event, index) => {
          const color = getEventColor(event.event_type);
          const isLast = index === events.length - 1;

          return (
            <div
              key={`${event.event_type}-${event.event_date}-${index}`}
              style={{
                position: 'relative',
                marginBottom: isLast ? 0 : '24px'
              }}
            >
              {/* Timeline dot */}
              <div
                style={{
                  position: 'absolute',
                  left: '-32px',
                  top: '4px',
                  width: '24px',
                  height: '24px',
                  backgroundColor: 'white',
                  border: `2px solid ${color}`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: color,
                    borderRadius: '50%'
                  }}
                />
              </div>

              {/* Event card */}
              <div
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  transition: 'box-shadow 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getEventIcon(event.event_type)}
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {getEventTypeLabel(event.event_type)}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {new Date(event.event_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                <p style={{ fontSize: '14px', color: '#111827', margin: 0, lineHeight: '1.5' }}>
                  {event.event_description}
                </p>

                <div style={{ marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
                  {new Date(event.event_date).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineView;
