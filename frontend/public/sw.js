// StudyFlow AI Service Worker for Android PWA
const CACHE_NAME = 'studyflow-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/studyflow-ai-logo.jpg'
];

// Install: Cache critical static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first with cache fallback for HTML/App Shell; Stale-while-revalidate for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API requests, Supabase auth, or non-GET requests
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com')
  ) {
    return;
  }

  // Navigation requests: Network first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Static assets (CSS, JS, images, fonts): Stale-while-revalidate
  if (
    url.pathname.startsWith('/assets') ||
    url.pathname.startsWith('/icons') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
