
import React, { useState } from 'react';
import { ShoppingListGroup } from '../types';

interface ListPanelProps {
  lists: ShoppingListGroup[];
  activeListId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onUpdate: (id: string, name: string) => void; // Mantido para compatibilidade
  onDelete: (id: string) => void; // Mantido para compatibilidade
  onToggleArchive: (id: string, archived: boolean) => void;
  onManageCategories: () => void;
  onOpenPantry: () => void;
  onShare: (listId: string, listName: string) => void;
  onOpenHistory: () => void;
  onOpenScanner?: () => void;
  onOpenChef?: () => void;
  user: any;
  currentTheme: 'light' | 'dark';
  onToggleTheme: () => void;
  onClose?: () => void;
}

// Sub-componente para os Botões de Navegação (Grid)
const NavButton = ({ icon, label, onClick, active = false, colorClass = "text-brand-600 bg-brand-50" }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200 active:scale-95 border ${active ? 'bg-white dark:bg-gray-700 shadow-md border-transparent ring-2 ring-brand-500' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
  >
    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${colorClass}`}>
      {icon}
    </div>
    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">{label}</span>
  </button>
);

export const ListPanel: React.FC<ListPanelProps> = ({ 
  lists, 
  activeListId, 
  onSelect, 
  onCreate, 
  onManageCategories, 
  onOpenPantry, 
  onOpenHistory, 
  onOpenScanner, 
  onOpenChef, 
  user, 
  currentTheme, 
  onToggleTheme, 
  onClose 
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  
  // Filtrar listas visíveis (não arquivadas e não dispensa)
  const visibleLists = lists.filter(l => !l.archived && l.type !== 'pantry');
  const isPantryActive = lists.find(l => l.id === activeListId)?.type === 'pantry';

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListName.trim()) {
        onCreate(newListName.trim());
        setNewListName('');
        setIsCreating(false);
        if (onClose) onClose();
    }
  };

  const handleNav = (action?: () => void) => {
      if (action) action();
      if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      
      {/* 1. Header de Perfil Compacto */}
      <div className="p-4 flex items-center gap-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="relative">
             {user?.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600" />
             ) : (
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-300 font-bold text-lg">
                    {user?.displayName?.[0] || 'U'}
                </div>
             )}
             <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm truncate">{user?.displayName || 'Usuário'}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
        </div>
        <button 
            onClick={onToggleTheme} 
            className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={currentTheme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
        >
             {currentTheme === 'light' ? (
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
             ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
             )}
        </button>
      </div>

      {/* 2. Grid de Navegação (Apps) */}
      <div className="p-4 grid grid-cols-2 gap-3 border-b border-gray-200/50 dark:border-gray-700/50">
          <NavButton 
             label="Dispensa" 
             active={isPantryActive}
             onClick={() => handleNav(onOpenPantry)}
             colorClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
             icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
          />
          <NavButton 
             label="Chef IA" 
             onClick={() => handleNav(onOpenChef)}
             colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
             icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>}
          />
           <NavButton 
             label="Histórico" 
             onClick={() => handleNav(onOpenHistory)}
             colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
             icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>}
          />
           <NavButton 
             label="Leitor" 
             onClick={() => handleNav(onOpenScanner)}
             colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
             icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>}
          />
      </div>

      {/* 3. Lista de Compras (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
         <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Suas Listas</span>
            <button 
                onClick={() => setIsCreating(true)} 
                className="w-6 h-6 rounded-full bg-brand-100 hover:bg-brand-200 text-brand-700 flex items-center justify-center transition-colors shadow-sm"
                title="Criar Nova Lista"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
         </div>

         {isCreating && (
            <form onSubmit={handleCreateSubmit} className="mb-3 animate-slide-up">
              <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nome da lista..."
                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-brand-300 dark:border-brand-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none ring-2 ring-brand-100 dark:ring-brand-900/50"
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    onBlur={() => { if(!newListName) setIsCreating(false); }}
                  />
                  <button type="submit" className="p-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 shadow-md" onMouseDown={(e) => e.preventDefault()}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
              </div>
            </form>
         )}

         <div className="space-y-1">
            {visibleLists.length === 0 && !isCreating ? (
                <div className="text-center py-8 opacity-50 text-sm">Nenhuma lista criada.</div>
            ) : visibleLists.map(list => {
                const isActive = list.id === activeListId;
                const pendingItems = list.items.filter(i => !i.completed).length;

                return (
                    <button
                        key={list.id}
                        onClick={() => handleNav(() => onSelect(list.id))}
                        className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-200 flex items-center justify-between group ${
                            isActive 
                            ? 'bg-brand-600 text-white shadow-lg shadow-brand-200/50 dark:shadow-none' 
                            : 'hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                        <div className="min-w-0">
                            <p className={`font-bold text-sm truncate ${isActive ? 'text-white' : ''}`}>{list.name}</p>
                            <p className={`text-xs truncate ${isActive ? 'text-brand-100' : 'text-gray-400'}`}>
                                {list.items.length} itens {list.items.length > 0 && `• ${pendingItems} pendentes`}
                            </p>
                        </div>
                        {isActive && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                    </button>
                )
            })}
         </div>
      </div>

      {/* 4. Footer Fixo */}
      <div className="p-4 border-t border-gray-200/50 dark:border-gray-700 bg-white dark:bg-gray-800">
         <button 
            onClick={() => handleNav(onManageCategories)}
            className="flex items-center gap-3 w-full p-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
         >
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            Gerenciar Categorias
         </button>

         <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center px-1">
             <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Versão 1.5.0</span>
             <button className="text-xs text-red-500 font-bold hover:underline" onClick={() => window.location.reload()}>Sair</button>
         </div>
      </div>
    </div>
  );
};

export const ListDrawer: React.FC<ListPanelProps & { isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose, ...props }) => {
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div 
        className={`fixed inset-y-0 left-0 w-80 bg-white dark:bg-gray-900 shadow-2xl z-[70] transform transition-transform duration-300 ease-out lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <ListPanel {...props} onClose={onClose} />
      </div>
    </>
  );
};
