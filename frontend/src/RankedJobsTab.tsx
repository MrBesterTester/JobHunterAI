import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, Award } from 'lucide-react';

const API_URL = 'http://localhost:8080/api';

interface JobScore {
  job_id: string;
  compensation_score: number | null;
  relationship_score: number | null;
  remote_work_score: number | null;
  domain_fit_score: number | null;
  flexibility_score: number | null;
  benefits_score: number | null;
  industry_score: number | null;
  total_score: number | null;
  rank: number | null;
  calculated_at: string;
}

interface Job {
  job_id: string;
  title: string;
  company: string;
  location?: string;
  source: string;
  salary?: number;
  commute_time?: number;
  status: string;
  date_email_sent: string;
  description?: string;
  url?: string;
  raw_data?: any;
}

interface JobWithScore extends Job {
  score?: JobScore;
}

type SortColumn = 'rank' | 'total_score' | 'title' | 'company' | 'compensation_score' | 'relationship_score' | 'remote_work_score' | 'domain_fit_score';
type SortDirection = 'asc' | 'desc';

const RankedJobsTab: React.FC = () => {
  const [jobs, setJobs] = useState<JobWithScore[]>([]);
  const [scores, setScores] = useState<Map<string, JobScore>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    fetchRankedJobs();
  }, []);

  const fetchRankedJobs = async (): Promise<void> => {
    try {
      setLoading(true);

      // Fetch ranked jobs
      const jobsResponse = await fetch(`${API_URL}/jobs/ranked`);
      if (!jobsResponse.ok) throw new Error('Failed to fetch ranked jobs');
      const jobsData: Job[] = await jobsResponse.json();

      // Fetch all job scores
      const scoresMap = new Map<string, JobScore>();
      await Promise.all(
        jobsData.map(async (job) => {
          try {
            const scoreResponse = await fetch(`${API_URL}/jobs/${job.job_id}/score`);
            if (scoreResponse.ok) {
              const scoreData: JobScore = await scoreResponse.json();
              scoresMap.set(job.job_id, scoreData);
            }
          } catch (error) {
            console.error(`Failed to fetch score for job ${job.job_id}:`, error);
          }
        })
      );

      setScores(scoresMap);

      // Merge jobs with scores
      const jobsWithScores: JobWithScore[] = jobsData.map(job => ({
        ...job,
        score: scoresMap.get(job.job_id)
      }));

      setJobs(jobsWithScores);
    } catch (error) {
      console.error('Error fetching ranked jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: SortColumn): void => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'rank' ? 'asc' : 'desc');
    }
  };

  const getSortedJobs = (): JobWithScore[] => {
    const sorted = [...jobs];
    sorted.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortColumn === 'rank' || sortColumn === 'total_score') {
        aVal = a.score?.[sortColumn] ?? null;
        bVal = b.score?.[sortColumn] ?? null;
      } else if (sortColumn === 'title' || sortColumn === 'company') {
        aVal = a[sortColumn];
        bVal = b[sortColumn];
      } else {
        // Criterion-specific scores
        aVal = a.score?.[sortColumn] ?? null;
        bVal = b.score?.[sortColumn] ?? null;
      }

      // Handle nulls (always sort to end)
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      // Compare values
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortDirection === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }
    });
    return sorted;
  };

  const getScoreColor = (score: number | null): { bg: string; text: string } => {
    if (score === null) return { bg: '#f3f4f6', text: '#6b7280' };
    if (score >= 70) return { bg: '#d1fae5', text: '#065f46' }; // Green
    if (score >= 40) return { bg: '#fef3c7', text: '#92400e' }; // Yellow
    return { bg: '#fee2e2', text: '#991b1b' }; // Red
  };

  const formatScore = (score: number | null): string => {
    return score !== null ? score.toFixed(1) : 'N/A';
  };

  const toggleExpand = (jobId: string): void => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  const SortableHeader: React.FC<{ column: SortColumn; label: string; width?: string }> = ({
    column,
    label,
    width = 'auto'
  }) => (
    <th
      onClick={() => handleSort(column)}
      style={{
        padding: '12px',
        textAlign: 'left',
        cursor: 'pointer',
        backgroundColor: '#f9fafb',
        fontWeight: 600,
        borderBottom: '2px solid #e5e7eb',
        userSelect: 'none',
        width,
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {label}
        {sortColumn === column && (
          sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
        )}
      </div>
    </th>
  );

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        color: '#6b7280'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Award size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p>Loading ranked jobs...</p>
        </div>
      </div>
    );
  }

  const sortedJobs = getSortedJobs();

  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <TrendingUp size={24} color="#8b5cf6" />
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
          Ranked Jobs
        </h2>
        <span style={{
          backgroundColor: '#e0e7ff',
          color: '#4c1d95',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: 500
        }}>
          {sortedJobs.length} jobs scored
        </span>
      </div>

      <div style={{
        backgroundColor: '#fef3c7',
        border: '1px solid #fbbf24',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '20px',
        fontSize: '14px',
        color: '#78350f'
      }}>
        <strong>Scoring Legend:</strong>
        <span style={{ marginLeft: '12px' }}>🟢 70-100 (Excellent)</span>
        <span style={{ marginLeft: '12px' }}>🟡 40-69 (Good)</span>
        <span style={{ marginLeft: '12px' }}>🔴 0-39 (Poor)</span>
      </div>

      <div style={{
        overflowX: 'auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px'
        }}>
          <thead>
            <tr>
              <SortableHeader column="rank" label="Rank" width="80px" />
              <SortableHeader column="total_score" label="Score" width="90px" />
              <SortableHeader column="title" label="Title" width="250px" />
              <SortableHeader column="company" label="Company" width="180px" />
              <SortableHeader column="compensation_score" label="Comp" width="80px" />
              <SortableHeader column="relationship_score" label="Rel" width="70px" />
              <SortableHeader column="remote_work_score" label="Remote" width="80px" />
              <SortableHeader column="domain_fit_score" label="Domain" width="80px" />
              <th style={{
                padding: '12px',
                textAlign: 'center',
                backgroundColor: '#f9fafb',
                fontWeight: 600,
                borderBottom: '2px solid #e5e7eb',
                width: '80px'
              }}>
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedJobs.map((job) => {
              const score = job.score;
              const isExpanded = expandedJobId === job.job_id;
              const totalScoreColor = getScoreColor(score?.total_score ?? null);

              return (
                <React.Fragment key={job.job_id}>
                  <tr style={{
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: isExpanded ? '#f9fafb' : 'white',
                    transition: 'background-color 0.2s'
                  }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#6b7280' }}>
                      {score?.rank ? `#${score.rank}` : 'N/A'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{
                        backgroundColor: totalScoreColor.bg,
                        color: totalScoreColor.text,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontWeight: 600,
                        textAlign: 'center',
                        fontSize: '16px'
                      }}>
                        {formatScore(score?.total_score ?? null)}
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 500 }}>
                      {job.title}
                    </td>
                    <td style={{ padding: '12px', color: '#6b7280' }}>
                      {job.company}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        ...getScoreColor(score?.compensation_score ?? null),
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 500,
                        display: 'inline-block',
                        minWidth: '40px'
                      }}>
                        {formatScore(score?.compensation_score ?? null)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        ...getScoreColor(score?.relationship_score ?? null),
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 500,
                        display: 'inline-block',
                        minWidth: '40px'
                      }}>
                        {formatScore(score?.relationship_score ?? null)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        ...getScoreColor(score?.remote_work_score ?? null),
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 500,
                        display: 'inline-block',
                        minWidth: '40px'
                      }}>
                        {formatScore(score?.remote_work_score ?? null)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        ...getScoreColor(score?.domain_fit_score ?? null),
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 500,
                        display: 'inline-block',
                        minWidth: '40px'
                      }}>
                        {formatScore(score?.domain_fit_score ?? null)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => toggleExpand(job.job_id)}
                        style={{
                          backgroundColor: '#e0e7ff',
                          color: '#4c1d95',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 500,
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c7d2fe'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#e0e7ff'}
                      >
                        {isExpanded ? 'Hide' : 'Show'}
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <td colSpan={9} style={{ padding: '20px' }}>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '20px'
                        }}>
                          {/* Left Column: All Scores */}
                          <div>
                            <h3 style={{
                              margin: '0 0 16px 0',
                              fontSize: '16px',
                              fontWeight: 600,
                              color: '#374151'
                            }}>
                              Detailed Scores
                            </h3>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px'
                            }}>
                              <ScoreRow label="Compensation" score={score?.compensation_score ?? null} weight="30%" />
                              <ScoreRow label="Employment Relationship" score={score?.relationship_score ?? null} weight="20%" />
                              <ScoreRow label="Remote Work" score={score?.remote_work_score ?? null} weight="20%" />
                              <ScoreRow label="Domain Fit" score={score?.domain_fit_score ?? null} weight="15%" />
                              <ScoreRow label="Flexibility/Perks" score={score?.flexibility_score ?? null} weight="10%" />
                              <ScoreRow label="Benefits" score={score?.benefits_score ?? null} weight="3%" />
                              <ScoreRow label="Industry" score={score?.industry_score ?? null} weight="2%" />
                              <div style={{
                                marginTop: '8px',
                                paddingTop: '12px',
                                borderTop: '2px solid #d1d5db'
                              }}>
                                <ScoreRow
                                  label="TOTAL SCORE"
                                  score={score?.total_score ?? null}
                                  weight="100%"
                                  isBold
                                />
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Job Details */}
                          <div>
                            <h3 style={{
                              margin: '0 0 16px 0',
                              fontSize: '16px',
                              fontWeight: 600,
                              color: '#374151'
                            }}>
                              Job Details
                            </h3>
                            <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.8' }}>
                              <p><strong>Location:</strong> {job.location || 'Not specified'}</p>
                              <p><strong>Source:</strong> {job.source}</p>
                              <p><strong>Status:</strong> {job.status}</p>
                              <p><strong>Date Received:</strong> {new Date(job.date_email_sent).toLocaleDateString()}</p>
                              {score?.calculated_at && (
                                <p><strong>Score Calculated:</strong> {new Date(score.calculated_at).toLocaleString()}</p>
                              )}
                              {job.url && (
                                <p>
                                  <a
                                    href={job.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#8b5cf6', textDecoration: 'none' }}
                                  >
                                    View Job Posting →
                                  </a>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedJobs.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#9ca3af'
        }}>
          <Award size={64} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <p style={{ fontSize: '18px', fontWeight: 500 }}>No scored jobs yet</p>
          <p style={{ fontSize: '14px' }}>Jobs will appear here once they've been scored.</p>
        </div>
      )}
    </div>
  );
};

