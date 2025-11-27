import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { FolderTree, Plus, Edit2, Trash2, Save, X, Search, Folder } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function Sections() {
  const { user } = useAuth()
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingSection, setEditingSection] = useState(null)

  const accountId = user?.default_account_id || user?.accounts?.[0]?.id

  useEffect(() => {
    if (accountId) {
      loadSections()
    }
  }, [accountId])

  const loadSections = async () => {
    try {
      const response = await api.get('/v2/dms/sections', {
        headers: { 'X-Account-Id': accountId }
      })
      setSections(response.data)
    } catch (error) {
      toast.error('Failed to load sections')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSection = () => {
    setEditingSection({ name: '', description: '', account_id: accountId })
    setShowModal(true)
  }

  const handleEditSection = (section) => {
    setEditingSection({ ...section })
    setShowModal(true)
  }

  const handleSaveSection = async () => {
    try {
      if (editingSection.id) {
        await api.patch(`/v2/dms/sections/${editingSection.id}`, {
          name: editingSection.name,
          description: editingSection.description
        }, { headers: { 'X-Account-Id': accountId } })
        toast.success('Section updated')
      } else {
        await api.post('/v2/dms/sections', editingSection, {
          headers: { 'X-Account-Id': accountId }
        })
        toast.success('Section created')
      }
      setShowModal(false)
      setEditingSection(null)
      loadSections()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save section')
    }
  }


  const handleDeleteSection = async (sectionId) => {
    if (!confirm('Delete this section? All folders and files inside will be deleted.')) return
    try {
      await api.delete(`/v2/dms/sections/${sectionId}`, {
        headers: { 'X-Account-Id': accountId }
      })
      toast.success('Section deleted')
      loadSections()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete section')
    }
  }

  const filteredSections = sections.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Sections</h1>
          <p className="text-sm text-gray-600 mt-1">Top-level document sections</p>
        </div>
        <button
          onClick={handleCreateSection}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">New Section</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search sections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSections.map((section) => (
          <div key={section.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <FolderTree className="text-blue-600" size={24} />
                <div>
                  <Link to={`/storage-paths?section=${section.id}`} className="text-lg font-medium text-gray-900 hover:text-blue-600">
                    {section.name}
                  </Link>
                  {section.description && (
                    <p className="text-sm text-gray-500">{section.description}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{section.folder_count || 0} folders</span>
              <div className="flex gap-2">
                <button onClick={() => handleEditSection(section)} className="text-gray-600 hover:text-gray-800">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDeleteSection(section.id)} className="text-red-600 hover:text-red-800">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSections.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FolderTree className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500">No sections found</p>
          <button onClick={handleCreateSection} className="mt-4 text-blue-600 hover:text-blue-800">
            Create your first section
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">
              {editingSection?.id ? 'Edit Section' : 'Create Section'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingSection?.name || ''}
                  onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingSection?.description || ''}
                  onChange={(e) => setEditingSection({ ...editingSection, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleSaveSection} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Save size={18} /> Save
              </button>
              <button onClick={() => { setShowModal(false); setEditingSection(null) }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                <X size={18} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
