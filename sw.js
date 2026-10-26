/* Service worker: rende l'app utilizzabile senza Internet.
   Con la rete: scarica sempre la versione più recente (aggiornamenti automatici).
   Senza rete: usa la copia salvata.
   I dati degli allievi NON passano di qui: stanno in IndexedDB sul dispositivo. */
const CACHE = 'scuola-ballo-v2';
const FILES = ['./', './index.html', './app.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000); // rete lenta: dopo 4 s usa la copia salvata
      const res = await fetch(req, { cache: 'no-cache', signal: ctrl.signal });
      clearTimeout(timer);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('./index.html'));
    }
  })());
});
