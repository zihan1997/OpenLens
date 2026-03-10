import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronUp, ChevronDown, ZoomIn, ZoomOut, Maximize2, Loader2, MousePointer2 } from 'lucide-react';

// Set worker URL for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  file: File | string | null;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  onTextSelect?: (text: string) => void;
  onReady?: (isReady: boolean) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ 
  file, 
  initialPage = 1, 
  onPageChange,
  onTextSelect,
  onReady
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(initialPage);
  const [scale, setScale] = useState<number>(1.0);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const renderedPagesRef = useRef<Set<number>>(new Set());
  const [isCurrentPageReady, setIsCurrentPageReady] = useState<boolean>(false);
  const hasScrolledToInitial = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  // Memoize pages to prevent re-renders of the entire document when unrelated state changes
  const pages = React.useMemo(() => {
    if (numPages <= 0) return null;
    return Array.from(new Array(numPages), (el, index) => (
      <div 
        key={`page_${index + 1}`} 
        id={`pdf-page-${index + 1}`}
        className="shadow-2xl bg-white"
      >
        <Page 
          pageNumber={index + 1} 
          width={containerWidth}
          scale={scale}
          renderAnnotationLayer={true}
          renderTextLayer={true}
          onRenderTextLayerSuccess={() => {
            renderedPagesRef.current.add(index + 1);
            // We'll handle the onReady call separately or via a ref-based check
            // to avoid re-rendering all pages when pageNumber changes
          }}
          loading={
            <div className="flex items-center justify-center bg-white" style={{ width: containerWidth * scale, height: containerWidth * scale * 1.4 }}>
              <Loader2 className="w-6 h-6 animate-spin text-accent/20" />
            </div>
          }
        />
      </div>
    ));
  }, [numPages, containerWidth, scale]);
  
  useEffect(() => {
    const checkReady = () => {
      const isReady = renderedPagesRef.current.has(pageNumber);
      setIsCurrentPageReady(isReady);
      onReady?.(isReady);
    };
    
    checkReady();
    // Also check periodically if not ready, as onRenderTextLayerSuccess might have fired
    const interval = setInterval(checkReady, 500);
    return () => clearInterval(interval);
  }, [pageNumber, onReady]);

  const updateWidth = useCallback(() => {
    if (containerRef.current) {
      // Subtract padding
      const width = containerRef.current.clientWidth - 64;
      setContainerWidth(width);
    }
  }, []);

  useEffect(() => {
    updateWidth();
    observerRef.current = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      observerRef.current.observe(containerRef.current);
    }
    return () => observerRef.current?.disconnect();
  }, [updateWidth]);

  // Scroll to initial page when document is loaded
  useEffect(() => {
    const fileKey = typeof file === 'string' ? file : (file as File)?.name;
    if (isLoaded && initialPage > 1 && hasScrolledToInitial.current !== fileKey) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        scrollToPage(initialPage);
        hasScrolledToInitial.current = fileKey || 'unknown';
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, initialPage, file]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoaded(true);
  }

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      onTextSelect?.(selection.toString());
    }
  };

  const scrollToPage = (page: number) => {
    const pageElement = document.getElementById(`pdf-page-${page}`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Track which page is in view
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const children = container.querySelectorAll('[id^="pdf-page-"]');
    let currentInView = 1;
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      if (child.offsetTop <= container.scrollTop + container.clientHeight / 3) {
        currentInView = parseInt(child.id.replace('pdf-page-', ''));
      }
    }
    
    if (currentInView !== pageNumber) {
      setPageNumber(currentInView);
      onPageChange?.(currentInView);
      
      const isReady = renderedPagesRef.current.has(currentInView);
      setIsCurrentPageReady(isReady);
      onReady?.(isReady);
    }
  };

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-accent/60 space-y-4">
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-accent/30 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <p className="serif text-xl italic">Waiting for a manuscript...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-sepia/20 rounded-xl overflow-hidden shadow-inner border border-accent/10">
      {/* Controls */}
      <div className="flex items-center justify-between px-6 py-3 bg-white/50 backdrop-blur-sm border-b border-accent/10 z-10">
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-accent/5 rounded-lg px-3 py-1 border border-accent/10">
            <span className="serif text-lg font-medium">
              Page {pageNumber} <span className="text-accent/40 mx-1">/</span> {numPages}
            </span>
            {isCurrentPageReady && (
              <div className="flex items-center space-x-1 ml-2 pl-2 border-l border-accent/10">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-tighter">Ready</span>
              </div>
            )}
          </div>
          <div className="flex space-x-1">
            <button 
              onClick={() => scrollToPage(pageNumber - 1)} 
              disabled={pageNumber <= 1}
              className="p-1.5 rounded-lg hover:bg-accent/10 disabled:opacity-30 transition-colors"
              title="Previous Page"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button 
              onClick={() => scrollToPage(pageNumber + 1)} 
              disabled={pageNumber >= numPages}
              className="p-1.5 rounded-lg hover:bg-accent/10 disabled:opacity-30 transition-colors"
              title="Next Page"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setScale(s => Math.max(0.2, s - 0.1))} 
            className="p-1.5 rounded-full hover:bg-accent/10"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
          <button 
            onClick={() => setScale(s => Math.min(3, s + 0.1))} 
            className="p-1.5 rounded-full hover:bg-accent/10"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <div className="w-px h-4 bg-accent/10 mx-2" />
          <button 
            onClick={() => setScale(1.0)} 
            className="px-3 py-1 text-xs font-medium bg-accent/5 hover:bg-accent/10 rounded-md border border-accent/10 transition-colors"
          >
            Fit Width
          </button>
        </div>
      </div>

      {/* PDF Content - Vertical Scroll Mode */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-8 flex flex-col items-center space-y-8 scroll-smooth"
        onMouseUp={handleMouseUp}
        onScroll={handleScroll}
      >
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center p-20">
              <Loader2 className="w-10 h-10 animate-spin text-accent" />
            </div>
          }
        >
          {pages}
        </Document>
      </div>
      
      {/* Selection Hint */}
      <div className="px-4 py-2 bg-accent/5 border-t border-accent/10 flex items-center justify-center space-x-2 text-[10px] uppercase tracking-widest text-accent/40 font-bold">
        <MousePointer2 className="w-3 h-3" />
        <span>Select text to translate</span>
      </div>
    </div>
  );
};
