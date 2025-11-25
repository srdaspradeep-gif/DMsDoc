import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ApprovalWorkflow = ({ fileId, accountId }) => {
  const [workflows, setWorkflows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    mode: 'parallel',
    resolution_text: '',
    approvers: [{ approver_user_id: '', order_index: 0 }]
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWorkflows();
    fetchUsers();
  }, [fileId]);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/dms/approvals/workflows?file_id=${fileId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setWorkflows(response.data);
    } catch (err) {
      setError('Failed to load workflows');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/rbac/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Account-Id': accountId
        }
      });
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const handleAddApprover = () => {
    setFormData({
      ...formData,
      approvers: [...formData.approvers, { approver_user_id: '', order_index: formData.approvers.length }]
    });
  };

  const handleRemoveApprover = (index) => {
    const newApprovers = formData.approvers.filter((_, i) => i !== index);
    setFormData({ ...formData, approvers: newApprovers });
  };

  const handleApproverChange = (index, field, value) => {
    const newApprovers = [...formData.approvers];
    newApprovers[index][field] = value;
    setFormData({ ...formData, approvers: newApprovers });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        '/dms/approvals/workflows',
        {
          file_id: fileId,
          ...formData
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setFormData({
        mode: 'parallel',
        resolution_text: '',
        approvers: [{ approver_user_id: '', order_index: 0 }]
      });
      setShowForm(false);
      fetchWorkflows();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create workflow');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-warning',
      approved: 'bg-success',
      rejected: 'bg-danger',
      cancelled: 'bg-secondary'
    };
    return badges[status] || 'bg-secondary';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) return <div className="text-center py-4">Loading workflows...</div>;

  return (
    <div className="approval-workflow">
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Create Workflow Button */}
      <div className="mb-3">
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          <i className="bi bi-plus-circle me-2"></i>
          {showForm ? 'Cancel' : 'Start Approval Workflow'}
        </button>
      </div>

      {/* Create Workflow Form */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">Create Approval Workflow</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Workflow Mode</label>
                <select
                  className="form-select"
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                  required
                >
                  <option value="parallel">Parallel (All can approve simultaneously)</option>
                  <option value="serial">Serial (Must approve in order)</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Resolution Text</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={formData.resolution_text}
                  onChange={(e) => setFormData({ ...formData, resolution_text: e.target.value })}
                  placeholder="What needs to be approved?"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Approvers</label>
                {formData.approvers.map((approver, index) => (
                  <div key={index} className="input-group mb-2">
                    {formData.mode === 'serial' && (
                      <span className="input-group-text">{index + 1}</span>
                    )}
                    <select
                      className="form-select"
                      value={approver.approver_user_id}
                      onChange={(e) => handleApproverChange(index, 'approver_user_id', e.target.value)}
                      required
                    >
                      <option value="">Select approver...</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.username} ({user.email})
                        </option>
                      ))}
                    </select>
                    {formData.approvers.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() => handleRemoveApprover(index)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleAddApprover}
                >
                  <i className="bi bi-plus me-1"></i>
                  Add Approver
                </button>
              </div>

              <button type="submit" className="btn btn-primary">
                Create Workflow
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Workflows List */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Approval Workflows</h5>
        </div>
        <div className="card-body">
          {workflows.length === 0 ? (
            <p className="text-muted mb-0">No approval workflows for this file</p>
          ) : (
            <div className="list-group">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="list-group-item">
                  <div className="d-flex w-100 justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center mb-2">
                        <span className={`badge ${getStatusBadge(workflow.status)} me-2`}>
                          {workflow.status}
                        </span>
                        <span className="badge bg-info me-2">
                          {workflow.mode}
                        </span>
                        <small className="text-muted">
                          Created: {formatDate(workflow.created_at)}
                        </small>
                      </div>
                      {workflow.resolution_text && (
                        <p className="mb-2">{workflow.resolution_text}</p>
                      )}
                      {workflow.completed_at && (
                        <small className="text-muted">
                          Completed: {formatDate(workflow.completed_at)}
                        </small>
                      )}
                    </div>
                    <div>
                      <a
                        href={`/approvals/workflows/${workflow.id}`}
                        className="btn btn-sm btn-outline-primary"
                      >
                        View Details
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalWorkflow;
