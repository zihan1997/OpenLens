import React, { useState, useEffect } from 'react';
import { PdfViewer } from './components/PdfViewer';
import { translatePhilosophicalText } from './services/geminiService';
import { 
  BookOpen, 
  Languages, 
  History, 
  Settings, 
  Upload, 
  Sparkles,
  ChevronRight,
  Quote,
  Copy,
  Check,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [file, setFile] = useState<File | string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedText, setSelectedText] = useState<string>("");
  const [translation, setTranslation] = useState<string>("");
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Load progress from localStorage
  useEffect(() => {
    if (fileName) {
      const savedPage = localStorage.getItem(`progress_${fileName}`);
      if (savedPage) {
        setCurrentPage(parseInt(savedPage));
      }
    }
  }, [fileName]);

  // Save progress to localStorage
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (fileName) {
      localStorage.setItem(`progress_${fileName}`, page.toString());
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setFileName(uploadedFile.name);
      // Reset state for new book
      setTranslation("");
      setSelectedText("");
    }
  };

  const handleTranslate = async () => {
    if (!selectedText) return;
    setIsTranslating(true);
    try {
      const result = await translatePhilosophicalText(selectedText);
      setTranslation(result);
    } finally {
      setIsTranslating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(translation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-screen w-full bg-paper overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        
        {/* Left: PDF Viewer */}
        <section className="flex-1 h-full p-4 md:p-6 flex flex-col overflow-hidden">
          <header className="mb-6 flex items-center justify-between border-b border-accent/10 pb-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h1 className="serif text-3xl font-semibold tracking-tight text-accent">
                  {fileName ? fileName.replace('.pdf', '') : "Sophia Reader"}
                </h1>
                <p className="text-sm text-accent/60 font-medium">
                  {fileName ? `Reading your manuscript` : "Select a philosophical text to begin"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 px-4 py-2 bg-accent text-white rounded-full cursor-pointer hover:bg-accent/90 transition-all shadow-md active:scale-95">
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">{file ? "Change Book" : "Open Manuscript"}</span>
                <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </header>

          <div className="flex-1 min-h-0">
            <PdfViewer 
              key={fileName || 'empty'}
              file={file} 
              initialPage={currentPage}
              onPageChange={handlePageChange}
              onTextSelect={setSelectedText}
            />
          </div>
        </section>

        {/* Right: AI Translation Panel */}
        <section className="w-full md:w-[400px] lg:w-[500px] h-full bg-sepia/10 border-l border-accent/10 flex flex-col p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-accent/10 rounded-lg text-accent">
                <Languages className="w-5 h-5" />
              </div>
              <h2 className="serif text-2xl font-semibold">AI Translation</h2>
            </div>
            <Sparkles className="w-5 h-5 text-accent/40 animate-pulse" />
          </div>

          <div className="flex-1 flex flex-col space-y-6 overflow-y-auto pr-2">
            {/* Selected Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-xs font-bold uppercase tracking-widest text-accent/40">
                  <Quote className="w-3 h-3 mr-2" />
                  Selected Passage
                </div>
                {selectedText && (
                  <div className="text-[10px] font-mono text-accent/30">
                    {selectedText.split(/\s+/).filter(Boolean).length} words
                  </div>
                )}
              </div>
              <div className="p-4 bg-white/60 rounded-2xl border border-accent/5 serif italic text-lg leading-relaxed text-ink/80 min-h-[100px] max-h-[200px] overflow-y-auto">
                {selectedText || "Select text in the PDF to translate..."}
              </div>
              
              {/* Debug: Selected Words List */}
              {selectedText && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedText.split(/\s+/).filter(Boolean).slice(0, 10).map((word, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-accent/5 rounded text-[10px] font-mono text-accent/60 border border-accent/5">
                      {word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")}
                    </span>
                  ))}
                  {selectedText.split(/\s+/).filter(Boolean).length > 10 && (
                    <span className="text-[10px] text-accent/30 self-center">...</span>
                  )}
                </div>
              )}

              {selectedText && (
                <button 
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className="w-full py-3 bg-accent text-white rounded-xl font-medium shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-50 mt-4"
                >
                  {isTranslating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Deep Translation</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Translation Result */}
            <AnimatePresence mode="wait">
              {translation && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-widest text-accent/40">
                      Philosophical Rendering
                    </div>
                    <button 
                      onClick={copyToClipboard}
                      className="p-2 hover:bg-accent/10 rounded-lg text-accent transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="p-6 bg-accent/5 rounded-2xl border border-accent/10 serif text-xl leading-relaxed text-ink whitespace-pre-wrap">
                    {translation}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <footer className="mt-6 pt-6 border-t border-accent/10">
            <div className="flex items-center justify-between text-xs text-accent/40 font-medium">
              <span>Powered by Gemini 3.1 Pro</span>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>AI Scholar Online</span>
              </div>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
