import React, { useState, useEffect } from 'react';
import { ShoppingItem, Category, COLOR_PALETTES, DEFAULT_COLOR } from '../types';

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
    }
  }, [item]);

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

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl pointer-events-auto animate-slide-up relative z-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">
             {isPantry ? "Editar Estoque" : "Editar Item"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-brand-500 outline-none text-lg"
              autoFocus
            />
          </div>

          {isPantry ? (
            /* Pantry Fields */
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1 tracking-wider">Quantidade Atual</label>
                <input
                  type="number"
                  step="1"
                  value={currentQuantity}
                  onChange={e => setCurrentQuantity(e.target.value)}
                  className="w-full px-2 py-1 bg-white rounded-lg border border-gray-200 focus:border-brand-500 outline-none text-xl font-bold"
                />
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1 tracking-wider">Quantidade Ideal</label>
                <input
                  type="number"
                  step="1"
                  value={idealQuantity}
                  onChange={e => setIdealQuantity(e.target.value)}
                  className="w-full px-2 py-1 bg-white rounded-lg border border-gray-200 focus:border-brand-500 outline-none text-xl font-bold"
                />
              </div>
            </div>
          ) : (
             /* Shopping List Fields */
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço Unitário (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-brand-500 outline-none text-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                <input
                  type="number"
                  step="0.1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-brand-500 outline-none text-lg"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
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
                        ? `${palette.bg} ${palette.border} ring-1 ring-offset-1 ring-brand-300` 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${palette.bg} border ${palette.border} flex-shrink-0`} />
                    <span className={`text-sm truncate ${isSelected ? palette.text : 'text-gray-700'}`}>
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