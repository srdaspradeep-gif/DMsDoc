import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Eye, Users, FileText, Folder, FolderTree, Search, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function AccessOverview() {
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState('user') // 'user' or 'resource'
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [userAccess, setUserAccess] = useState(null)
  const [resourceType, setResourceType] = useState('file')
  const [resourceId, setResourceId] = useState('')
  const [resourceAccess, setResourceAccess] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const accountId = user?.default_account_id || user?.accounts?.[0]?.id

  useEffect(() => {
    if (accountId) loadUsers()
  }, [accountId])

  const loadUsers = async () => {
    try {
      const response = await api.get('/v2/rbac/users')
      setUsers(response.data)
    } catch (error) {
      toast.error('Failed to load users')
    }
  }

  const loadUserAccess = async (userId) => {
    setLoading(true)
    try {
      const response = await api.get(`/v2/dms/access-overview/user/${userId}`, {
        params: { account_id: accountId }
      })
      setUserAccess(response.data)
      setSelectedUser(userId)
    } catch (error) {
      toast.error('Failed to load user access')
    } finally {
      setLoading(false)
    }
  }

  const loadResourceAccess = async () => {
    if (!resourceId) {
      toast.error('Enter a resource ID')
      return
    }
    setLoading(true)
    try {
      const response = await api.get(`/v2/dms/access-overview/resource/${resourceType}/${resourceId}`, {
        params: { account_id: accountId }
      })
      setResourceAccess(response.data)
    } catch (error) {
      toast.error('Failed to load resource access')
    } finally {
      setLoading(false)
    }
  }


  const getAccessIcon = (type) => {
    switch (type) {
      case 'file': return <FileText className="text-blue-600" size={18} />
      case 'folder': return <Folder className="text-yellow-600" size={18} />
      case 'section': return <FolderTree className="text-green-600" size={18} />
      default: return <FileText className="text-gray-600" size={18} />
    }
  }

  const getLevelBadge = (level) => {
    const colors = {
      preview: 'bg-gray-100 text-gray-700',
      view: 'bg-blue-100 text-blue-700',
      editor: 'bg-green-100 text-green-700',
      admin: 'bg-purple-100 text-purple-700'
    }
    return <span className={`px-2 py-1 text-xs rounded ${colors[level] || colors.view}`}>{level}</span>
  }

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Access Overview</h1>
        <p className="text-sm text-gray-600 mt-1">View who has access to what resources</p>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <button onClick={() => setViewMode('user')}
          className={`px-4 py-2 rounded-lg ${viewMode === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
          <User size={18} className="inline mr-2" /> By User
        </button>
        <button onClick={() => setViewMode('resource')}
          className={`px-4 py-2 rounded-lg ${viewMode === 'resource' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
          <Eye size={18} className="inline mr-2" /> By Resource
        </button>
      </div>

      {viewMode === 'user' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* User List */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="Search users..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredUsers.map(u => (
                <button key={u.id} onClick={() => loadUserAccess(u.id)}
                  className={`w-full text-left p-3 rounded-lg transition ${selectedUser === u.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'} border`}>
                  <div className="text-sm font-medium">{u.username}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </button>
              ))}
            </div>
          </div>

          {/* User Access Details */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : userAccess ? (
              <div>
                <h3 className="text-lg font-semibold mb-4">Access for {userAccess.username}</h3>
                {userAccess.resources?.length === 0 ? (
                  <p className="text-gray-500">No resources accessible</p>
                ) : (
                  <div className="space-y-2">
                    {userAccess.resources?.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getAccessIcon(r.resource_type)}
                          <div>
                            <div className="text-sm font-medium">{r.resource_name}</div>
                            <div className="text-xs text-gray-500">{r.resource_type}</div>
                          </div>
                        </div>
                        {getLevelBadge(r.access_level)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Select a user to view their access</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex gap-4 mb-4">
            <select value={resourceType} onChange={(e) => setResourceType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="file">File</option>
              <option value="folder">Folder</option>
              <option value="section">Section</option>
            </select>
            <input type="text" placeholder="Resource ID" value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            <button onClick={loadResourceAccess} disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Loading...' : 'Check Access'}
            </button>
          </div>

          {resourceAccess && (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                {getAccessIcon(resourceAccess.resource_type)}
                <span className="ml-2">{resourceAccess.resource_name}</span>
              </h3>
              {resourceAccess.accessors?.length === 0 ? (
                <p className="text-gray-500">No users have access</p>
              ) : (
                <div className="space-y-2">
                  {resourceAccess.accessors?.map((a, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <User size={18} className="text-gray-600" />
                        <div>
                          <div className="text-sm font-medium">{a.accessor_name}</div>
                          <div className="text-xs text-gray-500">{a.accessor_type}</div>
                        </div>
                      </div>
                      {getLevelBadge(a.access_level)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
