import React, { useState, useRef, useEffect } from 'react';

interface SmartInputProps {
  onAddSimple: (name: string) => void;
  onAddSmart: (prompt: string) => Promise<void>;
  isProcessing: boolean;
  actionButton?: React.ReactNode; // New prop for the external button
  isViewer?: boolean;
}

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="M12 5v14"/>
  </svg>
);

export const SmartInput: React.FC<SmartInputProps> = ({ onAddSimple, onAddSmart, isProcessing, actionButton, isViewer }) => {
  const [inputValue, setInputValue] = useState('');
  const [mode, setMode] = useState<'simple' | 'smart'>('simple');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    const val = inputValue.trim();
    setInputValue(''); // Clear immediately for better UX
    
    if (mode === 'smart') {
      try {
        await onAddSmart(val);
      } catch (e) {
        // If it fails, we might want to restore the input, but simpler for now just to alert in App
      } finally {
        setMode('simple');
      }
    } else {
      onAddSimple(val);
    }
  };

  useEffect(() => {
    const lowerVal = inputValue.toLowerCase();
    const isSmartCandidate = 
      inputValue.length > 25 || 
      inputValue.includes(',') || 
      lowerVal.includes('receita') || 
      lowerVal.includes('ingredientes') ||
      lowerVal.includes(' para ');
    
    if (isSmartCandidate && mode === 'simple') {
      setMode('smart');
    } else if (!isSmartCandidate && inputValue.length === 0) {
      setMode('simple');
    }
  }, [inputValue, mode]);

  // If viewer, show nothing or just the action button (like complete?)
  // Usually Viewers can't complete items either, so we just return null or a simplified view
  if (isViewer) {
      return (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-200 z-50 text-center text-gray-500 text-sm">
             Você está no modo Leitor.
          </div>
      );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-200 z-50">
      <div className="max-w-3xl mx-auto relative">
        
        {/* Floating Action Button Slot (Positioned relative to this container) */}
        {actionButton && (
          <div className="absolute bottom-full right-0 mb-4 z-10 flex justify-end">
            {actionButton}
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1 group">
             <div className={`absolute inset-y-0 left-3 flex items-center pointer-events-none transition-colors duration-300 ${mode === 'smart' ? 'text-purple-500' : 'text-gray-400'}`}>
               {mode === 'smart' ? <SparklesIcon /> : <PlusIcon />}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={mode === 'smart' ? "Descreva o que precisa..." : "Adicionar item..."}
              className={`w-full pl-10 pr-4 py-3.5 rounded-2xl border-2 outline-none text-base transition-all duration-300 ${
                mode === 'smart' 
                  ? 'border-purple-200 bg-purple-50 focus:border-purple-400 text-purple-900 placeholder-purple-300' 
                  : 'border-gray-200 bg-gray-50 focus:border-gray-400 focus:bg-white text-gray-800'
              }`}
              disabled={isProcessing}
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isProcessing}
            className={`p-3.5 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${
              mode === 'smart'
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200'
                : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
             {isProcessing ? (
               <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            )}
          </button>
        </form>
         <div className={`text-xs text-center mt-2 h-4 transition-all duration-300 ${mode === 'smart' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
            <span className="text-purple-600 font-medium flex items-center justify-center gap-1">
              <SparklesIcon className="w-3 h-3" /> IA detectada: criando lista inteligente...
            </span>
        </div>
      </div>
    </div>
  );
};