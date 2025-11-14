import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronRight,
  Upload,
  Eye,
  Download,
  Trash2,
  Search,
  X,
  Home,
  Plus,
  Grid,
  List as ListIcon
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import UploadModal from '../components/UploadModal'

// Tree node structure for nested folders
class FolderNode {
  constructor(name, path = '') {
    this.name = name
    this.path = path || name
    this.children = new Map()
    this.documents = []
  }

  addChild(name, path) {
    if (!this.children.has(name)) {
      this.children.set(name, new FolderNode(name, path))
    }
    return this.children.get(name)
  }

  getDocumentCount() {
    return this.documents.length + Array.from(this.children.values())
      .reduce((sum, child) => sum + child.getDocumentCount(), 0)
  }
}

export default function FolderView() {
  const [folderTree, setFolderTree] = useState(new FolderNode('root', ''))
  const [documents, setDocuments] = useState([])
  const [currentPath, setCurrentPath] = useState([]) // Breadcrumb path
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'

  useEffect(() => {
    loadFoldersAndDocuments()
  }, [])

  const buildFolderTree = (docs) => {
    const root = new FolderNode('root', '')
    const rootDocs = []

    console.log('Building folder tree from', docs.length, 'documents')

    docs.forEach((doc, index) => {
      if (doc.s3_url) {
        try {
          const url = new URL(doc.s3_url)
          const pathParts = url.pathname.split('/').filter(p => p)
          
          console.log(`Doc ${index + 1} (${doc.name}):`)
          console.log('  s3_url:', doc.s3_url)
          console.log('  pathParts:', pathParts, 'length:', pathParts.length)
          
          // Path structure: [bucket, user_id, folder_path, filename]
          // Example: /docflow/user_id/Parent/SubFolder/filename.pdf
          // pathParts = ['docflow', 'user_id', 'Parent', 'SubFolder', 'filename.pdf']
          if (pathParts.length >= 4) {
            const folderPathParts = pathParts.slice(2, -1) // Skip bucket, user_id, and filename
            console.log('  folderPathParts:', folderPathParts)
            
            if (folderPathParts.length > 0) {
              // Build nested folder structure
              let current = root
              let currentPath = ''
              
              folderPathParts.forEach((folderName, idx) => {
                currentPath = currentPath ? `${currentPath}/${folderName}` : folderName
                console.log(`    Level ${idx}: Adding "${folderName}" (path: "${currentPath}")`)
                current = current.addChild(folderName, currentPath)
              })
              
              // Add document to the deepest folder
              current.documents.push(doc)
              console.log(`  ✅ Added to folder: "${currentPath}"`)
            } else {
              console.log('  📁 In root (no folder parts)')
              rootDocs.push(doc)
            }
          } else {
            console.log('  📁 In root (pathParts.length < 4)')
            rootDocs.push(doc)
          }
        } catch (e) {
          console.error('  ❌ Error parsing URL:', e, doc.s3_url)
          rootDocs.push(doc)
        }
      } else {
        console.log(`Doc ${index + 1} (${doc.name}): No s3_url`)
        rootDocs.push(doc)
      }
    })

    console.log('Tree building complete:')
    console.log('  Root children:', root.children.size)
    console.log('  Root documents:', rootDocs.length)

    return { root, rootDocs }
  }

  const loadFoldersAndDocuments = async () => {
    try {
      setLoading(true)
      console.log('Loading folders and documents...')
      const response = await api.get('/v2/metadata?limit=99&offset=0')
      const data = response.data
      console.log('API Response:', data)
      
      const docsKey = Object.keys(data).find(key => key.startsWith('documents of '))
      console.log('Found docsKey:', docsKey)
      const docs = docsKey ? (data[docsKey] || []) : []
      console.log('Total documents loaded:', docs.length)
      
      if (docs.length === 0) {
        console.log('No documents found')
        setFolderTree(new FolderNode('root', ''))
        setDocuments([])
        return
      }
      
      // Log first few documents for debugging
      docs.slice(0, 3).forEach((doc, idx) => {
        console.log(`Document ${idx + 1}:`, {
          name: doc.name,
          s3_url: doc.s3_url,
          id: doc.id
        })
      })
      
      const { root, rootDocs } = buildFolderTree(docs)
      
      console.log('Folder tree built:')
      console.log('  Root children:', root.children.size)
      console.log('  Root documents:', rootDocs.length)
      
      // Log all folder paths
      const logFolders = (node, prefix = '') => {
        node.children.forEach((child, name) => {
          console.log(`${prefix}📁 ${name} (${child.documents.length} docs, ${child.children.size} sub-folders)`)
          logFolders(child, prefix + '  ')
        })
      }
      logFolders(root)
      
      setFolderTree(root)
      setDocuments(rootDocs)
      
      console.log('State updated - folders:', root.children.size, 'root docs:', rootDocs.length)
    } catch (error) {
      console.error('Failed to load folders:', error)
      toast.error('Failed to load folders: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  // Get current folder node based on breadcrumb path
  const getCurrentFolder = () => {
    let current = folderTree
    for (const folderName of currentPath) {
      if (current.children.has(folderName)) {
        current = current.children.get(folderName)
      } else {
        return null
      }
    }
    return current
  }

  // Navigate into a folder
  const navigateToFolder = (folderName) => {
    setCurrentPath([...currentPath, folderName])
  }

  // Navigate to a specific path
  const navigateToPath = (pathArray) => {
    setCurrentPath(pathArray)
  }

  // Get current folder's children and documents
  const getCurrentContent = () => {
    const current = getCurrentFolder()
    if (!current) {
      // We're at root
      const folders = Array.from(folderTree.children.values())
      console.log('getCurrentContent (root):', {
        folders: folders.length,
        documents: documents.length,
        folderNames: folders.map(f => f.name)
      })
      return {
        folders: folders,
        documents: documents
      }
    }
    const folders = Array.from(current.children.values())
    console.log('getCurrentContent (folder):', {
      path: currentPath.join('/'),
      folders: folders.length,
      documents: current.documents.length,
      folderNames: folders.map(f => f.name)
    })
    return {
      folders: folders,
      documents: current.documents
    }
  }

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name')
      return
    }
    
    const trimmedName = newFolderName.trim()
    const current = getCurrentFolder()
    const fullPath = currentPath.length > 0 
      ? `${currentPath.join('/')}/${trimmedName}` 
      : trimmedName
    
    // Check if folder already exists
    if (current) {
      if (current.children.has(trimmedName)) {
        toast.error('Folder already exists')
        return
      }
    } else {
      if (folderTree.children.has(trimmedName)) {
        toast.error('Folder already exists')
        return
      }
    }
    
    // Folders are created when documents are uploaded to them
    setShowCreateFolder(false)
    setNewFolderName('')
    setShowUpload(true)
    // Store the folder path to use in upload
    sessionStorage.setItem('pendingFolder', fullPath)
    toast(`Upload a document to create the folder "${fullPath}"`, { icon: 'ℹ️' })
  }

  const handleDeleteDocument = async (docName) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      await api.delete(`/v2/${docName}`)
      toast.success('Document moved to trash')
      loadFoldersAndDocuments()
    } catch (error) {
      toast.error('Failed to delete document')
    }
  }

  const handleDownload = async (doc) => {
    try {
      const response = await api.get(`/v2/file/${doc.name}/download`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', doc.name)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Download started')
    } catch (error) {
      toast.error('Failed to download document')
    }
  }

  const { folders, documents: currentDocs } = getCurrentContent()

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredDocuments = currentDocs.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Folders</h1>
            <p className="text-sm text-gray-600 mt-1">
              {folders.length} {folders.length === 1 ? 'folder' : 'folders'} • {currentDocs.length} {currentDocs.length === 1 ? 'document' : 'documents'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCreateFolder(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>New Folder</span>
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Upload size={18} />
              <span>Upload</span>
            </button>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
          <div className="flex items-center space-x-2 flex-wrap">
            <button
              onClick={() => navigateToPath([])}
              className="flex items-center space-x-1 text-gray-600 hover:text-blue-600"
            >
              <Home size={16} />
              <span className="text-sm font-medium">My Home</span>
            </button>
            {currentPath.map((folderName, index) => (
              <div key={index} className="flex items-center space-x-2">
                <ChevronRight size={16} className="text-gray-400" />
                <button
                  onClick={() => navigateToPath(currentPath.slice(0, index + 1))}
                  className="text-sm font-medium text-gray-600 hover:text-blue-600"
                >
                  {folderName}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Search and View Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Quick search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Grid view"
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                title="List view"
              >
                <ListIcon size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {filteredFolders.length === 0 && filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Folder className="mx-auto text-gray-400 mb-4" size={64} />
            <p className="text-gray-500 mb-2 text-lg">This folder is empty</p>
            <p className="text-sm text-gray-400 mb-4">
              {searchQuery ? 'No items match your search' : 'Create a folder or upload a document to get started'}
            </p>
            {!searchQuery && (
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => setShowCreateFolder(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  New Folder
                </button>
                <button
                  onClick={() => setShowUpload(true)}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                >
                  Upload Document
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4' : 'space-y-2'}>
            {/* Folders */}
            {filteredFolders.map((folder) => (
              <div
                key={folder.path}
                onClick={() => navigateToFolder(folder.name)}
                className={`bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'p-6 text-center' : 'p-4 flex items-center space-x-4'
                }`}
              >
                {viewMode === 'grid' ? (
                  <>
                    <div className="mb-3 flex justify-center">
                      <div className="p-4 bg-yellow-100 rounded-lg">
                        <Folder size={48} className="text-yellow-600" />
                      </div>
                    </div>
                    <h3 className="font-medium text-gray-900 truncate" title={folder.name}>
                      {folder.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {folder.getDocumentCount()} {folder.getDocumentCount() === 1 ? 'item' : 'items'}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <Folder size={24} className="text-yellow-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate" title={folder.name}>
                        {folder.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {folder.getDocumentCount()} {folder.getDocumentCount() === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </>
                )}
              </div>
            ))}

            {/* Documents */}
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all ${
                  viewMode === 'grid' ? 'p-6 text-center' : 'p-4 flex items-center space-x-4'
                }`}
              >
                {viewMode === 'grid' ? (
                  <>
                    <div className="mb-3 flex justify-center">
                      <div className="p-4 bg-blue-100 rounded-lg">
                        <FileText size={48} className="text-blue-600" />
                      </div>
                    </div>
                    <h3 className="font-medium text-gray-900 truncate text-sm mb-1" title={doc.name}>
                      {doc.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {(doc.size / 1024).toFixed(1)} KB
                    </p>
                    <div className="mt-2 flex items-center justify-center space-x-1">
                      <Link
                        to={`/documents/${doc.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                        title="View"
                      >
                        <Eye size={14} />
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(doc)
                        }}
                        className="p-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteDocument(doc.name)
                        }}
                        className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FileText size={24} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate" title={doc.name}>
                        {doc.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {format(new Date(doc.created_at), 'MMM dd, yyyy')} • {(doc.size / 1024).toFixed(1)} KB
                      </p>
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {doc.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/documents/${doc.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        View
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(doc)
                        }}
                        className="p-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteDocument(doc.name)
                        }}
                        className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {currentPath.length > 0 
                ? `Create Folder in "${currentPath.join(' / ')}"` 
                : 'Create New Folder'}
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder Name
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g., Project Documents, 2025 Plans"
                className="input-field"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                Folders are created automatically when you upload documents to them.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateFolder(false)
                  setNewFolderName('')
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="btn-primary"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          onClose={() => {
            setShowUpload(false)
            sessionStorage.removeItem('pendingFolder')
            setTimeout(() => {
              loadFoldersAndDocuments()
            }, 1000)
          }}
          onSuccess={() => {
            setShowUpload(false)
            sessionStorage.removeItem('pendingFolder')
            setTimeout(() => {
              loadFoldersAndDocuments()
            }, 1500)
          }}
          defaultFolder={sessionStorage.getItem('pendingFolder') || (currentPath.length > 0 ? currentPath.join('/') : undefined)}
        />
      )}
    </div>
  )
}

