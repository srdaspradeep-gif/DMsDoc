import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { Users, Plus, Edit2, Trash2, Save, X, Search, UserPlus, UserMinus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Groups() {
  const [groups, setGroups] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [showMembers, setShowMembers] = useState(null)
  const [groupMembers, setGroupMembers] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [groupsRes, usersRes] = await Promise.all([
        api.get('/v2/rbac/groups'),
        api.get('/v2/rbac/users')
      ])
      setGroups(groupsRes.data)
      setUsers(usersRes.data)
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadGroupMembers = async (groupId) => {
    try {
      const group = groups.find(g => g.id === groupId)
      // Get group details with members
      const response = await api.get(`/v2/rbac/groups/${groupId}`)
      const members = response.data.users || []
      setGroupMembers(members)
      
      // Filter available users (not in group)
      const memberIds = members.map(m => m.id)
      const available = users.filter(u => !memberIds.includes(u.id))
      setAvailableUsers(available)
      
      setShowMembers(groupId)
    } catch (error) {
      toast.error('Failed to load group members')
    }
  }

  const handleCreateGroup = () => {
    setEditingGroup({ name: '', description: '', account_id: null })
    setShowModal(true)
  }

  const handleEditGroup = (group) => {
    setEditingGroup({ ...group })
    setShowModal(true)
  }

  const handleSaveGroup = async () => {
    try {
      if (editingGroup.id) {
        await api.patch(`/v2/rbac/groups/${editingGroup.id}`, {
          name: editingGroup.name,
          description: editingGroup.description
        })
        toast.success('Group updated successfully')
      } else {
        await api.post('/v2/rbac/groups', editingGroup)
        toast.success('Group created successfully')
      }
      setShowModal(false)
      setEditingGroup(null)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save group')
    }
  }

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('Delete this group? This cannot be undone.')) return

    try {
      await api.delete(`/v2/rbac/groups/${groupId}`)
      toast.success('Group deleted successfully')
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete group')
    }
  }

  const handleAddUser = async (userId) => {
    try {
      await api.post('/v2/rbac/groups/assign-user', {
        user_id: userId,
        group_id: showMembers
      })
      toast.success('User added to group')
      loadGroupMembers(showMembers)
    } catch (error) {
      toast.error('Failed to add user')
    }
  }

  const handleRemoveUser = async (userId) => {
    try {
      await api.delete('/v2/rbac/groups/unassign-user', {
        data: {
          user_id: userId,
          group_id: showMembers
        }
      })
      toast.success('User removed from group')
      loadGroupMembers(showMembers)
    } catch (error) {
      toast.error('Failed to remove user')
    }
  }

  const filteredGroups = groups.filter(group =>
    group.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Groups Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage user groups</p>
        </div>
        <button
          onClick={handleCreateGroup}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">New Group</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Groups List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Group
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
              {filteredGroups.map((group) => (
                <tr key={group.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Users className="text-blue-600 mr-3" size={20} />
                      <div className="text-sm font-medium text-gray-900">{group.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="text-sm text-gray-600">{group.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => loadGroupMembers(group.id)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Manage Members"
                      >
                        <Users size={18} />
                      </button>
                      <button
                        onClick={() => handleEditGroup(group)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="text-red-600 hover:text-red-800"
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

        {filteredGroups.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">No groups found</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">
              {editingGroup?.id ? 'Edit Group' : 'Create Group'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingGroup?.name || ''}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingGroup?.description || ''}
                  onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveGroup}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save size={18} />
                Save
              </button>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingGroup(null)
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

      {/* Members Modal */}
      {showMembers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Group Members</h2>
              <button
                onClick={() => {
                  setShowMembers(null)
                  setGroupMembers([])
                  setAvailableUsers([])
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Current Members */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Current Members</h3>
              <div className="space-y-2">
                {groupMembers.length === 0 ? (
                  <p className="text-sm text-gray-500">No members yet</p>
                ) : (
                  groupMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium">{member.username}</div>
                        <div className="text-xs text-gray-500">{member.email}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveUser(member.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <UserMinus size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Available Users */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Add Members</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No available users</p>
                ) : (
                  availableUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium">{user.username}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                      <button
                        onClick={() => handleAddUser(user.id)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <UserPlus size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
