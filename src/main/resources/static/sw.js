const CACHE_NAME = "itv-pwa-v23";

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

/*
 * INSTALACIÓN
 * Guardamos la nueva versión de los archivos.
 */
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

/*
 * ACTIVACIÓN
 * Eliminamos TODAS las cachés antiguas.
 */
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys =>
                Promise.all(
                    keys
                        .filter(key => key !== CACHE_NAME)
                        .map(key => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

/*
 * PETICIONES
 */
self.addEventListener("fetch", event => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    /*
     * API
     * Siempre intentamos primero la red.
     * Solo utilizamos caché si estamos sin conexión.
     */
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(networkFirst(request));
        return;
    }

    /*
     * HTML
     * Siempre intentamos obtener la versión actual.
     */
    if (
        request.mode === "navigate" ||
        request.destination === "document"
    ) {
        event.respondWith(networkFirst(request));
        return;
    }

    /*
     * JAVASCRIPT Y CSS
     *
     * MUY IMPORTANTE:
     * Primero buscamos la versión nueva en Render.
     * Así evitamos quedarnos con un app.js antiguo.
     */
    if (
        request.destination === "script" ||
        request.destination === "style"
    ) {
        event.respondWith(networkFirstStatic(request));
        return;
    }

    /*
     * IMÁGENES, ICONOS Y OTROS RECURSOS ESTÁTICOS
     *
     * Para estos sí utilizamos caché primero.
     */
    event.respondWith(cacheFirst(request));
});


/*
 * NETWORK FIRST
 *
 * Intenta primero Internet.
 * Si falla, utiliza la caché.
 */
async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
        }

        return networkResponse;

    } catch (error) {
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}


/*
 * NETWORK FIRST PARA JS/CSS
 *
 * Además comprobamos que el servidor realmente
 * está devolviendo el tipo de archivo correcto.
 */
async function networkFirstStatic(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const networkResponse = await fetch(request);

        if (!networkResponse.ok) {
            throw new Error(
                `HTTP ${networkResponse.status} al cargar ${request.url}`
            );
        }

        const contentType =
            networkResponse.headers.get("content-type") || "";

        /*
         * Evitamos guardar HTML como si fuera JavaScript o CSS.
         *
         * Esto protege contra errores como:
         * Unexpected token '<'
         */
        if (
            request.destination === "script" &&
            !contentType.includes("javascript") &&
            !contentType.includes("ecmascript")
        ) {
            console.error(
                "El servidor no ha devuelto JavaScript para:",
                request.url,
                "Content-Type:",
                contentType
            );

            return networkResponse;
        }

        if (
            request.destination === "style" &&
            !contentType.includes("css")
        ) {
            console.error(
                "El servidor no ha devuelto CSS para:",
                request.url,
                "Content-Type:",
                contentType
            );

            return networkResponse;
        }

        await cache.put(request, networkResponse.clone());

        return networkResponse;

    } catch (error) {
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}


/*
 * CACHE FIRST
 *
 * Para imágenes e iconos.
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, networkResponse.clone());
    }

    return networkResponse;
}