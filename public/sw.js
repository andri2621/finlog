// Bump version on each deployment to clear old caches
const CACHE_NAME = "finlog-v4";

// Pre-cached app shell (minimal — mostly for offline fallback)
const STATIC_ASSETS = ["/manifest.json", "/icon.jpg"];

// ─── Install ───────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
    )
  );
  self.skipWaiting();
});

// ─── Activate: clear ALL old caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Helper: network with timeout ──────────────────────────────────────────────
function fetchWithTimeout(request, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Network timeout")), timeoutMs);
    fetch(request)
      .then((res) => { clearTimeout(timer); resolve(res); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

// ─── Fetch strategy ────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only intercept GET
  if (event.request.method !== "GET") return;

  // External APIs (Google, Gemini) — always network, no SW
  if (url.origin !== self.location.origin) return;

  // Navigation (HTML pages) — network-first, fallback to "/"
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .catch(() =>
          caches.match("/").then((c) => c || new Response("Offline", { status: 503 }))
        )
    );
    return;
  }

  // Next.js JS/CSS chunks — NETWORK-FIRST with cache fallback
  // Online: always gets fresh code (no stale module errors)
  // Offline: falls back to cached version (app still loads)
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      fetchWithTimeout(event.request, 4000)
        .then((response) => {
          // Cache the fresh response for offline fallback
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          // Network failed (offline) — serve from cache
          caches.match(event.request).then(
            (cached) => cached || new Response("Offline", { status: 503 })
          )
        )
    );
    return;
  }

  // Static assets (images, fonts, manifest) — cache-first (rarely change)
  const isStaticAsset =
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf|eot)$/) != null ||
    url.pathname === "/manifest.json";

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else — network only
});
