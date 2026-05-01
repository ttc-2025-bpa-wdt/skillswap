/// <reference lib="webworker" />

// SkillSwap Service Worker
// Version: 1.0.0

const CACHE_NAME = 'skillswap-v1';
const STATIC_CACHE = 'skillswap-static-v1';
const DYNAMIC_CACHE = 'skillswap-dynamic-v1';
const API_CACHE = 'skillswap-api-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
    '/',
    '/dashboard',
    '/search',
    '/manifest.json',
    '/favicon.svg',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        }).then(() => {
            // Skip waiting to activate immediately
            return self.skipWaiting();
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => {
                        return cacheName !== STATIC_CACHE && 
                               cacheName !== DYNAMIC_CACHE && 
                               cacheName !== API_CACHE;
                    })
                    .map((cacheName) => {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    })
            );
        }).then(() => {
            // Take control of all pages immediately
            return self.clients.claim();
        })
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests for caching
    if (request.method !== 'GET') {
        // For POST/PUT/DELETE, try network and queue for background sync if offline
        event.respondWith(
            fetch(request).catch(() => {
                // Store failed requests for background sync
                if ('sync' in self.registration) {
                    storeFailedRequest(request);
                }
                return new Response(JSON.stringify({ 
                    error: 'offline',
                    message: 'Request queued for sync when online' 
                }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // Different strategies based on request type
    if (url.pathname.startsWith('/api/')) {
        // API calls - Network first, fallback to cache
        event.respondWith(networkFirst(request, API_CACHE));
    } else if (isStaticAsset(url.pathname)) {
        // Static assets - Cache first, fallback to network
        event.respondWith(cacheFirst(request, STATIC_CACHE));
    } else {
        // Navigation and other requests - Network first with offline fallback
        event.respondWith(networkFirstWithOfflineFallback(request));
    }
});

// Cache-first strategy (for static assets)
async function cacheFirst(request, cacheName) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('[SW] Fetch failed for:', request.url);
        throw error;
    }
}

// Network-first strategy (for API calls)
async function networkFirst(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache for:', request.url);
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return new Response(JSON.stringify({ 
            error: 'offline',
            message: 'No cached data available' 
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Network first with offline page fallback (for navigation)
async function networkFirstWithOfflineFallback(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed for navigation, trying cache');
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return cached offline page or dashboard as fallback
        const offlinePage = await caches.match('/offline');
        if (offlinePage) {
            return offlinePage;
        }
        
        return caches.match('/dashboard');
    }
}

// Check if request is for a static asset
function isStaticAsset(pathname) {
    return pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

// Store failed requests for background sync
async function storeFailedRequest(request) {
    // This will be implemented with IndexedDB in the offline.ts module
    console.log('[SW] Storing failed request for background sync:', request.url);
    
    // Queue a sync event
    self.registration.sync.register('sync-failed-requests').catch(err => {
        console.error('[SW] Failed to register sync:', err);
    });
}

// Background sync event
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync event:', event.tag);
    
    if (event.tag === 'sync-failed-requests') {
        event.waitUntil(syncFailedRequests());
    }
});

// Sync failed requests
async function syncFailedRequests() {
    console.log('[SW] Syncing failed requests...');
    // This will be implemented with IndexedDB in the offline.ts module
}

// Push notification event
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');
    
    let data = { title: 'SkillSwap', body: 'You have a new notification' };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: data.data || {},
        actions: data.actions || [],
        tag: data.tag || 'default',
        requireInteraction: data.requireInteraction || false,
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');
    
    event.notification.close();

    const data = event.notification.data;
    let url = '/dashboard';

    // Determine URL based on notification type
    if (data.type === 'message') {
        url = `/chat?user=${data.senderId}`;
    } else if (data.type === 'session_reminder') {
        url = `/session/${data.sessionId}`;
    } else if (data.type === 'achievement_unlocked') {
        url = '/achievements';
    } else if (data.type === 'session_join') {
        url = `/session/${data.sessionId}`;
    } else if (data.type === 'new_review') {
        url = `/profile/me`;
    }

    // Handle action button clicks
    if (event.action) {
        if (event.action === 'view') {
            url = data.viewUrl || url;
        } else if (event.action === 'dismiss') {
            return;
        }
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a window open
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // Open new window if none exists
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification closed');
    // Could send analytics here
});

// Message event - communicate with main thread
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    } else if (event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(DYNAMIC_CACHE).then((cache) => {
                return cache.addAll(event.data.urls);
            })
        );
    } else if (event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            })
        );
    }
});

console.log('[SW] Service worker loaded');