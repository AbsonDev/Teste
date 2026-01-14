import React, { useState } from 'react';
import { ShoppingListGroup } from '../types';
import { signOut } from '../services/firebase';
import { useTranslation } from 'react-i18next';

interface ListPanelProps {
  lists: ShoppingListGroup[];
  activeListId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onToggleArchive: (id: string, archived: boolean) => void;
  onManageCategories: () => void;
  onOpenPantry: () => void;
  onShare: (listId: string, listName: string) => void; 
  onOpenHistory: () => void; 
  user: any;
  onClose?: () => void; 
  currentTheme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const ListPanel: React.FC<ListPanelProps> = ({
  lists,
  activeListId,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
  onToggleArchive,
  onManageCategories,
  onOpenPantry,
  onShare,
  onOpenHistory,
  user,
  onClose,
  currentTheme,
  onToggleTheme
}) => {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [newListName, setNewListName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [isPantryExpanded, setIsPantryExpanded] = useState(true);

  const regularLists = lists.filter(l => l.type !== 'pantry');
  const filteredLists = regularLists.filter(l => tab === 'active' ? !l.archived : l.archived);
  
  const activeList = lists.find(l => l.id === activeListId);
  const isPantryActive = activeList?.type === 'pantry';

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListName.trim()) {
      onCreate(newListName.trim());
      setNewListName('');
      setIsCreating(false);
    }
  };

  const startEditing = (list: ShoppingListGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingListId(list.id);
    setEditName(list.name);
    setDeleteConfirmId(null);
  };

