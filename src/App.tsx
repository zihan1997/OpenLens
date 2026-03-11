import React, { useState, useEffect, useCallback } from 'react';
import { PdfViewer } from './components/PdfViewer';
import { translatePhilosophicalTextStream, AIProvider, TranslationOptions, checkProviderStatus } from './services/translationService';
import { 
  BookOpen, 
  Languages, 
  History, 
  Settings, 
  Upload, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Quote,
  Copy,
  Check,
  Loader2,
  X,
  Cpu,
  Globe,
  Database,
  Activity,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [file, setFile] = useState<File | string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedText, setSelectedText] = useState<string>("");
  const [translation, setTranslation] = useState<string>("");
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isPdfReady, setIsPdfReady] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(500);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Health check state
  const [healthStatus, setHealthStatus] = useState<{ success?: boolean; message?: string }>({});
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);

  // AI Settings
  const [provider, setProvider] = useState<AIProvider>(() => {
    return (localStorage.getItem('ai_provider') as AIProvider) || 'gemini';
  });
  const [ollamaModel, setOllamaModel] = useState<string>(() => {
    return localStorage.getItem('ollama_model') || 'minimax';
  });
  const [ollamaApiKey, setOllamaApiKey] = useState<string>(() => {
    return localStorage.getItem('ollama_api_key') || '';
  });
  const [cloudHost, setCloudHost] = useState<string>(() => {
    return localStorage.getItem('cloud_host') || 'https://ollama.com';
  });

  const handleTestConnection = async () => {
    setIsCheckingHealth(true);
    setHealthStatus({});
    
    const options: TranslationOptions = {
      provider,
      model: ollamaModel,
      baseUrl: provider === 'ollama-cloud' ? cloudHost : undefined,
      apiKey: ollamaApiKey,
    };

    try {
      const result = await checkProviderStatus(options);
      setHealthStatus(result);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Load progress from localStorage
  useEffect(() => {
    if (fileName) {
      const savedPage = localStorage.getItem(`progress_${fileName}`);
      if (savedPage) {
        setCurrentPage(parseInt(savedPage));
      }
    }
  }, [fileName]);

  // Save AI settings to localStorage
  useEffect(() => {
    localStorage.setItem('ai_provider', provider);
    localStorage.setItem('ollama_model', ollamaModel);
    localStorage.setItem('ollama_api_key', ollamaApiKey);
    localStorage.setItem('cloud_host', cloudHost);
    setHealthStatus({}); // Reset health status when settings change
  }, [provider, ollamaModel, ollamaApiKey, cloudHost]);

  useEffect(() => {
    if (showSettings) {
      setHealthStatus({});
    }
  }, [showSettings]);

  // Save progress to localStorage
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    if (fileName) {
      localStorage.setItem(`progress_${fileName}`, page.toString());
    }
  }, [fileName]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setFileName(uploadedFile.name);
      // Reset state for new book
      setTranslation("");
      setSelectedText("");
      setIsPdfReady(false);
    }
  };

  const handleTranslate = async (overrideText?: string) => {
    const textToTranslate = overrideText || selectedText;
    if (!textToTranslate) return;
    
    setIsTranslating(true);
    setTranslation(""); // Clear previous translation
    
    const options: TranslationOptions = {
      provider,
      model: ollamaModel,
      baseUrl: provider === 'ollama-cloud' ? cloudHost : undefined,
      apiKey: ollamaApiKey,
    };

    try {
      await translatePhilosophicalTextStream(textToTranslate, options, (chunk) => {
        setTranslation(prev => prev + chunk);
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(translation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setFileName(droppedFile.name);
      setTranslation("");
      setSelectedText("");
      setIsPdfReady(false);
    }
  };

  const clearProgress = () => {
    if (fileName) {
      localStorage.removeItem(`progress_${fileName}`);
      setCurrentPage(1);
      // Force re-render of PdfViewer
      setFileName(prev => prev + " ");
      setTimeout(() => setFileName(prev => prev.trim()), 0);
    }
  };

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 300 && newWidth < 800) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <div 
      className="flex h-screen w-full bg-paper overflow-hidden relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-accent/20 backdrop-blur-md flex items-center justify-center border-4 border-dashed border-accent m-4 rounded-3xl"
          >
            <div className="flex flex-col items-center space-y-4 text-accent">
              <Upload className="w-20 h-20 animate-bounce" />
              <h2 className="serif text-4xl font-bold">Drop your manuscript here</h2>
              <p className="text-lg font-medium opacity-60">Release to begin reading</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex h-full overflow-hidden relative">
        
        {/* Left: PDF Viewer */}
        <section className="flex-1 h-full p-4 md:p-6 flex flex-col overflow-hidden">
          <header className="mb-6 flex items-center justify-between border-b border-accent/10 pb-4">
            <div className="flex items-center space-x-4 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20 shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="serif text-3xl font-semibold tracking-tight text-accent truncate max-w-[300px] md:max-w-[500px]">
                  {fileName ? fileName.replace('.pdf', '') : "OpenLens"}
                </h1>
                <p className="text-sm text-accent/60 font-medium truncate">
                  {fileName ? `Reading your manuscript` : "Select a philosophical text to begin"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-accent/10 rounded-full text-accent transition-colors"
                title="AI Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <label className="flex items-center space-x-2 px-4 py-2 bg-accent text-white rounded-full cursor-pointer hover:bg-accent/90 transition-all shadow-md active:scale-95">
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">{file ? "Change Book" : "Open Manuscript"}</span>
                <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </header>

          <div className="flex-1 min-h-0 relative">
            <PdfViewer 
              key={fileName || 'empty'}
              file={file} 
              initialPage={currentPage}
              onPageChange={handlePageChange}
              onTextSelect={setSelectedText}
              onReady={setIsPdfReady}
              onTranslateRequest={handleTranslate}
            />
          </div>
        </section>

        {/* Sidebar Toggle Button (Floating) */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-accent text-white p-2 rounded-l-xl shadow-xl transition-all hover:pr-4 ${isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          title="Open Translation Panel"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Right: AI Translation Panel */}
        <motion.section 
          initial={false}
          animate={{ 
            width: isSidebarOpen ? sidebarWidth : 0,
            opacity: isSidebarOpen ? 1 : 0,
            x: isSidebarOpen ? 0 : 20
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="h-full bg-sepia/10 border-l border-accent/10 flex flex-col overflow-hidden relative"
        >
          {/* Resize Handle */}
          <div 
            onMouseDown={startResizing}
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/30 transition-colors z-50 group"
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-12 bg-accent/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="w-0.5 h-6 bg-accent/40 rounded-full" />
            </div>
          </div>

          <div className="flex-1 flex flex-col p-6 min-w-[300px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-accent/10 rounded-lg text-accent">
                  <Languages className="w-5 h-5" />
                </div>
                <h2 className="serif text-2xl font-semibold whitespace-nowrap">AI Translation</h2>
              </div>
              <div className="flex items-center space-x-2">
                <div className="hidden lg:flex items-center space-x-2 px-2 py-1 bg-accent/5 rounded-full border border-accent/10">
                  <div className={`w-2 h-2 rounded-full ${provider === 'gemini' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-accent/60">
                    {provider === 'gemini' ? 'Gemini 3.1 Pro' : `Ollama: ${ollamaModel}`}
                  </span>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 hover:bg-accent/10 rounded-lg text-accent transition-colors"
                  title="Collapse Panel"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
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
                
                {selectedText && (
                  <button 
                    onClick={() => handleTranslate()}
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
                <span className="truncate mr-2">Powered by {provider === 'gemini' ? 'Gemini 3.1 Pro' : 'Ollama Cloud'}</span>
                <div className="flex items-center space-x-1 shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>AI Scholar</span>
                </div>
              </div>
            </footer>
          </div>
        </motion.section>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-accent/10 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-accent" />
                  <h3 className="serif text-xl font-semibold">AI Settings</h3>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-accent/5 rounded-full text-accent/40 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Provider Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-accent/40 block">
                    AI Service Provider
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setProvider('gemini')}
                      className={`flex flex-col items-center justify-center space-y-1 p-3 rounded-xl border-2 transition-all ${provider === 'gemini' ? 'border-accent bg-accent/5 text-accent' : 'border-accent/5 hover:border-accent/20 text-accent/40'}`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase">Gemini</span>
                    </button>
                    <button 
                      onClick={() => setProvider('ollama-cloud')}
                      className={`flex flex-col items-center justify-center space-y-1 p-3 rounded-xl border-2 transition-all ${provider === 'ollama-cloud' ? 'border-accent bg-accent/5 text-accent' : 'border-accent/5 hover:border-accent/20 text-accent/40'}`}
                    >
                      <Globe className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase">Ollama</span>
                    </button>
                  </div>
                </div>

                {/* Ollama Cloud Config */}
                {provider === 'ollama-cloud' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-4 border-t border-accent/5"
                  >
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-800 text-[10px] leading-relaxed">
                      <p className="font-bold mb-1 flex items-center">
                        <Globe className="w-3 h-3 mr-1" />
                        Ollama Cloud
                      </p>
                      Connect to a hosted Ollama service. Make sure your <strong>OLLAMA_API_KEY</strong> is set in the Secrets panel.
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-accent/60 flex items-center">
                        <Globe className="w-3 h-3 mr-1.5" />
                        Cloud API Host
                      </label>
                      <input 
                        type="text" 
                        value={cloudHost}
                        onChange={(e) => setCloudHost(e.target.value)}
                        placeholder="e.g., https://ollama.com"
                        className="w-full p-3 bg-accent/5 border border-accent/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-accent/60 flex items-center">
                        <Database className="w-3 h-3 mr-1.5" />
                        Cloud Model Name
                      </label>
                      <input 
                        type="text" 
                        value={ollamaModel}
                        onChange={(e) => setOllamaModel(e.target.value)}
                        placeholder="e.g., minimax, gpt-oss:120b"
                        className="w-full p-3 bg-accent/5 border border-accent/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                  </motion.div>
                )}

                {provider === 'gemini' && (
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-blue-800 text-sm">
                    Using Google's <strong>Gemini 3.1 Pro</strong>. This model is highly optimized for complex philosophical reasoning and scholarly translation.
                  </div>
                )}

                {/* Health Check Section */}
                <div className="pt-4 border-t border-accent/5">
                  <button 
                    onClick={handleTestConnection}
                    disabled={isCheckingHealth}
                    className="w-full py-2.5 px-4 bg-accent/5 hover:bg-accent/10 text-accent rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isCheckingHealth ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Activity className="w-4 h-4" />
                    )}
                    <span>Test Connection</span>
                  </button>
                  
                  {healthStatus.message && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-3 p-3 rounded-xl text-xs flex items-start space-x-2 ${healthStatus.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}
                    >
                      {healthStatus.success ? (
                        <Check className="w-4 h-4 mt-0.5 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      )}
                      <span>{healthStatus.message}</span>
                    </motion.div>
                  )}

                  {fileName && (
                    <button 
                      onClick={clearProgress}
                      className="w-full mt-4 py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all active:scale-95"
                    >
                      <History className="w-4 h-4" />
                      <span>Reset Reading Progress</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 bg-accent/5 flex justify-end">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-2 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-all active:scale-95 shadow-lg shadow-accent/10"
                >
                  Save & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
