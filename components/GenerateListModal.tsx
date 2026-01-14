import React from 'react';

interface GenerateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (mode: 'critical' | 'all') => void;
}

export const GenerateListModal: React.FC<GenerateListModalProps> = ({
  isOpen,
  onClose,
  onGenerate
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative z-10 animate-slide-up p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Gerar Lista de Compras</h2>
            <p className="text-sm text-gray-500 mt-1">O que você deseja comprar agora?</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 -mt-1 -mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => onGenerate('critical')}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-orange-100 bg-orange-50/50 hover:bg-orange-50 hover:border-orange-300 transition-all group text-left relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-full bg-white border-2 border-orange-100 text-orange-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform z-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div className="z-10">
              <h3 className="font-bold text-gray-800 text-lg">Itens Críticos</h3>
              <p className="text-sm text-gray-600 leading-tight mt-0.5">O que acabou ou está acabando.</p>
            </div>
          </button>

          <button 
            onClick={() => onGenerate('all')}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-brand-100 bg-brand-50/50 hover:bg-brand-50 hover:border-brand-300 transition-all group text-left relative overflow-hidden"
          >
             <div className="w-12 h-12 rounded-full bg-white border-2 border-brand-100 text-brand-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform z-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div className="z-10">
              <h3 className="font-bold text-gray-800 text-lg">Reposição Completa</h3>
              <p className="text-sm text-gray-600 leading-tight mt-0.5">Tudo que está abaixo da quantidade ideal.</p>
            </div>
          </button>
        </div>
        
        <div className="mt-6 text-center">
            <button onClick={onClose} className="text-gray-400 text-sm hover:text-gray-600">Cancelar</button>
        </div>
      </div>
    </div>
  );
};