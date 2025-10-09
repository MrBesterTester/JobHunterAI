import React, { useState } from 'react';
import { Mail, FileText, X, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

const API_URL = 'http://localhost:8080/api';

interface EmailComposerProps {
  applicationId: string;
  jobTitle: string;
  company: string;
  coverLetter: string;
  resumeContent: string;
  resumeFormat: string;
  defaultRecipient?: string;
  onClose: () => void;
  onDraftCreated?: () => void;
}

interface DraftResponse {
  draft_id: string;
  gmail_draft_id: string;
  gmail_url: string;
  status: string;
}

const EmailComposer: React.FC<EmailComposerProps> = ({
  applicationId,
  jobTitle,
  company,
  coverLetter,
  resumeContent,
  resumeFormat,
  defaultRecipient = '',
  onClose,
  onDraftCreated
}) => {
  const [recipientEmail, setRecipientEmail] = useState<string>(defaultRecipient);
  const [subject, setSubject] = useState<string>(`Application for ${jobTitle} - Sam Kirk`);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [draftResponse, setDraftResponse] = useState<DraftResponse | null>(null);

  const handleCreateDraft = async () => {
    if (!recipientEmail.trim()) {
      setError('Please enter a recipient email address');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/applications/${applicationId}/create-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          application_id: applicationId,
          recipient_email: recipientEmail
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create draft: ${response.statusText}`);
      }

      const data: DraftResponse = await response.json();
      setDraftResponse(data);

      if (onDraftCreated) {
        onDraftCreated();
      }
    } catch (err) {
      console.error('Error creating draft:', err);
      setError(err instanceof Error ? err.message : 'Failed to create draft');
    } finally {
      setIsCreating(false);
    }
  };

  const resumeFilename = `${company.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_resume.${resumeFormat}`;
  const resumeSize = new Blob([resumeContent]).size;
  const resumeSizeKB = (resumeSize / 1024).toFixed(1);

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
      data-testid="email-composer-modal"
      onClick={onClose}
    >
      <div
        role="dialog"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Mail style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                Create Email Draft
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
                {company} - {jobTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="close-button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            <X style={{ width: '24px', height: '24px' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {!draftResponse ? (
            <>
              {/* Recipient Email */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                  To:
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recruiter@company.com"
                  data-testid="recipient-email"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Subject */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                  Subject:
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  data-testid="subject-line"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Attachment Indicator */}
              <div style={{
                marginBottom: '20px',
                padding: '12px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FileText style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: '500', margin: 0, color: '#374151' }}>
                    {resumeFilename}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>
                    {resumeSizeKB} KB
                  </p>
                </div>
              </div>

              {/* Cover Letter Preview */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                  Email Body (Cover Letter):
                </label>
                <div
                  data-testid="cover-letter-preview"
                  style={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    padding: '16px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    maxHeight: '300px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    color: '#374151'
                  }}
                >
                  {coverLetter}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div
                  data-testid="error-message"
                  style={{
                    padding: '12px',
                    backgroundColor: '#fee2e2',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '20px'
                  }}
                >
                  <AlertCircle style={{ width: '20px', height: '20px', color: '#dc2626' }} />
                  <p style={{ fontSize: '14px', color: '#991b1b', margin: 0 }}>
                    {error}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Success Message */
            <div
              data-testid="success-message"
              style={{
                textAlign: 'center',
                padding: '40px 20px'
              }}
            >
              <CheckCircle
                style={{
                  width: '64px',
                  height: '64px',
                  color: '#10b981',
                  margin: '0 auto 20px'
                }}
              />
              <h3 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#111827',
                marginBottom: '12px'
              }}>
                Draft Created Successfully!
              </h3>
              <p style={{
                fontSize: '16px',
                color: '#6b7280',
                marginBottom: '24px'
              }}>
                Your email draft has been created in Gmail. Click below to open, review, and send it.
              </p>
              <a
                href={draftResponse.gmail_url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="open-gmail-link"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Open in Gmail
                <ExternalLink style={{ width: '20px', height: '20px' }} />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        {!draftResponse && (
          <div style={{
            padding: '20px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              onClick={onClose}
              disabled={isCreating}
              data-testid="cancel-button"
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '4px',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: isCreating ? 0.6 : 1
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateDraft}
              disabled={isCreating || !recipientEmail.trim()}
              data-testid="create-draft-button"
              style={{
                padding: '8px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (isCreating || !recipientEmail.trim()) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: (isCreating || !recipientEmail.trim()) ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isCreating ? (
                <>
                  <span>Creating Draft...</span>
                </>
              ) : (
                <>
                  <Mail style={{ width: '16px', height: '16px' }} />
                  <span>Create Gmail Draft</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailComposer;
