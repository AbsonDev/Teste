
import React, { useState, useRef, useEffect } from 'react';
import { logUserEvent } from '../services/firebase';
import { ITEM_DATABASE } from '../data/itemDatabase';

interface SmartInputProps {
  onAddSimple: (name: string, category?: string) => Promise<void>;
  onAddSmart: (prompt: string) => Promise<void>;
  isProcessing: boolean;
  actionButton?: React.ReactNode;
  isViewer?: boolean;
}

// Helper para remover acentos
const normalizeText = (text: string) => 
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const SmartInput: React.FC<SmartInputProps> = ({ 
  onAddSimple, 
  onAddSmart, 
  isProcessing, 
  actionButton,
  isViewer 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [mode, setMode] = useState<'simple' | 'smart'>('simple');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detecção automática de modo (IA vs Simples)
  useEffect(() => {
    // Se tiver palavras-chave de comando, muda para Smart
    const smartKeywords = ['receita', 'fazer', 'jantar', 'almoço', 'lista para', 'churrasco', 'bolo'];
    const isSmart = smartKeywords.some(kw => inputValue.toLowerCase().includes(kw)) || inputValue.length > 40;
    
    // Mas se tiver vírgulas (lista rápida), forçamos o modo Simples (Batch)
    const isBatchList = inputValue.includes(',') || inputValue.includes('\n');

    if (isSmart && !isBatchList) {
        setMode('smart');
    } else {
        setMode('simple');
    }

    // Lógica de Autocomplete (Só no modo simples e curto)
    if (!isBatchList && inputValue.length >= 2 && inputValue.length < 20) {
        const normalizedInput = normalizeText(inputValue);
        const matches = Object.keys(ITEM_DATABASE).filter(item => 
            normalizeText(item).includes(normalizedInput)
        ).slice(0, 4); // Top 4 sugestões
        setSuggestions(matches);
    } else {
        setSuggestions([]);
    }

  }, [inputValue]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    const val = inputValue.trim();

    // Modo IA (Gemini)
    if (mode === 'smart') {
      try {
        logUserEvent('smart_list_generated', { prompt_length: val.length });
        await onAddSmart(val);
        setInputValue('');
      } catch (e: any) {
        console.error(e);
        logUserEvent('ai_error', { error_message: e.message, prompt_context: 'smart_input' });
        alert("Não entendi o pedido. Tente simplificar.");
      }
      return;
    }

    // Modo Simples (Com suporte a Lote/Batch)
    // Separa por vírgulas ou quebras de linha
    const items = val.split(/,|\n/).map(s => s.trim()).filter(s => s.length > 0);

    for (const itemName of items) {
        // Tenta encontrar categoria no banco local
        const normalizedName = normalizeText(itemName);
        // Procura match exato ou parcial no DB
        const dbKey = Object.keys(ITEM_DATABASE).find(key => normalizeText(key) === normalizedName);
        const category = dbKey ? ITEM_DATABASE[dbKey] : 'Outros';
        
        await onAddSimple(itemName, category);
    }

    setInputValue('');
    setSuggestions([]);
  };

  const handleSuggestionClick = (suggestion: string) => {
      const category = ITEM_DATABASE[suggestion];
      // Capitalize first letter
      const displayVal = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
      onAddSimple(displayVal, category);
      setInputValue('');
      setSuggestions([]);
      inputRef.current?.focus();
  };

  // --- Voice Recognition Logic ---
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      // Adiciona ao texto existente (com vírgula se precisar)
      setInputValue(prev => {
          const separator = prev.length > 0 && !prev.endsWith(', ') ? ', ' : '';
          return prev + separator + transcript;
      });
      setIsListening(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  if (isViewer) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-gray-900 dark:via-gray-900 z-40">
      <div className="max-w-3xl mx-auto relative">
        
        {/* Floating Action Button Slot */}
        {actionButton && (
          <div className="absolute bottom-full right-0 mb-4 z-10 flex justify-end">
            {actionButton}
          </div>
        )}

        {/* Lista de Sugestões (Autocomplete) */}
        {suggestions.length > 0 && (
            <ul className="absolute bottom-full left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl mb-3 overflow-hidden z-50 max-h-40 overflow-y-auto animate-slide-up">
                {suggestions.map(s => (
                <li 
                    key={s} 
                    onClick={() => handleSuggestionClick(s)}
                    className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center border-b last:border-0 border-gray-100 dark:border-gray-700"
                >
                    <span className="text-gray-800 dark:text-gray-200 capitalize font-medium">{s}</span>
                    <span className="text-[10px] bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 px-2 py-1 rounded uppercase tracking-wider">{ITEM_DATABASE[s]}</span>
                </li>
                ))}
            </ul>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          
          {/* Botão de Voz */}
          <button
            type="button"
            onClick={startListening}
            className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all z-20 ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
            title="Ditar itens"
          >
            {isListening ? (
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            ) : (
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            )}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isListening ? "Ouvindo..." : mode === 'smart' ? "Peça uma receita..." : "Adicione itens (separe por vírgula)..."}
            className={`w-full pl-14 pr-14 py-4 rounded-2xl border shadow-lg shadow-gray-200/50 dark:shadow-none outline-none transition-all text-base
              ${mode === 'smart' 
                ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-100 placeholder-purple-300 focus:ring-2 focus:ring-purple-500' 
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500'
              }
            `}
            disabled={isProcessing}
          />
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
             {isProcessing ? (
                <div className="p-2">
                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
             ) : (
                <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className={`p-2.5 rounded-xl transition-all disabled:opacity-50 disabled:scale-100 active:scale-95
                        ${mode === 'smart' 
                        ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-200' 
                        : 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-200'
                        }
                    `}
                >
                    {mode === 'smart' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    )}
                </button>
             )}
          </div>
        </form>
      </div>
    </div>
  );
};
