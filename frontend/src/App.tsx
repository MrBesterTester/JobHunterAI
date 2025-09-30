import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Clock, Briefcase, DollarSign, MapPin, Filter, FileText, Mail } from 'lucide-react';

const API_URL = 'http://localhost:8080/api';

interface Job {
  job_id: string;
  title: string;
  company: string;
  location?: string;
  source: string;
  salary?: number;
  commute_time?: number;
  status: string;
  date_collected: string;
  description?: string;
  url?: string;
  filter_reason?: string;
}

interface JobCriteria {
  criteria_id: string;
  min_salary?: number;
  max_commute_time?: number;
  max_commute_days_per_week?: number;
  preferred_domains?: string[];
  remote_preference: string;
  updated_at: string;
}

interface JobStats {
  new?: number;
  approved?: number;
  applied?: number;
  rejected?: number;
  filtered?: number;
}

interface Application {
  application_id: string;
  job_id: string;
  resume_version?: string;
  cover_letter_version?: string;
  application_status: string;
  date_applied?: string;
}

interface GeneratedContent {
  resume: string;
  cover_letter: string;
  resume_format: string;
  generated_at: string;
}

interface ResumeVersion {
  version_id: string;
  version_name: string;
  content: string;
  format: string;
  file_path?: string;
  is_master: boolean;
  created_at: string;
  updated_at: string;
}

