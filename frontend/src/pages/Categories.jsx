import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { FolderTree, Search, Plus, Edit2, Trash2, FileText, Eye, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [documentsWithCategory, setDocumentsWithCategory] = useState([])
  const [showDocuments, setShowDocuments] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      // Get all documents to extract unique categories
      const response = await api.get('/v2/metadata?limit=99&offset=0')
      const data = response.data
      console.log('Categories API Response:', data) // Debug log
      
      // Find the key that starts with "documents of "
      const docsKey = Object.keys(data).find(key => key.startsWith('documents of '))
      console.log('Categories - Found docsKey:', docsKey) // Debug log
      const docs = docsKey ? (data[docsKey] || []) : []
      console.log('Categories - Documents array:', docs) // Debug log
      
      // Extract all unique categories and count usage
      const categoryMap = new Map()
      
      docs.forEach(doc => {
        if (doc.categories && Array.isArray(doc.categories) && doc.categories.length > 0) {
          doc.categories.forEach(category => {
            if (category && category.trim()) {
              if (!categoryMap.has(category)) {
                categoryMap.set(category, {
                  name: category,
                  documentCount: 0,
                  documents: []
                })
              }
              const cat = categoryMap.get(category)
              cat.documentCount++
              cat.documents.push({
                id: doc.id,
                name: doc.name,
                created_at: doc.created_at
              })
            }
          })
        }
      })
      
      // Convert to array and sort by document count (descending)
      const categoriesList = Array.from(categoryMap.values())
        .sort((a, b) => b.documentCount - a.documentCount)
      
      setCategories(categoriesList)
    } catch (error) {
      console.error('Categories load error:', error) // Debug log
      toast.error('Failed to load categories: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name')
      return
    }
    
    // Check if category already exists
    if (categories.some(cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      toast.error('Category already exists')
      return
    }
    
    // Category will be created when documents are assigned to it
    toast.success('Category will be created when you assign it to a document')
    setShowCreateModal(false)
    setNewCategoryName('')
  }

  const handleViewDocuments = (category) => {
    setSelectedCategory(category)
    setDocumentsWithCategory(category.documents)
    setShowDocuments(true)
  }

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (showDocuments && selectedCategory) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-4 md:mb-6">
          <button
            onClick={() => {
              setShowDocuments(false)
              setSelectedCategory(null)
              setDocumentsWithCategory([])
            }}
            className="mb-4 text-blue-600 hover:text-blue-700 flex items-center space-x-2"
          >
            <ArrowLeft size={20} />
            <span>Back to Categories</span>
          </button>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
            Documents in "{selectedCategory.name}"
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {documentsWithCategory.length} {documentsWithCategory.length === 1 ? 'document' : 'documents'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:gap-4">
          {documentsWithCategory.map((doc) => (
            <Link
              key={doc.id}
              to={`/documents/${doc.id}`}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <FileText className="text-blue-600" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{doc.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Eye className="text-gray-400 flex-shrink-0" size={20} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Categories</h1>
            <p className="text-sm text-gray-600 mt-1">
              {categories.length} {categories.length === 1 ? 'category' : 'categories'} defined
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">New Category</span>
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FolderTree className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 mb-4">No categories found</p>
          <p className="text-sm text-gray-400 mb-4">
            Categories are created automatically when you assign them to documents during upload
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create First Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filteredCategories.map((category) => (
            <div key={category.name} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                    <FolderTree className="text-purple-600" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{category.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {category.documentCount} {category.documentCount === 1 ? 'document' : 'documents'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleViewDocuments(category)}
                className="w-full mt-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
              >
                <Eye size={16} />
                <span>View Documents</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {filteredCategories.length === 0 && categories.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Search className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500">No categories match your search</p>
        </div>
      )}

      {/* Create Category Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Category</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Name
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Finance, Legal, HR"
                className="input-field"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
              />
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewCategoryName('')
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                className="btn-primary"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

