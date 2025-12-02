import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { X, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SecureViewer({ fileId, fileName, mimeType, accountId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const containerRef = useRef(null);

  useEffect(() => {
    loadFile();
    
    // Disable right-click
    const handleContextMenu = (e) => {
      e.preventDefault();
      toast.error('Right-click is disabled in secure view');
      return false;
    };

    // Disable keyboard shortcuts for print/save
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's' || e.key === 'P' || e.key === 'S')) {
        e.preventDefault();
        toast.error('Printing and saving are disabled in secure view');
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileId]);

  const loadFile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/v2/dms/files-dms/${fileId}/download`, {
        headers: { 'X-Account-Id': accountId },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setFileUrl(url);
    } catch (err) {
      setError('Failed to load file for viewing');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const isImage = mimeType?.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const isSupported = isImage || isPdf;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="font-medium truncate max-w-md">{fileName}</h3>
          <span className="text-xs bg-red-600 px-2 py-1 rounded">SECURE VIEW</span>
        </div>
        <div className="flex items-center space-x-2">
          {/* Zoom Controls */}
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-gray-700 rounded"
            title="Zoom Out"
          >
            <ZoomOut size={20} />
          </button>
          <span className="text-sm min-w-[60px] text-center">{zoom}%</span>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-gray-700 rounded"
            title="Zoom In"
          >
            <ZoomIn size={20} />
          </button>
          
          {/* Rotate */}
          {isImage && (
            <button
              onClick={handleRotate}
              className="p-2 hover:bg-gray-700 rounded ml-2"
              title="Rotate"
            >
              <RotateCw size={20} />
            </button>
          )}
          
          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded ml-4"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-600 text-yellow-100 text-xs px-4 py-1 text-center">
        🔒 Secure View Mode: Download, Print, and Copy are disabled. This document is protected.
      </div>

      {/* Content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto flex items-center justify-center p-4"
        style={{ 
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
        onDragStart={(e) => e.preventDefault()}
      >
        {loading ? (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="animate-spin text-white" size={48} />
            <p className="text-white">Loading secure view...</p>
          </div>
        ) : error ? (
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        ) : !isSupported ? (
          <div className="text-center text-white">
            <p className="mb-4">This file type cannot be previewed in secure view.</p>
            <p className="text-gray-400 text-sm">Supported formats: Images (JPG, PNG, GIF) and PDF</p>
          </div>
        ) : isPdf ? (
          <iframe
            src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            className="bg-white rounded"
            style={{
              width: `${zoom}%`,
              height: '100%',
              maxWidth: '100%',
              transform: `rotate(${rotation}deg)`,
              pointerEvents: 'auto'
            }}
            title="Secure PDF Viewer"
          />
        ) : isImage ? (
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease'
            }}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          />
        ) : null}
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-gray-400 text-xs px-4 py-2 text-center">
        Document viewed in secure mode. All actions are logged for compliance.
      </div>

      {/* Watermark overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-10 overflow-hidden"
        style={{ opacity: 0.03 }}
      >
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: 'rotate(-45deg)',
            fontSize: '120px',
            fontWeight: 'bold',
            color: 'white',
            whiteSpace: 'nowrap'
          }}
        >
          CONFIDENTIAL
        </div>
      </div>
    </div>
  );
}
