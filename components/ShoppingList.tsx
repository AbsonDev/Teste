import React, { useMemo } from 'react';
import { ShoppingItem, Category, COLOR_PALETTES, DEFAULT_COLOR } from '../types';
import { Reorder, useDragControls } from "framer-motion";

interface ShoppingListProps {
  items: ShoppingItem[];
  categories: Category[];
  groupByCategory: boolean;
  sortBy: 'created' | 'name' | 'manual';
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: ShoppingItem) => void;
  onReorder?: (items: ShoppingItem[]) => void; // New prop
  isPantry?: boolean;
  onUpdateQuantity?: (id: string, delta: number) => void;
  isViewer?: boolean;
}

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>
);

const DragHandleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing">
    <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
  </svg>
);

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

// Componente Interno para Item Draggable
const DraggableShoppingItem = ({ 
  item, 
  categories, 
  isPantry, 
  isViewer, 
  onToggle, 
  onEdit, 
  onDelete, 
  onUpdateQuantity,
  groupByCategory,
  getPantryStatus
}: any) => {
  const dragControls = useDragControls();

  const category = categories.find((c: any) => c.name === item.category) || 
                   categories.find((c: any) => c.name === 'Outros');
  
  const palette = category 
    ? (COLOR_PALETTES.find(p => p.id === category.colorId) || DEFAULT_COLOR) 
    : DEFAULT_COLOR;

  // Renderização Padrão (Cópia da lógica original)
  if (isPantry) {
      const current = item.currentQuantity || 0;
      const ideal = item.idealQuantity || 1;
      const status = getPantryStatus(current, ideal);

      return (
        <Reorder.Item
          value={item}
          id={item.id}
          dragListener={false}
          dragControls={dragControls}
          className="group bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between relative"
        >
          <div className="flex items-center gap-2 flex-1 overflow-hidden">
             {/* Handle para Drag */}
             {!isViewer && (
                <div 
                    onPointerDown={(e) => dragControls.start(e)}
                    className="touch-none p-1 -ml-1"
                >
                    <DragHandleIcon />
                </div>
             )}

             <div className="flex items-center gap-3 flex-1 overflow-hidden" onClick={() => !isViewer && onEdit(item)}>
                <div className="flex flex-col items-center justify-center gap-1 min-w-[32px]">
                    <div className={`w-3 h-3 rounded-full ${status.color} shadow-sm`} title={status.label} />
                </div>
                <div className={`flex flex-col overflow-hidden flex-1 ${!isViewer ? 'cursor-pointer' : ''}`}>
                    <span className="text-base font-medium text-gray-800 dark:text-gray-200 truncate">{item.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                       {!groupByCategory && item.category && (
                        <span className={`text-[10px] uppercase tracking-wider font-bold w-fit px-1.5 py-0.5 rounded ${palette.bg} ${palette.text}`}>
                          {item.category}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 font-medium hidden sm:inline-block">Status: {status.label}</span>
                    </div>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-0.5">
                <button 
                  onClick={(e) => { e.stopPropagation(); onUpdateQuantity && onUpdateQuantity(item.id, -1); }}
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-all active:scale-95 ${isViewer ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 hover:text-red-500 hover:shadow-sm'}`}
                  disabled={current <= 0 || isViewer}
                >
                  -
                </button>
                <div className="flex flex-col items-center w-12 px-1">
                   <span className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-none">{current}</span>
                   <div className="h-px w-full bg-gray-300 dark:bg-gray-500 my-0.5"></div>
                   <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-none font-medium">{ideal}</span>
                </div>
                <button 
                   onClick={(e) => { e.stopPropagation(); onUpdateQuantity && onUpdateQuantity(item.id, 1); }}
                   className={`w-8 h-8 flex items-center justify-center rounded-md transition-all active:scale-95 ${isViewer ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 hover:text-green-500 hover:shadow-sm'}`}
                   disabled={isViewer}
                >
                  +
                </button>
             </div>
             {!isViewer && (
                 <button onClick={() => onDelete(item.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors focus:outline-none"><TrashIcon /></button>
             )}
          </div>
        </Reorder.Item>
      );
  }

  const quantity = item.quantity || 1;
  const hasPrice = item.price !== undefined && item.price > 0;
  const totalItemPrice = hasPrice ? (item.price! * quantity) : 0;

  return (
      <Reorder.Item
        value={item}
        id={item.id}
        dragListener={false}
        dragControls={dragControls}
        className={`group bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between ${item.completed ? 'opacity-60 bg-gray-50 dark:bg-gray-800/50' : ''}`}
      >
        <div className="flex items-center gap-2 flex-1 overflow-hidden">
          {/* Handle para Drag (Só aparece se não estiver completo, pois itens completos vão pro fim e não arrastam) */}
          {!isViewer && !item.completed && (
            <div 
                onPointerDown={(e) => dragControls.start(e)}
                className="touch-none p-1 -ml-1"
            >
                <DragHandleIcon />
            </div>
          )}

          <div className="flex items-center gap-3 flex-1 overflow-hidden">
            <button
                onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
                disabled={isViewer}
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                isViewer 
                    ? 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 cursor-not-allowed'
                    : (item.completed ? 'bg-brand-500 border-brand-500' : 'border-gray-300 dark:border-gray-500 hover:border-brand-400')
                }`}
            >
                {item.completed && <CheckIcon />}
            </button>
            
            <div 
                className={`flex flex-col overflow-hidden flex-1 ${!isViewer ? 'cursor-pointer' : ''}`}
                onClick={() => !isViewer && onEdit(item)}
            >
                <div className="flex items-center gap-2">
                <span className={`text-base font-medium truncate ${item.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                    {item.name}
                </span>
                {quantity > 1 && (
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                    x{quantity}
                    </span>
                )}
                </div>
                
                <div className="flex items-center gap-2 mt-0.5">
                {!groupByCategory && item.category && (
                    <span className={`text-[10px] uppercase tracking-wider font-bold w-fit px-1.5 py-0.5 rounded ${palette.bg} ${palette.text}`}>
                    {item.category}
                    </span>
                )}
                {hasPrice && (
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {formatCurrency(totalItemPrice)}
                    </span>
                )}
                </div>
            </div>
          </div>
        </div>

        {!isViewer && (
            <div className="flex items-center gap-1">
            <button onClick={() => onEdit(item)} className="p-2 text-gray-400 hover:text-brand-500 transition-colors focus:outline-none"><EditIcon /></button>
            <button onClick={() => onDelete(item.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors focus:outline-none"><TrashIcon /></button>
            </div>
        )}
      </Reorder.Item>
  );
};


export const ShoppingList: React.FC<ShoppingListProps> = ({ 
  items, 
  categories, 
  groupByCategory, 
  sortBy, 
  onToggle, 
  onDelete, 
  onEdit,
  onReorder,
  isPantry = false,
  onUpdateQuantity,
  isViewer = false
}) => {
  
  const getPantryStatus = (current: number, ideal: number) => {
    if (current <= 0) return { color: 'bg-red-500', border: 'border-red-500', label: 'Esgotado' };
    const ratio = current / (ideal || 1);
    if (ratio < 0.35) return { color: 'bg-red-400', border: 'border-red-400', label: 'Crítico' };
    if (ratio < 1) return { color: 'bg-yellow-400', border: 'border-yellow-400', label: 'Baixo' };
    return { color: 'bg-green-500', border: 'border-green-500', label: 'Ideal' };
  };

  const renderStaticItem = (item: ShoppingItem) => {
    const category = categories.find(c => c.name === item.category) || 
                     categories.find(c => c.name === 'Outros');
    
    const palette = category 
      ? (COLOR_PALETTES.find(p => p.id === category.colorId) || DEFAULT_COLOR) 
      : DEFAULT_COLOR;
    
    if (isPantry) {
      const current = item.currentQuantity || 0;
      const ideal = item.idealQuantity || 1;
      const status = getPantryStatus(current, ideal);

      return (
        <li 
          key={item.id} 
          className="group bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between transition-all duration-200 hover:shadow-md"
        >
          <div className="flex items-center gap-3 flex-1 overflow-hidden" onClick={() => !isViewer && onEdit(item)}>
             <div className="flex flex-col items-center justify-center gap-1 min-w-[32px]">
                <div className={`w-3 h-3 rounded-full ${status.color} shadow-sm`} title={status.label} />
             </div>
             <div className={`flex flex-col overflow-hidden flex-1 ${!isViewer ? 'cursor-pointer' : ''}`}>
                <span className="text-base font-medium text-gray-800 dark:text-gray-200 truncate">{item.name}</span>
                <div className="flex items-center gap-2 mt-0.5">
                   {!groupByCategory && item.category && (
                    <span className={`text-[10px] uppercase tracking-wider font-bold w-fit px-1.5 py-0.5 rounded ${palette.bg} ${palette.text}`}>
                      {item.category}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400 font-medium hidden sm:inline-block">Status: {status.label}</span>
                </div>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-0.5">
                <button 
                  onClick={(e) => { e.stopPropagation(); onUpdateQuantity && onUpdateQuantity(item.id, -1); }}
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-all active:scale-95 ${isViewer ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 hover:text-red-500 hover:shadow-sm'}`}
                  disabled={current <= 0 || isViewer}
                >
                  -
                </button>
                <div className="flex flex-col items-center w-12 px-1">
                   <span className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-none">{current}</span>
                   <div className="h-px w-full bg-gray-300 dark:bg-gray-500 my-0.5"></div>
                   <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-none font-medium">{ideal}</span>
                </div>
                <button 
                   onClick={(e) => { e.stopPropagation(); onUpdateQuantity && onUpdateQuantity(item.id, 1); }}
                   className={`w-8 h-8 flex items-center justify-center rounded-md transition-all active:scale-95 ${isViewer ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 hover:text-green-500 hover:shadow-sm'}`}
                   disabled={isViewer}
                >
                  +
                </button>
             </div>
             {!isViewer && (
                 <button onClick={() => onDelete(item.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors focus:outline-none"><TrashIcon /></button>
             )}
          </div>
        </li>
      );
    }

    const quantity = item.quantity || 1;
    const hasPrice = item.price !== undefined && item.price > 0;
    const totalItemPrice = hasPrice ? (item.price! * quantity) : 0;
    
    return (
      <li 
        key={item.id} 
        className={`group bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between transition-all duration-200 hover:shadow-md ${item.completed ? 'opacity-60 bg-gray-50 dark:bg-gray-800/50' : ''}`}
      >
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
            disabled={isViewer}
            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              isViewer 
                ? 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 cursor-not-allowed'
                : (item.completed ? 'bg-brand-500 border-brand-500' : 'border-gray-300 dark:border-gray-500 hover:border-brand-400')
            }`}
          >
            {item.completed && <CheckIcon />}
          </button>
          
          <div 
            className={`flex flex-col overflow-hidden flex-1 ${!isViewer ? 'cursor-pointer' : ''}`}
            onClick={() => !isViewer && onEdit(item)}
          >
            <div className="flex items-center gap-2">
              <span className={`text-base font-medium truncate ${item.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                {item.name}
              </span>
              {quantity > 1 && (
                 <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                   x{quantity}
                 </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-0.5">
              {!groupByCategory && item.category && (
                <span className={`text-[10px] uppercase tracking-wider font-bold w-fit px-1.5 py-0.5 rounded ${palette.bg} ${palette.text}`}>
                  {item.category}
                </span>
              )}
              {hasPrice && (
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {formatCurrency(totalItemPrice)}
                </span>
              )}
            </div>
          </div>
        </div>

        {!isViewer && (
            <div className="flex items-center gap-1">
            <button onClick={() => onEdit(item)} className="p-2 text-gray-400 hover:text-brand-500 transition-colors focus:outline-none"><EditIcon /></button>
            <button onClick={() => onDelete(item.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors focus:outline-none"><TrashIcon /></button>
            </div>
        )}
      </li>
    );
  };

  const processedContent = useMemo(() => {
    // ------------------------------------------
    // MODE 1: MANUAL SORT + DRAG AND DROP
    // ------------------------------------------
    if (!groupByCategory && sortBy === 'manual') {
        const activeItems = items.filter(i => !i.completed);
        const completedItems = items.filter(i => i.completed);

        return (
            <div className="space-y-3 pb-4">
                {/* Active Items: Draggable */}
                <Reorder.Group 
                    axis="y" 
                    values={activeItems} 
                    onReorder={(newOrder) => {
                        // Merge active items in new order with completed items
                        if (onReorder) {
                            onReorder([...newOrder, ...completedItems]);
                        }
                    }}
                    className="space-y-3"
                >
                    {activeItems.map(item => (
                        <DraggableShoppingItem
                            key={item.id}
                            item={item}
                            categories={categories}
                            isPantry={isPantry}
                            isViewer={isViewer}
                            onToggle={onToggle}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onUpdateQuantity={onUpdateQuantity}
                            groupByCategory={groupByCategory}
                            getPantryStatus={getPantryStatus}
                        />
                    ))}
                </Reorder.Group>

                {/* Completed Items: Static */}
                {completedItems.length > 0 && (
                    <>
                        <div className="border-t border-gray-100 dark:border-gray-700 my-2 pt-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">
                            Concluídos
                        </div>
                        <ul className="space-y-3">
                            {completedItems.map(renderStaticItem)}
                        </ul>
                    </>
                )}
            </div>
        );
    }

    // ------------------------------------------
    // MODE 2: AUTO SORT (Grouped or Sorted by Name/Date)
    // ------------------------------------------
    const sortedItems = [...items].sort((a, b) => {
      // Primary Sort: Completion status (Unchecked first)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      
      // Secondary Sort
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'created') {
        return b.createdAt - a.createdAt;
      }
      return 0; // Should not reach here if manual handled above, but fallback
    });

    if (!groupByCategory) {
      return (
        <ul className="space-y-3 pb-4">
          {sortedItems.map(renderStaticItem)}
        </ul>
      );
    }

    // Group items logic
    const groups: React.ReactNode[] = [];
    const usedItemIds = new Set<string>();

    categories.forEach(cat => {
      const catItems = sortedItems.filter(i => i.category === cat.name);
      if (catItems.length > 0) {
        catItems.forEach(i => usedItemIds.add(i.id));
        
        const palette = COLOR_PALETTES.find(p => p.id === cat.colorId) || DEFAULT_COLOR;
        
        groups.push(
          <div key={cat.id} className="mb-6">
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ml-1 ${palette.text}`}>
              {cat.name}
            </h4>
            <ul className="space-y-2">
              {catItems.map(renderStaticItem)}
            </ul>
          </div>
        );
      }
    });

    // Handle uncategorized
    const remainingItems = sortedItems.filter(i => !usedItemIds.has(i.id));
    if (remainingItems.length > 0) {
      groups.push(
        <div key="uncategorized" className="mb-6">
           <h4 className="text-xs font-bold uppercase tracking-wider mb-2 ml-1 text-gray-500 dark:text-gray-400">
              Outros / Sem Categoria
            </h4>
            <ul className="space-y-2">
              {remainingItems.map(renderStaticItem)}
            </ul>
        </div>
      );
    }

    return <div>{groups}</div>;

  }, [items, categories, groupByCategory, sortBy, isPantry, onUpdateQuantity, isViewer, onReorder]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center opacity-60">
        <div className="bg-gray-200 dark:bg-gray-700 p-6 rounded-full mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-400">
            {isPantry ? (
               <path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.3 7l8.7 5 8.7-5M12 22v-9"/>
            ) : (
               <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></>
            )}
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          {isPantry ? "Dispensa vazia" : "Sua lista está vazia"}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {isPantry 
             ? "Adicione itens para controlar o estoque da sua casa."
             : "Adicione itens manualmente ou use a IA para gerar uma lista rapidinho."
          }
        </p>
      </div>
    );
  }

  return processedContent;
};