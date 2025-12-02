import { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { Users, Plus, X, UserMinus, Search, Shield, Eye, Edit, Trash2 } from 'lucide-react';

const FileAccessControl = ({ fileId, accountId, resourceType = 'file' }) => {
  const [usersWithAccess, setUsersWithAccess] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState('view');

  const permissions = [
    { id: 'view', label: 'View Only', icon: Eye, description: 'Can view the document' },
    { id: 'edit', label: 'Edit', icon: Edit, description: 'Can view and edit' },
    { id: 'full', label: 'Full Access', icon: Shield, description: 'Can view, edit, and delete' },
  ];

  useEffect(() => {
    if (fileId && accountId) {
      loadAccessData();
    }
  }, [fileId, accountId]);

  const loadAccessData = async () => {
    try {
      setLoading(true);
      const headers = { 'X-Account-Id': accountId };
      
      // Load users with access to this file/folder
      const endpoint = resourceType === 'folder' 
        ? `/v2/dms/folders-dms/${fileId}/access`
        : `/v2/dms/files-dms/${fileId}/access`;
      
      try {
        const accessRes = await api.get(endpoint, { headers });
        setUsersWithAccess(accessRes.data || []);
      } catch (err) {
        // Access endpoint might not exist yet, use empty array
        setUsersWithAccess([]);
      }
      
      // Load all users for adding
      const usersRes = await api.get('/v2/rbac/users', { headers });
      setAvailableUsers(usersRes.data || []);
    } catch (error) {
      console.error('Failed to load access data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccess = async (userId) => {
    try {
      const headers = { 'X-Account-Id': accountId };
      const endpoint = resourceType === 'folder'
        ? `/v2/dms/folders-dms/${fileId}/access`
        : `/v2/dms/files-dms/${fileId}/access`;
      
      await api.post(endpoint, {
        user_id: userId,
        permission: selectedPermission
      }, { headers });
      
      toast.success('Access granted successfully');
      setShowAddUser(false);
      setSearchQuery('');
      loadAccessData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to grant access');
    }
  };

  const handleRemoveAccess = async (userId) => {
    if (!window.confirm('Remove access for this user?')) return;
    
    try {
      const headers = { 'X-Account-Id': accountId };
      const endpoint = resourceType === 'folder'
        ? `/v2/dms/folders-dms/${fileId}/access/${userId}`
        : `/v2/dms/files-dms/${fileId}/access/${userId}`;
      
      await api.delete(endpoint, { headers });
      
      toast.success('Access removed');
      loadAccessData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove access');
    }
  };

  const handleUpdatePermission = async (userId, newPermission) => {
    try {
      const headers = { 'X-Account-Id': accountId };
      const endpoint = resourceType === 'folder'
        ? `/v2/dms/folders-dms/${fileId}/access/${userId}`
        : `/v2/dms/files-dms/${fileId}/access/${userId}`;
      
      await api.patch(endpoint, {
        permission: newPermission
      }, { headers });
      
      toast.success('Permission updated');
      loadAccessData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update permission');
    }
  };

  const filteredUsers = availableUsers.filter(user => {
    const hasAccess = usersWithAccess.some(u => u.user_id === user.id || u.id === user.id);
    const matchesSearch = user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return !hasAccess && matchesSearch;
  });

  const getPermissionBadge = (permission) => {
    const colors = {
      view: 'bg-blue-100 text-blue-700',
      edit: 'bg-yellow-100 text-yellow-700',
      full: 'bg-green-100 text-green-700'
    };
    return colors[permission] || colors.view;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Users size={20} />
            <span>Access Control</span>
          </h3>
          <button
            onClick={() => setShowAddUser(!showAddUser)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>Add User</span>
          </button>
        </div>

        {/* Add User Section */}
        {showAddUser && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Grant Access to User</h4>
            
            {/* Permission Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Permission Level</label>
              <div className="flex flex-wrap gap-2">
                {permissions.map((perm) => {
                  const Icon = perm.icon;
                  return (
                    <button
                      key={perm.id}
                      onClick={() => setSelectedPermission(perm.id)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                        selectedPermission === perm.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="text-sm">{perm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
            </div>

            {/* User List */}
            <div className="max-h-48 overflow-y-auto space-y-2">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {searchQuery ? 'No users found' : 'All users already have access'}
                </p>
              ) : (
                filteredUsers.slice(0, 10).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{user.username}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <button
                      onClick={() => handleAddAccess(user.id)}
                      className="btn-primary text-sm px-3 py-1"
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => { setShowAddUser(false); setSearchQuery(''); }}
              className="mt-3 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Current Access List */}
        <div>
          <h4 className="font-medium text-gray-700 mb-3">Users with Access</h4>
          {usersWithAccess.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Users className="mx-auto text-gray-400 mb-2" size={32} />
              <p className="text-gray-500">No additional users have access</p>
              <p className="text-sm text-gray-400 mt-1">Only the owner can access this {resourceType}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {usersWithAccess.map((access) => (
                <div
                  key={access.user_id || access.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {(access.username || access.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{access.username || 'Unknown User'}</p>
                      <p className="text-sm text-gray-500">{access.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <select
                      value={access.permission || 'view'}
                      onChange={(e) => handleUpdatePermission(access.user_id || access.id, e.target.value)}
                      className={`text-sm px-3 py-1 rounded-full border-0 ${getPermissionBadge(access.permission)}`}
                    >
                      {permissions.map((perm) => (
                        <option key={perm.id} value={perm.id}>{perm.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRemoveAccess(access.user_id || access.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Remove access"
                    >
                      <UserMinus size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Access Info */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Shield className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h5 className="font-medium text-blue-800">About Access Control</h5>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• <strong>View Only:</strong> User can view but not modify the {resourceType}</li>
              <li>• <strong>Edit:</strong> User can view and make changes</li>
              <li>• <strong>Full Access:</strong> User can view, edit, and delete</li>
              <li>• The owner always has full access</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileAccessControl;
