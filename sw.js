const CACHE_NAME = 'punch-list-v42';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './data.json',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
      .catch(err => {
        console.warn('Cache parcial:', err);
        return caches.open(CACHE_NAME).then(cache => cache.add('./index.html'));
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // data.json: Stale-While-Revalidate — sirve caché inmediato + actualiza en background
  if (url.pathname.includes('data.json')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match('./data.json').then(cached => {
          const fetchPromise = fetch(event.request).then(response => {
            if (response.ok) cache.put('./data.json', response.clone());
            return response;
          }).catch(() => null);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // index.html: Network-first con fallback a caché
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Todo lo demás: Cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      });
    })
  );
});
