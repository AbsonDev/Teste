import React, { useMemo } from 'react';
import { ShoppingItem, Category, COLOR_PALETTES, DEFAULT_COLOR } from '../types';
import { Reorder, useDragControls, useMotionValue, useTransform, motion, PanInfo, AnimatePresence } from "framer-motion";
import { useTranslation } from 'react-i18next';

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

// --- Micro-Interaction Components ---

const CompletionParticles = () => {
  // Generate 8 particles around the circle
  const particles = Array.from({ length: 8 }).map((_, i) => {
    const angle = (i * 45) * (Math.PI / 180);
    return {
      x: Math.cos(angle) * 20, // distance
      y: Math.sin(angle) * 20,
      id: i
    };
  });

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, scale: 0.5, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: 0, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`absolute w-1.5 h-1.5 rounded-full ${p.id % 2 === 0 ? 'bg-brand-400' : 'bg-blue-400'}`}
        />
      ))}
    </div>
  );
};

// --- Illustration Components for Empty States ---

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
    onSwipeLeft?: () => void; // Usually Delete
    onSwipeRight?: () => void; // Usually Complete
    leftColor?: string;
    rightColor?: string;
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

    // Visual Feedback Transforms
    // Right Drag (Positive X) -> Complete
    const rightOpacity = useTransform(x, [50, 100], [0, 1]);
    const rightScale = useTransform(x, [50, 100], [0.8, 1]);
    
    // Left Drag (Negative X) -> Delete
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
        <div className="relative overflow-hidden rounded-2xl" ref={containerRef}>
            {/* Background Layer: Swipe Right (Complete) */}
            {onSwipeRight && (
                <motion.div 
                    style={{ opacity: rightOpacity, scale: rightScale }}
                    className={`absolute inset-y-0 left-0 w-full flex items-center justify-start pl-6 rounded-2xl ${completed ? 'bg-blue-500' : 'bg-green-500'} text-white z-0`}
                >
                    {completed ? <UndoIcon /> : <CheckCircleIcon />}
                    <span className="font-bold ml-2 text-sm">{completed ? "Desmarcar" : "Concluir"}</span>
                </motion.div>
            )}

            {/* Background Layer: Swipe Left (Delete) */}
            {onSwipeLeft && (
                <motion.div 
                    style={{ opacity: leftOpacity, scale: leftScale }}
                    className="absolute inset-y-0 right-0 w-full flex items-center justify-end pr-6 rounded-2xl bg-red-500 text-white z-0"
                >
                    <span className="font-bold mr-2 text-sm">Excluir</span>
                    <TrashIcon />
                </motion.div>
            )}

            {/* Foreground Content */}
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: 0.5, right: 0.5 }}
                onDragEnd={handleDragEnd}
                style={{ x }}
                className="relative z-10 rounded-2xl"
                whileTap={{ scale: 0.98 }}
            >
                {children}
            </motion.div>
        </div>
    );
};


// --- Internal Components ---

