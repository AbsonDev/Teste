
import React, { useState, useEffect } from 'react';
import { Category, COLOR_PALETTES } from '../types';
import { Reorder } from 'framer-motion';

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onAdd: (name: string, colorId: string) => void;
  onUpdate: (id: string, name: string, colorId: string) => void;
  onDelete: (id: string) => void;
  onUpdateOrder: (categories: Category[]) => void;
}

const DragHandle = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 cursor-grab active:cursor-grabbing"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
);

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  isOpen,
  onClose,
  categories,
  onAdd,
  onUpdate,
  onDelete,
  onUpdateOrder
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('gray');

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('gray');
  const [localCategories, setLocalCategories] = useState<Category[]>([]);

  // Sync local state with props when modal opens or categories change externally
  useEffect(() => {
      if (isOpen) {
          const sorted = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));
          setLocalCategories(sorted);
      }
  }, [categories, isOpen]);

  const startEditing = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.colorId);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      onUpdate(editingId, editName.trim(), editColor);
      setEditingId(null);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAdd(newName.trim(), newColor);
      setNewName('');
      setNewColor('gray');
    }
  };

  const handleReorder = (newOrder: Category[]) => {
      setLocalCategories(newOrder);
      // Create a version with updated order indices
      const updatedOrder = newOrder.map((cat, index) => ({ ...cat, order: index }));
      onUpdateOrder(updatedOrder);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md relative z-10 max-h-[85vh] flex flex-col animate-slide-up">
        {/* Header with Add Form */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-2xl z-20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Gerenciar Categorias</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <form onSubmit={handleAdd} className="space-y-3">
            <div>
               <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nova Categoria</label>
               <input
                type="text"
                placeholder="Ex: Pets, Bebê..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-brand-500 outline-none"
               />
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 max-w-[200px]">
                 {COLOR_PALETTES.map(p => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setNewColor(p.id)}
                      className={`w-8 h-8 rounded-full border-2 flex-shrink-0 transition-transform ${p.bg} ${newColor === p.id ? 'border-gray-600 dark:border-white scale-110' : 'border-transparent'}`}
                    />
                 ))}
              </div>
              <button 
                type="submit" 
                disabled={!newName.trim()}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200 dark:shadow-none"
              >
                Adicionar
              </button>
            </div>
          </form>
        </div>

        {/* Scrollable List with Reorder */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-gray-50 dark:bg-gray-900/50">
          <p className="text-xs text-center text-gray-400 mb-2">Arraste para reordenar conforme o supermercado.</p>
          
          <Reorder.Group axis="y" values={localCategories} onReorder={handleReorder} className="space-y-2">
            {localCategories.map((cat) => {
                const isEditing = editingId === cat.id;
                const palette = COLOR_PALETTES.find(c => c.id === (isEditing ? editColor : cat.colorId)) || COLOR_PALETTES[0];

                if (isEditing) {
                    return (
                        <Reorder.Item key={cat.id} value={cat} dragListener={false}>
                            <div className="p-3 bg-white dark:bg-gray-700 rounded-xl border border-brand-200 dark:border-brand-700 space-y-3 shadow-sm">
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-brand-500 outline-none"
                                    autoFocus
                                />
                                <div className="flex gap-2 flex-wrap">
                                    {COLOR_PALETTES.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setEditColor(p.id)}
                                        className={`w-6 h-6 rounded-full border-2 ${p.bg} ${editColor === p.id ? 'border-gray-600 dark:border-white scale-110' : 'border-transparent'}`}
                                    />
                                    ))}
                                </div>
                                <div className="flex justify-end gap-2 mt-2">
                                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">Cancelar</button>
                                    <button onClick={saveEdit} className="px-3 py-1.5 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600">Salvar</button>
                                </div>
                            </div>
                        </Reorder.Item>
                    );
                }

                return (
                    <Reorder.Item key={cat.id} value={cat} className="touch-none select-none">
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex items-center gap-3">
                                <div className="p-1 -ml-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
                                    <DragHandle />
                                </div>
                                <div className={`w-3 h-3 rounded-full ${palette.bg} border ${palette.border}`} />
                                <span className="font-medium text-gray-700 dark:text-gray-200">{cat.name}</span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                                <button onClick={() => startEditing(cat)} className="p-2 text-gray-400 hover:text-brand-500 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                                </button>
                                <button 
                                    onClick={() => { if(confirm('Excluir categoria?')) onDelete(cat.id); }} 
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                </button>
                            </div>
                        </div>
                    </Reorder.Item>
                );
            })}
          </Reorder.Group>
        </div>
      </div>
    </div>
  );
};
