import React, { useState } from 'react';
import { Category, COLOR_PALETTES } from '../types';

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onAdd: (name: string, colorId: string) => void;
  onUpdate: (id: string, name: string, colorId: string) => void;
  onDelete: (id: string) => void;
  onMove?: (index: number, direction: 'up' | 'down') => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  isOpen,
  onClose,
  categories,
  onAdd,
  onUpdate,
  onDelete,
  onMove
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('gray');

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('gray');

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 max-h-[85vh] flex flex-col animate-slide-up">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Gerenciar Categorias</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {categories.map((cat, index) => {
            const isEditing = editingId === cat.id;
            const palette = COLOR_PALETTES.find(c => c.id === (isEditing ? editColor : cat.colorId)) || COLOR_PALETTES[0];

            if (isEditing) {
              return (
                <div key={cat.id} className="p-3 bg-gray-50 rounded-xl border border-brand-200 space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-brand-500 outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2 flex-wrap">
                    {COLOR_PALETTES.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setEditColor(p.id)}
                        className={`w-6 h-6 rounded-full border-2 ${p.bg} ${editColor === p.id ? 'border-gray-600 scale-110' : 'border-transparent'}`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                     <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm text-gray-500">Cancelar</button>
                     <button onClick={saveEdit} className="px-3 py-1.5 text-sm bg-brand-500 text-white rounded-lg">Salvar</button>
                  </div>
                </div>
              );
            }

            return (
              <div key={cat.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${palette.bg} border ${palette.border}`} />
                  <span className="font-medium text-gray-700">{cat.name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Reordering Buttons */}
                  {onMove && (
                    <div className="flex flex-col mr-2">
                      <button 
                        onClick={() => onMove(index, 'up')}
                        disabled={index === 0}
                        className="text-gray-300 hover:text-brand-500 disabled:opacity-20 disabled:hover:text-gray-300"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                      </button>
                      <button 
                         onClick={() => onMove(index, 'down')}
                         disabled={index === categories.length - 1}
                         className="text-gray-300 hover:text-brand-500 disabled:opacity-20 disabled:hover:text-gray-300"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </button>
                    </div>
                  )}

                  <div className="h-6 w-px bg-gray-100 mx-1"></div>

                  <button onClick={() => startEditing(cat)} className="p-2 text-gray-400 hover:text-brand-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                  </button>
                  <button onClick={() => { if(confirm('Excluir categoria?')) onDelete(cat.id); }} className="p-2 text-gray-400 hover:text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              type="text"
              placeholder="Nova Categoria..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-brand-500 outline-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                 {COLOR_PALETTES.slice(0, 5).map(p => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setNewColor(p.id)}
                      className={`w-6 h-6 rounded-full border-2 ${p.bg} ${newColor === p.id ? 'border-gray-600 scale-110' : 'border-transparent'}`}
                    />
                 ))}
                 <button type="button" onClick={() => setNewColor('gray')} className="text-xs text-gray-400 underline">+ mais</button>
              </div>
              <button 
                type="submit" 
                disabled={!newName.trim()}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};