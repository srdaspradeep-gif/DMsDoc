import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { List, Plus, Edit2, Trash2, Save, X, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function Metadata() {
  const { user } = useAuth()
  const [definitions, setDefinitions] = useState([])
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingDef, setEditingDef] = useState(null)

  const accountId = user?.default_account_id || user?.accounts?.[0]?.id

  useEffect(() => {
    if (accountId) {
      loadData()
    }
  }, [accountId])

  const loadData = async () => {
    try {
      const [defsRes, sectionsRes] = await Promise.all([
        api.get('/v2/dms/metadata-dms/definitions', { headers: { 'X-Account-Id': accountId } }),
        api.get('/v2/dms/sections', { headers: { 'X-Account-Id': accountId } })
      ])
      setDefinitions(defsRes.data)
      setSections(sectionsRes.data)
    } catch (error) {
      toast.error('Failed to load metadata definitions')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingDef({
      name: '', key: '', field_type: 'text', description: '',
      is_required: false, is_searchable: true, section_id: null, account_id: accountId
    })
    setShowModal(true)
  }

  const handleEdit = (def) => {
    setEditingDef({ ...def })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (editingDef.id) {
        await api.patch(`/v2/dms/metadata-dms/definitions/${editingDef.id}`, editingDef, {
          headers: { 'X-Account-Id': accountId }
        })
        toast.success('Definition updated')
      } else {
        await api.post('/v2/dms/metadata-dms/definitions', editingDef, {
          headers: { 'X-Account-Id': accountId }
        })
        toast.success('Definition created')
      }
      setShowModal(false)
      setEditingDef(null)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save')
    }
  }


  const handleDelete = async (id) => {
    if (!confirm('Delete this metadata definition?')) return
    try {
      await api.delete(`/v2/dms/metadata-dms/definitions/${id}`, {
        headers: { 'X-Account-Id': accountId }
      })
      toast.success('Definition deleted')
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete')
    }
  }

  const filteredDefs = definitions.filter(d =>
    d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.key?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const fieldTypes = ['text', 'number', 'date', 'boolean', 'select', 'multiselect']

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
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Metadata Definitions</h1>
          <p className="text-sm text-gray-600 mt-1">Define custom metadata fields for files</p>
        </div>
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={20} />
          <span className="hidden sm:inline">New Field</span>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Search definitions..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Section</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDefs.map((def) => (
                <tr key={def.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <List className="text-blue-600 mr-3" size={20} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{def.name}</div>
                        {def.is_required && <span className="text-xs text-red-600">Required</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell"><code className="text-sm text-gray-600">{def.key}</code></td>
                  <td className="px-6 py-4 hidden md:table-cell"><span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">{def.field_type}</span></td>
                  <td className="px-6 py-4 hidden lg:table-cell text-sm text-gray-600">{sections.find(s => s.id === def.section_id)?.name || 'All'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(def)} className="text-gray-600 hover:text-gray-800"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(def.id)} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredDefs.length === 0 && (
          <div className="text-center py-12">
            <List className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">No metadata definitions found</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">{editingDef?.id ? 'Edit' : 'Create'} Metadata Field</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={editingDef?.name || ''} onChange={(e) => setEditingDef({ ...editingDef, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
                <input type="text" value={editingDef?.key || ''} onChange={(e) => setEditingDef({ ...editingDef, key: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. department" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={editingDef?.field_type || 'text'} onChange={(e) => setEditingDef({ ...editingDef, field_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                  {fieldTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section (optional)</label>
                <select value={editingDef?.section_id || ''} onChange={(e) => setEditingDef({ ...editingDef, section_id: e.target.value || null })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">All Sections</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={editingDef?.description || ''} onChange={(e) => setEditingDef({ ...editingDef, description: e.target.value })}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editingDef?.is_required || false} onChange={(e) => setEditingDef({ ...editingDef, is_required: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm">Required</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editingDef?.is_searchable !== false} onChange={(e) => setEditingDef({ ...editingDef, is_searchable: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm">Searchable</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Save size={18} /> Save
              </button>
              <button onClick={() => { setShowModal(false); setEditingDef(null) }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                <X size={18} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
