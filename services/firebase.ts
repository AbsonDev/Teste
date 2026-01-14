import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  arrayUnion,
  runTransaction
} from "firebase/firestore";
import { 
  getMessaging, 
  getToken, 
  onMessage 
} from "firebase/messaging";
import { 
  getRemoteConfig, 
  fetchAndActivate, 
  getBoolean 
} from "firebase/remote-config";
import { getAnalytics, logEvent, setUserId, setUserProperties } from "firebase/analytics";
import { getPerformance } from "firebase/performance";
import { ShoppingListGroup, Category, Invite, Role, HistoryLog, ShoppingItem } from "../types";

const STORAGE_KEY = 'firebase_config';

// Safe access to process.env
const getEnv = (key: string) => {
  try {
    return typeof process !== 'undefined' && process.env ? process.env[key] : undefined;
  } catch {
    return undefined;
  }
};

const getStoredConfig = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse stored firebase config", e);
  }
  return null;
};

const storedConfig = getStoredConfig();

const defaultFirebaseConfig = {
  apiKey: "AIzaSyBxe9ThNE0NbyKEcbxkcnvI2PdEaepz6Iw",
  authDomain: "fastlist-a9594.firebaseapp.com",
  projectId: "fastlist-a9594",
  storageBucket: "fastlist-a9594.firebasestorage.app",
  messagingSenderId: "523788038303",
  appId: "1:523788038303:web:7e24bb9686f1df81e532aa",
  measurementId: "G-6ZNXNBTJ7X"
};

const envConfig = {
  apiKey: getEnv('REACT_APP_FIREBASE_API_KEY'),
  authDomain: getEnv('REACT_APP_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('REACT_APP_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('REACT_APP_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('REACT_APP_FIREBASE_APP_ID')
};

const hasEnvConfig = !!envConfig.apiKey && envConfig.apiKey !== "PLACEHOLDER_KEY";
const firebaseConfig = storedConfig || (hasEnvConfig ? envConfig : defaultFirebaseConfig);

// Initialize Modular App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// --- Analytics & Performance ---
let analytics: any = null;
let perf: any = null;

if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
    perf = getPerformance(app);
  } catch (e) {
    console.warn("Analytics/Perf initialization failed (likely blocked by client):", e);
  }
}

export const logUserEvent = (eventName: string, params?: Record<string, any>) => {
  try {
    if (analytics) {
      logEvent(analytics, eventName, params);
    }
    // Debug in Development
    if (getEnv('NODE_ENV') === 'development') {
      console.log(`[Analytics] ${eventName}`, params);
    }
  } catch (e) {
    // Fail silently in production
    if (getEnv('NODE_ENV') === 'development') console.error("Analytics Error:", e);
  }
};

export const setAnalyticsUser = (id: string | null) => {
  try {
    if (analytics) {
        setUserId(analytics, id);
    }
    if (getEnv('NODE_ENV') === 'development') {
        console.log(`[Analytics] setUserId: ${id}`);
    }
  } catch (e) {
    console.warn("Analytics Error (setUserId):", e);
  }
};

export const setAnalyticsUserProperties = (props: { [key: string]: any }) => {
  try {
    if (analytics) {
        setUserProperties(analytics, props);
    }
    if (getEnv('NODE_ENV') === 'development') {
        console.log(`[Analytics] User Props:`, props);
    }
  } catch (e) {
    console.warn("Analytics Error (setUserProps):", e);
  }
};

// --- Messaging ---
export const messaging = typeof window !== 'undefined' && 'serviceWorker' in navigator ? getMessaging(app) : null;
const VAPID_KEY = 'BHLC-EkI5FM5oyhRQ2_HzZo_Nx1r1zZyeyC0weDy6-gUN0S08l3USJnoaYwii_HewVGsElyM-cL2xOPFNoA8Ky0';

export const requestNotificationPermission = async (userId: string) => {
  if (!messaging) return;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (currentToken) {
        const userRef = doc(db, "users", userId);
        await setDoc(userRef, { 
          fcmTokens: arrayUnion(currentToken),
          lastSeen: Date.now()
        }, { merge: true });
        console.log("Notification token saved.");
      }
    }
  } catch (err) {
    console.error("Token error", err);
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (messaging) {
      onMessage(messaging, (payload) => resolve(payload));
    }
  });

// --- Remote Config ---
const remoteConfig = getRemoteConfig(app);
remoteConfig.defaultConfig = { "enable_ai_assistant": false };
remoteConfig.settings.minimumFetchIntervalMillis = 10000; 

