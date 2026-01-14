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
import * as Firestore from "firebase/firestore";
import { 
  getMessaging, 
  getToken, 
  onMessage 
} from "firebase/messaging";
import { 
  getRemoteConfig, 
  fetchAndActivate, 
  getValue,
  getBoolean 
} from "firebase/remote-config";
import { ShoppingListGroup, Category, Invite, Role, HistoryLog, ShoppingItem } from "../types";

const STORAGE_KEY = 'firebase_config';

// Safe access to process.env to avoid ReferenceErrors in some environments
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

// Default config provided by user
const defaultFirebaseConfig = {
  apiKey: "AIzaSyBxe9ThNE0NbyKEcbxkcnvI2PdEaepz6Iw",
  authDomain: "fastlist-a9594.firebaseapp.com",
  projectId: "fastlist-a9594",
  storageBucket: "fastlist-a9594.firebasestorage.app",
  messagingSenderId: "523788038303",
  appId: "1:523788038303:web:7e24bb9686f1df81e532aa",
  measurementId: "G-6ZNXNBTJ7X"
};

// Try to get config from Env Vars, then LocalStorage, then Default
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = Firestore.getFirestore(app);

// --- Messaging (Push Notifications) ---
export const messaging = typeof window !== 'undefined' && 'serviceWorker' in navigator ? getMessaging(app) : null;
const VAPID_KEY = 'BHLC-EkI5FM5oyhRQ2_HzZo_Nx1r1zZyeyC0weDy6-gUN0S08l3USJnoaYwii_HewVGsElyM-cL2xOPFNoA8Ky0';

export const requestNotificationPermission = async (userId: string) => {
  if (!messaging) return;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (currentToken) {
        // Save token to user profile
        const userRef = Firestore.doc(db, "users", userId);
        // Using arrayUnion to allow multiple devices per user
        await Firestore.setDoc(userRef, { 
          fcmTokens: Firestore.arrayUnion(currentToken),
          lastSeen: Date.now()
        }, { merge: true });
        console.log("Notification token saved.");
      } else {
        console.log("No registration token available.");
      }
    } else {
      console.log("Notification permission denied.");
    }
  } catch (err) {
    console.error("An error occurred while retrieving token. ", err);
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
    }
  });


// --- Enable Offline Persistence ---
// Note: enableMultiTabIndexedDbPersistence is preferable but not supported in all environments
try {
    if (Firestore.enableMultiTabIndexedDbPersistence) {
        Firestore.enableMultiTabIndexedDbPersistence(db).catch((err: any) => {
            if (err.code === 'failed-precondition') {
                console.warn('Persistence failed: Multiple tabs open');
            } else if (err.code === 'unimplemented') {
                console.warn('Persistence not supported by browser');
            }
        });
    } else if (Firestore.enableIndexedDbPersistence) {
        Firestore.enableIndexedDbPersistence(db).catch((err: any) => {
             console.warn('Persistence failed', err);
        });
    }
} catch (e) {
    // Fallback or ignore if function not available in current SDK version/environment
    console.warn("Persistence setup warning:", e);
}


// --- Remote Config Setup ---
const remoteConfig = getRemoteConfig(app);

// Configurações padrão (caso não consiga buscar do servidor)
remoteConfig.defaultConfig = {
  "enable_ai_assistant": false,
};

// Tempo de cache (em dev pode ser baixo, em prod aumente)
remoteConfig.settings.minimumFetchIntervalMillis = 10000; 

export const initRemoteConfig = async () => {
  try {
    await fetchAndActivate(remoteConfig);
    console.log("Remote Config fetched");
  } catch (err) {
    console.error("Remote Config fetch failed", err);
  }
};

export const getRemoteConfigBoolean = (key: string) => {
  return getBoolean(remoteConfig, key);
};

// Helper to save config from UI
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

export const signInWithEmail = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
}

export const signUpWithEmail = async (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
}

export const signOut = async () => {
  return firebaseSignOut(auth);
};

export { onAuthStateChanged };

// --- List Services ---

