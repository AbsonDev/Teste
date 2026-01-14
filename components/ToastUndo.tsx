import React, { useEffect } from 'react';

interface ToastUndoProps {
  isOpen: boolean;
  message: string;
  onUndo: () => void;
  onClose: () => void;
}

export const ToastUndo: React.FC<ToastUndoProps> = ({ isOpen, message, onUndo, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // Desaparece após 5 segundos
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[70] animate-slide-up">
      <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-4 min-w-[300px] justify-between">
        <span className="text-sm font-medium">{message}</span>
        <button 
          onClick={onUndo}
          className="text-brand-400 hover:text-brand-300 font-bold text-sm uppercase tracking-wide px-2 py-1 rounded hover:bg-white/10 transition-colors"
        >
          Desfazer
        </button>
        <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  );
};