export const initRemoteConfig = async () => {
  try {
    await fetchAndActivate(remoteConfig);
    console.log("Remote Config fetched");
  } catch (err) {
    console.error("Remote Config fetch failed", err);
  }
};

export const getRemoteConfigBoolean = (key: string) => getBoolean(remoteConfig, key);

// --- Config Helpers ---
export const saveFirebaseConfig = (config: any) => {
  if (!config || !config.apiKey) throw new Error("Configuração inválida");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.location.reload();
};

export const resetFirebaseConfig = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
};

// --- Auth Services ---
export const signIn = async () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const signInWithEmail = async (email: string, password: string) => 
    signInWithEmailAndPassword(auth, email, password);

export const signUpWithEmail = async (email: string, password: string) => 
    createUserWithEmailAndPassword(auth, email, password);

export const signOut = async () => firebaseSignOut(auth);

export { onAuthStateChanged };

// --- List Services ---
export const subscribeToUserLists = (userId: string, callback: (lists: ShoppingListGroup[]) => void) => {
  const q = query(
      collection(db, "shoppingLists"), 
      where("members", "array-contains", userId)
  );

  return onSnapshot(q, (snapshot) => {
    const lists: ShoppingListGroup[] = [];
    snapshot.forEach((doc) => {
      lists.push({ id: doc.id, ...doc.data() } as ShoppingListGroup);
    });
    callback(lists);
  });
};

export const addListToFirestore = async (userId: string, listData: Partial<ShoppingListGroup>) => {
  const user = auth.currentUser;
  const email = user?.email || "";
  
  const newList = {
    ...listData,
    members: [userId],
    memberEmails: [email],
    roles: { [userId]: 'owner' },
    ownerEmail: email,
    createdAt: Date.now()
  };
  
  return addDoc(collection(db, "shoppingLists"), newList);
};

export const updateListInFirestore = async (listId: string, data: Partial<ShoppingListGroup>) => {
  const ref = doc(db, "shoppingLists", listId);
  return updateDoc(ref, data);
};

export const deleteListFromFirestore = async (listId: string) => {
  return deleteDoc(doc(db, "shoppingLists", listId));
};

// --- Category & Settings ---
export const subscribeToUserCategories = (userId: string, callback: (cats: Category[]) => void) => {
    const ref = doc(db, "userSettings", userId);
    return onSnapshot(ref, (docSnap) => {
        if (docSnap.exists() && docSnap.data().categories) {
            callback(docSnap.data().categories);
        } else {
             callback([]);
        }
    });
};

export const subscribeToUserSettings = (userId: string, callback: (data: any) => void) => {
    const ref = doc(db, "userSettings", userId);
    return onSnapshot(ref, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        } else {
            callback({});
        }
    });
};

export const saveUserTheme = async (userId: string, theme: 'light' | 'dark') => {
    const ref = doc(db, "userSettings", userId);
    return setDoc(ref, { theme }, { merge: true });
};

export const markTutorialSeen = async (userId: string) => {
    const ref = doc(db, "userSettings", userId);
    return setDoc(ref, { tutorialSeen: true }, { merge: true });
}

export const saveUserCategories = async (userId: string, categories: Category[]) => {
    const ref = doc(db, "userSettings", userId);
    return setDoc(ref, { categories }, { merge: true });
};

// --- Price History ---
export const updatePriceHistory = async (userId: string, items: ShoppingItem[]) => {
    const pricesToUpdate: Record<string, number> = {};
    items.forEach(item => {
        if (item.completed && item.price !== undefined && item.price > 0) {
            const key = item.name.trim().toLowerCase().replace(/[.#$\[\]]/g, ''); 
            pricesToUpdate[key] = item.price;
        }
    });
    if (Object.keys(pricesToUpdate).length === 0) return;

    const ref = doc(db, "priceHistory", userId);
    return setDoc(ref, pricesToUpdate, { merge: true });
};

export const getLastItemPrice = async (userId: string, itemName: string): Promise<number | null> => {
    try {
        const ref = doc(db, "priceHistory", userId);
        const snapshot = await getDoc(ref);
        if (snapshot.exists()) {
            const data = snapshot.data();
            const key = itemName.trim().toLowerCase().replace(/[.#$\[\]]/g, '');
            return data[key] || null;
        }
    } catch (e) {
        console.error("Error fetching price history", e);
    }
    return null;
};

// --- History Logs ---
export const addHistoryLog = async (
  userId: string, 
  action: HistoryLog['action'], 
  details: string,
  metadata?: HistoryLog['metadata']
) => {
  const user = auth.currentUser;
  const userName = user?.displayName || user?.email || 'Usuário';

  await addDoc(collection(db, "historyLogs"), {
    userId,
    userName,
    action,
    details,
    metadata: metadata || {},
    createdAt: Date.now()
  });
};

export const subscribeToHistory = (userId: string, callback: (logs: HistoryLog[]) => void) => {
  // To avoid requiring a composite index (userId + createdAt) which requires manual console setup,
  // we query only by userId and perform sorting and limiting on the client side.
  const q = query(
      collection(db, "historyLogs"), 
      where("userId", "==", userId)
  );

  return onSnapshot(q, (snapshot) => {
    const logs: HistoryLog[] = [];
    snapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() } as HistoryLog);
    });
    // Sort descending by date
    logs.sort((a, b) => b.createdAt - a.createdAt);
    // Limit to 50 items
    callback(logs.slice(0, 50));
  }, (error) => {
      console.error("History subscription error:", error);
  });
};

