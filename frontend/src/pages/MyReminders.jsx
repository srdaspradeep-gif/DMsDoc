import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const MyReminders = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' or 'now' (due)
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReminders();
  }, [filter]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const url = filter === 'now' 
        ? '/dms/files-dms/reminders/me?due=now'
        : '/dms/files-dms/reminders/me?due=all';
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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

  const handleDismiss = async (reminderId) => {
    try {
      await axios.patch(
        `/dms/files-dms/reminders/${reminderId}`,
        { status: 'dismissed' },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date - now;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMs < 0) {
      return <span className="text-danger">Overdue</span>;
    } else if (diffMins < 60) {
      return <span className="text-warning">In {diffMins} minutes</span>;
    } else if (diffHours < 24) {
      return <span className="text-warning">In {diffHours} hours</span>;
    } else if (diffDays < 7) {
      return <span className="text-info">In {diffDays} days</span>;
    } else {
      return <span className="text-muted">{date.toLocaleDateString()}</span>;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-warning',
      sent: 'bg-info',
      dismissed: 'bg-secondary'
    };
    return badges[status] || 'bg-secondary';
  };

  const isPastDue = (dateString) => {
    return new Date(dateString) < new Date();
  };

  return (
    <Layout>
      <div className="container-fluid py-4">
        <div className="row mb-4">
          <div className="col">
            <h2>
              <i className="bi bi-bell me-2"></i>
              My Reminders
            </h2>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {error}
            <button type="button" className="btn-close" onClick={() => setError(null)}></button>
          </div>
        )}

        {/* Filter Tabs */}
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button
              className={`nav-link ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Reminders
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${filter === 'now' ? 'active' : ''}`}
              onClick={() => setFilter('now')}
            >
              Due Now
              {filter === 'now' && reminders.length > 0 && (
                <span className="badge bg-danger ms-2">{reminders.length}</span>
              )}
            </button>
          </li>
        </ul>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : reminders.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-5">
              <i className="bi bi-bell-slash display-1 text-muted"></i>
              <h4 className="mt-3">No Reminders</h4>
              <p className="text-muted">
                {filter === 'now' 
                  ? "You don't have any due reminders at the moment."
                  : "You don't have any reminders set."}
              </p>
            </div>
          </div>
        ) : (
          <div className="row">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="col-12 col-md-6 col-lg-4 mb-3">
                <div className={`card h-100 ${isPastDue(reminder.remind_at) ? 'border-danger' : ''}`}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <span className={`badge ${getStatusBadge(reminder.status)}`}>
                        {reminder.status}
                      </span>
                      {isPastDue(reminder.remind_at) && (
                        <span className="badge bg-danger">
                          <i className="bi bi-exclamation-triangle me-1"></i>
                          Overdue
                        </span>
                      )}
                    </div>

                    <h5 className="card-title">
                      <Link to={`/documents/${reminder.file_id}`} className="text-decoration-none">
                        {reminder.file_name}
                      </Link>
                    </h5>

                    <p className="card-text">{reminder.message}</p>

                    <div className="small text-muted mb-2">
                      <div>
                        <i className="bi bi-clock me-1"></i>
                        Due: {formatDate(reminder.remind_at)}
                      </div>
                      <div>
                        <i className="bi bi-person me-1"></i>
                        From: {reminder.creator_username}
                      </div>
                      <div>
                        <i className="bi bi-file-earmark me-1"></i>
                        Document ID: {reminder.document_id}
                      </div>
                    </div>

                    {reminder.status === 'pending' && (
                      <div className="d-grid gap-2">
                        <Link
                          to={`/documents/${reminder.file_id}`}
                          className="btn btn-sm btn-primary"
                        >
                          <i className="bi bi-eye me-1"></i>
                          View File
                        </Link>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleDismiss(reminder.id)}
                        >
                          <i className="bi bi-check me-1"></i>
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="card-footer text-muted small">
                    Created: {new Date(reminder.created_at).toLocaleString()}
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

export default MyReminders;
