import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FileLock = ({ fileId, accountId }) => {
  const [lockStatus, setLockStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(6);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLockStatus();
  }, [fileId]);

  const fetchLockStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/dms/files-dms/${fileId}/lock`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Account-Id': accountId
        }
      });
      setLockStatus(response.data);
    } catch (err) {
      setError('Failed to load lock status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLock = async () => {
    try {
      await axios.post(
        `/dms/files-dms/${fileId}/lock?duration_hours=${duration}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-Account-Id': accountId
          }
        }
      );
      fetchLockStatus();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to lock file');
    }
  };

  const handleUnlock = async () => {
    try {
      await axios.delete(`/dms/files-dms/${fileId}/lock`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Account-Id': accountId
        }
      });
      fetchLockStatus();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to unlock file');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) return <div className="text-center py-4">Loading lock status...</div>;

  return (
    <div className="file-lock">
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">File Lock Status</h5>
        </div>
        <div className="card-body">
          {lockStatus?.is_locked ? (
            <div>
              <div className="alert alert-warning d-flex align-items-center" role="alert">
                <i className="bi bi-lock-fill me-2"></i>
                <div>
                  <strong>File is Locked</strong>
                  <div className="small">
                    Locked by: <strong>{lockStatus.locked_by_username || lockStatus.locked_by}</strong>
                  </div>
                  <div className="small">
                    Until: <strong>{formatDate(lockStatus.locked_until)}</strong>
                  </div>
                </div>
              </div>

              {lockStatus.can_unlock && (
                <button
                  className="btn btn-danger"
                  onClick={handleUnlock}
                >
                  <i className="bi bi-unlock me-2"></i>
                  Unlock File
                </button>
              )}

              {!lockStatus.can_unlock && (
                <p className="text-muted mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  You cannot unlock this file. Only the lock owner or an administrator can unlock it.
                </p>
              )}
            </div>
          ) : (
            <div>
              <div className="alert alert-success d-flex align-items-center" role="alert">
                <i className="bi bi-unlock-fill me-2"></i>
                <div>
                  <strong>File is Unlocked</strong>
                  <div className="small">Anyone with permission can edit this file</div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Lock Duration (hours)</label>
                <select
                  className="form-select"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                >
                  <option value="1">1 hour</option>
                  <option value="2">2 hours</option>
                  <option value="4">4 hours</option>
                  <option value="6">6 hours</option>
                  <option value="12">12 hours</option>
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                  <option value="72">72 hours</option>
                </select>
              </div>

              <button
                className="btn btn-warning"
                onClick={handleLock}
              >
                <i className="bi bi-lock me-2"></i>
                Lock File
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-body">
          <h6 className="card-title">About File Locking</h6>
          <ul className="small mb-0">
            <li>Locking a file prevents others from uploading new versions or making changes</li>
            <li>The lock will automatically expire after the specified duration</li>
            <li>Only the lock owner or an administrator can unlock the file before expiration</li>
            <li>You can still view and download locked files</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FileLock;
