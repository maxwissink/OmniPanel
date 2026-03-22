const CACHE_NAME = 'omnipanel-cache-v1';

self.addEventListener('install', event => {
    console.log('[OmniPanel SW] Service Worker Installed');
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('[OmniPanel SW] Service Worker Activated');
    return self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        fetch(event.request).catch(error => {
            console.error('[OmniPanel SW] Fetch failed; returning offline page instead.', error);
        })
    );
});