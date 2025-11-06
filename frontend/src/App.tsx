import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle, XCircle, Clock, Briefcase, DollarSign, MapPin, Filter, FileText, Mail, Calendar as CalendarIcon, Download, Send, ExternalLink, AlertTriangle, Copy, RefreshCw, TrendingUp, Settings } from 'lucide-react';
import ResumeManagement from './ResumeManagement';
import CalendarTab from './CalendarTab';
import FollowupsTab from './FollowupsTab';
import IntakeTab from './IntakeTab';
import IgnoredTab from './IgnoredTab';
import FailedTab from './FailedTab';
import DuplicatesTab from './DuplicatesTab';
import RankedJobsTab from './RankedJobsTab';
import EmailComposer from './EmailComposer';

const API_URL = 'http://localhost:8080/api';

interface CompensationDetails {
  type?: string;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  hourly_rate?: number;
  daily_rate?: number;
  equity_offered?: boolean;
  equity_details?: string;
  bonus?: string;
  bonus_structure?: string;
}

interface EmploymentDetails {
  relationship?: string;
  tax_structure?: string;
  contract_duration?: string;
  agency_name?: string;
  benefits?: string;
  employment_type?: string;
  employment_type_source?: 'extracted' | 'inferred' | null;
}

interface RemoteWorkDetails {
  policy?: string;
  days_onsite_per_week?: number;
  remote_eligible_states?: string[];
  timezone_requirement?: string;
}

interface CommuteDetails {
  office_location?: string;
  company_shuttle?: boolean;
  commute_perks?: string;
  schedule_flexibility?: string;
}

interface JobDomainDetails {
  primary_category?: string;
  testing_focus?: boolean;
  testing_level?: string;
  automation_focus?: boolean;
  test_automation_tools?: string[];
  generative_ai_usage?: boolean;
  ai_tools_mentioned?: string[];
  test_equipment?: string;
  tech_stack?: string[];
  seniority?: string;
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
  filter_reason?: string;
  extraction_method?: 'llm' | 'regex' | null;
  raw_data?: {
    compensation?: CompensationDetails;
    employment?: EmploymentDetails;
    remote_work?: RemoteWorkDetails;
    commute?: CommuteDetails;
    job_domain?: JobDomainDetails;
    company_industry?: string;
    company_industry_source?: 'extracted' | 'inferred' | null;
    description?: string;  // Full email body
  };
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
  ignored?: number;
  failed?: number;
  duplicated?: number;
  discovered?: number;
  created?: number;
  mece_valid?: number;
  mece_expected?: number;
  mece_actual?: number;
}

interface Application {
  application_id: string;
  job_id: string;
  resume_version?: string;
  cover_letter_version?: string;
  application_status: string;
  date_applied?: string;
  draft_created_at?: string;
  draft_url?: string;
}

interface DraftStatus {
  status: string;
  draft_id?: string;
  gmail_draft_id?: string;
  sent_at?: string;
}

