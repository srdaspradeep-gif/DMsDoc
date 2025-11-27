import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Clock, Plus, Edit2, Trash2, Save, X, Search, Play, Folder } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function Retention() {
  const { user } = useAuth()
  const [policies, setPolicies] = useState([])
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const accountId = user?.default_account_id || user?.accounts?.[0]?.id

  useEffect(() => {
    if (accountId) loadData()
  }, [accountId])

  const loadData = async () => {
    try {
      const [policiesRes, foldersRes] = await Promise.all([
        api.get('/v2/dms/retention', { params: { account_id: accountId } }),
        api.get('/v2/dms/folders', { headers: { 'X-Account-Id': accountId } })
      ])
      setPolicies(policiesRes.data)
      setFolders(foldersRes.data)
    } catch (error) {
      toast.error('Failed to load retention policies')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingPolicy({
      folder_id: '', retention_days: 365, mode: 'delete',
      notify_before_days: 30, is_active: true, account_id: accountId
    })
    setShowModal(true)
  }

  const handleEdit = (policy) => {
    setEditingPolicy({ ...policy })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (editingPolicy.id) {
        await api.put(`/v2/dms/retention/${editingPolicy.id}`, editingPolicy)
        toast.success('Policy updated')
      } else {
        await api.post('/v2/dms/retention', editingPolicy)
        toast.success('Policy created')
      }
      setShowModal(false)
      setEditingPolicy(null)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save policy')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this retention policy?')) return
    try {
      await api.delete(`/v2/dms/retention/${id}`)
      toast.success('Policy deleted')
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete')
    }
  }

  const handleApplyPolicies = async () => {
    if (!confirm('Apply all retention policies now? This may delete files.')) return
    try {
      const result = await api.post(`/v2/dms/retention/apply/${accountId}`)
      toast.success(`Applied: ${result.data.files_deleted || 0} files deleted`)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to apply policies')
    }
  }


  const getFolderName = (folderId) => folders.find(f => f.id === folderId)?.name || folderId

  const filteredPolicies = policies.filter(p =>
    getFolderName(p.folder_id)?.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Retention Policies</h1>
          <p className="text-sm text-gray-600 mt-1">Configure document retention rules</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleApplyPolicies} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            <Play size={18} /> Apply Now
          </button>
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={20} /> <span className="hidden sm:inline">New Policy</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Search policies..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Folder</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Retention</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Mode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPolicies.map((policy) => (
                <tr key={policy.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Folder className="text-yellow-600 mr-3" size={20} />
                      <div className="text-sm font-medium text-gray-900">{getFolderName(policy.folder_id)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="text-sm text-gray-600">{policy.retention_days} days</div>
                    {policy.notify_before_days && (
                      <div className="text-xs text-gray-400">Notify {policy.notify_before_days}d before</div>
                    )}
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className={`px-2 py-1 text-xs rounded ${policy.mode === 'delete' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {policy.mode}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <span className={`px-2 py-1 text-xs rounded ${policy.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {policy.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(policy)} className="text-gray-600 hover:text-gray-800"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(policy.id)} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPolicies.length === 0 && (
          <div className="text-center py-12">
            <Clock className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">No retention policies found</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">{editingPolicy?.id ? 'Edit' : 'Create'} Retention Policy</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Folder</label>
                <select value={editingPolicy?.folder_id || ''} onChange={(e) => setEditingPolicy({ ...editingPolicy, folder_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Select folder...</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Retention Days</label>
                <input type="number" value={editingPolicy?.retention_days || 365}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, retention_days: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                <select value={editingPolicy?.mode || 'delete'} onChange={(e) => setEditingPolicy({ ...editingPolicy, mode: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="delete">Delete</option>
                  <option value="archive">Archive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notify Before (days)</label>
                <input type="number" value={editingPolicy?.notify_before_days || 30}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, notify_before_days: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editingPolicy?.is_active !== false}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, is_active: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm">Active</span>
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Save size={18} /> Save
              </button>
              <button onClick={() => { setShowModal(false); setEditingPolicy(null) }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                <X size={18} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
