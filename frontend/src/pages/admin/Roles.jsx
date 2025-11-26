import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { Shield, Plus, Edit2, Trash2, Save, X, Search } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Roles() {
  const [roles, setRoles] = useState([])
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [showPermissions, setShowPermissions] = useState(null)
  const [permissions, setPermissions] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [rolesRes, modulesRes] = await Promise.all([
        api.get('/v2/rbac/roles'),
        api.get('/v2/rbac/modules')
      ])
      setRoles(rolesRes.data)
      setModules(modulesRes.data)
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadRolePermissions = async (roleId) => {
    try {
      const response = await api.get(`/v2/rbac/roles/${roleId}/permissions`)
      const permsMap = {}
      response.data.forEach(perm => {
        permsMap[perm.module.key] = {
          id: perm.id,
          can_create: perm.can_create,
          can_read: perm.can_read,
          can_update: perm.can_update,
          can_delete: perm.can_delete,
          can_admin: perm.can_admin
        }
      })
      setPermissions(permsMap)
      setShowPermissions(roleId)
    } catch (error) {
      toast.error('Failed to load permissions')
    }
  }

  const handleCreateRole = () => {
    setEditingRole({ name: '', description: '', account_id: null })
    setShowModal(true)
  }

  const handleEditRole = (role) => {
    setEditingRole({ ...role })
    setShowModal(true)
  }

  const handleSaveRole = async () => {
    try {
      if (editingRole.id) {
        await api.patch(`/v2/rbac/roles/${editingRole.id}`, {
          name: editingRole.name,
          description: editingRole.description
        })
        toast.success('Role updated successfully')
      } else {
        await api.post('/v2/rbac/roles', editingRole)
        toast.success('Role created successfully')
      }
      setShowModal(false)
      setEditingRole(null)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save role')
    }
  }

  const handleDeleteRole = async (roleId) => {
    if (!confirm('Delete this role? This cannot be undone.')) return

    try {
      await api.delete(`/v2/rbac/roles/${roleId}`)
      toast.success('Role deleted successfully')
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete role')
    }
  }

  const handlePermissionToggle = async (moduleKey, action) => {
    const currentPerm = permissions[moduleKey] || {}
    const newValue = !currentPerm[action]
    
    const updatedPerm = {
      ...currentPerm,
      [action]: newValue
    }

    setPermissions(prev => ({
      ...prev,
      [moduleKey]: updatedPerm
    }))

    try {
      const module = modules.find(m => m.key === moduleKey)
      
      if (currentPerm.id) {
        // Update existing permission
        await api.patch(`/v2/rbac/roles/${showPermissions}/permissions/${currentPerm.id}`, updatedPerm)
      } else {
        // Create new permission
        const response = await api.post(`/v2/rbac/roles/${showPermissions}/permissions`, {
          role_id: showPermissions,
          module_id: module.id,
          ...updatedPerm
        })
        updatedPerm.id = response.data.id
        setPermissions(prev => ({
          ...prev,
          [moduleKey]: updatedPerm
        }))
      }
      toast.success('Permission updated')
    } catch (error) {
      // Revert on error
      setPermissions(prev => ({
        ...prev,
        [moduleKey]: currentPerm
      }))
      toast.error('Failed to update permission')
    }
  }

  const filteredRoles = roles.filter(role =>
    role.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Roles Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage roles and permissions</p>
        </div>
        <button
          onClick={handleCreateRole}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">New Role</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Roles List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRoles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Shield className="text-blue-600 mr-3" size={20} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{role.name}</div>
                        {role.is_system && (
                          <span className="text-xs text-purple-600">System Role</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="text-sm text-gray-600">{role.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => loadRolePermissions(role.id)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Manage Permissions"
                      >
                        <Shield size={18} />
                      </button>
                      <button
                        onClick={() => handleEditRole(role)}
                        className="text-gray-600 hover:text-gray-800"
                        disabled={role.is_system}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="text-red-600 hover:text-red-800"
                        disabled={role.is_system}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRoles.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">No roles found</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">
              {editingRole?.id ? 'Edit Role' : 'Create Role'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingRole?.name || ''}
                  onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingRole?.description || ''}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveRole}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save size={18} />
                Save
              </button>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingRole(null)
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

      {/* Permissions Modal */}
      {showPermissions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Manage Permissions</h2>
              <button
                onClick={() => {
                  setShowPermissions(null)
                  setPermissions({})
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Create</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Read</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Update</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Delete</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Admin</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {modules.map((module) => {
                    const perm = permissions[module.key] || {}
                    return (
                      <tr key={module.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{module.display_name}</td>
                        {['can_create', 'can_read', 'can_update', 'can_delete', 'can_admin'].map(action => (
                          <td key={action} className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={perm[action] || false}
                              onChange={() => handlePermissionToggle(module.key, action)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
