import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Users, Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Correspondents() {
  const [correspondents, setCorrespondents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadCorrespondents()
  }, [])

  const loadCorrespondents = async () => {
    try {
      // Get all documents and extract unique owners/correspondents
      const response = await api.get('/v2/metadata?limit=100&offset=0')
      const data = response.data
      // Find the key that starts with "documents of "
      const docsKey = Object.keys(data).find(key => key.startsWith('documents of '))
      const docs = docsKey ? data[docsKey] || [] : []
      
      // Group by owner_id to get correspondents
      const correspondentMap = new Map()
      docs.forEach(doc => {
        if (doc.owner_id) {
          if (!correspondentMap.has(doc.owner_id)) {
            correspondentMap.set(doc.owner_id, {
              id: doc.owner_id,
              name: doc.owner_id, // You might want to fetch user details
              documentCount: 0
            })
          }
          correspondentMap.get(doc.owner_id).documentCount++
        }
      })
      
      setCorrespondents(Array.from(correspondentMap.values()))
    } catch (error) {
      toast.error('Failed to load correspondents')
    } finally {
      setLoading(false)
    }
  }

  const filteredCorrespondents = correspondents.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
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
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Correspondents</h1>
            <p className="text-sm text-gray-600 mt-1">{correspondents.length} correspondents</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search correspondents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {filteredCorrespondents.map((correspondent) => (
          <div key={correspondent.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="text-blue-600" size={20} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{correspondent.name}</h3>
                <p className="text-sm text-gray-500">{correspondent.documentCount} documents</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCorrespondents.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500">No correspondents found</p>
        </div>
      )}
    </div>
  )
}

