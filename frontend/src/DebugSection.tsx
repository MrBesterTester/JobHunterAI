import React from 'react';

interface DebugSectionProps {
  job: {
    job_id: string;
    extraction_method?: 'llm' | 'regex' | null;
    raw_data?: any;
  };
}

export const DebugSection: React.FC<DebugSectionProps> = ({ job }) => {
  // Early return if debug mode not enabled
  if (process.env.REACT_APP_DEBUG_MODE !== 'true') {
    return null;
  }

  // Get extraction method badge styling (case-insensitive)
  const getBadgeStyle = (method?: string | null) => {
    const normalizedMethod = method?.toUpperCase();
    switch (normalizedMethod) {
      case 'LLM':
        return {
          backgroundColor: '#dbeafe', // blue-100
          color: '#1e40af', // blue-800
        };
      case 'REGEX':
        return {
          backgroundColor: '#d1fae5', // green-100
          color: '#065f46', // green-800
        };
      case 'UNKNOWN':
      default:
        return {
          backgroundColor: '#f3f4f6', // gray-100
          color: '#1f2937', // gray-800
        };
    }
  };

  const badgeStyle = getBadgeStyle(job.extraction_method);
  const displayMethod = job.extraction_method?.toUpperCase() || 'UNKNOWN';

  return (
    <div
      data-testid="debug-section"
      style={{
        backgroundColor: '#fef3c7', // amber-100
        borderLeft: '4px solid #f59e0b', // orange-500
        padding: '1rem',
        marginTop: '0.5rem',
        borderRadius: '0.375rem',
      }}
    >
      <h4
        style={{
          fontWeight: 600,
          marginBottom: '0.5rem',
          marginTop: 0,
        }}
      >
        🔧 Debug Info
      </h4>

      <div style={{ marginBottom: '0.75rem' }}>
        <strong>Extraction Method: </strong>
        <span
          style={{
            ...badgeStyle,
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            fontWeight: 500,
            display: 'inline-block',
            marginLeft: '0.25rem',
          }}
        >
          {displayMethod}
        </span>
      </div>

      <div>
        <strong>Raw Data JSON:</strong>
        <pre
          style={{
            backgroundColor: '#1f2937', // gray-800
            color: '#f9fafb', // gray-50
            padding: '0.75rem',
            borderRadius: '0.375rem',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            maxHeight: '200px', // CRITICAL - test requirement
            overflow: 'auto', // CRITICAL - test requirement
            whiteSpace: 'pre-wrap',
            marginTop: '0.5rem',
            marginBottom: 0,
          }}
        >
          {job.raw_data ? JSON.stringify(job.raw_data, null, 2) : 'null'}
        </pre>
      </div>
    </div>
  );
};
