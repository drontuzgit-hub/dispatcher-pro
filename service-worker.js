const CACHE_NAME = 'dispatcher-pro-v1';
const urlsToCache = [
  './',
  './dispatcher-v4.html',
  './manifest.json'
];

// Установка Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Активация Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Перехват запросов
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Игнорируем запросы к скрипту (они идут на Google Apps Script)
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(request)
        .catch(() => new Response('Нет интернета', { status: 503 }))
    );
    return;
  }

  // Для документов используем Network First, потом Cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, responseToCache));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Для остального используем Cache First
  event.respondWith(
    caches.match(request)
      .then(response => response || fetch(request))
      .catch(() => new Response('Ошибка загрузки', { status: 503 }))
  );
});
