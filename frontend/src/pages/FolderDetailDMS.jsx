import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import FileAccessControl from '../components/FileAccessControl';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Folder,
  FileText,
  Info,
  Users,
  Settings,
  Plus,
  Edit2,
  Trash2,
  FolderPlus,
  Upload
} from 'lucide-react';

const FolderDetailDMS = () => {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [folder, setFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [subfolders, setSubfolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('contents');
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const accountId = user?.default_account_id || user?.accounts?.[0]?.id;

  useEffect(() => {
    if (accountId && folderId) {
      fetchFolderDetails();
    }
  }, [folderId, accountId]);

  const fetchFolderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = { 'X-Account-Id': accountId };
      
      // Fetch folder details
      const folderRes = await api.get(`/v2/dms/folders-dms/${folderId}`, { headers });
      setFolder(folderRes.data);
      setEditName(folderRes.data.name);
      setEditDescription(folderRes.data.description || '');
      
      // Fetch files in folder
      const filesRes = await api.get(`/v2/dms/files-dms?folder_id=${folderId}`, { headers });
      setFiles(filesRes.data || []);
      
      // Fetch subfolders
      try {
        const subfoldersRes = await api.get(`/v2/dms/folders-dms?parent_folder_id=${folderId}`, { headers });
        setSubfolders(subfoldersRes.data || []);
      } catch (err) {
        setSubfolders([]);
      }
    } catch (err) {
      setError('Failed to load folder details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFolder = async () => {
    try {
      const headers = { 'X-Account-Id': accountId };
      await api.patch(`/v2/dms/folders-dms/${folderId}`, {
        name: editName,
        description: editDescription
      }, { headers });
      
      toast.success('Folder updated');
      setShowEditModal(false);
      fetchFolderDetails();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update folder');
    }
  };

  const handleDeleteFolder = async () => {
    if (!window.confirm('Delete this folder and all its contents? This cannot be undone.')) return;
    
    try {
      const headers = { 'X-Account-Id': accountId };
      await api.delete(`/v2/dms/folders-dms/${folderId}`, { headers });
      toast.success('Folder deleted');
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete folder');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const tabs = [
    { id: 'contents', label: 'Contents', icon: Folder },
    { id: 'access', label: 'Access Control', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
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

  if (error || !folder) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error || 'Folder not found'}
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
            <Folder size={24} className="text-yellow-500" />
            <span className="break-words">{folder.name}</span>
          </h1>
          {folder.description && (
            <p className="text-gray-600 mt-1">{folder.description}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowEditModal(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Edit2 size={18} />
            <span>Edit</span>
          </button>
          <button 
            onClick={handleDeleteFolder}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <Trash2 size={18} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Folder Info Card */}
      <div className="card">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Files</p>
            <p className="text-2xl font-bold text-gray-900">{files.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Subfolders</p>
            <p className="text-2xl font-bold text-gray-900">{subfolders.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created</p>
            <p className="text-gray-900 text-sm">{formatDate(folder.created_at)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Updated</p>
            <p className="text-gray-900 text-sm">{formatDate(folder.updated_at)}</p>
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
        {activeTab === 'contents' && (
          <div className="space-y-6">
            {/* Subfolders */}
            {subfolders.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FolderPlus size={20} />
                  <span>Subfolders</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subfolders.map((subfolder) => (
                    <Link
                      key={subfolder.id}
                      to={`/folders/${subfolder.id}`}
                      className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Folder className="text-yellow-500" size={24} />
                      <div>
                        <p className="font-medium text-gray-900">{subfolder.name}</p>
                        <p className="text-sm text-gray-500">{formatDate(subfolder.created_at)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Files */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <FileText size={20} />
                <span>Files ({files.length})</span>
              </h3>
              {files.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-gray-500">No files in this folder</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <Link
                      key={file.id}
                      to={`/files/${file.id}`}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="text-blue-500" size={20} />
                        <div>
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatSize(file.size_bytes)} • {file.mime_type || 'Unknown type'}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">{formatDate(file.created_at)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'access' && (
          <FileAccessControl fileId={folderId} accountId={accountId} resourceType="folder" />
        )}

        {activeTab === 'settings' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Folder Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Folder Name</label>
                <p className="text-gray-900">{folder.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <p className="text-gray-900">{folder.description || 'No description'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <p className="text-gray-900">{folder.section_name || folder.section_id || 'Unknown'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                <p className="text-gray-900">{folder.created_by || 'Unknown'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Edit Folder</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleUpdateFolder} className="flex-1 btn-primary">
                Save
              </button>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FolderDetailDMS;
