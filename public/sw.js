// Kinship EHR — Service Worker
// Strategy:
//   - Static assets (JS, CSS, images, fonts): Cache-first with network fallback
//   - API routes (/api/*): Network-first with no cache (always fresh data)
//   - Navigation requests: Network-first, fall back to cached shell if offline

const CACHE_NAME = "kinship-v1";

const STATIC_EXTENSIONS = [".js", ".css", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".woff", ".woff2", ".ttf"];

function isStaticAsset(url) {
  const path = new URL(url).pathname;
  return STATIC_EXTENSIONS.some((ext) => path.endsWith(ext)) || path.startsWith("/_next/static/");
}

function isApiRoute(url) {
  return new URL(url).pathname.startsWith("/api/");
}

// ---------- Install ----------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll([
          // Add key shell assets here if you want them pre-cached.
          // For now we rely on runtime caching only.
        ])
      )
      .then(() => self.skipWaiting())
  );
});

// ---------- Activate ----------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ---------- Fetch ----------
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests for caching
  if (request.method !== "GET") return;

  // Never cache API calls — always go to network
  if (isApiRoute(request.url)) return;

  if (isStaticAsset(request.url)) {
    // Cache-first for static assets
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for navigation / HTML pages
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
