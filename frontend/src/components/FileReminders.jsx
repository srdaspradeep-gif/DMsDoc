import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FileReminders = ({ fileId, accountId }) => {
  const [reminders, setReminders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    target_user_id: '',
    remind_at: '',
    message: ''
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReminders();
    fetchUsers();
  }, [fileId]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/dms/files-dms/${fileId}/reminders`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Account-Id': accountId
        }
      });
      setReminders(response.data);
    } catch (err) {
      setError('Failed to load reminders');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `/dms/files-dms/${fileId}/reminders`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-Account-Id': accountId,
            'Content-Type': 'application/json'
          }
        }
      );
      setFormData({ target_user_id: '', remind_at: '', message: '' });
      setShowForm(false);
      fetchReminders();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create reminder');
    }
  };

  const handleDelete = async (reminderId) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) {
      return;
    }

    try {
      await axios.delete(`/dms/files-dms/reminders/${reminderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Account-Id': accountId
        }
      });
      fetchReminders();
    } catch (err) {
      setError('Failed to delete reminder');
    }
  };

  const handleDismiss = async (reminderId) => {
    try {
      await axios.patch(
        `/dms/files-dms/reminders/${reminderId}`,
        { status: 'dismissed' },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-Account-Id': accountId,
            'Content-Type': 'application/json'
          }
        }
      );
      fetchReminders();
    } catch (err) {
      setError('Failed to dismiss reminder');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-warning',
      sent: 'bg-info',
      dismissed: 'bg-secondary'
    };
    return badges[status] || 'bg-secondary';
  };

  if (loading) return <div className="text-center py-4">Loading reminders...</div>;

  return (
    <div className="file-reminders">
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Add Reminder Button */}
      <div className="mb-3">
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          <i className="bi bi-plus-circle me-2"></i>
          {showForm ? 'Cancel' : 'Add Reminder'}
        </button>
      </div>

      {/* Add Reminder Form */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">Create Reminder</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Remind User</label>
                <select
                  className="form-select"
                  value={formData.target_user_id}
                  onChange={(e) => setFormData({ ...formData, target_user_id: e.target.value })}
                  required
                >
                  <option value="">Select user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Remind At</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={formData.remind_at}
                  onChange={(e) => setFormData({ ...formData, remind_at: e.target.value })}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Message</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="e.g., Please review this document"
                  maxLength="500"
                  required
                />
                <div className="form-text">{formData.message.length}/500 characters</div>
              </div>

              <button type="submit" className="btn btn-primary">
                Create Reminder
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reminders List */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Reminders</h5>
        </div>
        <div className="card-body">
          {reminders.length === 0 ? (
            <p className="text-muted mb-0">No reminders set for this file</p>
          ) : (
            <div className="list-group">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="list-group-item">
                  <div className="d-flex w-100 justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center mb-2">
                        <span className={`badge ${getStatusBadge(reminder.status)} me-2`}>
                          {reminder.status}
                        </span>
                        <small className="text-muted">
                          <i className="bi bi-clock me-1"></i>
                          {formatDate(reminder.remind_at)}
                        </small>
                      </div>
                      <p className="mb-2">{reminder.message}</p>
                      <small className="text-muted">
                        Created: {formatDate(reminder.created_at)}
                      </small>
                    </div>
                    <div className="btn-group ms-3">
                      {reminder.status === 'pending' && (
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleDismiss(reminder.id)}
                          title="Dismiss"
                        >
                          <i className="bi bi-check"></i>
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(reminder.id)}
                        title="Delete"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
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

export default FileReminders;