const ScoreRow: React.FC<{
  label: string;
  score: number | null;
  weight: string;
  isBold?: boolean;
}> = ({ label, score, weight, isBold = false }) => {
  const getScoreColor = (score: number | null): { bg: string; text: string } => {
    if (score === null) return { bg: '#f3f4f6', text: '#6b7280' };
    if (score >= 70) return { bg: '#d1fae5', text: '#065f46' };
    if (score >= 40) return { bg: '#fef3c7', text: '#92400e' };
    return { bg: '#fee2e2', text: '#991b1b' };
  };

  const colors = getScoreColor(score);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 12px',
      backgroundColor: 'white',
      borderRadius: '6px',
      border: '1px solid #e5e7eb'
    }}>
      <span style={{
        fontWeight: isBold ? 600 : 400,
        fontSize: isBold ? '15px' : '14px'
      }}>
        {label}
        <span style={{
          marginLeft: '8px',
          color: '#9ca3af',
          fontSize: '12px',
          fontWeight: 400
        }}>
          ({weight})
        </span>
      </span>
      <span style={{
        backgroundColor: colors.bg,
        color: colors.text,
        padding: '4px 12px',
        borderRadius: '4px',
        fontWeight: isBold ? 600 : 500,
        fontSize: isBold ? '16px' : '14px',
        minWidth: '60px',
        textAlign: 'center'
      }}>
        {score !== null ? score.toFixed(1) : 'N/A'}
      </span>
    </div>
  );
};

export default RankedJobsTab;
