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
  const [pdfPages, setPdfPages] = useState([]);
  const containerRef = useRef(null);
  const canvasContainerRef = useRef(null);

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

      // For PDFs, we'll render to canvas to prevent right-click issues
      if (mimeType === 'application/pdf') {
        await renderPdfToCanvas(blob);
      }
    } catch (err) {
      setError('Failed to load file for viewing');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderPdfToCanvas = async (blob) => {
    try {
      // Use PDF.js if available, otherwise fall back to object tag
      const pdfjsLib = window.pdfjsLib;
      if (!pdfjsLib) {
        // PDF.js not loaded, will use fallback
        return;
      }

      const arrayBuffer = await blob.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pages = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        pages.push(canvas.toDataURL('image/png'));
      }

      setPdfPages(pages);
    } catch (err) {
      console.warn('PDF.js rendering failed, using fallback:', err);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const isImage = mimeType?.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const isSupported = isImage || isPdf;

  // Prevent all default behaviors
  const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-95 z-[9999] flex flex-col"
      onContextMenu={preventDefaults}
      onCopy={preventDefaults}
      onCut={preventDefaults}
      onPaste={preventDefaults}
      onDragStart={preventDefaults}
      onDrop={preventDefaults}
    >
      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between relative z-[10001]">
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
      <div className="bg-red-600 text-white text-xs px-4 py-2 text-center font-medium relative z-[10001]">
        🔒 SECURE VIEW MODE: Download, Print, Copy, and Right-Click are DISABLED. This document is protected.
      </div>

      {/* Content Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto flex items-center justify-center p-4 relative"
        style={{ 
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center space-y-4 z-[10000]">
            <Loader2 className="animate-spin text-white" size={48} />
            <p className="text-white">Loading secure view...</p>
          </div>
        ) : error ? (
          <div className="text-center z-[10000]">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        ) : !isSupported ? (
          <div className="text-center text-white z-[10000]">
            <p className="mb-4">This file type cannot be previewed in secure view.</p>
            <p className="text-gray-400 text-sm">Supported formats: Images (JPG, PNG, GIF) and PDF</p>
          </div>
        ) : (
          <div 
            ref={canvasContainerRef}
            className="relative"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease',
              transformOrigin: 'center center'
            }}
          >
            {isPdf && pdfPages.length > 0 ? (
              // Rendered PDF pages as images (most secure)
              <div className="space-y-4">
                {pdfPages.map((pageUrl, index) => (
                  <img
                    key={index}
                    src={pageUrl}
                    alt={`Page ${index + 1}`}
                    className="max-w-full shadow-lg"
                    draggable={false}
                    onContextMenu={preventDefaults}
                    onDragStart={preventDefaults}
                    style={{ pointerEvents: 'none' }}
                  />
                ))}
              </div>
            ) : isPdf ? (
              // Fallback: Use object tag with overlay to block interactions
              <div className="relative">
                <object
                  data={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                  type="application/pdf"
                  className="bg-white"
                  style={{
                    width: '800px',
                    height: '600px',
                    maxWidth: '90vw',
                    maxHeight: '70vh'
                  }}
                >
                  <p className="text-white">PDF cannot be displayed</p>
                </object>
                {/* Transparent overlay to block PDF interactions */}
                <div 
                  className="absolute inset-0 z-[100]"
                  onContextMenu={preventDefaults}
                  onClick={preventDefaults}
                  style={{ cursor: 'default' }}
                />
              </div>
            ) : isImage ? (
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-[70vh] object-contain shadow-lg"
                draggable={false}
                onContextMenu={preventDefaults}
                onDragStart={preventDefaults}
                style={{ pointerEvents: 'none' }}
              />
            ) : null}
          </div>
        )}

        {/* Watermark Overlay - ON TOP of content */}
        {!loading && !error && isSupported && (
          <div 
            className="absolute inset-0 pointer-events-none z-[9999] overflow-hidden flex items-center justify-center"
          >
            {/* Multiple watermarks for better coverage */}
            <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-32" style={{ transform: 'rotate(-30deg)' }}>
              {[...Array(9)].map((_, i) => (
                <div 
                  key={i}
                  className="text-gray-500 font-bold whitespace-nowrap"
                  style={{
                    fontSize: '48px',
                    opacity: 0.15,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                  }}
                >
                  CONFIDENTIAL
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-gray-400 text-xs px-4 py-2 text-center relative z-[10001]">
        Document viewed in secure mode. All actions are logged for compliance. © DocFlow DMS
      </div>
    </div>
  );
}
