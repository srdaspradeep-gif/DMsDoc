import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { 
  X, 
  Download, 
  Edit2, 
  Eye,
  FileText,
  Loader
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

export default function DocumentPreview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [doc, setDoc] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [documentName, setDocumentName] = useState('')
  const [userHasAccess, setUserHasAccess] = useState(false)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    loadDocument()
    return () => {
      // Cleanup preview URL when component unmounts
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [id])

  // Disable right-click and print
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault()
    const handleKeyDown = (e) => {
      // Disable Ctrl+P, Ctrl+S, F12, etc.
      if (
        (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'P' || e.key === 'S')) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i'))
      ) {
        e.preventDefault()
        toast.error('Download and print are disabled in preview mode')
      }
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const loadDocument = async () => {
    try {
      setLoading(true)
      // Load document metadata
      const docResponse = await api.get(`/v2/metadata/${id}/detail`)
      const docData = docResponse.data
      setDoc(docData)
      setDocumentName(docData.name)
      
      // Check if user is owner
      const ownerCheck = docData.owner_id === user?.id
      setIsOwner(ownerCheck)
      
      // Check if user has access (owner or in access_to)
      // Also check via API to get users with access
      try {
        const accessResponse = await api.get(`/v2/metadata/${id}/access`)
        const usersWithAccess = accessResponse.data || []
        const hasAccessViaAPI = usersWithAccess.some(
          u => u.id === user?.id || u.email === user?.email
        )
        setUserHasAccess(ownerCheck || hasAccessViaAPI || 
                        (docData.access_to && (docData.access_to.includes(user?.email) || docData.access_to.includes(user?.id))))
      } catch (error) {
        // Fallback to simple check
        setUserHasAccess(ownerCheck || 
                        (docData.access_to && (docData.access_to.includes(user?.email) || docData.access_to.includes(user?.id))))
      }

      // Load preview
      try {
        const previewResponse = await api.get(`/v2/preview/${id}`, {
          responseType: 'blob',
        })
        const url = URL.createObjectURL(previewResponse.data)
        setPreviewUrl(url)
      } catch (error) {
        console.error('Preview not available:', error)
        toast.error('Preview not available for this file type')
      }
    } catch (error) {
      toast.error('Failed to load document')
      console.error('Error loading document:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateName = async () => {
    if (!documentName.trim() || documentName === doc?.name) {
      setEditingName(false)
      return
    }

    try {
      await api.put(`/v2/metadata/${doc.name}`, {
        name: documentName.trim(),
      })
      setDoc(prev => ({ ...prev, name: documentName.trim() }))
      setEditingName(false)
      toast.success('Document name updated')
    } catch (error) {
      toast.error('Failed to update document name')
      setDocumentName(doc?.name || '') // Revert on error
    }
  }

  const handleDownload = async () => {
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
      window.URL.revokeObjectURL(url)
      toast.success('Download started')
    } catch (error) {
      toast.error('Failed to download document')
    }
  }

  const handleRunOCR = () => {
    // Placeholder for OCR functionality
    toast('OCR feature will be implemented soon', { icon: 'ℹ️' })
  }

  const getFileType = () => {
    if (!doc) return null
    const type = doc.file_type?.toLowerCase() || ''
    if (type.includes('pdf')) return 'pdf'
    if (type.includes('image') || ['jpg', 'jpeg', 'png', 'gif'].some(ext => type.includes(ext))) return 'image'
    return 'other'
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="text-center">
          <Loader className="animate-spin mx-auto text-blue-600 mb-4" size={48} />
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="text-center">
          <FileText className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 mb-4">Document not found</p>
          <button
            onClick={() => navigate(-1)}
            className="btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const fileType = getFileType()
  const canPreview = fileType === 'pdf' || fileType === 'image'

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col" style={{ WebkitPrintColorAdjust: 'exact' }}>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        /* Prevent text selection */
        .preview-content {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
        }
        /* Prevent image dragging */
        img {
          -webkit-user-drag: none;
          -khtml-user-drag: none;
          -moz-user-drag: none;
          -o-user-drag: none;
          user-drag: none;
        }
      `}</style>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center space-x-2 flex-1">
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleUpdateName()
                    if (e.key === 'Escape') {
                      setDocumentName(doc?.name || '')
                      setEditingName(false)
                    }
                  }}
                  className="input-field flex-1 text-lg font-semibold"
                  autoFocus
                />
                <button
                  onClick={handleUpdateName}
                  className="btn-primary text-sm px-3 py-1.5"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setDocumentName(doc?.name || '')
                    setEditingName(false)
                  }}
                  className="btn-secondary text-sm px-3 py-1.5"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-xl md:text-2xl font-semibold text-gray-900 truncate">
                  {doc.name}
                </h1>
                {isOwner && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-gray-500 hover:text-blue-600 p-1.5 hover:bg-gray-100 rounded transition-colors"
                    title="Edit document name"
                  >
                    <Edit2 size={18} />
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {/* Run OCR Button */}
            <button
              onClick={handleRunOCR}
              className="btn-secondary flex items-center space-x-2 px-4 py-2"
              title="Run OCR (Coming soon)"
            >
              <Eye size={18} />
              <span>Run OCR</span>
            </button>

            {/* Download Button - Only show if user has access */}
            {userHasAccess && (
              <button
                onClick={handleDownload}
                className="btn-primary flex items-center space-x-2 px-4 py-2"
                title="Download document"
              >
                <Download size={18} />
                <span>Download</span>
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close preview"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Document Preview Area */}
      <div className="flex-1 overflow-auto bg-white flex items-center justify-center p-4 md:p-8 preview-content">
        {!canPreview ? (
          <div className="text-center max-w-md">
            <FileText className="mx-auto text-gray-400 mb-4" size={64} />
            <p className="text-gray-600 mb-2 text-lg">Preview not available for this file type</p>
            <p className="text-sm text-gray-500 mb-4">{doc.file_type || 'Unknown type'}</p>
            {userHasAccess && (
              <button
                onClick={handleDownload}
                className="btn-primary"
              >
                <Download size={18} className="inline mr-2" />
                Download to view
              </button>
            )}
          </div>
        ) : previewUrl ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg shadow-sm">
            {fileType === 'pdf' ? (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0 rounded-lg"
                title={doc.name}
                style={{ 
                  minHeight: '600px',
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 200px)'
                }}
                // Disable download and print
                onContextMenu={(e) => e.preventDefault()}
              />
            ) : (
              <img
                src={previewUrl}
                alt={doc.name}
                className="max-w-full max-h-full object-contain rounded-lg"
                style={{ 
                  maxHeight: 'calc(100vh - 200px)',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none'
                }}
                // Disable right-click and drag
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                draggable="false"
              />
            )}
          </div>
        ) : (
          <div className="text-center">
            <Loader className="animate-spin mx-auto text-blue-600 mb-4" size={48} />
            <p className="text-gray-600">Loading preview...</p>
          </div>
        )}
      </div>

      {/* Footer Info - Hidden for cleaner UI, can be shown if needed */}
      {/* <div className="bg-white border-t border-gray-200 px-4 md:px-6 py-2 text-xs text-gray-500 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span>Type: {document.file_type || 'Unknown'}</span>
          {document.size && (
            <span>Size: {(document.size / 1024).toFixed(2)} KB</span>
          )}
        </div>
        <span>Preview Mode - Download and Print Disabled</span>
      </div> */}
    </div>
  )
}

