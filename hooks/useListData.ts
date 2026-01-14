import { useState, useEffect } from 'react';
import { 
  subscribeToUserLists, 
  subscribeToUserSettings, 
  subscribeToInvites,
  migrateLegacyLists,
  setAnalyticsUserProperties
} from '../services/firebase';
import { ShoppingListGroup, Category, Invite, DEFAULT_CATEGORIES } from '../types';

export const useListData = (user: any) => {
  const [lists, setLists] = useState<ShoppingListGroup[]>([]);
  const [activeListId, setActiveListId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [hasSeenTutorial, setHasSeenTutorial] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLists([]);
      setInvites([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    migrateLegacyLists(user.uid);

    const unsubLists = subscribeToUserLists(user.uid, (syncedLists) => {
      setLists(syncedLists);
      
      // Smart active list selection
      setActiveListId(prevId => {
        const current = syncedLists.find(l => l.id === prevId);
        if (current) {
          if (current.type === 'pantry' || !current.archived) return prevId;
        }
        const firstActive = syncedLists.find(l => !l.archived && l.type !== 'pantry');
        if (firstActive) return firstActive.id;
        return syncedLists.length > 0 ? syncedLists[0].id : '';
      });
      
      setDataLoading(false);
    });

    const unsubSettings = subscribeToUserSettings(user.uid, (data) => {
      if (data.categories) setCategories(data.categories);
      if (data.theme) setTheme(data.theme);
      setHasSeenTutorial(!!data.tutorialSeen);

      setAnalyticsUserProperties({
          theme: data.theme || 'light',
          tutorial_seen: !!data.tutorialSeen,
          has_custom_categories: (data.categories?.length || 0) > 6
      });
    });

    const unsubInvites = subscribeToInvites(user.email, (incomingInvites) => {
      setInvites(incomingInvites);
    });

    return () => {
      unsubLists();
      unsubSettings();
      unsubInvites();
    };
  }, [user]);

  return {
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
  };
};