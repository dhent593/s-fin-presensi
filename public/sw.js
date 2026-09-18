// Basic Service Worker to trigger PWA install prompt
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// A simple fetch listener is required by Chrome to trigger the install prompt
self.addEventListener('fetch', (e) => {
  // We are not aggressively caching for offline mode yet.
  // Just let the network handle it.
  e.respondWith(fetch(e.request).catch(() => new Response('Offline')));
});
