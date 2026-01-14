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
import * as firestoreNamespace from "firebase/firestore";
import { 
  getRemoteConfig, 
  fetchAndActivate, 
  getValue,
  getBoolean 
} from "firebase/remote-config";
import { ShoppingListGroup, Category, Invite, Role, HistoryLog } from "../types";

// Workaround for TypeScript error: "Module 'firebase/firestore' has no exported member..."
// This ensures the build passes even if type definitions are out of sync.
const { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  getDocs, 
  writeBatch, 
  arrayUnion, 
  getDoc 
} = firestoreNamespace as any;

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
export const db = getFirestore(app);

// --- Remote Config Setup ---
/**
 * DOCUMENTATION: REMOTE CONFIG
 * 
 * Para habilitar ou desabilitar funcionalidades remotamente sem precisar de novo deploy:
 * 1. Vá ao Console do Firebase > Remote Config.
 * 2. Adicione um parâmetro chamado 'enable_ai_assistant'.
 * 3. Defina o valor como 'true' (para habilitar) ou 'false' (para desabilitar).
 * 4. Publique as alterações.
 */
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
  const q = query(
      collection(db, "shoppingLists"), 
      where("members", "array-contains", userId)
  );

  return onSnapshot(q, (snapshot: any) => {
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
  
  return addDoc(collection(db, "shoppingLists"), newList);
};

export const updateListInFirestore = async (listId: string, data: Partial<ShoppingListGroup>) => {
  const ref = doc(db, "shoppingLists", listId);
  return updateDoc(ref, data);
};

export const deleteListFromFirestore = async (listId: string) => {
  return deleteDoc(doc(db, "shoppingLists", listId));
};

// --- Category Services ---

export const subscribeToUserCategories = (userId: string, callback: (cats: Category[]) => void) => {
    const ref = doc(db, "userSettings", userId);
    return onSnapshot(ref, (docSnap: any) => {
        if (docSnap.exists() && docSnap.data().categories) {
            callback(docSnap.data().categories);
        } else {
             callback([]);
        }
    });
};

export const saveUserCategories = async (userId: string, categories: Category[]) => {
    const ref = doc(db, "userSettings", userId);
    return setDoc(ref, { categories }, { merge: true });
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
  // Client-side sort/limit to avoid index issues
  const q = query(
      collection(db, "historyLogs"), 
      where("userId", "==", userId)
  );

  return onSnapshot(q, (snapshot: any) => {
    const logs: HistoryLog[] = [];
    snapshot.forEach((doc: any) => {
      logs.push({ id: doc.id, ...doc.data() } as HistoryLog);
    });
    
    // Client-side sort: Newest first
    logs.sort((a, b) => b.createdAt - a.createdAt);
    
    // Client-side limit
    callback(logs.slice(0, 50));
  });
};


// --- Migration ---
export const migrateLegacyLists = async (userId: string) => {
    // Find lists created by this user (legacy 'userId' field) but missing 'members' array
    const q = query(collection(db, "shoppingLists"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    let count = 0;

    snapshot.forEach((docSnap: any) => {
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
    return onSnapshot(q, (snapshot: any) => {
        const invites: Invite[] = [];
        snapshot.forEach((doc: any) => invites.push({ id: doc.id, ...doc.data() } as Invite));
        callback(invites);
    });
};

export const subscribeToOutgoingInvites = (listId: string, callback: (invites: Invite[]) => void) => {
    const q = query(collection(db, "invites"), where("listId", "==", listId));
    return onSnapshot(q, (snapshot: any) => {
        const invites: Invite[] = [];
        snapshot.forEach((doc: any) => invites.push({ id: doc.id, ...doc.data() } as Invite));
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
    
    // 1. Add user to list
    const listRef = doc(db, "shoppingLists", invite.listId);
    
    batch.update(listRef, {
        members: arrayUnion(userId),
        memberEmails: arrayUnion(userEmail),
        [`roles.${userId}`]: 'editor' // Default role
    });

    // 2. Delete invite
    const inviteRef = doc(db, "invites", invite.id);
    batch.delete(inviteRef);

    await batch.commit();
};

export const rejectInvite = async (inviteId: string) => {
    await deleteDoc(doc(db, "invites", inviteId));
};

export const updateListMemberRole = async (listId: string, targetUserId: string, newRole: Role) => {
    const listRef = doc(db, "shoppingLists", listId);
    await updateDoc(listRef, {
        [`roles.${targetUserId}`]: newRole
    });
};

export const removeListMember = async (listId: string, targetUserId: string, targetUserEmail: string) => {
    const listRef = doc(db, "shoppingLists", listId);
    const listSnap = await getDoc(listRef);
    
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
    
    await updateDoc(listRef, {
        members,
        memberEmails,
        roles
    });
};
