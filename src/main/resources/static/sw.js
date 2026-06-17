const CACHE_NAME = "itv-pwa-v14";
const APP_SHELL = [
    "/login.html",
    "/login.js",
    "/style.css",
    "/app.js",
    "/manifest.webmanifest",
    "/assets/apple-touch-icon.png",
    "/assets/icon-32.png",
    "/assets/icon-48.png",
    "/assets/icon-72.png",
    "/assets/icon-96.png",
    "/assets/icon-144.png",
    "/assets/icon-192.png",
    "/assets/icon-512.png",
    "/assets/iconoapp.png",
    "/assets/iconoapp-192.png",
    "/assets/fotos.png",
    "/assets/eliminar.png",
    "/assets/crearvehiculo.png",
    "/assets/buscar.png",
    "/assets/editar.png",
    "/assets/itv.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
        event.respondWith(networkFirst(request));
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(fetch(request));
        return;
    }

    event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
}

async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const networkResponse = await fetch(request);
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}