export const subscribeToUserLists = (userId: string, callback: (lists: ShoppingListGroup[]) => void) => {
  // Query lists where user is in 'members' array
  const q = Firestore.query(
      Firestore.collection(db, "shoppingLists"), 
      Firestore.where("members", "array-contains", userId)
  );

  return Firestore.onSnapshot(q, (snapshot: any) => {
    const lists: ShoppingListGroup[] = [];
    snapshot.forEach((doc: any) => {
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
  
  return Firestore.addDoc(Firestore.collection(db, "shoppingLists"), newList);
};

export const updateListInFirestore = async (listId: string, data: Partial<ShoppingListGroup>) => {
  const ref = Firestore.doc(db, "shoppingLists", listId);
  return Firestore.updateDoc(ref, data);
};

export const deleteListFromFirestore = async (listId: string) => {
  return Firestore.deleteDoc(Firestore.doc(db, "shoppingLists", listId));
};

// --- Category & Settings Services ---

export const subscribeToUserCategories = (userId: string, callback: (cats: Category[]) => void) => {
    const ref = Firestore.doc(db, "userSettings", userId);
    return Firestore.onSnapshot(ref, (docSnap: any) => {
        if (docSnap.exists() && docSnap.data().categories) {
            callback(docSnap.data().categories);
        } else {
             callback([]);
        }
    });
};

export const subscribeToUserSettings = (userId: string, callback: (data: any) => void) => {
    const ref = Firestore.doc(db, "userSettings", userId);
    return Firestore.onSnapshot(ref, (docSnap: any) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        } else {
            callback({});
        }
    });
};

export const saveUserTheme = async (userId: string, theme: 'light' | 'dark') => {
    const ref = Firestore.doc(db, "userSettings", userId);
    return Firestore.setDoc(ref, { theme }, { merge: true });
};

export const markTutorialSeen = async (userId: string) => {
    const ref = Firestore.doc(db, "userSettings", userId);
    return Firestore.setDoc(ref, { tutorialSeen: true }, { merge: true });
}

export const saveUserCategories = async (userId: string, categories: Category[]) => {
    const ref = Firestore.doc(db, "userSettings", userId);
    return Firestore.setDoc(ref, { categories }, { merge: true });
};

// --- Price History Services ---

// Save a map of { normalizedItemName: price } to the user's history
export const updatePriceHistory = async (userId: string, items: ShoppingItem[]) => {
    const pricesToUpdate: Record<string, number> = {};
    
    items.forEach(item => {
        // Only update if completed and price exists
        if (item.completed && item.price !== undefined && item.price > 0) {
            // Normalize key: lowercase and trimmed to be consistent
            const key = item.name.trim().toLowerCase().replace(/[.#$\[\]]/g, ''); // Remove chars invalid in Firestore keys
            pricesToUpdate[key] = item.price;
        }
    });

    if (Object.keys(pricesToUpdate).length === 0) return;

    const ref = Firestore.doc(db, "priceHistory", userId);
    // Merge true ensures we don't overwrite other items' history
    return Firestore.setDoc(ref, pricesToUpdate, { merge: true });
};

// Fetch the last known price for a specific item name
export const getLastItemPrice = async (userId: string, itemName: string): Promise<number | null> => {
    try {
        const ref = Firestore.doc(db, "priceHistory", userId);
        const snapshot = await Firestore.getDoc(ref);
        
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

// --- History / Audit Log Services ---

export const addHistoryLog = async (
  userId: string, 
  action: HistoryLog['action'], 
  details: string,
  metadata?: HistoryLog['metadata']
) => {
  const user = auth.currentUser;
  const userName = user?.displayName || user?.email || 'Usuário';

  await Firestore.addDoc(Firestore.collection(db, "historyLogs"), {
    userId,
    userName,
    action,
    details,
    metadata: metadata || {},
    createdAt: Date.now()
  });
};

export const subscribeToHistory = (userId: string, callback: (logs: HistoryLog[]) => void) => {
  // Optimized Query: Sort and Limit on Server Side
  // IMPORTANT: This may require creating an index in Firebase Console.
  // URL to create index will appear in console error if missing.
  const q = Firestore.query(
      Firestore.collection(db, "historyLogs"), 
      Firestore.where("userId", "==", userId),
      Firestore.orderBy("createdAt", "desc"),
      Firestore.limit(50)
  );

  return Firestore.onSnapshot(q, (snapshot: any) => {
    const logs: HistoryLog[] = [];
    snapshot.forEach((doc: any) => {
      logs.push({ id: doc.id, ...doc.data() } as HistoryLog);
    });
    
    // Client-side sort fallback (just in case)
    logs.sort((a, b) => b.createdAt - a.createdAt);
    
    callback(logs);
  }, (error) => {
      console.error("History subscription error (Check if Index exists):", error);
  });
};


// --- Migration ---
export const migrateLegacyLists = async (userId: string) => {
    // Find lists created by this user (legacy 'userId' field) but missing 'members' array
    const q = Firestore.query(Firestore.collection(db, "shoppingLists"), Firestore.where("userId", "==", userId));
    const snapshot = await Firestore.getDocs(q);
    
    const batch = Firestore.writeBatch(db);
    let count = 0;

    snapshot.forEach((docSnap: any) => {
        const data = docSnap.data();
        if (!data.members || !data.members.includes(userId)) {
            const userEmail = auth.currentUser?.email || "";
            batch.update(docSnap.ref, {
                members: Firestore.arrayUnion(userId),
                memberEmails: Firestore.arrayUnion(userEmail),
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
    const q = Firestore.query(Firestore.collection(db, "invites"), Firestore.where("toEmail", "==", userEmail));
    return Firestore.onSnapshot(q, (snapshot: any) => {
        const invites: Invite[] = [];
        snapshot.forEach((doc: any) => invites.push({ id: doc.id, ...doc.data() } as Invite));
        callback(invites);
    });
};

export const subscribeToOutgoingInvites = (listId: string, callback: (invites: Invite[]) => void) => {
    const q = Firestore.query(Firestore.collection(db, "invites"), Firestore.where("listId", "==", listId));
    return Firestore.onSnapshot(q, (snapshot: any) => {
        const invites: Invite[] = [];
        snapshot.forEach((doc: any) => invites.push({ id: doc.id, ...doc.data() } as Invite));
        callback(invites);
    });
};

export const sendInvite = async (listId: string, listName: string, toEmail: string) => {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("Usuário não autenticado");
    
    await Firestore.addDoc(Firestore.collection(db, "invites"), {
        listId,
        listName,
        invitedBy: user.email,
        toEmail,
        createdAt: Date.now()
    });
};

export const cancelInvite = async (inviteId: string) => {
    await Firestore.deleteDoc(Firestore.doc(db, "invites", inviteId));
};

export const acceptInvite = async (invite: Invite, userId: string) => {
    const userEmail = auth.currentUser?.email;
    if (!userEmail) throw new Error("No email");

    const batch = Firestore.writeBatch(db);
    
    // 1. Add user to list
    const listRef = Firestore.doc(db, "shoppingLists", invite.listId);
    
    batch.update(listRef, {
        members: Firestore.arrayUnion(userId),
        memberEmails: Firestore.arrayUnion(userEmail),
        [`roles.${userId}`]: 'editor' // Default role
    });

    // 2. Delete invite
    const inviteRef = Firestore.doc(db, "invites", invite.id);
    batch.delete(inviteRef);

    await batch.commit();
};

export const rejectInvite = async (inviteId: string) => {
    await Firestore.deleteDoc(Firestore.doc(db, "invites", inviteId));
};

export const updateListMemberRole = async (listId: string, targetUserId: string, newRole: Role) => {
    const listRef = Firestore.doc(db, "shoppingLists", listId);
    await Firestore.updateDoc(listRef, {
        [`roles.${targetUserId}`]: newRole
    });
};

export const removeListMember = async (listId: string, targetUserId: string, targetUserEmail: string) => {
    const listRef = Firestore.doc(db, "shoppingLists", listId);
    const listSnap = await Firestore.getDoc(listRef);
    
    if (!listSnap.exists()) throw new Error("Lista não encontrada");
    
    const data = listSnap.data();
    let members = (data.members || []) as string[];
    let memberEmails = (data.memberEmails || []) as string[];
    const roles = { ...(data.roles || {}) };
    
    // Find the index of the UID to remove
    const memberIndex = members.indexOf(targetUserId);

    if (memberIndex !== -1) {
        // Remove from members array using index
        members = members.filter((_, i) => i !== memberIndex);
        
        // Remove from emails array using the SAME index to keep arrays synchronized
        // This is safer than filtering by email string which might differ (case/spaces)
        if (memberIndex < memberEmails.length) {
            memberEmails = memberEmails.filter((_, i) => i !== memberIndex);
        }
    } else {
        // Fallback: If UID not found in array (shouldn't happen), try basic filter
        // This handles cases where data might be slightly corrupted
        members = members.filter(id => id !== targetUserId);
    }
    
    // Remove from roles map
    delete roles[targetUserId];
    
    await Firestore.updateDoc(listRef, {
        members,
        memberEmails,
        roles
    });
};