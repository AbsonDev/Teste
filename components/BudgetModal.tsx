
import React, { useState, useEffect } from 'react';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudget: number | null | undefined;
  onSave: (amount: number) => void;
  onClear: () => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  currentBudget,
  onSave,
  onClear
}) => {
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount(currentBudget !== undefined && currentBudget !== null ? currentBudget.toString() : '');
    }
  }, [isOpen, currentBudget]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount.replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      onSave(val);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative z-10 animate-slide-up p-5">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Definir Orçamento</h2>
        <p className="text-sm text-gray-500 mb-4">Qual é o limite de gastos para esta lista?</p>

        <form onSubmit={handleSubmit}>
          <div className="relative mb-4">
             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">R$</span>
             <input 
               type="number" 
               step="0.01"
               autoFocus
               placeholder="0,00"
               value={amount}
               onChange={(e) => setAmount(e.target.value)}
               className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-xl font-medium"
             />
          </div>

          <div className="flex gap-2">
            {(currentBudget !== undefined && currentBudget !== null) && (
               <button 
                 type="button" 
                 onClick={() => { onClear(); onClose(); }}
                 className="flex-1 py-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl font-medium transition-colors"
               >
                 Remover
               </button>
            )}
            <button 
              type="submit"
              disabled={!amount}
              className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
