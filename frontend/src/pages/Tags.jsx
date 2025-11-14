import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Tag, Plus, Edit2, Trash2, Search } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Tags() {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#16a34a')

  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    try {
      // Get all documents to extract unique tags
      const response = await api.get('/v2/metadata?limit=100&offset=0')
      const data = response.data
      // Find the key that starts with "documents of "
      const docsKey = Object.keys(data).find(key => key.startsWith('documents of '))
      const docs = docsKey ? data[docsKey] || [] : []
      const allTags = [...new Set(docs.flatMap(doc => doc.tags || []))]
      setTags(allTags.map(tag => ({ name: tag, count: docs.filter(d => d.tags && d.tags.includes(tag)).length })))
    } catch (error) {
      toast.error('Failed to load tags')
    } finally {
      setLoading(false)
    }
  }

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Tags</h1>
            <p className="text-sm text-gray-600 mt-1">{tags.length} tags</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {filteredTags.map((tag) => (
          <div key={tag.name} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Tag className="text-blue-600" size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{tag.name}</h3>
                  <p className="text-sm text-gray-500">{tag.count} documents</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTags.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Tag className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500">No tags found</p>
        </div>
      )}
    </div>
  )
}

