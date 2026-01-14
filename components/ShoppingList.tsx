
import React, { useMemo, useState, memo } from 'react';
import { ShoppingItem, Category, COLOR_PALETTES, DEFAULT_COLOR } from '../types';
import { Reorder, useDragControls, useMotionValue, useTransform, motion, PanInfo, AnimatePresence } from "framer-motion";

interface ShoppingListProps {
  items: ShoppingItem[];
  categories: Category[];
  groupByCategory: boolean;
  sortBy: 'created' | 'name' | 'manual';
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: ShoppingItem) => void;
  onReorder?: (items: ShoppingItem[]) => void;
  isPantry?: boolean;
  onUpdateQuantity?: (id: string, delta: number) => void;
  isViewer?: boolean;
  onOpenScan?: () => void;
  onOpenAI?: () => void;
}

// --- Icons ---
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"/></svg>
);
const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const UndoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
);
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
);
const DragHandleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
);
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>
);

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const getCategoryBarColor = (id: string) => {
    const colors: Record<string, string> = {
        green: 'bg-green-500', blue: 'bg-blue-500', red: 'bg-red-500', yellow: 'bg-yellow-500',
        purple: 'bg-purple-500', gray: 'bg-gray-400', pink: 'bg-pink-500', orange: 'bg-orange-500',
    };
    return colors[id] || 'bg-gray-400';
};

const getPantryStatus = (current: number, ideal: number) => {
    if (current <= 0) return { color: 'bg-red-500', border: 'border-red-500', label: 'Esgotado' };
    const ratio = current / (ideal || 1);
    if (ratio < 0.35) return { color: 'bg-red-400', border: 'border-red-400', label: 'Crítico' };
    if (ratio < 1) return { color: 'bg-yellow-400', border: 'border-yellow-400', label: 'Baixo' };
    return { color: 'bg-green-500', border: 'border-green-500', label: 'Ideal' };
};

// --- Swipe Logic Component ---
interface SwipeableItemProps {
    children: React.ReactNode;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    isViewer?: boolean;
    disableSwipe?: boolean;
    completed?: boolean;
}

const SwipeableItem = memo(({ 
    children, onSwipeLeft, onSwipeRight, isViewer, disableSwipe, completed
}: SwipeableItemProps) => {
    const x = useMotionValue(0);
    const rightOpacity = useTransform(x, [50, 100], [0, 1]);
    const rightScale = useTransform(x, [50, 100], [0.8, 1]);
    const leftOpacity = useTransform(x, [-50, -100], [0, 1]);
    const leftScale = useTransform(x, [-50, -100], [0.8, 1]);

    const handleDragEnd = (event: any, info: PanInfo) => {
        const threshold = 80;
        if (!isViewer && !disableSwipe) {
            if (onSwipeLeft && info.offset.x < -threshold) {
                onSwipeLeft();
            } else if (onSwipeRight && info.offset.x > threshold) {
                onSwipeRight();
            }
        }
    };

    if (isViewer || disableSwipe) return <>{children}</>;

    return (
        <div className="relative overflow-hidden rounded-xl">
            {onSwipeRight && (
                <motion.div 
                    style={{ opacity: rightOpacity, scale: rightScale }}
                    className={`absolute inset-y-0 left-0 w-full flex items-center justify-start pl-6 rounded-xl ${completed ? 'bg-blue-500' : 'bg-green-500'} text-white z-0`}
                >
                    {completed ? <UndoIcon /> : <CheckCircleIcon />}
                    <span className="font-bold ml-2 text-sm">{completed ? "Desmarcar" : "Concluir"}</span>
                </motion.div>
            )}
            {onSwipeLeft && (
                <motion.div 
                    style={{ opacity: leftOpacity, scale: leftScale }}
                    className="absolute inset-y-0 right-0 w-full flex items-center justify-end pr-6 rounded-xl bg-red-500 text-white z-0"
                >
                    <span className="font-bold mr-2 text-sm">Excluir</span>
                    <TrashIcon />
                </motion.div>
            )}
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: 0.5, right: 0.5 }}
                onDragEnd={handleDragEnd}
                style={{ x }}
                className="relative z-10 rounded-xl"
                whileTap={{ scale: 0.99 }}
            >
                {children}
            </motion.div>
        </div>
    );
});

