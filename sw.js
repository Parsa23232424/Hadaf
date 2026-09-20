
const CACHE_NAME = "hadaf-pwa-v6";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./login.html",
  "./signup.html",
  "./goals.html",
  "./pico.html",
  "./calculator.html",
  "./qr.html",
  "./gallery.html",

  "./data.json",

  "./style.css",
  "./game.js",

  "./manifest.json",

  "./logo.png",
  "./resalat.png",
  "./banner.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request);
    })
  );
});

