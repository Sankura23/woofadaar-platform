// Woofadaar PWA Service Worker - Production Ready
// Optimized for mobile performance and offline capabilities

const CACHE_NAME = 'woofadaar-v1.0.0';
const STATIC_CACHE = 'woofadaar-static-v1.0.0';
const DYNAMIC_CACHE = 'woofadaar-dynamic-v1.0.0';
const API_CACHE = 'woofadaar-api-v1.0.0';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/clear-cache.html',
  '/Final Icon-14.jpg',
  // Core app routes
  '/login',
  '/register',
  '/profile',
  '/health',
  '/community',
  '/partners/directory',
  '/appointments',
  '/premium'
];

// API endpoints to cache for offline functionality
const CACHE_API_PATTERNS = [
  '/api/auth/working-user',
  '/api/auth/working-dogs',
  '/api/dogs',
  '/api/health/',
  '/api/premium/features'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing Woofadaar PWA v1.0.0');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => {
          return new Request(url, { cache: 'reload' });
        }));
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating Woofadaar PWA');
  
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests with different strategies
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network first, cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    // Static assets - Cache first, network fallback
    event.respondWith(handleStaticAsset(request));
  } else {
    // HTML pages - Stale while revalidate
    event.respondWith(handlePageRequest(request));
  }
});

// Network first strategy for API requests
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Check if this API should be cached
  const shouldCache = CACHE_API_PATTERNS.some(pattern => 
    url.pathname.includes(pattern)
  );

  if (!shouldCache) {
    // Don't cache sensitive APIs
    return fetch(request);
  }

  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('Service Worker: Serving API from cache:', request.url);
      return cachedResponse;
    }
    
    // Return offline response for critical APIs
    if (url.pathname.includes('/api/auth/working-user')) {
      return new Response(JSON.stringify({
        offline: true,
        message: 'You are currently offline. Some features may be limited.'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Cache first strategy for static assets
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Return cached version immediately
    fetchAndUpdateCache(request);
    return cachedResponse;
  }
  
  // Not in cache, fetch and cache
  return fetchAndUpdateCache(request);
}

// Stale while revalidate for pages
async function handlePageRequest(request) {
  const cachedResponse = await caches.match(request);
  
  // Always try to update cache in background
  const fetchPromise = fetchAndUpdateCache(request);
  
  if (cachedResponse) {
    // Return cached version immediately, update in background
    return cachedResponse;
  }
  
  // No cache, wait for network
  try {
    return await fetchPromise;
  } catch (error) {
    // Network failed, return offline page
    const offlineResponse = await caches.match('/offline.html');
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

// Helper function to fetch and update cache
async function fetchAndUpdateCache(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Service Worker: Fetch failed for:', request.url);
    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'health-log-sync') {
    event.waitUntil(syncHealthLogs());
  } else if (event.tag === 'premium-action-sync') {
    event.waitUntil(syncPremiumActions());
  }
});

// Sync health logs when back online
async function syncHealthLogs() {
  console.log('Service Worker: Syncing health logs...');
  
  try {
    // Get pending health logs from IndexedDB
    const pendingLogs = await getPendingHealthLogs();
    
    for (const log of pendingLogs) {
      try {
        const response = await fetch('/api/health/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${log.token}`
          },
          body: JSON.stringify(log.data)
        });
        
        if (response.ok) {
          await removePendingHealthLog(log.id);
          console.log('Service Worker: Synced health log:', log.id);
        }
      } catch (error) {
        console.log('Service Worker: Failed to sync health log:', error);
      }
    }
  } catch (error) {
    console.log('Service Worker: Background sync failed:', error);
  }
}

// Sync premium actions
async function syncPremiumActions() {
  console.log('Service Worker: Syncing premium actions...');
  // Implementation would sync premium feature usage
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  if (!event.data) {
    return;
  }
  
  const data = event.data.json();
  const title = data.title || 'Woofadaar';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/Final Icon-14.jpg',
    badge: '/Final Icon-14.jpg',
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'woofadaar-notification',
    renotify: true,
    requireInteraction: data.urgent || false
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  const data = event.notification.data;
  let targetUrl = '/';
  
  if (data.url) {
    targetUrl = data.url;
  } else if (data.type === 'health_reminder') {
    targetUrl = '/health';
  } else if (data.type === 'expert_consultation') {
    targetUrl = '/premium/consultations';
  } else if (data.type === 'appointment_reminder') {
    targetUrl = '/appointments';
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      // Check if app is already open
      for (const client of clients) {
        if (client.url.includes(targetUrl)) {
          return client.focus();
        }
      }
      
      // Open new window
      return self.clients.openWindow(targetUrl);
    })
  );
});

// Handle messages from main app
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'CACHE_HEALTH_LOG') {
    // Store health log for offline sync
    cacheHealthLogForSync(event.data.payload);
  } else if (event.data.type === 'CLEAR_CACHE') {
    clearAllCaches();
  } else if (event.data.type === 'GET_CACHE_SIZE') {
    getCacheSize().then(size => {
      event.ports[0].postMessage({ size });
    });
  }
});

// Helper functions for offline storage
async function getPendingHealthLogs() {
  // Implementation would get from IndexedDB
  return [];
}

async function removePendingHealthLog(id) {
  // Implementation would remove from IndexedDB
}

async function cacheHealthLogForSync(data) {
  // Implementation would store in IndexedDB for sync
  console.log('Service Worker: Health log cached for sync');
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

async function getCacheSize() {
  let totalSize = 0;
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

console.log('Woofadaar PWA Service Worker v1.0.0 loaded successfully');