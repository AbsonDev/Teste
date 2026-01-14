
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShoppingList } from './components/ShoppingList';
import { SmartInput } from './components/SmartInput';
import { ListDrawer, ListPanel } from './components/ListDrawer';
import { CategoryManager } from './components/CategoryManager';
import { EditItemModal } from './components/EditItemModal';
import { BudgetModal } from './components/BudgetModal';
import { GenerateListModal } from './components/GenerateListModal';
import { CompleteListModal } from './components/CompleteListModal';
import { LoginScreen } from './components/LoginScreen';
import { ShareListModal } from './components/ShareListModal';
import { HistoryModal } from './components/HistoryModal';
import { AIChatModal } from './components/AIChatModal';
import { ChefModal } from './components/ChefModal';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { InvitesToast } from './components/InvitesToast';
import { ToastUndo } from './components/ToastUndo';
import { OnboardingTutorial } from './components/OnboardingTutorial';
import { generateSmartList } from './services/geminiService';
import { 
  auth, 
  addListToFirestore, 
  updateListInFirestore, 
  deleteListFromFirestore, 
  saveUserCategories,
  saveUserTheme,
  acceptInvite,
  rejectInvite,
  addHistoryLog,
  initRemoteConfig,
  getRemoteConfigBoolean,
  updatePriceHistory,
  requestNotificationPermission,
  onMessageListener,
  logUserEvent,
  setAnalyticsUser,
  setAnalyticsUserProperties,
  addItemToList,
  addItemsBatchToList
} from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ShoppingItem, ShoppingListGroup, ScannedItem } from './types';
import { useListData } from './hooks/useListData';
import { ITEM_DATABASE } from './data/itemDatabase';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const App: React.FC = () => {
  // --- Auth State ---
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- Data Hook ---
  const { 
    lists, 
    activeListId, 
    setActiveListId, 
    categories, 
    setCategories,
    invites, 
    theme, 
    setTheme,
    hasSeenTutorial, 
    dataLoading 
  } = useListData(user);

  // --- Feature Flags (Remote Config) ---
  const [enableAIChat, setEnableAIChat] = useState(false);

  // --- View Options State (Persistent) ---
  const [groupByCategory, setGroupByCategory] = useState(() => {
    try {
      const saved = localStorage.getItem('pref_groupByCategory');
      return saved ? JSON.parse(saved) : false;
    } catch { return false; }
  });
  
  const [sortBy, setSortBy] = useState<'created' | 'name' | 'manual'>(() => {
    try {
      const saved = localStorage.getItem('pref_sortBy');
      return (saved as any) || 'manual';
    } catch { return 'manual'; }
  });

  // Save Preferences
  useEffect(() => {
    localStorage.setItem('pref_groupByCategory', JSON.stringify(groupByCategory));
  }, [groupByCategory]);

  useEffect(() => {
    localStorage.setItem('pref_sortBy', sortBy);
  }, [sortBy]);

  const [isProcessing, setIsProcessing] = useState(false);
  
  // UI States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  
  // Modal States
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isChefModalOpen, setIsChefModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  // Share Modal State
  const [shareConfig, setShareConfig] = useState<{isOpen: boolean, listId: string | null}>({ isOpen: false, listId: null });

  // Undo State
  const [undoToast, setUndoToast] = useState<{isOpen: boolean, item: ShoppingItem | null, listId: string | null}>({ isOpen: false, item: null, listId: null });

  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Notifications
  const [notification, setNotification] = useState<{title: string, body: string} | null>(null);

  // --- Auth & Config Effect ---
  useEffect(() => {
    initRemoteConfig().then(() => {
        const isEnabled = getRemoteConfigBoolean('enable_ai_assistant');
        setEnableAIChat(isEnabled);
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser) {
          setAnalyticsUser(currentUser.uid);
          requestNotificationPermission(currentUser.uid);
          logUserEvent('login', { method: currentUser.providerData[0]?.providerId || 'unknown' });
      } else {
          setAnalyticsUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Foreground Notification Listener ---
  useEffect(() => {
      onMessageListener()
        .then((payload: any) => {
            setNotification({
                title: payload.notification?.title || 'Nova Atualização',
                body: payload.notification?.body || 'Sua lista foi atualizada.'
            });
            setTimeout(() => setNotification(null), 5000);
        })
        .catch(err => console.log('Failed to get foreground message: ', err));
  }, []);

  // --- PWA & Network Effect ---
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Theme Effect ---
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        setDeferredPrompt(null);
      });
    }
  };

  // --- Computed ---
  const activeList = useMemo(() => 
    lists.find(l => l.id === activeListId) || lists.find(l => !l.archived && l.type !== 'pantry') || lists[0], 
  [lists, activeListId]);

  const listToShare = useMemo(() => {
     if (!shareConfig.listId) return undefined;
     return lists.find(l => l.id === shareConfig.listId);
  }, [lists, shareConfig.listId]);

  // Analytics: Track Screen View
  useEffect(() => {
    if (activeList) {
        const screenName = activeList.type === 'pantry' ? 'Pantry' : 'ShoppingList';
        logUserEvent('screen_view', { 
            firebase_screen: screenName, 
            list_id: activeList.id,
            is_archived: activeList.archived
        });
    }
  }, [activeList?.id, activeList?.type]);

  const isPantry = activeList?.type === 'pantry';

  const userRole = useMemo(() => {
    if (!activeList || !user) return 'viewer';
    return activeList.roles?.[user.uid] || 'viewer';
  }, [activeList, user]);

  const isViewer = userRole === 'viewer';
  const isEditor = userRole === 'editor' || userRole === 'owner';

  const listTotal = useMemo(() => {
    if (!activeList) return 0;
    return activeList.items.reduce((acc, item) => {
      if (item.completed && item.price) {
        return acc + (item.price * (item.quantity || 1));
      }
      return acc;
    }, 0);
  }, [activeList?.items]);

  const completedItems = activeList?.items?.filter(i => i.completed) || [];
  const completedItemsCount = completedItems.length;
  
  // --- List Actions ---
  const createList = async (name: string) => {
    await addListToFirestore(user.uid, { name, items: [], createdAt: Date.now(), archived: false, type: 'list' });
    addHistoryLog(user.uid, 'create_list', `Criou a lista "${name}"`);
  };
  
  const handleOpenPantry = async () => {
    const pantryList = lists.find(l => l.type === 'pantry');
    if (pantryList) {
      setActiveListId(pantryList.id);
    } else {
      await addListToFirestore(user.uid, { 
        name: 'Minha Dispensa', 
        items: [], 
        createdAt: Date.now(), 
        archived: false, 
        type: 'pantry' 
      });
      addHistoryLog(user.uid, 'create_list', 'Criou a Dispensa');
    }
  };

  const handleGenerateList = async (mode: 'critical' | 'all') => {
    if (!isPantry) return;

    const pantryItems = activeList.items;
    let itemsToBuy: ShoppingItem[] = [];

    pantryItems.forEach(item => {
       const current = item.currentQuantity || 0;
       const ideal = item.idealQuantity || 1;
       const deficit = ideal - current;

       if (deficit <= 0) return;

       let shouldBuy = false;

       if (mode === 'critical') {
         const ratio = current / ideal;
         if (current <= 0 || ratio < 0.35) shouldBuy = true;
       } else if (mode === 'all') {
         shouldBuy = true;
       }

       if (shouldBuy) {
          itemsToBuy.push({
            id: generateId(),
            name: item.name,
            category: item.category,
            quantity: deficit,
            completed: false,
            createdAt: Date.now()
          });
       }
    });

    if (itemsToBuy.length === 0) {
      alert("Sua dispensa está em dia!");
      setIsGenerateModalOpen(false);
      return;
    }

    const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const listName = `Reposição ${dateStr}`;

    await addListToFirestore(user.uid, {
      name: listName,
      items: itemsToBuy,
      createdAt: Date.now(),
      archived: false,
      type: 'list'
    });
    addHistoryLog(user.uid, 'create_list', `Gerou lista automática "${listName}" com ${itemsToBuy.length} itens`);

    setIsGenerateModalOpen(false);
  };

  const handleCompletePurchase = async (archiveList: boolean, addToPantry: boolean) => {
    const completedItems = activeList.items.filter(i => i.completed);
    if (completedItems.length === 0) {
      setIsCompleteModalOpen(false);
      return;
    }

    await updatePriceHistory(user.uid, completedItems);

    if (addToPantry) {
      let pantryList = lists.find(l => l.type === 'pantry');
      let pantryItems = pantryList ? [...pantryList.items] : [];

      completedItems.forEach(boughtItem => {
        const boughtName = boughtItem.name.trim().toLowerCase();
        const existingIndex = pantryItems.findIndex(p => p.name.trim().toLowerCase() === boughtName);
        const quantityBought = boughtItem.quantity || 1;

        if (existingIndex >= 0) {
          const existingItem = pantryItems[existingIndex];
          const currentQty = existingItem.currentQuantity || 0;
          pantryItems[existingIndex] = {
            ...existingItem,
            currentQuantity: currentQty + quantityBought
          };
        } else {
          pantryItems.push({
            id: generateId(),
            name: boughtItem.name,
            category: boughtItem.category,
            completed: false,
            createdAt: Date.now(),
            currentQuantity: quantityBought,
            idealQuantity: quantityBought
          });
        }
      });

      if (pantryList) {
        await updateListInFirestore(pantryList.id, { items: pantryItems });
      } else {
        await addListToFirestore(user.uid, {
          name: 'Minha Dispensa',
          type: 'pantry',
          items: pantryItems,
          createdAt: Date.now(),
          archived: false
        });
      }
      addHistoryLog(user.uid, 'update_pantry', `Atualizou ${completedItems.length} itens na dispensa via compra`);
    }

    if (archiveList) {
      await updateListInFirestore(activeListId, { archived: true });
    }

    addHistoryLog(user.uid, 'finish_list', `Finalizou compras na lista "${activeList.name}"`, { 
        value: listTotal, 
        count: completedItems.length 
    });

    setAnalyticsUserProperties({ last_purchase_date: new Date().toISOString() });
    setIsCompleteModalOpen(false);
  };

  const updateList = async (id: string, name: string) => {
    await updateListInFirestore(id, { name });
  };
  const updateListBudget = async (amount: number | undefined) => {
    await updateListInFirestore(activeListId, { budget: amount });
    setIsBudgetModalOpen(false);
  };
  const toggleListArchive = async (id: string, archived: boolean) => {
    await updateListInFirestore(id, { archived });
  };
  const deleteList = async (id: string) => {
    await deleteListFromFirestore(id);
  };

  const addCategory = async (name: string, colorId: string) => {
    const newCat = { id: generateId(), name, colorId };
    await saveUserCategories(user.uid, [...categories, newCat]);
  };
  const updateCategory = async (id: string, name: string, colorId: string) => {
    const oldCat = categories.find(c => c.id === id);
    const newCategories = categories.map(c => c.id === id ? { ...c, name, colorId } : c);
    await saveUserCategories(user.uid, newCategories);
    if (oldCat && oldCat.name !== name) {
       lists.forEach(list => {
         if (list.items.some(i => i.category === oldCat.name)) {
           const newItems = list.items.map(item => item.category === oldCat.name ? { ...item, category: name } : item);
           updateListInFirestore(list.id, { items: newItems });
         }
       });
    }
  };
  const deleteCategory = async (id: string) => {
    const catToDelete = categories.find(c => c.id === id);
    const newCategories = categories.filter(c => c.id !== id);
    await saveUserCategories(user.uid, newCategories);
    if (catToDelete) {
       lists.forEach(list => {
         if (list.items.some(i => i.category === catToDelete.name)) {
            const newItems = list.items.map(item => item.category === catToDelete.name ? { ...item, category: 'Outros' } : item);
           updateListInFirestore(list.id, { items: newItems });
         }
       });
    }
  };
  
  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categories.length - 1) return;
    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
    setCategories(newCategories); 
    await saveUserCategories(user.uid, newCategories);
  };

  const toggleTheme = () => {
     const newTheme = theme === 'light' ? 'dark' : 'light';
     setTheme(newTheme);
     saveUserTheme(user.uid, newTheme);
  };

  // Updated addSimpleItem to accept category
  const addSimpleItem = async (name: string, category: string = 'Outros') => {
    if (isViewer) return;
    const newItem: ShoppingItem = { 
      id: generateId(), 
      name, 
      category, 
      completed: false, 
      createdAt: Date.now(), 
      quantity: 1,
      currentQuantity: 1,
      idealQuantity: 2 
    };
    
    // Prevent Race Condition: Use Atomic ArrayUnion instead of rewriting the list
    await addItemToList(activeList.id, newItem);
    
    addHistoryLog(user.uid, 'add_item', `Adicionou "${name}" em ${activeList.name}`);
  };

  const addItemsBatch = async (items: Partial<ShoppingItem>[]) => {
      if (isViewer) return;
      // If we are in pantry view, redirect to the first active shopping list or create one
      let targetListId = activeListId;
      if (isPantry) {
          const shoppingList = lists.find(l => !l.archived && l.type !== 'pantry');
          if (shoppingList) {
             targetListId = shoppingList.id;
          } else {
             // Create a new list if none exists
             const newListRef = await addListToFirestore(user.uid, { 
                name: 'Compras', 
                items: [], 
                createdAt: Date.now(), 
                archived: false, 
                type: 'list' 
             });
             targetListId = newListRef.id;
          }
      }

      const listToUpdate = lists.find(l => l.id === targetListId) || activeList;
      
      const newItems = items.map(item => {
        // Simple auto-categorize fallback
        const autoCat = item.category || ITEM_DATABASE[item.name?.toLowerCase() || ''] || 'Outros';

        return {
          ...item,
          id: generateId(),
          category: autoCat,
          completed: false,
          createdAt: Date.now(),
          quantity: item.quantity || 1,
          currentQuantity: 1,
          idealQuantity: 2
        } as ShoppingItem;
      });

      // Prevent Race Condition: Use Atomic ArrayUnion
      await addItemsBatchToList(targetListId, newItems);
      
      addHistoryLog(user.uid, 'add_item', `Adicionou ${newItems.length} itens via IA em ${listToUpdate.name}`);
  }

  const updateItemBatch = async (id: string, updates: Partial<ShoppingItem>) => {
    if (isViewer) return;
    const newItems = activeList.items.map(item => item.id === id ? { ...item, ...updates } : item);
    await updateListInFirestore(activeList.id, { items: newItems });
  };

  const handleReorder = async (newItems: ShoppingItem[]) => {
      if (isViewer) return;
      await updateListInFirestore(activeList.id, { items: newItems });
  };

  const addSmartItems = async (prompt: string) => {
    if (isViewer) return;
    setIsProcessing(true);
    try {
      const pantryList = lists.find(l => l.type === 'pantry');
      const pantryItemNames = pantryList 
        ? pantryList.items.filter(i => (i.currentQuantity || 0) > 0).map(i => i.name)
        : [];
      const generatedItems = await generateSmartList(prompt, categories.map(c => c.name), pantryItemNames);
      await addItemsBatch(generatedItems);
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar lista.');
    } finally {
      setIsProcessing(false);
    }
  };
  const toggleItem = async (itemId: string) => {
    if (isPantry || isViewer) return;
    const item = activeList.items.find(i => i.id === itemId);
    const newItems = activeList.items.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item);
    await updateListInFirestore(activeList.id, { items: newItems });
    if (item && !item.completed) addHistoryLog(user.uid, 'complete_item', `Comprou "${item.name}"`);
  };
  
  const deleteItem = async (itemId: string) => {
    if (isViewer) return;
    
    // 1. Capture Item for Undo
    const itemToDelete = activeList.items.find(item => item.id === itemId);
    if (!itemToDelete) return;

    // 2. Perform Delete
    const newItems = activeList.items.filter(item => item.id !== itemId);
    await updateListInFirestore(activeList.id, { items: newItems });

    // 3. Show Toast
    setUndoToast({
        isOpen: true,
        item: itemToDelete,
        listId: activeList.id
    });
  };

  const handleUndoDelete = async () => {
    if (undoToast.item && undoToast.listId) {
        // Find the list (it might not be active anymore, safer to find by ID)
        const targetList = lists.find(l => l.id === undoToast.listId);
        if (targetList) {
             // Re-add the item. We put it back at the top or end.
             const restoredItems = [undoToast.item, ...targetList.items];
             await updateListInFirestore(undoToast.listId, { items: restoredItems });
        }
    }
    setUndoToast({ isOpen: false, item: null, listId: null });
  };

  const saveItemEdit = async (
    id: string, 
    name: string, 
    category: string, 
    price?: number, 
    quantity?: number, 
    currentQuantity?: number, 
    idealQuantity?: number,
    note?: string 
  ) => {
    if (isViewer) return;
    const newItems = activeList.items.map(item => 
        item.id === id 
        ? { ...item, name, category, price, quantity, currentQuantity, idealQuantity, note } 
        : item
    );
    await updateListInFirestore(activeList.id, { items: newItems });
  };

  const updatePantryQuantity = async (id: string, delta: number) => {
     if (isViewer) return;
     const newItems = activeList.items.map(item => {
       if (item.id === id) {
         const current = item.currentQuantity || 0;
         const newQuantity = Math.max(0, current + delta);
         return { ...item, currentQuantity: newQuantity };
       }
       return item;
     });
     await updateListInFirestore(activeList.id, { items: newItems });
  };

  // --- Chef Modal Handlers ---
  const handleCookRecipe = async (usedIngredients: string[], recipeTitle: string) => {
      if (!isPantry || !activeList) return;

      const newItems = activeList.items.map(item => {
          // Simple fuzzy match: check if ingredient string contains item name or vice versa
          const itemName = item.name.toLowerCase();
          const isUsed = usedIngredients.some(ing => 
              itemName.includes(ing.toLowerCase()) || ing.toLowerCase().includes(itemName)
          );

          if (isUsed) {
             const current = item.currentQuantity || 0;
             return { ...item, currentQuantity: Math.max(0, current - 1) };
          }
          return item;
      });

      await updateListInFirestore(activeList.id, { items: newItems });
      addHistoryLog(user.uid, 'chef_cook', `Cozinhou "${recipeTitle}"`);
  };

  const handleShopMissing = async (missingIngredients: string[]) => {
      const itemsToAdd = missingIngredients.map(name => ({ name, quantity: 1 }));
      await addItemsBatch(itemsToAdd);
  };

  // --- Scanner Handler ---
  const handleScanResults = async (scannedUpdates: ScannedItem[]) => {
      if (!activeList || isViewer) return;

      let updatedCount = 0;
      const newItems = activeList.items.map(item => {
          // Try to find a match in the scanned results
          const match = scannedUpdates.find(scanned => 
              item.name.toLowerCase() === scanned.originalName.toLowerCase() || 
              scanned.originalName.toLowerCase().includes(item.name.toLowerCase())
          );

          if (match) {
              updatedCount++;
              // Trust the receipt quantity if available, otherwise default to existing or 1
              const newQuantity = match.quantity || item.quantity || 1;

              return {
                  ...item,
                  price: match.price,
                  quantity: newQuantity,
                  completed: true // Auto check items found on receipt
              };
          }
          return item;
      });

      // Optional: Add new items found on receipt that weren't on list
      // For now, let's just update existing to be safe and avoid clutter.
      // If we wanted to add, we'd filter scannedUpdates for those not matched.

      if (updatedCount > 0) {
          await updateListInFirestore(activeList.id, { items: newItems });
          addHistoryLog(user.uid, 'scan_receipt', `Atualizou ${updatedCount} itens via Leitor Fiscal`);
      }
  };

  // --- Render ---

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <LoginScreen />;
  if (dataLoading && lists.length === 0) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 gap-4"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div><p className="text-gray-400 text-sm">Sincronizando...</p></div>;
  
  const safeActiveList: ShoppingListGroup = activeList || { 
    id: 'temp', 
    name: 'Selecione uma lista', 
    items: [], 
    createdAt: Date.now(), 
    archived: false,
    budget: undefined,
    type: 'list'
  };

  const budgetProgress = safeActiveList.budget ? Math.min((listTotal / safeActiveList.budget) * 100, 100) : 0;
  const isOverBudget = safeActiveList.budget ? listTotal > safeActiveList.budget : false;
  const pendingCount = safeActiveList.items.filter(i => !i.completed).length;

  const listPanelProps = {
    lists, activeListId, onSelect: setActiveListId, onCreate: createList, onUpdate: updateList, 
    onDelete: deleteList, onToggleArchive: toggleListArchive, onManageCategories: () => setIsCategoryManagerOpen(true),
    onOpenPantry: handleOpenPantry, onShare: (listId: string, listName: string) => { setShareConfig({ isOpen: true, listId }); },
    onOpenHistory: () => setIsHistoryOpen(true), 
    onOpenScanner: () => setIsScannerOpen(true),
    onOpenChef: () => setIsChefModalOpen(true),
    user, currentTheme: theme, onToggleTheme: toggleTheme
  };

  const headerBgClass = isPantry ? 'bg-orange-50/60 dark:bg-orange-950/60' : 'bg-white/60 dark:bg-gray-900/60';

  const completeButton = (!safeActiveList.archived && completedItemsCount > 0 && !isPantry && !isViewer) ? (
     <button onClick={() => setIsCompleteModalOpen(true)} className="flex items-center gap-3 pl-4 pr-5 py-2.5 bg-green-600 text-white rounded-full shadow-lg shadow-green-200/50 hover:bg-green-700 active:scale-95 transition-all group animate-slide-up backdrop-blur-sm">
        <div className="flex items-center justify-center w-5 h-5 bg-green-500 rounded-full text-green-50 border border-green-400 shadow-sm"><span className="text-[10px] font-bold">{completedItemsCount}</span></div>
        <span className="font-bold text-sm uppercase tracking-wide">Concluir</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
  ) : null;

  const aiChatButton = (enableAIChat && !isViewer && !safeActiveList.archived) ? (
     <button id="ai-chat-button" onClick={() => setIsAIChatOpen(true)} className="absolute bottom-24 right-4 sm:right-6 md:right-8 z-30 p-3.5 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-2xl shadow-xl shadow-purple-200/50 hover:scale-105 active:scale-95 transition-all animate-slide-up" title="Assistente IA">
       <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
       <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse border-2 border-white"></span>
     </button>
  ) : null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden text-gray-900 dark:text-gray-100">
      <OnboardingTutorial userId={user.uid} hasSeenTutorial={hasSeenTutorial} />

      {!isOnline && (
         <div className="fixed top-0 left-0 right-0 z-[100] bg-gray-800 text-white text-xs font-bold text-center py-1 flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
            Modo Offline
         </div>
      )}

      <InvitesToast invites={invites} onAccept={(inv) => acceptInvite(inv, user.uid)} onReject={rejectInvite} />
      <ToastUndo 
         isOpen={undoToast.isOpen} 
         onClose={() => setUndoToast(prev => ({ ...prev, isOpen: false }))}
         onUndo={handleUndoDelete}
         message="Item excluído."
      />
      
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-slide-up w-[90%] max-w-sm">
            <div className="bg-white/90 backdrop-blur-md dark:bg-gray-800/90 rounded-xl shadow-2xl p-4 border border-brand-100 dark:border-gray-700 flex gap-3 items-center cursor-pointer" onClick={() => setNotification(null)}>
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                </div>
                <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">{notification.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{notification.body}</p>
                </div>
                <button className="text-gray-400 hover:text-gray-600" aria-label="Fechar notificação">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        </div>
      )}

      <div className={`hidden lg:block bg-white dark:bg-gray-800 h-full flex-shrink-0 transition-all duration-300 ease-in-out ${isDesktopSidebarOpen ? 'w-72 border-r border-gray-200 dark:border-gray-700' : 'w-0 overflow-hidden border-none'}`}>
        <div className="w-72 h-full relative">
             <ListPanel {...listPanelProps} />
             {deferredPrompt && (
                <div className="absolute bottom-16 left-4 right-4">
                    <button onClick={handleInstallClick} className="w-full py-2 bg-brand-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-brand-700 transition-colors animate-pulse">
                        Instalar App
                    </button>
                </div>
             )}
        </div>
      </div>

      <ListDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} {...listPanelProps} />
      
      {deferredPrompt && isDrawerOpen && (
          <div className="fixed bottom-4 left-4 right-4 z-[80] lg:hidden">
             <button onClick={handleInstallClick} className="w-full py-3 bg-brand-600 text-white rounded-xl text-sm font-bold shadow-xl hover:bg-brand-700 transition-colors">
                Instalar Aplicativo
            </button>
          </div>
      )}

      <div className={`flex-1 flex flex-col h-full relative w-full ${isPantry ? 'bg-orange-50/30 dark:bg-orange-950/20' : 'bg-gray-50/50 dark:bg-gray-900/50'} ${!isOnline ? 'pt-8' : ''}`}>
        
        <header className={`flex-shrink-0 backdrop-blur-xl border-b border-white/20 dark:border-gray-800 px-4 py-3 z-20 transition-colors duration-300 relative ${headerBgClass} shadow-[0_4px_30px_rgba(0,0,0,0.03)]`}>
           <button
             id="menu-toggle" 
             onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
             className={`hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors focus:outline-none active:scale-95 hover:bg-black/5 dark:hover:bg-white/10 ${isPantry ? 'text-orange-800 dark:text-orange-200' : 'text-gray-500 dark:text-gray-400'} z-30`}
             title={isDesktopSidebarOpen ? "Fechar Menu" : "Abrir Menu"}
             aria-label="Alternar Menu Lateral"
           >
             {isDesktopSidebarOpen ? (
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 14-2-2 2-2"/></svg>
             ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 10 2 2-2 2"/></svg>
             )}
           </button>

           <div className="max-w-3xl mx-auto flex items-center justify-between w-full">
             <div className="flex items-center gap-3 lg:pl-10">
               <button 
                 id="menu-toggle"
                 onClick={() => setIsDrawerOpen(true)}
                 className={`lg:hidden p-2 -ml-2 rounded-xl transition-colors focus:outline-none active:bg-gray-200 dark:active:bg-gray-700 ${isPantry ? 'text-orange-800 dark:text-orange-200 hover:bg-orange-100 dark:hover:bg-orange-900/50' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-brand-600'}`}
                 aria-label="Abrir Menu"
               >
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>
               </button>

               <div className="flex flex-col items-start" id="header-title">
                 <div className="flex items-center gap-2">
                   <div className={`w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse ${isProcessing ? 'block' : 'hidden'}`} title="Processando IA..."></div>
                   <h1 className={`text-xl font-bold leading-none truncate max-w-[200px] sm:max-w-md ${isPantry ? 'text-orange-900 dark:text-orange-100' : 'text-gray-900 dark:text-white'}`}>
                     {safeActiveList.name} 
                     {safeActiveList.archived && <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded uppercase tracking-wider">Arquivada</span>}
                     {safeActiveList.members && safeActiveList.members.length > 1 && (
                        <span className="ml-2 inline-flex align-middle text-blue-500">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </span>
                     )}
                   </h1>
                 </div>
                 <span className={`text-xs ${isPantry ? 'text-orange-600 dark:text-orange-300' : 'text-gray-500 dark:text-gray-400'}`}>
                   {isPantry 
                      ? `${safeActiveList.items.length - pendingCount} em estoque`
                      : `${pendingCount} ${pendingCount === 1 ? 'item pendente' : 'itens pendentes'}`
                   }
                   {isViewer && <span className="ml-2 font-medium text-orange-600 bg-orange-100 dark:bg-orange-900/50 dark:text-orange-300 px-1.5 rounded">Leitor</span>}
                 </span>
               </div>
             </div>

             <div className="flex flex-col items-end gap-2">
               {isPantry ? (
                 isEditor && (
                    <div className="flex gap-2">
                       <button
                         onClick={() => setIsChefModalOpen(true)}
                         className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white rounded-lg shadow-sm hover:bg-orange-600 transition-colors active:scale-95"
                         title="O que cozinhar?"
                       >
                         <span className="text-sm">👨‍🍳</span>
                         <span className="text-xs font-bold uppercase tracking-wide hidden sm:inline">Chef</span>
                       </button>
                       <button
                         onClick={() => setIsGenerateModalOpen(true)}
                         className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white rounded-lg shadow-sm hover:bg-brand-700 transition-colors active:scale-95"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                         <span className="text-xs font-bold uppercase tracking-wide hidden sm:inline">Gerar Lista</span>
                       </button>
                    </div>
                 )
               ) : (
                 <>
                   <div className="flex items-center gap-2">
                      {!safeActiveList.archived && !isViewer && (
                          <button
                            onClick={() => setIsScannerOpen(true)}
                            className="flex items-center justify-center p-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/30 hover:text-brand-600 transition-colors"
                            title="Ler Cupom Fiscal"
                          >
                             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                          </button>
                      )}
                      <button 
                          onClick={() => isEditor && setIsBudgetModalOpen(true)}
                          disabled={!!safeActiveList.archived || isViewer}
                          className={`flex flex-col items-end px-3 py-1.5 rounded-lg border transition-colors ${safeActiveList.budget ? (isOverBudget ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' : 'bg-brand-50 dark:bg-brand-900/30 border-brand-200 dark:border-brand-800') : 'bg-gray-50 dark:bg-gray-800 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          aria-label="Definir Orçamento"
                      >
                          {safeActiveList.budget ? (
                            <>
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-brand-600 dark:text-brand-400'}`}>Gasto</span>
                              <span className={`text-sm font-bold ${isOverBudget ? 'text-red-700 dark:text-red-300' : 'text-brand-700 dark:text-brand-300'}`}>
                                {formatCurrency(listTotal)}
                                <span className="text-gray-400 dark:text-gray-500 font-normal text-xs ml-1">/ {formatCurrency(safeActiveList.budget)}</span>
                              </span>
                            </>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                              <span className="text-xs font-medium">Orçamento</span>
                            </div>
                          )}
                      </button>
                   </div>
                   {safeActiveList.budget && (
                    <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                       <div className={`h-full transition-all duration-500 ease-out rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-brand-500'}`} style={{ width: `${budgetProgress}%` }} />
                    </div>
                   )}
                 </>
               )}
             </div>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto pt-4 pb-32 custom-scrollbar">
          <div className="max-w-3xl mx-auto px-4">
            
            {safeActiveList.archived && (
              <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Esta lista está arquivada (somente leitura).</span>
                {isEditor && (
                    <button 
                    onClick={() => toggleListArchive(safeActiveList.id, false)}
                    className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                    >
                    Restaurar
                    </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => setGroupByCategory(!groupByCategory)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  groupByCategory 
                    ? 'bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800' 
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                Agrupar
              </button>

              <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
                <button
                  onClick={() => setSortBy('manual')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${sortBy === 'manual' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                >
                  Manual
                </button>
                <button
                  onClick={() => setSortBy('created')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${sortBy === 'created' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                >
                  Recentes
                </button>
                <button
                  onClick={() => setSortBy('name')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${sortBy === 'name' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                >
                  A-Z
                </button>
              </div>
            </div>

            <ShoppingList 
              items={safeActiveList.items} 
              categories={categories}
              groupByCategory={groupByCategory}
              sortBy={sortBy}
              onToggle={toggleItem} 
              onDelete={deleteItem}
              onEdit={setEditingItem}
              onReorder={handleReorder}
              isPantry={isPantry}
              onUpdateQuantity={updatePantryQuantity}
              isViewer={isViewer}
            />
          </div>
        </main>

        {aiChatButton}

        {!safeActiveList.archived && (
          <div id="smart-input-area">
            <SmartInput 
                onAddSimple={addSimpleItem} 
                onAddSmart={addSmartItems} 
                isProcessing={isProcessing} 
                actionButton={completeButton}
                isViewer={isViewer}
            />
          </div>
        )}
      </div>

      <CategoryManager 
        isOpen={isCategoryManagerOpen} 
        onClose={() => setIsCategoryManagerOpen(false)} 
        categories={categories} 
        onAdd={addCategory} 
        onUpdate={updateCategory} 
        onDelete={deleteCategory}
        onMove={moveCategory}
      />
      <EditItemModal 
        item={editingItem} 
        isOpen={!!editingItem} 
        onClose={() => setEditingItem(null)} 
        onSave={saveItemEdit} 
        categories={categories}
        isPantry={isPantry}
      />
      <BudgetModal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} currentBudget={safeActiveList.budget} onSave={updateListBudget} onClear={() => updateListBudget(undefined)} />
      
      <GenerateListModal 
        isOpen={isGenerateModalOpen} 
        onClose={() => setIsGenerateModalOpen(false)} 
        onGenerate={handleGenerateList} 
      />
      
      <CompleteListModal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        onConfirm={handleCompletePurchase}
        totalItems={completedItemsCount}
        totalValue={listTotal}
        purchasedItems={completedItems}
      />

      <ShareListModal 
        isOpen={shareConfig.isOpen}
        onClose={() => setShareConfig({ ...shareConfig, isOpen: false })}
        list={listToShare}
        currentUser={user}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        userId={user.uid}
        lists={lists} 
      />

      <AIChatModal
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        categories={categories}
        currentItems={safeActiveList.items}
        onAddItems={addItemsBatch}
        onRemoveItem={deleteItem}
        onUpdateItem={updateItemBatch}
      />

      <ChefModal
        isOpen={isChefModalOpen}
        onClose={() => setIsChefModalOpen(false)}
        pantryItemNames={isPantry && activeList ? activeList.items.filter(i => (i.currentQuantity || 0) > 0).map(i => i.name) : []}
        onCook={handleCookRecipe}
        onShopMissing={handleShopMissing}
      />

      <ReceiptScannerModal 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        expectedItemNames={!isPantry && activeList ? activeList.items.map(i => i.name) : []}
        onApplyUpdates={handleScanResults}
      />
    </div>
  );
};

export default App;
