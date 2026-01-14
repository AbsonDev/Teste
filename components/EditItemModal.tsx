import React, { useState, useEffect } from 'react';
import { ShoppingItem, Category, COLOR_PALETTES, DEFAULT_COLOR } from '../types';
import { getLastItemPrice, auth } from '../services/firebase';

interface EditItemModalProps {
  item: ShoppingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, name: string, category: string, price?: number, quantity?: number, currentQuantity?: number, idealQuantity?: number) => void;
  categories: Category[];
  isPantry?: boolean; // New prop
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  categories,
  isPantry = false
}) => {
  const [name, setName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  
  // Shopping List Fields
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [lastKnownPrice, setLastKnownPrice] = useState<number | null>(null);

  // Pantry Fields
  const [currentQuantity, setCurrentQuantity] = useState('1');
  const [idealQuantity, setIdealQuantity] = useState('1');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategoryName(item.category || 'Outros');
      setPrice(item.price ? item.price.toString() : '');
      setQuantity(item.quantity ? item.quantity.toString() : '1');
      setCurrentQuantity(item.currentQuantity !== undefined ? item.currentQuantity.toString() : '1');
      setIdealQuantity(item.idealQuantity !== undefined ? item.idealQuantity.toString() : '1');
      setLastKnownPrice(null);
    }
  }, [item]);

  // Fetch last price when name changes (debounced effectively by being in useEffect dependent on name)
  useEffect(() => {
    const fetchLastPrice = async () => {
        if (name && auth.currentUser) {
            // Only fetch if name is long enough to be a real item
            if (name.length > 2) {
                const price = await getLastItemPrice(auth.currentUser.uid, name);
                setLastKnownPrice(price);
            }
        }
    };
    
    const timer = setTimeout(fetchLastPrice, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [name]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    if (name.trim()) {
      const numPrice = price ? parseFloat(price.replace(',', '.')) : undefined;
      const numQty = quantity ? parseFloat(quantity.replace(',', '.')) : 1;
      
      const numCurrent = currentQuantity ? parseFloat(currentQuantity.replace(',', '.')) : 0;
      const numIdeal = idealQuantity ? parseFloat(idealQuantity.replace(',', '.')) : 1;
      
      onSave(item.id, name.trim(), categoryName, numPrice, numQty, numCurrent, numIdeal);
      onClose();
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const useLastPrice = () => {
      if (lastKnownPrice) {
          setPrice(lastKnownPrice.toString());
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl pointer-events-auto animate-slide-up relative z-10">
        <div className="flex justify-between items-center mb-4">
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

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-brand-500 outline-none text-lg"
              autoFocus
            />
          </div>

          {isPantry ? (
            /* Pantry Fields */
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 tracking-wider">Quantidade Atual</label>
                <input
                  type="number"
                  step="1"
                  value={currentQuantity}
                  onChange={e => setCurrentQuantity(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:border-brand-500 outline-none text-xl font-bold dark:text-white"
                />
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 tracking-wider">Quantidade Ideal</label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preço Unitário (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-brand-500 outline-none text-lg"
                />
                {lastKnownPrice && (
                    <div 
                        onClick={useLastPrice}
                        className="flex items-center gap-1 mt-1 text-xs text-brand-600 dark:text-brand-400 cursor-pointer hover:underline"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/></svg>
                        <span>Último pago: {formatCurrency(lastKnownPrice)}</span>
                    </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantidade</label>
                <input
                  type="number"
                  step="0.1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-brand-500 outline-none text-lg"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categoria</label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
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
                    <span className={`text-sm truncate ${isSelected ? palette.text : 'text-gray-700 dark:text-gray-200'}`}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-brand-200 hover:bg-brand-700 active:scale-[0.98] transition-all"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};