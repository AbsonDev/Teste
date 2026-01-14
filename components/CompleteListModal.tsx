import React, { useState } from 'react';
import { logUserEvent } from '../services/firebase';

interface CompleteListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (archiveList: boolean, addToPantry: boolean) => void;
  totalItems: number;
  totalValue: number;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export const CompleteListModal: React.FC<CompleteListModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  totalItems,
  totalValue
}) => {
  const [archiveList, setArchiveList] = useState(true);
  const [addToPantry, setAddToPantry] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative z-10 animate-slide-up p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
               <h2 className="text-xl font-bold text-gray-800">Finalizar Compra</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 -mt-1 -mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
           <p className="text-gray-600 text-sm mb-2">Resumo do carrinho:</p>
           <div className="flex justify-between items-end">
              <div>
                <span className="block text-3xl font-bold text-gray-900">{totalItems}</span>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Itens Pegos</span>
              </div>
              {totalValue > 0 && (
                <div className="text-right">
                  <span className="block text-xl font-bold text-green-600">{formatCurrency(totalValue)}</span>
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Estimado</span>
                </div>
              )}
           </div>
        </div>

        <div className="space-y-3 mb-6">
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${addToPantry ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
              <div className={`w-5 h-5 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${addToPantry ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-300'}`}>
                {addToPantry && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <input 
                type="checkbox" 
                checked={addToPantry} 
                onChange={(e) => setAddToPantry(e.target.checked)} 
                className="hidden"
              />
              <div className="flex-1">
                 <span className="block text-sm font-bold text-gray-800">Atualizar Dispensa</span>
                 <span className="block text-xs text-gray-500 mt-0.5">Adicionar quantidades compradas ao estoque.</span>
              </div>
            </label>

            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${archiveList ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
              <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${archiveList ? 'bg-gray-600 border-gray-600' : 'bg-white border-gray-300'}`}>
                {archiveList && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <input 
                type="checkbox" 
                checked={archiveList} 
                onChange={(e) => setArchiveList(e.target.checked)} 
                className="hidden"
              />
              <span className="text-sm font-medium text-gray-700">Arquivar esta lista após finalizar</span>
            </label>
        </div>

        <button 
          onClick={() => {
              logUserEvent('purchase_completed', { 
                  value: totalValue, 
                  items_count: totalItems,
                  added_to_pantry: addToPantry
              });
              onConfirm(archiveList, addToPantry);
          }}
          className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span>Confirmar</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  );
};