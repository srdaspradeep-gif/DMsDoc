import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ShareDialog = ({ isOpen, onClose, resource, accountId }) => {
  const [shares, setShares] = useState([]);
  const [targetType, setTargetType] = useState('user');
  const [targetId, setTargetId] = useState('');
  const [accessLevel, setAccessLevel] = useState('view');
  const [expiresAt, setExpiresAt] = useState('');
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [publicLink, setPublicLink] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && resource) {
      loadShares();
      loadUsersAndGroups();
    }
  }, [isOpen, resource]);

  const loadShares = async () => {
    try {
      const response = await axios.get('/dms/shares', {
        params: {
          account_id: accountId,
          resource_type: resource.type,
          resource_id: resource.id
        }
      });
      setShares(response.data);
      
      // Find public link if exists
      const pubLink = response.data.find(s => s.target_type === 'public_link');
      if (pubLink) {
        setPublicLink({
          url: `${window.location.origin}/public/share/${pubLink.public_token}`,
          ...pubLink
        });
      }
    } catch (error) {
      console.error('Failed to load shares:', error);
    }
  };

  const loadUsersAndGroups = async () => {
    try {
      const [usersRes, groupsRes] = await Promise.all([
        axios.get('/rbac/users', { params: { account_id: accountId } }),
        axios.get('/rbac/groups', { params: { account_id: accountId } })
      ]);
      setUsers(usersRes.data);
      setGroups(groupsRes.data);
    } catch (error) {
      console.error('Failed to load users/groups:', error);
    }
  };

  const handleCreateShare = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post('/dms/shares', {
        account_id: accountId,
        resource_type: resource.type,
        resource_id: resource.id,
        target_type: targetType,
        target_id: targetType === 'public_link' ? null : targetId,
        access_level: accessLevel,
        expires_at: expiresAt || null
      });
      
      // Reset form
      setTargetId('');
      setAccessLevel('view');
      setExpiresAt('');
      
      // Reload shares
      await loadShares();
    } catch (error) {
      alert('Failed to create share: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShare = async (shareId) => {
    if (!confirm('Delete this share?')) return;
    
    try {
      await axios.delete(`/dms/shares/${shareId}`);
      await loadShares();
    } catch (error) {
      alert('Failed to delete share: ' + (error.response?.data?.detail || error.message));
    }
  };

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicLink.url);
    alert('Link copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Share {resource?.name}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Create Share Form */}
          <form onSubmit={handleCreateShare} className="mb-6 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-3">Add New Share</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium mb-1">Share With</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="user">User</option>
                  <option value="group">Group</option>
                  <option value="public_link">Public Link</option>
                </select>
              </div>

              {targetType !== 'public_link' && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {targetType === 'user' ? 'Select User' : 'Select Group'}
                  </label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="">Choose...</option>
                    {targetType === 'user' ? (
                      users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)
                    ) : (
                      groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)
                    )}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium mb-1">Access Level</label>
                <select
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="preview">Preview Only</option>
                  <option value="view">View & Download</option>
                  <option value="edit">Edit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Share'}
            </button>
          </form>

          {/* Public Link */}
          {publicLink && (
            <div className="mb-6 p-4 bg-blue-50 rounded">
              <h3 className="font-semibold mb-2">Public Link</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={publicLink.url}
                  readOnly
                  className="flex-1 border rounded px-3 py-2 bg-white"
                />
                <button
                  onClick={copyPublicLink}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Copy
                </button>
                <button
                  onClick={() => handleDeleteShare(publicLink.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Revoke
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Access: {publicLink.access_level} | 
                {publicLink.expires_at ? ` Expires: ${new Date(publicLink.expires_at).toLocaleString()}` : ' No expiration'}
              </p>
            </div>
          )}

          {/* Existing Shares */}
          <div>
            <h3 className="font-semibold mb-3">Current Shares</h3>
            {shares.filter(s => s.target_type !== 'public_link').length === 0 ? (
              <p className="text-gray-500 text-center py-4">No shares yet</p>
            ) : (
              <div className="space-y-2">
                {shares.filter(s => s.target_type !== 'public_link').map(share => (
                  <div key={share.id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">
                        {share.target_type === 'user' ? '👤 User' : '👥 Group'}: {share.target_id}
                      </p>
                      <p className="text-sm text-gray-600">
                        Access: {share.access_level}
                        {share.expires_at && ` | Expires: ${new Date(share.expires_at).toLocaleString()}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteShare(share.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;
