const CACHE_NAME = 'mindskyra-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/app.html',
  '/admin.html',
  '/css/tailwind.css',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => console.log('Cache failed:', err))
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Firebase and other external APIs
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch new
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then((fetchResponse) => {
            // Cache new requests
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }
            const responseToCache = fetchResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return fetchResponse;
          });
      })
      .catch(() => {
        // Return offline fallback if available
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});

// Background Sync for offline form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-payments') {
    event.waitUntil(syncPayments());
  }
});

async function syncPayments() {
  // Logic to sync pending payments when back online
  console.log('Syncing pending payments...');
}

// Push Notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data.text(),
    icon: 'assets/icons/icon-192x192.png',
    badge: 'assets/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: event.data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('MINDSKYRA', options)
  );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});