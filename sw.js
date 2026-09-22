const CACHE_NAME = "hadaf-pwa-v9";

const FILES_TO_CACHE = [
  "./",
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

  // صفحات HTML همیشه از اینترنت گرفته شوند
  if (event.request.mode === "navigate") {

    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match("./index.html"))
    );

    return;
  }


  // فایل‌های دیگر از cache سریع‌تر باشند
  event.respondWith(
    caches.match(event.request)
      .then(cached => {

        return cached || fetch(event.request);

      })
  );

});