interface CoverLetterTemplate {
  template_id: string;
  template_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

type TabType = 'inbox' | 'approved' | 'applied' | 'filtered' | 'all';

const JobHunterDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [criteria, setCriteria] = useState<JobCriteria | null>(null);
  const [stats, setStats] = useState<JobStats>({});
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCriteriaConfig, setShowCriteriaConfig] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [showContentGeneration, setShowContentGeneration] = useState<boolean>(false);
  const [generatingContent, setGeneratingContent] = useState<boolean>(false);


  const fetchJobs = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/jobs`);
      const data: Job[] = await response.json();
      setJobs(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([
        {
          job_id: '1',
          title: 'Senior Test Automation Engineer',
          company: 'TechCorp',
          location: 'Remote',
          salary: 145000,
          status: 'new',
          date_collected: new Date().toISOString(),
          source: 'linkedin',
          description: 'Looking for experienced test automation engineer...'
        },
        {
          job_id: '2',
          title: 'AI/ML Testing Specialist',
          company: 'AIStartup',
          location: 'San Francisco, CA',
          salary: 135000,
          commute_time: 35,
          status: 'new',
          date_collected: new Date().toISOString(),
          source: 'email',
          description: 'Work on cutting-edge AI testing tools...'
        },
        {
          job_id: '3',
          title: 'Firmware Test Engineer',
          company: 'HardwareCo',
          location: 'Milpitas, CA',
          salary: 150000,
          commute_time: 25,
          status: 'approved',
          date_collected: new Date(Date.now() - 86400000).toISOString(),
          source: 'dice',
          description: 'Develop firmware validation frameworks...'
        }
      ]);
      setLoading(false);
    }
  };

  const fetchApplications = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/applications`);
      const data: Application[] = await response.json();
      setApplications(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
    }
  };

  const fetchCriteria = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/criteria`);
      if (response.ok) {
        const data: JobCriteria = await response.json();
        setCriteria(data);
      }
    } catch (error) {
      console.error('Error fetching criteria:', error);
    }
  };

  const fetchStats = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/jobs/stats`);
      const data: JobStats = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: string): Promise<void> => {
    try {
      await fetch(`${API_URL}/jobs/${jobId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchJobs();
    } catch (error) {
      console.error('Error updating job status:', error);
      setJobs(jobs.map(j => j.job_id === jobId ? {...j, status: newStatus} : j));
    }
  };

  const generateContent = async (jobId: string): Promise<void> => {
    setGeneratingContent(true);
    try {
      const response = await fetch(`${API_URL}/jobs/${jobId}/generate-content`);
      if (response.ok) {
        const content: GeneratedContent = await response.json();
        setGeneratedContent(content);
        setShowContentGeneration(true);
      } else {
        console.error('Failed to generate content');
      }
    } catch (error) {
      console.error('Error generating content:', error);
    } finally {
      setGeneratingContent(false);
    }
  };

  const getStatusIcon = (status: string): JSX.Element => {
    switch (status) {
      case 'new': return <AlertCircle className="w-5 h-5 text-blue-500" />;
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'applied': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'filtered': return <Filter className="w-5 h-5 text-orange-500" />;
      default: return <Briefcase className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'applied': return 'bg-yellow-100 text-yellow-800';
      case 'filtered': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filterJobs = (status: string): Job[] => {
    return jobs.filter(job => job.status === status);
  };

  useEffect(() => {
    fetchJobs();
    fetchStats();
  }, []);

  const meetsMinSalary = (job: Job): boolean => job.salary ? job.salary >= 130000 : false;
  const isRemote = (job: Job): boolean => job.location?.toLowerCase().includes('remote') || false;
  const withinCommute = (job: Job): boolean => !job.commute_time || job.commute_time <= 45;

  const JobCard: React.FC<{ job: Job }> = ({ job }) => (
    <div
      className="bg-white border rounded-lg p-4 mb-3 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => setSelectedJob(job)}
      style={{ border: '1px solid #e5e7eb' }}
      data-testid="job-card"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontWeight: 600, fontSize: '18px', color: '#111827' }} data-testid="job-title">{job.title}</h3>
          <p style={{ color: '#6b7280' }} data-testid="job-company">{job.company}</p>
        </div>
        {getStatusIcon(job.status)}
      </div>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', fontSize: '14px' }}>
        {job.salary && (
          <span
            data-testid="job-salary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: meetsMinSalary(job) ? '#d1fae5' : '#fee2e2',
              color: meetsMinSalary(job) ? '#065f46' : '#991b1b'
            }}>
            <DollarSign style={{ width: '16px', height: '16px' }} />
            ${(job.salary / 1000).toFixed(0)}K
          </span>
        )}

        {job.location && (
          <span
            data-testid="job-location"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: isRemote(job) ? '#dbeafe' : '#f3f4f6',
              color: isRemote(job) ? '#1e40af' : '#374151'
            }}>
            <MapPin style={{ width: '16px', height: '16px' }} />
            {job.location}
          </span>
        )}

        {job.commute_time && (
          <span style={{
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: withinCommute(job) ? '#d1fae5' : '#fed7aa',
            color: withinCommute(job) ? '#065f46' : '#9a3412'
          }}>
            {job.commute_time} min commute
          </span>
        )}

        <span data-testid="job-source" style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#f3f4f6', color: '#374151' }}>
          {job.source}
        </span>
      </div>

      {job.filter_reason && (
        <div
          data-testid="filtered-reasons"
          style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#fef2f2',
            borderRadius: '4px',
            borderLeft: '4px solid #ef4444'
          }}>
          <div style={{ fontSize: '12px', fontWeight: '500', color: '#dc2626', marginBottom: '4px' }}>
            Filtered Reasons:
          </div>
          <div style={{ fontSize: '12px', color: '#7f1d1d' }}>
            {job.filter_reason}
          </div>
        </div>
      )}

      {job.status === 'new' && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); updateJobStatus(job.job_id, 'approved'); }}
            style={{
              flex: 1,
              backgroundColor: '#10b981',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Approve
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); updateJobStatus(job.job_id, 'rejected'); }}
            style={{
              flex: 1,
              backgroundColor: '#ef4444',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Reject
          </button>
        </div>
      )}

      {job.status === 'approved' && (
        <div style={{ marginTop: '12px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); generateContent(job.job_id); }}
            disabled={generatingContent}
            style={{
              width: '100%',
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '4px',
              border: 'none',
              cursor: generatingContent ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: generatingContent ? 0.6 : 1
            }}
          >
            <FileText style={{ width: '16px', height: '16px' }} />
            {generatingContent ? 'Generating...' : 'Generate Resume & Cover Letter'}
          </button>
        </div>
      )}
    </div>
  );

  const JobDetails: React.FC<{ job: Job; onClose: () => void }> = ({ job, onClose }) => (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 50
    }} data-testid="modal-overlay">
      <div
        role="dialog"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          maxWidth: '672px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }} data-testid="modal-job-title">{job.title}</h2>
              <p style={{ fontSize: '20px', color: '#6b7280' }} data-testid="modal-company">{job.company}</p>
            </div>
            <button
              onClick={onClose}
              style={{
                color: '#6b7280',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <span style={{
              padding: '4px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 500,
              ...(() => {
                const color = getStatusColor(job.status);
                const bgColor = color.includes('blue') ? '#dbeafe' : 
                               color.includes('green') ? '#d1fae5' :
                               color.includes('red') ? '#fee2e2' : '#fef3c7';
                const textColor = color.includes('blue') ? '#1e40af' :
                                 color.includes('green') ? '#065f46' :
                                 color.includes('red') ? '#991b1b' : '#92400e';
                return { backgroundColor: bgColor, color: textColor };
              })()
            }}>
              {job.status}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {job.salary && (
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>Salary</p>
                <p style={{ fontWeight: 600 }}>${job.salary.toLocaleString()}</p>
              </div>
            )}
            {job.location && (
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>Location</p>
                <p style={{ fontWeight: 600 }}>{job.location}</p>
              </div>
            )}
            {job.commute_time && (
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>Commute Time</p>
                <p style={{ fontWeight: 600 }}>{job.commute_time} minutes</p>
              </div>
            )}
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Source</p>
              <p style={{ fontWeight: 600 }}>{job.source}</p>
            </div>
          </div>

          {job.description && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '8px' }}>Description</h3>
              <p style={{ color: '#374151', whiteSpace: 'pre-wrap' }}>{job.description}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            {job.status === 'new' && (
              <>
                <button
                  onClick={() => { updateJobStatus(job.job_id, 'approved'); onClose(); }}
                  style={{
                    flex: 1,
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Approve
                </button>
                <button
                  onClick={() => { updateJobStatus(job.job_id, 'rejected'); onClose(); }}
                  style={{
                    flex: 1,
                    backgroundColor: '#ef4444',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Reject
                </button>
              </>
            )}
            {job.status === 'approved' && (
              <button
                onClick={() => { updateJobStatus(job.job_id, 'applied'); onClose(); }}
                style={{
                  flex: 1,
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Mark as Applied
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Clock style={{ width: '48px', height: '48px', color: '#3b82f6', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280' }}>Loading JobHunter...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827' }}>JobHunter</h1>
          <p style={{ color: '#6b7280' }}>Streamline your job search workflow</p>
        </div>
      </header>

      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '16px' }}>
            <div style={{ textAlign: 'center' }} data-testid="stat-new">
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{stats.new || 0}</p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>New Jobs</p>
            </div>
            <div style={{ textAlign: 'center' }} data-testid="stat-approved">
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{stats.approved || 0}</p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Approved</p>
            </div>
            <div style={{ textAlign: 'center' }} data-testid="stat-applied">
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.applied || 0}</p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Applied</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{stats.rejected || 0}</p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Rejected</p>
            </div>
            <div style={{ textAlign: 'center' }} data-testid="stat-filtered">
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#f97316' }}>{stats.filtered || 0}</p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Filtered</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#6b7280' }}>{Object.values(stats).reduce((a, b) => a + b, 0)}</p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Total</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
          {(['inbox', 'approved', 'applied', 'filtered', 'all'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                fontWeight: 500,
                textTransform: 'capitalize',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #3b82f6' : 'none',
                color: activeTab === tab ? '#3b82f6' : '#6b7280',
                cursor: 'pointer'
              }}
            >
              {tab === 'inbox' ? 'New Jobs' : tab}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {(activeTab === 'inbox' ? filterJobs('new') :
            activeTab === 'approved' ? filterJobs('approved') :
            activeTab === 'applied' ? filterJobs('applied') :
            activeTab === 'filtered' ? filterJobs('filtered') :
            jobs
          ).map(job => (
            <JobCard key={job.job_id} job={job} />
          ))}
        </div>

        {(activeTab === 'inbox' ? filterJobs('new') :
          activeTab === 'approved' ? filterJobs('approved') :
          activeTab === 'applied' ? filterJobs('applied') :
          activeTab === 'filtered' ? filterJobs('filtered') :
          jobs
        ).length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Filter style={{ width: '64px', height: '64px', color: '#d1d5db', margin: '0 auto 16px' }} />
            <p style={{ color: '#6b7280' }}>No jobs in this category yet</p>
          </div>
        )}
      </div>

      {selectedJob && (
        <JobDetails job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}

      {showContentGeneration && generatedContent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }} data-testid="modal-overlay">
          <div
            role="dialog"
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              maxWidth: '1000px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Generated Content</h2>
              <button
                onClick={() => setShowContentGeneration(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '100%' }}>
                <div data-testid="resume-panel">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <FileText style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Resume</h3>
                  </div>
                  <div
                    data-testid="resume-content"
                    style={{
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      padding: '16px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      lineHeight: '1.5',
                      height: '500px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap'
                    }}>
                    {generatedContent.resume}
                  </div>
                </div>

                <div data-testid="cover-letter-panel">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Mail style={{ width: '20px', height: '20px', color: '#10b981' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Cover Letter</h3>
                  </div>
                  <div
                    data-testid="cover-letter-content"
                    style={{
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      padding: '16px',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      height: '500px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap'
                    }}>
                    {generatedContent.cover_letter}
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#6b7280'
              }}>
                Generated on: {new Date(generatedContent.generated_at).toLocaleString()} |
                Format: {generatedContent.resume_format}
              </div>
            </div>

            <div style={{
              padding: '20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => setShowContentGeneration(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Here you could add download functionality
                  console.log('Download functionality would go here');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Download Files
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobHunterDashboard;
