import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { Users as UsersIcon, Shield, UserCheck, UserX, Search, Plus, Edit2, Save, X, Key } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'

export default function Users() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetPasswordUser, setResetPasswordUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  
  const currentAccountId = user?.default_account_id || user?.accounts?.[0]?.id

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const headers = currentAccountId ? { 'X-Account-Id': currentAccountId } : {}
      const response = await api.get('/v2/rbac/users', { headers })
      setUsers(response.data)
    } catch (error) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = () => {
    setEditingUser({ username: '', email: '', password: '', full_name: '', is_active: true })
    setShowModal(true)
  }

  const handleEditUser = (user) => {
    setEditingUser({ ...user, password: '' })
    setShowModal(true)
  }

  const handleSaveUser = async () => {
    try {
      const headers = currentAccountId ? { 'X-Account-Id': currentAccountId } : {}
      
      if (editingUser.id) {
        // Update existing user
        await api.patch(`/v2/rbac/users/${editingUser.id}`, null, {
          headers,
          params: {
            full_name: editingUser.full_name || undefined,
            is_active: editingUser.is_active
          }
        })
        toast.success('User updated successfully')
      } else {
        // Create new user
        if (!editingUser.username || !editingUser.email || !editingUser.password) {
          toast.error('Username, email, and password are required')
          return
        }
        await api.post('/v2/rbac/users', {
          username: editingUser.username,
          email: editingUser.email,
          password: editingUser.password,
          full_name: editingUser.full_name || null,
          is_active: editingUser.is_active
        }, { headers })
        toast.success('User created successfully')
      }
      setShowModal(false)
      setEditingUser(null)
      loadUsers()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save user')
    }
  }

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const headers = currentAccountId ? { 'X-Account-Id': currentAccountId } : {}
      const endpoint = currentStatus ? 'deactivate' : 'activate'
      await api.patch(`/v2/rbac/users/${userId}/${endpoint}`, null, { headers })
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`)
      loadUsers()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user status')
    }
  }

  const handleResetPassword = (user) => {
    setResetPasswordUser(user)
    setNewPassword('')
    setShowResetPassword(true)
  }

  const submitResetPassword = async () => {
    if (!newPassword || newPassword.length < 5) {
      toast.error('Password must be at least 5 characters')
      return
    }
    try {
      const headers = currentAccountId ? { 'X-Account-Id': currentAccountId } : {}
      await api.patch(`/v2/rbac/users/${resetPasswordUser.id}/reset-password`, 
        { new_password: newPassword }, 
        { headers }
      )
      toast.success('Password reset successfully')
      setShowResetPassword(false)
      setResetPasswordUser(null)
      setNewPassword('')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password')
    }
  }

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage users, roles, and permissions</p>
        </div>
        <button
          onClick={handleCreateUser}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">New User</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Super Admin
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <UsersIcon className="text-blue-600" size={20} />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500 md:hidden">{user.email}</div>
                        {user.full_name && (
                          <div className="text-xs text-gray-500">{user.full_name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                    {user.is_super_admin && (
                      <Shield className="text-purple-600" size={20} />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-gray-600 hover:text-gray-800"
                        title="Edit user"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => toggleUserStatus(user.id, user.is_active)}
                        className={`inline-flex items-center px-3 py-1 rounded-lg text-sm ${
                          user.is_active
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        disabled={user.is_super_admin}
                        title={user.is_super_admin ? 'Cannot deactivate super admin' : ''}
                      >
                        {user.is_active ? (
                          <>
                            <UserX size={16} className="mr-1" />
                            <span className="hidden sm:inline">Deactivate</span>
                          </>
                        ) : (
                          <>
                            <UserCheck size={16} className="mr-1" />
                            <span className="hidden sm:inline">Activate</span>
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UsersIcon className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">No users found</p>
          </div>
        )}
      </div>

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">
              {editingUser?.id ? 'Edit User' : 'Create User'}
            </h2>
            <div className="space-y-4">
              {editingUser?.id ? (
                <>
                  {/* Show read-only user info when editing */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                      type="text"
                      value={editingUser?.username || ''}
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editingUser?.email || ''}
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editingUser?.username || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={editingUser?.email || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Enter email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={editingUser?.password || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Enter password (min 5 chars)"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingUser?.full_name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Enter full name"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingUser?.is_active ?? true}
                  onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  disabled={editingUser?.is_super_admin}
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active
                </label>
                {editingUser?.is_super_admin && (
                  <span className="ml-2 text-xs text-purple-600">(Super Admin cannot be deactivated)</span>
                )}
              </div>
              {/* Reset Password button for existing users */}
              {editingUser?.id && (
                <button
                  onClick={() => {
                    setShowModal(false)
                    handleResetPassword(editingUser)
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
                >
                  <Key size={18} />
                  Reset Password
                </button>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveUser}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save size={18} />
                Save
              </button>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingUser(null)
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
            <p className="text-sm text-gray-600 mb-4">
              Reset password for <span className="font-medium">{resetPasswordUser?.username}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Enter new password (min 5 chars)"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={submitResetPassword}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                <Key size={18} />
                Reset Password
              </button>
              <button
                onClick={() => {
                  setShowResetPassword(false)
                  setResetPasswordUser(null)
                  setNewPassword('')
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