// --- Item Row Content ---
const ShoppingItemRow = memo(({ 
    item, categories, isPantry, isViewer, onToggle, onEdit, onUpdateQuantity, groupByCategory, isDraggable, dragControls 
}: any) => {
    const category = categories.find((c: any) => c.name === item.category) || 
                     categories.find((c: any) => c.name === 'Outros');
    const barColorClass = getCategoryBarColor(category?.colorId || 'gray');

    // PANTRY VIEW
    if (isPantry) {
        const current = item.currentQuantity || 0;
        const ideal = item.idealQuantity || 1;
        const status = getPantryStatus(current, ideal);

        return (
          <div className={`relative group backdrop-blur-sm p-3 flex items-center justify-between border border-gray-100 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm transition-all duration-300`}>
            <div className="flex items-center gap-2 flex-1 overflow-hidden">
               {isDraggable && !isViewer && (
                  <div onPointerDown={(e) => dragControls?.start(e)} className="touch-none p-1 -ml-1 cursor-grab active:cursor-grabbing text-gray-300">
                      <DragHandleIcon />
                  </div>
               )}
               <div className="flex items-center gap-3 flex-1 overflow-hidden" onClick={() => !isViewer && onEdit(item)}>
                  <div className="flex flex-col items-center justify-center gap-1 min-w-[32px]">
                      <div className={`w-3 h-3 rounded-full ${status.color}`} title={status.label} />
                  </div>
                  <div className={`flex flex-col overflow-hidden flex-1 ${!isViewer ? 'cursor-pointer' : ''}`}>
                      <span className="text-base font-medium text-gray-800 dark:text-gray-200 truncate">{item.name}</span>
                      <span className="text-[10px] text-gray-400 font-medium">Estoque: {current} / {ideal}</span>
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-0.5">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateQuantity && onUpdateQuantity(item.id, -1); }}
                    className={`w-8 h-8 flex items-center justify-center rounded-md transition-all active:scale-95 ${isViewer ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 hover:text-red-500 hover:shadow-sm'}`}
                    disabled={current <= 0 || isViewer}
                  > - </button>
                  <div className="flex flex-col items-center w-8">
                     <span className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-none">{current}</span>
                  </div>
                  <button 
                     onClick={(e) => { e.stopPropagation(); onUpdateQuantity && onUpdateQuantity(item.id, 1); }}
                     className={`w-8 h-8 flex items-center justify-center rounded-md transition-all active:scale-95 ${isViewer ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 hover:text-green-500 hover:shadow-sm'}`}
                     disabled={isViewer}
                  > + </button>
               </div>
            </div>
          </div>
        );
    }

    // SHOPPING LIST VIEW
    const quantity = item.quantity || 1;
    const totalValue = item.price ? (item.price * quantity) : 0;
    const formattedPrice = totalValue > 0 ? formatCurrency(totalValue) : null;

    return (
      <div className={`group relative flex items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md overflow-hidden ${item.completed ? 'opacity-60 bg-gray-50 dark:bg-gray-900/50' : ''}`}>
        <div className={`absolute left-0 inset-y-0 w-1 ${item.completed ? 'bg-gray-300 dark:bg-gray-600' : barColorClass}`} />
        <div 
          className="pl-4 pr-3 py-4 cursor-pointer flex-shrink-0 flex items-center h-full"
          onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
        >
           {isDraggable && !isViewer && !item.completed && (
              <div onPointerDown={(e) => dragControls?.start(e)} className="touch-none mr-2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
                  <DragHandleIcon />
              </div>
           )}
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all relative ${item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-500 group-hover:border-brand-400'}`}>
              {item.completed && <CheckIcon />}
          </div>
        </div>
        <div 
          className="flex-1 min-w-0 py-3 pr-2 cursor-pointer flex flex-col justify-center" 
          onClick={() => !isViewer && onEdit(item)}
        >
          <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-base font-medium truncate leading-tight ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                  {item.name}
              </span>
              {quantity > 1 && (
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600">{quantity}un</span>
              )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate">
              {!groupByCategory && (
                  <span className="uppercase font-bold tracking-wider text-[9px] text-gray-400">{item.category || 'Geral'}</span>
              )}
              {!groupByCategory && item.note && <span className="text-[8px] text-gray-300">•</span>}
              {item.note && <span className="italic truncate max-w-[150px]">{item.note}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end justify-center pr-4 pl-2 py-2 gap-1 text-right border-l border-transparent group-hover:border-gray-50 dark:group-hover:border-gray-700 transition-colors h-full min-w-[70px]">
            {formattedPrice && (
                <span className={`font-bold text-sm tabular-nums tracking-tight ${item.completed ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>{formattedPrice}</span>
            )}
            {!formattedPrice && !isViewer && (
               <span className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"><EditIcon /></span>
            )}
        </div>
      </div>
    );
});

const itemVariants = {
  hidden: { opacity: 0, y: 10, height: 0, marginBottom: 0 },
  visible: { opacity: 1, y: 0, height: "auto", marginBottom: 8, transition: { type: "spring", stiffness: 300, damping: 24 } },
  exit: { opacity: 0, height: 0, marginBottom: 0, scale: 0.95, overflow: "hidden", transition: { duration: 0.2, ease: "easeOut" } }
};

const StaticShoppingItem = memo(({ item, categories, isPantry, isViewer, onToggle, onEdit, onDelete, onUpdateQuantity, groupByCategory }: any) => {
    return (
        <motion.li layout variants={itemVariants} initial="hidden" animate="visible" exit="exit" className="rounded-xl">
             <SwipeableItem isViewer={isViewer} onSwipeLeft={() => onDelete(item.id)} onSwipeRight={isPantry ? undefined : () => onToggle(item.id)} completed={item.completed}>
                <ShoppingItemRow item={item} categories={categories} isPantry={isPantry} isViewer={isViewer} onToggle={onToggle} onEdit={onEdit} onUpdateQuantity={onUpdateQuantity} groupByCategory={groupByCategory} isDraggable={false} />
             </SwipeableItem>
        </motion.li>
    );
});

const DraggableShoppingItem = memo(({ item, categories, isPantry, isViewer, onToggle, onEdit, onDelete, onUpdateQuantity, groupByCategory }: any) => {
  const dragControls = useDragControls();
  return (
    <Reorder.Item value={item} id={item.id} dragListener={false} dragControls={dragControls} variants={itemVariants} initial="hidden" animate="visible" exit="exit" className="relative rounded-xl my-2">
         <SwipeableItem isViewer={isViewer} onSwipeLeft={() => onDelete(item.id)} onSwipeRight={isPantry ? undefined : () => onToggle(item.id)} completed={item.completed}>
            <ShoppingItemRow item={item} categories={categories} isPantry={isPantry} isViewer={isViewer} onToggle={onToggle} onEdit={onEdit} onUpdateQuantity={onUpdateQuantity} groupByCategory={groupByCategory} isDraggable={true} dragControls={dragControls} />
         </SwipeableItem>
    </Reorder.Item>
  );
});

// --- Main Component ---
export const ShoppingList: React.FC<ShoppingListProps> = ({ 
  items, categories, groupByCategory, sortBy, onToggle, onDelete, onEdit, onReorder, isPantry = false, onUpdateQuantity, isViewer = false, onOpenScan, onOpenAI
}) => {
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);

  const toggleCategory = (catName: string) => {
    setCollapsedCategories(prev => prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]);
  };

  const processedContent = useMemo(() => {
    // MODE 1: MANUAL SORT
    if (!groupByCategory && sortBy === 'manual') {
        const activeItems = items.filter(i => !i.completed);
        const completedItems = items.filter(i => i.completed);
        return (
            <div className="space-y-3 pb-32">
                <Reorder.Group axis="y" values={activeItems} onReorder={(newOrder) => { if (onReorder) onReorder([...newOrder, ...completedItems]); }} className="space-y-2">
                    <AnimatePresence initial={false} mode='popLayout'>
                        {activeItems.map(item => (
                            <DraggableShoppingItem key={item.id} item={item} categories={categories} isPantry={isPantry} isViewer={isViewer} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onUpdateQuantity={onUpdateQuantity} groupByCategory={groupByCategory} />
                        ))}
                    </AnimatePresence>
                </Reorder.Group>
                {completedItems.length > 0 && (
                    <>
                        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-gray-100 dark:border-gray-700 my-4 pt-4 flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest bg-gray-50 dark:bg-gray-900 px-3 -mt-7">Concluídos</span>
                        </motion.div>
                        <ul className="space-y-2">
                            <AnimatePresence initial={false} mode='popLayout'>
                                {completedItems.map(item => (
                                    <StaticShoppingItem key={item.id} item={item} categories={categories} isPantry={isPantry} isViewer={isViewer} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onUpdateQuantity={onUpdateQuantity} groupByCategory={groupByCategory} />
                                ))}
                            </AnimatePresence>
                        </ul>
                    </>
                )}
            </div>
        );
    }

    // MODE 2: AUTO SORT
    const sortedItems = [...items].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'created') return b.createdAt - a.createdAt;
      return 0;
    });

    if (!groupByCategory) {
      return (
        <ul className="space-y-2 pb-32">
           <AnimatePresence initial={false} mode='popLayout'>
              {sortedItems.map(item => (
                  <StaticShoppingItem key={item.id} item={item} categories={categories} isPantry={isPantry} isViewer={isViewer} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onUpdateQuantity={onUpdateQuantity} groupByCategory={groupByCategory} />
              ))}
          </AnimatePresence>
        </ul>
      );
    }

    // GROUPED
    const groups: React.ReactNode[] = [];
    const usedItemIds = new Set<string>();
    const sortedCategories = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));

    sortedCategories.forEach(cat => {
      const catItems = sortedItems.filter(i => i.category === cat.name);
      if (catItems.length > 0) {
        catItems.forEach(i => usedItemIds.add(i.id));
        const palette = COLOR_PALETTES.find(p => p.id === cat.colorId) || DEFAULT_COLOR;
        const isCollapsed = collapsedCategories.includes(cat.name);
        const completedCount = catItems.filter(i => i.completed).length;
        const sidebarColor = getCategoryBarColor(palette.id || 'gray').replace('bg-', 'text-');

        groups.push(
          <motion.div layout key={cat.name} className="mb-4">
            <button onClick={() => toggleCategory(cat.name)} className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors group mb-2 ${isCollapsed ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
               <div className="flex items-center gap-2">
                  <motion.div animate={{ rotate: isCollapsed ? -90 : 0 }} className="text-gray-400"><ChevronDownIcon /></motion.div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${sidebarColor} opacity-80`}>{cat.name}</h4>
               </div>
               <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${completedCount === catItems.length ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>{completedCount}/{catItems.length}</span>
               </div>
            </button>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-2 overflow-hidden pl-1">
                    <AnimatePresence initial={false} mode='popLayout'>
                      {catItems.map(item => (
                          <StaticShoppingItem key={item.id} item={item} categories={categories} isPantry={isPantry} isViewer={isViewer} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onUpdateQuantity={onUpdateQuantity} groupByCategory={groupByCategory} />
                      ))}
                    </AnimatePresence>
                </motion.ul>
              )}
            </AnimatePresence>
          </motion.div>
        );
      }
    });

    const remainingItems = sortedItems.filter(i => !usedItemIds.has(i.id));
    if (remainingItems.length > 0) {
        // Render Outros group... (simplified for brevity, logic same as above)
        const isCollapsed = collapsedCategories.includes('Outros');
        const completedCount = remainingItems.filter(i => i.completed).length;
        groups.push(
          <motion.div layout key="Outros" className="mb-4">
            <button onClick={() => toggleCategory('Outros')} className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors group mb-2 ${isCollapsed ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
               <div className="flex items-center gap-2">
                  <motion.div animate={{ rotate: isCollapsed ? -90 : 0 }} className="text-gray-400"><ChevronDownIcon /></motion.div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 opacity-80`}>Outros</h4>
               </div>
               <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${completedCount === remainingItems.length ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>{completedCount}/{remainingItems.length}</span>
               </div>
            </button>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-2 overflow-hidden pl-1">
                    <AnimatePresence initial={false} mode='popLayout'>
                      {remainingItems.map(item => (
                          <StaticShoppingItem key={item.id} item={item} categories={categories} isPantry={isPantry} isViewer={isViewer} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onUpdateQuantity={onUpdateQuantity} groupByCategory={groupByCategory} />
                      ))}
                    </AnimatePresence>
                </motion.ul>
              )}
            </AnimatePresence>
          </motion.div>
        );
    }

    return <div className="pb-32">{groups}</div>;
  }, [items, categories, groupByCategory, sortBy, isPantry, onUpdateQuantity, isViewer, onReorder, collapsedCategories]);

  // ZERO DATA STATE
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-6 animate-fade-in text-center">
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full mb-4 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">{isPantry ? "Dispensa Vazia" : "Lista Vazia"}</h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto mt-1">{isPantry ? "Adicione itens para controlar seu estoque." : "Comece adicionando itens ou use nossos aceleradores:"}</p>
        </div>
        {!isViewer && !isPantry && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                <button onClick={onOpenAI} className="flex flex-col items-center p-5 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-sm group">
                    <div className="w-12 h-12 bg-white dark:bg-purple-800 rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:shadow-md text-purple-600 dark:text-purple-300"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg></div>
                    <span className="font-bold text-purple-700 dark:text-purple-300 text-sm">Gerar com IA</span>
                    <span className="text-xs text-purple-500/80 dark:text-purple-400 text-center mt-1">Crie listas para receitas ou eventos</span>
                </button>
                <button onClick={onOpenScan} className="flex flex-col items-center p-5 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-sm group">
                    <div className="w-12 h-12 bg-white dark:bg-green-800 rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:shadow-md text-green-600 dark:text-green-300"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg></div>
                    <span className="font-bold text-green-700 dark:text-green-300 text-sm">Escanear Nota</span>
                    <span className="text-xs text-green-500/80 dark:text-green-400 text-center mt-1">Importe itens de um cupom fiscal</span>
                </button>
            </div>
        )}
        <div className="mt-8 animate-bounce text-gray-300 dark:text-gray-600" onClick={() => document.querySelector('input')?.focus()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
        </div>
      </div>
    );
  }

  return processedContent;
};
