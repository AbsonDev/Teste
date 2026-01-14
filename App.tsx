import React, { useState, useEffect, useMemo } from 'react';
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
import { InvitesToast } from './components/InvitesToast';
import { OnboardingTutorial } from './components/OnboardingTutorial'; // New Import
import { generateSmartList } from './services/geminiService';
import { 
  auth, 
  subscribeToUserLists, 
  subscribeToUserSettings, 
  addListToFirestore, 
  updateListInFirestore, 
  deleteListFromFirestore, 
  saveUserCategories,
  saveUserTheme,
  migrateLegacyLists,
  subscribeToInvites,
  acceptInvite,
  rejectInvite,
  addHistoryLog,
  initRemoteConfig,
  getRemoteConfigBoolean,
  updatePriceHistory,
  requestNotificationPermission,
  onMessageListener,
  logUserEvent
} from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ShoppingItem, ShoppingListGroup, Category, DEFAULT_CATEGORIES, Invite } from './types';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const App: React.FC = () => {
  // --- Auth State ---
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- App State ---
  const [lists, setLists] = useState<ShoppingListGroup[]>([]);
  const [activeListId, setActiveListId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [hasSeenTutorial, setHasSeenTutorial] = useState(true); // Default true until fetched

  // --- Feature Flags (Remote Config) ---
  const [enableAIChat, setEnableAIChat] = useState(false);

  // --- View Options State ---
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [sortBy, setSortBy] = useState<'created' | 'name' | 'manual'>('manual'); // Default to manual

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
  const [isAIChatOpen, setIsAIChatOpen] = useState(false); // AI Chat State
  
  // Share Modal State with specific List ID
  const [shareConfig, setShareConfig] = useState<{isOpen: boolean, listId: string | null}>({ isOpen: false, listId: null });

  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Notifications
  const [notification, setNotification] = useState<{title: string, body: string} | null>(null);

  // --- Auth & Config Effect ---
  useEffect(() => {
    // 1. Init Remote Config
    initRemoteConfig().then(() => {
        const isEnabled = getRemoteConfigBoolean('enable_ai_assistant');
        console.log("AI Assistant Enabled (Remote Config):", isEnabled);
        setEnableAIChat(isEnabled);
    });

    // 2. Auth Listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      // Request Notification Permission on login
      if (currentUser) {
          requestNotificationPermission(currentUser.uid);
          logUserEvent('login', { method: currentUser.providerData[0]?.providerId || 'unknown' });
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Foreground Notification Listener ---
  useEffect(() => {
      // Listen for messages when app is open
      onMessageListener()
        .then((payload: any) => {
            console.log('Foreground Message:', payload);
            setNotification({
                title: payload.notification?.title || 'Nova Atualização',
                body: payload.notification?.body || 'Sua lista foi atualizada.'
            });
            // Auto hide after 5 seconds
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
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

  // --- Firestore Listeners ---
  useEffect(() => {
    if (!user) {
      setLists([]);
      setInvites([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);

    // Run migration once on load to ensure old lists work with new sharing system
    migrateLegacyLists(user.uid);

    const unsubLists = subscribeToUserLists(user.uid, (syncedLists) => {
      setLists(syncedLists);
      
      // Smart selection of active list
      setActiveListId(prevId => {
        // If current active list still exists and is NOT archived, keep it
        const current = syncedLists.find(l => l.id === prevId);
        if (current) {
          // If it was the pantry or an active list, stay there
          if (current.type === 'pantry' || !current.archived) return prevId;
          // If it was archived, we can technically stay there, but usually we fallback to active
        }
        
        // Find the first regular active list
        const firstActive = syncedLists.find(l => !l.archived && l.type !== 'pantry');
        if (firstActive) return firstActive.id;
        
        // Fallback
        return syncedLists.length > 0 ? syncedLists[0].id : '';
      });
      
      setDataLoading(false);
    });

    const unsubSettings = subscribeToUserSettings(user.uid, (data) => {
      if (data.categories) setCategories(data.categories);
      if (data.theme) setTheme(data.theme);
      // Check tutorial status (undefined means false/not seen)
      setHasSeenTutorial(!!data.tutorialSeen);
    });

    // Listen for Invites
    const unsubInvites = subscribeToInvites(user.email, (incomingInvites) => {
      setInvites(incomingInvites);
    });

    return () => {
      unsubLists();
      unsubSettings();
      unsubInvites();
    };
  }, [user]);

  // --- Computed ---
  const activeList = useMemo(() => 
    lists.find(l => l.id === activeListId) || lists.find(l => !l.archived && l.type !== 'pantry') || lists[0], 
  [lists, activeListId]);

  const listToShare = useMemo(() => {
     if (!shareConfig.listId) return undefined;
     return lists.find(l => l.id === shareConfig.listId);
  }, [lists, shareConfig.listId]);

  // Analytics: Track Screen View when active list changes
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

  // Role Logic
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

  // Computed for Complete Modal
  const completedItemsCount = activeList?.items?.filter(i => i.completed).length || 0;
  
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
      // Create pantry if it doesn't exist
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

       if (deficit <= 0) return; // No need to buy

       let shouldBuy = false;

       if (mode === 'critical') {
         // Critical = Empty OR Low Stock (below 35%)
         const ratio = current / ideal;
         if (current <= 0 || ratio < 0.35) shouldBuy = true;
       } else if (mode === 'all') {
         // Buy everything that is below ideal
         shouldBuy = true;
       }

       if (shouldBuy) {
          itemsToBuy.push({
            id: generateId(),
            name: item.name,
            category: item.category,
            quantity: deficit,
            completed: false,
            createdAt: Date.now(),
            // Don't copy current/ideal quantity to shopping list, keep it clean
          });
       }
    });

    if (itemsToBuy.length === 0) {
      alert("Sua dispensa está em dia! Nada para comprar com base nesse critério.");
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

    // Save Price History
    // We update prices for all completed items in this session
    await updatePriceHistory(user.uid, completedItems);

    // Only update pantry if requested
    if (addToPantry) {
      // 1. Find or Create Pantry
      let pantryList = lists.find(l => l.type === 'pantry');
      
      // We need to work with the existing pantry items or an empty array
      let pantryItems = pantryList ? [...pantryList.items] : [];

      // 2. Merge Items
      completedItems.forEach(boughtItem => {
        // Normalize name for matching
        const boughtName = boughtItem.name.trim().toLowerCase();
        
        const existingIndex = pantryItems.findIndex(p => p.name.trim().toLowerCase() === boughtName);
        const quantityBought = boughtItem.quantity || 1;

        if (existingIndex >= 0) {
          // Update existing item
          const existingItem = pantryItems[existingIndex];
          const currentQty = existingItem.currentQuantity || 0;
          
          pantryItems[existingIndex] = {
            ...existingItem,
            currentQuantity: currentQty + quantityBought,
            // We can optionally update price or other metadata here
          };
        } else {
          // Create new pantry item
          pantryItems.push({
            id: generateId(),
            name: boughtItem.name, // Keep original casing
            category: boughtItem.category,
            completed: false,
            createdAt: Date.now(),
            currentQuantity: quantityBought,
            idealQuantity: quantityBought // Set ideal to what we bought as a baseline
          });
        }
      });

      // 3. Save Pantry
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

    // 4. Archive current list if requested
    if (archiveList) {
      await updateListInFirestore(activeListId, { archived: true });
    }

    // Log the purchase
    addHistoryLog(user.uid, 'finish_list', `Finalizou compras na lista "${activeList.name}"`, { 
        value: listTotal, 
        count: completedItems.length 
    });

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

  // --- Category Actions ---
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
    
    // Swap
    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
    
    // Optimistic update
    setCategories(newCategories); 
    await saveUserCategories(user.uid, newCategories);
  };

  // --- Theme Action ---
  const toggleTheme = () => {
     const newTheme = theme === 'light' ? 'dark' : 'light';
     setTheme(newTheme);
     saveUserTheme(user.uid, newTheme);
  };

  // --- Item Actions ---
  const addSimpleItem = async (name: string) => {
    if (isViewer) return;
    const newItem: ShoppingItem = { 
      id: generateId(), 
      name, 
      category: 'Outros', 
      completed: false, 
      createdAt: Date.now(), 
      quantity: 1,
      currentQuantity: 1,
      idealQuantity: 2 
    };
    await updateListInFirestore(activeList.id, { items: [newItem, ...activeList.items] });
    addHistoryLog(user.uid, 'add_item', `Adicionou "${name}" em ${activeList.name}`);
  };

  // Called by SmartInput AND AI Chat
  const addItemsBatch = async (items: Partial<ShoppingItem>[]) => {
      if (isViewer) return;
      const newItems = items.map(item => ({
        ...item,
        id: generateId(),
        completed: false,
        createdAt: Date.now(),
        quantity: item.quantity || 1, // Use quantity from AI if available
        currentQuantity: 1,
        idealQuantity: 2
      } as ShoppingItem));

      await updateListInFirestore(activeList.id, { items: [...newItems, ...activeList.items] });
      addHistoryLog(user.uid, 'add_item', `Adicionou ${newItems.length} itens via IA em ${activeList.name}`);
  }

  // Wrapper for AI Chat to update items
  const updateItemBatch = async (id: string, updates: Partial<ShoppingItem>) => {
    if (isViewer) return;
    const newItems = activeList.items.map(item => item.id === id ? { ...item, ...updates } : item);
    await updateListInFirestore(activeList.id, { items: newItems });
  };

  const handleReorder = async (newItems: ShoppingItem[]) => {
      if (isViewer) return;
      // Optimistic update handled by local state in ShoppingList for drag visuals, 
      // but we need to commit to Firestore
      await updateListInFirestore(activeList.id, { items: newItems });
  };

  const addSmartItems = async (prompt: string) => {
    if (isViewer) return;
    setIsProcessing(true);
    try {
      // Find pantry list
      const pantryList = lists.find(l => l.type === 'pantry');
      // Get names of items we actually HAVE (quantity > 0)
      const pantryItemNames = pantryList 
        ? pantryList.items
            .filter(i => (i.currentQuantity || 0) > 0)
            .map(i => i.name)
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
    if (isPantry || isViewer) return; // No toggling in pantry or viewer
    const item = activeList.items.find(i => i.id === itemId);
    const newItems = activeList.items.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item);
    await updateListInFirestore(activeList.id, { items: newItems });
    
    if (item && !item.completed) {
        addHistoryLog(user.uid, 'complete_item', `Comprou "${item.name}"`);
    }
  };
  const deleteItem = async (itemId: string) => {
    if (isViewer) return;
    const newItems = activeList.items.filter(item => item.id !== itemId);
    await updateListInFirestore(activeList.id, { items: newItems });
  };
  const saveItemEdit = async (id: string, name: string, category: string, price?: number, quantity?: number, currentQuantity?: number, idealQuantity?: number) => {
    if (isViewer) return;
    const newItems = activeList.items.map(item => item.id === id ? { ...item, name, category, price, quantity, currentQuantity, idealQuantity } : item);
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

  // Shared ListPanel Props
  const listPanelProps = {
    lists, 
    activeListId, 
    onSelect: setActiveListId, 
    onCreate: createList, 
    onUpdate: updateList, 
    onDelete: deleteList,
    onToggleArchive: toggleListArchive,
    onManageCategories: () => setIsCategoryManagerOpen(true),
    onOpenPantry: handleOpenPantry,
    onShare: (listId: string, listName: string) => { 
        setShareConfig({ isOpen: true, listId });
    },
    onOpenHistory: () => setIsHistoryOpen(true),
    user,
    currentTheme: theme,
    onToggleTheme: toggleTheme
  };

  // Header glassmorphism background classes - updated with translucency
  const headerBgClass = isPantry ? 'bg-orange-50/60 dark:bg-orange-950/60' : 'bg-white/60 dark:bg-gray-900/60';

  // Floating Action Button for Complete
  const completeButton = (!safeActiveList.archived && completedItemsCount > 0 && !isPantry && !isViewer) ? (
     <button
        onClick={() => setIsCompleteModalOpen(true)}
        className="flex items-center gap-3 pl-4 pr-5 py-2.5 bg-green-600 text-white rounded-full shadow-lg shadow-green-200/50 hover:bg-green-700 active:scale-95 transition-all group animate-slide-up backdrop-blur-sm"
      >
        <div className="flex items-center justify-center w-5 h-5 bg-green-500 rounded-full text-green-50 border border-green-400 shadow-sm">
           <span className="text-[10px] font-bold">{completedItemsCount}</span>
        </div>
        <span className="font-bold text-sm uppercase tracking-wide">Concluir</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
  ) : null;

  // AI Chat Button (Only if Feature Flag is Enabled)
  const aiChatButton = (enableAIChat && !isViewer && !safeActiveList.archived) ? (
     <button
        id="ai-chat-button" // Added ID for driver.js
        onClick={() => setIsAIChatOpen(true)}
        className="absolute bottom-24 right-4 sm:right-6 md:right-8 z-30 p-3.5 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-2xl shadow-xl shadow-purple-200/50 hover:scale-105 active:scale-95 transition-all animate-slide-up"
        title="Assistente IA"
     >
       <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
       {/* Sparkle effect decoration */}
       <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse border-2 border-white"></span>
     </button>
  ) : null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden text-gray-900 dark:text-gray-100">
      
      {/* Onboarding Tutorial Component */}
      <OnboardingTutorial userId={user.uid} hasSeenTutorial={hasSeenTutorial} />

      {/* Offline Banner */}
      {!isOnline && (
         <div className="fixed top-0 left-0 right-0 z-[100] bg-gray-800 text-white text-xs font-bold text-center py-1">
            Você está offline. Visualizando modo rascunho.
         </div>
      )}

      <InvitesToast 
        invites={invites} 
        onAccept={(inv) => acceptInvite(inv, user.uid)}
        onReject={rejectInvite}
      />
      
      {/* Foreground Notification Toast */}
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
                <button className="text-gray-400 hover:text-gray-600">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        </div>
      )}

      {/* --- DESKTOP SIDEBAR --- */}
      <div className={`hidden lg:block bg-white dark:bg-gray-800 h-full flex-shrink-0 transition-all duration-300 ease-in-out ${isDesktopSidebarOpen ? 'w-72 border-r border-gray-200 dark:border-gray-700' : 'w-0 overflow-hidden border-none'}`}>
        <div className="w-72 h-full relative">
             <ListPanel {...listPanelProps} />
             {deferredPrompt && (
                <div className="absolute bottom-16 left-4 right-4">
                    <button 
                        onClick={handleInstallClick}
                        className="w-full py-2 bg-brand-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-brand-700 transition-colors animate-pulse"
                    >
                        Instalar App
                    </button>
                </div>
             )}
        </div>
      </div>

      {/* --- MOBILE DRAWER --- */}
      <ListDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} {...listPanelProps} />
      
      {/* Install Button in Mobile Drawer (Portal-like injection or check ListDrawer impl) - Actually let's just add it conditionally inside main content for mobile if drawer isn't easy to mod here */}
      {deferredPrompt && isDrawerOpen && (
          <div className="fixed bottom-4 left-4 right-4 z-[80] lg:hidden">
             <button 
                onClick={handleInstallClick}
                className="w-full py-3 bg-brand-600 text-white rounded-xl text-sm font-bold shadow-xl hover:bg-brand-700 transition-colors"
            >
                Instalar Aplicativo
            </button>
          </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <div className={`flex-1 flex flex-col h-full relative w-full ${isPantry ? 'bg-orange-50/30 dark:bg-orange-950/20' : 'bg-gray-50/50 dark:bg-gray-900/50'} ${!isOnline ? 'pt-4' : ''}`}>
        
        {/* Header - Glassmorphism applied */}
        <header className={`flex-shrink-0 backdrop-blur-xl border-b border-white/20 dark:border-gray-800 px-4 py-3 z-20 transition-colors duration-300 relative ${headerBgClass} shadow-[0_4px_30px_rgba(0,0,0,0.03)]`}>
           <button
             id="menu-toggle" // Added ID for driver.js
             onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
             className={`hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors focus:outline-none active:scale-95 hover:bg-black/5 dark:hover:bg-white/10 ${isPantry ? 'text-orange-800 dark:text-orange-200' : 'text-gray-500 dark:text-gray-400'} z-30`}
             title={isDesktopSidebarOpen ? "Fechar Menu" : "Abrir Menu"}
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
                 id="menu-toggle" // Added ID for driver.js (Duplicate ID valid here as only one renders per screen size typically, but driver handles first match)
                 onClick={() => setIsDrawerOpen(true)}
                 className={`lg:hidden p-2 -ml-2 rounded-xl transition-colors focus:outline-none active:bg-gray-200 dark:active:bg-gray-700 ${isPantry ? 'text-orange-800 dark:text-orange-200 hover:bg-orange-100 dark:hover:bg-orange-900/50' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-brand-600'}`}
               >
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>
               </button>

               <div className="flex flex-col items-start" id="header-title"> {/* Added ID */}
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
                    <button
                    onClick={() => setIsGenerateModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white rounded-lg shadow-sm hover:bg-brand-700 transition-colors active:scale-95"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                    <span className="text-xs font-bold uppercase tracking-wide">Gerar Lista</span>
                    </button>
                 )
               ) : (
                 <>
                   <button 
                      onClick={() => isEditor && setIsBudgetModalOpen(true)}
                      disabled={!!safeActiveList.archived || isViewer}
                      className={`flex flex-col items-end px-3 py-1.5 rounded-lg border transition-colors ${safeActiveList.budget ? (isOverBudget ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' : 'bg-brand-50 dark:bg-brand-900/30 border-brand-200 dark:border-brand-800') : 'bg-gray-50 dark:bg-gray-800 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'}`}
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
          <div id="smart-input-area"> {/* Added ID wrapper for driver.js */}
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

      {/* --- MODALS --- */}
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
    </div>
  );
};

export default App;