// --- Migration ---
export const migrateLegacyLists = async (userId: string) => {
    const q = query(collection(db, "shoppingLists"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    let count = 0;

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.members || !data.members.includes(userId)) {
            const userEmail = auth.currentUser?.email || "";
            batch.update(docSnap.ref, {
                members: arrayUnion(userId),
                memberEmails: arrayUnion(userEmail),
                roles: { [userId]: 'owner' },
                ownerEmail: userEmail
            });
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`Migrated ${count} legacy lists.`);
    }
};

// --- Sharing & Invites ---
export const subscribeToInvites = (userEmail: string, callback: (invites: Invite[]) => void) => {
    if (!userEmail) return () => {};
    const q = query(collection(db, "invites"), where("toEmail", "==", userEmail));
    return onSnapshot(q, (snapshot) => {
        const invites: Invite[] = [];
        snapshot.forEach((doc) => invites.push({ id: doc.id, ...doc.data() } as Invite));
        callback(invites);
    });
};

export const subscribeToOutgoingInvites = (listId: string, callback: (invites: Invite[]) => void) => {
    const q = query(collection(db, "invites"), where("listId", "==", listId));
    return onSnapshot(q, (snapshot) => {
        const invites: Invite[] = [];
        snapshot.forEach((doc) => invites.push({ id: doc.id, ...doc.data() } as Invite));
        callback(invites);
    });
};

export const sendInvite = async (listId: string, listName: string, toEmail: string) => {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("Usuário não autenticado");
    
    await addDoc(collection(db, "invites"), {
        listId,
        listName,
        invitedBy: user.email,
        toEmail,
        createdAt: Date.now()
    });
};

export const cancelInvite = async (inviteId: string) => {
    await deleteDoc(doc(db, "invites", inviteId));
};

export const acceptInvite = async (invite: Invite, userId: string) => {
    const userEmail = auth.currentUser?.email;
    if (!userEmail) throw new Error("No email");

    const batch = writeBatch(db);
    const listRef = doc(db, "shoppingLists", invite.listId);
    
    batch.update(listRef, {
        members: arrayUnion(userId),
        memberEmails: arrayUnion(userEmail),
        [`roles.${userId}`]: 'editor'
    });

    const inviteRef = doc(db, "invites", invite.id);
    batch.delete(inviteRef);

    await batch.commit();
};

export const rejectInvite = async (inviteId: string) => {
    await deleteDoc(doc(db, "invites", inviteId));
};

export const updateListMemberRole = async (listId: string, targetUserId: string, newRole: Role) => {
    const listRef = doc(db, "shoppingLists", listId);
    return updateDoc(listRef, {
        [`roles.${targetUserId}`]: newRole
    });
};

export const removeListMember = async (listId: string, targetUserId: string, targetUserEmail: string) => {
    const listRef = doc(db, "shoppingLists", listId);
    
    return runTransaction(db, async (transaction) => {
        const listSnap = await transaction.get(listRef);
        if (!listSnap.exists()) throw new Error("Lista não encontrada");
        
        const data = listSnap.data();
        let members = (data.members || []) as string[];
        let memberEmails = (data.memberEmails || []) as string[];
        const roles = { ...(data.roles || {}) };
        
        const memberIndex = members.indexOf(targetUserId);

        if (memberIndex !== -1) {
            members = members.filter((_, i) => i !== memberIndex);
            if (memberIndex < memberEmails.length) {
                memberEmails = memberEmails.filter((_, i) => i !== memberIndex);
            }
        } else {
            members = members.filter(id => id !== targetUserId);
        }
        
        delete roles[targetUserId];
        
        transaction.update(listRef, {
            members,
            memberEmails,
            roles
        });
    });
};