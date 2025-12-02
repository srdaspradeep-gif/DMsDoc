import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import FileVersions from '../components/FileVersions';
import FileLock from '../components/FileLock';
import FileReminders from '../components/FileReminders';
import FileMetadata from '../components/FileMetadata';
import SecureViewer from '../components/SecureViewer';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Clock, 
  Lock, 
  Bell, 
  Info, 
  Tag,
  ExternalLink,
  ScanLine,
  Shield
} from 'lucide-react';

const FileDetailDMS = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [error, setError] = useState(null);
  const [showSecureViewer, setShowSecureViewer] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const accountId = user?.default_account_id || user?.accounts?.[0]?.id;

  useEffect(() => {
    if (accountId && fileId) {
      fetchFileDetails();
    }
  }, [fileId, accountId]);

  const fetchFileDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/v2/dms/files-dms/${fileId}`, {
        headers: { 'X-Account-Id': accountId }
      });
      const fileData = response.data;
      
      // Fetch folder to get section_id for metadata filtering
      if (fileData.folder_id) {
        try {
          const folderResponse = await api.get(`/v2/dms/folders-dms/${fileData.folder_id}`, {
            headers: { 'X-Account-Id': accountId }
          });
          fileData.section_id = folderResponse.data.section_id;
        } catch (folderErr) {
          console.warn('Could not fetch folder details:', folderErr);
        }
      }
      
      setFile(fileData);
    } catch (err) {
      setError('Failed to load file details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await api.get(`/v2/dms/files-dms/${fileId}/download`, {
        headers: { 'X-Account-Id': accountId },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.original_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Download started');
    } catch (err) {
      toast.error('Failed to download file');
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

  const handleSecureView = () => {
    setShowSecureViewer(true);
  };

  const handleRunOCR = async () => {
    try {
      setOcrLoading(true);
      // For now, just show a toast - OCR integration will be added later
      toast.success('OCR process initiated. This feature will be fully integrated soon.');
      // Future: await api.post(`/v2/dms/files-dms/${fileId}/ocr`, {}, { headers: { 'X-Account-Id': accountId } });
    } catch (err) {
      toast.error('Failed to run OCR');
    } finally {
      setOcrLoading(false);
    }
  };

  const canPreview = file?.mime_type?.startsWith('image/') || file?.mime_type === 'application/pdf';

  const tabs = [
    { id: 'details', label: 'Details', icon: Info },
    { id: 'metadata', label: 'Metadata', icon: Tag },
    { id: 'versions', label: 'Versions', icon: Clock },
    { id: 'lock', label: 'Lock', icon: Lock },
    { id: 'reminders', label: 'Reminders', icon: Bell },
  ];

  if (!accountId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          No account assigned. Please contact your administrator.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error || 'File not found'}
        </div>
        <button 
          className="btn-secondary flex items-center space-x-2" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={18} />
          <span>Go Back</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button 
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <FileText size={24} className="text-gray-500" />
            <span className="break-words">{file.name}</span>
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            onClick={handleRunOCR}
            disabled={ocrLoading}
            title="Extract text from document using OCR"
          >
            <ScanLine size={18} />
            <span>{ocrLoading ? 'Processing...' : 'Run OCR'}</span>
          </button>
          <button className="btn-primary flex items-center space-x-2" onClick={handleDownload}>
            <Download size={18} />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* File Info Card */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Document ID:</p>
              <p className="text-gray-900 font-mono text-sm">{file.document_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Original Filename:</p>
              <p className="text-gray-900">{file.original_filename}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Size:</p>
              <p className="text-gray-900">{formatSize(file.size_bytes)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Type:</p>
              <p className="text-gray-900">{file.mime_type || 'Unknown'}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Created:</p>
              <p className="text-gray-900">{formatDate(file.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Updated:</p>
              <p className="text-gray-900">{formatDate(file.updated_at)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tags:</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {file.tags && file.tags.length > 0 ? (
                  file.tags.map((tag, idx) => (
                    <span 
                      key={idx} 
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400">No tags</span>
                )}
              </div>
            </div>
            {file.notes && (
              <div>
                <p className="text-sm text-gray-500">Notes:</p>
                <p className="text-gray-900">{file.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'details' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">File Information</h3>
            <p className="text-gray-600 mb-6">
              This is the main file information. Use the tabs above to manage versions, 
              lock status, and reminders.
            </p>
            
            {file.is_office_doc && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-6 flex items-center space-x-2">
                <FileText size={18} />
                <span>This is an Office document ({file.office_type})</span>
                {file.office_url && (
                  <a 
                    href={file.office_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="ml-2 text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                  >
                    <span>Open in Office 365</span>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            )}

            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Quick Actions</h4>
              <div className="flex flex-wrap gap-3">
                {canPreview && (
                  <button 
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2" 
                    onClick={handleSecureView}
                  >
                    <Shield size={18} />
                    <span>Secure View</span>
                  </button>
                )}
                <button 
                  className="btn-secondary flex items-center space-x-2" 
                  onClick={handleDownload}
                >
                  <Download size={18} />
                  <span>Download</span>
                </button>
                <button 
                  className="btn-secondary flex items-center space-x-2" 
                  onClick={() => setActiveTab('versions')}
                >
                  <Clock size={18} />
                  <span>View Versions</span>
                </button>
                <button 
                  className="btn-secondary flex items-center space-x-2" 
                  onClick={() => setActiveTab('lock')}
                >
                  <Lock size={18} />
                  <span>Manage Lock</span>
                </button>
                <button 
                  className="btn-secondary flex items-center space-x-2" 
                  onClick={() => setActiveTab('reminders')}
                >
                  <Bell size={18} />
                  <span>Set Reminder</span>
                </button>
              </div>
            </div>

            {/* Secure View Info */}
            {canPreview && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Shield className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h5 className="font-medium text-green-800">Secure View Available</h5>
                    <p className="text-sm text-green-700 mt-1">
                      View this document in a protected mode where downloading, printing, and copying are disabled.
                      Right-click is blocked and all viewing activity is logged.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'metadata' && (
          <FileMetadata fileId={fileId} accountId={accountId} sectionId={file?.section_id} />
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

      {/* Secure Viewer Modal */}
      {showSecureViewer && (
        <SecureViewer
          fileId={fileId}
          fileName={file.name}
          mimeType={file.mime_type}
          accountId={accountId}
          onClose={() => setShowSecureViewer(false)}
        />
      )}
    </div>
  );
};

export default FileDetailDMS;
