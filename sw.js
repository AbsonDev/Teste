// --- Service Worker with Firebase Cloud Messaging ---

// Import scripts via CDN (compat version needed for SW)
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Configuration must match what is in firebase.ts
// Note: We cannot import variables from TS files here, so config is duplicated.
const firebaseConfig = {
  apiKey: "AIzaSyBxe9ThNE0NbyKEcbxkcnvI2PdEaepz6Iw",
  authDomain: "fastlist-a9594.firebaseapp.com",
  projectId: "fastlist-a9594",
  storageBucket: "fastlist-a9594.firebasestorage.app",
  messagingSenderId: "523788038303",
  appId: "1:523788038303:web:7e24bb9686f1df81e532aa",
  measurementId: "G-6ZNXNBTJ7X"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle Background Messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png', // Assuming you have a logo file, otherwise generic icon
    data: payload.data // Pass data to click handler
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// --- Existing Cache Logic ---
const CACHE_NAME = 'listainteligente-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests and Firebase/Firestore requests to avoid caching dynamic data incorrectly
  if (event.request.method !== 'GET' || 
      event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('google.firestore') ||
      event.request.url.includes('fcm.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then(
          (networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return networkResponse;
          }
        ).catch(() => {
             // Offline fallback if needed
        });

        return cachedResponse || fetchPromise;
      })
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    // Logic to open the app window if clicked
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // If app is already open, focus it
            for (let client of windowClients) {
                if (client.url.includes('/') && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not open, open new window
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});