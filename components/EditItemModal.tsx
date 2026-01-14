
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingItem, Category, COLOR_PALETTES, DEFAULT_COLOR, ShoppingListGroup } from '../types';
import { auth } from '../services/firebase';

interface EditItemModalProps {
  item: ShoppingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, name: string, category: string, price?: number, quantity?: number, currentQuantity?: number, idealQuantity?: number, note?: string) => void;
  categories: Category[];
  isPantry?: boolean;
  allLists?: ShoppingListGroup[];
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  categories,
  isPantry = false,
  allLists = []
}) => {
  const [name, setName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  
  // Shopping List Fields
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');

  // Pantry Fields
  const [currentQuantity, setCurrentQuantity] = useState('1');
  const [idealQuantity, setIdealQuantity] = useState('1');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategoryName(item.category || 'Outros');
      setPrice(item.price ? item.price.toString() : '');
      setQuantity(item.quantity ? item.quantity.toString() : '1');
      setNote(item.note || '');
      setCurrentQuantity(item.currentQuantity !== undefined ? item.currentQuantity.toString() : '1');
      setIdealQuantity(item.idealQuantity !== undefined ? item.idealQuantity.toString() : '1');
    }
  }, [item]);

  // --- Lógica de Sugestão de Preço Histórico ---
  const lastPriceData = useMemo(() => {
    if (!name || !allLists.length) return null;

    // Ordena listas da mais recente para a mais antiga
    const sortedLists = [...allLists].sort((a, b) => b.createdAt - a.createdAt);

    for (const list of sortedLists) {
        if (!list.archived) continue; 

        // Tenta achar um item com nome similar (case insensitive) que tenha preço e foi completado
        const match = list.items.find(i => 
            i.completed && 
            i.price && 
            i.price > 0 &&
            i.name.trim().toLowerCase() === name.trim().toLowerCase()
        );

        if (match) {
            return { price: match.price };
        }
    }
    return null;
  }, [name, allLists]);

  const applySuggestedPrice = () => {
      if (lastPriceData?.price) {
          setPrice(lastPriceData.price.toString());
      }
  };

  if (!isOpen || !item) return null;

  const handleSave = () => {
    if (name.trim()) {
      const numPrice = price ? parseFloat(price.replace(',', '.')) : undefined;
      const numQty = quantity ? parseFloat(quantity.replace(',', '.')) : 1;
      
      const numCurrent = currentQuantity ? parseFloat(currentQuantity.replace(',', '.')) : 0;
      const numIdeal = idealQuantity ? parseFloat(idealQuantity.replace(',', '.')) : 1;
      
      onSave(item.id, name.trim(), categoryName, numPrice, numQty, numCurrent, numIdeal, note.trim());
      onClose();
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal - Max Height and Flex for Scrolling content vs Fixed Footer */}
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl pointer-events-auto animate-slide-up relative z-10 flex flex-col max-h-[90vh]">
        
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">
             {isPantry ? "Editar Estoque" : "Editar Item"}
          </h3>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-5 space-y-4 custom-scrollbar">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 tracking-wider">Nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-brand-500 outline-none text-lg font-medium"
              autoFocus
            />
          </div>

          {isPantry ? (
            /* Pantry Fields */
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 tracking-wider">Qtd. Atual</label>
                <input
                  type="number"
                  step="1"
                  value={currentQuantity}
                  onChange={e => setCurrentQuantity(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:border-brand-500 outline-none text-xl font-bold dark:text-white"
                />
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 tracking-wider">Qtd. Ideal</label>
                <input
                  type="number"
                  step="1"
                  value={idealQuantity}
                  onChange={e => setIdealQuantity(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:border-brand-500 outline-none text-xl font-bold dark:text-white"
                />
              </div>
            </div>
          ) : (
             /* Shopping List Fields */
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 tracking-wider">Preço Unit. (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-brand-500 outline-none text-lg"
                />
                {lastPriceData && !price && (
                    <button 
                        type="button"
                        onClick={applySuggestedPrice}
                        className="text-[10px] text-brand-600 dark:text-brand-400 font-medium mt-1 flex items-center gap-1 hover:underline animate-fade-in"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
                        Último pago: {formatCurrency(lastPriceData.price)}
                    </button>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 tracking-wider">Quantidade</label>
                <input
                  type="number"
                  step="0.1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-brand-500 outline-none text-lg text-center"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 tracking-wider">Observações</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Ex: Marca Nestlé, Sem Lactose, 500g..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-brand-500 outline-none text-sm resize-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 tracking-wider">Categoria</label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map(cat => {
                const palette = COLOR_PALETTES.find(c => c.id === cat.colorId) || DEFAULT_COLOR;
                const isSelected = categoryName === cat.name;
                
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryName(cat.name)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                      isSelected 
                        ? `${palette.bg} ${palette.border} ring-1 ring-offset-1 ring-brand-300 dark:ring-brand-700` 
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${palette.bg} border ${palette.border} flex-shrink-0`} />
                    <span className={`text-xs font-bold truncate ${isSelected ? palette.text : 'text-gray-700 dark:text-gray-200'}`}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Spacer to ensure content doesn't get hidden behind footer if scrolling */}
          <div className="h-4"></div>
        </div>

        {/* Footer - Fixed */}
        <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
            <button
                onClick={handleSave}
                disabled={!name.trim()}
                className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-brand-200 hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
            >
                Salvar Alterações
            </button>
        </div>
      </div>
    </div>
  );
};
