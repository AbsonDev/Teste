
import React, { useMemo, useState } from 'react';
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
}

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

const UndoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>
);

const DragHandleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing">
    <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>
);

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

// Helper to get strong sidebar color
const getCategoryBarColor = (id: string) => {
    const colors: Record<string, string> = {
        green: 'bg-green-500',
        blue: 'bg-blue-500',
        red: 'bg-red-500',
        yellow: 'bg-yellow-500',
        purple: 'bg-purple-500',
        gray: 'bg-gray-400',
        pink: 'bg-pink-500',
        orange: 'bg-orange-500',
    };
    return colors[id] || 'bg-gray-400';
};

// --- Illustration Components ---

const EmptyCartIllustration = () => (
  <svg width="160" height="160" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="80" className="fill-brand-100 dark:fill-brand-900/30" fillOpacity="0.5"/>
    <path d="M65 70L80 130H140L155 70H65Z" className="fill-white dark:fill-gray-800 stroke-brand-500 dark:stroke-brand-500" strokeWidth="4" strokeLinejoin="round"/>
    <path d="M90 130V140C90 145.523 94.4772 150 100 150H120C125.523 150 130 145.523 130 140V130" className="stroke-brand-600 dark:stroke-brand-400" strokeWidth="4"/>
    <circle cx="85" cy="155" r="8" className="fill-brand-700 dark:fill-brand-500"/>
    <circle cx="135" cy="155" r="8" className="fill-brand-700 dark:fill-brand-500"/>
    <path d="M110 50V70" className="stroke-brand-600 dark:stroke-brand-400" strokeWidth="4" strokeLinecap="round"/>
    <path d="M125 55V70" className="stroke-brand-600 dark:stroke-brand-400" strokeWidth="4" strokeLinecap="round"/>
    <path d="M95 55V70" className="stroke-brand-600 dark:stroke-brand-400" strokeWidth="4" strokeLinecap="round"/>
    <path d="M70 100H150" className="stroke-brand-100 dark:stroke-brand-900/50" strokeWidth="2"/>
    <path d="M75 115H145" className="stroke-brand-100 dark:stroke-brand-900/50" strokeWidth="2"/>
    <path d="M60 70H160" className="stroke-brand-500 dark:stroke-brand-400" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

const EmptyPantryIllustration = () => (
  <svg width="160" height="160" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="80" className="fill-orange-100 dark:fill-orange-900/30" fillOpacity="0.5"/>
    <rect x="50" y="80" width="100" height="60" rx="4" className="fill-white dark:fill-gray-800 stroke-orange-500 dark:stroke-orange-500" strokeWidth="4"/>
    <path d="M50 80L70 60H130L150 80" className="stroke-orange-600 dark:stroke-orange-400" strokeWidth="4" strokeLinejoin="round"/>
    <path d="M80 80V140" className="stroke-orange-300 dark:stroke-orange-700" strokeWidth="2"/>
    <path d="M120 80V140" className="stroke-orange-300 dark:stroke-orange-700" strokeWidth="2"/>
    <rect x="90" y="40" width="20" height="30" rx="2" className="fill-orange-300 dark:fill-orange-600 stroke-orange-700 dark:stroke-orange-300" strokeWidth="3"/>
    <rect x="120" y="45" width="20" height="25" rx="2" className="fill-orange-300 dark:fill-orange-600 stroke-orange-700 dark:stroke-orange-300" strokeWidth="3"/>
    <path d="M40 145H160" className="stroke-orange-800 dark:stroke-orange-300" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

// --- Swipe Logic Component ---
interface SwipeableItemProps {
    children: React.ReactNode;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    isViewer?: boolean;
    disableSwipe?: boolean;
    completed?: boolean;
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({ 
    children, 
    onSwipeLeft, 
    onSwipeRight, 
    isViewer, 
    disableSwipe,
    completed
}) => {
    const x = useMotionValue(0);
    const containerRef = React.useRef<HTMLDivElement>(null);

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
        <div className="relative overflow-hidden rounded-xl" ref={containerRef}>
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
};

// --- Internal Components ---

const itemVariants = {
  hidden: { opacity: 0, y: 10, height: 0, marginBottom: 0 },
  visible: { 
    opacity: 1, 
    y: 0, 
    height: "auto", 
    marginBottom: 8, 
    transition: { type: "spring", stiffness: 300, damping: 24 } 
  },
  exit: { 
    opacity: 0, 
    height: 0, 
    marginBottom: 0, 
    scale: 0.95,
    overflow: "hidden",
    transition: { duration: 0.2, ease: "easeOut" } 
  }
};

const StaticShoppingItem = ({
    item, 
    categories, 
    isPantry, 
    isViewer, 
    onToggle, 
    onEdit, 
    onDelete, 
    onUpdateQuantity,
    groupByCategory,
    getPantryStatus,
    renderContent
}: any) => {
    return (
        <motion.li 
          layout
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="rounded-xl"
        >
             <SwipeableItem
                isViewer={isViewer}
                onSwipeLeft={() => onDelete(item.id)}
                onSwipeRight={isPantry ? undefined : () => onToggle(item.id)}
                completed={item.completed}
             >
                {renderContent(item, categories, isPantry, isViewer, onToggle, onEdit, onUpdateQuantity, groupByCategory, getPantryStatus, false)}
             </SwipeableItem>
        </motion.li>
    );
}

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
  getPantryStatus,
  renderContent
}: any) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
        value={item}
        id={item.id}
        dragListener={false}
        dragControls={dragControls}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative rounded-xl my-2"
    >
         <SwipeableItem
            isViewer={isViewer}
            onSwipeLeft={() => onDelete(item.id)}
            onSwipeRight={isPantry ? undefined : () => onToggle(item.id)}
            completed={item.completed}
         >
            {renderContent(item, categories, isPantry, isViewer, onToggle, onEdit, onUpdateQuantity, groupByCategory, getPantryStatus, true, dragControls)}
         </SwipeableItem>
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
  
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);

  const toggleCategory = (catName: string) => {
    setCollapsedCategories(prev => 
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const getPantryStatus = (current: number, ideal: number) => {
    if (current <= 0) return { color: 'bg-red-500', border: 'border-red-500', label: 'Esgotado' };
    const ratio = current / (ideal || 1);
    if (ratio < 0.35) return { color: 'bg-red-400', border: 'border-red-400', label: 'Crítico' };
    if (ratio < 1) return { color: 'bg-yellow-400', border: 'border-yellow-400', label: 'Baixo' };
    return { color: 'bg-green-500', border: 'border-green-500', label: 'Ideal' };
  };

  // CLEAN DESIGN RENDERER
  const renderItemContent = (
      item: ShoppingItem, 
      categories: Category[], 
      isPantry: boolean, 
      isViewer: boolean, 
      onToggle: any, 
      onEdit: any, 
      onUpdateQuantity: any, 
      groupByCategory: boolean, 
      getPantryStatus: any, 
      isDraggable: boolean, 
      dragControls?: any
  ) => {
      const category = categories.find((c: any) => c.name === item.category) || 
                       categories.find((c: any) => c.name === 'Outros');
      // Sidebar color ID logic
      const barColorClass = getCategoryBarColor(category?.colorId || 'gray');

      // --- PANTRY VIEW ---
      if (isPantry) {
          const current = item.currentQuantity || 0;
          const ideal = item.idealQuantity || 1;
          const status = getPantryStatus(current, ideal);

          return (
            <div className={`relative group backdrop-blur-sm p-3 flex items-center justify-between border border-gray-100 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm transition-all duration-300`}>
              <div className="flex items-center gap-2 flex-1 overflow-hidden">
                 {/* Drag Handle */}
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
                    >
                      -
                    </button>
                    <div className="flex flex-col items-center w-8">
                       <span className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-none">{current}</span>
                    </div>
                    <button 
                       onClick={(e) => { e.stopPropagation(); onUpdateQuantity && onUpdateQuantity(item.id, 1); }}
                       className={`w-8 h-8 flex items-center justify-center rounded-md transition-all active:scale-95 ${isViewer ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 hover:text-green-500 hover:shadow-sm'}`}
                       disabled={isViewer}
                    >
                      +
                    </button>
                 </div>
              </div>
            </div>
          );
      }

      // --- SHOPPING LIST VIEW (RIGID 3-COLUMN GRID) ---
      const quantity = item.quantity || 1;
      const totalValue = item.price ? (item.price * quantity) : 0;
      const formattedPrice = totalValue > 0 ? formatCurrency(totalValue) : null;

      return (
        <div 
            className={`group relative flex items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md overflow-hidden ${item.completed ? 'opacity-60 bg-gray-50 dark:bg-gray-900/50' : ''}`}
        >
          {/* A. VISUAL INDICATOR (Absolute Sidebar) */}
          <div className={`absolute left-0 inset-y-0 w-1 ${item.completed ? 'bg-gray-300 dark:bg-gray-600' : barColorClass}`} />

          {/* B. CHECKBOX COLUMN (Fixed width, generous click area) */}
          <div 
            className="pl-4 pr-3 py-4 cursor-pointer flex-shrink-0 flex items-center h-full"
            onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
          >
             {/* Drag Handle (Conditional) */}
             {isDraggable && !isViewer && !item.completed && (
                <div onPointerDown={(e) => dragControls?.start(e)} className="touch-none mr-2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
                    <DragHandleIcon />
                </div>
             )}

            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all relative ${
                item.completed 
                ? 'bg-green-500 border-green-500' 
                : 'border-gray-300 dark:border-gray-500 group-hover:border-brand-400'
            }`}>
                {item.completed && <CheckIcon />}
            </div>
          </div>

          {/* C. CONTENT COLUMN (Flexible) */}
          <div 
            className="flex-1 min-w-0 py-3 pr-2 cursor-pointer flex flex-col justify-center" 
            onClick={() => !isViewer && onEdit(item)}
          >
            {/* Top Row: Name and Quantity */}
            <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-base font-medium truncate leading-tight ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                    {item.name}
                </span>
                
                {quantity > 1 && (
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600">
                        {quantity}un
                    </span>
                )}
            </div>

            {/* Bottom Row: Metadata (Category • Note) */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate">
                {!groupByCategory && (
                    <span className="uppercase font-bold tracking-wider text-[9px] text-gray-400">
                        {item.category || 'Geral'}
                    </span>
                )}
                
                {!groupByCategory && item.note && (
                    <span className="text-[8px] text-gray-300">•</span>
                )}

                {item.note && (
                    <span className="italic truncate max-w-[150px]">{item.note}</span>
                )}
            </div>
          </div>

          {/* D. PRICE/ACTION COLUMN (Right aligned) */}
          <div className="flex flex-col items-end justify-center pr-4 pl-2 py-2 gap-1 text-right border-l border-transparent group-hover:border-gray-50 dark:group-hover:border-gray-700 transition-colors h-full min-w-[70px]">
              
              {/* Price */}
              {formattedPrice && (
                  <span className={`font-bold text-sm tabular-nums tracking-tight ${item.completed ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                      {formattedPrice}
                  </span>
              )}

              {/* Edit Hint / No Price Placeholder */}
              {!formattedPrice && !isViewer && (
                 <span className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <EditIcon />
                 </span>
              )}
          </div>
        </div>
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
            <div className="space-y-3 pb-32">
                {/* Active Items: Draggable */}
                <Reorder.Group 
                    axis="y" 
                    values={activeItems} 
                    onReorder={(newOrder) => {
                        if (onReorder) {
                            onReorder([...newOrder, ...completedItems]);
                        }
                    }}
                    className="space-y-2"
                >
                    <AnimatePresence initial={false} mode='popLayout'>
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
                                renderContent={renderItemContent}
                            />
                        ))}
                    </AnimatePresence>
                </Reorder.Group>

                {/* Completed Items: Static */}
                {completedItems.length > 0 && (
                    <>
                        <motion.div 
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-t border-gray-100 dark:border-gray-700 my-4 pt-4 flex items-center justify-center"
                        >
                            <span className="text-xs font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest bg-gray-50 dark:bg-gray-900 px-3 -mt-7">Concluídos</span>
                        </motion.div>
                        <ul className="space-y-2">
                            <AnimatePresence initial={false} mode='popLayout'>
                                {completedItems.map(item => (
                                    <StaticShoppingItem
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
                                        renderContent={renderItemContent}
                                    />
                                ))}
                            </AnimatePresence>
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
      return 0;
    });

    if (!groupByCategory) {
      return (
        <ul className="space-y-2 pb-32">
           <AnimatePresence initial={false} mode='popLayout'>
              {sortedItems.map(item => (
                  <StaticShoppingItem
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
                    renderContent={renderItemContent}
                  />
              ))}
          </AnimatePresence>
        </ul>
      );
    }

    // Group items logic
    const groups: React.ReactNode[] = [];
    const usedItemIds = new Set<string>();

    const renderGroup = (groupName: string, groupItems: ShoppingItem[], palette: any) => {
        const isCollapsed = collapsedCategories.includes(groupName);
        const completedCount = groupItems.filter(i => i.completed).length;
        const totalCount = groupItems.length;
        const sidebarColor = getCategoryBarColor(palette.id || 'gray').replace('bg-', 'text-');
        
        return (
          <motion.div layout key={groupName} className="mb-4">
            <button 
              onClick={() => toggleCategory(groupName)}
              className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors group mb-2
                ${isCollapsed ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
            >
               <div className="flex items-center gap-2">
                  <motion.div 
                    animate={{ rotate: isCollapsed ? -90 : 0 }}
                    className="text-gray-400"
                  >
                     <ChevronDownIcon />
                  </motion.div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${sidebarColor} opacity-80`}>
                    {groupName}
                  </h4>
               </div>
               
               <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${completedCount === totalCount ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                     {completedCount}/{totalCount}
                  </span>
               </div>
            </button>

            <AnimatePresence>
              {!isCollapsed && (
                <motion.ul 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2 overflow-hidden pl-1"
                >
                    <AnimatePresence initial={false} mode='popLayout'>
                      {groupItems.map(item => (
                          <StaticShoppingItem
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
                            renderContent={renderItemContent}
                          />
                      ))}
                    </AnimatePresence>
                </motion.ul>
              )}
            </AnimatePresence>
          </motion.div>
        );
    }

    // Sort categories based on order property
    const sortedCategories = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));

    sortedCategories.forEach(cat => {
      const catItems = sortedItems.filter(i => i.category === cat.name);
      if (catItems.length > 0) {
        catItems.forEach(i => usedItemIds.add(i.id));
        const palette = COLOR_PALETTES.find(p => p.id === cat.colorId) || DEFAULT_COLOR;
        groups.push(renderGroup(cat.name, catItems, palette));
      }
    });

    const remainingItems = sortedItems.filter(i => !usedItemIds.has(i.id));
    if (remainingItems.length > 0) {
      groups.push(renderGroup('Outros', remainingItems, { id: 'gray', text: 'text-gray-500 dark:text-gray-400' }));
    }

    return <div className="pb-32">{groups}</div>;

  }, [items, categories, groupByCategory, sortBy, isPantry, onUpdateQuantity, isViewer, onReorder, collapsedCategories]);

  // ... (Empty state logic remains the same)
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 select-none animate-fade-in">
        <div className="relative mb-6">
            {isPantry ? (
                <div className="w-40 h-40 flex items-center justify-center mx-auto opacity-90 transition-transform hover:scale-105 duration-300">
                   <EmptyPantryIllustration />
                </div>
            ) : (
                <div className="w-40 h-40 flex items-center justify-center mx-auto opacity-90 transition-transform hover:scale-105 duration-300">
                   <EmptyCartIllustration />
                </div>
            )}
        </div>

        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
          {isPantry ? "Sua dispensa está vazia" : "O que vamos comprar?"}
        </h3>
        
        <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-12 text-sm leading-relaxed">
          {isPantry 
             ? "Controle o que você tem em casa para evitar desperdícios." 
             : "Adicione itens manualmente ou use a IA para planejar suas refeições."
          }
        </p>

        {!isViewer && (
            <div className="animate-bounce text-brand-600 dark:text-brand-400 flex flex-col items-center gap-2 opacity-90 cursor-pointer" onClick={() => document.querySelector('input')?.focus()}>
              <span className="text-sm font-bold bg-brand-50 dark:bg-brand-900/30 px-3 py-1 rounded-full">
                {isPantry ? "Comece por aqui" : "Adicione seu primeiro item aqui"}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
            </div>
        )}
      </div>
    );
  }

  return processedContent;
};
