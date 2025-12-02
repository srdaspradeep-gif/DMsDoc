import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { X, ZoomIn, ZoomOut, RotateCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SecureViewer({ fileId, fileName, mimeType, accountId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    loadFile();
    
    // Disable right-click on the entire document
    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toast.error('Right-click is disabled in secure view');
      return false;
    };

    // Disable keyboard shortcuts for print/save/copy
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && 
          (e.key === 'p' || e.key === 's' || e.key === 'c' || 
           e.key === 'P' || e.key === 'S' || e.key === 'C')) {
        e.preventDefault();
        e.stopPropagation();
        toast.error('This action is disabled in secure view');
        return false;
      }
    };

    // Disable print via window.print
    const originalPrint = window.print;
    window.print = () => {
      toast.error('Printing is disabled in secure view');
    };

    // Add listeners with capture to catch events before they reach iframes
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.print = originalPrint;
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

  // Prevent context menu only
  const preventContextMenu = (e) => {
    e.preventDefault();
    toast.error('Right-click is disabled');
    return false;
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-95 z-[9999] flex flex-col"
      onContextMenu={preventContextMenu}
    >
      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          <h3 className="font-medium truncate max-w-md">{fileName}</h3>
          <span className="text-xs bg-red-600 px-2 py-1 rounded font-bold">SECURE VIEW</span>
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
          <button
            onClick={handleRotate}
            className="p-2 hover:bg-gray-700 rounded ml-2"
            title="Rotate"
          >
            <RotateCw size={20} />
          </button>
          
          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-600 rounded ml-4 bg-gray-700"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-red-600 text-white text-xs px-4 py-2 text-center font-medium flex-shrink-0">
        🔒 SECURE VIEW MODE: Download, Print, Copy, and Right-Click are DISABLED. This document is protected.
      </div>

      {/* Content Area - Scrollable */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto relative"
        style={{ 
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <Loader2 className="animate-spin text-white" size={48} />
            <p className="text-white">Loading secure view...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <button onClick={onClose} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        ) : !isSupported ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <p className="mb-4">This file type cannot be previewed in secure view.</p>
              <p className="text-gray-400 text-sm">Supported formats: Images (JPG, PNG, GIF) and PDF</p>
            </div>
          </div>
        ) : (
          <div className="min-h-full p-4 flex justify-center">
            {/* Document Container with Watermark */}
            <div 
              className="relative inline-block"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease'
              }}
            >
              {isPdf ? (
                <embed
                  src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                  type="application/pdf"
                  className="bg-white shadow-2xl"
                  style={{
                    width: '850px',
                    height: '1100px',
                    maxWidth: '95vw'
                  }}
                />
              ) : isImage ? (
                <img
                  src={fileUrl}
                  alt={fileName}
                  className="max-w-full shadow-2xl"
                  draggable={false}
                  onContextMenu={preventContextMenu}
                  onDragStart={(e) => e.preventDefault()}
                />
              ) : null}

              {/* Watermark Overlay - Positioned over the document */}
              <div 
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{ zIndex: 10 }}
              >
                {/* Diagonal watermarks */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: `repeating-linear-gradient(
                      -45deg,
                      transparent,
                      transparent 100px,
                      rgba(128, 128, 128, 0.03) 100px,
                      rgba(128, 128, 128, 0.03) 200px
                    )`
                  }}
                />
                
                {/* Text watermarks */}
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ transform: 'rotate(-35deg)' }}
                >
                  <div className="flex flex-col items-center space-y-24">
                    {[0, 1, 2, 3, 4].map((row) => (
                      <div key={row} className="flex space-x-16">
                        {[0, 1, 2].map((col) => (
                          <span
                            key={col}
                            className="text-gray-500 font-bold whitespace-nowrap select-none"
                            style={{
                              fontSize: '32px',
                              opacity: 0.12,
                              textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
                              letterSpacing: '4px'
                            }}
                          >
                            CONFIDENTIAL
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-gray-400 text-xs px-4 py-2 text-center flex-shrink-0">
        Document viewed in secure mode. All actions are logged for compliance. © DocFlow DMS
      </div>
    </div>
  );
}
