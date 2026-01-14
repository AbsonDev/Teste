import React, { useState, useRef, useEffect } from 'react';
import { logUserEvent } from '../services/firebase';

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
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    const val = inputValue.trim();
    setError(null);
    
    if (mode === 'smart') {
      try {
        logUserEvent('smart_list_generated', { prompt_length: val.length });
        await onAddSmart(val);
        setInputValue(''); // Only clear if successful
      } catch (e: any) {
        console.error(e);
        logUserEvent('ai_error', { 
            error_message: e.message, 
            prompt_context: 'smart_input' 
        });
        setError("Não entendi o pedido. Tente simplificar.");
      } finally {
        setMode('simple');
      }
    } else {
      onAddSimple(val);
      setInputValue('');
    }
  };

  useEffect(() => {
    // Reset error when user types
    if (error && inputValue) setError(null);

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
  }, [inputValue, mode, error]);

  // If viewer, show nothing or just the action button (like complete?)
  // Usually Viewers can't complete items either, so we just return null or a simplified view
  if (isViewer) {
      return (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/70 dark:bg-gray-900/90 backdrop-blur-xl border-t border-white/20 dark:border-white/5 z-50 text-center text-gray-500 dark:text-gray-400 text-sm">
             Você está no modo Leitor.
          </div>
      );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/60 dark:bg-gray-900/90 backdrop-blur-xl border-t border-white/40 dark:border-white/5 z-50 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-300">
      <div className="max-w-3xl mx-auto relative">
        
        {/* Floating Action Button Slot (Positioned relative to this container) */}
        {actionButton && (
          <div className="absolute bottom-full right-0 mb-4 z-10 flex justify-end">
            {actionButton}
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-center gap-3">
          <div className="relative flex-1 group">
             <div className={`absolute inset-y-0 left-3 flex items-center pointer-events-none transition-colors duration-300 ${mode === 'smart' ? 'text-purple-500 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`}>
               {mode === 'smart' ? <SparklesIcon /> : <PlusIcon />}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={mode === 'smart' ? "Descreva o que precisa..." : "Adicionar item..."}
              className={`w-full pl-10 pr-4 py-3.5 rounded-2xl border-2 outline-none text-base transition-all duration-300 shadow-inner ${
                error 
                  ? 'border-red-300 bg-red-50/80 text-red-900 dark:bg-red-900/40 dark:text-red-100 dark:border-red-800 focus:border-red-400 placeholder-red-300'
                  : mode === 'smart' 
                    ? 'border-purple-200 dark:border-purple-800 bg-purple-50/80 dark:bg-purple-900/30 focus:border-purple-400 dark:focus:border-purple-600 text-purple-900 dark:text-purple-100 placeholder-purple-300 dark:placeholder-purple-400/60' 
                    : 'border-white/50 dark:border-gray-700 bg-white/50 dark:bg-gray-800/80 focus:bg-white/80 dark:focus:bg-gray-800 focus:border-gray-300 dark:focus:border-gray-600 text-gray-800 dark:text-white dark:placeholder-gray-500 backdrop-blur-sm'
              }`}
              disabled={isProcessing}
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isProcessing}
            className={`p-3.5 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg active:scale-95 ${
              mode === 'smart'
                ? 'bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-purple-200/50'
                : 'bg-gradient-to-br from-brand-500 to-green-600 hover:from-brand-600 hover:to-green-700 text-white shadow-brand-200/50'
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
         
         <div className="text-xs text-center mt-2 h-4 relative">
             {error ? (
                <span className="text-red-500 dark:text-red-400 font-medium animate-fade-in absolute inset-0">
                    {error}
                </span>
             ) : (
                <span className={`text-purple-600 dark:text-purple-400 font-medium flex items-center justify-center gap-1 transition-all duration-300 absolute inset-0 ${mode === 'smart' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
                    <SparklesIcon className="w-3 h-3" /> IA detectada: criando lista inteligente...
                </span>
             )}
        </div>
      </div>
    </div>
  );
};