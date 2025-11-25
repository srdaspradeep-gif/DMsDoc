import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const MyApprovals = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/dms/approvals/my-approvals', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setApprovals(response.data);
    } catch (err) {
      setError('Failed to load approvals');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (stepId, decision, comment = '') => {
    if (!window.confirm(`Are you sure you want to ${decision} this approval?`)) {
      return;
    }

    try {
      setProcessingId(stepId);
      await axios.post(
        `/dms/approvals/steps/${stepId}/decision`,
        {
          decision,
          comment
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      fetchApprovals();
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to ${decision}`);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Layout>
      <div className="container-fluid py-4">
        <div className="row mb-4">
          <div className="col">
            <h2>
              <i className="bi bi-check-circle me-2"></i>
              My Pending Approvals
            </h2>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {error}
            <button type="button" className="btn-close" onClick={() => setError(null)}></button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : approvals.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-5">
              <i className="bi bi-check-circle display-1 text-muted"></i>
              <h4 className="mt-3">No Pending Approvals</h4>
              <p className="text-muted">
                You don't have any pending approval requests at the moment.
              </p>
            </div>
          </div>
        ) : (
          <div className="row">
            {approvals.map((approval) => (
              <div key={approval.id} className="col-12 col-md-6 col-lg-4 mb-3">
                <div className="card h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <span className="badge bg-warning">Pending</span>
                      {approval.workflow && approval.workflow.mode === 'serial' && (
                        <span className="badge bg-info">
                          Step {approval.order_index + 1}
                        </span>
                      )}
                    </div>

                    <h5 className="card-title">
                      <Link to={`/files/${approval.workflow?.file_id}`} className="text-decoration-none">
                        File Approval Request
                      </Link>
                    </h5>

                    {approval.workflow?.resolution_text && (
                      <p className="card-text">{approval.workflow.resolution_text}</p>
                    )}

                    <div className="small text-muted mb-3">
                      <div>
                        <i className="bi bi-clock me-1"></i>
                        Requested: {formatDate(approval.created_at)}
                      </div>
                      {approval.workflow?.mode && (
                        <div>
                          <i className="bi bi-diagram-3 me-1"></i>
                          Mode: {approval.workflow.mode}
                        </div>
                      )}
                    </div>

                    <div className="d-grid gap-2">
                      <Link
                        to={`/files/${approval.workflow?.file_id}`}
                        className="btn btn-sm btn-outline-primary"
                      >
                        <i className="bi bi-eye me-1"></i>
                        View File
                      </Link>
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleDecision(approval.id, 'approve')}
                          disabled={processingId === approval.id}
                        >
                          <i className="bi bi-check-lg me-1"></i>
                          Approve
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => {
                            const comment = prompt('Rejection reason (optional):');
                            if (comment !== null) {
                              handleDecision(approval.id, 'reject', comment);
                            }
                          }}
                          disabled={processingId === approval.id}
                        >
                          <i className="bi bi-x-lg me-1"></i>
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile View: Floating Action Button */}
      <style jsx>{`
        @media (max-width: 768px) {
          .container-fluid {
            padding-bottom: 80px;
          }
        }
      `}</style>
    </Layout>
  );
};

export default MyApprovals;
