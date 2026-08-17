// Bump cache version on every deployment to ensure clients upgrade smoothly
const CACHE_NAME = "finlog-v6";

// Essential app shell assets cached on install
const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/icon.png",
  "/favicon/favicon.ico",
  "/favicon/android-chrome-192x192.png",
  "/favicon/android-chrome-512x512.png",
  "/favicon/apple-touch-icon.png",
];

// ─── Install: Pre-cache HTML shell and essential static assets ────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Pre-cache core shell
      for (const asset of PRECACHE_ASSETS) {
        try {
          const res = await fetch(asset);
          if (res.ok) {
            await cache.put(asset, res);
          }
        } catch {
          // Dev mode or missing asset fallback
        }
      }
    })
  );
  self.skipWaiting();
});

// ─── Activate: Wipe ALL old cache versions ────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Helper: Network with timeout for fast offline fallback ───────────────────
function fetchWithTimeout(request, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Network timeout")), timeoutMs);
    fetch(request)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ─── Fetch Strategy ───────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // External APIs (Google Sheets, Gemini AI) → Always network, no SW cache
  if (url.origin !== self.location.origin) return;

  // ❶ NAVIGATION (HTML pages: /, /history, /savings, /reports, /settings, etc.)
  // Network-first when online, fallback to cached page or cached "/" shell when offline
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetchWithTimeout(event.request, 3000)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone.clone());
              cache.put("/", clone); // Ensure root is always updated as shell
            });
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback: try specific route first, then root shell
          const matched = await caches.match(event.request);
          if (matched) return matched;
          const rootMatched = await caches.match("/");
          if (rootMatched) return rootMatched;
          return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
        })
    );
    return;
  }

  // ❷ NEXT.JS ASSETS & CHUNKS (/_next/static/...)
  // Network-first when online to get latest code; fallback to cached chunks when offline
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      fetchWithTimeout(event.request, 3000)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response("", { status: 404 });
        })
    );
    return;
  }

  // ❸ STATIC ASSETS (images, fonts, manifest, icons)
  // Cache-first for instant loading
  const isStatic =
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf|eot)$/) != null ||
    url.pathname === "/manifest.json";

  if (isStatic) {
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

  // ❹ ALL OTHER GET REQUESTS: Network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ─── Notification Click Handler ───────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── Push Notification Handler ────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let payload = {
    title: "FinLog Pengingat Keuangan",
    body: "Sudah catat pengeluaran hari ini? Yuk luangkan 10 detik!",
    url: "/add",
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: "/favicon/android-chrome-192x192.png",
    badge: "/favicon/android-chrome-192x192.png",
    tag: "finlog-reminder",
    data: {
      url: payload.url || "/add",
    },
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});
