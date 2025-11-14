import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { FileText, Upload, Clock, Eye, TrendingUp, Archive } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    recent: [],
    thisWeek: 0,
    thisMonth: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const response = await api.get('/v2/metadata?limit=10&offset=0')
      const data = response.data
      // Find the key that starts with "documents of "
      const docsKey = Object.keys(data).find(key => key.startsWith('documents of '))
      const docs = docsKey ? data[docsKey] || [] : []
      
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      setStats({
        total: data['no_of_docs'] || 0,
        recent: docs,
        thisWeek: docs.filter(d => new Date(d.created_at) >= weekAgo).length,
        thisMonth: docs.filter(d => new Date(d.created_at) >= monthAgo).length,
      })
    } catch (error) {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Overview of your documents</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 truncate">Total Documents</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1 md:mt-2">{stats.total}</p>
            </div>
            <div className="p-2 md:p-3 bg-blue-100 rounded-lg flex-shrink-0 ml-2">
              <FileText className="text-blue-600 md:w-6 md:h-6" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 truncate">This Week</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1 md:mt-2">{stats.thisWeek}</p>
            </div>
            <div className="p-2 md:p-3 bg-blue-100 rounded-lg flex-shrink-0 ml-2">
              <TrendingUp className="text-blue-600 md:w-6 md:h-6" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 truncate">This Month</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1 md:mt-2">{stats.thisMonth}</p>
            </div>
            <div className="p-2 md:p-3 bg-purple-100 rounded-lg flex-shrink-0 ml-2">
              <Archive className="text-purple-600 md:w-6 md:h-6" size={20} />
            </div>
          </div>
        </div>

        <Link to="/documents" className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 truncate">View All</p>
              <p className="text-base md:text-lg font-semibold text-blue-600 mt-1 md:mt-2 truncate">Documents →</p>
            </div>
            <div className="p-2 md:p-3 bg-gray-100 rounded-lg flex-shrink-0 ml-2">
              <Eye className="text-gray-600 md:w-6 md:h-6" size={20} />
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">Recent Documents</h2>
            <Link to="/documents" className="text-xs md:text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all
            </Link>
          </div>
        </div>

        {stats.recent.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <FileText className="mx-auto text-gray-400 mb-4 md:w-12 md:h-12" size={40} />
            <p className="text-gray-500 mb-4 text-sm md:text-base">No documents yet</p>
            <Link to="/documents?upload=true" className="inline-block bg-blue-600 text-white px-4 md:px-6 py-2 rounded-lg hover:bg-blue-700 text-sm md:text-base">
              Upload your first document
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {stats.recent.map((doc) => (
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                className="block p-3 md:p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
                    <div className="w-10 h-12 md:w-12 md:h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                      <FileText className="text-gray-400 md:w-5 md:h-5" size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate text-sm md:text-base">{doc.name}</h3>
                      <div className="flex items-center space-x-2 md:space-x-4 mt-1 text-xs md:text-sm text-gray-500">
                        <span className="truncate">{format(new Date(doc.created_at), 'MMM dd, yyyy')}</span>
                        {doc.size && <span className="hidden sm:inline">{(doc.size / 1024).toFixed(1)} KB</span>}
                      </div>
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {doc.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full truncate max-w-[100px]"
                            >
                              {tag}
                            </span>
                          ))}
                          {doc.tags.length > 2 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{doc.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm text-gray-500 flex-shrink-0">
                    <Clock className="md:w-4 md:h-4" size={14} />
                    <span className="hidden sm:inline">{format(new Date(doc.created_at), 'HH:mm')}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