interface GeneratedContent {
  resume: string;
  cover_letter: string;
  resume_format: string;
  generated_at: string;
  // Phase 3.1.3 - LLM metadata fields
  generation_method?: string;  // "llm" or "template"
  llm_model?: string;           // "claude-3-5-haiku-20241022"
  tokens_used?: number;         // Total tokens (input + output)
  cost_estimate?: number;       // Estimated cost in USD
  generation_time_ms?: number;  // Generation time in milliseconds
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

type TabType = 'approved' | 'applied' | 'filtered' | 'failed' | 'duplicates' | 'new' | 'all' | 'intake' | 'calendar' | 'follow-ups' | 'ignored' | 'ranked' | 'rejected';

// Helper functions moved outside component to prevent recreation on re-renders
const isHtmlContent = (text: string): boolean => {
  return /<\/?[a-z][\s\S]*>/i.test(text);
};

const renderDescription = (description: string): JSX.Element => {
  if (isHtmlContent(description)) {
    return (
      <div
        style={{
          color: '#374151',
          lineHeight: '1.6'
        }}
        dangerouslySetInnerHTML={{ __html: description }}
      />
    );
  } else {
    return (
      <p style={{ color: '#374151', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
        {description}
      </p>
    );
  }
};

const formatCompensationType = (type?: string): string => {
  const typeMap: Record<string, string> = {
    'annual_salary': 'Annual Salary',
    'hourly': 'Hourly Rate',
    'daily_rate': 'Daily Rate',
    'consulting_contract': 'Consulting Contract',
    'retainer': 'Retainer',
    'equity_heavy': 'Equity Heavy',
    'commission_based': 'Commission Based'
  };
  return type ? (typeMap[type] || type) : 'Not specified';
};

const formatTaxStructure = (taxStructure?: string): string => {
  const taxMap: Record<string, string> = {
    'W2': 'W-2 Employee',
    '1099': '1099 Contractor',
    'corp_to_corp': 'Corp-to-Corp',
    'schedule_c': 'Schedule C (Consulting)',
    'unknown': 'Unknown'
  };
  return taxStructure ? (taxMap[taxStructure] || taxStructure) : 'Not specified';
};

const formatEmploymentRelationship = (relationship?: string): string => {
  const relMap: Record<string, string> = {
    'direct_hire': 'Direct Hire',
    'staffing_agency': 'Staffing Agency',
    'consulting': 'Consulting',
    'contract_to_hire': 'Contract-to-Hire',
    'independent_contractor': 'Independent Contractor'
  };
  return relationship ? (relMap[relationship] || relationship) : 'Not specified';
};

const formatRemotePolicy = (policy?: string): string => {
  const policyMap: Record<string, string> = {
    'fully_remote': 'Fully Remote',
    'hybrid': 'Hybrid',
    'onsite': 'Onsite',
    'flexible': 'Flexible',
    'remote_optional': 'Remote Optional'
  };
  return policy ? (policyMap[policy] || policy) : 'Not specified';
};

const formatSeniority = (seniority?: string): string => {
  const seniorityMap: Record<string, string> = {
    'junior': 'Junior',
    'mid': 'Mid-Level',
    'senior': 'Senior',
    'staff': 'Staff',
    'principal': 'Principal',
    'lead': 'Lead',
    'manager': 'Manager',
    'director': 'Director'
  };
  return seniority ? (seniorityMap[seniority] || seniority) : 'Not specified';
};

const formatPrimaryCategory = (category?: string): string => {
  const categoryMap: Record<string, string> = {
    'software_engineering': 'Software Engineering',
    'firmware_engineering': 'Firmware Engineering',
    'qa_testing': 'QA/Testing',
    'test_automation': 'Test Automation',
    'devops': 'DevOps',
    'other': 'Other'
  };
  return category ? (categoryMap[category] || category) : 'Not specified';
};

const formatSalaryRange = (comp?: CompensationDetails): string => {
  if (!comp) return 'Not specified';

  if (comp.salary_min && comp.salary_max) {
    if (comp.salary_min === comp.salary_max) {
      return `$${comp.salary_min.toLocaleString()}`;
    }
    return `$${comp.salary_min.toLocaleString()} - $${comp.salary_max.toLocaleString()}`;
  } else if (comp.salary_min) {
    return `$${comp.salary_min.toLocaleString()}+`;
  } else if (comp.salary_max) {
    return `Up to $${comp.salary_max.toLocaleString()}`;
  } else if (comp.hourly_rate) {
    return `$${comp.hourly_rate}/hr`;
  } else if (comp.daily_rate) {
    return `$${comp.daily_rate}/day`;
  }

  return 'Not specified';
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

// JobDetails component moved outside to prevent recreation on parent re-renders
const JobDetails: React.FC<{
  job: Job;
  onClose: () => void;
  updateJobStatus: (jobId: string, newStatus: string) => Promise<void>;
  rejectJob: (jobId: string) => Promise<void>;
  generateContent: (jobId: string) => Promise<void>;
  renderDescription: (description: string) => JSX.Element;
  formatCompensationType: (type?: string) => string;
  formatSalaryRange: (comp?: CompensationDetails) => string;
  formatTaxStructure: (taxStructure?: string) => string;
  formatEmploymentRelationship: (relationship?: string) => string;
  formatRemotePolicy: (policy?: string) => string;
  formatSeniority: (seniority?: string) => string;
  getStatusColor: (status: string) => string;
}> = React.memo(({
  job,
  onClose,
  updateJobStatus,
  rejectJob,
  generateContent,
  renderDescription,
  formatCompensationType,
  formatSalaryRange,
  formatTaxStructure,
  formatEmploymentRelationship,
  formatRemotePolicy,
  formatSeniority,
  getStatusColor
}) => {
  // Ref to preserve scroll position across re-renders
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const savedScrollPosition = React.useRef<number>(0);

  // Ref for focus trap
  const modalRef = React.useRef<HTMLDivElement>(null);

  // State for email body
  const [emailBody, setEmailBody] = React.useState<{
    body_text: string | null;
    body_html: string | null;
    subject: string | null;
    sender_email: string | null;
    sender_name: string | null;
  } | null>(null);

  // Fetch email body when modal opens
  React.useEffect(() => {
    const fetchEmailBody = async () => {
      try {
        const response = await fetch(`${(window as any).API_URL || 'http://localhost:8080'}/api/jobs/${job.job_id}/email-body`);
        if (response.ok) {
          const data = await response.json();
          setEmailBody(data);
        }
      } catch (error) {
        console.error('Error fetching email body:', error);
      }
    };

    fetchEmailBody();
  }, [job.job_id]);

  // Lock body scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Focus trap for accessibility
  React.useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    // Get all focusable elements
    const getFocusableElements = (): HTMLElement[] => {
      const selectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      return Array.from(modal.querySelectorAll(selectors)) as HTMLElement[];
    };

    // Focus first element when modal opens
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle keyboard events for focus trap
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleKeyDown);
    return () => {
      modal.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Preserve scroll position on every render
  React.useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      // Restore scroll position after render
      scrollContainerRef.current.scrollTop = savedScrollPosition.current;
    }
  });

  // Save scroll position when user scrolls
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      savedScrollPosition.current = scrollContainerRef.current.scrollTop;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 16px',
        zIndex: 50
      }}
      data-testid="modal-overlay"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          maxWidth: '672px',
          width: '100%',
          maxHeight: 'calc(100vh - 80px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            overflowAnchor: 'none'
          }}
        >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }} data-testid="modal-job-title">{job.title}</h2>
            <p style={{ fontSize: '20px', color: '#6b7280', marginBottom: '8px' }} data-testid="modal-company">{job.company}</p>
            <span
              data-testid="modal-job-id"
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '4px',
                backgroundColor: '#e0e7ff',
                color: '#4338ca',
                fontSize: '13px',
                fontWeight: '500',
                fontFamily: 'monospace'
              }}
              title="Job ID (for reference in chat)">
              ID: {job.job_id.substring(0, 8)}
            </span>
          </div>
          <button
            data-testid="modal-close-x"
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
          <span
            data-testid="modal-status"
            style={{
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
              <p style={{ fontWeight: 600 }} data-testid="modal-salary">${job.salary.toLocaleString()}</p>
            </div>
          )}
          {job.location && (
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Location</p>
              <p style={{ fontWeight: 600 }} data-testid="modal-location">{job.location}</p>
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
            <p style={{ fontWeight: 600 }} data-testid="modal-source">{job.source}</p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>Date Collected</p>
            <p style={{ fontWeight: 600 }} data-testid="date-collected">{new Date(job.date_email_sent).toLocaleDateString()}</p>
          </div>
        </div>

        {job.url && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '8px' }}>Job Link</h3>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="job-url"
              style={{ color: '#3b82f6', textDecoration: 'underline' }}
            >
              {job.url}
            </a>
          </div>
        )}

        {/* Compensation Details Section */}
        {job.raw_data?.compensation && (
          <div style={{ marginBottom: '24px' }} data-testid="compensation-section">
            <h3 style={{ fontWeight: 600, marginBottom: '12px', color: '#111827' }}>Compensation Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '14px' }}>
              {job.raw_data.compensation.type && (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Type</p>
                  <p style={{ fontWeight: 500, color: '#374151' }} data-testid="comp-type">{formatCompensationType(job.raw_data.compensation.type)}</p>
                </div>
              )}
              <div>
                <p style={{ color: '#6b7280', marginBottom: '4px' }}>Salary Range</p>
                <p style={{ fontWeight: 500, color: '#374151' }} data-testid="comp-range">{formatSalaryRange(job.raw_data.compensation)}</p>
              </div>
              {job.raw_data.compensation.equity_offered !== null && job.raw_data.compensation.equity_offered !== undefined && (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Equity</p>
                  <p style={{ fontWeight: 500, color: '#374151' }}>{job.raw_data.compensation.equity_offered ? 'Yes' : 'No'}</p>
                </div>
              )}
              {job.raw_data.compensation.bonus_structure && (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Bonus Structure</p>
                  <p style={{ fontWeight: 500, color: '#374151' }}>{job.raw_data.compensation.bonus_structure}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Employment Details Section */}
        {job.raw_data?.employment && (
          <div style={{ marginBottom: '24px' }} data-testid="employment-section">
            <h3 style={{ fontWeight: 600, marginBottom: '12px', color: '#111827' }}>Employment Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '14px' }}>
              {job.raw_data.employment.tax_structure && (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Tax Structure</p>
                  <p style={{ fontWeight: 500, color: '#374151' }} data-testid="emp-tax">{formatTaxStructure(job.raw_data.employment.tax_structure)}</p>
                </div>
              )}
              {job.raw_data.employment.relationship && (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Relationship</p>
                  <p style={{ fontWeight: 500, color: '#374151' }} data-testid="emp-relationship">{formatEmploymentRelationship(job.raw_data.employment.relationship)}</p>
                </div>
              )}
              {job.raw_data.employment.contract_duration && (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Duration</p>
                  <p style={{ fontWeight: 500, color: '#374151' }}>{job.raw_data.employment.contract_duration}</p>
                </div>
              )}
              {job.raw_data.employment.agency_name && (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Agency</p>
                  <p style={{ fontWeight: 500, color: '#374151' }}>{job.raw_data.employment.agency_name}</p>
                </div>
              )}
              {job.raw_data.employment.benefits && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Benefits</p>
                  <p style={{ fontWeight: 500, color: '#374151' }}>{job.raw_data.employment.benefits}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Location & Commute Section */}
        {(job.raw_data?.remote_work || job.raw_data?.commute) && (
          <div style={{ marginBottom: '24px' }} data-testid="location-commute-section">
            <h3 style={{ fontWeight: 600, marginBottom: '12px', color: '#111827' }}>Location & Commute</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '14px' }}>
              {job.raw_data.remote_work?.policy && (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Remote Policy</p>
                  <p style={{ fontWeight: 500, color: '#374151' }} data-testid="remote-policy">{formatRemotePolicy(job.raw_data.remote_work.policy)}</p>
                </div>
              )}
              {job.raw_data.remote_work?.days_onsite_per_week !== null && job.raw_data.remote_work?.days_onsite_per_week !== undefined && (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Days Onsite</p>
                  <p style={{ fontWeight: 500, color: '#374151' }}>{job.raw_data.remote_work.days_onsite_per_week} days/week</p>
                </div>
              )}
              {job.raw_data.commute?.office_location && (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Office Location</p>
                  <p style={{ fontWeight: 500, color: '#374151' }}>{job.raw_data.commute.office_location}</p>
                </div>
              )}
              {job.raw_data.commute?.company_shuttle !== null && job.raw_data.commute?.company_shuttle !== undefined && (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Company Shuttle</p>
                  <p style={{ fontWeight: 500, color: '#374151' }}>{job.raw_data.commute.company_shuttle ? 'Yes' : 'No'}</p>
                </div>
              )}
              {job.raw_data.commute?.commute_perks && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Commute Perks</p>
                  <p style={{ fontWeight: 500, color: '#374151' }}>{job.raw_data.commute.commute_perks}</p>
                </div>
              )}
              {job.raw_data.commute?.schedule_flexibility && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Schedule Flexibility</p>
                  <p style={{ fontWeight: 500, color: '#374151' }}>{job.raw_data.commute.schedule_flexibility}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Technical Details Section */}
        {job.raw_data?.job_domain && (
          <div style={{ marginBottom: '24px' }} data-testid="technical-section">
            <h3 style={{ fontWeight: 600, marginBottom: '12px', color: '#111827' }}>Technical Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '14px' }}>
              {job.raw_data.job_domain.primary_category && (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Category</p>
                  <p style={{ fontWeight: 500, color: '#374151' }} data-testid="tech-category">{job.raw_data.job_domain.primary_category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                </div>
              )}
              {job.raw_data.job_domain.seniority && (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Seniority</p>
                  <p style={{ fontWeight: 500, color: '#374151' }} data-testid="tech-seniority">{formatSeniority(job.raw_data.job_domain.seniority)}</p>
                </div>
              )}
              {job.raw_data.job_domain.testing_focus !== null && job.raw_data.job_domain.testing_focus !== undefined && (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Testing Focus</p>
                  <p style={{ fontWeight: 500, color: '#374151' }}>{job.raw_data.job_domain.testing_focus ? 'Yes' : 'No'}</p>
                </div>
              )}
              {job.raw_data.job_domain.automation_focus !== null && job.raw_data.job_domain.automation_focus !== undefined && (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Automation Focus</p>
                  <p style={{ fontWeight: 500, color: '#374151' }}>{job.raw_data.job_domain.automation_focus ? 'Yes' : 'No'}</p>
                </div>
              )}
              {job.raw_data.job_domain.generative_ai_usage !== null && job.raw_data.job_domain.generative_ai_usage !== undefined && (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Generative AI</p>
                  <p style={{ fontWeight: 500, color: '#374151' }}>{job.raw_data.job_domain.generative_ai_usage ? 'Yes' : 'No'}</p>
                </div>
              )}
              {job.raw_data.job_domain.testing_level && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Testing Level</p>
                  <p style={{ fontWeight: 500, color: '#374151' }}>{job.raw_data.job_domain.testing_level}</p>
                </div>
              )}
              {job.raw_data.job_domain.test_equipment && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Test Equipment</p>
                  <p style={{ fontWeight: 500, color: '#374151' }}>{job.raw_data.job_domain.test_equipment}</p>
                </div>
              )}
              {job.raw_data.job_domain.tech_stack && job.raw_data.job_domain.tech_stack.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Tech Stack</p>
                  <p style={{ fontWeight: 500, color: '#374151' }}>{job.raw_data.job_domain.tech_stack.join(', ')}</p>
                </div>
              )}
              {job.raw_data.job_domain.test_automation_tools && job.raw_data.job_domain.test_automation_tools.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ color: '#6b7280', marginBottom: '4px' }}>Automation Tools</p>
                  <p style={{ fontWeight: 500, color: '#374151' }}>{job.raw_data.job_domain.test_automation_tools.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Description Section - prefer email body from email_jobs */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '8px' }}>
            {job.source === 'gmail' ? 'Full Email Body' : 'Job Description'}
            {emailBody && (emailBody.sender_name || emailBody.sender_email) && (
              <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#6b7280', marginLeft: '8px' }}>
                from {emailBody.sender_name || emailBody.sender_email}
              </span>
            )}
          </h3>
          <div data-testid="job-description">
            {emailBody?.body_text ? (
              renderDescription(emailBody.body_text)
            ) : emailBody?.body_html ? (
              <div dangerouslySetInnerHTML={{ __html: emailBody.body_html }} style={{
                maxHeight: '400px',
                overflow: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                padding: '12px'
              }} />
            ) : job.raw_data?.description || job.description ? (
              renderDescription(job.raw_data?.description || job.description || '')
            ) : job.source === 'gmail' ? (
              <div style={{
                padding: '16px',
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '4px',
                color: '#92400e'
              }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Original email not available</p>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  This job may have been marked as a duplicate during import.
                  If you need to see the original email, please run the database migration script to link orphaned emails.
                </p>
              </div>
            ) : (
              <div style={{
                padding: '16px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                color: '#6b7280'
              }}>
                <p style={{ margin: 0 }}>No description available</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {(job.status === 'new' || job.status === 'filtered' || job.status === 'rejected') && (
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
                  cursor: 'pointer',
                  scrollMarginTop: '9999px'
                }}
              >
                Approve
              </button>
              <button
                onClick={() => { rejectJob(job.job_id); onClose(); }}
                style={{
                  flex: 1,
                  backgroundColor: '#ef4444',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  scrollMarginTop: '9999px'
                }}
                data-testid="reject-job-button-modal"
              >
                Reject
              </button>
            </>
          )}
          {job.status === 'approved' && (
            <>
              <button
                onClick={async () => {
                  await generateContent(job.job_id);
                  onClose();
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  scrollMarginTop: '9999px'
                }}
              >
                Generate Resume & Cover Letter
              </button>
              <button
                onClick={() => { updateJobStatus(job.job_id, 'applied'); onClose(); }}
                style={{
                  flex: 1,
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  scrollMarginTop: '9999px'
                }}
              >
                Mark as Applied
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: check job ID and all callback references
  // This prevents re-renders when the job object reference changes but the data is the same
  const jobSame = prevProps.job.job_id === nextProps.job.job_id;
  const callbacksSame =
    prevProps.onClose === nextProps.onClose &&
    prevProps.updateJobStatus === nextProps.updateJobStatus &&
    prevProps.generateContent === nextProps.generateContent &&
    prevProps.renderDescription === nextProps.renderDescription &&
    prevProps.formatCompensationType === nextProps.formatCompensationType &&
    prevProps.formatSalaryRange === nextProps.formatSalaryRange &&
    prevProps.formatTaxStructure === nextProps.formatTaxStructure &&
    prevProps.formatEmploymentRelationship === nextProps.formatEmploymentRelationship &&
    prevProps.formatRemotePolicy === nextProps.formatRemotePolicy &&
    prevProps.formatSeniority === nextProps.formatSeniority &&
    prevProps.getStatusColor === nextProps.getStatusColor;

  const shouldSkipRender = jobSame && callbacksSame;
  console.log('[React.memo] Comparison:', { jobSame, callbacksSame, shouldSkipRender });
  return shouldSkipRender;
});

const JobHunterDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  // ISSUE-023: Use ref to track current jobs without adding to dependency arrays
  const jobsRef = React.useRef<Job[]>([]);
  const [jobScores, setJobScores] = useState<Map<string, JobScore>>(new Map());
  const [applications, setApplications] = useState<Application[]>([]);
  const [criteria, setCriteria] = useState<JobCriteria | null>(null);
  const [stats, setStats] = useState<JobStats>({});
  const [activeTab, setActiveTab] = useState<TabType>('intake');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Debug: Log when selectedJob changes
  React.useEffect(() => {
    console.log('[Parent] selectedJob changed:', selectedJob ? `Job ID: ${selectedJob.job_id}` : 'null');
  }, [selectedJob]);

  // ISSUE-023: Keep jobsRef in sync with jobs state
  React.useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showCriteriaConfig, setShowCriteriaConfig] = useState<boolean>(false);
  const [criteriaForm, setCriteriaForm] = useState<Partial<JobCriteria>>({});
  const [savingCriteria, setSavingCriteria] = useState<boolean>(false);
  const [criteriaError, setCriteriaError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [generatedContentJob, setGeneratedContentJob] = useState<Job | null>(null);
  const [showContentGeneration, setShowContentGeneration] = useState<boolean>(false);
  const [generatingContent, setGeneratingContent] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showResumeManagement, setShowResumeManagement] = useState<boolean>(false);
  const [resumes, setResumes] = useState<ResumeVersion[]>([]);
  const [isUploadingResume, setIsUploadingResume] = useState<boolean>(false);
  const [resumeUploadError, setResumeUploadError] = useState<string | null>(null);
  const [showEmailComposer, setShowEmailComposer] = useState<boolean>(false);
  const [emailComposerJob, setEmailComposerJob] = useState<Job | null>(null);
  const [condensedDescriptions, setCondensedDescriptions] = useState<Record<string, string>>({});
  const [validDescriptionFlags, setValidDescriptionFlags] = useState<Record<string, boolean>>({});

  // Track which jobs are currently being fetched to prevent duplicate requests
  const fetchingJobsRef = React.useRef<Set<string>>(new Set());

  // Ref to track setTimeout for cleanup (ISSUE-021 Option iii)
  const downloadTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Ref for content generation modal focus trap
  const contentModalRef = React.useRef<HTMLDivElement>(null);

  const fetchJobs = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/jobs`);
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      const data: Job[] = await response.json();
      setJobs(data);
      setLoading(false);

      // Fetch scores for all jobs
      const jobIds = data.map(job => job.job_id);
      fetchJobScores(jobIds);
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
          date_email_sent: new Date().toISOString(),
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
          date_email_sent: new Date().toISOString(),
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
          date_email_sent: new Date(Date.now() - 86400000).toISOString(),
          source: 'dice',
          description: 'Develop firmware validation frameworks...'
        }
      ]);
      setLoading(false);
    }
  };

  const fetchJobScores = async (jobIds: string[]): Promise<void> => {
    try {
      const scoresMap = new Map<string, JobScore>();

      // Fetch scores for all jobs in parallel
      await Promise.all(
        jobIds.map(async (jobId) => {
          try {
            const response = await fetch(`${API_URL}/jobs/${jobId}/score`);
            if (response.ok) {
              const score: JobScore = await response.json();
              scoresMap.set(jobId, score);
            }
          } catch (error) {
            // Silently ignore missing scores
            console.debug(`No score found for job ${jobId}`);
          }
        })
      );

      setJobScores(scoresMap);
    } catch (error) {
      console.error('Error fetching job scores:', error);
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
      if (!response.ok) {
        throw new Error(`Stats API returned status ${response.status}`);
      }
      const data: JobStats = await response.json();

      // Fetch ignored emails count
      try {
        const ignoredResponse = await fetch(`${API_URL}/intake/ignored-emails`);
        if (ignoredResponse.ok) {
          const ignoredData = await ignoredResponse.json();
          data.ignored = ignoredData.length;
        }
      } catch (err) {
        console.error('Error fetching ignored count:', err);
        data.ignored = 0;
      }

      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default stats on error
      setStats({ new: 0, approved: 0, applied: 0, filtered: 0, rejected: 0, ignored: 0 });
    }
  };

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await Promise.all([fetchJobs(), fetchStats(), fetchApplications()]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRescoreAll = async (): Promise<void> => {
    const confirmed = window.confirm('Rescore all jobs? This will recalculate scores for all jobs in the database.');
    if (!confirmed) return;

    setRefreshing(true);
    try {
      const response = await fetch(`${API_URL}/jobs/calculate-all-scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Failed to rescore jobs: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      alert(`Rescoring complete!\n\nScored: ${result.scored_count}\nFailed: ${result.failed_count}`);

      // Refresh data to show updated scores
      await handleRefresh();
    } catch (error) {
      console.error('Error rescoring jobs:', error);
      alert(`Error rescoring jobs: ${error}`);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenCriteriaConfig = async (): Promise<void> => {
    try {
      // Load current criteria and get the result directly
      const response = await fetch(`${API_URL}/criteria`);
      let loadedCriteria: JobCriteria | null = null;

      if (response.ok) {
        loadedCriteria = await response.json();
        setCriteria(loadedCriteria);
      }

      // Initialize form with loaded criteria or defaults
      setCriteriaForm({
        min_salary: loadedCriteria?.min_salary ?? 130000,
        max_commute_time: loadedCriteria?.max_commute_time ?? 45,
        max_commute_days_per_week: loadedCriteria?.max_commute_days_per_week ?? 3,
        preferred_domains: loadedCriteria?.preferred_domains ?? ['Software Testing', 'Test Automation', 'Firmware Engineering', 'Generative AI', 'Prompt Engineering'],
        remote_preference: loadedCriteria?.remote_preference ?? 'preferred'
      });
      setCriteriaError(null);
      setShowCriteriaConfig(true);
    } catch (error) {
      console.error('Error loading criteria:', error);
      setCriteriaError('Failed to load criteria');
    }
  };

  const handleSaveCriteria = async (): Promise<void> => {
    setSavingCriteria(true);
    setCriteriaError(null);

    try {
      const response = await fetch(`${API_URL}/criteria`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          min_salary: criteriaForm.min_salary,
          max_commute_time: criteriaForm.max_commute_time,
          max_commute_days_per_week: criteriaForm.max_commute_days_per_week,
          preferred_domains: criteriaForm.preferred_domains,
          remote_preference: criteriaForm.remote_preference
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save criteria: ${response.status}`);
      }

      const savedCriteria: JobCriteria = await response.json();
      setCriteria(savedCriteria);
      setShowCriteriaConfig(false);

      // Optionally refresh jobs to apply new filtering
      await fetchJobs();
    } catch (error) {
      console.error('Error saving criteria:', error);
      setCriteriaError('Failed to save criteria. Please try again.');
    } finally {
      setSavingCriteria(false);
    }
  };

  const handleCriteriaFormChange = (field: keyof JobCriteria, value: any): void => {
    setCriteriaForm(prev => ({ ...prev, [field]: value }));
  };

  const updateJobStatus = useCallback(async (jobId: string, newStatus: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/jobs/${jobId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update job status: ${response.status} ${response.statusText}. ${errorText}`);
      }

      // Wait for the status update to complete before refreshing
      await fetchJobs();
      await fetchStats();
    } catch (error) {
      console.error('Error updating job status:', error);
      // Use functional setState to avoid needing jobs in dependency array
      // Optimistically update UI even if fetch fails
      setJobs(prevJobs => prevJobs.map(j => j.job_id === jobId ? {...j, status: newStatus} : j));
      // Don't re-throw - we've handled the error with optimistic update
    }
  }, []); // Empty dependency array since we use functional setState and fetchJobs/fetchStats are stable

  const rejectJob = useCallback(async (jobId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/jobs/${jobId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to reject job: ${response.status} ${response.statusText}. ${errorText}`);
      }

      // Wait for the rejection to complete before refreshing
      await fetchJobs();
      await fetchStats();

      // Show success notification
      console.log('Job rejected successfully. Gmail labels updated.');
    } catch (error) {
      console.error('Error rejecting job:', error);
      // Use functional setState to avoid needing jobs in dependency array
      // Optimistically update UI even if fetch fails
      setJobs(prevJobs => prevJobs.map(j => j.job_id === jobId ? {...j, status: 'rejected'} : j));
      // Don't re-throw - we've handled the error with optimistic update
    }
  }, []); // Empty dependency array since we use functional setState and fetchJobs/fetchStats are stable

  const generateContent = useCallback(async (jobId: string): Promise<void> => {
    console.log('[generateContent] Called for job:', jobId);
    setGeneratedContent(null);
    setGenerationError(null);
    setGeneratingContent(true);

    try {
      console.log('[generateContent] Fetching content from API');
      const response = await fetch(`${API_URL}/jobs/${jobId}/generate-content`);

      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error('Server error. Please try again in a moment.');
        } else if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment.');
        } else {
          throw new Error('Failed to generate content. Please try again.');
        }
      }

      let content: GeneratedContent;
      try {
        content = await response.json();
      } catch (parseError) {
        throw new Error('Invalid response from server. Please try again.');
      }

      console.log('[generateContent] Content received, updating state');

      // Find the current job from ref (ISSUE-023: Use ref to avoid stale closure)
      const job = jobsRef.current.find(j => j.job_id === jobId);
      console.log('[generateContent] Found job:', job ? job.title : 'not found');

      // Set job and content states (ISSUE-023: Fixed nested setState anti-pattern)
      setGeneratedContentJob(job || null);
      setGeneratedContent(content);

      // Fetch applications to ensure we have the latest application_id BEFORE opening modal
      // This ensures the application exists when EmailComposer tries to render
      await fetchApplications();

      // Open the modal (after application is fetched)
      setShowContentGeneration(true);

      console.log('[generateContent] Modal state updated, should be visible now');
    } catch (error) {
      console.error('[generateContent] Error generating content:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setGenerationError(errorMessage);
    } finally {
      setGeneratingContent(false);
      console.log('[generateContent] Generation complete');
    }
  }, []); // ISSUE-023: Empty dependency array, use jobsRef to access current jobs

  const downloadGeneratedContent = (): void => {
    if (!generatedContent || !generatedContentJob) return;

    // Create a sanitized filename base from company and job title
    const sanitize = (str: string) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const companyName = sanitize(generatedContentJob.company);
    const jobTitle = sanitize(generatedContentJob.title);
    const timestamp = new Date(generatedContent.generated_at).toISOString().split('T')[0];
    const filenameBase = `${companyName}_${jobTitle}_${timestamp}`;

    // Download resume
    const resumeBlob = new Blob([generatedContent.resume], { type: 'text/markdown' });
    const resumeUrl = URL.createObjectURL(resumeBlob);
    const resumeLink = document.createElement('a');
    resumeLink.href = resumeUrl;
    resumeLink.download = `${filenameBase}_resume.md`;
    document.body.appendChild(resumeLink);
    resumeLink.click();
    document.body.removeChild(resumeLink);
    URL.revokeObjectURL(resumeUrl);

    // Download cover letter (with a small delay to avoid browser blocking multiple downloads)
    // Store timeout ID for cleanup (ISSUE-021 Option iii)
    downloadTimeoutRef.current = setTimeout(() => {
      const coverLetterBlob = new Blob([generatedContent.cover_letter], { type: 'text/plain' });
      const coverLetterUrl = URL.createObjectURL(coverLetterBlob);
      const coverLetterLink = document.createElement('a');
      coverLetterLink.href = coverLetterUrl;
      coverLetterLink.download = `${filenameBase}_cover_letter.txt`;
      document.body.appendChild(coverLetterLink);
      coverLetterLink.click();
      document.body.removeChild(coverLetterLink);
      URL.revokeObjectURL(coverLetterUrl);
    }, 100);
  };

  const fetchCondensedDescription = async (jobId: string): Promise<void> => {
    // Check if already fetched
    if (condensedDescriptions[jobId]) return;

    // Check if already being fetched to prevent duplicate requests
    if (fetchingJobsRef.current.has(jobId)) return;

    // Mark as being fetched
    fetchingJobsRef.current.add(jobId);

    try {
      const response = await fetch(`${API_URL}/jobs/${jobId}/condense-description`);
      if (response.ok) {
        const data = await response.json();
        setCondensedDescriptions(prev => ({
          ...prev,
          [jobId]: data.condensed_description
        }));
        // Store the validation flag from backend (ISSUE-006 Option 1)
        if (data.has_valid_description !== undefined) {
          setValidDescriptionFlags(prev => ({
            ...prev,
            [jobId]: data.has_valid_description
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching condensed description:', error);
    } finally {
      // Remove from fetching set when done
      fetchingJobsRef.current.delete(jobId);
    }
  };

  // Clear all cached condensed descriptions
  const clearAllDescriptions = (): void => {
    setCondensedDescriptions({});
    setValidDescriptionFlags({});
  };

  // Refresh a single job's condensed description
  const refreshSingleDescription = async (jobId: string): Promise<void> => {
    // Prevent duplicate refresh requests
    if (fetchingJobsRef.current.has(jobId)) return;

    // Mark as being fetched
    fetchingJobsRef.current.add(jobId);

    // Remove from cache to show "Loading..." state
    setCondensedDescriptions(prev => {
      const newDescriptions = { ...prev };
      delete newDescriptions[jobId];
      return newDescriptions;
    });

    // Re-fetch immediately
    try {
      const response = await fetch(`${API_URL}/jobs/${jobId}/condense-description`);
      if (response.ok) {
        const data = await response.json();
        setCondensedDescriptions(prev => ({
          ...prev,
          [jobId]: data.condensed_description
        }));
        // Store the validation flag from backend (ISSUE-006 Option 1)
        if (data.has_valid_description !== undefined) {
          setValidDescriptionFlags(prev => ({
            ...prev,
            [jobId]: data.has_valid_description
          }));
        }
      }
    } catch (error) {
      console.error('Error refreshing condensed description:', error);
    } finally {
      // Remove from fetching set when done
      fetchingJobsRef.current.delete(jobId);
    }
  };

  const openEmailComposer = (job: Job): void => {
    setEmailComposerJob(job);
    setShowEmailComposer(true);
  };

  const getApplicationForJob = (jobId: string): Application | undefined => {
    return applications.find(app => app.job_id === jobId);
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

  // Helper function to check if a job has a valid condensed description
  // ISSUE-006 Option 1: Use backend validation flag instead of parsing text
  const hasValidDescription = (jobId: string): boolean => {
    // If we have a validation flag from the backend, use it (single source of truth)
    if (validDescriptionFlags[jobId] !== undefined) {
      return validDescriptionFlags[jobId];
    }

    // Fallback for backward compatibility: if no flag exists yet, check if description exists
    // This handles the case where old cached data doesn't have the flag
    const desc = condensedDescriptions[jobId];
    if (!desc) return false;

    // Legacy string matching as fallback (will be phased out as cache refreshes)
    const invalidDescriptions = [
      'Loading description...',
      'No job description to be extracted.',
      'No description available.',
      ''
    ];

    return !invalidDescriptions.includes(desc.trim());
  };

  const filterJobs = (status: string): Job[] => {
    const filtered = jobs.filter(job => job.status === status);
    // Sort by: 1) has valid description (first), 2) total_score DESC (highest first), 3) nulls last
    return filtered.sort((a, b) => {
      const hasDescA = hasValidDescription(a.job_id);
      const hasDescB = hasValidDescription(b.job_id);

      // Jobs with valid descriptions come first
      if (hasDescA && !hasDescB) return -1;
      if (!hasDescA && hasDescB) return 1;

      // If both have or both lack descriptions, sort by score
      const scoreA = jobScores.get(a.job_id)?.total_score;
      const scoreB = jobScores.get(b.job_id)?.total_score;

      // Handle nulls/undefined
      if (scoreA === null || scoreA === undefined) return 1;
      if (scoreB === null || scoreB === undefined) return -1;

      // Sort descending (higher scores first)
      return scoreB - scoreA;
    });
  };

  const getAllActiveJobs = (): Job[] => {
    // Exclude rejected jobs from "All" tab - show only active workflow jobs
    const filtered = jobs.filter(job => job.status !== 'rejected');
    // Sort by: 1) has valid description (first), 2) total_score DESC (highest first), 3) nulls last
    return filtered.sort((a, b) => {
      const hasDescA = hasValidDescription(a.job_id);
      const hasDescB = hasValidDescription(b.job_id);

      // Jobs with valid descriptions come first
      if (hasDescA && !hasDescB) return -1;
      if (!hasDescA && hasDescB) return 1;

      // If both have or both lack descriptions, sort by score
      const scoreA = jobScores.get(a.job_id)?.total_score;
      const scoreB = jobScores.get(b.job_id)?.total_score;

      // Handle nulls/undefined
      if (scoreA === null || scoreA === undefined) return 1;
      if (scoreB === null || scoreB === undefined) return -1;

      // Sort descending (higher scores first)
      return scoreB - scoreA;
    });
  };

  // Helper function to get display label for tabs
  const getTabLabel = (tab: TabType): string => {
    if (tab === 'ignored') return 'Non-Job Emails';
    if (tab === 'ranked') return 'Ranked Jobs';
    if (tab === 'new') return 'New Jobs';
    return tab.charAt(0).toUpperCase() + tab.slice(1);
  };

  // Memoized close handler for JobDetails modal
  const handleCloseJobDetails = useCallback(() => {
    setSelectedJob(null);
  }, []);

  useEffect(() => {
    fetchJobs();
    fetchStats();
    fetchApplications();
  }, []);

  // Handle Escape key for modals
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showEmailComposer) {
          setShowEmailComposer(false);
        } else if (selectedJob) {
          setSelectedJob(null);
        } else if (showContentGeneration) {
          setShowContentGeneration(false);
        } else if (showCriteriaConfig) {
          setShowCriteriaConfig(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedJob, showContentGeneration, showCriteriaConfig, showEmailComposer]);

  // Cleanup setTimeout on unmount (ISSUE-021 Option iii)
  useEffect(() => {
    return () => {
      if (downloadTimeoutRef.current) {
        clearTimeout(downloadTimeoutRef.current);
      }
    };
  }, []);

  // Focus trap for content generation modal
  useEffect(() => {
    if (!showContentGeneration) return;

    const modal = contentModalRef.current;
    if (!modal) return;

    // Get all focusable elements
    const getFocusableElements = (): HTMLElement[] => {
      const selectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      return Array.from(modal.querySelectorAll(selectors)) as HTMLElement[];
    };

    // Focus first element when modal opens
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle keyboard events for focus trap
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleKeyDown);
    return () => {
      modal.removeEventListener('keydown', handleKeyDown);
    };
  }, [showContentGeneration]);

  const meetsMinSalary = (job: Job): boolean => job.salary ? job.salary >= 130000 : false;
  const isRemote = (job: Job): boolean => job.location?.toLowerCase().includes('remote') || false;
  const withinCommute = (job: Job): boolean => !job.commute_time || job.commute_time <= 45;

  const JobCard: React.FC<{ job: Job }> = ({ job }) => {
    // Fetch condensed description when card renders
    React.useEffect(() => {
      fetchCondensedDescription(job.job_id);
    }, [job.job_id]);

    // Get score for this job
    const score = jobScores.get(job.job_id);

    // Helper function for score badge color
    const getScoreBadgeColor = (totalScore: number | null | undefined): { bg: string; text: string } => {
      if (totalScore === null || totalScore === undefined) return { bg: '#f3f4f6', text: '#6b7280' };
      if (totalScore >= 70) return { bg: '#d1fae5', text: '#065f46' };
      if (totalScore >= 40) return { bg: '#fef3c7', text: '#92400e' };
      return { bg: '#fee2e2', text: '#991b1b' };
    };

    return (
    <div
      className="bg-white border rounded-lg p-4 mb-3 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => setSelectedJob(job)}
      style={{ border: '1px solid #e5e7eb' }}
      data-testid="job-card"
      data-job-id={job.job_id}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontWeight: 600, fontSize: '18px', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} data-testid="job-title">{job.title}</h3>
          <p style={{ color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} data-testid="job-company">{job.company}</p>

          {/* Header metadata: Score (FIRST), Industry, Employment Type, Extraction Method */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', fontSize: '12px' }}>
            {/* Overall Score Badge (FIRST) */}
            {score && score.total_score != null ? (
              <span
                data-testid="header-score"
                style={{
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: '600',
                  ...getScoreBadgeColor(score.total_score)
                }}>
                ⭐ Score: {score.total_score.toFixed(1)} {score.rank && `(#${score.rank})`}
              </span>
            ) : (
              <span
                data-testid="header-score-not-scored"
                title="This job has not been scored yet. Click 'Rescore All' to calculate scores for all jobs."
                style={{
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: '600',
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  cursor: 'help'
                }}>
                ⭐ Not Scored
              </span>
            )}

            {/* Company Industry */}
            {job.raw_data?.company_industry && (
              <span
                data-testid="industry-badge"
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#eef2ff',
                  color: '#4f46e5',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                🏢 {job.raw_data.company_industry}
                {job.raw_data.company_industry_source === 'inferred' && ' (inferred)'}
              </span>
            )}

            {/* Employment Type */}
            {job.raw_data?.employment?.employment_type && (
              <span
                data-testid="employment-type-badge"
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  backgroundColor:
                    job.raw_data.employment.employment_type === 'full-time' ? '#d1fae5' :
                    job.raw_data.employment.employment_type === 'part-time' ? '#fed7aa' :
                    job.raw_data.employment.employment_type === 'contract' ? '#fef3c7' : '#fed7aa',
                  color:
                    job.raw_data.employment.employment_type === 'full-time' ? '#065f46' :
                    job.raw_data.employment.employment_type === 'part-time' ? '#c2410c' :
                    job.raw_data.employment.employment_type === 'contract' ? '#92400e' : '#c2410c'
                }}>
                {job.raw_data.employment.employment_type.split('-').map(word =>
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join('-')}
                {job.raw_data.employment.employment_type_source === 'inferred' && ' (inferred)'}
              </span>
            )}

            {/* Extraction Method */}
            <span style={{
              padding: '2px 6px',
              borderRadius: '3px',
              backgroundColor: (job.extraction_method === 'llm' || (job.raw_data as any)?.extraction_method === 'llm') ? '#dbeafe' : '#fed7aa',
              color: (job.extraction_method === 'llm' || (job.raw_data as any)?.extraction_method === 'llm') ? '#1e40af' : '#c2410c',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              {(job.extraction_method || (job.raw_data as any)?.extraction_method)?.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>
        </div>
        {getStatusIcon(job.status)}
      </div>
      
      <div data-testid="badge-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', fontSize: '14px' }}>
        {job.salary && (
          <span
            data-testid="salary-badge"
            className={`salary-badge ${meetsMinSalary(job) ? 'salary-badge-green' : 'salary-badge-red'}`}
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
            data-testid="location-badge"
            className={`location-badge ${isRemote(job) ? 'location-badge-blue' : 'location-badge-gray'}`}
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

        <span
          data-testid="job-date"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: '#f3f4f6',
            color: '#374151'
          }}>
          <CalendarIcon style={{ width: '16px', height: '16px' }} />
          {new Date(job.date_email_sent).toLocaleDateString()}
        </span>

        {/* Job ID badge */}
        <span
          data-testid="job-id-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: '#e0e7ff',
            color: '#4338ca',
            fontSize: '12px',
            fontWeight: '500',
            fontFamily: 'monospace'
          }}
          title="Job ID (for reference in chat)">
          ID: {job.job_id.substring(0, 8)}
        </span>

        {/* Trade-off badges */}
        {job.raw_data?.employment?.tax_structure && (
          <span
            data-testid="tax-structure-badge"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor:
                job.raw_data.employment.tax_structure === '1099' ||
                job.raw_data.employment.tax_structure === 'schedule_c' ? '#d1fae5' :
                job.raw_data.employment.tax_structure === 'W2' ? '#fef3c7' : '#f3f4f6',
              color:
                job.raw_data.employment.tax_structure === '1099' ||
                job.raw_data.employment.tax_structure === 'schedule_c' ? '#065f46' :
                job.raw_data.employment.tax_structure === 'W2' ? '#92400e' : '#374151'
            }}>
            {formatTaxStructure(job.raw_data.employment.tax_structure)}
          </span>
        )}

        {job.raw_data?.remote_work?.policy === 'fully_remote' && (
          <span
            data-testid="fully-remote-badge"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: '#dbeafe',
              color: '#1e40af'
            }}>
            Fully Remote
          </span>
        )}

        {job.raw_data?.commute?.company_shuttle && (
          <span
            data-testid="shuttle-badge"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: '#d1fae5',
              color: '#065f46'
            }}>
            Company Shuttle
          </span>
        )}

        {job.raw_data?.job_domain?.generative_ai_usage && (
          <span
            data-testid="ai-badge"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: '#e0e7ff',
              color: '#3730a3'
            }}>
            Gen AI
          </span>
        )}

        {job.raw_data?.job_domain?.testing_focus && (
          <span
            data-testid="testing-badge"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: '#fef3c7',
              color: '#92400e'
            }}>
            Testing Focus
          </span>
        )}

        {/* Contract Duration Badge */}
        {job.raw_data?.employment?.contract_duration && (
          <span
            data-testid="contract-duration-badge"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: '#fef3c7',
              color: '#92400e'
            }}>
            ⏱️ {job.raw_data.employment.contract_duration}
          </span>
        )}

        {/* Agency Name Badge */}
        {job.raw_data?.employment?.agency_name && (
          <span
            data-testid="agency-badge"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: '#fed7aa',
              color: '#c2410c'
            }}>
            🏢 via {job.raw_data.employment.agency_name}
          </span>
        )}

        {/* Seniority Level Badge */}
        {job.raw_data?.job_domain?.seniority && (
          <span
            data-testid="seniority-badge"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: '#dbeafe',
              color: '#1e40af'
            }}>
            📊 {formatSeniority(job.raw_data.job_domain.seniority)}
          </span>
        )}

        {/* Days Onsite Badge */}
        {job.raw_data?.remote_work?.days_onsite_per_week !== null &&
         job.raw_data?.remote_work?.days_onsite_per_week !== undefined && (
          <span
            data-testid="days-onsite-badge"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: '#dbeafe',
              color: '#1e40af'
            }}>
            📅 {job.raw_data.remote_work.days_onsite_per_week} days/week onsite
          </span>
        )}

        {/* Equity Offered Badge */}
        {(job.raw_data?.compensation?.equity_offered || job.raw_data?.compensation?.equity_details) && (
          <span
            data-testid="equity-badge"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: '#d1fae5',
              color: '#065f46'
            }}>
            💰 {job.raw_data.compensation.equity_details || 'Equity'}
          </span>
        )}

        {/* Bonus Structure Badge */}
        {(job.raw_data?.compensation?.bonus || job.raw_data?.compensation?.bonus_structure) && (
          <span
            data-testid="bonus-badge"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: '#d1fae5',
              color: '#065f46'
            }}>
            💵 {job.raw_data.compensation.bonus || job.raw_data.compensation.bonus_structure}
          </span>
        )}

        {/* Tech Stack Badge */}
        {job.raw_data?.job_domain?.tech_stack && job.raw_data.job_domain.tech_stack.length > 0 && (
          <span
            data-testid="tech-stack-badge"
            style={{
              display: 'inline-block',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: '#f3e8ff',
              color: '#7c3aed',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={job.raw_data.job_domain.tech_stack.join(', ')}>
            ⚙️ {job.raw_data.job_domain.tech_stack.slice(0, 3).join(', ')}
            {job.raw_data.job_domain.tech_stack.length > 3 && ` +${job.raw_data.job_domain.tech_stack.length - 3} more`}
          </span>
        )}

        {/* Automation Tools Badge */}
        {job.raw_data?.job_domain?.test_automation_tools && job.raw_data.job_domain.test_automation_tools.length > 0 && (
          <span
            data-testid="automation-tools-badge"
            style={{
              display: 'inline-block',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: '#f3e8ff',
              color: '#7c3aed',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={job.raw_data.job_domain.test_automation_tools.join(', ')}>
            🤖 {job.raw_data.job_domain.test_automation_tools.slice(0, 3).join(', ')}
            {job.raw_data.job_domain.test_automation_tools.length > 3 && ` +${job.raw_data.job_domain.test_automation_tools.length - 3} more`}
          </span>
        )}
      </div>

      {/* Job Summary Section - Show for ALL jobs with raw_data or filter_reason */}
      {(() => {
        // Check if there's any actual raw_data content to display
        const hasRawDataContent =
          job.raw_data?.employment?.relationship ||
          job.raw_data?.employment?.benefits ||
          (job.raw_data?.remote_work?.remote_eligible_states?.length ?? 0) > 0 ||
          job.raw_data?.remote_work?.timezone_requirement ||
          job.raw_data?.job_domain?.primary_category ||
          job.raw_data?.job_domain?.testing_level ||
          job.raw_data?.job_domain?.test_equipment ||
          (job.raw_data?.job_domain?.ai_tools_mentioned?.length ?? 0) > 0 ||
          job.raw_data?.commute?.office_location ||
          job.raw_data?.commute?.commute_perks ||
          job.raw_data?.commute?.schedule_flexibility;

        // Only render if there's content OR filter_reason
        if (!hasRawDataContent && !job.filter_reason) return null;

        return (
          <div
            data-testid="job-summary"
            style={{
              marginTop: '8px',
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '4px',
              borderLeft: '4px solid #3b82f6',
              fontSize: '11px'
            }}>
            {/* Only show Summary header if there's raw_data content */}
            {hasRawDataContent && (
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                Summary
              </div>
            )}

            {/* Employment Details */}
          {(job.raw_data?.employment?.relationship || job.raw_data?.employment?.benefits) && (
            <div style={{ marginBottom: '6px', lineHeight: '1.4' }}>
              <strong style={{ color: '#374151' }}>Employment:</strong>
              <span style={{ color: '#6b7280', marginLeft: '4px' }}>
                {job.raw_data.employment.relationship && formatEmploymentRelationship(job.raw_data.employment.relationship)}
                {job.raw_data.employment.benefits && ` • Benefits: ${job.raw_data.employment.benefits}`}
              </span>
            </div>
          )}

          {/* Remote Work Details */}
          {((job.raw_data?.remote_work?.remote_eligible_states?.length ?? 0) > 0 ||
            job.raw_data?.remote_work?.timezone_requirement) && (
            <div style={{ marginBottom: '6px', lineHeight: '1.4' }}>
              <strong style={{ color: '#374151' }}>Remote Work:</strong>
              <span style={{ color: '#6b7280', marginLeft: '4px' }}>
                {job.raw_data?.remote_work?.remote_eligible_states &&
                 ` States: ${job.raw_data.remote_work.remote_eligible_states.join(', ')}`}
                {job.raw_data?.remote_work?.timezone_requirement &&
                 ` • TZ: ${job.raw_data.remote_work.timezone_requirement}`}
              </span>
            </div>
          )}

          {/* Technical Details */}
          {(job.raw_data?.job_domain?.primary_category ||
            job.raw_data?.job_domain?.testing_level ||
            job.raw_data?.job_domain?.test_equipment) && (
            <div style={{ marginBottom: '6px', lineHeight: '1.4' }}>
              <strong style={{ color: '#374151' }}>Technical:</strong>
              <span style={{ color: '#6b7280', marginLeft: '4px' }}>
                {job.raw_data?.job_domain?.primary_category &&
                 formatPrimaryCategory(job.raw_data.job_domain.primary_category)}
                {job.raw_data?.job_domain?.testing_level &&
                 ` • Level: ${job.raw_data.job_domain.testing_level}`}
                {job.raw_data?.job_domain?.automation_focus !== null &&
                 job.raw_data?.job_domain?.automation_focus !== undefined &&
                 ` • Automation: ${job.raw_data.job_domain.automation_focus ? 'Yes' : 'No'}`}
                {job.raw_data?.job_domain?.test_equipment &&
                 ` • Equipment: ${job.raw_data.job_domain.test_equipment}`}
              </span>
            </div>
          )}

          {/* AI Tools */}
          {(job.raw_data?.job_domain?.ai_tools_mentioned?.length ?? 0) > 0 && (
            <div style={{ marginBottom: '6px', lineHeight: '1.4' }}>
              <strong style={{ color: '#374151' }}>AI Tools:</strong>
              <span style={{ color: '#6b7280', marginLeft: '4px' }}>
                {job.raw_data?.job_domain?.ai_tools_mentioned?.join(', ')}
              </span>
            </div>
          )}

          {/* Commute Details */}
          {(job.raw_data?.commute?.office_location ||
            job.raw_data?.commute?.commute_perks ||
            job.raw_data?.commute?.schedule_flexibility) && (
            <div style={{ marginBottom: '6px', lineHeight: '1.4' }}>
              <strong style={{ color: '#374151' }}>Commute:</strong>
              <span style={{ color: '#6b7280', marginLeft: '4px' }}>
                {job.raw_data.commute.office_location}
                {job.raw_data.commute.commute_perks &&
                 ` • Perks: ${job.raw_data.commute.commute_perks}`}
                {job.raw_data.commute.schedule_flexibility &&
                 ` • ${job.raw_data.commute.schedule_flexibility}`}
              </span>
            </div>
          )}

          {/* Filtered Reasons (if applicable) */}
          {job.filter_reason && (
            <div
              data-testid="filtered-reasons"
              className="filtered-reasons"
              style={{
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px solid #e5e7eb'
              }}>
              <strong style={{ color: '#dc2626', fontSize: '11px' }}>Filtered Reasons:</strong>
              <ul style={{ fontSize: '11px', color: '#991b1b', margin: '4px 0 0 0', paddingLeft: '20px' }}>
                {job.filter_reason.split(';').map((reason, idx) => (
                  <li key={idx} className="reason">{reason.trim()}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    })()}

      {/* Condensed Description Section */}
      <div
        style={{
          marginTop: '8px',
          padding: '12px',
          backgroundColor: '#fef3c7',
          borderRadius: '4px',
          borderLeft: '4px solid #f59e0b',
          fontSize: '10px'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <strong style={{ color: '#92400e', fontSize: '11px' }}>Condensed Description</strong>
          {!hasValidDescription(job.job_id) && (
            <span
              data-testid="no-description-warning"
              title="This job has no valid condensed description. It will be ranked last in the list."
              style={{
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '10px',
                fontWeight: '600',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                border: '1px solid #fecaca'
              }}>
              ⚠️ No Description
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering job card click
              refreshSingleDescription(job.job_id);
            }}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #10b981',
              backgroundColor: 'white',
              color: '#10b981',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#10b981';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = '#10b981';
            }}
            title="Refresh this job's description"
          >
            <RefreshCw style={{ width: '12px', height: '12px' }} />
          </button>
        </div>
        <div style={{
          padding: '8px',
          backgroundColor: '#fff',
          border: '1px solid #fbbf24',
          borderRadius: '4px',
          fontSize: '11px',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: '#374151'
        }}>
          {condensedDescriptions[job.job_id] || 'Loading description...'}
        </div>
      </div>

      {(() => {
        const application = getApplicationForJob(job.job_id);
        if (application?.draft_url) {
          return (
            <div
              data-testid="draft-status"
              style={{
                marginTop: '8px',
                padding: '8px',
                backgroundColor: '#ecfdf5',
                borderRadius: '4px',
                borderLeft: '4px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail style={{ width: '16px', height: '16px', color: '#10b981' }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#065f46' }}>
                    Gmail Draft Created
                  </div>
                  {application.draft_created_at && (
                    <div style={{ fontSize: '11px', color: '#059669' }}>
                      {new Date(application.draft_created_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              <a
                href={application.draft_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                data-testid="open-draft-link"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                Open in Gmail
                <ExternalLink style={{ width: '12px', height: '12px' }} />
              </a>
            </div>
          );
        }
        return null;
      })()}

      {(job.status === 'new') && (
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
            onClick={(e) => { e.stopPropagation(); rejectJob(job.job_id); }}
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
            data-testid="reject-job-button"
          >
            Reject
          </button>
        </div>
      )}

      {job.status === 'approved' && (
        <div style={{ marginTop: '12px' }}>
          <button
            data-testid="generate-content-button"
            onClick={(e) => {
              e.stopPropagation();
              // BUG-0003 FIX: Clear old content before triggering new generation
              setGeneratedContent(null);
              setGeneratedContentJob(null);
              setGenerationError(null);
              generateContent(job.job_id);
            }}
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
          {generationError && (
            <div
              data-testid="generation-error"
              style={{
                color: '#ef4444',
                fontSize: '0.9em',
                marginTop: '8px',
                padding: '8px',
                backgroundColor: '#fee2e2',
                borderRadius: '4px',
                border: '1px solid #fecaca'
              }}
            >
              {generationError}
            </div>
          )}
        </div>
      )}
    </div>
  );
  };

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
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', overflowX: 'hidden', width: '100%' }}>
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', width: '100%' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827' }}>JobHunter</h1>
            <p style={{ color: '#6b7280' }}>Streamline your job search workflow</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: '1px solid #3b82f6',
                backgroundColor: refreshing ? '#e0e7ff' : 'white',
                color: refreshing ? '#6b7280' : '#3b82f6',
                fontWeight: '600',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                transition: 'all 0.2s',
                opacity: refreshing ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!refreshing) {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                  e.currentTarget.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (!refreshing) {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.color = '#3b82f6';
                }
              }}
              title="Refresh jobs, stats, and applications data"
            >
              <RefreshCw
                style={{
                  width: '18px',
                  height: '18px',
                  animation: refreshing ? 'spin 1s linear infinite' : 'none'
                }}
              />
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button
              onClick={handleOpenCriteriaConfig}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: '1px solid #8b5cf6',
                backgroundColor: 'white',
                color: '#8b5cf6',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#8b5cf6';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.color = '#8b5cf6';
              }}
              title="Configure job search criteria and filters"
              data-testid="configure-criteria-button"
            >
              <Settings style={{ width: '18px', height: '18px' }} />
              Configure Criteria
            </button>
            <button
              onClick={handleRescoreAll}
              disabled={refreshing}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: '1px solid #f59e0b',
                backgroundColor: refreshing ? '#fef3c7' : 'white',
                color: refreshing ? '#6b7280' : '#f59e0b',
                fontWeight: '600',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                transition: 'all 0.2s',
                opacity: refreshing ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!refreshing) {
                  e.currentTarget.style.backgroundColor = '#f59e0b';
                  e.currentTarget.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (!refreshing) {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.color = '#f59e0b';
                }
              }}
              title="Recalculate scores for all jobs"
            >
              ⭐ Rescore All
            </button>
            <button
              onClick={clearAllDescriptions}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: '1px solid #10b981',
                backgroundColor: 'white',
                color: '#10b981',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#10b981';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.color = '#10b981';
              }}
              title="Clear all cached descriptions and refresh"
            >
              <RefreshCw style={{ width: '18px', height: '18px' }} />
              Refresh Descriptions
            </button>
            <button
              data-testid="manage-resume-button"
              onClick={() => setShowResumeManagement(true)}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: '1px solid #3b82f6',
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
              <FileText style={{ width: '18px', height: '18px' }} />
              Manage Resume
            </button>
          </div>
        </div>
      </header>

      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', width: '100%' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px', width: '100%' }}>
            <div style={{ textAlign: 'center' }} data-testid="stat-ignored">
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>{stats.ignored || 0}</p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Non-Job Emails</p>
            </div>
            <div style={{ textAlign: 'center' }} data-testid="stat-filtered">
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#f97316' }}>{stats.filtered || 0}</p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Filtered</p>
            </div>
            <div style={{ textAlign: 'center' }} data-testid="stat-failed">
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{stats.failed || 0}</p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Failed</p>
            </div>
            <div style={{ textAlign: 'center' }} data-testid="stat-duplicated">
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.duplicated || 0}</p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Duplicates</p>
            </div>
            <div style={{ textAlign: 'center' }} data-testid="stat-created">
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{stats.created || 0}</p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Processed</p>
            </div>
            <div style={{ textAlign: 'center' }} data-testid="stat-new">
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{stats.new || 0}</p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>New</p>
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
            <div style={{ textAlign: 'center' }} data-testid="stat-total">
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#6b7280' }}>
                {stats.discovered || 0}
              </p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Total</p>
            </div>
          </div>

          {/* MECE Validation Warning */}
          {stats.mece_valid === 0 && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#fef2f2',
                borderRadius: '6px',
                borderLeft: '4px solid #ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              data-testid="mece-validation-warning"
            >
              <AlertCircle style={{ width: '20px', height: '20px', color: '#ef4444', flexShrink: 0 }} />
              <div style={{ fontSize: '13px', color: '#7f1d1d' }}>
                <strong>MECE Validation Failed:</strong> Total ({stats.mece_expected}) ≠ Failed + Filtered + Duplicates + Processed ({stats.mece_actual})
              </div>
            </div>
          )}
        </div>
      </div>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px', boxSizing: 'border-box', width: '100%' }}>
        <nav style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e5e7eb', overflowX: 'auto' }}>
          {(['ignored', 'intake', 'filtered', 'failed', 'duplicates', 'new', 'approved', 'rejected', 'applied', 'follow-ups', 'calendar', 'ranked', 'all'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              aria-selected={activeTab === tab}
              data-testid={`${tab}-tab-button`}
              className={activeTab === tab ? 'active' : ''}
              style={{
                padding: '8px 16px',
                fontWeight: 500,
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #3b82f6' : 'none',
                color: activeTab === tab ? '#3b82f6' : '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              {tab === 'ignored' && <XCircle style={{ width: '16px', height: '16px' }} />}
              {tab === 'intake' && <Download style={{ width: '16px', height: '16px' }} />}
              {tab === 'filtered' && <Filter style={{ width: '16px', height: '16px' }} />}
              {tab === 'failed' && <AlertTriangle style={{ width: '16px', height: '16px' }} />}
              {tab === 'duplicates' && <Copy style={{ width: '16px', height: '16px' }} />}
              {tab === 'new' && <AlertCircle style={{ width: '16px', height: '16px' }} />}
              {tab === 'rejected' && <XCircle style={{ width: '16px', height: '16px', color: '#dc2626' }} />}
              {tab === 'calendar' && <CalendarIcon style={{ width: '16px', height: '16px' }} />}
              {tab === 'follow-ups' && <Mail style={{ width: '16px', height: '16px' }} />}
              {tab === 'ranked' && <TrendingUp style={{ width: '16px', height: '16px' }} />}
              {getTabLabel(tab)}
            </button>
          ))}
        </nav>

        {activeTab === 'intake' ? (
          <IntakeTab onJobsUpdated={() => { fetchJobs(); fetchStats(); }} />
        ) : activeTab === 'calendar' ? (
          <CalendarTab />
        ) : activeTab === 'follow-ups' ? (
          <FollowupsTab />
        ) : activeTab === 'ranked' ? (
          <RankedJobsTab />
        ) : activeTab === 'ignored' ? (
          <IgnoredTab />
        ) : activeTab === 'failed' ? (
          <FailedTab />
        ) : activeTab === 'duplicates' ? (
          <DuplicatesTab />
        ) : (
          <div data-testid={`${activeTab}-tab-content`}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '16px', width: '100%' }}>
              {(activeTab === 'new' ? filterJobs('new') :
                activeTab === 'approved' ? filterJobs('approved') :
                activeTab === 'rejected' ? filterJobs('rejected') :
                activeTab === 'applied' ? filterJobs('applied') :
                activeTab === 'filtered' ? filterJobs('filtered') :
                getAllActiveJobs()
              ).map(job => (
                <JobCard key={job.job_id} job={job} />
              ))}
            </div>

            {(activeTab === 'new' ? filterJobs('new') :
              activeTab === 'approved' ? filterJobs('approved') :
              activeTab === 'rejected' ? filterJobs('rejected') :
              activeTab === 'applied' ? filterJobs('applied') :
              activeTab === 'filtered' ? filterJobs('filtered') :
              getAllActiveJobs()
            ).length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <Filter style={{ width: '64px', height: '64px', color: '#d1d5db', margin: '0 auto 16px' }} />
                <p style={{ color: '#6b7280' }}>No jobs in this category yet</p>
              </div>
            )}
          </div>
        )}
      </main>

      {selectedJob && (
        <JobDetails
          key={selectedJob.job_id}
          job={selectedJob}
          onClose={handleCloseJobDetails}
          updateJobStatus={updateJobStatus}
          rejectJob={rejectJob}
          generateContent={generateContent}
          renderDescription={renderDescription}
          formatCompensationType={formatCompensationType}
          formatSalaryRange={formatSalaryRange}
          formatTaxStructure={formatTaxStructure}
          formatEmploymentRelationship={formatEmploymentRelationship}
          formatRemotePolicy={formatRemotePolicy}
          formatSeniority={formatSeniority}
          getStatusColor={getStatusColor}
        />
      )}

      {showContentGeneration && (
        <div
          style={{
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
          }}
          data-testid="modal-overlay"
          onClick={() => setShowContentGeneration(false)}
        >
          <div
            ref={contentModalRef}
            role="dialog"
            data-testid="content-generation-modal"
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              maxWidth: '1000px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Generated Content</h2>
                {generatedContentJob && (
                  <p
                    data-testid="content-modal-job-info"
                    style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}
                  >
                    {generatedContentJob.title} at {generatedContentJob.company}
                  </p>
                )}
              </div>
              <button
                data-testid="modal-close-x"
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
              {!generatedContent ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                    <div style={{ fontSize: '18px', color: '#6b7280' }}>Generating...</div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '100%' }}>
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
              </div>

                <div
                  data-testid="generation-metadata"
                  style={{
                    marginTop: '20px',
                    padding: '16px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#6b7280'
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px' }}>
                    <strong>Generated on:</strong>
                    <span>{new Date(generatedContent.generated_at).toLocaleString()}</span>

                    <strong>Format:</strong>
                    <span>{generatedContent.resume_format}</span>

                    {generatedContent.generation_method && (
                      <>
                        <strong>Generation Method:</strong>
                        <span>
                          {generatedContent.generation_method === 'llm' ? '🤖 AI-Powered (LLM)' : '📝 Template-based'}
                        </span>
                      </>
                    )}

                    {generatedContent.llm_model && (
                      <>
                        <strong>Model:</strong>
                        <span data-testid="llm-model">{generatedContent.llm_model}</span>
                      </>
                    )}

                    {generatedContent.generation_time_ms !== undefined && (
                      <>
                        <strong>Generation Time:</strong>
                        <span data-testid="generation-time">
                          {(generatedContent.generation_time_ms / 1000).toFixed(1)}s
                        </span>
                      </>
                    )}

                    {generatedContent.tokens_used !== undefined && (
                      <>
                        <strong>Tokens Used:</strong>
                        <span data-testid="tokens-used">
                          {generatedContent.tokens_used.toLocaleString()} tokens
                        </span>
                      </>
                    )}

                    {generatedContent.cost_estimate !== undefined && (
                      <>
                        <strong>Cost Estimate:</strong>
                        <span data-testid="cost-estimate" style={{ color: '#10b981', fontWeight: 'bold' }}>
                          ${generatedContent.cost_estimate.toFixed(4)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                </>
              )}
            </div>

            <div style={{
              padding: '20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <button
                data-testid="modal-close-button"
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
              <div style={{ display: 'flex', gap: '12px' }}>
                {generatedContentJob && (
                  <button
                    data-testid="regenerate-button"
                    onClick={async () => {
                      await generateContent(generatedContentJob.job_id);
                    }}
                    disabled={generatingContent}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: generatingContent ? '#9ca3af' : '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: generatingContent ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: generatingContent ? 0.6 : 1
                    }}
                  >
                    <RefreshCw style={{ width: '16px', height: '16px' }} />
                    {generatingContent ? 'Regenerating...' : 'Regenerate'}
                  </button>
                )}
                <button
                  data-testid="download-button"
                  onClick={downloadGeneratedContent}
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
                {generatedContentJob && (
                  <button
                    onClick={() => {
                      openEmailComposer(generatedContentJob);
                      setShowContentGeneration(false);
                    }}
                    data-testid="create-draft-button"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Send style={{ width: '16px', height: '16px' }} />
                    Create Email Draft
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCriteriaConfig && (
        <div
          style={{
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
          }}
          data-testid="criteria-modal-overlay"
          onClick={() => setShowCriteriaConfig(false)}
        >
          <div
            role="dialog"
            aria-labelledby="criteria-modal-title"
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 id="criteria-modal-title" style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                Job Search Criteria
              </h2>
              <button
                data-testid="criteria-modal-close-x"
                onClick={() => setShowCriteriaConfig(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Min Salary */}
                <div>
                  <label htmlFor="min-salary" style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    Minimum Salary ($)
                  </label>
                  <input
                    id="min-salary"
                    type="number"
                    value={criteriaForm.min_salary ?? ''}
                    onChange={(e) => handleCriteriaFormChange('min_salary', parseInt(e.target.value) || 0)}
                    data-testid="min-salary-input"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                {/* Max Commute Time */}
                <div>
                  <label htmlFor="max-commute-time" style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    Max Commute Time (minutes)
                  </label>
                  <input
                    id="max-commute-time"
                    type="number"
                    value={criteriaForm.max_commute_time ?? ''}
                    onChange={(e) => handleCriteriaFormChange('max_commute_time', parseInt(e.target.value) || 0)}
                    data-testid="max-commute-time-input"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                {/* Max Commute Days Per Week */}
                <div>
                  <label htmlFor="max-commute-days" style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    Max Commute Days Per Week
                  </label>
                  <input
                    id="max-commute-days"
                    type="number"
                    min="0"
                    max="5"
                    value={criteriaForm.max_commute_days_per_week ?? ''}
                    onChange={(e) => handleCriteriaFormChange('max_commute_days_per_week', parseInt(e.target.value) || 0)}
                    data-testid="max-commute-days-input"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                {/* Preferred Domains */}
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    Preferred Domains
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {['Software Testing', 'Test Automation', 'Firmware Engineering', 'Generative AI', 'Prompt Engineering'].map(domain => (
                      <label key={domain} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={criteriaForm.preferred_domains?.includes(domain) ?? false}
                          onChange={(e) => {
                            const currentDomains = criteriaForm.preferred_domains ?? [];
                            const newDomains = e.target.checked
                              ? [...currentDomains, domain]
                              : currentDomains.filter(d => d !== domain);
                            handleCriteriaFormChange('preferred_domains', newDomains);
                          }}
                          data-testid={`domain-checkbox-${domain.toLowerCase().replace(/\s+/g, '-')}`}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '14px', color: '#374151' }}>{domain}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Remote Preference */}
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    Remote Preference
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { value: 'required', label: 'Required - Remote only' },
                      { value: 'preferred', label: 'Preferred - Remote strongly preferred' },
                      { value: 'acceptable', label: 'Acceptable - Open to office work' },
                      { value: 'not_required', label: 'Not Required - Prefer office work' }
                    ].map(option => (
                      <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="remote-preference"
                          value={option.value}
                          checked={criteriaForm.remote_preference === option.value}
                          onChange={(e) => handleCriteriaFormChange('remote_preference', e.target.value)}
                          data-testid={`remote-preference-${option.value}`}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '14px', color: '#374151' }}>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Error Message */}
                {criteriaError && (
                  <div
                    data-testid="criteria-error-message"
                    style={{
                      padding: '12px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '4px',
                      color: '#dc2626',
                      fontSize: '14px'
                    }}
                  >
                    {criteriaError}
                  </div>
                )}
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
                onClick={() => setShowCriteriaConfig(false)}
                data-testid="criteria-modal-cancel-button"
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
                Cancel
              </button>
              <button
                onClick={handleSaveCriteria}
                disabled={savingCriteria}
                data-testid="criteria-modal-save-button"
                style={{
                  padding: '8px 16px',
                  backgroundColor: savingCriteria ? '#9ca3af' : '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: savingCriteria ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: savingCriteria ? 0.6 : 1
                }}
              >
                {savingCriteria ? 'Saving...' : 'Save Criteria'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResumeManagement && (
        <ResumeManagement onClose={() => setShowResumeManagement(false)} />
      )}

      {showEmailComposer && emailComposerJob && generatedContent && (() => {
        const application = applications.find(app => app.job_id === emailComposerJob.job_id);
        if (!application) {
          return null; // Application doesn't exist yet - shouldn't happen if content was generated
        }
        return (
          <EmailComposer
            applicationId={application.application_id}
            jobTitle={emailComposerJob.title}
            company={emailComposerJob.company}
            coverLetter={generatedContent.cover_letter}
            resumeContent={generatedContent.resume}
            resumeFormat={generatedContent.resume_format}
            onClose={() => setShowEmailComposer(false)}
            onDraftCreated={() => {
              fetchApplications();
              fetchJobs();
            }}
          />
        );
      })()}
    </div>
  );
};

export default JobHunterDashboard;
