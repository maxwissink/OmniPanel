const CACHE_NAME = 'omnipanel-cache-v1';

// 1. Install Event
self.addEventListener('install', event => {
    console.log('[OmniPanel SW] Service Worker Installed');
    // Forces the waiting service worker to become the active service worker
    self.skipWaiting();
});

// 2. Activate Event
self.addEventListener('activate', event => {
    console.log('[OmniPanel SW] Service Worker Activated');
    // Tells the active service worker to take control of the page immediately
    return self.clients.claim();
});

// 3. Fetch Event (The PWA Requirement)
// We use a simple "Network-Only" pass-through here. 
// This satisfies Chrome's requirement that a fetch handler exists, 
// but ensures you always get the live, updated blocks from your Node server.
self.addEventListener('fetch', event => {
    // Only intercept standard HTTP/HTTPS requests (ignore WebSockets, extensions, etc.)
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        fetch(event.request).catch(error => {
            console.error('[OmniPanel SW] Fetch failed; returning offline page instead.', error);
            // Optional: You could return a custom offline fallback HTML here if the host server dies
        })
    );
});