// Define animation variants for smooth list changes
const itemVariants = {
  hidden: { opacity: 0, y: 10, height: 0, marginBottom: 0 },
  visible: { 
    opacity: 1, 
    y: 0, 
    height: "auto", 
    marginBottom: 8, // maps to mb-2 or space-y-2 logic roughly
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
          className="rounded-2xl"
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
        className="relative rounded-2xl my-2"
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
  const { t } = useTranslation();
  
  const getPantryStatus = (current: number, ideal: number) => {
    if (current <= 0) return { color: 'bg-red-500', border: 'border-red-500', label: 'Esgotado' };
    const ratio = current / (ideal || 1);
    if (ratio < 0.35) return { color: 'bg-red-400', border: 'border-red-400', label: 'Crítico' };
    if (ratio < 1) return { color: 'bg-yellow-400', border: 'border-yellow-400', label: 'Baixo' };
    return { color: 'bg-green-500', border: 'border-green-500', label: 'Ideal' };
  };

  // Shared content renderer to avoid duplication
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
      const palette = category 
        ? (COLOR_PALETTES.find(p => p.id === category.colorId) || DEFAULT_COLOR) 
        : DEFAULT_COLOR;

      // --- PANTRY VIEW ---
      if (isPantry) {
          const current = item.currentQuantity || 0;
          const ideal = item.idealQuantity || 1;
          const status = getPantryStatus(current, ideal);

          return (
            <div className={`relative group backdrop-blur-sm p-3 flex items-center justify-between border border-gray-100 dark:border-gray-700 rounded-2xl bg-white/80 dark:bg-gray-800/80 shadow-lg shadow-gray-200/40 dark:shadow-none hover:shadow-xl hover:shadow-brand-100/30 dark:hover:shadow-none transition-all duration-300`}>
              <div className="flex items-center gap-2 flex-1 overflow-hidden">
                 {/* Drag Handle */}
                 {isDraggable && !isViewer && (
                    <div onPointerDown={(e) => dragControls?.start(e)} className="touch-none p-1 -ml-1 cursor-grab active:cursor-grabbing">
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
                 {/* Only Edit Icon remains, Trash is via Swipe */}
                 {!isViewer && (
                     <button onClick={() => onEdit(item)} className="p-2 text-gray-400 hover:text-brand-500 transition-colors focus:outline-none"><EditIcon /></button>
                 )}
              </div>
            </div>
          );
      }

      // --- SHOPPING LIST VIEW ---
      const quantity = item.quantity || 1;
      const hasPrice = item.price !== undefined && item.price > 0;
      const totalItemPrice = hasPrice ? (item.price! * quantity) : 0;

      return (
        <div 
            className={`relative group backdrop-blur-sm p-3 flex items-center justify-between rounded-2xl transition-all duration-300
            ${item.completed 
                ? 'opacity-60 bg-gray-50/50 dark:bg-gray-800/30 border border-transparent' 
                : 'bg-white/80 dark:bg-gray-800/80 border border-white/60 dark:border-gray-700/60 shadow-lg shadow-gray-200/40 dark:shadow-none hover:shadow-xl hover:shadow-brand-100/50 dark:hover:shadow-none hover:-translate-y-0.5'
            }
            `}
        >
          <div className="flex items-center gap-2 flex-1 overflow-hidden">
             {/* Drag Handle */}
             {isDraggable && !isViewer && !item.completed && (
                <div onPointerDown={(e) => dragControls?.start(e)} className="touch-none p-1 -ml-1 cursor-grab active:cursor-grabbing">
                    <DragHandleIcon />
                </div>
             )}

            <div className="flex items-center gap-3 flex-1 overflow-hidden">
              <button
                  onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
                  disabled={isViewer}
                  className={`relative flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  isViewer 
                      ? 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 cursor-not-allowed'
                      : (item.completed ? 'bg-brand-500 border-brand-500' : 'border-gray-300 dark:border-gray-500 hover:border-brand-400 hover:scale-110 active:scale-90')
                  }`}
              >
                  {/* Confetti Explosion on Complete */}
                  {item.completed && <CompletionParticles />}
                  
                  <motion.div
                    initial={false}
                    animate={{ scale: item.completed ? 1 : 0, opacity: item.completed ? 1 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                      {item.completed && <CheckIcon />}
                  </motion.div>
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
                 {/* Trash icon removed to encourage swipe */}
              </div>
          )}
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
            <div className="space-y-3 pb-4">
                {/* Active Items: Draggable */}
                <Reorder.Group 
                    axis="y" 
                    values={activeItems} 
                    onReorder={(newOrder) => {
                        if (onReorder) {
                            onReorder([...newOrder, ...completedItems]);
                        }
                    }}
                    className="space-y-3"
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

                {/* Completed Items: Static (Not reorderable usually) */}
                {completedItems.length > 0 && (
                    <>
                        <motion.div 
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-t border-gray-100 dark:border-gray-700 my-2 pt-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1"
                        >
                            Concluídos
                        </motion.div>
                        <ul className="space-y-3">
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
      return 0; // Should not reach here if manual handled above, but fallback
    });

    if (!groupByCategory) {
      return (
        <ul className="space-y-3 pb-4">
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

    categories.forEach(cat => {
      const catItems = sortedItems.filter(i => i.category === cat.name);
      if (catItems.length > 0) {
        catItems.forEach(i => usedItemIds.add(i.id));
        
        const palette = COLOR_PALETTES.find(p => p.id === cat.colorId) || DEFAULT_COLOR;
        
        groups.push(
          <motion.div layout key={cat.id} className="mb-6">
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ml-1 ${palette.text}`}>
              {cat.name}
            </h4>
            <ul className="space-y-2">
                <AnimatePresence initial={false} mode='popLayout'>
                  {catItems.map(item => (
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
          </motion.div>
        );
      }
    });

    // Handle uncategorized
    const remainingItems = sortedItems.filter(i => !usedItemIds.has(i.id));
    if (remainingItems.length > 0) {
      groups.push(
        <motion.div layout key="uncategorized" className="mb-6">
           <h4 className="text-xs font-bold uppercase tracking-wider mb-2 ml-1 text-gray-500 dark:text-gray-400">
              Outros / Sem Categoria
            </h4>
            <ul className="space-y-2">
                <AnimatePresence initial={false} mode='popLayout'>
                  {remainingItems.map(item => (
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
        </motion.div>
      );
    }

    return <div>{groups}</div>;

  }, [items, categories, groupByCategory, sortBy, isPantry, onUpdateQuantity, isViewer, onReorder]);

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
          {isPantry ? t('empty_pantry_title') : t('empty_cart_title')}
        </h3>
        
        <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-12 text-sm leading-relaxed">
          {isPantry 
             ? t('empty_pantry_msg') 
             : t('empty_cart_msg')
          }
        </p>

        {/* Call to Action - Bouncing Arrow */}
        {!isViewer && (
            <div className="animate-bounce text-brand-600 dark:text-brand-400 flex flex-col items-center gap-2 opacity-90 cursor-pointer" onClick={() => document.querySelector('input')?.focus()}>
              <span className="text-sm font-bold bg-brand-50 dark:bg-brand-900/30 px-3 py-1 rounded-full">
                {isPantry ? t('start_here') : t('add_first_item')}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
            </div>
        )}
      </div>
    );
  }

  return processedContent;
};