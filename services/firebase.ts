
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

// Atomic add functions to prevent race conditions
export const addItemToList = async (listId: string, item: ShoppingItem) => {
  const ref = doc(db, "shoppingLists", listId);
  return updateDoc(ref, {
    items: arrayUnion(item)
  });
};

export const addItemsBatchToList = async (listId: string, items: ShoppingItem[]) => {
  const ref = doc(db, "shoppingLists", listId);
  return updateDoc(ref, {
    items: arrayUnion(...items)
  });
};

export const deleteListFromFirestore = async (listId: string) => {
  return deleteDoc(doc(db, "shoppingLists", listId));
};

// --- User Settings ---

export const saveUserCategories = async (userId: string, categories: Category[]) => {
  const ref = doc(db, "users", userId);
  return setDoc(ref, { categories }, { merge: true });
};

export const saveUserTheme = async (userId: string, theme: 'light' | 'dark') => {
  const ref = doc(db, "users", userId);
  return setDoc(ref, { theme }, { merge: true });
};

export const markTutorialSeen = async (userId: string) => {
    const ref = doc(db, "users", userId);
    return setDoc(ref, { tutorialSeen: true }, { merge: true });
};

export const subscribeToUserSettings = (userId: string, callback: (data: any) => void) => {
  const ref = doc(db, "users", userId);
  return onSnapshot(ref, (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    } else {
      callback({});
    }
  });
};

// --- Invites ---

export const sendInvite = async (listId: string, listName: string, toEmail: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const invitesRef = collection(db, "invites");
    await addDoc(invitesRef, {
        listId,
        listName,
        invitedBy: user.displayName || user.email,
        toEmail,
        createdAt: Date.now(),
        status: 'pending'
    });
};

export const subscribeToInvites = (userEmail: string | null, callback: (invites: Invite[]) => void) => {
    if (!userEmail) return () => {};
    const q = query(
        collection(db, "invites"), 
        where("toEmail", "==", userEmail),
        where("status", "==", "pending")
    );
    return onSnapshot(q, (snapshot) => {
        const invites: Invite[] = [];
        snapshot.forEach(doc => invites.push({ id: doc.id, ...doc.data() } as Invite));
        callback(invites);
    });
};

export const subscribeToOutgoingInvites = (listId: string, callback: (invites: Invite[]) => void) => {
     const q = query(
        collection(db, "invites"),
        where("listId", "==", listId),
        where("status", "==", "pending")
    );
    return onSnapshot(q, (snapshot) => {
        const invites: Invite[] = [];
        snapshot.forEach(doc => invites.push({ id: doc.id, ...doc.data() } as Invite));
        callback(invites);
    });
};

export const acceptInvite = async (invite: Invite, userId: string) => {
    const batch = writeBatch(db);
    
    // Add user to list
    const listRef = doc(db, "shoppingLists", invite.listId);
    batch.update(listRef, {
        members: arrayUnion(userId),
        memberEmails: arrayUnion(invite.toEmail), 
        [`roles.${userId}`]: 'editor'
    });

    // Delete invite
    const inviteRef = doc(db, "invites", invite.id);
    batch.delete(inviteRef);

    await batch.commit();
};

export const rejectInvite = async (inviteId: string) => {
    await deleteDoc(doc(db, "invites", inviteId));
};

export const cancelInvite = async (inviteId: string) => {
    await deleteDoc(doc(db, "invites", inviteId));
};

// --- List Members Management ---

export const updateListMemberRole = async (listId: string, userId: string, newRole: Role) => {
    const listRef = doc(db, "shoppingLists", listId);
    await updateDoc(listRef, {
        [`roles.${userId}`]: newRole
    });
};

export const removeListMember = async (listId: string, userId: string, userEmail: string) => {
    const listRef = doc(db, "shoppingLists", listId);
    
    await runTransaction(db, async (transaction) => {
        const listDoc = await transaction.get(listRef);
        if (!listDoc.exists()) throw new Error("List not found");
        
        const data = listDoc.data();
        const roles = data.roles || {};
        delete roles[userId];

        transaction.update(listRef, {
            members: data.members.filter((uid: string) => uid !== userId),
            memberEmails: data.memberEmails ? data.memberEmails.filter((email: string) => email !== userEmail) : [],
            roles: roles
        });
    });
};

// --- History ---

export const addHistoryLog = async (userId: string, action: string, details: string, metadata?: any) => {
    await addDoc(collection(db, "history"), {
        userId,
        action,
        details,
        metadata: metadata || null,
        createdAt: Date.now()
    });
};

export const subscribeToHistory = (userId: string, callback: (logs: HistoryLog[]) => void) => {
    const q = query(
        collection(db, "history"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(50)
    );
    return onSnapshot(q, (snapshot) => {
        const logs: HistoryLog[] = [];
        snapshot.forEach(doc => logs.push({ id: doc.id, ...doc.data() } as HistoryLog));
        callback(logs);
    });
};

// --- Price History ---

export const updatePriceHistory = async (userId: string, items: ShoppingItem[]) => {
    const batch = writeBatch(db);
    const date = new Date().toISOString().split('T')[0];
    
    items.forEach(item => {
        if (item.price && item.price > 0) {
            const normalizedName = item.name.trim().toLowerCase();
            const ref = doc(db, "priceHistory", `${userId}_${normalizedName}`);
            batch.set(ref, {
                userId,
                name: normalizedName,
                lastPrice: item.price,
                lastDate: date,
            }, { merge: true });
        }
    });
    
    await batch.commit();
};

export const getLastItemPrice = async (userId: string, itemName: string): Promise<number | null> => {
    const normalizedName = itemName.trim().toLowerCase();
    const ref = doc(db, "priceHistory", `${userId}_${normalizedName}`);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        return snap.data().lastPrice;
    }
    return null;
};

// --- Migration ---

export const migrateLegacyLists = async (userId: string) => {
    const localLists = localStorage.getItem('lists');
    if (localLists) {
        try {
            const parsed = JSON.parse(localLists);
            if (Array.isArray(parsed) && parsed.length > 0) {
                for (const l of parsed) {
                   await addListToFirestore(userId, l);
                }
                localStorage.removeItem('lists'); 
            }
        } catch (e) {
            console.error("Migration failed", e);
        }
    }
};
