const CACHE = 'aspect-v10';

const STATIC = [
  './',
  './index.html',
  './posledniy.html',
  './resonance.html',
  './fnaf.html',
  './evtn.html',
  './armament.html',
  './shot.html',
  './outpost.html',
  './oligarch.html',
  './floorbyfloor.html',
  './coredrift.html',
  './404.html',
  './style.css',
  './games.js',
  './init.js',
  './particles.js',
  './game.js',
  './LOGO/LOGO.jpg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;

  // Images: cache-first (screenshots don't change often)
  if (request.destination === 'image') {
    e.respondWith(
      caches.match(request).then(cached =>
        cached || fetch(request).then(res => {
          caches.open(CACHE).then(c => c.put(request, res.clone()));
          return res;
        }).catch(() => cached)
      )
    );
    return;
  }

  // HTML/CSS/JS: network-first, fallback to cache
  e.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()));
        return res;
      })
      .catch(() => caches.match(request))
  );
});
