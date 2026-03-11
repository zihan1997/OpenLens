import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs, Outline } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronUp, ChevronDown, ZoomIn, ZoomOut, Maximize2, Loader2, MousePointer2, Sparkles, List, X as CloseIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Set worker URL for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  file: File | string | null;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  onTextSelect?: (text: string) => void;
  onReady?: (isReady: boolean) => void;
  onTranslateRequest?: (text: string) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ 
  file, 
  initialPage = 1, 
  onPageChange,
  onTextSelect,
  onReady,
  onTranslateRequest
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
  
  const [selectionCoords, setSelectionCoords] = useState<{ x: number, y: number } | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");
  const [showOutline, setShowOutline] = useState<boolean>(false);

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
    const interval = setInterval(checkReady, 500);
    return () => clearInterval(interval);
  }, [pageNumber, onReady]);

  const updateWidth = useCallback(() => {
    if (containerRef.current) {
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'ArrowDown' || e.key === 'j') {
        if (pageNumber < numPages) scrollToPage(pageNumber + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        if (pageNumber > 1) scrollToPage(pageNumber - 1);
      } else if (e.key === '=' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setScale(s => Math.min(3, s + 0.1));
      } else if (e.key === '-' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setScale(s => Math.max(0.2, s - 0.1));
      } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setScale(1.0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageNumber, numPages]);

  // Scroll to initial page when document is loaded
  useEffect(() => {
    const fileKey = typeof file === 'string' ? file : (file as File)?.name;
    if (isLoaded && initialPage > 1 && hasScrolledToInitial.current !== fileKey) {
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

  const handleMouseUp = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0) {
      setSelectedText(text);
      onTextSelect?.(text);
      
      // Position the floating button
      setSelectionCoords({
        x: e.clientX,
        y: e.clientY - 40
      });
    } else {
      setSelectionCoords(null);
    }
  };

  const scrollToPage = (page: number) => {
    const pageElement = document.getElementById(`pdf-page-${page}`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const onOutlineItemClick = ({ pageNumber: nextItemPageNumber }: { pageNumber: number }) => {
    setPageNumber(nextItemPageNumber);
    scrollToPage(nextItemPageNumber);
    setShowOutline(false);
  };

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
    <div className="flex flex-col h-full bg-sepia/20 rounded-xl overflow-hidden shadow-inner border border-accent/10 relative">
      {/* Outline Sidebar */}
      <AnimatePresence>
        {showOutline && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOutline(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-40"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl z-50 flex flex-col border-r border-accent/10"
            >
              <div className="p-4 border-b border-accent/10 flex items-center justify-between bg-accent/5">
                <h3 className="serif font-bold text-accent flex items-center">
                  <List className="w-4 h-4 mr-2" />
                  目录
                </h3>
                <button 
                  onClick={() => setShowOutline(false)}
                  className="p-1 hover:bg-accent/10 rounded-full transition-colors"
                >
                  <CloseIcon className="w-4 h-4 text-accent/60" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 outline-container">
                <Document file={file}>
                  <Outline 
                    onItemClick={onOutlineItemClick}
                    className="pdf-outline"
                  />
                </Document>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <AnimatePresence>
        {selectionCoords && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            style={{ 
              position: 'fixed', 
              left: selectionCoords.x, 
              top: selectionCoords.y,
              zIndex: 100,
              transform: 'translateX(-50%)'
            }}
            onClick={() => {
              onTranslateRequest?.(selectedText);
              setSelectionCoords(null);
            }}
            className="bg-accent text-white px-3 py-1.5 rounded-full shadow-xl flex items-center space-x-2 hover:bg-accent/90 transition-all active:scale-[0.98] border border-white/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase tracking-tighter">翻译</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center justify-between px-6 py-3 bg-white/50 backdrop-blur-sm border-b border-accent/10 z-10">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowOutline(true)}
            className="p-2 hover:bg-accent/10 rounded-lg transition-colors text-accent"
            title="目录"
          >
            <List className="w-5 h-5" />
          </button>
          <div className="flex items-center bg-accent/5 rounded-lg px-3 py-1 border border-accent/10">
            <span className="serif text-lg font-medium">
              第 {pageNumber} 页 <span className="text-accent/40 mx-1">/</span> 共 {numPages} 页
            </span>
            {isCurrentPageReady && (
              <div className="flex items-center space-x-1 ml-2 pl-2 border-l border-accent/10">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-tighter">已就绪</span>
              </div>
            )}
          </div>
          <div className="flex space-x-1">
            <button 
              onClick={() => scrollToPage(pageNumber - 1)} 
              disabled={pageNumber <= 1}
              className="p-1.5 rounded-lg hover:bg-accent/10 disabled:opacity-30 transition-colors"
              title="上一页 (上方向键 / K)"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button 
              onClick={() => scrollToPage(pageNumber + 1)} 
              disabled={pageNumber >= numPages}
              className="p-1.5 rounded-lg hover:bg-accent/10 disabled:opacity-30 transition-colors"
              title="下一页 (下方向键 / J)"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setScale(s => Math.max(0.2, s - 0.1))} 
            className="p-1.5 rounded-full hover:bg-accent/10"
            title="缩小 (Ctrl -)"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
          <button 
            onClick={() => setScale(s => Math.min(3, s + 0.1))} 
            className="p-1.5 rounded-full hover:bg-accent/10"
            title="放大 (Ctrl +)"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <div className="w-px h-4 bg-accent/10 mx-2" />
          <button 
            onClick={() => setScale(1.0)} 
            className="px-3 py-1 text-xs font-medium bg-accent/5 hover:bg-accent/10 rounded-md border border-accent/10 transition-colors"
            title="重置缩放 (Ctrl 0)"
          >
            适应宽度
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
        <span>选中文字即可翻译</span>
      </div>
    </div>
  );
};
