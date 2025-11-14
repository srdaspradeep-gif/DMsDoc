import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Upload,
  Eye,
  Download,
  Trash2,
  Search,
  X
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
    this.expanded = false
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
  const [expandedPaths, setExpandedPaths] = useState(new Set())
  const [selectedPath, setSelectedPath] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [parentPath, setParentPath] = useState(null) // For creating sub-folders
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    loadFoldersAndDocuments()
  }, [])

  const buildFolderTree = (docs) => {
    const root = new FolderNode('root', '')
    const rootDocs = []

    docs.forEach(doc => {
      if (doc.s3_url) {
        try {
          const url = new URL(doc.s3_url)
          const pathParts = url.pathname.split('/').filter(p => p)
          
          // Path structure: [bucket, user_id, folder_path, filename]
          // Example: /docflow/user_id/Parent/SubFolder/filename.pdf
          // pathParts = ['docflow', 'user_id', 'Parent', 'SubFolder', 'filename.pdf']
          
          if (pathParts.length >= 4) {
            // Everything after user_id and before filename is the folder path
            const folderPathParts = pathParts.slice(2, -1) // Skip bucket, user_id, and filename
            
            if (folderPathParts.length > 0) {
              // Build nested folder structure
              let current = root
              let currentPath = ''
              
              folderPathParts.forEach((folderName, index) => {
                currentPath = currentPath ? `${currentPath}/${folderName}` : folderName
                current = current.addChild(folderName, currentPath)
              })
              
              // Add document to the deepest folder
              current.documents.push(doc)
            } else {
              rootDocs.push(doc)
            }
          } else {
            // Document in root (no folder)
            rootDocs.push(doc)
          }
        } catch (e) {
          console.error('Error parsing URL:', e, doc.s3_url)
          rootDocs.push(doc)
        }
      } else {
        rootDocs.push(doc)
      }
    })

    return { root, rootDocs }
  }

  const loadFoldersAndDocuments = async () => {
    try {
      setLoading(true)
      const response = await api.get('/v2/metadata?limit=99&offset=0')
      const data = response.data
      const docsKey = Object.keys(data).find(key => key.startsWith('documents of '))
      const docs = docsKey ? (data[docsKey] || []) : []
      
      const { root, rootDocs } = buildFolderTree(docs)
      
      setFolderTree(root)
      setDocuments(rootDocs)
      
      // Auto-expand root if it has children
      if (root.children.size > 0) {
        setExpandedPaths(new Set(['root']))
      }
    } catch (error) {
      console.error('Failed to load folders:', error)
      toast.error('Failed to load folders: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  const toggleFolder = (path) => {
    const newExpanded = new Set(expandedPaths)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedPaths(newExpanded)
  }

  const selectFolder = (path) => {
    setSelectedPath(path)
  }

  const getFolderByPath = (node, pathParts, index = 0) => {
    if (index >= pathParts.length) return node
    const child = node.children.get(pathParts[index])
    if (!child) return null
    return getFolderByPath(child, pathParts, index + 1)
  }

  const getDocumentsForPath = (path) => {
    if (!path || path === 'root') {
      return documents
    }
    
    const pathParts = path.split('/')
    const folder = getFolderByPath(folderTree, pathParts)
    return folder ? folder.documents : []
  }

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name')
      return
    }
    
    const trimmedName = newFolderName.trim()
    const fullPath = parentPath ? `${parentPath}/${trimmedName}` : trimmedName
    
    // Check if folder already exists
    const pathParts = fullPath.split('/')
    const existingFolder = getFolderByPath(folderTree, pathParts)
    if (existingFolder) {
      toast.error('Folder already exists')
      return
    }
    
    // Folders are created when documents are uploaded to them
    setSelectedPath(fullPath)
    setShowCreateFolder(false)
    setNewFolderName('')
    setParentPath(null)
    setShowUpload(true)
    toast(`Upload a document to create the folder "${fullPath}"`, { icon: 'ℹ️' })
  }

  const handleCreateSubFolder = (parentPath) => {
    setParentPath(parentPath)
    setShowCreateFolder(true)
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

  const renderFolderTree = (node, level = 0, parentPath = '') => {
    if (node.name === 'root' && node.children.size === 0) {
      return null
    }

    const folders = []
    
    // Render children folders
    Array.from(node.children.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([name, childNode]) => {
        const currentPath = parentPath ? `${parentPath}/${name}` : name
        const isExpanded = expandedPaths.has(currentPath)
        const isSelected = selectedPath === currentPath
        const hasChildren = childNode.children.size > 0
        const docCount = childNode.getDocumentCount()

        folders.push(
          <div key={currentPath} className="select-none">
            <div
              className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                isSelected
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              style={{ paddingLeft: `${(level * 16) + 8}px` }}
            >
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFolder(currentPath)
                  }}
                  className="p-0.5 hover:bg-gray-200 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-gray-500" />
                  ) : (
                    <ChevronRight size={14} className="text-gray-500" />
                  )}
                </button>
              ) : (
                <div className="w-4" /> // Spacer for alignment
              )}
              
              {isExpanded ? (
                <FolderOpen size={16} className="text-blue-600 flex-shrink-0" />
              ) : (
                <Folder size={16} className="text-blue-600 flex-shrink-0" />
              )}
              
              <span
                className="text-sm font-medium flex-1 truncate"
                onClick={() => selectFolder(currentPath)}
              >
                {name}
              </span>
              
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500">{docCount}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCreateSubFolder(currentPath)
                  }}
                  className="p-1 hover:bg-blue-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Create sub-folder"
                >
                  <Plus size={12} className="text-blue-600" />
                </button>
              </div>
            </div>
            
            {/* Render children if expanded */}
            {isExpanded && hasChildren && (
              <div>
                {renderFolderTree(childNode, level + 1, currentPath)}
              </div>
            )}
            
            {/* Show documents in folder when selected */}
            {isSelected && childNode.documents.length > 0 && (
              <div style={{ paddingLeft: `${((level + 1) * 16) + 24}px` }} className="mt-1 space-y-1">
                {childNode.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center space-x-2 p-1.5 rounded hover:bg-gray-50 text-gray-600"
                  >
                    <FileText size={12} />
                    <span className="text-xs truncate flex-1">{doc.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })

    return folders
  }

  const filteredDocuments = getDocumentsForPath(selectedPath).filter(doc =>
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
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Folder View</h1>
            <p className="text-sm text-gray-600 mt-1">
              {folderTree.getDocumentCount()} documents in folders • {documents.length} in root
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setParentPath(null)
                setShowCreateFolder(true)
              }}
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

        {/* Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search folders and documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 min-h-0">
        {/* Folder Tree */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 p-4 overflow-y-auto">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <Folder size={20} />
            <span>Folders</span>
          </h2>
          
          {/* Root/Home indicator */}
          <div
            onClick={() => selectFolder('root')}
            className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer mb-2 ${
              selectedPath === 'root' || selectedPath === null
                ? 'bg-blue-100 text-blue-700'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <Folder size={18} />
            <span className="text-sm font-medium">Home (Root)</span>
            <span className="ml-auto text-xs text-gray-500">({documents.length})</span>
          </div>

          {/* Folder Tree */}
          <div className="space-y-1">
            {folderTree.children.size === 0 ? (
              <div className="text-center py-8">
                <Folder className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-sm text-gray-500">No folders yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Create a folder and upload documents to it
                </p>
              </div>
            ) : (
              renderFolderTree(folderTree, 0, '')
            )}
          </div>
        </div>

        {/* Documents View */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4 md:p-6 overflow-y-auto">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-900 mb-1">
              {selectedPath && selectedPath !== 'root' 
                ? `Documents in "${selectedPath}"` 
                : 'Documents in Root'}
            </h2>
            <p className="text-sm text-gray-600">
              {filteredDocuments.length} {filteredDocuments.length === 1 ? 'document' : 'documents'}
            </p>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'No documents match your search' : 'No documents in this location'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Upload Document
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                        <FileText className="text-blue-600" size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate" title={doc.name}>
                          {doc.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(doc.created_at), 'MMM dd, yyyy')} • {(doc.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {doc.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/documents/${doc.id}`}
                      className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                    >
                      <Eye size={14} />
                      <span>View</span>
                    </Link>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc.name)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {parentPath ? `Create Sub-folder in "${parentPath}"` : 'Create New Folder'}
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
                {parentPath && <span className="block mt-1">Full path: <strong>{parentPath}/{newFolderName || '...'}</strong></span>}
              </p>
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateFolder(false)
                  setNewFolderName('')
                  setParentPath(null)
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
            setTimeout(() => {
              loadFoldersAndDocuments()
            }, 1000)
          }}
          onSuccess={() => {
            setShowUpload(false)
            setTimeout(() => {
              console.log('Reloading folders after upload...')
              loadFoldersAndDocuments()
            }, 1500)
          }}
          defaultFolder={selectedPath && selectedPath !== 'root' ? selectedPath : undefined}
        />
      )}
    </div>
  )
}
