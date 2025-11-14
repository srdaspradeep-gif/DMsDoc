import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { api } from '../services/api'
import { Upload, X, File, Loader, Folder, FolderPlus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function UploadModal({ onClose, onSuccess, defaultFolder = null }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [tags, setTags] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [folder, setFolder] = useState(defaultFolder || '')
  const [folders, setFolders] = useState([])
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [customMetadata, setCustomMetadata] = useState({})
  const [newMetadataKey, setNewMetadataKey] = useState('')
  const [newMetadataValue, setNewMetadataValue] = useState('')

  useEffect(() => {
    loadCategoriesAndFolders()
  }, [])

  useEffect(() => {
    // Set default folder if provided (separate effect to handle updates)
    if (defaultFolder) {
      console.log('Setting default folder in UploadModal:', defaultFolder)
      setFolder(defaultFolder)
      // Also add to folders list if it doesn't exist
      setFolders(prev => {
        if (!prev.includes(defaultFolder)) {
          return [...prev, defaultFolder].sort()
        }
        return prev
      })
    }
  }, [defaultFolder])

  const loadCategoriesAndFolders = async () => {
    try {
      // Load existing categories and folders from documents
      const response = await api.get('/v2/metadata?limit=99&offset=0')
      const data = response.data
      const docsKey = Object.keys(data).find(key => key.startsWith('documents of '))
      const docs = docsKey ? (data[docsKey] || []) : []
      
      // Extract unique categories
      const uniqueCategories = [...new Set(docs.flatMap(doc => doc.categories || []).filter(Boolean))]
      setCategories(uniqueCategories.sort())
      
      // Extract unique folders (from s3_url path structure)
      // s3_url format: http://minio:9000/docflow/user_id/folder/filename.pdf
      // URL structure: {endpoint}/{bucket}/{user_id}/{folder}/{filename}
      // After parsing: pathParts = [bucket, user_id, folder, filename]
      const uniqueFolders = [...new Set(docs.map(doc => {
        if (doc.s3_url) {
          try {
            const url = new URL(doc.s3_url)
            const pathParts = url.pathname.split('/').filter(p => p) // Remove empty strings
            console.log('Folder extraction - s3_url:', doc.s3_url, 'pathParts:', pathParts) // Debug
            // Path structure: [bucket, user_id, ...folder_path..., filename]
            // If there are 4+ parts, everything between user_id and filename is the folder path
            if (pathParts.length >= 4) {
              // pathParts[0] = bucket, pathParts[1] = user_id, pathParts[2..-2] = folder path, pathParts[-1] = filename
              const folderPathParts = pathParts.slice(2, -1) // Skip bucket, user_id, and filename
              if (folderPathParts.length > 0) {
                // Join folder path parts with '/' to get full nested path
                const folderPath = folderPathParts.join('/')
                console.log('Extracted folder path:', folderPath) // Debug
                return folderPath
              }
            }
          } catch (e) {
            console.error('Error parsing URL:', e, doc.s3_url) // Debug
            // Fallback: try simple split if URL parsing fails
            const parts = doc.s3_url.split('/').filter(p => p && !p.includes(':'))
            // parts should be: [bucket, user_id, ...folder_path..., filename]
            if (parts.length >= 4) {
              const folderPathParts = parts.slice(2, -1) // Skip bucket, user_id, and filename
              if (folderPathParts.length > 0) {
                return folderPathParts.join('/')
              }
            }
          }
        }
        return null
      }).filter(Boolean))]
      console.log('All extracted folders:', uniqueFolders) // Debug
      setFolders(uniqueFolders.sort())
    } catch (error) {
      console.error('Failed to load categories and folders:', error)
    }
  }

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9)
    }))])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  })

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const addCustomMetadata = () => {
    if (newMetadataKey && newMetadataValue) {
      setCustomMetadata(prev => ({
        ...prev,
        [newMetadataKey]: newMetadataValue
      }))
      setNewMetadataKey('')
      setNewMetadataValue('')
    }
  }

  const removeCustomMetadata = (key) => {
    setCustomMetadata(prev => {
      const newMeta = { ...prev }
      delete newMeta[key]
      return newMeta
    })
  }

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name')
      return
    }
    
    const trimmedCategory = newCategoryName.trim()
    if (categories.includes(trimmedCategory)) {
      toast.error('Category already exists')
      return
    }
    
    setCategories([...categories, trimmedCategory].sort())
    setCategory(trimmedCategory)
    setNewCategoryName('')
    setShowNewCategory(false)
    toast.success('Category added')
  }

  const handleAddFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name')
      return
    }
    
    const trimmedFolder = newFolderName.trim()
    // If a folder is already selected, create a sub-folder
    const fullPath = folder ? `${folder}/${trimmedFolder}` : trimmedFolder
    
    if (folders.includes(fullPath)) {
      toast.error('Folder already exists')
      return
    }
    
    setFolders([...folders, fullPath].sort())
    setFolder(fullPath)
    setNewFolderName('')
    setShowNewFolder(false)
    toast.success(`Folder "${fullPath}" will be created when you upload`)
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file')
      return
    }

    if (!category || !category.trim()) {
      toast.error('Please select or create a category. Categories are required for standardization.')
      return
    }

    setUploading(true)
    const formData = new FormData()
    
    files.forEach(({ file }) => {
      formData.append('files', file)
    })

    // Add folder if specified
    if (folder && folder.trim()) {
      formData.append('folder', folder.trim())
      console.log('Uploading to folder:', folder.trim())
    } else {
      console.log('Uploading to root (no folder)')
    }

    try {
      const response = await api.post('/v2/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      // Update metadata with tags, category, and custom metadata
      const uploadedDocs = Array.isArray(response.data) ? response.data : [response.data]
      for (const doc of uploadedDocs) {
        const updateData = {}
        
        // Category is required
        if (category) {
          updateData.categories = [category.trim()]
        }
        
        if (tags) {
          updateData.tags = tags.split(',').map(t => t.trim()).filter(Boolean)
        }
        
        if (Object.keys(customMetadata).length > 0) {
          updateData.custom_metadata = customMetadata
        }
        
        if (Object.keys(updateData).length > 0) {
          await api.put(`/v2/metadata/${doc.name}`, updateData)
        }
      }

      toast.success(`Successfully uploaded ${files.length} file(s)${folder ? ` to folder "${folder}"` : ''}`)
      console.log('Upload successful, response:', response.data)
      onSuccess()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Upload Documents</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 mb-2">
              {isDragActive
                ? 'Drop files here'
                : 'Drag & drop files here, or click to select'}
            </p>
            <p className="text-sm text-gray-500">Supports multiple files</p>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Selected Files ({files.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {files.map(({ file, id }) => (
                  <div
                    key={id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <File size={20} className="text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-2">
              <select
                value={category}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setShowNewCategory(true)
                    setCategory('')
                  } else {
                    setCategory(e.target.value)
                    setShowNewCategory(false)
                  }
                }}
                className="input-field flex-1"
                required
              >
                <option value="">Select a category...</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__new__">+ Create New Category</option>
              </select>
            </div>
            {showNewCategory && (
              <div className="mt-2 flex space-x-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className="input-field flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <button
                  onClick={handleAddCategory}
                  className="btn-secondary whitespace-nowrap"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowNewCategory(false)
                    setNewCategoryName('')
                    setCategory('')
                  }}
                  className="btn-secondary"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {category && !showNewCategory && (
              <p className="text-xs text-gray-500 mt-1">Selected: <strong>{category}</strong></p>
            )}
          </div>

          {/* Folder - Optional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Folder (Optional)
            </label>
            <div className="flex space-x-2">
              <select
                value={folder}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setShowNewFolder(true)
                    setFolder('')
                  } else if (e.target.value === '__new_sub__') {
                    if (folder) {
                      // Create sub-folder in currently selected folder
                      setShowNewFolder(true)
                      // Keep current folder as parent
                    } else {
                      toast.error('Please select a parent folder first')
                    }
                  } else {
                    setFolder(e.target.value)
                    setShowNewFolder(false)
                  }
                }}
                className="input-field flex-1"
              >
                <option value="">No folder (root)</option>
                {folders.map((fold) => (
                  <option key={fold} value={fold}>{fold}</option>
                ))}
                <option value="__new__">+ Create New Folder</option>
                <option value="__new_sub__">+ Create Sub-folder</option>
              </select>
            </div>
            {showNewFolder && (
              <div className="mt-2 flex space-x-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={folder ? `Sub-folder in "${folder}"` : "New folder name"}
                className="input-field flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleAddFolder()}
              />
                <button
                  onClick={handleAddFolder}
                  className="btn-secondary whitespace-nowrap"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowNewFolder(false)
                    setNewFolderName('')
                    setFolder('')
                  }}
                  className="btn-secondary"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {folder && !showNewFolder && (
              <p className="text-xs text-gray-500 mt-1">Selected: <strong>{folder}</strong></p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags (comma-separated, optional)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
              className="input-field"
            />
          </div>

          {/* Custom Metadata */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Metadata
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={newMetadataKey}
                onChange={(e) => setNewMetadataKey(e.target.value)}
                placeholder="Key"
                className="input-field flex-1"
              />
              <input
                type="text"
                value={newMetadataValue}
                onChange={(e) => setNewMetadataValue(e.target.value)}
                placeholder="Value"
                className="input-field flex-1"
              />
              <button
                onClick={addCustomMetadata}
                className="btn-secondary whitespace-nowrap"
              >
                Add
              </button>
            </div>
            {Object.keys(customMetadata).length > 0 && (
              <div className="space-y-2">
                {Object.entries(customMetadata).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm">
                      <strong>{key}:</strong> {value}
                    </span>
                    <button
                      onClick={() => removeCustomMetadata(key)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
          <button onClick={onClose} className="btn-secondary" disabled={uploading}>
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0 || !category}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader className="animate-spin" size={20} />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload size={20} />
                <span>Upload {files.length} file(s)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

