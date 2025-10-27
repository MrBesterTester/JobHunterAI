import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Check, X, AlertCircle, Trash2 } from 'lucide-react';

const API_URL = 'http://localhost:8080/api';

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

interface ResumeManagementProps {
  onClose: () => void;
}

const ResumeManagement: React.FC<ResumeManagementProps> = ({ onClose }) => {
  const [resumes, setResumes] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('text');
  const [resumeName, setResumeName] = useState('');
  const [resumeContent, setResumeContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Ref to track setTimeout for cleanup (ISSUE-021 Option iii)
  const successMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchResumes();
  }, []);

  // Cleanup setTimeout on unmount (ISSUE-021 Option iii)
  useEffect(() => {
    return () => {
      if (successMessageTimeoutRef.current) {
        clearTimeout(successMessageTimeoutRef.current);
      }
    };
  }, []);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/resumes`);
      if (!response.ok) {
        throw new Error('Failed to fetch resumes');
      }
      const data = await response.json();
      setResumes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadResume = async () => {
    if (!resumeName.trim() || !resumeContent.trim()) {
      setError('Please provide both name and content');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      const response = await fetch(`${API_URL}/resumes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version_name: resumeName,
          content: resumeContent,
          format: 'markdown',
          is_master: resumes.length === 0, // First resume becomes master
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload resume');
      }

      setSuccessMessage('Resume uploaded successfully!');
      setResumeName('');
      setResumeContent('');
      await fetchResumes();

      // Clear any existing timeout and set new one (ISSUE-021 Option iii)
      if (successMessageTimeoutRef.current) {
        clearTimeout(successMessageTimeoutRef.current);
      }
      successMessageTimeoutRef.current = setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setResumeContent(content);
      if (!resumeName.trim()) {
        setResumeName(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsText(file);
  };

  const handleLoadFromFile = async () => {
    try {
      setIsUploading(true);
      setError(null);
      const response = await fetch(`${API_URL}/resumes/load-from-file`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to load resume from file');
      }

      setSuccessMessage('Master resume loaded from data/resumes/master_resume.md');
      await fetchResumes();

      // Clear any existing timeout and set new one (ISSUE-021 Option iii)
      if (successMessageTimeoutRef.current) {
        clearTimeout(successMessageTimeoutRef.current);
      }
      successMessageTimeoutRef.current = setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load from file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetMaster = async (versionId: string) => {
    try {
      const response = await fetch(`${API_URL}/resumes/${versionId}/set-master`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Failed to set master resume');
      }

      setSuccessMessage('Master resume updated!');
      await fetchResumes();

      // Clear any existing timeout and set new one (ISSUE-021 Option iii)
      if (successMessageTimeoutRef.current) {
        clearTimeout(successMessageTimeoutRef.current);
      }
      successMessageTimeoutRef.current = setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set master');
    }
  };

  const handleDelete = async (versionId: string) => {
    if (!window.confirm('Are you sure you want to delete this resume version?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/resumes/${versionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to delete resume');
      }

      setSuccessMessage('Resume deleted successfully!');
      await fetchResumes();

      // Clear any existing timeout and set new one (ISSUE-021 Option iii)
      if (successMessageTimeoutRef.current) {
        clearTimeout(successMessageTimeoutRef.current);
      }
      successMessageTimeoutRef.current = setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const masterResume = resumes.find((r) => r.is_master);

  return (
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
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        data-testid="resume-management-modal"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            Resume Management
          </h2>
          <button
            data-testid="close-modal-button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {error && (
            <div
              data-testid="resume-error-message"
              style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle style={{ width: '20px', height: '20px', color: '#dc2626' }} />
              <span style={{ color: '#dc2626' }}>{error}</span>
              <button
                onClick={() => setError(null)}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <X style={{ width: '16px', height: '16px', color: '#dc2626' }} />
              </button>
            </div>
          )}

          {successMessage && (
            <div
              data-testid="resume-success-message"
              style={{
                backgroundColor: '#d1fae5',
                border: '1px solid #6ee7b7',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Check style={{ width: '20px', height: '20px', color: '#059669' }} />
              <span style={{ color: '#059669' }}>{successMessage}</span>
            </div>
          )}

          {/* Upload Section */}
          <div
            style={{
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
              Upload New Resume
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <button
                  onClick={() => setUploadMode('text')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: uploadMode === 'text' ? '#3b82f6' : 'white',
                    color: uploadMode === 'text' ? 'white' : '#374151',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  <FileText
                    style={{ width: '16px', height: '16px', display: 'inline', marginRight: '4px' }}
                  />
                  Paste Text
                </button>
                <button
                  onClick={() => setUploadMode('file')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: uploadMode === 'file' ? '#3b82f6' : 'white',
                    color: uploadMode === 'file' ? 'white' : '#374151',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  <Upload
                    style={{ width: '16px', height: '16px', display: 'inline', marginRight: '4px' }}
                  />
                  Upload File
                </button>
                <button
                  data-testid="load-from-file-button"
                  onClick={handleLoadFromFile}
                  disabled={isUploading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#10b981',
                    color: 'white',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    opacity: isUploading ? 0.5 : 1,
                  }}
                >
                  Load from File (data/resumes/master_resume.md)
                </button>
              </div>

              <input
                data-testid="resume-name-input"
                type="text"
                placeholder="Resume Version Name (e.g., Sam_Kirk_2024)"
                value={resumeName}
                onChange={(e) => setResumeName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  marginBottom: '12px',
                  fontSize: '14px',
                }}
              />

              {uploadMode === 'file' && (
                <input
                  data-testid="file-upload-input"
                  type="file"
                  accept=".md,.txt"
                  onChange={handleFileUpload}
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginBottom: '12px',
                    fontSize: '14px',
                  }}
                />
              )}

              <textarea
                data-testid="resume-content-input"
                placeholder="Paste or type your resume here (Markdown format)..."
                value={resumeContent}
                onChange={(e) => setResumeContent(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '200px',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  resize: 'vertical',
                }}
              />

              <button
                data-testid="upload-resume-button"
                onClick={handleUploadResume}
                disabled={isUploading || !resumeName.trim() || !resumeContent.trim()}
                style={{
                  marginTop: '12px',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  fontWeight: '600',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  opacity: isUploading || !resumeName.trim() || !resumeContent.trim() ? 0.5 : 1,
                }}
              >
                {isUploading ? 'Uploading...' : 'Upload Resume'}
              </button>
            </div>
          </div>

          {/* Resume List */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
              Existing Resumes ({resumes.length})
            </h3>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div
                  style={{
                    border: '3px solid #f3f4f6',
                    borderTopColor: '#3b82f6',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto',
                  }}
                />
              </div>
            ) : resumes.length === 0 ? (
              <div
                data-testid="no-resumes-message"
                style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}
              >
                <FileText style={{ width: '48px', height: '48px', margin: '0 auto 12px' }} />
                <p>No resumes uploaded yet. Upload your first resume above!</p>
              </div>
            ) : (
              <div data-testid="resume-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {resumes.map((resume) => (
                  <div
                    key={resume.version_id}
                    data-testid={`resume-item-${resume.version_id}`}
                    style={{
                      border: `2px solid ${resume.is_master ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      padding: '16px',
                      backgroundColor: resume.is_master ? '#eff6ff' : 'white',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                            {resume.version_name}
                          </h4>
                          {resume.is_master && (
                            <span
                              data-testid={`master-badge-${resume.version_id}`}
                              style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '600',
                              }}
                            >
                              MASTER
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0' }}>
                          Format: {resume.format} • Created: {new Date(resume.created_at).toLocaleDateString()}
                        </p>
                        <p style={{ fontSize: '13px', color: '#9ca3af', margin: '4px 0' }}>
                          {resume.content.slice(0, 100)}...
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {!resume.is_master && (
                          <button
                            data-testid={`set-master-button-${resume.version_id}`}
                            onClick={() => handleSetMaster(resume.version_id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #3b82f6',
                              backgroundColor: 'white',
                              color: '#3b82f6',
                              fontSize: '13px',
                              fontWeight: '500',
                              cursor: 'pointer',
                            }}
                          >
                            Set as Master
                          </button>
                        )}
                        {!resume.is_master && (
                          <button
                            data-testid={`delete-resume-button-${resume.version_id}`}
                            onClick={() => handleDelete(resume.version_id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #dc2626',
                              backgroundColor: 'white',
                              color: '#dc2626',
                              fontSize: '13px',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 style={{ width: '14px', height: '14px' }} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {masterResume && (
            <div
              data-testid="master-resume-info"
              style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#eff6ff',
                borderLeft: '4px solid #3b82f6',
                borderRadius: '4px',
              }}
            >
              <p style={{ fontSize: '14px', color: '#1e40af', margin: 0 }}>
                <strong>Current Master Resume:</strong> {masterResume.version_name}
              </p>
              <p style={{ fontSize: '13px', color: '#3b82f6', margin: '4px 0 0' }}>
                This resume will be used for generating customized resumes for job applications.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeManagement;
