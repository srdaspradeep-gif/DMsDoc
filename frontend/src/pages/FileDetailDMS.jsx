import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import FileVersions from '../components/FileVersions';
import FileLock from '../components/FileLock';
import FileReminders from '../components/FileReminders';

const FileDetailDMS = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [error, setError] = useState(null);
  const accountId = localStorage.getItem('accountId');

  useEffect(() => {
    fetchFileDetails();
  }, [fileId]);

  const fetchFileDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/dms/files-dms/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Account-Id': accountId
        }
      });
      setFile(response.data);
    } catch (err) {
      setError('Failed to load file details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await axios.get(`/dms/files-dms/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Account-Id': accountId
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.original_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to download file');
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !file) {
    return (
      <Layout>
        <div className="container-fluid py-4">
          <div className="alert alert-danger">
            {error || 'File not found'}
          </div>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col">
            <button className="btn btn-link ps-0" onClick={() => navigate(-1)}>
              <i className="bi bi-arrow-left me-2"></i>
              Back
            </button>
            <h2 className="mt-2">
              <i className="bi bi-file-earmark me-2"></i>
              {file.name}
            </h2>
          </div>
          <div className="col-auto">
            <button className="btn btn-primary" onClick={handleDownload}>
              <i className="bi bi-download me-2"></i>
              Download
            </button>
          </div>
        </div>

        {/* File Info Card */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <dl className="row mb-0">
                  <dt className="col-sm-4">Document ID:</dt>
                  <dd className="col-sm-8">
                    <code>{file.document_id}</code>
                  </dd>

                  <dt className="col-sm-4">Original Filename:</dt>
                  <dd className="col-sm-8">{file.original_filename}</dd>

                  <dt className="col-sm-4">Size:</dt>
                  <dd className="col-sm-8">{formatSize(file.size_bytes)}</dd>

                  <dt className="col-sm-4">Type:</dt>
                  <dd className="col-sm-8">{file.mime_type || 'Unknown'}</dd>
                </dl>
              </div>
              <div className="col-md-6">
                <dl className="row mb-0">
                  <dt className="col-sm-4">Created:</dt>
                  <dd className="col-sm-8">{formatDate(file.created_at)}</dd>

                  <dt className="col-sm-4">Updated:</dt>
                  <dd className="col-sm-8">{formatDate(file.updated_at)}</dd>

                  <dt className="col-sm-4">Tags:</dt>
                  <dd className="col-sm-8">
                    {file.tags && file.tags.length > 0 ? (
                      file.tags.map((tag, idx) => (
                        <span key={idx} className="badge bg-secondary me-1">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted">No tags</span>
                    )}
                  </dd>

                  {file.notes && (
                    <>
                      <dt className="col-sm-4">Notes:</dt>
                      <dd className="col-sm-8">{file.notes}</dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              <i className="bi bi-info-circle me-2"></i>
              Details
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'versions' ? 'active' : ''}`}
              onClick={() => setActiveTab('versions')}
            >
              <i className="bi bi-clock-history me-2"></i>
              Versions
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'lock' ? 'active' : ''}`}
              onClick={() => setActiveTab('lock')}
            >
              <i className="bi bi-lock me-2"></i>
              Lock
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'reminders' ? 'active' : ''}`}
              onClick={() => setActiveTab('reminders')}
            >
              <i className="bi bi-bell me-2"></i>
              Reminders
            </button>
          </li>
        </ul>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'details' && (
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">File Information</h5>
                <p className="text-muted">
                  This is the main file information. Use the tabs above to manage versions, 
                  lock status, and reminders.
                </p>
                
                {file.is_office_doc && (
                  <div className="alert alert-info">
                    <i className="bi bi-file-earmark-word me-2"></i>
                    This is an Office document ({file.office_type})
                    {file.office_url && (
                      <a href={file.office_url} target="_blank" rel="noopener noreferrer" className="ms-2">
                        Open in Office 365
                      </a>
                    )}
                  </div>
                )}

                <div className="mt-4">
                  <h6>Quick Actions</h6>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-primary" onClick={handleDownload}>
                      <i className="bi bi-download me-2"></i>
                      Download
                    </button>
                    <button className="btn btn-outline-secondary" onClick={() => setActiveTab('versions')}>
                      <i className="bi bi-clock-history me-2"></i>
                      View Versions
                    </button>
                    <button className="btn btn-outline-warning" onClick={() => setActiveTab('lock')}>
                      <i className="bi bi-lock me-2"></i>
                      Manage Lock
                    </button>
                    <button className="btn btn-outline-info" onClick={() => setActiveTab('reminders')}>
                      <i className="bi bi-bell me-2"></i>
                      Set Reminder
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'versions' && (
            <FileVersions fileId={fileId} accountId={accountId} />
          )}

          {activeTab === 'lock' && (
            <FileLock fileId={fileId} accountId={accountId} />
          )}

          {activeTab === 'reminders' && (
            <FileReminders fileId={fileId} accountId={accountId} />
          )}
        </div>
      </div>

      {/* Mobile Styles */}
      <style jsx>{`
        @media (max-width: 768px) {
          .container-fluid {
            padding-bottom: 80px;
          }
          .nav-tabs {
            flex-wrap: nowrap;
            overflow-x: auto;
          }
          .nav-tabs .nav-link {
            white-space: nowrap;
          }
        }
      `}</style>
    </Layout>
  );
};

export default FileDetailDMS;
