import React, { useState, useEffect } from 'react';
import { Sliders, Save, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';

const API_URL = 'http://localhost:8080/api';

interface ScoringCriteria {
  criteria_id: string;
  criterion_name: string;
  weight: number;
  enabled: boolean;
  description: string | null;
  updated_at: string;
}

interface WeightAdjustmentPanelProps {
  onWeightsUpdated?: () => void;
}

const WeightAdjustmentPanel: React.FC<WeightAdjustmentPanelProps> = ({ onWeightsUpdated }) => {
  const [criteria, setCriteria] = useState<ScoringCriteria[]>([]);
  const [weights, setWeights] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | null; text: string }>({ type: null, text: '' });
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    fetchCriteria();
  }, []);

  const fetchCriteria = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/scoring-criteria`);
      if (!response.ok) throw new Error('Failed to fetch criteria');

      const data: ScoringCriteria[] = await response.json();
      setCriteria(data);

      // Initialize weights map
      const weightsMap = new Map<string, number>();
      data.forEach(criterion => {
        weightsMap.set(criterion.criterion_name, criterion.weight);
      });
      setWeights(weightsMap);
    } catch (error) {
      console.error('Error fetching criteria:', error);
      setMessage({ type: 'error', text: 'Failed to load scoring criteria' });
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (criterionName: string, newWeight: number): void => {
    const newWeights = new Map(weights);
    newWeights.set(criterionName, newWeight);
    setWeights(newWeights);
  };

  const getTotalWeight = (): number => {
    let total = 0;
    weights.forEach(weight => {
      total += weight;
    });
    return total;
  };

  const isValidWeights = (): boolean => {
    const total = getTotalWeight();
    return Math.abs(total - 1.0) < 0.001;
  };

  const handleSave = async (): Promise<void> => {
    if (!isValidWeights()) {
      setMessage({ type: 'error', text: `Weights must sum to 1.0 (currently: ${getTotalWeight().toFixed(3)})` });
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: null, text: '' });

      // Prepare updated criteria
      const updatedCriteria = criteria.map(criterion => ({
        ...criterion,
        weight: weights.get(criterion.criterion_name) || criterion.weight
      }));

      // Update weights
      const updateResponse = await fetch(`${API_URL}/scoring-criteria`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria: updatedCriteria })
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.error || 'Failed to update weights');
      }

      // Trigger re-calculation of all job scores
      const recalcResponse = await fetch(`${API_URL}/jobs/calculate-all-scores`, {
        method: 'POST'
      });

      if (!recalcResponse.ok) {
        throw new Error('Failed to recalculate scores');
      }

      const recalcData = await recalcResponse.json();

      setMessage({
        type: 'success',
        text: `Weights updated! Recalculated scores for ${recalcData.scored_count} jobs.`
      });

      // Refresh criteria to get latest data
      await fetchCriteria();

      // Notify parent component
      if (onWeightsUpdated) {
        onWeightsUpdated();
      }
    } catch (error: any) {
      console.error('Error saving weights:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save weights' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (): void => {
    // Reset to original weights from criteria
    const weightsMap = new Map<string, number>();
    criteria.forEach(criterion => {
      weightsMap.set(criterion.criterion_name, criterion.weight);
    });
    setWeights(weightsMap);
    setMessage({ type: null, text: '' });
  };

  const formatCriterionName = (name: string): string => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getCriterionDescription = (name: string): string => {
    const descriptions: Record<string, string> = {
      'compensation': 'Salary/hourly rate adjusted for tax structure',
      'employment_relationship': 'Direct hire vs staffing agency vs contract',
      'remote_work': 'Remote policy and onsite requirements',
      'domain_fit': 'Match with testing/QA/automation focus',
      'flexibility_perks': 'Retainers, shuttles, schedule flexibility',
      'benefits': 'Insurance quality and benefits package',
      'company_industry': 'Industry sector preference'
    };
    return descriptions[name] || '';
  };

  if (loading) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <p style={{ color: '#6b7280' }}>Loading scoring criteria...</p>
      </div>
    );
  }

  const totalWeight = getTotalWeight();
  const isValid = isValidWeights();

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      marginBottom: '20px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '16px 20px',
          backgroundColor: '#f9fafb',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Sliders size={20} color="#8b5cf6" />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            Adjust Scoring Weights
          </h3>
          {!isExpanded && (
            <span style={{
              fontSize: '12px',
              color: '#6b7280',
              fontStyle: 'italic'
            }}>
              Click to expand
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isValid && !isExpanded && (
            <span style={{
              fontSize: '12px',
              color: '#ef4444',
              fontWeight: 500
            }}>
              ⚠️ Sum: {totalWeight.toFixed(3)}
            </span>
          )}
          <span style={{
            fontSize: '20px',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}>
            ▼
          </span>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div style={{ padding: '20px' }}>
          {/* Info Box */}
          <div style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #93c5fd',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '14px',
            color: '#1e40af'
          }}>
            <strong>How it works:</strong> Adjust the weight sliders to change how much each criterion
            affects the overall job score. All weights must sum to exactly 1.0 (100%).
          </div>

          {/* Weight Sliders */}
          <div style={{ marginBottom: '20px' }}>
            {criteria.map((criterion) => {
              const weight = weights.get(criterion.criterion_name) || 0;
              const percentage = (weight * 100).toFixed(1);

              return (
                <div key={criterion.criteria_id} style={{ marginBottom: '16px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <div>
                      <span style={{ fontWeight: 500, fontSize: '14px' }}>
                        {formatCriterionName(criterion.criterion_name)}
                      </span>
                      <p style={{
                        margin: '2px 0 0 0',
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        {getCriterionDescription(criterion.criterion_name)}
                      </p>
                    </div>
                    <span style={{
                      fontWeight: 600,
                      fontSize: '14px',
                      color: '#8b5cf6',
                      minWidth: '60px',
                      textAlign: 'right'
                    }}>
                      {percentage}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={weight}
                    onChange={(e) => handleWeightChange(criterion.criterion_name, parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      height: '6px',
                      borderRadius: '3px',
                      outline: 'none',
                      background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Total Weight Indicator */}
          <div style={{
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '16px',
            backgroundColor: isValid ? '#d1fae5' : '#fee2e2',
            border: `1px solid ${isValid ? '#10b981' : '#ef4444'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{
              fontWeight: 500,
              color: isValid ? '#065f46' : '#991b1b'
            }}>
              Total Weight:
            </span>
            <span style={{
              fontWeight: 600,
              fontSize: '16px',
              color: isValid ? '#065f46' : '#991b1b'
            }}>
              {totalWeight.toFixed(3)} {isValid ? '✓' : '✗'}
            </span>
          </div>

          {/* Message */}
          {message.type && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '6px',
              marginBottom: '16px',
              backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
              border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: message.type === 'success' ? '#065f46' : '#991b1b'
            }}>
              {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span style={{ fontSize: '14px' }}>{message.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSave}
              disabled={!isValid || saving}
              style={{
                flex: 1,
                padding: '10px 16px',
                backgroundColor: isValid && !saving ? '#8b5cf6' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 500,
                cursor: isValid && !saving ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '14px'
              }}
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save size={16} />
                  Save & Recalculate All Scores
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              disabled={saving}
              style={{
                padding: '10px 16px',
                backgroundColor: 'white',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px'
              }}
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeightAdjustmentPanel;