  const saveEdit = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (editName.trim()) {
      onUpdate(id, editName.trim());
      setEditingListId(null);
    }
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingListId(null);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteConfirmId(id);
    setEditingListId(null);
  };

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete(id);
    setDeleteConfirmId(null);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteConfirmId(null);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 relative transition-colors">
      <div className="p-6 pb-0 bg-brand-50 dark:bg-gray-900/50 border-b border-brand-100 dark:border-gray-700 flex-shrink-0 relative">
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-gray-700 rounded-full lg:hidden transition-colors"
            title="Fechar menu"
            aria-label="Fechar menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}

        <div className="flex items-center gap-3 mb-6 pr-8">
           {user.photoURL ? (
             <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full border-2 border-brand-200 dark:border-brand-800" />
           ) : (
             <div className="w-10 h-10 rounded-full bg-brand-200 dark:bg-brand-800 flex items-center justify-center text-brand-700 dark:text-brand-100 font-bold">
                {user.displayName?.charAt(0) || 'U'}
             </div>
           )}
           <div className="overflow-hidden">
             <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.displayName || 'Usuário'}</h2>
             <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
           </div>
        </div>
        
        <div className="mb-4">
          <button 
            onClick={() => setIsPantryExpanded(!isPantryExpanded)}
            className="flex items-center justify-between w-full px-1 py-1 mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors group"
            aria-expanded={isPantryExpanded}
          >
             <span>{t('stock')}</span>
             <div className={`p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${isPantryExpanded ? 'rotate-180' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
             </div>
          </button>

          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isPantryExpanded ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="relative group">
              <button
                onClick={() => {
                  onOpenPantry();
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all shadow-sm ${
                  isPantryActive 
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200 ring-1 ring-orange-200 dark:ring-orange-800' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-gray-700/50 hover:border-orange-200'
                }`}
              >
                <div className={`p-2 rounded-lg ${isPantryActive ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22v-9"/></svg>
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-sm">{t('pantry')}</span>
                  <span className="text-[10px] opacity-70">{t('pantry_desc')}</span>
                </div>
              </button>
              {isPantryActive && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onShare(activeList!.id, t('pantry')); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-orange-400 hover:text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg"
                    title={t('share')}
                    aria-label={t('share')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setTab('active')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${tab === 'active' ? 'text-brand-700 dark:text-brand-400 border-brand-500' : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            {t('lists_active')}
          </button>
          <button
            onClick={() => setTab('archived')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${tab === 'archived' ? 'text-brand-700 dark:text-brand-400 border-brand-500' : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            {t('lists_archived')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-gray-50/30 dark:bg-gray-900/30">
        {filteredLists.length === 0 && (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
            {tab === 'active' ? t('empty_active') : t('empty_archived')}
          </div>
        )}

        {filteredLists.map(list => {
          const totalItems = list.items.length;
          const completedItems = list.items.filter(i => i.completed).length;
          const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
          
          const isEditing = editingListId === list.id;
          const isDeleting = deleteConfirmId === list.id;
          const isShared = (list.members && list.members.length > 1);

          if (isEditing) {
            return (
              <form 
                key={list.id} 
                onSubmit={(e) => saveEdit(list.id, e)}
                className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-brand-300 dark:border-brand-700 shadow-sm flex flex-col gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <input 
                  autoFocus
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:border-brand-500 outline-none dark:text-white"
                  aria-label="Nome da lista"
                />
                <div className="flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={cancelEdit}
                    className="p-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={!editName.trim()}
                    className="p-1.5 text-xs text-white bg-brand-600 rounded hover:bg-brand-700"
                  >
                    {t('save')}
                  </button>
                </div>
              </form>
            );
          }

          return (
            <div 
              key={list.id}
              className={`group flex items-center justify-between pl-3 pr-1 py-2 rounded-xl border transition-all cursor-pointer ${
                list.id === activeListId 
                  ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800' 
                  : 'bg-white dark:bg-gray-800 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-200 dark:hover:border-gray-700'
              }`}
              onClick={() => {
                if (!isDeleting) {
                  onSelect(list.id);
                  if (onClose) onClose();
                }
              }}
            >
              <div className="flex flex-col overflow-hidden flex-1 mr-2">
                <div className="flex justify-between items-center mb-1">
                   <div className="flex items-center gap-1.5 truncate">
                      <span className={`font-medium truncate ${list.id === activeListId ? 'text-brand-900 dark:text-brand-300' : 'text-gray-700 dark:text-gray-200'}`}>{list.name}</span>
                      {isShared && (
                        <span title={t('share')} className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </span>
                      )}
                   </div>
                   {totalItems > 0 && (
                     <span className={`text-[10px] font-bold ${percentage === 100 ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'}`}>
                       {percentage}%
                     </span>
                   )}
                </div>
                
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                   <div 
                     className={`h-full rounded-full transition-all duration-500 ${percentage === 100 ? 'bg-brand-500' : 'bg-brand-300 dark:bg-brand-600'}`} 
                     style={{ width: `${percentage}%` }}
                   />
                </div>
                
                <div className="flex justify-between items-center mt-1">
                   <span className="text-[10px] text-gray-400 dark:text-gray-500">
                     {totalItems === 0 ? 'Vazia' : (completedItems === totalItems ? 'Completa' : `${totalItems - completedItems} pendentes`)}
                   </span>
                </div>
              </div>
              
              <div className="flex items-center self-start mt-1">
                {isDeleting ? (
                   <div className="flex items-center animate-fade-in gap-1 mr-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => confirmDelete(list.id, e)}
                        className="px-2 py-1.5 text-xs font-bold text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors shadow-sm"
                      >
                        {t('confirm')}
                      </button>
                      <button
                        type="button"
                        onClick={cancelDelete}
                        className="p-1.5 text-gray-500 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
                        aria-label={t('cancel')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                   </div>
                ) : (
                  <div className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    
                    {tab === 'active' && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onShare(list.id, list.name); }}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title={t('share')}
                        aria-label={t('share')}
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => startEditing(list, e)}
                      className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-100 dark:hover:bg-brand-900/30 rounded-lg transition-colors"
                      title={t('rename')}
                      aria-label={t('rename')}
                    >
                      <svg className="pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    </button>

                    {tab === 'active' ? (
                       <button
                         type="button"
                         onClick={(e) => { e.stopPropagation(); onToggleArchive(list.id, true); }}
                         className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                         title={t('archive')}
                         aria-label={t('archive')}
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect width="22" height="5" x="1" y="3"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                       </button>
                    ) : (
                       <>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onToggleArchive(list.id, false); }}
                          className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                          title={t('restore')}
                          aria-label={t('restore')}
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteClick(list.id, e)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title={t('delete_permanent')}
                          aria-label={t('delete_permanent')}
                        >
                            <svg className="pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                       </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
        
        {/* Language Switcher */}
        <div className="flex justify-center gap-4 py-1">
            <button onClick={() => changeLanguage('pt')} className={`text-xl hover:scale-110 transition-transform ${i18n.language.startsWith('pt') ? 'opacity-100' : 'opacity-50'}`} title="Português">🇧🇷</button>
            <button onClick={() => changeLanguage('en')} className={`text-xl hover:scale-110 transition-transform ${i18n.language.startsWith('en') ? 'opacity-100' : 'opacity-50'}`} title="English">🇺🇸</button>
            <button onClick={() => changeLanguage('es')} className={`text-xl hover:scale-110 transition-transform ${i18n.language.startsWith('es') ? 'opacity-100' : 'opacity-50'}`} title="Español">🇪🇸</button>
        </div>

        {tab === 'active' && (
          isCreating ? (
            <form onSubmit={handleCreate} className="flex gap-2 animate-fade-in">
              <input
                autoFocus
                type="text"
                placeholder={t('new_list') + "..."}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none text-sm"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                onBlur={() => !newListName && setIsCreating(false)}
                aria-label={t('new_list')}
              />
              <button 
                type="submit"
                className="bg-brand-500 text-white p-2 rounded-lg hover:bg-brand-600"
                aria-label={t('create_list')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-3 flex items-center justify-center gap-2 text-brand-700 dark:text-brand-300 font-medium bg-white dark:bg-gray-800 border border-brand-200 dark:border-brand-800 rounded-xl hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              {t('new_list')}
            </button>
          )
        )}

        <div className="grid grid-cols-2 gap-2">
            <button
            onClick={() => {
                onManageCategories();
                if (onClose) onClose();
            }}
            className="w-full py-2.5 flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
            {t('categories')}
            </button>
            <button
            onClick={() => {
                onOpenHistory();
                if (onClose) onClose();
            }}
            className="w-full py-2.5 flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {t('history')}
            </button>
        </div>

        {onToggleTheme && (
            <button
            onClick={onToggleTheme}
            className="w-full py-2.5 flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              {currentTheme === 'dark' ? (
                 <>
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                   {t('theme_light')}
                 </>
              ) : (
                 <>
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                   {t('theme_dark')}
                 </>
              )}
            </button>
        )}

        <button
          onClick={signOut}
          className="w-full py-2.5 flex items-center justify-center gap-2 text-red-500 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          {t('logout')}
        </button>
      </div>
    </div>
  );
};

export const ListDrawer: React.FC<ListPanelProps & { isOpen: boolean }> = (props) => {
  const { isOpen, onClose, ...otherProps } = props;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      />
      
      <div className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-800 shadow-2xl z-[70] lg:hidden transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <ListPanel {...otherProps} onClose={onClose} />
      </div>
    </>
  );
};