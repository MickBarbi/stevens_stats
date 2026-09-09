/* Stevens Stats — PWA-lite service worker.
   Runtime caching only (no build-time asset manifest to keep in sync):
   - /_next/static/*  cache-first (immutable, hashed)
   - navigations      network-first -> cache -> /offline
   - everything else  stale-while-revalidate                                  */

const VERSION = "v1";
const CACHE = `stevens-stats-${VERSION}`;
const PRECACHE = ["/offline", "/home", "/roster", "/events", "/records", "/athlete"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

const putInCache = (request, response) => {
  const copy = response.clone();
  caches.open(CACHE).then((cache) => cache.put(request, copy));
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Hashed build output — never changes, serve from cache.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            putInCache(request, res);
            return res;
          })
      )
    );
    return;
  }

  // Page navigations — fresh when online, cached page or /offline when not.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          putInCache(request, res);
          return res;
        })
        .catch(() =>
          caches.match(request).then((hit) => hit || caches.match("/offline"))
        )
    );
    return;
  }

  // Data JSON, images, etc. — return cache immediately, refresh in the
  // background.
  event.respondWith(
    caches.match(request).then((hit) => {
      const fetching = fetch(request)
        .then((res) => {
          if (res.ok) putInCache(request, res);
          return res;
        })
        .catch(() => hit);
      return hit || fetching;
    })
  );
});
