// Service Worker for Great Attendance PWA
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Only intercept page navigation for offline fallback to avoid corrupting API/JSON calls
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Offline - Great Attendance</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#1e293b;text-align:center;padding:20px}h1{color:#f97316}</style></head><body><div><h1>Anda Sedang Offline</h1><p>Periksa koneksi internet Anda untuk kembali menggunakan Great Attendance.</p></div></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })
    );
  }
});
