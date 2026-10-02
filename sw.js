const CACHE_NAME = "hadaf-pwa-v12";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./manifest.json",
    "./logo.png",
    "./resalat.png",
    "./banner.png"
];


/* =====================================
   INSTALL
===================================== */

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(cache => {

                return cache.addAll(FILES_TO_CACHE);

            })
            .catch(error => {

                console.error(
                    "❌ خطا در ذخیره فایل‌های PWA:",
                    error
                );

            })

    );

    self.skipWaiting();

});


/* =====================================
   ACTIVATE
===================================== */

self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys()
            .then(keys => {

                return Promise.all(

                    keys
                        .filter(key => key !== CACHE_NAME)
                        .map(key => caches.delete(key))

                );

            })
            .then(() => {

                return self.clients.claim();

            })

    );

});


/* =====================================
   FETCH
===================================== */

self.addEventListener("fetch", event => {

    const request = event.request;

    /*
       خیلی مهم:

       درخواست‌های POST را اصلاً وارد Cache نکن.
       API هدف از POST استفاده می‌کند.
    */

    if (request.method !== "GET") {

        return;

    }


    /*
       درخواست‌های Apps Script / API
       باید مستقیماً از اینترنت گرفته شوند.
    */

    const url = request.url;

    if (
        url.includes("script.google.com") ||
        url.includes("script.googleusercontent.com")
    ) {

        event.respondWith(

            fetch(request)

                .catch(error => {

                    console.error(
                        "❌ خطا در اتصال API:",
                        error
                    );

                    return new Response(

                        JSON.stringify({
                            success: false,
                            message: "اتصال به سرور برقرار نشد."
                        }),

                        {
                            status: 503,

                            headers: {
                                "Content-Type":
                                    "application/json"
                            }
                        }

                    );

                })

        );

        return;

    }


    /*
       صفحات HTML:

       همیشه اول اینترنت.
       اگر اینترنت نبود، از Cache بخوان.
    */

    if (request.mode === "navigate") {

        event.respondWith(

            fetch(request)

                .then(response => {

                    return response;

                })

                .catch(() => {

                    return caches.match(
                        request
                    )
                    .then(cached => {

                        return cached ||
                            caches.match("./index.html");

                    });

                })

        );

        return;

    }


    /*
       فایل‌های معمولی:
       ابتدا Cache
       سپس اینترنت
    */

    event.respondWith(

        caches.match(request)

            .then(cached => {

                if (cached) {

                    return cached;

                }

                return fetch(request);

            })

    );

});
